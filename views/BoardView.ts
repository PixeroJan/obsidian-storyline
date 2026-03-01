import { ItemView, WorkspaceLeaf, Menu, Notice, TFile, Modal, Setting, MarkdownRenderer } from 'obsidian';
import * as obsidian from 'obsidian';
import { Scene, SceneFilter, SortConfig, BoardGroupBy, SceneStatus, BUILTIN_BEAT_SHEETS } from '../models/Scene';
import { openConfirmModal } from '../components/ConfirmModal';
import { SceneManager } from '../services/SceneManager';
import { SceneCardComponent } from '../components/SceneCard';
import { FiltersComponent } from '../components/Filters';
import { InspectorComponent } from '../components/Inspector';
import { QuickAddModal } from '../components/QuickAddModal';
import { renderViewSwitcher } from '../components/ViewSwitcher';
import { VirtualScroller } from '../components/VirtualScroller';
import { enableDragToPan } from '../components/DragToPan';
import { SplitSceneModal, MergeSceneModal } from '../components/SplitMergeModals';
import { isMobile, applyMobileClass, enableTouchDrag } from '../components/MobileAdapter';
import { BOARD_VIEW_TYPE } from '../constants';
import type SceneCardsPlugin from '../main';

type BoardMode = 'kanban' | 'corkboard';

const CORKBOARD_NOTE_COLOR_PRESETS: Array<{ label: string; color: string }> = [
    { label: 'Yellow', color: '#F6EDB4' },
    { label: 'Pink', color: '#F9D7DC' },
    { label: 'Blue', color: '#DDEBFA' },
    { label: 'Green', color: '#E1F1D9' },
    { label: 'Orange', color: '#F9E0BF' },
    { label: 'Lavender', color: '#E8DEF8' },
];

/**
 * Board View - Kanban-style scene card board
 */
export class BoardView extends ItemView {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;
    private cardComponent: SceneCardComponent;
    private filtersComponent: FiltersComponent | null = null;
    private inspectorComponent: InspectorComponent | null = null;
    private currentFilter: SceneFilter = {};
    private currentSort: SortConfig = { field: 'sequence', direction: 'asc' };
    private groupBy: BoardGroupBy = 'act';
    private selectedScene: Scene | null = null;
    private selectedScenes: Set<string> = new Set();
    private boardEl: HTMLElement | null = null;
    private bulkBarEl: HTMLElement | null = null;
    private rootContainer: HTMLElement | null = null;
    private boardMode: BoardMode = 'corkboard';
    private corkboardPositions: Map<string, { x: number; y: number; z: number }> = new Map();
    private corkboardJustDragged: Set<string> = new Set();
    private corkboardPersistTimer: ReturnType<typeof setTimeout> | null = null;
    private corkboardLoadedProjectFile: string | null = null;
    private dragToPanCleanup: (() => void) | null = null;
    private corkboardInteractionCleanup: (() => void) | null = null;
    private corkboardCamera = { x: 220, y: 140, zoom: 1 };
    private quickNoteLastCreatedAt = 0;
    private quickNoteChainIndex = 0;
    /** Active virtual scrollers — cleaned up on re-render */
    private scrollers: VirtualScroller<Scene>[] = [];

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin, sceneManager: SceneManager) {
        super(leaf);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
        this.cardComponent = new SceneCardComponent(plugin);
        const preferred = plugin.settings.defaultBoardMode;
        this.boardMode = preferred === 'kanban' ? 'kanban' : 'corkboard';
    }

    getViewType(): string {
        return BOARD_VIEW_TYPE;
    }

    getDisplayText(): string {
        const title = this.plugin?.sceneManager?.activeProject?.title;
        return title ? `StoryLine - ${title}` : 'StoryLine';
    }

    getIcon(): string {
        return 'layout-grid';
    }

    async onOpen(): Promise<void> {
        this.plugin.storyLeaf = this.leaf;
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('story-line-board-container');
        applyMobileClass(container);
        this.rootContainer = container;

        await this.sceneManager.initialize();
        this.renderView(container);
    }

    async onClose(): Promise<void> {
        if (this.corkboardInteractionCleanup) {
            this.corkboardInteractionCleanup();
            this.corkboardInteractionCleanup = null;
        }
        if (this.dragToPanCleanup) {
            this.dragToPanCleanup();
            this.dragToPanCleanup = null;
        }
        if (this.corkboardPersistTimer) {
            clearTimeout(this.corkboardPersistTimer);
            this.corkboardPersistTimer = null;
        }
        await this.persistCorkboardLayout();
    }

    /**
     * Render the entire board view
     */
    private renderView(container: HTMLElement): void {
        this.ensureCorkboardLayoutLoaded();
        container.empty();

        // Toolbar
        const toolbar = container.createDiv('story-line-toolbar');
        this.renderToolbar(toolbar);

        // Main content area (board + inspector)
        const mainArea = container.createDiv('story-line-main-area');

        // Filters
        const filterContainer = mainArea.createDiv('story-line-filters-container');
        filterContainer.toggleClass('is-corkboard-mode', this.boardMode === 'corkboard');
        this.filtersComponent = new FiltersComponent(
            filterContainer,
            this.sceneManager,
            (filter, sort) => {
                this.currentFilter = filter;
                this.currentSort = sort;
                this.refreshBoard();
            },
            this.plugin
        );
        this.filtersComponent.render();

        // Board
        this.boardEl = mainArea.createDiv('story-line-board');
        this.configureDragToPan();

        // Bulk action bar (hidden until 2+ selected)
        this.bulkBarEl = mainArea.createDiv('story-line-bulk-bar');
        this.bulkBarEl.style.display = 'none';

        this.refreshBoard();

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
                    this.refreshBoard();
                },
            }
        );
    }

    /**
     * Render the toolbar
     */
    private renderToolbar(toolbar: HTMLElement): void {
        // Title + project selector row
        const titleRow = toolbar.createDiv('story-line-title-row');
        titleRow.createEl('h3', {
            cls: 'story-line-view-title',
            text: 'StoryLine'
        });
        // project name shown in top-center only; no inline project selector here

        // View switcher tabs
        renderViewSwitcher(toolbar, BOARD_VIEW_TYPE, this.plugin, this.leaf);

        const controls = toolbar.createDiv('story-line-toolbar-controls');

        const modeToggle = controls.createDiv('story-line-board-mode-toggle');
        const corkboardBtn = modeToggle.createEl('button', {
            cls: `story-line-board-mode-btn ${this.boardMode === 'corkboard' ? 'active' : ''}`,
            text: 'Corkboard'
        });
        const kanbanBtn = modeToggle.createEl('button', {
            cls: `story-line-board-mode-btn ${this.boardMode === 'kanban' ? 'active' : ''}`,
            text: 'Kanban'
        });
        corkboardBtn.addEventListener('click', () => {
            if (this.boardMode !== 'corkboard') {
                this.boardMode = 'corkboard';
                this.refresh();
            }
        });
        kanbanBtn.addEventListener('click', () => {
            if (this.boardMode !== 'kanban') {
                this.boardMode = 'kanban';
                this.refresh();
            }
        });

        if (this.boardMode === 'corkboard') {
            const showScenesBtn = controls.createEl('button', {
                cls: `story-line-show-notes-btn ${this.plugin.settings.showScenesInCorkboard ? 'active' : ''}`,
                text: this.plugin.settings.showScenesInCorkboard ? 'Scenes: On' : 'Scenes: Off'
            });
            showScenesBtn.addEventListener('click', async () => {
                this.plugin.settings.showScenesInCorkboard = !this.plugin.settings.showScenesInCorkboard;
                await this.plugin.saveSettings();
                this.refresh();
            });
        }

        if (this.boardMode === 'kanban') {
            // Group by dropdown
            const groupContainer = controls.createDiv('story-line-group-control');
            groupContainer.createSpan({ text: 'Group by: ' });
            const groupSelect = groupContainer.createEl('select', { cls: 'dropdown' });
            const groupOptions: { value: BoardGroupBy; label: string }[] = [
                { value: 'act', label: 'Act' },
                { value: 'chapter', label: 'Chapter' },
                { value: 'status', label: 'Status' },
                { value: 'pov', label: 'POV' },
            ];
            groupOptions.forEach(opt => {
                const option = groupSelect.createEl('option', { text: opt.label, value: opt.value });
                if (opt.value === this.groupBy) option.selected = true;
            });
            groupSelect.addEventListener('change', () => {
                this.groupBy = groupSelect.value as BoardGroupBy;
                this.refreshBoard();
            });

            const showNotesBtn = controls.createEl('button', {
                cls: `story-line-show-notes-btn ${this.plugin.settings.showNotesInKanban ? 'active' : ''}`,
                text: this.plugin.settings.showNotesInKanban ? 'Notes: On' : 'Notes: Off'
            });
            showNotesBtn.addEventListener('click', async () => {
                this.plugin.settings.showNotesInKanban = !this.plugin.settings.showNotesInKanban;
                await this.plugin.saveSettings();
                this.refresh();
            });
        }

        // Add scene button
        const addBtn = controls.createEl('button', {
            cls: 'mod-cta story-line-add-btn',
            text: this.boardMode === 'corkboard' ? '+ New Note' : '+ New Scene'
        });
        addBtn.addEventListener('click', () => {
            if (this.boardMode === 'corkboard') {
                void this.openQuickAddIdea();
            } else {
                this.openQuickAdd();
            }
        });

        // Add acts/chapters button
        const structBtn = controls.createEl('button', {
            cls: 'clickable-icon',
            attr: { 'aria-label': 'Add acts or chapters' }
        });
        if (typeof obsidian.setIcon === 'function') {
            obsidian.setIcon(structBtn, 'columns-3');
        } else {
            console.error('obsidian.setIcon is not defined when setting structBtn');
        }
        structBtn.addEventListener('click', () => this.openStructureModal());

        // Resequence button
        const reseqBtn = controls.createEl('button', {
            cls: 'clickable-icon',
            attr: { 'aria-label': 'Resequence all scenes from 1' }
        });
        if (typeof obsidian.setIcon === 'function') {
            obsidian.setIcon(reseqBtn, 'list-ordered');
        } else {
            console.error('obsidian.setIcon is not defined when setting reseqBtn');
        }
        reseqBtn.addEventListener('click', async () => {
            const scenes = this.sceneManager.getFilteredScenes(
                undefined,
                { field: 'sequence', direction: 'asc' }
            );
            for (let i = 0; i < scenes.length; i++) {
                await this.sceneManager.updateScene(scenes[i].filePath, { sequence: i + 1 });
            }
            await this.sceneManager.initialize();
            this.refreshBoard();
        });

        // Refresh button
        const refreshBtn = controls.createEl('button', {
            cls: 'clickable-icon',
            attr: { 'aria-label': 'Refresh' }
        });
        if (typeof obsidian.setIcon === 'function') {
            obsidian.setIcon(refreshBtn, 'refresh-cw');
        } else {
            console.error('obsidian.setIcon is not defined when setting refreshBtn');
        }
        refreshBtn.addEventListener('click', async () => {
            await this.sceneManager.initialize();
            this.refreshBoard();
        });
    }

    /**
     * Render the board columns
     */
    private renderBoard(): void {
        if (!this.boardEl) return;
        this.boardEl.removeClass('story-line-corkboard');
        this.boardEl.empty();

        // Destroy previous virtual scrollers
        for (const vs of this.scrollers) vs.destroy();
        this.scrollers = [];

        const groups = this.sceneManager.getScenesGroupedByWithEmpty(
            this.groupBy,
            this.currentFilter,
            this.currentSort
        );

        // Sort group keys
        const sortedKeys = this.sortGroupKeys(Array.from(groups.keys()));

        if (sortedKeys.length === 0) {
            const empty = this.boardEl.createDiv('story-line-empty');
            empty.createEl('p', { text: 'No scenes found.' });
            empty.createEl('p', { text: 'Click "+ New Scene" to create your first scene, or check your Scene folder setting.' });
            return;
        }

        for (const key of sortedKeys) {
            let scenes = groups.get(key) || [];
            if (!this.plugin.settings.showNotesInKanban) {
                scenes = scenes.filter(scene => !this.isCorkboardNoteScene(scene));
                const isNoActColumn = this.groupBy === 'act' && key.trim().toLowerCase() === 'no act';
                if (isNoActColumn && scenes.length === 0) {
                    continue;
                }
            }
            this.renderColumn(this.boardEl, key, scenes);
        }
    }

    private renderCorkboard(): void {
        if (!this.boardEl) return;

        if (this.corkboardInteractionCleanup) {
            this.corkboardInteractionCleanup();
            this.corkboardInteractionCleanup = null;
        }

        this.boardEl.empty();
        this.boardEl.addClass('story-line-corkboard');

        // Destroy previous virtual scrollers (used by Kanban mode)
        for (const vs of this.scrollers) vs.destroy();
        this.scrollers = [];

        let scenes = this.sceneManager.getFilteredScenes(this.currentFilter, this.currentSort);
        if (!this.plugin.settings.showScenesInCorkboard) {
            scenes = scenes.filter(scene => this.isCorkboardNoteScene(scene));
        }
        const validPaths = new Set(scenes.map(s => s.filePath));
        for (const key of Array.from(this.corkboardPositions.keys())) {
            if (!validPaths.has(key)) this.corkboardPositions.delete(key);
        }

        const currentMaxZ = () => {
            let max = 0;
            for (const pos of this.corkboardPositions.values()) {
                if ((pos.z ?? 0) > max) max = pos.z ?? 0;
            }
            return max;
        };

        if (scenes.length === 0) {
            const empty = this.boardEl.createDiv('story-line-empty');
            empty.createEl('p', { text: 'No scenes found.' });
            empty.createEl('p', { text: 'Click "+ New Scene" to create your first scene, or adjust your filters.' });
            return;
        }

        const viewport = this.boardEl.createDiv('story-line-corkboard-viewport');
        const canvas = viewport.createDiv('story-line-corkboard-canvas');

        this.corkboardInteractionCleanup = this.enableCorkboardCameraInteraction(viewport, canvas);
        this.applyCorkboardCamera(canvas);

        scenes.forEach((scene, index) => {
            const existing = this.corkboardPositions.get(scene.filePath);
            const col = index % 4;
            const row = Math.floor(index / 4);
            const pos = existing || {
                x: col * 320,
                y: row * 230,
                z: currentMaxZ() + 1,
            };
            if (!existing) {
                this.corkboardPositions.set(scene.filePath, pos);
                this.schedulePersistCorkboardLayout();
            } else if (!Number.isFinite(existing.z)) {
                pos.z = currentMaxZ() + 1;
                this.corkboardPositions.set(scene.filePath, pos);
                this.schedulePersistCorkboardLayout();
            }

            const node = canvas.createDiv('story-line-corkboard-node');
            node.style.left = `${pos.x}px`;
            node.style.top = `${pos.y}px`;
            node.style.zIndex = String(pos.z ?? 1);
            if (this.isCorkboardNoteScene(scene)) {
                node.addClass('story-line-corkboard-note-node');
            }

            const cardEl = this.cardComponent.render(scene, node, {
                compact: false,
                onSelect: (s, event) => {
                    if (this.isCorkboardNoteScene(s)) return;
                    if (this.corkboardJustDragged.has(s.filePath)) return;
                    this.selectScene(s, event);
                },
                onDoubleClick: (s) => {
                    if (this.isCorkboardNoteScene(s)) return;
                    this.openScene(s);
                },
                onContextMenu: (s, event) => {
                    if (this.isCorkboardNoteScene(s)) {
                        this.showCorkboardNoteMenu(s, event);
                    } else {
                        this.showContextMenu(s, event);
                    }
                },
                draggable: false,
            });
            cardEl.addClass('story-line-corkboard-card');

            if (this.selectedScenes.has(scene.filePath)) {
                cardEl.addClass('selected');
            }

            this.attachCorkboardNoteEditor(cardEl, scene);

            this.attachCorkboardDrag(node, scene.filePath);
        });
    }

    private attachCorkboardNoteEditor(cardEl: HTMLElement, scene: Scene): void {
        // Only explicit corkboard notes get inline note editor
        if (!this.isCorkboardNoteScene(scene)) return;

        cardEl.addClass('story-line-corkboard-note-card');
        this.applyCorkboardNoteColor(cardEl, scene);

        const editorWrap = cardEl.createDiv('story-line-corkboard-note-editor');

        const textarea = editorWrap.createEl('textarea', {
            cls: 'story-line-corkboard-note-text',
            attr: {
                placeholder: 'Write your note…',
                rows: '6',
            },
        });
        textarea.value = scene.body || '';

        const preview = editorWrap.createDiv('story-line-corkboard-note-preview markdown-rendered');
        let isEditing = false;
        let commitInProgress = false;
        let outsidePointerHandler: ((event: PointerEvent) => void) | null = null;

        const detachOutsideClose = () => {
            if (!outsidePointerHandler) return;
            document.removeEventListener('pointerdown', outsidePointerHandler, true);
            outsidePointerHandler = null;
        };

        const renderPreview = async () => {
            preview.empty();
            const source = textarea.value.trim();
            if (!source) {
                preview.createDiv({ cls: 'story-line-corkboard-note-preview-empty', text: 'Write your note…' });
                return;
            }
            await MarkdownRenderer.render(this.app, source, preview, scene.filePath, this);
        };

        const placeCaretFromClick = (clientX: number, clientY: number) => {
            const docAny = document as Document & {
                caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
                caretRangeFromPoint?: (x: number, y: number) => Range | null;
            };

            let offset: number | null = null;
            const textNode = textarea.firstChild;

            if (typeof docAny.caretPositionFromPoint === 'function') {
                const pos = docAny.caretPositionFromPoint(clientX, clientY);
                if (pos && (pos.offsetNode === textNode || pos.offsetNode === textarea)) {
                    offset = pos.offset;
                }
            }

            if (offset === null && typeof docAny.caretRangeFromPoint === 'function') {
                const range = docAny.caretRangeFromPoint(clientX, clientY);
                if (range && (range.startContainer === textNode || range.startContainer === textarea)) {
                    offset = range.startOffset;
                }
            }

            if (offset === null) {
                const rect = textarea.getBoundingClientRect();
                const yRatio = Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height)));
                offset = Math.round(textarea.value.length * yRatio);
            }

            const clamped = Math.max(0, Math.min(textarea.value.length, offset));
            textarea.setSelectionRange(clamped, clamped);
        };

        const setEditing = (editing: boolean, clickPoint?: { x: number; y: number }) => {
            isEditing = editing;
            if (editing) {
                preview.style.display = 'none';
                textarea.style.display = 'block';
                autoGrow();
                textarea.focus();
                if (clickPoint) {
                    window.requestAnimationFrame(() => {
                        placeCaretFromClick(clickPoint.x, clickPoint.y);
                    });
                }

                outsidePointerHandler = (event: PointerEvent) => {
                    const target = event.target as Node | null;
                    if (!isEditing) return;
                    if (target && cardEl.contains(target)) return;
                    void commitAndClose();
                };
                window.setTimeout(() => {
                    if (outsidePointerHandler) {
                        document.addEventListener('pointerdown', outsidePointerHandler, true);
                    }
                }, 0);
            } else {
                detachOutsideClose();
                textarea.style.display = 'none';
                preview.style.display = 'block';
            }
        };

        const autoGrow = () => {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.max(96, textarea.scrollHeight)}px`;
        };
        autoGrow();

        const saveBody = async () => {
            const next = textarea.value;
            if ((scene.body || '') === next) return;
            await this.sceneManager.updateScene(scene.filePath, { body: next });
            scene.body = next;
        };

        const commitAndClose = async () => {
            if (!isEditing || commitInProgress) return;
            commitInProgress = true;
            await saveBody();
            await renderPreview();
            setEditing(false);
            commitInProgress = false;
        };

        textarea.addEventListener('input', () => {
            autoGrow();
        });

        textarea.addEventListener('blur', () => {
            void commitAndClose();
        });

        textarea.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                void commitAndClose();
            }
        });

        preview.addEventListener('click', (event: MouseEvent) => {
            setEditing(true, { x: event.clientX, y: event.clientY });
        });

        void (async () => {
            await renderPreview();
            setEditing(false);
        })();

        const footer = editorWrap.createDiv('story-line-corkboard-note-actions');
        const convertBtn = footer.createEl('button', {
            cls: 'story-line-corkboard-convert-btn',
            attr: {
                title: 'Convert to scene',
            },
        });
        obsidian.setIcon(convertBtn, 'clapperboard');
        convertBtn.addEventListener('click', async () => {
            await saveBody();
            await this.convertCorkboardNoteToScene(scene);
        });

        const resizeHandle = cardEl.createDiv('story-line-corkboard-note-resize-handle');
        resizeHandle.addEventListener('pointerdown', (e: PointerEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const startY = e.clientY;
            const startHeight = cardEl.getBoundingClientRect().height;
            const minHeight = 220;

            const onMove = (moveEvent: PointerEvent) => {
                const nextHeight = Math.max(minHeight, startHeight + (moveEvent.clientY - startY));
                cardEl.style.height = `${nextHeight}px`;
            };

            const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        });
    }

    private async convertCorkboardNoteToScene(scene: Scene): Promise<void> {
        await this.sceneManager.updateScene(scene.filePath, {
            corkboardNote: false,
        });
        scene.corkboardNote = false;
        this.refreshBoard();
    }

    private isCorkboardNoteScene(scene: Scene): boolean {
        const value = (scene as Scene & { corkboardNote?: unknown }).corkboardNote;
        if (value === true) return true;
        if (value === false || value === undefined || value === null) return false;
        if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
        if (typeof value === 'number') return value === 1;
        return false;
    }

    private attachCorkboardDrag(node: HTMLElement, scenePath: string): void {
        let dragging = false;
        let startClientX = 0;
        let startClientY = 0;
        let startX = 0;
        let startY = 0;
        let moved = false;

        const onPointerMove = (e: PointerEvent) => {
            if (!dragging) return;

            const dx = e.clientX - startClientX;
            const dy = e.clientY - startClientY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;

            const zoom = this.corkboardCamera.zoom || 1;
            const nextX = startX + dx / zoom;
            const nextY = startY + dy / zoom;

            node.style.left = `${nextX}px`;
            node.style.top = `${nextY}px`;
            const current = this.corkboardPositions.get(scenePath);
            this.corkboardPositions.set(scenePath, { x: nextX, y: nextY, z: current?.z ?? 1 });

            e.preventDefault();
            e.stopPropagation();
        };

        const onPointerUp = (e: PointerEvent) => {
            if (!dragging) return;
            dragging = false;
            node.removeClass('is-dragging');
            if (node.hasPointerCapture(e.pointerId)) {
                node.releasePointerCapture(e.pointerId);
            }

            if (moved) {
                this.corkboardJustDragged.add(scenePath);
                window.setTimeout(() => this.corkboardJustDragged.delete(scenePath), 180);
                this.schedulePersistCorkboardLayout();
            } else {
                const scene = this.sceneManager.getScene(scenePath);
                if (scene && !this.isCorkboardNoteScene(scene)) {
                    this.selectScene(scene, e);
                }
            }
        };

        node.addEventListener('pointerdown', (e: PointerEvent) => {
            if (e.button !== 0) return;

            const target = e.target as HTMLElement;
            if (target.closest('button, a, input, textarea, select')) return;
            if (target.closest('.story-line-corkboard-note-preview')) return;

            const noteCard = target.closest('.story-line-corkboard-note-card') as HTMLElement | null;
            if (noteCard) {
                const rect = noteCard.getBoundingClientRect();
                const resizeGripSize = 20;
                const isInResizeCorner = e.clientX >= rect.right - resizeGripSize && e.clientY >= rect.bottom - resizeGripSize;
                if (isInResizeCorner) return;
            }

            dragging = true;
            moved = false;
            startClientX = e.clientX;
            startClientY = e.clientY;

            const pos = this.corkboardPositions.get(scenePath) || {
                x: parseFloat(node.style.left || '0') || 0,
                y: parseFloat(node.style.top || '0') || 0,
                z: Number.parseInt(node.style.zIndex || '1', 10) || 1,
            };
            startX = pos.x;
            startY = pos.y;

            node.addClass('is-dragging');
            node.setPointerCapture(e.pointerId);
            e.preventDefault();
            e.stopPropagation();
        });

        node.addEventListener('pointermove', onPointerMove);
        node.addEventListener('pointerup', onPointerUp);
        node.addEventListener('pointercancel', onPointerUp);
    }

    private applyCorkboardCamera(canvas: HTMLElement): void {
        canvas.style.transform = `translate(${this.corkboardCamera.x}px, ${this.corkboardCamera.y}px) scale(${this.corkboardCamera.zoom})`;
    }

    private zoomCorkboardAt(canvas: HTMLElement, viewport: HTMLElement, clientX: number, clientY: number, nextZoom: number): void {
        const clamped = Math.max(0.35, Math.min(2.8, nextZoom));
        const rect = viewport.getBoundingClientRect();
        const vx = clientX - rect.left;
        const vy = clientY - rect.top;

        const worldX = (vx - this.corkboardCamera.x) / this.corkboardCamera.zoom;
        const worldY = (vy - this.corkboardCamera.y) / this.corkboardCamera.zoom;

        this.corkboardCamera.zoom = clamped;
        this.corkboardCamera.x = vx - worldX * clamped;
        this.corkboardCamera.y = vy - worldY * clamped;

        this.applyCorkboardCamera(canvas);
    }

    private enableCorkboardCameraInteraction(viewport: HTMLElement, canvas: HTMLElement): () => void {
        let isPanning = false;
        let panPointerId: number | null = null;
        let panStartX = 0;
        let panStartY = 0;
        let camStartX = 0;
        let camStartY = 0;

        const touchPoints = new Map<number, { x: number; y: number }>();
        let pinchPrevDistance = 0;
        let pinchPrevCenter: { x: number; y: number } | null = null;

        const isBackgroundTarget = (target: EventTarget | null): boolean => {
            const el = target as HTMLElement | null;
            if (!el) return true;
            return !el.closest('.story-line-corkboard-node, button, a, input, textarea, select');
        };

        const getTouchPair = (): [{ x: number; y: number }, { x: number; y: number }] | null => {
            const vals = Array.from(touchPoints.values());
            if (vals.length < 2) return null;
            return [vals[0], vals[1]];
        };

        const onPointerDown = (e: PointerEvent) => {
            if (!isBackgroundTarget(e.target)) return;

            if (e.pointerType === 'touch') {
                touchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });

                if (touchPoints.size === 1) {
                    isPanning = true;
                    panPointerId = e.pointerId;
                    panStartX = e.clientX;
                    panStartY = e.clientY;
                    camStartX = this.corkboardCamera.x;
                    camStartY = this.corkboardCamera.y;
                    viewport.classList.add('is-panning');
                } else if (touchPoints.size >= 2) {
                    isPanning = false;
                    panPointerId = null;
                    viewport.classList.remove('is-panning');
                    const pair = getTouchPair();
                    if (pair) {
                        const [a, b] = pair;
                        pinchPrevDistance = Math.hypot(b.x - a.x, b.y - a.y);
                        pinchPrevCenter = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                    }
                }

                if (!viewport.hasPointerCapture(e.pointerId)) {
                    viewport.setPointerCapture(e.pointerId);
                }
                e.preventDefault();
                return;
            }

            const canPanMouse = e.button === 0 || e.button === 1;
            if (!canPanMouse) return;

            isPanning = true;
            panPointerId = e.pointerId;
            panStartX = e.clientX;
            panStartY = e.clientY;
            camStartX = this.corkboardCamera.x;
            camStartY = this.corkboardCamera.y;
            viewport.classList.add('is-panning');

            viewport.setPointerCapture(e.pointerId);
            e.preventDefault();
        };

        const onPointerMove = (e: PointerEvent) => {
            if (e.pointerType === 'touch' && touchPoints.has(e.pointerId)) {
                touchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
            }

            if (touchPoints.size >= 2) {
                const pair = getTouchPair();
                if (!pair) return;
                const [a, b] = pair;
                const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                const dist = Math.hypot(b.x - a.x, b.y - a.y);

                if (pinchPrevDistance > 0) {
                    const zoomFactor = dist / pinchPrevDistance;
                    this.zoomCorkboardAt(canvas, viewport, center.x, center.y, this.corkboardCamera.zoom * zoomFactor);
                }

                if (pinchPrevCenter) {
                    this.corkboardCamera.x += center.x - pinchPrevCenter.x;
                    this.corkboardCamera.y += center.y - pinchPrevCenter.y;
                    this.applyCorkboardCamera(canvas);
                }

                pinchPrevDistance = dist;
                pinchPrevCenter = center;
                e.preventDefault();
                return;
            }

            if (!isPanning || panPointerId !== e.pointerId) return;

            const dx = e.clientX - panStartX;
            const dy = e.clientY - panStartY;
            this.corkboardCamera.x = camStartX + dx;
            this.corkboardCamera.y = camStartY + dy;
            this.applyCorkboardCamera(canvas);
            e.preventDefault();
        };

        const onPointerUp = (e: PointerEvent) => {
            touchPoints.delete(e.pointerId);

            if (touchPoints.size < 2) {
                pinchPrevDistance = 0;
                pinchPrevCenter = null;
            }

            if (panPointerId === e.pointerId) {
                isPanning = false;
                panPointerId = null;
                viewport.classList.remove('is-panning');
            }

            if (viewport.hasPointerCapture(e.pointerId)) {
                viewport.releasePointerCapture(e.pointerId);
            }
        };

        const onWheel = (e: WheelEvent) => {
            const zoomFactor = Math.exp((-e.deltaY) * 0.0012);
            this.zoomCorkboardAt(canvas, viewport, e.clientX, e.clientY, this.corkboardCamera.zoom * zoomFactor);
            e.preventDefault();
        };

        viewport.addEventListener('pointerdown', onPointerDown);
        viewport.addEventListener('pointermove', onPointerMove);
        viewport.addEventListener('pointerup', onPointerUp);
        viewport.addEventListener('pointercancel', onPointerUp);
        viewport.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            viewport.removeEventListener('pointerdown', onPointerDown);
            viewport.removeEventListener('pointermove', onPointerMove);
            viewport.removeEventListener('pointerup', onPointerUp);
            viewport.removeEventListener('pointercancel', onPointerUp);
            viewport.removeEventListener('wheel', onWheel as EventListener);
            viewport.classList.remove('is-panning');
        };
    }

    private ensureCorkboardLayoutLoaded(): void {
        const projectPath = this.sceneManager.activeProject?.filePath ?? null;
        if (projectPath === this.corkboardLoadedProjectFile) return;

        this.corkboardLoadedProjectFile = projectPath;
        this.corkboardPositions.clear();

        const saved = this.sceneManager.getCorkboardPositions();
        for (const [path, pos] of Object.entries(saved)) {
            const x = Number(pos?.x);
            const y = Number(pos?.y);
            const z = Number(pos?.z);
            if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
            this.corkboardPositions.set(path, { x, y, z: Number.isFinite(z) ? z : 1 });
        }
    }

    private schedulePersistCorkboardLayout(): void {
        if (this.corkboardPersistTimer) {
            clearTimeout(this.corkboardPersistTimer);
        }
        this.corkboardPersistTimer = setTimeout(() => {
            this.corkboardPersistTimer = null;
            void this.persistCorkboardLayout();
        }, 500);
    }

    private async persistCorkboardLayout(): Promise<void> {
        const payload: Record<string, { x: number; y: number; z?: number }> = {};
        for (const [path, pos] of this.corkboardPositions.entries()) {
            payload[path] = { x: pos.x, y: pos.y, z: pos.z };
        }
        await this.sceneManager.setCorkboardPositions(payload);
    }

    private showCorkboardNoteMenu(scene: Scene, event: MouseEvent): void {
        const scenePath = scene.filePath;
        const menu = new Menu();

        menu.addItem(item => item
            .setTitle('Top')
            .setIcon('chevrons-up')
            .onClick(() => { this.moveCorkboardLayer(scenePath, 'top'); }));

        menu.addItem(item => item
            .setTitle('Up')
            .setIcon('arrow-up')
            .onClick(() => { this.moveCorkboardLayer(scenePath, 'up'); }));

        menu.addItem(item => item
            .setTitle('Down')
            .setIcon('arrow-down')
            .onClick(() => { this.moveCorkboardLayer(scenePath, 'down'); }));

        menu.addItem(item => item
            .setTitle('Bottom')
            .setIcon('chevrons-down')
            .onClick(() => { this.moveCorkboardLayer(scenePath, 'bottom'); }));

        menu.addSeparator();

        CORKBOARD_NOTE_COLOR_PRESETS.forEach((preset) => {
            menu.addItem(item => item
                .setTitle(`Color: ${preset.label}`)
                .setIcon('palette')
                .onClick(() => { void this.setCorkboardNoteColor(scene, preset.color); }));
        });

        menu.addItem(item => item
            .setTitle('Color: Custom…')
            .setIcon('pipette')
            .onClick(() => { this.openCorkboardNoteColorModal(scene); }));

        menu.addItem(item => item
            .setTitle('Color: Default')
            .setIcon('rotate-ccw')
            .onClick(() => { void this.setCorkboardNoteColor(scene, undefined); }));

        menu.addSeparator();
        menu.addItem(item => item
            .setTitle('Delete Note')
            .setIcon('trash')
            .onClick(async () => {
                await this.deleteScene(scene);
            }));

        menu.addSeparator();
        menu.addItem(item => item
            .setTitle('Convert to Scene')
            .setIcon('clapperboard')
            .onClick(() => { void this.convertCorkboardNoteToScene(scene); }));

        menu.showAtMouseEvent(event);
    }

    private moveCorkboardLayer(scenePath: string, direction: 'top' | 'up' | 'down' | 'bottom'): void {
        const target = this.corkboardPositions.get(scenePath);
        if (!target) return;

        const entries = Array.from(this.corkboardPositions.entries());
        if (entries.length < 2) return;

        entries.sort((a, b) => (a[1].z ?? 0) - (b[1].z ?? 0));
        const index = entries.findIndex(([path]) => path === scenePath);
        if (index < 0) return;

        if (direction === 'top' && index < entries.length - 1) {
            const [entry] = entries.splice(index, 1);
            entries.push(entry);
        } else if (direction === 'bottom' && index > 0) {
            const [entry] = entries.splice(index, 1);
            entries.unshift(entry);
        } else if (direction === 'up' && index < entries.length - 1) {
            const tmp = entries[index + 1];
            entries[index + 1] = entries[index];
            entries[index] = tmp;
        } else if (direction === 'down' && index > 0) {
            const tmp = entries[index - 1];
            entries[index - 1] = entries[index];
            entries[index] = tmp;
        } else {
            return;
        }

        let z = 1;
        for (const [path, pos] of entries) {
            this.corkboardPositions.set(path, { ...pos, z });
            z += 1;
        }

        this.schedulePersistCorkboardLayout();
        this.refreshBoard();
    }

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

    private darkenHexColor(hex: string, factor: number): string {
        const normalized = this.normalizeHexColor(hex) ?? '#F6EDB4';
        const r = Number.parseInt(normalized.slice(1, 3), 16);
        const g = Number.parseInt(normalized.slice(3, 5), 16);
        const b = Number.parseInt(normalized.slice(5, 7), 16);

        const scale = Math.max(0, Math.min(1, 1 - factor));
        const nr = Math.round(r * scale);
        const ng = Math.round(g * scale);
        const nb = Math.round(b * scale);

        const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
        return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
    }

    private hexToRgba(hex: string, alpha: number): string {
        const normalized = this.normalizeHexColor(hex) ?? '#9A9072';
        const r = Number.parseInt(normalized.slice(1, 3), 16);
        const g = Number.parseInt(normalized.slice(3, 5), 16);
        const b = Number.parseInt(normalized.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
    }

    private applyCorkboardNoteColor(cardEl: HTMLElement, scene: Scene): void {
        const base = this.normalizeHexColor(scene.corkboardNoteColor) ?? '#F6EDB4';
        const accentSoft = this.darkenHexColor(base, 0.24);
        const accentStrong = this.darkenHexColor(base, 0.34);
        cardEl.style.setProperty('--sl-note-bg', base);
        cardEl.style.setProperty('--sl-note-accent', accentSoft);
        cardEl.style.setProperty('--sl-note-accent-strong', accentStrong);
    }

    private async setCorkboardNoteColor(scene: Scene, color: string | undefined): Promise<void> {
        const normalized = this.normalizeHexColor(color);
        await this.sceneManager.updateScene(scene.filePath, {
            corkboardNoteColor: normalized,
        });
        scene.corkboardNoteColor = normalized;

        const card = this.boardEl?.querySelector(`[data-path="${CSS.escape(scene.filePath)}"]`) as HTMLElement | null;
        if (card) {
            this.applyCorkboardNoteColor(card, scene);
        }
    }

    private openCorkboardNoteColorModal(scene: Scene): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Custom note color');

        const current = this.normalizeHexColor(scene.corkboardNoteColor) ?? '#F6EDB4';
        const row = modal.contentEl.createDiv('story-line-note-color-modal-row');
        row.createEl('label', { text: 'Pick color' });
        const picker = row.createEl('input', {
            attr: {
                type: 'color',
                value: current,
            },
        });

        new Setting(modal.contentEl)
            .addButton(btn => {
                btn.setButtonText('Cancel').onClick(() => modal.close());
            })
            .addButton(btn => {
                btn.setButtonText('Apply').setCta().onClick(async () => {
                    await this.setCorkboardNoteColor(scene, picker.value);
                    modal.close();
                });
            });

        modal.open();
    }

    /**
     * Render a single board column
     */
    private renderColumn(board: HTMLElement, title: string, scenes: Scene[]): void {
        const column = board.createDiv('story-line-column');
        column.setAttribute('data-group', title);

        // Column header
        const header = column.createDiv('story-line-column-header');

        // Build display title with label if available
        const displayTitle = this.getColumnDisplayTitle(title);
        header.createSpan({
            cls: 'story-line-column-title',
            text: `${displayTitle} (${scenes.length})`
        });

        // Right-click context menu on column header
        if (this.groupBy === 'act' || this.groupBy === 'chapter') {
            header.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showColumnContextMenu(e, title, scenes);
            });
        }

        // Column body (scrollable)
        const body = column.createDiv('story-line-column-body');

        // Helper: render a single scene card with drag-drop handlers
        const renderSceneCard = (scene: Scene, _index: number, parent: HTMLElement): HTMLElement => {
            const cardEl = this.cardComponent.render(scene, parent, {
                compact: this.plugin.settings.compactCardView,
                onSelect: (s, event) => {
                    this.selectScene(s, event);
                },
                onDoubleClick: (s) => this.openScene(s),
                onContextMenu: (s, event) => this.showContextMenu(s, event),
                draggable: true,
            });

            // --- Per-card drop zone for reordering within a column ---
            cardEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = cardEl.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                cardEl.removeClass('drop-above', 'drop-below');
                if (e.clientY < midY) {
                    cardEl.addClass('drop-above');
                } else {
                    cardEl.addClass('drop-below');
                }
            });
            cardEl.addEventListener('dragleave', () => {
                cardEl.removeClass('drop-above', 'drop-below');
            });
            cardEl.addEventListener('drop', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                cardEl.removeClass('drop-above', 'drop-below');
                body.removeClass('drag-over');
                const filePath = e.dataTransfer?.getData('text/scene-path');
                if (!filePath || filePath === scene.filePath) return;

                const rect = cardEl.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const insertBefore = e.clientY < midY;

                await this.handleDropOnCard(filePath, scene, title, scenes, insertBefore);
            });

            // Mobile: touch-based drag-and-drop
            if (isMobile) {
                enableTouchDrag(cardEl, scene.filePath, async (targetEl, insertBefore) => {
                    const targetPath = targetEl.getAttribute('data-path');
                    if (!targetPath || targetPath === scene.filePath) return;
                    const targetScene = this.sceneManager.getScene(targetPath);
                    if (!targetScene) return;

                    // Resolve the *target* column (may differ from source)
                    const targetColumn = targetEl.closest('.story-line-column');
                    const targetGroupKey = targetColumn?.getAttribute('data-group') || title;
                    const groups = this.sceneManager.getScenesGroupedByWithEmpty(
                        this.groupBy, this.currentFilter, this.currentSort
                    );
                    const targetScenes = groups.get(targetGroupKey) || scenes;

                    await this.handleDropOnCard(scene.filePath, targetScene, targetGroupKey, targetScenes, insertBefore);
                });
            }

            return cardEl;
        };

        // Use VirtualScroller for large columns to avoid DOM bloat
        const scroller = new VirtualScroller<Scene>({
            container: body,
            itemHeight: this.plugin.settings.compactCardView ? 60 : 110,
            items: scenes,
            renderItem: renderSceneCard,
            overscan: 5,
            threshold: 40,
        });
        scroller.mount();
        this.scrollers.push(scroller);

        // Column-level drop zone (for empty columns or drop at end)
        body.addEventListener('dragover', (e) => {
            e.preventDefault();
            body.addClass('drag-over');
        });
        body.addEventListener('dragleave', (e) => {
            // Only remove if actually leaving the body
            if (!body.contains(e.relatedTarget as Node)) {
                body.removeClass('drag-over');
            }
        });
        body.addEventListener('drop', async (e) => {
            e.preventDefault();
            body.removeClass('drag-over');
            const filePath = e.dataTransfer?.getData('text/scene-path');
            if (filePath) {
                await this.handleDrop(filePath, title, scenes);
            }
        });

        // Add scene button at bottom
        const addBtn = column.createEl('button', {
            cls: 'story-line-column-add',
            text: '+ Add Scene'
        });
        addBtn.addEventListener('click', () => this.openQuickAdd(title));
    }

    /**
     * Handle dropping a card onto another card for precise reordering.
     */
    private async handleDropOnCard(
        draggedPath: string,
        targetScene: Scene,
        columnTitle: string,
        columnScenes: Scene[],
        insertBefore: boolean
    ): Promise<void> {
        const updates: Partial<Scene> = {};

        // Assign group value (act/chapter/status/pov) based on column
        switch (this.groupBy) {
            case 'act': {
                const match = columnTitle.match(/Act (\d+)/);
                if (match) updates.act = Number(match[1]);
                break;
            }
            case 'chapter': {
                const match = columnTitle.match(/Chapter (\d+)/);
                if (match) updates.chapter = Number(match[1]);
                break;
            }
            case 'status':
                updates.status = columnTitle as SceneStatus;
                break;
            case 'pov':
                updates.pov = columnTitle !== 'No POV' ? columnTitle : undefined;
                break;
        }

        // Compute new sequence based on target position
        const targetSeq = targetScene.sequence ?? 0;
        if (insertBefore) {
            updates.sequence = targetSeq;
        } else {
            updates.sequence = targetSeq + 1;
        }

        await this.sceneManager.updateScene(draggedPath, updates);

        // Resequence siblings to make room
        const siblings = columnScenes
            .filter(s => s.filePath !== draggedPath)
            .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
        let seq = 1;
        for (const s of siblings) {
            if (seq === updates.sequence) seq++;
            await this.sceneManager.updateScene(s.filePath, { sequence: seq });
            seq++;
        }

        this.refreshBoard();
    }

    /**
     * Handle drag-and-drop of a scene to a new column
     */
    private async handleDrop(filePath: string, columnTitle: string, columnScenes: Scene[]): Promise<void> {
        const updates: Partial<Scene> = {};

        // Parse column title to extract value
        switch (this.groupBy) {
            case 'act': {
                const match = columnTitle.match(/Act (\d+)/);
                if (match) updates.act = Number(match[1]);
                break;
            }
            case 'chapter': {
                const match = columnTitle.match(/Chapter (\d+)/);
                if (match) updates.chapter = Number(match[1]);
                break;
            }
            case 'status': {
                updates.status = columnTitle as SceneStatus;
                break;
            }
            case 'pov': {
                updates.pov = columnTitle !== 'No POV' ? columnTitle : undefined;
                break;
            }
        }

        // Update sequence to be at end of column
        const maxSeq = columnScenes.reduce(
            (max, s) => Math.max(max, s.sequence ?? 0),
            0
        );
        updates.sequence = maxSeq + 1;

        await this.sceneManager.updateScene(filePath, updates);
        this.refreshBoard();
    }

    /**
     * Select a scene (show in inspector). Ctrl/Cmd+click for multi-select.
     */
    private selectScene(scene: Scene, event?: MouseEvent): void {
        const isMultiSelect = event && (event.ctrlKey || event.metaKey);

        if (isMultiSelect) {
            // Toggle this scene in multi-selection
            if (this.selectedScenes.has(scene.filePath)) {
                this.selectedScenes.delete(scene.filePath);
                const card = this.boardEl?.querySelector(`[data-path="${CSS.escape(scene.filePath)}"]`);
                if (card) card.removeClass('selected');
            } else {
                this.selectedScenes.add(scene.filePath);
                const card = this.boardEl?.querySelector(`[data-path="${CSS.escape(scene.filePath)}"]`);
                if (card) card.addClass('selected');
            }
            this.selectedScene = scene;
        } else {
            // Single select — clear multi-selection
            this.selectedScenes.clear();
            this.boardEl?.querySelectorAll('.scene-card.selected').forEach(el => {
                el.removeClass('selected');
            });

            this.selectedScene = scene;
            this.selectedScenes.add(scene.filePath);

            // Highlight selected card
            const card = this.boardEl?.querySelector(`[data-path="${CSS.escape(scene.filePath)}"]`);
            if (card) card.addClass('selected');
        }

        // Show inspector for last clicked scene
        this.inspectorComponent?.show(scene);

        // Show/hide bulk action bar
        this.updateBulkBar();
    }

    /**
     * Update the bulk action bar based on current selection
     */
    private updateBulkBar(): void {
        if (!this.bulkBarEl) return;

        if (this.selectedScenes.size < 2) {
            this.bulkBarEl.style.display = 'none';
            return;
        }

        this.bulkBarEl.empty();
        this.bulkBarEl.style.display = 'flex';

        const count = this.selectedScenes.size;
        this.bulkBarEl.createSpan({
            cls: 'bulk-bar-label',
            text: `${count} scenes selected`
        });

        // Bulk status change
        const statusBtn = this.bulkBarEl.createEl('button', {
            cls: 'bulk-bar-btn',
            text: 'Set Status'
        });
        const statusIcon = statusBtn.createSpan();
        obsidian.setIcon(statusIcon, 'check-circle');
        statusBtn.addEventListener('click', (e) => {
            const menu = new Menu();
            const statuses: SceneStatus[] = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];
            statuses.forEach(status => {
                menu.addItem(item => {
                    item.setTitle(status.charAt(0).toUpperCase() + status.slice(1))
                        .onClick(async () => {
                            for (const fp of this.selectedScenes) {
                                await this.sceneManager.updateScene(fp, { status });
                            }
                            new Notice(`Updated status to "${status}" for ${count} scenes`);
                            this.selectedScenes.clear();
                            this.refreshBoard();
                            this.updateBulkBar();
                        });
                });
            });
            menu.showAtMouseEvent(e);
        });

        // Bulk move to act
        const actBtn = this.bulkBarEl.createEl('button', {
            cls: 'bulk-bar-btn',
            text: 'Move to Act'
        });
        const actIcon = actBtn.createSpan();
        obsidian.setIcon(actIcon, 'folder');
        actBtn.addEventListener('click', (e) => {
            const menu = new Menu();
            const acts = this.sceneManager.getDefinedActs();
            if (acts.length === 0) {
                // Fallback: use acts found in scenes
                const actValues = this.sceneManager.getUniqueValues('act');
                actValues.forEach(act => {
                    menu.addItem(item => {
                        item.setTitle(`Act ${act}`)
                            .onClick(async () => {
                                for (const fp of this.selectedScenes) {
                                    await this.sceneManager.updateScene(fp, { act: Number(act) || act });
                                }
                                new Notice(`Moved ${count} scenes to Act ${act}`);
                                this.selectedScenes.clear();
                                this.refreshBoard();
                                this.updateBulkBar();
                            });
                    });
                });
            } else {
                acts.forEach(act => {
                    menu.addItem(item => {
                        item.setTitle(`Act ${act}`)
                            .onClick(async () => {
                                for (const fp of this.selectedScenes) {
                                    await this.sceneManager.updateScene(fp, { act });
                                }
                                new Notice(`Moved ${count} scenes to Act ${act}`);
                                this.selectedScenes.clear();
                                this.refreshBoard();
                                this.updateBulkBar();
                            });
                    });
                });
            }
            menu.showAtMouseEvent(e);
        });

        // Bulk add tag
        const tagBtn = this.bulkBarEl.createEl('button', {
            cls: 'bulk-bar-btn',
            text: 'Add Tag'
        });
        const tagIcon = tagBtn.createSpan();
        obsidian.setIcon(tagIcon, 'tag');
        tagBtn.addEventListener('click', (e) => {
            const menu = new Menu();
            const tags = this.sceneManager.getAllTags();

            tags.forEach(tag => {
                menu.addItem(item => {
                    item.setTitle(tag)
                        .onClick(async () => {
                            for (const fp of this.selectedScenes) {
                                const scene = this.sceneManager.getScene(fp);
                                if (scene) {
                                    const newTags = [...(scene.tags || [])];
                                    if (!newTags.includes(tag)) {
                                        newTags.push(tag);
                                        await this.sceneManager.updateScene(fp, { tags: newTags } as any);
                                    }
                                }
                            }
                            new Notice(`Added tag "${tag}" to ${count} scenes`);
                            this.selectedScenes.clear();
                            this.refreshBoard();
                            this.updateBulkBar();
                        });
                });
            });

            // Option to enter a new tag
            menu.addSeparator();
            menu.addItem(item => {
                item.setTitle('New tag…')
                    .setIcon('plus')
                    .onClick(() => {
                        const newTag = prompt('Enter new tag:');
                        if (newTag) {
                            (async () => {
                                for (const fp of this.selectedScenes) {
                                    const scene = this.sceneManager.getScene(fp);
                                    if (scene) {
                                        const tags = [...(scene.tags || [])];
                                        if (!tags.includes(newTag)) {
                                            tags.push(newTag);
                                            await this.sceneManager.updateScene(fp, { tags } as any);
                                        }
                                    }
                                }
                                new Notice(`Added tag "${newTag}" to ${count} scenes`);
                                this.selectedScenes.clear();
                                this.refreshBoard();
                                this.updateBulkBar();
                            })();
                        }
                    });
            });

            menu.showAtMouseEvent(e);
        });

        // Bulk delete
        const deleteBtn = this.bulkBarEl.createEl('button', {
            cls: 'bulk-bar-btn bulk-bar-delete',
            text: 'Delete'
        });
        const deleteIcon = deleteBtn.createSpan();
        obsidian.setIcon(deleteIcon, 'trash');
        deleteBtn.addEventListener('click', async () => {
            openConfirmModal(this.app, {
                title: 'Delete Scenes',
                message: `Delete ${count} scene(s)? This cannot be undone.`,
                confirmLabel: 'Delete',
                onConfirm: async () => {
                    for (const fp of this.selectedScenes) {
                        await this.sceneManager.deleteScene(fp);
                    }
                    new Notice(`Deleted ${count} scenes`);
                    this.selectedScenes.clear();
                    this.refreshBoard();
                    this.updateBulkBar();
                },
            });
        });

        // Clear selection
        const clearBtn = this.bulkBarEl.createEl('button', {
            cls: 'bulk-bar-btn bulk-bar-clear',
            text: '× Clear'
        });
        clearBtn.addEventListener('click', () => {
            this.selectedScenes.clear();
            this.boardEl?.querySelectorAll('.scene-card.selected').forEach(el => {
                el.removeClass('selected');
            });
            this.updateBulkBar();
        });

        // Merge scenes (2+ selected)
        const mergeBtn = this.bulkBarEl.createEl('button', {
            cls: 'bulk-bar-btn',
            text: 'Merge'
        });
        const mergeIcon = mergeBtn.createSpan();
        obsidian.setIcon(mergeIcon, 'combine');
        mergeBtn.addEventListener('click', () => {
            // Collect selected scenes in sequence order
            const scenes = Array.from(this.selectedScenes)
                .map(fp => this.sceneManager.getScene(fp))
                .filter(Boolean) as Scene[];
            scenes.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

            if (scenes.length < 2) {
                new Notice('Select at least 2 scenes to merge');
                return;
            }

            new MergeSceneModal(this.plugin, scenes, () => {
                this.selectedScenes.clear();
                this.refreshBoard();
                this.updateBulkBar();
            }).open();
        });
    }

    /**
     * Open a scene in the editor
     */
    private async openScene(scene: Scene): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(scene.filePath);
        if (file instanceof TFile) {
            const leaf = this.app.workspace.getLeaf('tab');
            await leaf.openFile(file);
        } else {
            new Notice(`Could not find file: ${scene.filePath}`);
        }
    }

    /**
     * Delete a scene
     */
    private async deleteScene(scene: Scene): Promise<void> {
        await this.sceneManager.deleteScene(scene.filePath);
        this.refreshBoard();
    }

    /**
     * Show context menu for a scene
     */
    private showContextMenu(scene: Scene, event: MouseEvent): void {
        const menu = new Menu();

        if (this.boardMode === 'corkboard') {
            menu.addItem(item => item
                .setTitle('Top')
                .setIcon('chevrons-up')
                .onClick(() => { this.moveCorkboardLayer(scene.filePath, 'top'); }));

            menu.addItem(item => item
                .setTitle('Up')
                .setIcon('arrow-up')
                .onClick(() => { this.moveCorkboardLayer(scene.filePath, 'up'); }));

            menu.addItem(item => item
                .setTitle('Down')
                .setIcon('arrow-down')
                .onClick(() => { this.moveCorkboardLayer(scene.filePath, 'down'); }));

            menu.addItem(item => item
                .setTitle('Bottom')
                .setIcon('chevrons-down')
                .onClick(() => { this.moveCorkboardLayer(scene.filePath, 'bottom'); }));

            menu.addSeparator();
        }

        menu.addItem(item => {
            item.setTitle('Edit Scene')
                .setIcon('pencil')
                .onClick(() => this.openScene(scene));
        });

        menu.addItem(item => {
            item.setTitle('Duplicate Scene')
                .setIcon('copy')
                .onClick(async () => {
                    await this.sceneManager.duplicateScene(scene.filePath);
                    this.refreshBoard();
                });
        });

        menu.addItem(item => {
            item.setTitle('Split Scene')
                .setIcon('scissors')
                .onClick(() => {
                    new SplitSceneModal(this.plugin, scene, () => this.refreshBoard()).open();
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
                        this.refreshBoard();
                    });
            });
        });

        menu.addSeparator();

        // Move to Act submenu
        const definedActs = this.sceneManager.getDefinedActs();
        if (definedActs.length > 0) {
            menu.addItem(item => {
                item.setTitle('Move to Act…')
                    .setIcon('folder');
                // Build submenu manually via Menu
            });
            for (const act of definedActs) {
                menu.addItem(item => {
                    const actLabel = this.sceneManager.getActLabel(act);
                    const display = actLabel ? `Act ${act} — ${actLabel}` : `Act ${act}`;
                    item.setTitle(display)
                        .setChecked(scene.act === act)
                        .onClick(async () => {
                            await this.sceneManager.updateScene(scene.filePath, { act });
                            this.refreshBoard();
                        });
                });
            }
        }

        // Move to Chapter submenu
        const definedChapters = this.sceneManager.getDefinedChapters();
        if (definedChapters.length > 0) {
            menu.addSeparator();
            for (const ch of definedChapters) {
                menu.addItem(item => {
                    const chLabel = this.sceneManager.getChapterLabel(ch);
                    const display = chLabel ? `Ch ${ch} — ${chLabel}` : `Chapter ${ch}`;
                    item.setTitle(display)
                        .setChecked(scene.chapter === ch)
                        .onClick(async () => {
                            await this.sceneManager.updateScene(scene.filePath, { chapter: ch });
                            this.refreshBoard();
                        });
                });
            }
        }

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
     * Build a display title for a column header, including labels if available.
     */
    private getColumnDisplayTitle(groupKey: string): string {
        // Parse "Act N" or "Chapter N"
        const actMatch = groupKey.match(/^Act\s+(\d+)$/);
        if (actMatch) {
            const actNum = parseInt(actMatch[1], 10);
            const label = this.sceneManager.getActLabel(actNum);
            return label ? `Act ${actNum} — ${label}` : groupKey;
        }
        const chMatch = groupKey.match(/^Chapter\s+(\d+)$/);
        if (chMatch) {
            const chNum = parseInt(chMatch[1], 10);
            const label = this.sceneManager.getChapterLabel(chNum);
            return label ? `Ch ${chNum} — ${label}` : groupKey;
        }
        return groupKey;
    }

    /**
     * Show context menu on a column header (right-click).
     * Allows deleting/renaming acts or chapters.
     */
    private showColumnContextMenu(event: MouseEvent, groupKey: string, scenes: Scene[]): void {
        const menu = new Menu();
        const actMatch = groupKey.match(/^Act\s+(\d+)$/);
        const chMatch = groupKey.match(/^Chapter\s+(\d+)$/);

        if (actMatch) {
            const actNum = parseInt(actMatch[1], 10);
            const currentLabel = this.sceneManager.getActLabel(actNum) || '';

            menu.addItem(item => {
                item.setTitle('Rename Act')
                    .setIcon('pencil')
                    .onClick(() => {
                        this.openRenameModal('Act', actNum, currentLabel, async (newLabel) => {
                            await this.sceneManager.setActLabel(actNum, newLabel);
                            this.refreshBoard();
                        });
                    });
            });

            menu.addItem(item => {
                item.setTitle('Delete Act')
                    .setIcon('trash')
                    .onClick(() => {
                        if (scenes.length > 0) {
                            openConfirmModal(this.app, {
                                title: 'Delete Act',
                                message: `Act ${actNum} contains ${scenes.length} scene(s). Deleting the act removes the column but keeps the scenes (they'll become unassigned). Continue?`,
                                onConfirm: async () => {
                                    // Unassign scenes from this act
                                    for (const s of scenes) {
                                        await this.sceneManager.updateScene(s.filePath, { act: undefined });
                                    }
                                    await this.sceneManager.removeAct(actNum);
                                    await this.sceneManager.setActLabel(actNum, '');
                                    this.refreshBoard();
                                    new Notice(`Deleted Act ${actNum}`);
                                },
                            });
                        } else {
                            this.sceneManager.removeAct(actNum).then(() => {
                                this.sceneManager.setActLabel(actNum, '').then(() => {
                                    this.refreshBoard();
                                    new Notice(`Deleted Act ${actNum}`);
                                });
                            });
                        }
                    });
            });

            // Add existing scenes to this act
            menu.addSeparator();
            menu.addItem(item => {
                item.setTitle('Add existing scenes…')
                    .setIcon('plus-circle')
                    .onClick(() => {
                        this.openAssignScenesModal('act', actNum);
                    });
            });
        } else if (chMatch) {
            const chNum = parseInt(chMatch[1], 10);
            const currentLabel = this.sceneManager.getChapterLabel(chNum) || '';

            menu.addItem(item => {
                item.setTitle('Rename Chapter')
                    .setIcon('pencil')
                    .onClick(() => {
                        this.openRenameModal('Chapter', chNum, currentLabel, async (newLabel) => {
                            await this.sceneManager.setChapterLabel(chNum, newLabel);
                            this.refreshBoard();
                        });
                    });
            });

            menu.addItem(item => {
                item.setTitle('Delete Chapter')
                    .setIcon('trash')
                    .onClick(() => {
                        if (scenes.length > 0) {
                            openConfirmModal(this.app, {
                                title: 'Delete Chapter',
                                message: `Chapter ${chNum} contains ${scenes.length} scene(s). Deleting the chapter removes the column but keeps the scenes (they'll become unassigned). Continue?`,
                                onConfirm: async () => {
                                    for (const s of scenes) {
                                        await this.sceneManager.updateScene(s.filePath, { chapter: undefined });
                                    }
                                    await this.sceneManager.removeChapter(chNum);
                                    await this.sceneManager.setChapterLabel(chNum, '');
                                    this.refreshBoard();
                                    new Notice(`Deleted Chapter ${chNum}`);
                                },
                            });
                        } else {
                            this.sceneManager.removeChapter(chNum).then(() => {
                                this.sceneManager.setChapterLabel(chNum, '').then(() => {
                                    this.refreshBoard();
                                    new Notice(`Deleted Chapter ${chNum}`);
                                });
                            });
                        }
                    });
            });

            // Add existing scenes to this chapter
            menu.addSeparator();
            menu.addItem(item => {
                item.setTitle('Add existing scenes…')
                    .setIcon('plus-circle')
                    .onClick(() => {
                        this.openAssignScenesModal('chapter', chNum);
                    });
            });
        }

        menu.showAtMouseEvent(event);
    }

    /**
     * Open a small modal to rename an act or chapter label.
     */
    private openRenameModal(type: string, num: number, current: string, onSave: (label: string) => Promise<void>): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText(`Rename ${type} ${num}`);
        const { contentEl } = modal;

        let value = current;
        new Setting(contentEl)
            .setName('Label')
            .setDesc(`Display name for ${type} ${num}. Leave blank to remove.`)
            .addText(text => {
                text.setValue(current)
                    .setPlaceholder(`e.g. "The Beginning"`)
                    .onChange(v => { value = v; });
                // Auto-focus
                setTimeout(() => text.inputEl.focus(), 50);
            });

        const btnRow = contentEl.createDiv('structure-close-row');
        const saveBtn = btnRow.createEl('button', { text: 'Save', cls: 'mod-cta' });
        saveBtn.addEventListener('click', async () => {
            await onSave(value);
            modal.close();
        });
        const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => modal.close());

        modal.open();
    }

    /**
     * Open a modal to assign existing scenes to a chapter or act.
     * Shows a checklist of unassigned scenes (those without a chapter/act value).
     */
    private openAssignScenesModal(field: 'chapter' | 'act', value: number): void {
        const modal = new Modal(this.app);
        const label = field === 'chapter'
            ? `Chapter ${value}` + (this.sceneManager.getChapterLabel(value) ? ` — ${this.sceneManager.getChapterLabel(value)}` : '')
            : `Act ${value}` + (this.sceneManager.getActLabel(value) ? ` — ${this.sceneManager.getActLabel(value)}` : '');
        modal.titleEl.setText(`Add scenes to ${label}`);

        const { contentEl } = modal;
        contentEl.createEl('p', {
            cls: 'setting-item-description',
            text: `Select scenes to assign to ${label}. Only scenes not already in a ${field} are shown.`
        });

        const allScenes = this.sceneManager.getFilteredScenes(
            undefined,
            { field: 'sequence', direction: 'asc' }
        );
        // Show scenes without a value for this field, plus scenes in other groups
        const candidates = allScenes.filter(s => {
            const current = field === 'chapter' ? s.chapter : s.act;
            return current === undefined || current !== value;
        });

        if (candidates.length === 0) {
            contentEl.createEl('p', { text: 'All scenes are already assigned.' });
            const closeRow = contentEl.createDiv('structure-close-row');
            closeRow.createEl('button', { text: 'Close', cls: 'mod-cta' })
                .addEventListener('click', () => modal.close());
            modal.open();
            return;
        }

        const selectedPaths = new Set<string>();
        const listEl = contentEl.createDiv('assign-scene-list');
        listEl.style.maxHeight = '400px';
        listEl.style.overflow = 'auto';
        listEl.style.margin = '8px 0';

        for (const scene of candidates) {
            const row = listEl.createDiv('assign-scene-row');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '8px';
            row.style.padding = '4px 0';

            const cb = row.createEl('input', { type: 'checkbox' }) as HTMLInputElement;
            const currentVal = field === 'chapter' ? scene.chapter : scene.act;
            const info = currentVal !== undefined ? ` [${field} ${currentVal}]` : ' [unassigned]';
            row.createSpan({ text: `${scene.title}${info}` });

            cb.addEventListener('change', () => {
                if (cb.checked) selectedPaths.add(scene.filePath);
                else selectedPaths.delete(scene.filePath);
            });
        }

        const btnRow = contentEl.createDiv('structure-close-row');
        btnRow.style.display = 'flex';
        btnRow.style.gap = '8px';
        btnRow.style.marginTop = '12px';
        const assignBtn = btnRow.createEl('button', { text: 'Assign Selected', cls: 'mod-cta' });
        assignBtn.addEventListener('click', async () => {
            if (selectedPaths.size === 0) {
                new Notice('No scenes selected');
                return;
            }
            for (const fp of selectedPaths) {
                const updates: Partial<Scene> = {};
                if (field === 'chapter') updates.chapter = value;
                else updates.act = value;
                await this.sceneManager.updateScene(fp, updates);
            }
            new Notice(`Assigned ${selectedPaths.size} scene(s) to ${label}`);
            modal.close();
            this.refreshBoard();
        });
        const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => modal.close());

        modal.open();
    }

    /**
     * Open the structure modal to add/remove empty acts and chapters
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
            info.createSpan({ text: `${template.acts.length} acts · ${template.beats.length} beats` });
            if (template.chapters.length > 0) {
                info.createSpan({ text: ` · ${template.chapters.length} chapters` });
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
        const actsDesc = contentEl.createEl('p', {
            cls: 'setting-item-description',
            text: 'Define acts for your story. Empty acts will appear as columns even without scenes.'
        });

        const actsList = contentEl.createDiv('structure-list');
        const definedActs = this.sceneManager.getDefinedActs();
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

        // Add acts controls
        const addActRow = contentEl.createDiv('structure-add-row');
        new Setting(addActRow)
            .setName('Add acts')
            .setDesc('Enter act numbers (e.g. "1,2,3,4,5" or "6" to add one)')
            .addText(text => {
                text.setPlaceholder('1,2,3,4,5');
                text.inputEl.addClass('structure-input');
                (text.inputEl as any)._ref = text;
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
            text: 'Define chapters. Empty chapters appear as columns when grouping by chapter.'
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
            const chLabels = this.sceneManager.getChapterLabels();
            if (chapters.length === 0) {
                chaptersList.createEl('p', { cls: 'structure-empty', text: 'No chapters defined yet.' });
            }
            for (const ch of chapters) {
                const count = scenesPerChapter.get(ch) || 0;
                const chLabel = chLabels[ch];
                const row = chaptersList.createDiv('structure-row');
                const labelText = chLabel ? `Chapter ${ch} — ${chLabel}` : `Chapter ${ch}`;
                row.createSpan({ cls: 'structure-label', text: labelText });
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
                    // Support range syntax: "1-10"
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
            this.refreshBoard();
        });

        modal.open();
    }

    /**
     * Open the Quick Add modal
     */
    private openQuickAdd(presetColumn?: string): void {
        const modal = new QuickAddModal(
            this.app,
            this.plugin,
            this.sceneManager,
            async (sceneData, openAfter) => {
                // Set preset values from column
                if (presetColumn && this.groupBy === 'act') {
                    const match = presetColumn.match(/Act (\d+)/);
                    if (match) sceneData.act = Number(match[1]);
                }

                const file = await this.sceneManager.createScene(sceneData);
                this.refreshBoard();

                if (openAfter) {
                    await this.app.workspace.getLeaf('tab').openFile(file);
                }
            }
        );
        modal.open();
    }

    private getCurrentMaxCorkboardZ(): number {
        let max = 0;
        for (const pos of this.corkboardPositions.values()) {
            if ((pos.z ?? 0) > max) max = pos.z ?? 0;
        }
        return max;
    }

    private getNextQuickNotePosition(): { x: number; y: number; z: number } {
        const now = Date.now();
        if (now - this.quickNoteLastCreatedAt <= 8000) {
            this.quickNoteChainIndex += 1;
        } else {
            this.quickNoteChainIndex = 0;
        }
        this.quickNoteLastCreatedAt = now;

        const offset = this.quickNoteChainIndex * 28;
        const viewport = this.boardEl?.querySelector('.story-line-corkboard-viewport') as HTMLElement | null;
        const zoom = this.corkboardCamera.zoom || 1;

        let centerWorldX = 0;
        let centerWorldY = 0;

        if (viewport) {
            const rect = viewport.getBoundingClientRect();
            centerWorldX = ((rect.width / 2) - this.corkboardCamera.x) / zoom;
            centerWorldY = ((rect.height / 2) - this.corkboardCamera.y) / zoom;
        } else {
            centerWorldX = (-this.corkboardCamera.x) / zoom;
            centerWorldY = (-this.corkboardCamera.y) / zoom;
        }

        return {
            x: centerWorldX - 140 + offset,
            y: centerWorldY - 110 + offset,
            z: this.getCurrentMaxCorkboardZ() + 1,
        };
    }

    /**
     * Refresh the board display
     */
    refreshBoard(): void {
        this.configureDragToPan();
        if (this.boardMode === 'corkboard') {
            this.renderCorkboard();
        } else {
            this.renderBoard();
        }
        // Also refresh inspector if a scene is selected
        if (this.selectedScene) {
            const updated = this.sceneManager.getScene(this.selectedScene.filePath);
            if (updated) {
                this.selectedScene = updated;
                this.inspectorComponent?.show(updated);
            }
        }
    }

    /**
     * Full refresh called by the plugin on file changes
     */
    refresh(): void {
        if (this.rootContainer) {
            this.renderView(this.rootContainer);
        }
    }

    private configureDragToPan(): void {
        if (!this.boardEl) return;

        if (this.boardMode !== 'corkboard' && this.corkboardInteractionCleanup) {
            this.corkboardInteractionCleanup();
            this.corkboardInteractionCleanup = null;
        }

        if (this.dragToPanCleanup) {
            this.dragToPanCleanup();
            this.dragToPanCleanup = null;
        }

        if (this.boardMode === 'kanban') {
            this.dragToPanCleanup = enableDragToPan(this.boardEl);
        }
    }

    private async openQuickAddIdea(): Promise<void> {
        const file = await this.sceneManager.createScene({
            status: 'idea',
            corkboardNote: true,
        });

        const pos = this.getNextQuickNotePosition();
        this.corkboardPositions.set(file.path, pos);
        this.schedulePersistCorkboardLayout();

        this.refreshBoard();
    }

    /**
     * Sort group keys intelligently
     */
    private sortGroupKeys(keys: string[]): string[] {
        return keys.sort((a, b) => {
            // Try numeric sort first
            const numA = parseInt(a.replace(/\D/g, ''));
            const numB = parseInt(b.replace(/\D/g, ''));
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            // "No X" groups go last
            if (a.startsWith('No ')) return 1;
            if (b.startsWith('No ')) return -1;
            return a.localeCompare(b);
        });
    }
}
