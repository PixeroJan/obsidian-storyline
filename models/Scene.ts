 
/**
 * Scene status progression.
 * Built-in statuses are the canonical six plus any user-defined custom ones.
 * The type is widened to `string` so custom statuses pass type checks.
 */
export type BuiltinSceneStatus = 'idea' | 'outlined' | 'draft' | 'written' | 'revised' | 'final';
export type SceneStatus = BuiltinSceneStatus | (string & {});

/**
 * Custom status definition (user-created)
 */
export interface CustomStatusDef {
    id: string;
    label: string;
    color: string;
    icon: string;
    countsAsWritten?: boolean;
}

/**
 * Color coding mode for scene cards
 */
export type ColorCodingMode = 'pov' | 'status' | 'emotion' | 'act' | 'tag';

/**
 * Timeline mode — tells the plugin how to handle this scene's temporal position.
 *
 * - linear:       Default — enforce continuity checks.
 * - flashback:    Past event anchored to a reference point; suppress date-order warnings.
 * - flash_forward: Future event appearing early in the manuscript.
 * - parallel:     Belongs to a named alternate timeline strand.
 * - frame:        Belongs to an outer or inner frame narrative layer.
 * - simultaneous: Same moment as a referenced scene (same-time, different POV).
 * - timeskip:     Intentional gap — suppress gap warnings.
 * - dream:        Ignore all continuity checks.
 * - mythic:       No time anchor, floating outside measurable story-time.
 * - circular:     Intentional echo of another scene (loop-back).
 */
export type TimelineMode =
    | 'linear'
    | 'flashback'
    | 'flash_forward'
    | 'parallel'
    | 'frame'
    | 'simultaneous'
    | 'timeskip'
    | 'dream'
    | 'mythic'
    | 'circular';

/** Human-readable labels for each timeline mode */
export const TIMELINE_MODE_LABELS: Record<TimelineMode, string> = {
    linear: 'Linear',
    flashback: 'Flashback',
    flash_forward: 'Flash-forward',
    parallel: 'Parallel timeline',
    frame: 'Frame narrative',
    simultaneous: 'Simultaneous',
    timeskip: 'Time skip',
    dream: 'Dream / Vision',
    mythic: 'Mythic / Legend',
    circular: 'Circular',
};

/** Lucide icons for each timeline mode */
export const TIMELINE_MODE_ICONS: Record<TimelineMode, string> = {
    linear: 'arrow-right',
    flashback: 'undo-2',
    flash_forward: 'redo-2',
    parallel: 'git-branch',
    frame: 'frame',
    simultaneous: 'copy',
    timeskip: 'skip-forward',
    dream: 'cloud',
    mythic: 'scroll-text',
    circular: 'repeat',
};

/** All valid timeline mode values */
export const TIMELINE_MODES: TimelineMode[] = [
    'linear', 'flashback', 'flash_forward', 'parallel', 'frame',
    'simultaneous', 'timeskip', 'dream', 'mythic', 'circular',
];

/**
 * Scene data model - represents a single scene card
 */
export interface Scene {
    /** File path relative to vault root */
    filePath: string;
    /** type: scene identifier */
    type: 'scene';
    /** Scene title */
    title: string;
    /** Act number or name */
    act?: number | string;
    /** Chapter number or name */
    chapter?: number | string;
    /** Order in overall story (reading order — the order scenes appear in the manuscript) */
    sequence?: number;
    /** Chronological order — the order events happen in story time (for non-linear narratives) */
    chronologicalOrder?: number;
    /** Point of view character */
    pov?: string;
    /** Characters present in scene (wikilinks) */
    characters?: string[];
    /** Location (wikilink) */
    location?: string;
    /** When in story time (legacy, use storyDate/storyTime) */
    timeline?: string;
    /** Date in story (e.g. 2026-02-17, or 'Day 1') */
    storyDate?: string;
    /** Time in story (e.g. 14:00, 'evening', 'morning') */
    storyTime?: string;
    /** Scene completion status */
    status?: SceneStatus;
    /** Main conflict */
    conflict?: string;
    /** Emotional tone */
    emotion?: string;
    /** Character arc intensity: -10 (setback) to +10 (breakthrough) */
    intensity?: number;
    /** Actual word count */
    wordcount?: number;
    /** Actual character count (excludes markdown markup, comments, etc.) */
    charcount?: number;
    /** Target word count */
    target_wordcount?: number;
    /** Tags for plotlines, themes, etc. */
    tags?: string[];
    /** Scenes that set up this scene (file paths or titles) */
    setup_scenes?: string[];
    /** Scenes that pay off from this scene (file paths or titles) */
    payoff_scenes?: string[];
    /** Created date */
    created?: string;
    /** Modified date */
    modified?: string;
    /** Body content (without frontmatter) */
    body?: string;
    /** Editorial notes / revision comments (not part of manuscript) */
    notes?: string;
    /** Vault-relative path to an external notes markdown file (SceneNotes folder) */
    notesFile?: string;
    /** Brief scene synopsis (planning sketch — shown in the Info side panel) */
    synopsis?: string;
    /** True when this item is a corkboard note card (not a regular scene card) */
    corkboardNote?: boolean;
    /** Optional custom corkboard note color (hex, e.g. #F7E27A) */
    corkboardNoteColor?: string;
    /** Vault-relative path to an image displayed on the corkboard note */
    corkboardNoteImage?: string;
    /** Optional caption shown below the image (supports markdown / wikilinks) */
    corkboardNoteCaption?: string;
    /** Plot-grid origin label (e.g. "Act 1 / Romance") — informational, stripped on convert-to-scene */
    plotgridOrigin?: string;
    /** Timeline handling mode (linear, flashback, dream, parallel, etc.) */
    timeline_mode?: TimelineMode;
    /** Named strand for parallel / frame narratives (e.g. "1943", "outer frame") */
    timeline_strand?: string;
    /** Optional subtitle shown below the title (e.g. "Three years later", "Meanwhile, in Paris") */
    subtitle?: string;
    /** Optional custom scene card color (hex, e.g. #FF6B6B) — overrides color-coding when set */
    color?: string;
    /** Linked Codex entries per category — e.g. { animals: ['Dogs', 'Cats'], factions: ['Rebels'] } */
    codexLinks?: Record<string, string[]>;
    /**
     * Custom universal field values (keyed by template id).
     * `boolean` is supported for `checkbox`-type templates (1.10.43+).
     */
    universalFields?: Record<string, string | string[] | boolean>;
    /** Name of the beat sheet template used to create this scene */
    beatsheet?: string;
    /** Issue #89 — names of detected codex links the user explicitly ignored in this scene */
    ignored_detections?: string[];
    /** Issue #128 — marks this scene as an Arc Point (key turning point in the story) */
    arcAnchor?: boolean;
    /** Marks this scene as parked/out of manuscript flow without archiving it */
    inactive?: boolean;
}

/**
 * Represents a column in the board view
 */
export interface BoardColumn {
    id: string;
    title: string;
    scenes: Scene[];
}

/**
 * Filter configuration
 */
export interface SceneFilter {
    status?: SceneStatus[];
    act?: (number | string)[];
    chapter?: (number | string)[];
    pov?: string[];
    characters?: string[];
    locations?: string[];
    tags?: string[];
    searchText?: string;
    /** Filter by custom (universal) field values — keyed by template id → list of accepted values */
    customFields?: Record<string, string[]>;
    /** Arc Point filter: 'all' (default) | 'scenes' (non-arc-point only) | 'arcPoints' (arc points only) */
    arcAnchorFilter?: 'all' | 'scenes' | 'arcPoints';
    /** Active-state filter: 'active' (default) | 'all' | 'inactive' */
    activeState?: 'active' | 'all' | 'inactive';
}

/**
 * Saved filter preset
 */
export interface FilterPreset {
    name: string;
    filter: SceneFilter;
}

/**
 * Sort options
 */
export type SortField = 'sequence' | 'chronologicalOrder' | 'storyDate' | 'title' | 'status' | 'act' | 'chapter' | 'wordcount' | 'modified';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
    field: SortField;
    direction: SortDirection;
}

/**
 * Available view types
 */
export type ViewType = 'board' | 'timeline' | 'storyline' | 'character' | 'stats' | 'plotgrid' | 'manuscript' | 'codex' | 'location';

/**
 * Build the human-readable length label for a scene, honouring the user's
 * `countUnit` setting ('words' or 'chars'). Returns e.g. `"1234 words"` or
 * `"5678 chars"`. When a target word count is supplied and the unit is words,
 * the label reads `"1234 / 800 words"`; for chars the target is omitted
 * (targets are word-based).
 */
export function formatSceneLength(
    scene: Pick<Scene, 'wordcount' | 'charcount' | 'target_wordcount'>,
    unit: 'words' | 'chars' = 'words',
): string {
    if (unit === 'chars') {
        const chars = scene.charcount ?? 0;
        return `${chars} chars`;
    }
    const wc = scene.wordcount ?? 0;
    const target = scene.target_wordcount;
    return target ? `${wc} / ${target} words` : `${wc} words`;
}

/**
 * A reusable scene template with pre-filled defaults and body text
 */
export interface SceneTemplate {
    /** Template display name */
    name: string;
    /** Short description shown in the UI */
    description?: string;
    /** Default field values pre-filled when this template is selected */
    defaultFields: Partial<Pick<Scene, 'status' | 'emotion' | 'tags' | 'conflict' | 'target_wordcount'>>;
    /** Body text inserted into the scene file */
    bodyTemplate: string;
}

/**
 * Built-in scene templates shipped with the plugin
 */
export const BUILTIN_SCENE_TEMPLATES: SceneTemplate[] = [
    {
        name: 'Blank',
        description: 'Empty scene — no pre-filled body',
        defaultFields: {},
        bodyTemplate: '',
    },
    {
        name: 'Action Scene',
        description: 'Goal / Conflict / Outcome structure',
        defaultFields: { emotion: 'tense' },
        bodyTemplate:
`## Goal
What does the POV character want in this scene?

## Conflict
What stands in their way? Who opposes them?

## Action
Describe the key beats of the scene.

## Outcome
How does the scene end? What changes for the character?`,
    },
    {
        name: 'Dialogue Scene',
        description: 'Character conversation with emotional stakes',
        defaultFields: { emotion: 'reflective' },
        bodyTemplate:
`## Setup
Where are the characters, and what brought them here?

## Dialogue Focus
What is the conversation about? What subtext is at play?

## Emotional Stakes
What does each speaker want from this exchange?

## Takeaway
How has the relationship shifted by the end?`,
    },
    {
        name: 'Flashback',
        description: 'Past event revealed to the reader',
        defaultFields: { tags: ['flashback'] },
        bodyTemplate:
`## Trigger
What in the present triggers this memory?

## The Memory
Describe the past event in vivid detail.

## Emotional Weight
Why does this memory matter now?

## Return to Present
How does the character feel after reliving this?`,
    },
    {
        name: 'Opening Chapter',
        description: 'Hook, world, and character introduction',
        defaultFields: { status: 'idea' },
        bodyTemplate:
`## Hook
What grabs the reader's attention on page one?

## World & Setting
Establish time, place, and atmosphere.

## Character Introduction
Who is the POV character? What do they want?

## Inciting Moment
What disrupts the status quo?`,
    },
];

/**
 * Group-by mode for board view columns.
 * Built-in values plus opaque custom-field group keys of the form `cf:<templateId>`.
 */
export type BoardGroupBy = 'act' | 'chapter' | 'status' | 'pov' | (string & {});

// ── Beat Sheet Templates ─────────────────────────────────

/**
 * A single beat / story point in a beat sheet template
 */
export interface BeatDefinition {
    /** Act number this beat belongs to */
    act: number;
    /** Optional chapter number this beat belongs to (derived from beat order when absent) */
    chapter?: number;
    /** Beat label (e.g. "Opening Image", "Catalyst") */
    label: string;
    /** Optional subtitle used when creating a placeholder scene */
    subtitle?: string;
    /** Short description of the beat's purpose */
    description: string;
    /** Whether placeholder scenes created from this beat start as Arc Points */
    arcAnchor?: boolean;
}

/**
 * A named beat sheet template that pre-populates act/chapter structure
 */
export interface BeatSheetTemplate {
    /** Template display name */
    name: string;
    /** One-line summary */
    summary: string;
    /** Act numbers to create */
    acts: number[];
    /** Chapter/beat numbers to create (if appropriate, else empty) */
    chapters: number[];
    /** Labels for each act */
    actLabels: Record<number, string>;
    /** Labels for each chapter */
    chapterLabels: Record<number, string>;
    /** Detailed beat definitions for the template */
    beats: BeatDefinition[];
}

/**
 * Built-in beat sheet templates
 */
export const BUILTIN_BEAT_SHEETS: BeatSheetTemplate[] = [
    {
        name: 'Save the Cat',
        summary: 'Blake Snyder\'s 15-beat screenplay structure',
        acts: [1, 2, 3],
        chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        actLabels: {
            1: 'Act 1 — Setup',
            2: 'Act 2 — Confrontation',
            3: 'Act 3 — Resolution',
        },
        chapterLabels: {
            1: 'Opening Image',
            2: 'Theme Stated',
            3: 'Set-Up',
            4: 'Catalyst',
            5: 'Debate',
            6: 'Break into Two',
            7: 'B Story',
            8: 'Fun and Games',
            9: 'Midpoint',
            10: 'Bad Guys Close In',
            11: 'All Is Lost',
            12: 'Dark Night of the Soul',
            13: 'Break into Three',
            14: 'Finale',
            15: 'Final Image',
        },
        beats: [
            { act: 1, label: 'Opening Image', description: 'A snapshot of the protagonist\'s world before the journey begins.' },
            { act: 1, label: 'Theme Stated', description: 'Someone poses a question or statement hinting at the story\'s theme.' },
            { act: 1, label: 'Set-Up', description: 'Establish the protagonist\'s world, introduce key characters and stakes.' },
            { act: 1, label: 'Catalyst', description: 'An event that disrupts the status quo and sets the story in motion.' },
            { act: 1, label: 'Debate', description: 'The protagonist hesitates — should they accept the call to adventure?' },
            { act: 2, label: 'Break into Two', description: 'The protagonist commits and enters the new world / situation.' },
            { act: 2, label: 'B Story', description: 'A secondary storyline (often the love story) begins.' },
            { act: 2, label: 'Fun and Games', description: 'The promise of the premise — the reason the audience came.' },
            { act: 2, label: 'Midpoint', description: 'A major twist — false victory or false defeat that raises the stakes.' },
            { act: 2, label: 'Bad Guys Close In', description: 'External pressure mounts; internal doubts surface.' },
            { act: 2, label: 'All Is Lost', description: 'The protagonist hits rock bottom — the "whiff of death."' },
            { act: 2, label: 'Dark Night of the Soul', description: 'Deepest despair before the breakthrough.' },
            { act: 3, label: 'Break into Three', description: 'Eureka moment — the protagonist finds a new way forward.' },
            { act: 3, label: 'Finale', description: 'The protagonist confronts the antagonist with a new plan.' },
            { act: 3, label: 'Final Image', description: 'Mirror of the opening image — shows how the world has changed.' },
        ],
    },
    {
        name: '3-Act Structure',
        summary: 'Classic three-act dramatic structure',
        acts: [1, 2, 3],
        chapters: [],
        actLabels: {
            1: 'Act 1 — Setup',
            2: 'Act 2 — Confrontation',
            3: 'Act 3 — Resolution',
        },
        chapterLabels: {},
        beats: [
            { act: 1, label: 'Exposition', description: 'Introduce the protagonist, setting, and ordinary world.' },
            { act: 1, label: 'Inciting Incident', description: 'An event that disrupts the equilibrium and launches the story.' },
            { act: 1, label: 'First Turning Point', description: 'The protagonist commits to the journey — end of Act 1.' },
            { act: 2, label: 'Rising Action', description: 'Escalating conflicts, obstacles, and complications.' },
            { act: 2, label: 'Midpoint', description: 'A pivotal event that shifts the protagonist\'s approach.' },
            { act: 2, label: 'Crisis', description: 'The stakes are at their highest — everything hangs in the balance.' },
            { act: 2, label: 'Second Turning Point', description: 'A major reversal that launches the protagonist into Act 3.' },
            { act: 3, label: 'Climax', description: 'The protagonist faces the central conflict head-on.' },
            { act: 3, label: 'Falling Action', description: 'Immediate aftermath of the climax.' },
            { act: 3, label: 'Dénouement', description: 'Resolution — the new normal is established.' },
        ],
    },
    {
        name: 'Hero\'s Journey',
        summary: 'Joseph Campbell\'s monomyth in 12 stages',
        acts: [1, 2, 3],
        chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        actLabels: {
            1: 'Act 1 — Departure',
            2: 'Act 2 — Initiation',
            3: 'Act 3 — Return',
        },
        chapterLabels: {
            1: 'Ordinary World',
            2: 'Call to Adventure',
            3: 'Refusal of the Call',
            4: 'Meeting the Mentor',
            5: 'Crossing the Threshold',
            6: 'Tests, Allies, Enemies',
            7: 'Approach to the Inmost Cave',
            8: 'The Ordeal',
            9: 'Reward (Seizing the Sword)',
            10: 'The Road Back',
            11: 'Resurrection',
            12: 'Return with the Elixir',
        },
        beats: [
            { act: 1, label: 'Ordinary World', description: 'The hero\'s everyday life before the adventure.' },
            { act: 1, label: 'Call to Adventure', description: 'The hero receives a challenge or quest.' },
            { act: 1, label: 'Refusal of the Call', description: 'The hero hesitates or refuses the challenge.' },
            { act: 1, label: 'Meeting the Mentor', description: 'The hero gains guidance, training, or a gift.' },
            { act: 1, label: 'Crossing the Threshold', description: 'The hero commits to the journey and enters the special world.' },
            { act: 2, label: 'Tests, Allies, Enemies', description: 'The hero encounters challenges, makes allies, and faces enemies.' },
            { act: 2, label: 'Approach to the Inmost Cave', description: 'The hero prepares for the central ordeal.' },
            { act: 2, label: 'The Ordeal', description: 'The hero faces a life-or-death crisis.' },
            { act: 2, label: 'Reward (Seizing the Sword)', description: 'The hero claims the prize or knowledge gained.' },
            { act: 3, label: 'The Road Back', description: 'The hero begins the journey home, but faces pursuit or complications.' },
            { act: 3, label: 'Resurrection', description: 'The hero is tested once more — a final, purifying ordeal.' },
            { act: 3, label: 'Return with the Elixir', description: 'The hero returns transformed, bearing gifts or wisdom for the world.' },
        ],
    },
    {
        name: 'Seven-Point Story Structure',
        summary: 'Dan Wells\' seven key plot turning points',
        acts: [1, 2, 3],
        chapters: [1, 2, 3, 4, 5, 6, 7],
        actLabels: {
            1: 'Act 1 — Setup',
            2: 'Act 2 — Confrontation',
            3: 'Act 3 — Resolution',
        },
        chapterLabels: {
            1: 'Hook',
            2: 'Plot Turn 1',
            3: 'Pinch Point 1',
            4: 'Midpoint',
            5: 'Pinch Point 2',
            6: 'Plot Turn 2',
            7: 'Resolution',
        },
        beats: [
            { act: 1, label: 'Hook', description: 'The starting state — opposite of the resolution. Draw the reader in.' },
            { act: 1, label: 'Plot Turn 1', description: 'The event that sets the story in motion and moves the character from reaction to action.' },
            { act: 2, label: 'Pinch Point 1', description: 'Apply pressure. Force the character to act — something goes wrong.' },
            { act: 2, label: 'Midpoint', description: 'The character shifts from reaction to action. They commit to the goal.' },
            { act: 2, label: 'Pinch Point 2', description: 'More pressure. The situation seems hopeless — jaws of defeat.' },
            { act: 3, label: 'Plot Turn 2', description: 'The character obtains the final piece they need to succeed.' },
            { act: 3, label: 'Resolution', description: 'The climax and resolution — the opposite of the Hook.' },
        ],
    },
    {
        name: 'Story Circle',
        summary: 'Dan Harmon\'s 8-step narrative cycle',
        acts: [1, 2, 3],
        chapters: [1, 2, 3, 4, 5, 6, 7, 8],
        actLabels: {
            1: 'Act 1 — The Ordinary World',
            2: 'Act 2 — The Special World',
            3: 'Act 3 — The Return',
        },
        chapterLabels: {
            1: 'You (Comfort Zone)',
            2: 'Need (Desire)',
            3: 'Go (Unfamiliar Situation)',
            4: 'Search (Adapt)',
            5: 'Find (Get What They Wanted)',
            6: 'Take (Pay the Price)',
            7: 'Return (Back to Start)',
            8: 'Change (Having Changed)',
        },
        beats: [
            { act: 1, label: 'You', description: 'Establish the character in their comfort zone.' },
            { act: 1, label: 'Need', description: 'The character wants or needs something.' },
            { act: 2, label: 'Go', description: 'The character enters an unfamiliar situation.' },
            { act: 2, label: 'Search', description: 'The character adapts and searches for what they need.' },
            { act: 2, label: 'Find', description: 'The character finds what they wanted.' },
            { act: 2, label: 'Take', description: 'The character pays a heavy price for it.' },
            { act: 3, label: 'Return', description: 'The character returns to their familiar situation.' },
            { act: 3, label: 'Change', description: 'The character has fundamentally changed.' },
        ],
    },
    {
        name: 'Romancing the Beat',
        summary: 'Gwen Hayes\' four-phase, twenty-beat romance structure',
        acts: [1, 2, 3, 4],
        chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        actLabels: {
            1: 'Phase 1 — The Setup',
            2: 'Phase 2 — Falling in Love',
            3: 'Phase 3 — Retreating from Love',
            4: 'Phase 4 — Fighting for Love',
        },
        chapterLabels: {
            1: 'Introduce Hero 1',
            2: 'Introduce Hero 2',
            3: 'Meet Cute',
            4: 'No Way #1',
            5: 'Adhesion',
            6: 'No Way #2',
            7: 'The Inkling',
            8: 'Deepening Desire',
            9: 'Maybe This Could Work',
            10: 'Midpoint of Love',
            11: 'Inkling of Doubt',
            12: 'Deepening Doubt',
            13: 'Retreat',
            14: 'Shields Up',
            15: 'Break Up',
            16: 'Dark Night of the Soul',
            17: 'Wake Up',
            18: 'Grand Gesture',
            19: 'Whole-Hearted',
            20: 'Epilogue',
        },
        beats: [
            // Phase 1 — The Setup (beats 1–5)
            { act: 1, label: 'Introduce Hero 1', description: 'Show the protagonist in their everyday life and what holds them back from love. Hint at their external goal and internal need.' },
            { act: 1, label: 'Introduce Hero 2', description: 'Show the love interest in their everyday life and what holds them back from love. Hint at their external goal and internal need.' },
            { act: 1, label: 'Meet Cute', description: 'The two heroes meet for the first time — memorable, sparky, and hinting at why they might be perfect for each other (and why now is not the time).' },
            { act: 1, label: 'No Way #1', description: 'One hero denies (internally or externally) that they will ever fall in love, especially not with this person. Make the argument compelling.' },
            { act: 1, label: 'Adhesion', description: 'An event or situation forces the heroes to stay close and work together toward a shared goal. They cannot walk away from each other.' },
            // Phase 2 — Falling in Love (beats 6–10)
            { act: 2, label: 'No Way #2', description: 'Despite being stuck together, the protagonist fights their feelings and restates the argument against love. External and internal goals clash.' },
            { act: 2, label: 'The Inkling', description: 'The heroes start to realize they might fall in love — a glimpse of a different side of each other, or an inexplicably romantic moment.' },
            { act: 2, label: 'Deepening Desire', description: 'No denying it anymore: the characters are falling for each other. They grow closer and show glimpses of who they really are.' },
            { act: 2, label: 'Maybe This Could Work', description: 'Both heroes begin to believe love could work. The "no way" argument is in doubt, but the growing relationship creates tension with external goals.' },
            { act: 2, label: 'Midpoint of Love', description: 'The tension culminates in an expression of affection — usually a kiss (or more). A false high: it feels like everything will work out.' },
            // Phase 3 — Retreating from Love (beats 11–15)
            { act: 3, label: 'Inkling of Doubt', description: 'After the high of the midpoint, uncertainty sets in. Old fears resurface and the heroes start to let their doubts get the better of them.' },
            { act: 3, label: 'Deepening Doubt', description: 'Insecurities run high. A misunderstanding or external pressure exploits the original "no way" reasons and drives the heroes apart.' },
            { act: 3, label: 'Retreat', description: 'It’s all too much. To stay safe, the heroes retreat and misunderstand each other. Trust is broken; the pain of connection feels too great.' },
            { act: 3, label: 'Shields Up', description: 'The worst has happened — the "no way" fear has come true. The protagonist reaffirms their commitment to hardening their heart and being alone.' },
            { act: 3, label: 'Break Up', description: 'It’s over. The relationship ends and the reader cannot tell if the heroes will find their way back. The protagonist chose not to be vulnerable.' },
            // Phase 4 — Fighting for Love (beats 16–20)
            { act: 4, label: 'Dark Night of the Soul', description: 'The protagonist wallows after the breakup. They should feel better, but feel worse. They relive happy memories and hint at a way back.' },
            { act: 4, label: 'Wake Up', description: 'The protagonist chooses love over fear. They realize they have agency and decide to address their flaws and fight for the relationship.' },
            { act: 4, label: 'Grand Gesture', description: 'One character takes a big risk to show they have changed and their love can conquer all. The gesture must be big enough to make up for past errors.' },
            { act: 4, label: 'Whole-Hearted', description: 'It worked. The heroes are together, have addressed the issues that kept them apart, and are ready for their happily ever after.' },
            { act: 4, label: 'Epilogue', description: 'A glimpse into the future: the heroes living their lives together, both changed for good. A moment of celebration and reader payoff.' },
        ],
    },
    {
        name: '27 Chapter Method',
        summary: 'Kat O\'Keeffe\'s fractal 3×3×3 story structure',
        acts: [1, 2, 3],
        chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
        actLabels: {
            1: 'Act 1 — Setup',
            2: 'Act 2 — Conflict',
            3: 'Act 3 — Resolution',
        },
        chapterLabels: {
            1: 'Opening / Introduction',
            2: 'Inciting Incident',
            3: 'Immediate Reaction',
            4: 'Reaction',
            5: 'Action',
            6: 'Consequence',
            7: 'Pressure',
            8: 'Plot Twist',
            9: 'Push',
            10: 'New World',
            11: 'Fun & Games',
            12: 'Old World Contrast',
            13: 'Build Up',
            14: 'Midpoint',
            15: 'Reversal',
            16: 'Action',
            17: 'Trials',
            18: 'Dedication',
            19: 'Calm Before the Storm',
            20: 'Plot Twist',
            21: 'Darkest Moment',
            22: 'Power Within',
            23: 'Action',
            24: 'Converge',
            25: 'Battle',
            26: 'Climax',
            27: 'Resolution',
        },
        beats: [
            { act: 1, label: 'Opening / Introduction', description: 'Introduce the hero and their ordinary world.' },
            { act: 1, label: 'Inciting Incident', description: 'The event that disrupts the hero\'s world.' },
            { act: 1, label: 'Immediate Reaction', description: 'The hero\'s gut response to the inciting incident.' },
            { act: 1, label: 'Reaction', description: 'Processing what happened — emotional fallout.' },
            { act: 1, label: 'Action', description: 'The hero takes their first meaningful step.' },
            { act: 1, label: 'Consequence', description: 'The result of that action — things escalate.' },
            { act: 1, label: 'Pressure', description: 'External forces tighten around the hero.' },
            { act: 1, label: 'Plot Twist', description: 'A revelation or reversal that changes everything.' },
            { act: 1, label: 'Push', description: 'The hero is pushed into the new world — end of Act 1.' },
            { act: 2, label: 'New World', description: 'The hero navigates unfamiliar territory.' },
            { act: 2, label: 'Fun & Games', description: 'The promise of the premise — exploring the new situation.' },
            { act: 2, label: 'Old World Contrast', description: 'A reminder of what was left behind.' },
            { act: 2, label: 'Build Up', description: 'Tension and stakes escalate toward the midpoint.' },
            { act: 2, label: 'Midpoint', description: 'A major shift — false victory or false defeat.' },
            { act: 2, label: 'Reversal', description: 'The consequences of the midpoint hit hard.' },
            { act: 2, label: 'Action', description: 'The hero fights back with a new approach.' },
            { act: 2, label: 'Trials', description: 'A series of escalating challenges.' },
            { act: 2, label: 'Dedication', description: 'The hero commits fully despite the cost — end of Act 2.' },
            { act: 3, label: 'Calm Before the Storm', description: 'A brief respite before the final confrontation.' },
            { act: 3, label: 'Plot Twist', description: 'A final revelation that raises the stakes.' },
            { act: 3, label: 'Darkest Moment', description: 'All seems lost — the hero\'s lowest point.' },
            { act: 3, label: 'Power Within', description: 'The hero finds inner strength or a key insight.' },
            { act: 3, label: 'Action', description: 'The hero takes decisive action toward the climax.' },
            { act: 3, label: 'Converge', description: 'All storylines and characters converge.' },
            { act: 3, label: 'Battle', description: 'The final confrontation begins.' },
            { act: 3, label: 'Climax', description: 'The decisive moment — victory or defeat.' },
            { act: 3, label: 'Resolution', description: 'The new normal — aftermath and closure.' },
        ],
    },
];

/**
 * Default scene template
 */
export const DEFAULT_SCENE_TEMPLATE = `---
type: scene
title: "{{title}}"
act: {{act}}
chapter: {{chapter}}
sequence: {{sequence}}
chronologicalOrder: {{chronologicalOrder}}
pov: "{{pov}}"
characters: {{characters}}
location: "{{location}}"
status: {{status}}
conflict: "{{conflict}}"
tags: {{tags}}
created: {{created}}
modified: {{modified}}
---

# Scene Description
{{description}}

## Goal
What does the POV character want?

## Conflict
What stands in their way?

## Outcome
How does the scene end? What changes?

## Notes
Additional thoughts, references, or reminders
`;

/**
 * Status display labels and colors — built-in statuses.
 * Use getStatusConfig() and getStatusOrder() at runtime to include custom statuses.
 */
export const BUILTIN_STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    idea: { label: 'Idea', color: 'var(--sl-status-idea, #9E9E9E)', icon: 'lightbulb' },
    outlined: { label: 'Outlined', color: 'var(--sl-status-outlined, #2196F3)', icon: 'list' },
    draft: { label: 'Draft', color: 'var(--sl-status-draft, #FF9800)', icon: 'pencil' },
    written: { label: 'Written', color: 'var(--sl-status-written, #4CAF50)', icon: 'file-text' },
    revised: { label: 'Revised', color: 'var(--sl-status-revised, #9C27B0)', icon: 'refresh-cw' },
    final: { label: 'Final', color: 'var(--sl-status-final, #F44336)', icon: 'check-circle' },
};

/** @deprecated Use getStatusConfig() for dynamic access. Kept for backward compatibility. */
export const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = BUILTIN_STATUS_CONFIG;

/**
 * Built-in status order for sorting
 */
export const BUILTIN_STATUS_ORDER: SceneStatus[] = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];

/** @deprecated Use getStatusOrder() for dynamic access. Kept for backward compatibility. */
export const STATUS_ORDER: SceneStatus[] = BUILTIN_STATUS_ORDER;

/**
 * Default fallback config for unknown/custom statuses without explicit config.
 */
const DEFAULT_STATUS_CFG = { label: '?', color: '#888', icon: 'circle' };

// ── Runtime custom-status registry ──
// Populated by the plugin on startup / when settings change.
let _customStatuses: CustomStatusDef[] = [];

/** Register custom statuses (called from plugin settings load). */
export function registerCustomStatuses(defs: CustomStatusDef[]): void {
    _customStatuses = defs;
}

/** Get the full status config (built-in + custom). */
export function getStatusConfig(): Record<string, { label: string; color: string; icon: string }> {
    const merged: Record<string, { label: string; color: string; icon: string }> = { ...BUILTIN_STATUS_CONFIG };
    for (const cs of _customStatuses) {
        merged[cs.id] = { label: cs.label, color: cs.color, icon: cs.icon };
    }
    return merged;
}

/** Get the full status order (built-in + custom). */
export function getStatusOrder(): SceneStatus[] {
    return [...BUILTIN_STATUS_ORDER, ..._customStatuses.map(cs => cs.id)];
}

/** Safely resolve a status config entry, returning a fallback for unknown statuses. */
export function resolveStatusCfg(status: string): { label: string; color: string; icon: string } {
    const cfg = getStatusConfig();
    return cfg[status] ?? { label: status.charAt(0).toUpperCase() + status.slice(1), color: DEFAULT_STATUS_CFG.color, icon: DEFAULT_STATUS_CFG.icon };
}

/** Return true when a status should count as written for progress summaries. */
export function isWrittenLikeStatus(status: string | undefined): boolean {
    if (!status) return false;
    if (status === 'written' || status === 'revised' || status === 'final') return true;
    return _customStatuses.some(cs => cs.id === status && cs.countsAsWritten === true);
}
 
