/**
 * Character data model - represents a character profile stored as a markdown file
 * in the project's Characters/ folder.
 */
export interface Character {
    /** Vault-relative path of the character .md file */
    filePath: string;
    /** type identifier */
    type: 'character';

    // ── Basic Information ──────────────────────────────
    /** Character name */
    name: string;
    /** Nicknames or aliases */
    nickname?: string;
    /** Age or date of birth */
    age?: string;
    /** Role in the story */
    role?: string;
    /** Occupation or vocation */
    occupation?: string;
    /** Where they live / are from */
    residency?: string;
    /** Story locations this character appears at */
    locations?: string[];
    /** Family & background */
    family?: string;

    // ── Physical Characteristics ───────────────────────
    /** Appearance description */
    appearance?: string;
    /** Scars, tattoos, birthmarks */
    distinguishingFeatures?: string;
    /** Clothing style, accessories, posture */
    style?: string;
    /** Specific habits or mannerisms */
    quirks?: string;

    // ── Personality ────────────────────────────────────
    /** 3-5 words describing personality */
    personality?: string;
    /** What they need (internal) */
    internalMotivation?: string;
    /** What they want (external) */
    externalMotivation?: string;
    /** Their best qualities */
    strengths?: string;
    /** Their fatal flaws */
    flaws?: string;
    /** What they fear most — the thing stopping them from going after their desire */
    fears?: string;
    /** Core belief — what they believe about themselves */
    belief?: string;
    /** Misbelief — the thing they believe is true about the world */
    misbelief?: string;

    // ── Backstory ──────────────────────────────────────
    /** Key formative events from childhood or past */
    formativeMemories?: string;
    /** Defining accomplishments or failures */
    accomplishments?: string;
    /** What they are hiding */
    secrets?: string;

    // ── Relationships ──────────────────────────────────
    /** Allies and friends (character names) */
    allies?: string[];
    /** Enemies and rivals (character names) */
    enemies?: string[];
    /** Romantic interests / partners (character names) */
    romantic?: string[];
    /** Mentors — characters who guide this one */
    mentors?: string[];
    /** Other / miscellaneous connections (character names) */
    otherRelations?: string[];

    // ── Character Arc ──────────────────────────────────
    /** How they are at story start */
    startingPoint?: string;
    /** What they want to achieve */
    goal?: string;
    /** How they change by the end */
    expectedChange?: string;

    // ── Other ──────────────────────────────────────────
    /** Hobbies, routines, favorites */
    habits?: string;
    /** Items they carry or use */
    props?: string;
    /** User-defined custom fields */
    custom?: Record<string, string>;

    // ── Meta ───────────────────────────────────────────
    /** Created date */
    created?: string;
    /** Modified date */
    modified?: string;
    /** Free-form notes (markdown body) */
    notes?: string;
}

/**
 * Field category definition for the character editor UI
 */
export interface CharacterFieldCategory {
    title: string;
    icon: string;
    fields: CharacterFieldDef[];
}

/**
 * Individual field definition
 */
export interface CharacterFieldDef {
    key: keyof Character;
    label: string;
    placeholder: string;
    multiline?: boolean;
}

/**
 * All character field categories with their placeholder descriptions.
 * These define the UI layout and hint text.
 */
export const CHARACTER_CATEGORIES: CharacterFieldCategory[] = [
    {
        title: 'Basic Information',
        icon: 'user',
        fields: [
            { key: 'name', label: 'Name', placeholder: 'Full name of the character' },
            { key: 'nickname', label: 'Nickname / Alias', placeholder: 'Alternative names and their origins' },
            { key: 'age', label: 'Age', placeholder: 'Date of birth, current life stage' },
            { key: 'role', label: 'Role in Story', placeholder: 'Protagonist, antagonist, mentor, sidekick…' },
            { key: 'occupation', label: 'Occupation', placeholder: 'Current job, income level, career history' },
            { key: 'residency', label: 'Residency', placeholder: 'Where they are from and where they currently live' },
            { key: 'locations', label: 'Locations', placeholder: 'Story locations they appear at (e.g. The Tavern, Castle Ruins)' },
            { key: 'family', label: 'Family / Background', placeholder: 'Relationships with parents, siblings, spouse…', multiline: true },
        ],
    },
    {
        title: 'Relationships',
        icon: 'users',
        fields: [
            { key: 'allies', label: 'Allies & Friends', placeholder: 'Who they trust' },
            { key: 'enemies', label: 'Enemies & Rivals', placeholder: 'Who they are in conflict with' },
            { key: 'romantic', label: 'Romantic', placeholder: 'Love interests, partners, exes' },
            { key: 'mentors', label: 'Mentors', placeholder: 'Teachers, guides, role models' },
            { key: 'otherRelations', label: 'Other Connections', placeholder: 'Any other notable relationships' },
        ],
    },
    {
        title: 'Physical Characteristics',
        icon: 'scan-face',
        fields: [
            { key: 'appearance', label: 'Appearance', placeholder: 'Height, weight, body type, hair, eye color, skin tone', multiline: true },
            { key: 'distinguishingFeatures', label: 'Distinguishing Features', placeholder: 'Scars, tattoos, birthmarks, or unique marks' },
            { key: 'style', label: 'Style', placeholder: 'Clothing style, accessories, posture' },
            { key: 'quirks', label: 'Quirks', placeholder: 'Specific habits like tapping fingers, stuttering when nervous…', multiline: true },
        ],
    },
    {
        title: 'Personality',
        icon: 'brain',
        fields: [
            { key: 'personality', label: 'Personality', placeholder: 'Three to five words to describe them' },
            { key: 'internalMotivation', label: 'Internal Motivation', placeholder: 'What they need — their deepest unspoken drive' },
            { key: 'externalMotivation', label: 'External Motivation', placeholder: 'What they want — their stated or visible goal' },
            { key: 'strengths', label: 'Strengths', placeholder: 'Their best qualities' },
            { key: 'flaws', label: 'Flaws', placeholder: 'Their fatal flaws' },
            { key: 'fears', label: 'Fears', placeholder: 'What they are most afraid of — the thing stopping them from going after their desire' },
            { key: 'belief', label: 'Belief', placeholder: 'What they believe about themselves and their identity' },
            { key: 'misbelief', label: 'Misbelief', placeholder: 'The thing they believe is true about the world (but isn\'t)', multiline: true },
        ],
    },
    {
        title: 'Backstory',
        icon: 'clock',
        fields: [
            { key: 'formativeMemories', label: 'Formative Memories', placeholder: 'Key events from childhood or past that shaped their personality', multiline: true },
            { key: 'accomplishments', label: 'Accomplishments / Failures', placeholder: 'Defining moments that shaped their self-worth', multiline: true },
            { key: 'secrets', label: 'Secrets', placeholder: 'What they are hiding', multiline: true },
        ],
    },
    {
        title: 'Character Arc',
        icon: 'trending-up',
        fields: [
            { key: 'startingPoint', label: 'Starting Point', placeholder: 'How they are at the beginning of the story', multiline: true },
            { key: 'goal', label: 'Goal', placeholder: 'What they want to achieve' },
            { key: 'expectedChange', label: 'Expected Change', placeholder: 'How they will change by the end of the story', multiline: true },
        ],
    },
    {
        title: 'Other',
        icon: 'more-horizontal',
        fields: [
            { key: 'habits', label: 'Habits', placeholder: 'Hobbies, favorite foods, daily routines', multiline: true },
            { key: 'props', label: 'Props', placeholder: 'Items they frequently use or carry' },
        ],
    },
];

/**
 * Frontmatter keys that map to Character fields (excludes computed/meta keys)
 */
export const CHARACTER_FIELD_KEYS: (keyof Character)[] = [
    'name', 'nickname', 'age', 'role', 'occupation', 'residency', 'locations', 'family',
    'appearance', 'distinguishingFeatures', 'style', 'quirks',
    'personality', 'internalMotivation', 'externalMotivation', 'strengths', 'flaws', 'fears', 'belief', 'misbelief',
    'formativeMemories', 'accomplishments', 'secrets',
    'allies', 'enemies', 'romantic', 'mentors', 'otherRelations',
    'startingPoint', 'goal', 'expectedChange',
    'habits', 'props',
];

/**
 * Text fields to scan for #prop tags.
 * Excludes location-related fields (handled separately) and
 * allies/enemies (string arrays) and custom (object).
 */
const PROP_SCAN_FIELDS: (keyof Character)[] = [
    'nickname', 'age', 'occupation', 'family',
    'appearance', 'distinguishingFeatures', 'style', 'quirks',
    'personality', 'internalMotivation', 'externalMotivation',
    'strengths', 'flaws', 'fears', 'belief', 'misbelief',
    'formativeMemories', 'accomplishments', 'secrets',
    'startingPoint', 'goal', 'expectedChange',
    'habits', 'props', 'notes',
];

/**
 * Fields where #tags should be classified as locations.
 */
const LOCATION_TAG_FIELDS: (keyof Character)[] = [
    'residency',
];

/** Tag category types for manual override support. */
export type TagType = 'prop' | 'location' | 'character' | 'other';

/**
 * Extract ALL #hashtags from a character's text fields and classify them.
 * Returns a map of lowercased tag → { original casing, autoType based on field }.
 * If `overrides` is provided, manual type wins over auto-classification.
 */
export function extractAllCharacterTags(
    character: Character,
    overrides?: Record<string, string>,
): { name: string; type: TagType }[] {
    const seen = new Map<string, { name: string; autoType: TagType }>();
    const re = /#([A-Za-z0-9][A-Za-z0-9_-]*)/g;

    // Scan location fields
    for (const key of LOCATION_TAG_FIELDS) {
        const val = character[key];
        if (typeof val !== 'string' || !val) continue;
        let m: RegExpExecArray | null;
        while ((m = re.exec(val)) !== null) {
            const low = m[1].toLowerCase();
            if (!seen.has(low)) seen.set(low, { name: m[1], autoType: 'location' });
        }
        re.lastIndex = 0;
    }

    // Scan prop fields
    for (const key of PROP_SCAN_FIELDS) {
        const val = character[key];
        if (typeof val !== 'string' || !val) continue;
        let m: RegExpExecArray | null;
        while ((m = re.exec(val)) !== null) {
            const low = m[1].toLowerCase();
            if (!seen.has(low)) seen.set(low, { name: m[1], autoType: 'prop' });
        }
        re.lastIndex = 0;
    }

    // Scan custom fields (Record<string, string>)
    if (character.custom) {
        for (const val of Object.values(character.custom)) {
            if (typeof val !== 'string' || !val) continue;
            let m: RegExpExecArray | null;
            while ((m = re.exec(val)) !== null) {
                const low = m[1].toLowerCase();
                if (!seen.has(low)) seen.set(low, { name: m[1], autoType: 'prop' });
            }
            re.lastIndex = 0;
        }
    }

    // Scan string-array fields for #tags (locations, allies, enemies, etc.)
    const ARRAY_LOCATION_FIELDS: (keyof Character)[] = ['locations'];
    for (const key of ARRAY_LOCATION_FIELDS) {
        const arr = character[key];
        if (!Array.isArray(arr)) continue;
        for (const entry of arr) {
            if (typeof entry !== 'string' || !entry) continue;
            let m: RegExpExecArray | null;
            while ((m = re.exec(entry)) !== null) {
                const low = m[1].toLowerCase();
                if (!seen.has(low)) seen.set(low, { name: m[1], autoType: 'location' });
            }
            re.lastIndex = 0;
        }
    }

    // Apply overrides
    const result: { name: string; type: TagType }[] = [];
    for (const [low, entry] of seen) {
        const overrideType = overrides?.[low] as TagType | undefined;
        result.push({ name: entry.name, type: overrideType || entry.autoType });
    }
    return result;
}

/**
 * Extract #hashtag props from all text fields of a character.
 * Supports #CamelCase, #kebab-case, #snake_case, and #digits.
 * Returns unique prop names (without the leading #), preserving first-seen casing.
 */
export function extractCharacterProps(character: Character, overrides?: Record<string, string>): string[] {
    return extractAllCharacterTags(character, overrides)
        .filter(t => t.type === 'prop')
        .map(t => t.name);
}

/**
 * Extract #hashtag location tags from location-related fields (e.g. residency).
 * Returns unique tag names (without leading #), preserving first-seen casing.
 */
export function extractCharacterLocationTags(character: Character, overrides?: Record<string, string>): string[] {
    return extractAllCharacterTags(character, overrides)
        .filter(t => t.type === 'location')
        .map(t => t.name);
}

/**
 * Role options for the role dropdown
 */
export const CHARACTER_ROLES = [
    'Protagonist',
    'Antagonist',
    'Deuteragonist',
    'Mentor',
    'Sidekick',
    'Love Interest',
    'Foil',
    'Supporting',
    'Minor',
];
