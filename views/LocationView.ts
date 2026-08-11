/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unused-vars -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { ButtonComponent, ItemView, Modal, Notice, Setting, TFile, TextComponent, WorkspaceLeaf } from 'obsidian';
import * as obsidian from 'obsidian';
import { LOCATION_VIEW_TYPE } from '../constants';
import { Scene, resolveStatusCfg } from '../models/Scene';
import { coerceString } from '../utils/narrow';
import {
    StoryWorld, StoryLocation, WorldOrLocation,
    WORLD_CATEGORIES, LOCATION_CATEGORIES, LOCATION_TYPES,
    LocationFieldCategory, LocationFieldDef,
} from '../models/Location';
import { SceneManager } from '../services/SceneManager';
import { LocationManager } from '../services/LocationManager';
import { renderViewSwitcher } from '../components/ViewSwitcher';
import { pickImage as pickImageModal, resolveImagePath } from '../components/ImagePicker';
import { AddFieldModal } from '../components/AddFieldModal';
import {
    isCustomSectionKey,
    renderCustomSectionsAtSlot,
    renderAddCustomSectionButton,
    type CustomSectionsHost,
    type CustomSection,
} from '../components/CustomSectionsRenderer';
import type { UniversalFieldTemplate } from '../services/FieldTemplateService';
import { formatActChapterPrefix } from '../utils/actChapter';

import type SceneCardsPlugin from '../main';
import { CharacterManager } from '../services/CharacterManager';
import { RenameConfirmModal } from '../components/RenameConfirmModal';

import { applyMobileClass } from '../components/MobileAdapter';
import { attachTooltip } from '../components/Tooltip';
import { renderCodexCategoryTabs } from '../components/CodexCategoryTabs';

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
    private autoSaveTimer: number | null = null;
    /** The draft waiting to be saved (if any) */
    private pendingSaveDraft: WorldOrLocation | null = null;
    /** Snapshot of the item before any edits — used for undo recording */
    private undoSnapshot: WorldOrLocation | null = null;
    private _lastSaveTime = 0;
    private static readonly SAVE_REFRESH_GRACE_MS = 2000;
    /** Original name when the detail view was opened — used for cascade rename detection */
    private originalItemName: string | null = null;
    /** Original type (world vs location) when the detail view was opened */
    private originalItemType: 'world' | 'location' | null = null;
    /** Current search/filter text for overview tree */
    private searchText: string = '';
    /** Current sort mode for the overview tree */
    private sortBy: 'name' | 'modified' | 'created' | 'type' | 'manual' = 'name';
    /**
     * When true and the active project belongs to a series, the tree hides
     * worlds and locations whose `books[]` field excludes the current book.
     */
    private bookFilterActive: boolean = false;

    /** Issue #102 — dropdowns portaled to <body> so position:fixed escapes
     *  ancestors with transform/contain. Cleaned up on each re-render. */
    private _portaledDropdowns: HTMLElement[] = [];
    private clearPortaledDropdowns(): void {
        for (const el of this._portaledDropdowns) { try { el.remove(); } catch { /* noop */ } }
        this._portaledDropdowns = [];
    }

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin, sceneManager: SceneManager) {
        super(leaf);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
        // Use the plugin's shared LocationManager so entries scanned from
        // Additional Source Folders survive view refreshes.
        this.locationManager = plugin.locationManager;
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
        applyMobileClass(container);
        this.rootContainer = container;

        await this.sceneManager.initialize();
        await this.plugin.reloadEntities();
        this.renderView(container);
    }

    async onClose(): Promise<void> {
        // Flush any pending auto-save so edits are not lost
        await this.flushPendingSave();
        // Remove any orphaned gallery lightbox windows
        activeDocument.querySelectorAll('.gallery-lightbox-window').forEach(el => el.remove());
        this.clearPortaledDropdowns(); // issue #102 — clean up portaled popups
    }

    // ── Main render ────────────────────────────────────

    private renderView(container: HTMLElement): void {
        this.clearPortaledDropdowns(); // issue #102 — don't leak portaled popups across re-renders
        container.empty();

        const toolbar = container.createDiv('story-line-toolbar');
        const titleRow = toolbar.createDiv('story-line-title-row');
        titleRow.createEl('h3', { cls: 'story-line-view-title', text: 'StoryLine' });

        renderViewSwitcher(toolbar, LOCATION_VIEW_TYPE, this.plugin, this.leaf);

        const controls = toolbar.createDiv('story-line-toolbar-controls');

        // ── Codex category tabs ─────────────────────
        renderCodexCategoryTabs(container, {
            activeId: 'locations-pseudo',
            leaf: this.leaf,
            plugin: this.plugin,
        });

        // Add buttons
        const addWorldBtn = controls.createEl('button', { cls: 'clickable-icon' });
        obsidian.setIcon(addWorldBtn, 'map-plus');
        attachTooltip(addWorldBtn, 'New World');
        addWorldBtn.addEventListener('click', () => this.promptNewWorld());

        const addLocBtn = controls.createEl('button', { cls: 'clickable-icon' });
        obsidian.setIcon(addLocBtn, 'map-pin-plus-inside');
        attachTooltip(addLocBtn, 'New Location');
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
        container.createEl('h3', { text: 'Worlds & locations' });

        // Search + Sort
        const searchRow = container.createDiv('codex-search-row');
        const searchInput = searchRow.createEl('input', {
            cls: 'codex-search-input',
            attr: { type: 'text', placeholder: 'Search locations…' },
        });
        searchInput.value = this.searchText;
        // Only re-focus the search input if this view already had focus —
        // otherwise external refreshes steal focus from the manuscript
        // editor in split view (issue #221).
        const hadFocus = activeDocument.activeElement?.closest('.story-line-location-container') != null;
        searchInput.addEventListener('input', () => {
            this.searchText = searchInput.value;
            this.renderOverview(container);
        });
        if (hadFocus) {
            window.setTimeout(() => {
                searchInput.focus();
                searchInput.selectionStart = searchInput.selectionEnd = searchInput.value.length;
            }, 0);
        }

        searchRow.createSpan({ cls: 'codex-sort-label', text: 'Sort by' });
        const sortSelect = searchRow.createEl('select', { cls: 'codex-sort-select' });
        for (const opt of [
            { value: 'name', label: 'Name' },
            { value: 'modified', label: 'Last edited' },
            { value: 'created', label: 'Date created' },
            { value: 'type', label: 'Type' },
            { value: 'manual', label: 'Manual' },
        ]) {
            const el = sortSelect.createEl('option', { text: opt.label, value: opt.value });
            if (this.sortBy === opt.value) el.selected = true;
        }
        sortSelect.addEventListener('change', () => {
            this.sortBy = sortSelect.value as 'type' | 'name' | 'created' | 'modified' | 'manual';
            this.renderOverview(container);
        });

        // Series book filter
        const currentBook = this.plugin.sceneManager.getCurrentBookTitle();
        const currentBookId = this.plugin.sceneManager.getCurrentBookId();
        const inSeries = !!this.plugin.sceneManager.getSeriesFolder();
        if (inSeries && currentBook) {
            const filterToggle = searchRow.createEl('button', {
                cls: `codex-book-filter${this.bookFilterActive ? ' active' : ''}`,
                text: this.bookFilterActive ? `Showing: ${currentBook}` : 'All books',
            });
            attachTooltip(filterToggle, this.bookFilterActive
                ? `Click to show all series locations`
                : `Click to hide entries not in “${currentBook}”`);
            filterToggle.addEventListener('click', () => {
                this.bookFilterActive = !this.bookFilterActive;
                this.renderOverview(container);
            });
        }

        const q = this.searchText.toLowerCase();

        const allWorlds = this.locationManager.getAllWorlds();
        const allOrphans = this.locationManager.getOrphanLocations();
        const scenes = this.sceneManager.getAllScenes().filter(scene => !scene.inactive);

        // Filter worlds: show a world if its name OR any child location name matches
        let worlds = q ? allWorlds.filter(w => {
            if (w.name.toLowerCase().includes(q)) return true;
            const locs = this.locationManager.getLocationsForWorld(w.name);
            return locs.some(l => l.name.toLowerCase().includes(q));
        }) : [...allWorlds];

        let orphanLocations = q
            ? allOrphans.filter(l => l.name.toLowerCase().includes(q))
            : [...allOrphans];

        // Book-membership filter (series mode only).
        if (this.bookFilterActive && currentBook) {
            const lower = currentBook.toLowerCase();
            const inBook = (item: WorldOrLocation) => {
                if (currentBookId && item.booksById && item.booksById.length > 0) {
                    return item.booksById.includes(currentBookId);
                }
                if (!item.books || item.books.length === 0) return true;
                return item.books.some(b => b.toLowerCase() === lower);
            };
            worlds = worlds.filter(w => {
                // Keep the world if any of its child locations are in the book.
                return this.locationManager.getLocationsForWorld(w.name).some(inBook);
            });
            orphanLocations = orphanLocations.filter(inBook);
        }

        // Apply sort
        const sortItems = <T extends { name: string; locationType?: string; modified?: string; created?: string; sortOrder?: number }>(arr: T[]) => {
            if (this.sortBy === 'manual') {
                arr.sort((a, b) => {
                    const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
                    const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
                    return ao !== bo ? ao - bo : a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                });
            } else if (this.sortBy === 'modified') {
                arr.sort((a, b) => (b.modified ?? '').localeCompare(a.modified ?? ''));
            } else if (this.sortBy === 'created') {
                arr.sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''));
            } else if (this.sortBy === 'type') {
                arr.sort((a, b) => {
                    const ta = a.locationType || '';
                    const tb = b.locationType || '';
                    if (ta !== tb) return ta.localeCompare(tb);
                    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                });
            } else {
                arr.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
            }
        };
        sortItems(worlds);
        sortItems(orphanLocations);

        if (worlds.length === 0 && orphanLocations.length === 0 && !q) {
            const empty = container.createDiv('location-empty-state');
            const emptyIcon = empty.createDiv('location-empty-icon');
            obsidian.setIcon(emptyIcon, 'map');
            empty.createEl('h4', { text: 'No worlds or locations yet' });
            empty.createEl('p', { text: 'Click "+ world" to create a worldbuilding profile, or "+ location" to add a specific place.' });
            return;
        }

        const tree = container.createDiv('location-tree');

        // Render each world and its locations
        const worldOrder = worlds.map(world => world.filePath);
        for (const world of worlds) {
            this.renderWorldNode(tree, world, scenes, worldOrder);
        }

        // Orphan locations (not linked to a world)
        if (orphanLocations.length > 0) {
            if (worlds.length > 0) {
                const divider = tree.createDiv('location-orphan-divider');
                divider.createSpan({ text: 'Standalone Locations' });
            }
            const orphanRoots = orphanLocations.filter(loc =>
                !loc.parent || !orphanLocations.some(parent =>
                    parent.name.toLowerCase() === loc.parent!.toLowerCase()),
            );
            for (const loc of orphanRoots) {
                this.renderLocationNode(tree, loc, scenes, 0);
            }
        }

        // Locations from scenes that don't have files yet
        const allLocNames = [...this.locationManager.getAllLocations().map(l => l.name.toLowerCase()),
            ...allWorlds.map(w => w.name.toLowerCase())];
        const sceneLocations = this.sceneManager.queryService.getUniqueValues('location');
        let unlinked = sceneLocations.filter(n => !allLocNames.includes(n.toLowerCase()));
        if (q) {
            unlinked = unlinked.filter(n => n.toLowerCase().includes(q));
        }

        if (unlinked.length > 0) {
            const divider = tree.createDiv('location-orphan-divider');
            divider.createSpan({ text: 'Locations from scenes (no profile yet)' });
            for (const name of unlinked) {
                this.renderUnlinkedLocation(tree, name, scenes);
            }
        }
    }

    private renderWorldNode(
        parent: HTMLElement,
        world: StoryWorld,
        scenes: Scene[],
        siblingOrder: string[] = [],
    ): void {
        const node = parent.createDiv('location-tree-node location-world-node');
        const isCollapsed = this.collapsedTreeNodes.has(world.filePath);

        const header = node.createDiv('location-tree-header');
        header.setAttribute('draggable', 'true');
        header.addEventListener('dragstart', (e) => {
            e.dataTransfer?.setData('application/x-storyline-world', world.filePath);
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        });
        // Issue #238 feedback — drag-and-drop locations onto a world to assign
        header.addEventListener('dragover', (e) => {
            const isWorldDrag = e.dataTransfer?.types?.includes('application/x-storyline-world');
            const isLocationDrag = e.dataTransfer?.types?.includes('application/x-storyline-location');
            if (!isWorldDrag && !isLocationDrag) return;
            e.preventDefault();
            header.addClass('location-tree-drop-target');
        });
        header.addEventListener('dragleave', () => header.removeClass('location-tree-drop-target'));
        header.addEventListener('drop', (e) => {
            e.preventDefault();
            header.removeClass('location-tree-drop-target');
            const sourceWorld = e.dataTransfer?.getData('application/x-storyline-world');
            if (sourceWorld && sourceWorld !== world.filePath) {
                void this.reorderWorlds(sourceWorld, world.filePath, siblingOrder);
                return;
            }
            const locName = e.dataTransfer?.getData('application/x-storyline-location');
            if (locName) void this.reparentLocation(locName, { world: world.name, parent: undefined });
        });
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
            chevron.setCssStyles({ width: '14px' }); // spacer
        }

        const icon = header.createSpan('location-tree-icon');
        if (world.image) {
            try {
                // Use the helper function to resolve the image path
                const imgSrc = resolveImagePath(this.app, world.image);
                
                const img = icon.createEl('img', { attr: { src: imgSrc, alt: world.name }, cls: 'location-tree-thumb' });
                
                // Add error handler to show placeholder if image fails to load
                img.onerror = () => {
                    img.remove();
                    obsidian.setIcon(icon, 'globe');
                };
            } catch (error) {
                obsidian.setIcon(icon, 'globe');
            }
        } else {
            obsidian.setIcon(icon, 'globe');
        }

        header.createSpan({ cls: 'location-tree-name', text: world.name });


        header.addEventListener('click', () => {
            this.selectedItem = world.filePath;
            this.renderView(this.rootContainer!);
        });

        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showItemContextMenu(world, e);
        });

        // Children
        if (!isCollapsed && worldLocations.length > 0) {
            const children = node.createDiv('location-tree-children');
            const allLocations = this.locationManager.getAllLocations();
            const topLevel = worldLocations.filter(loc =>
                !loc.parent || !allLocations.some(parent =>
                    parent.name.toLowerCase() === loc.parent!.toLowerCase()),
            );
            this.sortLocations(topLevel);
            const siblingOrder = topLevel.map(location => location.name);
            for (const loc of topLevel) {
                this.renderLocationNode(children, loc, scenes, 1, siblingOrder);
            }
        }
    }

    private renderLocationNode(
        parent: HTMLElement,
        loc: StoryLocation,
        scenes: Scene[],
        depth: number,
        siblingOrder: string[] = [],
    ): void {
        const node = parent.createDiv('location-tree-node');
        const childLocations = this.locationManager.getChildLocations(loc.name);
        this.sortLocations(childLocations);
        const isCollapsed = this.collapsedTreeNodes.has(loc.filePath);

        const header = node.createDiv('location-tree-header');
        header.setCssStyles({ paddingLeft: `${depth * 20}px` });

        // Issue #238 feedback — drag this location to reparent it
        header.setAttribute('draggable', 'true');
        header.addEventListener('dragstart', (e) => {
            e.dataTransfer?.setData('application/x-storyline-location', loc.name);
            e.dataTransfer?.setData('text/plain', loc.name);
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        });
        // Allow dropping other locations onto this one to make it their parent
        header.addEventListener('dragover', (e) => {
            const dragged = e.dataTransfer?.types?.includes('application/x-storyline-location');
            if (!dragged) return;
            e.preventDefault();
            header.addClass('location-tree-drop-target');
        });
        header.addEventListener('dragleave', () => header.removeClass('location-tree-drop-target'));
        header.addEventListener('drop', (e) => {
            e.preventDefault();
            header.removeClass('location-tree-drop-target');
            const locName = e.dataTransfer?.getData('application/x-storyline-location');
            if (locName && locName !== loc.name) {
                const draggedLocation = this.locationManager.getAllLocations().find(location => location.name === locName);
                const sameGroup = draggedLocation
                    && (draggedLocation.world ?? '').toLowerCase() === (loc.world ?? '').toLowerCase()
                    && (draggedLocation.parent ?? '').toLowerCase() === (loc.parent ?? '').toLowerCase();
                if (sameGroup) {
                    void this.reorderLocations(locName, loc.name, siblingOrder);
                } else {
                    void this.reparentLocation(locName, { world: loc.world, parent: loc.name });
                }
            }
        });

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
            chevron.setCssStyles({ width: '14px' });
        }

        const icon = header.createSpan('location-tree-icon');
        if (loc.image) {
            try {
                // Use the helper function to resolve the image path
                const imgSrc = resolveImagePath(this.app, loc.image);
                
                const img = icon.createEl('img', { attr: { src: imgSrc, alt: loc.name }, cls: 'location-tree-thumb' });
                
                // Add error handler to show placeholder if image fails to load
                img.onerror = () => {
                    img.remove();
                    obsidian.setIcon(icon, 'map-pin');
                };
            } catch (error) {
                obsidian.setIcon(icon, 'map-pin');
            }
        } else {
            obsidian.setIcon(icon, 'map-pin');
        }

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

        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showItemContextMenu(loc, e);
        });

        // Child locations
        if (!isCollapsed && childLocations.length > 0) {
            const children = node.createDiv('location-tree-children');
            const childOrder = childLocations.map(location => location.name);
            for (const child of childLocations) {
                this.renderLocationNode(children, child, scenes, depth + 1, childOrder);
            }
        }
    }

    private sortLocations(locations: StoryLocation[]): void {
        if (this.sortBy !== 'manual') return;
        locations.sort((a, b) => {
            const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
            const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
            return ao !== bo ? ao - bo : a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
    }

    private renderUnlinkedLocation(parent: HTMLElement, name: string, scenes: Scene[]): void {
        const node = parent.createDiv('location-tree-node location-unlinked-node');
        const header = node.createDiv('location-tree-header');

        header.createSpan({ cls: 'location-tree-chevron' }).setCssStyles({ width: '14px' });
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

    // ── Tree node context menu (promote/demote, book membership) ───────

    /**
     * Issue #238 feedback — reparent a location by drag-and-drop. Updates the
     * location's `world` and `parent` fields and persists. Prevents cycles
     * (dropping a location onto itself or one of its own descendants).
     */
    private async reparentLocation(
        locName: string,
        target: { world?: string; parent?: string },
    ): Promise<void> {
        const loc = this.locationManager.getAllLocations().find(l => l.name === locName);
        if (!loc) return;
        // Prevent dropping a location onto itself or one of its descendants
        if (target.parent) {
            let ancestor: StoryLocation | undefined = loc;
            const seen = new Set<string>();
            while (ancestor && !seen.has(ancestor.filePath)) {
                seen.add(ancestor.filePath);
                if (ancestor.name === target.parent) return; // would create a cycle
                ancestor = ancestor.parent
                    ? this.locationManager.getAllLocations().find(l => l.name === ancestor!.parent)
                    : undefined;
            }
        }
        const updated: StoryLocation = { ...loc, world: target.world, parent: target.parent };
        await this.locationManager.saveLocation(updated);
        this.plugin.refreshOpenViews();
    }

    private async reorderLocations(sourceName: string, targetName: string, visibleOrder: string[] = []): Promise<void> {
        const allLocations = this.locationManager.getAllLocations();
        const source = allLocations.find(location => location.name === sourceName);
        const target = allLocations.find(location => location.name === targetName);
        if (!source || !target) return;

        const sameGroup = (source.world ?? '').toLowerCase() === (target.world ?? '').toLowerCase()
            && (source.parent ?? '').toLowerCase() === (target.parent ?? '').toLowerCase();
        if (!sameGroup) return;

        const allSiblings = allLocations
            .filter(location =>
                (location.world ?? '').toLowerCase() === (target.world ?? '').toLowerCase()
                && (location.parent ?? '').toLowerCase() === (target.parent ?? '').toLowerCase(),
            );
        const byName = new Map(allSiblings.map(location => [location.name, location]));
        const siblings = visibleOrder.length > 0
            ? [
                ...visibleOrder.map(name => byName.get(name)).filter((location): location is StoryLocation => !!location),
                ...allSiblings.filter(location => !visibleOrder.includes(location.name)),
            ]
            : allSiblings.sort((a, b) => {
                const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
                const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
                return ao !== bo ? ao - bo : a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
        const sourceIndex = siblings.findIndex(location => location.name === sourceName);
        const targetIndex = siblings.findIndex(location => location.name === targetName);
        if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

        const [moved] = siblings.splice(sourceIndex, 1);
        siblings.splice(targetIndex, 0, moved);
        await Promise.all(siblings.map((location, index) =>
            location.sortOrder === index
                ? Promise.resolve()
                : this.locationManager.saveLocation({ ...location, sortOrder: index }),
        ));
        this.sortBy = 'manual';
        await this.plugin.refreshOpenViews();
    }

    private async reorderWorlds(sourcePath: string, targetPath: string, visibleOrder: string[] = []): Promise<void> {
        const allWorlds = this.locationManager.getAllWorlds();
        const byPath = new Map(allWorlds.map(world => [world.filePath, world]));
        const ordered = visibleOrder.length > 0
            ? [
                ...visibleOrder.map(path => byPath.get(path)).filter((world): world is StoryWorld => !!world),
                ...allWorlds.filter(world => !visibleOrder.includes(world.filePath)),
            ]
            : allWorlds.sort((a, b) => {
                const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
                const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
                return ao !== bo ? ao - bo : a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
        const sourceIndex = ordered.findIndex(world => world.filePath === sourcePath);
        const targetIndex = ordered.findIndex(world => world.filePath === targetPath);
        if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

        const [moved] = ordered.splice(sourceIndex, 1);
        ordered.splice(targetIndex, 0, moved);
        await Promise.all(ordered.map((world, index) =>
            world.sortOrder === index
                ? Promise.resolve()
                : this.locationManager.saveWorld({ ...world, sortOrder: index }),
        ));
        this.sortBy = 'manual';
        await this.plugin.refreshOpenViews();
    }

    private showItemContextMenu(item: WorldOrLocation, e: MouseEvent): void {
        const menu = new obsidian.Menu();
        const sm = this.plugin.sceneManager;
        const seriesFolder = sm.getSeriesFolder();
        const seriesLocFolder = seriesFolder
            ? `${seriesFolder}/Codex/Locations`
            : null;
        const projectLocFolder = sm.getProjectLocalLocationFolder();
        const currentBook = sm.getCurrentBookTitle();
        const currentBookId = sm.getCurrentBookId();

        menu.addItem(it => it.setTitle(item.name).setDisabled(true));
        menu.addSeparator();

        if (seriesFolder && seriesLocFolder && projectLocFolder) {
            const inSeries = item.filePath.startsWith(seriesLocFolder + '/');
            if (inSeries) {
                menu.addItem(it =>
                    it.setTitle('Demote to project (book-only)')
                        .setIcon('arrow-down-from-line')
                        .onClick(() => this.moveItemTo(item, projectLocFolder, 'demoted')));
            } else {
                menu.addItem(it =>
                    it.setTitle('Promote to series (shared)')
                        .setIcon('arrow-up-from-line')
                        .onClick(() => this.moveItemTo(item, seriesLocFolder, 'promoted')));
            }
            menu.addSeparator();
        }

        if (seriesFolder && currentBook) {
            const lower = currentBook.toLowerCase();
            const allBooks = !item.books || item.books.length === 0;
            const inBook = currentBookId && item.booksById && item.booksById.length > 0
                ? item.booksById.includes(currentBookId)
                : allBooks || (item.books?.some(b => b.toLowerCase() === lower) ?? false);

            if (allBooks) {
                menu.addItem(it =>
                    it.setTitle(`Restrict to "${currentBook}" only`)
                        .setIcon('book-marked')
                        .onClick(() => this.setItemBooks(item, [currentBook])));
            } else if (inBook) {
                menu.addItem(it =>
                    it.setTitle(`Remove from "${currentBook}"`)
                        .setIcon('book-x')
                        .onClick(() => this.setItemBooks(item,
                            (item.books || []).filter(b => b.toLowerCase() !== lower))));
            } else {
                menu.addItem(it =>
                    it.setTitle(`Add to "${currentBook}"`)
                        .setIcon('book-plus')
                        .onClick(() => this.setItemBooks(item,
                            [...(item.books || []), currentBook])));
            }
            menu.addItem(it =>
                it.setTitle('Share across all books')
                    .setIcon('books')
                    .setDisabled(allBooks)
                    .onClick(() => this.setItemBooks(item, [])));
        }

        menu.showAtMouseEvent(e);
    }

    private async moveItemTo(item: WorldOrLocation, target: string, verb: 'promoted' | 'demoted'): Promise<void> {
        try {
            await this.locationManager.moveItem(item, target);
            new Notice(`"${item.name}" ${verb}`);
            await this.plugin.refreshOpenViews();
        } catch (err) {
            new Notice(`Could not move: ${(err as Error).message}`);
        }
    }

    private async setItemBooks(item: WorldOrLocation, books: string[]): Promise<void> {
        try {
            const projects = this.sceneManager.getProjects();
            const booksById = books
                .map(book => projects.find(project => {
                    const base = project.filePath.substring(0, project.filePath.lastIndexOf('/')).split('/').pop() ?? '';
                    return project.title.toLowerCase() === book.toLowerCase() || base.toLowerCase() === book.toLowerCase();
                })?.bookId)
                .filter((id): id is string => !!id);
            const updated = {
                ...item,
                books: books.length ? books : undefined,
                booksById: booksById.length ? booksById : undefined,
            } as WorldOrLocation;
            if (updated.type === 'world') {
                await this.locationManager.saveWorld(updated);
            } else {
                await this.locationManager.saveLocation(updated);
            }
            await this.plugin.refreshOpenViews();
        } catch (err) {
            new Notice(`Could not update book membership: ${(err as Error).message}`);
        }
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
        const draft: WorldOrLocation = { ...item, custom: { ...(item.custom || {}) }, universalFields: { ...(item.universalFields || {}) } };
        // Snapshot for undo — taken once when the detail view opens
        this.undoSnapshot = { ...item, custom: { ...(item.custom || {}) } };
        // Track original name for cascade rename detection
        this.originalItemName = item.name;
        this.originalItemType = item.type;

        // Header
        const header = container.createDiv('location-detail-header');
        const backBtn = header.createSpan({ cls: 'codex-nav-back-link' });
        const backIcon = backBtn.createSpan();
        obsidian.setIcon(backIcon, 'circle-arrow-left');
        backBtn.createSpan({ text: ' All Locations' });
        backBtn.addEventListener('click', () => {
            this.selectedItem = null;
            this.renderView(this.rootContainer!);
        });

        const headerRight = header.createDiv('location-detail-header-right');

        // Open file button
        const openBtn = headerRight.createEl('button', {
            cls: 'codex-detail-action-btn',
            attr: { 'aria-label': 'Open file' },
        });
        const openIcon = openBtn.createSpan();
        obsidian.setIcon(openIcon, 'file');
        attachTooltip(openBtn, 'Open file');
        openBtn.addEventListener('click', () => this.openFile(item));

        // Delete button
        const deleteBtn = headerRight.createEl('button', {
            cls: 'codex-detail-action-btn codex-detail-delete-btn',
            attr: { 'aria-label': 'Delete' },
        });
        const deleteIcon = deleteBtn.createSpan();
        obsidian.setIcon(deleteIcon, 'trash');
        attachTooltip(deleteBtn, 'Delete');
        deleteBtn.addEventListener('click', () => this.confirmDelete(item));

        // Type label
        const typeLabel = container.createDiv('location-detail-type');
        obsidian.setIcon(typeLabel, isWorld ? 'globe' : 'map-pin');
        typeLabel.createSpan({ text: ` ${isWorld ? 'World' : 'Location'}` });

        // Portrait area (clickable to change)
        const portraitArea = container.createDiv('location-detail-portrait');
        const renderPortrait = () => {
            portraitArea.empty();
            if (draft.image) {
                try {
                    // Use the helper function to resolve the image path
                    const imgSrc = resolveImagePath(this.app, draft.image);
                    
                    const img = portraitArea.createEl('img', { attr: { src: imgSrc, alt: draft.name } });
                    img.classList.add('location-detail-portrait-img');
                    
                    // Add error handler to show placeholder if image fails to load
                    img.onerror = () => {
                        img.remove();
                        const ph = portraitArea.createDiv('location-detail-portrait-placeholder');
                        obsidian.setIcon(ph, 'image');
                    };
                } catch (error) {
                    const ph = portraitArea.createDiv('location-detail-portrait-placeholder');
                    obsidian.setIcon(ph, 'image');
                }
            } else {
                const ph = portraitArea.createDiv('location-detail-portrait-placeholder');
                obsidian.setIcon(ph, 'image');
                ph.createSpan({ text: 'Click to add image' });
            }
            const changeLabel = portraitArea.createDiv('location-portrait-change-label');
            changeLabel.textContent = draft.image ? 'Change image' : '';
        };
        renderPortrait();
        portraitArea.addEventListener('click', () => {
            this.pickImage(draft.image).then(async (picked) => {
                if (picked !== undefined) {
                    draft.image = picked || undefined;
                    if (draft.type === 'world') {
                        await this.locationManager.saveWorld(draft as StoryWorld);
                    } else {
                        await this.locationManager.saveLocation(draft as StoryLocation);
                    }
                    renderPortrait();
                }
            });
        });

        // Layout: form + side panel
        const layout = container.createDiv('location-detail-layout');
        const formPanel = layout.createDiv('location-detail-form');
        const sidePanel = layout.createDiv('location-detail-side');

        // Categories interleaved with user-defined custom sections (#120)
        const categories = isWorld ? WORLD_CATEGORIES : LOCATION_CATEGORIES;
        const customHost = this.buildCustomSectionsHost(draft, categories.length);
        // Slot 0: any custom sections positioned above the first built-in.
        renderCustomSectionsAtSlot(formPanel, customHost, 0);
        // Issue #236 — collect hidden categories so we can render them in a
        // collapsible "hidden categories" container at the bottom, mirroring
        // how hidden fields work. Previously the header was left visible,
        // which looked identical to a collapsed section.
        const hiddenCats = this.plugin.settings.hiddenCategories['location'] ?? [];
        const hiddenCategoryList: typeof categories = [];
        for (let i = 0; i < categories.length; i++) {
            if (hiddenCats.includes(categories[i].title)) {
                hiddenCategoryList.push(categories[i]);
                renderCustomSectionsAtSlot(formPanel, customHost, i + 1);
                continue;
            }
            this.renderCategory(formPanel, categories[i], draft);
            // Slot i+1: any custom sections after the i-th built-in.
            renderCustomSectionsAtSlot(formPanel, customHost, i + 1);
        }

        // For locations: world & parent dropdowns
        if (!isWorld) {
            this.renderLocationHierarchy(formPanel, draft as StoryLocation);
        }

        // Custom fields
        this.renderCustomFields(formPanel, draft);

        // "+ Add custom section" button at the bottom
        renderAddCustomSectionButton(formPanel, customHost);

        // ── Hidden categories toggle (mirrors hidden fields) ──
        if (hiddenCategoryList.length > 0) {
            this.renderHiddenCategoriesToggle(formPanel, hiddenCategoryList, draft);
        }

        // Gallery (before side panel stats)
        this.renderGallery(sidePanel, draft);

        // Side panel
        if (isWorld) {
            this.renderWorldSidePanel(sidePanel, draft as StoryWorld);
        } else {
            this.renderLocationSidePanel(sidePanel, draft as StoryLocation);
        }

        // Cross-entity references
        this.renderReferencesPanel(sidePanel, item.name);
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

        // ── Hide/unhide entire category button ──
        const hideCatBtn = sectionHeader.createSpan({
            cls: 'character-section-hide-cat-btn',
            attr: {
                title: 'Hide this category',
                'aria-label': 'Hide this category',
                role: 'button',
            },
        });
        obsidian.setIcon(hideCatBtn, 'eye-off');
        hideCatBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const settings = this.plugin.settings;
            if (!settings.hiddenCategories['location']) settings.hiddenCategories['location'] = [];
            const list = settings.hiddenCategories['location'];
            if (!list.includes(category.title)) list.push(category.title);
            await this.plugin.saveSettings();
            if (this.rootContainer) {
                this.renderDetail(this.rootContainer);
            }
        });

        // '+' button to add a universal field to this section
        const addFieldBtn = sectionHeader.createEl('button', {
            cls: 'character-section-add-field-btn',
            attr: { title: 'Add universal field to this section', 'aria-label': 'Add universal field' },
        });
        obsidian.setIcon(addFieldBtn, 'plus');
        addFieldBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isWorld = draft.type === 'world';
            const categories = isWorld ? WORLD_CATEGORIES : LOCATION_CATEGORIES;
            const sectionNames = categories.map(c => c.title);
            const existingSiblings = this.plugin.fieldTemplates
                .getBySection(category.title, 'location')
                .map(t => ({ id: t.id, label: t.label }));
            // Snapshot the current built-in keys so moveAfter can resolve the
            // merged order even before the new field is rendered (issue #197).
            const builtInKeysForAdd = category.fields
                .filter(f => !(this.plugin.settings.hiddenFields['location'] ?? []).includes(f.key))
                .map(f => f.key);
            const modal = new AddFieldModal(
                this.app,
                category.title,
                null,
                async (template, positionAfterId) => {
                    template.category = 'location';
                    await this.plugin.fieldTemplates.add(template);
                    if (positionAfterId !== undefined) {
                        await this.plugin.fieldTemplates.moveAfter(
                            category.title, 'location', builtInKeysForAdd,
                            template.id, positionAfterId,
                        );
                    }
                    if (this.rootContainer) {
                        this.renderDetail(this.rootContainer);
                    }
                },
                undefined,
                sectionNames,
                existingSiblings,
            );
            modal.open();
        });

        // Issue #236 — hidden categories are now skipped entirely in the
        // render loop and collected into a "hidden categories" toggle at
        // the bottom (see renderHiddenCategoriesToggle). No early return
        // here — if renderCategory is called, the category is visible.

        const sectionBody = section.createDiv('location-section-body');
        if (isCollapsed) sectionBody.setCssStyles({ display: 'none' });

        sectionHeader.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('.character-section-add-field-btn')) return;
            if ((e.target as HTMLElement).closest('.character-section-hide-cat-btn')) return;
            if (this.collapsedSections.has(category.title)) {
                this.collapsedSections.delete(category.title);
                sectionBody.setCssStyles({ display: '' });
                obsidian.setIcon(chevron, 'chevron-down');
            } else {
                this.collapsedSections.add(category.title);
                sectionBody.setCssStyles({ display: 'none' });
                obsidian.setIcon(chevron, 'chevron-right');
            }
        });

        // Built-in fields (skip hidden ones)
        const hiddenKeys = this.plugin.settings.hiddenFields['location'] ?? [];
        const visibleFields = category.fields.filter(f => !hiddenKeys.includes(f.key));
        const hiddenFieldsInCat = category.fields.filter(f => hiddenKeys.includes(f.key));

        // Render in user-defined merged order (built-in + universal).
        const universalFields = this.plugin.fieldTemplates.getBySection(category.title, 'location');
        const fieldMap = new Map(visibleFields.map(f => [f.key, f]));
        const tplMap = new Map(universalFields.map(t => [t.id, t]));
        const builtInKeys = visibleFields.map(f => f.key);
        const merged = this.plugin.fieldTemplates.getMergedOrder(category.title, 'location', builtInKeys);
        for (const entry of merged) {
            if (entry.kind === 'builtin') {
                const f = fieldMap.get(entry.key);
                if (f) this.renderField(sectionBody, f, draft, category.title, builtInKeys);
            } else {
                const t = tplMap.get(entry.key);
                if (t) this.renderUniversalField(sectionBody, t, draft, builtInKeys);
            }
        }

        // Hidden fields toggle
        if (hiddenFieldsInCat.length > 0) {
            const toggleEl = sectionBody.createDiv('hidden-fields-toggle');
            toggleEl.createEl('a', {
                text: `Show ${hiddenFieldsInCat.length} hidden field${hiddenFieldsInCat.length > 1 ? 's' : ''}`,
                cls: 'hidden-fields-toggle-link',
            });
            const hiddenContainer = sectionBody.createDiv('hidden-fields-container');
            hiddenContainer.setCssStyles({ display: 'none' });
            for (const field of hiddenFieldsInCat) {
                this.renderField(hiddenContainer, field, draft);
            }
            let showing = false;
            toggleEl.addEventListener('click', () => {
                showing = !showing;
                hiddenContainer.setCssStyles({ display: showing ? '' : 'none' });
                toggleEl.querySelector('a')!.textContent = showing
                    ? `Hide ${hiddenFieldsInCat.length} hidden field${hiddenFieldsInCat.length > 1 ? 's' : ''}`
                    : `Show ${hiddenFieldsInCat.length} hidden field${hiddenFieldsInCat.length > 1 ? 's' : ''}`;
            });
        }
    }

    /**
     * Issue #236 — render a collapsible "Show N hidden categories" toggle
     * at the bottom of the form, mirroring the hidden-fields pattern.
     */
    private renderHiddenCategoriesToggle(
        parent: HTMLElement,
        hiddenCategoryList: LocationFieldCategory[],
        draft: WorldOrLocation,
    ): void {
        const toggleEl = parent.createDiv('hidden-fields-toggle');
        const count = hiddenCategoryList.length;
        toggleEl.createEl('a', {
            text: `Show ${count} hidden categor${count > 1 ? 'ies' : 'y'}`,
            cls: 'hidden-fields-toggle-link',
        });
        const hiddenContainer = parent.createDiv('hidden-categories-container');
        hiddenContainer.setCssStyles({ display: 'none' });
        for (const category of hiddenCategoryList) {
            this.renderHiddenCategory(hiddenContainer, category, draft);
        }
        let showing = false;
        toggleEl.addEventListener('click', () => {
            showing = !showing;
            hiddenContainer.setCssStyles({ display: showing ? '' : 'none' });
            toggleEl.querySelector('a')!.textContent = showing
                ? `Hide ${count} hidden categor${count > 1 ? 'ies' : 'y'}`
                : `Show ${count} hidden categor${count > 1 ? 'ies' : 'y'}`;
        });
    }

    /**
     * Render a hidden category inside the hidden-categories toggle container.
     * The header shows an eye (show) button so the user can un-hide it.
     */
    private renderHiddenCategory(
        parent: HTMLElement,
        category: LocationFieldCategory,
        draft: WorldOrLocation,
    ): void {
        const section = parent.createDiv('location-section is-category-hidden');
        const isCollapsed = this.collapsedSections.has(category.title);

        const sectionHeader = section.createDiv('location-section-header');
        const chevron = sectionHeader.createSpan('location-section-chevron');
        obsidian.setIcon(chevron, isCollapsed ? 'chevron-right' : 'chevron-down');
        const icon = sectionHeader.createSpan('location-section-icon');
        obsidian.setIcon(icon, category.icon);
        sectionHeader.createSpan({ text: category.title });

        const showCatBtn = sectionHeader.createSpan({
            cls: 'character-section-hide-cat-btn',
            attr: {
                title: 'Show this category',
                'aria-label': 'Show this category',
                role: 'button',
            },
        });
        obsidian.setIcon(showCatBtn, 'eye');
        showCatBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const settings = this.plugin.settings;
            const list = settings.hiddenCategories['location'] ?? [];
            const idx = list.indexOf(category.title);
            if (idx >= 0) list.splice(idx, 1);
            await this.plugin.saveSettings();
            if (this.rootContainer) {
                this.renderDetail(this.rootContainer);
            }
        });

        const sectionBody = section.createDiv('location-section-body');
        if (isCollapsed) sectionBody.setCssStyles({ display: 'none' });
        sectionHeader.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('.character-section-hide-cat-btn')) return;
            if (this.collapsedSections.has(category.title)) {
                this.collapsedSections.delete(category.title);
                sectionBody.setCssStyles({ display: '' });
                obsidian.setIcon(chevron, 'chevron-down');
            } else {
                this.collapsedSections.add(category.title);
                sectionBody.setCssStyles({ display: 'none' });
                obsidian.setIcon(chevron, 'chevron-right');
            }
        });

        const hiddenKeys = this.plugin.settings.hiddenFields['location'] ?? [];
        const visibleFields = category.fields.filter(f => !hiddenKeys.includes(f.key));
        const universalFields = this.plugin.fieldTemplates.getBySection(category.title, 'location');
        const fieldMap = new Map(visibleFields.map(f => [f.key, f]));
        const tplMap = new Map(universalFields.map(t => [t.id, t]));
        const builtInKeys = visibleFields.map(f => f.key);
        const merged = this.plugin.fieldTemplates.getMergedOrder(category.title, 'location', builtInKeys);
        for (const entry of merged) {
            if (entry.kind === 'builtin') {
                const f = fieldMap.get(entry.key);
                if (f) this.renderField(sectionBody, f, draft, category.title, builtInKeys);
            } else {
                const t = tplMap.get(entry.key);
                if (t) this.renderUniversalField(sectionBody, t, draft, builtInKeys);
            }
        }
    }

    private renderField(parent: HTMLElement, field: LocationFieldDef, draft: WorldOrLocation, sectionTitle?: string, builtInKeys?: string[]): void {
        const row = parent.createDiv('location-field-row');
        const labelEl = row.createEl('label', { cls: 'location-field-label', text: field.label });

        // Up/down chevrons — reorder this built-in field within the section.
        if (sectionTitle && builtInKeys) {
            this.addBuiltInMoveChevrons(labelEl, sectionTitle, 'location', builtInKeys, field.key);
        }

        // Hide/unhide toggle (skip 'name')
        if (field.key !== 'name') {
            const hiddenKeys = this.plugin.settings.hiddenFields['location'] ?? [];
            const isHidden = hiddenKeys.includes(field.key);
            const hideBtn = labelEl.createSpan({
                cls: 'field-hide-btn',
                attr: { 'aria-label': isHidden ? 'Show this field' : 'Hide this field' },
            });
            obsidian.setIcon(hideBtn, isHidden ? 'eye' : 'eye-off');
            hideBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const settings = this.plugin.settings;
                if (!settings.hiddenFields['location']) settings.hiddenFields['location'] = [];
                const list = settings.hiddenFields['location'];
                const idx = list.indexOf(field.key);
                if (idx >= 0) {
                    list.splice(idx, 1);
                } else {
                    list.push(field.key);
                }
                await this.plugin.saveSettings();
                if (this.rootContainer) this.renderDetail(this.rootContainer);
            });
        }

        const value = coerceString((draft as unknown as Record<string, unknown>)[field.key]);

        // Issue #228 — render an on/off toggle for boolean fields (e.g.
        // case-sensitive matching). Stored as a boolean in frontmatter.
        if (field.toggle) {
            const toggleWrap = row.createDiv({ cls: 'codex-field-toggle-wrap' });
            const cb = toggleWrap.createEl('input', { type: 'checkbox' });
            cb.checked = (draft as unknown as Record<string, unknown>)[field.key] === true || value === 'true';
            cb.addEventListener('change', () => {
                (draft as unknown as Record<string, unknown>)[field.key] = cb.checked;
                this.scheduleSave(draft);
            });
            return;
        }

        if (field.key === 'locationType') {
            const select = row.createEl('select', { cls: 'location-field-input dropdown' });
            select.createEl('option', { text: field.placeholder, value: '' });
            // Built-in types
            for (const t of LOCATION_TYPES) {
                const opt = select.createEl('option', { text: t, value: t.toLowerCase() });
                if (String(value).toLowerCase() === t.toLowerCase()) opt.selected = true;
            }
            // User-defined custom types
            const customTypes = this.plugin.settings.customLocationTypes ?? [];
            if (customTypes.length > 0) {
                const sep = select.createEl('option', { text: '──────────', value: '' });
                sep.disabled = true;
                for (const t of customTypes) {
                    const opt = select.createEl('option', { text: t, value: t.toLowerCase() });
                    if (String(value).toLowerCase() === t.toLowerCase()) opt.selected = true;
                }
            }
            // Pre-existing value not in either list (legacy)
            const knownLower = [
                ...LOCATION_TYPES.map(t => t.toLowerCase()),
                ...customTypes.map(t => t.toLowerCase()),
            ];
            if (value && !knownLower.includes(String(value).toLowerCase())) {
                const opt = select.createEl('option', { text: String(value), value: String(value) });
                opt.selected = true;
            }
            // "+ Add custom type…" sentinel
            const ADD_SENTINEL = '__add_custom_type__';
            select.createEl('option', { text: '+ add custom type???', value: ADD_SENTINEL });

            select.addEventListener('change', async () => {
                if (select.value === ADD_SENTINEL) {
                    const name = await this.promptCustomLocationType();
                    if (name) {
                        const list = this.plugin.settings.customLocationTypes ?? [];
                        if (!list.some(t => t.toLowerCase() === name.toLowerCase())) {
                            list.push(name);
                            this.plugin.settings.customLocationTypes = list;
                            await this.plugin.saveSettings();
                        }
                        (draft as unknown as Record<string, unknown>)[field.key] = name.toLowerCase();
                        await this.flushSave();
                        if (this.rootContainer) this.renderDetail(this.rootContainer);
                    } else {
                        // Re-select the previous value
                        select.value = String(value).toLowerCase();
                    }
                    return;
                }
                (draft as unknown as Record<string, unknown>)[field.key] = select.value;
                this.scheduleSave(draft);
            });
        } else if (field.multiline) {
            const textarea = row.createEl('textarea', {
                cls: 'location-field-textarea',
                attr: { placeholder: field.placeholder, rows: '3' },
            });
            textarea.value = value;
            textarea.addEventListener('input', () => {
                (draft as unknown as Record<string, unknown>)[field.key] = textarea.value;
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
                (draft as unknown as Record<string, unknown>)[field.key] = input.value;
                this.scheduleSave(draft);
            });

            // ── Cascade rename: check when leaving the Name field ──
            if (field.key === 'name') {
                input.addEventListener('blur', () => {
                    this.checkLocationRename(draft, input);
                });
            }
        }
    }

    /** Shared helper — attach up/down chevron buttons to a built-in field's
     *  label so it participates in the merged section ordering. */
    private addBuiltInMoveChevrons(
        labelEl: HTMLElement,
        section: string,
        category: string,
        builtInKeys: string[],
        fieldKey: string,
    ): void {
        const upBtn = labelEl.createSpan({
            cls: 'field-move-btn',
            attr: { title: 'Move field up', 'aria-label': 'Move field up' },
        });
        obsidian.setIcon(upBtn, 'chevron-up');
        upBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.plugin.fieldTemplates.moveEntryUp(section, category, builtInKeys, 'builtin', fieldKey);
            if (this.rootContainer) this.renderDetail(this.rootContainer);
        });

        const downBtn = labelEl.createSpan({
            cls: 'field-move-btn',
            attr: { title: 'Move field down', 'aria-label': 'Move field down' },
        });
        obsidian.setIcon(downBtn, 'chevron-down');
        downBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.plugin.fieldTemplates.moveEntryDown(section, category, builtInKeys, 'builtin', fieldKey);
            if (this.rootContainer) this.renderDetail(this.rootContainer);
        });
    }

    private renderUniversalField(
        parent: HTMLElement,
        tpl: UniversalFieldTemplate,
        draft: WorldOrLocation,
        builtInKeys?: string[],
    ): void {
        if (!draft.universalFields) draft.universalFields = {};
        // `universalFields` now holds `string | string[] | boolean` (checkbox
        // support, 1.10.43). Keep `rawValue` as the union for the checkbox
        // path and `value` as the coerced string for text / dropdown paths.
        const rawValue = draft.universalFields[tpl.id];
        const value: string = typeof rawValue === 'string' ? rawValue : '';

        const row = parent.createDiv('location-field-row codex-universal-field-row');

        const labelWrap = row.createDiv('codex-universal-label-wrap');
        labelWrap.createEl('label', { cls: 'location-field-label', text: tpl.label });

        const editBtn = labelWrap.createSpan({
            cls: 'codex-universal-edit-btn',
            attr: { title: 'Edit or remove this universal field', 'aria-label': 'Edit field' },
        });
        obsidian.setIcon(editBtn, 'pencil');
        editBtn.addEventListener('click', () => {
            const isWorld = draft.type === 'world';
            const categories = isWorld ? WORLD_CATEGORIES : LOCATION_CATEGORIES;
            const sectionNames = categories.map(c => c.title);
            const siblings = this.plugin.fieldTemplates
                .getBySection(tpl.section, tpl.category)
                .map(t => ({ id: t.id, label: t.label }));
            const modal = new AddFieldModal(
                this.app,
                tpl.section,
                tpl,
                async (updated, positionAfterId) => {
                    updated.category = 'location';
                    await this.plugin.fieldTemplates.update(tpl.id, updated);
                    if (positionAfterId !== undefined) {
                        await this.plugin.fieldTemplates.moveAfter(
                            tpl.section, tpl.category, builtInKeys ?? [],
                            tpl.id, positionAfterId,
                        );
                    }
                    if (this.rootContainer) this.renderDetail(this.rootContainer);
                },
                async () => {
                    await this.plugin.fieldTemplates.remove(tpl.id);
                    if (this.rootContainer) this.renderDetail(this.rootContainer);
                },
                sectionNames,
                siblings,
            );
            modal.open();
        });

        // Up/down move buttons — share field-move-btn styling for hover behavior.
        const moveUpBtn = labelWrap.createSpan({
            cls: 'codex-universal-move-btn',
            attr: { title: 'Move field up', 'aria-label': 'Move field up' },
        });
        obsidian.setIcon(moveUpBtn, 'chevron-up');
        moveUpBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.plugin.fieldTemplates.moveEntryUp(
                tpl.section, tpl.category, builtInKeys ?? [], 'universal', tpl.id,
            );
            if (this.rootContainer) this.renderDetail(this.rootContainer);
        });

        const moveDownBtn = labelWrap.createSpan({
            cls: 'codex-universal-move-btn',
            attr: { title: 'Move field down', 'aria-label': 'Move field down' },
        });
        obsidian.setIcon(moveDownBtn, 'chevron-down');
        moveDownBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.plugin.fieldTemplates.moveEntryDown(
                tpl.section, tpl.category, builtInKeys ?? [], 'universal', tpl.id,
            );
            if (this.rootContainer) this.renderDetail(this.rootContainer);
        });

        if (tpl.type === 'multi-select') {
            const raw = draft.universalFields[tpl.id];
            const selected: string[] = Array.isArray(raw) ? [...raw] : (typeof raw === 'string' && raw ? [raw] : []);

            const allOptions = [...tpl.options];
            if (tpl.folderSource) {
                const folder = this.app.vault.getAbstractFileByPath(tpl.folderSource);
                if (folder && 'children' in folder) {
                    for (const child of (folder as obsidian.TFolder).children) {
                        if (child instanceof obsidian.TFile && child.extension === 'md') {
                            if (!allOptions.includes(child.basename)) allOptions.push(child.basename);
                        }
                    }
                }
            }
            allOptions.sort((a, b) => a.localeCompare(b));

            const msContainer = row.createDiv('universal-multi-select');
            const pillsEl = msContainer.createDiv('universal-multi-pills');
            const inputRow = msContainer.createDiv('universal-multi-input-row');
            const msInput = inputRow.createEl('input', {
                cls: 'universal-multi-input',
                type: 'text',
                attr: { placeholder: tpl.placeholder || 'Type to add\u2026' },
            });
            // Issue #102 — portal dropdown to <body> so position:fixed coords are
            // viewport-relative even when an ancestor uses transform/contain.
            const msDropdown = activeDocument.body.createDiv('universal-multi-dropdown');
            msDropdown.setCssStyles({ display: 'none' });
            this._portaledDropdowns.push(msDropdown);

            const renderPills = () => {
                pillsEl.empty();
                for (const item of selected) {
                    const pill = pillsEl.createSpan({ cls: 'universal-multi-pill' });
                    pill.createSpan({ text: item });
                    const x = pill.createSpan({ cls: 'universal-multi-pill-x', text: '\u00d7' });
                    x.addEventListener('click', () => {
                        const idx = selected.indexOf(item);
                        if (idx >= 0) selected.splice(idx, 1);
                        draft.universalFields![tpl.id] = [...selected];
                        this.scheduleSave(draft);
                        renderPills();
                    });
                }
            };
            renderPills();

            const updateMsDropdown = (filter: string) => {
                msDropdown.empty();
                const lf = filter.toLowerCase();
                const available = allOptions.filter(o => !selected.includes(o) && o.toLowerCase().includes(lf));
                if (available.length === 0) { msDropdown.setCssStyles({ display: 'none' }); return; }
                msDropdown.setCssStyles({ display: '' });
                for (const opt of available) {
                    const item = msDropdown.createDiv({ cls: 'universal-multi-dropdown-item', text: opt });
                    item.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        selected.push(opt);
                        draft.universalFields![tpl.id] = [...selected];
                        this.scheduleSave(draft);
                        renderPills();
                        msInput.value = '';
                        updateMsDropdown('');
                    });
                }
            };

            msInput.addEventListener('focus', () => updateMsDropdown(msInput.value));
            msInput.addEventListener('input', () => updateMsDropdown(msInput.value));
            msInput.addEventListener('blur', () => { window.setTimeout(() => { msDropdown.setCssStyles({ display: 'none' }); }, 200); });
            msInput.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Enter' && msInput.value.trim()) {
                    e.preventDefault();
                    const val = msInput.value.trim();
                    if (!selected.includes(val)) {
                        selected.push(val);
                        draft.universalFields![tpl.id] = [...selected];
                        this.scheduleSave(draft);
                        renderPills();
                    }
                    msInput.value = '';
                    updateMsDropdown('');
                }
            });
        } else if (tpl.type === 'dropdown') {
            const select = row.createEl('select', { cls: 'location-field-input dropdown' });
            select.createEl('option', { text: tpl.placeholder || 'Select…', value: '' });

            const dropdownOptions = [...tpl.options];
            if (tpl.folderSource) {
                const folder = this.app.vault.getAbstractFileByPath(tpl.folderSource);
                if (folder && 'children' in folder) {
                    for (const child of (folder as obsidian.TFolder).children) {
                        if (child instanceof obsidian.TFile && child.extension === 'md') {
                            if (!dropdownOptions.includes(child.basename)) dropdownOptions.push(child.basename);
                        }
                    }
                }
                dropdownOptions.sort((a, b) => a.localeCompare(b));
            }

            for (const opt of dropdownOptions) {
                const el = select.createEl('option', { text: opt, value: opt });
                if (value === opt) el.selected = true;
            }
            if (value && !dropdownOptions.includes(value)) {
                const el = select.createEl('option', { text: value, value });
                el.selected = true;
            }
            select.addEventListener('change', () => {
                draft.universalFields![tpl.id] = select.value;
                this.scheduleSave(draft);
            });
        } else if (tpl.type === 'textarea') {
            const textarea = row.createEl('textarea', {
                cls: 'location-field-textarea',
                attr: { placeholder: tpl.placeholder, rows: '3' },
            });
            textarea.value = value;
            textarea.addEventListener('input', () => {
                draft.universalFields![tpl.id] = textarea.value;
                this.scheduleSave(draft);
            });
        } else if (tpl.type === 'checkbox') {
            const checked = rawValue === true || rawValue === 'true' || rawValue === 'yes';
            const wrap = row.createDiv('location-field-checkbox-wrap');
            const cb = wrap.createEl('input', {
                cls: 'location-field-checkbox',
                type: 'checkbox',
            });
            cb.checked = checked;
            cb.addEventListener('change', () => {
                draft.universalFields![tpl.id] = cb.checked;
                this.scheduleSave(draft);
            });
        } else {
            const input = row.createEl('input', {
                cls: 'location-field-input',
                type: 'text',
                attr: { placeholder: tpl.placeholder },
            });
            input.value = value;
            input.addEventListener('input', () => {
                draft.universalFields![tpl.id] = input.value;
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
        parentRow.createEl('label', { cls: 'location-field-label', text: 'Parent location' });
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
        if (isCollapsed) sectionBody.setCssStyles({ display: 'none' });

        sectionHeader.addEventListener('click', () => {
            if (this.collapsedSections.has(title)) {
                this.collapsedSections.delete(title);
                sectionBody.setCssStyles({ display: '' });
                obsidian.setIcon(chevron, 'chevron-down');
            } else {
                this.collapsedSections.add(title);
                sectionBody.setCssStyles({ display: 'none' });
                obsidian.setIcon(chevron, 'chevron-right');
            }
        });

        const renderAll = () => {
            sectionBody.empty();
            const custom = draft.custom || {};

            for (const [key, val] of Object.entries(custom)) {
                // Skip composite keys belonging to user-defined custom sections (#120)
                if (isCustomSectionKey(key)) continue;
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
            const addBtn = addRow.createEl('button', { cls: 'location-custom-add-btn', text: '+ add field' });
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

    // ── User-defined custom sections (#120) ────────────

    /**
     * Build the {@link CustomSectionsHost} used to interleave user-defined
     * custom sections with the built-in WORLD_CATEGORIES / LOCATION_CATEGORIES
     * in the detail form. Rebuilt per-render so it always reflects the latest
     * settings array reference.
     */
    private buildCustomSectionsHost(
        draft: WorldOrLocation,
        builtinSectionCount: number,
    ): CustomSectionsHost<WorldOrLocation> {
        if (!this.plugin.settings.locationCustomSections) {
            this.plugin.settings.locationCustomSections = [];
        }
        // Settings store the loose `{ fields: Array<string | { name; type?: string; ... }> }`
        // shape (comes from user JSON). CustomSectionsHost expects the
        // narrower `CustomSection[]` where `type` is a `CustomFieldType`
        // union. Cast at the boundary — the field renderers already treat
        // unknown `type` values as plain text via `normalizeField()`.
        const sections = this.plugin.settings.locationCustomSections as unknown as CustomSection[];
        return {
            app: this.app,
            draft,
            sections,
            builtinSectionCount,
            collapsedSections: this.collapsedSections,
            collapseKeyPrefix: 'location',
            cssPrefix: 'location',
            scheduleSave: (d) => this.scheduleSave(d),
            persistSections: () => { void this.plugin.saveSettings(); },
            requestRerender: () => {
                if (this.rootContainer) this.renderView(this.rootContainer);
            },
        };
    }

    // ── Side panels ────────────────────────────────────

    private renderWorldSidePanel(container: HTMLElement, world: StoryWorld): void {
        const locations = this.locationManager.getLocationsForWorld(world.name);
        const scenes = this.sceneManager.getAllScenes().filter(scene => !scene.inactive);

        // Location count
        const statsBox = container.createDiv('location-side-stats');
        statsBox.createEl('h4', { text: 'World summary' });
        const statGrid = statsBox.createDiv('location-stat-grid');
        this.renderStat(statGrid, String(locations.length), 'Locations');

        // Collect scenes across all locations in this world
        const locNames = new Set(locations.map(l => l.name.toLowerCase()));
        const worldScenes = scenes.filter(s => s.location && locNames.has(s.location.toLowerCase()));
        this.renderStat(statGrid, String(worldScenes.length), 'Scenes');

        // Location list
        if (locations.length > 0) {
            const listSection = container.createDiv('location-side-list');
            listSection.createEl('h4', { text: 'Locations in this world' });
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
        const scenes = this.sceneManager.queryService.getFilteredScenes(
            undefined,
            { field: 'sequence', direction: 'asc' }
        );
        const locLower = loc.name.toLowerCase();
        const locScenes = scenes.filter(s => s.location?.toLowerCase() === locLower);

        // Stats
        const statsBox = container.createDiv('location-side-stats');
        statsBox.createEl('h4', { text: 'Location info' });

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
                // Shared formatter handles string acts ("1.1", "Prologue")
                // and zero-pads pure-numeric values.
                const act = formatActChapterPrefix(scene.act, '??');
                const seq = scene.sequence !== undefined ? String(scene.sequence).padStart(2, '0') : '??';

                item.createSpan({ cls: 'scene-id', text: `[${act}-${seq}]` });
                item.createSpan({ cls: 'scene-title', text: ` ${scene.title}` });

                const statusCfg = resolveStatusCfg(scene.status || 'idea');
                const statusBadge = item.createSpan({
                    cls: 'scene-status-badge',
                    attr: { title: statusCfg.label },
                });
                obsidian.setIcon(statusBadge, statusCfg.icon);

                item.addEventListener('click', () => this.openScene(scene));
            }
        }

        // Characters that appear here (canonicalized via alias map)
        const charMgr = this.plugin.characterManager as CharacterManager | undefined;
        const manualAliases = this.plugin.settings?.characterAliases;
        const aliasMap = charMgr ? charMgr.buildAliasMap(manualAliases) : null;
        const resolveName = (name: string): string => {
            if (!aliasMap) return name;
            const exact = aliasMap.get(name.toLowerCase());
            if (exact) return exact;
            // Try individual words (e.g. "Konstapel Bark" → try "Bark")
            const words = name.split(/\s+/);
            for (const word of words) {
                const match = aliasMap.get(word.toLowerCase());
                if (match) return match;
            }
            return name;
        };

        const charsHere = new Map<string, number>();
        for (const scene of locScenes) {
            if (scene.pov) {
                const resolved = resolveName(scene.pov);
                charsHere.set(resolved, (charsHere.get(resolved) || 0) + 1);
            }
            if (scene.characters) {
                for (const c of scene.characters) {
                    const resolved = resolveName(c);
                    if (resolved !== resolveName(scene.pov || '')) {
                        charsHere.set(resolved, (charsHere.get(resolved) || 0) + 1);
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

    private renderReferencesPanel(container: HTMLElement, entityName: string): void {
        const index = this.plugin.linkScanner.buildEntityIndex();
        const refs = index.get(entityName.toLowerCase());
        if (!refs || refs.length === 0) return;

        const section = container.createDiv('location-references-panel');
        section.createEl('h3', { text: 'Referenced by' });

        const groups: Record<string, typeof refs> = {};
        for (const ref of refs) {
            const label = ref.type === 'codex' && ref.codexCategory
                ? ref.codexCategory
                : ref.type;
            if (!groups[label]) groups[label] = [];
            groups[label].push(ref);
        }

        for (const [groupLabel, groupRefs] of Object.entries(groups)) {
            const groupEl = section.createDiv('reference-group');
            groupEl.createEl('h4', { text: groupLabel.charAt(0).toUpperCase() + groupLabel.slice(1) });
            const list = groupEl.createEl('ul', { cls: 'reference-list' });
            for (const ref of groupRefs) {
                const li = list.createEl('li');
                const link = li.createEl('a', { text: ref.name, cls: 'reference-link' });
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.app.workspace.openLinkText(ref.filePath, '', false);
                });
            }
        }
    }

    private renderStat(parent: HTMLElement, value: string, label: string): void {
        const stat = parent.createDiv('location-stat-item');
        stat.createDiv({ cls: 'location-stat-value', text: value });
        stat.createDiv({ cls: 'location-stat-label', text: label });
    }

    // ── Auto-save ──────────────────────────────────────

    /**
     * Prompt the user for a custom location type name (e.g. "Planet",
     * "Star System"). Returns the trimmed name or null if cancelled.
     */
    private promptCustomLocationType(): Promise<string | null> {
        return new Promise(resolve => {
            let resolved = false;
            const modal = new Modal(this.app);
            modal.titleEl.setText('Add custom location type');
            let name = '';
            new Setting(modal.contentEl)
                .setName('Type name')
                .setDesc('E.g. Planet, star system, galaxy, dimension???')
                .addText((text: TextComponent) => {
                    text.setPlaceholder('Planet');
                    text.onChange((v: string) => (name = v));
                    window.setTimeout(() => text.inputEl?.focus(), 0);
                    text.inputEl?.addEventListener('keydown', (e: KeyboardEvent) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const trimmed = name.trim();
                            if (trimmed) {
                                resolved = true;
                                modal.close();
                                resolve(trimmed);
                            }
                        }
                    });
                });
            new Setting(modal.contentEl)
                .addButton((btn: ButtonComponent) => {
                    btn.setButtonText('Add').setCta().onClick(() => {
                        const trimmed = name.trim();
                        if (!trimmed) {
                            new Notice('Please enter a type name.');
                            return;
                        }
                        resolved = true;
                        modal.close();
                        resolve(trimmed);
                    });
                })
                .addButton((btn: ButtonComponent) => {
                    btn.setButtonText('Cancel').onClick(() => {
                        resolved = true;
                        modal.close();
                        resolve(null);
                    });
                });
            modal.onClose = () => {
                if (!resolved) resolve(null);
            };
            modal.open();
        });
    }

    private scheduleSave(draft: WorldOrLocation): void {
        if (this.autoSaveTimer) window.clearTimeout(this.autoSaveTimer);
        this.pendingSaveDraft = draft;
        this.autoSaveTimer = window.setTimeout(async () => {
            try {
                // Record undo snapshot
                const undoMgr = this.plugin.sceneManager?.undoManager;
                if (undoMgr && this.undoSnapshot) {
                    undoMgr.recordUpdate(
                        draft.filePath,
                        this.undoSnapshot as unknown as unknown as Record<string, unknown>,
                        draft as unknown as unknown as Record<string, unknown>,
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
                void e;
            }
        }, 600);
    }

    /** Immediately flush any pending debounced save so the manager's data is
     *  up-to-date before a full re-render. */
    private async flushSave(): Promise<void> {
        if (this.autoSaveTimer !== null) {
            window.clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        if (this.pendingSaveDraft) {
            const draft = this.pendingSaveDraft;
            this.pendingSaveDraft = null;
            try {
                const undoMgr = this.plugin.sceneManager?.undoManager;
                if (undoMgr && this.undoSnapshot) {
                    undoMgr.recordUpdate(
                        draft.filePath,
                        this.undoSnapshot as unknown as unknown as Record<string, unknown>,
                        draft as unknown as unknown as Record<string, unknown>,
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
            } catch (e) {
                void e;
            }
        }
    }

    /**
     * Check if a world/location name changed and offer to cascade-update all references.
     * Called on blur of the Name input field.
     */
    private checkLocationRename(draft: WorldOrLocation, inputEl: HTMLInputElement): void {
        const oldName = this.originalItemName;
        const newName = draft.name?.trim();
        if (!oldName || !newName || oldName === newName) return;

        const service = this.plugin.cascadeRename;
        const isWorld = this.originalItemType === 'world';

        const preview = isWorld
            ? service.previewWorldRename(oldName, newName)
            : service.previewLocationRename(oldName, newName);
        const total = preview.sceneCount + preview.locationCount + preview.characterLocationCount;
        if (total === 0) {
            this.originalItemName = newName;
            return;
        }

        const summary = service.buildSummary(preview);
        const modal = new RenameConfirmModal(
            this.app,
            isWorld ? 'world' : 'location',
            oldName,
            newName,
            preview,
            summary,
            async () => {
                if (isWorld) {
                    await service.cascadeWorldRename(oldName, newName);
                } else {
                    await service.cascadeLocationRename(oldName, newName);
                }
                this.originalItemName = newName;
                new Notice(`Updated ${total} reference${total !== 1 ? 's' : ''} from "${oldName}" to "${newName}"`);
            },
            () => {
                // User cancelled — revert the name back
                draft.name = oldName;
                inputEl.value = oldName;
                this.scheduleSave(draft);
            },
        );
        modal.open();
    }

    /** Immediately flush any pending debounced save */
    private async flushPendingSave(): Promise<void> {
        if (this.autoSaveTimer) {
            window.clearTimeout(this.autoSaveTimer);
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
                void e;
            }
            this.pendingSaveDraft = null;
        }
    }

    // ── Actions ────────────────────────────────────────

    private promptNewWorld(): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('New world');

        let name = '';
        new Setting(modal.contentEl)
            .setName('World name')
            .addText(text => {
                text.setPlaceholder('Enter world name\u2026')
                    .onChange(v => (name = v));
                window.setTimeout(() => text.inputEl.focus(), 50);
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
        modal.titleEl.setText('New location');

        let name = '';
        let selectedWorld = worldName || '';

        new Setting(modal.contentEl)
            .setName('Location name')
            .addText(text => {
                text.setPlaceholder('Enter location name\u2026')
                    .onChange(v => (name = v));
                window.setTimeout(() => text.inputEl.focus(), 50);
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
                btn.setButtonText('Delete').setClass('mod-warning').onClick(async () => {
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
            await leaf.openFile(file, { state: { mode: 'source', source: false } });
        }
    }

    private async openScene(scene: Scene): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(scene.filePath);
        if (file instanceof TFile) {
            // #224 — Reuse an existing tab that already shows this file instead of opening a duplicate.
            const existing = this.app.workspace.getLeavesOfType('markdown')
                .find(leaf => leaf.getViewState()?.state?.file === scene.filePath);
            if (existing) {
                this.app.workspace.setActiveLeaf(existing, { focus: true });
                return;
            }
            const leaf = this.app.workspace.getLeaf('tab');
            await leaf.openFile(file, { state: { mode: 'source', source: false } });
        } else {
            new Notice(`Could not find file: ${scene.filePath}`);
        }
    }

    // ── Refresh ────────────────────────────────────────

    /**
     * Navigate directly to a location/world detail view by file path.
     */
    async navigateToItem(filePath: string): Promise<void> {
        await this.plugin.reloadEntities();
        const item = this.locationManager.getItem(filePath);
        if (!item) {
            new Notice('Location not found in the active project.');
            return;
        }
        this.selectedItem = filePath;
        if (this.rootContainer) {
            this.renderView(this.rootContainer);
        }
    }

    async refresh(): Promise<void> {
        if (
            this.selectedItem &&
            Date.now() - this._lastSaveTime < LocationView.SAVE_REFRESH_GRACE_MS
        ) {
            await this.plugin.reloadEntities();
            return;
        }
        await this.plugin.reloadEntities();
        if (this.rootContainer) {
            this.renderView(this.rootContainer);
        }
    }

    // ── Image gallery carousel ─────────────────────────

    private renderGallery(container: HTMLElement, draft: WorldOrLocation): void {
        const MAX_GALLERY = 10;
        const SECTION_KEY = '__Gallery';

        const wrapper = container.createDiv('character-gallery');

        const gallery = draft.gallery ?? [];

        // Collapsible header with add button
        const isCollapsed = this.collapsedSections.has(SECTION_KEY);
        const header = wrapper.createDiv('character-gallery-header');
        const chevron = header.createSpan('location-section-chevron');
        obsidian.setIcon(chevron, isCollapsed ? 'chevron-right' : 'chevron-down');
        header.createEl('h4', { text: 'Gallery' });

        // Add button in header
        if (gallery.length < MAX_GALLERY) {
            const addBtn = header.createEl('button', {
                cls: 'character-section-add-field-btn',
                attr: { title: `Add image (${gallery.length}/${MAX_GALLERY})`, 'aria-label': 'Add gallery image' }
            });
            obsidian.setIcon(addBtn, 'plus');
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.pickImage().then(async (picked) => {
                    if (picked && picked !== '') {
                        gallery.push({ path: picked, caption: '' });
                        draft.gallery = [...gallery];
                        if (draft.type === 'world') {
                            await this.locationManager.saveWorld(draft as StoryWorld);
                        } else {
                            await this.locationManager.saveLocation(draft as StoryLocation);
                        }
                        // Re-render entire gallery section
                        wrapper.empty();
                        container.removeChild(wrapper);
                        this.renderGallery(container, draft);
                        // Move gallery before side panel stats
                        const statsPanel = container.querySelector('.location-side-stats');
                        if (statsPanel) {
                            const galleryEl = container.querySelector('.character-gallery');
                            if (galleryEl) container.insertBefore(galleryEl, statsPanel);
                        }
                    }
                });
            });
        }

        const body = wrapper.createDiv('character-gallery-body');
        if (isCollapsed) body.setCssStyles({ display: 'none' });

        header.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('.character-section-add-field-btn')) return;
            if (this.collapsedSections.has(SECTION_KEY)) {
                this.collapsedSections.delete(SECTION_KEY);
                body.setCssStyles({ display: '' });
                obsidian.setIcon(chevron, 'chevron-down');
            } else {
                this.collapsedSections.add(SECTION_KEY);
                body.setCssStyles({ display: 'none' });
                obsidian.setIcon(chevron, 'chevron-right');
            }
        });

        // Active (large) image display
        const viewer = body.createDiv('character-gallery-viewer');
        const captionEl = body.createDiv('character-gallery-caption');
        let activeIndex = gallery.length > 0 ? 0 : -1;

        const renderViewer = () => {
            viewer.empty();
            captionEl.empty();
            if (activeIndex >= 0 && activeIndex < gallery.length) {
                const entry = gallery[activeIndex];
                const src = resolveImagePath(this.app, entry.path);
                if (src) {
                    const img = viewer.createEl('img', {
                        cls: 'character-gallery-img',
                        attr: { src, alt: entry.caption || 'Gallery image' }
                    });
                    img.setCssStyles({ cursor: 'pointer' });
                    img.addEventListener('click', () => {
                        const galleryWidth = wrapper.offsetWidth;
                        this.openGalleryLightbox(gallery, activeIndex, galleryWidth);
                    });
                    img.onerror = () => {
                        img.remove();
                        const ph = viewer.createDiv('character-gallery-placeholder');
                        obsidian.setIcon(ph, 'image-off');
                    };
                } else {
                    const ph = viewer.createDiv('character-gallery-placeholder');
                    obsidian.setIcon(ph, 'image-off');
                }

                // Editable caption
                const captionInput = captionEl.createEl('input', {
                    cls: 'character-gallery-caption-input',
                    attr: { type: 'text', placeholder: 'Add caption\u2026', value: entry.caption || '' }
                });
                const idx = activeIndex;
                captionInput.addEventListener('input', () => {
                    gallery[idx].caption = captionInput.value;
                    draft.gallery = gallery.length ? [...gallery] : undefined;
                    this.scheduleSave(draft);
                });

                // Remove button for active image
                const removeBtn = captionEl.createEl('button', {
                    cls: 'character-gallery-remove-btn',
                    attr: { title: 'Remove this image' }
                });
                obsidian.setIcon(removeBtn, 'x');
                removeBtn.addEventListener('click', () => {
                    gallery.splice(idx, 1);
                    draft.gallery = gallery.length ? [...gallery] : undefined;
                    this.scheduleSave(draft);
                    activeIndex = gallery.length > 0 ? Math.min(idx, gallery.length - 1) : -1;
                    renderViewer();
                    renderThumbs();
                });
            } else {
                const ph = viewer.createDiv('character-gallery-empty');
                ph.textContent = 'No images yet';
            }
        };

        // Navigation row: prev | thumbs | next
        const nav = body.createDiv('character-gallery-nav');
        const prevBtn = nav.createEl('button', { cls: 'character-gallery-arrow', attr: { title: 'Previous' } });
        obsidian.setIcon(prevBtn, 'chevron-left');
        prevBtn.addEventListener('click', () => {
            if (gallery.length === 0) return;
            activeIndex = (activeIndex - 1 + gallery.length) % gallery.length;
            renderViewer();
            renderThumbs();
        });

        const thumbStrip = nav.createDiv('character-gallery-thumbs');

        const nextBtn = nav.createEl('button', { cls: 'character-gallery-arrow', attr: { title: 'Next' } });
        obsidian.setIcon(nextBtn, 'chevron-right');
        nextBtn.addEventListener('click', () => {
            if (gallery.length === 0) return;
            activeIndex = (activeIndex + 1) % gallery.length;
            renderViewer();
            renderThumbs();
        });

        // Thumbnail strip
        const renderThumbs = () => {
            thumbStrip.empty();
            for (let i = 0; i < gallery.length; i++) {
                const thumb = thumbStrip.createDiv({
                    cls: `character-gallery-thumb${i === activeIndex ? ' active' : ''}`
                });
                const src = resolveImagePath(this.app, gallery[i].path);
                if (src) {
                    const timg = thumb.createEl('img', { attr: { src } });
                    timg.onerror = () => {
                        timg.remove();
                        obsidian.setIcon(thumb, 'image-off');
                    };
                } else {
                    obsidian.setIcon(thumb, 'image-off');
                }
                const idx = i;
                thumb.addEventListener('click', () => {
                    activeIndex = idx;
                    renderViewer();
                    renderThumbs();
                });
            }
        };

        renderViewer();
        renderThumbs();
    }

    // ── Gallery lightbox ───────────────────────────────

    /**
     * Open a floating, draggable, resizable lightbox for gallery images.
     * Sized at 2× the gallery panel width. Has prev/next navigation.
     */
    private openGalleryLightbox(
        gallery: Array<{ path: string; caption: string }>,
        startIndex: number,
        galleryWidth: number
    ): void {
        // Close any existing lightbox
        activeDocument.querySelector('.gallery-lightbox-window')?.remove();

        let currentIndex = startIndex;
        const winWidth = Math.min(Math.round(galleryWidth * 2), window.innerWidth - 40);
        const winHeight = Math.round(winWidth * 3 / 4) + 36 + 28; // 4:3 content + titlebar + caption

        // Floating window directly on body (no overlay — non-blocking)
        const win = activeDocument.body.createDiv('gallery-lightbox-window');
        win.setCssStyles({
            width: `${winWidth}px`,
            height: `${winHeight}px`,
        });

        // Titlebar (draggable)
        const titlebar = win.createDiv('gallery-lightbox-titlebar');
        const titleText = titlebar.createSpan({ cls: 'gallery-lightbox-title' });
        const closeBtn = titlebar.createEl('button', { cls: 'gallery-lightbox-close', attr: { title: 'Close' } });
        obsidian.setIcon(closeBtn, 'x');
        closeBtn.addEventListener('click', () => { cleanup(); win.remove(); });

        // Content area with nav + image
        const contentRow = win.createDiv('gallery-lightbox-content-row');

        const prevBtn = contentRow.createEl('button', { cls: 'gallery-lightbox-nav-btn', attr: { title: 'Previous' } });
        obsidian.setIcon(prevBtn, 'chevron-left');
        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + gallery.length) % gallery.length;
            renderContent();
        });

        const imgContainer = contentRow.createDiv('gallery-lightbox-content');

        const nextBtn = contentRow.createEl('button', { cls: 'gallery-lightbox-nav-btn', attr: { title: 'Next' } });
        obsidian.setIcon(nextBtn, 'chevron-right');
        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % gallery.length;
            renderContent();
        });

        // Caption
        const captionEl = win.createDiv('gallery-lightbox-caption');

        // Resize handle
        const resizeHandle = win.createDiv('gallery-lightbox-resize-handle');

        const zoomLevels = new Map<number, number>();
        const getZoom = () => zoomLevels.get(currentIndex) ?? 1;
        const setZoom = (z: number) => { zoomLevels.set(currentIndex, z); };
        const renderContent = () => {
            const entry = gallery[currentIndex];
            const src = resolveImagePath(this.app, entry.path);
            titleText.textContent = entry.caption || `Image ${currentIndex + 1} of ${gallery.length}`;
            imgContainer.empty();
            if (src) {
                const img = imgContainer.createEl('img', { attr: { src, alt: entry.caption || 'Gallery image' } });
                img.setCssStyles({ transformOrigin: 'center center' });
                const z = getZoom();
                if (z !== 1) img.setCssStyles({ transform: `scale(${z})` });
            }
            captionEl.textContent = entry.caption || '';
            captionEl.setCssStyles({ display: entry.caption ? '' : 'none' });
            // Hide nav buttons if only one image
            prevBtn.setCssStyles({ display: gallery.length > 1 ? '' : 'none' });
            nextBtn.setCssStyles({ display: gallery.length > 1 ? '' : 'none' });
        };
        renderContent();

        // ── Scroll / pinch to zoom ──
        imgContainer.addEventListener('wheel', (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Math.max(0.5, Math.min(5, getZoom() + delta));
            setZoom(newZoom);
            const img = imgContainer.querySelector('img');
            if (img) img.setCssStyles({ transform: `scale(${newZoom})` });
        }, { passive: false });

        // Touch pinch-to-zoom
        let pinchStartDist = 0;
        let pinchStartZoom = 1;
        imgContainer.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchStartDist = Math.hypot(dx, dy);
                pinchStartZoom = getZoom();
            }
        }, { passive: true });
        imgContainer.addEventListener('touchmove', (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                const scale = dist / pinchStartDist;
                const newZoom = Math.max(0.5, Math.min(5, pinchStartZoom * scale));
                setZoom(newZoom);
                const img = imgContainer.querySelector('img');
                if (img) img.setCssStyles({ transform: `scale(${newZoom})` });
            }
        }, { passive: false });

        // ── Drag logic ──
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        titlebar.addEventListener('pointerdown', (e: PointerEvent) => {
            if ((e.target as HTMLElement).closest('.gallery-lightbox-close')) return;
            isDragging = true;
            const rect = win.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            win.setCssStyles({
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                transform: 'none',
            });
            titlebar.setPointerCapture(e.pointerId);
            e.preventDefault();
        });
        titlebar.addEventListener('pointermove', (e: PointerEvent) => {
            if (!isDragging) return;
            win.setCssStyles({
                left: `${e.clientX - dragOffsetX}px`,
                top: `${e.clientY - dragOffsetY}px`,
            });
        });
        titlebar.addEventListener('pointerup', () => { isDragging = false; });
        titlebar.addEventListener('lostpointercapture', () => { isDragging = false; });

        // ── Resize logic ──
        let isResizing = false;
        let resizeStartX = 0;
        let resizeStartY = 0;
        let startW = 0;
        let startH = 0;

        resizeHandle.addEventListener('pointerdown', (e: PointerEvent) => {
            isResizing = true;
            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            startW = win.offsetWidth;
            startH = win.offsetHeight;
            resizeHandle.setPointerCapture(e.pointerId);
            e.preventDefault();
            e.stopPropagation();
        });
        resizeHandle.addEventListener('pointermove', (e: PointerEvent) => {
            if (!isResizing) return;
            const newW = Math.max(200, startW + (e.clientX - resizeStartX));
            const newH = Math.max(150, startH + (e.clientY - resizeStartY));
            win.setCssStyles({
                width: `${newW}px`,
                height: `${newH}px`,
            });
        });
        resizeHandle.addEventListener('pointerup', () => { isResizing = false; });
        resizeHandle.addEventListener('lostpointercapture', () => { isResizing = false; });

        // Close on Escape
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                cleanup();
                win.remove();
            }
        };
        activeDocument.addEventListener('keydown', onKey);

        const cleanup = () => {
            activeDocument.removeEventListener('keydown', onKey);
        };
    }

    /**
     * Open a modal to pick/import an image file.
     * Returns the vault-relative path, empty string to clear, or undefined if cancelled.
     */
    private pickImage(currentImage?: string): Promise<string | undefined> {
        const sceneFolder = this.sceneManager.getSceneFolder();
        return pickImageModal(this.app, sceneFolder, currentImage);
    }
}
/* eslint-enable @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unused-vars -- end of file-wide suppression block opened at line 1 */
