/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unused-vars -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { ItemView, WorkspaceLeaf, WorkspaceSplit, MarkdownRenderer, TFile, setIcon, Notice } from 'obsidian';
import { EditorView, Decoration } from '@codemirror/view';
import { RangeSetBuilder, StateEffect, Compartment, EditorSelection } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Scene, SceneFilter, SortConfig } from '../models/Scene';
import { SceneManager } from '../services/SceneManager';
import { renderViewSwitcher } from '../components/ViewSwitcher';
import { FiltersComponent } from '../components/Filters';
import { applyMobileClass, isMobile, isPhone, isTablet } from '../components/MobileAdapter';
import { buildFormattingToolbar } from '../components/FormattingToolbar';
import { compareActChapter, getActDisplayLabel } from '../utils/actChapter';
import SceneCardsPlugin from '../main';
import { MANUSCRIPT_VIEW_TYPE } from '../constants';

/**
 * Discussion #183 — module-level cursor/scroll snapshot.
 *
 * When the user switches from Manuscript to Codex (or any other view),
 * Obsidian destroys the ManuscriptView instance and creates a new one when
 * the user switches back. Any instance-level state is lost. We keep the
 * last cursor position + scroll offset here at module scope so the new
 * instance can restore it after its first render.
 */
let _lastManuscriptState: {
    scenePath: string;
    scrollTop: number;
    cursorAnchor?: number;
    cursorHead?: number;
} | null = null;

/**
 * Manuscript View — Scrivenings-style continuous document view.
 *
 * Embeds real Obsidian MarkdownView editors (Live Preview) for each scene
 * inside a single scrollable document with act/chapter dividers. Frontmatter
 * is hidden via CSS. Editors are lazy-loaded as scenes scroll into view.
 */
export class ManuscriptView extends ItemView {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;
    private rootContainer: HTMLElement | null = null;
    private scrollArea: HTMLElement | null = null;
    private footerEl: HTMLElement | null = null;
    private filtersComponent: FiltersComponent | null = null;
    private currentFilter: SceneFilter = {};
    private currentSort: SortConfig = { field: 'sequence', direction: 'asc' };
    private focusObserver: IntersectionObserver | null = null;
    private lazyObserver: IntersectionObserver | null = null;
    private embeddedLeaves: Map<string, WorkspaceLeaf> = new Map();
    private editorResizeObservers: Map<string, ResizeObserver> = new Map();
    /** Paths currently being mounted (prevents duplicate async mounts) */
    private mountingPaths: Set<string> = new Set();
    private _hasActiveFocus = false;
    /** Prevents refresh() from running during initial mount sequence */
    private _isMounting = false;
    /** True while any lazy/eager editor mount is in flight. refresh()
     *  bails out when this is set so an in-progress openFile() doesn't
     *  get torn down by a vault 'modify' event it itself triggered
     *  (the root cause of the manuscript flicker loop). */
    private _lazyMounting = false;
    /** Monotonic token used to detect when a teardown happened during an
     *  async mountEditor() call. detachAllEmbedded() bumps this; the
     *  in-flight mount checks it after each await and bails if it changed. */
    private _activeMountToken: symbol | null = null;
    /** When true, hide wiki-link/tag styling so text reads as plain prose.
     *  Persisted to localStorage so the last toolbar choice survives view
     *  switches and Obsidian restarts. Defaults to ON for first-time users. */
    private _plainText = ManuscriptView.loadPlainTextPref();
    /** When true, links/tags are atomic (cursor skips over them) */
    private _lockLinks = true;
    /** Cached sorted scene list from last renderManuscript */
    private _lastScenes: Scene[] = [];
    /** Filter/sort key for the cached scene list */
    private _lastFilterKey = '';
    /** CM6 compartment for toggling atomic-link extension */
    private atomicCompartment = new Compartment();
    /** Whether focus mode is active (hides non-writing UI, dims inactive scenes) */
    private _focusMode = false;
    /** File path of the scene currently most visible in the scroll area */
    focusedScenePath: string | null = null;
    /** File path of the scene whose editor currently has focus (being edited).
     *  Distinct from focusedScenePath which tracks the most-visible scene. */
    private editingScenePath: string | null = null;
    /** Formatting toolbar element */
    private fmtToolbar: HTMLElement | null = null;
    /** The currently focused embedded leaf (for toolbar commands) */
    private activeLeaf: WorkspaceLeaf | null = null;
    /** Cross-scene search & replace bar (Issue #195) */
    private searchPanel: HTMLElement | null = null;
    private searchInput: HTMLInputElement | null = null;
    private replaceInput: HTMLInputElement | null = null;
    private searchCaseSensitive = false;
    private searchWholeWord = false;
    private searchRegex = false;
    /** Current match index (0-based) across all scenes */
    private searchMatchIndex = -1;
    /** Total matches found across all scenes */
    private searchMatchTotal = 0;
    /** Flat list of matches: {path, from, to} */
    private searchMatches: { path: string; from: number; to: number }[] = [];

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin, sceneManager: SceneManager) {
        super(leaf);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
    }

    getViewType(): string {
        return MANUSCRIPT_VIEW_TYPE;
    }

    /** localStorage key for the Plain Text toolbar toggle preference. */
    private static readonly PLAIN_TEXT_PREF_KEY = 'sl-manuscript-plain-text';

    /** Load the persisted Plain Text preference (default ON for first use). */
    private static loadPlainTextPref(): boolean {
        try {
            const v = window.localStorage.getItem(ManuscriptView.PLAIN_TEXT_PREF_KEY);
            // Treat null/missing as ON (default); '0' / 'false' as OFF.
            return v === null ? true : v !== '0' && v !== 'false';
        } catch {
            return true;
        }
    }

    /** Persist the Plain Text preference so it survives view switches/restarts. */
    private persistPlainTextPref(): void {
        try {
            window.localStorage.setItem(
                ManuscriptView.PLAIN_TEXT_PREF_KEY,
                this._plainText ? '1' : '0',
            );
        } catch {
            // best-effort — localStorage may be unavailable in some contexts
        }
    }

    getDisplayText(): string {
        const title = this.plugin?.sceneManager?.activeProject?.title;
        return title ? `Manuscript - ${title}` : 'Manuscript';
    }

    getIcon(): string {
        return 'book-open-text';
    }

    async onOpen(): Promise<void> {
        this.plugin.storyLeaf = this.leaf;
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('story-line-manuscript-container');
        applyMobileClass(container);
        this.rootContainer = container;

        await this.sceneManager.initialize();
        this.renderView(container);
    }

    async onClose(): Promise<void> {
        // Discussion #183 — capture cursor + scroll to the module-level
        // variable so the next ManuscriptView instance can restore it.
        this.captureCurrentState();
        this.captureAndPersistState();
        this.detachAllEmbedded();
        this.focusObserver?.disconnect();
        this.lazyObserver?.disconnect();
        this.focusObserver = null;
        this.lazyObserver = null;
        // Clean up focus mode body class and CSS variables on close
        const body = activeDocument.body;
        body.removeClass('sl-focus-active-global');
        body.removeClass('sl-focus-has-darken');
        body.style.removeProperty('--sl-focus-toolbar-opacity');
        body.style.removeProperty('--sl-focus-bg');
        body.style.removeProperty('--sl-focus-filter');
    }


    /** Called by refreshOpenViews() */
    refresh(): void {
        // Don't re-render while user is editing, during any mount sequence
        // (initial eager OR lazy scroll-triggered), or while the cross-scene
        // search panel is open (Issue #195). A lazy mount in flight can fire
        // vault 'modify' events via leaf.openFile(); tearing the view down
        // at that point both loses the in-flight mount and re-triggers
        // refresh() — the flicker loop users reported.
        if (this._hasActiveFocus || this._isMounting || this._lazyMounting || this.isSearchOpen()) {
            this.updateFooter();
            return;
        }
        if (this.rootContainer) {
            this.renderView(this.rootContainer);
        }
    }

    private detachAllEmbedded(): void {
        // Bump the mount token so any in-flight mountEditor() call knows
        // its container/leaf is being torn down and bails out instead of
        // writing into a detached DOM tree.
        this._activeMountToken = Symbol('detach');
        for (const [, leaf] of this.embeddedLeaves) {
            leaf.detach();
        }
        this.embeddedLeaves.clear();
        for (const [, ro] of this.editorResizeObservers) {
            ro.disconnect();
        }
        this.editorResizeObservers.clear();
        this.mountingPaths.clear();
        this._lazyMounting = false;
    }

    /** Clear the lazy-mounting flag only if no mounts remain in flight. */
    private _maybeClearLazyMounting(): void {
        if (this.mountingPaths.size === 0) {
            this._lazyMounting = false;
        }
    }

    private renderView(container: HTMLElement): void {
        this.detachAllEmbedded();
        container.empty();

        // Plain Text mode is persisted to localStorage (see
        // loadPlainTextPref / persistPlainTextPref) so the last toolbar
        // choice survives view switches and Obsidian restarts. No need to
        // re-read it here — the field is initialised from storage at
        // construction time and kept in sync by the toolbar handler.

        // Toolbar
        const toolbar = container.createDiv('story-line-toolbar');
        const titleRow = toolbar.createDiv('story-line-title-row');
        titleRow.createEl('h3', { cls: 'story-line-view-title', text: 'StoryLine' });

        // View switcher tabs
        renderViewSwitcher(toolbar, MANUSCRIPT_VIEW_TYPE, this.plugin, this.leaf);

        // Filters
        const filterContainer = container.createDiv('story-line-filters-container');
        this.filtersComponent = new FiltersComponent(
            filterContainer,
            this.sceneManager,
            (filter, sort) => {
                this.currentFilter = filter;
                this.currentSort = sort;
                this.renderManuscript();
            },
            this.plugin
        );
        this.filtersComponent.render();

        // Plain-text toggle (same style as Board view's Scenes on/off)
        const filterBar = filterContainer.querySelector('.story-line-filter-bar');
        if (filterBar) {
            // Focus mode icon — insert before the search wrapper
            const searchWrapper = filterBar.querySelector('.story-line-search-wrapper');
            const focusBtn = (filterBar as HTMLElement).createEl('button', { cls: 'sl-focus-btn clickable-icon' });
            focusBtn.setAttribute('aria-label', 'Focus mode');
            setIcon(focusBtn, 'glasses');
            if (this._focusMode) focusBtn.addClass('is-active');
            focusBtn.addEventListener('click', () => {
                this._focusMode = !this._focusMode;
                focusBtn.toggleClass('is-active', this._focusMode);
                container.toggleClass('sl-manuscript-focus', this._focusMode);
                this.applyFocusCssVars(container);
                this.toggleSidebarVisibility(!this._focusMode);
                if (!this._focusMode) {
                    this.scrollArea?.querySelectorAll('.sl-focus-active').forEach(
                        el => el.removeClass('sl-focus-active'),
                    );
                }
            });
            if (searchWrapper) {
                filterBar.insertBefore(focusBtn, searchWrapper);
            } else {
                (filterBar as HTMLElement).prepend(focusBtn);
            }
            if (this._focusMode) {
                container.addClass('sl-manuscript-focus');
                this.applyFocusCssVars(container);
                this.toggleSidebarVisibility(false);
            }

            const plainWrap = (filterBar as HTMLElement).createEl('label', { cls: 'sl-toggle-wrap' });
            plainWrap.createSpan({ cls: 'sl-toggle-label', text: 'Plain text' });
            const plainCb = plainWrap.createEl('input', { type: 'checkbox' });
            plainCb.checked = this._plainText;
            plainWrap.createSpan({ cls: 'sl-toggle-track' });
            plainCb.addEventListener('change', () => {
                this._plainText = plainCb.checked;
                this.persistPlainTextPref();
                this.scrollArea?.toggleClass('sl-manuscript-plain', this._plainText);
            });

            const lockWrap = (filterBar as HTMLElement).createEl('label', { cls: 'sl-toggle-wrap' });
            lockWrap.createSpan({ cls: 'sl-toggle-label', text: 'Lock links' });
            const lockCb = lockWrap.createEl('input', { type: 'checkbox' });
            lockCb.checked = this._lockLinks;
            lockWrap.createSpan({ cls: 'sl-toggle-track' });
            lockCb.addEventListener('change', () => {
                this._lockLinks = lockCb.checked;
                this.updateAtomicLinks();
            });
        }

        // Formatting toolbar (hidden until an editor is focused)
        if (this.plugin.settings.showFormattingToolbar) {
            this.fmtToolbar = container.createDiv('sl-fmt-toolbar');
            this.fmtToolbar.setCssStyles({ display: 'none' });
            this.buildFormattingToolbar(this.fmtToolbar);
        }

        // Issue #195 — cross-scene search & replace bar (hidden by default).
        // Opened via the editor right-click menu (see main.ts editor-menu
        // handler for MANUSCRIPT_VIEW_TYPE) so it appears alongside
        // Obsidian's own editor menu items.
        this.buildSearchPanel(container);

        // Manuscript scroll area
        this.scrollArea = container.createDiv('sl-manuscript-scroll');
        if (this._plainText) this.scrollArea.addClass('sl-manuscript-plain');

        // Track focus in embedded editors — show/hide formatting toolbar
        this.scrollArea.addEventListener('focusin', (e) => {
            this._hasActiveFocus = true;
            // Find which embedded leaf owns the focused element
            const target = e.target as HTMLElement;
            for (const [path, leaf] of this.embeddedLeaves) {
                const splitEl = (leaf as unknown as { containerEl?: { parentElement?: HTMLElement | null } }).containerEl?.parentElement;
                if (splitEl?.contains(target)) {
                    this.activeLeaf = leaf;
                    // Discussion #183 — track which scene is being edited so
                    // we can restore focus to it after a view switch.
                    this.editingScenePath = path;
                    // In focus mode, highlight the active scene block
                    if (this._focusMode) {
                        this.scrollArea?.querySelectorAll('.sl-focus-active').forEach(
                            el => el.removeClass('sl-focus-active'),
                        );
                        const block = splitEl.closest('.sl-manuscript-scene-block');
                        if (block) block.addClass('sl-focus-active');
                    }
                    break;
                }
            }
            if (this.fmtToolbar) this.fmtToolbar.setCssStyles({ display: '' });
        });
        this.scrollArea.addEventListener('focusout', () => {
            // Discussion #183 — capture the cursor + scroll position the
            // instant the editor loses focus, so a subsequent re-render
            // (triggered by switching to Codex and back) can restore it.
            this.captureCurrentState();
            window.setTimeout(() => {
                if (!this.scrollArea?.contains(activeDocument.activeElement)) {
                    this._hasActiveFocus = false;
                    this.activeLeaf = null;
                    if (this.fmtToolbar) this.fmtToolbar.setCssStyles({ display: 'none' });
                }
            }, 100);
        });

        // Footer word count
        this.footerEl = container.createDiv('sl-manuscript-footer');

        // Set up IntersectionObserver to track which scene is in view
        this.setupFocusObserver();

        this.renderManuscript();
    }

    /** Build a cache key from the current filter + sort configuration */
    private computeFilterKey(): string {
        return JSON.stringify(this.currentFilter) + '|' + JSON.stringify(this.currentSort);
    }

    private async renderManuscript(): Promise<void> {
        if (!this.scrollArea || !this.footerEl) return;
        this.detachAllEmbedded();
        this.scrollArea.empty();
        this.footerEl.empty();

        const filterKey = this.computeFilterKey();
        let scenes: Scene[];

        // Re-use cached scene list if filter/sort unchanged and count matches
        const allCount = this.sceneManager.getAllScenes().length;
        if (
            filterKey === this._lastFilterKey &&
            this._lastScenes.length > 0 &&
            this._lastScenes.length <= allCount
        ) {
            scenes = this._lastScenes;
        } else {
            scenes = this.sceneManager.queryService.getFilteredScenes(this.currentFilter, this.currentSort)
                .filter(s => !s.corkboardNote);

            // When user picks a non-structural sort (e.g. "title"), respect it
            // directly from getFilteredScenes. Otherwise default to act → chapter
            // → sequence so scenes are grouped properly under act/chapter dividers.
            const sortField = this.currentSort?.field;
            if (!sortField || sortField === 'sequence' || sortField === 'status') {
                scenes.sort((a, b) => {
                    // Numeric-aware compare so 10 sorts after 2 and "1.1" / "1.10"
                    // / "2.1" stay in order.  Missing values sort last.
                    const actCmp = compareActChapter(a.act, b.act);
                    if (actCmp !== 0) return actCmp;
                    const chCmp = compareActChapter(a.chapter, b.chapter);
                    if (chCmp !== 0) return chCmp;
                    return (a.sequence ?? 9999) - (b.sequence ?? 9999);
                });
            }

            this._lastScenes = scenes;
            this._lastFilterKey = filterKey;
        }

        if (scenes.length === 0) {
            this.scrollArea.createDiv({
                cls: 'sl-manuscript-empty',
                text: 'No scenes match the current filters.',
            });
            this.footerEl.setText('0 Words');
            return;
        }

        // Lazy loading observer — mount editors as they scroll into view
        this.lazyObserver?.disconnect();
        this.lazyObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const el = entry.target as HTMLElement;
                        const path = el.dataset.scenePath;
                        if (path && !this.embeddedLeaves.has(path) && !this.mountingPaths.has(path)) {
                            this.mountEditor(el, path);
                        }
                    }
                }
            },
            { root: this.scrollArea, rootMargin: '400px 0px' }
        );

        let totalWords = 0;
        let totalChars = 0;
        let lastAct: string | number | undefined;
        let lastChapter: string | number | undefined;
        // Issue #105 — track the previous scene block so we can mark it
        // when followed by an act/chapter divider (replaces a former
        // :has() rule, which is expensive due to broad invalidation).
        let prevBlock: HTMLElement | null = null;

        const editorContainers: { el: HTMLElement; path: string }[] = [];

        for (const scene of scenes) {
            // Act divider
            if (scene.act !== undefined && scene.act !== lastAct) {
                lastAct = scene.act;
                lastChapter = undefined;
                if (prevBlock) prevBlock.classList.add('is-before-divider');
                const actDiv = this.scrollArea.createDiv('sl-manuscript-act-divider');
                const actLabel = this.sceneManager.getActLabel(Number(scene.act));
                const actDisplay = getActDisplayLabel(scene.act);
                actDiv.createSpan({
                    cls: 'sl-manuscript-act-label',
                    text: actLabel ? `${actDisplay}: ${actLabel}` : actDisplay,
                });
            }

            // Chapter divider
            if (scene.chapter !== undefined && scene.chapter !== lastChapter) {
                lastChapter = scene.chapter;
                if (prevBlock) prevBlock.classList.add('is-before-divider');
                const chapDiv = this.scrollArea.createDiv('sl-manuscript-chapter-divider');
                const chapLabel = this.sceneManager.getChapterLabel(Number(scene.chapter));
                chapDiv.createSpan({
                    cls: 'sl-manuscript-chapter-label',
                    text: chapLabel ? `Chapter ${scene.chapter}: ${chapLabel}` : `Chapter ${scene.chapter}`,
                });
            }

            // Scene block
            const block = this.scrollArea.createDiv('sl-manuscript-scene-block');
            prevBlock = block;
            block.dataset.scenePath = scene.filePath;
            if (this.focusObserver) this.focusObserver.observe(block);

            // Scene header: title + status badge
            const header = block.createDiv('sl-manuscript-scene-header');
            const titleEl = header.createSpan({
                cls: 'sl-manuscript-scene-title',
                text: scene.title,
            });
            titleEl.addEventListener('click', () => {
                const file = this.app.vault.getAbstractFileByPath(scene.filePath);
                if (file instanceof TFile) {
                    this.app.workspace.getLeaf('tab').openFile(file);
                }
            });
            if (scene.status) {
                header.createSpan({
                    cls: `sl-manuscript-status sl-status-${scene.status}`,
                    text: scene.status,
                });
            }
            if (scene.subtitle) {
                header.createSpan({
                    cls: 'sl-manuscript-scene-subtitle',
                    text: scene.subtitle,
                });
            }

            // Editor container — track for eager mounting, observe for lazy loading
            const editorWrap = block.createDiv('sl-manuscript-editor-wrap');
            editorWrap.dataset.scenePath = scene.filePath;
            editorWrap.createDiv({ cls: 'sl-manuscript-loading', text: 'Loading…' });
            this.lazyObserver.observe(editorWrap);
            editorContainers.push({ el: editorWrap, path: scene.filePath });

            if (!(this.plugin.settings.excludeArcAnchorFromWordcount && scene.arcAnchor)) {
                totalWords += scene.wordcount ?? 0;
                totalChars += scene.charcount ?? 0;
            }
        }

        // Footer — Issue #240: honour the user's countUnit setting ('words'
        // or 'chars') instead of always showing a word count.
        const useChars = this.plugin.settings.countUnit === 'chars';
        const value = useChars ? totalChars : totalWords;
        const unitLabel = useChars ? 'chars' : (value === 1 ? 'word' : 'words');
        this.footerEl.setText(`${scenes.length} scenes · ${value.toLocaleString()} ${unitLabel}`);

        // Eagerly mount the first few editors immediately (don't wait for IntersectionObserver)
        this._isMounting = true;
        const eagerCount = Math.min(3, editorContainers.length);
        for (let i = 0; i < eagerCount; i++) {
            await this.mountEditor(editorContainers[i].el, editorContainers[i].path);
        }
        this._isMounting = false;

        // Discussion #183 — after the initial render, restore the saved
        // scroll position and cursor. On a fresh open (no in-memory state)
        // we fall back to the persisted state on disk.
        this.restoreStateAfterRender();
    }

    /** Mount a real Obsidian MarkdownView (Live Preview) inside the given container */
    private async mountEditor(container: HTMLElement, filePath: string): Promise<void> {
        if (this.embeddedLeaves.has(filePath) || this.mountingPaths.has(filePath)) return;
        this.mountingPaths.add(filePath);
        this._lazyMounting = true;

        // Capture a token for this mount so we can detect if a teardown
        // (detachAllEmbedded) ran while we were awaiting openFile(). Without
        // this, a refresh() triggered by the modify event from openFile()
        // would leave us writing into a detached container.
        const mountToken = Symbol('mount');
        this._activeMountToken = mountToken;

        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof TFile)) {
            this.mountingPaths.delete(filePath);
            this._maybeClearLazyMounting();
            return;
        }

        // Bail if the container was detached while we were looking up the file.
        if (!container.isConnected || this._activeMountToken !== mountToken) {
            this.mountingPaths.delete(filePath);
            this._maybeClearLazyMounting();
            return;
        }

        container.empty(); // Remove "Loading…" placeholder

        // On mobile (phone + tablet), embedded WorkspaceSplit editors
        // don't render reliably. Fall back to static rendered markdown.
        if (isPhone || isTablet) {
            this.mountingPaths.delete(filePath);
            this._maybeClearLazyMounting();
            await this.mountReadOnlyPreview(container, filePath);
            return;
        }

        try {
            // Create a detached WorkspaceSplit to host the embedded leaf
            const split = new (WorkspaceSplit as unknown as new (workspace: unknown, dir: string) => WorkspaceSplit)(this.app.workspace, 'vertical');
            const splitEl: HTMLElement = (split as unknown as { containerEl: HTMLElement }).containerEl;
            container.appendChild(splitEl);
            splitEl.classList.add('sl-manuscript-embedded-split');

            // Initial height seed so the absolute-positioned workspace-leaf
            // chain has a viewport for CM6 to render into.
            splitEl.setCssStyles({ height: '300px' });

            const leaf = this.app.workspace.createLeafInParent(split, 0);

            await leaf.openFile(file, {
                state: { mode: 'source', source: false },
            });

            // A vault 'modify' event from openFile() (or any other source)
            // may have triggered refreshOpenViews() → refresh() while we
            // were awaiting. refresh() now bails on _lazyMounting, but a
            // *previous* render cycle could still have called
            // detachAllEmbedded(). Detect that via the mount token and
            // bail cleanly instead of registering a detached leaf.
            if (this._activeMountToken !== mountToken || !splitEl.isConnected) {
                try { leaf.detach(); } catch { /* already gone */ }
                this.mountingPaths.delete(filePath);
                this._maybeClearLazyMounting();
                return;
            }

            this.embeddedLeaves.set(filePath, leaf);
            this.mountingPaths.delete(filePath);
            this._maybeClearLazyMounting();

            // Inject the atomic-links extension into the CM6 editor
            this.injectAtomicExtension(leaf);

            // Measurement strategy:
            //   Read cm-content's actual rendered DOM height. Because we set
            //   `.cm-scroller { overflow: visible }` in CSS, CM6 lays out
            //   every line into the DOM at its true (wrapped) height, so
            //   `cm-content.getBoundingClientRect().height` is the ground
            //   truth — no need to expand splitEl to 8000px to force render.
            //
            //   We deliberately avoid `EditorView.contentHeight` here:
            //   CM6's internal height map adds the scrollPastEnd extension's
            //   ~70vh of padding, which we strip visually via CSS but cannot
            //   remove from the height map. Using it would make every scene
            //   block ~70vh too tall (the empty gap users reported).
            let rafPending = false;
            let syncing = false;
            const syncHeight = () => {
                if (syncing) return;
                const cm = this.getCmView(leaf);
                if (!cm) return;
                syncing = true;
                cm.requestMeasure({
                    read: () => {
                        const content = splitEl.querySelector('.cm-content') as HTMLElement | null;
                        if (!content) return 0;
                        const contentRect = content.getBoundingClientRect();
                        const splitTop = splitEl.getBoundingClientRect().top;
                        // Offset of cm-content from splitEl's top (chrome /
                        // padding above the editor body — normally ~0 after
                        // our chrome strip, but kept as a safety term).
                        const offset = Math.max(0, contentRect.top - splitTop);
                        return contentRect.height + offset;
                    },
                    write: (h) => {
                        if (h > 0) {
                            const px = Math.ceil(h) + 'px';
                            splitEl.setCssStyles({ height: px });
                            container.setCssStyles({ height: px });
                        }
                        syncing = false;
                    },
                });
            };

            const debouncedSync = () => {
                if (rafPending) return;
                rafPending = true;
                window.requestAnimationFrame(() => {
                    rafPending = false;
                    syncHeight();
                });
            };

            // CM6 may render lazily; sync across multiple frames.
            window.requestAnimationFrame(() => {
                syncHeight();
                window.requestAnimationFrame(() => {
                    syncHeight();
                    window.setTimeout(syncHeight, 300);
                });
            });

            // On mobile/tablet, poll until height stabilises (CM6 can
            // take a long time to lay out content on mobile browsers).
            if (isMobile) {
                let lastH = 0;
                let stableCount = 0;
                const poll = window.setInterval(() => {
                    syncHeight();
                    const sizer = splitEl.querySelector('.cm-sizer') as HTMLElement | null;
                    const h = sizer
                        ? Math.max(sizer.getBoundingClientRect().height, sizer.offsetHeight)
                        : 0;
                    if (h > 0 && Math.abs(h - lastH) < 2) {
                        stableCount++;
                        if (stableCount >= 3) window.clearInterval(poll);
                    } else {
                        stableCount = 0;
                        lastH = h;
                    }
                }, 250);
                window.setTimeout(() => window.clearInterval(poll), 10000);
            }

            // Keep height synced as user edits (content grows/shrinks).
            // Observe both .cm-editor and .cm-content — the inner content
            // node may resize independently.
            const cmEl = splitEl.querySelector('.cm-editor') as HTMLElement | null;
            const cmContent = splitEl.querySelector('.cm-content') as HTMLElement | null;
            if (cmEl) {
                const ro = new ResizeObserver(() => debouncedSync());
                ro.observe(cmEl);
                if (cmContent && cmContent !== cmEl) ro.observe(cmContent);
                this.editorResizeObservers.set(filePath, ro);
            }

            // Discussion #183 — capture the cursor position on blur so it
            // survives the view switch. The scrollArea-level focusout can
            // fire too late (after the view is being torn down), so we
            // also listen on the CM6 content element directly.
            if (cmContent) {
                cmContent.addEventListener('blur', () => {
                    this.editingScenePath = filePath;
                    this.captureCurrentState();
                });
                // Also capture on keyup/click so the module-level state always
                // has the latest cursor position, even if blur never fires
                // (e.g. the user switches tabs via a keyboard shortcut).
                cmContent.addEventListener('keyup', () => {
                    this.editingScenePath = filePath;
                    this.captureCurrentState();
                });
                cmContent.addEventListener('click', () => {
                    this.editingScenePath = filePath;
                    this.captureCurrentState();
                });
            }
        } catch (err) {
            this.mountingPaths.delete(filePath);
            this._maybeClearLazyMounting();
            console.warn('StoryLine: embedded editor failed, falling back to preview', err);
            // Only fall back if the container is still attached — if a
            // teardown happened, there's nothing to render into.
            if (container.isConnected) {
                await this.mountReadOnlyPreview(container, filePath);
            }
        }
    }

    /** Render scene body as static markdown (read-only fallback for mobile) */
    private async mountReadOnlyPreview(
        container: HTMLElement,
        filePath: string,
    ): Promise<void> {
        const scene = this.sceneManager.getScene(filePath);
        const text = (scene?.body ?? '').trim();
        if (text) {
            const previewEl = container.createDiv('sl-manuscript-preview');
            await MarkdownRenderer.render(this.app, text, previewEl, filePath, this);
            // Issue #226 — French (and other) typography uses non-breaking
            // spaces (U+00A0) inside guillemets « ». markdown-it HTML-encodes
            // U+00A0 as the literal entity string "&nbsp;". When that string
            // ends up in a text node (rather than being parsed as HTML), it
            // shows as visible "&nbsp;" text. Walk the rendered DOM and
            // replace any literal "&nbsp;" / "&#160;" text back to U+00A0.
            this.decodeNbspEntities(previewEl);
        } else {
            container.createDiv({ cls: 'sl-manuscript-scene-empty', text: 'Empty scene' });
        }
    }

    /**
     * Issue #226 — replace literal "&nbsp;" / "&#160;" / "&#xA0;" strings
     * that appear in text nodes with an actual non-breaking space (U+00A0).
     * markdown-it encodes U+00A0 as an HTML entity; if the entity survives
     * into a text node it renders as visible text instead of a space.
     */
    private decodeNbspEntities(root: HTMLElement): void {
        const walker = activeDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const targets: Text[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
            const t = node as Text;
            if (t.nodeValue && /&(nbsp|#160|#xA0);/i.test(t.nodeValue)) {
                targets.push(t);
            }
        }
        for (const t of targets) {
            t.nodeValue = t.nodeValue!
                .replace(/&nbsp;/gi, '\u00A0')
                .replace(/&#160;/gi, '\u00A0')
                .replace(/&#xA0;/gi, '\u00A0');
        }
    }

    /** Get the CM6 EditorView from an embedded workspace leaf */
    private getCmView(leaf: WorkspaceLeaf): EditorView | null {
        const editor = (leaf.view as unknown as { editor?: { cm?: EditorView } })?.editor;
        return editor?.cm ?? null;
    }

    /**
     * Build a CM6 extension that makes wiki-link and tag ranges atomic.
     * When enabled, the cursor skips over link/tag text.
     */
    private buildAtomicExtension(): ReturnType<typeof EditorView.atomicRanges.of> {
        return EditorView.atomicRanges.of((view) => {
            const builder = new RangeSetBuilder<Decoration>();
            const tree = syntaxTree(view.state);
            // Walk the syntax tree and mark internal-link and tag nodes
            tree.iterate({
                enter(node: { name: string; from: number; to: number }) {
                    // Obsidian uses these node names for wiki-links and tags
                    // in its markdown parser. Internal links are typically
                    // "hmd-internal-link" ranges; tags are "hashtag" ranges.
                    const name = node.name;
                    if (
                        name.includes('hmd-internal-link') ||
                        name.includes('internal-link') ||
                        name === 'hashtag' ||
                        name.includes('HyperMD-internal-link') ||
                        name.includes('formatting-link')
                    ) {
                        // Avoid duplicate overlapping ranges — only mark leaf nodes
                        if (node.from < node.to) {
                            builder.add(node.from, node.to, Decoration.mark({}));
                        }
                    }
                },
            });
            return builder.finish();
        });
    }

    /** Inject the atomic-links compartment into a single embedded editor */
    private injectAtomicExtension(leaf: WorkspaceLeaf): void {
        const cm = this.getCmView(leaf);
        if (!cm) return;
        const ext = this._lockLinks ? this.buildAtomicExtension() : [];
        cm.dispatch({
            effects: StateEffect.appendConfig.of(
                this.atomicCompartment.of(ext)
            ),
        });
    }

    /** Toggle atomic links on/off in all currently mounted editors */
    private updateAtomicLinks(): void {
        const ext = this._lockLinks ? this.buildAtomicExtension() : [];
        for (const [, leaf] of this.embeddedLeaves) {
            const cm = this.getCmView(leaf);
            if (!cm) continue;
            cm.dispatch({
                effects: this.atomicCompartment.reconfigure(ext),
            });
        }
    }

    /** Get the CM6 EditorView from the currently focused embedded editor */
    private getActiveCm(): EditorView | null {
        if (!this.activeLeaf) return null;
        return this.getCmView(this.activeLeaf);
    }

    /** Build the formatting toolbar buttons */
    private buildFormattingToolbar(el: HTMLElement): void {
        buildFormattingToolbar(el, () => this.getActiveCm());
    }

    // ── Issue #195 — cross-scene search & replace ───────────────────

    /** Build the search & replace panel (hidden until toggled). */
    private buildSearchPanel(container: HTMLElement): void {
        const panel = container.createDiv('sl-manuscript-search');
        panel.setCssStyles({ display: 'none' });
        this.searchPanel = panel;

        const row = panel.createDiv('sl-manuscript-search-row');
        const findIcon = row.createSpan();
        setIcon(findIcon, 'search');

        const input = row.createEl('input', {
            cls: 'sl-manuscript-search-input',
            attr: { type: 'text', placeholder: 'Find in manuscript…', 'aria-label': 'Find in manuscript' },
        });
        this.searchInput = input;

        const count = row.createSpan({ cls: 'sl-manuscript-search-count', text: '' });

        const prevBtn = row.createEl('button', { cls: 'sl-manuscript-search-btn', attr: { 'aria-label': 'Previous match', title: 'Previous (Shift+Enter)' } });
        setIcon(prevBtn, 'chevron-up');
        prevBtn.addEventListener('click', () => this.searchNext(false));

        const nextBtn = row.createEl('button', { cls: 'sl-manuscript-search-btn', attr: { 'aria-label': 'Next match', title: 'Next (enter)' } });
        setIcon(nextBtn, 'chevron-down');
        nextBtn.addEventListener('click', () => this.searchNext(true));

        const caseBtn = row.createEl('button', { cls: 'sl-manuscript-search-toggle', attr: { 'aria-label': 'Match case', title: 'Match case' } });
        caseBtn.setText('Aa');
        caseBtn.addEventListener('click', () => {
            this.searchCaseSensitive = !this.searchCaseSensitive;
            caseBtn.toggleClass('is-active', this.searchCaseSensitive);
            this.runSearch();
        });

        const wordBtn = row.createEl('button', { cls: 'sl-manuscript-search-toggle', attr: { 'aria-label': 'Whole word', title: 'Whole word' } });
        setIcon(wordBtn, 'whole-word');
        wordBtn.addEventListener('click', () => {
            this.searchWholeWord = !this.searchWholeWord;
            wordBtn.toggleClass('is-active', this.searchWholeWord);
            this.runSearch();
        });

        const regexBtn = row.createEl('button', { cls: 'sl-manuscript-search-toggle', attr: { 'aria-label': 'Regular expression', title: 'Regex' } });
        regexBtn.setText('.*');
        regexBtn.addEventListener('click', () => {
            this.searchRegex = !this.searchRegex;
            regexBtn.toggleClass('is-active', this.searchRegex);
            this.runSearch();
        });

        const closeBtn = row.createEl('button', { cls: 'sl-manuscript-search-btn', attr: { 'aria-label': 'Close', title: 'Close (esc)' } });
        setIcon(closeBtn, 'x');
        closeBtn.addEventListener('click', () => this.closeSearch());

        // Replace row
        const replaceRow = panel.createDiv('sl-manuscript-search-row sl-manuscript-replace-row');
        const replaceIcon = replaceRow.createSpan();
        setIcon(replaceIcon, 'replace');

        const replaceInput = replaceRow.createEl('input', {
            cls: 'sl-manuscript-search-input',
            attr: { type: 'text', placeholder: 'Replace…', 'aria-label': 'Replace' },
        });
        this.replaceInput = replaceInput;

        const replaceBtn = replaceRow.createEl('button', { cls: 'sl-manuscript-search-btn', attr: { 'aria-label': 'Replace this match', title: 'Replace' } });
        setIcon(replaceBtn, 'replace');
        replaceBtn.addEventListener('click', () => this.replaceCurrent());

        const replaceAllBtn = replaceRow.createEl('button', { cls: 'sl-manuscript-search-btn', attr: { 'aria-label': 'Replace all matches', title: 'Replace all' } });
        setIcon(replaceAllBtn, 'check-check');
        replaceAllBtn.addEventListener('click', () => this.replaceAll());

        // Wire up input events
        input.addEventListener('input', () => this.runSearch());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.searchNext(!e.shiftKey);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.closeSearch();
            }
        });
        replaceInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.replaceCurrent();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.closeSearch();
            }
        });
    }

    /** Toggle the search panel open/closed. */
    toggleSearch(): void {
        if (!this.searchPanel) return;
        const open = this.searchPanel.style.display === 'none';
        this.searchPanel.setCssStyles({ display: open ? '' : 'none' });
        if (open) {
            this.searchInput?.focus();
            this.searchInput?.select();
            if (this.searchInput && this.searchInput.value) this.runSearch();
        } else {
            this.clearSearchHighlights();
        }
    }

    /** Whether the search panel is currently open. */
    isSearchOpen(): boolean {
        return !!this.searchPanel && this.searchPanel.style.display !== 'none';
    }

    /** Close the search panel. */
    private closeSearch(): void {
        this.searchPanel?.setCssStyles({ display: 'none' });
        this.clearSearchHighlights();
        this.searchMatches = [];
        this.searchMatchTotal = 0;
        this.searchMatchIndex = -1;
        this.updateSearchCount();
    }

    /** Build a RegExp from the current search input + options. */
    private buildSearchRegex(): RegExp | null {
        const term = this.searchInput?.value ?? '';
        if (!term) return null;
        let flags = 'g';
        if (!this.searchCaseSensitive) flags += 'i';
        let pattern = this.searchRegex ? term : term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (this.searchWholeWord && !this.searchRegex) pattern = `\\b${pattern}\\b`;
        try {
            return new RegExp(pattern, flags);
        } catch {
            return null;
        }
    }

    /**
     * Get the current text of a scene for search/replace purposes.
     * Prefers the live CM6 editor (so unsaved edits are included); falls
     * back to the SceneManager's cached body for unmounted scenes.
     */
    private getSceneText(path: string): string | null {
        const leaf = this.embeddedLeaves.get(path);
        if (leaf) {
            const cm = this.getCmView(leaf);
            if (cm) return cm.state.doc.toString();
        }
        const scene = this.sceneManager.getScene(path);
        return scene?.body ?? null;
    }

    /**
     * Run a fresh search across the entire book.
     *
     * Issue #195 — searches every scene in the current filter/sort scope,
     * not just the mounted editors. Unmounted scenes are read from the
     * SceneManager cache so users can find matches across the whole book
     * without scrolling every scene into view first.
     */
    private runSearch(): void {
        this.clearSearchHighlights();
        this.searchMatches = [];
        const re = this.buildSearchRegex();
        if (!re) {
            this.searchMatchTotal = 0;
            this.searchMatchIndex = -1;
            this.updateSearchCount();
            return;
        }

        // Use the same scene list currently rendered in the manuscript
        // (respects active filters/sort) so search scope matches what the
        // user sees.
        const scenes = this._lastScenes.length > 0
            ? this._lastScenes
            : this.sceneManager.queryService
                .getFilteredScenes(this.currentFilter, this.currentSort)
                .filter(s => !s.corkboardNote);

        for (const scene of scenes) {
            const text = this.getSceneText(scene.filePath);
            if (text == null) continue;
            re.lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = re.exec(text)) !== null) {
                if (m[0].length === 0) { re.lastIndex++; continue; }
                this.searchMatches.push({
                    path: scene.filePath,
                    from: m.index,
                    to: m.index + m[0].length,
                });
            }
        }

        this.searchMatchTotal = this.searchMatches.length;
        this.searchMatchIndex = this.searchMatchTotal > 0 ? 0 : -1;
        // Highlight the first match in its editor WITHOUT stealing focus
        // from the search input (Issue #195). scrollToMatch() (which does
        // focus the editor) is only called on explicit next/previous
        // navigation.
        this.applySearchHighlights();
        this.updateSearchCount();
    }

    /** Move to the next/previous match. */
    private searchNext(forward: boolean): void {
        if (this.searchMatches.length === 0) {
            this.runSearch();
            return;
        }
        if (forward) {
            this.searchMatchIndex = (this.searchMatchIndex + 1) % this.searchMatches.length;
        } else {
            this.searchMatchIndex = (this.searchMatchIndex - 1 + this.searchMatches.length) % this.searchMatches.length;
        }
        this.updateSearchCount();
        void this.scrollToMatch(this.searchMatchIndex);
    }

    /** Update the "x of y" counter. */
    private updateSearchCount(): void {
        const el = this.searchPanel?.querySelector('.sl-manuscript-search-count') as HTMLElement | null;
        if (!el) return;
        if (this.searchMatchTotal === 0) {
            el.setText(this.searchInput?.value ? 'No results' : '');
        } else {
            el.setText(`${this.searchMatchIndex + 1} of ${this.searchMatchTotal}`);
        }
    }

    /** Apply CM6 selection-based highlight to the current match. */
    private applySearchHighlights(): void {
        if (this.searchMatchIndex < 0 || this.searchMatchIndex >= this.searchMatches.length) return;
        const match = this.searchMatches[this.searchMatchIndex];
        const leaf = this.embeddedLeaves.get(match.path);
        if (!leaf) return;
        const cm = this.getCmView(leaf);
        if (!cm) return;
        cm.dispatch({
            selection: EditorSelection.single(match.from, match.to),
            scrollIntoView: true,
        });
        // Do NOT call cm.focus() here — doing so while the user is typing
        // in the search input steals focus after the first keystroke
        // (Issue #195). Focus is only moved to the editor when the user
        // explicitly navigates to a match via scrollToMatch().
    }

    /** Clear search highlights by collapsing selections in all editors. */
    private clearSearchHighlights(): void {
        for (const [, leaf] of this.embeddedLeaves) {
            const cm = this.getCmView(leaf);
            if (!cm) continue;
            const sel = cm.state.selection.main;
            if (sel.from !== sel.to) {
                cm.dispatch({ selection: EditorSelection.single(sel.head, sel.head) });
            }
        }
    }

    /** Scroll the manuscript so the given match is visible. */
    private async scrollToMatch(idx: number): Promise<void> {
        if (idx < 0 || idx >= this.searchMatches.length) return;
        const match = this.searchMatches[idx];
        // Ensure the scene editor is mounted so we can highlight the match.
        if (!this.embeddedLeaves.has(match.path)) {
            const block = this.scrollArea?.querySelector(
                `[data-scene-path="${CSS.escape(match.path)}"]`
            ) as HTMLElement | null;
            const editorWrap = block?.querySelector('.sl-manuscript-editor-wrap') as HTMLElement | null;
            if (editorWrap) await this.mountEditor(editorWrap, match.path);
        }
        const block = this.scrollArea?.querySelector(
            `[data-scene-path="${CSS.escape(match.path)}"]`
        ) as HTMLElement | null;
        if (block) block.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Give the editor a frame to lay out before selecting. Focus the
        // editor here because this is an explicit navigation action (next/
        // previous match), unlike runSearch() which must keep focus in the
        // search input while the user types.
        window.requestAnimationFrame(() => {
            this.applySearchHighlights();
            const leaf = this.embeddedLeaves.get(match.path);
            if (leaf) {
                const cm = this.getCmView(leaf);
                cm?.focus();
            }
        });
    }

    /**
     * Replace the current match.
     *
     * If the scene's editor is mounted, the replacement is applied directly
     * via CM6 (so the user sees it immediately). If the scene is not
     * mounted, the file is rewritten via SceneManager.updateScene so the
     * change still lands on disk.
     */
    private async replaceCurrent(): Promise<void> {
        if (this.searchMatchIndex < 0 || this.searchMatchIndex >= this.searchMatches.length) return;
        const replacement = this.replaceInput?.value ?? '';
        const match = this.searchMatches[this.searchMatchIndex];
        const leaf = this.embeddedLeaves.get(match.path);

        if (leaf) {
            const cm = this.getCmView(leaf);
            if (!cm) return;
            cm.dispatch({
                changes: { from: match.from, to: match.to, insert: replacement },
                selection: EditorSelection.single(match.from, match.from + replacement.length),
            });
        } else {
            // Scene not mounted — rewrite the body via SceneManager.
            const scene = this.sceneManager.getScene(match.path);
            if (!scene) return;
            const body = scene.body ?? '';
            const newBody = body.slice(0, match.from) + replacement + body.slice(match.to);
            await this.sceneManager.updateScene(match.path, { body: newBody });
        }

        // Wait for the file modify event to propagate, then re-run search.
        await new Promise(r => window.setTimeout(r, 200));
        this.runSearch();
    }

    /**
     * Replace all matches across the entire book.
     *
     * Mounted scenes are updated via CM6 dispatches; unmounted scenes are
     * rewritten via SceneManager.updateScene. Changes are applied
     * per-scene from end-to-start so offsets stay valid within each file.
     */
    private async replaceAll(): Promise<void> {
        if (this.searchMatches.length === 0) return;
        const replacement = this.replaceInput?.value ?? '';

        // Group matches by path.
        const byPath = new Map<string, { from: number; to: number }[]>();
        for (const m of this.searchMatches) {
            const arr = byPath.get(m.path) ?? [];
            arr.push({ from: m.from, to: m.to });
            byPath.set(m.path, arr);
        }

        let totalReplaced = 0;
        for (const [path, matches] of byPath) {
            const leaf = this.embeddedLeaves.get(path);
            if (leaf) {
                const cm = this.getCmView(leaf);
                if (!cm) continue;
                // Apply from end to start so offsets stay valid.
                const sorted = [...matches].sort((a, b) => b.from - a.from);
                const changes = sorted.map(m => ({ from: m.from, to: m.to, insert: replacement }));
                cm.dispatch({ changes });
                totalReplaced += matches.length;
            } else {
                // Unmounted scene — rewrite body via SceneManager.
                const scene = this.sceneManager.getScene(path);
                if (!scene) continue;
                let body = scene.body ?? '';
                const sorted = [...matches].sort((a, b) => b.from - a.from);
                for (const m of sorted) {
                    body = body.slice(0, m.from) + replacement + body.slice(m.to);
                }
                await this.sceneManager.updateScene(path, { body });
                totalReplaced += matches.length;
            }
        }

        new Notice(`Replaced ${totalReplaced} occurrence${totalReplaced === 1 ? '' : 's'}`);
        // Wait for file modify events to propagate, then re-run search.
        await new Promise(r => window.setTimeout(r, 300));
        this.runSearch();
    }

    /** Recalculate the footer word count from SceneManager data */
    private updateFooter(): void {
        if (!this.footerEl || this._focusMode) return;
        // Re-use cached scene list when filter/sort hasn't changed (avoids
        // re-filtering during editing when refresh() is called frequently)
        const key = this.computeFilterKey();
        const scenes = (key === this._lastFilterKey && this._lastScenes.length > 0)
            ? this._lastScenes
            : this.sceneManager.queryService.getFilteredScenes(this.currentFilter, this.currentSort)
                .filter(s => !s.corkboardNote);
        let totalWords = 0;
        let totalChars = 0;
        for (const s of scenes) {
            if (!(this.plugin.settings.excludeArcAnchorFromWordcount && s.arcAnchor)) {
                totalWords += s.wordcount ?? 0;
                totalChars += s.charcount ?? 0;
            }
        }
        // Issue #240 — honour the user's countUnit setting.
        const useChars = this.plugin.settings.countUnit === 'chars';
        const value = useChars ? totalChars : totalWords;
        const unitLabel = useChars ? 'chars' : (value === 1 ? 'word' : 'words');
        this.footerEl.setText(`${scenes.length} scenes · ${value.toLocaleString()} ${unitLabel}`);
    }

    /** Apply focus-mode effects via CSS custom properties; static rules live in styles.css. */
    private applyFocusCssVars(_container: HTMLElement): void {
        const s = this.plugin.settings;
        const opacity = 0.25;
        const darken = (s.focusDarkenAmount ?? 0) / 100;
        const blur = s.focusBlurAmount ?? 0;

        const body = activeDocument.body;

        if (this._focusMode) {
            body.addClass('sl-focus-active-global');

            const darkenFilter = darken > 0 ? `brightness(${1 - darken})` : '';
            const blurFilter = blur > 0 ? `blur(${blur}px)` : '';
            const combinedFilter = [darkenFilter, blurFilter].filter(Boolean).join(' ') || 'none';

            const bgBright = Math.round(255 * (1 - darken));
            const darkBg = `rgb(${bgBright}, ${bgBright}, ${bgBright})`;

            body.style.setProperty('--sl-focus-toolbar-opacity', String(opacity));
            body.style.setProperty('--sl-focus-bg', darkBg);
            body.style.setProperty('--sl-focus-filter', combinedFilter);
            body.toggleClass('sl-focus-has-darken', darken > 0);
        } else {
            body.removeClass('sl-focus-active-global');
            body.removeClass('sl-focus-has-darken');
            body.style.removeProperty('--sl-focus-toolbar-opacity');
            body.style.removeProperty('--sl-focus-bg');
            body.style.removeProperty('--sl-focus-filter');
        }
    }

    /** Stub — sidebar dimming now handled via CSS filter */
    private toggleSidebarVisibility(_visible: boolean): void { }

    /** IntersectionObserver to detect which scene block is most visible (for Inspector sync) */
    private setupFocusObserver(): void {
        this.focusObserver?.disconnect();
        if (!this.scrollArea) return;

        const visibleEntries = new Map<string, number>();
        // Debounce the Inspector sync so rapid scrolling (and the burst of
        // intersection entries it produces) doesn't hammer the sidebar on
        // every frame — a major contributor to the "flickering sidebar".
        let focusSyncTimer: number | null = null;
        const syncInspector = () => {
            if (focusSyncTimer !== null) return;
            focusSyncTimer = window.setTimeout(() => {
                focusSyncTimer = null;
                // Pick the scene with the highest intersection ratio
                let best: string | null = null;
                let bestRatio = 0;
                for (const [path, ratio] of visibleEntries) {
                    if (ratio > bestRatio) {
                        best = path;
                        bestRatio = ratio;
                    }
                }
                if (best && best !== this.focusedScenePath) {
                    this.focusedScenePath = best;
                    // Notify Inspector sidebar
                    this.app.workspace.trigger('storyline:manuscript-focus', best);
                }
            }, 120);
        };

        this.focusObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const path = (entry.target as HTMLElement).dataset.scenePath;
                    if (!path) continue;
                    visibleEntries.set(path, entry.intersectionRatio);
                    if (!entry.isIntersecting) visibleEntries.delete(path);
                }
                syncInspector();
            },
            {
                root: this.scrollArea,
                threshold: [0, 0.25, 0.5, 0.75, 1],
            }
        );
    }

    /**
     * Scroll the manuscript to bring the given scene into view.
     * Called by the Navigator when a scene is clicked while Manuscript is active.
     */
    scrollToScene(filePath: string): void {
        if (!this.scrollArea) return;
        const block = this.scrollArea.querySelector(
            `[data-scene-path="${CSS.escape(filePath)}"]`
        ) as HTMLElement | null;
        if (block) {
            block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // ── Discussion #183 — cursor / scroll position resume ────────────
    //
    // When the user switches to another StoryLine view (Codex, Plotgrid, etc.)
    // Obsidian destroys this ManuscriptView instance and creates a new one on
    // return. We keep the last cursor + scroll position in a module-level
    // variable (`_lastManuscriptState`) so the new instance can restore it.
    // We also persist to System/manuscript-state.json for the Obsidian-restart
    // case.

    private getManuscriptStateFile(): string {
        const base = this.plugin.getProjectSystemFolder();
        return `${base}/manuscript-state.json`;
    }

    /**
     * Capture the current cursor position + scroll position from the active
     * embedded editor into the module-level `_lastManuscriptState` variable.
     * Called on `focusout` and on `onClose` so the state survives view
     * instance destruction.
     */
    private captureCurrentState(): void {
        try {
            const scrollTop = this.scrollArea?.scrollTop ?? 0;
            // Use the editing scene (the one whose editor had focus), not
            // focusedScenePath (which is the most-visible scene and may be
            // different from the one being edited).
            const scenePath = this.editingScenePath ?? this.focusedScenePath;
            if (!scenePath) return;

            // Try to read the CM6 selection from the active leaf.
            let cursorAnchor: number | undefined;
            let cursorHead: number | undefined;
            const leaf = this.activeLeaf ?? this.embeddedLeaves.get(scenePath);
            if (leaf) {
                const cm = this.getCmView(leaf);
                if (cm) {
                    const sel = cm.state.selection.main;
                    cursorAnchor = sel.anchor;
                    cursorHead = sel.head;
                }
            }

            _lastManuscriptState = {
                scenePath,
                scrollTop,
                cursorAnchor,
                cursorHead,
            };
        } catch {
            // best-effort — ignore
        }
    }

    /**
     * Persist the module-level state to disk (called on close so it survives
     * an Obsidian restart).
     */
    private captureAndPersistState(): void {
        this.captureCurrentState();
        try {
            const adapter = this.app.vault.adapter;
            const path = this.getManuscriptStateFile();
            const payload = _lastManuscriptState
                ? { ..._lastManuscriptState, savedAt: Date.now() }
                : {
                      scenePath: this.editingScenePath ?? this.focusedScenePath ?? '',
                      scrollTop: this.scrollArea?.scrollTop ?? 0,
                      savedAt: Date.now(),
                  };
            void adapter.write(path, JSON.stringify(payload));
        } catch {
            // best-effort — never block close on a save failure
        }
    }

    /**
     * After renderManuscript() finishes, restore the saved scroll position
     * and cursor. Uses the module-level `_lastManuscriptState` if available
     * (view switch case); otherwise falls back to the persisted state on disk
     * (Obsidian restart case).
     */
    private restoreStateAfterRender(): void {
        if (_lastManuscriptState) {
            // In-memory state from a view switch — restore immediately.
            this.applyRestore(_lastManuscriptState);
            return;
        }

        // No in-memory state — try the persisted file (fresh open / restart).
        try {
            if (!this.scrollArea) return;
            const adapter = this.app.vault.adapter;
            const path = this.getManuscriptStateFile();
            void adapter.exists(path).then(exists => {
                if (!exists) return;
                void adapter.read(path).then(txt => {
                    try {
                        const data = JSON.parse(txt) as {
                            scenePath?: string | null;
                            scrollTop?: number;
                            cursorAnchor?: number;
                            cursorHead?: number;
                        };
                        if (data && (data.scenePath || typeof data.scrollTop === 'number')) {
                            this.applyRestore({
                                scenePath: data.scenePath ?? '',
                                scrollTop: data.scrollTop ?? 0,
                                cursorAnchor: data.cursorAnchor,
                                cursorHead: data.cursorHead,
                            });
                        }
                    } catch {
                        // corrupt state file — ignore
                    }
                });
            });
        } catch {
            // best-effort — ignore
        }
    }

    /**
     * Apply a saved restore snapshot: scroll to the position, ensure the
     * focused scene's editor is mounted, focus it, and restore the cursor.
     */
    private applyRestore(state: {
        scenePath: string;
        scrollTop: number;
        cursorAnchor?: number;
        cursorHead?: number;
    }): void {
        if (!this.scrollArea) return;

        // Restore scroll position as a first approximation — the final
        // restore happens after the editor mounts and layout settles.
        if (typeof state.scrollTop === 'number' && state.scrollTop > 0) {
            this.scrollArea.scrollTop = state.scrollTop;
        }

        if (!state.scenePath) return;

        // Find the scene block. If its editor isn't mounted yet (lazy),
        // mount it eagerly so we can focus it.
        const block = this.scrollArea.querySelector(
            `[data-scene-path="${CSS.escape(state.scenePath)}"]`
        ) as HTMLElement | null;
        if (!block) return;

        const editorWrap = block.querySelector('.sl-manuscript-editor-wrap') as HTMLElement | null;
        if (!editorWrap) return;

        const mountAndFocus = async (): Promise<void> => {
            // If the editor isn't mounted yet, mount it now.
            if (!this.embeddedLeaves.has(state.scenePath)) {
                await this.mountEditor(editorWrap, state.scenePath);
            }
            const leaf = this.embeddedLeaves.get(state.scenePath);
            if (!leaf) return;

            // Focus the CM6 editor and restore the selection.
            const restoreCm = (cm: import('@codemirror/view').EditorView) => {
                if (typeof state.cursorAnchor === 'number' && typeof state.cursorHead === 'number') {
                    try {
                        cm.dispatch({
                            selection: EditorSelection.single(
                                state.cursorAnchor,
                                state.cursorHead
                            ),
                            scrollIntoView: true,
                        });
                    } catch {
                        // selection out of range (file changed) — just focus
                    }
                }
                cm.focus();

                // After CM6 has restored the cursor, scroll the outer
                // container so the cursor is actually visible.  CM6's
                // `scrollIntoView: true` only affects the editor's own
                // viewport; the manuscript view uses a single outer scroll
                // container, so we need to scroll that as well.
                const scrollToCursor = (): void => {
                    if (!this.scrollArea) return;
                    const pos = typeof state.cursorAnchor === 'number'
                        ? state.cursorAnchor
                        : cm.state.selection.main.head;
                    try {
                        const coords = cm.coordsAtPos(pos);
                        if (!coords) return;
                        const rect = this.scrollArea.getBoundingClientRect();
                        const margin = 80;
                        if (coords.top < rect.top + margin) {
                            // Cursor is above the visible area — scroll up.
                            this.scrollArea.scrollTop -= rect.top + margin - coords.top;
                        } else if (coords.bottom > rect.bottom - margin) {
                            // Cursor is below the visible area — scroll down.
                            this.scrollArea.scrollTop += coords.bottom - (rect.bottom - margin);
                        }
                    } catch {
                        // coordsAtPos can throw if the position is invalid
                    }
                };

                // Give CM6 a frame to process the dispatch + reflow, then
                // adjust the outer scroll container.
                window.requestAnimationFrame(scrollToCursor);
            };

            const cm = this.getCmView(leaf);
            if (cm) {
                restoreCm(cm);
            } else {
                // CM6 not ready yet — retry on the next frame.
                window.requestAnimationFrame(() => {
                    const cm2 = this.getCmView(leaf);
                    if (cm2) restoreCm(cm2);
                });
            }
        };

        void mountAndFocus();
    }
}
/* eslint-enable @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unused-vars -- end of file-wide suppression block opened at line 1 */
