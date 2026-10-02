 
/**
 * Codex data model — generic entries for any user-defined category.
 *
 * Built-in categories: Characters, Locations, Items
 * Users can add more: Creatures, Lore, Organizations, Culture, Systems, etc.
 *
 * Characters and Locations retain their specialised models and managers;
 * the Codex model covers "generic" categories (Items, plus any user-added).
 */

// ── Codex entry (generic) ──────────────────────────

export interface CodexEntry {
    /** Vault-relative path of the .md file */
    filePath: string;
    /** Frontmatter type — matches the category id, e.g. 'item', 'creature' */
    type: string;
    /** Display name */
    name: string;
    /** Vault-relative path to an image */
    image?: string;
    /** Image gallery (max 10 images with captions) */
    gallery?: Array<{ path: string; caption: string }>;
    /** Created date (ISO) */
    created?: string;
    /** Modified date (ISO) */
    modified?: string;
    /** Free-form notes (markdown body) */
    notes?: string;
    /** User-defined custom fields */
    custom?: Record<string, string>;
    /**
     * Universal field template values (keyed by template id).
     * `boolean` is supported for `checkbox`-type templates (1.10.43+).
     */
    universalFields?: Record<string, string | string[] | boolean>;

    // ── Series-ready fields ────────────────────────
    /** Which books (project titles) this entry appears in — for future series sharing */
    books?: string[];

    // ── Linking / matching rules (Issues #209, #223) ──
    /** Comma- or newline-separated alternative names that should also link to this entry. */
    aliases?: string;
    /** Free-form sub-type label (e.g. "Sword", "Potion") shown in the editor and list. */
    entryType?: string;
    /** When true, name + aliases only match on exact case (default: case-insensitive). */
    caseSensitive?: boolean;
    /** Comma- or newline-separated terms that should NOT be linked to this entry,
     *  even if they contain the entry's name (e.g. "Dawnguard Saint" excluded
     *  from a "Saint" entry). */
    excludeTerms?: string;

    /** All standard fields are stored as string values keyed by field key */
    [key: string]: unknown;
}

// ── Field definition (drives the editor UI) ────────

export interface CodexFieldDef {
    /** Property key on the CodexEntry / frontmatter */
    key: string;
    /** Human-readable label */
    label: string;
    /** Placeholder text for the editor */
    placeholder: string;
    /** If true, render a textarea instead of a single-line input */
    multiline?: boolean;
    /** If true, render a character dropdown (populated from CharacterManager) */
    characterRef?: boolean;
    /** If true, render an on/off toggle (value stored as boolean) */
    toggle?: boolean;
    /** Populate the field from another StoryLine entity type. */
    entityRef?: 'location' | 'character' | 'codex';
    /** Allow more than one linked entity in the field. */
    multiSelect?: boolean;
}

export interface CodexFieldCategory {
    title: string;
    icon: string;  // Lucide icon name
    fields: CodexFieldDef[];
}

// ── Category definition ────────────────────────────

export interface CodexCategoryDef {
    /** Unique id — used as folder name and frontmatter type (e.g. 'items', 'creatures') */
    id: string;
    /** Human-readable label (e.g. 'Items', 'Creatures') */
    label: string;
    /** Lucide icon name for tabs / menus */
    icon: string;
    /** Folder name inside the Codex directory */
    folder: string;
    /** Field categories for this codex type */
    categories: CodexFieldCategory[];
    /** Flat list of frontmatter keys to serialize (derived from categories) */
    fieldKeys: string[];
    /** Whether this is a built-in category (cannot be removed, only hidden) */
    builtIn?: boolean;
    /** Whether this category appears as a linkable section in the Scene Inspector sidebar */
    showInSidebar?: boolean;
}

// ── Built-in: Items ────────────────────────────────

export const ITEMS_CATEGORIES: CodexFieldCategory[] = [
    {
        title: 'Overview',
        icon: 'package',
        fields: [
            { key: 'name', label: 'Name', placeholder: 'Name of this item' },
            { key: 'itemType', label: 'Type', placeholder: 'Weapon, artifact, tool, trinket…' },
            { key: 'description', label: 'Description', placeholder: 'What does it look like? How big is it?', multiline: true },
        ],
    },
    {
        title: 'Origin',
        icon: 'map',
        fields: [
            { key: 'origin', label: 'Origin', placeholder: 'Where did it come from? Who made it?', multiline: true },
            { key: 'history', label: 'History', placeholder: 'Key events in its history', multiline: true },
        ],
    },
    {
        title: 'Ownership',
        icon: 'user',
        fields: [
            { key: 'owner', label: 'Owner', placeholder: 'Current owner or bearer', characterRef: true, entityRef: 'character' },
            { key: 'previousOwners', label: 'Previous Owners', placeholder: 'Past owners, how it changed hands', characterRef: true, entityRef: 'character', multiSelect: true },
        ],
    },
    {
        title: 'Story Significance',
        icon: 'bookmark',
        fields: [
            { key: 'significance', label: 'Significance', placeholder: 'Why this item matters to the story', multiline: true },
        ],
    },
    {
        title: 'Special Properties',
        icon: 'sparkles',
        fields: [
            { key: 'properties', label: 'Properties', placeholder: 'Unique traits, effects, or capabilities', multiline: true },
            { key: 'limitations', label: 'Limitations', placeholder: 'Costs, restrictions, drawbacks', multiline: true },
        ],
    },
];

export const ITEMS_FIELD_KEYS: string[] = [
    'name', 'image', 'gallery', 'itemType', 'description',
    'origin', 'history', 'owner', 'previousOwners',
    'properties', 'limitations', 'significance',
];

// ── Built-in: Creatures ────────────────────────────

export const CREATURES_CATEGORIES: CodexFieldCategory[] = [
    {
        title: 'Overview',
        icon: 'bug',
        fields: [
            { key: 'name', label: 'Name', placeholder: 'Species or creature name' },
            { key: 'creatureType', label: 'Type', placeholder: 'Beast, dragon, undead, spirit…' },
            { key: 'description', label: 'Description', placeholder: 'Appearance and distinguishing features', multiline: true },
        ],
    },
    {
        title: 'Habitat',
        icon: 'trees',
        fields: [
            { key: 'habitat', label: 'Habitat', placeholder: 'Where it lives, environmental conditions', multiline: true },
            { key: 'diet', label: 'Diet', placeholder: 'What it eats' },
        ],
    },
    {
        title: 'Abilities',
        icon: 'zap',
        fields: [
            { key: 'abilities', label: 'Abilities', placeholder: 'Special powers or natural weapons', multiline: true },
            { key: 'weaknesses', label: 'Weaknesses', placeholder: 'Known vulnerabilities', multiline: true },
        ],
    },
    {
        title: 'Lore',
        icon: 'scroll-text',
        fields: [
            { key: 'behavior', label: 'Behavior', placeholder: 'Social structure, temperament', multiline: true },
            { key: 'mythology', label: 'Mythology', placeholder: 'Legends, cultural significance', multiline: true },
        ],
    },
];

export const CREATURES_FIELD_KEYS: string[] = [
    'name', 'image', 'gallery', 'creatureType', 'description',
    'habitat', 'diet', 'abilities', 'weaknesses', 'behavior', 'mythology',
];

// ── Built-in: Lore ─────────────────────────────────

export const LORE_CATEGORIES: CodexFieldCategory[] = [
    {
        title: 'Overview',
        icon: 'scroll-text',
        fields: [
            { key: 'name', label: 'Name', placeholder: 'Title of this lore entry' },
            { key: 'loreType', label: 'Type', placeholder: 'Legend, prophecy, historical event, religion…' },
            { key: 'description', label: 'Description', placeholder: 'Summary of this lore', multiline: true },
        ],
    },
    {
        title: 'Details',
        icon: 'book-open',
        fields: [
            { key: 'fullText', label: 'Full Text', placeholder: 'Detailed content, verses, prophecy text', multiline: true },
            { key: 'sources', label: 'Sources', placeholder: 'Where this lore comes from, who tells it', multiline: true },
        ],
    },
    {
        title: 'Significance',
        icon: 'bookmark',
        fields: [
            { key: 'significance', label: 'Significance', placeholder: 'Impact on the world or story', multiline: true },
            { key: 'relatedEntries', label: 'Related Entries', placeholder: 'Connected people, places, items', entityRef: 'codex', multiSelect: true },
        ],
    },
];

export const LORE_FIELD_KEYS: string[] = [
    'name', 'image', 'gallery', 'loreType', 'description',
    'fullText', 'sources', 'significance', 'relatedEntries',
];

// ── Built-in: Organizations ────────────────────────

export const ORGANIZATIONS_CATEGORIES: CodexFieldCategory[] = [
    {
        title: 'Overview',
        icon: 'building-2',
        fields: [
            { key: 'name', label: 'Name', placeholder: 'Organization name' },
            { key: 'orgType', label: 'Type', placeholder: 'Guild, kingdom, cult, company…' },
            { key: 'description', label: 'Description', placeholder: 'What is this organization?', multiline: true },
        ],
    },
    {
        title: 'Structure',
        icon: 'network',
        fields: [
            { key: 'leadership', label: 'Leadership', placeholder: 'Who runs it, hierarchy', multiline: true },
            { key: 'members', label: 'Notable Members', placeholder: 'Key members and their roles', multiline: true },
        ],
    },
    {
        title: 'Goals & Methods',
        icon: 'target',
        fields: [
            { key: 'goals', label: 'Goals', placeholder: 'What the organization wants', multiline: true },
            { key: 'methods', label: 'Methods', placeholder: 'How they achieve their goals', multiline: true },
        ],
    },
    {
        title: 'History',
        icon: 'clock',
        fields: [
            { key: 'founded', label: 'Founded', placeholder: 'When and how it was established' },
            { key: 'history', label: 'History', placeholder: 'Key events in its past', multiline: true },
        ],
    },
];

export const ORGANIZATIONS_FIELD_KEYS: string[] = [
    'name', 'image', 'gallery', 'orgType', 'description',
    'leadership', 'members', 'goals', 'methods', 'founded', 'history',
];

// ── Built-in: Culture ──────────────────────────────

export const CULTURE_CATEGORIES: CodexFieldCategory[] = [
    {
        title: 'Overview',
        icon: 'landmark',
        fields: [
            { key: 'name', label: 'Name', placeholder: 'Culture or society name' },
            { key: 'description', label: 'Description', placeholder: 'Overview of this culture', multiline: true },
        ],
    },
    {
        title: 'Traditions',
        icon: 'flame',
        fields: [
            { key: 'traditions', label: 'Traditions', placeholder: 'Customs, ceremonies, holidays', multiline: true },
            { key: 'taboos', label: 'Taboos', placeholder: 'Forbidden behaviours, social boundaries', multiline: true },
        ],
    },
    {
        title: 'Society',
        icon: 'users',
        fields: [
            { key: 'socialStructure', label: 'Social Structure', placeholder: 'Classes, castes, power dynamics', multiline: true },
            { key: 'values', label: 'Values', placeholder: 'Core beliefs and ideals', multiline: true },
        ],
    },
    {
        title: 'Arts & Language',
        icon: 'palette',
        fields: [
            { key: 'arts', label: 'Arts', placeholder: 'Music, visual arts, literature', multiline: true },
            { key: 'language', label: 'Language', placeholder: 'Language details, common phrases', multiline: true },
        ],
    },
];

export const CULTURE_FIELD_KEYS: string[] = [
    'name', 'image', 'gallery', 'description',
    'traditions', 'taboos', 'socialStructure', 'values', 'arts', 'language',
];

// ── Built-in: Systems ──────────────────────────────

export const SYSTEMS_CATEGORIES: CodexFieldCategory[] = [
    {
        title: 'Overview',
        icon: 'cog',
        fields: [
            { key: 'name', label: 'Name', placeholder: 'System name (magic, technology, economy…)' },
            { key: 'systemType', label: 'Type', placeholder: 'Magic, technology, economy, political…' },
            { key: 'description', label: 'Description', placeholder: 'How this system works', multiline: true },
        ],
    },
    {
        title: 'Rules',
        icon: 'list-checks',
        fields: [
            { key: 'rules', label: 'Rules', placeholder: 'Core rules and mechanics', multiline: true },
            { key: 'limitations', label: 'Limitations', placeholder: 'Costs, restrictions, exceptions', multiline: true },
        ],
    },
    {
        title: 'Impact',
        icon: 'sparkles',
        fields: [
            { key: 'practitioners', label: 'Practitioners', placeholder: 'Who uses or is affected by this system', multiline: true },
            { key: 'impact', label: 'Impact on World', placeholder: 'How this system shapes society', multiline: true },
        ],
    },
];

export const SYSTEMS_FIELD_KEYS: string[] = [
    'name', 'image', 'gallery', 'systemType', 'description',
    'rules', 'limitations', 'practitioners', 'impact',
];

// ── Shared "Linking & Matching" section (Issues #209, #223) ───────
//
// Appended to every built-in and custom category so that aliases, an
// optional sub-type, case-sensitivity, and exclusion terms are available
// on ALL codex entries — not just characters.

export const LINKING_CATEGORIES: CodexFieldCategory = {
    title: 'Linking & Matching',
    icon: 'link',
    fields: [
        {
            key: 'entryType',
            label: 'Type',
            placeholder: 'Sub-type (e.g. Sword, Potion, Legend…)',
        },
        {
            key: 'aliases',
            label: 'Aliases',
            placeholder: 'Comma-separated alternative names that link to this entry',
            multiline: true,
        },
        {
            key: 'caseSensitive',
            label: 'Case-sensitive matching',
            placeholder: 'Off — match regardless of case',
            toggle: true,
        },
        {
            key: 'excludeTerms',
            label: 'Exclude terms',
            placeholder: 'Comma-separated phrases that should NOT link here (e.g. "Dawnguard Saint")',
            multiline: true,
        },
    ],
};

/** Field keys added by the Linking & Matching section. */
export const LINKING_FIELD_KEYS: string[] = ['entryType', 'aliases', 'caseSensitive', 'excludeTerms'];

/**
 * Append the shared Linking & Matching section to a category definition,
 * returning a new definition (the original is not mutated). Also merges
 * the linking field keys into `fieldKeys` so they are persisted.
 */
export function withLinkingSection(cat: CodexCategoryDef): CodexCategoryDef {
    const hasLinking = cat.categories.some(c => c.title === LINKING_CATEGORIES.title);
    if (hasLinking) return cat;
    return {
        ...cat,
        categories: [...cat.categories, LINKING_CATEGORIES],
        fieldKeys: [...cat.fieldKeys, ...LINKING_FIELD_KEYS.filter(k => !cat.fieldKeys.includes(k))],
    };
}

// ── Registry of all built-in category templates ────

export const BUILTIN_CODEX_CATEGORIES: CodexCategoryDef[] = [
    {
        id: 'items',
        label: 'Items',
        icon: 'package',
        folder: 'Items',
        categories: ITEMS_CATEGORIES,
        fieldKeys: ITEMS_FIELD_KEYS,
        builtIn: true,
    },
    {
        id: 'creatures',
        label: 'Creatures',
        icon: 'bug',
        folder: 'Creatures',
        categories: CREATURES_CATEGORIES,
        fieldKeys: CREATURES_FIELD_KEYS,
        builtIn: true,
    },
    {
        id: 'lore',
        label: 'Lore',
        icon: 'scroll-text',
        folder: 'Lore',
        categories: LORE_CATEGORIES,
        fieldKeys: LORE_FIELD_KEYS,
        builtIn: true,
    },
    {
        id: 'organizations',
        label: 'Organizations',
        icon: 'building-2',
        folder: 'Organizations',
        categories: ORGANIZATIONS_CATEGORIES,
        fieldKeys: ORGANIZATIONS_FIELD_KEYS,
        builtIn: true,
    },
    {
        id: 'culture',
        label: 'Culture',
        icon: 'landmark',
        folder: 'Culture',
        categories: CULTURE_CATEGORIES,
        fieldKeys: CULTURE_FIELD_KEYS,
        builtIn: true,
    },
    {
        id: 'systems',
        label: 'Systems',
        icon: 'cog',
        folder: 'Systems',
        categories: SYSTEMS_CATEGORIES,
        fieldKeys: SYSTEMS_FIELD_KEYS,
        builtIn: true,
    },
];

/**
 * Look up a built-in category definition by its id.
 */
export function getBuiltinCodexCategory(id: string): CodexCategoryDef | undefined {
    return BUILTIN_CODEX_CATEGORIES.find(c => c.id === id);
}

/**
 * Build a CodexCategoryDef for a user-created custom category.
 * Custom categories start with a single "Overview" section and let the user
 * add more fields via the Codex UI.
 */
export function makeCustomCodexCategory(id: string, label: string, icon: string = 'file-text'): CodexCategoryDef {
    return withLinkingSection({
        id,
        label,
        icon,
        folder: label,                  // folder name = display label
        categories: [
            {
                title: 'Overview',
                icon: 'file-text',
                fields: [
                    { key: 'name', label: 'Name', placeholder: `Name of this ${label.toLowerCase()} entry` },
                    { key: 'description', label: 'Description', placeholder: `Describe this ${label.toLowerCase()}`, multiline: true },
                ],
            },
        ],
        fieldKeys: ['name', 'image', 'gallery', 'description'],
        builtIn: false,
    });
}

/**
 * Icons available for custom categories (subset of Lucide).
 */
export const CODEX_ICON_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'file-text', label: 'Document' },
    { value: 'package', label: 'Package' },
    { value: 'bug', label: 'Creature' },
    { value: 'scroll-text', label: 'Scroll' },
    { value: 'building-2', label: 'Building' },
    { value: 'landmark', label: 'Landmark' },
    { value: 'cog', label: 'Cog' },
    { value: 'shield', label: 'Shield' },
    { value: 'swords', label: 'Swords' },
    { value: 'crown', label: 'Crown' },
    { value: 'gem', label: 'Gem' },
    { value: 'flask-conical', label: 'Flask' },
    { value: 'book-open', label: 'Book' },
    { value: 'skull', label: 'Skull' },
    { value: 'sparkles', label: 'Sparkles' },
    { value: 'flag', label: 'Flag' },
    { value: 'globe', label: 'Globe' },
    { value: 'music', label: 'Music' },
    { value: 'palette', label: 'Palette' },
    { value: 'heart', label: 'Heart' },
];
 
