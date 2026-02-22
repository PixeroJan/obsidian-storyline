import { ItemView, WorkspaceLeaf, TFile, Setting, Notice, Menu, Modal } from 'obsidian';
import * as obsidian from 'obsidian';
import { Scene } from '../models/Scene';
import { SceneManager } from '../services/SceneManager';
import { renderViewSwitcher } from '../components/ViewSwitcher';
import type SceneCardsPlugin from '../main';

import { STORYLINE_VIEW_TYPE } from '../constants';

type SortMode = 'alpha' | 'scenes-desc' | 'scenes-asc' | 'book-order';

/**
 * Plotlines View — shows scenes grouped by plotline tags.
 * Each plotline can be renamed, deleted, and scenes can be
 * assigned or removed via click menus.
 */
export class StorylineView extends ItemView {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;
    private rootContainer: HTMLElement | null = null;
    private sortMode: SortMode = 'alpha';

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin, sceneManager: SceneManager) {
        super(leaf);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
    }

    getViewType(): string {
        return STORYLINE_VIEW_TYPE;
    }

    getDisplayText(): string {
        const title = this.plugin?.sceneManager?.activeProject?.title;
        return title ? `StoryLine - ${title}` : 'StoryLine';
    }

    getIcon(): string {
        return 'git-branch';
    }

    async onOpen(): Promise<void> {
        this.plugin.storyLeaf = this.leaf;
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('story-line-storyline-container');
        this.rootContainer = container;

        await this.sceneManager.initialize();
        this.renderView(container);
    }

    async onClose(): Promise<void> {}

    private renderView(container: HTMLElement): void {
        container.empty();

        // Toolbar
        const toolbar = container.createDiv('story-line-toolbar');
        const titleRow = toolbar.createDiv('story-line-title-row');
        titleRow.createEl('h3', { cls: 'story-line-view-title', text: 'StoryLine' });
        // project name shown in top-center only; no inline project selector here

        // View switcher tabs
        renderViewSwitcher(toolbar, STORYLINE_VIEW_TYPE, this.plugin, this.leaf);

        // Controls row
        const controls = toolbar.createDiv('story-line-toolbar-controls');

        // Sort button
        const sortBtn = controls.createEl('button', {
            cls: 'story-line-toolbar-btn',
            attr: { 'aria-label': 'Sort plotlines', title: 'Sort plotlines' },
        });
        const sortIconSpan = sortBtn.createSpan();
        obsidian.setIcon(sortIconSpan, 'arrow-down-up');
        sortBtn.addEventListener('click', (e) => {
            const menu = new Menu();
            menu.addItem((item: any) => {
                item.setTitle(`${this.sortMode === 'alpha' ? '✓ ' : ''}Alphabetical`)
                    .onClick(() => { this.sortMode = 'alpha'; this.refresh(); });
            });
            menu.addItem((item: any) => {
                item.setTitle(`${this.sortMode === 'scenes-desc' ? '✓ ' : ''}Most scenes first`)
                    .onClick(() => { this.sortMode = 'scenes-desc'; this.refresh(); });
            });
            menu.addItem((item: any) => {
                item.setTitle(`${this.sortMode === 'scenes-asc' ? '✓ ' : ''}Fewest scenes first`)
                    .onClick(() => { this.sortMode = 'scenes-asc'; this.refresh(); });
            });
            menu.addItem((item: any) => {
                item.setTitle(`${this.sortMode === 'book-order' ? '✓ ' : ''}Book order (scene #)`)
                    .onClick(() => { this.sortMode = 'book-order'; this.refresh(); });
            });
            menu.showAtPosition({ x: e.clientX, y: e.clientY });
        });

        // New plotline button
        const addPlotlineBtn = controls.createEl('button', {
            cls: 'mod-cta story-line-add-btn',
            text: '+ New Plotline'
        });
        addPlotlineBtn.addEventListener('click', () => this.openNewPlotlineModal());

        const content = container.createDiv('story-line-storyline-content');

        const scenes = this.sceneManager.getFilteredScenes(
            undefined,
            { field: 'sequence', direction: 'asc' }
        );

        // Group scenes by plotline tags
        const plotlines = this.groupByPlotline(scenes);

        if (plotlines.size === 0 && scenes.length === 0) {
            content.createDiv({
                cls: 'story-line-empty',
                text: 'No scenes found. Create scenes first, then create plotlines to organize them.'
            });
            return;
        }

        // Sort plotline keys
        let plotlineKeys = Array.from(plotlines.keys());
        if (this.sortMode === 'alpha') {
            plotlineKeys.sort();
        } else if (this.sortMode === 'scenes-desc') {
            plotlineKeys.sort((a, b) => (plotlines.get(b)?.length || 0) - (plotlines.get(a)?.length || 0));
        } else if (this.sortMode === 'scenes-asc') {
            plotlineKeys.sort((a, b) => (plotlines.get(a)?.length || 0) - (plotlines.get(b)?.length || 0));
        } else if (this.sortMode === 'book-order') {
            // Sort by the sequence number of the first scene in each plotline
            plotlineKeys.sort((a, b) => {
                const aScenes = plotlines.get(a) || [];
                const bScenes = plotlines.get(b) || [];
                const aSeq = aScenes.length > 0 ? Math.min(...aScenes.map(s => s.sequence ?? Infinity)) : Infinity;
                const bSeq = bScenes.length > 0 ? Math.min(...bScenes.map(s => s.sequence ?? Infinity)) : Infinity;
                return aSeq - bSeq;
            });
        }

        // Help text
        if (plotlineKeys.length > 0) {
            const helpText = content.createDiv('storyline-help');
            helpText.createSpan({
                cls: 'storyline-help-text',
                text: 'A plotline groups scenes that share a story thread — e.g. "main mystery" or "love story". '
                    + 'Hover a plotline header for ✏️ rename, ➕ add scenes, or 🗑️ delete. '
                    + 'Click any scene to assign/remove it from plotlines.'
            });
        }

        // Render each plotline
        for (const plotline of plotlineKeys) {
            const plotScenes = plotlines.get(plotline) || [];
            this.renderPlotline(content, plotline, plotScenes, scenes);
        }

        // Unassigned scenes
        const unassigned = scenes.filter(s => !s.tags || s.tags.length === 0);
        if (unassigned.length > 0) {
            const unassignedSection = content.createDiv('storyline-orphaned');
            const header = unassignedSection.createDiv('storyline-header storyline-unassigned-header');
            header.createSpan({
                cls: 'storyline-unassigned-label',
                text: `Unassigned (${unassigned.length} scenes)`
            });
            header.createSpan({
                cls: 'storyline-unassigned-hint',
                text: '— click a scene to assign it to a plotline'
            });

            const nodeRow = unassignedSection.createDiv('storyline-nodes');
            unassigned.forEach(scene => {
                this.renderSceneNode(nodeRow, scene, plotlineKeys);
            });
        }

        // If no plotlines exist but scenes do, show getting-started hint
        if (plotlineKeys.length === 0 && scenes.length > 0) {
            const hint = content.createDiv('storyline-getting-started');
            hint.createEl('h4', { text: 'What are plotlines?' });
            hint.createEl('p', {
                text: 'A plotline is a story thread that runs through your scenes. '
                    + 'For example: "main mystery", "love story", "character arc — Flora".'
            });
            hint.createEl('h4', { text: 'How to get started' });
            const steps = hint.createEl('ol');
            steps.createEl('li', { text: 'Click "+ New Plotline" above' });
            steps.createEl('li', { text: 'Give it a name (e.g. "main mystery")' });
            steps.createEl('li', { text: 'Select which scenes belong to it' });
            hint.createEl('p', {
                cls: 'storyline-help-text',
                text: 'You can assign a scene to multiple plotlines. '
                    + 'This helps you see how each thread weaves through your story.'
            });
        }
    }

    private renderPlotline(
        container: HTMLElement,
        plotline: string,
        scenes: Scene[],
        allScenes: Scene[]
    ): void {
        const section = container.createDiv('storyline-section');
        const tagColors = this.plugin.settings.tagColors || {};
        const plotlineColor = tagColors[plotline] || '';

        // Collapsible header
        const header = section.createDiv('storyline-header');
        if (plotlineColor) {
            header.style.borderLeftColor = plotlineColor;
        }
        const toggle = header.createSpan({ cls: 'storyline-toggle', text: '▼ ' });
        const titleSpan = header.createSpan({
            cls: 'storyline-plotline-title',
            text: `${this.formatPlotlineName(plotline)} (${scenes.length})`
        });

        // Header action buttons (right side)
        const actions = header.createDiv('storyline-header-actions');

        // Rename button
        const renameBtn = actions.createEl('button', {
            cls: 'clickable-icon storyline-action-btn',
            attr: { 'aria-label': 'Rename plotline', title: 'Rename' }
        });
        const renameIcon = renameBtn.createSpan();
        obsidian.setIcon(renameIcon, 'pencil');
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openRenamePlotlineModal(plotline);
        });

        // Add scenes button
        const addToPlotBtn = actions.createEl('button', {
            cls: 'clickable-icon storyline-action-btn',
            attr: { 'aria-label': 'Add scenes to this plotline', title: 'Add scenes' }
        });
        const addIcon = addToPlotBtn.createSpan();
        obsidian.setIcon(addIcon, 'plus');
        addToPlotBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openAddSceneToPlotlineModal(plotline, scenes, allScenes);
        });

        // Delete button
        const deleteBtn = actions.createEl('button', {
            cls: 'clickable-icon storyline-action-btn storyline-delete-btn',
            attr: { 'aria-label': 'Delete plotline', title: 'Delete' }
        });
        const deleteIcon = deleteBtn.createSpan();
        obsidian.setIcon(deleteIcon, 'trash-2');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDeletePlotline(plotline, scenes.length);
        });

        // Right-click context menu
        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const menu = new Menu();
            menu.addItem((item: any) => {
                item.setTitle('Rename plotline')
                    .setIcon('pencil')
                    .onClick(() => this.openRenamePlotlineModal(plotline));
            });
            menu.addItem((item: any) => {
                item.setTitle('Add scenes')
                    .setIcon('plus')
                    .onClick(() => this.openAddSceneToPlotlineModal(plotline, scenes, allScenes));
            });
            menu.addSeparator();
            menu.addItem((item: any) => {
                item.setTitle('Delete plotline')
                    .setIcon('trash-2')
                    .onClick(() => this.confirmDeletePlotline(plotline, scenes.length));
            });
            menu.showAtPosition({ x: e.clientX, y: e.clientY });
        });

        const body = section.createDiv('storyline-body');

        // Group scenes by act for visual flow
        const actGroups = new Map<string, Scene[]>();
        for (const scene of scenes) {
            const actKey = scene.act !== undefined ? `Act ${scene.act}` : 'No Act';
            if (!actGroups.has(actKey)) actGroups.set(actKey, []);
            actGroups.get(actKey)!.push(scene);
        }

        if (actGroups.size > 1 || (actGroups.size === 1 && !actGroups.has('No Act'))) {
            // Show scenes grouped by act with a visual flow
            for (const [actLabel, actScenes] of actGroups) {
                const actGroup = body.createDiv('plotline-act-group');
                actGroup.createSpan({ cls: 'plotline-act-label', text: actLabel });
                const flow = actGroup.createDiv('storyline-flow');
                actScenes.forEach((scene, idx) => {
                    this.renderSceneNode(flow, scene, [plotline]);
                    if (idx < actScenes.length - 1) {
                        flow.createSpan({ cls: 'storyline-arrow', text: '→' });
                    }
                });
            }
        } else {
            // Simple flow when no acts
            const flow = body.createDiv('storyline-flow');
            scenes.forEach((scene, idx) => {
                this.renderSceneNode(flow, scene, [plotline]);
                if (idx < scenes.length - 1) {
                    flow.createSpan({ cls: 'storyline-arrow', text: '→' });
                }
            });
        }

        // Coverage summary
        const totalScenes = allScenes.length;
        const pct = totalScenes > 0 ? Math.round((scenes.length / totalScenes) * 100) : 0;
        const summary = body.createDiv('plotline-summary');
        summary.createSpan({
            cls: 'plotline-summary-text',
            text: `${scenes.length} of ${totalScenes} scenes (${pct}%)`
        });
        // Mini progress bar
        const bar = summary.createDiv('plotline-progress-bar');
        const fill = bar.createDiv('plotline-progress-fill');
        fill.style.width = `${pct}%`;
        if (plotlineColor) {
            fill.style.backgroundColor = plotlineColor;
        }

        // Toggle collapse
        let collapsed = false;
        header.addEventListener('click', () => {
            collapsed = !collapsed;
            body.style.display = collapsed ? 'none' : 'block';
            toggle.textContent = collapsed ? '▶ ' : '▼ ';
        });
    }

    private renderSceneNode(
        container: HTMLElement,
        scene: Scene,
        availablePlotlines: string[]
    ): void {
        const node = container.createDiv('storyline-node');
        const act = scene.act !== undefined ? String(scene.act).padStart(2, '0') : '??';
        const seq = scene.sequence !== undefined ? String(scene.sequence).padStart(2, '0') : '??';

        node.createSpan({
            cls: 'storyline-node-id',
            text: `[${act}-${seq}]`
        });
        node.createSpan({
            cls: 'storyline-node-title',
            text: ` ${scene.title || 'Untitled'}`
        });

        // Show existing tags as small badges
        if (scene.tags?.length) {
            const tagsEl = node.createDiv('storyline-node-tags');
            const tagColors = this.plugin.settings.tagColors || {};
            scene.tags.forEach(tag => {
                const badge = tagsEl.createSpan({ cls: 'storyline-tag-badge', text: tag });
                if (tagColors[tag]) {
                    badge.style.backgroundColor = tagColors[tag];
                }
            });
        }

        // Status indicator
        node.setAttribute('data-status', scene.status || 'idea');

        // Click to open tag assignment menu
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showTagAssignMenu(scene, node);
        });

        node.setAttribute('title', `${scene.title || 'Untitled'}\nTags: ${scene.tags?.join(', ') || 'none'}\nClick to assign/remove plotline`);
    }

    /**
     * Show a menu to assign/remove plotline tags from a scene
     */
    private showTagAssignMenu(scene: Scene, anchorEl: HTMLElement): void {
        const menu = new Menu();
        const allTags = this.sceneManager.getAllTags();
        const sceneTags = new Set(scene.tags || []);

        if (allTags.length > 0) {
            for (const tag of allTags) {
                const hasTag = sceneTags.has(tag);
                menu.addItem((item: any) => {
                    item.setTitle(`${hasTag ? '✓ ' : '   '}${this.formatPlotlineName(tag)}`)
                        .onClick(async () => {
                            const newTags = hasTag
                                ? (scene.tags || []).filter((t: string) => t !== tag)
                                : [...(scene.tags || []), tag];
                            await this.sceneManager.updateScene(scene.filePath, { tags: newTags });
                            this.refresh();
                        });
                });
            }
            menu.addSeparator();
        }

        menu.addItem((item: any) => {
            item.setTitle('+ Create new plotline…')
                .setIcon('plus')
                .onClick(() => this.openNewPlotlineForScene(scene));
        });

        const rect = anchorEl.getBoundingClientRect();
        menu.showAtPosition({ x: rect.left, y: rect.bottom });
    }

    // ── Rename ─────────────────────────────────────────────

    private openRenamePlotlineModal(plotline: string): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Rename Plotline');
        let newName = plotline;

        new Setting(modal.contentEl)
            .setName('Plotline name')
            .setDesc(`Current tag: "${plotline}". The tag will be updated in all scenes that use it.`)
            .addText((text: any) => {
                text.setValue(plotline);
                text.onChange((v: string) => (newName = v));
            });

        new Setting(modal.contentEl)
            .addButton((btn: any) => {
                btn.setButtonText('Rename').setCta().onClick(async () => {
                    const slug = newName.trim().toLowerCase().replace(/\s+/g, '-');
                    if (!slug || slug === plotline) {
                        modal.close();
                        return;
                    }
                    const count = await this.sceneManager.renameTag(plotline, slug);
                    new Notice(`Renamed plotline in ${count} scene${count !== 1 ? 's' : ''}`);
                    this.refresh();
                    modal.close();
                });
            });
        modal.open();
    }

    // ── Delete ─────────────────────────────────────────────

    private confirmDeletePlotline(plotline: string, sceneCount: number): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Delete Plotline');
        modal.contentEl.createEl('p', {
            text: `Remove the tag "${plotline}" from ${sceneCount} scene${sceneCount !== 1 ? 's' : ''}? The scenes themselves will not be deleted.`
        });

        new Setting(modal.contentEl)
            .addButton((btn: any) => {
                btn.setButtonText('Cancel').onClick(() => modal.close());
            })
            .addButton((btn: any) => {
                btn.setButtonText('Delete').setWarning().onClick(async () => {
                    const count = await this.sceneManager.deleteTag(plotline);
                    new Notice(`Removed plotline from ${count} scene${count !== 1 ? 's' : ''}`);
                    this.refresh();
                    modal.close();
                });
            });
        modal.open();
    }

    // ── Create new plotline for a scene ────────────────────

    private openNewPlotlineForScene(scene: Scene): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('New Plotline');
        let tagName = '';

        new Setting(modal.contentEl)
            .setName('Plotline name')
            .setDesc(`Will be added to "${scene.title || 'Untitled'}"`)
            .addText((text: any) => {
                text.setPlaceholder('e.g. main-mystery');
                text.onChange((v: string) => (tagName = v));
            });

        new Setting(modal.contentEl)
            .addButton((btn: any) => {
                btn.setButtonText('Create & Assign').setCta().onClick(async () => {
                    if (!tagName.trim()) return;
                    const slug = tagName.trim().toLowerCase().replace(/\s+/g, '-');
                    const newTags = [...(scene.tags || []), slug];
                    await this.sceneManager.updateScene(scene.filePath, { tags: newTags });
                    this.refresh();
                    modal.close();
                });
            });
        modal.open();
    }

    // ── Create new plotline (toolbar button) ───────────────

    private openNewPlotlineModal(): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('New Plotline');
        let tagName = '';

        new Setting(modal.contentEl)
            .setName('Plotline name')
            .setDesc('Enter a name for the plotline. It will be stored as a tag on each assigned scene.')
            .addText((text: any) => {
                text.setPlaceholder('e.g. love-triangle');
                text.onChange((v: string) => (tagName = v));
            });

        const scenePicker = modal.contentEl.createDiv('storyline-scene-picker');
        scenePicker.createEl('p', {
            cls: 'setting-item-description',
            text: 'Select scenes to include (optional):'
        });

        const scenes = this.sceneManager.getFilteredScenes(undefined, { field: 'sequence', direction: 'asc' });
        const selectedPaths = new Set<string>();

        const sceneList = scenePicker.createDiv('storyline-scene-picker-list');
        scenes.forEach(scene => {
            const row = sceneList.createDiv('storyline-scene-picker-row');
            const cb = row.createEl('input', { type: 'checkbox' });
            row.createSpan({ text: `[${String(scene.act ?? '?').toString().padStart(2, '0')}-${String(scene.sequence ?? '?').toString().padStart(2, '0')}] ${scene.title || 'Untitled'}` });
            cb.addEventListener('change', () => {
                if (cb.checked) selectedPaths.add(scene.filePath);
                else selectedPaths.delete(scene.filePath);
            });
        });

        new Setting(modal.contentEl)
            .addButton((btn: any) => {
                btn.setButtonText('Create Plotline').setCta().onClick(async () => {
                    if (!tagName.trim()) return;
                    const slug = tagName.trim().toLowerCase().replace(/\s+/g, '-');
                    for (const path of selectedPaths) {
                        const scene = this.sceneManager.getScene(path);
                        if (scene) {
                            const newTags = [...(scene.tags || []), slug];
                            await this.sceneManager.updateScene(path, { tags: newTags });
                        }
                    }
                    this.refresh();
                    modal.close();
                });
            });
        modal.open();
    }

    // ── Add scenes to existing plotline ────────────────────

    private openAddSceneToPlotlineModal(
        plotline: string,
        currentScenes: Scene[],
        allScenes: Scene[]
    ): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText(`Add scenes to "${this.formatPlotlineName(plotline)}"`);

        const currentPaths = new Set(currentScenes.map(s => s.filePath));
        const available = allScenes.filter(s => !currentPaths.has(s.filePath));
        const selectedPaths = new Set<string>();

        if (available.length === 0) {
            modal.contentEl.createEl('p', { text: 'All scenes are already in this plotline.' });
        } else {
            const sceneList = modal.contentEl.createDiv('storyline-scene-picker-list');
            available.forEach(scene => {
                const row = sceneList.createDiv('storyline-scene-picker-row');
                const cb = row.createEl('input', { type: 'checkbox' });
                row.createSpan({ text: `[${String(scene.act ?? '?').toString().padStart(2, '0')}-${String(scene.sequence ?? '?').toString().padStart(2, '0')}] ${scene.title || 'Untitled'}` });
                cb.addEventListener('change', () => {
                    if (cb.checked) selectedPaths.add(scene.filePath);
                    else selectedPaths.delete(scene.filePath);
                });
            });
        }

        new Setting(modal.contentEl)
            .addButton((btn: any) => {
                btn.setButtonText('Add to Plotline').setCta().onClick(async () => {
                    for (const path of selectedPaths) {
                        const scene = this.sceneManager.getScene(path);
                        if (scene) {
                            const newTags = [...(scene.tags || []), plotline];
                            await this.sceneManager.updateScene(path, { tags: newTags });
                        }
                    }
                    this.refresh();
                    modal.close();
                });
            });
        modal.open();
    }

    // ── Helpers ────────────────────────────────────────────

    private groupByPlotline(scenes: Scene[]): Map<string, Scene[]> {
        const groups = new Map<string, Scene[]>();

        for (const scene of scenes) {
            if (!scene.tags || scene.tags.length === 0) continue;

            for (const tag of scene.tags) {
                if (!groups.has(tag)) {
                    groups.set(tag, []);
                }
                groups.get(tag)!.push(scene);
            }
        }

        return groups;
    }

    private formatPlotlineName(tag: string): string {
        // Convert "main-mystery" → "Main Mystery"
        // Use split instead of \b\w regex to avoid issues with
        // non-ASCII characters like å, ä, ö being treated as word boundaries.
        const name = tag.split('/').pop() || tag;
        return name
            .replace(/[-_]/g, ' ')
            .split(' ')
            .map(w => w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : '')
            .join(' ');
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

    /**
     * Public refresh called by the plugin on file changes
     */
    refresh(): void {
        if (this.rootContainer) {
            this.renderView(this.rootContainer);
        }
    }
}
