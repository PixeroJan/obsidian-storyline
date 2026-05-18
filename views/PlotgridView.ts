/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { App, ItemView, WorkspaceLeaf, Menu, Modal, TFile, Notice, MarkdownRenderer, Component } from 'obsidian';
import * as obsidian from 'obsidian';
import { CellData, ColumnMeta, RowMeta, PlotGridData } from '../models/PlotGridData';
import { LocationManager } from '../services/LocationManager';
import type { SceneFilter, SortConfig } from '../models/Scene';
import { SceneManager } from '../services/SceneManager';
import { CharacterManager } from '../services/CharacterManager';
import { coerceString } from '../utils/narrow';
import { InspectorComponent } from '../components/Inspector';
import { openManageSnapshotsModal } from '../components/ViewSnapshotModal';
import { QuickAddModal } from '../components/QuickAddModal';
import { LinkScanner } from '../services/LinkScanner';
import { renderViewSwitcher } from '../components/ViewSwitcher';
import { FiltersComponent } from '../components/Filters';
import { enableDragToPan } from '../components/DragToPan';
import { isMobile } from '../components/MobileAdapter';
import { PLOTGRID_VIEW_TYPE } from '../constants';
import { resolveTagColor, getPlotlineHSL, resolveStickyNoteColors, contrastTextColor } from '../settings';
import { compareActChapter } from '../utils/actChapter';
import { attachTooltip } from '../components/Tooltip';
import type SceneCardsPlugin from '../main';
import { Scene, getStatusOrder, resolveStatusCfg } from '../models/Scene';
import { openConfirmModal } from '../components/ConfirmModal';

// Use the shared view-type constant from `constants.ts` so the ViewSwitcher
// can correctly detect and style the active tab.
// (Local legacy constant removed.)

// Basic Plot Grid implementation (ground-up) following the supplied guide.
// This file implements the core model, rendering, editing, and persistence.

const ROW_HEADER_WIDTH = 120;
const COL_HEADER_HEIGHT = 40;

function makeId(prefix = '') {
    return prefix + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export class PlotgridView extends ItemView {
    plugin: SceneCardsPlugin | undefined;
    data: PlotGridData = { rows: [], columns: [], cells: {}, zoom: 1 };
    saveDebounce: number | null = null;

    private wrapperEl: HTMLDivElement | null = null;
    private scrollAreaEl: HTMLDivElement | null = null;
    private canvasEl: HTMLDivElement | null = null;
    private selectedRow: number | null = null;
    private selectedCol: number | null = null;
    private inspectorComponent: InspectorComponent | null = null;
    private inspectorEl: HTMLElement | null = null;
    private filtersComponent: FiltersComponent | null = null;
    private currentFilter: SceneFilter = {};
    private currentSort: SortConfig = { field: 'sequence', direction: 'asc' };

    constructor(leaf: WorkspaceLeaf, plugin?: SceneCardsPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return PLOTGRID_VIEW_TYPE;
    }

    getDisplayText(): string {
        const title = this.plugin?.sceneManager?.activeProject?.title;
        return title ? `StoryLine - ${title}` : 'Plot Grid';
    }

    async onOpen(): Promise<void> {
        // Render into the same inner container used by other views so styles match
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('story-line-board-container');

        // PlotGrid is desktop-only — show friendly message on mobile
        if (isMobile) {
            const msg = container.createDiv('sl-mobile-unavailable');
            msg.createEl('h3', { text: 'Plot Grid' });
            msg.createEl('p', { text: 'The plot grid requires a larger screen. Use the Board view to manage scenes on mobile.' });
            return;
        }

        this.containerEl.addClass('plot-grid-root');

        await this.loadData();

        this.buildLayout(container);
        this.renderToolbar();
        // keep main scroll area untouched (no forced scrolling)
        this.renderGrid();
        // Watch for file renames to update linkedSceneId paths AND row sourceIds
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            if (file instanceof TFile) {
                let changed = false;
                for (const key of Object.keys(this.data.cells)) {
                    const c = this.data.cells[key];
                    if (c && c.linkedSceneId === oldPath) { c.linkedSceneId = file.path; changed = true; }
                }
                for (const row of this.data.rows) {
                    if (row.sourceType === 'auto' && row.sourceId === oldPath) {
                        row.sourceId = file.path;
                        changed = true;
                    }
                }
                if (changed) { this.scheduleSave(); this.renderGrid(); }
            }
        }));
    }

    async onClose(): Promise<void> {
        // nothing yet
    }

    private async loadData() {
        try {
            let loaded: PlotGridData | null = null;
            if (this.plugin && typeof this.plugin.loadPlotGrid === 'function') {
                loaded = await this.plugin.loadPlotGrid();
            } else {
                // No plugin-level plotgrid loader available — treat as no data
                loaded = null;
            }
            if (loaded && typeof loaded === 'object') {
                this.data = {
                    rows: loaded.rows || [],
                    columns: loaded.columns || [],
                    cells: loaded.cells || {},
                    zoom: typeof loaded.zoom === 'number' ? loaded.zoom : 1,
                    stickyHeaders: typeof loaded.stickyHeaders === 'boolean' ? loaded.stickyHeaders : true,
                };
            } else {
                this.data = { rows: [], columns: [], cells: {}, zoom: 1 };
            }
            // Auto-repair broken linkedSceneId paths (e.g. after project migration)
            this.repairLinkedScenePaths();
        } catch (e) {
            this.data = { rows: [], columns: [], cells: {}, zoom: 1 };
        }
    }

    /**
     * Repair linkedSceneId references that point to non-existent files.
     * Tries to find the correct file by matching the filename portion.
     */
    private repairLinkedScenePaths(): void {
        const scMgr = this.plugin?.sceneManager as SceneManager | undefined;
        if (!scMgr) return;

        let dirty = false;
        for (const key of Object.keys(this.data.cells)) {
            const cell = this.data.cells[key];
            if (!cell.linkedSceneId) continue;

            // If the scene exists at the stored path, nothing to fix
            if (scMgr.getScene(cell.linkedSceneId)) continue;

            // Try to find by filename
            const fileName = cell.linkedSceneId.split('/').pop();
            if (!fileName) { cell.linkedSceneId = undefined; dirty = true; continue; }

            const allScenes = scMgr.getAllScenes();
            const match = allScenes.find(s => s.filePath.endsWith('/' + fileName) || s.filePath === fileName);
            if (match) {
                cell.linkedSceneId = match.filePath;
                dirty = true;
            } else {
                // Scene no longer exists — clear stale link
                cell.linkedSceneId = undefined;
                dirty = true;
            }
        }
        if (dirty) this.scheduleSave();
    }

    private scheduleSave() {
        const plugin = this.plugin;
        if (!plugin) return;
        if (this.saveDebounce) window.clearTimeout(this.saveDebounce);
        // debounce and call plugin-level save API if available
        const timerId = window.setTimeout(async () => {
            try {
                if (typeof plugin.savePlotGrid === 'function') await plugin.savePlotGrid(this.data);
                plugin.viewSnapshotService.scheduleAutoSave();
            } catch (e) {
                // ignore save errors
            }
            // Only clear if no newer timer was set during the async save
            if (this.saveDebounce === timerId) this.saveDebounce = null;
        }, 500);
        this.saveDebounce = timerId;
    }

    private buildLayout(container: HTMLElement) {
        this.wrapperEl = container.createDiv('plot-grid-wrapper');
        this.wrapperEl.setCssStyles({
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        });
        // make focusable for keyboard navigation
        this.wrapperEl.tabIndex = 0;
        this.wrapperEl.addEventListener('keydown', (e) => this.onKeyDown(e as KeyboardEvent));

        const toolbar = this.wrapperEl.createDiv('story-line-toolbar plot-grid-toolbar');
        toolbar.setCssStyles({ flex: '0 0 auto' });

        // Filter bar (shared component, same as Board/Timeline)
        const filterContainer = this.wrapperEl.createDiv('story-line-filters-container');
        const filterSceneMgr = this.plugin?.sceneManager as SceneManager | undefined;
        if (filterSceneMgr && this.plugin) {
            this.filtersComponent = new FiltersComponent(
                filterContainer,
                filterSceneMgr,
                (filter, sort) => {
                    this.currentFilter = filter;
                    if (sort) this.currentSort = sort;
                    this.renderGrid();
                },
                this.plugin
            );
            this.filtersComponent.render();
        }

        this.scrollAreaEl = this.wrapperEl.createDiv('plot-grid-scroll-area');
        this.scrollAreaEl.setCssStyles({
            flex: '1 1 auto',
            overflow: 'auto',
            position: 'relative',
        });
        enableDragToPan(this.scrollAreaEl);

        this.canvasEl = this.scrollAreaEl.createDiv('plot-grid-canvas');
        this.canvasEl.setCssStyles({ position: 'relative' });
        // Use CSS zoom instead of transform: scale() — transforms break position: sticky
        this.canvasEl.setCssStyles({
            width: '100%',
            boxSizing: 'border-box',
        });

        // Inspector sidebar (same pattern as BoardView)
        this.inspectorEl = this.wrapperEl.createDiv('story-line-inspector-panel');
        this.inspectorEl.setCssStyles({ display: 'none' });
        const sceneManager = this.plugin?.sceneManager as SceneManager | undefined;
        if (sceneManager && this.plugin) {
            this.inspectorComponent = new InspectorComponent(
                this.inspectorEl,
                this.plugin,
                sceneManager,
                {
                    onEdit: (scene) => this.openScene(scene),
                    onDelete: (scene) => this.deleteScene(scene),
                    onRefresh: () => this.renderGrid(),
                    onStatusChange: async (scene, status) => {
                        await sceneManager.updateScene(scene.filePath, { status });
                        this.renderGrid();
                    },
                }
            );
        }
    }

    private renderToolbar() {
        if (!this.wrapperEl) return;
        const toolbar = this.wrapperEl.querySelector('.plot-grid-toolbar') as HTMLDivElement;
        toolbar.empty();

        const titleRow = toolbar.createDiv('story-line-title-row');
        titleRow.createEl('h3', {
            cls: 'story-line-view-title',
            text: 'StoryLine'
        });
        // Show active project title next to the main label (no dropdown / new button here)
        // project name shown in top-center only; no inline project selector here

        // View switcher tabs
        if (this.plugin) {
            renderViewSwitcher(toolbar, PLOTGRID_VIEW_TYPE, this.plugin, this.leaf);
        }

        const controls = toolbar.createDiv('story-line-toolbar-controls');
        // add a small left margin so there's a bit more space between the view switcher and action buttons
        controls.setCssStyles({ marginLeft: '24px' });

        const left = controls.createDiv('plot-grid-toolbar-left');
        left.setCssStyles({
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
        });

        const actions = controls.createDiv('plot-grid-toolbar-actions');
        actions.setCssStyles({
            display: 'flex',
            gap: '2px',
            marginLeft: 'auto',
        });

        // Toolbar icon styling lives in styles.css under `.plot-grid-toolbar`.

        // Sync from Scenes button
        const syncBtn = left.createEl('button', { cls: 'clickable-icon' });
        obsidian.setIcon(syncBtn, 'refresh-cw');
        attachTooltip(syncBtn, 'Sync from Scenes');
        syncBtn.addEventListener('click', () => { this.openSyncModal(); });

        // Separator between Sync and Add Row/Column
        const syncSep = left.createDiv();
        syncSep.setCssStyles({
            width: '1px',
            height: '18px',
            background: 'var(--background-modifier-border)',
            margin: '0 4px',
        });

        // Add Row / Add Column buttons
        const addRowBtn = left.createEl('button', { cls: 'clickable-icon' });
        obsidian.setIcon(addRowBtn, 'rows-3');
        attachTooltip(addRowBtn, 'Add Row');
        addRowBtn.addEventListener('click', () => { this.addRow(); });

        const addColBtn = left.createEl('button', { cls: 'clickable-icon' });
        obsidian.setIcon(addColBtn, 'columns-3');
        attachTooltip(addColBtn, 'Add Column');
        addColBtn.addEventListener('click', () => { this.addColumn(); });

        // Sticky headers toggle
        const stickyLabel = this.data.stickyHeaders !== false ? 'Disable sticky headers' : 'Enable sticky headers';
        const stickyBtn = left.createEl('button', { cls: 'clickable-icon' });
        obsidian.setIcon(stickyBtn, this.data.stickyHeaders !== false ? 'pin' : 'pin-off');
        attachTooltip(stickyBtn, stickyLabel);
        stickyBtn.addEventListener('click', () => {
            this.data.stickyHeaders = !(this.data.stickyHeaders !== false);
            this.scheduleSave();
            this.renderToolbar();
            this.renderGrid();
        });

        // Auto-Note toggle
        if (this.plugin) {
            const autoNoteLabel = this.plugin.settings.plotgridAutoNote ? 'Auto-Note: On' : 'Auto-Note: Off';
            const autoNoteBtn = left.createEl('button', {
                cls: `clickable-icon ${this.plugin.settings.plotgridAutoNote ? 'is-active' : ''}`,
            });
            obsidian.setIcon(autoNoteBtn, 'sticky-note');
            attachTooltip(autoNoteBtn, autoNoteLabel);
            if (this.plugin.settings.plotgridAutoNote) {
                autoNoteBtn.setCssStyles({ color: 'var(--interactive-accent)' });
            }
            autoNoteBtn.addEventListener('click', async () => {
                this.plugin!.settings.plotgridAutoNote = !this.plugin!.settings.plotgridAutoNote;
                await this.plugin!.saveSettings();
                this.renderToolbar();
            });
        }

        // Formatting controls (moved to the right actions area so B/I move right)
        const fmtGroup = actions.createDiv('plot-grid-formatting-group');
        fmtGroup.setCssStyles({
            display: 'flex',
            gap: '2px',
        });

        const boldBtn = fmtGroup.createEl('button', { cls: 'clickable-icon' });
        obsidian.setIcon(boldBtn, 'bold');
        attachTooltip(boldBtn, 'Bold');
        boldBtn.addEventListener('click', () => this.toggleBoldSelected());

        const italicBtn = fmtGroup.createEl('button', { cls: 'clickable-icon' });
        obsidian.setIcon(italicBtn, 'italic');
        attachTooltip(italicBtn, 'Italic');
        italicBtn.addEventListener('click', () => this.toggleItalicSelected());

        const alignSelect = fmtGroup.createEl('select');
        alignSelect.title = 'Alignment for selection';
        alignSelect.addEventListener('change', () => this.setAlignSelected(alignSelect.value as 'left' | 'center' | 'right'));
        // default to centered
        alignSelect.value = 'center';

        const bgColorBtn = fmtGroup.createEl('button', { cls: 'clickable-icon' });
        obsidian.setIcon(bgColorBtn, 'palette');
        attachTooltip(bgColorBtn, 'Background color');
        bgColorBtn.addEventListener('click', () => this.setCellBgColorSelected());

        const textColorBtn = fmtGroup.createEl('button', { cls: 'clickable-icon' });
        obsidian.setIcon(textColorBtn, 'paintbrush');
        attachTooltip(textColorBtn, 'Text color');
        textColorBtn.addEventListener('click', () => this.setCellTextColorSelected());


        // Note: Add Row / Add Column buttons moved to the right controls area

                // Reset moved to corner right-click context menu with confirmation

        // Add Row / Add Column created above in the left controls (they replace B/I position)

        const zoomOut = actions.createEl('button', { cls: 'clickable-icon' });
        obsidian.setIcon(zoomOut, 'zoom-out');
        attachTooltip(zoomOut, 'Zoom out');
        zoomOut.addEventListener('click', () => this.setZoom(Math.max(0.3, this.data.zoom - 0.1)));

        const zoomLabel = actions.createEl('span', { cls: 'plot-grid-zoom-label', text: Math.round(this.data.zoom * 100) + '%' });
        // Keep the label fixed width so the control doesn't jump when digits change (e.g. 100% -> 99%)
        zoomLabel.setCssStyles({
            display: 'inline-block',
            width: '40px',
            minWidth: '40px',
            textAlign: 'center',
            alignSelf: 'center',
            cursor: 'text',
        });
        zoomLabel.title = 'Click to edit zoom %';
        zoomLabel.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const inp = activeDocument.createElement('input');
            inp.type = 'text';
            inp.value = Math.round(this.data.zoom * 100).toString();
            inp.setCssStyles({ width: '56px' });
            inp.addEventListener('keydown', (ke) => {
                if (ke.key === 'Enter') {
                    const v = Number(inp.value);
                    if (!isNaN(v) && v > 0) this.setZoom(Math.min(200, Math.max(30, v)) / 100);
                    this.renderToolbar();
                } else if (ke.key === 'Escape') this.renderToolbar();
            });
            inp.addEventListener('blur', () => this.renderToolbar());
            zoomLabel.replaceWith(inp);
            inp.focus();
            inp.select();
        });

        const resetZoomBtn = actions.createEl('button', { cls: 'clickable-icon' });
        obsidian.setIcon(resetZoomBtn, 'maximize-2');
        attachTooltip(resetZoomBtn, 'Reset zoom');
        resetZoomBtn.addEventListener('click', () => this.setZoom(1));

        const zoomIn = actions.createEl('button', { cls: 'clickable-icon' });
        obsidian.setIcon(zoomIn, 'zoom-in');
        attachTooltip(zoomIn, 'Zoom in');
        zoomIn.addEventListener('click', () => this.setZoom(Math.min(2.0, this.data.zoom + 0.1)));

        // ── View Snapshots ──
        const snapManage = actions.createDiv({ cls: 'clickable-icon' });
        obsidian.setIcon(snapManage, 'history');
        attachTooltip(snapManage, 'Manage View Snapshots');
        snapManage.addEventListener('click', () => {
            if (this.plugin) openManageSnapshotsModal(this.plugin.app, this.plugin.viewSnapshotService);
        });

        actions.appendChild(zoomOut);
        actions.appendChild(zoomLabel);
        actions.appendChild(zoomIn);
        actions.appendChild(resetZoomBtn);

        // Icons are rendered exclusively via `obsidian.setIcon()` above —
        // the previous `lucide.createIcons()` bootstrap was dead code and
        // also caused the bundler to pull the entire `lucide` icon set
        // (including a `Bitcoin` icon) into `main.js`, which tripped the
        // Obsidian plugin reviewer's crypto-wallet heuristic.

        // Ensure icon-only appearance: remove any visible button edges and set icon size
        try {
            const btns = toolbar.querySelectorAll('.icon-button');
            btns.forEach((b) => {
                const btn = b as HTMLElement;
                btn.setCssStyles({
                    background: 'transparent',
                    backgroundColor: 'transparent',
                    backgroundImage: 'none',
                    border: 'none',
                    boxShadow: 'none',
                    outline: 'none',
                    minWidth: '0',
                    width: 'auto',
                    height: 'auto',
                    padding: '2px',
                    borderRadius: '0',
                });
                // set the inner lucide holder and svg size
                const holder = btn.querySelector('i[data-lucide]') as HTMLElement | null;
                if (holder) {
                    holder.setCssStyles({
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        transition: 'transform 120ms ease, background-color 120ms ease, opacity 120ms ease',
                    });
                    const svg = holder.querySelector('svg') as SVGElement | null;
                    if (svg) {
                        // Do not hard-set width/height — allow the app's icon sizing to control pixel dimensions so it matches BoardView
                        const svgEl = svg as unknown as { setCssStyles: (s: Record<string, string>) => void };
                        svgEl.setCssStyles({ transition: 'transform 120ms ease, opacity 120ms ease' });
                        svgEl.setCssStyles({ opacity: '0.95' });
                        svgEl.setCssStyles({ display: 'block' });
                    }
                }
                // add hover and active feedback for each button
                btn.addEventListener('mouseenter', () => {
                    try {
                        btn.setCssStyles({
                            backgroundColor: 'var(--sl-hover-overlay)',
                            borderRadius: '6px',
                        });
                        const holder = btn.querySelector('i[data-lucide]') as HTMLElement | null;
                        if (holder) holder.setCssStyles({ transform: 'scale(1.08)' });
                    } catch (e) { /* cosmetic, safe to ignore */ }
                });
                btn.addEventListener('mouseleave', () => {
                    try {
                        btn.setCssStyles({
                            background: 'transparent',
                            backgroundColor: 'transparent',
                            borderRadius: '0',
                        });
                        const holder = btn.querySelector('i[data-lucide]') as HTMLElement | null;
                        if (holder) holder.setCssStyles({ transform: '' });
                    } catch (e) { /* cosmetic, safe to ignore */ }
                });
                btn.addEventListener('mousedown', () => {
                    try {
                        const holder = btn.querySelector('i[data-lucide]') as HTMLElement | null;
                        if (holder) holder.setCssStyles({ transform: 'scale(0.96)' });
                    } catch (e) { /* cosmetic, safe to ignore */ }
                });
                activeDocument.addEventListener('mouseup', () => {
                    try {
                        const holder = btn.querySelector('i[data-lucide]') as HTMLElement | null;
                        if (holder) holder.setCssStyles({ transform: '' });
                    } catch (e) { /* cosmetic, safe to ignore */ }
                });
            });
        } catch (e) { /* safe no-op */ }
    }

    private setZoom(z: number) {
        this.data.zoom = z;
        if (this.canvasEl && this.scrollAreaEl) {
            // Use CSS zoom instead of transform: scale() to preserve position: sticky
            (this.canvasEl.style as unknown as Record<string, unknown>).zoom = String(z);
            const totalWidth = this.computeTotalWidth();
            this.canvasEl.setCssStyles({ width: totalWidth + 'px' });
        }
        this.scheduleSave();
        const toolbar = this.wrapperEl?.querySelector('.plot-grid-toolbar') || this.wrapperEl?.querySelector('.story-line-toolbar');
        const label = toolbar?.querySelector('.plot-grid-zoom-label') as HTMLElement | null;
        if (label) label.textContent = Math.round(z * 100) + '%';
    }

    private computeTotalWidth() {
        return ROW_HEADER_WIDTH + this.data.columns.reduce((s, c) => s + c.width, 0);
    }

    private renderGrid() {
        if (!this.canvasEl || !this.scrollAreaEl) return;

        // Preserve scroll position across re-renders so the view doesn't jump
        const prevScrollTop = this.scrollAreaEl.scrollTop;
        const prevScrollLeft = this.scrollAreaEl.scrollLeft;

        this.ensureDefaults();
        this.canvasEl.empty();

        let colTemplate = [ROW_HEADER_WIDTH + 'px', ...this.data.columns.map((c) => c.width + 'px')].join(' ');

        // ── Determine which rows are visible (filter support) ──
        // Also build a sort-order index if the user changed the sort dropdown
        const sceneManager = this.plugin?.sceneManager as SceneManager | undefined;
        const activeProject = sceneManager?.activeProject;
        const hasFilter = this.currentFilter && Object.keys(this.currentFilter).some(
            k => { const v = (this.currentFilter as unknown as Record<string, unknown>)[k]; return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0); }
        );
        let filteredPaths: Set<string> | null = null;
        if (hasFilter && sceneManager) {
            filteredPaths = new Set(
                sceneManager.queryService.getFilteredScenes(this.currentFilter, undefined).map(s => s.filePath)
            );
        }

        // Build a row display order based on current sort field
        const rowIndices = this.data.rows.map((_, i) => i);
        if (sceneManager && this.currentSort) {
            const field = this.currentSort.field;
            const dir = this.currentSort.direction === 'desc' ? -1 : 1;
            // Issue #76 \u2014 reading-order fields use the shared act \u2192 chapter
            // \u2192 sequence comparator (string-aware so non-numeric acts/chapters
            // like "Prologue" or "1.1" sort correctly). Other fields fall
            // back to the previous generic comparator.
            const isReadingOrder = field === 'sequence' || field === 'chapter' || field === 'act';
            rowIndices.sort((ai, bi) => {
                const rowA = this.data.rows[ai];
                const rowB = this.data.rows[bi];
                const sceneA = rowA.sourceId ? sceneManager.getScene(rowA.sourceId) : null;
                const sceneB = rowB.sourceId ? sceneManager.getScene(rowB.sourceId) : null;
                if (!sceneA && !sceneB) return 0;
                if (!sceneA) return 1;
                if (!sceneB) return -1;
                if (isReadingOrder) {
                    let cmp = compareActChapter(sceneA.act, sceneB.act);
                    if (cmp === 0 && (field === 'sequence' || field === 'chapter')) {
                        cmp = compareActChapter(sceneA.chapter, sceneB.chapter);
                    }
                    if (cmp === 0 && field === 'sequence') {
                        cmp = (sceneA.sequence ?? 9999) - (sceneB.sequence ?? 9999);
                    }
                    return cmp * dir;
                }
                const valA = (sceneA as unknown as Record<string, unknown>)[field];
                const valB = (sceneB as unknown as Record<string, unknown>)[field];
                if (valA == null && valB == null) return 0;
                if (valA == null) return 1;
                if (valB == null) return -1;
                if (typeof valA === 'number' && typeof valB === 'number') return (valA - valB) * dir;
                return coerceString(valA).localeCompare(coerceString(valB)) * dir;
            });
        }

        const visibleRows = new Set<number>();
        for (const ri of rowIndices) {
            const row = this.data.rows[ri];
            if (!filteredPaths) { visibleRows.add(ri); continue; }
            // Manual rows always visible
            if (!row.sourceId || row.sourceType !== 'auto') { visibleRows.add(ri); continue; }
            if (filteredPaths.has(row.sourceId)) visibleRows.add(ri);
        }

        // ── Build act/chapter divider positions (visible rows only) ──
        const dividersBefore = new Map<number, Array<{type: 'act'|'chapter', label: string}>>();
        {
            let prevAct: string | number | undefined;
            let prevChapter: string | number | undefined;
            for (const ri of rowIndices) {
                if (!visibleRows.has(ri)) continue;
                const row = this.data.rows[ri];
                if (row.sourceType !== 'auto' || !row.sourceId || !sceneManager) continue;
                const scene = sceneManager.getScene(row.sourceId);
                if (!scene) continue;
                const dividers: Array<{type: 'act'|'chapter', label: string}> = [];
                if (scene.act !== undefined && String(scene.act) !== String(prevAct)) {
                    const actNum = typeof scene.act === 'number' ? scene.act : parseInt(String(scene.act), 10);
                    const actLabels = (activeProject as unknown as { actLabels?: Record<number, string> })?.actLabels;
                    const rawActLabel = !isNaN(actNum) ? (actLabels?.[actNum] || '') : '';
                    const cleanActLabel = rawActLabel.replace(/^Act\s*\d+\s*[—:]\s*/i, '');
                    dividers.push({ type: 'act', label: cleanActLabel ? `Act ${scene.act}: ${cleanActLabel}` : `Act ${scene.act}` });
                    prevChapter = undefined;
                }
                if (scene.chapter !== undefined && String(scene.chapter) !== String(prevChapter)) {
                    const chNum = typeof scene.chapter === 'number' ? scene.chapter : parseInt(String(scene.chapter), 10);
                    const chapterLabels = (activeProject as unknown as { chapterLabels?: Record<number, string> })?.chapterLabels;
                    const rawChLabel = !isNaN(chNum) ? (chapterLabels?.[chNum] || '') : '';
                    const cleanChLabel = rawChLabel.replace(/^Ch(?:apter)?\s*\d+\s*[—:]\s*/i, '');
                    dividers.push({ type: 'chapter', label: cleanChLabel ? `Ch ${scene.chapter}: ${cleanChLabel}` : `Chapter ${scene.chapter}` });
                }
                if (dividers.length > 0) dividersBefore.set(ri, dividers);
                prevAct = scene.act;
                prevChapter = scene.chapter;
            }
        }

        // Build row template including divider rows (visible only)
        const rowHeightParts: string[] = [];
        for (const ri of rowIndices) {
            if (!visibleRows.has(ri)) continue;
            const divs = dividersBefore.get(ri);
            if (divs) for (const d of divs) rowHeightParts.push(d.type === 'act' ? '32px' : '26px');
            rowHeightParts.push(this.data.rows[ri].height + 'px');
        }
        let rowTemplate = [COL_HEADER_HEIGHT + 'px', ...rowHeightParts].join(' ');

        // If there are no columns/rows yet, use flexible templates so the empty-state message
        // can span the full available width instead of being constrained to the single header column.
        if (this.data.columns.length === 0) colTemplate = '1fr';
        if (this.data.rows.length === 0) rowTemplate = '1fr';

        this.canvasEl.setCssStyles({
            display: 'grid',
            gridTemplateColumns: colTemplate,
            gridTemplateRows: rowTemplate,
        });
        // If there are no columns, allow the canvas to stretch to the container width.
        if (this.data.columns.length === 0) this.canvasEl.setCssStyles({ width: '100%' });
        else this.canvasEl.setCssStyles({ width: this.computeTotalWidth() + 'px' });

        const corner = this.canvasEl.createDiv('plot-grid-corner');
        corner.setAttr('data-type', 'corner');
        corner.setCssStyles({
            position: (this.data.stickyHeaders === false) ? 'relative' : 'sticky',
            top: '0',
            left: '0',
            zIndex: '11',
            background: 'var(--background-modifier-hover)',
            border: '1px solid var(--sl-border-subtle)',
        });

        // corner context menu (Reset grid moved here)
        corner.addEventListener('contextmenu', (evt) => {
            evt.preventDefault();
            const menu = new Menu();
            menu.addItem((it) => it.setTitle('Reset Grid').onClick(() => {
                class ConfirmModal extends Modal {
                    onConfirm: () => void;
                    constructor(app: App, onConfirm: () => void) { super(app); this.onConfirm = onConfirm; }
                    onOpen() {
                        const { contentEl } = this;
                        contentEl.createEl('h3', { text: 'Reset Grid' });
                        contentEl.createEl('p', { text: 'Are you sure you want to reset the Grid? Resetting will delete everything.' });
                        const btns = contentEl.createDiv();
                        const ok = btns.createEl('button', { text: 'Reset' });
                        ok.addEventListener('click', () => { this.onConfirm(); this.close(); });
                        const cancel = btns.createEl('button', { text: 'Cancel' });
                        cancel.addEventListener('click', () => this.close());
                    }
                }
                const modal = new ConfirmModal(this.app, () => { this.data = { rows: [], columns: [], cells: {}, zoom: 1 }; this.scheduleSave(); this.renderGrid(); });
                modal.open();
            }));
            menu.showAtMouseEvent(evt);
        });

        for (let ci = 0; ci < this.data.columns.length; ci++) {
            const col = this.data.columns[ci];
            const el = this.canvasEl.createDiv('plot-grid-col-header');
            el.setCssStyles({
                position: (this.data.stickyHeaders === false) ? 'relative' : 'sticky',
                top: '0',
                zIndex: '10',
                background: col.headerBgColor || col.bgColor || 'var(--background-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--sl-border-subtle)',
                userSelect: 'none',
            });
            el.textContent = col.label;
            if (col.textColor) el.setCssStyles({ color: col.textColor });
            else { const _bg = col.headerBgColor || col.bgColor; if (_bg && _bg.startsWith('#')) el.setCssStyles({ color: contrastTextColor(_bg) }); }
            if (col.bold) el.setCssStyles({ fontWeight: '600' });
            if (col.italic) el.setCssStyles({ fontStyle: 'italic' });

            // allow naming like cells: double-click to edit label
            el.addEventListener('dblclick', (ev) => {
                ev.stopPropagation();
                const inp = activeDocument.createElement('input');
                inp.type = 'text';
                inp.value = col.label;
                inp.setCssStyles({
                    width: '100%',
                    boxSizing: 'border-box',
                });
                el.empty();
                el.appendChild(inp);
                inp.focus();
                const commit = () => { col.label = inp.value || col.label; this.scheduleSave(); this.renderGrid(); };
                inp.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') { commit(); } else if (ke.key === 'Escape') { this.renderGrid(); } });
                inp.addEventListener('blur', () => commit());
            });

            // click opens entity for synced columns; Ctrl/Cmd+click selects
            el.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (col.sourceType === 'auto' && col.sourceId && col.sourceKind !== 'tags' && !(ev.ctrlKey || ev.metaKey)) {
                    this.navigateToColumnEntity(col);
                    return;
                }
                this.selectColumnHeader(ci);
            });
            if (col.sourceType === 'auto' && col.sourceKind && col.sourceKind !== 'tags') {
                el.title = `${col.label} (click to open)`;
                el.setCssStyles({ cursor: 'pointer' });
            }

            // enable drag-to-reorder for columns
            el.draggable = true;
            el.addEventListener('dragstart', (ev) => {
                ev.dataTransfer?.setData('text/plain', `col:${ci}`);
            });
            el.addEventListener('dragover', (ev) => { ev.preventDefault(); });
            el.addEventListener('drop', (ev) => {
                ev.preventDefault();
                const data = ev.dataTransfer?.getData('text/plain');
                if (!data) return;
                const [type, idxStr] = data.split(':');
                const srcIdx = Number(idxStr);
                if (type === 'col' && !Number.isNaN(srcIdx) && srcIdx !== ci) {
                    this.moveColumn(srcIdx, ci);
                }
            });

            // resize handle for column
            const colHandle = el.createDiv('plot-col-resize-handle');
            colHandle.setCssStyles({
                position: 'absolute',
                right: '0',
                top: '0',
                bottom: '0',
                width: '6px',
                cursor: 'col-resize',
            });
            colHandle.draggable = false;
            colHandle.addEventListener('mousedown', (ev) => { ev.stopPropagation(); this.startColResize(ev as MouseEvent, ci); });

            // column header context menu
            el.addEventListener('contextmenu', (evt) => {
                evt.preventDefault();
                const menu = new Menu();
                menu.addItem((item) => item.setTitle('Rename Column').onClick(() => {
                    const modal = new Modal(this.app);
                    modal.titleEl.setText('Rename Column');
                    const inp = modal.contentEl.createEl('input', { type: 'text', cls: 'plot-grid-rename-input' });
                    inp.setCssStyles({ width: '100%' });
                    inp.value = col.label;
                    const commitRename = () => {
                        const liveCol = this.data.columns[ci];
                        if (liveCol) liveCol.label = inp.value || liveCol.label;
                        this.scheduleSave(); this.renderGrid(); modal.close();
                    };
                    inp.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') commitRename(); });
                    const btn = modal.contentEl.createEl('button', { text: 'OK', cls: 'mod-cta' });
                    btn.setCssStyles({ marginTop: '8px' });
                    btn.addEventListener('click', () => commitRename());
                    modal.open();
                    inp.focus();
                    inp.select();
                }));
                menu.addItem((item) => item.setTitle((this.data.stickyHeaders ? 'Disable' : 'Enable') + ' Sticky Headers').onClick(() => { this.data.stickyHeaders = !this.data.stickyHeaders; this.scheduleSave(); this.renderToolbar(); this.renderGrid(); }));
                menu.addItem((item) => item.setTitle('Set Column Colour…').onClick(() => {
                    const header = this.canvasEl?.querySelectorAll('.plot-grid-col-header')[ci] as HTMLElement | undefined;
                    const els: HTMLElement[] = [];
                    for (let ri = 0; ri < this.data.rows.length; ri++) { const e = this.getCellElement(ri, ci); if (e) els.push(e); }
                    const prevs = els.map(e => e.style.background);
                    const prevHeaderBg = header ? header.style.background : null;
                    this.chooseColor(this.data.columns[ci].bgColor || this.defaultBgColor(), (c) => { if (c === null) { els.forEach((e,i) => e.setCssStyles({ background: prevs[i] })); if (header && prevHeaderBg !== null) header.setCssStyles({ background: prevHeaderBg }); return; } this.data.columns[ci].bgColor = c || ''; this.scheduleSave(); this.renderGrid(); for (let ri=0; ri<this.data.rows.length; ri++) this.flashElement(this.getCellElement(ri, ci)); }, (preview) => { if (preview === null) { els.forEach((e,i) => e.setCssStyles({ background: prevs[i] })); if (header && prevHeaderBg !== null) header.setCssStyles({ background: prevHeaderBg }); } else { els.forEach(e => e.setCssStyles({ background: preview })); if (header) header.setCssStyles({ background: preview }); } });
                }));
                menu.addItem((item) => item.setTitle('Set Header Colour…').onClick(() => {
                    const header = this.canvasEl?.querySelectorAll('.plot-grid-col-header')[ci] as HTMLElement | undefined;
                    const prevHeaderBg = header ? header.style.background : null;
                    this.chooseColor(this.data.columns[ci].headerBgColor || this.data.columns[ci].bgColor || this.defaultBgColor(), (c) => {
                        if (c === null) { if (header && prevHeaderBg !== null) header.setCssStyles({ background: prevHeaderBg }); return; }
                        this.data.columns[ci].headerBgColor = c || '';
                        this.scheduleSave(); this.renderGrid();
                        if (header) this.flashElement(header);
                    }, (preview) => {
                        if (preview === null) { if (header && prevHeaderBg !== null) header.setCssStyles({ background: prevHeaderBg }); }
                        else { if (header) header.setCssStyles({ background: preview }); }
                    });
                }));
                menu.addSeparator();
                menu.addItem((item) => item.setTitle('Insert Column Left').onClick(() => this.insertColumnAt(ci, true)));
                menu.addItem((item) => item.setTitle('Insert Column Right').onClick(() => this.insertColumnAt(ci, false)));
                menu.addSeparator();
                menu.addItem((item) => item.setTitle('Delete Column').onClick(() => this.deleteColumn(ci)));
                menu.showAtMouseEvent(evt);
            });
        }

        for (const ri of rowIndices) {
            if (!visibleRows.has(ri)) continue; // skip filtered-out rows
            // ── Act/chapter dividers ──
            const divs = dividersBefore.get(ri);
            if (divs) {
                const colCount = this.data.columns.length + 1;
                for (const d of divs) {
                    const divEl = this.canvasEl.createDiv(`plot-grid-divider plot-grid-divider-${d.type}`);
                    divEl.setCssStyles({
                        gridColumn: `1 / ${colCount + 1}`,
                        position: (this.data.stickyHeaders === false) ? 'relative' : 'sticky',
                        left: '0',
                        zIndex: '8',
                    });
                    const icon = divEl.createSpan('plot-grid-divider-icon');
                    obsidian.setIcon(icon, d.type === 'act' ? 'bookmark' : 'hash');
                    divEl.createSpan({ text: d.label, cls: 'plot-grid-divider-label' });
                }
            }

            const row = this.data.rows[ri];
            const rowEl = this.canvasEl.createDiv('plot-grid-row-header');
            rowEl.setCssStyles({
                position: (this.data.stickyHeaders === false) ? 'relative' : 'sticky',
                left: '0',
                zIndex: '9',
                background: row.headerBgColor || row.bgColor || 'var(--background-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--sl-border-subtle)',
                userSelect: 'none',
            });
            rowEl.textContent = row.label;
            if (row.textColor) rowEl.setCssStyles({ color: row.textColor });
            else { const _bg = row.headerBgColor || row.bgColor; if (_bg && _bg.startsWith('#')) rowEl.setCssStyles({ color: contrastTextColor(_bg) }); }
            if (row.bold) rowEl.setCssStyles({ fontWeight: '600' });
            if (row.italic) rowEl.setCssStyles({ fontStyle: 'italic' });

            // Status color indicator on left border
            if (row.sourceType === 'auto' && row.sourceId && sceneManager) {
                const rowScene = sceneManager.getScene(row.sourceId);
                if (rowScene) {
                    const statusCfg = resolveStatusCfg(rowScene.status || 'idea');
                    rowEl.setCssStyles({ borderLeft: `4px solid ${statusCfg.color}` });
                }
            }

            // allow naming like cells: double-click to edit label
            rowEl.addEventListener('dblclick', (ev) => {
                ev.stopPropagation();
                rowEl.draggable = false;
                const inp = activeDocument.createElement('input');
                inp.type = 'text';
                inp.value = row.label;
                inp.setCssStyles({
                    width: '100%',
                    boxSizing: 'border-box',
                });
                rowEl.empty();
                rowEl.appendChild(inp);
                inp.focus();
                inp.select();
                const commit = () => { row.label = inp.value || row.label; this.scheduleSave(); this.renderGrid(); };
                inp.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') { commit(); } else if (ke.key === 'Escape') { this.renderGrid(); } });
                inp.addEventListener('blur', () => commit());
            });

            // click opens scene file for synced rows; Ctrl/Cmd+click selects
            // Use a small delay so double-click (edit label) doesn't also open the file
            let clickTimer: number | null = null;
            rowEl.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (row.sourceType === 'auto' && row.sourceId && !(ev.ctrlKey || ev.metaKey)) {
                    if (clickTimer) window.clearTimeout(clickTimer);
                    clickTimer = window.setTimeout(() => {
                        clickTimer = null;
                        const file = this.app.vault.getAbstractFileByPath(row.sourceId!) as TFile | null;
                        if (file) this.app.workspace.getLeaf('tab').openFile(file, { state: { mode: 'source', source: false } });
                    }, 250);
                    return;
                }
                this.selectRowHeader(ri);
            });
            rowEl.addEventListener('dblclick', () => {
                if (clickTimer) { window.clearTimeout(clickTimer); clickTimer = null; }
            });
            if (row.sourceType === 'auto' && row.sourceId) {
                rowEl.title = `${row.label} (click to open)`;
                rowEl.setCssStyles({ cursor: 'pointer' });
            }

            // enable drag-to-reorder for rows
            rowEl.draggable = true;
            rowEl.addEventListener('dragstart', (ev) => {
                ev.dataTransfer?.setData('text/plain', `row:${ri}`);
            });
            rowEl.addEventListener('dragover', (ev) => { ev.preventDefault(); });
            rowEl.addEventListener('drop', (ev) => {
                ev.preventDefault();
                const data = ev.dataTransfer?.getData('text/plain');
                if (!data) return;
                const [type, idxStr] = data.split(':');
                const srcIdx = Number(idxStr);
                if (type === 'row' && !Number.isNaN(srcIdx) && srcIdx !== ri) {
                    this.moveRow(srcIdx, ri);
                }
            });

            // resize handle for row
            const rowHandle = rowEl.createDiv('plot-row-resize-handle');
            rowHandle.setCssStyles({
                position: 'absolute',
                left: '0',
                right: '0',
                bottom: '0',
                height: '6px',
                cursor: 'row-resize',
            });
            rowHandle.draggable = false;
            rowHandle.addEventListener('mousedown', (ev) => { ev.stopPropagation(); this.startRowResize(ev as MouseEvent, ri); });

            // row header context menu
            rowEl.addEventListener('contextmenu', (evt) => {
                evt.preventDefault();
                const menu = new Menu();
                menu.addItem((item) => item.setTitle('Rename Row').onClick(() => {
                    const modal = new Modal(this.app);
                    modal.titleEl.setText('Rename Row');
                    const inp = modal.contentEl.createEl('input', { type: 'text', cls: 'plot-grid-rename-input' });
                    inp.setCssStyles({ width: '100%' });
                    inp.value = row.label;
                    const commitRename = () => {
                        const liveRow = this.data.rows[ri];
                        if (liveRow) liveRow.label = inp.value || liveRow.label;
                        this.scheduleSave(); this.renderGrid(); modal.close();
                    };
                    inp.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') commitRename(); });
                    const btn = modal.contentEl.createEl('button', { text: 'OK', cls: 'mod-cta' });
                    btn.setCssStyles({ marginTop: '8px' });
                    btn.addEventListener('click', () => commitRename());
                    modal.open();
                    inp.focus();
                    inp.select();
                }));
                menu.addItem((item) => item.setTitle((this.data.stickyHeaders ? 'Disable' : 'Enable') + ' Sticky Headers').onClick(() => { this.data.stickyHeaders = !this.data.stickyHeaders; this.scheduleSave(); this.renderToolbar(); this.renderGrid(); }));
                menu.addItem((item) => item.setTitle('Set Row Colour…').onClick(() => {
                    const els: HTMLElement[] = [];
                    for (let ci = 0; ci < this.data.columns.length; ci++) { const e = this.getCellElement(ri, ci); if (e) els.push(e); }
                    const prevs = els.map(e => e.style.background);
                    const header = this.canvasEl?.querySelectorAll('.plot-grid-row-header')[ri] as HTMLElement | undefined;
                    const prevHeaderBg = header ? header.style.background : null;
                    this.chooseColor(this.data.rows[ri].bgColor || this.defaultBgColor(), (c) => { if (c === null) { els.forEach((e,i) => e.setCssStyles({ background: prevs[i] })); if (header && prevHeaderBg !== null) header.setCssStyles({ background: prevHeaderBg }); return; } this.data.rows[ri].bgColor = c || ''; this.scheduleSave(); this.renderGrid(); for (let ci=0; ci<this.data.columns.length; ci++) this.flashElement(this.getCellElement(ri, ci)); }, (preview) => { if (preview === null) { els.forEach((e,i) => e.setCssStyles({ background: prevs[i] })); if (header && prevHeaderBg !== null) header.setCssStyles({ background: prevHeaderBg }); } else { els.forEach(e => e.setCssStyles({ background: preview })); if (header) header.setCssStyles({ background: preview }); } });
                }));
                menu.addItem((item) => item.setTitle('Set Header Colour…').onClick(() => {
                    const header = this.canvasEl?.querySelectorAll('.plot-grid-row-header')[ri] as HTMLElement | undefined;
                    const prevHeaderBg = header ? header.style.background : null;
                    this.chooseColor(this.data.rows[ri].headerBgColor || this.data.rows[ri].bgColor || this.defaultBgColor(), (c) => {
                        if (c === null) { if (header && prevHeaderBg !== null) header.setCssStyles({ background: prevHeaderBg }); return; }
                        this.data.rows[ri].headerBgColor = c || '';
                        this.scheduleSave(); this.renderGrid();
                        if (header) this.flashElement(header);
                    }, (preview) => {
                        if (preview === null) { if (header && prevHeaderBg !== null) header.setCssStyles({ background: prevHeaderBg }); }
                        else { if (header) header.setCssStyles({ background: preview }); }
                    });
                }));
                menu.addSeparator();
                menu.addItem((item) => item.setTitle('Insert Row Above').onClick(() => this.insertRowAt(ri, true)));
                menu.addItem((item) => item.setTitle('Insert Row Below').onClick(() => this.insertRowAt(ri, false)));
                menu.addSeparator();
                menu.addItem((item) => item.setTitle('Delete Row').onClick(() => this.deleteRow(ri)));
                menu.showAtMouseEvent(evt);
            });

            for (let ci = 0; ci < this.data.columns.length; ci++) {
                const col = this.data.columns[ci];
                const key = `${row.id}-${col.id}`;
                let cell = this.data.cells[key];
                if (!cell) {
                    cell = {
                            id: key,
                            content: '',
                            bgColor: '',
                            textColor: '',
                            bold: false,
                            italic: false,
                            align: 'center',
                        };
                    this.data.cells[key] = cell;
                }
                // ensure older cells have an align value
                if (!cell.align) cell.align = 'center';

                const cellEl = this.canvasEl.createDiv('plot-grid-cell');
                // expose coordinates
                cellEl.setAttr('data-row', String(ri));
                cellEl.setAttr('data-col', String(ci));
                cellEl.setCssStyles({
                    minHeight: row.height + 'px',
                    border: '1px solid var(--sl-grid-border)',
                    padding: '6px 8px',
                    boxSizing: 'border-box',
                    whiteSpace: 'pre-wrap',
                    overflow: 'hidden',
                    cursor: 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                });

                const bg = cell.bgColor || row.bgColor || col.bgColor || '';
                if (bg) {
                    cellEl.setCssStyles({ background: bg });
                    // Auto-contrast text when no explicit textColor is set
                    if (!cell.textColor && bg.startsWith('#')) {
                        cellEl.setCssStyles({ color: contrastTextColor(bg) });
                    }
                }
                if (cell.textColor) cellEl.setCssStyles({ color: cell.textColor });
                if (cell.bold) cellEl.setCssStyles({ fontWeight: '600' });
                if (cell.italic) cellEl.setCssStyles({ fontStyle: 'italic' });
                cellEl.setCssStyles({ textAlign: cell.align });

                const contentEl = cellEl.createDiv({ cls: 'markdown-rendered' });
                contentEl.setCssStyles({ flex: '1 1 auto' });
                if (cell.content) {
                    const cellComp = new Component(); cellComp.load();
                    void MarkdownRenderer.render(this.app, cell.content, contentEl, '', cellComp);
                }

                // Make plain-text cells (no linked scene) draggable
                if (cell.content && !cell.linkedSceneId) {
                    cellEl.draggable = true;
                    cellEl.setCssStyles({
                        cursor: 'grab',
                        userSelect: 'none',
                    });
                    cellEl.addEventListener('dragstart', (ev) => {
                        ev.dataTransfer?.setData('text/cell-source', key);
                        cellEl.addClass('dragging');
                    });
                    cellEl.addEventListener('dragend', () => {
                        cellEl.removeClass('dragging');
                    });
                }

                // linked scene: render mini card or badge
                if (cell.linkedSceneId) {
                    const scMgr = this.plugin?.sceneManager as SceneManager | undefined;
                    const scene = scMgr?.getScene(cell.linkedSceneId) as Scene | undefined;
                    if (scene) {
                        // Check if this is a corkboard note
                        const isCorkboardNote = (scene as Scene & { corkboardNote?: unknown }).corkboardNote === true;

                        if (isCorkboardNote) {
                            // Determine note color
                            let noteBg = '#F6EDB4'; // fallback yellow
                            if (this.plugin) {
                                const noteColor = (scene as unknown as Record<string, unknown>).corkboardNoteColor as string | undefined;
                                if (noteColor) {
                                    noteBg = noteColor;
                                } else {
                                    const presets = resolveStickyNoteColors(this.plugin.settings);
                                    if (presets.length > 0) noteBg = presets[0].color;
                                }
                            }

                            // Apply note bg to the entire cell
                            cellEl.setCssStyles({
                                background: noteBg,
                                color: '#2b2510',
                            });
                            cellEl.addClass('pg-cell-note');

                            // Hide standard content div — replace with note body
                            contentEl.setCssStyles({ display: 'none' });

                            // "Note" label + optional origin so it's visually distinct from plain cell text
                            const noteLabel = cellEl.createDiv('pg-cell-note-label');
                            const noteIcon = noteLabel.createSpan({ cls: 'pg-cell-note-icon' });
                            obsidian.setIcon(noteIcon, 'sticky-note');
                            if (scene.plotgridOrigin) {
                                noteLabel.createSpan({ text: scene.plotgridOrigin });
                            } else {
                                noteLabel.createSpan({ text: 'Note' });
                            }

                            // Render note content directly in the cell
                            const noteBody = cellEl.createDiv('pg-cell-note-body markdown-rendered');
                            if (scene.body && scene.body.trim()) {
                                const noteComp = new Component(); noteComp.load();
                                void MarkdownRenderer.render(this.app, scene.body.trim(), noteBody, scene.filePath, noteComp);
                            }

                            // Make the note draggable so it can be moved between cells
                            cellEl.draggable = true;
                            cellEl.setCssStyles({
                                cursor: 'grab',
                                userSelect: 'none',
                            });
                            cellEl.addEventListener('dragstart', (ev) => {
                                ev.dataTransfer?.setData('text/scene-path', scene.filePath);
                                ev.dataTransfer?.setData('text/cell-source', key);
                                cellEl.addClass('dragging');
                            });
                            cellEl.addEventListener('dragend', () => {
                                cellEl.removeClass('dragging');
                            });
                        } else {
                        // Render mini scene card inside the cell
                        const miniCard = cellEl.createDiv('plot-grid-mini-card');

                        // Status icon + title row
                        const titleRow = miniCard.createDiv('pg-mini-title-row');
                        const statusCfg = resolveStatusCfg(scene.status || 'idea');
                        const statusIcon = titleRow.createSpan({ cls: 'pg-mini-status-icon' });
                        obsidian.setIcon(statusIcon, statusCfg.icon);
                        statusIcon.title = statusCfg.label;
                        titleRow.createSpan({ cls: 'pg-mini-title', text: scene.title || 'Untitled' });

                        // Meta row: description snippet
                        const metaRow = miniCard.createDiv('pg-mini-meta markdown-rendered');
                        if (scene.body && scene.body.trim()) {
                            const snippet = scene.body.trim().length > 120
                                ? scene.body.trim().substring(0, 120) + '…'
                                : scene.body.trim();
                            const metaComp = new Component(); metaComp.load();
                            void MarkdownRenderer.render(this.app, snippet, metaRow, scene.filePath, metaComp);
                        } else if (scene.conflict) {
                            const metaComp = new Component(); metaComp.load();
                            void MarkdownRenderer.render(this.app, scene.conflict, metaRow, scene.filePath, metaComp);
                        }

                        // Keep cell content below if there's text
                        if (cell.content) {
                            contentEl.setCssStyles({
                                marginTop: '4px',
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                            });
                        } else {
                            contentEl.setCssStyles({ display: 'none' });
                        }

                        // Make the mini card draggable so it can be moved between cells
                        miniCard.draggable = true;
                        miniCard.addEventListener('dragstart', (ev) => {
                            ev.dataTransfer?.setData('text/scene-path', scene.filePath);
                            ev.dataTransfer?.setData('text/cell-source', key);
                            miniCard.addClass('dragging');
                        });
                        miniCard.addEventListener('dragend', () => {
                            miniCard.removeClass('dragging');
                        });
                        } // end else (regular scene mini-card)
                    } else {
                        // Scene not found — show simple badge
                        const badge = cellEl.createDiv('plot-grid-linked-badge');
                        badge.textContent = '🔗';
                        badge.title = cell.linkedSceneId;
                        badge.setCssStyles({
                            position: 'absolute',
                            top: '4px',
                            right: '6px',
                            cursor: 'pointer',
                        });
                        badge.addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            const f = this.app.vault.getAbstractFileByPath(cell.linkedSceneId as string) as TFile | null;
                            if (f) this.app.workspace.getLeaf('tab').openFile(f, { state: { mode: 'source', source: false } });
                            else new Notice('Linked file not found');
                        });
                        const sub = cellEl.createDiv('plot-grid-linked-subtitle');
                        sub.textContent = (cell.linkedSceneId.split('/').pop()?.replace('.md', '')) || '';
                        sub.setCssStyles({
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                        });
                    }
                }

                // ── Codex entity tags ──────────────────────────
                if (this.plugin?.linkScanner) {
                    const seenLower = new Set<string>();
                    const mentions: { name: string; type: string }[] = [];

                    const addMentions = (result: { links: Array<{ name: string; type: string }> }) => {
                        for (const link of result.links) {
                            if (link.type === 'other') continue;
                            const low = link.name.toLowerCase();
                            if (!seenLower.has(low)) {
                                seenLower.add(low);
                                mentions.push({ name: link.name, type: link.type });
                            }
                        }
                    };

                    // Scan linked scene body (uses cache)
                    if (cell.linkedSceneId) {
                        const scMgr2 = this.plugin.sceneManager as SceneManager | undefined;
                        const linkedScene = scMgr2?.getScene(cell.linkedSceneId);
                        if (linkedScene) addMentions(this.plugin.linkScanner.scan(linkedScene));
                    }

                    // Scan cell text
                    if (cell.content?.trim()) {
                        addMentions(this.plugin.linkScanner.scanText(cell.content));
                    }

                    if (mentions.length > 0) {
                        const tagsEl = cellEl.createDiv('pg-codex-tags');
                        for (const m of mentions) {
                            const pill = tagsEl.createSpan({ cls: `pg-codex-tag pg-codex-tag-${m.type}` });
                            pill.textContent = m.name;
                        }
                    }
                }

                cellEl.addEventListener('dblclick', (ev) => {
                    ev.stopPropagation();
                    this.enterEditMode(cellEl, cell, contentEl);
                });

                // Intercept internal-link clicks before cell-level handlers
                cellEl.addEventListener('click', (ev) => {
                    const target = ev.target as HTMLElement;
                    const link = target.closest('a.internal-link') as HTMLAnchorElement | null;
                    if (link) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        const href = link.getAttribute('data-href') || link.getAttribute('href');
                        if (href) {
                            const sourcePath = cell.linkedSceneId || '';
                            this.app.workspace.openLinkText(href, sourcePath, true);
                        }
                    }
                }, true);

                cellEl.addEventListener('click', () => {
                    this.selectCell(cellEl);
                    // Always show the cell inspector panel
                    this.showCellInspector(ri, ci, cell);
                });

                // context menu for cell
                cellEl.addEventListener('contextmenu', (evt) => {
                    evt.preventDefault();
                    const menu = new Menu();
                    const scMgr = this.plugin?.sceneManager as SceneManager | undefined;
                    const linkedScene = cell.linkedSceneId ? scMgr?.getScene(cell.linkedSceneId) : undefined;

                    if (linkedScene && linkedScene.corkboardNote) {
                        // ── Corkboard Note actions ──
                        const note = linkedScene;
                        const notePresets = resolveStickyNoteColors(this.plugin!.settings);
                        notePresets.forEach((preset) => {
                            menu.addItem(item => item
                                .setTitle(`Color: ${preset.label}`)
                                .setIcon('palette')
                                .onClick(() => { void this.setNoteColor(note, preset.color, key); }));
                        });
                        menu.addItem(item => item
                            .setTitle('Color: Custom…')
                            .setIcon('pipette')
                            .onClick(() => { this.openNoteColorModal(linkedScene, key); }));
                        menu.addItem(item => item
                            .setTitle('Color: Default')
                            .setIcon('rotate-ccw')
                            .onClick(() => { void this.setNoteColor(linkedScene, undefined, key); }));

                        menu.addSeparator();
                        menu.addItem((it) => it.setTitle('Duplicate Note').setIcon('copy').onClick(async () => {
                            await scMgr?.duplicateScene(linkedScene.filePath);
                            this.renderGrid();
                        }));
                        menu.addItem((it) => it.setTitle('Delete Note').setIcon('trash').onClick(async () => {
                            openConfirmModal(this.app, {
                                title: 'Delete Note',
                                message: `Delete note "${linkedScene.title || 'Note'}"?`,
                                confirmLabel: 'Delete',
                                onConfirm: async () => {
                                    await this.deleteScene(linkedScene);
                                    const c = this.data.cells[key];
                                    if (c) { c.linkedSceneId = undefined; c.content = ''; c.manualContent = undefined; }
                                    this.scheduleSave();
                                },
                            });
                        }));

                        menu.addSeparator();
                        menu.addItem((it) => it.setTitle('Convert to Scene').setIcon('clapperboard').onClick(async () => {
                            const oldPath = linkedScene.filePath;
                            const newPath = await scMgr?.moveNoteToSceneFolder(oldPath) ?? oldPath;
                            linkedScene.corkboardNote = false;
                            linkedScene.plotgridOrigin = undefined;
                            linkedScene.filePath = newPath;
                            // Update plot grid cell reference if the file moved
                            if (newPath !== oldPath) {
                                const c = this.data.cells[key];
                                if (c) { c.linkedSceneId = newPath; this.scheduleSave(); }
                            }
                            this.renderGrid();
                        }));
                        menu.addItem((it) => it.setTitle('Edit Cell Text').onClick(() => this.enterEditMode(cellEl, cell, contentEl)));
                        menu.addItem((it) => it.setTitle('Unlink Note').setIcon('unlink').onClick(() => {
                            const c = this.data.cells[key]; if (c) c.linkedSceneId = undefined; this.scheduleSave(); this.renderGrid();
                        }));
                    } else if (linkedScene) {
                        // ── Regular Scene actions ──
                        menu.addItem((it) => it.setTitle('Open Scene').setIcon('file-text').onClick(() => this.openScene(linkedScene)));
                        menu.addItem((it) => it.setTitle('Show in Inspector').setIcon('info').onClick(() => {
                            if (this.plugin?.isSceneInspectorOpen()) {
                                this.inspectorComponent?.hide();
                                this.app.workspace.trigger('storyline:scene-focus', linkedScene.filePath);
                            } else {
                                this.inspectorComponent?.show(linkedScene);
                            }
                        }));
                        menu.addSeparator();
                        // Status submenu
                        const statuses = getStatusOrder();
                        statuses.forEach(s => {
                            menu.addItem((it) => it.setTitle(`Status: ${resolveStatusCfg(s).label}`)
                                .setChecked(linkedScene.status === s)
                                .onClick(async () => {
                                    await scMgr?.updateScene(linkedScene.filePath, { status: s });
                                    this.renderGrid();
                                }));
                        });
                        menu.addSeparator();
                        menu.addItem((it) => it.setTitle('Duplicate Scene').setIcon('copy').onClick(async () => {
                            await scMgr?.duplicateScene(linkedScene.filePath);
                            this.renderGrid();
                        }));
                        menu.addItem((it) => it.setTitle('Edit Cell Text').onClick(() => this.enterEditMode(cellEl, cell, contentEl)));
                        menu.addItem((it) => it.setTitle('Unlink Scene').setIcon('unlink').onClick(() => {
                            const c = this.data.cells[key]; if (c) c.linkedSceneId = undefined; this.scheduleSave(); this.renderGrid();
                        }));
                        menu.addItem((it) => it.setTitle('Delete Scene').setIcon('trash').onClick(async () => {
                            openConfirmModal(this.app, {
                                title: 'Delete Scene',
                                message: `Delete scene "${linkedScene.title || 'Untitled'}"?`,
                                confirmLabel: 'Delete',
                                onConfirm: async () => {
                                    await this.deleteScene(linkedScene);
                                    const c = this.data.cells[key]; if (c) c.linkedSceneId = undefined;
                                    this.scheduleSave();
                                },
                            });
                        }));
                    } else {
                        // No linked scene — show cell editing + create/link options
                        menu.addItem((it) => it.setTitle('Edit Cell').onClick(() => this.enterEditMode(cellEl, cell, contentEl)));
                        menu.addSeparator();
                        if (scMgr) {
                            menu.addItem((it) => it.setTitle('Create New Scene…').setIcon('plus').onClick(() => {
                                this.openQuickAddForCell(key);
                            }));
                        }
                        menu.addItem((it) => it.setTitle('Link Scene Card…').setIcon('link').onClick(() => {
                            this.openSceneLinkModal((path) => { const c = this.data.cells[key]; if (c) c.linkedSceneId = path; this.scheduleSave(); this.renderGrid(); });
                        }));
                        menu.addSeparator();
                        menu.addItem((it) => it.setTitle('Clear Cell Content').onClick(() => { const c = this.data.cells[key]; if (c) c.content = ''; this.scheduleSave(); this.renderGrid(); }));
                    }
                    menu.addSeparator();
                    menu.addItem((it) => it.setTitle('Insert Row Above').onClick(() => this.insertRowAt(ri, true)));
                    menu.addItem((it) => it.setTitle('Insert Row Below').onClick(() => this.insertRowAt(ri, false)));
                    menu.addItem((it) => it.setTitle('Insert Column Left').onClick(() => this.insertColumnAt(ci, true)));
                    menu.addItem((it) => it.setTitle('Insert Column Right').onClick(() => this.insertColumnAt(ci, false)));
                    menu.addSeparator();
                    menu.addItem((it) => it.setTitle('Delete Row').onClick(() => this.deleteRow(ri)));
                    menu.addItem((it) => it.setTitle('Delete Column').onClick(() => this.deleteColumn(ci)));
                    menu.showAtMouseEvent(evt);
                });

                // Drag-drop: accept scene cards being dragged into cells
                cellEl.addEventListener('dragover', (ev) => {
                    ev.preventDefault();
                    cellEl.addClass('plot-grid-drop-target');
                });
                cellEl.addEventListener('dragleave', () => {
                    cellEl.removeClass('plot-grid-drop-target');
                });
                cellEl.addEventListener('drop', (ev) => {
                    ev.preventDefault();
                    cellEl.removeClass('plot-grid-drop-target');
                    const sourceKey = ev.dataTransfer?.getData('text/cell-source');
                    const scenePath = ev.dataTransfer?.getData('text/scene-path');
                    if (sourceKey && sourceKey !== key) {
                        // Cell-to-cell move: transfer content from source to target
                        const src = this.data.cells[sourceKey];
                        const tgt = this.data.cells[key];
                        if (src && tgt) {
                            tgt.linkedSceneId = src.linkedSceneId;
                            tgt.content = src.content;
                            src.linkedSceneId = undefined;
                            src.content = '';
                            this.scheduleSave();
                            this.renderGrid();
                        }
                    } else if (scenePath) {
                        // External scene drop (e.g., from scene list)
                        const c = this.data.cells[key]; if (c) c.linkedSceneId = scenePath;
                        this.scheduleSave();
                        this.renderGrid();
                    }
                });
            }
        }

        this.setZoom(this.data.zoom || 1);

        if (this.data.rows.length === 0 && this.data.columns.length === 0) {
            const msg = this.canvasEl.createDiv('plot-grid-empty');
            msg.setCssStyles({
                position: 'relative',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                boxSizing: 'border-box',
                maxWidth: '100%',
                textAlign: 'left',
            });
            msg.textContent = "Use 'Add Row' and 'Add Column' to begin building your plot grid.";
        }

        // reapply selection visuals after render
        this.applySelectionVisuals();

        // Restore scroll position after DOM rebuild
        window.requestAnimationFrame(() => {
            if (this.scrollAreaEl) {
                this.scrollAreaEl.scrollTop = prevScrollTop;
                this.scrollAreaEl.scrollLeft = prevScrollLeft;
            }
        });
    }
    async refresh(): Promise<void> {
        try {
            // If a save is pending, skip reloading from disk (would overwrite in-memory changes)
            if (this.saveDebounce) return;
            // If a cell is being edited, skip refresh to avoid destroying the textarea
            if (this.canvasEl?.querySelector('.plot-grid-cell.editing')) return;
            // If any input/textarea in the grid or inspector is focused, skip refresh to avoid losing edits
            if (this.wrapperEl?.querySelector('input:focus, textarea:focus')) return;
            await this.loadData();
            // If the view hasn't been opened yet, `wrapperEl` will be null — skip rendering
            if (!this.wrapperEl) return;
            this.renderToolbar();
            this.renderGrid();
        } catch (e) {
            // non-fatal
        }
    }

    private applySelectionVisuals() {
        if (!this.canvasEl) return;
        // clear any previous visual marks
        this.canvasEl.querySelectorAll('.plot-grid-cell').forEach(n => (n as HTMLElement).setCssStyles({ outline: '' }));
        this.canvasEl.querySelectorAll('.plot-grid-row-header, .plot-grid-col-header').forEach(n => (n as HTMLElement).setCssStyles({ boxShadow: '' }));

        if (this.selectedRow !== null && this.selectedCol !== null) {
            const el = this.getCellElement(this.selectedRow, this.selectedCol);
            if (el) el.setCssStyles({ outline: '2px solid var(--interactive-accent)' });
        }

        if (this.selectedRow !== null) {
            const header = this.canvasEl.querySelectorAll('.plot-grid-row-header')[this.selectedRow] as HTMLElement | undefined;
            if (header) header.setCssStyles({ boxShadow: 'inset 4px 0 0 var(--interactive-accent)' });
        }

        if (this.selectedCol !== null) {
            const header = this.canvasEl.querySelectorAll('.plot-grid-col-header')[this.selectedCol] as HTMLElement | undefined;
            if (header) header.setCssStyles({ boxShadow: 'inset 0 4px 0 var(--interactive-accent)' });
        }
    }

    private flashElement(el: HTMLElement | null) {
        if (!el) return;
        const orig = el.style.transition || '';
        el.setCssStyles({ transition: 'background-color 160ms ease' });
        const prevBg = el.style.background;
        el.setCssStyles({ background: 'var(--sl-grid-flash)' });
        window.setTimeout(() => { el.setCssStyles({ background: prevBg }); window.setTimeout(() => { el.setCssStyles({ transition: orig }); }, 200); }, 180);
    }

    private selectCell(el: HTMLElement) {
                const prev = this.canvasEl?.querySelector('.plot-grid-cell.selected');
                if (prev) { prev.classList.remove('selected'); (prev as HTMLElement).setCssStyles({ outline: '' }); }
                el.classList.add('selected');
                const r = el.getAttribute('data-row');
                const c = el.getAttribute('data-col');
                this.selectedRow = r ? Number(r) : null;
                this.selectedCol = c ? Number(c) : null;
                // ensure visible
                el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                // visual
                el.setCssStyles({ outline: '2px solid var(--interactive-accent)' });
                this.applySelectionVisuals();
    }

    private getCellElement(row: number, col: number): HTMLElement | null {
        return (this.canvasEl?.querySelector(`.plot-grid-cell[data-row="${row}"][data-col="${col}"]`) as HTMLElement) ?? null;
    }

    private moveSelection(dx: number, dy: number) {
        if (this.selectedRow === null || this.selectedCol === null) {
            if (this.data.rows.length > 0 && this.data.columns.length > 0) {
                this.selectedRow = 0; this.selectedCol = 0;
            } else return;
        }
        const nr = Math.max(0, Math.min(this.data.rows.length - 1, this.selectedRow + dy));
        const nc = Math.max(0, Math.min(this.data.columns.length - 1, this.selectedCol + dx));
        const el = this.getCellElement(nr, nc);
        if (el) this.selectCell(el);
    }

    private onKeyDown(e: KeyboardEvent) {
        if (!this.wrapperEl) return;
        const editing = !!this.canvasEl?.querySelector('.plot-grid-cell.editing');
        if (editing) return; // let textarea handle keys

        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault(); this.moveSelection(1, 0); break;
            case 'ArrowLeft':
                e.preventDefault(); this.moveSelection(-1, 0); break;
            case 'ArrowDown':
                e.preventDefault(); this.moveSelection(0, 1); break;
            case 'ArrowUp':
                e.preventDefault(); this.moveSelection(0, -1); break;
            case 'Tab':
                e.preventDefault(); if (e.shiftKey) this.moveSelection(-1,0); else this.moveSelection(1,0); break;
            case 'Enter':
                e.preventDefault(); if (this.selectedRow !== null && this.selectedCol !== null) {
                    const el = this.getCellElement(this.selectedRow, this.selectedCol);
                    const key = `${this.data.rows[this.selectedRow].id}-${this.data.columns[this.selectedCol].id}`;
                    const cell = this.data.cells[key];
                    if (el && cell) this.enterEditMode(el, cell, el.querySelector('div') as HTMLElement);
                }
                break;
        }
    }

    private getSelectedCellKey(): string | null {
        if (this.selectedRow === null || this.selectedCol === null) return null;
        const r = this.data.rows[this.selectedRow];
        const c = this.data.columns[this.selectedCol];
        if (!r || !c) return null;
        return `${r.id}-${c.id}`;
    }

    private getSelectedCellData(): { key: string; cell: CellData; el: HTMLElement } | null {
        const key = this.getSelectedCellKey();
        if (!key) return null;
        const cell = this.data.cells[key];
        const el = this.getCellElement(this.selectedRow!, this.selectedCol!);
        if (!cell || !el) return null;
        return { key, cell, el };
    }

    private selectRowHeader(index: number) {
        this.selectedRow = index;
        this.selectedCol = null;
        // visually mark selection
        // remove any previous header selection classes
        this.canvasEl?.querySelectorAll('.plot-grid-row-header.selected').forEach(n => n.classList.remove('selected'));
        const sel = this.canvasEl?.querySelectorAll('.plot-grid-cell') || [];
        sel.forEach((n: Element) => (n as HTMLElement).classList.remove('selected'));
        const header = this.canvasEl?.querySelectorAll('.plot-grid-row-header')[index] as HTMLElement | undefined;
        if (header) header.classList.add('selected');
    }

    private selectColumnHeader(index: number) {
        this.selectedCol = index;
        this.selectedRow = null;
        this.canvasEl?.querySelectorAll('.plot-grid-col-header.selected').forEach(n => n.classList.remove('selected'));
        const sel = this.canvasEl?.querySelectorAll('.plot-grid-cell') || [];
        sel.forEach((n: Element) => (n as HTMLElement).classList.remove('selected'));
        const header = this.canvasEl?.querySelectorAll('.plot-grid-col-header')[index] as HTMLElement | undefined;
        if (header) header.classList.add('selected');
    }

    private moveArrayItem<T>(arr: T[], from: number, to: number) {
        const item = arr.splice(from, 1)[0];
        arr.splice(to, 0, item);
    }

    private moveColumn(from: number, to: number) {
        if (from === to) return;
        this.moveArrayItem(this.data.columns, from, to);
        // adjust selectedCol if needed
        if (this.selectedCol === from) this.selectedCol = to;
        else if (this.selectedCol !== null) {
            if (from < to && this.selectedCol > from && this.selectedCol <= to) this.selectedCol--;
            else if (from > to && this.selectedCol >= to && this.selectedCol < from) this.selectedCol++;
        }
        this.scheduleSave();
        this.renderGrid();
    }

    private moveRow(from: number, to: number) {
        if (from === to) return;
        this.moveArrayItem(this.data.rows, from, to);
        if (this.selectedRow === from) this.selectedRow = to;
        else if (this.selectedRow !== null) {
            if (from < to && this.selectedRow > from && this.selectedRow <= to) this.selectedRow--;
            else if (from > to && this.selectedRow >= to && this.selectedRow < from) this.selectedRow++;
        }
        this.scheduleSave();
        this.renderGrid();
    }

    /** Resolve a CSS custom property to its computed hex value */
    private resolveThemeColor(varName: string, fallback: string): string {
        const val = getComputedStyle(activeDocument.body).getPropertyValue(varName).trim();
        return val || fallback;
    }

    /** Get a theme-aware default background color for the color picker */
    private defaultBgColor(): string {
        return this.resolveThemeColor('--background-primary', '#ffffff');
    }

    /** Get a theme-aware default text color for the color picker */
    private defaultTextColor(): string {
        return this.resolveThemeColor('--text-normal', '#000000');
    }

    /** Get palette colors resolved from CSS variables */
    private getThemePalette(): string[] {
        return [
            this.resolveThemeColor('--sl-palette-1', '#fde8d8'),
            this.resolveThemeColor('--sl-palette-2', '#fdf6d8'),
            this.resolveThemeColor('--sl-palette-3', '#d8f5e0'),
            this.resolveThemeColor('--sl-palette-4', '#d8eafd'),
            this.resolveThemeColor('--sl-palette-5', '#ead8fd'),
            this.resolveThemeColor('--sl-palette-6', '#fdd8e8'),
            this.resolveThemeColor('--sl-palette-7', '#d8f5f5'),
            this.resolveThemeColor('--sl-palette-8', '#f5d8d8'),
            this.resolveThemeColor('--sl-palette-9', '#e8e8e8'),
            '',
        ];
    }

    private chooseColor(initial: string | undefined, cb: (color: string | null) => void, preview?: (color: string | null) => void) {
        const app = this.app;
        const palette = this.getThemePalette();
        const checkerLight = this.resolveThemeColor('--sl-checker-light', '#fff');
        const checkerDark = this.resolveThemeColor('--sl-checker-dark', '#ddd');
        class ColorPickerModal extends Modal {
            initVal: string;
            inputEl: HTMLInputElement | null = null;
            hexEl: HTMLInputElement | null = null;
            onChoose: (c: string | null) => void;
            onPreview?: (c: string | null) => void;
            constructor(app: App, init: string, onChoose: (c: string | null) => void, onPreview?: (c: string | null) => void) { super(app); this.initVal = init; this.onChoose = onChoose; this.onPreview = onPreview; }
            onOpen() {
                const { contentEl } = this;
                const titleEl = contentEl.createEl('h3', { text: 'Choose color' });
                titleEl.setCssStyles({ margin: '4px 0 8px 0' });
                const row = contentEl.createDiv();
                this.inputEl = row.createEl('input') as HTMLInputElement;
                this.inputEl.type = 'color';
                // avoid assigning an empty string to a color input (invalid)
                const defaultColor = (this.initVal && /^#?[0-9a-fA-F]{6}$/.test(this.initVal)) ? (this.initVal.startsWith('#') ? this.initVal : `#${this.initVal}`) : getComputedStyle(activeDocument.body).getPropertyValue('--background-primary').trim() || '#ffffff';
                this.inputEl.value = defaultColor;
                this.inputEl.setCssStyles({
                    width: '48px',
                    height: '32px',
                    marginRight: '8px',
                });

                this.hexEl = row.createEl('input') as HTMLInputElement;
                this.hexEl.type = 'text';
                this.hexEl.value = this.initVal && this.initVal !== '' ? (this.initVal.startsWith('#') ? this.initVal : `#${this.initVal}`) : '';
                this.hexEl.setCssStyles({
                    width: '120px',
                    marginRight: '8px',
                });

                const previewSwatch = row.createDiv('color-preview');
                previewSwatch.setCssStyles({
                    width: '36px',
                    height: '36px',
                    border: '1px solid var(--background-modifier-border)',
                    background: this.inputEl.value,
                    marginRight: '10px',
                    borderRadius: '6px',
                });

                // track the currently selected color separately from the color input value
                let selectedColor: string | '' = (this.initVal && this.initVal !== '') ? (this.initVal.startsWith('#') ? this.initVal : `#${this.initVal}`) : '';

                // preset palette swatches (resolved from theme)
                const swatchRow = contentEl.createDiv('color-swatch-row');
                swatchRow.setCssStyles({
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginTop: '6px',
                });
                for (const col of palette) {
                    const s = swatchRow.createDiv('palette-swatch');
                    s.setCssStyles({
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: '1px solid var(--background-modifier-border)',
                        cursor: 'pointer',
                    });
                    s.title = col || 'No color';
                    s.setCssStyles({ background: col || 'transparent' });
                    if (!col) { s.setCssStyles({ backgroundImage: `linear-gradient(45deg,${checkerLight} 25%, ${checkerDark} 25%, ${checkerDark} 50%, ${checkerLight} 50%, ${checkerLight} 75%, ${checkerDark} 75%, ${checkerDark} 100%)` }); s.setCssStyles({ backgroundSize: '8px 8px' }); }
                    s.addEventListener('click', () => {
                        if (col) {
                            selectedColor = col;
                            // update inputs where valid
                            try { this.inputEl!.value = col; } catch (e) { /* input may not exist */ }
                            if (this.hexEl) this.hexEl.value = col;
                            previewSwatch.setCssStyles({ background: col });
                            if (this.onPreview) this.onPreview(col);
                        } else {
                            // select explicit "no color"
                            selectedColor = '';
                            // do not try to write an empty value to the color input (invalid)
                            if (this.hexEl) this.hexEl.value = '';
                            previewSwatch.setCssStyles({ background: 'transparent' });
                            if (this.onPreview) this.onPreview('');
                        }
                    });
                }

                // tighten modal layout and reduce top spacing; also set modal container size
                contentEl.setCssStyles({
                    maxWidth: '90vw',
                    padding: '8px 12px',
                    marginTop: '0',
                });
                const modalEl = (this as unknown as Record<string, unknown>).modalEl as HTMLElement;
                if (modalEl) {
                    modalEl.setCssStyles({
                        width: '300px',
                        maxWidth: '90vw',
                    });
                    // center and move the modal slightly higher; nudge left to better center in the app
                    modalEl.setCssStyles({
                        left: '50%',
                        top: '4%',
                        transform: 'translate(-52%, -6%)',
                        right: 'auto',
                        boxSizing: 'border-box',
                        margin: '0',
                    });
                }

                this.inputEl.addEventListener('input', () => {
                    const val = this.inputEl!.value;
                    selectedColor = val;
                    if (this.hexEl) this.hexEl.value = val;
                    previewSwatch.setCssStyles({ background: val });
                    if (this.onPreview) this.onPreview(val);
                });
                this.hexEl.addEventListener('input', () => {
                    const v = this.hexEl!.value;
                    if (v === '') {
                        selectedColor = '';
                        previewSwatch.setCssStyles({ background: 'transparent' });
                        if (this.onPreview) this.onPreview('');
                    } else if (/^#?[0-9a-fA-F]{6}$/.test(v)) {
                        const norm = v.startsWith('#') ? v : `#${v}`;
                        selectedColor = norm;
                        try { this.inputEl!.value = norm; } catch (e) { /* input may not exist */ }
                        previewSwatch.setCssStyles({ background: norm });
                        if (this.onPreview) this.onPreview(norm);
                    }
                });

                const btns = contentEl.createDiv();
                btns.setCssStyles({
                    marginTop: '8px',
                    display: 'flex',
                    width: '100%',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    paddingRight: '6px',
                });

                const ok = btns.createEl('button', { text: 'OK' });
                ok.addEventListener('click', () => { this.onChoose(selectedColor === '' ? '' : selectedColor); this.close(); });
                const cancel = btns.createEl('button', { text: 'Cancel' });
                cancel.addEventListener('click', () => { if (this.onPreview) this.onPreview(null); this.onChoose(null); this.close(); });

                // Make the modal draggable by its header
                const headerEl = contentEl.querySelector('h3');
                if (modalEl && headerEl) {
                    headerEl.setCssStyles({ cursor: 'move' });
                    let dragging = false;
                    let startX = 0, startY = 0, origLeft = 0, origTop = 0;
                    const onDown = (ev: MouseEvent) => {
                        ev.preventDefault();
                        dragging = true;
                        const rect = modalEl.getBoundingClientRect();
                        startX = ev.clientX; startY = ev.clientY;
                        origLeft = rect.left; origTop = rect.top;
                        modalEl.setCssStyles({
                            position: 'fixed',
                            left: origLeft + 'px',
                            top: origTop + 'px',
                            transform: '',
                        });
                        activeDocument.addEventListener('mousemove', onMove);
                        activeDocument.addEventListener('mouseup', onUp);
                    };
                    const onMove = (ev: MouseEvent) => {
                        if (!dragging) return;
                        const dx = ev.clientX - startX;
                        const dy = ev.clientY - startY;
                        modalEl.setCssStyles({
                            left: (origLeft + dx) + 'px',
                            top: (origTop + dy) + 'px',
                        });
                    };
                    const onUp = () => {
                        dragging = false;
                        activeDocument.removeEventListener('mousemove', onMove);
                        activeDocument.removeEventListener('mouseup', onUp);
                    };
                    // allow dragging by header text
                    headerEl.addEventListener('mousedown', onDown);
                    // also allow dragging by clicking the top rounded area of the modal
                    modalEl.addEventListener('mousedown', (ev: MouseEvent) => {
                        // ignore clicks originating inside the content (e.g. inputs, buttons)
                        const target = ev.target as HTMLElement;
                        if (target.closest('h3') || target.closest('input') || target.closest('button') || target.closest('.color-swatch-row')) return;
                        const rect = modalEl.getBoundingClientRect();
                        const y = ev.clientY - rect.top;
                        // treat clicks within the top 56px as the draggable area
                        if (y >= 0 && y <= 56) {
                            onDown(ev);
                        }
                    });

                    // show move cursor when hovering the top rounded area
                    modalEl.addEventListener('mousemove', (ev: MouseEvent) => {
                        const target = ev.target as HTMLElement;
                        const rect = modalEl.getBoundingClientRect();
                        const y = ev.clientY - rect.top;
                        if (y >= 0 && y <= 56 && !target.closest('input') && !target.closest('button') && !target.closest('.color-swatch-row')) {
                            modalEl.setCssStyles({ cursor: 'move' });
                        } else {
                            modalEl.setCssStyles({ cursor: '' });
                        }
                    });
                    modalEl.addEventListener('mouseleave', () => { modalEl.setCssStyles({ cursor: '' }); });
                }
            }
        }

        const modal = new ColorPickerModal(app, initial || this.defaultBgColor(), cb, preview);
        modal.open();
    }


    private toggleBoldSelected() {
        // Apply bold to selected cell, row, or column
        const selRow = this.selectedRow;
        const selCol = this.selectedCol;
        if (selRow !== null && selCol !== null) {
            const s = this.getSelectedCellData();
            if (!s) { new Notice('Select a cell first'); return; }
            s.cell.bold = !s.cell.bold;
            this.flashElement(s.el);
        } else if (selRow !== null) {
            // toggle header bold
            const rowMeta = this.data.rows[selRow];
            rowMeta.bold = !rowMeta.bold;
            // Do not change per-cell bold flags here; header formatting only affects the header text.
            // Still flash the row header to indicate change.
            const headerEl = this.canvasEl?.querySelectorAll('.plot-grid-row-header')[selRow] as HTMLElement | undefined;
            if (headerEl) this.flashElement(headerEl);
        } else if (selCol !== null) {
            // toggle header bold
            const colMeta = this.data.columns[selCol];
            colMeta.bold = !colMeta.bold;
            // Do not change per-cell bold flags here; header formatting only affects the header text.
            const headerEl = this.canvasEl?.querySelectorAll('.plot-grid-col-header')[selCol] as HTMLElement | undefined;
            if (headerEl) this.flashElement(headerEl);
        } else { new Notice('Select a cell, row, or column first'); return; }
        this.scheduleSave();
        this.renderGrid();
    }


    private toggleItalicSelected() {
        const selRow = this.selectedRow;
        const selCol = this.selectedCol;
        if (selRow !== null && selCol !== null) {
            const s = this.getSelectedCellData();
            if (!s) { new Notice('Select a cell first'); return; }
            s.cell.italic = !s.cell.italic;
            this.flashElement(s.el);
        } else if (selRow !== null) {
            const rowMeta = this.data.rows[selRow];
            rowMeta.italic = !rowMeta.italic;
            // Do not change per-cell italic flags here; header formatting only affects the header text.
            const headerEl = this.canvasEl?.querySelectorAll('.plot-grid-row-header')[selRow] as HTMLElement | undefined;
            if (headerEl) this.flashElement(headerEl);
        } else if (selCol !== null) {
            const colMeta = this.data.columns[selCol];
            colMeta.italic = !colMeta.italic;
            // Do not change per-cell italic flags here; header formatting only affects the header text.
            const headerEl = this.canvasEl?.querySelectorAll('.plot-grid-col-header')[selCol] as HTMLElement | undefined;
            if (headerEl) this.flashElement(headerEl);
        } else { new Notice('Select a cell, row, or column first'); return; }
        this.scheduleSave();
        this.renderGrid();
    }


    private setAlignSelected(a: 'left' | 'center' | 'right') {
        const selRow = this.selectedRow;
        const selCol = this.selectedCol;
        if (selRow !== null && selCol !== null) {
            const s = this.getSelectedCellData();
            if (!s) { new Notice('Select a cell first'); return; }
            s.cell.align = a;
            this.flashElement(s.el);
        } else if (selRow !== null) {
            for (let ci = 0; ci < this.data.columns.length; ci++) {
                const key = `${this.data.rows[selRow].id}-${this.data.columns[ci].id}`;
                const cell = this.data.cells[key]; if (cell) cell.align = a;
            }
            for (let ci = 0; ci < this.data.columns.length; ci++) this.flashElement(this.getCellElement(selRow, ci));
        } else if (selCol !== null) {
            for (let ri = 0; ri < this.data.rows.length; ri++) {
                const key = `${this.data.rows[ri].id}-${this.data.columns[selCol].id}`;
                const cell = this.data.cells[key]; if (cell) cell.align = a;
            }
            for (let ri = 0; ri < this.data.rows.length; ri++) this.flashElement(this.getCellElement(ri, selCol));
        } else { new Notice('Select a cell, row, or column first'); return; }
        this.scheduleSave();
        this.renderGrid();
    }


    private setCellBgColorSelected() {
        // Apply background color to selected cell, row, or column
        const selRow = this.selectedRow;
        const selCol = this.selectedCol;
        if (selRow !== null && selCol !== null) {
            const s = this.getSelectedCellData();
            if (!s) { new Notice('Select a cell first'); return; }
            const cellKey = s.key;
            const el = s.el;
            const prev = el.style.background;
            this.chooseColor(s.cell.bgColor || this.defaultBgColor(), (c) => {
                if (c === null) { el.setCssStyles({ background: prev }); return; }
                const cur = this.data.cells[cellKey];
                if (cur) cur.bgColor = c || '';
                this.scheduleSave(); this.renderGrid();
                const freshEl = this.getCellElement(selRow, selCol);
                if (freshEl) this.flashElement(freshEl);
            }, (preview) => { if (preview === null) el.setCssStyles({ background: prev }); else el.setCssStyles({ background: preview }); });
        } else if (selRow !== null) {
            // preview for whole row + header
            const els: HTMLElement[] = [];
            for (let ci = 0; ci < this.data.columns.length; ci++) { const el = this.getCellElement(selRow, ci); if (el) els.push(el); }
            const prevs = els.map(e => e.style.background);
            const header = this.canvasEl?.querySelectorAll('.plot-grid-row-header')[selRow] as HTMLElement | undefined;
            const prevHeaderBg = header ? header.style.background : null;
            this.chooseColor(this.data.rows[selRow].bgColor || this.defaultBgColor(), (c) => {
                if (c === null) {
                    els.forEach((e,i) => e.setCssStyles({ background: prevs[i] }));
                    if (header && prevHeaderBg !== null) header.setCssStyles({ background: prevHeaderBg });
                    return;
                }
                // set row meta
                this.data.rows[selRow].bgColor = c || '';
                // apply change to each cell in the row (override per-cell colors)
                for (let ci = 0; ci < this.data.columns.length; ci++) {
                    const key = `${this.data.rows[selRow].id}-${this.data.columns[ci].id}`;
                    const cell = this.data.cells[key];
                    if (cell) cell.bgColor = c || '';
                }
                this.scheduleSave();
                this.renderGrid();
                for (let ci = 0; ci < this.data.columns.length; ci++) this.flashElement(this.getCellElement(selRow, ci));
            }, (preview) => { if (preview === null) { els.forEach((e,i) => e.setCssStyles({ background: prevs[i] })); if (header && prevHeaderBg !== null) header.setCssStyles({ background: prevHeaderBg }); } else { els.forEach(e => e.setCssStyles({ background: preview })); if (header) header.setCssStyles({ background: preview }); } });
        } else if (selCol !== null) {
            // preview for whole column + header
            const els: HTMLElement[] = [];
            for (let ri = 0; ri < this.data.rows.length; ri++) { const el = this.getCellElement(ri, selCol); if (el) els.push(el); }
            const prevs = els.map(e => e.style.background);
            const header = this.canvasEl?.querySelectorAll('.plot-grid-col-header')[selCol] as HTMLElement | undefined;
            const prevHeaderBg = header ? header.style.background : null;
            this.chooseColor(this.data.columns[selCol].bgColor || this.defaultBgColor(), (c) => {
                if (c === null) {
                    els.forEach((e,i) => e.setCssStyles({ background: prevs[i] }));
                    if (header && prevHeaderBg !== null) header.setCssStyles({ background: prevHeaderBg });
                    return;
                }
                // set column meta
                this.data.columns[selCol].bgColor = c || '';
                // apply change to each cell in the column (override per-cell colors)
                for (let ri = 0; ri < this.data.rows.length; ri++) {
                    const key = `${this.data.rows[ri].id}-${this.data.columns[selCol].id}`;
                    const cell = this.data.cells[key];
                    if (cell) cell.bgColor = c || '';
                }
                this.scheduleSave();
                this.renderGrid();
                for (let ri = 0; ri < this.data.rows.length; ri++) this.flashElement(this.getCellElement(ri, selCol));
            }, (preview) => { if (preview === null) { els.forEach((e,i) => e.setCssStyles({ background: prevs[i] })); if (header && prevHeaderBg !== null) header.setCssStyles({ background: prevHeaderBg }); } else { els.forEach(e => e.setCssStyles({ background: preview })); if (header) header.setCssStyles({ background: preview }); } });
        } else { new Notice('Select a cell, row, or column first'); return; }
    }


    private setCellTextColorSelected() {
        const selRow = this.selectedRow;
        const selCol = this.selectedCol;
        if (selRow !== null && selCol !== null) {
            const s = this.getSelectedCellData();
            if (!s) { new Notice('Select a cell first'); return; }
            const cellKey = s.key;
            const el = s.el;
            const prev = el.style.color;
            this.chooseColor(s.cell.textColor || this.defaultTextColor(), (c) => {
                if (c === null) { el.setCssStyles({ color: prev }); return; }
                const cur = this.data.cells[cellKey];
                if (cur) cur.textColor = c || '';
                this.scheduleSave(); this.renderGrid();
                const freshEl = this.getCellElement(selRow, selCol);
                if (freshEl) this.flashElement(freshEl);
            }, (preview) => { if (preview === null) el.setCssStyles({ color: prev }); else el.setCssStyles({ color: preview }); });
        } else if (selRow !== null) {
            const header = this.canvasEl?.querySelectorAll('.plot-grid-row-header')[selRow] as HTMLElement | undefined;
            const prevHeaderColor = header ? header.style.color : null;
            this.chooseColor(this.data.rows[selRow].textColor || this.defaultTextColor(), (c) => {
                if (c === null) {
                    if (header && prevHeaderColor !== null) header.setCssStyles({ color: prevHeaderColor });
                    return;
                }
                this.data.rows[selRow].textColor = c || '';
                this.scheduleSave();
                this.renderGrid();
                if (header) this.flashElement(header);
            }, (preview) => {
                if (preview === null) {
                    if (header && prevHeaderColor !== null) header.setCssStyles({ color: prevHeaderColor });
                } else {
                    if (header) header.setCssStyles({ color: preview });
                }
            });
        } else if (selCol !== null) {
            const header = this.canvasEl?.querySelectorAll('.plot-grid-col-header')[selCol] as HTMLElement | undefined;
            const prevHeaderColor = header ? header.style.color : null;
            this.chooseColor(this.data.columns[selCol].textColor || this.defaultTextColor(), (c) => {
                if (c === null) {
                    if (header && prevHeaderColor !== null) header.setCssStyles({ color: prevHeaderColor });
                    return;
                }
                this.data.columns[selCol].textColor = c || '';
                this.scheduleSave();
                this.renderGrid();
                if (header) this.flashElement(header);
            }, (preview) => {
                if (preview === null) {
                    if (header && prevHeaderColor !== null) header.setCssStyles({ color: prevHeaderColor });
                } else {
                    if (header) header.setCssStyles({ color: preview });
                }
            });
        } else { new Notice('Select a cell, row, or column first'); return; }
    }

    /** Open a scene file in a new tab */
    private async openScene(scene: Scene): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(scene.filePath);
        if (file instanceof TFile) {
            const leaf = this.app.workspace.getLeaf('tab');
            await leaf.openFile(file, { state: { mode: 'source', source: false } });
        } else {
            new Notice(`Could not find file: ${scene.filePath}`);
        }
    }

    /** Navigate to the entity represented by a column (character / location file) */
    private navigateToColumnEntity(col: ColumnMeta): void {
        if (!col.sourceId) return;
        const name = col.sourceId.toLowerCase();

        if (col.sourceKind === 'characters' || !col.sourceKind) {
            const charMgr = this.plugin?.characterManager as CharacterManager | undefined;
            if (charMgr) {
                const match = charMgr.getAllCharacters().find(c => c.name.toLowerCase() === name);
                if (match) {
                    const file = this.app.vault.getAbstractFileByPath(match.filePath) as TFile | null;
                    if (file) { this.app.workspace.getLeaf('tab').openFile(file, { state: { mode: 'source', source: false } }); return; }
                }
            }
        }

        if (col.sourceKind === 'locations' || !col.sourceKind) {
            const locMgr = this.plugin?.locationManager as LocationManager | undefined;
            if (locMgr) {
                const allLocs = [...locMgr.getAllWorlds(), ...locMgr.getAllLocations()];
                const match = allLocs.find(l => l.name.toLowerCase() === name);
                if (match) {
                    const file = this.app.vault.getAbstractFileByPath(match.filePath) as TFile | null;
                    if (file) { this.app.workspace.getLeaf('tab').openFile(file, { state: { mode: 'source', source: false } }); return; }
                }
            }
        }

        // Codex categories
        if (col.sourceKind?.startsWith('codex:')) {
            const catId = col.sourceKind.slice(6);
            const codexMgr = this.plugin?.codexManager;
            if (codexMgr) {
                const entry = codexMgr.findByName(catId, col.sourceId || '');
                if (entry) {
                    const file = this.app.vault.getAbstractFileByPath(entry.filePath) as TFile | null;
                    if (file) { this.app.workspace.getLeaf('tab').openFile(file, { state: { mode: 'source', source: false } }); return; }
                }
            }
        }

        // Tags have no backing file to navigate to
    }

    /** Delete a scene and refresh the grid */
    private async deleteScene(scene: Scene): Promise<void> {
        const scMgr = this.plugin?.sceneManager as SceneManager | undefined;
        if (scMgr) {
            await scMgr.deleteScene(scene.filePath);
            this.renderGrid();
        }
    }

    /** Open QuickAdd modal and link the new scene to the given cell key */
    private openQuickAddForCell(cellKey: string): void {
        const scMgr = this.plugin?.sceneManager as SceneManager | undefined;
        if (!scMgr || !this.plugin) return;
        const modal = new QuickAddModal(
            this.app,
            this.plugin,
            scMgr,
            async (sceneData, openAfter) => {
                const file = await scMgr.createScene(sceneData);
                const c = this.data.cells[cellKey];
                if (c) c.linkedSceneId = file.path;
                this.scheduleSave();
                this.renderGrid();
                if (openAfter) {
                    await this.app.workspace.getLeaf('tab').openFile(file, { state: { mode: 'source', source: false } });
                }
            }
        );
        modal.open();
    }

    private enterEditMode(cellEl: HTMLElement, cell: CellData, _contentEl: HTMLElement) {
        cellEl.classList.add('editing');
        cellEl.empty();
        const ta = cellEl.createEl('textarea');
        ta.value = cell.content || '';
        ta.setCssStyles({
            width: '100%',
            height: '100%',
            border: 'none',
            padding: '6px 8px',
            boxSizing: 'border-box',
            resize: 'none',
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            outline: 'none',
        });
        // Prevent clicks inside textarea from propagating to cell/wrapper
        ta.addEventListener('mousedown', (e) => e.stopPropagation());
        ta.addEventListener('click', (e) => e.stopPropagation());
        ta.addEventListener('dblclick', (e) => e.stopPropagation());

        // Remove wrapper focusability while editing so it can't steal focus
        if (this.wrapperEl) this.wrapperEl.tabIndex = -1;

        const hadContentBefore = !!(cell.content && cell.content.trim());
        const hadLinkedScene = !!cell.linkedSceneId;

        let committed = false;
        const commit = () => {
            if (committed) return;
            committed = true;
            // Restore wrapper focusability
            if (this.wrapperEl) this.wrapperEl.tabIndex = 0;
            cell.content = ta.value;
            // Mark as manually edited so sync won't overwrite
            cell.manualContent = true;
            // Auto-Note: if toggled on and new non-empty text entered into an unlinked cell
            const hasNewContent = !!(ta.value && ta.value.trim());
            if (this.plugin?.settings.plotgridAutoNote && hasNewContent && !hadLinkedScene && !hadContentBefore) {
                // Let autoCreateNoteFromCell handle save + render to avoid race
                void this.autoCreateNoteFromCell(cell);
            } else {
                this.scheduleSave();
                this.renderGrid();
            }
        };

        // Use requestAnimationFrame + focus to guarantee it happens after the current event cycle
        window.requestAnimationFrame(() => { ta.focus(); });

        ta.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.renderGrid();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                // commit and move to next cell
                commit();
                const curR = Number(cellEl.getAttribute('data-row'));
                const curC = Number(cellEl.getAttribute('data-col'));
                let nr = curR;
                let nc = curC + (e.shiftKey ? -1 : 1);
                if (nc >= this.data.columns.length) { nc = 0; nr = Math.min(this.data.rows.length - 1, curR + 1); }
                if (nc < 0) { nc = Math.max(0, this.data.columns.length - 1); nr = Math.max(0, curR - 1); }
                window.setTimeout(() => {
                    const newEl = this.getCellElement(nr, nc);
                    const key = `${this.data.rows[nr].id}-${this.data.columns[nc].id}`;
                    const newCell = this.data.cells[key];
                    if (newEl && newCell) { this.selectCell(newEl); this.enterEditMode(newEl, newCell, newEl.querySelector('div') as HTMLElement); }
                }, 20);
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commit();
            }
        });

        ta.addEventListener('blur', () => {
            commit();
        });
    }

    /* ── Note color helpers (mirrors BoardView) ── */

    private normalizeHexColor(value: string | undefined): string | undefined {
        if (!value) return undefined;
        const trimmed = value.trim();
        const short = trimmed.match(/^#([0-9a-fA-F]{3})$/);
        if (short) {
            const [r, g, b] = short[1].split('');
            return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
        }
        const full = trimmed.match(/^#([0-9a-fA-F]{6})$/);
        if (full) return `#${full[1].toUpperCase()}`;
        return undefined;
    }

    private async setNoteColor(scene: Scene, color: string | undefined, _cellKey: string): Promise<void> {
        const scMgr = this.plugin?.sceneManager as SceneManager | undefined;
        const normalized = this.normalizeHexColor(color);
        await scMgr?.updateScene(scene.filePath, { corkboardNoteColor: normalized });
        scene.corkboardNoteColor = normalized;
        this.renderGrid();
    }

    private openNoteColorModal(scene: Scene, cellKey: string): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Custom note color');
        const current = this.normalizeHexColor(scene.corkboardNoteColor) ?? '#F6EDB4';
        const row = modal.contentEl.createDiv('story-line-note-color-modal-row');
        row.createEl('label', { text: 'Pick color' });
        const picker = row.createEl('input', {
            attr: { type: 'color', value: current },
        });
        new obsidian.Setting(modal.contentEl)
            .addButton(btn => { btn.setButtonText('Cancel').onClick(() => modal.close()); })
            .addButton(btn => {
                btn.setButtonText('Apply').setCta().onClick(async () => {
                    await this.setNoteColor(scene, picker.value, cellKey);
                    modal.close();
                });
            });
        modal.open();
    }

    /**
     * Auto-Note: create a corkboard note from a cell's manual text
     * and link it back to the cell.
     */
    private async autoCreateNoteFromCell(cell: CellData): Promise<void> {
        const scMgr = this.plugin?.sceneManager as SceneManager | undefined;
        if (!scMgr || !cell.content?.trim()) return;

        // Guard: if the cell already has a linked scene, skip (prevents double-fire)
        if (cell.linkedSceneId) return;

        // Resolve row/column labels for context
        // cell.id format: "rowId-colId" but IDs may contain hyphens from makeId,
        // so find the matching row/col by checking all combinations
        let rowLabel = '';
        let colLabel = '';
        for (const row of this.data.rows) {
            for (const col of this.data.columns) {
                if (`${row.id}-${col.id}` === cell.id) {
                    rowLabel = row.label || '';
                    colLabel = col.label || '';
                }
            }
        }

        // Build body — no longer appending origin as text
        const body = cell.content.trim();
        const contextParts: string[] = [];
        if (rowLabel) contextParts.push(rowLabel);
        if (colLabel) contextParts.push(colLabel);
        const originLabel = contextParts.length > 0 ? contextParts.join(' / ') : undefined;

        const file = await scMgr.createScene({
            status: 'idea',
            corkboardNote: true,
            title: 'Note',
            body,
            plotgridOrigin: originLabel,
        });

        // Link the note back ONLY to this specific cell via its key
        const liveCell = this.data.cells[cell.id];
        if (liveCell) {
            liveCell.linkedSceneId = file.path;
        } else {
            cell.linkedSceneId = file.path;
        }
        this.scheduleSave();
        this.renderGrid();
        new Notice('Auto-Note created from cell');
    }

    // Scene link modal
    private openSceneLinkModal(onChoose: (path: string) => void) {
        const app = this.app;
        class SceneLinkModal extends Modal {
            onChoose: (path: string) => void;
            listEl: HTMLDivElement | null = null;
            inputEl: HTMLInputElement | null = null;
            constructor(app: App, onChoose: (p: string) => void) {
                super(app);
                this.onChoose = onChoose;
            }
            onOpen() {
                const { contentEl } = this;
                contentEl.createEl('h3', { text: 'Link Scene Card' });
                this.inputEl = contentEl.createEl('input');
                this.inputEl.placeholder = 'Search files...';
                this.inputEl.setCssStyles({ width: '100%' });
                this.inputEl.addEventListener('input', () => this.renderList());
                this.listEl = contentEl.createDiv('scene-link-list');
                this.listEl.setCssStyles({
                    maxHeight: '300px',
                    overflow: 'auto',
                });
                this.renderList();
            }
            renderList() {
                if (!this.listEl || !this.inputEl) return;
                this.listEl.empty();
                const q = this.inputEl.value.toLowerCase();
                const files = this.app.vault.getMarkdownFiles().filter((f: TFile) => f.path.toLowerCase().includes(q) || f.basename.toLowerCase().includes(q));
                for (const f of files) {
                    const row = this.listEl.createDiv('scene-link-row');
                    row.setCssStyles({
                        padding: '6px 8px',
                        cursor: 'pointer',
                    });
                    row.setText(f.path);
                    row.addEventListener('click', () => {
                        this.onChoose(f.path);
                        this.close();
                    });
                }
                if (files.length === 0) this.listEl.createDiv({ text: 'No files found', cls: 'muted' });
            }
        }

        const modal = new SceneLinkModal(app, onChoose);
        modal.open();
    }

    // ── Sync from Scenes ────────────────────────────────────────────────

    private openSyncModal() {
        const scMgr = this.plugin?.sceneManager as SceneManager | undefined;
        if (!scMgr) { new Notice('Scene manager not available'); return; }
        const scenes = scMgr.getAllScenes();
        if (scenes.length === 0) { new Notice('No scenes found in the active project'); return; }

        // Capture outer-class reference for use inside the nested Modal subclass below.
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- nested Modal class needs access to the outer view instance for callbacks
        const view = this;
        class SyncModal extends Modal {
            constructor(app: App) { super(app); }
            onOpen() {
                const { contentEl } = this;
                contentEl.createEl('h3', { text: 'Sync from Scenes' });
                contentEl.createEl('p', {
                    text: 'Auto-populate the grid with rows from scenes and columns from story data. Manual changes will be preserved.',
                    cls: 'setting-item-description',
                });

                // Column source selector
                const colSourceLabel = contentEl.createEl('label', { text: 'Columns from:' });
                colSourceLabel.setCssStyles({
                    display: 'block',
                    marginTop: '12px',
                    marginBottom: '4px',
                    fontWeight: '600',
                });

                const colSourceSelect = contentEl.createEl('select');
                colSourceSelect.setCssStyles({
                    width: '100%',
                    marginBottom: '12px',
                });
                colSourceSelect.createEl('option', { text: 'Characters', value: 'characters' });
                colSourceSelect.createEl('option', { text: 'Plotlines (tags)', value: 'tags' });
                colSourceSelect.createEl('option', { text: 'Locations', value: 'locations' });
                // Add codex categories that appear in sidebar
                const codexMgr = view.plugin?.codexManager;
                const sidebarCats = (view.plugin as unknown as { settings?: { codexSidebarCategories?: string[] } })?.settings?.codexSidebarCategories;
                if (codexMgr && sidebarCats) {
                    for (const catId of sidebarCats) {
                        const catDef = codexMgr.getCategoryDef(catId);
                        if (catDef) {
                            colSourceSelect.createEl('option', { text: catDef.label, value: `codex:${catId}` });
                        }
                    }
                }

                // Row sorting info
                const sortInfo = contentEl.createEl('p', {
                    text: 'Rows will be ordered by Act → Chapter → Sequence.',
                    cls: 'setting-item-description',
                });
                sortInfo.setCssStyles({ marginBottom: '12px' });

                // How to handle existing data
                const modeLabel = contentEl.createEl('label', { text: 'Merge mode:' });
                modeLabel.setCssStyles({
                    display: 'block',
                    marginBottom: '4px',
                    fontWeight: '600',
                });

                const modeSelect = contentEl.createEl('select');
                modeSelect.setCssStyles({
                    width: '100%',
                    marginBottom: '16px',
                });
                modeSelect.createEl('option', { text: 'Merge — keep manual rows/columns, add missing', value: 'merge' });
                modeSelect.createEl('option', { text: 'Replace — rebuild from scenes (manual data cleared)', value: 'replace' });

                const btns = contentEl.createDiv();
                btns.setCssStyles({
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                });

                const cancelBtn = btns.createEl('button', { text: 'Cancel' });
                cancelBtn.addEventListener('click', () => this.close());

                const syncBtn = btns.createEl('button', { text: 'Sync', cls: 'mod-cta' });
                syncBtn.addEventListener('click', () => {
                    const colSource = colSourceSelect.value;
                    const mode = modeSelect.value as 'merge' | 'replace';
                    view.performSync(colSource, mode);
                    this.close();
                });
            }
        }

        const modal = new SyncModal(this.app);
        modal.open();
    }

    /**
     * Perform the actual sync: create rows from scenes, columns from the chosen
     * dimension, and fill cells where data exists.
     */
    private performSync(colSource: string, mode: 'merge' | 'replace') {
        const scMgr = this.plugin?.sceneManager as SceneManager | undefined;
        if (!scMgr) return;

        const scenes = scMgr.getAllScenes().slice().sort((a, b) => {
            // Sort by act → chapter → sequence using the shared numeric-aware
            // comparator (handles string acts like "1.1" / "Prologue").
            const actCmp = compareActChapter(a.act, b.act);
            if (actCmp !== 0) return actCmp;
            const chCmp = compareActChapter(a.chapter, b.chapter);
            if (chCmp !== 0) return chCmp;
            return (a.sequence ?? 0) - (b.sequence ?? 0);
        });

        // Collect unique column values from scenes
        const colSet = new Set<string>();

        // Build character alias map to deduplicate names
        let aliasMap: Map<string, string> | null = null;
        if (colSource === 'characters') {
            const charMgr = this.plugin?.characterManager as CharacterManager | undefined;
            const manualAliases = (this.plugin as unknown as { settings?: { characterAliases?: Record<string, string> } })?.settings?.characterAliases;
            if (charMgr) {
                aliasMap = charMgr.buildAliasMap(manualAliases);
            }
        }

        /** Resolve a name to its canonical form via the alias map.
         *  Falls back to checking individual words (e.g. "Konstapel Bark" → try "Bark").
         */
        const resolve = (name: string): string => {
            if (!aliasMap) return name;
            // Exact match
            const exact = aliasMap.get(name.toLowerCase());
            if (exact) return exact;
            // Try each word (handles titles/ranks: "Konstapel Bark" → "Bark")
            const words = name.split(/\s+/);
            if (words.length > 1) {
                for (const word of words) {
                    const match = aliasMap.get(word.toLowerCase());
                    if (match) return match;
                }
            }
            return name;
        };

        for (const scene of scenes) {
            if (colSource === 'characters') {
                for (const c of scene.characters || []) colSet.add(resolve(c));
                if (scene.pov) colSet.add(resolve(scene.pov));
            } else if (colSource === 'tags') {
                for (const t of scene.tags || []) colSet.add(t);
            } else if (colSource === 'locations') {
                if (scene.location) colSet.add(scene.location);
            } else if (colSource.startsWith('codex:')) {
                const catId = colSource.slice(6);
                for (const n of scene.codexLinks?.[catId] || []) colSet.add(n);
            }
        }
        const colValues = Array.from(colSet).sort();

        if (mode === 'replace') {
            // Full rebuild
            this.data.rows = [];
            this.data.columns = [];
            this.data.cells = {};
        }

        // Build lookup of existing auto rows/columns by sourceId
        const existingRowMap = new Map<string, RowMeta>();
        for (const r of this.data.rows) {
            if (r.sourceType === 'auto' && r.sourceId) existingRowMap.set(r.sourceId, r);
        }
        const existingColMap = new Map<string, ColumnMeta>();
        for (const c of this.data.columns) {
            if (c.sourceType === 'auto' && c.sourceId) existingColMap.set(c.sourceId, c);
        }

        // ── Create / update rows (one per scene) ──────────────────
        const rowIds: Map<string, string> = new Map(); // scene filePath → row id
        for (const scene of scenes) {
            const existing = existingRowMap.get(scene.filePath);
            if (existing) {
                // Update label if scene was renamed
                existing.label = this.formatRowLabel(scene);
                rowIds.set(scene.filePath, existing.id);
            } else {
                const id = makeId('r-');
                const label = this.formatRowLabel(scene);
                const row: RowMeta = { id, label, height: 80, bgColor: '', sourceType: 'auto', sourceId: scene.filePath };
                // Insert at end (sorting is handled by scene order above)
                this.data.rows.push(row);
                rowIds.set(scene.filePath, id);
            }
        }

        // ── Remove orphaned auto rows (sourceId no longer matches any scene) ──
        const scenePathSet = new Set(scenes.map(s => s.filePath));
        const orphanRowIds = new Set<string>();
        this.data.rows = this.data.rows.filter(r => {
            if (r.sourceType === 'auto' && r.sourceId && !scenePathSet.has(r.sourceId)) {
                orphanRowIds.add(r.id);
                return false; // remove orphaned auto row
            }
            return true; // keep manual rows and valid auto rows
        });
        // Clean up cells belonging to removed orphan rows
        if (orphanRowIds.size > 0) {
            for (const key of Object.keys(this.data.cells)) {
                for (const orphanId of orphanRowIds) {
                    if (key.startsWith(orphanId + '-')) {
                        delete this.data.cells[key];
                        break;
                    }
                }
            }
        }

        // ── Create / update columns ────────────────────────────────
        const colIds: Map<string, string> = new Map(); // colValue → column id
        for (const val of colValues) {
            const existing = existingColMap.get(val);
            if (existing) {
                existing.label = val;
                existing.sourceKind = colSource;
                colIds.set(val, existing.id);
            } else {
                const id = makeId('c-');
                const col: ColumnMeta = { id, label: val, width: 160, bgColor: '', sourceType: 'auto', sourceId: val, sourceKind: colSource };
                this.data.columns.push(col);
                colIds.set(val, id);
            }
        }

        // ── Fill cells ────────────────────────────────────────────
        for (const scene of scenes) {
            const rowId = rowIds.get(scene.filePath);
            if (!rowId) continue;

            let sceneColValues: string[] = [];
            if (colSource === 'characters') {
                sceneColValues = (scene.characters || []).map(c => resolve(c));
                if (scene.pov) {
                    const resolvedPov = resolve(scene.pov);
                    if (!sceneColValues.includes(resolvedPov)) sceneColValues.push(resolvedPov);
                }
            } else if (colSource === 'tags') {
                sceneColValues = [...(scene.tags || [])];
            } else if (colSource === 'locations') {
                sceneColValues = scene.location ? [scene.location] : [];
            } else if (colSource.startsWith('codex:')) {
                const catId = colSource.slice(6);
                sceneColValues = [...(scene.codexLinks?.[catId] || [])];
            }

            for (const val of sceneColValues) {
                const colId = colIds.get(val);
                if (!colId) continue;
                const key = `${rowId}-${colId}`;
                let cell = this.data.cells[key];
                if (cell && cell.manualContent) continue; // don't overwrite manual edits

                const content = this.buildCellContent(scene, colSource, val, resolve);
                if (!cell) {
                    cell = {
                        id: key,
                        content,
                        bgColor: '',
                        textColor: '',
                        bold: false,
                        italic: false,
                        align: 'center',
                        linkedSceneId: scene.filePath,
                    };
                    this.data.cells[key] = cell;
                } else {
                    // Update auto-generated content but keep formatting
                    cell.content = content;
                    cell.linkedSceneId = scene.filePath;
                }
            }
        }

        this.scheduleSave();
        this.renderGrid();
        new Notice(`Synced ${scenes.length} scenes → ${this.data.rows.length} rows, ${this.data.columns.length} columns`);
    }

    /** Format a row label from a scene */
    private formatRowLabel(scene: Scene): string {
        const parts: string[] = [];
        if (scene.act) parts.push(`A${scene.act}`);
        if (scene.chapter) parts.push(`Ch${scene.chapter}`);
        parts.push(scene.title || 'Untitled');
        return parts.join(' · ');
    }

    /** Build cell content: a short summary for the intersection */
    private buildCellContent(scene: Scene, colSource: string, colValue: string, resolve?: (n: string) => string): string {
        if (colSource === 'characters') {
            // If this character is the POV, mark it
            const resolvedPov = scene.pov ? (resolve ? resolve(scene.pov) : scene.pov) : '';
            if (resolvedPov && resolvedPov === colValue) return '★ POV';
            return '✓';
        } else if (colSource === 'tags') {
            return '✓';
        } else if (colSource === 'locations') {
            return '✓';
        }
        // codex categories and any unknown source
        return '✓';
    }

    // ── End sync helpers ────────────────────────────────────────────

    private ensureDefaults() {
        this.data.rows = this.data.rows || [];
        this.data.columns = this.data.columns || [];
        this.data.cells = this.data.cells || {};
        if (typeof (this.data as unknown as Record<string, unknown>).stickyHeaders === 'undefined') (this.data as unknown as Record<string, unknown>).stickyHeaders = true;
    }

    private addRow() {
        const id = makeId('r-');
        const n = this.data.rows.length + 1;
        this.data.rows.push({ id, label: 'Row ' + n, height: 80, bgColor: '' });
        this.scheduleSave();
        this.renderGrid();
    }

    private addColumn() {
        const id = makeId('c-');
        const n = this.data.columns.length + 1;
        this.data.columns.push({ id, label: 'Col ' + n, width: 160, bgColor: '' });
        this.scheduleSave();
        this.renderGrid();
    }

    // Insert/Delete helpers
    private insertRowAt(index: number, above: boolean) {
        const id = makeId('r-');
        const label = 'Row ' + (this.data.rows.length + 1);
        const newRow = { id, label, height: 80, bgColor: '' };
        const pos = above ? index : index + 1;
        this.data.rows.splice(pos, 0, newRow);
        this.scheduleSave();
        this.renderGrid();
    }

    private deleteRow(index: number) {
        const row = this.data.rows[index];
        if (!row) return;
        // remove any cells referencing this row
        for (const key of Object.keys(this.data.cells)) {
            if (key.startsWith(row.id + '-')) delete this.data.cells[key];
        }
        this.data.rows.splice(index, 1);
        this.scheduleSave();
        this.renderGrid();
    }

    private insertColumnAt(index: number, left: boolean) {
        const id = makeId('c-');
        const label = 'Col ' + (this.data.columns.length + 1);
        const newCol = { id, label, width: 160, bgColor: '' };
        const pos = left ? index : index + 1;
        this.data.columns.splice(pos, 0, newCol);
        this.scheduleSave();
        this.renderGrid();
    }

    private deleteColumn(index: number) {
        const col = this.data.columns[index];
        if (!col) return;
        for (const key of Object.keys(this.data.cells)) {
            if (key.endsWith('-' + col.id)) delete this.data.cells[key];
        }
        this.data.columns.splice(index, 1);
        this.scheduleSave();
        this.renderGrid();
    }

    // Resizing logic
    private startColResize(e: MouseEvent, colIndex: number) {
        e.preventDefault();
        const startX = e.clientX;
        const origWidth = this.data.columns[colIndex].width;
        activeDocument.body.setCssStyles({ cursor: 'col-resize' });

        const onMove = (ev: MouseEvent) => {
            const delta = ev.clientX - startX;
            const newW = Math.max(60, Math.round(origWidth + delta));
            this.data.columns[colIndex].width = newW;
            // update grid template for live feedback
            if (this.canvasEl) {
                const colTemplate = [ROW_HEADER_WIDTH + 'px', ...this.data.columns.map((c) => c.width + 'px')].join(' ');
                this.canvasEl.setCssStyles({ gridTemplateColumns: colTemplate });
                const totalWidth = this.computeTotalWidth();
                this.canvasEl.setCssStyles({ width: totalWidth / this.data.zoom + 'px' });
            }
        };

        const onUp = () => {
            activeDocument.removeEventListener('mousemove', onMove);
            activeDocument.removeEventListener('mouseup', onUp);
            activeDocument.body.setCssStyles({ cursor: '' });
            this.scheduleSave();
            this.renderGrid();
        };

        activeDocument.addEventListener('mousemove', onMove);
        activeDocument.addEventListener('mouseup', onUp);
    }

    private startRowResize(e: MouseEvent, rowIndex: number) {
        e.preventDefault();
        const startY = e.clientY;
        const origH = this.data.rows[rowIndex].height;
        activeDocument.body.setCssStyles({ cursor: 'row-resize' });

        const onMove = (ev: MouseEvent) => {
            const delta = ev.clientY - startY;
            const newH = Math.max(40, Math.round(origH + delta));
            this.data.rows[rowIndex].height = newH;
            if (this.canvasEl) {
                const rowTemplate = [COL_HEADER_HEIGHT + 'px', ...this.data.rows.map((r) => r.height + 'px')].join(' ');
                this.canvasEl.setCssStyles({ gridTemplateRows: rowTemplate });
            }
        };

        const onUp = () => {
            activeDocument.removeEventListener('mousemove', onMove);
            activeDocument.removeEventListener('mouseup', onUp);
            activeDocument.body.setCssStyles({ cursor: '' });
            this.scheduleSave();
            this.renderGrid();
        };

        activeDocument.addEventListener('mousemove', onMove);
        activeDocument.addEventListener('mouseup', onUp);
    }

    // ────────────────────────────────────────────────────
    //  Cell Inspector — shows characters, locations,
    //  tags, and linked scene info for the selected cell
    // ────────────────────────────────────────────────────

    private showCellInspector(rowIndex: number, colIndex: number, cell: CellData): void {
        if (!this.inspectorEl) return;

        // Hide the scene-inspector if it was showing
        if (this.inspectorComponent) this.inspectorComponent.hide();

        const el = this.inspectorEl;
        el.empty();
        el.setCssStyles({ display: 'block' });
        el.addClass('story-line-inspector');

        const row = this.data.rows[rowIndex];
        const col = this.data.columns[colIndex];

        // Stable key so we can always resolve the canonical cell in this.data
        const cellKey = `${row?.id}-${col?.id}`;
        const getCell = (): CellData => this.data.cells[cellKey] ?? cell;

        // Resolve linked scene
        const scMgr = this.plugin?.sceneManager as SceneManager | undefined;
        const linkedScene = (cell.linkedSceneId && scMgr) ? scMgr.getScene(cell.linkedSceneId) : undefined;

        // ── Header ──
        const header = el.createDiv('inspector-header');
        header.createEl('h3', { text: 'Cell Details' });
        const closeBtn = header.createEl('button', { cls: 'clickable-icon inspector-close', text: '×' });
        closeBtn.addEventListener('click', () => this.hideCellInspector());

        // ── Tab bar (only when a scene is linked) ──
        let cellBody: HTMLElement;
        let sceneBody: HTMLElement | null = null;
        let cellInspectorInstance: InspectorComponent | null = null;

        if (linkedScene) {
            const tabBar = el.createDiv('sl-cell-tab-bar');
            const cellTab = tabBar.createDiv({ cls: 'sl-cell-tab sl-cell-tab-active', text: 'Cell' });
            const sceneTab = tabBar.createDiv({ cls: 'sl-cell-tab', text: 'Scene' });

            // Small dot on Scene tab to indicate linked scene
            sceneTab.createSpan({ cls: 'sl-cell-tab-dot' });

            cellBody = el.createDiv('sl-cell-tab-body');
            sceneBody = el.createDiv('sl-cell-tab-body');
            sceneBody.setCssStyles({ display: 'none' });

            const switchTab = (active: 'cell' | 'scene') => {
                if (active === 'cell') {
                    cellTab.addClass('sl-cell-tab-active');
                    sceneTab.removeClass('sl-cell-tab-active');
                    cellBody.setCssStyles({ display: '' });
                    sceneBody!.setCssStyles({ display: 'none' });
                } else {
                    cellTab.removeClass('sl-cell-tab-active');
                    sceneTab.addClass('sl-cell-tab-active');
                    cellBody.setCssStyles({ display: 'none' });
                    sceneBody!.setCssStyles({ display: '' });
                    // Lazy-render scene inspector on first switch
                    if (!cellInspectorInstance && scMgr && this.plugin) {
                        cellInspectorInstance = new InspectorComponent(
                            sceneBody!,
                            this.plugin,
                            scMgr,
                            {
                                onEdit: (scene) => this.openScene(scene),
                                onDelete: (scene) => this.deleteScene(scene),
                                onRefresh: () => this.renderGrid(),
                                onStatusChange: async (scene, status) => {
                                    await scMgr.updateScene(scene.filePath, { status });
                                    this.renderGrid();
                                },
                            }
                        );
                        cellInspectorInstance.show(linkedScene);
                    }
                }
            };

            cellTab.addEventListener('click', () => switchTab('cell'));
            sceneTab.addEventListener('click', () => switchTab('scene'));
        } else {
            cellBody = el.createDiv('sl-cell-tab-body');
        }

        // ── Cell tab content ──

        // Row / Column label
        const posSection = cellBody.createDiv('inspector-section');
        posSection.createSpan({ cls: 'inspector-label', text: 'Row: ' });
        posSection.createSpan({ text: row?.label || `Row ${rowIndex + 1}` });
        const colSection = cellBody.createDiv('inspector-section');
        colSection.createSpan({ cls: 'inspector-label', text: 'Column: ' });
        colSection.createSpan({ text: col?.label || `Column ${colIndex + 1}` });

        // ── Cell text (editable) ──
        const textSection = cellBody.createDiv('inspector-section');
        textSection.createSpan({ cls: 'inspector-label', text: 'Content:' });
        const textArea = textSection.createEl('textarea', { cls: 'inspector-cell-textarea' });
        textArea.value = cell.content || '';
        textArea.rows = 8;
        textArea.setCssStyles({
            width: '100%',
            resize: 'vertical',
            marginTop: '4px',
            padding: '6px 8px',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '4px',
            background: 'var(--background-primary)',
            color: 'var(--text-normal)',
            font: 'inherit',
            fontSize: '13px',
        });

        // ── Scan results container ──
        const scanContainer = cellBody.createDiv('inspector-scan-results');
        this.updateCellInspectorScan(scanContainer, cell);

        // Track initial cell state for auto-note (only create once per empty cell)
        const inspectorHadContent = !!(cell.content && cell.content.trim());
        const inspectorHadLinkedScene = !!cell.linkedSceneId;

        let textSaveTimer: number | null = null;
        textArea.addEventListener('input', () => {
            const liveCell = getCell();
            liveCell.content = textArea.value;
            liveCell.manualContent = true;
            cell.content = textArea.value;
            cell.manualContent = true;
            if (this.selectedRow !== null && this.selectedCol !== null) {
                const gridCellEl = this.getCellElement(this.selectedRow, this.selectedCol);
                if (gridCellEl) {
                    const contentDiv = gridCellEl.querySelector('div') as HTMLElement | null;
                    if (contentDiv) contentDiv.textContent = liveCell.content || '';
                }
            }
            if (textSaveTimer) window.clearTimeout(textSaveTimer);
            textSaveTimer = window.setTimeout(() => {
                this.scheduleSave();
                this.updateCellInspectorScan(scanContainer, liveCell);
            }, 600);
        });
        textArea.addEventListener('blur', () => {
            if (textSaveTimer) { window.clearTimeout(textSaveTimer); textSaveTimer = null; }
            const liveCell = getCell();
            liveCell.content = textArea.value;
            liveCell.manualContent = true;
            cell.content = textArea.value;
            cell.manualContent = true;
            this.updateCellInspectorScan(scanContainer, liveCell);
            // Auto-Note from inspector: if toggled on and new text on a previously empty, unlinked cell
            const hasNewContent = !!(textArea.value && textArea.value.trim());
            if (this.plugin?.settings.plotgridAutoNote && hasNewContent && !inspectorHadLinkedScene && !inspectorHadContent && !liveCell.linkedSceneId) {
                // Let autoCreateNoteFromCell handle save + render to avoid race
                void this.autoCreateNoteFromCell(liveCell);
            } else {
                this.scheduleSave();
            }
        });

        // ── Linked scene summary (shown on Cell tab as a small info block) ──
        if (linkedScene) {
            const linkSection = cellBody.createDiv('inspector-section');
            linkSection.createSpan({ cls: 'inspector-label', text: 'Linked Scene:' });
            const sceneLink = linkSection.createEl('a', {
                cls: 'inspector-scene-link',
                text: linkedScene.title || linkedScene.filePath.split('/').pop()?.replace('.md', '') || 'Untitled',
            });
            sceneLink.setCssStyles({
                display: 'block',
                marginTop: '4px',
                cursor: 'pointer',
                color: 'var(--text-accent)',
            });
            sceneLink.addEventListener('click', () => {
                const f = this.app.vault.getAbstractFileByPath(linkedScene.filePath) as TFile | null;
                if (f) this.app.workspace.getLeaf('tab').openFile(f, { state: { mode: 'source', source: false } });
            });
        }
    }

    /**
     * Scan cell content for characters, locations, and #tags,
     * then render the results into the given container element.
     */
    private updateCellInspectorScan(container: HTMLElement, cell: CellData): void {
        container.empty();

        const text = cell.content || '';
        if (!text.trim()) return;

        const scanner = this.plugin?.linkScanner as LinkScanner | undefined;
        if (!scanner) return;

        const result = scanner.scanText(text);

        // ── Characters found ──
        if (result.characters.length > 0) {
            const section = container.createDiv('inspector-section');
            section.createSpan({ cls: 'inspector-label', text: 'Characters:' });
            const chipList = section.createDiv('inspector-chip-list');
            chipList.setCssStyles({
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                marginTop: '4px',
            });
            // Deduplicate via alias map
            const aliasMap = (this.plugin?.characterManager as CharacterManager | undefined)
                ?.buildAliasMap(this.plugin?.settings.characterAliases) ?? new Map<string, string>();
            const seen = new Set<string>();
            for (const name of result.characters) {
                const canonical = aliasMap.get(name.toLowerCase()) || name;
                const key = canonical.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                const chip = chipList.createSpan({ cls: 'inspector-chip', text: canonical });
                chip.setCssStyles({
                    padding: '2px 10px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    background: 'var(--background-modifier-border)',
                    cursor: 'pointer',
                    color: 'var(--text-normal)',
                });
                chip.addEventListener('click', () => {
                    // Try to open the character file
                    const charMgr = this.plugin?.characterManager as CharacterManager | undefined;
                    const char = charMgr?.getAllCharacters().find(c => c.name.toLowerCase() === key);
                    if (char) {
                        const f = this.app.vault.getAbstractFileByPath(char.filePath) as TFile | null;
                        if (f) this.app.workspace.getLeaf('tab').openFile(f, { state: { mode: 'source', source: false } });
                    }
                });
            }
        }

        // ── Locations found ──
        if (result.locations.length > 0) {
            const section = container.createDiv('inspector-section');
            section.createSpan({ cls: 'inspector-label', text: 'Locations:' });
            const chipList = section.createDiv('inspector-chip-list');
            chipList.setCssStyles({
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                marginTop: '4px',
            });
            // Deduplicate locations
            const seen = new Set<string>();
            for (const name of result.locations) {
                const key = name.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                const chip = chipList.createSpan({ cls: 'inspector-chip', text: name });
                chip.setCssStyles({
                    padding: '2px 10px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    background: 'var(--background-modifier-border)',
                    color: 'var(--text-normal)',
                });
            }
        }

        // ── Tags found ──
        if (result.tags.length > 0) {
            const section = container.createDiv('inspector-section');
            section.createSpan({ cls: 'inspector-label', text: 'Tags:' });
            const tagList = section.createDiv('inspector-tag-list');
            tagList.setCssStyles({
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                marginTop: '4px',
            });
            const tagColors = this.plugin?.settings.tagColors || {};
            const scheme = this.plugin?.settings.colorScheme || 'mocha';
            const allTagsSorted = [...result.tags].sort();
            for (const tag of result.tags) {
                const chip = tagList.createSpan({ cls: 'inspector-tag-chip', text: `#${tag}` });
                chip.setCssStyles({
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '12px',
                });
                const chipColor = resolveTagColor(tag, allTagsSorted.indexOf(tag), scheme, tagColors, getPlotlineHSL(this.plugin!.settings));
                chip.setCssStyles({
                    background: chipColor,
                    color: contrastTextColor(chipColor),
                });
            }
        }
    }

    private hideCellInspector(): void {
        if (this.inspectorEl) {
            this.inspectorEl.empty();
            this.inspectorEl.setCssStyles({ display: 'none' });
        }
    }
}

export default PlotgridView;
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- end of file-wide suppression block opened at line 1 */
