import { ItemView, WorkspaceLeaf, Menu, TFile, setIcon } from 'obsidian';
import type SceneCardsPlugin from '../main';
import { SceneManager } from '../services/SceneManager';
import { Scene, SceneStatus, STATUS_CONFIG } from '../models/Scene';
import { NAVIGATOR_VIEW_TYPE } from '../constants';
import { resolveTagColor, getPlotlineHSL } from '../settings';

/**
 * Sort modes available in the navigator.
 */
type NavSortMode = 'sequence' | 'status' | 'recent' | 'words' | 'title';

const SORT_LABELS: Record<NavSortMode, string> = {
    sequence: 'Book order',
    status: 'Status',
    recent: 'Recently edited',
    words: 'Word count',
    title: 'Title A-Z',
};

const SORT_ICONS: Record<NavSortMode, string> = {
    sequence: 'list-ordered',
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
    private sortMode: NavSortMode = 'sequence';
    private filterText = '';
    private plotlineFilter: string | null = null;
    private pinnedScenes: Set<string> = new Set();
    private collapsedActs: Set<string> = new Set();

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
        return 'StoryLine Navigator';
    }

    getIcon(): string {
        return 'compass';
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('sl-navigator');

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
        this.sortBtn.setAttribute('aria-label', 'Sort');
        setIcon(this.sortBtn, SORT_ICONS[this.sortMode]);
        this.sortBtn.addEventListener('click', (e) => {
            const menu = new Menu();
            for (const mode of Object.keys(SORT_LABELS) as NavSortMode[]) {
                menu.addItem((item) => {
                    item.setTitle(SORT_LABELS[mode]);
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
                this.chipRow.style.display = this.chipsExpanded ? '' : 'none';
            }
        });
        this.chipRow = this.chipSection.createDiv('sl-nav-plotline-list');
        this.chipRow.style.display = 'none';

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

        const tags = this.sceneManager.getAllTags().sort();

        // Hide entire section if no tags
        if (tags.length === 0) {
            this.chipSection.style.display = 'none';
            return;
        }
        this.chipSection.style.display = '';

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
        allDot.style.background = 'var(--text-faint)';
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
            dot.style.background = color;

            row.createSpan({ text: tag, cls: 'sl-nav-plotline-name' });

            // Scene count for this plotline
            const count = this.sceneManager.getAllScenes()
                .filter(s => !s.corkboardNote && s.tags?.includes(tag)).length;
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

        let scenes = this.sceneManager.getAllScenes().filter(s => !s.corkboardNote);

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

        // Group by act if sorting by sequence
        if (this.sortMode === 'sequence') {
            this.renderGroupedByAct(scenes);
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
            const act = scene.act !== undefined ? `Act ${scene.act}` : 'Ungrouped';
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

    private renderSceneRow(parent: HTMLElement, scene: Scene): void {
        const row = parent.createDiv('sl-nav-row');
        const isPinned = this.pinnedScenes.has(scene.filePath);
        if (isPinned) row.addClass('is-pinned');

        // Status dot
        const dot = row.createSpan('sl-nav-status-dot');
        const statusCfg = STATUS_CONFIG[scene.status || 'idea'];
        dot.style.background = statusCfg.color;
        dot.setAttribute('aria-label', statusCfg.label);

        // Sequence number (if available)
        if (scene.sequence !== undefined) {
            const seq = row.createSpan('sl-nav-seq');
            seq.textContent = `${scene.sequence}`;
        }

        // Title
        const title = row.createSpan('sl-nav-title');
        title.textContent = scene.title;

        // Word count
        if (scene.wordcount && scene.wordcount > 0) {
            const wc = row.createSpan('sl-nav-wc');
            wc.textContent = scene.wordcount >= 1000
                ? `${(scene.wordcount / 1000).toFixed(1)}k`
                : `${scene.wordcount}`;
        }

        // Click to open the scene file
        row.addEventListener('click', async () => {
            const file = this.app.vault.getAbstractFileByPath(scene.filePath);
            if (file instanceof TFile) {
                await this.app.workspace.getLeaf('tab').openFile(file, { state: { mode: 'preview' } });
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
                        await this.app.workspace.getLeaf('tab').openFile(file, { state: { mode: 'preview' } });
                    }
                });
            });

            menu.addSeparator();

            // Status submenu
            const statuses: SceneStatus[] = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];
            for (const status of statuses) {
                menu.addItem((item) => {
                    const cfg = STATUS_CONFIG[status];
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
                case 'sequence':
                    return (a.sequence ?? 9999) - (b.sequence ?? 9999);
                case 'status': {
                    const order: SceneStatus[] = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];
                    return order.indexOf(a.status || 'idea') - order.indexOf(b.status || 'idea');
                }
                case 'recent': {
                    const aTime = a.modified ? new Date(a.modified).getTime() : 0;
                    const bTime = b.modified ? new Date(b.modified).getTime() : 0;
                    return bTime - aTime; // newest first
                }
                case 'words':
                    return (b.wordcount || 0) - (a.wordcount || 0);
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

        const stats = this.sceneManager.getStatistics();
        const totalWords = stats.totalWords;
        const targetWords = stats.totalTargetWords;

        if (targetWords > 0) {
            const pct = Math.min(100, Math.round((totalWords / targetWords) * 100));
            const fill = this.progressBar.querySelector('.sl-nav-progress-fill') as HTMLElement;
            if (fill) fill.style.width = `${pct}%`;
            this.progressLabel.textContent = `${this.formatWords(totalWords)} / ${this.formatWords(targetWords)} (${pct}%)`;
        } else {
            const fill = this.progressBar.querySelector('.sl-nav-progress-fill') as HTMLElement;
            if (fill) fill.style.width = '0%';
            this.progressLabel.textContent = `${this.formatWords(totalWords)} words · ${stats.totalScenes} scenes`;
        }
    }

    private formatWords(n: number): string {
        if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
        return String(n);
    }
}
