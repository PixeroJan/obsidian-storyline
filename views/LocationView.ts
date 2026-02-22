import { ItemView, WorkspaceLeaf, TFile, Notice, Modal, Setting } from 'obsidian';
import * as obsidian from 'obsidian';
import { Scene, STATUS_CONFIG } from '../models/Scene';
import {
    StoryWorld, StoryLocation, WorldOrLocation,
    WORLD_CATEGORIES, LOCATION_CATEGORIES, LOCATION_TYPES,
    LocationFieldCategory, LocationFieldDef,
} from '../models/Location';
import { SceneManager } from '../services/SceneManager';
import { LocationManager } from '../services/LocationManager';
import { renderViewSwitcher } from '../components/ViewSwitcher';
import { UndoManager } from '../services/UndoManager';

import type SceneCardsPlugin from '../main';

import { LOCATION_VIEW_TYPE } from '../constants';

/**
 * Location View — hierarchical World → Location browser with inline editing.
 *
 * Overview: collapsible tree showing worlds, their locations, orphan locations.
 * Detail: editable profile for a world or location with scene side-panel.
 */
export class LocationView extends ItemView {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;
    private locationManager: LocationManager;
    private selectedItem: string | null = null; // filePath of selected world/location
    private rootContainer: HTMLElement | null = null;
    private collapsedSections: Set<string> = new Set();
    private collapsedTreeNodes: Set<string> = new Set();
    private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
    /** The draft waiting to be saved (if any) */
    private pendingSaveDraft: WorldOrLocation | null = null;
    /** Snapshot of the item before any edits — used for undo recording */
    private undoSnapshot: WorldOrLocation | null = null;
    private _lastSaveTime = 0;
    private static readonly SAVE_REFRESH_GRACE_MS = 2000;

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin, sceneManager: SceneManager) {
        super(leaf);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
        this.locationManager = new LocationManager(this.app);
    }

    getViewType(): string { return LOCATION_VIEW_TYPE; }

    getDisplayText(): string {
        const title = this.plugin?.sceneManager?.activeProject?.title;
        return title ? `StoryLine - ${title}` : 'StoryLine';
    }

    getIcon(): string { return 'map-pin'; }

    async onOpen(): Promise<void> {
        this.plugin.storyLeaf = this.leaf;
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('story-line-location-container');
        this.rootContainer = container;

        await this.sceneManager.initialize();
        await this.locationManager.loadAll(this.sceneManager.getLocationFolder());
        this.renderView(container);
    }

    async onClose(): Promise<void> {
        // Flush any pending auto-save so edits are not lost
        await this.flushPendingSave();
    }

    // ── Main render ────────────────────────────────────

    private renderView(container: HTMLElement): void {
        container.empty();

        const toolbar = container.createDiv('story-line-toolbar');
        const titleRow = toolbar.createDiv('story-line-title-row');
        titleRow.createEl('h3', { cls: 'story-line-view-title', text: 'StoryLine' });

        renderViewSwitcher(toolbar, LOCATION_VIEW_TYPE, this.plugin, this.leaf);

        const controls = toolbar.createDiv('story-line-toolbar-controls');

        // Add buttons
        const addWorldBtn = controls.createEl('button', { cls: 'mod-cta location-add-btn', text: '+ World' });
        addWorldBtn.addEventListener('click', () => this.promptNewWorld());

        const addLocBtn = controls.createEl('button', { cls: 'location-add-btn', text: '+ Location' });
        addLocBtn.addEventListener('click', () => this.promptNewLocation());

        const content = container.createDiv('story-line-location-content');

        if (this.selectedItem) {
            this.renderDetail(content);
        } else {
            this.renderOverview(content);
        }
    }

    // ── Overview: tree hierarchy ───────────────────────

    private renderOverview(container: HTMLElement): void {
        container.empty();
        container.createEl('h3', { text: 'Worlds & Locations' });

        const worlds = this.locationManager.getAllWorlds();
        const orphanLocations = this.locationManager.getOrphanLocations();
        const scenes = this.sceneManager.getAllScenes();

        if (worlds.length === 0 && orphanLocations.length === 0) {
            const empty = container.createDiv('location-empty-state');
            const emptyIcon = empty.createDiv('location-empty-icon');
            obsidian.setIcon(emptyIcon, 'map');
            empty.createEl('h4', { text: 'No worlds or locations yet' });
            empty.createEl('p', { text: 'Click "+ World" to create a worldbuilding profile, or "+ Location" to add a specific place.' });
            return;
        }

        const tree = container.createDiv('location-tree');

        // Render each world and its locations
        for (const world of worlds) {
            this.renderWorldNode(tree, world, scenes);
        }

        // Orphan locations (not linked to a world)
        if (orphanLocations.length > 0) {
            if (worlds.length > 0) {
                const divider = tree.createDiv('location-orphan-divider');
                divider.createEl('span', { text: 'Standalone Locations' });
            }
            for (const loc of orphanLocations) {
                this.renderLocationNode(tree, loc, scenes, 0);
            }
        }

        // Locations from scenes that don't have files yet
        const allLocNames = [...this.locationManager.getAllLocations().map(l => l.name.toLowerCase()),
            ...worlds.map(w => w.name.toLowerCase())];
        const sceneLocations = this.sceneManager.getUniqueValues('location');
        const unlinked = sceneLocations.filter(n => !allLocNames.includes(n.toLowerCase()));

        if (unlinked.length > 0) {
            const divider = tree.createDiv('location-orphan-divider');
            divider.createEl('span', { text: 'Locations from scenes (no profile yet)' });
            for (const name of unlinked) {
                this.renderUnlinkedLocation(tree, name, scenes);
            }
        }
    }

    private renderWorldNode(parent: HTMLElement, world: StoryWorld, scenes: Scene[]): void {
        const node = parent.createDiv('location-tree-node location-world-node');
        const isCollapsed = this.collapsedTreeNodes.has(world.filePath);

        const header = node.createDiv('location-tree-header');
        const chevron = header.createSpan('location-tree-chevron');

        const worldLocations = this.locationManager.getLocationsForWorld(world.name);
        if (worldLocations.length > 0) {
            obsidian.setIcon(chevron, isCollapsed ? 'chevron-right' : 'chevron-down');
            chevron.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.collapsedTreeNodes.has(world.filePath)) {
                    this.collapsedTreeNodes.delete(world.filePath);
                } else {
                    this.collapsedTreeNodes.add(world.filePath);
                }
                this.renderView(this.rootContainer!);
            });
        } else {
            chevron.style.width = '14px'; // spacer
        }

        const icon = header.createSpan('location-tree-icon');
        obsidian.setIcon(icon, 'globe');

        header.createSpan({ cls: 'location-tree-name', text: world.name });

        const badge = header.createSpan({ cls: 'location-tree-count', text: `${worldLocations.length} loc` });

        header.addEventListener('click', () => {
            this.selectedItem = world.filePath;
            this.renderView(this.rootContainer!);
        });

        // Children
        if (!isCollapsed && worldLocations.length > 0) {
            const children = node.createDiv('location-tree-children');
            const topLevel = this.locationManager.getTopLevelLocations(world.name);
            for (const loc of topLevel) {
                this.renderLocationNode(children, loc, scenes, 1);
            }
        }
    }

    private renderLocationNode(parent: HTMLElement, loc: StoryLocation, scenes: Scene[], depth: number): void {
        const node = parent.createDiv('location-tree-node');
        const childLocations = this.locationManager.getChildLocations(loc.name);
        const isCollapsed = this.collapsedTreeNodes.has(loc.filePath);

        const header = node.createDiv('location-tree-header');
        header.style.paddingLeft = `${depth * 20}px`;

        const chevron = header.createSpan('location-tree-chevron');
        if (childLocations.length > 0) {
            obsidian.setIcon(chevron, isCollapsed ? 'chevron-right' : 'chevron-down');
            chevron.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.collapsedTreeNodes.has(loc.filePath)) {
                    this.collapsedTreeNodes.delete(loc.filePath);
                } else {
                    this.collapsedTreeNodes.add(loc.filePath);
                }
                this.renderView(this.rootContainer!);
            });
        } else {
            chevron.style.width = '14px';
        }

        const icon = header.createSpan('location-tree-icon');
        obsidian.setIcon(icon, 'map-pin');

        header.createSpan({ cls: 'location-tree-name', text: loc.name });

        // Scene count for this location
        const locLower = loc.name.toLowerCase();
        const sceneCount = scenes.filter(s => s.location?.toLowerCase() === locLower).length;
        if (sceneCount > 0) {
            header.createSpan({ cls: 'location-tree-count', text: `${sceneCount} sc` });
        }

        if (loc.locationType) {
            header.createSpan({ cls: 'location-type-badge', text: loc.locationType });
        }

        header.addEventListener('click', () => {
            this.selectedItem = loc.filePath;
            this.renderView(this.rootContainer!);
        });

        // Child locations
        if (!isCollapsed && childLocations.length > 0) {
            const children = node.createDiv('location-tree-children');
            for (const child of childLocations) {
                this.renderLocationNode(children, child, scenes, depth + 1);
            }
        }
    }

    private renderUnlinkedLocation(parent: HTMLElement, name: string, scenes: Scene[]): void {
        const node = parent.createDiv('location-tree-node location-unlinked-node');
        const header = node.createDiv('location-tree-header');

        header.createSpan({ cls: 'location-tree-chevron' }).style.width = '14px';
        const icon = header.createSpan('location-tree-icon');
        obsidian.setIcon(icon, 'map-pin');
        header.createSpan({ cls: 'location-tree-name', text: name });

        const locLower = name.toLowerCase();
        const sceneCount = scenes.filter(s => s.location?.toLowerCase() === locLower).length;
        if (sceneCount > 0) {
            header.createSpan({ cls: 'location-tree-count', text: `${sceneCount} sc` });
        }

        const createBtn = header.createEl('button', { cls: 'location-create-profile-btn', text: 'Create' });
        createBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.createLocationFromName(name);
        });
    }

    // ── Detail view ────────────────────────────────────

    private renderDetail(container: HTMLElement): void {
        container.empty();
        const item = this.locationManager.getItem(this.selectedItem!);
        if (!item) {
            this.selectedItem = null;
            this.renderOverview(container);
            return;
        }

        const isWorld = item.type === 'world';
        const draft: WorldOrLocation = { ...item, custom: { ...(item.custom || {}) } };
        // Snapshot for undo — taken once when the detail view opens
        this.undoSnapshot = { ...item, custom: { ...(item.custom || {}) } };

        // Header
        const header = container.createDiv('location-detail-header');
        const backBtn = header.createEl('button', { cls: 'location-back-btn' });
        obsidian.setIcon(backBtn, 'arrow-left');
        backBtn.createSpan({ text: ' All Locations' });
        backBtn.addEventListener('click', () => {
            this.selectedItem = null;
            this.renderView(this.rootContainer!);
        });

        const headerRight = header.createDiv('location-detail-header-right');

        const deleteBtn = headerRight.createEl('button', { cls: 'location-delete-btn', attr: { title: 'Delete' } });
        obsidian.setIcon(deleteBtn, 'trash-2');
        deleteBtn.addEventListener('click', () => this.confirmDelete(item));

        const openBtn = headerRight.createEl('button', { cls: 'location-open-btn', attr: { title: 'Open file' } });
        obsidian.setIcon(openBtn, 'file-text');
        openBtn.addEventListener('click', () => this.openFile(item));

        // Type label
        const typeLabel = container.createDiv('location-detail-type');
        obsidian.setIcon(typeLabel, isWorld ? 'globe' : 'map-pin');
        typeLabel.createSpan({ text: ` ${isWorld ? 'World' : 'Location'}` });

        // Layout: form + side panel
        const layout = container.createDiv('location-detail-layout');
        const formPanel = layout.createDiv('location-detail-form');
        const sidePanel = layout.createDiv('location-detail-side');

        // Categories
        const categories = isWorld ? WORLD_CATEGORIES : LOCATION_CATEGORIES;
        for (const cat of categories) {
            this.renderCategory(formPanel, cat, draft);
        }

        // For locations: world & parent dropdowns
        if (!isWorld) {
            this.renderLocationHierarchy(formPanel, draft as StoryLocation);
        }

        // Custom fields
        this.renderCustomFields(formPanel, draft);

        // Side panel
        if (isWorld) {
            this.renderWorldSidePanel(sidePanel, draft as StoryWorld);
        } else {
            this.renderLocationSidePanel(sidePanel, draft as StoryLocation);
        }
    }

    private renderCategory(
        parent: HTMLElement,
        category: LocationFieldCategory,
        draft: WorldOrLocation
    ): void {
        const section = parent.createDiv('location-section');
        const isCollapsed = this.collapsedSections.has(category.title);

        const sectionHeader = section.createDiv('location-section-header');
        const chevron = sectionHeader.createSpan('location-section-chevron');
        obsidian.setIcon(chevron, isCollapsed ? 'chevron-right' : 'chevron-down');
        const icon = sectionHeader.createSpan('location-section-icon');
        obsidian.setIcon(icon, category.icon);
        sectionHeader.createSpan({ text: category.title });

        const sectionBody = section.createDiv('location-section-body');
        if (isCollapsed) sectionBody.style.display = 'none';

        sectionHeader.addEventListener('click', () => {
            if (this.collapsedSections.has(category.title)) {
                this.collapsedSections.delete(category.title);
                sectionBody.style.display = '';
                obsidian.setIcon(chevron, 'chevron-down');
            } else {
                this.collapsedSections.add(category.title);
                sectionBody.style.display = 'none';
                obsidian.setIcon(chevron, 'chevron-right');
            }
        });

        for (const field of category.fields) {
            this.renderField(sectionBody, field, draft);
        }
    }

    private renderField(parent: HTMLElement, field: LocationFieldDef, draft: WorldOrLocation): void {
        const row = parent.createDiv('location-field-row');
        row.createEl('label', { cls: 'location-field-label', text: field.label });

        const value = (draft as any)[field.key] ?? '';

        if (field.key === 'locationType') {
            const select = row.createEl('select', { cls: 'location-field-input dropdown' });
            select.createEl('option', { text: field.placeholder, value: '' });
            for (const t of LOCATION_TYPES) {
                const opt = select.createEl('option', { text: t, value: t.toLowerCase() });
                if (String(value).toLowerCase() === t.toLowerCase()) opt.selected = true;
            }
            if (value && !LOCATION_TYPES.map(t => t.toLowerCase()).includes(String(value).toLowerCase())) {
                const opt = select.createEl('option', { text: String(value), value: String(value) });
                opt.selected = true;
            }
            select.addEventListener('change', () => {
                (draft as any)[field.key] = select.value;
                this.scheduleSave(draft);
            });
        } else if (field.multiline) {
            const textarea = row.createEl('textarea', {
                cls: 'location-field-textarea',
                attr: { placeholder: field.placeholder, rows: '3' },
            });
            textarea.value = value;
            textarea.addEventListener('input', () => {
                (draft as any)[field.key] = textarea.value;
                this.scheduleSave(draft);
            });
        } else {
            const input = row.createEl('input', {
                cls: 'location-field-input',
                type: 'text',
                attr: { placeholder: field.placeholder },
            });
            input.value = value;
            input.addEventListener('input', () => {
                (draft as any)[field.key] = input.value;
                this.scheduleSave(draft);
            });
        }
    }

    private renderLocationHierarchy(parent: HTMLElement, draft: StoryLocation): void {
        const section = parent.createDiv('location-section');
        const sectionHeader = section.createDiv('location-section-header');
        const chevron = sectionHeader.createSpan('location-section-chevron');
        obsidian.setIcon(chevron, 'chevron-down');
        const icon = sectionHeader.createSpan('location-section-icon');
        obsidian.setIcon(icon, 'git-branch');
        sectionHeader.createSpan({ text: 'Hierarchy' });

        const body = section.createDiv('location-section-body');

        // World dropdown
        const worldRow = body.createDiv('location-field-row');
        worldRow.createEl('label', { cls: 'location-field-label', text: 'World' });
        const worldSelect = worldRow.createEl('select', { cls: 'location-field-input dropdown' });
        worldSelect.createEl('option', { text: 'None (standalone)', value: '' });
        for (const w of this.locationManager.getAllWorlds()) {
            const opt = worldSelect.createEl('option', { text: w.name, value: w.name });
            if (draft.world === w.name) opt.selected = true;
        }
        worldSelect.addEventListener('change', () => {
            draft.world = worldSelect.value || undefined;
            this.scheduleSave(draft);
        });

        // Parent location dropdown
        const parentRow = body.createDiv('location-field-row');
        parentRow.createEl('label', { cls: 'location-field-label', text: 'Parent Location' });
        const parentSelect = parentRow.createEl('select', { cls: 'location-field-input dropdown' });
        parentSelect.createEl('option', { text: 'None (top-level)', value: '' });
        const allLocations = this.locationManager.getAllLocations()
            .filter(l => l.filePath !== draft.filePath);
        for (const loc of allLocations) {
            const opt = parentSelect.createEl('option', { text: loc.name, value: loc.name });
            if (draft.parent === loc.name) opt.selected = true;
        }
        parentSelect.addEventListener('change', () => {
            draft.parent = parentSelect.value || undefined;
            this.scheduleSave(draft);
        });
    }

    private renderCustomFields(parent: HTMLElement, draft: WorldOrLocation): void {
        const section = parent.createDiv('location-section');
        const title = 'Custom Fields';
        const isCollapsed = this.collapsedSections.has(title);

        const sectionHeader = section.createDiv('location-section-header');
        const chevron = sectionHeader.createSpan('location-section-chevron');
        obsidian.setIcon(chevron, isCollapsed ? 'chevron-right' : 'chevron-down');
        const icon = sectionHeader.createSpan('location-section-icon');
        obsidian.setIcon(icon, 'plus-circle');
        sectionHeader.createSpan({ text: title });

        const sectionBody = section.createDiv('location-section-body');
        if (isCollapsed) sectionBody.style.display = 'none';

        sectionHeader.addEventListener('click', () => {
            if (this.collapsedSections.has(title)) {
                this.collapsedSections.delete(title);
                sectionBody.style.display = '';
                obsidian.setIcon(chevron, 'chevron-down');
            } else {
                this.collapsedSections.add(title);
                sectionBody.style.display = 'none';
                obsidian.setIcon(chevron, 'chevron-right');
            }
        });

        const renderAll = () => {
            sectionBody.empty();
            const custom = draft.custom || {};

            for (const [key, val] of Object.entries(custom)) {
                const row = sectionBody.createDiv('location-field-row location-custom-row');
                const keyIn = row.createEl('input', {
                    cls: 'location-field-input location-custom-key',
                    type: 'text',
                    attr: { placeholder: 'Field name' },
                });
                keyIn.value = key;

                const valIn = row.createEl('input', {
                    cls: 'location-field-input location-custom-value',
                    type: 'text',
                    attr: { placeholder: 'Value' },
                });
                valIn.value = val;

                const removeBtn = row.createEl('button', { cls: 'location-custom-remove', attr: { title: 'Remove' } });
                obsidian.setIcon(removeBtn, 'x');

                keyIn.addEventListener('change', () => {
                    delete draft.custom![key];
                    const nk = keyIn.value.trim();
                    if (nk) draft.custom![nk] = valIn.value;
                    this.scheduleSave(draft);
                });
                valIn.addEventListener('input', () => {
                    const k = keyIn.value.trim();
                    if (k) { draft.custom![k] = valIn.value; this.scheduleSave(draft); }
                });
                removeBtn.addEventListener('click', () => {
                    delete draft.custom![key];
                    row.remove();
                    this.scheduleSave(draft);
                });
            }

            const addRow = sectionBody.createDiv('location-custom-add-row');
            const addBtn = addRow.createEl('button', { cls: 'location-custom-add-btn', text: '+ Add Field' });
            addBtn.addEventListener('click', () => {
                if (!draft.custom) draft.custom = {};
                let n = Object.keys(draft.custom).length + 1;
                let nk = `field_${n}`;
                while (draft.custom[nk]) nk = `field_${++n}`;
                draft.custom[nk] = '';
                renderAll();
            });
        };

        renderAll();
    }

    // ── Side panels ────────────────────────────────────

    private renderWorldSidePanel(container: HTMLElement, world: StoryWorld): void {
        const locations = this.locationManager.getLocationsForWorld(world.name);
        const scenes = this.sceneManager.getAllScenes();

        // Location count
        const statsBox = container.createDiv('location-side-stats');
        statsBox.createEl('h4', { text: 'World Summary' });
        const statGrid = statsBox.createDiv('location-stat-grid');
        this.renderStat(statGrid, String(locations.length), 'Locations');

        // Collect scenes across all locations in this world
        const locNames = new Set(locations.map(l => l.name.toLowerCase()));
        const worldScenes = scenes.filter(s => s.location && locNames.has(s.location.toLowerCase()));
        this.renderStat(statGrid, String(worldScenes.length), 'Scenes');

        // Location list
        if (locations.length > 0) {
            const listSection = container.createDiv('location-side-list');
            listSection.createEl('h4', { text: 'Locations in this World' });
            for (const loc of locations) {
                const item = listSection.createDiv('location-side-item');
                const icon = item.createSpan('location-side-item-icon');
                obsidian.setIcon(icon, 'map-pin');
                item.createSpan({ text: loc.name });
                if (loc.locationType) {
                    item.createSpan({ cls: 'location-type-badge-sm', text: loc.locationType });
                }
                item.addEventListener('click', () => {
                    this.selectedItem = loc.filePath;
                    this.renderView(this.rootContainer!);
                });
            }
        }

        // Add location to this world button
        const addBtn = container.createEl('button', { cls: 'location-add-to-world-btn', text: `+ Add location to ${world.name}` });
        addBtn.addEventListener('click', () => this.promptNewLocation(world.name));
    }

    private renderLocationSidePanel(container: HTMLElement, loc: StoryLocation): void {
        const scenes = this.sceneManager.getFilteredScenes(
            undefined,
            { field: 'sequence', direction: 'asc' }
        );
        const locLower = loc.name.toLowerCase();
        const locScenes = scenes.filter(s => s.location?.toLowerCase() === locLower);

        // Stats
        const statsBox = container.createDiv('location-side-stats');
        statsBox.createEl('h4', { text: 'Location Info' });

        if (loc.world) {
            const worldInfo = statsBox.createDiv('location-side-world-info');
            const worldIcon = worldInfo.createSpan();
            obsidian.setIcon(worldIcon, 'globe');
            worldInfo.createSpan({ text: ` ${loc.world}` });
        }

        if (loc.parent) {
            const parentInfo = statsBox.createDiv('location-side-parent-info');
            const parentIcon = parentInfo.createSpan();
            obsidian.setIcon(parentIcon, 'corner-down-right');
            parentInfo.createSpan({ text: ` Inside: ${loc.parent}` });
        }

        const statGrid = statsBox.createDiv('location-stat-grid');
        this.renderStat(statGrid, String(locScenes.length), 'Scenes');

        // Child locations
        const children = this.locationManager.getChildLocations(loc.name);
        if (children.length > 0) {
            this.renderStat(statGrid, String(children.length), 'Sub-locations');
        }

        // Scene list
        if (locScenes.length > 0) {
            const listSection = container.createDiv('location-side-scenes');
            listSection.createEl('h4', { text: 'Scenes here' });
            for (const scene of locScenes) {
                const item = listSection.createDiv('location-side-scene-item');
                const act = scene.act !== undefined ? String(scene.act).padStart(2, '0') : '??';
                const seq = scene.sequence !== undefined ? String(scene.sequence).padStart(2, '0') : '??';

                item.createSpan({ cls: 'scene-id', text: `[${act}-${seq}]` });
                item.createSpan({ cls: 'scene-title', text: ` ${scene.title}` });

                const statusCfg = STATUS_CONFIG[scene.status || 'idea'];
                const statusBadge = item.createSpan({
                    cls: 'scene-status-badge',
                    attr: { title: statusCfg.label },
                });
                obsidian.setIcon(statusBadge, statusCfg.icon);

                item.addEventListener('click', () => this.openScene(scene));
            }
        }

        // Characters that appear here
        const charsHere = new Map<string, number>();
        for (const scene of locScenes) {
            if (scene.pov) {
                charsHere.set(scene.pov, (charsHere.get(scene.pov) || 0) + 1);
            }
            if (scene.characters) {
                for (const c of scene.characters) {
                    if (c !== scene.pov) {
                        charsHere.set(c, (charsHere.get(c) || 0) + 1);
                    }
                }
            }
        }
        if (charsHere.size > 0) {
            const charSection = container.createDiv('location-side-chars');
            charSection.createEl('h4', { text: 'Characters here' });
            const sorted = Array.from(charsHere.entries()).sort((a, b) => b[1] - a[1]);
            for (const [name, count] of sorted) {
                const item = charSection.createDiv('location-side-char-item');
                const icon = item.createSpan();
                obsidian.setIcon(icon, 'user');
                item.createSpan({ text: ` ${name}` });
                item.createSpan({ cls: 'location-side-char-count', text: `${count}` });
            }
        }
    }

    private renderStat(parent: HTMLElement, value: string, label: string): void {
        const stat = parent.createDiv('location-stat-item');
        stat.createDiv({ cls: 'location-stat-value', text: value });
        stat.createDiv({ cls: 'location-stat-label', text: label });
    }

    // ── Auto-save ──────────────────────────────────────

    private scheduleSave(draft: WorldOrLocation): void {
        if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
        this.pendingSaveDraft = draft;
        this.autoSaveTimer = setTimeout(async () => {
            try {
                // Record undo snapshot
                const undoMgr = this.plugin.sceneManager?.undoManager;
                if (undoMgr && this.undoSnapshot) {
                    undoMgr.recordUpdate(
                        draft.filePath,
                        this.undoSnapshot as unknown as Record<string, any>,
                        draft as unknown as Record<string, any>,
                        `Update ${draft.type} "${draft.name}"`,
                        'location'
                    );
                    this.undoSnapshot = { ...draft, custom: { ...(draft.custom || {}) } };
                }
                this._lastSaveTime = Date.now();
                if (draft.type === 'world') {
                    await this.locationManager.saveWorld(draft as StoryWorld);
                } else {
                    await this.locationManager.saveLocation(draft as StoryLocation);
                }
                this.pendingSaveDraft = null;
            } catch (e) {
                console.error('StoryLine: failed to save location/world', e);
            }
        }, 600);
    }

    /** Immediately flush any pending debounced save */
    private async flushPendingSave(): Promise<void> {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        if (this.pendingSaveDraft) {
            try {
                this._lastSaveTime = Date.now();
                const draft = this.pendingSaveDraft;
                if (draft.type === 'world') {
                    await this.locationManager.saveWorld(draft as StoryWorld);
                } else {
                    await this.locationManager.saveLocation(draft as StoryLocation);
                }
            } catch (e) {
                console.error('StoryLine: failed to flush location/world save on close', e);
            }
            this.pendingSaveDraft = null;
        }
    }

    // ── Actions ────────────────────────────────────────

    private promptNewWorld(): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('New World');

        let name = '';
        new Setting(modal.contentEl)
            .setName('World name')
            .addText(text => {
                text.setPlaceholder('Enter world name\u2026')
                    .onChange(v => (name = v));
                setTimeout(() => text.inputEl.focus(), 50);
            });

        new Setting(modal.contentEl)
            .addButton(btn => {
                btn.setButtonText('Create').setCta().onClick(async () => {
                    if (!name.trim()) { new Notice('Please enter a name.'); return; }
                    try {
                        const w = await this.locationManager.createWorld(
                            this.sceneManager.getLocationFolder(), name.trim()
                        );
                        this.selectedItem = w.filePath;
                        modal.close();
                        this.renderView(this.rootContainer!);
                        new Notice(`World "${name.trim()}" created`);
                    } catch (e) { new Notice(String(e)); }
                });
            });

        modal.open();
    }

    private promptNewLocation(worldName?: string): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('New Location');

        let name = '';
        let selectedWorld = worldName || '';

        new Setting(modal.contentEl)
            .setName('Location name')
            .addText(text => {
                text.setPlaceholder('Enter location name\u2026')
                    .onChange(v => (name = v));
                setTimeout(() => text.inputEl.focus(), 50);
            });

        // World selector
        const worlds = this.locationManager.getAllWorlds();
        if (worlds.length > 0) {
            new Setting(modal.contentEl)
                .setName('World')
                .setDesc('Which world does this location belong to?')
                .addDropdown(dd => {
                    dd.addOption('', 'None (standalone)');
                    for (const w of worlds) {
                        dd.addOption(w.name, w.name);
                    }
                    if (selectedWorld) dd.setValue(selectedWorld);
                    dd.onChange(v => (selectedWorld = v));
                });
        }

        new Setting(modal.contentEl)
            .addButton(btn => {
                btn.setButtonText('Create').setCta().onClick(async () => {
                    if (!name.trim()) { new Notice('Please enter a name.'); return; }
                    try {
                        const loc = await this.locationManager.createLocation(
                            this.sceneManager.getLocationFolder(),
                            name.trim(),
                            selectedWorld || undefined
                        );
                        this.selectedItem = loc.filePath;
                        modal.close();
                        this.renderView(this.rootContainer!);
                        new Notice(`Location "${name.trim()}" created`);
                    } catch (e) { new Notice(String(e)); }
                });
            });

        modal.open();
    }

    private async createLocationFromName(name: string): Promise<void> {
        try {
            const loc = await this.locationManager.createLocation(
                this.sceneManager.getLocationFolder(), name
            );
            this.selectedItem = loc.filePath;
            this.renderView(this.rootContainer!);
            new Notice(`Location profile created for "${name}"`);
        } catch (e) { new Notice(String(e)); }
    }

    private confirmDelete(item: WorldOrLocation): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText(`Delete ${item.type === 'world' ? 'World' : 'Location'}`);
        modal.contentEl.createEl('p', {
            text: `Are you sure you want to delete "${item.name}"? The file will be moved to trash.`
        });

        new Setting(modal.contentEl)
            .addButton(btn => {
                btn.setButtonText('Delete').setWarning().onClick(async () => {
                    // Record undo before deleting
                    const undoMgr = this.plugin.sceneManager?.undoManager;
                    if (undoMgr) {
                        const file = this.app.vault.getAbstractFileByPath(item.filePath);
                        if (file instanceof TFile) {
                            const content = await this.app.vault.read(file);
                            undoMgr.recordDelete(item.filePath, content, `Delete ${item.type} "${item.name}"`, 'location');
                        }
                    }
                    await this.locationManager.deleteItem(item.filePath);
                    this.selectedItem = null;
                    modal.close();
                    this.renderView(this.rootContainer!);
                    new Notice(`"${item.name}" deleted`);
                });
            })
            .addButton(btn => btn.setButtonText('Cancel').onClick(() => modal.close()));

        modal.open();
    }

    private async openFile(item: WorldOrLocation): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(item.filePath);
        if (file instanceof TFile) {
            const leaf = this.app.workspace.getLeaf('tab');
            await leaf.openFile(file);
        }
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

    // ── Refresh ────────────────────────────────────────

    async refresh(): Promise<void> {
        if (
            this.selectedItem &&
            Date.now() - this._lastSaveTime < LocationView.SAVE_REFRESH_GRACE_MS
        ) {
            await this.locationManager.loadAll(this.sceneManager.getLocationFolder());
            return;
        }
        await this.locationManager.loadAll(this.sceneManager.getLocationFolder());
        if (this.rootContainer) {
            this.renderView(this.rootContainer);
        }
    }
}
