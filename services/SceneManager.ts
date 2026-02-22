import { App, TFile, TFolder, Notice, normalizePath, parseYaml, stringifyYaml } from 'obsidian';
import { Scene, SceneFilter, SortConfig, SortField, STATUS_ORDER, FilterPreset, BeatSheetTemplate } from '../models/Scene';
import { StoryLineProject, deriveProjectFolders } from '../models/StoryLineProject';
import { MetadataParser } from './MetadataParser';
import { UndoManager } from './UndoManager';
import { SceneQueryService, ISceneStore } from './SceneQueryService';
import type SceneCardsPlugin from '../main';

/**
 * Manages CRUD operations, indexing, and project management for scenes.
 *
 * Query/filter/sort/statistics logic is delegated to SceneQueryService.
 * SceneManager implements ISceneStore to provide read-only scene access.
 */
export class SceneManager implements ISceneStore {
    private app: App;
    private plugin: SceneCardsPlugin;
    private scenes: Map<string, Scene> = new Map();
    private projects: Map<string, StoryLineProject> = new Map();
    private _activeProject: StoryLineProject | null = null;
    private initialized = false;
    public undoManager: UndoManager;
    /** Read-only query service for filtering, sorting, aggregation */
    public readonly queryService: SceneQueryService;

    constructor(app: App, plugin: SceneCardsPlugin) {
        this.app = app;
        this.plugin = plugin;
        this.undoManager = new UndoManager(app);
        this.queryService = new SceneQueryService(this);
    }

    // ── ISceneStore implementation ─────────────────────────

    /** Raw iterator over all scenes (for ISceneStore) */
    sceneValues(): Iterable<Scene> {
        return this.scenes.values();
    }

    // ────────────────────────────────────
    //  Project management
    // ────────────────────────────────────

    /** Get all discovered projects */
    getProjects(): StoryLineProject[] {
        return Array.from(this.projects.values());
    }

    /** Get the currently active project (may be null) */
    get activeProject(): StoryLineProject | null {
        return this._activeProject;
    }

    /** Computed scene folder for the active project (falls back to derived default) */
    getSceneFolder(): string {
        if (this._activeProject) return this._activeProject.sceneFolder;
        const root = this.plugin.settings.storyLineRoot;
        return `${root}/Scenes`;
    }

    /** Computed character folder for the active project */
    getCharacterFolder(): string {
        if (this._activeProject) return this._activeProject.characterFolder;
        const root = this.plugin.settings.storyLineRoot;
        return `${root}/Characters`;
    }

    /** Computed location folder for the active project */
    getLocationFolder(): string {
        if (this._activeProject) return this._activeProject.locationFolder;
        const root = this.plugin.settings.storyLineRoot;
        return `${root}/Locations`;
    }

    /**
     * Scan the StoryLine root folder for project .md files
     * (files with `type: storyline` in frontmatter).
     *
     * Uses the vault adapter (filesystem) API so that externally-created
     * files (e.g. sample projects, Dropbox-synced files) are discovered
     * even before Obsidian's vault index has caught up.
     */
    async scanProjects(): Promise<StoryLineProject[]> {
        this.projects.clear();
        const rootPath = this.plugin.settings.storyLineRoot;
        const adapter = this.app.vault.adapter;

        // Check if root exists on the filesystem
        if (!await adapter.exists(rootPath)) return [];

        const rootListing = await adapter.list(rootPath);

        // Helper: try to parse a .md file at the given path as a project
        const tryParse = async (filePath: string) => {
            if (!filePath.endsWith('.md')) return;
            try {
                const content = await adapter.read(filePath);
                const project = this.parseProjectContent(content, filePath);
                if (project) this.projects.set(filePath, project);
            } catch { /* file unreadable — skip */ }
        };

        // Support two layouts:
        // - Legacy: StoryLine/<Project>.md
        // - New:    StoryLine/<Project>/<Project>.md
        for (const f of rootListing.files) {
            await tryParse(f);
        }
        for (const folder of rootListing.folders) {
            try {
                const sub = await adapter.list(folder);
                for (const f of sub.files) {
                    await tryParse(f);
                }
            } catch { /* folder unreadable — skip */ }
        }

        // Restore active project from settings
        const savedPath = this.plugin.settings.activeProjectFile;
        if (savedPath && this.projects.has(savedPath)) {
            this._activeProject = this.projects.get(savedPath)!;
        } else if (this.projects.size > 0) {
            // Default to first project found
            this._activeProject = this.projects.values().next().value ?? null;
            if (this._activeProject) {
                this.plugin.settings.activeProjectFile = this._activeProject.filePath;
                await this.plugin.saveSettings();
            }
        }

        return this.getProjects();
    }

    /**
     * Create a new StoryLine project
     */
    async createProject(title: string, description = ''): Promise<StoryLineProject> {
        const rootPath = this.plugin.settings.storyLineRoot;
        await this.ensureFolder(rootPath);

        const safeName = title.replace(/[\\/:*?"<>|]/g, '-');
        const baseFolder = normalizePath(`${rootPath}/${safeName}`);
        const filePath = normalizePath(`${baseFolder}/${safeName}.md`);

        const folders = deriveProjectFolders(rootPath, safeName);
        const now = new Date().toISOString().split('T')[0];

        const frontmatter: Record<string, any> = {
            type: 'storyline',
            title,
            created: now,
        };
        const content = `---\n${stringifyYaml(frontmatter)}---\n${description}\n`;

        try {
            // Create base project folder first
            await this.ensureFolder(baseFolder);

            // Create project file inside the folder
            await this.app.vault.create(filePath, content);

            // Create subfolders
            await this.ensureFolder(folders.sceneFolder);
            await this.ensureFolder(folders.characterFolder);
            await this.ensureFolder(folders.locationFolder);

            // Create default view files inside project root
            const viewFiles = ['plotgrid.json', 'timeline.json', 'board.json', 'plotlines.json', 'stats.json'];
            const createdFiles: string[] = [];
            const updatedFiles: string[] = [];
            for (const vf of viewFiles) {
                const vfPath = normalizePath(`${baseFolder}/${vf}`);
                const contents = JSON.stringify({}, null, 2);
                const existing = this.app.vault.getAbstractFileByPath(vfPath) as TFile | null;
                if (!existing) {
                    await this.app.vault.create(vfPath, contents);
                    createdFiles.push(vfPath);
                } else {
                    try {
                        await this.app.vault.modify(existing, contents);
                        updatedFiles.push(vfPath);
                    } catch {
                        // If modify fails (rare), ignore and continue
                    }
                }
            }

            const project: StoryLineProject = {
                filePath,
                title,
                created: now,
                description,
                ...folders,
                definedActs: [],
                definedChapters: [],
                actLabels: {},
                chapterLabels: {},
                filterPresets: [],
            };

            this.projects.set(filePath, project);
            new Notice(`Project "${title}" created`);
            return project;
        } catch (err) {
            new Notice('Failed to create project file or folders: ' + String(err));
            throw err;
        }
    }

    /**
     * Switch to a different active project and re-index scenes.
     */
    async setActiveProject(project: StoryLineProject): Promise<void> {
        this._activeProject = project;
        this.plugin.settings.activeProjectFile = project.filePath;
        await this.plugin.saveSettings();
        await this.initialize();
        // Ask the plugin to refresh any open StoryLine views so the UI updates
        try {
            if (this.plugin && typeof this.plugin.refreshOpenViews === 'function') {
                this.plugin.refreshOpenViews();
            }
        } catch (e) {
            // non-fatal; UI may refresh on next file event
        }
    }

    /**
     * Duplicate an existing project (fork a variant).
     */
    async forkProject(source: StoryLineProject, newTitle: string): Promise<StoryLineProject> {
        const newProject = await this.createProject(newTitle, source.description);

        // Copy all scene files from source to new project
        const sourceFolder = this.app.vault.getAbstractFileByPath(source.sceneFolder);
        if (sourceFolder && sourceFolder instanceof TFolder) {
            for (const child of sourceFolder.children) {
                if (child instanceof TFile && child.extension === 'md') {
                    const content = await this.app.vault.read(child);
                    const newPath = normalizePath(`${newProject.sceneFolder}/${child.name}`);
                    await this.app.vault.create(newPath, content);
                }
            }
        }

        new Notice(`Forked "${source.title}" → "${newTitle}" (${sourceFolder instanceof TFolder ? sourceFolder.children.filter(c => c instanceof TFile).length : 0} scenes copied)`);
        return newProject;
    }

    /** Parse a single .md file as a StoryLine project */
    private async parseProjectFile(file: TFile): Promise<StoryLineProject | null> {
        const content = await this.app.vault.read(file);
        return this.parseProjectContent(content, file.path);
    }

    /**
     * Parse raw markdown/YAML content as a StoryLine project.
     * Used by both TFile-based and adapter-based scanning.
     * Handles both LF and CRLF line endings.
     */
    private parseProjectContent(content: string, filePath: string): StoryLineProject | null {
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fmMatch) return null;

        try {
            const fm = parseYaml(fmMatch[1]);
            if (fm?.type !== 'storyline') return null;

            // Derive basename from file path (strip directory + extension)
            const basename = filePath.split('/').pop()?.replace(/\.md$/i, '') ?? filePath;
            const title = fm.title || basename;
            const rootPath = this.plugin.settings.storyLineRoot;
            const safeName = basename;
            const folders = deriveProjectFolders(rootPath, safeName);

            return {
                filePath,
                title,
                created: fm.created || '',
                description: content.slice(fmMatch[0].length).trim(),
                ...folders,
                definedActs: Array.isArray(fm.acts) ? fm.acts.map(Number).filter((n: number) => !isNaN(n)) : [],
                definedChapters: Array.isArray(fm.chapters) ? fm.chapters.map(Number).filter((n: number) => !isNaN(n)) : [],
                actLabels: (fm.actLabels && typeof fm.actLabels === 'object') ? Object.fromEntries(Object.entries(fm.actLabels).map(([k, v]) => [Number(k), String(v)])) : {},
                chapterLabels: (fm.chapterLabels && typeof fm.chapterLabels === 'object') ? Object.fromEntries(Object.entries(fm.chapterLabels).map(([k, v]) => [Number(k), String(v)])) : {},
                filterPresets: Array.isArray(fm.filterPresets) ? fm.filterPresets : [],
            };
        } catch {
            return null;
        }
    }

    // ────────────────────────────────────
    //  Scene management
    // ────────────────────────────────────

    /**
     * Initialize: scan configured folders and build scene index.
     * Uses the vault adapter (filesystem) for reliable discovery of
     * externally-created or synced files.
     */
    async initialize(): Promise<void> {
        this.scenes.clear();
        const sceneFolder = this.getSceneFolder();
        await this.scanFolderAdapter(sceneFolder);
        this.initialized = true;
    }

    /**
     * Recursively scan a folder for scene files using the adapter API
     */
    private async scanFolderAdapter(folderPath: string): Promise<void> {
        const adapter = this.app.vault.adapter;
        if (!await adapter.exists(folderPath)) return;

        const listing = await adapter.list(folderPath);
        for (const f of listing.files) {
            if (f.endsWith('.md')) {
                try {
                    const content = await adapter.read(f);
                    const scene = MetadataParser.parseContent(content, f);
                    if (scene) {
                        this.scenes.set(f, scene);
                    }
                } catch { /* file unreadable — skip */ }
            }
        }
        for (const sub of listing.folders) {
            await this.scanFolderAdapter(sub);
        }
    }

    /**
     * Get all scenes
     */
    getAllScenes(): Scene[] {
        return Array.from(this.scenes.values());
    }

    /**
     * Get a scene by file path
     */
    getScene(filePath: string): Scene | undefined {
        return this.scenes.get(filePath);
    }

    /**
     * Apply filters and sorting to scenes
     * @deprecated Use queryService.getFilteredScenes() directly
     */
    getFilteredScenes(filter?: SceneFilter, sort?: SortConfig): Scene[] {
        return this.queryService.getFilteredScenes(filter, sort);
    }

    /**
     * Get scenes grouped by a field (for board view columns)
     * @deprecated Use queryService.getScenesGroupedBy() directly
     */
    getScenesGroupedBy(
        field: 'act' | 'chapter' | 'status' | 'pov',
        filter?: SceneFilter,
        sort?: SortConfig
    ): Map<string, Scene[]> {
        return this.queryService.getScenesGroupedBy(field, filter, sort);
    }

    /**
     * Create a new scene
     */
    async createScene(sceneData: Partial<Scene>, afterScene?: Scene): Promise<TFile> {
        const sceneFolder = this.getSceneFolder();

        // Ensure folder exists
        await this.ensureFolder(sceneFolder);

        // Determine subfolder based on act
        let targetFolder = sceneFolder;
        if (sceneData.act !== undefined) {
            targetFolder = normalizePath(`${sceneFolder}/Act ${sceneData.act}`);
            await this.ensureFolder(targetFolder);
        }

        // Auto-generate sequence if enabled
        if (this.plugin.settings.autoGenerateSequence) {
            sceneData.sequence = this.getNextSequence(afterScene);
        }

        // Generate filename
        const seqStr = sceneData.sequence !== undefined
            ? String(sceneData.sequence).padStart(2, '0')
            : '00';
        const actStr = sceneData.act !== undefined
            ? String(sceneData.act).padStart(2, '0')
            : '00';
        const safeTitle = (sceneData.title || 'Untitled')
            .replace(/[\\/:*?"<>|]/g, '-')
            .substring(0, 60);
        const fileName = `${actStr}-${seqStr} ${safeTitle}.md`;
        const filePath = normalizePath(`${targetFolder}/${fileName}`);

        // Generate content
        const content = MetadataParser.generateSceneContent(sceneData);

        // Create file
        const file = await this.app.vault.create(filePath, content);

        // Record undo snapshot for create
        this.undoManager.recordCreate(file.path, content, `Create "${sceneData.title || 'scene'}"`);

        // Add to index
        const scene = await MetadataParser.parseFile(this.app, file);
        if (scene) {
            this.scenes.set(file.path, scene);
        }

        return file;
    }

    /**
     * Update an existing scene's metadata
     */
    async updateScene(filePath: string, updates: Partial<Scene>): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!file || !(file instanceof TFile)) {
            new Notice('Scene file not found');
            return;
        }

        // Record undo snapshot before applying changes
        const oldSnap = this.scenes.get(filePath);
        if (oldSnap) {
            const label = `Update "${oldSnap.title}"`;
            this.undoManager.recordUpdate(filePath, oldSnap, updates, label);
        }

        await MetadataParser.updateFrontmatter(this.app, file, updates);

        // Refresh index
        const scene = await MetadataParser.parseFile(this.app, file);
        if (scene) {
            this.scenes.set(filePath, scene);
        }
    }

    /**
     * Delete a scene
     */
    async deleteScene(filePath: string): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!file || !(file instanceof TFile)) return;

        // Record undo snapshot before deleting
        const fileContent = await this.app.vault.read(file);
        const scene = this.scenes.get(filePath);
        const label = scene ? `Delete "${scene.title}"` : 'Delete scene';
        this.undoManager.recordDelete(filePath, fileContent, label);

        await this.app.vault.trash(file, true);
        this.scenes.delete(filePath);


    }

    /**
     * Duplicate a scene
     */
    async duplicateScene(filePath: string): Promise<TFile | null> {
        const scene = this.scenes.get(filePath);
        if (!scene) return null;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { filePath: _fp, body: _body, ...rest } = scene;
        const newScene: Partial<Scene> = {
            ...rest,
            title: `${scene.title} (copy)`,
            sequence: this.getNextSequence(scene),
        };

        return this.createScene(newScene);
    }

    /**
     * Move a scene to a different act/position (for drag-and-drop)
     */
    async moveScene(
        filePath: string,
        targetAct?: number | string,
        newSequence?: number
    ): Promise<void> {
        const updates: Partial<Scene> = {};
        if (targetAct !== undefined) updates.act = targetAct;
        if (newSequence !== undefined) updates.sequence = newSequence;

        await this.updateScene(filePath, updates);
    }

    /**
     * Resequence scenes after drag-and-drop
     */
    async resequenceScenes(orderedPaths: string[]): Promise<void> {
        for (let i = 0; i < orderedPaths.length; i++) {
            await this.updateScene(orderedPaths[i], { sequence: i + 1 });
        }
    }

    /**
     * Handle file changes (for watching file modifications)
     */
    async handleFileChange(file: TFile): Promise<void> {
        if (file.extension !== 'md') return;

        // Check if file is in scene folder
        if (!file.path.startsWith(this.getSceneFolder())) return;

        const scene = await MetadataParser.parseFile(this.app, file);
        if (scene) {
            this.scenes.set(file.path, scene);
        } else {
            this.scenes.delete(file.path);
        }
    }

    /**
     * Handle file deletion
     */
    handleFileDelete(filePath: string): void {
        this.scenes.delete(filePath);
    }

    /**
     * Handle file rename
     */
    async handleFileRename(file: TFile, oldPath: string): Promise<void> {
        this.scenes.delete(oldPath);
        if (file.extension === 'md' && file.path.startsWith(this.getSceneFolder())) {
            const scene = await MetadataParser.parseFile(this.app, file);
            if (scene) {
                this.scenes.set(file.path, scene);
            }
        }
    }

    /**
     * Get unique values for a field (for filter dropdowns)
     * @deprecated Use queryService.getUniqueValues() directly
     */
    getUniqueValues(field: 'act' | 'chapter' | 'pov' | 'status' | 'emotion' | 'location'): string[] {
        return this.queryService.getUniqueValues(field);
    }

    /**
     * Get all unique characters across scenes
     * @deprecated Use queryService.getAllCharacters() directly
     */
    getAllCharacters(): string[] {
        return this.queryService.getAllCharacters();
    }

    /**
     * Get all unique tags
     * @deprecated Use queryService.getAllTags() directly
     */
    getAllTags(): string[] {
        return this.queryService.getAllTags();
    }

    /**
     * Rename a plotline tag across all scenes that use it.
     */
    async renameTag(oldTag: string, newTag: string): Promise<number> {
        let count = 0;
        for (const scene of this.scenes.values()) {
            if (scene.tags && scene.tags.includes(oldTag)) {
                const newTags = scene.tags.map(t => t === oldTag ? newTag : t);
                await this.updateScene(scene.filePath, { tags: newTags });
                count++;
            }
        }
        return count;
    }

    /**
     * Delete a plotline tag from all scenes that use it.
     */
    async deleteTag(tag: string): Promise<number> {
        let count = 0;
        for (const scene of this.scenes.values()) {
            if (scene.tags && scene.tags.includes(tag)) {
                const newTags = scene.tags.filter(t => t !== tag);
                await this.updateScene(scene.filePath, { tags: newTags });
                count++;
            }
        }
        return count;
    }

    /**
     * Get project statistics
     * @deprecated Use queryService.getStatistics() directly
     */
    getStatistics() {
        return this.queryService.getStatistics();
    }

    // ────────────────────────────────────
    //  Story structure (empty acts/chapters)
    // ────────────────────────────────────

    /** Get all defined act numbers (including those with scenes) */
    getDefinedActs(): number[] {
        const fromProject = this._activeProject?.definedActs ?? [];
        const fromScenes = new Set<number>();
        for (const scene of this.scenes.values()) {
            if (scene.act !== undefined && typeof scene.act === 'number') {
                fromScenes.add(scene.act);
            } else if (scene.act !== undefined) {
                const n = Number(scene.act);
                if (!isNaN(n)) fromScenes.add(n);
            }
        }
        const merged = new Set([...fromProject, ...fromScenes]);
        return Array.from(merged).sort((a, b) => a - b);
    }

    /** Get all defined chapter numbers (including those with scenes) */
    getDefinedChapters(): number[] {
        const fromProject = this._activeProject?.definedChapters ?? [];
        const fromScenes = new Set<number>();
        for (const scene of this.scenes.values()) {
            if (scene.chapter !== undefined && typeof scene.chapter === 'number') {
                fromScenes.add(scene.chapter);
            } else if (scene.chapter !== undefined) {
                const n = Number(scene.chapter);
                if (!isNaN(n)) fromScenes.add(n);
            }
        }
        const merged = new Set([...fromProject, ...fromScenes]);
        return Array.from(merged).sort((a, b) => a - b);
    }

    /** Add empty acts (they persist even without scenes) */
    async addActs(actNumbers: number[]): Promise<void> {
        if (!this._activeProject) return;
        const existing = this._activeProject.definedActs;
        const merged = new Set([...existing, ...actNumbers]);
        this._activeProject.definedActs = Array.from(merged).sort((a, b) => a - b);
        await this.saveProjectFrontmatter(this._activeProject);
    }

    /** Remove an act definition (scenes in it are NOT deleted) */
    async removeAct(actNumber: number): Promise<void> {
        if (!this._activeProject) return;
        this._activeProject.definedActs = this._activeProject.definedActs.filter(a => a !== actNumber);
        await this.saveProjectFrontmatter(this._activeProject);
    }

    /** Add empty chapters */
    async addChapters(chapterNumbers: number[]): Promise<void> {
        if (!this._activeProject) return;
        const existing = this._activeProject.definedChapters;
        const merged = new Set([...existing, ...chapterNumbers]);
        this._activeProject.definedChapters = Array.from(merged).sort((a, b) => a - b);
        await this.saveProjectFrontmatter(this._activeProject);
    }

    /** Remove a chapter definition */
    async removeChapter(chapterNumber: number): Promise<void> {
        if (!this._activeProject) return;
        this._activeProject.definedChapters = this._activeProject.definedChapters.filter(c => c !== chapterNumber);
        await this.saveProjectFrontmatter(this._activeProject);
    }

    // ────────────────────────────────────
    //  Act labels (beat names)
    // ────────────────────────────────────

    /** Get the label for a specific act, or undefined */
    getActLabel(actNumber: number): string | undefined {
        return this._activeProject?.actLabels?.[actNumber];
    }

    /** Get all act labels */
    getActLabels(): Record<number, string> {
        return this._activeProject?.actLabels ?? {};
    }

    /** Set / update the label for a given act */
    async setActLabel(actNumber: number, label: string): Promise<void> {
        if (!this._activeProject) return;
        if (label.trim()) {
            this._activeProject.actLabels[actNumber] = label.trim();
        } else {
            delete this._activeProject.actLabels[actNumber];
        }
        await this.saveProjectFrontmatter(this._activeProject);
    }

    /** Get the label for a specific chapter, or undefined */
    getChapterLabel(chapterNumber: number): string | undefined {
        return this._activeProject?.chapterLabels?.[chapterNumber];
    }

    /** Get all chapter labels */
    getChapterLabels(): Record<number, string> {
        return this._activeProject?.chapterLabels ?? {};
    }

    /** Set / update the label for a given chapter */
    async setChapterLabel(chapterNumber: number, label: string): Promise<void> {
        if (!this._activeProject) return;
        if (label.trim()) {
            this._activeProject.chapterLabels[chapterNumber] = label.trim();
        } else {
            delete this._activeProject.chapterLabels[chapterNumber];
        }
        await this.saveProjectFrontmatter(this._activeProject);
    }

    /** Apply a beat sheet template — sets acts, chapters, and act labels */
    async applyBeatSheet(template: BeatSheetTemplate): Promise<void> {
        if (!this._activeProject) return;
        // Merge acts
        const mergedActs = new Set([...this._activeProject.definedActs, ...template.acts]);
        this._activeProject.definedActs = Array.from(mergedActs).sort((a, b) => a - b);
        // Merge chapters
        if (template.chapters.length > 0) {
            const mergedChapters = new Set([...this._activeProject.definedChapters, ...template.chapters]);
            this._activeProject.definedChapters = Array.from(mergedChapters).sort((a, b) => a - b);
        }
        // Apply act labels (overwrite existing for matching acts)
        for (const [act, label] of Object.entries(template.actLabels)) {
            this._activeProject.actLabels[Number(act)] = label;
        }
        // Apply chapter labels (overwrite existing for matching chapters)
        if (template.chapterLabels) {
            for (const [ch, label] of Object.entries(template.chapterLabels)) {
                this._activeProject.chapterLabels[Number(ch)] = label;
            }
        }
        await this.saveProjectFrontmatter(this._activeProject);
    }

    // ────────────────────────────────────
    //  Filter presets (per-project)
    // ────────────────────────────────────

    /** Get filter presets for the active project */
    getFilterPresets(): FilterPreset[] {
        return this._activeProject?.filterPresets ?? [];
    }

    /** Add a filter preset to the active project */
    async addFilterPreset(preset: FilterPreset): Promise<void> {
        if (!this._activeProject) return;
        this._activeProject.filterPresets.push(preset);
        await this.saveProjectFrontmatter(this._activeProject);
    }

    /** Remove a filter preset by index */
    async removeFilterPreset(index: number): Promise<void> {
        if (!this._activeProject) return;
        this._activeProject.filterPresets.splice(index, 1);
        await this.saveProjectFrontmatter(this._activeProject);
    }

    // ────────────────────────────────────
    //  Project frontmatter persistence
    // ────────────────────────────────────

    /**
     * Save project-specific data back to the project .md frontmatter.
     * Preserves the body content below the frontmatter.
     */
    async saveProjectFrontmatter(project: StoryLineProject): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(project.filePath);
        if (!file || !(file instanceof TFile)) return;

        const content = await this.app.vault.read(file);
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        let existingFm: Record<string, any> = {};
        let body = content;

        if (fmMatch) {
            try {
                existingFm = parseYaml(fmMatch[1]) || {};
            } catch {
                existingFm = {};
            }
            body = content.slice(fmMatch[0].length);
        }

        // Update project-specific fields
        existingFm.type = 'storyline';
        existingFm.title = project.title;
        existingFm.created = project.created;

        // Acts & chapters — only write if non-empty, remove if empty
        if (project.definedActs.length > 0) {
            existingFm.acts = project.definedActs;
        } else {
            delete existingFm.acts;
        }
        if (project.definedChapters.length > 0) {
            existingFm.chapters = project.definedChapters;
        } else {
            delete existingFm.chapters;
        }

        // Act labels (beat names)
        if (Object.keys(project.actLabels).length > 0) {
            existingFm.actLabels = project.actLabels;
        } else {
            delete existingFm.actLabels;
        }

        // Chapter labels
        if (Object.keys(project.chapterLabels).length > 0) {
            existingFm.chapterLabels = project.chapterLabels;
        } else {
            delete existingFm.chapterLabels;
        }

        // Filter presets
        if (project.filterPresets.length > 0) {
            existingFm.filterPresets = project.filterPresets;
        } else {
            delete existingFm.filterPresets;
        }

        const newContent = `---\n${stringifyYaml(existingFm)}---${body}`;
        await this.app.vault.modify(file, newContent);
    }

    /**
     * Get scenes grouped by field, including empty groups for defined acts/chapters
     */
    /**
     * Get scenes grouped by field, including empty groups for defined acts/chapters
     * @deprecated Use queryService.getScenesGroupedByWithEmpty() directly
     */
    getScenesGroupedByWithEmpty(
        field: 'act' | 'chapter' | 'status' | 'pov',
        filter?: SceneFilter,
        sort?: SortConfig
    ): Map<string, Scene[]> {
        return this.queryService.getScenesGroupedByWithEmpty(
            field, filter, sort,
            this.getDefinedActs(),
            this.getDefinedChapters()
        );
    }

    // --- Private helpers ---

    private getNextSequence(afterScene?: Scene): number {
        const allSequences = this.getAllScenes()
            .map(s => s.sequence ?? 0)
            .sort((a, b) => a - b);

        if (afterScene?.sequence !== undefined) {
            return afterScene.sequence + 1;
        }

        return allSequences.length > 0 ? allSequences[allSequences.length - 1] + 1 : 1;
    }

    private async ensureFolder(folderPath: string): Promise<void> {
        const normalized = normalizePath(folderPath);
        const existing = this.app.vault.getAbstractFileByPath(normalized);
        if (!existing) {
            await this.app.vault.createFolder(normalized);
        }
    }
}
