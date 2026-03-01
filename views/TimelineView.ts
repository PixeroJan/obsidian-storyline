import { ItemView, WorkspaceLeaf, TFile, Modal, Setting, Notice, Menu } from 'obsidian';
import * as obsidian from 'obsidian';
import { Scene, SceneFilter, SortConfig, STATUS_CONFIG, SceneStatus, BUILTIN_BEAT_SHEETS, BeatSheetTemplate, TIMELINE_MODE_LABELS, TIMELINE_MODE_ICONS, TIMELINE_MODES, TimelineMode } from '../models/Scene';
import { openConfirmModal } from '../components/ConfirmModal';
import { SceneManager } from '../services/SceneManager';
import { SceneCardComponent } from '../components/SceneCard';
import { InspectorComponent } from '../components/Inspector';
import { QuickAddModal } from '../components/QuickAddModal';
import { renderViewSwitcher } from '../components/ViewSwitcher';
import { enableDragToPan } from '../components/DragToPan';
import type SceneCardsPlugin from '../main';

import { TIMELINE_VIEW_TYPE } from '../constants';
import { applyMobileClass } from '../components/MobileAdapter';

/**
 * Timeline ordering mode
 */
type TimelineOrder = 'reading' | 'chronological';

/**
 * Swimlane grouping options
 */
type SwimlaneGroupBy = 'pov' | 'location' | 'tag';

/**
 * Timeline View - shows scenes in chronological order with optional swimlanes
 */
export class TimelineView extends ItemView {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;
    private cardComponent: SceneCardComponent;
    private inspectorComponent: InspectorComponent | null = null;
    private selectedScene: Scene | null = null;
    private zoomLevel = 1;
    private rootContainer: HTMLElement | null = null;
    /** When true, display multi-lane swimlane view instead of single-column */
    private swimlaneMode = false;
    /** How to group lanes in swimlane mode */
    private swimlaneGroupBy: SwimlaneGroupBy = 'pov';
    /** Whether to sort by reading order (sequence) or chronological order */
    private timelineOrder: TimelineOrder = 'reading';

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin, sceneManager: SceneManager) {
        super(leaf);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
        this.cardComponent = new SceneCardComponent(plugin);
    }

    getViewType(): string {
        return TIMELINE_VIEW_TYPE;
    }

    getDisplayText(): string {
        const title = this.plugin?.sceneManager?.activeProject?.title;
        return title ? `StoryLine - ${title}` : 'StoryLine';
    }

    getIcon(): string {
        return 'clock';
    }

    async onOpen(): Promise<void> {
        this.plugin.storyLeaf = this.leaf;
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('story-line-timeline-container');
        applyMobileClass(container);
        this.rootContainer = container;

        await this.sceneManager.initialize();
        this.renderView(container);
    }

    async onClose(): Promise<void> {}

    private isNoteScene(scene: Scene): boolean {
        const value = (scene as Scene & { corkboardNote?: unknown }).corkboardNote;
        if (value === true) return true;
        if (value === false || value === undefined || value === null) return false;
        if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
        if (typeof value === 'number') return value === 1;
        return false;
    }

    private renderView(container: HTMLElement): void {
        container.empty();

        // Toolbar
        const toolbar = container.createDiv('story-line-toolbar');
        const titleRow = toolbar.createDiv('story-line-title-row');
        titleRow.createEl('h3', { cls: 'story-line-view-title', text: 'StoryLine' });
        // project name shown in top-center only; no inline project selector here

        // View switcher tabs
        renderViewSwitcher(toolbar, TIMELINE_VIEW_TYPE, this.plugin, this.leaf);

        const controls = toolbar.createDiv('story-line-toolbar-controls');

        // Add scene button
        const addBtn = controls.createEl('button', {
            cls: 'mod-cta story-line-add-btn',
            text: '+ New Scene'
        });
        addBtn.addEventListener('click', () => this.openQuickAdd());

        // Add acts/chapters button
        const structBtn = controls.createEl('button', {
            cls: 'clickable-icon',
            attr: { 'aria-label': 'Add acts or chapters' }
        });
        obsidian.setIcon(structBtn, 'columns-3');
        structBtn.addEventListener('click', () => this.openStructureModal());

        // Swimlane toggle
        const swimToggle = controls.createEl('button', {
            cls: `clickable-icon${this.swimlaneMode ? ' is-active' : ''}`,
            attr: { 'aria-label': this.swimlaneMode ? 'Switch to linear' : 'Switch to swimlanes', title: this.swimlaneMode ? 'Linear mode' : 'Swimlane mode' },
        });
        obsidian.setIcon(swimToggle, 'columns-2');
        swimToggle.addEventListener('click', () => {
            this.swimlaneMode = !this.swimlaneMode;
            this.refresh();
        });

        // Reading order / Chronological order toggle
        const orderSelect = controls.createEl('select', {
            cls: 'dropdown story-line-order-select',
            attr: { 'aria-label': 'Scene ordering' },
        });
        orderSelect.addEventListener('keydown', (e: KeyboardEvent) => e.stopPropagation());
        const orderOptions: { value: TimelineOrder; label: string }[] = [
            { value: 'reading', label: 'Reading Order' },
            { value: 'chronological', label: 'Chronological Order' },
        ];
        for (const opt of orderOptions) {
            const el = orderSelect.createEl('option', { text: opt.label });
            el.value = opt.value;
            if (opt.value === this.timelineOrder) el.selected = true;
        }
        orderSelect.addEventListener('change', () => {
            this.timelineOrder = orderSelect.value as TimelineOrder;
            this.refresh();
        });

        // Swimlane group-by dropdown (only visible in swimlane mode)
        if (this.swimlaneMode) {
            const groupSelect = controls.createEl('select', {
                cls: 'dropdown story-line-swimlane-group-select',
                attr: { 'aria-label': 'Group lanes by' },
            });
            groupSelect.addEventListener('keydown', (e: KeyboardEvent) => e.stopPropagation());
            const options: { value: SwimlaneGroupBy; label: string }[] = [
                { value: 'pov', label: 'By POV' },
                { value: 'location', label: 'By Location' },
                { value: 'tag', label: 'By Tag' },
            ];
            for (const opt of options) {
                const el = groupSelect.createEl('option', { text: opt.label });
                el.value = opt.value;
                if (opt.value === this.swimlaneGroupBy) el.selected = true;
            }
            groupSelect.addEventListener('change', () => {
                this.swimlaneGroupBy = groupSelect.value as SwimlaneGroupBy;
                this.refresh();
            });
        }

        // Zoom controls
        const zoomOut = controls.createEl('button', {
            cls: 'clickable-icon',
            attr: { 'aria-label': 'Zoom out' },
            text: '−'
        });
        zoomOut.addEventListener('click', () => {
            this.zoomLevel = Math.max(0.5, this.zoomLevel - 0.25);
            this.refreshTimeline(container);
        });

        controls.createSpan({
            cls: 'story-line-zoom-level',
            text: `${Math.round(this.zoomLevel * 100)}%`
        });

        const zoomIn = controls.createEl('button', {
            cls: 'clickable-icon',
            attr: { 'aria-label': 'Zoom in' },
            text: '+'
        });
        zoomIn.addEventListener('click', () => {
            this.zoomLevel = Math.min(3, this.zoomLevel + 0.25);
            this.refreshTimeline(container);
        });

        // Refresh button
        const refreshBtn = controls.createEl('button', {
            cls: 'clickable-icon',
            attr: { 'aria-label': 'Refresh' }
        });
        obsidian.setIcon(refreshBtn, 'refresh-cw');
        refreshBtn.addEventListener('click', async () => {
            await this.sceneManager.initialize();
            this.refresh();
        });

        // Main content area (timeline + inspector)
        const mainArea = container.createDiv('story-line-main-area');

        // Timeline content
        if (this.swimlaneMode) {
            this.renderSwimlaneTimeline(mainArea);
        } else {
            this.renderTimeline(mainArea);
        }

        // Inspector sidebar
        const inspectorEl = mainArea.createDiv('story-line-inspector-panel');
        inspectorEl.style.display = 'none';
        this.inspectorComponent = new InspectorComponent(
            inspectorEl,
            this.plugin,
            this.sceneManager,
            {
                onEdit: (scene) => this.openScene(scene),
                onDelete: (scene) => this.deleteScene(scene),
                onStatusChange: async (scene, status) => {
                    await this.sceneManager.updateScene(scene.filePath, { status });
                    this.refresh();
                },
            }
        );
    }

    private renderTimeline(container: HTMLElement): void {
        // Remove old timeline if exists
        const existing = container.querySelector('.story-line-timeline');
        if (existing) existing.remove();

        const timelineEl = container.createDiv('story-line-timeline');
        const sortField = this.timelineOrder === 'chronological' ? 'chronologicalOrder' : 'sequence';
        const scenes = this.sceneManager.getFilteredScenes(
            undefined,
            { field: sortField, direction: 'asc' }
        ).filter(scene => !this.isNoteScene(scene));

        // Precompute date/time validation flags for each scene index so rendering is consistent
        // Scenes with non-linear timeline modes (flashback, dream, mythic, etc.) are exempt from
        // date-order warnings — but are still rendered with their mode badge.
        const EXEMPT_FROM_DATE_ORDER_SET = new Set<string | undefined>([
            'flashback', 'flash_forward', 'dream', 'mythic', 'circular', 'simultaneous',
        ]);
        const dateTs = scenes.map(s => this.parseSceneDateTimestamp(s));
        const timeTs = scenes.map(s => this.parseSceneTimeTimestamp(s));
        const dateInvalidFlags = scenes.map((s, idx) => {
            if (EXEMPT_FROM_DATE_ORDER_SET.has(s.timeline_mode)) return false;
            const prev = idx > 0 ? dateTs[idx - 1] : null;
            const curr = dateTs[idx];
            const next = idx < scenes.length - 1 ? dateTs[idx + 1] : null;
            // Also exempt if the adjacent scene is exempt
            if (prev !== null && curr !== null && prev > curr) {
                if (!EXEMPT_FROM_DATE_ORDER_SET.has(scenes[idx - 1]?.timeline_mode)) return true;
            }
            if (next !== null && curr !== null && curr > next) {
                if (!EXEMPT_FROM_DATE_ORDER_SET.has(scenes[idx + 1]?.timeline_mode)) return true;
            }
            return false;
        });
        const timeInvalidFlags = scenes.map((s, idx) => {
            if (EXEMPT_FROM_DATE_ORDER_SET.has(s.timeline_mode)) return false;
            const prevDate = idx > 0 ? dateTs[idx - 1] : null;
            const nextDate = idx < scenes.length - 1 ? dateTs[idx + 1] : null;
            const prevTime = idx > 0 ? timeTs[idx - 1] : null;
            const currTime = timeTs[idx];
            const nextTime = idx < scenes.length - 1 ? timeTs[idx + 1] : null;

            let invalid = false;
            if (prevTime !== null && currTime !== null) {
                if (!EXEMPT_FROM_DATE_ORDER_SET.has(scenes[idx - 1]?.timeline_mode)) {
                    const datesEqual = (prevDate === null && dateTs[idx] === null) || (prevDate !== null && dateTs[idx] !== null && prevDate === dateTs[idx]);
                    if (datesEqual && prevTime > currTime) invalid = true;
                }
            }
            if (nextTime !== null && currTime !== null) {
                if (!EXEMPT_FROM_DATE_ORDER_SET.has(scenes[idx + 1]?.timeline_mode)) {
                    const datesEqual = (nextDate === null && dateTs[idx] === null) || (nextDate !== null && dateTs[idx] !== null && nextDate === dateTs[idx]);
                    if (datesEqual && currTime > nextTime) invalid = true;
                }
            }
            return invalid;
        });

        // Also get defined acts so we can show empty act dividers
        const definedActs = this.sceneManager.getDefinedActs();
        const actsWithScenes = new Set<number>();
        for (const s of scenes) {
            if (s.act !== undefined) actsWithScenes.add(Number(s.act));
        }

        if (scenes.length === 0 && definedActs.length === 0) {
            const empty = timelineEl.createDiv('story-line-empty');
            empty.createEl('p', { text: 'No scenes found.' });
            empty.createEl('p', { text: 'Click "+ New Scene" to create your first scene, or use the structure button to set up acts and chapters.' });
            return;
        }

        // ── Vertical timeline with scene cards ──
        const track = timelineEl.createDiv('timeline-track');

        let lastAct: string | undefined = undefined;

        // For drag & drop
        let dragIndex: number | null = null;
        let dropIndex: number | null = null;

        const refreshDropIndicators = () => {
            const entries = track.querySelectorAll('.timeline-entry');
            entries.forEach((el, idx) => {
                el.classList.toggle('drop-above', dropIndex === idx);
                el.classList.toggle('drop-below', dropIndex === idx + 1);
            });
        };

        const handleDrop = async (fromIdx: number, toIdx: number) => {
            if (fromIdx === toIdx || fromIdx === toIdx - 1) return;

            const moved = scenes.splice(fromIdx, 1)[0];
            const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
            scenes.splice(insertAt, 0, moved);

            // Update the field matching the current ordering mode
            const field = this.timelineOrder === 'chronological' ? 'chronologicalOrder' : 'sequence';
            for (let i = 0; i < scenes.length; i++) {
                await this.sceneManager.updateScene(scenes[i].filePath, { [field]: i + 1 } as Partial<Scene>);
            }
            this.refresh();
        };

        // Build a combined list: scenes + empty act placeholders
        // Group scenes by act for interleaving empty acts
        const scenesByAct = new Map<number, Scene[]>();
        const noActScenes: Scene[] = [];
        for (const s of scenes) {
            if (s.act !== undefined) {
                const actNum = Number(s.act);
                if (!scenesByAct.has(actNum)) scenesByAct.set(actNum, []);
                scenesByAct.get(actNum)!.push(s);
            } else {
                noActScenes.push(s);
            }
        }

        // Merge all act numbers (from scenes + defined)
        const allActs = new Set([...definedActs, ...actsWithScenes]);
        const sortedActs = Array.from(allActs).sort((a, b) => a - b);

        // Render scenes in sequence order and insert act dividers when act changes
        let lastRenderedAct: number | undefined = undefined;
        for (let globalIdx = 0; globalIdx < scenes.length; globalIdx++) {
            const scene = scenes[globalIdx];
            const currentAct = scene.act !== undefined ? Number(scene.act) : undefined;
            if (currentAct !== lastRenderedAct) {
                // Insert act divider
                const beatLabel = currentAct !== undefined ? this.sceneManager.getActLabel(currentAct) : undefined;
                const actLabel = currentAct !== undefined
                    ? (beatLabel ? `Act ${currentAct} — ${beatLabel}` : `Act ${currentAct}`)
                    : 'No Act';
                const divider = track.createDiv('timeline-act-divider');
                divider.createSpan({ cls: 'timeline-act-label', text: actLabel });

                if (currentAct !== undefined) {
                    const addInAct = divider.createEl('button', {
                        cls: 'timeline-act-add-btn clickable-icon',
                        attr: { 'aria-label': `Add scene to ${actLabel}` }
                    });
                    obsidian.setIcon(addInAct, 'plus');
                    addInAct.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.openQuickAdd(currentAct);
                    });
                }
                lastRenderedAct = currentAct;
            }

            this.renderTimelineEntry(track, scene, globalIdx, scenes, dragIndex, dropIndex, refreshDropIndicators, handleDrop, (di) => { dragIndex = di; }, (di) => { dropIndex = di; }, dateInvalidFlags[globalIdx], timeInvalidFlags[globalIdx]);
        }

        // Render any defined acts that have no scenes (as empty placeholders)
        for (const actNum of sortedActs) {
            if (!actsWithScenes.has(Number(actNum))) {
                const beatLabel = this.sceneManager.getActLabel(actNum);
                const actLabel = beatLabel ? `Act ${actNum} — ${beatLabel}` : `Act ${actNum}`;
                const divider = track.createDiv('timeline-act-divider');
                divider.createSpan({ cls: 'timeline-act-label', text: actLabel });
                const addInAct = divider.createEl('button', {
                    cls: 'timeline-act-add-btn clickable-icon',
                    attr: { 'aria-label': `Add scene to ${actLabel}` }
                });
                obsidian.setIcon(addInAct, 'plus');
                addInAct.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openQuickAdd(actNum);
                });
                const emptyEntry = track.createDiv('timeline-entry timeline-entry-empty');
                const emptyCard = emptyEntry.createDiv('timeline-entry-card');
                const card = emptyCard.createDiv('timeline-card timeline-card-empty');
                card.createDiv({ cls: 'timeline-card-title', text: `No scenes in ${actLabel}` });
                card.createEl('p', { cls: 'timeline-card-hint', text: 'Click + to add a scene' });
                card.addEventListener('click', () => this.openQuickAdd(actNum));
            }
        }
    }

    // ────────────────────────────────────────────────────────────
    //  Swimlane (multi-lane) renderer
    // ────────────────────────────────────────────────────────────

    /**
     * Render the swimlane timeline: multiple vertical lanes side-by-side,
     * each with the same dot-line-card look as the linear mode.
     */
    private renderSwimlaneTimeline(container: HTMLElement): void {
        // Remove old timeline if exists
        const existing = container.querySelector('.story-line-timeline');
        if (existing) existing.remove();

        const timelineEl = container.createDiv('story-line-timeline swimlane-timeline');
        enableDragToPan(timelineEl);
        const sortField = this.timelineOrder === 'chronological' ? 'chronologicalOrder' : 'sequence';
        const scenes = this.sceneManager.getFilteredScenes(
            undefined,
            { field: sortField, direction: 'asc' }
        ).filter(scene => !this.isNoteScene(scene));

        if (scenes.length === 0) {
            const empty = timelineEl.createDiv('story-line-empty');
            empty.createEl('p', { text: 'No scenes found.' });
            empty.createEl('p', { text: 'Click "+ New Scene" to create your first scene.' });
            return;
        }

        // 1. Determine lane keys based on groupBy
        const laneKeysSet = new Set<string>();
        for (const scene of scenes) {
            const keys = this.getSceneLaneKeys(scene);
            for (const k of keys) laneKeysSet.add(k);
        }
        const laneKeys = Array.from(laneKeysSet).sort();
        if (laneKeys.length === 0) laneKeys.push('(none)');

        // 2. Build row definitions — one row per scene in sequence order,
        //    with act dividers injected when the act changes.
        interface RowDef {
            type: 'act-divider' | 'scene';
            actLabel?: string;
            actNum?: number;
            scene?: Scene;
            globalIdx?: number;
        }
        const rows: RowDef[] = [];
        let lastAct: number | undefined = undefined;
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const currentAct = scene.act !== undefined ? Number(scene.act) : undefined;
            if (currentAct !== lastAct) {
                const beatLabel = currentAct !== undefined ? this.sceneManager.getActLabel(currentAct) : undefined;
                const label = currentAct !== undefined
                    ? (beatLabel ? `Act ${currentAct} — ${beatLabel}` : `Act ${currentAct}`)
                    : 'No Act';
                rows.push({ type: 'act-divider', actLabel: label, actNum: currentAct });
                lastAct = currentAct;
            }
            rows.push({ type: 'scene', scene, globalIdx: i });
        }

        // 3. Build the grid container
        const grid = timelineEl.createDiv('swimlane-grid');
        //    CSS grid: first column = sequence axis, then one column per lane
        const colTemplate = `80px repeat(${laneKeys.length}, minmax(180px, 1fr))`;
        grid.style.gridTemplateColumns = colTemplate;

        // 4. Sticky header row
        // Corner cell (sequence axis header)
        const corner = grid.createDiv('swimlane-corner');
        corner.textContent = '#';

        // Lane headers
        for (const lane of laneKeys) {
            const header = grid.createDiv('swimlane-lane-header');
            header.textContent = lane;
            header.setAttribute('title', lane);
        }

        // 5. Render each row
        for (const row of rows) {
            if (row.type === 'act-divider') {
                // Act divider spans the full width
                const divider = grid.createDiv('swimlane-act-divider');
                divider.style.gridColumn = `1 / -1`;
                const label = divider.createSpan({ cls: 'timeline-act-label', text: row.actLabel || '' });
                if (row.actNum !== undefined) {
                    const addBtn = divider.createEl('button', {
                        cls: 'timeline-act-add-btn clickable-icon',
                        attr: { 'aria-label': `Add scene to ${row.actLabel}` },
                    });
                    obsidian.setIcon(addBtn, 'plus');
                    const actForClosure = row.actNum;
                    addBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.openQuickAdd(actForClosure);
                    });
                }
                continue;
            }

            const scene = row.scene!;
            const act = scene.act !== undefined ? String(scene.act).padStart(2, '0') : '??';
            const seq = scene.sequence !== undefined ? String(scene.sequence).padStart(2, '0') : '??';
            const chronoSeq = scene.chronologicalOrder !== undefined ? String(scene.chronologicalOrder).padStart(2, '0') : null;

            // Sequence axis cell
            const seqCell = grid.createDiv('swimlane-seq-cell');
            seqCell.classList.add('timeline-seq-clickable');
            seqCell.createSpan({ cls: 'timeline-seq-badge', text: `${act}-${seq}` });
            // Show chronological order badge when it differs from reading order
            if (chronoSeq !== null && scene.chronologicalOrder !== scene.sequence) {
                const chronoBadge = seqCell.createSpan({ cls: 'timeline-chrono-badge', text: `C${chronoSeq}` });
                chronoBadge.setAttribute('title', `Chronological order: ${chronoSeq}`);
            }
            if (scene.storyDate) {
                seqCell.createSpan({ cls: 'timeline-date-badge', text: scene.storyDate });
            }
            if (scene.storyTime) {
                seqCell.createSpan({ cls: 'timeline-time-badge', text: scene.storyTime });
            }
            seqCell.setAttribute('title', 'Click to edit date/time');
            seqCell.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openTimeEditModal(scene);
            });

            // Determine which lane this scene belongs to
            const sceneKeys = this.getSceneLaneKeys(scene);
            const primaryLane = sceneKeys[0] || '(none)';

            // Render one cell per lane
            for (let laneIdx = 0; laneIdx < laneKeys.length; laneIdx++) {
                const lane = laneKeys[laneIdx];
                const cell = grid.createDiv('swimlane-lane-cell');

                if (lane === primaryLane) {
                    // This lane gets the scene card
                    this.renderSwimlaneCard(cell, scene);
                }
                // else: empty cell — visual gap
            }
        }
    }

    /**
     * Get the lane key(s) this scene belongs to, based on current swimlaneGroupBy.
     */
    private getSceneLaneKeys(scene: Scene): string[] {
        switch (this.swimlaneGroupBy) {
            case 'pov':
                return [scene.pov || '(no POV)'];
            case 'location':
                return [scene.location || '(no location)'];
            case 'tag':
                if (scene.tags && scene.tags.length > 0) return [scene.tags[0]];
                return ['(no tag)'];
            default:
                return ['(none)'];
        }
    }

    /**
     * Render a compact scene card inside a swimlane cell.
     * Uses the same visual language as the linear timeline cards.
     */
    private renderSwimlaneCard(cell: HTMLElement, scene: Scene): void {
        // Dot (status indicator)
        const dotWrap = cell.createDiv('swimlane-dot-wrap');
        const dot = dotWrap.createDiv('timeline-dot');
        dot.setAttribute('data-status', scene.status || 'idea');

        // Card
        const card = cell.createDiv('timeline-card swimlane-card');
        if (this.selectedScene?.filePath === scene.filePath) {
            card.addClass('selected');
        }
        card.dataset.path = scene.filePath;

        card.createDiv({ cls: 'timeline-card-title', text: scene.title || 'Untitled' });

        // Timeline mode badge (for non-linear scenes)
        const slMode = scene.timeline_mode || 'linear';
        if (slMode !== 'linear') {
            const modeBadge = card.createDiv({ cls: `timeline-mode-badge timeline-mode-${slMode}` });
            const modeIcon = modeBadge.createSpan();
            obsidian.setIcon(modeIcon, TIMELINE_MODE_ICONS[slMode] || 'clock');
            modeBadge.createSpan({ text: ` ${TIMELINE_MODE_LABELS[slMode]}` });
            if (scene.timeline_strand) {
                modeBadge.createSpan({ cls: 'timeline-strand-label', text: ` · ${scene.timeline_strand}` });
            }
        }

        const meta = card.createDiv('timeline-card-meta');
        // Show the field that is NOT the grouping field (avoid redundancy)
        if (this.swimlaneGroupBy !== 'pov' && scene.pov) {
            meta.createSpan({ cls: 'timeline-card-pov', text: `POV: ${scene.pov}` });
        }
        if (this.swimlaneGroupBy !== 'location' && scene.location) {
            const locSpan = meta.createSpan({ cls: 'timeline-card-location' });
            obsidian.setIcon(locSpan, 'map-pin');
            locSpan.appendText(' ' + scene.location);
        }
        if (this.swimlaneGroupBy !== 'tag' && scene.tags?.length) {
            meta.createSpan({ cls: 'timeline-card-pov', text: scene.tags.join(', ') });
        }

        // Status + word count footer
        const footer = card.createDiv('timeline-card-footer');
        const statusCfg = STATUS_CONFIG[scene.status || 'idea'];
        const statusBadge = footer.createSpan({ cls: 'timeline-card-status', text: statusCfg.label });
        statusBadge.style.color = statusCfg.color;

        if (scene.wordcount) {
            footer.createSpan({ cls: 'timeline-card-wc', text: `${scene.wordcount} words` });
        }

        // Click / double-click / context menu
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectScene(scene);
        });
        card.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.openScene(scene);
        });
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(scene, e);
        });

        card.style.transform = `scale(${this.zoomLevel})`;
        card.style.transformOrigin = 'left top';
    }

    /**
     * Render a single timeline entry (scene card on the timeline)
     */
    private renderTimelineEntry(
        track: HTMLElement,
        scene: Scene,
        i: number,
        scenes: Scene[],
        dragIndex: number | null,
        dropIndex: number | null,
        refreshDropIndicators: () => void,
        handleDrop: (from: number, to: number) => Promise<void>,
        setDragIndex: (v: number | null) => void,
        setDropIndex: (v: number | null) => void,
        dateInvalid: boolean,
        timeInvalid: boolean,
    ): void {
        const entry = track.createDiv('timeline-entry');
        entry.setAttr('draggable', 'true');
        entry.dataset.idx = String(i);
        entry.dataset.path = scene.filePath;

        // Highlight if selected
        if (this.selectedScene?.filePath === scene.filePath) {
            entry.addClass('selected');
        }

        // Drag events
        entry.addEventListener('dragstart', (e) => {
            setDragIndex(i);
            entry.classList.add('dragging');
            e.dataTransfer?.setData('text/plain', String(i));
            e.dataTransfer?.setDragImage(entry, 20, 20);
        });
        entry.addEventListener('dragend', () => {
            setDragIndex(null);
            setDropIndex(null);
            entry.classList.remove('dragging');
            refreshDropIndicators();
        });
        entry.addEventListener('dragover', (e) => {
            e.preventDefault();
            const rect = entry.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            setDropIndex((e.clientY < midY) ? i : i + 1);
            refreshDropIndicators();
        });
        entry.addEventListener('dragleave', () => {
            setDropIndex(null);
            refreshDropIndicators();
        });
        entry.addEventListener('drop', async (e) => {
            e.preventDefault();
            const fromStr = e.dataTransfer?.getData('text/plain');
            if (fromStr !== undefined && fromStr !== null) {
                const from = Number(fromStr);
                await handleDrop(from, i);
            }
        });

        // Left column: sequence badge + date/time (clickable to edit)
        const seqCol = entry.createDiv('timeline-entry-seq');
        seqCol.classList.add('timeline-seq-clickable');
        const act = scene.act !== undefined ? String(scene.act).padStart(2, '0') : '??';
        const seq = scene.sequence !== undefined ? String(scene.sequence).padStart(2, '0') : '??';
        const chronoSeq = scene.chronologicalOrder !== undefined ? String(scene.chronologicalOrder).padStart(2, '0') : null;

        seqCol.createSpan({ cls: 'timeline-seq-badge', text: `${act}-${seq}` });

        // Show chronological order badge when it differs from reading order
        if (chronoSeq !== null && scene.chronologicalOrder !== scene.sequence) {
            const chronoBadge = seqCol.createSpan({ cls: 'timeline-chrono-badge', text: `C${chronoSeq}` });
            chronoBadge.setAttribute('title', `Chronological order: ${chronoSeq}`);
        }

        const dateBadge = scene.storyDate ? seqCol.createSpan({ cls: 'timeline-date-badge', text: scene.storyDate }) : null;
        const timeBadge = scene.storyTime ? seqCol.createSpan({ cls: 'timeline-time-badge', text: scene.storyTime }) : null;
        if (!scene.storyDate && !scene.storyTime) {
            const addHint = seqCol.createSpan({ cls: 'timeline-add-time-hint' });
            obsidian.setIcon(addHint, 'clock');
        }

        seqCol.setAttribute('title', 'Click to edit date/time');
        seqCol.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openTimeEditModal(scene);
        });

        // Center: dot + line
        const dotCol = entry.createDiv('timeline-entry-dot-col');
        const dot = dotCol.createDiv('timeline-dot');
        dot.setAttribute('data-status', scene.status || 'idea');

        // Right column: card
        const cardCol = entry.createDiv('timeline-entry-card');
        const card = cardCol.createDiv('timeline-card');

        card.createDiv({ cls: 'timeline-card-title', text: scene.title || 'Untitled' });

        // Timeline mode badge (for non-linear scenes)
        const tlMode = scene.timeline_mode || 'linear';
        if (tlMode !== 'linear') {
            const modeBadge = card.createDiv({ cls: `timeline-mode-badge timeline-mode-${tlMode}` });
            const modeIcon = modeBadge.createSpan();
            obsidian.setIcon(modeIcon, TIMELINE_MODE_ICONS[tlMode] || 'clock');
            modeBadge.createSpan({ text: ` ${TIMELINE_MODE_LABELS[tlMode]}` });
            if (scene.timeline_strand) {
                modeBadge.createSpan({ cls: 'timeline-strand-label', text: ` · ${scene.timeline_strand}` });
            }
        }

        const meta = card.createDiv('timeline-card-meta');
        if (scene.pov) {
            meta.createSpan({ cls: 'timeline-card-pov', text: `POV: ${scene.pov}` });
        }
        if (scene.location) {
            const locSpan = meta.createSpan({ cls: 'timeline-card-location' });
            obsidian.setIcon(locSpan, 'map-pin');
            locSpan.appendText(' ' + scene.location);
        }
        if (scene.timeline) {
            const timeSpan = meta.createSpan({ cls: 'timeline-card-time' });
            obsidian.setIcon(timeSpan, 'calendar-days');
            timeSpan.appendText(' ' + scene.timeline);
        }
        if (scene.storyDate || scene.storyTime) {
            const dateSpan = meta.createSpan({ cls: 'timeline-card-time' });
            obsidian.setIcon(dateSpan, 'calendar-days');
            dateSpan.appendText(' ' + `${scene.storyDate || ''} ${scene.storyTime || ''}`.trim());
        }

        if (dateInvalid && dateBadge) {
            dateBadge.addClass('timeline-date-invalid');
            dateBadge.setAttr('title', 'Date out of order');
        }
        if (timeInvalid && timeBadge) {
            timeBadge.addClass('timeline-time-invalid');
            timeBadge.setAttr('title', 'Time out of order');
        }

        if (scene.conflict) {
            card.createDiv({
                cls: 'timeline-card-conflict',
                text: scene.conflict.length > 100
                    ? scene.conflict.substring(0, 100) + '...'
                    : scene.conflict
            });
        }

        // Status + word count footer
        const footer = card.createDiv('timeline-card-footer');
        const statusCfg = STATUS_CONFIG[scene.status || 'idea'];
        const statusBadge = footer.createSpan({
            cls: 'timeline-card-status',
            text: statusCfg.label,
        });
        statusBadge.style.color = statusCfg.color;

        if (scene.wordcount) {
            footer.createSpan({
                cls: 'timeline-card-wc',
                text: `${scene.wordcount} words`
            });
        }

        // Characters
        if (scene.characters?.length) {
            const chars = card.createDiv('timeline-card-chars');
            scene.characters.forEach(c => {
                chars.createSpan({ cls: 'timeline-char-tag', text: c });
            });
        }

        // Click to select (show inspector), double-click to open
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectScene(scene);
        });
        card.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.openScene(scene);
        });

        // Right-click context menu
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(scene, e);
        });

        card.style.transform = `scale(${this.zoomLevel})`;
        card.style.transformOrigin = 'left center';
    }

    /**
     * Try to produce a numeric timestamp for a scene based on storyDate/storyTime or "Day N" style strings.
     * Returns null when no reliable timestamp can be derived.
     */
    private parseSceneTimestamp(scene: Scene): number | null {
        try {
            const datePart = scene.storyDate?.trim();
            const timePart = scene.storyTime?.trim();

            if (datePart || timePart) {
                const dtStr = [datePart || '', timePart || ''].join(' ').trim();
                const parsed = Date.parse(dtStr);
                if (!isNaN(parsed)) return parsed;

                // Try some common variants (e.g. "Day 1") by extracting numbers
                const dayMatch = (datePart || '').match(/dag\s*(\d+)/i) || (scene.timeline || '').match(/dag\s*(\d+)/i);
                if (dayMatch) {
                    const dayNum = parseInt(dayMatch[1], 10);
                    if (!isNaN(dayNum)) return dayNum * 24 * 60 * 60 * 1000;
                }

                // If only a time like 14:30 is provided, parse it relative to epoch
                if (!datePart && timePart) {
                    const t = Date.parse('1970-01-01 ' + timePart);
                    if (!isNaN(t)) return t;
                }
            }

            // Fallback: try timeline field for Day N
            const tl = scene.timeline || '';
            const tlMatch = tl.match(/dag\s*(\d+)/i) || tl.match(/day\s*(\d+)/i);
            if (tlMatch) {
                const n = parseInt(tlMatch[1], 10);
                if (!isNaN(n)) return n * 24 * 60 * 60 * 1000;
            }
        } catch (e) {
            // ignore
        }
        return null;
    }

    /**
     * Parse date-only component into a numeric value (midnight epoch or day-count). Returns null if unavailable.
     */
    private parseSceneDateTimestamp(scene: Scene): number | null {
        try {
            const datePart = scene.storyDate?.trim();
            if (datePart) {
                const parsed = Date.parse(datePart);
                if (!isNaN(parsed)) return new Date(new Date(parsed).toDateString()).getTime();
                const dayMatch = datePart.match(/dag\s*(\d+)/i) || (scene.timeline || '').match(/dag\s*(\d+)/i);
                if (dayMatch) {
                    const dayNum = parseInt(dayMatch[1], 10);
                    if (!isNaN(dayNum)) return dayNum * 24 * 60 * 60 * 1000;
                }
            }
        } catch (e) {
            // ignore
        }
        return null;
    }

    /**
     * Parse time-only component into milliseconds-since-midnight. Returns null if unavailable.
     */
    private parseSceneTimeTimestamp(scene: Scene): number | null {
        try {
            let timePart = scene.storyTime?.trim();
            if (timePart) {
                // Normalize common separators (accept '11:20' and '11.20')
                timePart = timePart.replace(/\./g, ':');
                // Accept HH:MM or HH:MM:SS
                const m = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
                if (m) {
                    const h = parseInt(m[1], 10);
                    const mm = parseInt(m[2], 10);
                    const ss = m[3] ? parseInt(m[3], 10) : 0;
                    if (!isNaN(h) && !isNaN(mm)) {
                        const val = (h * 3600 + mm * 60 + ss) * 1000;
                        
                        return val;
                    }
                }
                // Try parsing as Date on epoch day
                const parsed = Date.parse('1970-01-01 ' + timePart);
                if (!isNaN(parsed)) {
                    
                    return parsed;
                }
            }
        } catch (e) {
            // ignore
        }
        return null;
    }

    /**
     * Compare two scenes by their parsed timestamp. Returns -1 if a < b, 1 if a > b, 0 if equal or unknown.
     */
    private compareSceneOrder(a: Scene, b: Scene): number {
        const ta = this.parseSceneTimestamp(a);
        const tb = this.parseSceneTimestamp(b);
        if (ta !== null && tb !== null) {
            if (ta < tb) return -1;
            if (ta > tb) return 1;
            return 0;
        }
        return 0;
    }

    private formatSceneTime(scene: Scene): string {
        const d = scene.storyDate ? scene.storyDate : '';
        const t = scene.storyTime ? (' ' + scene.storyTime) : '';
        if (d || t) return (d + t).trim();
        if (scene.timeline) return scene.timeline;
        return '—';
    }

    /**
     * Select a scene and show it in the inspector
     */
    private selectScene(scene: Scene): void {
        // Deselect previous
        this.rootContainer?.querySelectorAll('.timeline-entry.selected').forEach(el => {
            el.removeClass('selected');
        });

        this.selectedScene = scene;

        // Highlight selected entry
        const entry = this.rootContainer?.querySelector(`[data-path="${CSS.escape(scene.filePath)}"]`);
        if (entry) entry.addClass('selected');

        // Show inspector
        this.inspectorComponent?.show(scene);
    }

    /**
     * Show context menu for a scene
     */
    private showContextMenu(scene: Scene, event: MouseEvent): void {
        const menu = new Menu();

        menu.addItem(item => {
            item.setTitle('Edit Scene')
                .setIcon('pencil')
                .onClick(() => this.openScene(scene));
        });

        menu.addItem(item => {
            item.setTitle('Edit Date/Time')
                .setIcon('clock')
                .onClick(() => this.openTimeEditModal(scene));
        });

        menu.addItem(item => {
            item.setTitle('Duplicate Scene')
                .setIcon('copy')
                .onClick(async () => {
                    await this.sceneManager.duplicateScene(scene.filePath);
                    this.refresh();
                });
        });

        menu.addSeparator();

        // Status submenu
        const statuses: SceneStatus[] = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];
        statuses.forEach(status => {
            menu.addItem(item => {
                item.setTitle(`Status: ${status}`)
                    .setChecked(scene.status === status)
                    .onClick(async () => {
                        await this.sceneManager.updateScene(scene.filePath, { status });
                        this.refresh();
                    });
            });
        });

        menu.addSeparator();

        menu.addItem(item => {
            item.setTitle('Delete Scene')
                .setIcon('trash')
                .onClick(async () => {
                    openConfirmModal(this.app, {
                        title: 'Delete Scene',
                        message: `Delete scene "${scene.title || 'Untitled'}"?`,
                        confirmLabel: 'Delete',
                        onConfirm: () => this.deleteScene(scene),
                    });
                });
        });

        menu.showAtMouseEvent(event);
    }

    /**
     * Delete a scene
     */
    private async deleteScene(scene: Scene): Promise<void> {
        await this.sceneManager.deleteScene(scene.filePath);
        if (this.selectedScene?.filePath === scene.filePath) {
            this.selectedScene = null;
            this.inspectorComponent?.hide();
        }
        this.refresh();
    }

    /**
     * Open the Quick Add modal, optionally pre-setting the act
     */
    private openQuickAdd(presetAct?: number): void {
        const modal = new QuickAddModal(
            this.app,
            this.plugin,
            this.sceneManager,
            async (sceneData, openAfter) => {
                if (presetAct !== undefined) {
                    sceneData.act = presetAct;
                }
                const file = await this.sceneManager.createScene(sceneData);
                this.refresh();
                if (openAfter) {
                    await this.app.workspace.getLeaf('tab').openFile(file);
                }
            }
        );
        modal.open();
    }

    /**
     * Open the structure modal to add/remove acts, chapters, and apply beat sheet templates
     */
    private openStructureModal(): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Manage Story Structure');

        const { contentEl } = modal;

        // ── Beat Sheet Templates section ──
        contentEl.createEl('h3', { text: 'Beat Sheet Templates' });
        contentEl.createEl('p', {
            cls: 'setting-item-description',
            text: 'Apply a template to pre-populate your act/chapter structure with named beats.'
        });

        const templateGrid = contentEl.createDiv('beat-sheet-grid');
        for (const template of BUILTIN_BEAT_SHEETS) {
            const card = templateGrid.createDiv('beat-sheet-card');
            card.createDiv({ cls: 'beat-sheet-card-name', text: template.name });
            card.createDiv({ cls: 'beat-sheet-card-summary', text: template.summary });

            const info = card.createDiv('beat-sheet-card-info');
            info.createSpan({ text: `${template.acts.length} acts` });
            info.createSpan({ text: ' · ' });
            info.createSpan({ text: `${template.beats.length} beats` });
            if (template.chapters.length > 0) {
                info.createSpan({ text: ' · ' });
                info.createSpan({ text: `${template.chapters.length} chapters` });
            }

            // Preview beats on hover / expandable
            const beatList = card.createDiv('beat-sheet-beats-preview');
            for (const beat of template.beats) {
                const beatItem = beatList.createDiv('beat-sheet-beat-item');
                beatItem.createSpan({ cls: 'beat-sheet-beat-act', text: `A${beat.act}` });
                beatItem.createSpan({ cls: 'beat-sheet-beat-label', text: beat.label });
                beatItem.createSpan({ cls: 'beat-sheet-beat-desc', text: beat.description });
            }

            const applyBtn = card.createEl('button', { text: 'Apply', cls: 'mod-cta beat-sheet-apply-btn' });
            applyBtn.addEventListener('click', async () => {
                await this.sceneManager.applyBeatSheet(template);
                renderActsList();
                renderChaptersList();
                new Notice(`Applied "${template.name}" template`);
            });
        }

        // ── Acts section ──
        contentEl.createEl('h3', { text: 'Acts' });
        contentEl.createEl('p', {
            cls: 'setting-item-description',
            text: 'Define acts for your story. Empty acts appear on the timeline even without scenes.'
        });

        const actsList = contentEl.createDiv('structure-list');
        const scenesPerAct = new Map<number, number>();
        for (const scene of this.sceneManager.getAllScenes()) {
            if (scene.act !== undefined) {
                const n = Number(scene.act);
                scenesPerAct.set(n, (scenesPerAct.get(n) || 0) + 1);
            }
        }

        const renderActsList = () => {
            actsList.empty();
            const acts = this.sceneManager.getDefinedActs();
            const actLabels = this.sceneManager.getActLabels();
            if (acts.length === 0) {
                actsList.createEl('p', { cls: 'structure-empty', text: 'No acts defined yet.' });
            }
            for (const act of acts) {
                const count = scenesPerAct.get(act) || 0;
                const label = actLabels[act];
                const row = actsList.createDiv('structure-row');
                const labelText = label ? `Act ${act} — ${label}` : `Act ${act}`;
                row.createSpan({ cls: 'structure-label', text: labelText });
                row.createSpan({ cls: 'structure-count', text: `${count} scene${count !== 1 ? 's' : ''}` });

                // Edit label button
                const editBtn = row.createEl('button', {
                    cls: 'clickable-icon structure-edit',
                    attr: { 'aria-label': `Edit label for Act ${act}` }
                });
                editBtn.textContent = '✎';
                editBtn.addEventListener('click', () => {
                    const input = row.querySelector('.structure-label-input') as HTMLInputElement;
                    if (input) { input.focus(); return; }
                    // Create inline edit
                    const labelSpan = row.querySelector('.structure-label') as HTMLElement;
                    if (!labelSpan) return;
                    labelSpan.style.display = 'none';
                    const editInput = document.createElement('input');
                    editInput.type = 'text';
                    editInput.value = label || '';
                    editInput.placeholder = 'e.g. Setup, Confrontation…';
                    editInput.className = 'structure-label-input';
                    row.insertBefore(editInput, labelSpan.nextSibling);
                    editInput.focus();
                    const commitEdit = async () => {
                        await this.sceneManager.setActLabel(act, editInput.value);
                        renderActsList();
                    };
                    editInput.addEventListener('blur', commitEdit);
                    editInput.addEventListener('keydown', (e: KeyboardEvent) => {
                        if (e.key === 'Enter') { e.preventDefault(); editInput.blur(); }
                        if (e.key === 'Escape') { labelSpan.style.display = ''; editInput.remove(); }
                    });
                });

                const removeBtn = row.createEl('button', {
                    cls: 'clickable-icon structure-remove',
                    attr: { 'aria-label': `Remove Act ${act}` }
                });
                removeBtn.textContent = '×';
                removeBtn.addEventListener('click', async () => {
                    await this.sceneManager.removeAct(act);
                    renderActsList();
                });
            }
        };
        renderActsList();

        const addActRow = contentEl.createDiv('structure-add-row');
        new Setting(addActRow)
            .setName('Add acts')
            .setDesc('Enter act numbers (e.g. "1,2,3,4,5")')
            .addText(text => {
                text.setPlaceholder('1,2,3,4,5');
                text.inputEl.addClass('structure-input');
            })
            .addButton(btn => {
                btn.setButtonText('Add').setCta().onClick(async () => {
                    const input = addActRow.querySelector('.structure-input') as HTMLInputElement;
                    if (!input?.value) return;
                    const nums = input.value.split(',')
                        .map(s => parseInt(s.trim()))
                        .filter(n => !isNaN(n) && n > 0);
                    if (nums.length === 0) {
                        new Notice('Enter valid act numbers (e.g. 1,2,3)');
                        return;
                    }
                    await this.sceneManager.addActs(nums);
                    input.value = '';
                    renderActsList();
                    new Notice(`Added ${nums.length} act(s)`);
                });
            });

        // ── Chapters section ──
        contentEl.createEl('h3', { text: 'Chapters' });
        contentEl.createEl('p', {
            cls: 'setting-item-description',
            text: 'Define chapters. Empty chapters appear when grouping by chapter.'
        });

        const chaptersList = contentEl.createDiv('structure-list');
        const scenesPerChapter = new Map<number, number>();
        for (const scene of this.sceneManager.getAllScenes()) {
            if (scene.chapter !== undefined) {
                const n = Number(scene.chapter);
                scenesPerChapter.set(n, (scenesPerChapter.get(n) || 0) + 1);
            }
        }

        const renderChaptersList = () => {
            chaptersList.empty();
            const chapters = this.sceneManager.getDefinedChapters();
            if (chapters.length === 0) {
                chaptersList.createEl('p', { cls: 'structure-empty', text: 'No chapters defined yet.' });
            }
            for (const ch of chapters) {
                const count = scenesPerChapter.get(ch) || 0;
                const row = chaptersList.createDiv('structure-row');
                row.createSpan({ cls: 'structure-label', text: `Chapter ${ch}` });
                row.createSpan({ cls: 'structure-count', text: `${count} scene${count !== 1 ? 's' : ''}` });
                const removeBtn = row.createEl('button', {
                    cls: 'clickable-icon structure-remove',
                    attr: { 'aria-label': `Remove Chapter ${ch}` }
                });
                removeBtn.textContent = '×';
                removeBtn.addEventListener('click', async () => {
                    await this.sceneManager.removeChapter(ch);
                    renderChaptersList();
                });
            }
        };
        renderChaptersList();

        const addChapterRow = contentEl.createDiv('structure-add-row');
        new Setting(addChapterRow)
            .setName('Add chapters')
            .setDesc('Enter chapter numbers (e.g. "1-10" or "1,2,3")')
            .addText(text => {
                text.setPlaceholder('1-10');
                text.inputEl.addClass('structure-input');
            })
            .addButton(btn => {
                btn.setButtonText('Add').setCta().onClick(async () => {
                    const input = addChapterRow.querySelector('.structure-input') as HTMLInputElement;
                    if (!input?.value) return;
                    let nums: number[] = [];
                    const val = input.value.trim();
                    const rangeMatch = val.match(/^(\d+)\s*-\s*(\d+)$/);
                    if (rangeMatch) {
                        const start = parseInt(rangeMatch[1]);
                        const end = parseInt(rangeMatch[2]);
                        for (let i = start; i <= end; i++) nums.push(i);
                    } else {
                        nums = val.split(',')
                            .map(s => parseInt(s.trim()))
                            .filter(n => !isNaN(n) && n > 0);
                    }
                    if (nums.length === 0) {
                        new Notice('Enter valid chapter numbers (e.g. 1-10 or 1,2,3)');
                        return;
                    }
                    await this.sceneManager.addChapters(nums);
                    input.value = '';
                    renderChaptersList();
                    new Notice(`Added ${nums.length} chapter(s)`);
                });
            });

        // Close button
        const closeRow = contentEl.createDiv('structure-close-row');
        const closeBtn = closeRow.createEl('button', { text: 'Done', cls: 'mod-cta' });
        closeBtn.addEventListener('click', () => {
            modal.close();
            this.refresh();
        });

        modal.open();
    }

    /**
     * Modal to edit storyDate, storyTime, timeline, and chronological order for a scene
     */
    private openTimeEditModal(scene: Scene): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText(`Time & Order — ${scene.title || 'Untitled'}`);

        let storyDate = scene.storyDate || '';
        let storyTime = scene.storyTime || '';
        let timeline = scene.timeline || '';
        let chronoOrder = scene.chronologicalOrder !== undefined ? String(scene.chronologicalOrder) : '';
        let timelineMode: TimelineMode = scene.timeline_mode || 'linear';
        let timelineStrand = scene.timeline_strand || '';

        // Date field (free text: "2026-02-17", "Day 1", "Monday", etc.)
        new Setting(modal.contentEl)
            .setName('Date / Day')
            .setDesc('E.g. 2026-02-17, Day 1, Monday, Chapter 3…')
            .addText((text: any) => {
                text.setValue(storyDate)
                    .setPlaceholder('e.g. Day 1')
                    .onChange((v: string) => (storyDate = v));
            });

        // Time field
        new Setting(modal.contentEl)
            .setName('Time')
            .setDesc('E.g. 14:00, morning, evening, night…')
            .addText((text: any) => {
                text.setValue(storyTime)
                    .setPlaceholder('e.g. evening')
                    .onChange((v: string) => (storyTime = v));
            });

        // Legacy timeline field
        new Setting(modal.contentEl)
            .setName('Timeline note')
            .setDesc('Free-form note about when this happens in the story')
            .addText((text: any) => {
                text.setValue(timeline)
                    .setPlaceholder('e.g. After the party')
                    .onChange((v: string) => (timeline = v));
            });

        // Chronological order field
        new Setting(modal.contentEl)
            .setName('Chronological order')
            .setDesc('The order this event happens in story time (for non-linear narratives)')
            .addText((text: any) => {
                text.setValue(chronoOrder)
                    .setPlaceholder('e.g. 5')
                    .onChange((v: string) => (chronoOrder = v));
                text.inputEl.type = 'number';
                text.inputEl.min = '1';
            });

        // ── Timeline Mode dropdown ──
        const modeSection = modal.contentEl.createDiv('time-edit-mode-section');
        new Setting(modeSection)
            .setName('Timeline mode')
            .setDesc('How the plugin handles this scene\'s temporal position')
            .addDropdown((dd: any) => {
                for (const m of TIMELINE_MODES) {
                    dd.addOption(m, TIMELINE_MODE_LABELS[m]);
                }
                dd.setValue(timelineMode);
                dd.onChange((v: string) => {
                    timelineMode = v as TimelineMode;
                    // Show/hide strand field based on mode
                    strandSetting.settingEl.style.display =
                        (v === 'parallel' || v === 'frame') ? '' : 'none';
                });
            });

        // ── Timeline Strand field (only for parallel/frame) ──
        const strandSetting = new Setting(modeSection)
            .setName('Timeline strand')
            .setDesc('Name for this timeline strand (e.g. "1943", "Outer frame", "Sarah\'s past")')
            .addText((text: any) => {
                text.setValue(timelineStrand)
                    .setPlaceholder('e.g. 1943')
                    .onChange((v: string) => (timelineStrand = v));
            });
        // Only show strand field for parallel/frame modes
        strandSetting.settingEl.style.display =
            (timelineMode === 'parallel' || timelineMode === 'frame') ? '' : 'none';

        new Setting(modal.contentEl)
            .addButton((btn: any) => {
                btn.setButtonText('Save').setCta().onClick(async () => {
                    const updates: Partial<Scene> = {};
                    updates.storyDate = storyDate.trim() || undefined;
                    updates.storyTime = storyTime.trim() || undefined;
                    updates.timeline = timeline.trim() || undefined;
                    const chronoNum = parseInt(chronoOrder.trim(), 10);
                    updates.chronologicalOrder = !isNaN(chronoNum) && chronoNum > 0 ? chronoNum : undefined;
                    updates.timeline_mode = timelineMode !== 'linear' ? timelineMode : undefined;
                    updates.timeline_strand = timelineStrand.trim() || undefined;
                    await this.sceneManager.updateScene(scene.filePath, updates);
                    this.refresh();
                    modal.close();
                });
            });

        modal.open();
    }

    private async openScene(scene: Scene): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(scene.filePath);
        if (file instanceof TFile) {
            const leaf = this.app.workspace.getLeaf('tab');
            await leaf.openFile(file);
        } else {
            new Notice(`Could not find file: ${scene.filePath}`);
        }
    }

    private refreshTimeline(container: HTMLElement): void {
        this.renderView(container);
    }

    /**
     * Public refresh called by the plugin on file changes
     */
    refresh(): void {
        if (this.rootContainer) {
            this.renderView(this.rootContainer);
        }
    }
}
