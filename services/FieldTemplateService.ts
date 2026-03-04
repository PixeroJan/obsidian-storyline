import { App, normalizePath } from 'obsidian';

// ═══════════════════════════════════════════════════════
//  Universal Field Template Service
//
//  Stores field template definitions in the project's
//  System/field-templates.json so they sync across devices.
// ═══════════════════════════════════════════════════════

/** Type of input control for a universal field */
export type UniversalFieldType = 'text' | 'textarea' | 'dropdown';

/** A single universal field template definition */
export interface UniversalFieldTemplate {
    /** Unique ID (generated once, stable across edits) */
    id: string;
    /** Human-readable label shown in the UI */
    label: string;
    /** Which section this field belongs to (must match a CHARACTER_CATEGORIES title) */
    section: string;
    /** Input type */
    type: UniversalFieldType;
    /** Dropdown options (only used when type === 'dropdown') */
    options: string[];
    /** Placeholder / hint text */
    placeholder: string;
    /** Sort order within the section (higher = further down, default 0) */
    order: number;
}

/** On-disk shape of field-templates.json */
export interface FieldTemplateFile {
    version: number;
    fields: UniversalFieldTemplate[];
}

const EMPTY_FILE: FieldTemplateFile = { version: 1, fields: [] };

/**
 * Manages universal field templates stored in the project's System/ folder.
 * Templates define extra fields that appear on *every* character sheet in the
 * chosen section.  The actual per-character data lives in the character's
 * `universalFields` record (keyed by template id).
 */
export class FieldTemplateService {
    private app: App;
    private templates: UniversalFieldTemplate[] = [];
    /** Resolver set by the plugin so we don't depend on main.ts directly */
    private getSystemFolder: () => string;

    constructor(app: App, getSystemFolder: () => string) {
        this.app = app;
        this.getSystemFolder = getSystemFolder;
    }

    // ── Accessors ──────────────────────────────────────

    /** All loaded templates */
    getAll(): UniversalFieldTemplate[] {
        return [...this.templates];
    }

    /** Templates belonging to a specific section */
    getBySection(sectionTitle: string): UniversalFieldTemplate[] {
        return this.templates
            .filter(t => t.section === sectionTitle)
            .sort((a, b) => a.order - b.order);
    }

    /** Single template by ID */
    getById(id: string): UniversalFieldTemplate | undefined {
        return this.templates.find(t => t.id === id);
    }

    // ── CRUD ───────────────────────────────────────────

    /** Add a new template and persist */
    async add(template: UniversalFieldTemplate): Promise<void> {
        this.templates.push(template);
        await this.save();
    }

    /** Update an existing template in-place and persist */
    async update(id: string, patch: Partial<Omit<UniversalFieldTemplate, 'id'>>): Promise<void> {
        const t = this.templates.find(f => f.id === id);
        if (!t) return;
        Object.assign(t, patch);
        await this.save();
    }

    /** Remove a template by ID and persist */
    async remove(id: string): Promise<void> {
        this.templates = this.templates.filter(t => t.id !== id);
        await this.save();
    }

    /** Reorder: move template to a new position within its section */
    async reorder(id: string, newOrder: number): Promise<void> {
        const t = this.templates.find(f => f.id === id);
        if (!t) return;
        t.order = newOrder;
        await this.save();
    }

    // ── Persistence ────────────────────────────────────

    /** Load templates from System/field-templates.json */
    async load(): Promise<void> {
        try {
            const adapter = this.app.vault.adapter;
            const filePath = normalizePath(`${this.getSystemFolder()}/field-templates.json`);
            if (!await adapter.exists(filePath)) {
                this.templates = [];
                return;
            }
            const txt = await adapter.read(filePath);
            const data: FieldTemplateFile = JSON.parse(txt);
            if (Array.isArray(data.fields)) {
                this.templates = data.fields.map(f => ({
                    id: f.id ?? generateId(),
                    label: f.label ?? 'Untitled',
                    section: f.section ?? 'Other',
                    type: f.type ?? 'text',
                    options: Array.isArray(f.options) ? f.options : [],
                    placeholder: f.placeholder ?? '',
                    order: typeof f.order === 'number' ? f.order : 0,
                }));
            } else {
                this.templates = [];
            }
        } catch {
            this.templates = [];
        }
    }

    /** Save templates to System/field-templates.json */
    async save(): Promise<void> {
        try {
            const adapter = this.app.vault.adapter;
            const systemFolder = normalizePath(this.getSystemFolder());
            if (!await adapter.exists(systemFolder)) {
                await this.app.vault.createFolder(systemFolder);
            }
            const data: FieldTemplateFile = {
                version: 1,
                fields: this.templates,
            };
            await adapter.write(
                normalizePath(`${systemFolder}/field-templates.json`),
                JSON.stringify(data, null, 2),
            );
        } catch (e) {
            console.error('[StoryLine] FieldTemplateService.save():', e);
        }
    }
}

// ── Helpers ────────────────────────────────────────────

/** Generate a short unique ID */
export function generateId(): string {
    return `uf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
