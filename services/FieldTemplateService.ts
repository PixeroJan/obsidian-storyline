/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { App, normalizePath } from 'obsidian';

// ═══════════════════════════════════════════════════════
//  Universal Field Template Service
//
//  Stores field template definitions in the project's
//  System/field-templates.json so they sync across devices.
// ═══════════════════════════════════════════════════════

/** Type of input control for a universal field */
export type UniversalFieldType = 'text' | 'textarea' | 'dropdown' | 'multi-select';

/** A single universal field template definition */
export interface UniversalFieldTemplate {
    /** Unique ID (generated once, stable across edits) */
    id: string;
    /** Human-readable label shown in the UI */
    label: string;
    /** Which section this field belongs to (must match a category section title) */
    section: string;
    /** Which entity category this field belongs to (e.g. 'character', 'location', 'items', 'creatures'). Empty/undefined = 'character' for backward compat. */
    category?: string;
    /** Input type */
    type: UniversalFieldType;
    /** Dropdown options (used when type === 'dropdown' or 'multi-select') */
    options: string[];
    /** Optional vault folder path whose note names are used as selectable options */
    folderSource?: string;
    /** Placeholder / hint text */
    placeholder: string;
    /** Sort order within the section (higher = further down, default 0) */
    order: number;
    /**
     * Issue #71 — when set, the field's value is mirrored to a top-level
     * YAML key with this name (in addition to `universalFields[id]`).
     * This makes the value visible to Obsidian Properties, Bases, and
     * Dataview without requiring users to dig into nested objects.
     */
    topLevelKey?: string;
    /**
     * Issue #77 — optional default value applied when a new entity
     * (currently scenes) is created. For multi-select fields this can be
     * a comma-separated string; the consumer normalises it.
     */
    defaultValue?: string;
}

/** A single entry in a section's merged display order (issue #92 follow-up). */
export interface SectionOrderEntry {
    /** 'builtin' = StoryLine-defined field (keyed by field.key), 'universal' = template (keyed by tpl.id). */
    kind: 'builtin' | 'universal';
    /** field.key for built-ins, tpl.id for universal fields. */
    key: string;
}

/** On-disk shape of field-templates.json */
export interface FieldTemplateFile {
    version: number;
    fields: UniversalFieldTemplate[];
    /**
     * Per-section ordering of all visible fields (built-in + universal).
     * Map key is `${section}|${category||''}`. Missing keys fall back to
     * the natural order (built-ins first, then universals by `order`).
     * Added in v1.9.x to let users interleave universal fields between
     * built-in fields within a section.
     */
    sectionOrders?: Record<string, SectionOrderEntry[]>;
}


/**
 * Change event fired by {@link FieldTemplateService} after a template is
 * added, updated, or removed. The plugin uses this to keep entity files'
 * top-level YAML in sync with the template's `topLevelKey` / `folderSource`
 * settings (issue #71 follow-up: existing entries should auto-migrate).
 */
export interface FieldTemplateChange {
    type: 'add' | 'update' | 'remove';
    id: string;
    /** Snapshot of the template *after* the change (undefined for `remove`). */
    template?: UniversalFieldTemplate;
    /** topLevelKey value *before* the change (set on update / remove). */
    oldTopLevelKey?: string;
    /** Whether the topLevelKey changed during this update. */
    topLevelKeyChanged?: boolean;
    /** Whether the folderSource flag changed during this update. */
    folderSourceChanged?: boolean;
}

/**
 * Manages universal field templates stored in the project's System/ folder.
 * Templates define extra fields that appear on *every* character sheet in the
 * chosen section.  The actual per-character data lives in the character's
 * `universalFields` record (keyed by template id).
 */
export class FieldTemplateService {
    private app: App;
    private templates: UniversalFieldTemplate[] = [];
    /** Per-section ordering (built-in + universal interleaved). See {@link SectionOrderEntry}. */
    private sectionOrders: Record<string, SectionOrderEntry[]> = {};
    /** Resolver set by the plugin so we don't depend on main.ts directly */
    private getSystemFolder: () => string;
    private onChange?: (change: FieldTemplateChange) => void | Promise<void>;

    constructor(app: App, getSystemFolder: () => string) {
        this.app = app;
        this.getSystemFolder = getSystemFolder;
    }

    /** Register a callback to run after add/update/remove. Used for migrations. */
    setOnChange(fn: (change: FieldTemplateChange) => void | Promise<void>): void {
        this.onChange = fn;
    }


    // ── Accessors ──────────────────────────────────────

    /** All loaded templates */
    getAll(): UniversalFieldTemplate[] {
        return [...this.templates];
    }

    /** Templates belonging to a specific section, optionally scoped by category */
    getBySection(sectionTitle: string, category?: string): UniversalFieldTemplate[] {
        return this.templates
            .filter(t => {
                if (t.section !== sectionTitle) return false;
                // Scope by category if provided
                if (category !== undefined) {
                    const tCat = t.category || 'character';
                    return tCat === category;
                }
                return true;
            })
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
        try {
            await this.onChange?.({
                type: 'add',
                id: template.id,
                template,
                topLevelKeyChanged: !!template.topLevelKey,
                folderSourceChanged: !!template.folderSource,
            });
        } catch (e) { console.error('[StoryLine] FieldTemplate onChange (add):', e); }
    }

    /** Update an existing template in-place and persist */
    async update(id: string, patch: Partial<Omit<UniversalFieldTemplate, 'id'>>): Promise<void> {
        const t = this.templates.find(f => f.id === id);
        if (!t) return;
        const oldTopLevelKey = t.topLevelKey;
        const oldFolderSource = t.folderSource;
        Object.assign(t, patch);
        await this.save();
        try {
            await this.onChange?.({
                type: 'update',
                id,
                template: { ...t },
                oldTopLevelKey,
                topLevelKeyChanged: oldTopLevelKey !== t.topLevelKey,
                folderSourceChanged: oldFolderSource !== t.folderSource,
            });
        } catch (e) { console.error('[StoryLine] FieldTemplate onChange (update):', e); }
    }

    /** Remove a template by ID and persist */
    async remove(id: string): Promise<void> {
        const removed = this.templates.find(t => t.id === id);
        this.templates = this.templates.filter(t => t.id !== id);
        await this.save();
        try {
            await this.onChange?.({
                type: 'remove',
                id,
                oldTopLevelKey: removed?.topLevelKey,
                topLevelKeyChanged: !!removed?.topLevelKey,
            });
        } catch (e) { console.error('[StoryLine] FieldTemplate onChange (remove):', e); }
    }

    /** Reorder: move template to a new position within its section */
    async reorder(id: string, newOrder: number): Promise<void> {
        const t = this.templates.find(f => f.id === id);
        if (!t) return;
        t.order = newOrder;
        await this.save();
    }

    /**
     * Issue #92 — move a template up by one position within its (section, category) scope.
     * Swaps order with the previous sibling.
     */
    async moveUp(id: string): Promise<void> {
        const t = this.templates.find(f => f.id === id);
        if (!t) return;
        const siblings = this.getBySection(t.section, t.category);
        const idx = siblings.findIndex(s => s.id === id);
        if (idx <= 0) return;
        // Normalize all sibling orders to 0..n then swap
        siblings.forEach((s, i) => { s.order = i; });
        const prev = siblings[idx - 1];
        const tmp = prev.order;
        prev.order = t.order;
        t.order = tmp;
        await this.save();
    }

    /**
     * Issue #92 — move a template down by one position within its (section, category) scope.
     */
    async moveDown(id: string): Promise<void> {
        const t = this.templates.find(f => f.id === id);
        if (!t) return;
        const siblings = this.getBySection(t.section, t.category);
        const idx = siblings.findIndex(s => s.id === id);
        if (idx < 0 || idx >= siblings.length - 1) return;
        siblings.forEach((s, i) => { s.order = i; });
        const next = siblings[idx + 1];
        const tmp = next.order;
        next.order = t.order;
        t.order = tmp;
        await this.save();
    }

    /**
     * Issue #92 — place an existing template directly after another sibling
     * (same section + category). Pass `null` to move to the top.
     * Normalises orders to 0..n.
     */
    async moveAfter(id: string, afterId: string | null): Promise<void> {
        const t = this.templates.find(f => f.id === id);
        if (!t) return;
        const siblings = this.getBySection(t.section, t.category).filter(s => s.id !== id);
        let insertIdx = 0;
        if (afterId) {
            const i = siblings.findIndex(s => s.id === afterId);
            insertIdx = i >= 0 ? i + 1 : siblings.length;
        }
        siblings.splice(insertIdx, 0, t);
        siblings.forEach((s, i) => { s.order = i; });
        await this.save();
    }

    // ── Merged ordering (built-in + universal) ─────────

    private sectionKey(section: string, category?: string): string {
        return `${section}|${category ?? ''}`;
    }

    /**
     * Resolve the full display order for a section, interleaving built-in
     * field keys with universal-field template ids. Any items missing from
     * the stored order are appended at the end (built-ins first in their
     * natural sequence, then universals sorted by their `order` value).
     */
    getMergedOrder(section: string, category: string | undefined, builtInKeys: string[]): SectionOrderEntry[] {
        const stored = this.sectionOrders[this.sectionKey(section, category)] ?? [];
        const builtInSet = new Set(builtInKeys);
        const universals = this.getBySection(section, category);
        const uniIds = new Set(universals.map(u => u.id));

        // Keep only stored entries that still exist; drop renames/removals.
        const result: SectionOrderEntry[] = [];
        const seen = new Set<string>();
        for (const e of stored) {
            if (e.kind === 'builtin' ? builtInSet.has(e.key) : uniIds.has(e.key)) {
                const tag = `${e.kind}:${e.key}`;
                if (!seen.has(tag)) { result.push(e); seen.add(tag); }
            }
        }
        // Append any built-ins not yet ordered, preserving their natural sequence.
        for (const bk of builtInKeys) {
            const tag = `builtin:${bk}`;
            if (!seen.has(tag)) { result.push({ kind: 'builtin', key: bk }); seen.add(tag); }
        }
        // Append any universals not yet ordered.
        for (const u of universals) {
            const tag = `universal:${u.id}`;
            if (!seen.has(tag)) { result.push({ kind: 'universal', key: u.id }); seen.add(tag); }
        }
        return result;
    }

    /** Persist a fully-resolved order for a section. */
    private async setSectionOrder(section: string, category: string | undefined, order: SectionOrderEntry[]): Promise<void> {
        this.sectionOrders[this.sectionKey(section, category)] = order.map(e => ({ kind: e.kind, key: e.key }));
        await this.save();
    }

    /** Move an entry (built-in or universal) one slot up within its section. */
    async moveEntryUp(
        section: string,
        category: string | undefined,
        builtInKeys: string[],
        kind: 'builtin' | 'universal',
        key: string,
    ): Promise<void> {
        const order = this.getMergedOrder(section, category, builtInKeys);
        const idx = order.findIndex(e => e.kind === kind && e.key === key);
        if (idx <= 0) return;
        [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
        await this.setSectionOrder(section, category, order);
    }

    /** Move an entry one slot down within its section. */
    async moveEntryDown(
        section: string,
        category: string | undefined,
        builtInKeys: string[],
        kind: 'builtin' | 'universal',
        key: string,
    ): Promise<void> {
        const order = this.getMergedOrder(section, category, builtInKeys);
        const idx = order.findIndex(e => e.kind === kind && e.key === key);
        if (idx < 0 || idx >= order.length - 1) return;
        [order[idx + 1], order[idx]] = [order[idx], order[idx + 1]];
        await this.setSectionOrder(section, category, order);
    }

    // ── Persistence ────────────────────────────────────

    /** Load templates from System/field-templates.json */
    async load(): Promise<void> {
        try {
            const adapter = this.app.vault.adapter;
            const filePath = normalizePath(`${this.getSystemFolder()}/field-templates.json`);
            if (!await adapter.exists(filePath)) {
                this.templates = [];
                this.sectionOrders = {};
                return;
            }
            const txt = await adapter.read(filePath);
            const data: FieldTemplateFile = JSON.parse(txt);
            this.sectionOrders = {};
            if (data.sectionOrders && typeof data.sectionOrders === 'object') {
                for (const [k, v] of Object.entries(data.sectionOrders)) {
                    if (!Array.isArray(v)) continue;
                    this.sectionOrders[k] = v
                        .filter((e): e is SectionOrderEntry =>
                            !!e && typeof e === 'object'
                            && (e.kind === 'builtin' || e.kind === 'universal')
                            && typeof e.key === 'string')
                        .map(e => ({ kind: e.kind, key: e.key }));
                }
            }
            if (Array.isArray(data.fields)) {
                this.templates = data.fields.map(f => ({
                    id: f.id ?? generateId(),
                    label: f.label ?? 'Untitled',
                    section: f.section ?? 'Other',
                    category: f.category,
                    type: f.type ?? 'text',
                    options: Array.isArray(f.options) ? f.options : [],
                    folderSource: f.folderSource,
                    placeholder: f.placeholder ?? '',
                    order: typeof f.order === 'number' ? f.order : 0,
                    topLevelKey: typeof f.topLevelKey === 'string' && f.topLevelKey.trim() ? f.topLevelKey.trim() : undefined,
                    defaultValue: typeof f.defaultValue === 'string' && f.defaultValue.length > 0 ? f.defaultValue : undefined,
                }));
            } else {
                this.templates = [];
            }
        } catch {
            this.templates = [];
            this.sectionOrders = {};
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
                sectionOrders: this.sectionOrders,
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

// ── Issue #71 — top-level YAML mirror for custom fields ──

/**
 * Reserved frontmatter keys that universal-field topLevelKey values must
 * never collide with. Editing these from a custom field would corrupt
 * core StoryLine data.
 */
export const RESERVED_TOP_LEVEL_KEYS: ReadonlySet<string> = new Set([
    'type', 'name', 'title', 'created', 'modified',
    'act', 'chapter', 'sequence', 'chronologicalOrder', 'chronological_order',
    'pov', 'characters', 'location', 'tags', 'status',
    'storyDate', 'story_date', 'storyTime', 'story_time', 'timeline',
    'conflict', 'emotion', 'intensity', 'wordcount', 'target_wordcount',
    'setup_scenes', 'payoff_scenes', 'codexLinks', 'beatsheet',
    'corkboardNote', 'corkboardNoteColor', 'corkboardNoteImage',
    'corkboardNoteCaption', 'plotgridOrigin', 'subtitle', 'color',
    'timeline_mode', 'timeline_strand',
    'image', 'gallery', 'tagline', 'role', 'occupation', 'residency',
    'family', 'appearance', 'personality', 'goal', 'belief', 'misbelief',
    'fears', 'flaws', 'strengths', 'relations', 'books',
    'world', 'parent', 'description', 'geography', 'culture', 'politics',
    'magicTechnology', 'beliefs', 'economy', 'history', 'locationType',
    'atmosphere', 'significance', 'inhabitants', 'connectedLocations',
    'mapNotes',
    'custom', 'universalFields', 'notes',
]);

/** Slugify a label into a YAML-safe top-level key. */
export function suggestTopLevelKey(label: string): string {
    return String(label || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40)
        || 'field';
}

/** True if a top-level key is safe to use (not reserved). */
export function isReservedTopLevelKey(key: string): boolean {
    return RESERVED_TOP_LEVEL_KEYS.has(String(key || '').trim());
}

/** Module-level template provider so parsers don't depend on plugin instance. */
let _templatesProvider: () => UniversalFieldTemplate[] = () => [];
let _topLevelMirrorEnabled = true;
export function setActiveTemplatesProvider(fn: () => UniversalFieldTemplate[]): void {
    _templatesProvider = fn;
}
export function setTopLevelMirrorEnabled(on: boolean): void {
    _topLevelMirrorEnabled = !!on;
}
export function getActiveTemplates(): UniversalFieldTemplate[] {
    try { return _templatesProvider() || []; } catch { return []; }
}

/**
 * Strip Obsidian wikilink brackets and any pipe-aliases off a value, leaving
 * just the target name. Safe to call on plain strings, wikilink strings, or
 * arrays mixing both. Used when reading universal-field values back from a
 * top-level YAML key that may have been written as `[[Note]]` for a
 * folder-sourced field.
 */
export function stripWikilinks(value: unknown): unknown {
    const strip = (s: string): string => {
        const m = s.match(/^\[\[([^\]]+)\]\]$/);
        if (!m) return s;
        const inner = m[1];
        const pipeIdx = inner.indexOf('|');
        return (pipeIdx >= 0 ? inner.slice(0, pipeIdx) : inner).trim();
    };
    if (Array.isArray(value)) {
        return value.map(v => (typeof v === 'string' ? strip(v) : v));
    }
    if (typeof value === 'string') return strip(value);
    return value;
}

/**
 * Wrap a folder-sourced field value as Obsidian wikilink(s) for top-level
 * YAML mirroring, so the property becomes clickable in Properties / Bases /
 * Dataview. The internal `universalFields[id]` representation stays as plain
 * names to keep the dropdown UI matching its options. Already-wikilinked
 * input is left untouched.
 */
function wrapAsWikilinks(value: unknown): unknown {
    const wrap = (s: string): string => {
        const trimmed = s.trim();
        if (!trimmed) return s;
        if (/^\[\[[^\]]+\]\]$/.test(trimmed)) return trimmed;
        return `[[${trimmed}]]`;
    };
    if (Array.isArray(value)) {
        return value.map(v => (typeof v === 'string' && v.trim() ? wrap(v) : v));
    }
    if (typeof value === 'string') return wrap(value);
    return value;
}

/**
 * Hydrate `universalFields` from any matching top-level YAML keys. If a
 * template's `topLevelKey` is present in fm and the corresponding
 * universalFields[id] is missing, copy the value across. Issue #71.
 *
 * For folder-sourced templates, top-level YAML may store `[[Wikilinks]]`
 * (so Obsidian Properties shows them as clickable links). We strip the
 * brackets when copying back so the in-memory value matches the dropdown
 * option strings.
 */
export function hydrateUniversalFieldsFromTopLevel(
    fm: Record<string, unknown>,
    universalFields: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
    const templates = getActiveTemplates();
    if (!templates.length) return universalFields;
    let result = universalFields ? { ...universalFields } : undefined;
    for (const t of templates) {
        const k = t.topLevelKey;
        if (!k || isReservedTopLevelKey(k)) continue;
        const top = fm[k];
        if (top === undefined || top === null || top === '') continue;
        if (!result) result = {};
        if (result[t.id] === undefined || result[t.id] === '' || result[t.id] === null) {
            const isFolderSourced = !!t.folderSource && (t.type === 'dropdown' || t.type === 'multi-select');
            result[t.id] = isFolderSourced ? stripWikilinks(top) : top;
        }
    }
    return result;
}

/**
 * Mirror universal-field values back to top-level YAML keys for templates
 * that opt in via `topLevelKey`. Mutates `fm` in place. Issue #71.
 * Removes the top-level key when the value is empty so the YAML stays clean.
 *
 * For folder-sourced dropdown / multi-select templates, the mirrored value
 * is wrapped in `[[wikilinks]]` so it becomes clickable in Obsidian
 * Properties / Bases / Dataview.
 */
export function mirrorUniversalFieldsToTopLevel(
    fm: Record<string, unknown>,
    universalFields: Record<string, unknown> | undefined,
): void {
    if (!_topLevelMirrorEnabled) return;
    const templates = getActiveTemplates();
    if (!templates.length) return;
    for (const t of templates) {
        const k = t.topLevelKey;
        if (!k || isReservedTopLevelKey(k)) continue;
        const v = universalFields ? universalFields[t.id] : undefined;
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
            delete fm[k];
        } else {
            const isFolderSourced = !!t.folderSource && (t.type === 'dropdown' || t.type === 'multi-select');
            fm[k] = isFolderSourced ? wrapAsWikilinks(v) : v;
        }
    }
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- end of file-wide suppression block opened at line 1 */
