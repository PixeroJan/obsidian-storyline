import { App, TFile, TFolder, parseYaml, stringifyYaml, normalizePath } from 'obsidian';
import {
    StoryWorld, StoryLocation, WorldOrLocation,
    WORLD_FIELD_KEYS, LOCATION_FIELD_KEYS,
} from '../models/Location';

/**
 * Manages world & location .md files — loading, saving, creating, deleting.
 *
 * Both types live in the project's Locations/ folder.
 * Worlds are top-level .md files; locations can live at top-level or
 * inside a subfolder named after their world.
 */
export class LocationManager {
    private app: App;
    private worlds: Map<string, StoryWorld> = new Map();
    private locations: Map<string, StoryLocation> = new Map();

    constructor(app: App) {
        this.app = app;
    }

    // ── Loading ────────────────────────────────────────

    /**
     * Recursively scan the Locations folder for world and location files.
     * Uses the vault adapter (filesystem) for reliable discovery of
     * externally-created or synced files.
     */
    async loadAll(folderPath: string): Promise<void> {
        this.worlds.clear();
        this.locations.clear();
        await this.scanFolderAdapter(folderPath);
    }

    private async scanFolderAdapter(folderPath: string): Promise<void> {
        const adapter = this.app.vault.adapter;
        if (!await adapter.exists(folderPath)) return;

        const listing = await adapter.list(folderPath);
        for (const f of listing.files) {
            if (f.endsWith('.md')) {
                try {
                    const filePath = normalizePath(f);
                    const content = await adapter.read(filePath);
                    this.parseAndStoreContent(content, filePath);
                } catch { /* file unreadable — skip */ }
            }
        }
        for (const sub of listing.folders) {
            await this.scanFolderAdapter(normalizePath(sub));
        }
    }

    private parseAndStoreContent(content: string, filePath: string): void {
        const fm = this.extractFrontmatter(content);
        if (!fm) return;

        const body = this.extractBody(content);
        const basename = filePath.split('/').pop()?.replace(/\.md$/i, '') ?? filePath;

        if (fm.type === 'world') {
            const world: StoryWorld = {
                filePath,
                type: 'world',
                name: fm.name || basename,
                image: fm.image,
                description: fm.description,
                geography: fm.geography,
                culture: fm.culture,
                politics: fm.politics,
                magicTechnology: fm.magicTechnology,
                beliefs: fm.beliefs,
                economy: fm.economy,
                history: fm.history,
                custom: fm.custom && typeof fm.custom === 'object' ? fm.custom : undefined,
                created: fm.created,
                modified: fm.modified,
                notes: body || undefined,
            };
            this.worlds.set(filePath, world);
        } else if (fm.type === 'location') {
            const loc: StoryLocation = {
                filePath,
                type: 'location',
                name: fm.name || basename,
                image: fm.image,
                locationType: fm.locationType,
                world: fm.world,
                parent: fm.parent,
                description: fm.description,
                atmosphere: fm.atmosphere,
                significance: fm.significance,
                inhabitants: fm.inhabitants,
                connectedLocations: fm.connectedLocations,
                mapNotes: fm.mapNotes,
                custom: fm.custom && typeof fm.custom === 'object' ? fm.custom : undefined,
                created: fm.created,
                modified: fm.modified,
                notes: body || undefined,
            };
            this.locations.set(filePath, loc);
        }
    }

    // ── Getters ────────────────────────────────────────

    getAllWorlds(): StoryWorld[] {
        return Array.from(this.worlds.values()).sort((a, b) =>
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
    }

    getAllLocations(): StoryLocation[] {
        return Array.from(this.locations.values()).sort((a, b) =>
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
    }

    getWorld(filePath: string): StoryWorld | undefined {
        return this.worlds.get(filePath);
    }

    getLocation(filePath: string): StoryLocation | undefined {
        return this.locations.get(filePath);
    }

    getItem(filePath: string): WorldOrLocation | undefined {
        return this.worlds.get(filePath) ?? this.locations.get(filePath);
    }

    /** Get locations that belong to a specific world */
    getLocationsForWorld(worldName: string): StoryLocation[] {
        const lower = worldName.toLowerCase();
        return this.getAllLocations().filter(l => l.world?.toLowerCase() === lower);
    }

    /** Get child locations of a parent location */
    getChildLocations(parentName: string): StoryLocation[] {
        const lower = parentName.toLowerCase();
        return this.getAllLocations().filter(l => l.parent?.toLowerCase() === lower);
    }

    /** Get locations that do not belong to any world */
    getOrphanLocations(): StoryLocation[] {
        return this.getAllLocations().filter(l => !l.world);
    }

    /** Get top-level locations for a world (have world but no parent) */
    getTopLevelLocations(worldName: string): StoryLocation[] {
        const lower = worldName.toLowerCase();
        return this.getAllLocations().filter(
            l => l.world?.toLowerCase() === lower && !l.parent
        );
    }

    // ── Create ─────────────────────────────────────────

    async createWorld(folderPath: string, name: string): Promise<StoryWorld> {
        await this.ensureFolder(folderPath);
        const safeName = name.replace(/[\\/:*?"<>|]/g, '-');
        const filePath = normalizePath(`${folderPath}/${safeName}.md`);

        if (this.app.vault.getAbstractFileByPath(filePath)) {
            throw new Error(`World file already exists: ${filePath}`);
        }

        const now = new Date().toISOString().split('T')[0];
        const fm: Record<string, any> = { type: 'world', name, created: now, modified: now };
        await this.app.vault.create(filePath, `---\n${stringifyYaml(fm)}---\n`);

        // Also create a subfolder for locations in this world
        await this.ensureFolder(normalizePath(`${folderPath}/${safeName}`));

        const world: StoryWorld = { filePath, type: 'world', name, created: now, modified: now };
        this.worlds.set(filePath, world);
        return world;
    }

    async createLocation(folderPath: string, name: string, worldName?: string, parentName?: string): Promise<StoryLocation> {
        // If the location has a world, place it inside the world's subfolder
        let targetFolder = folderPath;
        if (worldName) {
            const safeName = worldName.replace(/[\\/:*?"<>|]/g, '-');
            targetFolder = normalizePath(`${folderPath}/${safeName}`);
        }
        await this.ensureFolder(targetFolder);

        const safeLocName = name.replace(/[\\/:*?"<>|]/g, '-');
        const filePath = normalizePath(`${targetFolder}/${safeLocName}.md`);

        if (this.app.vault.getAbstractFileByPath(filePath)) {
            throw new Error(`Location file already exists: ${filePath}`);
        }

        const now = new Date().toISOString().split('T')[0];
        const fm: Record<string, any> = { type: 'location', name, created: now, modified: now };
        if (worldName) fm.world = worldName;
        if (parentName) fm.parent = parentName;
        await this.app.vault.create(filePath, `---\n${stringifyYaml(fm)}---\n`);

        const loc: StoryLocation = { filePath, type: 'location', name, world: worldName, parent: parentName, created: now, modified: now };
        this.locations.set(filePath, loc);
        return loc;
    }

    // ── Save ───────────────────────────────────────────

    async saveWorld(world: StoryWorld): Promise<void> {
        const normalizedFilePath = normalizePath(world.filePath);
        await this.saveItem({ ...world, filePath: normalizedFilePath }, WORLD_FIELD_KEYS as string[]);
        this.worlds.set(normalizedFilePath, { ...world, filePath: normalizedFilePath });
    }

    async saveLocation(location: StoryLocation): Promise<void> {
        const normalizedFilePath = normalizePath(location.filePath);
        await this.saveItem({ ...location, filePath: normalizedFilePath }, LOCATION_FIELD_KEYS as string[]);
        this.locations.set(normalizedFilePath, { ...location, filePath: normalizedFilePath });
    }

    private async saveItem(item: WorldOrLocation, fieldKeys: string[]): Promise<void> {
        const normalizedFilePath = normalizePath(item.filePath);
        const file = this.app.vault.getAbstractFileByPath(normalizedFilePath);
        if (!(file instanceof TFile)) {
            throw new Error(`File not found: ${normalizedFilePath}`);
        }

        const content = await this.app.vault.read(file);
        const existingFm = this.extractFrontmatter(content) || {};
        const body = this.extractBody(content);

        const fm: Record<string, any> = { ...existingFm };
        fm.type = item.type;
        fm.name = item.name;
        fm.modified = new Date().toISOString().split('T')[0];
        if (item.created) fm.created = item.created;

        for (const key of fieldKeys) {
            if (key === 'name') continue;
            const val = (item as any)[key];
            if (val !== undefined && val !== null && val !== '') {
                fm[key] = val;
            } else {
                delete fm[key];
            }
        }

        if (item.custom && Object.keys(item.custom).length > 0) {
            fm.custom = item.custom;
        } else {
            delete fm.custom;
        }

        const finalBody = item.notes ?? body;
        const newContent = `---\n${stringifyYaml(fm)}---\n${finalBody ? '\n' + finalBody : ''}`;
        await this.app.vault.modify(file, newContent);
    }

    // ── Delete ─────────────────────────────────────────

    async deleteItem(filePath: string): Promise<void> {
        const normalizedFilePath = normalizePath(filePath);
        const file = this.app.vault.getAbstractFileByPath(normalizedFilePath);
        if (file instanceof TFile) {
            await this.app.vault.trash(file, true);
        }
        this.worlds.delete(normalizedFilePath);
        this.locations.delete(normalizedFilePath);
    }

    // ── Helpers ────────────────────────────────────────

    private extractFrontmatter(content: string): Record<string, any> | null {
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!match) return null;
        try { return parseYaml(match[1]); }
        catch { return null; }
    }

    private extractBody(content: string): string {
        const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
        return match ? match[1].trim() : '';
    }

    private async ensureFolder(folderPath: string): Promise<void> {
        if (this.app.vault.getAbstractFileByPath(folderPath)) return;
        await this.app.vault.createFolder(folderPath);
    }
}
