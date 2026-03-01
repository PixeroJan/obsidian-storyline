import { Plugin, TFile, WorkspaceLeaf, Notice, Modal, Setting } from 'obsidian';
import { SceneCardsSettings, SceneCardsSettingTab, DEFAULT_SETTINGS } from './settings';
import { SceneManager } from './services/SceneManager';
import {
    BOARD_VIEW_TYPE,
    TIMELINE_VIEW_TYPE,
    STORYLINE_VIEW_TYPE,
    CHARACTER_VIEW_TYPE,
    STATS_VIEW_TYPE,
    PLOTGRID_VIEW_TYPE,
    LOCATION_VIEW_TYPE,
    HELP_VIEW_TYPE,
} from './constants';
import { PlotgridView } from './views/PlotgridView';
import type { PlotGridData } from './models/PlotGridData';
import { BoardView } from './views/BoardView';
import { TimelineView } from './views/TimelineView';
import { StorylineView } from './views/StorylineView';
import { CharacterView } from './views/CharacterView';
import { StatsView } from './views/StatsView';
import { LocationView } from './views/LocationView';
import { HelpView } from './views/HelpView';
import { LocationManager } from './services/LocationManager';
import { CharacterManager } from './services/CharacterManager';
import { QuickAddModal } from './components/QuickAddModal';
import { ExportModal } from './components/ExportModal';
import { WritingTracker } from './services/WritingTracker';
import { SnapshotManager } from './services/SnapshotManager';
import { LinkScanner } from './services/LinkScanner';

/**
 * StoryLine Plugin for Obsidian
 *
 * Transforms your vault into a powerful book planning tool.
 */
export default class SceneCardsPlugin extends Plugin {
    settings: SceneCardsSettings = DEFAULT_SETTINGS;
    sceneManager: SceneManager;
    /** Set to true once System/ migration is confirmed — guards saveSettings stripping */
    private _systemMigrationDone = false;
    locationManager: LocationManager;
    characterManager: CharacterManager;
    writingTracker: WritingTracker = new WritingTracker();
    snapshotManager: SnapshotManager;
    linkScanner: LinkScanner;
    /** The leaf currently hosting a StoryLine view */
    storyLeaf: WorkspaceLeaf | null = null;
    /** Removes native browser tooltips (`title`) inside StoryLine UI */
    private nativeTooltipObserver: MutationObserver | null = null;

    async onload(): Promise<void> {
        await this.loadSettings();
        this.applyImageSizingVariables();

        this.sceneManager = new SceneManager(this.app, this);
        this.locationManager = new LocationManager(this.app);
        this.characterManager = new CharacterManager(this.app);
        this.snapshotManager = new SnapshotManager(this.app);
        this.linkScanner = new LinkScanner(this.characterManager, this.locationManager);

        // Wire up undo/redo to refresh views + re-index
        this.sceneManager.undoManager.onAfterUndoRedo = async () => {
            await this.sceneManager.initialize();
            this.refreshOpenViews();
        };

        // Best-effort: register file extensions so exported files are visible in the Vault.
        // We check several possible locations for an existing registration and safely
        // call a registration API if available. This uses `any` casts because the
        // API surface varies between Obsidian versions.
        for (const ext of ['json', 'docx']) {
            try {
                const pluginAny: any = this;
                let alreadyRegistered = false;

                const regOnPlugin = pluginAny.registeredExtensions;
                const regOnVault = (this.app as any)?.vault?.registeredExtensions;
                if (Array.isArray(regOnPlugin)) alreadyRegistered = regOnPlugin.includes(ext);
                if (!alreadyRegistered && Array.isArray(regOnVault)) alreadyRegistered = regOnVault.includes(ext);

                if (!alreadyRegistered) {
                    if (typeof pluginAny.registerExtensions === 'function') {
                        pluginAny.registerExtensions([ext]);
                    } else if (typeof (this.app as any).registerExtensions === 'function') {
                        (this.app as any).registerExtensions([ext]);
                    }
                }
            } catch (e) {
                // non-fatal
                // eslint-disable-next-line no-console
                console.error(`StoryLine: failed to register .${ext} extension`, e);
            }
        }

        // Register views
        this.registerView(BOARD_VIEW_TYPE, (leaf) =>
            new BoardView(leaf, this, this.sceneManager)
        );
        this.registerView(PLOTGRID_VIEW_TYPE, (leaf) =>
            new PlotgridView(leaf, this)
        );
        this.registerView(TIMELINE_VIEW_TYPE, (leaf) =>
            new TimelineView(leaf, this, this.sceneManager)
        );
        this.registerView(STORYLINE_VIEW_TYPE, (leaf) =>
            new StorylineView(leaf, this, this.sceneManager)
        );
        this.registerView(CHARACTER_VIEW_TYPE, (leaf) =>
            new CharacterView(leaf, this, this.sceneManager)
        );
        this.registerView(STATS_VIEW_TYPE, (leaf) =>
            new StatsView(leaf, this, this.sceneManager)
        );
        this.registerView(LOCATION_VIEW_TYPE, (leaf) =>
            new LocationView(leaf, this, this.sceneManager)
        );
        this.registerView(HELP_VIEW_TYPE, (leaf) =>
            new HelpView(leaf, this)
        );

        // Wait for the workspace layout to be ready, then bootstrap projects
        this.app.workspace.onLayoutReady(async () => {
            try {
            // Apply frontmatter visibility setting
            if (this.settings.hideFrontmatter) {
                (this.app.vault as any).setConfig?.('propertiesInDocument', 'hidden');
            }

            await this.bootstrapProjects();
            // Migrate legacy data from data.json into project frontmatter
            await this.migrateProjectDataFromSettings();
            // Load per-project data from System/ files (tagColors, aliases, etc.)
            await this.loadProjectSystemData();
            // Load corkboard layout from System/board.json
            await this.sceneManager.loadCorkboardPositions();
            // Load locations and characters for the active project
            try {
                const locFolder = this.sceneManager.getLocationFolder();
                if (locFolder) await this.locationManager.loadAll(locFolder);
                const charFolder = this.sceneManager.getCharacterFolder();
                if (charFolder) await this.characterManager.loadCharacters(charFolder);
            } catch { /* not set yet */ }
            // Scan scene bodies for wikilinks after entities are loaded
            this.linkScanner.rebuildLookups(this.settings.characterAliases);
            this.linkScanner.scanAll(this.sceneManager.getAllScenes());
            // Ensure a plotgrid file exists for the active project (or default location)", "oldString": "        this.app.workspace.onLayoutReady(async () => {\n            await this.bootstrapProjects();\n            // Ensure a plotgrid file exists for the active project (or default location)
            // (removed — createPlotGridIfMissing was causing race-condition overwrites)

            // Initialize writing tracker from per-project System/stats.json
            const stats = this.sceneManager.getStatistics();
            this.writingTracker.startSession(stats.totalWords);

            // Refresh all open views now that the project is set — this ensures
            // PlotGrid and other views that opened before bootstrapProjects reload
            // their data from the correct project folder.
            this.refreshOpenViews();
            } catch (startupErr) {
                console.error('[StoryLine] Startup error:', startupErr);
            }
        });

        // Ribbon icons — open project chooser (load/create) so users can switch projects
        this.addRibbonIcon('layout-grid', 'StoryLine: Projects', () => {
            const modal = new ProjectSelectModal(this.app, this);
            modal.open();
        });

        // Commands
        this.addCommand({
            id: 'open-board-view',
            name: 'Open Board View',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: '1' }],
            callback: () => this.activateView(BOARD_VIEW_TYPE),
        });

        this.addCommand({
            id: 'open-timeline-view',
            name: 'Open Timeline View',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: '2' }],
            callback: () => this.activateView(TIMELINE_VIEW_TYPE),
        });

        this.addCommand({
            id: 'open-plotgrid-view',
            name: 'Open Plotgrid View',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: '3' }],
            callback: () => this.activateView(PLOTGRID_VIEW_TYPE),
        });

        this.addCommand({
            id: 'open-storyline-view',
            name: 'Open Storyline View',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: '4' }],
            callback: () => this.activateView(STORYLINE_VIEW_TYPE),
        });

        this.addCommand({
            id: 'open-character-view',
            name: 'Open Character View',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: '5' }],
            callback: () => this.activateView(CHARACTER_VIEW_TYPE),
        });

        this.addCommand({
            id: 'open-stats-view',
            name: 'Open Statistics Dashboard',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: '6' }],
            callback: () => this.activateView(STATS_VIEW_TYPE),
        });

        this.addCommand({
            id: 'open-location-view',
            name: 'Open Location View',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: '7' }],
            callback: () => this.activateView(LOCATION_VIEW_TYPE),
        });

        this.addCommand({
            id: 'create-new-scene',
            name: 'Create New Scene',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'n' }],
            callback: () => this.openQuickAdd(),
        });

        this.addCommand({
            id: 'create-new-project',
            name: 'Create New StoryLine Project',
            callback: () => this.openNewProjectModal(),
        });

        this.addCommand({
            id: 'fork-project',
            name: 'Fork Current StoryLine Project',
            callback: () => this.openForkProjectModal(),
        });

        this.addCommand({
            id: 'undo',
            name: 'Undo Last Scene Change',
            callback: async () => {
                await this.sceneManager.undoManager.undo();
            },
        });

        this.addCommand({
            id: 'redo',
            name: 'Redo Last Scene Change',
            callback: async () => {
                await this.sceneManager.undoManager.redo();
            },
        });

        this.addCommand({
            id: 'export-project',
            name: 'Export Project',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'e' }],
            callback: () => {
                new ExportModal(this).open();
            },
        });

        this.addCommand({
            id: 'open-help',
            name: 'Open Help',
            callback: () => this.openHelp(),
        });

        // Settings tab
        this.addSettingTab(new SceneCardsSettingTab(this.app, this));

        // Suppress native (browser) title tooltips inside StoryLine UI.
        this.enableNativeTooltipSuppression();

        // File watchers for reactive updates
        // We debounce the async refresh pipeline so multiple rapid edits
        // only trigger one re-render after the index has finished updating.
        const debouncedRefresh = this.debounce(() => this.refreshOpenViews(), 500);

        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (file instanceof TFile) {
                    this.sceneManager.handleFileChange(file).then(() => debouncedRefresh());
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('delete', (file) => {
                if (file instanceof TFile) {
                    this.sceneManager.handleFileDelete(file.path);
                    debouncedRefresh();
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('rename', (file, oldPath) => {
                if (file instanceof TFile) {
                    this.sceneManager.handleFileRename(file, oldPath).then(async () => {
                        // Update any PlotGrid cells that reference the old path
                        await this.updatePlotGridLinkedSceneIds(oldPath, file.path);
                        debouncedRefresh();
                    });
                }
            })
        );
    }

    onunload(): void {
        // Flush writing session into daily history and persist to System/stats.json
        try {
            const stats = this.sceneManager.getStatistics();
            this.writingTracker.flushSession(stats.totalWords);
            this.saveProjectSystemData();
        } catch { /* best effort */ }

        if (this.nativeTooltipObserver) {
            this.nativeTooltipObserver.disconnect();
            this.nativeTooltipObserver = null;
        }
    }

    private enableNativeTooltipSuppression(): void {
        const isInStoryLineUi = (el: HTMLElement): boolean => {
            let node: HTMLElement | null = el;
            while (node) {
                for (const cls of Array.from(node.classList)) {
                    if (cls.startsWith('story-line-')) return true;
                }
                node = node.parentElement;
            }
            return false;
        };

        const stripTitles = (root: ParentNode): void => {
            if (!(root instanceof HTMLElement || root instanceof Document || root instanceof DocumentFragment)) return;
            const candidates = (root as ParentNode).querySelectorAll?.('[title]') || [];
            for (const node of Array.from(candidates)) {
                if (!(node instanceof HTMLElement)) continue;
                if (isInStoryLineUi(node)) {
                    node.removeAttribute('title');
                }
            }
            if (root instanceof HTMLElement && root.hasAttribute('title') && isInStoryLineUi(root)) {
                root.removeAttribute('title');
            }
        };

        stripTitles(document.body);

        this.nativeTooltipObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target instanceof HTMLElement && target.hasAttribute('title') && isInStoryLineUi(target)) {
                        target.removeAttribute('title');
                    }
                    continue;
                }
                for (const node of Array.from(mutation.addedNodes)) {
                    if (node instanceof HTMLElement) stripTitles(node);
                }
            }
        });

        this.nativeTooltipObserver.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['title'],
        });
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    /** Per-project field keys that live in System/ files, not data.json */
    private static readonly PROJECT_DATA_KEYS: string[] = [
        'tagColors', 'tagTypeOverrides', 'characterAliases', 'ignoredCharacters',
        'writingTrackerData',
        // Legacy plotgrid data stored directly in data.json (before file-based storage)
        'rows', 'columns', 'cells', 'zoom', 'stickyHeaders',
        // Legacy / per-project keys that don't belong in global settings
        'filterPresets',
    ];

    async saveSettings(): Promise<void> {
        this.applyImageSizingVariables();
        const toSave: Record<string, any> = { ...this.settings };
        if (this._systemMigrationDone) {
            // Strip per-project data from the global data.json payload
            for (const key of SceneCardsPlugin.PROJECT_DATA_KEYS) {
                delete toSave[key];
            }
        }
        await this.saveData(toSave);
        // Persist per-project data to System/ files (only after migration)
        if (this._systemMigrationDone) {
            await this.saveProjectSystemData();
        }
    }

    private applyImageSizingVariables(): void {
        const root = document.documentElement;
        root.style.setProperty('--sl-character-card-portrait-size', `${this.settings.characterCardPortraitSize}px`);
        root.style.setProperty('--sl-character-detail-portrait-size', `${this.settings.characterDetailPortraitSize}px`);
        root.style.setProperty('--sl-location-tree-thumb-size', `${this.settings.locationTreeThumbSize}px`);
        root.style.setProperty('--sl-location-detail-portrait-width', `${this.settings.locationDetailPortraitWidth}px`);
        root.style.setProperty('--sl-location-detail-portrait-height', `${this.settings.locationDetailPortraitHeight}px`);
    }

    /**
     * Scan all plotgrid cells for character, location, and tag mentions.
     * Returns a map of canonical-character-name → set of row labels where
     * that character is mentioned, plus similar maps for locations and tags.
     *
     * Used by CharacterView to augment per-character scene counts with
     * plotgrid references.
     */
    async scanPlotGridCells(): Promise<{
        characters: Map<string, Set<string>>;
        locations: Map<string, Set<string>>;
        tags: Map<string, Set<string>>;
    }> {
        const characters = new Map<string, Set<string>>();
        const locations = new Map<string, Set<string>>();
        const tags = new Map<string, Set<string>>();

        const data = await this.loadPlotGrid();
        if (!data || !data.cells) return { characters, locations, tags };

        this.linkScanner.rebuildLookups(this.settings.characterAliases);

        // Build alias map for dedup
        const aliasMap = this.characterManager.buildAliasMap(this.settings.characterAliases);

        for (const [key, cell] of Object.entries(data.cells)) {
            if (!cell?.content?.trim()) continue;

            // Determine row label for context
            const rowId = key.split('-').slice(0, 2).join('-'); // row id is first part of key
            const row = data.rows.find(r => key.startsWith(r.id + '-'));
            const rowLabel = row?.label || rowId;

            const result = this.linkScanner.scanText(cell.content);

            // Characters (deduplicated via alias map)
            for (const name of result.characters) {
                const canonical = aliasMap.get(name.toLowerCase()) || name;
                const cKey = canonical.toLowerCase();
                if (!characters.has(cKey)) characters.set(cKey, new Set());
                characters.get(cKey)!.add(rowLabel);
            }

            // Locations (deduplicated)
            for (const name of result.locations) {
                const lKey = name.toLowerCase();
                if (!locations.has(lKey)) locations.set(lKey, new Set());
                locations.get(lKey)!.add(rowLabel);
            }

            // Tags
            for (const tag of result.tags) {
                const tKey = tag.toLowerCase();
                if (!tags.has(tKey)) tags.set(tKey, new Set());
                tags.get(tKey)!.add(rowLabel);
            }
        }

        return { characters, locations, tags };
    }

    // ────────────────────────────────────
    //  Project System folder helpers
    // ────────────────────────────────────

    /**
     * Return the base folder for the active project (parent of /Scenes).
     * Falls back to the configured StoryLine root when no project is active.
     */
    getProjectBaseFolder(): string {
        const project = this.sceneManager?.activeProject ?? null;
        if (project) {
            return project.sceneFolder.replace(/\\/g, '/').replace(/\/Scenes\/?$/, '');
        }
        return this.settings.storyLineRoot.replace(/\\/g, '/');
    }

    /**
     * Return the System/ subfolder path for the active project.
     */
    getProjectSystemFolder(): string {
        return `${this.getProjectBaseFolder()}/System`;
    }

    /**
     * Read a JSON file from the current project's System/ folder.
     * Returns an empty object if the file doesn't exist or is invalid.
     */
    private async readSystemJson(filename: string): Promise<Record<string, any>> {
        try {
            const adapter = this.app.vault.adapter;
            const filePath = `${this.getProjectSystemFolder()}/${filename}`;
            if (!await adapter.exists(filePath)) return {};
            const txt = await adapter.read(filePath);
            return JSON.parse(txt);
        } catch {
            return {};
        }
    }

    /**
     * Write a JSON object to a file in the current project's System/ folder.
     * Creates the System/ folder if it doesn't exist.
     */
    private async writeSystemJson(filename: string, data: Record<string, any>): Promise<void> {
        try {
            const adapter = this.app.vault.adapter;
            const systemFolder = this.getProjectSystemFolder();
            if (!await adapter.exists(systemFolder)) {
                await this.app.vault.createFolder(systemFolder);
            }
            await adapter.write(`${systemFolder}/${filename}`, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error(`[StoryLine] writeSystemJson(${filename}):`, e);
        }
    }

    /**
     * Load per-project data from System/ files into the in-memory settings.
     * Called after a project is loaded or switched.
     */
    async loadProjectSystemData(): Promise<void> {
        const plotlines = await this.readSystemJson('plotlines.json');
        const characters = await this.readSystemJson('characters.json');
        const stats = await this.readSystemJson('stats.json');

        // Overlay per-project data onto settings (used as working copy)
        if (plotlines.tagColors && typeof plotlines.tagColors === 'object') {
            this.settings.tagColors = plotlines.tagColors;
        } else {
            this.settings.tagColors = {};
        }
        if (plotlines.tagTypeOverrides && typeof plotlines.tagTypeOverrides === 'object') {
            this.settings.tagTypeOverrides = plotlines.tagTypeOverrides;
        } else {
            this.settings.tagTypeOverrides = {};
        }

        if (characters.characterAliases && typeof characters.characterAliases === 'object') {
            this.settings.characterAliases = characters.characterAliases;
        } else {
            this.settings.characterAliases = {};
        }
        if (Array.isArray(characters.ignoredCharacters)) {
            this.settings.ignoredCharacters = characters.ignoredCharacters;
        } else {
            this.settings.ignoredCharacters = [];
        }

        // Writing tracker data
        if (stats.writingTrackerData) {
            this.writingTracker.importData(stats.writingTrackerData);
        }

        // System files are now the source of truth
        this._systemMigrationDone = true;
    }

    /**
     * Save per-project data from in-memory settings to System/ files.
     * Called when settings are saved or before switching projects.
     */
    async saveProjectSystemData(): Promise<void> {
        if (!this.sceneManager?.activeProject) return;

        await this.writeSystemJson('plotlines.json', {
            tagColors: this.settings.tagColors || {},
            tagTypeOverrides: this.settings.tagTypeOverrides || {},
        });

        await this.writeSystemJson('characters.json', {
            characterAliases: this.settings.characterAliases || {},
            ignoredCharacters: this.settings.ignoredCharacters || [],
        });

        // Save writing tracker data
        await this.writeSystemJson('stats.json', {
            writingTrackerData: this.writingTracker.exportData(),
        });
    }

    /**
     * Save the plot grid data to the System/ folder under the active project.
     * This centralizes persistence and avoids views overwriting settings.
     */
    async savePlotGrid(data: PlotGridData): Promise<void> {
        try {
            const folder = this.getProjectSystemFolder();
            const filePath = `${folder}/plotgrid.json`;
            const adapter = this.app.vault.adapter;

            // Guard: never overwrite a file that has content with empty data
            const isEmpty = !data.rows || data.rows.length === 0;
            if (isEmpty && await adapter.exists(filePath)) {
                try {
                    const existing = await adapter.read(filePath);
                    const parsed = JSON.parse(existing);
                    if (parsed.rows && parsed.rows.length > 0) {
                        console.log('[StoryLine] savePlotGrid: BLOCKED overwriting non-empty plotgrid with empty data');
                        return;
                    }
                } catch { /* file unreadable or invalid JSON — allow overwrite */ }
            }

            const contents = JSON.stringify(data, null, 2);

            // ensure folder exists
            if (!await adapter.exists(folder)) {
                await this.app.vault.createFolder(folder);
            }

            await adapter.write(filePath, contents);
        } catch (e) {
            new Notice('StoryLine: failed to save PlotGrid to vault: ' + String(e));
        }
    }

    /**
     * Load the plot grid data from the System/ folder.
     */
    async loadPlotGrid(): Promise<PlotGridData | null> {
        try {
            const folder = this.getProjectSystemFolder();
            const adapter = this.app.vault.adapter;

            // ── Import-file mechanism ──────────────────────────────────
            // If a plotgrid-import.json exists in the project root, adopt it:
            // persist as the real plotgrid.json in System/ and delete the import file.
            // This lets external scripts (gen_plotgrid.ps1) write data without
            // Obsidian overwriting it before the plugin can load it.
            const baseFolder = this.getProjectBaseFolder();
            const importPath = `${baseFolder}/plotgrid-import.json`;
            if (await adapter.exists(importPath)) {
                try {
                    let importTxt = await adapter.read(importPath);
                    // Strip BOM if present (PowerShell 5.1 writes UTF-8 with BOM)
                    if (importTxt.charCodeAt(0) === 0xFEFF) importTxt = importTxt.slice(1);
                    const imported = JSON.parse(importTxt) as PlotGridData;
                    // Persist to System/plotgrid.json
                    if (!await adapter.exists(folder)) {
                        await this.app.vault.createFolder(folder);
                    }
                    await adapter.write(`${folder}/plotgrid.json`, JSON.stringify(imported, null, 2));
                    // Remove the import file so it isn't re-imported next time
                    await adapter.remove(importPath);
                    console.log('[StoryLine] loadPlotGrid: imported data from plotgrid-import.json');
                    return imported;
                } catch (importErr) {
                    console.warn('[StoryLine] loadPlotGrid: failed to import plotgrid-import.json', importErr);
                }
            }

            const filePath = `${folder}/plotgrid.json`;
            if (!await adapter.exists(filePath)) return null;
            const txt = await adapter.read(filePath);
            return JSON.parse(txt) as PlotGridData;
        } catch (e) {
            return null;
        }
    }

    /**
     * Activate a view type in the workspace
     */
    async activateView(viewType: string): Promise<void> {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(viewType);

        if (leaves.length > 0) {
            // View already open, focus it
            leaf = leaves[0];
        } else {
            // Create new leaf
            leaf = workspace.getLeaf(false);
            if (leaf) {
                await leaf.setViewState({ type: viewType, active: true });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    /**
     * Open the Help pane in the right split.
     * If already open, just reveal it.
     */
    async openHelp(): Promise<void> {
        const { workspace } = this.app;
        const existing = workspace.getLeavesOfType(HELP_VIEW_TYPE);
        if (existing.length > 0) {
            workspace.revealLeaf(existing[0]);
            return;
        }
        const leaf = workspace.getRightLeaf(false);
        if (leaf) {
            await leaf.setViewState({ type: HELP_VIEW_TYPE, active: true });
            workspace.revealLeaf(leaf);
        }
    }

    /**
     * Switch the current StoryLine leaf in-place to a different view type.
     * Kept as a utility; the ViewSwitcher now uses the leaf reference directly.
     */
    async activateViewInPlace(viewType: string): Promise<void> {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.setViewState({ type: viewType, active: true, state: {} });
        this.app.workspace.revealLeaf(leaf);
    }

    /**
     * Open the Quick Add modal
     */
    private openQuickAdd(): void {
        const modal = new QuickAddModal(
            this.app,
            this,
            this.sceneManager,
            async (sceneData, openAfter) => {
                const file = await this.sceneManager.createScene(sceneData);
                this.refreshOpenViews();

                if (openAfter) {
                    await this.app.workspace.getLeaf('tab').openFile(file);
                }
            }
        );
        modal.open();
    }

    /**
     * Refresh all open Scene Cards views
     */
    refreshOpenViews(): void {
        // Keep LocationManager and CharacterManager in sync with the active project
        try {
            const locFolder = this.sceneManager.getLocationFolder();
            if (locFolder) this.locationManager.loadAll(locFolder);
            const charFolder = this.sceneManager.getCharacterFolder();
            if (charFolder) this.characterManager.loadCharacters(charFolder);
        } catch { /* project may not be set yet */ }

        // Re-scan wikilinks after entity data may have changed
        this.linkScanner.invalidateAll();
        this.linkScanner.rebuildLookups(this.settings.characterAliases);
        this.linkScanner.scanAll(this.sceneManager.getAllScenes());

        const viewTypes = [
            BOARD_VIEW_TYPE,
            PLOTGRID_VIEW_TYPE,
            TIMELINE_VIEW_TYPE,
            STORYLINE_VIEW_TYPE,
            CHARACTER_VIEW_TYPE,
            LOCATION_VIEW_TYPE,
            STATS_VIEW_TYPE,
        ];

        for (const viewType of viewTypes) {
            const leaves = this.app.workspace.getLeavesOfType(viewType);
            for (const leaf of leaves) {
                const view = leaf.view;
                if (view && 'refresh' in view && typeof (view as Record<string, unknown>).refresh === 'function') {
                    (view as unknown as { refresh(): void }).refresh();
                }
            }
        }
    }

    /**
     * Update any PlotGrid cell linkedSceneId references when a vault file is renamed.
     * Without this, cells that link to the old path become stale.
     */
    private async updatePlotGridLinkedSceneIds(oldPath: string, newPath: string): Promise<void> {
        try {
            const data = await this.loadPlotGrid();
            if (!data?.cells) return;

            let dirty = false;
            for (const key of Object.keys(data.cells)) {
                const cell = data.cells[key];
                if (cell.linkedSceneId === oldPath) {
                    cell.linkedSceneId = newPath;
                    dirty = true;
                }
            }

            if (dirty) {
                await this.savePlotGrid(data);
            }
        } catch {
            // non-fatal — PlotGrid may not exist yet
        }
    }

    /** Ensure a plotgrid file exists (create one with defaults if missing) */
    private async createPlotGridIfMissing(): Promise<void> {
        try {
            const existing = await this.loadPlotGrid();
            if (!existing) {
                const empty: PlotGridData = { rows: [], columns: [], cells: {}, zoom: 1 };
                await this.savePlotGrid(empty);
            }
        } catch (e) {
            // show a non-blocking notice
            new Notice('StoryLine: failed to create PlotGrid file: ' + String(e));
        }
    }

    /**
     * Debounce utility
     */
    private debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): T {
        let timeout: NodeJS.Timeout | null = null;
        return ((...args: any[]) => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        }) as unknown as T;
    }

    // ────────────────────────────────────
    //  Project bootstrap & modals
    // ────────────────────────────────────

    /**
     * Migrate legacy project-specific data from data.json into project frontmatter
     * and System/ files.
     *
     * Handles:
     *  - definedActs, definedChapters, filterPresets → project frontmatter
     *  - JSON files at project root → System/ subfolder
     *  - tagColors, tagTypeOverrides → System/plotlines.json
     *  - characterAliases, ignoredCharacters → System/characters.json
     *  - writingTrackerData → System/stats.json
     *
     * After successful migration the legacy keys are removed from data.json.
     */
    private async migrateProjectDataFromSettings(): Promise<void> {
        const raw: any = await this.loadData();
        if (!raw) return;

        let dirty = false;
        const adapter = this.app.vault.adapter;

        // ── Phase 1: legacy frontmatter migrations (definedActs, etc.) ──
        if (raw.definedActs && typeof raw.definedActs === 'object') {
            for (const [projectPath, acts] of Object.entries(raw.definedActs)) {
                if (!Array.isArray(acts) || acts.length === 0) continue;
                const project = this.sceneManager.getProjects().find(p => p.filePath === projectPath);
                if (project && project.definedActs.length === 0) {
                    project.definedActs = (acts as number[]).map(Number).filter(n => !isNaN(n));
                    await this.sceneManager.saveProjectFrontmatter(project);
                }
            }
            delete raw.definedActs;
            dirty = true;
        }

        if (raw.definedChapters && typeof raw.definedChapters === 'object') {
            for (const [projectPath, chapters] of Object.entries(raw.definedChapters)) {
                if (!Array.isArray(chapters) || chapters.length === 0) continue;
                const project = this.sceneManager.getProjects().find(p => p.filePath === projectPath);
                if (project && project.definedChapters.length === 0) {
                    project.definedChapters = (chapters as number[]).map(Number).filter(n => !isNaN(n));
                    await this.sceneManager.saveProjectFrontmatter(project);
                }
            }
            delete raw.definedChapters;
            dirty = true;
        }

        if (Array.isArray(raw.filterPresets) && raw.filterPresets.length > 0) {
            const activeProject = this.sceneManager.activeProject;
            if (activeProject && activeProject.filterPresets.length === 0) {
                activeProject.filterPresets = raw.filterPresets;
                await this.sceneManager.saveProjectFrontmatter(activeProject);
            }
        }

        for (const legacyKey of ['sceneFolder', 'characterFolder', 'locationFolder', 'plotGridFolder']) {
            if (legacyKey in raw) { delete raw[legacyKey]; dirty = true; }
        }

        // ── Phase 2: move JSON files from project root → System/ ──
        try {
            await this.migrateJsonFilesToSystem();
        } catch (e) {
            console.error('[StoryLine] migrateJsonFilesToSystem error:', e);
        }

        // ── Phase 3: migrate per-project data from data.json → System/ files ──
        // Derive the System folder from the active project path.
        // If no active project, try to derive from activeProjectFile setting.
        let sysFolder: string | null = null;
        const activeProject = this.sceneManager?.activeProject;
        if (activeProject) {
            const base = activeProject.sceneFolder.replace(/\\/g, '/').replace(/\/Scenes\/?$/, '');
            sysFolder = `${base}/System`;
        } else if (raw.activeProjectFile) {
            // Derive from file path: StoryLine/Foo/Foo.md → StoryLine/Foo/System
            const base = String(raw.activeProjectFile).replace(/\/[^\/]+\.md$/i, '');
            if (base) sysFolder = `${base}/System`;
        }

        // Check if there's actually any per-project data to migrate
        const hasLegacyData = SceneCardsPlugin.PROJECT_DATA_KEYS.some(k => k in raw);

        if (sysFolder && hasLegacyData) {
            // Ensure System folder exists
            try {
                if (!await adapter.exists(sysFolder)) {
                    await this.app.vault.createFolder(sysFolder);
                }
            } catch (e) {
                console.error('[StoryLine] Migration: failed to create System folder:', e);
            }

            // ── plotgrid.json (rows/columns/cells/zoom/stickyHeaders) ──
            // Only write legacy plotgrid data if System/plotgrid.json is empty.
            // If it already has data (e.g. from gen_plotgrid.ps1), keep it.
            if ('rows' in raw || 'columns' in raw || 'cells' in raw) {
                try {
                    const pgPath = `${sysFolder}/plotgrid.json`;
                    let existingHasData = false;
                    if (await adapter.exists(pgPath)) {
                        try {
                            const existing = JSON.parse(await adapter.read(pgPath));
                            existingHasData = Array.isArray(existing.rows) && existing.rows.length > 0;
                        } catch { /* unreadable — allow overwrite */ }
                    }
                    if (!existingHasData) {
                        const pgData: Record<string, any> = {};
                        if (Array.isArray(raw.rows)) pgData.rows = raw.rows;
                        if (Array.isArray(raw.columns)) pgData.columns = raw.columns;
                        if (raw.cells && typeof raw.cells === 'object') pgData.cells = raw.cells;
                        if (raw.zoom !== undefined) pgData.zoom = raw.zoom;
                        if (raw.stickyHeaders !== undefined) pgData.stickyHeaders = raw.stickyHeaders;
                        await adapter.write(pgPath, JSON.stringify(pgData, null, 2));
                    } else {
                    }
                } catch (e) {
                    console.error('[StoryLine] Migration: plotgrid write failed:', e);
                }
            }

            // ── plotlines.json (tagColors, tagTypeOverrides) ──
            // Write from this.settings (the in-memory copy) which has values
            // regardless of whether these keys exist in data.json.
            {
                try {
                    const path = `${sysFolder}/plotlines.json`;
                    let existing: Record<string, any> = {};
                    if (await adapter.exists(path)) {
                        try { existing = JSON.parse(await adapter.read(path)); } catch { /* */ }
                    }
                    // Merge: use raw (data.json) values if present, else keep existing System file values,
                    // else fall back to in-memory settings (which have defaults).
                    const merged: Record<string, any> = {
                        tagColors: raw.tagColors ?? existing.tagColors ?? this.settings.tagColors ?? {},
                        tagTypeOverrides: raw.tagTypeOverrides ?? existing.tagTypeOverrides ?? this.settings.tagTypeOverrides ?? {},
                    };
                    await adapter.write(path, JSON.stringify(merged, null, 2));
                } catch (e) {
                    console.error('[StoryLine] Migration: plotlines write failed:', e);
                }
            }

            // ── characters.json (characterAliases, ignoredCharacters) ──
            {
                try {
                    const path = `${sysFolder}/characters.json`;
                    let existing: Record<string, any> = {};
                    if (await adapter.exists(path)) {
                        try { existing = JSON.parse(await adapter.read(path)); } catch { /* */ }
                    }
                    const merged: Record<string, any> = {
                        characterAliases: raw.characterAliases ?? existing.characterAliases ?? this.settings.characterAliases ?? {},
                        ignoredCharacters: raw.ignoredCharacters ?? existing.ignoredCharacters ?? this.settings.ignoredCharacters ?? [],
                    };
                    await adapter.write(path, JSON.stringify(merged, null, 2));
                } catch (e) {
                    console.error('[StoryLine] Migration: characters write failed:', e);
                }
            }

            // ── stats.json (writingTrackerData) ──
            {
                try {
                    const path = `${sysFolder}/stats.json`;
                    let existing: Record<string, any> = {};
                    if (await adapter.exists(path)) {
                        try { existing = JSON.parse(await adapter.read(path)); } catch { /* */ }
                    }
                    const merged: Record<string, any> = {
                        writingTrackerData: raw.writingTrackerData ?? existing.writingTrackerData ?? null,
                    };
                    if (merged.writingTrackerData) {
                        await adapter.write(path, JSON.stringify(merged, null, 2));
                    }
                } catch (e) {
                    console.error('[StoryLine] Migration: stats write failed:', e);
                }
            }

            // ── Strip migrated keys from raw and save ──
            for (const key of SceneCardsPlugin.PROJECT_DATA_KEYS) {
                if (key in raw) { delete raw[key]; dirty = true; }
            }
            // Do NOT set _systemMigrationDone here — that happens in
            // loadProjectSystemData() which runs next and loads the System
            // file contents into this.settings. Setting the flag here would
            // allow an intervening saveSettings() call to overwrite System
            // files with empty defaults before they're loaded into memory.
        } else if (!sysFolder) {
            console.warn('[StoryLine] Migration: no active project, skipping System/ writes');
        } else {
            // No legacy data to migrate — flag set by loadProjectSystemData()
        }

        if (dirty) {
            await this.saveData(raw);
        }
    }

    /**
     * Move legacy JSON files from each project's root folder into its System/ subfolder.
     * Runs once per project; harmless if System/ files already exist.
     */
    private async migrateJsonFilesToSystem(): Promise<void> {
        const adapter = this.app.vault.adapter;
        const jsonFiles = ['plotgrid.json', 'timeline.json', 'board.json', 'plotlines.json', 'stats.json'];

        for (const project of this.sceneManager.getProjects()) {
            const baseFolder = project.sceneFolder
                .replace(/\\/g, '/').replace(/\/Scenes\/?$/, '');
            const sysFolder = `${baseFolder}/System`;

            for (const filename of jsonFiles) {
                const oldPath = `${baseFolder}/${filename}`;
                const newPath = `${sysFolder}/${filename}`;

                try {
                    if (!await adapter.exists(oldPath)) continue;
                    // If System/ file already exists, skip (already migrated)
                    if (await adapter.exists(newPath)) {
                        // Delete the old file since System/ version exists
                        const oldFile = this.app.vault.getAbstractFileByPath(oldPath);
                        if (oldFile) await this.app.vault.delete(oldFile);
                        continue;
                    }

                    // Ensure System/ folder exists
                    if (!await adapter.exists(sysFolder)) {
                        await this.app.vault.createFolder(sysFolder);
                    }

                    // Read old file content and write to new location
                    const content = await adapter.read(oldPath);
                    await adapter.write(newPath, content);

                    // Delete old file
                    const oldFile = this.app.vault.getAbstractFileByPath(oldPath);
                    if (oldFile) await this.app.vault.delete(oldFile);

                    console.log(`[StoryLine] Migrated ${oldPath} → ${newPath}`);
                } catch (e) {
                    console.warn(`[StoryLine] Failed to migrate ${oldPath} → ${newPath}:`, e);
                }
            }
        }
    }

    /**
     * Scan for existing StoryLine projects.
     * If none are found, retry a few times in case the vault / metadata cache
     * hasn't finished indexing (common on mobile and after laptop wake).
     * Only prompt for a new project if retries are exhausted.
     */
    private async bootstrapProjects(): Promise<void> {
        let projects = await this.sceneManager.scanProjects();

        // If nothing found but we expect a project, retry after short delays
        // to let the vault / metadata cache finish indexing.
        if (projects.length === 0 && this.settings.activeProjectFile) {
            for (let attempt = 1; attempt <= 3; attempt++) {
                await new Promise(r => setTimeout(r, attempt * 1000));
                projects = await this.sceneManager.scanProjects();
                if (projects.length > 0) break;
            }
        }

        if (projects.length === 0) {
            // Prompt user to name their first project instead of auto-creating "Default"
            const project = await this.openNewProjectModal();
            if (project) {
                try {
                    await this.activateView(BOARD_VIEW_TYPE);
                } catch { /* non-critical: user can navigate manually */ }
            }
        }
    }

    /**
     * Open a modal to create a new StoryLine project
     */
    async openNewProjectModal(): Promise<any | null> {
        return new Promise((resolve) => {
            const modal = new Modal(this.app);
            modal.titleEl.setText('New StoryLine Project');
            let title = '';
            let customFolder = '';

            new Setting(modal.contentEl)
                .setName('Project name')
                .setDesc('Each project gets its own scene, character and location folders.')
                .addText((text: any) => {
                    text.setPlaceholder('My Novel');
                    text.onChange((v: string) => (title = v));
                });

            new Setting(modal.contentEl)
                .setName('Location')
                .setDesc(`Leave empty to use default (${this.settings.storyLineRoot}). Or enter a vault folder path like "Writing/Novels".`)
                .addText((text: any) => {
                    text.setPlaceholder(this.settings.storyLineRoot);
                    text.onChange((v: string) => (customFolder = v.trim()));
                });

            new Setting(modal.contentEl)
                .addButton((btn: any) => {
                    btn.setButtonText('Create').setCta().onClick(async () => {
                        if (!title.trim()) return;
                        try {
                            const basePath = customFolder || undefined;
                            const project = await this.sceneManager.createProject(title.trim(), '', basePath);
                            await this.sceneManager.setActiveProject(project);
                            this.refreshOpenViews();
                            try { await this.activateView(BOARD_VIEW_TYPE); } catch { /* non-critical */ }
                            modal.close();
                            resolve(project);
                        } catch (err) {
                            new Notice('Failed to create project: ' + String(err));
                            resolve(null);
                        }
                    });
                });

            // Cancel resolves null
            new Setting(modal.contentEl)
                .addButton((btn: any) => {
                    btn.setButtonText('Cancel').onClick(() => {
                        modal.close();
                        resolve(null);
                    });
                });

            modal.open();
        });
    }

    /**
     * Open a modal to fork the active project into a variant
     */
    private openForkProjectModal(): void {
        const activeProject = this.sceneManager.activeProject;
        if (!activeProject) {
            new Notice('No active project to fork');
            return;
        }
        const modal = new Modal(this.app);
        modal.titleEl.setText(`Fork "${activeProject.title}"`);
        let newTitle = `${activeProject.title} - Variant`;

        new Setting(modal.contentEl)
            .setName('New project name')
            .setDesc('All scenes from the current project will be copied.')
            .addText((text: any) => {
                text.setValue(newTitle);
                text.onChange((v: string) => (newTitle = v));
            });

        new Setting(modal.contentEl)
            .addButton((btn: any) => {
                btn.setButtonText('Fork').setCta().onClick(async () => {
                    if (!newTitle.trim()) return;
                    const forked = await this.sceneManager.forkProject(activeProject, newTitle.trim());
                    await this.sceneManager.setActiveProject(forked);
                    this.refreshOpenViews();
                    try { await this.activateView(BOARD_VIEW_TYPE); } catch { /* non-critical */ }
                    modal.close();
                });
            });
        modal.open();
    }
}

/**
 * Modal to choose or create a StoryLine project from the StoryLine ribbon.
 */
class ProjectSelectModal extends Modal {
    plugin: SceneCardsPlugin;
    constructor(app: any, plugin: SceneCardsPlugin) {
        super(app);
        this.plugin = plugin;
        this.titleEl.setText('Open StoryLine Project');
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        const info = contentEl.createDiv({ cls: 'project-select-info' });
        info.createEl('p', { text: 'Select a project to load, or create a new one.' });

        const list = contentEl.createDiv({ cls: 'project-list' });

        // Create a select dropdown and actions
        const select = list.createEl('select', { cls: 'project-select-dropdown' });
        select.addEventListener('keydown', (e: KeyboardEvent) => e.stopPropagation());

        const actions = contentEl.createDiv({ cls: 'project-actions' });
        const openBtn = actions.createEl('button', { text: 'Open', cls: 'mod-cta' });
        openBtn.setAttr('type', 'button');
        openBtn.addEventListener('click', async () => {
            const val = select.value;
            const projects = this.plugin.sceneManager.getProjects();
            const selected = projects.find((p: any) => p.filePath === val);
            if (!selected) {
                new Notice('No project selected');
                return;
            }
            try {
                await this.plugin.sceneManager.setActiveProject(selected);
                this.plugin.refreshOpenViews();
                try { await this.plugin.activateView(BOARD_VIEW_TYPE); } catch { /* non-critical */ }
                this.close();
            } catch (err) {
                new Notice('Failed to open project: ' + String(err));
            }
        });

        const createBtn = actions.createEl('button', { text: 'Create New Project', cls: 'mod-cta' });
        createBtn.setAttr('type', 'button');
        createBtn.addEventListener('click', async () => {
            // open project creation modal and refresh list if a new project was created
            const created = await this.plugin.openNewProjectModal();
            try {
                await this.plugin.sceneManager.scanProjects();
                const projects = this.plugin.sceneManager.getProjects();
                // repopulate select
                select.empty();
                for (const p of projects) {
                    const rootPath = this.plugin.settings.storyLineRoot;
                    const isCustom = !p.filePath.startsWith(rootPath + '/');
                    const parentDir = p.filePath.substring(0, p.filePath.lastIndexOf('/'));
                    const label = isCustom ? `${p.title}  (${parentDir})` : p.title;
                    const opt = select.createEl('option', { text: label });
                    opt.setAttr('value', p.filePath);
                }
                if (projects.length > 0) select.value = (created && created.filePath) || projects[0].filePath;
            } catch (err) {
                new Notice('Failed to refresh projects: ' + String(err));
            }
        });

        const cancel = actions.createEl('button', { text: 'Cancel', cls: 'mod-quiet' });
        cancel.setAttr('type', 'button');
        cancel.addEventListener('click', () => this.close());

        // "Browse" button — manually pick a .md file as a StoryLine project
        const browseBtn = actions.createEl('button', { text: 'Browse for Project…' });
        browseBtn.setAttr('type', 'button');
        browseBtn.addEventListener('click', async () => {
            // Build a list of all .md files in the vault for the user to pick from
            const browseModal = new Modal(this.app);
            browseModal.titleEl.setText('Select a StoryLine project file');
            const container = browseModal.contentEl.createDiv({ cls: 'project-browse-list' });
            const fileList = container.createDiv();
            fileList.style.maxHeight = '300px';
            fileList.style.overflowY = 'auto';
            fileList.createDiv({ text: 'Scanning…' });

            // Scan StoryLine root and one level deep, filtering to only
            // files with type: storyline frontmatter (actual project files).
            const rootPath = this.plugin.settings.storyLineRoot.replace(/\\/g, '/');
            const projectFiles: { path: string; title: string }[] = [];
            try {
                const adapter = this.app.vault.adapter;

                const checkFile = async (filePath: string) => {
                    if (!filePath.endsWith('.md')) return;
                    try {
                        const content = await adapter.read(filePath);
                        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
                        if (!fmMatch) return;
                        if (!/^type:\s*storyline/m.test(fmMatch[1])) return;
                        // Extract title from frontmatter
                        const titleMatch = fmMatch[1].match(/^title:\s*(.+)/m);
                        const title = titleMatch ? titleMatch[1].trim() : filePath.split('/').pop()?.replace(/\.md$/i, '') ?? filePath;
                        projectFiles.push({ path: filePath, title });
                    } catch { /* unreadable */ }
                };

                // Recursively scan all subfolders for project .md files
                const scanFolder = async (folderPath: string) => {
                    try {
                        const listing = await adapter.list(folderPath);
                        for (const f of listing.files) {
                            await checkFile(f);
                        }
                        for (const sub of listing.folders) {
                            // Skip System, Scenes, Characters, Locations folders
                            const folderName = sub.split('/').pop() ?? '';
                            if (['System', 'Scenes', 'Characters', 'Locations'].includes(folderName)) continue;
                            await scanFolder(sub);
                        }
                    } catch { /* skip unreadable */ }
                };
                await scanFolder(rootPath);
            } catch { /* root folder may not exist */ }
            projectFiles.sort((a, b) => a.title.localeCompare(b.title));

            // Render the project list
            fileList.empty();
            if (projectFiles.length === 0) {
                fileList.createDiv({ text: 'No StoryLine projects found.' });
            }
            for (const pf of projectFiles) {
                const row = fileList.createDiv({ cls: 'project-browse-row' });
                row.style.padding = '4px 8px';
                row.style.cursor = 'pointer';
                row.style.borderRadius = '4px';
                row.textContent = `${pf.title}  (${pf.path})`;
                row.addEventListener('mouseenter', () => { row.style.background = 'var(--background-modifier-hover)'; });
                row.addEventListener('mouseleave', () => { row.style.background = ''; });
                row.addEventListener('click', async () => {
                    try {
                        const adapter = this.app.vault.adapter;
                        const content = await adapter.read(pf.path);
                        // Re-scan and try to find / adopt this project
                        await this.plugin.sceneManager.scanProjects();
                        let project = this.plugin.sceneManager.getProjects().find((p: any) => p.filePath === pf.path);
                        if (!project) {
                            const parsed = (this.plugin.sceneManager as any).parseProjectContent(content, pf.path);
                            if (parsed) {
                                (this.plugin.sceneManager as any).projects.set(pf.path, parsed);
                                project = parsed;
                            }
                        }
                        if (project) {
                            await this.plugin.sceneManager.setActiveProject(project);
                            this.plugin.refreshOpenViews();
                            try { await this.plugin.activateView(BOARD_VIEW_TYPE); } catch { /* */ }
                            browseModal.close();
                            this.close();
                        } else {
                            new Notice('Could not parse file as a StoryLine project');
                        }
                    } catch (err) {
                        new Notice('Failed to open project: ' + String(err));
                    }
                });
            }

            browseModal.open();
        });

        // initial population
        (async () => {
            try {
                await this.plugin.sceneManager.scanProjects();
                const projects = this.plugin.sceneManager.getProjects();
                if (projects.length === 0) {
                    select.createEl('option', { text: 'No projects found' }).setAttribute('disabled', 'true');
                }
                for (const p of projects) {
                    const rootPath = this.plugin.settings.storyLineRoot;
                    const isCustom = !p.filePath.startsWith(rootPath + '/');
                    const parentDir = p.filePath.substring(0, p.filePath.lastIndexOf('/'));
                    const label = isCustom ? `${p.title}  (${parentDir})` : p.title;
                    const opt = select.createEl('option', { text: label });
                    opt.setAttr('value', p.filePath);
                }
                if (projects.length > 0) {
                    const active = this.plugin.sceneManager.activeProject;
                    select.value = (active && projects.some((p: any) => p.filePath === active.filePath))
                        ? active.filePath
                        : projects[0].filePath;
                }
            } catch (err) {
                select.createEl('option', { text: 'Error loading projects' }).setAttribute('disabled', 'true');
            }
        })();
    }
}
