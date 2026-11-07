import { App } from 'obsidian';
import type { Scene } from '../models/Scene';

export interface ArcRecord {
    id?: string;
    name: string;
    color?: string;
    description?: string;
    sceneIds?: unknown[];
    endedAtSceneId?: string;
    ended?: boolean;
    [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function normalizePlotlineName(name: string): string {
    return name.trim().toLowerCase();
}

export function matchesArcScenePath(scenePath: string, arcScenePath: string): boolean {
    const normalizedScenePath = scenePath.replace(/\\/g, '/');
    const normalizedArcPath = arcScenePath.replace(/\\/g, '/');
    return normalizedScenePath === normalizedArcPath
        || normalizedScenePath.endsWith(`/${normalizedArcPath}`);
}

export class ArcManager {
    private rawRoot: unknown = [];
    private records: ArcRecord[] = [];
    private envelopeKey: string | null = null;
    private dirty = false;
    private writable = true;

    constructor(
        private app: App,
        private getSystemFolder: () => string,
    ) {}

    getAll(): readonly ArcRecord[] {
        return this.records;
    }

    getByName(name: string): ArcRecord | undefined {
        const normalized = normalizePlotlineName(name);
        return this.records.find(record => normalizePlotlineName(record.name) === normalized);
    }

    async load(): Promise<void> {
        const path = `${this.getSystemFolder()}/arcs.json`;
        const adapter = this.app.vault.adapter;
        this.dirty = false;
        this.envelopeKey = null;
        this.writable = true;

        if (await adapter.exists(path)) {
            try {
                this.rawRoot = JSON.parse(await adapter.read(path)) as unknown;
            } catch {
                this.rawRoot = null;
                this.records = [];
                this.writable = false;
                return;
            }
        } else {
            this.rawRoot = [];
        }

        if (Array.isArray(this.rawRoot)) {
            this.records = this.rawRoot.filter((value): value is ArcRecord =>
                isRecord(value) && typeof value.name === 'string');
        } else if (isRecord(this.rawRoot)) {
            const key = ['arcs', 'records', 'plotlines'].find(candidate => Array.isArray(this.rawRoot[candidate]));
            this.envelopeKey = key ?? 'arcs';
            const rows = key ? this.rawRoot[key] as unknown[] : [];
            this.records = rows.filter((value): value is ArcRecord =>
                isRecord(value) && typeof value.name === 'string');
        } else {
            this.records = [];
        }

    }

    reconcileSettings(
        tagColors: Record<string, string>,
        plotlineDescriptions: Record<string, string>,
    ): void {
        for (const arc of this.records) {
            const colorKey = this.findNormalizedKey(tagColors, arc.name);
            if (!colorKey && typeof arc.color === 'string' && arc.color.trim()) {
                tagColors[arc.name] = arc.color;
            }
            const descriptionKey = this.findNormalizedKey(plotlineDescriptions, arc.name);
            if (!descriptionKey && typeof arc.description === 'string' && arc.description.trim()) {
                plotlineDescriptions[arc.name] = arc.description;
            }
        }
    }

    async setEnding(
        plotlineName: string,
        endpoint: Scene | undefined,
        taggedScenes: Scene[],
        metadata: { color?: string; description?: string },
    ): Promise<void> {
        let arc = this.getByName(plotlineName);
        if (!arc && !endpoint) return;
        if (!arc) {
            arc = { id: crypto.randomUUID(), name: plotlineName, sceneIds: [] };
            this.records.push(arc);
        }
        if (!arc.id) arc.id = crypto.randomUUID();
        if (!arc.name.trim()) arc.name = plotlineName;

        const sceneIds = taggedScenes.map(scene => this.toProjectRelativeScenePath(scene.filePath));
        arc.sceneIds = this.unionSceneIds(arc.sceneIds, sceneIds);

        if (!arc.color && metadata.color) arc.color = metadata.color;
        if (!arc.description && metadata.description) arc.description = metadata.description;
        if (endpoint) arc.endedAtSceneId = this.toProjectRelativeScenePath(endpoint.filePath);
        else delete arc.endedAtSceneId;
        delete arc.ended;

        this.dirty = true;
        await this.save();
    }

    async updateMetadata(
        plotlineName: string,
        metadata: { color?: string; description?: string },
        taggedScenes: Scene[],
    ): Promise<void> {
        let arc = this.getByName(plotlineName);
        const hasMetadata = !!metadata.color?.trim() || !!metadata.description?.trim();
        if (!arc && !hasMetadata) return;
        if (!arc) {
            arc = { id: crypto.randomUUID(), name: plotlineName, sceneIds: [] };
            this.records.push(arc);
        }
        if (!arc.id) arc.id = crypto.randomUUID();

        const sceneIds = taggedScenes.map(scene => this.toProjectRelativeScenePath(scene.filePath));
        arc.sceneIds = this.unionSceneIds(arc.sceneIds, sceneIds);

        if (metadata.color !== undefined) {
            if (metadata.color.trim()) arc.color = metadata.color;
            else delete arc.color;
        }
        if (metadata.description !== undefined) {
            if (metadata.description.trim()) arc.description = metadata.description;
            else delete arc.description;
        }

        this.dirty = true;
        await this.save();
    }

    async renamePlotline(oldName: string, newName: string): Promise<void> {
        const source = this.getByName(oldName);
        if (!source) return;
        const destination = this.records.find(record =>
            record !== source && normalizePlotlineName(record.name) === normalizePlotlineName(newName));

        if (!destination) {
            source.name = newName;
        } else {
            for (const [key, value] of Object.entries(source)) {
                if (key === 'id' || key === 'name' || key === 'sceneIds' || key === 'endedAtSceneId') continue;
                if (this.isEmpty(destination[key]) && !this.isEmpty(value)) destination[key] = value;
            }
            destination.sceneIds = this.unionSceneIds(destination.sceneIds, source.sceneIds);
            if (!destination.endedAtSceneId && source.endedAtSceneId) {
                destination.endedAtSceneId = source.endedAtSceneId;
            }
            this.records = this.records.filter(record => record !== source);
        }

        this.dirty = true;
        await this.save();
    }

    async deletePlotline(name: string): Promise<void> {
        const normalized = normalizePlotlineName(name);
        const remaining = this.records.filter(record => normalizePlotlineName(record.name) !== normalized);
        if (remaining.length === this.records.length) return;
        this.records = remaining;
        this.dirty = true;
        await this.save();
    }

    async renameScenePath(oldPath: string, newPath: string): Promise<void> {
        const oldReference = this.toProjectRelativeScenePath(oldPath);
        const newReference = this.toProjectRelativeScenePath(newPath);
        let changed = false;

        for (const arc of this.records) {
            if (Array.isArray(arc.sceneIds)) {
                const sceneIds = arc.sceneIds.map(sceneId => {
                    if (sceneId !== oldPath && sceneId !== oldReference) return sceneId;
                    changed = true;
                    return newReference;
                });
                arc.sceneIds = this.unionSceneIds(sceneIds);
            }
            if (arc.endedAtSceneId === oldPath || arc.endedAtSceneId === oldReference) {
                arc.endedAtSceneId = newReference;
                changed = true;
            }
        }

        if (changed) {
            this.dirty = true;
            await this.save();
        }
    }

    async save(): Promise<void> {
        if (!this.dirty) return;
        if (!this.writable) throw new Error('The existing arcs.json file could not be read and was not overwritten.');

        const folder = this.getSystemFolder();
        const adapter = this.app.vault.adapter;
        if (!await adapter.exists(folder)) await this.app.vault.createFolder(folder);
        const path = `${folder}/arcs.json`;
        const output = Array.isArray(this.rawRoot)
            ? this.records
            : { ...(isRecord(this.rawRoot) ? this.rawRoot : {}), [this.envelopeKey || 'arcs']: this.records };
        await adapter.write(path, JSON.stringify(output, null, 2));
        this.rawRoot = output;
        this.dirty = false;
    }

    async migrateLegacyEndings(scenes: Scene[]): Promise<void> {
        let changed = false;
        const ordered = [...scenes].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
        const sceneReferences = new Map<string, string>();
        for (const scene of ordered) {
            const reference = this.toProjectRelativeScenePath(scene.filePath);
            sceneReferences.set(scene.filePath, reference);
            if (scene.id?.trim()) sceneReferences.set(scene.id, reference);
        }

        for (const arc of this.records) {
            if (Array.isArray(arc.sceneIds)) {
                const sceneIds = arc.sceneIds.map(sceneId =>
                    typeof sceneId === 'string' ? sceneReferences.get(sceneId) ?? sceneId : sceneId);
                if (JSON.stringify(sceneIds) !== JSON.stringify(arc.sceneIds)) {
                    arc.sceneIds = this.unionSceneIds(sceneIds);
                    changed = true;
                }
            }
            if (typeof arc.endedAtSceneId === 'string') {
                const reference = sceneReferences.get(arc.endedAtSceneId);
                if (reference && reference !== arc.endedAtSceneId) {
                    arc.endedAtSceneId = reference;
                    changed = true;
                }
            }

            if (arc.ended !== true || (typeof arc.endedAtSceneId === 'string' && arc.endedAtSceneId)) continue;
            const name = normalizePlotlineName(arc.name);
            const tagged = ordered.filter(scene => scene.tags?.some(tag => normalizePlotlineName(tag) === name));
            const endpoint = tagged[tagged.length - 1];
            if (!endpoint) continue;
            arc.endedAtSceneId = this.toProjectRelativeScenePath(endpoint.filePath);
            delete arc.ended;
            changed = true;
        }
        if (changed) {
            this.dirty = true;
            await this.save();
        }
    }

    private unionSceneIds(...values: Array<unknown[] | undefined>): unknown[] {
        const byId = new Map<string, unknown>();
        for (const list of values) {
            for (const value of list || []) {
                if (value === undefined || value === null || value === '') continue;
                const key = JSON.stringify(value) ?? '';
                if (!byId.has(key)) byId.set(key, value);
            }
        }
        return Array.from(byId.values());
    }

    private toProjectRelativeScenePath(scenePath: string): string {
        const systemFolder = this.getSystemFolder().replace(/\\/g, '/').replace(/\/$/, '');
        const projectFolder = systemFolder.replace(/\/System$/i, '');
        const normalizedScenePath = scenePath.replace(/\\/g, '/');
        return normalizedScenePath.startsWith(`${projectFolder}/`)
            ? normalizedScenePath.slice(projectFolder.length + 1)
            : normalizedScenePath;
    }

    private findNormalizedKey(values: Record<string, string>, name: string): string | undefined {
        const normalized = normalizePlotlineName(name);
        return Object.keys(values).find(key => normalizePlotlineName(key) === normalized);
    }

    private isEmpty(value: unknown): boolean {
        return value === undefined || value === null || value === ''
            || (Array.isArray(value) && value.length === 0);
    }
}