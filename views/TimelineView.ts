/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
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
import { attachTooltip } from '../components/Tooltip';
import { ButtonComponent, DropdownComponent, ItemView, Menu, Modal, Notice, Setting, TFile, TextComponent, WorkspaceLeaf } from 'obsidian';
import * as obsidian from 'obsidian';
import { BUILTIN_BEAT_SHEETS, Scene, SceneStatus, TIMELINE_MODES, TIMELINE_MODE_ICONS, TIMELINE_MODE_LABELS, TimelineMode, getStatusOrder, resolveStatusCfg } from '../models/Scene';

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
    private inspectorComponent: InspectorComponent | null = null;
    private selectedScene: Scene | null = null;
    private zoomLevel = 1;
    private rootContainer: HTMLElement | null = null;
    private _pendingRefresh: number | null = null;
    private cardComponent: SceneCardComponent;
    private _lastCacheVersion = -1;
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
        const value: unknown = (scene as Scene & { corkboardNote?: unknown }).corkboardNote;
        if (value === true) return true;
        if (value === false || value === undefined || value === null) return false;
        if (typeof value === 'string') return (value as string).trim().toLowerCase() === 'true';
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
        });
        obsidian.setIcon(structBtn, 'columns-3');
        attachTooltip(structBtn, 'Add acts or chapters');
        structBtn.addEventListener('click', () => this.openStructureModal());

        // Swimlane toggle
        const swimToggle = controls.createEl('button', {
            cls: `clickable-icon${this.swimlaneMode ? ' is-active' : ''}`,
        });
        obsidian.setIcon(swimToggle, 'columns-2');
        attachTooltip(swimToggle, this.swimlaneMode ? 'Switch to linear' : 'Switch to swimlanes');
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
            text: '−'
        });
        attachTooltip(zoomOut, 'Zoom out');
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
            text: '+'
        });
        attachTooltip(zoomIn, 'Zoom in');
        zoomIn.addEventListener('click', () => {
            this.zoomLevel = Math.min(3, this.zoomLevel + 0.25);
            this.refreshTimeline(container);
        });

        // Refresh button
        const refreshBtn = controls.createEl('button', {
            cls: 'clickable-icon',
        });
        obsidian.setIcon(refreshBtn, 'refresh-cw');
        attachTooltip(refreshBtn, 'Refresh');
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
        inspectorEl.setCssStyles({ display: 'none' });
        this.inspectorComponent = new InspectorComponent(
            inspectorEl,
            this.plugin,
            this.sceneManager,
            {
                onEdit: (scene) => this.openScene(scene),
                onDelete: (scene) => this.deleteScene(scene),
                onRefresh: () => this.refresh(),
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
        const sortField = this.timelineOrder === 'chronological' ? 'chronologicalOrder' : 'chapter';
        const scenes = this.sceneManager.queryService.getFilteredScenes(
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


        // For drag & drop
        let dragIndex: number | null = null;
        let dropIndex: number | null = null;
        let autoScrollRAF: number | null = null;
        let lastDragClientY = 0;

        // Auto-scroll when dragging near viewport edges
        const AUTO_SCROLL_ZONE = this.plugin.settings.timelineDragScrollZone ?? 60; // px from edge
        const AUTO_SCROLL_SPEED = this.plugin.settings.timelineDragScrollSpeed ?? 8; // px per frame
        const startAutoScroll = (clientY: number) => {
            lastDragClientY = clientY;
            if (autoScrollRAF) return; // already running
            const scrollEl = track.closest('.story-line-main-area') || track.parentElement;
            if (!scrollEl) return;
            const loop = () => {
                const rect = scrollEl.getBoundingClientRect();
                if (lastDragClientY < rect.top + AUTO_SCROLL_ZONE) {
                    scrollEl.scrollTop -= AUTO_SCROLL_SPEED;
                } else if (lastDragClientY > rect.bottom - AUTO_SCROLL_ZONE) {
                    scrollEl.scrollTop += AUTO_SCROLL_SPEED;
                } else {
                    autoScrollRAF = null;
                    return;
                }
                autoScrollRAF = window.requestAnimationFrame(loop);
            };
            autoScrollRAF = window.requestAnimationFrame(loop);
        };
        const stopAutoScroll = () => {
            if (autoScrollRAF) { cancelAnimationFrame(autoScrollRAF); autoScrollRAF = null; }
        };

        // Attach auto-scroll helpers to the main-area element so entries can call them
        const mainArea = track.closest('.story-line-main-area');
        if (mainArea) {
            (mainArea as unknown as Record<string, unknown>)._slAutoScroll = startAutoScroll;
            (mainArea as unknown as Record<string, unknown>)._slStopAutoScroll = stopAutoScroll;
        }

        // Store dropIndex on the track so drop handlers in child entries can read it
        (track as unknown as Record<string, unknown>)._slDropIndex = null;

        const refreshDropIndicators = () => {
            const entries = track.querySelectorAll('.timeline-entry');
            entries.forEach((el, idx) => {
                el.classList.toggle('drop-above', dropIndex === idx);
                el.classList.toggle('drop-below', dropIndex === idx + 1);
            });
        };

        const handleDrop = async (fromIdx: number, toIdx: number) => {
            if (fromIdx === toIdx || fromIdx === toIdx - 1) return;

            // Save scroll position to restore after refresh
            const scrollEl = track.closest('.story-line-main-area') || track.parentElement;
            const savedScroll = scrollEl ? scrollEl.scrollTop : 0;

            const moved = scenes.splice(fromIdx, 1)[0];
            const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
            scenes.splice(insertAt, 0, moved);

            if (this.timelineOrder === 'chronological') {
                // Chronological order is a single global counter — flat 1..N is correct.
                for (let i = 0; i < scenes.length; i++) {
                    await this.sceneManager.updateScene(
                        scenes[i].filePath,
                        { chronologicalOrder: i + 1 } as Partial<Scene>,
                    );
                }
            } else {
                // Reading order respects act → chapter → sequence nesting (issue #96).
                // Previously this overwrote `chapter` flatly 1..N across all scenes,
                // which destroyed the chapter hierarchy. Instead:
                //   1. Adopt the act/chapter of the neighbour at the drop location for
                //      the moved scene (so dragging into a new chapter actually moves
                //      it into that chapter).
                //   2. Renumber `sequence` within each (act, chapter) group based on
                //      the new array order; leave act/chapter of other scenes alone.
                const neighbour = scenes[insertAt - 1] ?? scenes[insertAt + 1] ?? null;
                const movedPatch: Partial<Scene> = {};
                if (neighbour) {
                    if (moved.act !== neighbour.act) movedPatch.act = neighbour.act;
                    if (moved.chapter !== neighbour.chapter) movedPatch.chapter = neighbour.chapter;
                }
                if (Object.keys(movedPatch).length > 0) {
                    await this.sceneManager.updateScene(moved.filePath, movedPatch);
                    if (movedPatch.act !== undefined) moved.act = movedPatch.act;
                    if (movedPatch.chapter !== undefined) moved.chapter = movedPatch.chapter;
                }

                // Renumber sequences within each (act, chapter) group in array order.
                const seqCounter = new Map<string, number>();
                for (const s of scenes) {
                    const key = `${String(s.act ?? '')}\u0000${String(s.chapter ?? '')}`;
                    const next = (seqCounter.get(key) ?? 0) + 1;
                    seqCounter.set(key, next);
                    if (s.sequence !== next) {
                        await this.sceneManager.updateScene(s.filePath, { sequence: next } as Partial<Scene>);
                    }
                }
            }
            this.refresh();

            // Restore scroll position after DOM rebuild
            window.requestAnimationFrame(() => {
                if (scrollEl) scrollEl.scrollTop = savedScroll;
            });
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

        // Render scenes in sequence order and insert act dividers when act changes.
        // For large projects (40+ scenes), use progressive/chunked rendering to avoid
        // blocking the main thread with 1500+ DOM nodes in a single frame.
        type TLItem =
            | { kind: 'divider'; actLabel: string; actNum: number | undefined }
            | { kind: 'scene'; scene: Scene; globalIdx: number; dateInvalid: boolean; timeInvalid: boolean }
            | { kind: 'empty-act'; actLabel: string; actNum: number };

        const tlItems: TLItem[] = [];
        let lastRenderedAct: number | undefined = undefined;
        for (let globalIdx = 0; globalIdx < scenes.length; globalIdx++) {
            const scene = scenes[globalIdx];
            const currentAct = scene.act !== undefined ? Number(scene.act) : undefined;
            if (currentAct !== lastRenderedAct) {
                const beatLabel = currentAct !== undefined ? this.sceneManager.getActLabel(currentAct) : undefined;
                const cleanBeat = beatLabel?.replace(/^Act\s*\d+\s*—\s*/i, '');
                const actLabel = currentAct !== undefined
                    ? (cleanBeat ? `Act ${currentAct} — ${cleanBeat}` : `Act ${currentAct}`)
                    : 'No Act';
                tlItems.push({ kind: 'divider', actLabel, actNum: currentAct });
                lastRenderedAct = currentAct;
            }
            tlItems.push({ kind: 'scene', scene, globalIdx, dateInvalid: dateInvalidFlags[globalIdx], timeInvalid: timeInvalidFlags[globalIdx] });
        }

        // Add empty-act placeholders for defined acts with no scenes
        for (const actNum of sortedActs) {
            if (!actsWithScenes.has(Number(actNum))) {
                const beatLabel = this.sceneManager.getActLabel(actNum);
                const cleanBeat = beatLabel?.replace(/^Act\s*\d+\s*—\s*/i, '');
                const actLabel = cleanBeat ? `Act ${actNum} — ${cleanBeat}` : `Act ${actNum}`;
                tlItems.push({ kind: 'empty-act', actLabel, actNum });
            }
        }

        const renderTLItem = (item: TLItem) => {
            if (item.kind === 'divider') {
                const divider = track.createDiv('timeline-act-divider');
                divider.createSpan({ cls: 'timeline-act-label', text: item.actLabel });
                if (item.actNum !== undefined) {
                    const addInAct = divider.createEl('button', {
                        cls: 'timeline-act-add-btn clickable-icon',
                        attr: { 'aria-label': `Add scene to ${item.actLabel}` }
                    });
                    obsidian.setIcon(addInAct, 'plus');
                    const actForClosure = item.actNum;
                    addInAct.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.openQuickAdd(actForClosure);
                    });
                }
            } else if (item.kind === 'scene') {
                this.renderTimelineEntry(track, item.scene, item.globalIdx, scenes, dragIndex, dropIndex, refreshDropIndicators, handleDrop, (di) => { dragIndex = di; }, (di) => { dropIndex = di; (track as unknown as Record<string, unknown>)._slDropIndex = di; }, item.dateInvalid, item.timeInvalid);
            } else {
                // empty-act placeholder
                const divider = track.createDiv('timeline-act-divider');
                divider.createSpan({ cls: 'timeline-act-label', text: item.actLabel });
                const addInAct = divider.createEl('button', {
                    cls: 'timeline-act-add-btn clickable-icon',
                    attr: { 'aria-label': `Add scene to ${item.actLabel}` }
                });
                obsidian.setIcon(addInAct, 'plus');
                const actForClosure = item.actNum;
                addInAct.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openQuickAdd(actForClosure);
                });
                const emptyEntry = track.createDiv('timeline-entry timeline-entry-empty');
                const emptyCard = emptyEntry.createDiv('timeline-entry-card');
                const card = emptyCard.createDiv('timeline-card timeline-card-empty');
                card.createDiv({ cls: 'timeline-card-title', text: `No scenes in ${item.actLabel}` });
                card.createEl('p', { cls: 'timeline-card-hint', text: 'Click + to add a scene' });
                card.addEventListener('click', () => this.openQuickAdd(actForClosure));
            }
        };

        // Progressive rendering: render first batch immediately, schedule rest
        const INITIAL_BATCH = 20;
        const CHUNK_SIZE = 10;
        const total = tlItems.length;

        if (total <= INITIAL_BATCH) {
            // Small project — render everything synchronously
            for (const item of tlItems) renderTLItem(item);
        } else {
            // Large project — chunked rendering
            for (let i = 0; i < INITIAL_BATCH; i++) renderTLItem(tlItems[i]);

            let cursor = INITIAL_BATCH;
            const scheduleChunk = () => {
                if (cursor >= total || !track.isConnected) return;
                window.requestAnimationFrame(() => {
                    if (!track.isConnected) return;
                    const end = Math.min(cursor + CHUNK_SIZE, total);
                    for (let i = cursor; i < end; i++) renderTLItem(tlItems[i]);
                    cursor = end;
                    if (cursor < total) scheduleChunk();
                });
            };
            scheduleChunk();
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
        const sortField = this.timelineOrder === 'chronological' ? 'chronologicalOrder' : 'chapter';
        const scenes = this.sceneManager.queryService.getFilteredScenes(
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
                const cleanBeat = beatLabel?.replace(/^Act\s*\d+\s*—\s*/i, '');
                const label = currentAct !== undefined
                    ? (cleanBeat ? `Act ${currentAct} — ${cleanBeat}` : `Act ${currentAct}`)
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
        grid.setCssStyles({ gridTemplateColumns: colTemplate });

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
                divider.setCssStyles({ gridColumn: `1 / -1` });
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
        const statusCfg = resolveStatusCfg(scene.status || 'idea');
        const statusBadge = footer.createSpan({ cls: 'timeline-card-status', text: statusCfg.label });
        statusBadge.setCssStyles({ color: statusCfg.color });

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

        card.setCssStyles({
            transform: `scale(${this.zoomLevel})`,
            transformOrigin: 'left top',
        });
    }

    /**
     * Render a single timeline entry (scene card on the timeline)
     */
    private renderTimelineEntry(
        track: HTMLElement,
        scene: Scene,
        i: number,
        _scenes: Scene[],
        _dragIndex: number | null,
        _dropIndex: number | null,
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
            // Stop auto-scroll on drag end
            (entry.closest('.story-line-main-area') as unknown as { _slStopAutoScroll?: () => void } | null)?._slStopAutoScroll?.();
        });
        entry.addEventListener('dragover', (e) => {
            e.preventDefault();
            const rect = entry.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const computed = (e.clientY < midY) ? i : i + 1;
            setDropIndex(computed);
            refreshDropIndicators();
            // Auto-scroll near edges
            (entry.closest('.story-line-main-area') as unknown as { _slAutoScroll?: (y: number) => void } | null)?._slAutoScroll?.(e.clientY);
        });
        entry.addEventListener('dragleave', () => {
            setDropIndex(null);
            refreshDropIndicators();
        });
        entry.addEventListener('drop', async (e) => {
            e.preventDefault();
            // Stop auto-scroll
            (entry.closest('.story-line-main-area') as unknown as { _slStopAutoScroll?: () => void } | null)?._slStopAutoScroll?.();
            const fromStr = e.dataTransfer?.getData('text/plain');
            if (fromStr !== undefined && fromStr !== null) {
                const from = Number(fromStr);
                // Use the computed dropIndex (midpoint-aware) instead of entry index
                const actualDrop = ((entry.closest('.timeline-track') as unknown as { _slDropIndex?: number } | null)?._slDropIndex) ?? i;
                await handleDrop(from, actualDrop);
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

        // Apply custom scene color as background tint
        if (scene.color && /^#[0-9a-fA-F]{6}$/.test(scene.color)) {
            card.addClass('sl-scene-colored');
            card.style.setProperty('--sl-scene-bg', scene.color);
        }

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
        const statusCfg = resolveStatusCfg(scene.status || 'idea');
        const statusBadge = footer.createSpan({
            cls: 'timeline-card-status',
            text: statusCfg.label,
        });
        statusBadge.setCssStyles({ color: statusCfg.color });

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

        card.setCssStyles({
            transform: `scale(${this.zoomLevel})`,
            transformOrigin: 'left center',
        });
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
        if (this.plugin.isSceneInspectorOpen()) {
            this.inspectorComponent?.hide();
            this.app.workspace.trigger('storyline:scene-focus', scene.filePath);
        } else {
            this.inspectorComponent?.show(scene);
        }
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

        // Scene color picker
        menu.addItem(item => {
            item.setTitle(scene.color ? 'Change Color' : 'Set Color')
                .setIcon('palette')
                .onClick(() => {
                    SceneCardComponent.openColorPicker(this.app, scene, this.sceneManager, () => this.refresh());
                });
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
        const statuses = getStatusOrder();
        statuses.forEach(status => {
            menu.addItem(item => {
                item.setTitle(`Status: ${resolveStatusCfg(status).label}`)
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
                // Scroll to the newly created scene card
                window.requestAnimationFrame(() => {
                    const newEntry = this.rootContainer?.querySelector(
                        `[data-path="${CSS.escape(file.path)}"]`
                    );
                    if (newEntry) {
                        newEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
                if (openAfter) {
                    await this.app.workspace.getLeaf('tab').openFile(file, { state: { mode: 'source', source: false } });
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

        const templateGrid = contentEl.createDiv('beat-sheet-list');
        for (const template of BUILTIN_BEAT_SHEETS) {
            const row = templateGrid.createDiv('beat-sheet-row');

            const textWrap = row.createDiv('beat-sheet-row-text');
            const headerLine = textWrap.createDiv('beat-sheet-row-header');
            headerLine.createSpan({ cls: 'beat-sheet-row-name', text: template.name });
            const info = headerLine.createSpan({ cls: 'beat-sheet-row-info' });
            const parts = [`${template.beats.length} beats`, `${template.acts.length} acts`];
            if (template.chapters.length > 0) parts.push(`${template.chapters.length} chapters`);
            info.textContent = parts.join(' · ');
            textWrap.createDiv({ cls: 'beat-sheet-row-summary', text: template.summary });

            // Expandable beat preview
            const beatList = row.createDiv('beat-sheet-beats-preview');
            for (const beat of template.beats) {
                const beatItem = beatList.createDiv('beat-sheet-beat-item');
                beatItem.createSpan({ cls: 'beat-sheet-beat-act', text: `A${beat.act}` });
                beatItem.createSpan({ cls: 'beat-sheet-beat-label', text: beat.label });
                beatItem.createSpan({ cls: 'beat-sheet-beat-desc', text: beat.description });
            }

            const expandBtn = row.createEl('button', { cls: 'beat-sheet-expand-btn clickable-icon', attr: { 'aria-label': 'Show beats' } });
            expandBtn.textContent = '▸';
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = row.hasClass('is-expanded');
                // Close all others
                templateGrid.querySelectorAll('.beat-sheet-row.is-expanded').forEach(r => {
                    r.removeClass('is-expanded');
                    (r.querySelector('.beat-sheet-expand-btn') as HTMLElement).textContent = '▸';
                });
                if (!isOpen) {
                    row.addClass('is-expanded');
                    expandBtn.textContent = '▾';
                }
            });

            const applyBtn = row.createEl('button', { text: 'Apply', cls: 'mod-cta beat-sheet-apply-btn' });
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
            const actDescriptions = this.sceneManager.getActDescriptions();
            if (acts.length === 0) {
                actsList.createEl('p', { cls: 'structure-empty', text: 'No acts defined yet.' });
            }
            for (const act of acts) {
                const count = scenesPerAct.get(act) || 0;
                const label = actLabels[act];
                const desc = actDescriptions[act] || '';
                const wrapper = actsList.createDiv('structure-item-wrapper');
                const row = wrapper.createDiv('structure-row');
                const cleanLabel = label?.replace(/^Act\s*\d+\s*—\s*/i, '');
                const labelText = cleanLabel ? `Act ${act} — ${cleanLabel}` : `Act ${act}`;
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
                    labelSpan.setCssStyles({ display: 'none' });
                    const editInput = activeDocument.createElement('input');
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
                        if (e.key === 'Escape') { labelSpan.setCssStyles({ display: '' }); editInput.remove(); }
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

                // Description textarea
                const descArea = wrapper.createEl('textarea', {
                    cls: 'structure-description',
                    attr: { placeholder: 'Description / notes for this act…', rows: '2' }
                });
                descArea.value = desc;
                let descCommitTimer: number | null = null;
                descArea.addEventListener('input', () => {
                    // Auto-grow
                    descArea.setCssStyles({ height: "auto" });

                    descArea.setCssStyles({ height: descArea.scrollHeight + 'px' });
                    // Debounced save
                    if (descCommitTimer) window.clearTimeout(descCommitTimer);
                    descCommitTimer = window.setTimeout(async () => {
                        await this.sceneManager.setActDescription(act, descArea.value);
                    }, 600);
                });
                // Initial auto-grow
                window.setTimeout(() => {
                    descArea.setCssStyles({ height: "auto" });

                    descArea.setCssStyles({ height: descArea.scrollHeight + 'px' });
                }, 0);
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
            const chapterLabels = this.sceneManager.getChapterLabels();
            const chapterDescriptions = this.sceneManager.getChapterDescriptions();
            if (chapters.length === 0) {
                chaptersList.createEl('p', { cls: 'structure-empty', text: 'No chapters defined yet.' });
            }
            for (const ch of chapters) {
                const count = scenesPerChapter.get(ch) || 0;
                const label = chapterLabels[ch];
                const desc = chapterDescriptions[ch] || '';
                const wrapper = chaptersList.createDiv('structure-item-wrapper');
                const row = wrapper.createDiv('structure-row');
                const labelText = label ? `Chapter ${ch} — ${label}` : `Chapter ${ch}`;
                row.createSpan({ cls: 'structure-label', text: labelText });
                row.createSpan({ cls: 'structure-count', text: `${count} scene${count !== 1 ? 's' : ''}` });

                // Edit label button
                const editBtn = row.createEl('button', {
                    cls: 'clickable-icon structure-edit',
                    attr: { 'aria-label': `Edit label for Chapter ${ch}` }
                });
                editBtn.textContent = '✎';
                editBtn.addEventListener('click', () => {
                    const input = row.querySelector('.structure-label-input') as HTMLInputElement;
                    if (input) { input.focus(); return; }
                    const labelSpan = row.querySelector('.structure-label') as HTMLElement;
                    if (!labelSpan) return;
                    labelSpan.setCssStyles({ display: 'none' });
                    const editInput = activeDocument.createElement('input');
                    editInput.type = 'text';
                    editInput.value = label || '';
                    editInput.placeholder = 'e.g. The Journey Begins…';
                    editInput.className = 'structure-label-input';
                    row.insertBefore(editInput, labelSpan.nextSibling);
                    editInput.focus();
                    const commitEdit = async () => {
                        await this.sceneManager.setChapterLabel(ch, editInput.value);
                        renderChaptersList();
                    };
                    editInput.addEventListener('blur', commitEdit);
                    editInput.addEventListener('keydown', (e: KeyboardEvent) => {
                        if (e.key === 'Enter') { e.preventDefault(); editInput.blur(); }
                        if (e.key === 'Escape') { labelSpan.setCssStyles({ display: '' }); editInput.remove(); }
                    });
                });

                const removeBtn = row.createEl('button', {
                    cls: 'clickable-icon structure-remove',
                    attr: { 'aria-label': `Remove Chapter ${ch}` }
                });
                removeBtn.textContent = '×';
                removeBtn.addEventListener('click', async () => {
                    await this.sceneManager.removeChapter(ch);
                    renderChaptersList();
                });

                // Description textarea
                const descArea = wrapper.createEl('textarea', {
                    cls: 'structure-description',
                    attr: { placeholder: 'Description / notes for this chapter…', rows: '2' }
                });
                descArea.value = desc;
                let descCommitTimer: number | null = null;
                descArea.addEventListener('input', () => {
                    descArea.setCssStyles({ height: "auto" });

                    descArea.setCssStyles({ height: descArea.scrollHeight + 'px' });
                    if (descCommitTimer) window.clearTimeout(descCommitTimer);
                    descCommitTimer = window.setTimeout(async () => {
                        await this.sceneManager.setChapterDescription(ch, descArea.value);
                    }, 600);
                });
                window.setTimeout(() => {
                    descArea.setCssStyles({ height: "auto" });

                    descArea.setCssStyles({ height: descArea.scrollHeight + 'px' });
                }, 0);
            }
        };
        renderChaptersList();

        const addChapterRow = contentEl.createDiv('structure-add-row');
        let createScenesForChapters = false;
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

                    // Optionally create one empty scene per chapter
                    if (createScenesForChapters) {
                        const chapterLabels = this.sceneManager.getChapterLabels();
                        for (const ch of nums) {
                            const label = chapterLabels[ch];
                            const title = label ? `Chapter ${ch} — ${label}` : `Chapter ${ch}`;
                            await this.sceneManager.createScene({
                                title,
                                chapter: ch,
                                sequence: ch,
                                status: 'idea' as SceneStatus,
                            });
                        }
                    }

                    input.value = '';
                    renderChaptersList();
                    const msg = createScenesForChapters
                        ? `Added ${nums.length} chapter(s) with empty scenes — visible in all views.`
                        : `Added ${nums.length} chapter(s). Switch to Board view → Kanban → Group by Chapter to see them.`;
                    new Notice(msg);
                });
            });

        new Setting(addChapterRow)
            .setName('Create an empty scene per chapter')
            .setDesc('Makes new chapters immediately visible in all views.')
            .addToggle(toggle => {
                toggle.setValue(false);
                toggle.onChange(v => { createScenesForChapters = v; });
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
            .addText((text: TextComponent) => {
                text.setValue(storyDate)
                    .setPlaceholder('e.g. Day 1')
                    .onChange((v: string) => (storyDate = v));
            });

        // Time field
        new Setting(modal.contentEl)
            .setName('Time')
            .setDesc('E.g. 14:00, morning, evening, night…')
            .addText((text: TextComponent) => {
                text.setValue(storyTime)
                    .setPlaceholder('e.g. evening')
                    .onChange((v: string) => (storyTime = v));
            });

        // Legacy timeline field
        new Setting(modal.contentEl)
            .setName('Timeline note')
            .setDesc('Free-form note about when this happens in the story')
            .addText((text: TextComponent) => {
                text.setValue(timeline)
                    .setPlaceholder('e.g. After the party')
                    .onChange((v: string) => (timeline = v));
            });

        // Chronological order field
        new Setting(modal.contentEl)
            .setName('Chronological order')
            .setDesc('The order this event happens in story time (for non-linear narratives)')
            .addText((text: TextComponent) => {
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
            .addDropdown((dd: DropdownComponent) => {
                for (const m of TIMELINE_MODES) {
                    dd.addOption(m, TIMELINE_MODE_LABELS[m]);
                }
                dd.setValue(timelineMode);
                dd.onChange((v: string) => {
                    timelineMode = v as TimelineMode;
                    // Show/hide strand field based on mode
                    strandSetting.settingEl.setCssStyles({ display: (v === 'parallel' || v === 'frame') ? '' : 'none' });
                });
            });

        // ── Timeline Strand field (only for parallel/frame) ──
        const strandSetting = new Setting(modeSection)
            .setName('Timeline strand')
            .setDesc('Name for this timeline strand (e.g. "1943", "Outer frame", "Sarah\'s past")')
            .addText((text: TextComponent) => {
                text.setValue(timelineStrand)
                    .setPlaceholder('e.g. 1943')
                    .onChange((v: string) => (timelineStrand = v));
            });
        // Only show strand field for parallel/frame modes
        strandSetting.settingEl.setCssStyles({ display: (timelineMode === 'parallel' || timelineMode === 'frame') ? '' : 'none' });

        new Setting(modal.contentEl)
            .addButton((btn: ButtonComponent) => {
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
            await leaf.openFile(file, { state: { mode: 'source', source: false } });
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
        if (!this.rootContainer) return;
        // Coalesce rapid calls into a single rAF, but never skip —
        // data may have changed again since the last queued render.
        if (this._pendingRefresh) {
            cancelAnimationFrame(this._pendingRefresh);
        }
        this._pendingRefresh = window.requestAnimationFrame(() => {
            this._pendingRefresh = null;
            if (!this.rootContainer) return;
            this._lastCacheVersion = this.sceneManager.cacheVersion;
            const prevSelectedPath = this.selectedScene?.filePath ?? null;
            this.renderView(this.rootContainer);
            if (prevSelectedPath) {
                const updated = this.sceneManager.getScene(prevSelectedPath);
                if (updated) {
                    this.selectedScene = updated;
                    if (!this.plugin.isSceneInspectorOpen()) {
                        this.inspectorComponent?.show(updated);
                    }
                }
            }
        });
    }
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- end of file-wide suppression block opened at line 1 */
