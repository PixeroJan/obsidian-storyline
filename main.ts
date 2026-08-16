/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, no-useless-escape -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { App, ButtonComponent, DropdownComponent, FuzzySuggestModal, ItemView, Modal, Notice, Platform, Plugin, Setting, TFile, TextComponent, ToggleComponent, WorkspaceLeaf, normalizePath, parseYaml, setIcon } from 'obsidian';
import { SceneCardsSettings, SceneCardsSettingTab, DEFAULT_SETTINGS } from './settings';
import { asRecord, isRecord } from './utils/narrow';
import type { FilterPreset } from './models/Scene';
import { SceneManager } from './services/SceneManager';
import { registerCustomStatuses } from './models/Scene';
import { setWriteSceneFieldsAsWikilinks, setWordcountExclusions, setWordcountLocale } from './services/MetadataParser';
import { normalizeStoryLineLocale } from './utils/locale';
import { setActiveTemplatesProvider, setTopLevelMirrorEnabled, mirrorUniversalFieldsToTopLevel, hydrateUniversalFieldsFromTopLevel, isReservedTopLevelKey, type FieldTemplateChange } from './services/FieldTemplateService';
import {
    BOARD_VIEW_TYPE,
    TIMELINE_VIEW_TYPE,
    STORYLINE_VIEW_TYPE,
    CHARACTER_VIEW_TYPE,
    STATS_VIEW_TYPE,
    PLOTGRID_VIEW_TYPE,
    LOCATION_VIEW_TYPE,
    HELP_VIEW_TYPE,
    NAVIGATOR_VIEW_TYPE,
    CODEX_VIEW_TYPE,
    SCENE_INSPECTOR_VIEW_TYPE,
    MANUSCRIPT_VIEW_TYPE,
    RESEARCH_VIEW_TYPE,
    NOTES_VIEW_TYPE,
    SYNOPSIS_VIEW_TYPE,
    DETAILS_VIEW_TYPE,
} from './constants';
import { PlotgridView } from './views/PlotgridView';
import type { PlotGridData } from './models/PlotGridData';
import type { SeriesMetadata, StoryLineProject } from './models/StoryLineProject';
import { BoardView } from './views/BoardView';
import { TimelineView } from './views/TimelineView';
import { StorylineView } from './views/StorylineView';
import { CharacterView } from './views/CharacterView';
import { StatsView } from './views/StatsView';
import { LocationView } from './views/LocationView';
import { HelpView } from './views/HelpView';
import { NavigatorView } from './views/NavigatorView';
import { CodexView } from './views/CodexView';
import { SceneInspectorView } from './views/SceneInspectorView';
import { NotesView } from './views/NotesView';
import { SynopsisView } from './views/SynopsisView';
import { DetailsView } from './views/DetailsView';
import { ManuscriptView } from './views/ManuscriptView';
import { ResearchView } from './views/ResearchView';
import { ResearchManager } from './services/ResearchManager';
import { LocationManager } from './services/LocationManager';
import { CharacterManager } from './services/CharacterManager';
import { CodexManager } from './services/CodexManager';
import { makeCustomCodexCategory } from './models/Codex';
import { QuickAddModal } from './components/QuickAddModal';
import { ExportModal } from './components/ExportModal';
import { WritingTracker } from './services/WritingTracker';
import { SnapshotManager } from './services/SnapshotManager';
import { ViewSnapshotService } from './services/ViewSnapshotService';
import { openManageSnapshotsModal } from './components/ViewSnapshotModal';
import { LinkScanner } from './services/LinkScanner';
import { CascadeRenameService } from './services/CascadeRenameService';
import { FieldTemplateService } from './services/FieldTemplateService';
import { SeriesManager } from './services/SeriesManager';
import { buildFormattingToolbar } from './components/FormattingToolbar';
import { setupMobileKeyboardHandling } from './components/MobileAdapter';
import { EditorView } from '@codemirror/view';
import { getQuotePair } from './utils/locale';

/**
 * StoryLine Plugin for Obsidian
 *
 * Transforms your vault into a powerful book planning tool.
 */
export default class SceneCardsPlugin extends Plugin {
    settings: SceneCardsSettings = DEFAULT_SETTINGS;
    sceneManager!: SceneManager;
    /** Set to true once System/ migration is confirmed — guards saveSettings stripping */
    private _systemMigrationDone = false;
    /** Snapshot of colour settings from data.json (global defaults) */
    private _globalColorDefaults: Partial<SceneCardsSettings> = {};
    locationManager!: LocationManager;
    characterManager!: CharacterManager;
    codexManager!: CodexManager;
    writingTracker: WritingTracker = new WritingTracker();
    snapshotManager!: SnapshotManager;
    viewSnapshotService!: ViewSnapshotService;
    linkScanner!: LinkScanner;
    cascadeRename!: CascadeRenameService;
    fieldTemplates!: FieldTemplateService;
    seriesManager!: SeriesManager;
    researchManager!: ResearchManager;
    /** The leaf currently hosting a StoryLine view */
    storyLeaf: WorkspaceLeaf | null = null;
    /** Removes native browser tooltips (`title`) inside StoryLine UI */
    private nativeTooltipObserver: MutationObserver | null = null;
    /** Disables native spell-check inside StoryLine UI inputs (issue #189) */
    private spellcheckObserver: MutationObserver | null = null;
    /** Issue #238 — debounced writing-stats flush+save (60s) */
    private writingStatsSaveTimer: number | null = null;
    /** Issue #238 — periodic autosave interval id (5 min) */
    private writingStatsIntervalId: number | null = null;

    async onload(): Promise<void> {
        await this.loadSettings();
        registerCustomStatuses(this.settings.customStatuses || []);
        this.applyImageSizingVariables();

        // Convert only newly typed ASCII double quotes in Obsidian's editor.
        // Paste and existing text use their original characters.
        this.registerEditorExtension(EditorView.domEventHandlers({
            beforeinput: (event, view) => {
                if (event.inputType !== 'insertText' || event.data !== '"') return false;
                const position = view.state.selection.main.head;
                const line = view.state.doc.lineAt(position);
                const previous = position > line.from ? view.state.sliceDoc(position - 1, position) : '';
                const openingContext = position === line.from || !previous || /[\s([\]{}—–-]/.test(previous);
                const [open, close] = getQuotePair(this.settings.quoteStyle);
                view.dispatch(view.state.replaceSelection(open === close || openingContext ? open : close));
                event.preventDefault();
                return true;
            },
        }));

        // Issue #189 — disable native spell-check in all StoryLine UI inputs,
        // textareas and contenteditables. Obsidian's "Disable spell check" only
        // applies to its own editor; plugin-rendered form fields inherit the
        // browser default (spellcheck on), causing red underlines for users
        // writing in languages like Vietnamese. A scoped MutationObserver
        // catches fields added dynamically (Inspector, modals, toolbar, etc.).
        this.disableSpellCheckInPluginUI();

        // Issue #190 — on mobile the soft keyboard can cover the focused
        // field in the Codex, Inspector, Corkboard note editor, etc. Install
        // a global focus/visual-viewport listener that scrolls the field
        // into the visible (above-keyboard) region. No-op on desktop.
        this.register(setupMobileKeyboardHandling());

        this.sceneManager = new SceneManager(this.app, this);
        this.locationManager = new LocationManager(this.app);
        this.characterManager = new CharacterManager(this.app);
        this.codexManager = new CodexManager(this.app);
        this.snapshotManager = new SnapshotManager(
            this.app,
            () => this.sceneManager?.getEffectiveLocale()
                ?? this.settings.defaultProjectLanguage
                ?? 'en',
        );
        this.viewSnapshotService = new ViewSnapshotService(this);
        this.linkScanner = new LinkScanner(this.characterManager, this.locationManager);
        this.linkScanner.setCodexManager(this.codexManager);
        this.cascadeRename = new CascadeRenameService(this.app, this.sceneManager, this.characterManager, this.locationManager);
        this.fieldTemplates = new FieldTemplateService(this.app, () => this.getProjectSystemFolder());
        // Issue #71 — expose templates to parsers for top-level YAML mirroring
        setActiveTemplatesProvider(() => this.fieldTemplates.getAll());
        setTopLevelMirrorEnabled(this.settings.universalFieldsMirrorTopLevel !== false);
        // Issue #71 follow-up — when a template's topLevelKey or folderSource
        // changes, retro-mirror existing entities so users don't have to
        // re-edit every record by hand.
        this.fieldTemplates.setOnChange(async (change) => {
            await this.migrateUniversalFieldMirror(change);
        });
        this.seriesManager = new SeriesManager(this.app, this);
        this.researchManager = new ResearchManager(this.app, this);

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
                const pluginAny = this as unknown as Record<string, unknown>;
                let alreadyRegistered = false;

                const regOnPlugin = pluginAny.registeredExtensions;
                const regOnVault = (this.app.vault as unknown as Record<string, unknown>)?.registeredExtensions;
                if (Array.isArray(regOnPlugin)) alreadyRegistered = regOnPlugin.includes(ext);
                if (!alreadyRegistered && Array.isArray(regOnVault)) alreadyRegistered = regOnVault.includes(ext);

                if (!alreadyRegistered) {
                    if (typeof pluginAny.registerExtensions === 'function') {
                        (pluginAny.registerExtensions as (e: string[]) => void)([ext]);
                    } else {
                        const appReg = (this.app as unknown as Record<string, unknown>).registerExtensions;
                        if (typeof appReg === 'function') {
                            (appReg as (e: string[]) => void)([ext]);
                        }
                    }
                }
            } catch (e) {
                // non-fatal: extension registration may fail if already registered by another plugin
                void e;
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
        this.registerView(NAVIGATOR_VIEW_TYPE, (leaf) =>
            new NavigatorView(leaf, this, this.sceneManager)
        );
        this.registerView(CODEX_VIEW_TYPE, (leaf) =>
            new CodexView(leaf, this, this.sceneManager)
        );
        this.registerView(SCENE_INSPECTOR_VIEW_TYPE, (leaf) =>
            new SceneInspectorView(leaf, this, this.sceneManager)
        );
        this.registerView(NOTES_VIEW_TYPE, (leaf) =>
            new NotesView(leaf, this, this.sceneManager)
        );
        this.registerView(SYNOPSIS_VIEW_TYPE, (leaf) =>
            new SynopsisView(leaf, this, this.sceneManager)
        );
        this.registerView(DETAILS_VIEW_TYPE, (leaf) =>
            new DetailsView(leaf, this, this.sceneManager)
        );
        this.registerView(MANUSCRIPT_VIEW_TYPE, (leaf) =>
            new ManuscriptView(leaf, this, this.sceneManager)
        );
        this.registerView(RESEARCH_VIEW_TYPE, (leaf) =>
            new ResearchView(leaf, this, this.researchManager)
        );


        // Wait for the workspace layout to be ready, then bootstrap projects
        this.app.workspace.onLayoutReady(async () => {
            try {
            // Apply frontmatter visibility (scoped to StoryLine files only — issue #104)
            this.updateFrontmatterVisibility();
            // Apply toolbar visibility settings (v1.10.17) — hide the
            // "StoryLine" title row and/or auto-collapse view-tab labels
            // when the toolbar is narrow.
            this.updateToolbarVisibility();

            await this.bootstrapProjects();
            // Re-initialize scene index now that the active project is set.
            // Views that opened before bootstrapProjects may have scanned a
            // fallback folder and found no scenes.
            await this.sceneManager.initialize();
            // Migrate legacy data from data.json into project frontmatter
            await this.migrateProjectDataFromSettings();
            // Load per-project data from System/ files (tagColors, aliases, etc.)
            await this.loadProjectSystemData();
            // Load universal field templates from System/field-templates.json
            await this.fieldTemplates.load();
            // Load corkboard layout from System/board.json
            await this.sceneManager.loadCorkboardPositions();
            // Load active view snapshot state
            await this.viewSnapshotService.loadActiveState();
            // Load locations and characters for the active project
            try {
                await this.loadActiveProjectEntities();
            } catch { /* not set yet */ }
            // Scan extra source folders and route by frontmatter type
            try {
                await this.scanExtraFolders();
            } catch { /* not set yet */ }
            // Scan scene bodies for wikilinks after entities are loaded
            this.linkScanner.rebuildLookups(this.settings.characterAliases);
            this.linkScanner.scanAll(this.sceneManager.getAllScenes());
            // Ensure a plotgrid file exists for the active project (or default location)", "oldString": "        this.app.workspace.onLayoutReady(async () => {\n            await this.bootstrapProjects();\n            // Ensure a plotgrid file exists for the active project (or default location)
            // (removed — createPlotGridIfMissing was causing race-condition overwrites)

            // Initialize writing tracker from per-project System/stats.json
            const stats = this.sceneManager.queryService.getStatistics();
            this.writingTracker.startSession(stats.totalWords);

            // Issue #238 — periodic autosave of writing stats so a crash or
            // force-quit no longer loses the whole session. A debounced save
            // runs 60s after the last scene change, and a safety-net interval
            // flushes+persists every 5 minutes regardless of activity.
            this.scheduleWritingStatsSave();
            this.writingStatsIntervalId = window.setInterval(
                () => this.scheduleWritingStatsSave(true),
                5 * 60_000,
            );

            // Refresh all open views now that the project is set — this ensures
            // PlotGrid and other views that opened before bootstrapProjects reload
            // their data from the correct project folder.
            this.refreshOpenViews();
            } catch (startupErr) {
                void startupErr;
            }
        });

        // Ribbon icons — open project chooser (load/create) so users can switch projects
        this.addRibbonIcon('layout-grid', 'StoryLine projects', () => {
            const modal = new ProjectSelectModal(this.app, this);
            modal.open();
        });

        // Commands
        this.addCommand({
            id: 'open-board-view',
            name: 'Open board view',            callback: () => this.activateView(BOARD_VIEW_TYPE),
        });

        this.addCommand({
            id: 'open-timeline-view',
            name: 'Open timeline view',            callback: () => this.activateView(TIMELINE_VIEW_TYPE),
        });

        this.addCommand({
            id: 'open-plotgrid-view',
            name: 'Open plotgrid view',            callback: () => this.activateView(PLOTGRID_VIEW_TYPE),
        });

        this.addCommand({
            id: 'open-plotlines-view',
            name: 'Open plotlines view',
            callback: () => this.activateView(STORYLINE_VIEW_TYPE),
        });

        this.addCommand({
            id: 'open-character-view',
            name: 'Open character view',            callback: () => this.activateView(CHARACTER_VIEW_TYPE),
        });

        this.addCommand({
            id: 'open-stats-view',
            name: 'Open statistics dashboard',            callback: () => this.activateView(STATS_VIEW_TYPE),
        });

        this.addCommand({
            id: 'open-location-view',
            name: 'Open location view',            callback: () => this.activateView(LOCATION_VIEW_TYPE),
        });

        this.addCommand({
            id: 'open-codex-view',
            name: 'Open codex',            callback: () => this.activateView(CODEX_VIEW_TYPE),
        });

        this.addCommand({
            id: 'create-new-scene',
            name: 'Create new scene',            callback: () => this.openQuickAdd(),
        });

        this.addCommand({
            id: 'create-new-project',
            name: 'Create new project',
            callback: () => this.openNewProjectModal(),
        });

        this.addCommand({
            id: 'switch-project',
            name: 'Open or switch project',
            callback: () => {
                const projects = this.sceneManager.getProjects();
                if (projects.length <= 1) {
                    new Notice(projects.length === 0 ? 'No projects found.' : 'Only one project exists.');
                    return;
                }
                const modal = new ProjectSwitcherModal(this.app, projects, async (project) => {
                    await this.sceneManager.setActiveProject(project);
                    this.refreshOpenViews();
                    new Notice(`Switched to "${project.title}"`);
                });
                modal.open();
            },
        });

        this.addCommand({
            id: 'fork-project',
            name: 'Fork current project',
            callback: () => this.openForkProjectModal(),
        });

        this.addCommand({
            id: 'delete-project',
            name: 'Delete current project',
            callback: () => this.openDeleteProjectModal(),
        });

        this.addCommand({
            id: 'undo',
            name: 'Undo last scene change',
            callback: async () => {
                await this.sceneManager.undoManager.undo();
            },
        });

        this.addCommand({
            id: 'redo',
            name: 'Redo last scene change',
            callback: async () => {
                await this.sceneManager.undoManager.redo();
            },
        });

        // Register a global keydown handler so Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
        // route to StoryLine's undo/redo when a StoryLine view is active and
        // the focus is not inside a text input, textarea, or contentEditable.
        this.registerDomEvent(activeDocument, 'keydown', (evt: KeyboardEvent) => {
            const isUndo = (evt.ctrlKey || evt.metaKey) && !evt.shiftKey && evt.key === 'z';
            const isRedo = ((evt.ctrlKey || evt.metaKey) && evt.shiftKey && evt.key === 'Z')
                || ((evt.ctrlKey || evt.metaKey) && evt.key === 'y');
            if (!isUndo && !isRedo) return;

            // Don't intercept if focus is in a text field
            const active = activeDocument.activeElement;
            if (active && (
                active.instanceOf(HTMLInputElement) ||
                active.instanceOf(HTMLTextAreaElement) ||
                (active as HTMLElement).isContentEditable
            )) return;

            // Check if a StoryLine view is active
            const view = this.app.workspace.getActiveViewOfType(ItemView);
            if (!view) return;
            const viewType: string = view.getViewType();
            if (typeof viewType !== 'string') return;
            const slViewTypes = [
                BOARD_VIEW_TYPE, PLOTGRID_VIEW_TYPE, TIMELINE_VIEW_TYPE,
                STORYLINE_VIEW_TYPE, CHARACTER_VIEW_TYPE, STATS_VIEW_TYPE,
                LOCATION_VIEW_TYPE, CODEX_VIEW_TYPE, SCENE_INSPECTOR_VIEW_TYPE,
                NOTES_VIEW_TYPE, SYNOPSIS_VIEW_TYPE, DETAILS_VIEW_TYPE,
                MANUSCRIPT_VIEW_TYPE, RESEARCH_VIEW_TYPE, HELP_VIEW_TYPE,
                NAVIGATOR_VIEW_TYPE,
            ];
            if (!slViewTypes.includes(viewType)) return;

            evt.preventDefault();
            evt.stopPropagation();
            if (isUndo) {
                void this.sceneManager.undoManager.undo();
            } else {
                void this.sceneManager.undoManager.redo();
            }
        });

        this.addCommand({
            id: 'export-project',
            name: 'Export project',            callback: () => {
                new ExportModal(this).open();
            },
        });

        this.addCommand({
            id: 'open-help',
            name: 'Open help',
            callback: () => this.openHelp(),
        });

        this.addCommand({
            id: 'open-navigator',
            name: 'Open navigator',
            callback: () => this.openNavigator(),
        });

        this.addCommand({
            id: 'open-scene-inspector',
            name: 'Open scene details sidebar',
            callback: () => this.openSceneInspector(),
        });

        this.addCommand({
            id: 'open-scene-notes',
            name: 'Open scene notes sidebar',
            callback: () => this.openNotesView(),
        });

        this.addCommand({
            id: 'open-scene-notes-file',
            name: 'Open scene notes as file',
            checkCallback: (checking: boolean) => {
                const scene = this.sceneManager.getScene(this.app.workspace.getActiveFile()?.path ?? '');
                if (!scene) return false;
                if (!checking) {
                    this.sceneManager.openSceneNotes(scene);
                }
                return true;
            },
        });

        this.addCommand({
            id: 'open-scene-synopsis',
            name: 'Open scene synopsis sidebar',
            callback: () => this.openSynopsisView(),
        });

        this.addCommand({
            id: 'open-scene-details-view',
            name: 'Open scene details in own pane',
            callback: () => this.openSceneDetailsLeaf(),
        });

        this.addCommand({
            id: 'open-research',
            name: 'Open research sidebar',
            callback: () => this.openResearch(),
        });

        this.addCommand({
            id: 'create-series',
            name: 'Create new series from current project',
            callback: () => this.openCreateSeriesModal(),
        });

        this.addCommand({
            id: 'add-to-series',
            name: 'Add current project to existing series',
            callback: () => this.openAddToSeriesModal(),
        });

        this.addCommand({
            id: 'remove-from-series',
            name: 'Remove current project from series',
            callback: async () => {
                const project = this.sceneManager.activeProject;
                if (!project?.seriesId && !project?.seriesUuid) {
                    new Notice('This project is not part of a series.');
                    return;
                }
                try {
                    await this.seriesManager.removeProjectFromSeries();
                    this.refreshOpenViews();
                } catch (e: unknown) {
                    new Notice((e instanceof Error ? e.message : String(e)), 10000);
                }
            },
        });

        this.addCommand({
            id: 'rename-project',
            name: 'Rename current project',
            callback: () => this.openRenameProjectModal(),
        });

        this.addCommand({
            id: 'manage-view-snapshots',
            name: 'Manage view snapshots',
            callback: () => {
                if (!this.sceneManager.activeProject) {
                    new Notice('No active project.');
                    return;
                }
                openManageSnapshotsModal(this.app, this.viewSnapshotService);
            },
        });

        this.addCommand({
            id: 'import-scrivener',
            name: 'Import Scrivener project',
            callback: async () => {
                const { ScrivenerImporter } = await import('./services/ScrivenerImporter');
                if (!ScrivenerImporter.isAvailable()) {
                    new Notice('Scrivener import is only available on desktop.');
                    return;
                }
                let remote: { dialog: { showOpenDialog: (opts: unknown) => Promise<{ canceled: boolean; filePaths?: string[] }> } } | undefined;
                const win = window as unknown as { require?: (m: string) => unknown };
                try { remote = win.require?.('@electron/remote') as typeof remote; }
                catch { try { remote = (win.require?.('electron') as { remote: typeof remote })?.remote; } catch { /* */ } }
                if (!remote) { new Notice('File dialog not available.'); return; }

                const result = await remote.dialog.showOpenDialog({
                    title: 'Select Scrivener Project (.scriv)',
                    properties: ['openDirectory', 'openFile'],
                    filters: [
                        { name: 'Scrivener Project', extensions: ['scriv'] },
                    ],
                });
                if (result.canceled || !result.filePaths?.length) return;
                const scrivPath = result.filePaths[0];
                if (!scrivPath.endsWith('.scriv')) {
                    new Notice('Please select a .scriv folder.'); return;
                }
                new Notice('Importing Scrivener project…');
                try {
                    const importer = new ScrivenerImporter(this.app, this);
                    const r = await importer.import(scrivPath);
                    const parts = [`${r.scenesImported} scenes`, `${r.charactersImported} characters`, `${r.locationsImported} locations`];
                    if (r.filesImported > 0) parts.push(`${r.filesImported} files`);
                    new Notice(`Imported "${r.projectTitle}": ${parts.join(', ')}`, 8000);
                } catch (err: unknown) {
                    new Notice('Import failed: ' + (err instanceof Error ? err.message : String(err)));
                }
            },
        });

        // Issue #83 \u2014 turn an arbitrary markdown note into a scene.
        this.addCommand({
            id: 'convert-note-to-scene',
            name: 'Convert note to scene',
            checkCallback: (checking: boolean) => {
                const file = this.app.workspace.getActiveFile();
                if (!file || file.extension !== 'md') return false;
                if (!this.sceneManager.activeProject) return false;
                if (checking) return true;
                this.sceneManager.convertFileToScene(file.path).then(newPath => {
                    if (newPath) this.refreshOpenViews();
                });
                return true;
            },
        });

        // Show "Convert to scene" in the file context menu for markdown files
        // when a project is active and the file isn't already a real scene.
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (!(file instanceof TFile) || file.extension !== 'md') return;
                if (!this.sceneManager.activeProject) return;
                const existing = this.sceneManager.getScene(file.path);
                if (existing && existing.type === 'scene' && !existing.corkboardNote) return;
                menu.addItem(item => {
                    item.setTitle('Convert to scene')
                        .setIcon('clapperboard')
                        .onClick(async () => {
                            const newPath = await this.sceneManager.convertFileToScene(file.path);
                            if (newPath) this.refreshOpenViews();
                        });
                });
            })
        );

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
                    // Issue #238 — schedule a debounced writing-stats save on
                    // any scene edit so stats survive crashes/force-quits.
                    // Issue #242 — skip StoryLine's own System/ files here;
                    // otherwise saveProjectSystemData()'s JSON writes emit
                    // modify events that re-arm this timer in a ~60s loop.
                    // Also skip files outside the active project's content
                    // tree so unrelated vault edits don't trigger a save.
                    const sysFolder = this.getProjectSystemFolder();
                    const isSystemFile = file.path === sysFolder
                        || file.path.startsWith(sysFolder + '/');
                    if (!isSystemFile) {
                        this.scheduleWritingStatsSave();
                    }
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

        // "Show in StoryLine" — command palette + file-menu entry
        // Detects whether the active file is a character, location, or codex entry
        // and navigates to the appropriate detail panel.
        this.addCommand({
            id: 'show-entity-details',
            name: 'Show in details view',
            checkCallback: (checking) => {
                const file = this.app.workspace.getActiveFile();
                if (!file) return false;
                if (!this.resolveEntityType(file.path)) return false;
                if (!checking) this.showEntityDetails(file.path);
                return true;
            },
        });

        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (!(file instanceof TFile)) return;
                if (!this.resolveEntityType(file.path)) return;
                menu.addItem((item) => {
                    item.setTitle('Show in StoryLine')
                        .setIcon('book-open')
                        .onClick(() => this.showEntityDetails(file.path));
                });
            })
        );

        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu, _editor, info) => {
                const file = info.file;
                if (!file) return;
                if (!this.resolveEntityType(file.path)) return;
                menu.addItem((item) => {
                    item.setTitle('Show in StoryLine')
                        .setIcon('book-open')
                        .onClick(() => this.showEntityDetails(file.path));
                });
            })
        );

        // Issue #195 — add "Find & replace in manuscript" to the editor
        // right-click menu when the active view is the Manuscript view, so
        // it appears alongside Obsidian's own editor menu items.
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu) => {
                const view = this.app.workspace.getActiveViewOfType(ItemView);
                const viewType = (view as unknown as { getViewType?: () => string })?.getViewType?.();
                if (viewType !== MANUSCRIPT_VIEW_TYPE) return;
                menu.addItem((item) => {
                    item.setTitle('Find & replace in manuscript')
                        .setIcon('search')
                        .onClick(() => {
                            const leaves = this.app.workspace.getLeavesOfType(MANUSCRIPT_VIEW_TYPE);
                            const mv = leaves[0]?.view as unknown as { toggleSearch?: () => void };
                            mv?.toggleSearch?.();
                        });
                });
            })
        );

        // Inject formatting toolbar into scene editors when Editing Toolbar is absent
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                // Issue #215 — on iPad/iPhone, any DOM mutation inside a
                // scroll container (even class toggles) causes WebKit to
                // reset the scroll position to the top. When the new active
                // leaf is NOT a StoryLine scene file (e.g. settings, a
                // sidebar, another plugin's view, a non-StoryLine tab),
                // skip all DOM work entirely. The toolbar and frontmatter
                // visibility are already applied to scene editors from the
                // previous activation; they don't need re-evaluation when
                // the user merely opens settings or switches to a tab that
                // isn't a StoryLine scene.
                if (leaf) {
                    const view = leaf.view as unknown as {
                        getViewType?: () => string;
                        file?: TFile | null;
                    };
                    const isMarkdown = view?.getViewType?.() === 'markdown';
                    const file = view?.file ?? null;
                    const sf = this.sceneManager?.activeProject?.sceneFolder;
                    const projectRoot = sf ? sf.replace(/\/Scenes$/, '') : undefined;
                    const isStoryLineScene = isMarkdown
                        && !!file
                        && !!projectRoot
                        && file.path.startsWith(projectRoot);
                    if (!isStoryLineScene) {
                        // Still tear down toolbars if the setting was turned off,
                        // but don't do any other DOM work.
                        if (!this.settings.showFormattingToolbar) {
                            activeDocument.querySelectorAll('.sl-injected-fmt-toolbar').forEach(el => el.remove());
                        }
                        return;
                    }
                }
                this.injectFormattingToolbar(leaf);
                this.updateFrontmatterVisibility();
            })
        );

        // Re-apply scoped frontmatter hiding when layout changes or files open
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                this.updateFrontmatterVisibility();
            })
        );
        this.registerEvent(
            this.app.workspace.on('file-open', () => {
                this.updateFrontmatterVisibility();
            })
        );
    }

    /**
     * Issue #104 — Apply the "Hide frontmatter" preference by toggling a CSS
     * class on individual markdown leaves whose file lives inside the StoryLine
     * root folder, instead of overriding Obsidian's global
     * "Properties in document" editor setting. This keeps the user's global
     * Obsidian preference intact across vaults.
     */
    /** Cached state to skip redundant DOM work (issue #215 — WebKit scroll jumps). */
    private _lastFrontmatterHide: boolean | null = null;
    private _lastFrontmatterFileSet: string = '';

    public updateFrontmatterVisibility(): void {
        const hide = !!this.settings.hideFrontmatter;
        const root = this.settings.storyLineRoot.replace(/\\/g, '/').replace(/\/$/, '') + '/';

        // Issue #215 — skip all DOM work if nothing changed since the last run.
        // On iPad/iPhone, even class toggles on scroll containers can trigger
        // WebKit scroll resets. Build a cheap fingerprint of the current state
        // and bail out if it matches the last-applied state.
        const leaves: WorkspaceLeaf[] = [];
        this.app.workspace.iterateAllLeaves(l => { leaves.push(l); });
        let fileSet = '';
        for (const leaf of leaves) {
            const view = leaf.view as unknown as { getViewType?: () => string; file?: TFile | null };
            const filePath = view?.file?.path;
            if (filePath) fileSet += filePath + '|';
        }
        const fingerprint = `${hide}|${fileSet}`;
        if (fingerprint === this._lastFrontmatterFileSet && hide === this._lastFrontmatterHide) {
            return;
        }
        this._lastFrontmatterFileSet = fingerprint;
        this._lastFrontmatterHide = hide;

        const body = activeDocument.body;
        if (body) {
            if (hide) body.classList.add('sl-hide-frontmatter-global');
            else body.classList.remove('sl-hide-frontmatter-global');
        }

        for (const leaf of leaves) {
            const view = leaf.view as unknown as { getViewType?: () => string; file?: TFile | null };
            const filePath = view?.file?.path;
            const inStoryLine = !!filePath && (filePath === root.slice(0, -1) || filePath.startsWith(root));
            // Issue #232 / #230 — only hide frontmatter inside markdown editor
            // leaves. Obsidian's core "Properties" sidebar pane (view type
            // 'properties') also exposes `view.file` (the active file), so the
            // previous check tagged it with `sl-hide-frontmatter` whenever a
            // StoryLine scene was open, making the whole Properties pane blank.
            // Restrict the per-leaf class to markdown views only; the body-level
            // `sl-hide-frontmatter-global` class + the `[data-type^="story-line-"]`
            // CSS rule still cover StoryLine's own custom views.
            const viewType = view?.getViewType?.();
            const isMarkdownView = viewType === 'markdown';
            const container = (leaf as unknown as { containerEl?: HTMLElement }).containerEl;
            const target = container?.querySelector('.view-content') as HTMLElement | null;
            if (!target) continue;
            if (hide && inStoryLine && isMarkdownView) {
                target.classList.add('sl-hide-frontmatter');
            } else {
                target.classList.remove('sl-hide-frontmatter');
            }
        }
    }

    /**
     * Apply the toolbar-related settings (v1.10.17):
     *   - `hideToolbarTitle`   → toggle `sl-hide-toolbar-title` on body
     *   - `autoHideViewLabels` → toggle `sl-auto-hide-tab-labels` on body
     *
     * Both are pure CSS toggles — no DOM re-render is needed since every
     * StoryLine view's toolbar uses the shared `.story-line-title-row`
     * and `.view-tab-label` classes.
     */
    public updateToolbarVisibility(): void {
        const body = activeDocument.body;
        if (!body) return;
        if (this.settings.hideToolbarTitle) {
            body.classList.add('sl-hide-toolbar-title');
        } else {
            body.classList.remove('sl-hide-toolbar-title');
        }
        // Default true; only opt out if explicitly false.
        if (this.settings.autoHideViewLabels === false) {
            body.classList.remove('sl-auto-hide-tab-labels');
        } else {
            body.classList.add('sl-auto-hide-tab-labels');
        }
    }

    /**
     * Issue #189 — disable native spell-check in all StoryLine UI inputs,
     * textareas and contenteditable elements. Obsidian's "Disable spell
     * check" setting only applies to its own editor; plugin-rendered form
     * fields inherit the browser default (spellcheck on), causing red
     * underlines for users writing in languages like Vietnamese.
     *
     * A scoped MutationObserver catches fields added dynamically (Inspector,
     * modals, toolbar, corkboard note editor, etc.) without touching the
     * user's manuscript editor (CM6 / `.cm-editor` / `.markdown-view`).
     */
    private disableSpellCheckInPluginUI(): void {
        // Any element whose class contains the plugin's prefix is considered
        // StoryLine-owned UI. We deliberately exclude the CodeMirror / markdown
        // editor so the user's manuscript keeps Obsidian's spell-check setting.
        const STORYLINE_SELECTOR = '[class*="story-line-"], [class*="storyline-"]';
        const EXCLUDE_SELECTOR = '.cm-editor, .markdown-view, .cm-content';
        const SPELL_FIELDS = 'input, textarea, [contenteditable="true"], [contenteditable=""]';

        const disableIn = (root: ParentNode): void => {
            // Fields directly inside a StoryLine container…
            root.querySelectorAll(STORYLINE_SELECTOR).forEach(container => {
                container.querySelectorAll(SPELL_FIELDS).forEach(field => {
                    // Skip fields that live inside the manuscript editor.
                    if (field.closest(EXCLUDE_SELECTOR)) return;
                    const el = field as HTMLElement;
                    if (el.getAttribute('spellcheck') !== 'false') {
                        el.setAttribute('spellcheck', 'false');
                    }
                });
            });
            // …and a StoryLine container that is itself a spellable field.
            root.querySelectorAll(SPELL_FIELDS).forEach(field => {
                if (field.closest(EXCLUDE_SELECTOR)) return;
                if (field.closest(STORYLINE_SELECTOR)) {
                    const el = field as HTMLElement;
                    if (el.getAttribute('spellcheck') !== 'false') {
                        el.setAttribute('spellcheck', 'false');
                    }
                }
            });
        };

        const body = activeDocument.body;
        if (!body) return;

        // Initial pass for views/modals already rendered at load.
        disableIn(body);

        this.spellcheckObserver = new MutationObserver(mutations => {
            for (const m of mutations) {
                if (m.type !== 'childList' || m.addedNodes.length === 0) continue;
                m.addedNodes.forEach(node => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;
                    const el = node as HTMLElement;
                    disableIn(el);
                });
            }
        });
        this.spellcheckObserver.observe(body, {
            childList: true,
            subtree: true,
        });
    }

    onunload(): void {
        // Issue #238 — clear the periodic autosave interval and any pending
        // debounced save, then do a final immediate flush+persist.
        if (this.writingStatsIntervalId) {
            window.clearInterval(this.writingStatsIntervalId);
            this.writingStatsIntervalId = null;
        }
        if (this.writingStatsSaveTimer) {
            window.clearTimeout(this.writingStatsSaveTimer);
            this.writingStatsSaveTimer = null;
        }
        // Flush writing session into daily history and persist to System/stats.json
        try {
            const stats = this.sceneManager.queryService.getStatistics();
            // Stop any active sprint so it gets recorded
            if (this.writingTracker.isSprintRunning()) {
                this.writingTracker.stopSprint(stats.totalWords);
            }
            this.writingTracker.flushSession(stats.totalWords);
            void this.saveProjectSystemData();
        } catch (e) {
            console.warn('[StoryLine] final writing-stats flush failed', e);
        }

        if (this.nativeTooltipObserver) {
            this.nativeTooltipObserver.disconnect();
            this.nativeTooltipObserver = null;
        }
        if (this.spellcheckObserver) {
            this.spellcheckObserver.disconnect();
            this.spellcheckObserver = null;
        }

        // Clean up any floating lightbox windows left on activeDocument.body
        activeDocument.querySelectorAll('.gallery-lightbox-window').forEach(el => el.remove());
    }

    /**
     * Inject the StoryLine formatting toolbar into a standard MarkdownView
     * editor tab when: (1) the setting is enabled, (2) Editing Toolbar
     * plugin is not installed, and (3) the file belongs to the active project.
     */
    private injectFormattingToolbar(leaf: WorkspaceLeaf | null): void {
        // Helper: remove all injected toolbars everywhere (used when no leaf is eligible).
        const removeAll = () =>
            activeDocument.querySelectorAll('.sl-injected-fmt-toolbar').forEach(el => el.remove());

        if (!leaf || !this.settings.showFormattingToolbar) { removeAll(); return; }

        // Skip if Editing Toolbar plugin is installed
        const plugins = (this.app as unknown as { plugins?: { getPlugin?: (id: string) => unknown } }).plugins;
        if (plugins?.getPlugin?.('editing-toolbar')) { removeAll(); return; }

        // Only inject into markdown views in source/live-preview mode
        const view = leaf.view as unknown as {
            getViewType?: () => string;
            file?: TFile | null;
            editor?: { cm?: import('@codemirror/view').EditorView | null };
        };
        if (view?.getViewType?.() !== 'markdown') {
            // The active leaf is not a markdown editor (e.g. settings, a
            // sidebar, or another plugin's view). Do NOT tear down toolbars
            // that are already attached to other markdown leaves — removing
            // and re-inserting them when the user returns triggers a WebKit
            // scroll/cursor reset on iPad/iPhone (issue #215 follow-up:
            // switching tabs or opening/closing settings still jumped).
            return;
        }

        // Only inject for files that belong to the active project
        const file = view.file ?? null;
        const sf = this.sceneManager?.activeProject?.sceneFolder;
        const projectRoot = sf ? sf.replace(/\/Scenes$/, '') : undefined;
        if (!file || !projectRoot || !file.path.startsWith(projectRoot)) { removeAll(); return; }

        // Get the CM6 EditorView
        const cm: import('@codemirror/view').EditorView | null = view.editor?.cm ?? null;
        if (!cm) { removeAll(); return; }

        // Find the view-content container to insert the toolbar
        const viewContent = (leaf as unknown as { containerEl?: HTMLElement }).containerEl?.querySelector('.view-content');
        if (!viewContent) { removeAll(); return; }

        // This leaf is eligible. Remove toolbars from OTHER leaves only — avoids DOM
        // mutations inside the current editor that cause WebKit (iPad/iPhone) to jump
        // the scroll position to the top on every active-leaf-change (issue #215).
        activeDocument.querySelectorAll('.sl-injected-fmt-toolbar').forEach(el => {
            if (!viewContent.contains(el)) el.remove();
        });

        // Skip re-injection if the toolbar is already present in this viewContent.
        // Re-inserting on every focus event is what triggered the iPad scroll jump.
        if (viewContent.querySelector('.sl-injected-fmt-toolbar')) return;

        // Create and inject the toolbar at the top of view-content.
        // createDiv appends at the end; move it to the front with insertBefore.
        const toolbar = viewContent.createDiv({ cls: 'sl-fmt-toolbar sl-injected-fmt-toolbar' });
        buildFormattingToolbar(toolbar, () => cm);
        viewContent.insertBefore(toolbar, viewContent.firstChild);
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
            const rootNode = root as unknown as Node;
            if (!(rootNode.instanceOf(HTMLElement) || rootNode.instanceOf(Document) || rootNode.instanceOf(DocumentFragment))) return;
            const candidates = (root as ParentNode).querySelectorAll?.('[title]') || [];
            for (const node of Array.from(candidates)) {
                if (!node.instanceOf(HTMLElement)) continue;
                if (isInStoryLineUi(node)) {
                    node.removeAttribute('title');
                }
            }
            if (rootNode.instanceOf(HTMLElement) && (root as HTMLElement).hasAttribute('title') && isInStoryLineUi(root as HTMLElement)) {
                (root as HTMLElement).removeAttribute('title');
            }
        };

        stripTitles(activeDocument.body);

        this.nativeTooltipObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target.instanceOf(HTMLElement) && target.hasAttribute('title') && isInStoryLineUi(target)) {
                        target.removeAttribute('title');
                    }
                    continue;
                }
                for (const node of Array.from(mutation.addedNodes)) {
                    if (node.instanceOf(HTMLElement)) stripTitles(node);
                }
            }
        });

        this.nativeTooltipObserver.observe(activeDocument.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['title'],
        });
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        // Issue #73 — propagate the wikilink-writer toggle to MetadataParser
        setWriteSceneFieldsAsWikilinks(this.settings.writeFieldsAsWikilinks !== false);
        // Issue #78 — propagate wordcount-exclusion toggles to MetadataParser
        setWordcountExclusions({
            comments: this.settings.excludeCommentsFromWordcount !== false,
            checklists: this.settings.excludeChecklistFromWordcount === true,
        });
        setWordcountLocale(normalizeStoryLineLocale(this.settings.defaultProjectLanguage));
        // Migrate any absolute OS paths in extraFolders to vault-relative
        // paths so the vault adapter can find them. Cross-platform safe.
        if (Array.isArray(this.settings.extraFolders) && this.settings.extraFolders.length > 0) {
            const migrated = this.settings.extraFolders.map(f => this.toVaultRelativePath(f)).filter(Boolean);
            if (migrated.join('|') !== this.settings.extraFolders.join('|')) {
                this.settings.extraFolders = migrated;
                await this.saveSettings();
            }
        }
        // Snapshot the global colour settings so we can restore them when
        // switching to a project that has no per-project overrides.
        this._globalColorDefaults = {
            colorScheme: this.settings.colorScheme,
            plotlineHue: this.settings.plotlineHue,
            plotlineSaturation: this.settings.plotlineSaturation,
            plotlineLightness: this.settings.plotlineLightness,
            stickyNoteTheme: this.settings.stickyNoteTheme,
            stickyNoteHue: this.settings.stickyNoteHue,
            stickyNoteSaturation: this.settings.stickyNoteSaturation,
            stickyNoteLightness: this.settings.stickyNoteLightness,
            stickyNoteOverrides: { ...(this.settings.stickyNoteOverrides || {}) },
            stickyNoteFontColorLight: this.settings.stickyNoteFontColorLight,
            stickyNoteFontColorDark: this.settings.stickyNoteFontColorDark,
        };
    }

    /** Per-project field keys that live in System/ files, not data.json */
    private static readonly PROJECT_DATA_KEYS: string[] = [
        'tagColors', 'tagTypeOverrides', 'characterAliases', 'ignoredCharacters',
        'writingTrackerData', 'useProjectColors', 'plotlineDescriptions',
        // Legacy plotgrid data stored directly in data.json (before file-based storage)
        'rows', 'columns', 'cells', 'zoom', 'stickyHeaders',
        // Legacy / per-project keys that don't belong in global settings
        'filterPresets',
        // Issue #236 — custom sections, codex categories, and location types
        // are now per-project (stored in System/custom-sections.json) so they
        // don't leak across unrelated writing projects.
        'characterCustomSections',
        'locationCustomSections',
        'codexCategoryCustomSections',
        'customLocationTypes',
        'codexCustomCategories',
        'codexEnabledCategories',
    ];

    async saveSettings(): Promise<void> {
        this.applyImageSizingVariables();
        registerCustomStatuses(this.settings.customStatuses || []);
        setWriteSceneFieldsAsWikilinks(this.settings.writeFieldsAsWikilinks !== false);
        setTopLevelMirrorEnabled(this.settings.universalFieldsMirrorTopLevel !== false);
        setWordcountExclusions({
            comments: this.settings.excludeCommentsFromWordcount !== false,
            checklists: this.settings.excludeChecklistFromWordcount === true,
        });
        setWordcountLocale(normalizeStoryLineLocale(this.sceneManager?.getEffectiveLocale() ?? this.settings.defaultProjectLanguage));
        const toSave: Record<string, unknown> = { ...this.settings };
        if (this._systemMigrationDone) {
            // Strip per-project data from the global data.json payload
            for (const key of SceneCardsPlugin.PROJECT_DATA_KEYS) {
                delete toSave[key];
            }
            // When using per-project colours, restore global defaults into
            // data.json so the global values are not overwritten by the
            // project-specific ones currently in memory.
            if (this.settings.useProjectColors && Object.keys(this._globalColorDefaults).length > 0) {
                const g = this._globalColorDefaults;
                toSave.colorScheme = g.colorScheme;
                toSave.plotlineHue = g.plotlineHue;
                toSave.plotlineSaturation = g.plotlineSaturation;
                toSave.plotlineLightness = g.plotlineLightness;
                toSave.stickyNoteTheme = g.stickyNoteTheme;
                toSave.stickyNoteHue = g.stickyNoteHue;
                toSave.stickyNoteSaturation = g.stickyNoteSaturation;
                toSave.stickyNoteLightness = g.stickyNoteLightness;
                toSave.stickyNoteOverrides = g.stickyNoteOverrides ?? {};
                toSave.stickyNoteFontColorLight = g.stickyNoteFontColorLight;
                toSave.stickyNoteFontColorDark = g.stickyNoteFontColorDark;
            } else {
                // Keep global colour snapshot in sync so toggling
                // useProjectColors later doesn't revert to stale values.
                this._globalColorDefaults = {
                    colorScheme: this.settings.colorScheme,
                    plotlineHue: this.settings.plotlineHue,
                    plotlineSaturation: this.settings.plotlineSaturation,
                    plotlineLightness: this.settings.plotlineLightness,
                    stickyNoteTheme: this.settings.stickyNoteTheme,
                    stickyNoteHue: this.settings.stickyNoteHue,
                    stickyNoteSaturation: this.settings.stickyNoteSaturation,
                    stickyNoteLightness: this.settings.stickyNoteLightness,
                    stickyNoteOverrides: { ...(this.settings.stickyNoteOverrides || {}) },
                    stickyNoteFontColorLight: this.settings.stickyNoteFontColorLight,
                    stickyNoteFontColorDark: this.settings.stickyNoteFontColorDark,
                };
            }
        }
        await this.saveData(toSave);
        // Persist per-project data to System/ files (only after migration)
        if (this._systemMigrationDone) {
            await this.saveProjectSystemData();
        }
    }

    private applyImageSizingVariables(): void {
        const root = activeDocument.documentElement;
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
    //  Codex change detection
    // ────────────────────────────────────

    /**
     * Load stored codex content digests from System/codex-digests.json.
     */
    async loadCodexDigests(): Promise<Record<string, string>> {
        const data = await this.readSystemJson('codex-digests.json');
        return (data.digests || {}) as Record<string, string>;
    }

    /**
     * Save codex content digests to System/codex-digests.json.
     */
    async saveCodexDigests(digests: Record<string, string>): Promise<void> {
        await this.writeSystemJson('codex-digests.json', { digests });
    }

    /**
     * Ensure new codex entries get a baseline digest and deleted entries are
     * pruned. Does NOT overwrite existing digests (so changes are detectable).
     */
    async refreshCodexDigests(): Promise<void> {
        const stored = await this.loadCodexDigests();
        const current = this.linkScanner.computeCodexDigests();
        let changed = false;

        // Add digests for entries not yet tracked
        for (const [fp, digest] of Object.entries(current)) {
            if (!(fp in stored)) {
                stored[fp] = digest;
                changed = true;
            }
        }

        // Remove digests for deleted entries
        for (const fp of Object.keys(stored)) {
            if (!(fp in current)) {
                delete stored[fp];
                changed = true;
            }
        }

        if (changed) await this.saveCodexDigests(stored);
    }

    /**
     * Return codex entries whose content has changed since the last review,
     * along with the scenes that reference them.
     */
    async getStaleCodexEntries(): Promise<{ entry: import('./models/Codex').CodexEntry; affectedScenes: import('./services/LinkScanner').EntityReference[] }[]> {
        const stored = await this.loadCodexDigests();
        const current = this.linkScanner.computeCodexDigests();

        const stale: { entry: import('./models/Codex').CodexEntry; affectedScenes: import('./services/LinkScanner').EntityReference[] }[] = [];
        const index = this.linkScanner.buildEntityIndex();

        for (const [fp, digest] of Object.entries(current)) {
            if (fp in stored && stored[fp] !== digest) {
                const entry = this.codexManager.getAllEntries().find(e => e.filePath === fp);
                if (entry) {
                    const refs = index.get(entry.name.toLowerCase()) || [];
                    const sceneRefs = refs.filter(r => r.type === 'scene');
                    if (sceneRefs.length > 0) {
                        stale.push({ entry, affectedScenes: sceneRefs });
                    }
                }
            }
        }

        return stale;
    }

    /**
     * Mark a codex entry as reviewed — updates its stored digest to the
     * current content so it's no longer flagged as stale.
     */
    async markCodexEntryReviewed(filePath: string): Promise<void> {
        const stored = await this.loadCodexDigests();
        const current = this.linkScanner.computeCodexDigests();
        if (current[filePath]) {
            stored[filePath] = current[filePath];
        }
        await this.saveCodexDigests(stored);
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

    // ────────────────────────────────────
    //  Issue #71 follow-up — universal-field migrations
    // ────────────────────────────────────

    /**
     * Re-mirror universal-field values to top-level YAML for every existing
     * entity (characters, codex entries, locations, scenes) after a template
     * change. This means users adding `topLevelKey` to a previously-saved
     * field — or turning the global mirror toggle on — instantly see their
     * existing data flow into Properties / Bases / Dataview without having
     * to re-edit each note. Folder-sourced selections are wrapped as
     * `[[wikilinks]]` automatically by the mirror function.
     *
     * Pass `change` from the FieldTemplateService to also clean up a renamed
     * topLevelKey or a deleted template's stale top-level YAML key. Pass
     * nothing to do a full re-mirror sweep (used when the global toggle
     * flips on).
     */
    async migrateUniversalFieldMirror(change?: FieldTemplateChange): Promise<void> {
        const oldKey = change?.oldTopLevelKey && change.topLevelKeyChanged ? change.oldTopLevelKey : undefined;
        const removedTpl = change?.type === 'remove';

        // Only run when something user-visible would actually change.
        // For add/update, skip if neither topLevelKey nor folderSource changed.
        if (change && change.type !== 'remove') {
            if (!change.topLevelKeyChanged && !change.folderSourceChanged) return;
        }
        // Mirror writes only happen when the global toggle is on; if it's off
        // we still want to clean up old top-level keys (rename / removal),
        // but skip the full re-mirror sweep otherwise.
        const mirrorOn = this.settings.universalFieldsMirrorTopLevel !== false;
        if (!mirrorOn && !oldKey && !removedTpl) return;

        const files = this.collectEntityFiles();
        let touched = 0;
        for (const file of files) {
            try {
                await this.app.fileManager.processFrontMatter(file, (fm) => {
                    let didChange = false;
                    // Strip a renamed / removed top-level key.
                    if (oldKey && !isReservedTopLevelKey(oldKey) && fm[oldKey] !== undefined) {
                        delete fm[oldKey];
                        didChange = true;
                    }
                    if (removedTpl && change?.oldTopLevelKey && !isReservedTopLevelKey(change.oldTopLevelKey)) {
                        if (fm[change.oldTopLevelKey] !== undefined) {
                            delete fm[change.oldTopLevelKey];
                            didChange = true;
                        }
                    }
                    if (mirrorOn) {
                        const before = JSON.stringify(fm);
                        // Hydrate first so values that only live in top-level
                        // YAML get a universalFields counterpart, then mirror
                        // back to apply the (possibly new) wikilink wrapping.
                        const hydrated = hydrateUniversalFieldsFromTopLevel(fm, fm.universalFields);
                        if (hydrated !== fm.universalFields) fm.universalFields = hydrated;
                        mirrorUniversalFieldsToTopLevel(fm, fm.universalFields);
                        if (JSON.stringify(fm) !== before) didChange = true;
                    }
                    if (didChange) touched++;
                });
            } catch (e) {
                void e;
            }
        }
        if (touched > 0) {
            new Notice(`StoryLine: synced custom-field YAML in ${touched} file${touched === 1 ? '' : 's'}.`);
        }
    }

    /**
     * Collect every TFile that may carry `universalFields`: characters,
     * codex entries, locations, and scenes (across all loaded projects).
     */
    private collectEntityFiles(): TFile[] {
        const files: TFile[] = [];
        const seen = new Set<string>();
        const push = (p: string | undefined | null) => {
            if (!p || seen.has(p)) return;
            const af = this.app.vault.getAbstractFileByPath(p);
            if (af instanceof TFile && af.extension === 'md') {
                seen.add(p);
                files.push(af);
            }
        };
        try { for (const c of this.characterManager?.getAllCharacters() ?? []) push(c.filePath); } catch { /* noop */ }
        try { for (const e of this.codexManager?.getAllEntries() ?? []) push(e.filePath); } catch { /* noop */ }
        try { for (const l of this.locationManager?.getAllLocations() ?? []) push(l.filePath); } catch { /* noop */ }
        try { for (const s of this.sceneManager?.getAllScenes() ?? []) push(s.filePath); } catch { /* noop */ }
        return files;
    }

    /**
     * Read a JSON file from the current project's System/ folder.
     * Returns an empty object if the file doesn't exist or is invalid.
     */
    private async readSystemJson(
        filename: string,
        systemFolder = this.getProjectSystemFolder(),
    ): Promise<Record<string, unknown>> {
        try {
            const adapter = this.app.vault.adapter;
            const filePath = `${systemFolder}/${filename}`;
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
    private async writeSystemJson(
        filename: string,
        data: Record<string, unknown>,
        systemFolder = this.getProjectSystemFolder(),
    ): Promise<void> {
        try {
            const adapter = this.app.vault.adapter;
            if (!await adapter.exists(systemFolder)) {
                await this.app.vault.createFolder(systemFolder);
            }
            const filePath = `${systemFolder}/${filename}`;
            const serialized = JSON.stringify(data, null, 2);
            // Issue #242 — skip the write when the serialized content is
            // identical to what's already on disk. The 5-minute safety-net
            // interval calls saveProjectSystemData() unconditionally, so
            // without this guard every cycle rewrites all four System JSON
            // files and emits modify events even when nothing changed.
            if (await adapter.exists(filePath)) {
                try {
                    const existing = await adapter.read(filePath);
                    if (existing === serialized) return;
                } catch {
                    /* fall through to write */
                }
            }
            await adapter.write(filePath, serialized);
        } catch (e) {
            void e;
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
        const seriesFolder = this.sceneManager.getSeriesFolder();
        const seriesSystemFolder = seriesFolder ? `${seriesFolder}/System` : null;
        const seriesCodexCategories = seriesSystemFolder
            ? await this.readSystemJson('codex-categories.json', seriesSystemFolder)
            : {};
        const hasSeriesCodexCategories = seriesSystemFolder
            ? await this.app.vault.adapter.exists(`${seriesSystemFolder}/codex-categories.json`)
            : false;

        // Overlay per-project data onto settings (used as working copy)
        this.settings.tagColors = isRecord(plotlines.tagColors)
            ? (plotlines.tagColors as Record<string, string>)
            : {};
        this.settings.tagTypeOverrides = isRecord(plotlines.tagTypeOverrides)
            ? (plotlines.tagTypeOverrides as Record<string, string>)
            : {};
        // Issue #238 feedback — per-project plotline descriptions/notes
        this.settings.plotlineDescriptions = isRecord(plotlines.plotlineDescriptions)
            ? (plotlines.plotlineDescriptions as Record<string, string>)
            : {};

        // Per-project colour overrides (if the project has them stored)
        if (isRecord(plotlines.projectColors)) {
            const pc = asRecord(plotlines.projectColors);
            // Flag this project as having per-project colours
            this.settings.useProjectColors = true;
            if (pc.colorScheme) this.settings.colorScheme = pc.colorScheme as typeof this.settings.colorScheme;
            if (typeof pc.plotlineHue === 'number') this.settings.plotlineHue = pc.plotlineHue;
            if (typeof pc.plotlineSaturation === 'number') this.settings.plotlineSaturation = pc.plotlineSaturation;
            if (typeof pc.plotlineLightness === 'number') this.settings.plotlineLightness = pc.plotlineLightness;
            if (pc.stickyNoteTheme) this.settings.stickyNoteTheme = pc.stickyNoteTheme as typeof this.settings.stickyNoteTheme;
            if (typeof pc.stickyNoteHue === 'number') this.settings.stickyNoteHue = pc.stickyNoteHue;
            if (typeof pc.stickyNoteSaturation === 'number') this.settings.stickyNoteSaturation = pc.stickyNoteSaturation;
            if (typeof pc.stickyNoteLightness === 'number') this.settings.stickyNoteLightness = pc.stickyNoteLightness;
            if (isRecord(pc.stickyNoteOverrides)) {
                this.settings.stickyNoteOverrides = pc.stickyNoteOverrides as Record<number, string>;
            }
            if (typeof pc.stickyNoteFontColorLight === 'string') this.settings.stickyNoteFontColorLight = pc.stickyNoteFontColorLight;
            if (typeof pc.stickyNoteFontColorDark === 'string') this.settings.stickyNoteFontColorDark = pc.stickyNoteFontColorDark;
        } else {
            // No per-project overrides — restore the global colour defaults
            this.settings.useProjectColors = false;
            const g = this._globalColorDefaults;
            if (g && Object.keys(g).length > 0) {
                if (g.colorScheme !== undefined) this.settings.colorScheme = g.colorScheme;
                if (g.plotlineHue !== undefined) this.settings.plotlineHue = g.plotlineHue;
                if (g.plotlineSaturation !== undefined) this.settings.plotlineSaturation = g.plotlineSaturation;
                if (g.plotlineLightness !== undefined) this.settings.plotlineLightness = g.plotlineLightness;
                if (g.stickyNoteTheme !== undefined) this.settings.stickyNoteTheme = g.stickyNoteTheme;
                if (g.stickyNoteHue !== undefined) this.settings.stickyNoteHue = g.stickyNoteHue;
                if (g.stickyNoteSaturation !== undefined) this.settings.stickyNoteSaturation = g.stickyNoteSaturation;
                if (g.stickyNoteLightness !== undefined) this.settings.stickyNoteLightness = g.stickyNoteLightness;
                this.settings.stickyNoteOverrides = { ...(g.stickyNoteOverrides || {}) };
                if (g.stickyNoteFontColorLight !== undefined) this.settings.stickyNoteFontColorLight = g.stickyNoteFontColorLight;
                if (g.stickyNoteFontColorDark !== undefined) this.settings.stickyNoteFontColorDark = g.stickyNoteFontColorDark;
            }
        }

        this.settings.characterAliases = isRecord(characters.characterAliases)
            ? (characters.characterAliases as Record<string, string>)
            : {};
        if (Array.isArray(characters.ignoredCharacters)) {
            this.settings.ignoredCharacters = characters.ignoredCharacters as string[];
        } else {
            this.settings.ignoredCharacters = [];
        }

        // Writing tracker data
        if (isRecord(stats.writingTrackerData)) {
            this.writingTracker.importData(stats.writingTrackerData as unknown as Parameters<typeof this.writingTracker.importData>[0]);
        }

        // Issue #236 — load per-project custom sections, codex categories,
        // and location types from System/custom-sections.json. If the file
        // doesn't exist yet, reset to empty defaults so the previous
        // project's custom sections don't leak into this one.
        //
        // Migration: on the very first load after upgrading to this version,
        // data.json still contains the legacy global values. We detect this
        // by checking whether _systemMigrationDone is already true (it's set
        // at the end of this method). On the first call it's false, so we
        // keep the data.json values and they get written to the System file
        // on the next save. On subsequent calls (project switches), the
        // in-memory values are from the previous project and must NOT be
        // kept — we reset to empty defaults for the new project.
        const customSections = await this.readSystemJson('custom-sections.json');
        const hasCustomSectionsFile = await this.app.vault.adapter.exists(
            `${this.getProjectSystemFolder()}/custom-sections.json`
        );
        if (hasCustomSectionsFile || hasSeriesCodexCategories) {
            this.settings.characterCustomSections = Array.isArray(customSections.characterCustomSections)
                ? (customSections.characterCustomSections as typeof this.settings.characterCustomSections)
                : [];
            this.settings.locationCustomSections = Array.isArray(customSections.locationCustomSections)
                ? (customSections.locationCustomSections as typeof this.settings.locationCustomSections)
                : [];
            this.settings.codexCategoryCustomSections = isRecord(customSections.codexCategoryCustomSections)
                ? (customSections.codexCategoryCustomSections as typeof this.settings.codexCategoryCustomSections)
                : {};
            this.settings.customLocationTypes = Array.isArray(customSections.customLocationTypes)
                ? (customSections.customLocationTypes as string[])
                : [];
            const codexCategories = hasSeriesCodexCategories ? seriesCodexCategories : customSections;
            this.settings.codexCustomCategories = Array.isArray(codexCategories.codexCustomCategories)
                ? (codexCategories.codexCustomCategories as typeof this.settings.codexCustomCategories)
                : [];
            this.settings.codexEnabledCategories = Array.isArray(codexCategories.codexEnabledCategories)
                ? (codexCategories.codexEnabledCategories as string[])
                : [];
        } else if (this._systemMigrationDone) {
            // Subsequent project switch with no System file — this is a new
            // project (or one that has never had custom sections). Reset to
            // empty defaults so the previous project's values don't leak.
            this.settings.characterCustomSections = [];
            this.settings.locationCustomSections = [];
            this.settings.codexCategoryCustomSections = {};
            this.settings.customLocationTypes = [];
            this.settings.codexCustomCategories = [];
            this.settings.codexEnabledCategories = [];
        }
        // else: first-ever load — keep the data.json values (migration).
        // They will be written to System/custom-sections.json on the next
        // saveSettings() call and stripped from data.json thereafter.

        // System files are now the source of truth
        this._systemMigrationDone = true;
    }

    /**
     * Issue #238 — flush the writing session into daily history and persist
     * System/stats.json. Debounced by default (60s after the last change) so
     * rapid edits don't hammer the filesystem; pass `true` to flush
     * immediately (used by the 5-minute safety-net interval and on unload).
     */
    scheduleWritingStatsSave(immediate = false): void {
        if (this.writingStatsSaveTimer) {
            window.clearTimeout(this.writingStatsSaveTimer);
            this.writingStatsSaveTimer = null;
        }
        const flush = () => {
            try {
                if (!this.sceneManager?.activeProject) return;
                const stats = this.sceneManager.queryService.getStatistics();
                this.writingTracker.flushSession(stats.totalWords);
                void this.saveProjectSystemData();
            } catch (e) {
                console.warn('[StoryLine] writing-stats autosave failed', e);
            }
        };
        if (immediate) {
            flush();
        } else {
            this.writingStatsSaveTimer = window.setTimeout(flush, 60_000);
        }
    }

    /**
     * Save per-project data from in-memory settings to System/ files.
     * Called when settings are saved or before switching projects.
     */
    async saveProjectSystemData(): Promise<void> {
        if (!this.sceneManager?.activeProject) return;

        const plotlinesPayload: Record<string, unknown> = {
            tagColors: this.settings.tagColors || {},
            tagTypeOverrides: this.settings.tagTypeOverrides || {},
            plotlineDescriptions: this.settings.plotlineDescriptions || {},
        };

        if (this.settings.useProjectColors) {
            plotlinesPayload.projectColors = {
                colorScheme: this.settings.colorScheme,
                plotlineHue: this.settings.plotlineHue,
                plotlineSaturation: this.settings.plotlineSaturation,
                plotlineLightness: this.settings.plotlineLightness,
                stickyNoteTheme: this.settings.stickyNoteTheme,
                stickyNoteHue: this.settings.stickyNoteHue,
                stickyNoteSaturation: this.settings.stickyNoteSaturation,
                stickyNoteLightness: this.settings.stickyNoteLightness,
                stickyNoteOverrides: this.settings.stickyNoteOverrides || {},
                stickyNoteFontColorLight: this.settings.stickyNoteFontColorLight ?? '',
                stickyNoteFontColorDark: this.settings.stickyNoteFontColorDark ?? '',
            };
        }

        await this.writeSystemJson('plotlines.json', plotlinesPayload);

        await this.writeSystemJson('characters.json', {
            characterAliases: this.settings.characterAliases || {},
            ignoredCharacters: this.settings.ignoredCharacters || [],
        });

        // Save writing tracker data
        await this.writeSystemJson('stats.json', {
            writingTrackerData: this.writingTracker.exportData(),
        });

        // Issue #236 — save per-project custom sections, codex categories,
        // and location types so they don't leak across unrelated projects.
        await this.writeSystemJson('custom-sections.json', {
            characterCustomSections: this.settings.characterCustomSections || [],
            locationCustomSections: this.settings.locationCustomSections || [],
            codexCategoryCustomSections: this.settings.codexCategoryCustomSections || {},
            customLocationTypes: this.settings.customLocationTypes || [],
            codexCustomCategories: this.settings.codexCustomCategories || [],
            codexEnabledCategories: this.settings.codexEnabledCategories || [],
        });

        const seriesFolder = this.sceneManager.getSeriesFolder();
        if (seriesFolder) {
            await this.writeSystemJson('codex-categories.json', {
                codexCustomCategories: this.settings.codexCustomCategories || [],
                codexEnabledCategories: this.settings.codexEnabledCategories || [],
            }, `${seriesFolder}/System`);
        }
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
                        // Blocked: refusing to overwrite non-empty plotgrid with empty data
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
                    // Imported data from plotgrid-import.json successfully
                    return imported;
                } catch (importErr) {
                    // Failed to import plotgrid-import.json — fall through to normal load
                    void importErr;
                }
            }

            const filePath = `${folder}/plotgrid.json`;
            if (!await adapter.exists(filePath)) return null;
            const txt = await adapter.read(filePath);
            return JSON.parse(txt) as PlotGridData;
        } catch {
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
     * Determine what kind of StoryLine entity a file belongs to.
     * Returns 'character' | 'location' | 'codex' | null.
     */
    private resolveEntityType(filePath: string): 'character' | 'location' | 'codex' | null {
        const p = normalizePath(filePath);
        const charFolder = normalizePath(this.sceneManager.getCharacterFolder());
        if (p.startsWith(charFolder + '/') || p === charFolder) return 'character';
        const locFolder = normalizePath(this.sceneManager.getLocationFolder());
        if (p.startsWith(locFolder + '/') || p === locFolder) return 'location';
        const codexFolder = normalizePath(this.sceneManager.getCodexFolder());
        if (p.startsWith(codexFolder + '/') || p === codexFolder) return 'codex';
        return null;
    }

    /**
     * Open the appropriate StoryLine view and navigate to the entity's detail panel.
     */
    private async showEntityDetails(filePath: string): Promise<void> {
        const kind = this.resolveEntityType(filePath);
        switch (kind) {
            case 'character': {
                await this.activateView(CHARACTER_VIEW_TYPE);
                const leaves = this.app.workspace.getLeavesOfType(CHARACTER_VIEW_TYPE);
                if (leaves.length > 0) {
                    await (leaves[0].view as CharacterView).navigateToCharacter(filePath);
                }
                break;
            }
            case 'location': {
                await this.activateView(LOCATION_VIEW_TYPE);
                const leaves = this.app.workspace.getLeavesOfType(LOCATION_VIEW_TYPE);
                if (leaves.length > 0) {
                    await (leaves[0].view as LocationView).navigateToItem(filePath);
                }
                break;
            }
            case 'codex': {
                await this.activateView(CODEX_VIEW_TYPE);
                const leaves = this.app.workspace.getLeavesOfType(CODEX_VIEW_TYPE);
                if (leaves.length > 0) {
                    await (leaves[0].view as CodexView).navigateToEntry(filePath);
                }
                break;
            }
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
     * Open the Story Navigator in the left sidebar.
     * If already open, just reveal it.
     */
    async openNavigator(): Promise<void> {
        const { workspace } = this.app;
        const existing = workspace.getLeavesOfType(NAVIGATOR_VIEW_TYPE);
        if (existing.length > 0) {
            workspace.revealLeaf(existing[0]);
            return;
        }
        const leaf = workspace.getLeftLeaf(false);
        if (leaf) {
            await leaf.setViewState({ type: NAVIGATOR_VIEW_TYPE, active: true });
            workspace.revealLeaf(leaf);
        }
    }

    /**
     * Open the Scene Details inspector in the right sidebar.
     * If already open, just reveal it.
     */
    async openSceneInspector(): Promise<void> {
        const { workspace } = this.app;
        const existing = workspace.getLeavesOfType(SCENE_INSPECTOR_VIEW_TYPE);
        if (existing.length > 0) {
            workspace.revealLeaf(existing[0]);
            return;
        }
        const leaf = workspace.getRightLeaf(false);
        if (leaf) {
            await leaf.setViewState({ type: SCENE_INSPECTOR_VIEW_TYPE, active: true });
            workspace.revealLeaf(leaf);
        }
    }

    /**
     * Open (or reveal) the standalone Notes sidebar view.
     */
    async openNotesView(): Promise<void> {
        const { workspace } = this.app;
        const existing = workspace.getLeavesOfType(NOTES_VIEW_TYPE);
        if (existing.length > 0) {
            workspace.revealLeaf(existing[0]);
            return;
        }
        const leaf = workspace.getRightLeaf(false);
        if (leaf) {
            await leaf.setViewState({ type: NOTES_VIEW_TYPE, active: true });
            workspace.revealLeaf(leaf);
        }
    }

    /**
     * Open (or reveal) the standalone Synopsis sidebar view. The leaf can be
     * dragged to dock above/below/beside any other pane.
     */
    async openSynopsisView(): Promise<void> {
        const { workspace } = this.app;
        const existing = workspace.getLeavesOfType(SYNOPSIS_VIEW_TYPE);
        if (existing.length > 0) {
            workspace.revealLeaf(existing[0]);
            return;
        }
        const leaf = workspace.getRightLeaf(false);
        if (leaf) {
            await leaf.setViewState({ type: SYNOPSIS_VIEW_TYPE, active: true });
            workspace.revealLeaf(leaf);
        }
    }

    /**
     * Open (or reveal) the standalone Scene Details view (the full inspector
     * inside its own dockable leaf).
     */
    async openSceneDetailsLeaf(): Promise<void> {
        const { workspace } = this.app;
        const existing = workspace.getLeavesOfType(DETAILS_VIEW_TYPE);
        if (existing.length > 0) {
            workspace.revealLeaf(existing[0]);
            return;
        }
        const leaf = workspace.getRightLeaf(false);
        if (leaf) {
            await leaf.setViewState({ type: DETAILS_VIEW_TYPE, active: true });
            workspace.revealLeaf(leaf);
        }
    }

    /** Returns true when the Scene Inspector sidebar is open and visible. */
    isSceneInspectorOpen(): boolean {
        const leaves = this.app.workspace.getLeavesOfType(SCENE_INSPECTOR_VIEW_TYPE);
        if (leaves.length === 0) return false;
        const leaf = leaves[0];
        // Check the sidebar containing this leaf is not collapsed
        const root = leaf.getRoot();
        if ((root as unknown as Record<string, unknown>).collapsed) return false;
        // Check this leaf is the active tab in its parent (not hidden behind another tab)
        const parent = ((leaf as unknown as Record<string, unknown>).parentSplit
            ?? (leaf as unknown as Record<string, unknown>).parent) as { children?: unknown[]; currentTab?: unknown; activeTab?: unknown } | undefined;
        if (parent && typeof parent.children !== 'undefined') {
            const activeChild = parent.currentTab ?? parent.activeTab;
            if (activeChild !== undefined && activeChild !== leaf) {
                // parent tracks a numeric index — compare by index
                const idx = (parent.children as unknown[]).indexOf(leaf);
                if (typeof activeChild === 'number' ? activeChild !== idx : true) return false;
            }
        }
        return true;
    }

    async openResearch(): Promise<void> {
        const { workspace } = this.app;
        const existing = workspace.getLeavesOfType(RESEARCH_VIEW_TYPE);
        if (existing.length > 0) {
            workspace.revealLeaf(existing[0]);
            return;
        }
        const leaf = workspace.getRightLeaf(false);
        if (leaf) {
            await leaf.setViewState({ type: RESEARCH_VIEW_TYPE, active: true });
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
                    await this.app.workspace.getLeaf('tab').openFile(file, { state: { mode: 'source', source: false } });
                }
            }
        );
        modal.open();
    }

    /**
     * Load characters and locations for the active project.
     *
     * When the project belongs to a series, `getCharacterFolder()` /
     * `getLocationFolder()` already redirect to the shared series-level
     * Codex folder. After loading from there we additionally scan the
     * per-project `Codex/Characters/` and `Codex/Locations/` folders so
     * book-only characters and locations can coexist with series-shared
     * ones. The series scan wins on file-path collisions because
     * `addFile()` skips paths that are already loaded.
     */
    /**
     * Reload all entity managers from the project folders AND re-apply
     * Additional Source Folders. This is the single entry point views
     * should call on open/refresh so that externally-scanned entries
     * (characters/locations/codex stored outside the project Codex)
     * survive view reloads.
     *
     * `loadActiveProjectEntities()` clears each manager and reloads from
     * the project folders; `scanExtraFolders()` then re-adds entries from
     * user-configured external folders. Calling both keeps the two in sync.
     */
    async reloadEntities(): Promise<void> {
        await this.loadActiveProjectEntities();
        await this.scanExtraFolders();
        // Re-load codex entries from the project Codex folder, then re-apply
        // external folders so codex-type entries are included.
        const codexFolder = this.sceneManager.getCodexFolder();
        if (codexFolder) {
            const customDefs = (this.settings.codexCustomCategories || []).map(
                (cc: { id: string; label: string; icon: string }) => makeCustomCodexCategory(cc.id, cc.label, cc.icon)
            );
            this.codexManager.initCategories(this.settings.codexEnabledCategories || [], customDefs);
            await this.codexManager.loadAll(codexFolder);
            await this.scanExtraFolders();
        }
    }

    /**
     * Reload characters and locations from the active project's Codex
     * folders, then scan series-local Codex folders if applicable. Used by
     * `reloadEntities()` and the bootstrap path.
     *
     * `loadCharacters`/`loadAll` clear the manager first, so callers that
     * also want external Additional Source Folder entries must run
     * `scanExtraFolders()` afterwards.
     */
    async loadActiveProjectEntities(): Promise<void> {
        const adapter = this.app.vault.adapter;

        const locFolder = this.sceneManager.getLocationFolder();
        if (locFolder) await this.locationManager.loadAll(locFolder);
        const charFolder = this.sceneManager.getCharacterFolder();
        if (charFolder) await this.characterManager.loadCharacters(charFolder);

        // Series mode: also scan the per-project Codex folder for book-only
        // characters and locations.
        if (!this.sceneManager.getSeriesFolder()) return;

        const localCharFolder = this.sceneManager.getProjectLocalCharacterFolder();
        if (localCharFolder && localCharFolder !== charFolder && await adapter.exists(localCharFolder)) {
            const listing = await adapter.list(localCharFolder);
            for (const f of listing.files) {
                if (!f.endsWith('.md')) continue;
                try {
                    const fp = normalizePath(f);
                    const content = await adapter.read(fp);
                    this.characterManager.addFile(content, fp);
                } catch { /* skip unreadable */ }
            }
        }

        const localLocFolder = this.sceneManager.getProjectLocalLocationFolder();
        if (localLocFolder && localLocFolder !== locFolder && await adapter.exists(localLocFolder)) {
            const scanLoc = async (folder: string): Promise<void> => {
                if (!await adapter.exists(folder)) return;
                const listing = await adapter.list(folder);
                for (const f of listing.files) {
                    if (!f.endsWith('.md')) continue;
                    try {
                        const fp = normalizePath(f);
                        const content = await adapter.read(fp);
                        this.locationManager.addFile(content, fp);
                    } catch { /* skip unreadable */ }
                }
                for (const sub of listing.folders) {
                    await scanLoc(normalizePath(sub));
                }
            };
            await scanLoc(localLocFolder);
        }
    }

    /**
     * Recursively scan user-configured extra folders and route each .md
     * file to the appropriate manager based on its frontmatter type: field.
     */
    async scanExtraFolders(): Promise<void> {
        const folders = this.settings.extraFolders;
        if (!folders || folders.length === 0) return;

        const adapter = this.app.vault.adapter;
        // Resolve the vault root once so we can convert absolute OS paths
        // (e.g. "C:/Users/.../MyFolder" on Windows or "/Users/.../MyFolder"
        // on macOS/Linux) into vault-relative paths that the adapter
        // understands. On mobile the adapter basePath may be empty, in
        // which case we fall back to using the path as-is.
        let vaultRoot = '';
        try {
            if (typeof (adapter as unknown as { getBasePath?: () => string }).getBasePath === 'function') {
                vaultRoot = (adapter as unknown as { getBasePath: () => string }).getBasePath();
            }
        } catch { /* mobile / unsupported — leave vaultRoot empty */ }

        const toVaultRelative = (p: string): string => {
            if (!vaultRoot) return normalizePath(p);
            // Normalise separators so the comparison works cross-platform.
            const normRoot = vaultRoot.replace(/\\/g, '/').replace(/\/+$/, '');
            const normPath = p.replace(/\\/g, '/').replace(/^\/+/, '');
            if (normPath.toLowerCase().startsWith(normRoot.toLowerCase() + '/')) {
                return normalizePath(normPath.slice(normRoot.length + 1));
            }
            if (normPath.toLowerCase() === normRoot.toLowerCase()) {
                return '';
            }
            // Already vault-relative (or an unknown absolute path) — normalise
            // and let adapter.exists decide.
            return normalizePath(p);
        };

        const scan = async (folderPath: string): Promise<void> => {
            // Convert absolute OS paths to vault-relative, then normalise
            // (strips leading/trailing slashes, converts backslashes) so
            // adapter.exists() doesn't silently fail.
            const normalized = toVaultRelative(folderPath);
            if (!normalized || !await adapter.exists(normalized)) return;
            const listing = await adapter.list(normalized);
            for (const f of listing.files) {
                if (!f.endsWith('.md')) continue;
                try {
                    const fp = normalizePath(f);
                    const content = await adapter.read(fp);
                    const type = this.extractFrontmatterType(content);
                    if (!type) continue;
                    switch (type) {
                        case 'scene':
                            this.sceneManager.addFile(content, fp);
                            break;
                        case 'character':
                            this.characterManager.addFile(content, fp);
                            break;
                        case 'location':
                        case 'world':
                            this.locationManager.addFile(content, fp);
                            break;
                        default:
                            // Try codex categories (items, creatures, custom, etc.)
                            this.codexManager.addFile(content, fp);
                            break;
                    }
                } catch { /* skip unreadable */ }
            }
            for (const sub of listing.folders) {
                await scan(normalizePath(sub));
            }
        };

        for (const folder of folders) {
            if (folder) await scan(folder);
        }
    }

    /**
     * Convert an absolute OS filesystem path to a vault-relative path that
     * Obsidian's vault adapter understands. Works cross-platform (Windows,
     * macOS, Linux). If the path is already vault-relative (or the vault
     * root cannot be determined, e.g. on mobile), the path is normalised
     * and returned as-is.
     */
    toVaultRelativePath(p: string): string {
        const adapter = this.app.vault.adapter;
        let vaultRoot = '';
        try {
            if (typeof (adapter as unknown as { getBasePath?: () => string }).getBasePath === 'function') {
                vaultRoot = (adapter as unknown as { getBasePath: () => string }).getBasePath();
            }
        } catch { /* mobile / unsupported */ }
        if (!vaultRoot) return normalizePath(p);
        const normRoot = vaultRoot.replace(/\\/g, '/').replace(/\/+$/, '');
        const normPath = p.replace(/\\/g, '/').replace(/^\/+/, '');
        if (normPath.toLowerCase().startsWith(normRoot.toLowerCase() + '/')) {
            return normalizePath(normPath.slice(normRoot.length + 1));
        }
        if (normPath.toLowerCase() === normRoot.toLowerCase()) {
            return '';
        }
        return normalizePath(p);
    }

    /**
     * Quick extraction of the type: field from frontmatter.
     */
    private extractFrontmatterType(content: string): string | null {
        const clean = content.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');
        const match = clean.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!match) return null;
        try {
            const fm = parseYaml(match[1]);
            return fm?.type ?? null;
        } catch {
            return null;
        }
    }

    /**
     * Force all open Board views to reload corkboard positions from SceneManager
     * on their next refresh. Call this after programmatically updating board.json
     * (e.g. snapshot restore) so the local map picks up the new data.
     */
    invalidateCorkboardCache(): void {
        const leaves = this.app.workspace.getLeavesOfType(BOARD_VIEW_TYPE);
        for (const leaf of leaves) {
            const view = leaf.view as unknown as unknown as Record<string, unknown>;
            if (typeof view?.invalidateCorkboardLayout === 'function') {
                (view as unknown as { invalidateCorkboardLayout(): void }).invalidateCorkboardLayout();
            }
        }
    }

    /**
     * Flush any pending corkboard position writes so SceneManager has the
     * latest positions. Call before capturing a snapshot.
     */
    async flushCorkboardPositions(): Promise<void> {
        const leaves = this.app.workspace.getLeavesOfType(BOARD_VIEW_TYPE);
        for (const leaf of leaves) {
            const view = leaf.view as unknown as unknown as Record<string, unknown>;
            if (typeof view?.flushPendingCorkboardPersist === 'function') {
                await (view as unknown as { flushPendingCorkboardPersist(): Promise<void> }).flushPendingCorkboardPersist();
            }
        }
    }

    /**
     * Refresh all open Scene Cards views
     */
    async refreshOpenViews(): Promise<void> {
        // Keep LocationManager, CharacterManager, and CodexManager in sync
        try {
            await this.loadActiveProjectEntities();
            await this.scanExtraFolders();
            const codexFolder = this.sceneManager.getCodexFolder();
            if (codexFolder) {
                const customDefs = (this.settings.codexCustomCategories || []).map(
                    (cc: { id: string; label: string; icon: string }) => makeCustomCodexCategory(cc.id, cc.label, cc.icon)
                );
                this.codexManager.initCategories(this.settings.codexEnabledCategories || [], customDefs);
                await this.codexManager.loadAll(codexFolder);
            }
        } catch { /* project may not be set yet */ }

        // Re-scan wikilinks after entity data is loaded
        this.linkScanner.invalidateAll();
        this.linkScanner.rebuildLookups(this.settings.characterAliases);
        this.linkScanner.scanAll(this.sceneManager.getAllScenes());

        // Update codex digests (baseline new entries, prune deleted ones)
        void this.refreshCodexDigests();

        // Flush writing tracker so daily stats update in real-time
        try {
            const stats = this.sceneManager.queryService.getStatistics();
            this.writingTracker.flushSession(stats.totalWords);
        } catch { /* project may not be set yet */ }

        const viewTypes = [
            BOARD_VIEW_TYPE,
            PLOTGRID_VIEW_TYPE,
            TIMELINE_VIEW_TYPE,
            STORYLINE_VIEW_TYPE,
            CHARACTER_VIEW_TYPE,
            LOCATION_VIEW_TYPE,
            CODEX_VIEW_TYPE,
            STATS_VIEW_TYPE,
            NAVIGATOR_VIEW_TYPE,
            MANUSCRIPT_VIEW_TYPE,
            RESEARCH_VIEW_TYPE,
        ];

        for (const viewType of viewTypes) {
            const leaves = this.app.workspace.getLeavesOfType(viewType);
            for (const leaf of leaves) {
                const view = leaf.view as unknown as { refresh?: () => void };
                if (view && typeof view.refresh === 'function') {
                    view.refresh();
                }
                // Update the tab title so it reflects the new project name immediately
                (leaf as unknown as { updateHeader?: () => void }).updateHeader?.();
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
    /**
     * Debounce utility
     */
    private debounce<T extends (...args: unknown[]) => unknown>(
        func: T,
        wait: number
    ): T {
        let timeout: number | null = null;
        return ((...args: unknown[]) => {
            if (timeout) window.clearTimeout(timeout);
            timeout = window.setTimeout(() => func(...args), wait);
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
        const rawAny: unknown = await this.loadData();
        if (!rawAny || !isRecord(rawAny)) return;
        const raw = rawAny as Record<string, unknown> & {
            definedActs?: Record<string, unknown>;
            definedChapters?: Record<string, unknown>;
            filterPresets?: unknown[];
            activeProjectFile?: string;
            rows?: unknown[];
            columns?: unknown[];
            cells?: unknown[];
        };

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
                activeProject.filterPresets = raw.filterPresets as FilterPreset[];
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
            void e;
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
                void e;
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
                        const pgData: Record<string, unknown> = {};
                        if (Array.isArray(raw.rows)) pgData.rows = raw.rows;
                        if (Array.isArray(raw.columns)) pgData.columns = raw.columns;
                        if (raw.cells && typeof raw.cells === 'object') pgData.cells = raw.cells;
                        if (raw.zoom !== undefined) pgData.zoom = raw.zoom;
                        if (raw.stickyHeaders !== undefined) pgData.stickyHeaders = raw.stickyHeaders;
                        await adapter.write(pgPath, JSON.stringify(pgData, null, 2));
                    }
                } catch (e) {
                    void e;
                }
            }

            // ── plotlines.json (tagColors, tagTypeOverrides) ──
            // Write from this.settings (the in-memory copy) which has values
            // regardless of whether these keys exist in data.json.
            {
                try {
                    const path = `${sysFolder}/plotlines.json`;
                    let existing: Record<string, unknown> = {};
                    if (await adapter.exists(path)) {
                        try { existing = JSON.parse(await adapter.read(path)); } catch { /* */ }
                    }
                    // Merge: use raw (data.json) values if present, else keep existing System file values,
                    // else fall back to in-memory settings (which have defaults).
                    const merged: Record<string, unknown> = {
                        tagColors: raw.tagColors ?? existing.tagColors ?? this.settings.tagColors ?? {},
                        tagTypeOverrides: raw.tagTypeOverrides ?? existing.tagTypeOverrides ?? this.settings.tagTypeOverrides ?? {},
                    };
                    await adapter.write(path, JSON.stringify(merged, null, 2));
                } catch (e) {
                    void e;
                }
            }

            // ── characters.json (characterAliases, ignoredCharacters) ──
            {
                try {
                    const path = `${sysFolder}/characters.json`;
                    let existing: Record<string, unknown> = {};
                    if (await adapter.exists(path)) {
                        try { existing = JSON.parse(await adapter.read(path)); } catch { /* */ }
                    }
                    const merged: Record<string, unknown> = {
                        characterAliases: raw.characterAliases ?? existing.characterAliases ?? this.settings.characterAliases ?? {},
                        ignoredCharacters: raw.ignoredCharacters ?? existing.ignoredCharacters ?? this.settings.ignoredCharacters ?? [],
                    };
                    await adapter.write(path, JSON.stringify(merged, null, 2));
                } catch (e) {
                    void e;
                }
            }

            // ── stats.json (writingTrackerData) ──
            {
                try {
                    const path = `${sysFolder}/stats.json`;
                    let existing: Record<string, unknown> = {};
                    if (await adapter.exists(path)) {
                        try { existing = JSON.parse(await adapter.read(path)); } catch { /* */ }
                    }
                    const merged: Record<string, unknown> = {
                        writingTrackerData: raw.writingTrackerData ?? existing.writingTrackerData ?? null,
                    };
                    if (merged.writingTrackerData) {
                        await adapter.write(path, JSON.stringify(merged, null, 2));
                    }
                } catch (e) {
                    void e;
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
            // No active project — nothing to migrate.
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
                        if (oldFile) await this.app.fileManager.trashFile(oldFile);
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
                    if (oldFile) await this.app.fileManager.trashFile(oldFile);

                    // Migrated oldPath → newPath successfully
                } catch (e) {
                    // Migration failed for this file — continue with remaining files
                    void e;
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
                await new Promise(r => window.setTimeout(r, attempt * 1000));
                projects = await this.sceneManager.scanProjects();
                if (projects.length > 0) break;
            }
        }

        if (projects.length === 0) {
            // If we expect a project to exist (e.g. from a previous session),
            // verify that its file is actually missing before prompting creation.
            // This prevents the startup race condition from creating duplicate projects
            // when the vault/metadata cache is slow to index (e.g. synced folders).
            if (this.settings.activeProjectFile) {
                const exists = await this.app.vault.adapter.exists(this.settings.activeProjectFile);
                if (exists) {
                    // The file exists but wasn't found by scanProjects — retry once more
                    // with a longer delay to give the metadata cache time to catch up.
                    await new Promise(r => window.setTimeout(r, 5000));
                    projects = await this.sceneManager.scanProjects();
                    if (projects.length > 0) return;
                }
            }

            // Mobile (iOS / iPadOS / Android) suppression: the vault file
            // system on mobile can take a long time to populate, especially
            // with iCloud / Dropbox / OneDrive sync. Auto-opening the New
            // Project modal in that window leads to users seeing the dialog
            // before their existing projects have shown up, and accidentally
            // creating duplicates. Show a one-time notice instead and let
            // the user invoke the modal manually from the command palette
            // ("StoryLine: Create new project") once everything has loaded.
            if (Platform.isMobile) {
                new Notice(
                    'StoryLine: no projects found yet. If sync is still running, give it a moment. ' +
                    'Otherwise use the command palette → "StoryLine: Create new project".',
                    8000,
                );
                return;
            }

            // Desktop: prompt the user to name their first project instead
            // of auto-creating a "Default" one.
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
    async openNewProjectModal(): Promise<StoryLineProject | null> {
        return new Promise<StoryLineProject | null>((resolve) => {
            const modal = new Modal(this.app);
            modal.titleEl.setText('New StoryLine project');
            let title = '';
            let customFolder = '';
            let createAsSeries = false;
            let seriesName = '';

            // Series toggle at the top
            const seriesNameSetting = new Setting(modal.contentEl)
                .setName('Series name')
                .setDesc('Characters, locations, and codex entries will be shared across all books in this series.')
                .addText((text: TextComponent) => {
                    text.setPlaceholder('My trilogy');
                    text.onChange((v: string) => (seriesName = v));
                });
            seriesNameSetting.settingEl.setCssStyles({ display: 'none' });

            new Setting(modal.contentEl)
                .setName('Create as series')
                .setDesc('Wrap this book in a series folder with a shared codex.')
                .addToggle((toggle: ToggleComponent) => {
                    toggle.setValue(false);
                    toggle.onChange((v: boolean) => {
                        createAsSeries = v;
                        seriesNameSetting.settingEl.setCssStyles({ display: v ? '' : 'none' });
                    });
                });

            // Book title
            new Setting(modal.contentEl)
                .setName('Book title')
                .setDesc('The title of this book. Each book gets its own scenes folder.')
                .addText((text: TextComponent) => {
                    text.setPlaceholder('My novel');
                    text.onChange((v: string) => (title = v));
                });

            new Setting(modal.contentEl)
                .setName('Location')
                .setDesc(`Leave empty to use default (${this.settings.storyLineRoot}). Or enter a vault folder path like "Writing/Novels".`)
                .addText((text: TextComponent) => {
                    text.setPlaceholder(this.settings.storyLineRoot);
                    text.onChange((v: string) => (customFolder = v.trim()));
                });

            new Setting(modal.contentEl)
                .addButton((btn: ButtonComponent) => {
                    btn.setButtonText('Create').setCta().onClick(async () => {
                        if (!title.trim()) return;
                        if (createAsSeries && !seriesName.trim()) {
                            new Notice('Please enter a series name.');
                            return;
                        }
                        try {
                            const basePath = customFolder || undefined;
                            const project = await this.sceneManager.createProject(title.trim(), '', basePath);
                            await this.sceneManager.setActiveProject(project);

                            if (createAsSeries) {
                                await this.seriesManager.createSeriesFromProject(seriesName.trim());
                            }

                            this.refreshOpenViews();
                            if (this.settings.autoOpenNavigator) this.openNavigator();
                            try { await this.activateView(BOARD_VIEW_TYPE); } catch { /* non-critical */ }
                            modal.close();
                            resolve(project);
                        } catch (err: unknown) {
                            new Notice((err instanceof Error ? err.message : String(err)), 10000);
                            resolve(null);
                        }
                    });
                })
                .addButton((btn: ButtonComponent) => {
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
            .addText((text: TextComponent) => {
                text.setValue(newTitle);
                text.onChange((v: string) => (newTitle = v));
            });

        new Setting(modal.contentEl)
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText('Fork').setCta().onClick(async () => {
                    if (!newTitle.trim()) return;
                    const forked = await this.sceneManager.forkProject(activeProject, newTitle.trim());
                    await this.sceneManager.setActiveProject(forked);
                    this.refreshOpenViews();
                    if (this.settings.autoOpenNavigator) this.openNavigator();
                    try { await this.activateView(BOARD_VIEW_TYPE); } catch { /* non-critical */ }
                    modal.close();
                });
            });
        modal.open();
    }

    /**
     * Open a confirmation modal to delete the active project.
     *
     * The project folder (and everything inside — scenes, codex, notes,
     * system data) is moved to the system trash / `.trash` according to
     * the user's "Deleted files" setting. If the project belongs to a
     * series it is also removed from `series.json`.
     */
    private openDeleteProjectModal(): void {
        const activeProject = this.sceneManager.activeProject;
        if (!activeProject) {
            new Notice('No active project to delete');
            return;
        }

        const modal = new Modal(this.app);
        modal.titleEl.setText(`Delete "${activeProject.title}"`);

        // Warning banner
        const warningEl = modal.contentEl.createDiv({ cls: 'sl-delete-warning' });
        warningEl.createEl('p', {
            text: '⚠️ this will permanently delete the project folder and everything inside it:',
        });
        const list = warningEl.createEl('ul');
        list.createEl('li', { text: 'All scenes' });
        list.createEl('li', { text: 'All characters, locations and codex entries' });
        list.createEl('li', { text: 'All notes, research and archive items' });
        list.createEl('li', { text: 'Project settings and view data' });
        if (activeProject.seriesId || activeProject.seriesUuid) {
            list.createEl('li', { text: 'The book will also be removed from its series.' });
        }
        warningEl.createEl('p', {
            text: 'This action cannot be undone. The folder will be moved to your system trash (or Obsidian\u2019s .trash folder, depending on your settings).',
            cls: 'sl-delete-warning-strong',
        });

        // Type-to-confirm: user must type the project title to enable Delete.
        const expected = activeProject.title;
        let typed = '';
        new Setting(modal.contentEl)
            .setName('Confirm by typing the project title')
            .setDesc(`Type "${expected}" to enable the Delete button.`)
            .addText((text: TextComponent) => {
                text.setPlaceholder(expected);
                text.onChange((v: string) => {
                    typed = v;
                    deleteBtn.setDisabled(v.trim() !== expected);
                });
                window.setTimeout(() => text.inputEl.focus(), 50);
            });

        let deleteBtn: ButtonComponent;
        new Setting(modal.contentEl)
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText('Cancel').onClick(() => modal.close());
            })
            .addButton((btn: ButtonComponent) => {
                deleteBtn = btn.setButtonText('Delete permanently').setClass('mod-warning').setDisabled(true);
                btn.onClick(async () => {
                    if (typed.trim() !== expected) return;
                    modal.close();
                    try {
                        const ok = await this.sceneManager.deleteProject(activeProject);
                        if (ok) {
                            this.refreshOpenViews();
                        }
                    } catch (e: unknown) {
                        new Notice('Failed to delete project: ' + (e instanceof Error ? e.message : String(e)), 10000);
                    }
                });
            });
        modal.open();
    }

    // ────────────────────────────────────
    //  Series modals
    // ────────────────────────────────────

    private openCreateSeriesModal(): void {
        const project = this.sceneManager.activeProject;
        if (!project) {
            new Notice('No active project');
            return;
        }
        if (project.seriesId || project.seriesUuid) {
            new Notice('This project is already part of a series.');
            return;
        }

        const modal = new Modal(this.app);
        modal.titleEl.setText('Create new series');
        let seriesName = '';

        new Setting(modal.contentEl)
            .setName('Series name')
            .setDesc(`"${project.title}" will become the first book in this series. Its codex will be shared.`)
            .addText((text: TextComponent) => {
                text.setPlaceholder('My trilogy');
                text.onChange((v: string) => (seriesName = v));
                window.setTimeout(() => text.inputEl.focus(), 50);
            });

        new Setting(modal.contentEl)
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText('Create series').setCta().onClick(async () => {
                    if (!seriesName.trim()) {
                        new Notice('Please enter a series name.');
                        return;
                    }
                    modal.close();
                    try {
                        await this.seriesManager.createSeriesFromProject(seriesName.trim());
                        this.refreshOpenViews();
                    } catch (e: unknown) {
                        new Notice((e instanceof Error ? e.message : String(e)), 10000);
                    }
                });
            });

        modal.open();
    }

    private async openAddToSeriesModal(): Promise<void> {
        const project = this.sceneManager.activeProject;
        if (!project) {
            new Notice('No active project');
            return;
        }
        if (project.seriesId || project.seriesUuid) {
            new Notice('This project is already part of a series.');
            return;
        }

        const seriesList = await this.seriesManager.discoverSeries();
        if (seriesList.length === 0) {
            new Notice('No series found. Create one first using "create new series from current project".');
            return;
        }

        const modal = new Modal(this.app);
        modal.titleEl.setText('Add to existing series');
        let selectedFolder = seriesList[0].folder;

        new Setting(modal.contentEl)
            .setName('Series')
            .setDesc(`"${project.title}" will be added to the selected series. Its codex will be merged into the shared series codex.`)
            .addDropdown((dropdown: DropdownComponent) => {
                for (const s of seriesList) {
                    dropdown.addOption(s.folder, `${s.meta.name} (${s.meta.bookOrder.length} books)`);
                }
                dropdown.onChange((v: string) => (selectedFolder = v));
            });

        new Setting(modal.contentEl)
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText('Add to series').setCta().onClick(async () => {
                    modal.close();
                    try {
                        await this.seriesManager.addProjectToSeries(selectedFolder);
                        this.refreshOpenViews();
                    } catch (e: unknown) {
                        new Notice((e instanceof Error ? e.message : String(e)), 10000);
                    }
                });
            });

        modal.open();
    }

    private openRenameProjectModal(): void {
        const project = this.sceneManager.activeProject;
        if (!project) {
            new Notice('No active project to rename.');
            return;
        }

        const modal = new Modal(this.app);
        modal.titleEl.setText('Rename project');
        let newTitle = project.title;

        new Setting(modal.contentEl)
            .setName('New title')
            .setDesc('The project file and folder will be renamed. All links are updated automatically.')
            .addText((text: TextComponent) => {
                text.setValue(project.title);
                text.onChange((v: string) => (newTitle = v));
                window.setTimeout(() => { text.inputEl.focus(); text.inputEl.select(); }, 50);
            });

        new Setting(modal.contentEl)
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText('Rename').setCta().onClick(async () => {
                    if (!newTitle.trim() || newTitle.trim() === project.title) {
                        modal.close();
                        return;
                    }
                    try {
                        this.seriesManager.checkLinkSettings();
                        await this.sceneManager.renameProject(project, newTitle.trim());
                        new Notice(`Project renamed to "${newTitle.trim()}"`);
                        modal.close();
                        this.refreshOpenViews();
                    } catch (e: unknown) {
                        new Notice((e instanceof Error ? e.message : String(e)), 10000);
                    }
                });
            });

        modal.open();
    }

    openSeriesManagementModal(): void {
        const modal = new SeriesManagementModal(this.app, this);
        modal.open();
    }
}

/**
 * Fuzzy-search modal for quick project switching from the command palette.
 */
class ProjectSwitcherModal extends FuzzySuggestModal<StoryLineProject> {
    private projects: StoryLineProject[];
    private onChoose: (project: StoryLineProject) => void;

    constructor(app: App, projects: StoryLineProject[], onChoose: (project: StoryLineProject) => void) {
        super(app);
        this.projects = projects;
        this.onChoose = onChoose;
        this.setPlaceholder('Switch to project…');
    }

    getItems(): StoryLineProject[] {
        return this.projects;
    }

    getItemText(project: StoryLineProject): string {
        return project.title + (project.seriesId || project.seriesUuid ? ` [${project.seriesId ?? project.seriesUuid}]` : '');
    }

    onChooseItem(project: StoryLineProject): void {
        this.onChoose(project);
    }
}

/**
 * Modal to choose or create a StoryLine project from the StoryLine ribbon.
 */
class ProjectSelectModal extends Modal {
    plugin: SceneCardsPlugin;
    constructor(app: App, plugin: SceneCardsPlugin) {
        super(app);
        this.plugin = plugin;
        this.titleEl.setText('Open StoryLine project');
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
            const selected = projects.find((p: StoryLineProject) => p.filePath === val);
            if (!selected) {
                new Notice('No project selected');
                return;
            }
            try {
                await this.plugin.sceneManager.setActiveProject(selected);
                this.plugin.refreshOpenViews();
                if (this.plugin.settings.autoOpenNavigator) this.plugin.openNavigator();
                try { await this.plugin.activateView(BOARD_VIEW_TYPE); } catch { /* non-critical */ }
                this.close();
            } catch (err) {
                new Notice('Failed to open project: ' + String(err));
            }
        });

        const createBtn = actions.createEl('button', { text: 'Create new project', cls: 'mod-cta' });
        createBtn.setAttr('type', 'button');
        createBtn.addEventListener('click', async () => {
            // open project creation modal and refresh list if a new project was created
            const created = await this.plugin.openNewProjectModal();
            if (created) {
                this.close();
                return;
            }
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
                if (projects.length > 0) select.value = projects[0].filePath;
            } catch (err) {
                new Notice('Failed to refresh projects: ' + String(err));
            }
        });

        const cancel = actions.createEl('button', { text: 'Cancel', cls: 'mod-quiet' });
        cancel.setAttr('type', 'button');
        cancel.addEventListener('click', () => this.close());

        const seriesBtn = actions.createEl('button', { text: 'Manage series…' });
        seriesBtn.setAttr('type', 'button');
        seriesBtn.addEventListener('click', async () => {
            const seriesModal = new SeriesManagementModal(this.app, this.plugin);
            seriesModal.open();
        });

        // "Browse" button — manually pick a .md file as a StoryLine project
        const browseBtn = actions.createEl('button', { text: 'Browse for project…' });
        browseBtn.setAttr('type', 'button');
        browseBtn.addEventListener('click', async () => {
            // Build a list of all .md files in the vault for the user to pick from
            const browseModal = new Modal(this.app);
            browseModal.titleEl.setText('Select a StoryLine project file');
            const container = browseModal.contentEl.createDiv({ cls: 'project-browse-list' });
            const fileList = container.createDiv();
            fileList.setCssStyles({
                maxHeight: '300px',
                overflowY: 'auto',
            });
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
                row.setCssStyles({
                    padding: '4px 8px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                });
                row.textContent = `${pf.title}  (${pf.path})`;
                row.addEventListener('mouseenter', () => { row.setCssStyles({ background: 'var(--background-modifier-hover)' }); });
                row.addEventListener('mouseleave', () => { row.setCssStyles({ background: '' }); });
                row.addEventListener('click', async () => {
                    try {
                        const adapter = this.app.vault.adapter;
                        const content = await adapter.read(pf.path);
                        // Re-scan and try to find / adopt this project
                        await this.plugin.sceneManager.scanProjects();
                        let project = this.plugin.sceneManager.getProjects().find((p: StoryLineProject) => p.filePath === pf.path);
                        if (!project) {
                            const sm = this.plugin.sceneManager as unknown as {
                                parseProjectContent: (content: string, path: string) => StoryLineProject | null;
                                projects: Map<string, StoryLineProject>;
                            };
                            const parsed = sm.parseProjectContent(content, pf.path);
                            if (parsed) {
                                sm.projects.set(pf.path, parsed);
                                project = parsed;
                            }
                        }
                        if (project) {
                            await this.plugin.sceneManager.setActiveProject(project);
                            this.plugin.refreshOpenViews();
                            if (this.plugin.settings.autoOpenNavigator) this.plugin.openNavigator();
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
                    select.value = (active && projects.some((p: StoryLineProject) => p.filePath === active.filePath))
                        ? active.filePath
                        : projects[0].filePath;
                }
            } catch {
                select.createEl('option', { text: 'Error loading projects' }).setAttribute('disabled', 'true');
            }
        })();
    }
}

/**
 * Modal for managing series — view, rename, reorder books, add/remove books.
 */
class SeriesManagementModal extends Modal {
    plugin: SceneCardsPlugin;

    constructor(app: App, plugin: SceneCardsPlugin) {
        super(app);
        this.plugin = plugin;
        this.titleEl.setText('Manage series');
    }

    onOpen() {
        this.render();
    }

    private async render() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('sl-series-modal');

        const seriesList = await this.plugin.seriesManager.discoverSeries();

        if (seriesList.length === 0) {
            contentEl.createEl('p', {
                text: 'No series found. Create a series from the new project modal or use the command palette.',
                cls: 'sl-series-empty',
            });
            return;
        }

        for (const { folder, meta } of seriesList) {
            const card = contentEl.createDiv({ cls: 'sl-series-card' });

            // ── Header row: series name + rename button ──
            const header = card.createDiv({ cls: 'sl-series-header' });
            header.createSpan({
                cls: 'sl-series-folder-hint',
                text: folder.split('/').pop() ?? folder,
            });

            const renameBtn = header.createEl('button', { cls: 'clickable-icon sl-series-action', attr: { 'aria-label': 'Rename series' } });
            setIcon(renameBtn, 'pencil');
            renameBtn.addEventListener('click', () => this.renameSeries(folder, meta));

            // ── Book list ──
            const bookList = card.createDiv({ cls: 'sl-series-book-list' });

            for (let i = 0; i < meta.bookOrder.length; i++) {
                const bookName = meta.bookOrder[i];
                const row = bookList.createDiv({ cls: 'sl-series-book-row' });


                const bookProject = this.plugin.sceneManager.getProjects().find(p => {
                    const fp = normalizePath(p.filePath);
                    return fp.startsWith(normalizePath(folder) + '/')
                        && (p.title === bookName || fp.split('/').slice(-2, -1)[0] === bookName);
                });
                row.createSpan({ cls: 'sl-series-book-name', text: bookProject?.title ?? bookName });

                const bookActions = row.createDiv({ cls: 'sl-series-book-actions' });

                // Rename book
                const renameBookBtn = bookActions.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Rename book' } });
                setIcon(renameBookBtn, 'pencil');
                renameBookBtn.addEventListener('click', () => this.renameBook(folder, meta, bookName));

                // Move up
                if (i > 0) {
                    const upBtn = bookActions.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Move up' } });
                    setIcon(upBtn, 'chevron-up');
                    upBtn.addEventListener('click', () => this.reorderBook(folder, meta, i, i - 1));
                }

                // Move down
                if (i < meta.bookOrder.length - 1) {
                    const downBtn = bookActions.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Move down' } });
                    setIcon(downBtn, 'chevron-down');
                    downBtn.addEventListener('click', () => this.reorderBook(folder, meta, i, i + 1));
                }

                // Remove from series
                const removeBtn = bookActions.createEl('button', { cls: 'clickable-icon sl-series-remove', attr: { 'aria-label': 'Remove from series' } });
                setIcon(removeBtn, 'x');
                removeBtn.addEventListener('click', () => this.removeBook(folder, meta, bookName));

                // Delete book permanently
                const deleteBookBtn = bookActions.createEl('button', { cls: 'clickable-icon sl-series-delete', attr: { 'aria-label': 'Delete book permanently' } });
                setIcon(deleteBookBtn, 'trash');
                deleteBookBtn.addEventListener('click', () => this.deleteBook(folder, meta, bookName));
            }

            // ── Add book button ──
            const addRow = card.createDiv({ cls: 'sl-series-add-row' });
            const addBtn = addRow.createEl('button', { text: 'Add book to this series', cls: 'sl-series-add-btn' });
            setIcon(addBtn.createSpan({ prepend: true }), 'plus');
            addBtn.addEventListener('click', () => this.addBookToSeries(folder, meta));
        }
    }

    private async renameSeries(folder: string, meta: SeriesMetadata) {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Rename series');
        let newName = meta.name;

        new Setting(modal.contentEl)
            .setName('Series name')
            .setDesc('Updates the series display name in series.json only. The folder identity stays unchanged.')
            .addText((text: TextComponent) => {
                text.setValue(meta.name);
                text.onChange((v: string) => (newName = v));
                window.setTimeout(() => { text.inputEl.focus(); text.inputEl.select(); }, 50);
            });

        new Setting(modal.contentEl)
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText('Rename').setCta().onClick(async () => {
                    if (!newName.trim() || newName.trim() === meta.name) {
                        modal.close();
                        return;
                    }
                    try {
                        await this.plugin.seriesManager.renameSeriesName(folder, newName.trim());

                        new Notice(`Series renamed to "${newName.trim()}"`);
                        modal.close();
                        this.plugin.refreshOpenViews();
                        this.render();
                    } catch (e: unknown) {
                        new Notice((e instanceof Error ? e.message : String(e)), 10000);
                    }
                });
            });

        modal.open();
    }

    private async reorderBook(folder: string, meta: SeriesMetadata, fromIndex: number, toIndex: number) {
        const [book] = meta.bookOrder.splice(fromIndex, 1);
        meta.bookOrder.splice(toIndex, 0, book);
        await this.plugin.seriesManager.saveSeriesMetadata(folder, meta);
        this.render();
    }

    private async removeBook(folder: string, meta: SeriesMetadata, bookName: string) {
        // Find the project for this book and activate it so removeProjectFromSeries works
        const projects = this.plugin.sceneManager.getProjects();
        const bookProject = projects.find(p => {
            const fp = normalizePath(p.filePath);
            return fp.startsWith(normalizePath(folder) + '/')
                && (p.title === bookName || fp.split('/').slice(-2, -1)[0] === bookName);
        });

        if (!bookProject) {
            new Notice(`Could not find project "${bookName}" — it may have been moved or deleted.`);
            return;
        }

        // Confirm
        const confirm = await new Promise<boolean>((resolve) => {
            const m = new Modal(this.app);
            m.titleEl.setText('Remove from series');
            m.contentEl.createEl('p', {
                text: `Remove "${bookName}" from "${meta.name}"? The shared codex will be copied into the book's local folder.`,
            });
            new Setting(m.contentEl)
                .addButton((btn: ButtonComponent) => btn.setButtonText('Remove').setClass('mod-warning').onClick(() => { m.close(); resolve(true); }))
                .addButton((btn: ButtonComponent) => btn.setButtonText('Cancel').onClick(() => { m.close(); resolve(false); }));
            m.open();
        });
        if (!confirm) return;

        const previousActive = this.plugin.sceneManager.activeProject;
        await this.plugin.sceneManager.setActiveProject(bookProject);
        try {
            await this.plugin.seriesManager.removeProjectFromSeries();
        } catch (e: unknown) {
            new Notice((e instanceof Error ? e.message : String(e)), 10000);
        }
        // Restore previous active project if it wasn't the removed one
        if (previousActive && previousActive.filePath !== bookProject.filePath) {
            const refreshed = this.plugin.sceneManager.getProjects().find(p => p.filePath === previousActive.filePath);
            if (refreshed) await this.plugin.sceneManager.setActiveProject(refreshed);
        }
        this.plugin.refreshOpenViews();
        this.render();
    }

    /**
     * Permanently delete a book from a series.
     *
     * Shows a type-to-confirm warning modal, then trashes the book's folder
     * (scenes, codex, notes, etc.) and removes it from `series.json`.
     */
    private async deleteBook(folder: string, meta: SeriesMetadata, bookName: string) {
        const projects = this.plugin.sceneManager.getProjects();
        const bookProject = projects.find(p => {
            const fp = normalizePath(p.filePath);
            return fp.startsWith(normalizePath(folder) + '/')
                && (p.title === bookName || fp.split('/').slice(-2, -1)[0] === bookName);
        });

        if (!bookProject) {
            new Notice(`Could not find project "${bookName}" — it may have been moved or deleted.`);
            return;
        }

        const modal = new Modal(this.app);
        modal.titleEl.setText(`Delete "${bookName}"`);

        const warningEl = modal.contentEl.createDiv({ cls: 'sl-delete-warning' });
        warningEl.createEl('p', {
            text: `\u26a0\ufe0f This will permanently delete "${bookName}" and everything inside it:`,
        });
        const list = warningEl.createEl('ul');
        list.createEl('li', { text: 'All scenes' });
        list.createEl('li', { text: 'All characters, locations and codex entries' });
        list.createEl('li', { text: 'All notes, research and archive items' });
        list.createEl('li', { text: 'The book will be removed from the series "' + meta.name + '".' });
        warningEl.createEl('p', {
            text: 'This action cannot be undone. The folder will be moved to your system trash (or Obsidian\u2019s .trash folder, depending on your settings).',
            cls: 'sl-delete-warning-strong',
        });

        const expected = bookName;
        let typed = '';
        let deleteBtn: ButtonComponent;
        new Setting(modal.contentEl)
            .setName('Confirm by typing the book title')
            .setDesc(`Type "${expected}" to enable the Delete button.`)
            .addText((text: TextComponent) => {
                text.setPlaceholder(expected);
                text.onChange((v: string) => {
                    typed = v;
                    deleteBtn.setDisabled(v.trim() !== expected);
                });
                window.setTimeout(() => text.inputEl.focus(), 50);
            });

        new Setting(modal.contentEl)
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText('Cancel').onClick(() => modal.close());
            })
            .addButton((btn: ButtonComponent) => {
                deleteBtn = btn.setButtonText('Delete permanently').setClass('mod-warning').setDisabled(true);
                btn.onClick(async () => {
                    if (typed.trim() !== expected) return;
                    modal.close();
                    try {
                        const ok = await this.plugin.sceneManager.deleteProject(bookProject);
                        if (ok) {
                            this.plugin.refreshOpenViews();
                            this.render();
                        }
                    } catch (e: unknown) {
                        new Notice('Failed to delete book: ' + (e instanceof Error ? e.message : String(e)), 10000);
                    }
                });
            });
        modal.open();
    }

    private async renameBook(folder: string, _meta: SeriesMetadata, bookName: string) {
        const projects = this.plugin.sceneManager.getProjects();
        const bookProject = projects.find(p => {
            const fp = normalizePath(p.filePath);
            return fp.startsWith(normalizePath(folder) + '/')
                && (p.title === bookName || fp.split('/').slice(-2, -1)[0] === bookName);
        });

        if (!bookProject) {
            new Notice(`Could not find project "${bookName}".`);
            return;
        }

        const modal = new Modal(this.app);
        modal.titleEl.setText('Rename book');
        let newTitle = bookProject.title;

        new Setting(modal.contentEl)
            .setName('New title')
            .setDesc('Updates the book display title only. The folder and file identity stay unchanged.')
            .addText((text: TextComponent) => {
                text.setValue(bookProject.title);
                text.onChange((v: string) => (newTitle = v));
                window.setTimeout(() => { text.inputEl.focus(); text.inputEl.select(); }, 50);
            });

        new Setting(modal.contentEl)
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText('Rename').setCta().onClick(async () => {
                    if (!newTitle.trim() || newTitle.trim() === bookProject.title) {
                        modal.close();
                        return;
                    }
                    try {
                        await this.plugin.sceneManager.renameProject(bookProject, newTitle.trim());
                        new Notice(`Book renamed to "${newTitle.trim()}"`);
                        modal.close();
                        this.plugin.refreshOpenViews();
                        this.render();
                    } catch (e: unknown) {
                        new Notice((e instanceof Error ? e.message : String(e)), 10000);
                    }
                });
            });

        modal.open();
    }

    private async addBookToSeries(folder: string, meta: SeriesMetadata) {
        // Show a dropdown of projects not already in any series
        const projects = this.plugin.sceneManager.getProjects().filter(p => !p.seriesId && !p.seriesUuid);

        if (projects.length === 0) {
            new Notice('No standalone projects found to add. Create a new project first.');
            return;
        }

        const modal = new Modal(this.app);
        modal.titleEl.setText(`Add book to "${meta.name}"`);
        let selectedPath = projects[0].filePath;

        new Setting(modal.contentEl)
            .setName('Project')
            .setDesc('Select a standalone project to add to this series.')
            .addDropdown((dropdown: DropdownComponent) => {
                for (const p of projects) {
                    dropdown.addOption(p.filePath, p.title);
                }
                dropdown.onChange((v: string) => (selectedPath = v));
            });

        new Setting(modal.contentEl)
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText('Add to series').setCta().onClick(async () => {
                    const bookProject = projects.find(p => p.filePath === selectedPath);
                    if (!bookProject) return;
                    modal.close();

                    const previousActive = this.plugin.sceneManager.activeProject;
                    await this.plugin.sceneManager.setActiveProject(bookProject);
                    try {
                        await this.plugin.seriesManager.addProjectToSeries(folder);
                    } catch (e: unknown) {
                        new Notice((e instanceof Error ? e.message : String(e)), 10000);
                        return;
                    }
                    // Restore previous active project
                    if (previousActive && previousActive.filePath !== bookProject.filePath) {
                        await this.plugin.sceneManager.scanProjects();
                        const refreshed = this.plugin.sceneManager.getProjects().find(p => p.filePath === previousActive.filePath);
                        if (refreshed) await this.plugin.sceneManager.setActiveProject(refreshed);
                    }
                    this.plugin.refreshOpenViews();
                    this.render();
                });
            });

        modal.open();
    }
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, no-useless-escape -- end of file-wide suppression block opened at line 1 */
