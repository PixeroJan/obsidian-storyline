/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { ItemView, WorkspaceLeaf, Menu, TFile, setIcon } from 'obsidian';
import type SceneCardsPlugin from '../main';
import { ManuscriptView } from './ManuscriptView';
import { resolveTagColor, getPlotlineHSL } from '../settings';
import { attachTooltip } from '../components/Tooltip';
import { SceneCardComponent } from '../components/SceneCard';
import { compareActChapter, getActDisplayLabel } from '../utils/actChapter';
import { SceneManager } from '../services/SceneManager';
import { MANUSCRIPT_VIEW_TYPE, NAVIGATOR_VIEW_TYPE } from '../constants';
import { Scene, getStatusOrder, resolveStatusCfg } from '../models/Scene';

/**
 * Sort modes available in the navigator.
 */
type NavSortMode = 'reading' | 'chapter' | 'chronological' | 'status' | 'recent' | 'words' | 'title';

const SORT_LABELS: Record<NavSortMode, string> = {
    reading: 'Reading order (by act)',
    chapter: 'By chapter',
    chronological: 'Chronological order',
    status: 'Status',
    recent: 'Recently edited',
    words: 'Word count',
    title: 'Title A-Z',
};

const SORT_ICONS: Record<NavSortMode, string> = {
    reading: 'book-open',
    chapter: 'book-marked',
    chronological: 'list-ordered',
    status: 'circle-dot',
    recent: 'clock',
    words: 'hash',
    title: 'a-large-small',
};

/**
 * NavigatorView — a compact sidebar panel for quick project navigation.
 *
 * Shows a dense, filterable list of scenes with status dots, word counts,
 * and optional plotline filter chips. Designed to be pinned in the sidebar.
 */
export class NavigatorView extends ItemView {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;

    // State
    private sortMode: NavSortMode = 'reading';
    private filterText = '';
    private plotlineFilter: string | null = null;
    private pinnedScenes: Set<string> = new Set();
    private collapsedActs: Set<string> = new Set();
    private collapsedChapters: Set<string> = new Set();

    // DOM refs
    private searchInput: HTMLInputElement | null = null;
    private listEl: HTMLElement | null = null;
    private chipRow: HTMLElement | null = null;
    private chipToggle: HTMLElement | null = null;
    private chipSection: HTMLElement | null = null;
    private progressBar: HTMLElement | null = null;
    private progressLabel: HTMLElement | null = null;
    private sortBtn: HTMLElement | null = null;
    private chipsExpanded = false;

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin, sceneManager: SceneManager) {
        super(leaf);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
    }

    getViewType(): string {
        return NAVIGATOR_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'StoryLine navigator';
    }

    getIcon(): string {
        return 'compass';
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('sl-navigator');

        // ── Scene Details button (right-aligned above sort) ──
        const detailsRow = container.createDiv('sl-nav-details-row');

        const detailsBtn = detailsRow.createDiv('sl-nav-details-btn');
        setIcon(detailsBtn, 'panel-right');
        attachTooltip(detailsBtn, 'Scene Details');
        detailsBtn.addEventListener('click', () => {
            this.plugin.openSceneInspector();
        });

        // ── Toolbar row: search + sort ──
        const toolbar = container.createDiv('sl-nav-toolbar');

        const searchWrap = toolbar.createDiv('sl-nav-search-wrap');
        const searchIcon = searchWrap.createSpan('sl-nav-search-icon');
        setIcon(searchIcon, 'search');
        this.searchInput = searchWrap.createEl('input', {
            type: 'text',
            placeholder: 'Filter scenes…',
            cls: 'sl-nav-search',
        });
        this.searchInput.addEventListener('input', () => {
            this.filterText = this.searchInput?.value.toLowerCase() ?? '';
            this.renderList();
        });

        this.sortBtn = toolbar.createDiv('sl-nav-sort-btn');
        setIcon(this.sortBtn, SORT_ICONS[this.sortMode]);
        attachTooltip(this.sortBtn, 'Sort');
        this.sortBtn.addEventListener('click', (e) => {
            const menu = new Menu();
            for (const mode of Object.keys(SORT_LABELS) as NavSortMode[]) {
                menu.addItem((item) => {
                    item.setTitle(mode === 'words' && this.plugin.settings.countUnit === 'chars'
                        ? 'Character count'
                        : SORT_LABELS[mode]);
                    item.setIcon(SORT_ICONS[mode]);
                    if (mode === this.sortMode) item.setChecked(true);
                    item.onClick(() => {
                        this.sortMode = mode;
                        if (this.sortBtn) setIcon(this.sortBtn, SORT_ICONS[mode]);
                        this.renderList();
                    });
                });
            }
            menu.showAtMouseEvent(e as MouseEvent);
        });

        // ── Plotline filter (collapsible list) ──
        this.chipSection = container.createDiv('sl-nav-chip-section');
        this.chipToggle = this.chipSection.createDiv('sl-nav-chip-toggle');
        const toggleIcon = this.chipToggle.createSpan('sl-nav-chip-toggle-icon');
        toggleIcon.textContent = '▸';
        const toggleLabel = this.chipToggle.createSpan('sl-nav-chip-toggle-label');
        toggleLabel.textContent = 'Plotlines';
        this.chipToggle.addEventListener('click', () => {
            this.chipsExpanded = !this.chipsExpanded;
            toggleIcon.textContent = this.chipsExpanded ? '▾' : '▸';
            if (this.chipRow) {
                this.chipRow.setCssStyles({ display: this.chipsExpanded ? '' : 'none' });
            }
        });
        this.chipRow = this.chipSection.createDiv('sl-nav-plotline-list');
        this.chipRow.setCssStyles({ display: 'none' });

        // ── Scene list ──
        this.listEl = container.createDiv('sl-nav-list');

        // ── Bottom bar: progress ──
        const bottomBar = container.createDiv('sl-nav-bottom');
        this.progressBar = bottomBar.createDiv('sl-nav-progress-bar');
        this.progressBar.createDiv('sl-nav-progress-fill');
        this.progressLabel = bottomBar.createDiv('sl-nav-progress-label');

        this.refresh();
    }

    async onClose(): Promise<void> {
        // nothing to clean up
    }

    /**
     * Called by refreshOpenViews() to re-render the navigator.
     */
    refresh(): void {
        this.renderChips();
        this.renderList();
        this.renderProgress();
    }

    // ────────────────────────────────────────────────────────
    // Plotline filter chips
    // ────────────────────────────────────────────────────────

    private renderChips(): void {
        if (!this.chipRow || !this.chipSection || !this.chipToggle) return;
        this.chipRow.empty();

        const tags = this.sceneManager.queryService.getAllTags().sort();

        // Hide entire section if no tags
        if (tags.length === 0) {
            this.chipSection.setCssStyles({ display: 'none' });
            return;
        }
        this.chipSection.setCssStyles({ display: '' });

        // Update toggle label to show active filter + tag count
        const toggleLabel = this.chipToggle.querySelector('.sl-nav-chip-toggle-label');
        if (toggleLabel) {
            toggleLabel.textContent = this.plotlineFilter
                ? `Plotlines: ${this.plotlineFilter}`
                : `Plotlines (${tags.length})`;
        }

        // Show active filter indicator on toggle
        if (this.plotlineFilter) {
            this.chipToggle.addClass('has-filter');
        } else {
            this.chipToggle.removeClass('has-filter');
        }

        const scheme = this.plugin.settings.colorScheme;
        const tagColors = this.plugin.settings.tagColors || {};
        const hslAdj = getPlotlineHSL(this.plugin.settings);

        // "All" row
        const allRow = this.chipRow.createDiv('sl-nav-plotline-item');
        if (!this.plotlineFilter) allRow.addClass('is-active');
        const allDot = allRow.createSpan('sl-nav-plotline-dot');
        allDot.setCssStyles({ background: 'var(--text-faint)' });
        allRow.createSpan({ text: 'All', cls: 'sl-nav-plotline-name' });
        allRow.addEventListener('click', () => {
            this.plotlineFilter = null;
            this.renderChips();
            this.renderList();
        });

        for (let i = 0; i < tags.length; i++) {
            const tag = tags[i];
            const color = resolveTagColor(tag, i, scheme, tagColors, hslAdj);

            const row = this.chipRow.createDiv('sl-nav-plotline-item');
            if (this.plotlineFilter === tag) row.addClass('is-active');

            const dot = row.createSpan('sl-nav-plotline-dot');
            dot.setCssStyles({ background: color });

            row.createSpan({ text: tag, cls: 'sl-nav-plotline-name' });

            // Scene count for this plotline
            const count = this.sceneManager.getAllScenes()
                .filter(s => !s.corkboardNote && !s.inactive && s.tags?.includes(tag)).length;
            row.createSpan({ text: String(count), cls: 'sl-nav-plotline-count' });

            row.addEventListener('click', () => {
                this.plotlineFilter = this.plotlineFilter === tag ? null : tag;
                this.renderChips();
                this.renderList();
            });
        }
    }

    // ────────────────────────────────────────────────────────
    // Scene list
    // ────────────────────────────────────────────────────────

    private renderList(): void {
        if (!this.listEl) return;
        this.listEl.empty();

        let scenes = this.sceneManager.getAllScenes().filter(s => !s.corkboardNote && !s.inactive);

        // Plotline filter
        if (this.plotlineFilter) {
            scenes = scenes.filter(s => s.tags?.includes(this.plotlineFilter!));
        }

        // Text filter
        if (this.filterText) {
            scenes = scenes.filter(s =>
                s.title.toLowerCase().includes(this.filterText) ||
                (s.pov?.toLowerCase().includes(this.filterText)) ||
                (s.tags?.some(t => t.toLowerCase().includes(this.filterText)))
            );
        }

        // Sort
        scenes = this.sortScenes(scenes);

        if (scenes.length === 0) {
            const empty = this.listEl.createDiv('sl-nav-empty');
            empty.textContent = this.filterText ? 'No matching scenes' : 'No scenes yet';
            return;
        }

        // Group by act only for reading order
        if (this.sortMode === 'reading') {
            this.renderGroupedByAct(scenes);
        } else if (this.sortMode === 'chapter') {
            this.renderGroupedByChapter(scenes);
        } else {
            for (const scene of scenes) {
                this.renderSceneRow(this.listEl!, scene);
            }
        }
    }

    private renderGroupedByAct(scenes: Scene[]): void {
        if (!this.listEl) return;

        const groups = new Map<string, Scene[]>();
        for (const scene of scenes) {
            const act = scene.act !== undefined ? getActDisplayLabel(scene.act) : 'Ungrouped';
            if (!groups.has(act)) groups.set(act, []);
            groups.get(act)!.push(scene);
        }

        // If all scenes are ungrouped, don't show headers
        if (groups.size === 1 && groups.has('Ungrouped')) {
            for (const scene of scenes) {
                this.renderSceneRow(this.listEl!, scene);
            }
            return;
        }

        for (const [act, actScenes] of groups) {
            const isCollapsed = this.collapsedActs.has(act);

            const header = this.listEl!.createDiv('sl-nav-act-header');
            const toggle = header.createSpan('sl-nav-act-toggle');
            toggle.textContent = isCollapsed ? '▸' : '▾';
            header.createSpan({ text: act, cls: 'sl-nav-act-label' });
            const count = header.createSpan({ cls: 'sl-nav-act-count' });
            count.textContent = `${actScenes.length}`;

            header.addEventListener('click', () => {
                if (this.collapsedActs.has(act)) {
                    this.collapsedActs.delete(act);
                } else {
                    this.collapsedActs.add(act);
                }
                this.renderList();
            });

            if (!isCollapsed) {
                for (const scene of actScenes) {
                    this.renderSceneRow(this.listEl!, scene);
                }
            }
        }
    }

    /**
     * Issue #113 — "By chapter" grouping. Scenes are grouped under chapter
     * headers only; the Act level is hidden entirely (the user picked this
     * mode precisely to flatten Acts away). Scenes are visually nested
     * inside their chapter's container so they read as children, not peers.
     */
    private renderGroupedByChapter(scenes: Scene[]): void {
        if (!this.listEl) return;

        const groups = new Map<string, Scene[]>();
        for (const scene of scenes) {
            const ch = scene.chapter !== undefined && scene.chapter !== null && String(scene.chapter).trim() !== ''
                ? `Chapter ${scene.chapter}`
                : 'Unassigned';
            if (!groups.has(ch)) groups.set(ch, []);
            groups.get(ch)!.push(scene);
        }

        // If every scene is unassigned, just render bare scenes (no header).
        if (groups.size === 1 && groups.has('Unassigned')) {
            for (const scene of scenes) {
                this.renderSceneRow(this.listEl!, scene);
            }
            return;
        }

        for (const [chKey, chScenes] of groups) {
            const isCollapsed = this.collapsedChapters.has(chKey);

            const header = this.listEl!.createDiv('sl-nav-chapter-header');
            const toggle = header.createSpan('sl-nav-chapter-toggle');
            toggle.textContent = isCollapsed ? '▸' : '▾';
            header.createSpan({ text: chKey, cls: 'sl-nav-chapter-label' });
            const count = header.createSpan({ cls: 'sl-nav-chapter-count' });
            count.textContent = `${chScenes.length}`;

            header.addEventListener('click', () => {
                if (this.collapsedChapters.has(chKey)) {
                    this.collapsedChapters.delete(chKey);
                } else {
                    this.collapsedChapters.add(chKey);
                }
                this.renderList();
            });

            if (!isCollapsed) {
                // Wrap scenes in their own container so CSS can indent them
                // visually under the chapter header.
                const body = this.listEl!.createDiv('sl-nav-chapter-body');
                for (const scene of chScenes) {
                    this.renderSceneRow(body, scene);
                }
            }
        }
    }

    private renderSceneRow(parent: HTMLElement, scene: Scene): void {
        const row = parent.createDiv('sl-nav-row');
        const isPinned = this.pinnedScenes.has(scene.filePath);
        if (isPinned) row.addClass('is-pinned');

        // Status dot
        const dot = row.createSpan('sl-nav-status-dot');
        const statusCfg = resolveStatusCfg(scene.status || 'idea');
        dot.setCssStyles({ background: statusCfg.color });
        dot.setAttribute('aria-label', statusCfg.label);

        // Sequence number (if available)
        if (scene.sequence !== undefined) {
            const seq = row.createSpan('sl-nav-seq');
            seq.textContent = `${scene.sequence}`;
        }

        // Title
        const title = row.createSpan('sl-nav-title');
        title.textContent = scene.title;

        // Scene length
        const sceneCount = this.getSceneCount(scene);
        if (sceneCount > 0) {
            const wc = row.createSpan('sl-nav-wc');
            wc.textContent = sceneCount >= 1000
                ? `${(sceneCount / 1000).toFixed(1)}k`
                : `${sceneCount}`;
        }

        // Click to open the scene file (or scroll in Manuscript view)
        row.addEventListener('click', async () => {
            // Check if the active main view is the Manuscript view
            const manuscriptLeaves = this.app.workspace.getLeavesOfType(MANUSCRIPT_VIEW_TYPE);
            const manuscriptView = manuscriptLeaves.length > 0
                ? manuscriptLeaves[0].view as ManuscriptView
                : null;
            if (manuscriptView) {
                manuscriptView.scrollToScene(scene.filePath);
                return;
            }
            const file = this.app.vault.getAbstractFileByPath(scene.filePath);
            if (file instanceof TFile) {
                // Issue #224 — focus an already-open tab for this file instead
                // of opening a duplicate. Falls back to a new tab when none exists.
                const existingLeaf = this.app.workspace.getLeavesOfType('markdown')
                    .find(leaf => leaf.getViewState()?.state?.file === scene.filePath);
                if (existingLeaf) {
                    this.app.workspace.setActiveLeaf(existingLeaf, { focus: true });
                } else {
                    await this.app.workspace.getLeaf('tab').openFile(file, { state: { mode: 'source', source: false } });
                }
            }
        });

        // Context menu
        row.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const menu = new Menu();

            menu.addItem((item) => {
                item.setTitle(isPinned ? 'Unpin' : 'Pin to top');
                item.setIcon(isPinned ? 'pin-off' : 'pin');
                item.onClick(() => {
                    if (isPinned) {
                        this.pinnedScenes.delete(scene.filePath);
                    } else {
                        this.pinnedScenes.add(scene.filePath);
                    }
                    this.renderList();
                });
            });

            menu.addItem((item) => {
                item.setTitle('Open in new tab');
                item.setIcon('file-plus');
                item.onClick(async () => {
                    const file = this.app.vault.getAbstractFileByPath(scene.filePath);
                    if (file instanceof TFile) {
                        await this.app.workspace.getLeaf('tab').openFile(file, { state: { mode: 'source', source: false } });
                    }
                });
            });

            menu.addSeparator();

            // Scene color picker
            menu.addItem((item) => {
                item.setTitle(scene.color ? 'Change Color' : 'Set Color');
                item.setIcon('palette');
                item.onClick(() => {
                    SceneCardComponent.openColorPicker(this.app, scene, this.sceneManager, () => this.renderList());
                });
            });

            // Archive
            menu.addItem((item) => {
                item.setTitle('Archive scene');
                item.setIcon('archive');
                item.onClick(async () => {
                    await this.sceneManager.archiveScene(scene.filePath);
                    this.renderList();
                });
            });

            // Status submenu
            const statuses = getStatusOrder();
            for (const status of statuses) {
                menu.addItem((item) => {
                    const cfg = resolveStatusCfg(status);
                    item.setTitle(cfg.label);
                    item.setIcon(cfg.icon);
                    if (scene.status === status) item.setChecked(true);
                    item.onClick(async () => {
                        await this.sceneManager.updateScene(scene.filePath, { status });
                        this.plugin.refreshOpenViews();
                    });
                });
            }

            menu.showAtMouseEvent(e);
        });
    }

    private sortScenes(scenes: Scene[]): Scene[] {
        // Pinned scenes always come first
        const pinned = scenes.filter(s => this.pinnedScenes.has(s.filePath));
        const unpinned = scenes.filter(s => !this.pinnedScenes.has(s.filePath));

        const sortFn = (a: Scene, b: Scene): number => {
            switch (this.sortMode) {
                case 'reading': {
                    // Reading order: act → chapter → sequence.
                    // compareActChapter handles numeric vs string acts ("1.1", "Prologue")
                    // and sorts missing values last.
                    const actCmp = compareActChapter(a.act, b.act);
                    if (actCmp !== 0) return actCmp;
                    const chapterCmp = compareActChapter(a.chapter, b.chapter);
                    if (chapterCmp !== 0) return chapterCmp;
                    return (a.sequence ?? 9999) - (b.sequence ?? 9999);
                }
                case 'chronological': {
                    // Prefer chronologicalOrder, then storyDate+storyTime, then sequence
                    if (a.chronologicalOrder != null || b.chronologicalOrder != null) {
                        return (a.chronologicalOrder ?? 9999) - (b.chronologicalOrder ?? 9999);
                    }
                    if (a.storyDate || b.storyDate) {
                        const aKey = (a.storyDate || '') + ' ' + (a.storyTime || '');
                        const bKey = (b.storyDate || '') + ' ' + (b.storyTime || '');
                        const cmp = aKey.localeCompare(bKey);
                        if (cmp !== 0) return cmp;
                    }
                    return (a.sequence ?? 9999) - (b.sequence ?? 9999);
                }
                case 'status': {
                    const order = getStatusOrder();
                    return order.indexOf(a.status || 'idea') - order.indexOf(b.status || 'idea');
                }
                case 'recent': {
                    // Use file system mtime (more accurate for content edits)
                    // than YAML 'modified' which only updates on metadata changes
                    const aFile = this.app.vault.getAbstractFileByPath(a.filePath);
                    const bFile = this.app.vault.getAbstractFileByPath(b.filePath);
                    const aMtime = (aFile instanceof TFile) ? aFile.stat.mtime : 0;
                    const bMtime = (bFile instanceof TFile) ? bFile.stat.mtime : 0;
                    // Fallback to YAML modified if file lookup fails
                    const aTime = aMtime || (a.modified ? new Date(a.modified).getTime() : 0);
                    const bTime = bMtime || (b.modified ? new Date(b.modified).getTime() : 0);
                    return bTime - aTime; // newest first
                }
                case 'words':
                    return this.getSceneCount(b) - this.getSceneCount(a);
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        };

        pinned.sort(sortFn);
        unpinned.sort(sortFn);
        return [...pinned, ...unpinned];
    }

    // ────────────────────────────────────────────────────────
    // Progress bar
    // ────────────────────────────────────────────────────────

    private renderProgress(): void {
        if (!this.progressBar || !this.progressLabel) return;

        const stats = this.sceneManager.queryService.getStatistics();
        const totalWords = stats.totalWords;
        const targetWords = stats.totalTargetWords;

        if (targetWords > 0) {
            const pct = Math.min(100, Math.round((totalWords / targetWords) * 100));
            const fill = this.progressBar.querySelector('.sl-nav-progress-fill') as HTMLElement;
            if (fill) fill.setCssStyles({ width: `${pct}%` });
            this.progressLabel.textContent = `${this.formatWords(totalWords)} / ${this.formatWords(targetWords)} (${pct}%)`;
        } else {
            const fill = this.progressBar.querySelector('.sl-nav-progress-fill') as HTMLElement;
            if (fill) fill.setCssStyles({ width: '0%' });
            const totalScenes = this.sceneManager.getAllScenes().filter(s => !s.corkboardNote && !s.inactive).length;
            this.progressLabel.textContent = `${this.formatWords(totalWords)} words · ${totalScenes} scenes`;
        }
    }

    private formatWords(n: number): string {
        if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
        return String(n);
    }

    private getSceneCount(scene: Scene): number {
        return this.plugin.settings.countUnit === 'chars'
            ? (scene.charcount || 0)
            : (scene.wordcount || 0);
    }
}
/* eslint-enable @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion -- end of file-wide suppression block opened at line 1 */
