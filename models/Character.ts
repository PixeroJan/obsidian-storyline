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
    /** Vault-relative path to a portrait/avatar image */
    image?: string;
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

    /** Structured relationship rows (category -> type -> target) */
    relations?: CharacterRelation[];

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
    /** Custom relationship type connections (character names) */
    customRelations?: string[];
    /** Label/name of the custom relation type (e.g. Bodyguard, Blood Oath) */
    customRelationType?: string;

    // Typed relationships (grouped)
    // Family
    siblings?: string[];
    halfSiblings?: string[];
    twins?: string[];
    parents?: string[];
    children?: string[];
    stepParents?: string[];
    stepChildren?: string[];
    adoptiveParents?: string[];
    adoptedChildren?: string[];
    guardians?: string[];
    wards?: string[];
    grandparents?: string[];
    grandchildren?: string[];
    auntsUncles?: string[];
    niecesNephews?: string[];
    cousins?: string[];
    inLaws?: string[];

    // Romantic
    spouses?: string[];
    exPartners?: string[];

    // Social
    friends?: string[];
    bestFriends?: string[];
    confidants?: string[];
    acquaintances?: string[];

    // Conflict
    rivals?: string[];
    betrayers?: string[];
    avengers?: string[];

    // Guidance / hierarchy
    mentees?: string[];
    leaders?: string[];
    followers?: string[];
    bosses?: string[];
    subordinates?: string[];
    commanders?: string[];
    secondsInCommand?: string[];
    masters?: string[];
    apprentices?: string[];

    // Professional / institutional
    colleagues?: string[];
    businessPartners?: string[];
    clients?: string[];
    handlers?: string[];
    assets?: string[];

    // Story dynamics
    protectors?: string[];
    dependents?: string[];
    owesDebtTo?: string[];
    swornTo?: string[];
    boundByOath?: string[];
    idolizes?: string[];
    fearsPeople?: string[];
    obsessedWith?: string[];

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

export type CharacterRelationCategory =
    | 'family'
    | 'romantic'
    | 'social'
    | 'conflict'
    | 'guidance'
    | 'professional'
    | 'story'
    | 'custom';

export interface CharacterRelation {
    category: CharacterRelationCategory;
    type: string;
    target: string;
}

export const RELATION_CATEGORIES: { value: CharacterRelationCategory; label: string }[] = [
    { value: 'family', label: 'Family' },
    { value: 'romantic', label: 'Romantic' },
    { value: 'social', label: 'Social' },
    { value: 'conflict', label: 'Conflict' },
    { value: 'guidance', label: 'Guidance / Hierarchy' },
    { value: 'professional', label: 'Professional / Institutional' },
    { value: 'story', label: 'Story Dynamics' },
    { value: 'custom', label: 'Custom' },
];

export const RELATION_TYPES_BY_CATEGORY: Record<CharacterRelationCategory, string[]> = {
    family: ['sibling', 'half-sibling', 'twin', 'parent', 'child', 'step-parent', 'step-child', 'adoptive-parent', 'adopted-child', 'guardian', 'ward', 'grandparent', 'grandchild', 'aunt/uncle', 'niece/nephew', 'cousin', 'in-law'],
    romantic: ['partner', 'spouse', 'ex-partner'],
    social: ['ally', 'friend', 'best-friend', 'confidant', 'acquaintance'],
    conflict: ['enemy', 'rival', 'betrayer', 'avenger'],
    guidance: ['mentor', 'mentee', 'leader', 'follower', 'boss', 'subordinate', 'commander', 'second-in-command', 'master', 'apprentice'],
    professional: ['colleague', 'business-partner', 'client', 'handler', 'asset'],
    story: ['protector', 'dependent', 'owes-debt-to', 'sworn-to', 'bound-by-oath', 'idolizes', 'fears', 'obsessed-with'],
    custom: [],
};

export const RELATION_BASE_TYPE_BY_CATEGORY: Record<CharacterRelationCategory, 'ally' | 'enemy' | 'romantic' | 'family' | 'mentor' | 'other'> = {
    family: 'family',
    romantic: 'romantic',
    social: 'ally',
    conflict: 'enemy',
    guidance: 'mentor',
    professional: 'other',
    story: 'other',
    custom: 'other',
};

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
            { key: 'relations', label: 'Relations', placeholder: 'Add relation rows by category and type' },
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
    'name', 'image', 'nickname', 'age', 'role', 'occupation', 'residency', 'locations', 'family', 'relations',
    'appearance', 'distinguishingFeatures', 'style', 'quirks',
    'personality', 'internalMotivation', 'externalMotivation', 'strengths', 'flaws', 'fears', 'belief', 'misbelief',
    'formativeMemories', 'accomplishments', 'secrets',
    'startingPoint', 'goal', 'expectedChange',
    'habits', 'props',
];

export const CHARACTER_RELATION_ARRAY_FIELDS: (keyof Character)[] = [
    'allies', 'enemies', 'romantic', 'mentors', 'customRelations',
    'siblings', 'halfSiblings', 'twins', 'parents', 'children', 'stepParents', 'stepChildren',
    'adoptiveParents', 'adoptedChildren', 'guardians', 'wards', 'grandparents', 'grandchildren',
    'auntsUncles', 'niecesNephews', 'cousins', 'inLaws',
    'spouses', 'exPartners',
    'friends', 'bestFriends', 'confidants', 'acquaintances',
    'rivals', 'betrayers', 'avengers',
    'mentees', 'leaders', 'followers', 'bosses', 'subordinates', 'commanders', 'secondsInCommand', 'masters', 'apprentices',
    'colleagues', 'businessPartners', 'clients', 'handlers', 'assets',
    'protectors', 'dependents', 'owesDebtTo', 'swornTo', 'boundByOath', 'idolizes', 'fearsPeople', 'obsessedWith',
];

export const RELATION_FIELD_BASE_TYPE: Partial<Record<keyof Character, 'ally' | 'enemy' | 'romantic' | 'family' | 'mentor' | 'other'>> = {
    allies: 'ally',
    enemies: 'enemy',
    romantic: 'romantic',
    mentors: 'mentor',
    customRelations: 'other',
    otherRelations: 'other',

    siblings: 'family',
    halfSiblings: 'family',
    twins: 'family',
    parents: 'family',
    children: 'family',
    stepParents: 'family',
    stepChildren: 'family',
    adoptiveParents: 'family',
    adoptedChildren: 'family',
    guardians: 'family',
    wards: 'family',
    grandparents: 'family',
    grandchildren: 'family',
    auntsUncles: 'family',
    niecesNephews: 'family',
    cousins: 'family',
    inLaws: 'family',

    spouses: 'romantic',
    exPartners: 'romantic',

    friends: 'ally',
    bestFriends: 'ally',
    confidants: 'ally',
    acquaintances: 'ally',

    rivals: 'enemy',
    betrayers: 'enemy',
    avengers: 'enemy',

    mentees: 'mentor',

    leaders: 'other',
    followers: 'other',
    bosses: 'other',
    subordinates: 'other',
    commanders: 'other',
    secondsInCommand: 'other',
    masters: 'other',
    apprentices: 'other',

    colleagues: 'other',
    businessPartners: 'other',
    clients: 'other',
    handlers: 'other',
    assets: 'other',

    protectors: 'other',
    dependents: 'other',
    owesDebtTo: 'other',
    swornTo: 'other',
    boundByOath: 'other',
    idolizes: 'other',
    fearsPeople: 'other',
    obsessedWith: 'other',
};

export const RELATION_FIELD_LABELS: Partial<Record<keyof Character, string>> = {
    siblings: 'Family · Sibling',
    halfSiblings: 'Family · Half-Sibling',
    twins: 'Family · Twin',
    parents: 'Family · Parent',
    children: 'Family · Child',
    stepParents: 'Family · Step-Parent',
    stepChildren: 'Family · Step-Child',
    adoptiveParents: 'Family · Adoptive Parent',
    adoptedChildren: 'Family · Adopted Child',
    guardians: 'Family · Guardian',
    wards: 'Family · Ward',
    grandparents: 'Family · Grandparent',
    grandchildren: 'Family · Grandchild',
    auntsUncles: 'Family · Aunt/Uncle',
    niecesNephews: 'Family · Niece/Nephew',
    cousins: 'Family · Cousin',
    inLaws: 'Family · In-Law',

    romantic: 'Romantic · Partner',
    spouses: 'Romantic · Spouse',
    exPartners: 'Romantic · Ex-Partner',

    allies: 'Social · Ally',
    friends: 'Social · Friend',
    bestFriends: 'Social · Best Friend',
    confidants: 'Social · Confidant',
    acquaintances: 'Social · Acquaintance',

    enemies: 'Conflict · Enemy',
    rivals: 'Conflict · Rival',
    betrayers: 'Conflict · Betrayer',
    avengers: 'Conflict · Avenger',

    mentors: 'Guidance · Mentor',
    mentees: 'Guidance · Mentee',
    leaders: 'Guidance · Leader',
    followers: 'Guidance · Follower',
    bosses: 'Guidance · Boss',
    subordinates: 'Guidance · Subordinate',
    commanders: 'Guidance · Commander',
    secondsInCommand: 'Guidance · Second-in-Command',
    masters: 'Guidance · Master',
    apprentices: 'Guidance · Apprentice',

    colleagues: 'Professional · Colleague',
    businessPartners: 'Professional · Business Partner',
    clients: 'Professional · Client',
    handlers: 'Professional · Handler',
    assets: 'Professional · Asset',

    protectors: 'Story Dynamics · Protector',
    dependents: 'Story Dynamics · Dependent',
    owesDebtTo: 'Story Dynamics · Owes Debt To',
    swornTo: 'Story Dynamics · Sworn To',
    boundByOath: 'Story Dynamics · Bound by Oath',
    idolizes: 'Story Dynamics · Idolizes',
    fearsPeople: 'Story Dynamics · Fears',
    obsessedWith: 'Story Dynamics · Obsessed With',
    customRelations: 'Story Dynamics · Custom',
    otherRelations: 'Story Dynamics · Other',
};

export const LEGACY_RELATION_FIELDS_TO_CLEAN: (keyof Character)[] = [
    'allies', 'enemies', 'romantic', 'mentors', 'otherRelations', 'customRelations',
    'siblings', 'halfSiblings', 'twins', 'parents', 'children', 'stepParents', 'stepChildren',
    'adoptiveParents', 'adoptedChildren', 'guardians', 'wards', 'grandparents', 'grandchildren',
    'auntsUncles', 'niecesNephews', 'cousins', 'inLaws',
    'spouses', 'exPartners',
    'friends', 'bestFriends', 'confidants', 'acquaintances',
    'rivals', 'betrayers', 'avengers',
    'mentees', 'leaders', 'followers', 'bosses', 'subordinates', 'commanders', 'secondsInCommand', 'masters', 'apprentices',
    'colleagues', 'businessPartners', 'clients', 'handlers', 'assets',
    'protectors', 'dependents', 'owesDebtTo', 'swornTo', 'boundByOath', 'idolizes', 'fearsPeople', 'obsessedWith',
];

function normalizeRelationCategory(value: string): CharacterRelationCategory {
    if (value === 'family' || value === 'romantic' || value === 'social' || value === 'conflict' || value === 'guidance' || value === 'professional' || value === 'story' || value === 'custom') {
        return value;
    }
    return 'custom';
}

function normalizedType(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '-');
}

export function normalizeCharacterRelations(relations: CharacterRelation[] | undefined): CharacterRelation[] {
    if (!Array.isArray(relations)) return [];
    const out: CharacterRelation[] = [];
    const seen = new Set<string>();
    for (const rel of relations) {
        if (!rel || typeof rel.target !== 'string' || typeof rel.type !== 'string') continue;
        const target = rel.target.trim();
        if (!target) continue;
        const category = normalizeRelationCategory(String(rel.category || 'custom'));
        const type = normalizedType(rel.type);
        if (!type) continue;
        const key = `${category}|${type}|${target.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ category, type, target });
    }
    return out;
}

export function relationDisplayLabel(relation: CharacterRelation): string {
    const cat = RELATION_CATEGORIES.find(c => c.value === relation.category)?.label || relation.category;
    return `${cat} · ${relation.type}`;
}

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
