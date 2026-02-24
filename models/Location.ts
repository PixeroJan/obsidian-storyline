/**
 * Location / World data models.
 *
 * Two frontmatter types live in the same Locations/ folder:
 *   type: world    — big-picture worldbuilding container
 *   type: location  — a specific place, optionally linked to a world and/or parent location
 *
 * File layout:
 *   Locations/
 *     Eryndor.md                   ← world
 *     Eryndor/
 *       The Iron Citadel.md        ← location (world: Eryndor)
 *       Port Veyra.md              ← location (world: Eryndor)
 *       Port Veyra/
 *         The Rusty Anchor.md      ← location (world: Eryndor, parent: Port Veyra)
 */

// ── Shared base ────────────────────────────────────

interface LocationBase {
    /** Vault-relative path of the .md file */
    filePath: string;
    /** Vault-relative path to an image */
    image?: string;
    /** Created date */
    created?: string;
    /** Modified date */
    modified?: string;
    /** Free-form notes (markdown body) */
    notes?: string;
    /** User-defined custom fields */
    custom?: Record<string, string>;
}

// ── World ──────────────────────────────────────────

export interface StoryWorld extends LocationBase {
    type: 'world';
    /** World name */
    name: string;
    /** General description */
    description?: string;
    /** Geography, terrain, climate */
    geography?: string;
    /** Culture, norms, traditions, social structures */
    culture?: string;
    /** Systems of power and control */
    politics?: string;
    /** Rules of magic and/or technology */
    magicTechnology?: string;
    /** Myths, religion, philosophy */
    beliefs?: string;
    /** Economy and trade */
    economy?: string;
    /** Key historical events */
    history?: string;
}

// ── Location ───────────────────────────────────────

export type LocationType =
    | 'city'
    | 'town'
    | 'village'
    | 'building'
    | 'room'
    | 'wilderness'
    | 'landmark'
    | 'region'
    | 'country'
    | 'other';

export interface StoryLocation extends LocationBase {
    type: 'location';
    /** Location name */
    name: string;
    /** Kind of place */
    locationType?: LocationType | string;
    /** World this location belongs to (name) */
    world?: string;
    /** Parent location (name) — for nested hierarchy */
    parent?: string;
    /** Sights, sounds, smells */
    description?: string;
    /** Atmosphere / mood */
    atmosphere?: string;
    /** Significance to story */
    significance?: string;
    /** Key inhabitants or characters often present here */
    inhabitants?: string;
    /** Connected or nearby locations */
    connectedLocations?: string;
    /** Map notes, coordinates, spatial info */
    mapNotes?: string;
}

/** Union type for convenience */
export type WorldOrLocation = StoryWorld | StoryLocation;

// ── Field definitions (drives the UI) ──────────────

export interface LocationFieldCategory {
    title: string;
    icon: string;
    fields: LocationFieldDef[];
}

export interface LocationFieldDef {
    key: string;  // key on StoryWorld or StoryLocation
    label: string;
    placeholder: string;
    multiline?: boolean;
}

/** Categories for World editing */
export const WORLD_CATEGORIES: LocationFieldCategory[] = [
    {
        title: 'Overview',
        icon: 'globe',
        fields: [
            { key: 'name', label: 'Name', placeholder: 'Name of the world or setting' },
            { key: 'description', label: 'Description', placeholder: 'General overview of this world', multiline: true },
        ],
    },
    {
        title: 'Geography',
        icon: 'mountain',
        fields: [
            { key: 'geography', label: 'Geography', placeholder: 'Environmental conditions, weather, climate, terrain', multiline: true },
        ],
    },
    {
        title: 'Culture',
        icon: 'landmark',
        fields: [
            { key: 'culture', label: 'Culture', placeholder: 'Norms, values, traditions, social structures', multiline: true },
        ],
    },
    {
        title: 'Politics',
        icon: 'crown',
        fields: [
            { key: 'politics', label: 'Politics', placeholder: 'Systems of power and control, governance', multiline: true },
        ],
    },
    {
        title: 'Magic / Technology',
        icon: 'wand-2',
        fields: [
            { key: 'magicTechnology', label: 'Magic / Technology', placeholder: 'Rules and limitations that govern how things work', multiline: true },
        ],
    },
    {
        title: 'Beliefs',
        icon: 'book-open',
        fields: [
            { key: 'beliefs', label: 'Beliefs', placeholder: 'Myths, spiritual, religious, and philosophical beliefs', multiline: true },
        ],
    },
    {
        title: 'Economy',
        icon: 'coins',
        fields: [
            { key: 'economy', label: 'Economy', placeholder: 'Trade, currency, resources, wealth distribution', multiline: true },
        ],
    },
    {
        title: 'History',
        icon: 'scroll-text',
        fields: [
            { key: 'history', label: 'History', placeholder: 'Key historical events, eras, conflicts', multiline: true },
        ],
    },
];

/** Categories for Location editing */
export const LOCATION_CATEGORIES: LocationFieldCategory[] = [
    {
        title: 'Overview',
        icon: 'map-pin',
        fields: [
            { key: 'name', label: 'Name', placeholder: 'Name of this location' },
            { key: 'locationType', label: 'Type', placeholder: 'City, building, wilderness, room…' },
            { key: 'description', label: 'Description', placeholder: 'Sights, sounds, smells — what does it feel like?', multiline: true },
        ],
    },
    {
        title: 'Atmosphere',
        icon: 'cloud',
        fields: [
            { key: 'atmosphere', label: 'Atmosphere / Mood', placeholder: 'The feeling this place evokes', multiline: true },
        ],
    },
    {
        title: 'Story Significance',
        icon: 'bookmark',
        fields: [
            { key: 'significance', label: 'Significance', placeholder: 'Why this place matters to the story', multiline: true },
        ],
    },
    {
        title: 'People',
        icon: 'users',
        fields: [
            { key: 'inhabitants', label: 'Inhabitants', placeholder: 'Key inhabitants or characters often present', multiline: true },
        ],
    },
    {
        title: 'Connections',
        icon: 'link',
        fields: [
            { key: 'connectedLocations', label: 'Connected Locations', placeholder: 'Nearby or linked locations' },
            { key: 'mapNotes', label: 'Map Notes', placeholder: 'Coordinates, spatial relationships, layout notes', multiline: true },
        ],
    },
];

/** Location type options for the dropdown */
export const LOCATION_TYPES: string[] = [
    'City',
    'Town',
    'Village',
    'Building',
    'Room',
    'Wilderness',
    'Landmark',
    'Region',
    'Country',
    'Other',
];

/** Frontmatter keys for World */
export const WORLD_FIELD_KEYS: (keyof StoryWorld)[] = [
    'name', 'image', 'description', 'geography', 'culture', 'politics',
    'magicTechnology', 'beliefs', 'economy', 'history',
];

/** Frontmatter keys for Location */
export const LOCATION_FIELD_KEYS: (keyof StoryLocation)[] = [
    'name', 'image', 'locationType', 'world', 'parent', 'description',
    'atmosphere', 'significance', 'inhabitants', 'connectedLocations', 'mapNotes',
];
