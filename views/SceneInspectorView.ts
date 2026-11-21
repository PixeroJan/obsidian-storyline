/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { EventRef, ItemView, WorkspaceLeaf, TFile, MarkdownView, Menu, setIcon } from 'obsidian';
import type SceneCardsPlugin from '../main';
import { SceneManager } from '../services/SceneManager';
import { InspectorComponent } from '../components/Inspector';
import { InfoPanelComponent } from '../components/InfoPanel';
import { CommentsPanelComponent } from '../components/CommentsPanel';
import { ResearchView } from './ResearchView';
import { HelpView } from './HelpView';
import { ManuscriptView } from './ManuscriptView';
import { attachTooltip } from '../components/Tooltip';
import {
    SCENE_INSPECTOR_VIEW_TYPE,
    MANUSCRIPT_VIEW_TYPE,
    RESEARCH_VIEW_TYPE,
    HELP_VIEW_TYPE,
    SYNOPSIS_VIEW_TYPE,
    DETAILS_VIEW_TYPE,
    NOTES_VIEW_TYPE,
} from '../constants';

type InspectorTab = 'synopsis' | 'notes' | 'comments' | 'details' | 'research' | 'help';

const TAB_DEFS: { id: InspectorTab; label: string; icon: string; popOutType?: string }[] = [
    { id: 'details',  label: 'Details',  icon: 'list',         popOutType: DETAILS_VIEW_TYPE },
    { id: 'synopsis', label: 'Synopsis', icon: 'scroll-text',  popOutType: SYNOPSIS_VIEW_TYPE },
    { id: 'notes',    label: 'Notes',    icon: 'sticky-note',  popOutType: NOTES_VIEW_TYPE },
    { id: 'comments', label: 'Comments', icon: 'message-square-text' },
    { id: 'research', label: 'Research', icon: 'library-big',  popOutType: RESEARCH_VIEW_TYPE },
    { id: 'help',     label: 'Help',     icon: 'help-circle',  popOutType: HELP_VIEW_TYPE },
];

/**
 * Standalone Scene Inspector sidebar view.
 *
 * Hosts four tabs:
 *  - Info     — lightweight planning panel (synopsis, POV, status, location, notes)
 *  - Details  — the full Inspector (all scene metadata)
 *  - Research — shortcut to open the Research view
 *  - Help     — shortcut to open the Help view
 */
export class SceneInspectorView extends ItemView {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;

    private synopsisPanel: InfoPanelComponent | null = null;
    private notesPanel: InfoPanelComponent | null = null;
    private commentsPanel: CommentsPanelComponent | null = null;
    private inspectorComponent: InspectorComponent | null = null;
    private researchView: ResearchView | null = null;
    private helpView: HelpView | null = null;

    private tabBarEl: HTMLElement | null = null;
    private tabPanels: Record<InspectorTab, HTMLElement | null> = {
        synopsis: null,
        notes: null,
        comments: null,
        details: null,
        research: null,
        help: null,
    };
    private emptyEl: HTMLElement | null = null;
    private activeTab: InspectorTab = 'details';

    /** Timestamp (ms) of last user-initiated edit inside the inspector. */
    private lastEditTime = 0;

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin, sceneManager: SceneManager) {
        super(leaf);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
    }

    getViewType(): string {
        return SCENE_INSPECTOR_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Scene details';
    }

    getIcon(): string {
        return 'file-search';
    }

    async onOpen(): Promise<void> {
        const viewContent = this.containerEl.children[1] as HTMLElement;
        viewContent.empty();
        viewContent.addClass('sl-scene-inspector-host');
        this.containerEl.closest('.workspace-leaf')?.classList.add('sl-scene-inspector-leaf');

        // Research and Help are embedded as tabs here, so any standalone
        // leaves of those types in the same sidebar root are redundant and
        // steal vertical space. Detach them now (and again on workspace
        // layout changes) so the inspector can claim the full sidebar.
        this.detachRedundantSidebarLeaves();
        this.registerEvent(
            this.app.workspace.on('layout-change', () => this.detachRedundantSidebarLeaves())
        );

        // Use a wrapper inside .view-content so we don't fight Obsidian's
        // default flex layout on the leaf container.
        const container = viewContent.createDiv('sl-scene-inspector-sidebar');

        // ── Tab bar ──
        this.tabBarEl = container.createDiv('sl-inspector-tabbar');
        for (const def of TAB_DEFS) {
            this.createTabButton(def.id, def.label, def.icon);
        }

        // ── Tab panels host ──
        const panelsHost = container.createDiv('sl-inspector-panels');

        // Synopsis tab
        const synopsisPanelEl = panelsHost.createDiv('sl-inspector-panel sl-info-panel-host sl-inspector-panel-synopsis');
        this.tabPanels.synopsis = synopsisPanelEl;
        this.synopsisPanel = new InfoPanelComponent(synopsisPanelEl, this.plugin, this.sceneManager, 'synopsis');

        // Notes tab
        const notesPanelEl = panelsHost.createDiv('sl-inspector-panel sl-info-panel-host sl-inspector-panel-notes');
        this.tabPanels.notes = notesPanelEl;
        this.notesPanel = new InfoPanelComponent(notesPanelEl, this.plugin, this.sceneManager, 'notes');

        // Scribe comments are inline HTML in the scene body, so this panel
        // mutates only comment tags and leaves surrounding Markdown intact.
        const commentsPanelEl = panelsHost.createDiv('sl-inspector-panel');
        this.tabPanels.comments = commentsPanelEl;
        this.commentsPanel = new CommentsPanelComponent(commentsPanelEl, this.plugin, () => {
            this.lastEditTime = Date.now();
        });

        // Details tab — wraps the existing InspectorComponent
        const detailsPanelEl = panelsHost.createDiv('sl-inspector-panel');
        this.tabPanels.details = detailsPanelEl;
        const inspectorHost = detailsPanelEl.createDiv('story-line-inspector-panel sl-sidebar-inspector');
        inspectorHost.setCssStyles({ display: 'none' });

        // Empty state (shared across Info + Details)
        this.emptyEl = panelsHost.createDiv('sl-scene-inspector-empty');
        this.emptyEl.createEl('p', { text: 'Open a scene file to see its details here.' });

        // Research tab — embed the full Research view
        const researchPanelEl = panelsHost.createDiv('sl-inspector-panel sl-inspector-embed');
        this.tabPanels.research = researchPanelEl;
        this.researchView = new ResearchView(this.leaf, this.plugin, this.plugin.researchManager);
        void this.researchView.mountInto(researchPanelEl);

        // Help tab — embed the full Help view
        const helpPanelEl = panelsHost.createDiv('sl-inspector-panel sl-inspector-embed');
        this.tabPanels.help = helpPanelEl;
        this.helpView = new HelpView(this.leaf, this.plugin);
        void this.helpView.mountInto(helpPanelEl);

        this.inspectorComponent = new InspectorComponent(
            inspectorHost,
            this.plugin,
            this.sceneManager,
            {
                onEdit: (scene) => {
                    const file = this.app.vault.getAbstractFileByPath(scene.filePath);
                    if (file instanceof TFile) {
                        this.app.workspace.getLeaf('tab').openFile(file);
                    }
                },
                onDelete: async (scene) => {
                    await this.sceneManager.deleteScene(scene.filePath);
                    this.inspectorComponent?.hide();
                    this.refreshEmptyState();
                },
                onRefresh: () => {
                    this.lastEditTime = Date.now();
                    this.refreshCurrentScene();
                },
                onStatusChange: async (scene, status) => {
                    this.lastEditTime = Date.now();
                    await this.sceneManager.updateScene(scene.filePath, { status });
                    this.refreshCurrentScene();
                },
            }
        );

        this.setActiveTab(this.activeTab);

        // Listen for active file changes — only switch/hide when user
        // navigates to a real editor showing a different file.
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                if (!leaf) return;
                if (leaf === this.leaf) return;
                if (this.notesPanel?.isNotesEditorLeaf(leaf)) return;
                // Markdown editor — follow it
                if (leaf.view instanceof MarkdownView) {
                    this.updateForActiveFile();
                    return;
                }
                // Manuscript view — follow its currently-focused scene
                if (leaf.view instanceof ManuscriptView) {
                    this.updateForActiveFile();
                    return;
                }
            })
        );

        // Refresh scene data when files are modified.
        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (!this.hasSceneShown()) return;
                if (this.notesPanel?.isNotesFilePath(file.path)) {
                    void this.notesPanel.refreshNotesFromDisk();
                    return;
                }
                if (Date.now() - this.lastEditTime < 2000) return;
                window.setTimeout(() => this.refreshCurrentScene(), 600);
            })
        );

        // Listen for Manuscript focused-scene changes.
        this.registerEvent(
            (this.app.workspace as unknown as { on: (ev: string, cb: (filePath: string) => void) => EventRef }).on('storyline:manuscript-focus', (filePath: string) => {
                if (Date.now() - this.lastEditTime < 2000) return;
                this.showScene(filePath);
            })
        );

        // Listen for scene-focus from any StoryLine view.
        this.registerEvent(
            (this.app.workspace as unknown as { on: (ev: string, cb: (filePath: string) => void) => EventRef }).on('storyline:scene-focus', (filePath: string) => {
                if (Date.now() - this.lastEditTime < 2000) return;
                this.showScene(filePath);
            })
        );

        this.updateForActiveFile();
    }

    async onClose(): Promise<void> {
        this.containerEl.closest('.workspace-leaf')?.classList.remove('sl-scene-inspector-leaf');
        try { await this.researchView?.onClose(); } catch { /* ignore */ }
        try { await this.helpView?.onClose(); } catch { /* ignore */ }
        this.researchView = null;
        this.helpView = null;
        this.inspectorComponent = null;
        this.synopsisPanel = null;
        this.notesPanel = null;
        this.commentsPanel = null;
    }

    /**
     * Detach any standalone Research/Help leaves that live in the same
     * sidebar root as this inspector — they're now embedded as tabs and
     * compete with us for vertical space.
     */
    private detachRedundantSidebarLeaves(): void {
        try {
            const ourRoot = this.leaf.getRoot();
            const redundant = [
                ...this.app.workspace.getLeavesOfType(RESEARCH_VIEW_TYPE),
                ...this.app.workspace.getLeavesOfType(HELP_VIEW_TYPE),
            ];
            for (const leaf of redundant) {
                if (leaf === this.leaf) continue;
                try {
                    if (leaf.getRoot() === ourRoot) {
                        leaf.detach();
                    }
                } catch { /* ignore */ }
            }
        } catch { /* ignore */ }
    }

    // ── Tabs ─────────────────────────────────────────────

    private createTabButton(id: InspectorTab, label: string, icon: string): void {
        if (!this.tabBarEl) return;
        const btn = this.tabBarEl.createEl('button', {
            cls: `sl-inspector-tab ${id === this.activeTab ? 'active' : ''}`,
            attr: { 'data-tab': id },
        });
        const iconEl = btn.createSpan({ cls: 'sl-inspector-tab-icon' });
        setIcon(iconEl, icon);
        const def = TAB_DEFS.find(d => d.id === id);
        attachTooltip(btn, def?.popOutType ? `${label}  —  right-click to open in own pane` : label);
        btn.addEventListener('click', () => this.setActiveTab(id));

        // Right-click → "Open in own pane" (uses Obsidian's native Menu).
        if (def?.popOutType) {
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const menu = new Menu();
                menu.addItem((item) => {
                    item.setTitle(`Open ${label} in own pane`)
                        .setIcon('panel-right-open')
                        .onClick(() => this.popOutTab(def.popOutType as string));
                });
                menu.showAtMouseEvent(e);
            });
        }
    }

    private async popOutTab(viewType: string): Promise<void> {
        try {
            const { workspace } = this.app;
            const existing = workspace.getLeavesOfType(viewType);
            if (existing.length > 0) {
                workspace.revealLeaf(existing[0]);
                return;
            }
            const leaf = workspace.getLeaf('tab');
            await leaf.setViewState({ type: viewType, active: true });
            workspace.revealLeaf(leaf);
        } catch (err) {
            console.error('[StoryLine] popOutTab failed:', err);
        }
    }

    private setActiveTab(id: InspectorTab): void {
        this.activeTab = id;
        if (this.tabBarEl) {
            for (const el of Array.from(this.tabBarEl.querySelectorAll('.sl-inspector-tab'))) {
                const tab = (el as HTMLElement).dataset.tab as InspectorTab;
                el.toggleClass('active', tab === id);
            }
        }
        for (const key of Object.keys(this.tabPanels) as InspectorTab[]) {
            const panel = this.tabPanels[key];
            if (!panel) continue;
            const isActive = key === id;
            // Clear any inline `display` so the stylesheet owns visibility
            // (the `.is-active` class handles the active panel's display
            // mode — `flex` for synopsis/notes so the textarea fills the
            // pane, `block` for everyone else).
            panel.style.display = isActive ? '' : 'none';
            panel.toggleClass('is-active', isActive);
        }
        // Toggle padding-collapse on the panels host when an embedded
        // full-view is active (Research / Help fill edge-to-edge).
        const panelsHost = this.tabPanels[id]?.parentElement as HTMLElement | null;
        if (panelsHost) {
            const isEmbed = id === 'research' || id === 'help';
            panelsHost.toggleClass('is-embed-active', isEmbed);
        }
        if (id === 'notes') {
            void this.notesPanel?.refreshNotesFromDisk();
        }
        if (id === 'details') {
            this.refreshCurrentScene();
        }
        this.refreshEmptyState();
    }

    private renderShortcutPanel(
        host: HTMLElement,
        opts: { text: string; buttonText: string; action: () => unknown },
    ): void {
        // kept for potential future use
        host.addClass('sl-inspector-shortcut');
        host.createEl('p', { text: opts.text });
        const btn = host.createEl('button', { cls: 'mod-cta', text: opts.buttonText });
        btn.addEventListener('click', () => {
            try { opts.action(); } catch { /* swallow */ }
        });
    }

    // ── Scene wiring ──────────────────────────────────────────────

    private showScene(filePath: string): void {
        const scene = this.sceneManager.getScene(filePath);
        if (!scene) return;
        this.synopsisPanel?.show(scene);
        this.notesPanel?.show(scene);
        this.commentsPanel?.show(scene);
        this.inspectorComponent?.show(scene);
        this.refreshEmptyState();
    }

    private hasSceneShown(): boolean {
        return !!(this.synopsisPanel?.getCurrentScene() || this.notesPanel?.getCurrentScene() || this.inspectorComponent?.getCurrentScene?.());
    }

    private refreshEmptyState(): void {
        if (!this.emptyEl) return;
        const sceneTabs: InspectorTab[] = ['synopsis', 'notes', 'comments', 'details'];
        const showEmpty = sceneTabs.includes(this.activeTab) && !this.hasSceneShown();
        this.emptyEl.setCssStyles({ display: showEmpty ? 'block' : 'none' });
    }

    private updateForActiveFile(): void {
        // 1. Prefer an active MarkdownView's file (the user's open scene).
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === 'md') {
            const scene = this.sceneManager.getScene(activeFile.path);
            if (scene) {
                this.synopsisPanel?.show(scene);
                this.notesPanel?.show(scene);
                this.commentsPanel?.show(scene);
                this.inspectorComponent?.show(scene);
                this.refreshEmptyState();
                return;
            }
        }

        // 2. Otherwise, if a Manuscript view is open, mirror its focused scene.
        const manuscriptLeaves = this.app.workspace.getLeavesOfType(MANUSCRIPT_VIEW_TYPE);
        for (const leaf of manuscriptLeaves) {
            const view = leaf.view;
            if (view instanceof ManuscriptView && view.focusedScenePath) {
                const scene = this.sceneManager.getScene(view.focusedScenePath);
                if (scene) {
                    this.synopsisPanel?.show(scene);
                    this.notesPanel?.show(scene);
                    this.commentsPanel?.show(scene);
                    this.inspectorComponent?.show(scene);
                    this.refreshEmptyState();
                    return;
                }
            }
        }

        this.inspectorComponent?.hide();
        this.synopsisPanel?.hide();
        this.notesPanel?.hide();
        this.commentsPanel?.hide();
        this.refreshEmptyState();
    }

    private refreshCurrentScene(): void {
        const current =
            this.synopsisPanel?.getCurrentScene() ||
            this.notesPanel?.getCurrentScene() ||
            this.commentsPanel?.getCurrentScene() ||
            this.inspectorComponent?.getCurrentScene?.() ||
            null;
        if (!current) return;
        const fresh = this.sceneManager.getScene(current.filePath);
        if (fresh) {
            this.synopsisPanel?.show(fresh);
            this.notesPanel?.show(fresh);
            this.commentsPanel?.show(fresh);
            this.inspectorComponent?.show(fresh);
        }
    }
}
/* eslint-enable @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises -- end of file-wide suppression block opened at line 1 */
