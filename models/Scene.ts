/**
 * Scene status progression
 */
export type SceneStatus = 'idea' | 'outlined' | 'draft' | 'written' | 'revised' | 'final';

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
    /** True when this item is a corkboard note card (not a regular scene card) */
    corkboardNote?: boolean;
    /** Optional custom corkboard note color (hex, e.g. #F7E27A) */
    corkboardNoteColor?: string;
    /** Timeline handling mode (linear, flashback, dream, parallel, etc.) */
    timeline_mode?: TimelineMode;
    /** Named strand for parallel / frame narratives (e.g. "1943", "outer frame") */
    timeline_strand?: string;
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
export type SortField = 'sequence' | 'chronologicalOrder' | 'title' | 'status' | 'act' | 'chapter' | 'wordcount' | 'modified';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
    field: SortField;
    direction: SortDirection;
}

/**
 * Available view types
 */
export type ViewType = 'board' | 'timeline' | 'storyline' | 'character' | 'stats';

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
 * Group-by mode for board view columns
 */
export type BoardGroupBy = 'act' | 'chapter' | 'status' | 'pov';

// ── Beat Sheet Templates ─────────────────────────────────

/**
 * A single beat / story point in a beat sheet template
 */
export interface BeatDefinition {
    /** Act number this beat belongs to */
    act: number;
    /** Beat label (e.g. "Opening Image", "Catalyst") */
    label: string;
    /** Short description of the beat's purpose */
    description: string;
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
 * Status display labels and colors
 */
export const STATUS_CONFIG: Record<SceneStatus, { label: string; color: string; icon: string }> = {
    idea: { label: 'Idea', color: 'var(--sl-status-idea, #9E9E9E)', icon: 'lightbulb' },
    outlined: { label: 'Outlined', color: 'var(--sl-status-outlined, #2196F3)', icon: 'list' },
    draft: { label: 'Draft', color: 'var(--sl-status-draft, #FF9800)', icon: 'pencil' },
    written: { label: 'Written', color: 'var(--sl-status-written, #4CAF50)', icon: 'file-text' },
    revised: { label: 'Revised', color: 'var(--sl-status-revised, #9C27B0)', icon: 'refresh-cw' },
    final: { label: 'Final', color: 'var(--sl-status-final, #F44336)', icon: 'check-circle' },
};

/**
 * Status order for sorting
 */
export const STATUS_ORDER: SceneStatus[] = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];
