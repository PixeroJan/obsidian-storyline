import { ItemView, WorkspaceLeaf, Menu, Modal, TFile, Notice } from 'obsidian';
import * as obsidian from 'obsidian';
import { CellData, ColumnMeta, RowMeta, PlotGridData } from '../models/PlotGridData';
import { openConfirmModal } from '../components/ConfirmModal';
import { Scene, SceneStatus, STATUS_CONFIG } from '../models/Scene';
import { SceneManager } from '../services/SceneManager';
import { InspectorComponent } from '../components/Inspector';
import { QuickAddModal } from '../components/QuickAddModal';
import * as lucide from 'lucide';
import { renderViewSwitcher } from '../components/ViewSwitcher';
import { enableDragToPan } from '../components/DragToPan';
import { PLOTGRID_VIEW_TYPE } from '../constants';
import type SceneCardsPlugin from '../main';

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
        this.containerEl.addClass('plot-grid-root');

        await this.loadData();

        this.buildLayout(container);
        this.renderToolbar();
        // keep main scroll area untouched (no forced scrolling)
        this.renderGrid();
        // Watch for file renames to update linkedSceneId paths
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            if (file instanceof TFile) {
                let changed = false;
                for (const key of Object.keys(this.data.cells)) {
                    const c = this.data.cells[key];
                    if (c && c.linkedSceneId === oldPath) { c.linkedSceneId = file.path; changed = true; }
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
                };
            } else {
                this.data = { rows: [], columns: [], cells: {}, zoom: 1 };
            }
        } catch (e) {
            this.data = { rows: [], columns: [], cells: {}, zoom: 1 };
        }
    }

    private scheduleSave() {
        const plugin = this.plugin;
        if (!plugin) return;
        if (this.saveDebounce) window.clearTimeout(this.saveDebounce);
        // debounce and call plugin-level save API if available
        this.saveDebounce = window.setTimeout(async () => {
            try {
                if (typeof plugin.savePlotGrid === 'function') await plugin.savePlotGrid(this.data);
            } catch (e) {
                // ignore save errors
            }
            this.saveDebounce = null;
        }, 500);
    }

    private buildLayout(container: HTMLElement) {
        this.wrapperEl = container.createDiv('plot-grid-wrapper');
        this.wrapperEl.style.display = 'flex';
        this.wrapperEl.style.flexDirection = 'column';
        this.wrapperEl.style.height = '100%';
        // make focusable for keyboard navigation
        this.wrapperEl.tabIndex = 0;
        this.wrapperEl.addEventListener('keydown', (e) => this.onKeyDown(e as KeyboardEvent));

        const toolbar = this.wrapperEl.createDiv('story-line-toolbar plot-grid-toolbar');
        toolbar.style.flex = '0 0 auto';
        toolbar.style.padding = '8px';

        this.scrollAreaEl = this.wrapperEl.createDiv('plot-grid-scroll-area');
        this.scrollAreaEl.style.flex = '1 1 auto';
        this.scrollAreaEl.style.overflow = 'auto';
        this.scrollAreaEl.style.position = 'relative';
        enableDragToPan(this.scrollAreaEl);

        this.canvasEl = this.scrollAreaEl.createDiv('plot-grid-canvas');
        this.canvasEl.style.position = 'relative';
        this.canvasEl.style.transformOrigin = 'top left';
        this.canvasEl.style.width = '100%';
        this.canvasEl.style.boxSizing = 'border-box';

        // Inspector sidebar (same pattern as BoardView)
        this.inspectorEl = this.wrapperEl.createDiv('story-line-inspector-panel');
        this.inspectorEl.style.display = 'none';
        const sceneManager = this.plugin?.sceneManager as SceneManager | undefined;
        if (sceneManager && this.plugin) {
            this.inspectorComponent = new InspectorComponent(
                this.inspectorEl,
                this.plugin,
                sceneManager,
                {
                    onEdit: (scene) => this.openScene(scene),
                    onDelete: (scene) => this.deleteScene(scene),
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
        controls.style.marginLeft = '24px';

        const left = controls.createDiv('plot-grid-toolbar-left');
        left.style.display = 'flex';
        left.style.alignItems = 'center';
        left.style.gap = '2px';

        const actions = controls.createDiv('plot-grid-toolbar-actions');
        actions.style.display = 'flex';
        actions.style.gap = '2px';
        actions.style.marginLeft = 'auto';

        // Ensure toolbar icon styles (size, no edges, hover/active states)
        try {
            if (!document.getElementById('storyline-plotgrid-toolbar-style')) {
                const st = document.createElement('style');
                st.id = 'storyline-plotgrid-toolbar-style';
                st.textContent = `
                /* Apply identical toolbar icon styling to both icon-button and clickable-icon */
                .plot-grid-toolbar .icon-button, .plot-grid-toolbar .clickable-icon { background: transparent !important; border: none !important; box-shadow: none !important; outline: none !important; padding: 2px !important; min-width: 0 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
                .plot-grid-toolbar .icon-button:focus, .plot-grid-toolbar .clickable-icon:focus { outline: none !important; box-shadow: none !important; }
                /* Do not force explicit icon pixel sizes here — inherit the application's default icon sizing (use BoardView sizing as reference). */
                .plot-grid-toolbar .icon-button i[data-lucide], .plot-grid-toolbar .icon-button svg, .plot-grid-toolbar .clickable-icon i[data-lucide], .plot-grid-toolbar .clickable-icon svg { display: inline-flex !important; align-items: center !important; justify-content: center !important; }
                .plot-grid-toolbar .icon-button:hover, .plot-grid-toolbar .clickable-icon:hover { background-color: var(--sl-hover-overlay2) !important; border-radius: 6px !important; }
                .plot-grid-toolbar .icon-button:active i, .plot-grid-toolbar .icon-button:active svg, .plot-grid-toolbar .clickable-icon:active i, .plot-grid-toolbar .clickable-icon:active svg { transform: scale(0.96) !important; }
                `;
                document.head.appendChild(st);
            }
        } catch (e) { /* safe no-op */ }

        // Add Row / Add Column buttons should sit where B/I are currently — render them on the left
        const addRowBtn = left.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Add Row' } });
        addRowBtn.title = 'Add Row';
        if (typeof obsidian.setIcon === 'function') {
            obsidian.setIcon(addRowBtn, 'rows-3');
        } else {
            addRowBtn.innerHTML = '<i data-lucide="rows-3" aria-hidden="true"></i>';
        }
        addRowBtn.addEventListener('click', () => { this.addRow(); });

        const addColBtn = left.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Add Column' } });
        addColBtn.title = 'Add Column';
        if (typeof obsidian.setIcon === 'function') {
            obsidian.setIcon(addColBtn, 'columns-3');
        } else {
            addColBtn.innerHTML = '<i data-lucide="columns-3" aria-hidden="true"></i>';
        }
        addColBtn.addEventListener('click', () => { this.addColumn(); });

        // Formatting controls (moved to the right actions area so B/I move right)
        const fmtGroup = actions.createDiv('plot-grid-formatting-group');
        fmtGroup.style.display = 'flex';
        fmtGroup.style.gap = '2px';

        const boldBtn = fmtGroup.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Toggle bold for selected cell' } });
        boldBtn.title = 'Toggle bold for selected cell';
        if (typeof obsidian.setIcon === 'function') {
            obsidian.setIcon(boldBtn, 'bold');
        } else {
            boldBtn.innerHTML = '<i data-lucide="bold" aria-hidden="true"></i>';
        }
        boldBtn.addEventListener('click', () => this.toggleBoldSelected());

        const italicBtn = fmtGroup.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Toggle italic for selected cell' } });
        italicBtn.title = 'Toggle italic for selected cell';
        if (typeof obsidian.setIcon === 'function') {
            obsidian.setIcon(italicBtn, 'italic');
        } else {
            italicBtn.innerHTML = '<i data-lucide="italic" aria-hidden="true"></i>';
        }
        italicBtn.addEventListener('click', () => this.toggleItalicSelected());

        const alignSelect = fmtGroup.createEl('select');
        const optL = alignSelect.createEl('option', { text: 'Left', value: 'left' });
        const optC = alignSelect.createEl('option', { text: 'Center', value: 'center' });
        const optR = alignSelect.createEl('option', { text: 'Right', value: 'right' });
        alignSelect.title = 'Alignment for selection';
        alignSelect.addEventListener('change', () => this.setAlignSelected(alignSelect.value as 'left' | 'center' | 'right'));
        // default to centered
        alignSelect.value = 'center';

        const bgColorBtn = fmtGroup.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Set background color for selected cell' } });
        bgColorBtn.title = 'Set background color for selected cell';
        if (typeof obsidian.setIcon === 'function') {
            obsidian.setIcon(bgColorBtn, 'palette');
        } else {
            bgColorBtn.innerHTML = '<i data-lucide="palette" aria-hidden="true"></i>';
        }
        bgColorBtn.addEventListener('click', () => this.setCellBgColorSelected());

        const textColorBtn = fmtGroup.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Set text color for selected cell' } });
        textColorBtn.title = 'Set text color for selected cell';
        if (typeof obsidian.setIcon === 'function') {
            obsidian.setIcon(textColorBtn, 'paintbrush');
        } else {
            textColorBtn.innerHTML = '<i data-lucide="paintbrush" aria-hidden="true"></i>';
        }
        textColorBtn.addEventListener('click', () => this.setCellTextColorSelected());


        // Note: Add Row / Add Column buttons moved to the right controls area

                // Reset moved to corner right-click context menu with confirmation

        // Add Row / Add Column created above in the left controls (they replace B/I position)

        const zoomOut = actions.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Zoom out' } });
        zoomOut.title = 'Zoom out';
        if (typeof obsidian.setIcon === 'function') {
            obsidian.setIcon(zoomOut, 'zoom-out');
        } else {
            zoomOut.innerHTML = '<i data-lucide="zoom-out" aria-hidden="true"></i>';
        }
        zoomOut.addEventListener('click', () => this.setZoom(Math.max(0.3, this.data.zoom - 0.1)));

        const zoomLabel = actions.createEl('span', { cls: 'plot-grid-zoom-label', text: Math.round(this.data.zoom * 100) + '%' });
        // Keep the label fixed width so the control doesn't jump when digits change (e.g. 100% -> 99%)
        zoomLabel.style.display = 'inline-block';
        zoomLabel.style.width = '40px';
        zoomLabel.style.minWidth = '40px';
        zoomLabel.style.textAlign = 'center';
        zoomLabel.style.alignSelf = 'center';
        zoomLabel.style.cursor = 'text';
        zoomLabel.title = 'Click to edit zoom %';
        zoomLabel.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.value = Math.round(this.data.zoom * 100).toString();
            inp.style.width = '56px';
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

        const resetZoomBtn = actions.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Reset zoom to 100%' } });
        resetZoomBtn.title = 'Reset zoom to 100%';
        if (typeof obsidian.setIcon === 'function') {
            obsidian.setIcon(resetZoomBtn, 'maximize-2');
        } else {
            resetZoomBtn.innerHTML = '<i data-lucide="maximize-2" aria-hidden="true"></i>';
        }
        resetZoomBtn.addEventListener('click', () => this.setZoom(1));

        const zoomIn = actions.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Zoom in' } });
        zoomIn.title = 'Zoom in';
        if (typeof obsidian.setIcon === 'function') {
            obsidian.setIcon(zoomIn, 'zoom-in');
        } else {
            zoomIn.innerHTML = '<i data-lucide="zoom-in" aria-hidden="true"></i>';
        }
        zoomIn.addEventListener('click', () => this.setZoom(Math.min(2.0, this.data.zoom + 0.1)));

        actions.appendChild(zoomOut);
        actions.appendChild(zoomLabel);
        actions.appendChild(zoomIn);
        actions.appendChild(resetZoomBtn);

        // Initialize Lucide icons replacement for any `data-lucide` placeholders we added above
        try {
            if (typeof (lucide as any).createIcons === 'function') {
                const icons = (lucide as any).icons || (lucide as any);
                try { (lucide as any).createIcons({ icons }); } catch (e) { /* fallback no-op */ }
            }
        } catch (e) { /* ignore lucide init errors */ }

        // Ensure icon-only appearance: remove any visible button edges and set icon size
        try {
            const btns = toolbar.querySelectorAll('.icon-button');
            btns.forEach((b) => {
                const btn = b as HTMLElement;
                btn.style.background = 'transparent';
                btn.style.backgroundColor = 'transparent';
                btn.style.backgroundImage = 'none';
                btn.style.border = 'none';
                btn.style.boxShadow = 'none';
                btn.style.outline = 'none';
                btn.style.minWidth = '0';
                btn.style.width = 'auto';
                btn.style.height = 'auto';
                btn.style.padding = '2px';
                btn.style.borderRadius = '0';
                // set the inner lucide holder and svg size
                const holder = btn.querySelector('i[data-lucide]') as HTMLElement | null;
                if (holder) {
                    holder.style.display = 'inline-flex';
                    holder.style.alignItems = 'center';
                    holder.style.justifyContent = 'center';
                    holder.style.background = 'transparent';
                    holder.style.transition = 'transform 120ms ease, background-color 120ms ease, opacity 120ms ease';
                    const svg = holder.querySelector('svg') as SVGElement | null;
                    if (svg) {
                        // Do not hard-set width/height — allow the app's icon sizing to control pixel dimensions so it matches BoardView
                        (svg as any).style.transition = 'transform 120ms ease, opacity 120ms ease';
                        (svg as any).style.opacity = '0.95';
                        (svg as any).style.display = 'block';
                    }
                }
                // add hover and active feedback for each button
                btn.addEventListener('mouseenter', () => {
                    try {
                        btn.style.backgroundColor = 'var(--sl-hover-overlay)';
                        btn.style.borderRadius = '6px';
                        const holder = btn.querySelector('i[data-lucide]') as HTMLElement | null;
                        if (holder) holder.style.transform = 'scale(1.08)';
                    } catch (e) { /* cosmetic, safe to ignore */ }
                });
                btn.addEventListener('mouseleave', () => {
                    try {
                        btn.style.background = 'transparent';
                        btn.style.backgroundColor = 'transparent';
                        btn.style.borderRadius = '0';
                        const holder = btn.querySelector('i[data-lucide]') as HTMLElement | null;
                        if (holder) holder.style.transform = '';
                    } catch (e) { /* cosmetic, safe to ignore */ }
                });
                btn.addEventListener('mousedown', () => {
                    try {
                        const holder = btn.querySelector('i[data-lucide]') as HTMLElement | null;
                        if (holder) holder.style.transform = 'scale(0.96)';
                    } catch (e) { /* cosmetic, safe to ignore */ }
                });
                document.addEventListener('mouseup', () => {
                    try {
                        const holder = btn.querySelector('i[data-lucide]') as HTMLElement | null;
                        if (holder) holder.style.transform = '';
                    } catch (e) { /* cosmetic, safe to ignore */ }
                });
            });
        } catch (e) { /* safe no-op */ }
    }

    private setZoom(z: number) {
        this.data.zoom = z;
        if (this.canvasEl && this.scrollAreaEl) {
            this.canvasEl.style.transform = `scale(${z})`;
            const totalWidth = this.computeTotalWidth();
            this.canvasEl.style.width = totalWidth / z + 'px';
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

        this.ensureDefaults();
        this.canvasEl.empty();

        let colTemplate = [ROW_HEADER_WIDTH + 'px', ...this.data.columns.map((c) => c.width + 'px')].join(' ');
        let rowTemplate = [COL_HEADER_HEIGHT + 'px', ...this.data.rows.map((r) => r.height + 'px')].join(' ');

        // If there are no columns/rows yet, use flexible templates so the empty-state message
        // can span the full available width instead of being constrained to the single header column.
        if (this.data.columns.length === 0) colTemplate = '1fr';
        if (this.data.rows.length === 0) rowTemplate = '1fr';

        this.canvasEl.style.display = 'grid';
        this.canvasEl.style.gridTemplateColumns = colTemplate;
        this.canvasEl.style.gridTemplateRows = rowTemplate;
        // If there are no columns, allow the canvas to stretch to the container width.
        if (this.data.columns.length === 0) this.canvasEl.style.width = '100%';
        else this.canvasEl.style.width = this.computeTotalWidth() / this.data.zoom + 'px';

        const corner = this.canvasEl.createDiv('plot-grid-corner');
        corner.setAttr('data-type', 'corner');
        corner.style.position = (this.data.stickyHeaders === false) ? 'relative' : 'sticky';
        corner.style.top = '0';
        corner.style.left = '0';
        corner.style.zIndex = '11';
        corner.style.background = 'var(--background-modifier-hover)';
        corner.style.border = '1px solid var(--sl-border-subtle)';

        // corner context menu (Reset grid moved here)
        corner.addEventListener('contextmenu', (evt) => {
            evt.preventDefault();
            const menu = new Menu();
            menu.addItem((it) => it.setTitle('Reset Grid').onClick(() => {
                class ConfirmModal extends Modal {
                    onConfirm: () => void;
                    constructor(app: any, onConfirm: () => void) { super(app); this.onConfirm = onConfirm; }
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
            el.style.position = (this.data.stickyHeaders === false) ? 'relative' : 'sticky';
            el.style.top = '0';
            el.style.zIndex = '10';
            el.style.background = col.bgColor || 'var(--background-secondary)';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.border = '1px solid var(--sl-border-subtle)';
            el.style.userSelect = 'none';
            el.style.position = 'relative';
            el.textContent = col.label;
            if (col.textColor) el.style.color = col.textColor;
            if (col.bold) el.style.fontWeight = '600';
            if (col.italic) el.style.fontStyle = 'italic';

            // allow naming like cells: double-click to edit label
            el.addEventListener('dblclick', (ev) => {
                ev.stopPropagation();
                const inp = document.createElement('input');
                inp.type = 'text';
                inp.value = col.label;
                inp.style.width = '100%';
                inp.style.boxSizing = 'border-box';
                el.empty();
                el.appendChild(inp);
                inp.focus();
                const commit = () => { col.label = inp.value || col.label; this.scheduleSave(); this.renderGrid(); };
                inp.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') { commit(); } else if (ke.key === 'Escape') { this.renderGrid(); } });
                inp.addEventListener('blur', () => commit());
            });

            // click selects entire column
            el.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.selectColumnHeader(ci);
            });

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
            colHandle.style.position = 'absolute';
            colHandle.style.right = '0';
            colHandle.style.top = '0';
            colHandle.style.bottom = '0';
            colHandle.style.width = '6px';
            colHandle.style.cursor = 'col-resize';
            colHandle.draggable = false;
            colHandle.addEventListener('mousedown', (ev) => { ev.stopPropagation(); this.startColResize(ev as MouseEvent, ci); });

            // column header context menu
            el.addEventListener('contextmenu', (evt) => {
                evt.preventDefault();
                const menu = new Menu();
                menu.addItem((item) => item.setTitle('Rename Column').onClick(() => {
                    const name = window.prompt('Rename column', col.label);
                    if (name !== null) { col.label = name; this.scheduleSave(); this.renderGrid(); }
                }));
                menu.addItem((item) => item.setTitle((this.data.stickyHeaders ? 'Disable' : 'Enable') + ' Sticky Headers').onClick(() => { this.data.stickyHeaders = !this.data.stickyHeaders; this.scheduleSave(); this.renderGrid(); }));
                menu.addItem((item) => item.setTitle('Set Column Colour…').onClick(() => {
                    const header = this.canvasEl?.querySelectorAll('.plot-grid-col-header')[ci] as HTMLElement | undefined;
                    const els: HTMLElement[] = [];
                    for (let ri = 0; ri < this.data.rows.length; ri++) { const e = this.getCellElement(ri, ci); if (e) els.push(e); }
                    const prevs = els.map(e => e.style.background);
                    const prevHeaderBg = header ? header.style.background : null;
                    this.chooseColor(this.data.columns[ci].bgColor || this.defaultBgColor(), (c) => { if (c === null) { els.forEach((e,i) => e.style.background = prevs[i]); if (header && prevHeaderBg !== null) header.style.background = prevHeaderBg; return; } this.data.columns[ci].bgColor = c || ''; this.scheduleSave(); this.renderGrid(); for (let ri=0; ri<this.data.rows.length; ri++) this.flashElement(this.getCellElement(ri, ci)); }, (preview) => { if (preview === null) { els.forEach((e,i) => e.style.background = prevs[i]); if (header && prevHeaderBg !== null) header.style.background = prevHeaderBg; } else { els.forEach(e => e.style.background = preview); if (header) header.style.background = preview; } });
                }));
                menu.addSeparator();
                menu.addItem((item) => item.setTitle('Insert Column Left').onClick(() => this.insertColumnAt(ci, true)));
                menu.addItem((item) => item.setTitle('Insert Column Right').onClick(() => this.insertColumnAt(ci, false)));
                menu.addSeparator();
                menu.addItem((item) => item.setTitle('Delete Column').onClick(() => this.deleteColumn(ci)));
                menu.showAtMouseEvent(evt);
            });
        }

        for (let ri = 0; ri < this.data.rows.length; ri++) {
            const row = this.data.rows[ri];
            const rowEl = this.canvasEl.createDiv('plot-grid-row-header');
            rowEl.style.position = (this.data.stickyHeaders === false) ? 'relative' : 'sticky';
            rowEl.style.left = '0';
            rowEl.style.zIndex = '9';
            rowEl.style.background = row.bgColor || 'var(--background-secondary)';
            rowEl.style.display = 'flex';
            rowEl.style.alignItems = 'center';
            rowEl.style.justifyContent = 'center';
            rowEl.style.border = '1px solid var(--sl-border-subtle)';
            rowEl.style.userSelect = 'none';
            rowEl.style.position = 'relative';
            rowEl.textContent = row.label;
            if (row.textColor) rowEl.style.color = row.textColor;
            if (row.bold) rowEl.style.fontWeight = '600';
            if (row.italic) rowEl.style.fontStyle = 'italic';

            // allow naming like cells: double-click to edit label
            rowEl.addEventListener('dblclick', (ev) => {
                ev.stopPropagation();
                const inp = document.createElement('input');
                inp.type = 'text';
                inp.value = row.label;
                inp.style.width = '100%';
                inp.style.boxSizing = 'border-box';
                rowEl.empty();
                rowEl.appendChild(inp);
                inp.focus();
                const commit = () => { row.label = inp.value || row.label; this.scheduleSave(); this.renderGrid(); };
                inp.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') { commit(); } else if (ke.key === 'Escape') { this.renderGrid(); } });
                inp.addEventListener('blur', () => commit());
            });

            // click selects entire row
            rowEl.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.selectRowHeader(ri);
            });

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
            rowHandle.style.position = 'absolute';
            rowHandle.style.left = '0';
            rowHandle.style.right = '0';
            rowHandle.style.bottom = '0';
            rowHandle.style.height = '6px';
            rowHandle.style.cursor = 'row-resize';
            rowHandle.draggable = false;
            rowHandle.addEventListener('mousedown', (ev) => { ev.stopPropagation(); this.startRowResize(ev as MouseEvent, ri); });

            // row header context menu
            rowEl.addEventListener('contextmenu', (evt) => {
                evt.preventDefault();
                const menu = new Menu();
                menu.addItem((item) => item.setTitle('Rename Row').onClick(() => {
                    const name = window.prompt('Rename row', row.label);
                    if (name !== null) { row.label = name; this.scheduleSave(); this.renderGrid(); }
                }));
                menu.addItem((item) => item.setTitle((this.data.stickyHeaders ? 'Disable' : 'Enable') + ' Sticky Headers').onClick(() => { this.data.stickyHeaders = !this.data.stickyHeaders; this.scheduleSave(); this.renderGrid(); }));
                menu.addItem((item) => item.setTitle('Set Row Colour…').onClick(() => {
                    const els: HTMLElement[] = [];
                    for (let ci = 0; ci < this.data.columns.length; ci++) { const e = this.getCellElement(ri, ci); if (e) els.push(e); }
                    const prevs = els.map(e => e.style.background);
                    const header = this.canvasEl?.querySelectorAll('.plot-grid-row-header')[ri] as HTMLElement | undefined;
                    const prevHeaderBg = header ? header.style.background : null;
                    this.chooseColor(this.data.rows[ri].bgColor || this.defaultBgColor(), (c) => { if (c === null) { els.forEach((e,i) => e.style.background = prevs[i]); if (header && prevHeaderBg !== null) header.style.background = prevHeaderBg; return; } this.data.rows[ri].bgColor = c || ''; this.scheduleSave(); this.renderGrid(); for (let ci=0; ci<this.data.columns.length; ci++) this.flashElement(this.getCellElement(ri, ci)); }, (preview) => { if (preview === null) { els.forEach((e,i) => e.style.background = prevs[i]); if (header && prevHeaderBg !== null) header.style.background = prevHeaderBg; } else { els.forEach(e => e.style.background = preview); if (header) header.style.background = preview; } });
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
                cellEl.style.minHeight = row.height + 'px';
                cellEl.style.border = '1px solid var(--sl-grid-border)';
                cellEl.style.padding = '6px 8px';
                cellEl.style.boxSizing = 'border-box';
                cellEl.style.whiteSpace = 'pre-wrap';
                cellEl.style.overflow = 'hidden';
                cellEl.style.cursor = 'default';
                cellEl.style.display = 'flex';
                cellEl.style.flexDirection = 'column';
                cellEl.style.justifyContent = 'center';

                const bg = cell.bgColor || row.bgColor || col.bgColor || '';
                if (bg) cellEl.style.background = bg;
                if (cell.textColor) cellEl.style.color = cell.textColor;
                if (cell.bold) cellEl.style.fontWeight = '600';
                if (cell.italic) cellEl.style.fontStyle = 'italic';
                cellEl.style.textAlign = cell.align;

                const contentEl = cellEl.createDiv();
                contentEl.textContent = cell.content || '';
                contentEl.style.flex = '1 1 auto';
                contentEl.style.pointerEvents = 'none';

                // linked scene: render mini card or badge
                if (cell.linkedSceneId) {
                    const scMgr = this.plugin?.sceneManager as SceneManager | undefined;
                    const scene = scMgr?.getScene(cell.linkedSceneId) as Scene | undefined;
                    if (scene) {
                        // Render mini scene card inside the cell
                        const miniCard = cellEl.createDiv('plot-grid-mini-card');

                        // Status icon + title row
                        const titleRow = miniCard.createDiv('pg-mini-title-row');
                        const statusCfg = STATUS_CONFIG[scene.status || 'idea'];
                        const statusIcon = titleRow.createSpan({ cls: 'pg-mini-status-icon' });
                        obsidian.setIcon(statusIcon, statusCfg.icon);
                        statusIcon.title = statusCfg.label;
                        titleRow.createSpan({ cls: 'pg-mini-title', text: scene.title || 'Untitled' });

                        // Meta row: description snippet
                        const metaRow = miniCard.createDiv('pg-mini-meta');
                        if (scene.body && scene.body.trim()) {
                            const snippet = scene.body.trim().length > 120
                                ? scene.body.trim().substring(0, 120) + '…'
                                : scene.body.trim();
                            metaRow.createSpan({ cls: 'pg-mini-desc', text: snippet });
                        } else if (scene.conflict) {
                            metaRow.createSpan({ cls: 'pg-mini-desc', text: scene.conflict });
                        }

                        // Keep cell content below if there's text
                        if (cell.content) {
                            contentEl.style.marginTop = '4px';
                            contentEl.style.fontSize = '11px';
                            contentEl.style.color = 'var(--text-muted)';
                        } else {
                            contentEl.style.display = 'none';
                        }
                    } else {
                        // Scene not found — show simple badge
                        const badge = cellEl.createDiv('plot-grid-linked-badge');
                        badge.textContent = '🔗';
                        badge.title = cell.linkedSceneId;
                        badge.style.position = 'absolute';
                        badge.style.top = '4px';
                        badge.style.right = '6px';
                        badge.style.cursor = 'pointer';
                        badge.addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            const f = this.app.vault.getAbstractFileByPath(cell.linkedSceneId as string) as TFile | null;
                            if (f) this.app.workspace.getLeaf('tab').openFile(f);
                            else new Notice('Linked file not found');
                        });
                        const sub = cellEl.createDiv('plot-grid-linked-subtitle');
                        sub.textContent = (cell.linkedSceneId.split('/').pop()?.replace('.md', '')) || '';
                        sub.style.fontSize = '11px';
                        sub.style.color = 'var(--text-muted)';
                    }
                }

                cellEl.addEventListener('dblclick', (ev) => {
                    ev.stopPropagation();
                    this.enterEditMode(cellEl, cell, contentEl);
                });

                cellEl.addEventListener('click', () => {
                    this.selectCell(cellEl);
                    // Show inspector if cell has a linked scene
                    if (cell.linkedSceneId && this.inspectorComponent) {
                        const scMgr = this.plugin?.sceneManager as SceneManager | undefined;
                        const scene = scMgr?.getScene(cell.linkedSceneId);
                        if (scene) {
                            this.inspectorComponent.show(scene);
                        }
                    } else if (this.inspectorComponent) {
                        this.inspectorComponent.hide();
                    }
                });

                // context menu for cell
                cellEl.addEventListener('contextmenu', (evt) => {
                    evt.preventDefault();
                    const menu = new Menu();
                    const scMgr = this.plugin?.sceneManager as SceneManager | undefined;
                    const linkedScene = cell.linkedSceneId ? scMgr?.getScene(cell.linkedSceneId) : undefined;

                    if (linkedScene) {
                        // Scene-specific actions
                        menu.addItem((it) => it.setTitle('Open Scene').setIcon('file-text').onClick(() => this.openScene(linkedScene)));
                        menu.addItem((it) => it.setTitle('Show in Inspector').setIcon('info').onClick(() => {
                            this.inspectorComponent?.show(linkedScene);
                        }));
                        menu.addSeparator();
                        // Status submenu
                        const statuses: SceneStatus[] = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];
                        statuses.forEach(s => {
                            menu.addItem((it) => it.setTitle(`Status: ${s.charAt(0).toUpperCase() + s.slice(1)}`)
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
                    const scenePath = ev.dataTransfer?.getData('text/scene-path');
                    if (scenePath) {
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
            msg.style.position = 'relative';
            msg.style.width = '100%';
            msg.style.display = 'flex';
            msg.style.alignItems = 'center';
            msg.style.justifyContent = 'center';
            msg.style.padding = '24px';
            msg.style.boxSizing = 'border-box';
            msg.style.maxWidth = '100%';
            msg.style.textAlign = 'left';
            msg.textContent = "Use 'Add Row' and 'Add Column' to begin building your plot grid.";
        }

        // reapply selection visuals after render
        this.applySelectionVisuals();
    }

    /** Full refresh called by the plugin when projects/files change */
    async refresh(): Promise<void> {
        try {
            // If a save is pending, skip reloading from disk (would overwrite in-memory changes)
            if (this.saveDebounce) return;
            // If a cell is being edited, skip refresh to avoid destroying the textarea
            if (this.canvasEl?.querySelector('.plot-grid-cell.editing')) return;
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
        this.canvasEl.querySelectorAll('.plot-grid-cell').forEach(n => (n as HTMLElement).style.outline = '');
        this.canvasEl.querySelectorAll('.plot-grid-row-header, .plot-grid-col-header').forEach(n => (n as HTMLElement).style.boxShadow = '');

        if (this.selectedRow !== null && this.selectedCol !== null) {
            const el = this.getCellElement(this.selectedRow, this.selectedCol);
            if (el) el.style.outline = '2px solid var(--interactive-accent)';
        }

        if (this.selectedRow !== null) {
            const header = this.canvasEl.querySelectorAll('.plot-grid-row-header')[this.selectedRow] as HTMLElement | undefined;
            if (header) header.style.boxShadow = 'inset 4px 0 0 var(--interactive-accent)';
        }

        if (this.selectedCol !== null) {
            const header = this.canvasEl.querySelectorAll('.plot-grid-col-header')[this.selectedCol] as HTMLElement | undefined;
            if (header) header.style.boxShadow = 'inset 0 4px 0 var(--interactive-accent)';
        }
    }

    private flashElement(el: HTMLElement | null) {
        if (!el) return;
        const orig = el.style.transition || '';
        el.style.transition = 'background-color 160ms ease';
        const prevBg = el.style.background;
        el.style.background = 'var(--sl-grid-flash)';
        setTimeout(() => { el.style.background = prevBg; setTimeout(() => { el.style.transition = orig; }, 200); }, 180);
    }

    private selectCell(el: HTMLElement) {
                const prev = this.canvasEl?.querySelector('.plot-grid-cell.selected');
                if (prev) { prev.classList.remove('selected'); (prev as HTMLElement).style.outline = ''; }
                el.classList.add('selected');
                const r = el.getAttribute('data-row');
                const c = el.getAttribute('data-col');
                this.selectedRow = r ? Number(r) : null;
                this.selectedCol = c ? Number(c) : null;
                // ensure visible
                el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                // visual
                el.style.outline = '2px solid var(--interactive-accent)';
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
        const sel = this.canvasEl?.querySelectorAll('.plot-grid-cell') || [] as any;
        sel.forEach((n: Element) => (n as HTMLElement).classList.remove('selected'));
        const header = this.canvasEl?.querySelectorAll('.plot-grid-row-header')[index] as HTMLElement | undefined;
        if (header) header.classList.add('selected');
    }

    private selectColumnHeader(index: number) {
        this.selectedCol = index;
        this.selectedRow = null;
        this.canvasEl?.querySelectorAll('.plot-grid-col-header.selected').forEach(n => n.classList.remove('selected'));
        const sel = this.canvasEl?.querySelectorAll('.plot-grid-cell') || [] as any;
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
        const val = getComputedStyle(document.body).getPropertyValue(varName).trim();
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
            constructor(app: any, init: string, onChoose: (c: string | null) => void, onPreview?: (c: string | null) => void) { super(app); this.initVal = init; this.onChoose = onChoose; this.onPreview = onPreview; }
            onOpen() {
                const { contentEl } = this;
                const titleEl = contentEl.createEl('h3', { text: 'Choose color' });
                titleEl.style.margin = '4px 0 8px 0';
                const row = contentEl.createDiv();
                this.inputEl = row.createEl('input') as HTMLInputElement;
                this.inputEl.type = 'color';
                // avoid assigning an empty string to a color input (invalid)
                const defaultColor = (this.initVal && /^#?[0-9a-fA-F]{6}$/.test(this.initVal)) ? (this.initVal.startsWith('#') ? this.initVal : `#${this.initVal}`) : getComputedStyle(document.body).getPropertyValue('--background-primary').trim() || '#ffffff';
                this.inputEl.value = defaultColor;
                this.inputEl.style.width = '48px';
                this.inputEl.style.height = '32px';
                this.inputEl.style.marginRight = '8px';

                this.hexEl = row.createEl('input') as HTMLInputElement;
                this.hexEl.type = 'text';
                this.hexEl.value = this.initVal && this.initVal !== '' ? (this.initVal.startsWith('#') ? this.initVal : `#${this.initVal}`) : '';
                this.hexEl.style.width = '120px';
                this.hexEl.style.marginRight = '8px';

                const previewSwatch = row.createDiv('color-preview');
                previewSwatch.style.width = '36px';
                previewSwatch.style.height = '36px';
                previewSwatch.style.border = '1px solid var(--background-modifier-border)';
                previewSwatch.style.background = this.inputEl.value;
                previewSwatch.style.marginRight = '10px';
                previewSwatch.style.borderRadius = '6px';

                // track the currently selected color separately from the color input value
                let selectedColor: string | '' = (this.initVal && this.initVal !== '') ? (this.initVal.startsWith('#') ? this.initVal : `#${this.initVal}`) : '';

                // preset palette swatches (resolved from theme)
                const swatchRow = contentEl.createDiv('color-swatch-row');
                swatchRow.style.display = 'flex';
                swatchRow.style.flexWrap = 'wrap';
                swatchRow.style.gap = '6px';
                swatchRow.style.marginTop = '6px';
                for (const col of palette) {
                    const s = swatchRow.createDiv('palette-swatch');
                    s.style.width = '20px';
                    s.style.height = '20px';
                    s.style.borderRadius = '4px';
                    s.style.border = '1px solid var(--background-modifier-border)';
                    s.style.cursor = 'pointer';
                    s.title = col || 'No color';
                    s.style.background = col || 'transparent';
                    if (!col) { s.style.backgroundImage = `linear-gradient(45deg,${checkerLight} 25%, ${checkerDark} 25%, ${checkerDark} 50%, ${checkerLight} 50%, ${checkerLight} 75%, ${checkerDark} 75%, ${checkerDark} 100%)`; s.style.backgroundSize = '8px 8px'; }
                    s.addEventListener('click', () => {
                        if (col) {
                            selectedColor = col;
                            // update inputs where valid
                            try { this.inputEl!.value = col; } catch (e) { /* input may not exist */ }
                            if (this.hexEl) this.hexEl.value = col;
                            previewSwatch.style.background = col;
                            if (this.onPreview) this.onPreview(col);
                        } else {
                            // select explicit "no color"
                            selectedColor = '';
                            // do not try to write an empty value to the color input (invalid)
                            if (this.hexEl) this.hexEl.value = '';
                            previewSwatch.style.background = 'transparent';
                            if (this.onPreview) this.onPreview('');
                        }
                    });
                }

                // tighten modal layout and reduce top spacing; also set modal container size
                contentEl.style.maxWidth = '90vw';
                contentEl.style.padding = '8px 12px';
                contentEl.style.marginTop = '0';
                const modalEl = (this as any).modalEl as HTMLElement;
                if (modalEl) {
                    modalEl.style.width = '300px';
                    modalEl.style.maxWidth = '90vw';
                    // center and move the modal slightly higher; nudge left to better center in the app
                    modalEl.style.left = '50%';
                    modalEl.style.top = '4%';
                    modalEl.style.transform = 'translate(-52%, -6%)';
                    modalEl.style.right = 'auto';
                    modalEl.style.boxSizing = 'border-box';
                    modalEl.style.margin = '0';
                }

                this.inputEl.addEventListener('input', () => {
                    const val = this.inputEl!.value;
                    selectedColor = val;
                    if (this.hexEl) this.hexEl.value = val;
                    previewSwatch.style.background = val;
                    if (this.onPreview) this.onPreview(val);
                });
                this.hexEl.addEventListener('input', () => {
                    const v = this.hexEl!.value;
                    if (v === '') {
                        selectedColor = '';
                        previewSwatch.style.background = 'transparent';
                        if (this.onPreview) this.onPreview('');
                    } else if (/^#?[0-9a-fA-F]{6}$/.test(v)) {
                        const norm = v.startsWith('#') ? v : `#${v}`;
                        selectedColor = norm;
                        try { this.inputEl!.value = norm; } catch (e) { /* input may not exist */ }
                        previewSwatch.style.background = norm;
                        if (this.onPreview) this.onPreview(norm);
                    }
                });

                const btns = contentEl.createDiv();
                btns.style.marginTop = '8px';
                btns.style.display = 'flex';
                btns.style.width = '100%';
                btns.style.justifyContent = 'flex-end';
                btns.style.gap = '12px';
                btns.style.paddingRight = '6px';

                const ok = btns.createEl('button', { text: 'OK' });
                ok.addEventListener('click', () => { this.onChoose(selectedColor === '' ? '' : selectedColor); this.close(); });
                const cancel = btns.createEl('button', { text: 'Cancel' });
                cancel.addEventListener('click', () => { if (this.onPreview) this.onPreview(null); this.onChoose(null); this.close(); });

                // Make the modal draggable by its header
                const headerEl = contentEl.querySelector('h3');
                if (modalEl && headerEl) {
                    headerEl.style.cursor = 'move';
                    let dragging = false;
                    let startX = 0, startY = 0, origLeft = 0, origTop = 0;
                    const onDown = (ev: MouseEvent) => {
                        ev.preventDefault();
                        dragging = true;
                        const rect = modalEl.getBoundingClientRect();
                        startX = ev.clientX; startY = ev.clientY;
                        origLeft = rect.left; origTop = rect.top;
                        modalEl.style.position = 'fixed';
                        modalEl.style.left = origLeft + 'px';
                        modalEl.style.top = origTop + 'px';
                        modalEl.style.transform = '';
                        document.addEventListener('mousemove', onMove);
                        document.addEventListener('mouseup', onUp);
                    };
                    const onMove = (ev: MouseEvent) => {
                        if (!dragging) return;
                        const dx = ev.clientX - startX;
                        const dy = ev.clientY - startY;
                        modalEl.style.left = (origLeft + dx) + 'px';
                        modalEl.style.top = (origTop + dy) + 'px';
                    };
                    const onUp = () => {
                        dragging = false;
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
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
                            modalEl.style.cursor = 'move';
                        } else {
                            modalEl.style.cursor = '';
                        }
                    });
                    modalEl.addEventListener('mouseleave', () => { modalEl.style.cursor = ''; });
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
                if (c === null) { el.style.background = prev; return; }
                const cur = this.data.cells[cellKey];
                if (cur) cur.bgColor = c || '';
                this.scheduleSave(); this.renderGrid();
                const freshEl = this.getCellElement(selRow, selCol);
                if (freshEl) this.flashElement(freshEl);
            }, (preview) => { if (preview === null) el.style.background = prev; else el.style.background = preview; });
        } else if (selRow !== null) {
            // preview for whole row + header
            const els: HTMLElement[] = [];
            for (let ci = 0; ci < this.data.columns.length; ci++) { const el = this.getCellElement(selRow, ci); if (el) els.push(el); }
            const prevs = els.map(e => e.style.background);
            const header = this.canvasEl?.querySelectorAll('.plot-grid-row-header')[selRow] as HTMLElement | undefined;
            const prevHeaderBg = header ? header.style.background : null;
            this.chooseColor(this.data.rows[selRow].bgColor || this.defaultBgColor(), (c) => {
                if (c === null) {
                    els.forEach((e,i) => e.style.background = prevs[i]);
                    if (header && prevHeaderBg !== null) header.style.background = prevHeaderBg;
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
            }, (preview) => { if (preview === null) { els.forEach((e,i) => e.style.background = prevs[i]); if (header && prevHeaderBg !== null) header.style.background = prevHeaderBg; } else { els.forEach(e => e.style.background = preview); if (header) header.style.background = preview; } });
        } else if (selCol !== null) {
            // preview for whole column + header
            const els: HTMLElement[] = [];
            for (let ri = 0; ri < this.data.rows.length; ri++) { const el = this.getCellElement(ri, selCol); if (el) els.push(el); }
            const prevs = els.map(e => e.style.background);
            const header = this.canvasEl?.querySelectorAll('.plot-grid-col-header')[selCol] as HTMLElement | undefined;
            const prevHeaderBg = header ? header.style.background : null;
            this.chooseColor(this.data.columns[selCol].bgColor || this.defaultBgColor(), (c) => {
                if (c === null) {
                    els.forEach((e,i) => e.style.background = prevs[i]);
                    if (header && prevHeaderBg !== null) header.style.background = prevHeaderBg;
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
            }, (preview) => { if (preview === null) { els.forEach((e,i) => e.style.background = prevs[i]); if (header && prevHeaderBg !== null) header.style.background = prevHeaderBg; } else { els.forEach(e => e.style.background = preview); if (header) header.style.background = preview; } });
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
                if (c === null) { el.style.color = prev; return; }
                const cur = this.data.cells[cellKey];
                if (cur) cur.textColor = c || '';
                this.scheduleSave(); this.renderGrid();
                const freshEl = this.getCellElement(selRow, selCol);
                if (freshEl) this.flashElement(freshEl);
            }, (preview) => { if (preview === null) el.style.color = prev; else el.style.color = preview; });
        } else if (selRow !== null) {
            const header = this.canvasEl?.querySelectorAll('.plot-grid-row-header')[selRow] as HTMLElement | undefined;
            const prevHeaderColor = header ? header.style.color : null;
            this.chooseColor(this.data.rows[selRow].textColor || this.defaultTextColor(), (c) => {
                if (c === null) {
                    if (header && prevHeaderColor !== null) header.style.color = prevHeaderColor;
                    return;
                }
                this.data.rows[selRow].textColor = c || '';
                this.scheduleSave();
                this.renderGrid();
                if (header) this.flashElement(header);
            }, (preview) => {
                if (preview === null) {
                    if (header && prevHeaderColor !== null) header.style.color = prevHeaderColor;
                } else {
                    if (header) header.style.color = preview;
                }
            });
        } else if (selCol !== null) {
            const header = this.canvasEl?.querySelectorAll('.plot-grid-col-header')[selCol] as HTMLElement | undefined;
            const prevHeaderColor = header ? header.style.color : null;
            this.chooseColor(this.data.columns[selCol].textColor || this.defaultTextColor(), (c) => {
                if (c === null) {
                    if (header && prevHeaderColor !== null) header.style.color = prevHeaderColor;
                    return;
                }
                this.data.columns[selCol].textColor = c || '';
                this.scheduleSave();
                this.renderGrid();
                if (header) this.flashElement(header);
            }, (preview) => {
                if (preview === null) {
                    if (header && prevHeaderColor !== null) header.style.color = prevHeaderColor;
                } else {
                    if (header) header.style.color = preview;
                }
            });
        } else { new Notice('Select a cell, row, or column first'); return; }
    }

    /** Open a scene file in a new tab */
    private async openScene(scene: Scene): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(scene.filePath);
        if (file instanceof TFile) {
            const leaf = this.app.workspace.getLeaf('tab');
            await leaf.openFile(file);
        } else {
            new Notice(`Could not find file: ${scene.filePath}`);
        }
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
                    await this.app.workspace.getLeaf('tab').openFile(file);
                }
            }
        );
        modal.open();
    }

    private enterEditMode(cellEl: HTMLElement, cell: CellData, contentEl: HTMLElement) {
        cellEl.classList.add('editing');
        cellEl.empty();
        const ta = cellEl.createEl('textarea');
        ta.value = cell.content || '';
        ta.style.width = '100%';
        ta.style.height = '100%';
        ta.style.border = 'none';
        ta.style.padding = '6px 8px';
        ta.style.boxSizing = 'border-box';
        ta.style.resize = 'none';
        ta.style.background = 'transparent';
        ta.style.color = 'inherit';
        ta.style.font = 'inherit';
        ta.style.outline = 'none';
        // Prevent clicks inside textarea from propagating to cell/wrapper
        ta.addEventListener('mousedown', (e) => e.stopPropagation());
        ta.addEventListener('click', (e) => e.stopPropagation());
        ta.addEventListener('dblclick', (e) => e.stopPropagation());

        // Remove wrapper focusability while editing so it can't steal focus
        if (this.wrapperEl) this.wrapperEl.tabIndex = -1;

        let committed = false;
        const commit = () => {
            if (committed) return;
            committed = true;
            // Restore wrapper focusability
            if (this.wrapperEl) this.wrapperEl.tabIndex = 0;
            cell.content = ta.value;
            this.scheduleSave();
            this.renderGrid();
        };

        // Use requestAnimationFrame + focus to guarantee it happens after the current event cycle
        requestAnimationFrame(() => { ta.focus(); });

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
                setTimeout(() => {
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

    // Scene link modal
    private openSceneLinkModal(onChoose: (path: string) => void) {
        const app = this.app;
        class SceneLinkModal extends Modal {
            onChoose: (path: string) => void;
            listEl: HTMLDivElement | null = null;
            inputEl: HTMLInputElement | null = null;
            constructor(app: any, onChoose: (p: string) => void) {
                super(app);
                this.onChoose = onChoose;
            }
            onOpen() {
                const { contentEl } = this;
                contentEl.createEl('h3', { text: 'Link Scene Card' });
                this.inputEl = contentEl.createEl('input');
                this.inputEl.placeholder = 'Search files...';
                this.inputEl.style.width = '100%';
                this.inputEl.addEventListener('input', () => this.renderList());
                this.listEl = contentEl.createDiv('scene-link-list');
                this.listEl.style.maxHeight = '300px';
                this.listEl.style.overflow = 'auto';
                this.renderList();
            }
            renderList() {
                if (!this.listEl || !this.inputEl) return;
                this.listEl.empty();
                const q = this.inputEl.value.toLowerCase();
                const files = this.app.vault.getMarkdownFiles().filter((f: TFile) => f.path.toLowerCase().includes(q) || f.basename.toLowerCase().includes(q));
                for (const f of files) {
                    const row = this.listEl.createDiv('scene-link-row');
                    row.style.padding = '6px 8px';
                    row.style.cursor = 'pointer';
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

    private ensureDefaults() {
        this.data.rows = this.data.rows || [];
        this.data.columns = this.data.columns || [];
        this.data.cells = this.data.cells || {};
        if (typeof (this.data as any).stickyHeaders === 'undefined') (this.data as any).stickyHeaders = true;
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
        document.body.style.cursor = 'col-resize';

        const onMove = (ev: MouseEvent) => {
            const delta = ev.clientX - startX;
            const newW = Math.max(60, Math.round(origWidth + delta));
            this.data.columns[colIndex].width = newW;
            // update grid template for live feedback
            if (this.canvasEl) {
                const colTemplate = [ROW_HEADER_WIDTH + 'px', ...this.data.columns.map((c) => c.width + 'px')].join(' ');
                this.canvasEl.style.gridTemplateColumns = colTemplate;
                const totalWidth = this.computeTotalWidth();
                this.canvasEl.style.width = totalWidth / this.data.zoom + 'px';
            }
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.body.style.cursor = '';
            this.scheduleSave();
            this.renderGrid();
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    private startRowResize(e: MouseEvent, rowIndex: number) {
        e.preventDefault();
        const startY = e.clientY;
        const origH = this.data.rows[rowIndex].height;
        document.body.style.cursor = 'row-resize';

        const onMove = (ev: MouseEvent) => {
            const delta = ev.clientY - startY;
            const newH = Math.max(40, Math.round(origH + delta));
            this.data.rows[rowIndex].height = newH;
            if (this.canvasEl) {
                const rowTemplate = [COL_HEADER_HEIGHT + 'px', ...this.data.rows.map((r) => r.height + 'px')].join(' ');
                this.canvasEl.style.gridTemplateRows = rowTemplate;
            }
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.body.style.cursor = '';
            this.scheduleSave();
            this.renderGrid();
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }
}

export default PlotgridView;
