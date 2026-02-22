import { ItemView, WorkspaceLeaf, Menu, Notice, TFile, Modal, Setting } from 'obsidian';
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
import { BOARD_VIEW_TYPE } from '../constants';
import type SceneCardsPlugin from '../main';

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
    /** Active virtual scrollers — cleaned up on re-render */
    private scrollers: VirtualScroller<Scene>[] = [];

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin, sceneManager: SceneManager) {
        super(leaf);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
        this.cardComponent = new SceneCardComponent(plugin);
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
        this.rootContainer = container;

        await this.sceneManager.initialize();
        this.renderView(container);
    }

    async onClose(): Promise<void> {
        // cleanup
    }

    /**
     * Render the entire board view
     */
    private renderView(container: HTMLElement): void {
        container.empty();

        // Toolbar
        const toolbar = container.createDiv('story-line-toolbar');
        this.renderToolbar(toolbar);

        // Main content area (board + inspector)
        const mainArea = container.createDiv('story-line-main-area');

        // Filters
        const filterContainer = mainArea.createDiv('story-line-filters-container');
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
        enableDragToPan(this.boardEl);

        // Bulk action bar (hidden until 2+ selected)
        this.bulkBarEl = mainArea.createDiv('story-line-bulk-bar');
        this.bulkBarEl.style.display = 'none';

        this.renderBoard();

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
            const scenes = groups.get(key) || [];
            this.renderColumn(this.boardEl, key, scenes);
        }
    }

    /**
     * Render a single board column
     */
    private renderColumn(board: HTMLElement, title: string, scenes: Scene[]): void {
        const column = board.createDiv('story-line-column');

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

    /**
     * Refresh the board display
     */
    refreshBoard(): void {
        this.renderBoard();
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
