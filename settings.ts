/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import type SceneCardsPlugin from './main';
import { SLDocxSettings, SL_DEFAULT_DOCX_SETTINGS } from './services/DocxConverter';
import { SLPdfSettings, SL_DEFAULT_PDF_SETTINGS } from './services/PdfConverter';
import { AddFieldModal } from './components/AddFieldModal';
import type { UniversalFieldTemplate } from './services/FieldTemplateService';
import { ColorCodingMode, CustomStatusDef, SceneStatus, SceneTemplate, ViewType, getStatusConfig, getStatusOrder, registerCustomStatuses } from './models/Scene';
import { App, Modal, Notice, PluginSettingTab, Setting, TFolder, TextAreaComponent, AbstractInputSuggest } from 'obsidian';
import * as obsidian from 'obsidian';
import { SUPPORTED_STORYLINE_LOCALES, normalizeStoryLineLocale } from './utils/locale';

// ═══════════════════════════════════════════════════════
//  COLOR PALETTES — Catppuccin + Mood-based
// ═══════════════════════════════════════════════════════

export type ColorScheme =
    // Catppuccin
    | 'latte' | 'frappe' | 'macchiato' | 'mocha'
    // Mood-based
    | 'spring' | 'morning' | 'summer' | 'dusk'
    | 'midnight' | 'autumn' | 'ocean' | 'forest'
    | 'sunset' | 'arctic' | 'vintage' | 'neon'
    // Manual
    | 'custom';

export const COLOR_SCHEME_LABELS: Record<ColorScheme, string> = {
    // Catppuccin
    latte:     'Latte',
    frappe:    'Frappé',
    macchiato: 'Macchiato',
    mocha:     'Mocha',
    // Mood
    spring:    'Spring',
    morning:   'Morning',
    summer:    'Summer',
    dusk:      'Dusk',
    midnight:  'Midnight',
    autumn:    'Autumn',
    ocean:     'Ocean',
    forest:    'Forest',
    sunset:    'Sunset',
    arctic:    'Arctic',
    vintage:   'Vintage',
    neon:      'Neon',
    // Manual
    custom:    'Custom',
};

/** Short mood descriptions for the settings UI */
export const COLOR_SCHEME_HINTS: Record<ColorScheme, string> = {
    latte:     'Pastel on light',
    frappe:    'Soft on mid-dark',
    macchiato: 'Muted on dark',
    mocha:     'Pastel on darkest',
    spring:    'Fresh & floral',
    morning:   'Warm & golden',
    summer:    'Vivid & bold',
    dusk:      'Warm & moody',
    midnight:  'Deep & mysterious',
    autumn:    'Earthy & harvest',
    ocean:     'Aquatic blues',
    forest:    'Woodland greens',
    sunset:    'Fiery & dramatic',
    arctic:    'Icy & crisp',
    vintage:   'Muted & nostalgic',
    neon:      'Electric & vivid',
    custom:    'Manual per-tag',
};

/** 14 accent colors per palette, ordered for maximum visual distinction */
const COLOR_PALETTES: Record<Exclude<ColorScheme, 'custom'>, string[]> = {
    // ── Catppuccin ──────────────────────────────────
    latte: [
        '#8839ef', '#fe640b', '#1e66f5', '#40a02b', '#e64553',
        '#179299', '#df8e1d', '#7287fd', '#ea76cb', '#04a5e5',
        '#d20f39', '#209fb5', '#dd7878', '#dc8a78',
    ],
    frappe: [
        '#ca9ee6', '#ef9f76', '#8caaee', '#a6d189', '#e78284',
        '#81c8be', '#e5c890', '#babbf1', '#f4b8e4', '#99d1db',
        '#ea999c', '#85c1dc', '#eebebe', '#f2d5cf',
    ],
    macchiato: [
        '#c6a0f6', '#f5a97f', '#8aadf4', '#a6da95', '#ed8796',
        '#8bd5ca', '#eed49f', '#b7bdf8', '#f5bde6', '#91d7e3',
        '#ee99a0', '#7dc4e4', '#f0c6c6', '#f4dbd6',
    ],
    mocha: [
        '#cba6f7', '#fab387', '#89b4fa', '#a6e3a1', '#f38ba8',
        '#94e2d5', '#f9e2af', '#b4befe', '#f5c2e7', '#89dceb',
        '#eba0ac', '#74c7ec', '#f2cdcd', '#f5e0dc',
    ],

    // ── Mood-based ──────────────────────────────────

    spring: [
        '#e87898', // rose
        '#d458a0', // fuchsia
        '#b07cc8', // wisteria
        '#7888d8', // iris
        '#58a8e0', // cornflower
        '#48c4a8', // mint
        '#68c468', // clover
        '#98c448', // lime
        '#d4c040', // primrose
        '#e8a848', // marigold
        '#e87858', // coral
        '#c868a8', // peony
        '#58b8c8', // brook
        '#a8a858', // moss
    ],
    morning: [
        '#d89838', // sunrise
        '#c88040', // amber
        '#e0a870', // peach
        '#c88080', // blush
        '#a86898', // plum
        '#8880b8', // lavender
        '#6898c8', // sky
        '#58a890', // dewdrop
        '#80a860', // sage
        '#c8b850', // wheat
        '#d87840', // clay
        '#a85840', // brick
        '#589898', // mist
        '#9870a8', // violet
    ],
    summer: [
        '#e03058', // cherry
        '#e86020', // flame
        '#e8b008', // sun
        '#40b828', // lime
        '#08a868', // jade
        '#08b8c0', // cyan
        '#1880e0', // azure
        '#4058e0', // indigo
        '#8830d0', // violet
        '#d028a0', // pink
        '#c89818', // gold
        '#e84870', // raspberry
        '#189898', // teal
        '#984818', // rust
    ],
    dusk: [
        '#c07838', // glow
        '#986040', // umber
        '#886088', // mauve
        '#6868a0', // slate
        '#507888', // steel
        '#588870', // sage
        '#888850', // olive
        '#b89838', // ochre
        '#b06858', // terra
        '#785888', // plum
        '#907848', // bronze
        '#688868', // fern
        '#984858', // wine
        '#b89070', // sand
    ],
    midnight: [
        '#4858a8', // navy
        '#6040a0', // indigo
        '#384878', // deep
        '#286868', // teal
        '#703878', // plum
        '#587098', // steel
        '#784050', // wine
        '#607088', // storm
        '#305898', // sapphire
        '#287878', // cyan
        '#885888', // twilight
        '#506878', // slate
        '#388860', // aurora
        '#985878', // rose
    ],
    autumn: [
        '#c87020', // pumpkin
        '#a83020', // crimson
        '#788828', // olive
        '#c89820', // golden
        '#702820', // auburn
        '#984018', // rust
        '#689040', // sage
        '#b08020', // bronze
        '#901828', // cranberry
        '#a86830', // copper
        '#507028', // moss
        '#984838', // clay
        '#806028', // umber
        '#782030', // merlot
    ],
    ocean: [
        '#183870', // deep navy
        '#e07060', // coral
        '#188880', // teal
        '#70c8a8', // seafoam
        '#2870b8', // cobalt
        '#c8b070', // sand
        '#38b8a8', // aquamarine
        '#5070a0', // steel
        '#18a8c0', // turquoise
        '#c0a898', // driftwood
        '#085858', // abyss
        '#3090a0', // lagoon
        '#4888c8', // wave
        '#d08088', // shell
    ],
    forest: [
        '#2e6b3e', // pine
        '#5b7b3b', // moss
        '#4b9b4b', // fern
        '#7b6b4b', // bark
        '#9b8b7b', // mushroom
        '#7b9b5b', // sage
        '#2b8b5b', // emerald
        '#6b7b3b', // olive
        '#8b5b3b', // cedar
        '#8ba87b', // lichen
        '#b8883b', // amber
        '#4b5b3b', // understory
        '#8b3b5b', // berry
        '#b8a04b', // golden leaf
    ],
    sunset: [
        '#e86018', // blaze
        '#c82030', // crimson
        '#e838a0', // hot pink
        '#d8a010', // gold
        '#7830a8', // royal
        '#d018a0', // magenta
        '#e84828', // vermilion
        '#c89018', // amber
        '#8048c0', // violet
        '#d82838', // scarlet
        '#f08018', // tangerine
        '#c85878', // rose
        '#882878', // plum
        '#e86838', // flame
    ],
    arctic: [
        '#8ab8d8', // ice
        '#b0c8d8', // frost
        '#60c8a0', // aurora
        '#90b0d8', // polar
        '#a0a8b8', // cool gray
        '#58a8b8', // arctic teal
        '#b0a8c8', // snow lavender
        '#78c0d0', // glacier
        '#8898a8', // steel
        '#b0c0c8', // moonstone
        '#78c8d8', // pale cyan
        '#88d0b8', // mint
        '#a8b0b8', // silver
        '#68d0b0', // jade
    ],
    vintage: [
        '#c08888', // dusty rose
        '#88a880', // sage
        '#c0a050', // mustard
        '#883848', // burgundy
        '#508888', // teal
        '#a080a0', // mauve
        '#b8a060', // straw
        '#687840', // olive
        '#6878a0', // slate
        '#a86038', // rust
        '#885878', // plum
        '#487858', // forest
        '#a87850', // clay
        '#6888a8', // denim
    ],
    neon: [
        '#ff2890', // hot pink
        '#0098ff', // electric blue
        '#88ff28', // lime
        '#a828ff', // purple
        '#00e8e8', // cyan
        '#ffe800', // yellow
        '#ff28d8', // magenta
        '#28ff88', // neon green
        '#ff7800', // orange
        '#7828ff', // violet
        '#00d8d8', // turquoise
        '#ff2828', // red
        '#b8ff28', // chartreuse
        '#28ffd8', // aqua
    ],
};

/**
 * Get the palette array for a given scheme.
 * Returns undefined for 'custom'.
 */
export function getSchemeColors(scheme: ColorScheme): string[] | undefined {
    if (scheme === 'custom') return undefined;
    return COLOR_PALETTES[scheme];
}

// ── Sticky Note Color System ────────────────────────────────

/** 14 named base colors for sticky notes */
export const STICKY_NOTE_COLOR_NAMES = [
    'Yellow', 'Gold', 'Orange', 'Coral', 'Pink', 'Rose', 'Lavender',
    'Violet', 'Blue', 'Sky', 'Teal', 'Mint', 'Green', 'Sage',
] as const;

export type StickyNoteThemeId = 'classic' | 'pastel' | 'warm' | 'cool' | 'earth' | 'vivid';

export const STICKY_NOTE_THEME_LABELS: Record<StickyNoteThemeId, string> = {
    classic: 'Classic',
    pastel:  'Pastel',
    warm:    'Warm',
    cool:    'Cool',
    earth:   'Earth',
    vivid:   'Vivid',
};

export const STICKY_NOTE_THEME_HINTS: Record<StickyNoteThemeId, string> = {
    classic: 'Traditional sticky note tones',
    pastel:  'Very light & airy',
    warm:    'Sunny, warm-shifted tones',
    cool:    'Crisp, cool-shifted tones',
    earth:   'Muted, natural colours',
    vivid:   'Brighter, punchy pastels',
};

/** 14 harmonized colours per theme (order matches STICKY_NOTE_COLOR_NAMES) */
export const STICKY_NOTE_THEMES: Record<StickyNoteThemeId, string[]> = {
    classic: [
        '#F5EDAA', // Yellow
        '#F0DDA0', // Gold
        '#F5D3A6', // Orange
        '#F5C4B8', // Coral
        '#F5C4D4', // Pink
        '#F0BBDA', // Rose
        '#DDBEF0', // Lavender
        '#C8BCF0', // Violet
        '#B8CBF5', // Blue
        '#B0DAF5', // Sky
        '#B0E0DA', // Teal
        '#B8E8C8', // Mint
        '#C8E8B8', // Green
        '#D8E0B0', // Sage
    ],
    pastel: [
        '#FDF6C8', // Yellow
        '#FAE8B8', // Gold
        '#FADED0', // Orange
        '#FAD6D6', // Coral
        '#FAD2E4', // Pink
        '#F5CCE6', // Rose
        '#E8D4F8', // Lavender
        '#DCD2F8', // Violet
        '#CEDAF8', // Blue
        '#C8E6FA', // Sky
        '#C4EAE4', // Teal
        '#CCF0DA', // Mint
        '#D6F0CC', // Green
        '#E4EABC', // Sage
    ],
    warm: [
        '#F5E8A0', // Yellow
        '#F0D498', // Gold
        '#F0C4A0', // Orange
        '#F0B4AA', // Coral
        '#F0B0C4', // Pink
        '#E8AAC8', // Rose
        '#D8B0D8', // Lavender
        '#C8ACD8', // Violet
        '#B8C0D8', // Blue
        '#B0CFD8', // Sky
        '#B0D4CA', // Teal
        '#B8DABB', // Mint
        '#C6D8AA', // Green
        '#D4D4A0', // Sage
    ],
    cool: [
        '#ECE8B0', // Yellow
        '#E0DAB0', // Gold
        '#E0D0C0', // Orange
        '#E0C8CC', // Coral
        '#E0C2DA', // Pink
        '#D6BEE0', // Rose
        '#C8C2F0', // Lavender
        '#B8BCF0', // Violet
        '#A8C4F5', // Blue
        '#A0D4F5', // Sky
        '#A0DCD8', // Teal
        '#A8E4CA', // Mint
        '#B8E4B8', // Green
        '#CCD8AA', // Sage
    ],
    earth: [
        '#E0D8A0', // Yellow
        '#D6C898', // Gold
        '#D6BA9C', // Orange
        '#D4ACA8', // Coral
        '#D0A8B8', // Pink
        '#C8A0BA', // Rose
        '#BAA4C8', // Lavender
        '#AEA0C8', // Violet
        '#A0ACC8', // Blue
        '#9CBAC8', // Sky
        '#9CC0BC', // Teal
        '#A0C8AF', // Mint
        '#ACC8A0', // Green
        '#BCC098', // Sage
    ],
    vivid: [
        '#F8EC88', // Yellow
        '#F4D680', // Gold
        '#F8C490', // Orange
        '#F8B0A0', // Coral
        '#F8A8C0', // Pink
        '#F0A0CA', // Rose
        '#D8A8F0', // Lavender
        '#C4A2F4', // Violet
        '#A0BAF8', // Blue
        '#90D0F8', // Sky
        '#90DCD4', // Teal
        '#98E8BC', // Mint
        '#B0E8A0', // Green
        '#CCE090', // Sage
    ],
};

// ── HSL helpers ─────────────────────────────────────────────

function hexToHSL(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    const r = Number.parseInt(h.slice(0, 2), 16) / 255;
    const g = Number.parseInt(h.slice(2, 4), 16) / 255;
    const b = Number.parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l * 100];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let hue = 0;
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) hue = ((b - r) / d + 2) / 6;
    else hue = ((r - g) / d + 4) / 6;
    return [hue * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(c * 255).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/**
 * Apply hue-shift, saturation and lightness adjustments to a hex colour.
 * Adjustments are additive on the 0-100 / 0-360 scales.
 */
export function adjustHSL(hex: string, hueShift: number, satShift: number, lightShift: number): string {
    const [h, s, l] = hexToHSL(hex);
    return hslToHex(h + hueShift, s + satShift, l + lightShift);
}

/**
 * Return '#fff' or '#000' depending on which has better contrast against the
 * given background colour (WCAG relative-luminance formula).
 */
export function contrastTextColor(bgHex: string): string {
    const h = bgHex.replace('#', '');
    const r = Number.parseInt(h.slice(0, 2), 16) / 255;
    const g = Number.parseInt(h.slice(2, 4), 16) / 255;
    const b = Number.parseInt(h.slice(4, 6), 16) / 255;
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return luminance > 0.4 ? '#000' : '#fff';
}

/**
 * Resolve the final 14 sticky-note colours, applying:
 *  1. Theme base → 2. Per-index override → 3. Global HSL adjustments
 */
export function resolveStickyNoteColors(settings: {
    stickyNoteTheme: StickyNoteThemeId;
    stickyNoteOverrides: Record<number, string>;
    stickyNoteHue: number;
    stickyNoteSaturation: number;
    stickyNoteLightness: number;
}): Array<{ label: string; color: string }> {
    const base = STICKY_NOTE_THEMES[settings.stickyNoteTheme] ?? STICKY_NOTE_THEMES.classic;
    return base.map((c, i) => {
        const overridden = settings.stickyNoteOverrides[i] ?? c;
        const final = (settings.stickyNoteHue === 0 && settings.stickyNoteSaturation === 0 && settings.stickyNoteLightness === 0)
            ? overridden
            : adjustHSL(overridden, settings.stickyNoteHue, settings.stickyNoteSaturation, settings.stickyNoteLightness);
        return { label: STICKY_NOTE_COLOR_NAMES[i], color: final };
    });
}

/**
 * Resolve the effective color for a tag.
 * Priority: custom tagColors override > scheme auto-assignment > fallback.
 * HSL adjustments are applied to scheme-assigned colours (not custom overrides).
 */
export function resolveTagColor(
    tag: string,
    tagIndex: number,
    scheme: ColorScheme,
    tagColors: Record<string, string>,
    hslAdj?: { hue: number; sat: number; light: number },
): string {
    // Custom override always wins (no HSL applied — user chose exact colour)
    if (tagColors[tag]) return tagColors[tag];
    // Scheme auto-assign
    const palette = getSchemeColors(scheme);
    if (palette) {
        const base = palette[tagIndex % palette.length];
        if (hslAdj && (hslAdj.hue !== 0 || hslAdj.sat !== 0 || hslAdj.light !== 0)) {
            return adjustHSL(base, hslAdj.hue, hslAdj.sat, hslAdj.light);
        }
        return base;
    }
    // Fallback grey
    return '#888888';
}

/** Build the HSL adjustment object from plugin settings (for pass to resolveTagColor) */
export function getPlotlineHSL(settings: { plotlineHue: number; plotlineSaturation: number; plotlineLightness: number }): { hue: number; sat: number; light: number } {
    return { hue: settings.plotlineHue, sat: settings.plotlineSaturation, light: settings.plotlineLightness };
}

/**
 * Plugin settings interface
 */
export interface SceneCardsSettings {
    // Project setup
    storyLineRoot: string;
    activeProjectFile: string;

    // Scene defaults
    defaultStatus: SceneStatus;
    autoGenerateSequence: boolean;
    defaultTargetWordCount: number;
    /** User-defined custom statuses appended after the built-in six */
    customStatuses: CustomStatusDef[];

    // Display
    defaultView: ViewType;
    defaultBoardMode: 'corkboard' | 'kanban';
    /** Remembered board sub-mode from last session */
    lastBoardMode: 'corkboard' | 'kanban';
    /** Remembered kanban groupBy from last session */
    lastBoardGroupBy: string;
    /** Remembered Timeline order from last session */
    timelineOrder: 'reading' | 'chronological';
    /** Remembered Timeline swimlane mode from last session */
    timelineSwimlaneMode: boolean;
    /** Remembered Timeline swimlane group-by from last session */
    timelineSwimlaneGroupBy: string;
    /** Remembered Research view active tag filter */
    researchActiveTag: string | null;
    /** Remembered Research view active type filter */
    researchActiveType: string | null;
    autoOpenNavigator: boolean;
    showNotesInKanban: boolean;
    showScenesInCorkboard: boolean;
    plotgridAutoNote: boolean;
    colorCoding: ColorCodingMode;
    showWordCounts: boolean;
    /** Exclude Arc Point scenes from aggregate word counts and stats */
    excludeArcAnchorFromWordcount: boolean;
    showSceneNumberOnCards: boolean;
    compactCardView: boolean;
    /** What text to show beneath a scene card title: nothing, the synopsis field, or the first lines of the draft body. */
    cardPreviewSource: 'none' | 'synopsis' | 'body' | 'conflict';
    characterCardPortraitSize: number;
    characterDetailPortraitSize: number;
    locationTreeThumbSize: number;
    locationDetailPortraitWidth: number;
    locationDetailPortraitHeight: number;

    // Writing goals
    dailyWordGoal: number;
    weeklyWordGoal: number;
    monthlyWordGoal: number;
    projectWordGoal: number;

    // Custom location types (user-defined)
    customLocationTypes?: string[];

    // Advanced
    enablePlotHoleDetection: boolean;
    showWarnings: boolean;

    // Scene templates
    sceneTemplates: SceneTemplate[];

    // Tag / plotline color scheme
    colorScheme: ColorScheme;

    // Tag / plotline color assignments (custom overrides)
    tagColors: Record<string, string>;

    // Plotline colour HSL adjustments (applied to scheme colours)
    plotlineHue: number;
    plotlineSaturation: number;
    plotlineLightness: number;

    // Manual tag-type overrides (tag name lowercased → 'prop' | 'location' | 'character' | 'other')
    tagTypeOverrides: Record<string, string>;

    // Manual character alias mappings (lowercased alias → canonical character name)
    // e.g. { "sven": "Sven Andersson" } — user-defined via "Link to…" in Characters view
    characterAliases: Record<string, string>;

    // Which character field to show as the tagline on cards ('auto' = personality → occupation → age)
    characterTaglineField: string;

    // Character names to hide from the "no profile yet" list (lowercased)
    ignoredCharacters: string[];

    // Hide frontmatter (properties) in live preview / reading mode
    hideFrontmatter: boolean;

    /**
     * Hide the Obsidian tab header ("StoryLine - Projectname") above the
     * StoryLine toolbar to save ~30–45px of vertical space at the top of
     * every StoryLine view. Default `true` because the project name is
     * already shown elsewhere (in the tab title and project selector) and
     * the duplication wastes vertical real estate on smaller screens.
     * Users who liked the old layout can toggle it back on under
     * Settings → Display Options.
     */
    hideToolbarTitle?: boolean;

    /**
     * Show only the icon (not the text label) on each view-switcher tab
     * when the toolbar is too narrow to fit both. Default `true` because
     * the auto-hide is silent and additive — wide toolbars still show
     * label + icon as before.
     */
    autoHideViewLabels?: boolean;

    // DOCX export settings (adapted from ToWord plugin)
    docxSettings: SLDocxSettings;

    // PDF export settings (using pdf-lib)
    pdfSettings: SLPdfSettings;

    // Sticky note colour theme
    stickyNoteTheme: StickyNoteThemeId;
    // Per-index colour overrides (index 0–13 → hex)
    stickyNoteOverrides: Record<number, string>;
    // Global HSL adjustments applied on top of theme + overrides
    stickyNoteHue: number;
    stickyNoteSaturation: number;
    stickyNoteLightness: number;

    // Per-project colour override flag
    // When true, colorScheme, plotline HSL, stickyNote theme/HSL/overrides
    // are saved into/loaded from the project’s System/plotlines.json
    useProjectColors: boolean;

    // ── Codex settings ─────────────────────────────────
    /** IDs of enabled codex categories (e.g. ['items', 'creatures']) */
    codexEnabledCategories: string[];
    /** User-created custom codex category definitions */
    codexCustomCategories: Array<{ id: string; label: string; icon: string; showInSidebar?: boolean }>;

    // Per-category default custom field templates (#115). When a new entry is created
    // in this category, the listed field names are pre-populated with empty values.
    // Keyed by category id (e.g. 'items', 'creatures', or a custom id).
    codexCategoryFieldTemplates?: Record<string, string[]>;
    // Per-category user-defined custom sections (#114). Each section has a title,
    // an ordered list of fields, and an optional `position` slot describing where
    // the section is inserted among the built-in sections.
    //
    // Field entries can be either:
    //   * a bare string (legacy v1.10.15 — equivalent to `{ name, type: 'text' }`), or
    //   * a rich `{ name, type, placeholder?, options? }` definition added in
    //     v1.10.17 so users get the same input types they're used to from
    //     universal field templates (text, textarea, dropdown, multi-select,
    //     checkbox).
    //
    // Field values still live in `<entity>.custom` keyed by the composite
    // `${sectionTitle} :: ${fieldName}` so existing data round-trips cleanly.
    codexCategoryCustomSections?: Record<string, Array<{
        title: string;
        fields: Array<string | { name: string; type?: string; placeholder?: string; options?: string[] }>;
        position?: number;
    }>>;
    /** User-defined custom sections shared across all characters (#120 / v1.10.17). */
    characterCustomSections?: Array<{
        title: string;
        fields: Array<string | { name: string; type?: string; placeholder?: string; options?: string[] }>;
        position?: number;
    }>;
    /** User-defined custom sections shared across all locations / worlds (#120 / v1.10.17). */
    locationCustomSections?: Array<{
        title: string;
        fields: Array<string | { name: string; type?: string; placeholder?: string; options?: string[] }>;
        position?: number;
    }>;
    /** Which codex category IDs should appear in the Scene Inspector sidebar */
    codexSidebarCategories: string[];
    /** Series name — groups projects that share a common universe / codex */
    series: string;
    /** Optional vault-relative path to a shared codex folder for series */
    sharedCodex: string;
    /** Extra vault-relative folder paths to scan for StoryLine entities */
    extraFolders: string[];

    /** Hidden built-in field keys per view/category (e.g. { character: ['fears','belief'], items: ['previousOwners'] }) */
    hiddenFields: Record<string, string[]>;

    /** Show the built-in formatting toolbar in scene editors when Editing Toolbar plugin is not installed */
    showFormattingToolbar: boolean;

    /** Focus mode: how much to darken the whole UI (0–100, percentage) */
    focusDarkenAmount: number;
    /** Focus mode: blur radius in px for everything outside the text area (0–20) */
    focusBlurAmount: number;

    /** Timeline drag-scroll: pixels per animation frame when auto-scrolling (1–30) */
    timelineDragScrollSpeed: number;
    /** Timeline drag-scroll: pixel zone from viewport edge that triggers scrolling (20–200) */
    timelineDragScrollZone: number;

    /** Play a sound when the writing sprint timer ends */
    sprintEndSound: boolean;

    /**
     * Issue #73 — when true, scene/character/location references in YAML are
     * written as Obsidian wikilinks (`[[Name]]`). Existing plain-text values
     * remain readable; readers strip wikilink syntax in either case.
     */
    writeFieldsAsWikilinks?: boolean;

    /**
     * Issue #71 — when true, custom field values defined via Universal Field
     * Templates are mirrored to top-level YAML keys (in addition to the
     * `universalFields:` block) so they are visible to Obsidian Properties,
     * Bases, and Dataview. Each template controls its own `topLevelKey`.
     */
    universalFieldsMirrorTopLevel?: boolean;

    /**
     * Issue #66 — when true (and the active project belongs to a series),
     * cross-book "Series Arc View" scope is enabled in supported views.
     * Phase 1 is read-only and currently scaffolded only — see
     * `services/SceneProvider.ts` for the in-progress implementation.
     */
    seriesArcView?: boolean;

    /**
     * Issue #66 — when true, warn the user if a scene move would cross a
     * book boundary in Series Arc View. Defaults to true. Used by the
     * Phase 1 follow-up that wires writes through SceneProvider.
     */
    warnOnCrossBookMove?: boolean;

    /**
     * Issue #78 — when true, Obsidian `%%comment%%` blocks are stripped
     * from scene bodies before counting words. Defaults to true so that
     * `wordcount` reflects what the reader will actually see.
     */
    excludeCommentsFromWordcount?: boolean;

    /**
     * Issue #78 — when true, markdown task lines (`- [ ] …`, `- [x] …`)
     * are also dropped from the wordcount. Defaults to false because some
     * authors keep checklists as production notes that ship with the manuscript.
     */
    excludeChecklistFromWordcount?: boolean;

    /**
     * Default BCP-47 language tag applied to newly created projects (e.g. `'en'`,
     * `'sv'`, `'zh'`, `'ja'`, `'th'`). Drives word tokenisation, reading time,
     * stop-word filtering, dialogue % and PDF wrapping. Use `'auto'` to
     * auto-detect from manuscript text. Existing projects keep whatever
     * `language:` value is in their frontmatter.
     */
    defaultProjectLanguage?: string;

    /**
     * Issue #77 — raw YAML snippet merged into the frontmatter of every
     * newly-created scene. Lets users default fields like
     * `cssclasses: [fountain]` for use with companion plugins. StoryLine's
     * own keys (type, title, act, chapter, sequence, status…) always win
     * on conflict.
     */
    defaultSceneFrontmatter?: string;

    /**
     * Type of separator to insert between scenes in manuscript exports.
     * Can be a blank line, three asterisks (* * *), or a custom text string.
     */
    exportSceneSeparatorType?: 'blank' | 'asterisks' | 'custom';

    /**
     * Custom text/separator string to insert between scenes in manuscript exports
     * when `exportSceneSeparatorType` is set to 'custom'.
     */
    exportSceneSeparatorCustom?: string;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: SceneCardsSettings = {
    storyLineRoot: 'StoryLine',
    activeProjectFile: '',

    defaultStatus: 'idea',
    autoGenerateSequence: true,
    defaultTargetWordCount: 800,
    customStatuses: [],

    defaultView: 'board',
    defaultBoardMode: 'corkboard',
    lastBoardMode: 'corkboard',
    lastBoardGroupBy: 'act',
    timelineOrder: 'reading',
    timelineSwimlaneMode: false,
    timelineSwimlaneGroupBy: 'pov',
    researchActiveTag: null,
    researchActiveType: null,
    autoOpenNavigator: true,
    showNotesInKanban: false,
    showScenesInCorkboard: true,
    plotgridAutoNote: true,
    colorCoding: 'status',
    showWordCounts: true,
    excludeArcAnchorFromWordcount: true,
    showSceneNumberOnCards: true,
    compactCardView: false,
    cardPreviewSource: 'none',
    characterCardPortraitSize: 64,
    characterDetailPortraitSize: 96,
    locationTreeThumbSize: 20,
    locationDetailPortraitWidth: 120,
    locationDetailPortraitHeight: 80,

    dailyWordGoal: 1000,
    weeklyWordGoal: 7000,
    monthlyWordGoal: 30000,
    projectWordGoal: 80000,
    customLocationTypes: [],

    enablePlotHoleDetection: true,
    showWarnings: true,

    sceneTemplates: [],

    colorScheme: 'mocha' as ColorScheme,

    tagColors: {},

    plotlineHue: 0,
    plotlineSaturation: 0,
    plotlineLightness: 0,

    tagTypeOverrides: {},

    characterAliases: {},

    characterTaglineField: 'auto',

    ignoredCharacters: [],

    hideFrontmatter: true,
    hideToolbarTitle: true,
    autoHideViewLabels: true,

    docxSettings: { ...SL_DEFAULT_DOCX_SETTINGS },

    pdfSettings: { ...SL_DEFAULT_PDF_SETTINGS },

    stickyNoteTheme: 'classic' as StickyNoteThemeId,
    stickyNoteOverrides: {},
    stickyNoteHue: 0,
    stickyNoteSaturation: 0,
    stickyNoteLightness: 0,

    useProjectColors: false,

    codexEnabledCategories: ['items'],
    codexCustomCategories: [],
    codexCategoryFieldTemplates: {},
    codexCategoryCustomSections: {},
    characterCustomSections: [],
    locationCustomSections: [],
    /** Which codex category IDs should appear in the Scene Inspector sidebar */
    codexSidebarCategories: [] as string[],
    series: '',
    sharedCodex: '',
    extraFolders: [],

    hiddenFields: {},

    showFormattingToolbar: true,

    focusDarkenAmount: 40,
    focusBlurAmount: 1,

    timelineDragScrollSpeed: 8,
    timelineDragScrollZone: 60,
    sprintEndSound: true,
    writeFieldsAsWikilinks: true,
    universalFieldsMirrorTopLevel: true,
    seriesArcView: false,
    warnOnCrossBookMove: true,
    excludeCommentsFromWordcount: true,
    excludeChecklistFromWordcount: false,
    defaultProjectLanguage: 'en',
    defaultSceneFrontmatter: '',
    exportSceneSeparatorType: 'blank',
    exportSceneSeparatorCustom: '',
};

/**
 * Settings tab for the StoryLine plugin
 */
export class SceneCardsSettingTab extends PluginSettingTab {
    plugin: SceneCardsPlugin;

    constructor(app: App, plugin: SceneCardsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    private refreshSettingsView(): void {
        this.renderSettingsTab();
    }

    display(): void {
        this.renderSettingsTab();
    }

    private renderSettingsTab(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Root folder')
            .setDesc('Root folder for all StoryLine projects in your vault')
            .addText(text => text
                .setPlaceholder('StoryLine')
                .setValue(this.plugin.settings.storyLineRoot)
                .onChange(async (value) => {
                    this.plugin.settings.storyLineRoot = value || 'StoryLine';
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto-open Navigator')
            .setDesc('Automatically open the StoryLine Navigator sidebar when a project loads')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoOpenNavigator ?? true)
                .onChange(async (value) => {
                    this.plugin.settings.autoOpenNavigator = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Hide frontmatter')
            .setDesc('Hide the properties/frontmatter block on StoryLine notes only (live preview and reading mode). Since all fields are editable from the Inspector, frontmatter can safely be hidden. Your global Obsidian "Properties in document" setting is left untouched.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hideFrontmatter)
                .onChange(async (value) => {
                    this.plugin.settings.hideFrontmatter = value;
                    await this.plugin.saveSettings();
                    // Re-apply scoped hiding to currently open markdown leaves (issue #104)
                    this.plugin.updateFrontmatterVisibility();
                }));

        new Setting(containerEl)
            .setName('Hide "StoryLine" title above view tabs')
            .setDesc('Saves ~30–45px of vertical space at the top of every StoryLine view. The view-switcher tabs and project name still appear; only the duplicated "StoryLine" header is removed.')
            .addToggle(toggle => toggle
                .setValue(!!this.plugin.settings.hideToolbarTitle)
                .onChange(async (value) => {
                    this.plugin.settings.hideToolbarTitle = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateToolbarVisibility();
                }));

        new Setting(containerEl)
            .setName('Collapse view-tab labels when toolbar is narrow')
            .setDesc('When the StoryLine toolbar is too narrow to fit every view-tab label, show only the icon (Corkboard, Timeline, etc.). Disable to always show both icon and text — the labels will wrap or be clipped if the toolbar is small.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoHideViewLabels !== false)
                .onChange(async (value) => {
                    this.plugin.settings.autoHideViewLabels = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateToolbarVisibility();
                }));

        // ═══════════════════════════════════════════
        //  Scene Defaults & Templates
        // ═══════════════════════════════════════════
        new Setting(containerEl).setName('Scene Defaults').setHeading();

        new Setting(containerEl)
            .setName('Default status')
            .setDesc('Status for newly created scenes')
            .addDropdown(dropdown => {
                const statuses = getStatusOrder();
                const cfg = getStatusConfig();
                statuses.forEach(s => dropdown.addOption(s, cfg[s]?.label ?? (s.charAt(0).toUpperCase() + s.slice(1))));
                dropdown.setValue(this.plugin.settings.defaultStatus);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.defaultStatus = value as SceneStatus;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName('Auto-generate sequence')
            .setDesc('Automatically assign sequence numbers to new scenes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoGenerateSequence)
                .onChange(async (value) => {
                    this.plugin.settings.autoGenerateSequence = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Target word count')
            .setDesc('Default target word count per scene')
            .addText(text => text
                .setPlaceholder('800')
                .setValue(String(this.plugin.settings.defaultTargetWordCount))
                .onChange(async (value) => {
                    this.plugin.settings.defaultTargetWordCount = Number(value) || 800;
                    await this.plugin.saveSettings();
                }));

        // ── Custom Statuses ──
        new Setting(containerEl).setName('Custom Statuses').setHeading();
        containerEl.createEl('p', {
            cls: 'setting-item-description',
            text: 'Add custom scene statuses after the built-in six (Idea → Final). Useful for editorial workflows like "Sent to Team", "Waiting", "Published", etc.'
        });

        const customStatusList = containerEl.createDiv('sl-custom-status-list');
        const renderCustomStatusList = () => {
            customStatusList.empty();
            const defs = this.plugin.settings.customStatuses || [];
            if (defs.length === 0) {
                customStatusList.createEl('p', { cls: 'setting-item-description', text: 'No custom statuses defined.' });
            }
            for (let i = 0; i < defs.length; i++) {
                const def = defs[i];
                const row = customStatusList.createDiv('sl-custom-status-row');
                row.setCssStyles({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                });

                const colorSwatch = row.createEl('input', { type: 'color' });
                colorSwatch.value = def.color;
                colorSwatch.setCssStyles({
                    width: '32px',
                    height: '28px',
                    border: 'none',
                    cursor: 'pointer',
                });
                colorSwatch.addEventListener('change', async () => {
                    def.color = colorSwatch.value;
                    registerCustomStatuses(this.plugin.settings.customStatuses);
                    await this.plugin.saveSettings();
                });

                const labelInput = row.createEl('input', { type: 'text', value: def.label });
                labelInput.placeholder = 'Label';
                labelInput.setCssStyles({ flex: '1' });
                labelInput.addEventListener('change', async () => {
                    def.label = labelInput.value.trim() || def.id;
                    registerCustomStatuses(this.plugin.settings.customStatuses);
                    await this.plugin.saveSettings();
                });

                const writtenLabel = row.createEl('label');
                writtenLabel.setCssStyles({ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', whiteSpace: 'nowrap' });
                const writtenCheckbox = writtenLabel.createEl('input', { type: 'checkbox' });
                writtenCheckbox.checked = def.countsAsWritten === true;
                writtenLabel.createSpan({ text: 'Counts as written' });
                writtenCheckbox.addEventListener('change', async () => {
                    def.countsAsWritten = writtenCheckbox.checked;
                    registerCustomStatuses(this.plugin.settings.customStatuses);
                    await this.plugin.saveSettings();
                    this.plugin.refreshOpenViews();
                });

                const removeBtn = row.createEl('button', { text: '×', cls: 'clickable-icon' });
                removeBtn.addEventListener('click', async () => {
                    defs.splice(i, 1);
                    registerCustomStatuses(this.plugin.settings.customStatuses);
                    await this.plugin.saveSettings();
                    renderCustomStatusList();
                });
            }
        };
        renderCustomStatusList();

        new Setting(containerEl)
            .setName('Add custom status')
            .setDesc('Enter a name for the new status (e.g. "Sent to Team")')
            .addText(text => {
                text.setPlaceholder('Status name…');
                (text.inputEl as unknown as Record<string, unknown>)._ref = text;
            })
            .addButton(btn => {
                btn.setButtonText('Add').setCta().onClick(async () => {
                    const input = btn.buttonEl.parentElement?.parentElement?.querySelector('input[type="text"]') as HTMLInputElement;
                    const name = input?.value?.trim();
                    if (!name) return;
                    const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                    if (!id) return;
                    const existing = getStatusOrder();
                    if (existing.includes(id)) {
                        new (obsidian as unknown as { Notice: new (msg: string) => void }).Notice(`Status "${id}" already exists.`);
                        return;
                    }
                    if (!this.plugin.settings.customStatuses) this.plugin.settings.customStatuses = [];
                    this.plugin.settings.customStatuses.push({
                        id,
                        label: name,
                        color: '#607D8B',
                        icon: 'circle',
                        countsAsWritten: false,
                    });
                    registerCustomStatuses(this.plugin.settings.customStatuses);
                    await this.plugin.saveSettings();
                    input.value = '';
                    renderCustomStatusList();
                });
            });

        // ═══════════════════════════════════════════
        //  Display Options
        // ═══════════════════════════════════════════
        new Setting(containerEl).setName('Display').setHeading();

        new Setting(containerEl)
            .setName('Default view')
            .setDesc('Which view to open by default')
            .addDropdown(dropdown => {
                dropdown.addOption('board', 'Board');
                dropdown.addOption('manuscript', 'Manuscript');
                dropdown.addOption('plotgrid', 'Plotgrid');
                dropdown.addOption('timeline', 'Timeline');
                dropdown.addOption('storyline', 'Plotlines');
                dropdown.addOption('codex', 'Codex');
                dropdown.addOption('character', 'Characters');
                dropdown.addOption('location', 'Locations');
                dropdown.addOption('stats', 'Statistics');
                dropdown.setValue(this.plugin.settings.defaultView);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.defaultView = value as ViewType;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName('Default Board mode')
            .setDesc('Which sub-view opens first inside Board')
            .addDropdown(dropdown => {
                dropdown.addOption('corkboard', 'Corkboard');
                dropdown.addOption('kanban', 'Kanban');
                dropdown.setValue(this.plugin.settings.defaultBoardMode || 'corkboard');
                dropdown.onChange(async (value) => {
                    this.plugin.settings.defaultBoardMode = value as 'corkboard' | 'kanban';
                    await this.plugin.saveSettings();
                    this.plugin.refreshOpenViews();
                });
            });

        new Setting(containerEl)
            .setName('Color coding')
            .setDesc('How to color-code scene cards')
            .addDropdown(dropdown => {
                dropdown.addOption('status', 'By Status');
                dropdown.addOption('pov', 'By POV Character');
                dropdown.addOption('emotion', 'By Emotion');
                dropdown.addOption('act', 'By Act');
                dropdown.addOption('tag', 'By Tag / Plotline');
                dropdown.setValue(this.plugin.settings.colorCoding);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.colorCoding = value as ColorCodingMode;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName('Show notes in Kanban')
            .setDesc('When enabled, corkboard notes are also visible in Kanban columns')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showNotesInKanban ?? false)
                .onChange(async (value) => {
                    this.plugin.settings.showNotesInKanban = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshOpenViews();
                }));

        new Setting(containerEl)
            .setName('Show scenes in Corkboard')
            .setDesc('When enabled, scene cards are visible on the corkboard alongside notes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showScenesInCorkboard ?? true)
                .onChange(async (value) => {
                    this.plugin.settings.showScenesInCorkboard = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshOpenViews();
                }));

        new Setting(containerEl)
            .setName('Show word counts')
            .setDesc('Display word counts on scene cards')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showWordCounts)
                .onChange(async (value) => {
                    this.plugin.settings.showWordCounts = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Exclude Arc Points from word count')
            .setDesc('When enabled, scenes marked as Arc Points are excluded from aggregate word counts in Stats and the Manuscript footer')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.excludeArcAnchorFromWordcount ?? true)
                .onChange(async (value) => {
                    this.plugin.settings.excludeArcAnchorFromWordcount = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshOpenViews();
                }));

        new Setting(containerEl)
            .setName('Show scene number on cards')
            .setDesc('Display the sequence number badge in the card header')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showSceneNumberOnCards ?? true)
                .onChange(async (value) => {
                    this.plugin.settings.showSceneNumberOnCards = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshOpenViews();
                }));

        new Setting(containerEl)
            .setName('Compact card view')
            .setDesc('Show less detail on scene cards')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.compactCardView)
                .onChange(async (value) => {
                    this.plugin.settings.compactCardView = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Scene card preview text')
            .setDesc('Show a short preview beneath each scene card title')
            .addDropdown(dd => dd
                .addOption('none', 'None')
                .addOption('synopsis', 'Synopsis')
                .addOption('body', 'First lines of draft')
                .addOption('conflict', 'Conflict')
                .setValue(this.plugin.settings.cardPreviewSource || 'none')
                .onChange(async (value) => {
                    this.plugin.settings.cardPreviewSource = value as 'none' | 'synopsis' | 'body' | 'conflict';
                    await this.plugin.saveSettings();
                    this.plugin.refreshOpenViews();
                }));

        new Setting(containerEl)
            .setName('Formatting toolbar')
            .setDesc('Show a formatting toolbar in scene editors when the Editing Toolbar plugin is not installed')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showFormattingToolbar)
                .onChange(async (value) => {
                    this.plugin.settings.showFormattingToolbar = value;
                    await this.plugin.saveSettings();
                }));

        const imageDetails = containerEl.createEl('details', { cls: 'story-line-color-section' });
        imageDetails.createEl('summary', { text: 'Image & frame sizes' });
        const imageBody = imageDetails.createDiv();
        imageBody.setCssStyles({ padding: '8px 0' });

        const numberSetting = (
            parent: HTMLElement,
            name: string,
            desc: string,
            value: number,
            min: number,
            max: number,
            fallback: number,
            onSet: (next: number) => void,
        ) => {
            new Setting(parent)
                .setName(name)
                .setDesc(desc)
                .addText(text => text
                    .setPlaceholder(String(fallback))
                    .setValue(String(value))
                    .onChange(async (raw) => {
                        const parsed = Number(raw);
                        const next = Number.isFinite(parsed)
                            ? Math.max(min, Math.min(max, Math.round(parsed)))
                            : fallback;
                        onSet(next);
                        await this.plugin.saveSettings();
                    }));
        };

        numberSetting(
            imageBody,
            'Character card portrait size',
            'Size in px for the circular portrait on character cards (default 64).',
            this.plugin.settings.characterCardPortraitSize,
            32,
            200,
            64,
            (next) => this.plugin.settings.characterCardPortraitSize = next,
        );

        numberSetting(
            imageBody,
            'Character detail portrait size',
            'Size in px for the large character portrait in detail view (default 96).',
            this.plugin.settings.characterDetailPortraitSize,
            48,
            320,
            96,
            (next) => this.plugin.settings.characterDetailPortraitSize = next,
        );

        numberSetting(
            imageBody,
            'Location tree thumbnail size',
            'Size in px for location/world thumbnails in the tree (default 20).',
            this.plugin.settings.locationTreeThumbSize,
            12,
            80,
            20,
            (next) => this.plugin.settings.locationTreeThumbSize = next,
        );

        numberSetting(
            imageBody,
            'Location detail image width',
            'Width in px for location detail image frame (default 120).',
            this.plugin.settings.locationDetailPortraitWidth,
            64,
            480,
            120,
            (next) => this.plugin.settings.locationDetailPortraitWidth = next,
        );

        numberSetting(
            imageBody,
            'Location detail image height',
            'Height in px for location detail image frame (default 80).',
            this.plugin.settings.locationDetailPortraitHeight,
            48,
            360,
            80,
            (next) => this.plugin.settings.locationDetailPortraitHeight = next,
        );

        new Setting(imageBody)
            .setName('Reset image sizes')
            .setDesc('Restore all image/frame sizes to default values.')
            .addButton(btn => btn
                .setButtonText('Reset to defaults')
                .onClick(async () => {
                    this.plugin.settings.characterCardPortraitSize = DEFAULT_SETTINGS.characterCardPortraitSize;
                    this.plugin.settings.characterDetailPortraitSize = DEFAULT_SETTINGS.characterDetailPortraitSize;
                    this.plugin.settings.locationTreeThumbSize = DEFAULT_SETTINGS.locationTreeThumbSize;
                    this.plugin.settings.locationDetailPortraitWidth = DEFAULT_SETTINGS.locationDetailPortraitWidth;
                    this.plugin.settings.locationDetailPortraitHeight = DEFAULT_SETTINGS.locationDetailPortraitHeight;
                    await this.plugin.saveSettings();
                    this.refreshSettingsView();
                }));

        // ═══════════════════════════════════════════
        //  Custom Location Types
        // ═══════════════════════════════════════════
        new Setting(containerEl).setName('Custom Location Types').setHeading();

        const locTypesDesc = containerEl.createEl('p', {
            cls: 'setting-item-description',
            text: 'Add your own location types (e.g. Planet, Star System, Galaxy, Dimension) — they appear in the Type dropdown alongside the built-in options.',
        });
        locTypesDesc.setCssStyles({ marginBottom: '8px' });

        const renderCustomTypes = () => {
            // Remove any previously rendered list (when re-rendering after add/remove)
            containerEl.querySelectorAll('.sl-custom-loc-type-row').forEach(el => el.remove());

            const types = this.plugin.settings.customLocationTypes ?? [];
            for (const t of types) {
                new Setting(containerEl)
                    .setClass('sl-custom-loc-type-row')
                    .setName(t)
                    .addButton(btn => btn
                        .setIcon('trash')
                        .setTooltip('Remove')
                        .onClick(async () => {
                            const list = (this.plugin.settings.customLocationTypes ?? [])
                                .filter(x => x !== t);
                            this.plugin.settings.customLocationTypes = list;
                            await this.plugin.saveSettings();
                            renderCustomTypes();
                        }));
            }

            // Add input row at the bottom
            let pending = '';
            new Setting(containerEl)
                .setClass('sl-custom-loc-type-row')
                .setName('Add new type')
                .addText(text => text
                    .setPlaceholder('e.g. Planet')
                    .onChange(v => (pending = v)))
                .addButton(btn => btn
                    .setButtonText('Add')
                    .setCta()
                    .onClick(async () => {
                        const trimmed = pending.trim();
                        if (!trimmed) return;
                        const list = this.plugin.settings.customLocationTypes ?? [];
                        if (list.some(x => x.toLowerCase() === trimmed.toLowerCase())) {
                            return;
                        }
                        list.push(trimmed);
                        this.plugin.settings.customLocationTypes = list;
                        await this.plugin.saveSettings();
                        renderCustomTypes();
                    }));
        };
        renderCustomTypes();

        // ═══════════════════════════════════════════
        //  Writing Goals & Focus
        // ═══════════════════════════════════════════
        new Setting(containerEl).setName('Writing Goals').setHeading();

        new Setting(containerEl)
            .setName('Daily word goal')
            .setDesc('Target number of words per day (shown in Stats view)')
            .addText(text => text
                .setPlaceholder('1000')
                .setValue(String(this.plugin.settings.dailyWordGoal))
                .onChange(async (value) => {
                    this.plugin.settings.dailyWordGoal = Number(value) || 1000;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Weekly word goal')
            .setDesc('Target number of words per week (Monday → today, shown in Stats view)')
            .addText(text => text
                .setPlaceholder('7000')
                .setValue(String(this.plugin.settings.weeklyWordGoal))
                .onChange(async (value) => {
                    this.plugin.settings.weeklyWordGoal = Number(value) || 7000;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Monthly word goal')
            .setDesc('Target number of words for the current calendar month (shown in Stats view)')
            .addText(text => text
                .setPlaceholder('30000')
                .setValue(String(this.plugin.settings.monthlyWordGoal))
                .onChange(async (value) => {
                    this.plugin.settings.monthlyWordGoal = Number(value) || 30000;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Project word goal')
            .setDesc('Target total words for the active project (shown in Stats view)')
            .addText(text => text
                .setPlaceholder('80000')
                .setValue(String(this.plugin.settings.projectWordGoal))
                .onChange(async (value) => {
                    this.plugin.settings.projectWordGoal = Number(value) || 80000;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Sprint end sound')
            .setDesc('Play a chime when the writing sprint timer reaches zero')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.sprintEndSound)
                .onChange(async (value) => {
                    this.plugin.settings.sprintEndSound = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Write scene references as wikilinks')
            .setDesc('Issue #73 — when on, scene fields like POV, location, characters, setup_scenes and payoff_scenes are stored as Obsidian [[wikilinks]] so they auto-update on rename. Existing plain-text values keep working.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.writeFieldsAsWikilinks !== false)
                .onChange(async (value) => {
                    this.plugin.settings.writeFieldsAsWikilinks = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Mirror custom fields to top-level YAML')
            .setDesc('Issue #71 — when on, Universal Field values are also written as top-level YAML keys (using each template\'s "Top-level key") so they show up in Obsidian Properties, Bases, and Dataview. Reserved StoryLine keys are skipped automatically.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.universalFieldsMirrorTopLevel !== false)
                .onChange(async (value) => {
                    const wasOn = this.plugin.settings.universalFieldsMirrorTopLevel !== false;
                    this.plugin.settings.universalFieldsMirrorTopLevel = value;
                    await this.plugin.saveSettings();
                    // When the user flips the toggle ON, retro-mirror every
                    // existing entity so values already saved in
                    // `universalFields:` flow into the top-level YAML keys
                    // without requiring a manual re-edit per record.
                    if (value && !wasOn) {
                        try { await this.plugin.migrateUniversalFieldMirror(); }
                        catch (e) { console.error('[StoryLine] mirror toggle migration:', e); }
                    }
                }));

        // ── Issue #78 — Wordcount exclusions ──
        new Setting(containerEl)
            .setName('Exclude `%%comments%%` from wordcount')
            .setDesc('Issue #78 — strip Obsidian comment blocks (anything between `%%` markers) before counting words. Keeps `wordcount` aligned with what readers will actually see.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.excludeCommentsFromWordcount !== false)
                .onChange(async (value) => {
                    this.plugin.settings.excludeCommentsFromWordcount = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Also ignore checkbox lines (`- [ ]`, `- [x]`)')
            .setDesc('Issue #78 — also drop markdown task lines from the wordcount. Off by default because some authors keep checklists in the manuscript body.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.excludeChecklistFromWordcount === true)
                .onChange(async (value) => {
                    this.plugin.settings.excludeChecklistFromWordcount = value;
                    await this.plugin.saveSettings();
                }));

        // ── Multi-language support — default project language ──
        new Setting(containerEl)
            .setName('Default project language')
            .setDesc('BCP-47 tag used for word counting, reading time, dialogue %, stop-word filtering and PDF line wrapping. Choose Auto-detect to infer the script from manuscript text. Existing projects that still use the old default are updated too; otherwise set per-project by editing `language:` in the project frontmatter.')
            .addDropdown(dropdown => {
                dropdown.addOption('auto', 'Auto-detect from text');
                for (const { code, label } of SUPPORTED_STORYLINE_LOCALES) {
                    dropdown.addOption(code, `${label} (${code})`);
                }
                dropdown.setValue(this.plugin.settings.defaultProjectLanguage ?? 'en');
                dropdown.onChange(async (value) => {
                    const previousDefault = this.plugin.settings.defaultProjectLanguage ?? 'en';
                    this.plugin.settings.defaultProjectLanguage = value;
                    const activeProject = this.plugin.sceneManager?.activeProject;
                    let reindexScenes = false;

                    if (activeProject) {
                        const projectLocale = activeProject.locale ? normalizeStoryLineLocale(activeProject.locale) : '';
                        const previousLocale = normalizeStoryLineLocale(previousDefault);
                        if (!projectLocale || projectLocale === previousLocale) {
                            activeProject.locale = value;
                            await this.plugin.sceneManager.saveProjectFrontmatter(activeProject);
                            reindexScenes = true;
                        }
                    } else {
                        try {
                            const { setWordcountLocale } = await import('./services/MetadataParser');
                            setWordcountLocale(normalizeStoryLineLocale(value));
                        } catch { /* non-fatal */ }
                    }

                    await this.plugin.saveSettings();
                    if (reindexScenes) {
                        await this.plugin.sceneManager.initialize();
                        this.plugin.refreshOpenViews();
                    }
                });
            });

        // ── Issue #77 — Default scene frontmatter ──
        new Setting(containerEl)
            .setName('Default scene frontmatter')
            .setDesc('Issue #77 — raw YAML merged into the frontmatter of every newly-created scene. Useful for companion plugins (e.g. `cssclasses: [fountain]`). StoryLine\'s own keys (type, title, act, chapter, sequence, status…) always win on conflict.')
            .addTextArea(ta => {
                ta.setPlaceholder('cssclasses:\n  - fountain\n')
                    .setValue(this.plugin.settings.defaultSceneFrontmatter || '')
                    .onChange(async (value) => {
                        this.plugin.settings.defaultSceneFrontmatter = value;
                        await this.plugin.saveSettings();
                    });
                ta.inputEl.rows = 4;
                ta.inputEl.setCssStyles({
                    width: '100%',
                    fontFamily: 'var(--font-monospace)',
                });
            });

        const focusDetails = containerEl.createEl('details', { cls: 'story-line-color-section' });
        focusDetails.createEl('summary', { text: 'Focus Mode Settings' });
        const focusBody = focusDetails.createDiv();
        focusBody.setCssStyles({ padding: '12px 16px' });

        const focusDesc = focusBody.createDiv({ cls: 'setting-item-description' });
        focusDesc.setCssStyles({ marginBottom: '16px' });
        focusDesc.setText('Control how the UI changes when Focus mode is enabled in Manuscript view.');

        const createFocusSlider = (
            parent: HTMLElement,
            label: string,
            desc: string,
            value: number,
            min: number,
            max: number,
            step: number,
            unit: string,
            onChange: (v: number) => void,
        ) => {
            const row = parent.createDiv();
            row.setCssStyles({
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
            });

            const lbl = row.createSpan();
            lbl.setCssStyles({
                fontSize: '12px',
                minWidth: '90px',
            });
            lbl.textContent = label;
            lbl.title = desc;

            const slider = row.createEl('input', {
                type: 'range',
                attr: { min: String(min), max: String(max), step: String(step) },
            });
            slider.value = String(value);
            slider.setCssStyles({ flex: '1' });

            const valEl = row.createSpan();
            valEl.setCssStyles({
                fontSize: '11px',
                minWidth: '36px',
                textAlign: 'right',
            });
            valEl.textContent = `${value}${unit}`;

            let debounceTimer: number | null = null;
            slider.addEventListener('input', () => {
                const v = Number.parseFloat(slider.value);
                valEl.textContent = `${v}${unit}`;
                onChange(v);
                if (debounceTimer) window.clearTimeout(debounceTimer);
                debounceTimer = window.setTimeout(() => {
                    this.plugin.saveSettings();
                    this.plugin.refreshOpenViews();
                }, 300);
            });
        };

        // ── Environment group ──

        createFocusSlider(
            focusBody, 'Darken',
            'Darken the entire Obsidian UI (higher = darker overlay)',
            this.plugin.settings.focusDarkenAmount,
            0, 100, 5, '%',
            (v) => { this.plugin.settings.focusDarkenAmount = v; },
        );

        createFocusSlider(
            focusBody, 'Blur',
            'Blur everything outside the active text area (px)',
            this.plugin.settings.focusBlurAmount,
            0, 20, 1, 'px',
            (v) => { this.plugin.settings.focusBlurAmount = v; },
        );

        // Reset
        const focusResetRow = focusBody.createDiv();
        focusResetRow.setCssStyles({ marginTop: '8px' });
        const focusResetBtn = focusResetRow.createEl('button', { text: 'Reset to defaults' });
        focusResetBtn.setCssStyles({
            fontSize: '11px',
            padding: '2px 10px',
        });
        focusResetBtn.addEventListener('click', async () => {
            this.plugin.settings.focusDarkenAmount = 40;
            this.plugin.settings.focusBlurAmount = 1;
            await this.plugin.saveSettings();
            this.plugin.refreshOpenViews();
            this.refreshSettingsView();
        });

        // ── Timeline Drag-Scroll Settings (collapsible) ──
        const tlDetails = containerEl.createEl('details', { cls: 'story-line-timeline-scroll-section' });
        tlDetails.createEl('summary', { text: 'Timeline Drag-Scroll' });
        const tlBody = tlDetails.createDiv();
        tlBody.setCssStyles({ padding: '8px 0' });

        new Setting(tlBody)
            .setName('Scroll speed')
            .setDesc('Pixels scrolled per animation frame while dragging near the edge (1–30).')
            .addSlider(slider => slider
                .setLimits(1, 30, 1)
                .setValue(this.plugin.settings.timelineDragScrollSpeed)
                .onChange(async (value) => {
                    this.plugin.settings.timelineDragScrollSpeed = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(tlBody)
            .setName('Scroll zone')
            .setDesc('Pixel distance from the viewport edge where drag-scrolling activates (20–200).')
            .addSlider(slider => slider
                .setLimits(20, 200, 10)
                .setValue(this.plugin.settings.timelineDragScrollZone)
                .onChange(async (value) => {
                    this.plugin.settings.timelineDragScrollZone = value;
                    await this.plugin.saveSettings();
                })
            );

        // ═══════════════════════════════════════════
        //  Colors
        // ═══════════════════════════════════════════
        new Setting(containerEl).setName('Colors').setHeading();

        // --- Tag / Plotline Colors (collapsible) ---
        const colorDetails = containerEl.createEl('details', { cls: 'story-line-color-section' });
        colorDetails.createEl('summary', { text: 'Plotline Color Scheme' });

        const colorBody = colorDetails.createDiv();
        colorBody.setCssStyles({ padding: '8px 0' });

        // Per-project colour override toggle
        const projName = this.plugin.sceneManager?.activeProject?.title;
        if (projName) {
            new Setting(colorBody)
                .setName('Use project-specific colors')
                .setDesc(`Save color settings into "${projName}" instead of using the global defaults.`)
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.useProjectColors)
                    .onChange(async (value) => {
                        this.plugin.settings.useProjectColors = value;
                        if (!value) {
                            // Turning OFF: restore global colour defaults,
                            // then remove projectColors from plotlines.json
                            const g = (this.plugin as unknown as { _globalColorDefaults: Partial<SceneCardsSettings> })._globalColorDefaults;
                            if (g && Object.keys(g).length > 0) {
                                if (g.colorScheme !== undefined) this.plugin.settings.colorScheme = g.colorScheme;
                                if (g.plotlineHue !== undefined) this.plugin.settings.plotlineHue = g.plotlineHue;
                                if (g.plotlineSaturation !== undefined) this.plugin.settings.plotlineSaturation = g.plotlineSaturation;
                                if (g.plotlineLightness !== undefined) this.plugin.settings.plotlineLightness = g.plotlineLightness;
                                if (g.stickyNoteTheme !== undefined) this.plugin.settings.stickyNoteTheme = g.stickyNoteTheme;
                                if (g.stickyNoteHue !== undefined) this.plugin.settings.stickyNoteHue = g.stickyNoteHue;
                                if (g.stickyNoteSaturation !== undefined) this.plugin.settings.stickyNoteSaturation = g.stickyNoteSaturation;
                                if (g.stickyNoteLightness !== undefined) this.plugin.settings.stickyNoteLightness = g.stickyNoteLightness;
                                this.plugin.settings.stickyNoteOverrides = { ...(g.stickyNoteOverrides || {}) };
                            }
                        }
                        await this.plugin.saveSettings();
                        this.plugin.refreshOpenViews();
                        this.refreshSettingsView(); // re-render to update swatch previews
                    }));
        }

        // Compact scheme picker: grouped radio-style cards
        const schemeContainer = colorBody.createDiv();

        const SCHEME_GROUPS: { label: string; schemes: ColorScheme[] }[] = [
            { label: 'Catppuccin', schemes: ['latte', 'frappe', 'macchiato', 'mocha'] },
            { label: 'Moods', schemes: ['spring', 'morning', 'summer', 'dusk', 'midnight', 'autumn', 'ocean', 'forest', 'sunset', 'arctic', 'vintage', 'neon'] },
            { label: '', schemes: ['custom'] },
        ];

        const renderSchemePicker = () => {
            schemeContainer.empty();
            const current = this.plugin.settings.colorScheme;

            for (const group of SCHEME_GROUPS) {
                if (group.label) {
                    const groupLabel = schemeContainer.createDiv();
                    groupLabel.setCssStyles({
                        fontSize: '11px',
                        fontWeight: '600',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginTop: '10px',
                        marginBottom: '6px',
                    });
                    groupLabel.textContent = group.label;
                }

                const schemeRow = schemeContainer.createDiv();
                schemeRow.setCssStyles({
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginBottom: '8px',
                });

                for (const scheme of group.schemes) {
                    const label = COLOR_SCHEME_LABELS[scheme];
                    const hintText = COLOR_SCHEME_HINTS[scheme];
                    const palette = getSchemeColors(scheme);

                    const card = schemeRow.createDiv();
                    card.setCssStyles({
                        cursor: 'pointer',
                        padding: '6px 10px',
                        borderRadius: '8px',
                    });
                    card.setCssStyles({ border: scheme === current
                        ? '2px solid var(--interactive-accent)'
                        : '2px solid var(--background-modifier-border)' });
                    card.setCssStyles({ background: scheme === current
                        ? 'var(--background-modifier-hover)'
                        : 'transparent' });
                    card.setCssStyles({
                        minWidth: '100px',
                        textAlign: 'center',
                        transition: 'border-color 0.15s',
                    });

                    // Label
                    const nameEl = card.createDiv();
                    nameEl.setCssStyles({
                        fontSize: '11px',
                        fontWeight: '600',
                        marginBottom: '4px',
                    });
                    nameEl.textContent = label;

                    // Mood hint
                    const hint = card.createDiv();
                    hint.setCssStyles({
                        fontSize: '9px',
                        color: 'var(--text-faint)',
                        marginBottom: '4px',
                    });
                    hint.textContent = hintText;

                    // Swatches
                    if (palette) {
                        const swatchRow = card.createDiv();
                        swatchRow.setCssStyles({
                            display: 'flex',
                            gap: '2px',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                        });
                        for (let i = 0; i < Math.min(7, palette.length); i++) {
                            const dot = swatchRow.createDiv();
                            dot.setCssStyles({
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: palette[i],
                            });
                        }
                    } else {
                        const iconEl = card.createDiv();
                        iconEl.setCssStyles({
                            display: 'flex',
                            justifyContent: 'center',
                        });
                        obsidian.setIcon(iconEl, 'palette');
                        iconEl.setCssStyles({ color: 'var(--text-muted)' });
                    }

                    card.addEventListener('click', async () => {
                        this.plugin.settings.colorScheme = scheme;
                        await this.plugin.saveSettings();
                        renderSchemePicker();
                        this.plugin.refreshOpenViews();
                    });
                }
            }
        };

        renderSchemePicker();

        // Help text
        const helpText = colorBody.createEl('p', {
            cls: 'setting-item-description',
        });
        helpText.setCssStyles({ marginTop: '8px' });
        helpText.textContent = 'Colors are auto-assigned to plotline tags. To override a specific tag color, use the color picker in the Plotlines view.';

        // ── Plotline HSL sliders ──
        const plotSliderLabel = colorBody.createDiv();
        plotSliderLabel.setCssStyles({
            fontSize: '11px',
            fontWeight: '600',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginTop: '12px',
            marginBottom: '6px',
        });
        plotSliderLabel.textContent = 'Global Adjustments';

        // Preview swatch row
        const plotPreviewRow = colorBody.createDiv();
        plotPreviewRow.setCssStyles({
            display: 'flex',
            gap: '4px',
            flexWrap: 'wrap',
            marginBottom: '8px',
        });

        const updatePlotPreview = () => {
            plotPreviewRow.empty();
            const palette = getSchemeColors(this.plugin.settings.colorScheme);
            if (!palette) return;
            const adj = getPlotlineHSL(this.plugin.settings);
            const hasAdj = adj.hue !== 0 || adj.sat !== 0 || adj.light !== 0;
            for (let ci = 0; ci < Math.min(palette.length, 14); ci++) {
                const col = hasAdj ? adjustHSL(palette[ci], adj.hue, adj.sat, adj.light) : palette[ci];
                const dot = plotPreviewRow.createDiv();
                dot.setCssStyles({
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    background: col,
                    border: '1px solid var(--background-modifier-border)',
                });
            }
        };
        updatePlotPreview();

        const createPlotSlider = (
            label: string,
            value: number,
            min: number,
            max: number,
            onChange: (v: number) => void,
        ) => {
            const row = colorBody.createDiv();
            row.setCssStyles({
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
            });

            const lbl = row.createSpan();
            lbl.setCssStyles({
                fontSize: '12px',
                minWidth: '75px',
            });
            lbl.textContent = label;

            const slider = row.createEl('input', {
                type: 'range',
                attr: { min: String(min), max: String(max), step: '1' },
            });
            slider.value = String(value);
            slider.setCssStyles({ flex: '1' });

            const valEl = row.createSpan();
            valEl.setCssStyles({
                fontSize: '11px',
                minWidth: '30px',
                textAlign: 'right',
            });
            valEl.textContent = String(value);

            let debounceTimer: number | null = null;
            slider.addEventListener('input', () => {
                const v = Number.parseInt(slider.value, 10);
                valEl.textContent = String(v);
                onChange(v);
                updatePlotPreview();
                if (debounceTimer) window.clearTimeout(debounceTimer);
                debounceTimer = window.setTimeout(() => {
                    this.plugin.saveSettings();
                    this.plugin.refreshOpenViews();
                }, 300);
            });
        };

        const ps = this.plugin.settings;
        createPlotSlider('Hue shift', ps.plotlineHue, -30, 30, (v) => { ps.plotlineHue = v; });
        createPlotSlider('Saturation', ps.plotlineSaturation, -50, 50, (v) => { ps.plotlineSaturation = v; });
        createPlotSlider('Lightness', ps.plotlineLightness, -30, 30, (v) => { ps.plotlineLightness = v; });

        const plotResetRow = colorBody.createDiv();
        plotResetRow.setCssStyles({ marginBottom: '12px' });
        const plotResetBtn = plotResetRow.createEl('button', { text: 'Reset adjustments' });
        plotResetBtn.setCssStyles({
            fontSize: '11px',
            padding: '2px 10px',
        });
        plotResetBtn.addEventListener('click', async () => {
            ps.plotlineHue = 0;
            ps.plotlineSaturation = 0;
            ps.plotlineLightness = 0;
            await this.plugin.saveSettings();
            this.plugin.refreshOpenViews();
            this.refreshSettingsView();
        });

        // Per-tag overrides summary (compact — only show if there ARE overrides)
        const overrides = Object.entries(this.plugin.settings.tagColors || {});
        if (overrides.length > 0) {
            const overrideSection = colorBody.createDiv();
            overrideSection.setCssStyles({ marginTop: '10px' });
            const overrideHeader = overrideSection.createDiv();
            overrideHeader.setCssStyles({
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
            });
            overrideHeader.createSpan({ text: 'Custom overrides', cls: 'setting-item-name' });

            const clearBtn = overrideHeader.createEl('button', { text: 'Clear all' });
            clearBtn.setCssStyles({
                fontSize: '11px',
                padding: '2px 8px',
            });
            clearBtn.addEventListener('click', async () => {
                this.plugin.settings.tagColors = {};
                await this.plugin.saveSettings();
                overrideSection.remove();
                this.plugin.refreshOpenViews();
            });

            const chipRow = overrideSection.createDiv();
            chipRow.setCssStyles({
                display: 'flex',
                gap: '4px',
                flexWrap: 'wrap',
            });
            for (const [tag, color] of overrides) {
                const chip = chipRow.createSpan();
                chip.setCssStyles({
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    background: color,
                    color: contrastTextColor(color),
                    cursor: 'pointer',
                });
                chip.textContent = tag;
                chip.setAttribute('title', `${tag}: ${color} — click to remove`);
                chip.addEventListener('click', async () => {
                    delete this.plugin.settings.tagColors[tag];
                    await this.plugin.saveSettings();
                    chip.remove();
                    this.plugin.refreshOpenViews();
                });
            }
        }

        // --- Sticky Note Colors (collapsible) ---
        const noteColorDetails = containerEl.createEl('details', { cls: 'story-line-color-section' });
        noteColorDetails.createEl('summary', { text: 'Sticky Note Colors' });
        const noteColorBody = noteColorDetails.createDiv();
        noteColorBody.setCssStyles({ padding: '8px 0' });
        this.renderStickyNoteSettings(noteColorBody);

        // ═══════════════════════════════════════════
        //  Project Management
        // ═══════════════════════════════════════════
        new Setting(containerEl).setName('Project Management').setHeading();

        const activeProject = this.plugin.sceneManager.activeProject;

        new Setting(containerEl)
            .setName('Rename book')
            .setDesc(activeProject ? `Current: "${activeProject.title}"` : 'No active project')
            .addButton(btn => btn
                .setButtonText('Rename…')
                .setDisabled(!activeProject)
                .onClick(() => {
                    (this.plugin.app as unknown as { commands: { executeCommandById: (id: string) => void } }).commands.executeCommandById('storyline:rename-project');
                }));

        new Setting(containerEl)
            .setName('Create series from this book')
            .setDesc(activeProject?.seriesId ? 'This book already belongs to a series.' : 'Wrap the current book in a new series.')
            .addButton(btn => btn
                .setButtonText('Create Series…')
                .setDisabled(!activeProject || !!activeProject.seriesId)
                .onClick(() => {
                    (this.plugin.app as unknown as { commands: { executeCommandById: (id: string) => void } }).commands.executeCommandById('storyline:create-series');
                }));

        new Setting(containerEl)
            .setName('Manage series')
            .setDesc('View, rename, and reorder books in your series.')
            .addButton(btn => btn
                .setButtonText('Manage Series…')
                .onClick(() => {
                    (this.plugin as unknown as { openSeriesManagementModal: () => void }).openSeriesManagementModal();
                }));

        // ═══════════════════════════════════════════
        //  Scene Templates
        // ═══════════════════════════════════════════
        new Setting(containerEl).setName('Scene Templates').setHeading();
        containerEl.createEl('p', {
            text: 'Custom templates pre-fill fields and body text when creating new scenes. Built-in templates are always available.',
            cls: 'setting-item-description',
        });

        const templateListEl = containerEl.createDiv('story-line-template-list');
        this.renderTemplateList(templateListEl);

        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('Add Template')
                .setCta()
                .onClick(() => {
                    const blank: SceneTemplate = { name: '', description: '', defaultFields: {}, bodyTemplate: '' };
                    new TemplateEditorModal(this.app, blank, async (tpl) => {
                        this.plugin.settings.sceneTemplates.push(tpl);
                        await this.plugin.saveSettings();
                        this.renderTemplateList(templateListEl);
                    }).open();
                }));

        // ═══════════════════════════════════════════
        //  Custom Scene Fields
        // ═══════════════════════════════════════════
        new Setting(containerEl).setName('Custom Scene Fields').setHeading();
        containerEl.createEl('p', {
            text: 'Define your own metadata fields that appear on every scene\u2019s Inspector. Useful for Story Grid functions, Truby aspects, beat-sheet labels, genre conventions, and any other scene tagging your method requires. Dropdown and multi-select fields can also be used to filter and group scenes on the Board.',
            cls: 'setting-item-description',
        });

        const sceneFieldListEl = containerEl.createDiv('story-line-scene-fields-list');
        this.renderSceneCustomFieldList(sceneFieldListEl);

        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('Add Scene Field')
                .setCta()
                .onClick(() => {
                    if (!this.plugin.fieldTemplates) return;
                    const modal = new AddFieldModal(
                        this.app,
                        'Scene',
                        null,
                        async (template) => {
                            template.category = 'scene';
                            await this.plugin.fieldTemplates.add(template);
                            this.renderSceneCustomFieldList(sceneFieldListEl);
                        },
                        undefined,
                        ['Scene'],
                    );
                    modal.open();
                }));

        // ═══════════════════════════════════════════
        //  Export & Import
        // ═══════════════════════════════════════════
        new Setting(containerEl).setName('Export & Import').setHeading();

        new Setting(containerEl)
            .setName('Scene separator')
            .setDesc('Separator used between scenes in manuscript exports (Markdown, Word, PDF, and HTML).')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    'blank': 'Blank Line',
                    'asterisks': '* * *',
                    'custom': 'Custom Separator',
                })
                .setValue(this.plugin.settings.exportSceneSeparatorType ?? 'blank')
                .onChange(async (value) => {
                    this.plugin.settings.exportSceneSeparatorType = value as 'blank' | 'asterisks' | 'custom';
                    await this.plugin.saveSettings();
                    this.refreshSettingsView();
                }));

        if (this.plugin.settings.exportSceneSeparatorType === 'custom') {
            new Setting(containerEl)
                .setName('Custom separator')
                .setDesc('Enter any UTF-8 character or text to use as a scene separator.')
                .addText(text => text
                    .setPlaceholder('e.g. ~ ~ ~')
                    .setValue(this.plugin.settings.exportSceneSeparatorCustom ?? '')
                    .onChange(async (value) => {
                        this.plugin.settings.exportSceneSeparatorCustom = value;
                        await this.plugin.saveSettings();
                    }));
        }

        // --- DOCX Export Settings (collapsible) ---
        this.renderDocxSettings(containerEl);

        // --- PDF Export Settings (collapsible) ---
        this.renderPdfSettings(containerEl);

        // --- Import (desktop-only) ---
        this.renderImportSettings(containerEl);

        // ═══════════════════════════════════════════
        //  Advanced
        // ═══════════════════════════════════════════
        const advancedDetails = containerEl.createEl('details', { cls: 'story-line-color-section' });
        advancedDetails.createEl('summary', { text: 'Advanced' });
        const advancedBody = advancedDetails.createDiv();

        new Setting(advancedBody)
            .setName('Enable plot hole detection')
            .setDesc('Show warnings for potential plot holes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enablePlotHoleDetection)
                .onChange(async (value) => {
                    this.plugin.settings.enablePlotHoleDetection = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(advancedBody)
            .setName('Show warnings')
            .setDesc('Display warning notifications')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showWarnings)
                .onChange(async (value) => {
                    this.plugin.settings.showWarnings = value;
                    await this.plugin.saveSettings();
                }));

        // --- Extra source folders (collapsible, experimental) ---
        const extraDetails = advancedBody.createEl('details', { cls: 'story-line-color-section' });
        extraDetails.createEl('summary', { text: 'Additional Source Folders (Experimental)' });
        const extraBody = extraDetails.createDiv();
        extraBody.setCssStyles({ padding: '8px 0' });

        const extraWarn = extraBody.createDiv({ cls: 'setting-item-description' });
        extraWarn.setCssStyles({
            color: 'var(--text-warning, orange)',
            marginBottom: '12px',
        });
        extraWarn.setText('⚠ Experimental — back up your files before linking external folders. Files in linked folders may be modified when you edit entities in StoryLine.');

        const extraDesc = extraBody.createDiv({ cls: 'setting-item-description' });
        extraDesc.setCssStyles({ marginBottom: '12px' });
        extraDesc.setText('Point StoryLine to any folder in your vault. All .md files inside will be scanned and automatically sorted by their frontmatter type: field.');

        // Render the current list of folders
        const listContainer = extraBody.createDiv();
        const renderFolderList = () => {
            listContainer.empty();
            const folders = this.plugin.settings.extraFolders || [];
            for (let i = 0; i < folders.length; i++) {
                const row = listContainer.createDiv();
                row.setCssStyles({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px',
                });

                const label = row.createSpan({ text: folders[i] });
                label.setCssStyles({
                    flex: '1',
                    fontFamily: 'var(--font-monospace)',
                    fontSize: '12px',
                });

                const removeBtn = row.createEl('button', { text: '×', cls: 'clickable-icon' });
                removeBtn.setCssStyles({
                    color: 'var(--text-error)',
                    fontSize: '16px',
                });
                removeBtn.addEventListener('click', async () => {
                    this.plugin.settings.extraFolders.splice(i, 1);
                    await this.plugin.saveSettings();
                    renderFolderList();
                });
            }
        };
        renderFolderList();

        // Add-folder row with folder suggest
        const addRow = extraBody.createDiv();
        addRow.setCssStyles({
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '8px',
        });

        const folderInput = addRow.createEl('input', { type: 'text', placeholder: 'Type or browse for a folder...' });
        folderInput.setCssStyles({ flex: '1' });
        folderInput.addClass('sl-folder-suggest-input');

        // Attach folder autocomplete
        new FolderSuggest(this.app, folderInput);

        const addBtn = addRow.createEl('button', { text: 'Add', cls: 'mod-cta' });
        addBtn.setCssStyles({ flexShrink: '0' });
        addBtn.addEventListener('click', async () => {
            const val = folderInput.value.trim();
            if (!val) return;
            if (!this.plugin.settings.extraFolders) this.plugin.settings.extraFolders = [];
            if (!this.plugin.settings.extraFolders.includes(val)) {
                this.plugin.settings.extraFolders.push(val);
                await this.plugin.saveSettings();
            }
            folderInput.value = '';
            renderFolderList();
        });
    }

    /** Render the tag-color assignment list with color pickers */
    private renderTagColorList(container: HTMLElement): void {
        container.empty();
        const tagColors = this.plugin.settings.tagColors || {};
        const scheme = this.plugin.settings.colorScheme;
        const isCustom = scheme === 'custom';

        // Gather all known tags from the scene index
        let allTags: string[] = [];
        try {
            allTags = this.plugin.sceneManager?.queryService.getAllTags() || [];
        } catch { /* scene manager may not be ready yet */ }

        // Merge in any tags that already have a persisted color but no longer appear in scenes
        const extraTags = Object.keys(tagColors).filter(t => !allTags.includes(t));
        const combinedTags = [...allTags, ...extraTags].sort();

        if (combinedTags.length === 0) {
            container.createEl('p', {
                text: 'No tags found. Create scenes with tags to assign colors here.',
                cls: 'setting-item-description',
            });
            return;
        }

        if (!isCustom) {
            container.createEl('p', {
                text: 'Colors are auto-assigned from the selected scheme. Use the color picker to override individual tags.',
                cls: 'setting-item-description',
            });
        }

        for (let ti = 0; ti < combinedTags.length; ti++) {
            const tag = combinedTags[ti];
            const customColor = tagColors[tag] || '';
            const schemeColor = resolveTagColor(tag, ti, scheme, {}, getPlotlineHSL(this.plugin.settings));
            const effectiveColor = customColor || schemeColor;
            const isOverridden = !!customColor;

            const s = new Setting(container);
            
            // Color swatch before the name
            const nameEl = s.nameEl;
            const swatch = nameEl.createSpan();
            swatch.setCssStyles({
                display: 'inline-block',
                width: '14px',
                height: '14px',
                borderRadius: '4px',
                background: effectiveColor,
                marginRight: '8px',
                verticalAlign: 'middle',
                border: '1px solid var(--background-modifier-border)',
            });
            nameEl.createSpan({ text: tag });

            if (isOverridden) {
                s.setDesc(`Custom: ${customColor}`);
            } else if (!isCustom) {
                s.setDesc(`Scheme: ${schemeColor}`);
            } else {
                s.setDesc('No color assigned');
            }

            // Color picker for override
            s.addColorPicker(picker => {
                picker.setValue(customColor || effectiveColor);
                picker.onChange(async (value) => {
                    this.plugin.settings.tagColors[tag] = value;
                    s.setDesc(`Custom: ${value}`);
                    swatch.setCssStyles({ background: value });
                    await this.plugin.saveSettings();
                    this.plugin.refreshOpenViews();
                });
            });

            // Reset button
            s.addExtraButton(btn => btn
                .setIcon('x')
                .setTooltip('Remove custom override')
                .onClick(async () => {
                    delete this.plugin.settings.tagColors[tag];
                    await this.plugin.saveSettings();
                    this.renderTagColorList(container);
                    this.plugin.refreshOpenViews();
                }));
        }
    }

    /**
     * When the sticky-note theme changes, remap any notes whose explicit
     * corkboardNoteColor matches an old preset to the corresponding new preset.
     * Notes with truly custom colours (not matching a preset) are left untouched.
     */
    private async migrateCorkboardNoteColors(
        oldPresets: Array<{ label: string; color: string }>,
        newPresets: Array<{ label: string; color: string }>,
    ): Promise<void> {
        const sm = this.plugin.sceneManager;
        if (!sm) return;
        // Build a map: normalised old hex → new hex (by index)
        const migration = new Map<string, string>();
        const len = Math.min(oldPresets.length, newPresets.length);
        for (let i = 0; i < len; i++) {
            const oldHex = oldPresets[i].color.toUpperCase();
            const newHex = newPresets[i].color.toUpperCase();
            if (oldHex !== newHex) migration.set(oldHex, newHex);
        }
        if (migration.size === 0) return;

        for (const scene of sm.getAllScenes()) {
            if (!scene.corkboardNoteColor) continue;
            const norm = scene.corkboardNoteColor.toUpperCase();
            const replacement = migration.get(norm);
            if (replacement) {
                await sm.updateScene(scene.filePath, { corkboardNoteColor: replacement });
                scene.corkboardNoteColor = replacement;
            }
        }
    }

    /** Render the sticky-note colour settings panel */
    private renderStickyNoteSettings(container: HTMLElement): void {
        // Snapshot of preset colors at the time this panel renders.
        // Used to detect which note colors should be migrated when
        // HSL sliders, per-swatch overrides, or reset/clear are used.
        let presetsSnapshot = resolveStickyNoteColors(this.plugin.settings);

        /** Migrate any notes whose stored color matches an old preset
         *  to the corresponding new preset, then update the snapshot. */
        const migrateAndUpdate = async () => {
            const newPresets = resolveStickyNoteColors(this.plugin.settings);
            await this.migrateCorkboardNoteColors(presetsSnapshot, newPresets);
            presetsSnapshot = newPresets;
        };

        const rerender = () => {
            container.empty();
            this.renderStickyNoteSettings(container);
            this.plugin.refreshOpenViews();
        };

        const settings = this.plugin.settings;

        // ── Theme picker — card grid ──
        const themeLabel = container.createDiv();
        themeLabel.setCssStyles({
            fontSize: '11px',
            fontWeight: '600',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '6px',
        });
        themeLabel.textContent = 'Theme';

        const themeRow = container.createDiv();
        themeRow.setCssStyles({
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '12px',
        });

        const themeIds: StickyNoteThemeId[] = ['classic', 'pastel', 'warm', 'cool', 'earth', 'vivid'];
        for (const tid of themeIds) {
            const card = themeRow.createDiv();
            card.setCssStyles({
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '8px',
            });
            card.setCssStyles({ border: tid === settings.stickyNoteTheme
                ? '2px solid var(--interactive-accent)'
                : '2px solid var(--background-modifier-border)' });
            card.setCssStyles({ background: tid === settings.stickyNoteTheme
                ? 'var(--background-modifier-hover)'
                : 'transparent' });
            card.setCssStyles({
                minWidth: '90px',
                textAlign: 'center',
                transition: 'border-color 0.15s',
            });

            const nameEl = card.createDiv();
            nameEl.setCssStyles({
                fontSize: '11px',
                fontWeight: '600',
                marginBottom: '2px',
            });
            nameEl.textContent = STICKY_NOTE_THEME_LABELS[tid];

            const hint = card.createDiv();
            hint.setCssStyles({
                fontSize: '9px',
                color: 'var(--text-faint)',
                marginBottom: '4px',
            });
            hint.textContent = STICKY_NOTE_THEME_HINTS[tid];

            // Mini swatches
            const swatchRow = card.createDiv();
            swatchRow.setCssStyles({
                display: 'flex',
                gap: '2px',
                justifyContent: 'center',
                flexWrap: 'wrap',
            });
            const themeColors = STICKY_NOTE_THEMES[tid];
            for (let i = 0; i < 7; i++) {
                const dot = swatchRow.createDiv();
                dot.setCssStyles({
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: themeColors[i],
                });
            }

            card.addEventListener('click', async () => {
                // Capture old resolved colors before changing theme
                const oldPresets = resolveStickyNoteColors(settings);
                settings.stickyNoteTheme = tid;
                settings.stickyNoteOverrides = {};
                // Migrate notes whose color matches an old preset to the new equivalent
                const newPresets = resolveStickyNoteColors(settings);
                await this.migrateCorkboardNoteColors(oldPresets, newPresets);
                await this.plugin.saveSettings();
                rerender();
            });
        }

        // ── Global HSL sliders ──
        const sliderLabel = container.createDiv();
        sliderLabel.setCssStyles({
            fontSize: '11px',
            fontWeight: '600',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginTop: '8px',
            marginBottom: '6px',
        });
        sliderLabel.textContent = 'Global Adjustments';

        const createSlider = (
            label: string,
            value: number,
            min: number,
            max: number,
            onChange: (v: number) => void,
        ) => {
            const row = container.createDiv();
            row.setCssStyles({
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
            });

            const lbl = row.createSpan();
            lbl.setCssStyles({
                fontSize: '12px',
                minWidth: '75px',
            });
            lbl.textContent = label;

            const slider = row.createEl('input', {
                type: 'range',
                attr: { min: String(min), max: String(max), step: '1' },
            });
            slider.value = String(value);
            slider.setCssStyles({ flex: '1' });

            const valEl = row.createSpan();
            valEl.setCssStyles({
                fontSize: '11px',
                minWidth: '30px',
                textAlign: 'right',
            });
            valEl.textContent = String(value);

            let debounceTimer: number | null = null;
            slider.addEventListener('input', () => {
                const v = Number.parseInt(slider.value, 10);
                valEl.textContent = String(v);
                onChange(v);
                // Instant swatch preview
                updateSwatches();
                // Debounce the heavier save + view refresh
                if (debounceTimer) window.clearTimeout(debounceTimer);
                debounceTimer = window.setTimeout(async () => {
                    await migrateAndUpdate();
                    await this.plugin.saveSettings();
                    this.plugin.refreshOpenViews();
                }, 300);
            });
        };

        createSlider('Hue shift', settings.stickyNoteHue, -30, 30, (v) => { settings.stickyNoteHue = v; });
        createSlider('Saturation', settings.stickyNoteSaturation, -50, 50, (v) => { settings.stickyNoteSaturation = v; });
        createSlider('Lightness', settings.stickyNoteLightness, -30, 30, (v) => { settings.stickyNoteLightness = v; });

        // Reset sliders button
        const resetRow = container.createDiv();
        resetRow.setCssStyles({ marginBottom: '12px' });
        const resetBtn = resetRow.createEl('button', { text: 'Reset adjustments' });
        resetBtn.setCssStyles({
            fontSize: '11px',
            padding: '2px 10px',
        });
        resetBtn.addEventListener('click', async () => {
            const oldPresets = presetsSnapshot;
            settings.stickyNoteHue = 0;
            settings.stickyNoteSaturation = 0;
            settings.stickyNoteLightness = 0;
            const newPresets = resolveStickyNoteColors(settings);
            await this.migrateCorkboardNoteColors(oldPresets, newPresets);
            await this.plugin.saveSettings();
            rerender();
        });

        // ── Colour swatches with per-colour overrides ──
        const swatchLabel = container.createDiv();
        swatchLabel.setCssStyles({
            fontSize: '11px',
            fontWeight: '600',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '6px',
        });
        swatchLabel.textContent = 'Preview & Individual Overrides';

        const swatchGrid = container.createDiv();
        swatchGrid.setCssStyles({
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            marginBottom: '8px',
        });

        const updateSwatches = () => {
            swatchGrid.empty();
            const resolved = resolveStickyNoteColors(settings);
            for (let i = 0; i < resolved.length; i++) {
                const { label, color } = resolved[i];
                const isOverridden = settings.stickyNoteOverrides[i] !== undefined;

                const cell = swatchGrid.createDiv();
                cell.setCssStyles({
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    width: '52px',
                });

                const dot = cell.createDiv();
                dot.setCssStyles({
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: color,
                });
                dot.setCssStyles({ border: isOverridden
                    ? '2px solid var(--interactive-accent)'
                    : '1px solid var(--background-modifier-border)' });
                dot.setCssStyles({ cursor: 'pointer' });
                dot.title = `${label}: ${color}${isOverridden ? ' (custom)' : ''}\nClick to change`;

                // Hidden colour picker
                const picker = cell.createEl('input', {
                    type: 'color',
                    attr: { value: color },
                });
                picker.setCssStyles({
                    position: 'absolute',
                    opacity: '0',
                    pointerEvents: 'none',
                    width: '0',
                    height: '0',
                });

                dot.addEventListener('click', () => picker.click());
                picker.addEventListener('input', async () => {
                    const oldPresets = presetsSnapshot;
                    settings.stickyNoteOverrides[i] = picker.value.toUpperCase();
                    dot.setCssStyles({
                        background: picker.value,
                        border: '2px solid var(--interactive-accent)',
                    });
                    const newPresets = resolveStickyNoteColors(settings);
                    await this.migrateCorkboardNoteColors(oldPresets, newPresets);
                    presetsSnapshot = newPresets;
                    await this.plugin.saveSettings();
                    this.plugin.refreshOpenViews();
                });

                // Right-click to reset
                dot.addEventListener('contextmenu', async (e) => {
                    e.preventDefault();
                    if (isOverridden) {
                        const oldPresets = presetsSnapshot;
                        delete settings.stickyNoteOverrides[i];
                        const newPresets = resolveStickyNoteColors(settings);
                        await this.migrateCorkboardNoteColors(oldPresets, newPresets);
                        presetsSnapshot = newPresets;
                        await this.plugin.saveSettings();
                        this.plugin.refreshOpenViews();
                        updateSwatches();
                    }
                });

                const nameEl = cell.createDiv();
                nameEl.setCssStyles({
                    fontSize: '9px',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    lineHeight: '1.1',
                });
                nameEl.textContent = label;
            }
        };
        updateSwatches();

        const helpText = container.createEl('p', { cls: 'setting-item-description' });
        helpText.setCssStyles({ marginTop: '4px' });
        helpText.textContent = 'Click a swatch to override that colour. Right-click to reset it. Sliders tint all 14 colours at once.';

        // Clear all overrides
        if (Object.keys(settings.stickyNoteOverrides).length > 0) {
            const clearRow = container.createDiv();
            clearRow.setCssStyles({ marginTop: '4px' });
            const clearBtn = clearRow.createEl('button', { text: 'Clear all colour overrides' });
            clearBtn.setCssStyles({
                fontSize: '11px',
                padding: '2px 10px',
            });
            clearBtn.addEventListener('click', async () => {
                const oldPresets = presetsSnapshot;
                settings.stickyNoteOverrides = {};
                const newPresets = resolveStickyNoteColors(settings);
                await this.migrateCorkboardNoteColors(oldPresets, newPresets);
                await this.plugin.saveSettings();
                rerender();
            });
        }
    }

    /** Render the list of user-defined scene templates */
    private renderTemplateList(container: HTMLElement): void {
        container.empty();
        const templates = this.plugin.settings.sceneTemplates;
        if (templates.length === 0) {
            container.createEl('p', { text: 'No custom templates yet. Built-in templates (Blank, Action Scene, Dialogue Scene, Flashback, Opening Chapter) are always available.', cls: 'setting-item-description' });
            return;
        }
        for (let i = 0; i < templates.length; i++) {
            const tpl = templates[i];
            new Setting(container)
                .setName(tpl.name || '(unnamed)')
                .setDesc(tpl.description || '')
                .addExtraButton(btn => btn
                    .setIcon('pencil')
                    .setTooltip('Edit template')
                    .onClick(() => {
                        new TemplateEditorModal(this.app, { ...tpl }, async (updated) => {
                            this.plugin.settings.sceneTemplates[i] = updated;
                            await this.plugin.saveSettings();
                            this.renderTemplateList(container);
                        }).open();
                    }))
                .addExtraButton(btn => btn
                    .setIcon('trash')
                    .setTooltip('Delete template')
                    .onClick(async () => {
                        this.plugin.settings.sceneTemplates.splice(i, 1);
                        await this.plugin.saveSettings();
                        this.renderTemplateList(container);
                    }));
        }
    }

    /** Render the list of user-defined custom scene fields */
    private renderSceneCustomFieldList(container: HTMLElement): void {
        container.empty();
        if (!this.plugin.fieldTemplates) {
            container.createEl('p', {
                text: 'Open a project first to manage scene custom fields (templates are stored per project).',
                cls: 'setting-item-description',
            });
            return;
        }

        const sceneTpls: UniversalFieldTemplate[] = this.plugin.fieldTemplates.getAll()
            .filter(t => (t.category || 'character') === 'scene')
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        if (sceneTpls.length === 0) {
            container.createEl('p', {
                text: 'No custom scene fields yet. Click "Add Scene Field" to create one.',
                cls: 'setting-item-description',
            });
            return;
        }

        for (const tpl of sceneTpls) {
            const typeLabel = tpl.type === 'multi-select' ? 'Multi-select'
                : tpl.type.charAt(0).toUpperCase() + tpl.type.slice(1);
            const optionsHint = (tpl.type === 'dropdown' || tpl.type === 'multi-select') && tpl.options.length > 0
                ? ` — ${tpl.options.length} option${tpl.options.length === 1 ? '' : 's'}`
                : '';
            new Setting(container)
                .setName(tpl.label || '(unnamed)')
                .setDesc(`${typeLabel}${optionsHint}`)
                .addExtraButton(btn => btn
                    .setIcon('pencil')
                    .setTooltip('Edit field')
                    .onClick(() => {
                        const modal = new AddFieldModal(
                            this.app,
                            tpl.section,
                            tpl,
                            async (updated) => {
                                await this.plugin.fieldTemplates.update(tpl.id, updated);
                                this.renderSceneCustomFieldList(container);
                            },
                            async () => {
                                await this.plugin.fieldTemplates.remove(tpl.id);
                                this.renderSceneCustomFieldList(container);
                            },
                            ['Scene'],
                        );
                        modal.open();
                    }))
                .addExtraButton(btn => btn
                    .setIcon('trash')
                    .setTooltip('Delete field')
                    .onClick(async () => {
                        await this.plugin.fieldTemplates.remove(tpl.id);
                        this.renderSceneCustomFieldList(container);
                    }));
        }
    }

    /** Render collapsible DOCX export settings section */
    private renderDocxSettings(containerEl: HTMLElement): void {
        const details = containerEl.createEl('details', { cls: 'story-line-docx-settings' });
        details.createEl('summary', { text: 'DOCX Export Settings' });

        const body = details.createDiv();

        body.createEl('p', {
            text: 'Configure Word (.docx) export behavior. These settings apply when exporting via the Export dialog.',
            cls: 'setting-item-description',
        });

        const ds = this.plugin.settings.docxSettings;

        // Font family
        new Setting(body)
            .setName('Default font family')
            .setDesc('Font used in the exported document (e.g. Calibri, Times New Roman, Arial).')
            .addText(text => text
                .setPlaceholder('Calibri')
                .setValue(ds.defaultFontFamily)
                .onChange(async (value) => {
                    this.plugin.settings.docxSettings.defaultFontFamily = value || 'Calibri';
                    await this.plugin.saveSettings();
                }));

        // Font size
        new Setting(body)
            .setName('Default font size')
            .setDesc('Base font size in half-points (e.g. 24 = 12pt, 28 = 14pt).')
            .addText(text => text
                .setPlaceholder('24')
                .setValue(String(ds.defaultFontSize))
                .onChange(async (value) => {
                    const num = parseInt(value, 10);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.docxSettings.defaultFontSize = num;
                        await this.plugin.saveSettings();
                    }
                }));

        // Include metadata (frontmatter)
        new Setting(body)
            .setName('Include metadata')
            .setDesc('When enabled, YAML frontmatter is included in the exported document. Disabled by default.')
            .addToggle(toggle => toggle
                .setValue(ds.includeMetadata)
                .onChange(async (value) => {
                    this.plugin.settings.docxSettings.includeMetadata = value;
                    await this.plugin.saveSettings();
                }));

        // Preserve formatting
        new Setting(body)
            .setName('Preserve formatting')
            .setDesc('Maintain original Markdown formatting in the output (bold, italic, code, etc.).')
            .addToggle(toggle => toggle
                .setValue(ds.preserveFormatting)
                .onChange(async (value) => {
                    this.plugin.settings.docxSettings.preserveFormatting = value;
                    await this.plugin.saveSettings();
                }));

        // Enable preprocessing
        new Setting(body)
            .setName('Enable preprocessing')
            .setDesc('Preprocess Markdown before conversion (normalise line-breaks, clean up).')
            .addToggle(toggle => toggle
                .setValue(ds.enablePreprocessing)
                .onChange(async (value) => {
                    this.plugin.settings.docxSettings.enablePreprocessing = value;
                    await this.plugin.saveSettings();
                }));

        // Use Obsidian appearance
        new Setting(body)
            .setName('Use Obsidian appearance')
            .setDesc('Detect and apply the current Obsidian theme font settings to the document.')
            .addToggle(toggle => toggle
                .setValue(ds.useObsidianAppearance)
                .onChange(async (value) => {
                    this.plugin.settings.docxSettings.useObsidianAppearance = value;
                    await this.plugin.saveSettings();
                }));

        // Include filename as header
        new Setting(body)
            .setName('Include filename as header')
            .setDesc('Add the note filename as a heading at the top of the exported document.')
            .addToggle(toggle => toggle
                .setValue(ds.includeFilenameAsHeader)
                .onChange(async (value) => {
                    this.plugin.settings.docxSettings.includeFilenameAsHeader = value;
                    await this.plugin.saveSettings();
                }));

        // Page size
        new Setting(body)
            .setName('Page size')
            .setDesc('Paper size for the exported document.')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    'A4': 'A4',
                    'A5': 'A5',
                    'A3': 'A3',
                    'Letter': 'Letter',
                    'Legal': 'Legal',
                    'Tabloid': 'Tabloid',
                })
                .setValue(ds.pageSize)
                .onChange(async (value) => {
                    this.plugin.settings.docxSettings.pageSize = value as SLDocxSettings['pageSize'];
                    await this.plugin.saveSettings();
                }));

        // Chunking threshold
        new Setting(body)
            .setName('Chunking threshold')
            .setDesc('Number of elements before chunked processing kicks in (for large documents). Default: 500.')
            .addText(text => text
                .setPlaceholder('500')
                .setValue(String(ds.chunkingThreshold))
                .onChange(async (value) => {
                    const num = parseInt(value, 10);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.docxSettings.chunkingThreshold = num;
                        await this.plugin.saveSettings();
                    }
                }));
    }

    /** Render collapsible PDF export settings section */
    private renderPdfSettings(containerEl: HTMLElement): void {
        const details = containerEl.createEl('details', { cls: 'story-line-pdf-settings' });
        details.createEl('summary', { text: 'PDF Export Settings' });

        const body = details.createDiv();

        body.createEl('p', {
            text: 'Configure PDF export behavior. Uses pdf-lib for cross-platform generation (works on mobile).',
            cls: 'setting-item-description',
        });

        const ps = this.plugin.settings.pdfSettings;

        // Font family
        new Setting(body)
            .setName('Font family')
            .setDesc('Standard PDF font to use in the exported document.')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    'Helvetica': 'Helvetica (sans-serif)',
                    'TimesRoman': 'Times Roman (serif)',
                    'Courier': 'Courier (monospace)',
                })
                .setValue(ps.fontFamily)
                .onChange(async (value) => {
                    this.plugin.settings.pdfSettings.fontFamily = value as SLPdfSettings['fontFamily'];
                    await this.plugin.saveSettings();
                }));

        // Font size
        new Setting(body)
            .setName('Font size')
            .setDesc('Base body font size in points (e.g. 11, 12).')
            .addText(text => text
                .setPlaceholder('11')
                .setValue(String(ps.fontSize))
                .onChange(async (value) => {
                    const num = parseFloat(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.pdfSettings.fontSize = num;
                        await this.plugin.saveSettings();
                    }
                }));

        // Page size
        new Setting(body)
            .setName('Page size')
            .setDesc('Paper size for the exported PDF.')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    'A4': 'A4',
                    'A5': 'A5',
                    'A3': 'A3',
                    'Letter': 'Letter',
                    'Legal': 'Legal',
                })
                .setValue(ps.pageSize)
                .onChange(async (value) => {
                    this.plugin.settings.pdfSettings.pageSize = value as SLPdfSettings['pageSize'];
                    await this.plugin.saveSettings();
                }));

        // Line spacing
        new Setting(body)
            .setName('Line spacing')
            .setDesc('Line height multiplier (1.0 = single, 1.5, 2.0 = double).')
            .addText(text => text
                .setPlaceholder('1.4')
                .setValue(String(ps.lineSpacing))
                .onChange(async (value) => {
                    const num = parseFloat(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.pdfSettings.lineSpacing = num;
                        await this.plugin.saveSettings();
                    }
                }));

        // Margins
        new Setting(body)
            .setName('Margins (pt)')
            .setDesc('Top / Bottom / Left / Right margins in points. 72pt = 1 inch.')
            .addText(text => text
                .setPlaceholder('72')
                .setValue(String(ps.marginTop))
                .onChange(async (value) => {
                    const num = parseFloat(value);
                    if (!isNaN(num) && num >= 0) {
                        this.plugin.settings.pdfSettings.marginTop = num;
                        this.plugin.settings.pdfSettings.marginBottom = num;
                        this.plugin.settings.pdfSettings.marginLeft = num;
                        this.plugin.settings.pdfSettings.marginRight = num;
                        await this.plugin.saveSettings();
                    }
                }));

        // Include metadata (frontmatter)
        new Setting(body)
            .setName('Include metadata')
            .setDesc('When enabled, YAML frontmatter is included in the exported PDF. Disabled by default.')
            .addToggle(toggle => toggle
                .setValue(ps.includeMetadata)
                .onChange(async (value) => {
                    this.plugin.settings.pdfSettings.includeMetadata = value;
                    await this.plugin.saveSettings();
                }));

        // Include page numbers
        new Setting(body)
            .setName('Include page numbers')
            .setDesc('Show centered page numbers at the bottom of each page.')
            .addToggle(toggle => toggle
                .setValue(ps.includePageNumbers)
                .onChange(async (value) => {
                    this.plugin.settings.pdfSettings.includePageNumbers = value;
                    await this.plugin.saveSettings();
                }));
    }

    /** Render the Import section (desktop-only Scrivener import) */
    private renderImportSettings(containerEl: HTMLElement): void {
        const nodeFsAvailable = !!(window as unknown as { require?: (m: string) => unknown }).require?.('fs');
        if (!nodeFsAvailable) return;   // hide entirely on mobile

        const details = containerEl.createEl('details', { cls: 'story-line-import-settings' });
        details.createEl('summary', { text: 'Import' });

        const body = details.createDiv();

        body.createEl('p', {
            text: 'Import a Scrivener project (.scriv folder) as a new StoryLine project. Converts scenes, characters, locations, and research notes. Desktop only.',
            cls: 'setting-item-description',
        });

        new Setting(body)
            .setName('Import Scrivener project')
            .setDesc('Select a .scriv folder to import.')
            .addButton(btn => btn
                .setButtonText('Import .scriv')
                .setCta()
                .onClick(async () => {
                    try {
                        await this.pickAndImportScrivener();
                    } catch (err: unknown) {
                        new Notice('Import failed: ' + (err instanceof Error ? err.message : String(err)));
                    }
                }));
    }

    /** Open a folder picker and run the Scrivener import. */
    private async pickAndImportScrivener(): Promise<void> {
        const { ScrivenerImporter } = await import('./services/ScrivenerImporter');
        if (!ScrivenerImporter.isAvailable()) {
            new Notice('Scrivener import is only available on desktop.');
            return;
        }

        // Use Electron dialog to pick a .scriv folder
        let remote: { dialog: { showOpenDialog: (opts: unknown) => Promise<{ canceled: boolean; filePaths?: string[] }> } } | undefined;
        const win = window as unknown as { require?: (m: string) => unknown };
        try {
            remote = win.require?.('@electron/remote') as typeof remote;
        } catch {
            try {
                remote = (win.require?.('electron') as { remote: typeof remote })?.remote;
            } catch {
                new Notice('Could not access the file dialog. Desktop only.');
                return;
            }
        }

        if (!remote) {
            new Notice('Could not access the file dialog. Desktop only.');
            return;
        }

        const result = await remote.dialog.showOpenDialog({
            title: 'Select Scrivener Project (.scriv)',
            properties: ['openDirectory', 'openFile'],
            filters: [
                { name: 'Scrivener Project', extensions: ['scriv'] },
            ],
        });

        if (result.canceled || !result.filePaths?.length) return;

        const scrivPath = result.filePaths[0];
        if (!scrivPath.endsWith('.scriv')) {
            new Notice('Please select a .scriv folder.');
            return;
        }

        new Notice('Importing Scrivener project…');

        const importer = new ScrivenerImporter(this.app, this.plugin);
        const importResult = await importer.import(scrivPath);

        // Summary notice
        const lines = [
            `✓ Project "${importResult.projectTitle}" imported`,
            `  Scenes: ${importResult.scenesImported}`,
            `  Characters: ${importResult.charactersImported}`,
            `  Locations: ${importResult.locationsImported}`,
            `  Research: ${importResult.researchImported}`,
            `  Notes: ${importResult.notesImported}`,
        ];
        if (importResult.codexImported > 0) {
            lines.push(`  Codex: ${importResult.codexImported} (${importResult.codexCategoriesCreated.join(', ')})`);
        }
        if (importResult.filesImported > 0) {
            lines.push(`  Files (images/PDFs): ${importResult.filesImported}`);
        }
        if (importResult.warnings.length) {
            const missingContent = importResult.warnings.filter(w => w.includes('No content file'));
            if (missingContent.length > 0) {
                lines.push(`  ⚠ ${missingContent.length} item(s) had no content file`);
            }
            const otherWarnings = importResult.warnings.length - missingContent.length;
            if (otherWarnings > 0) {
                lines.push(`  ⚠ ${otherWarnings} other warning(s)`);
            }
            // Log full warnings to console for debugging
            console.warn('[StoryLine] Import warnings:', importResult.warnings);
        }
        new Notice(lines.join('\n'), 10000);
    }
}

/**
 * Modal for editing a scene template
 */
class TemplateEditorModal extends Modal {
    private template: SceneTemplate;
    private onSave: (tpl: SceneTemplate) => void;

    constructor(app: App, template: SceneTemplate, onSave: (tpl: SceneTemplate) => void) {
        super(app);
        this.template = { ...template, defaultFields: { ...template.defaultFields } };
        this.onSave = onSave;
    }

    onOpen(): void {
        const { contentEl } = this;
        new Setting(contentEl).setName(this.template.name ? 'Edit Template' : 'New Template').setHeading();

        new Setting(contentEl)
            .setName('Template name')
            .addText(text => text
                .setPlaceholder('e.g. Climax Scene')
                .setValue(this.template.name)
                .onChange(v => this.template.name = v));

        new Setting(contentEl)
            .setName('Description')
            .addText(text => text
                .setPlaceholder('Short description…')
                .setValue(this.template.description || '')
                .onChange(v => this.template.description = v || undefined));

        new Setting(contentEl)
            .setName('Default status')
            .addDropdown(dd => {
                dd.addOption('', '(none)');
                const statuses = getStatusOrder();
                const cfg = getStatusConfig();
                statuses.forEach(s => dd.addOption(s, cfg[s]?.label ?? (s.charAt(0).toUpperCase() + s.slice(1))));
                dd.setValue(this.template.defaultFields.status || '');
                dd.onChange(v => {
                    if (v) this.template.defaultFields.status = v as SceneStatus;
                    else delete this.template.defaultFields.status;
                });
            });

        new Setting(contentEl)
            .setName('Default emotion')
            .addText(text => text
                .setPlaceholder('e.g. tense, hopeful')
                .setValue(this.template.defaultFields.emotion || '')
                .onChange(v => {
                    if (v) this.template.defaultFields.emotion = v;
                    else delete this.template.defaultFields.emotion;
                }));

        new Setting(contentEl)
            .setName('Default tags')
            .setDesc('Comma-separated')
            .addText(text => text
                .setPlaceholder('flashback, dream')
                .setValue((this.template.defaultFields.tags || []).join(', '))
                .onChange(v => {
                    const tags = v.split(',').map(t => t.trim()).filter(Boolean);
                    if (tags.length) this.template.defaultFields.tags = tags;
                    else delete this.template.defaultFields.tags;
                }));

        new Setting(contentEl)
            .setName('Target word count')
            .addText(text => text
                .setPlaceholder('e.g. 1200')
                .setValue(this.template.defaultFields.target_wordcount ? String(this.template.defaultFields.target_wordcount) : '')
                .onChange(v => {
                    const n = Number(v);
                    if (n > 0) this.template.defaultFields.target_wordcount = n;
                    else delete this.template.defaultFields.target_wordcount;
                }));

        contentEl.createEl('h4', { text: 'Body Template' });
        contentEl.createEl('p', { text: 'This text is inserted into the scene file body when using this template.', cls: 'setting-item-description' });

        const bodyArea = new TextAreaComponent(contentEl);
        bodyArea.setValue(this.template.bodyTemplate);
        bodyArea.onChange(v => this.template.bodyTemplate = v);
        bodyArea.inputEl.rows = 10;
        bodyArea.inputEl.setCssStyles({
            width: '100%',
            fontFamily: 'var(--font-monospace)',
        });

        const btnRow = contentEl.createDiv({ cls: 'story-line-button-row' });
        const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => this.close());

        const saveBtn = btnRow.createEl('button', { text: 'Save', cls: 'mod-cta' });
        saveBtn.addEventListener('click', () => {
            if (!this.template.name.trim()) {
                this.template.name = 'Untitled Template';
            }
            this.onSave(this.template);
            this.close();
        });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}

/**
 * Folder-path autocomplete for text inputs.
 * Lists all vault folders and filters as you type.
 */
class FolderSuggest extends AbstractInputSuggest<TFolder> {
    getSuggestions(query: string): TFolder[] {
        const lower = query.toLowerCase();
        const folders: TFolder[] = [];
        const root = this.app.vault.getRoot();
        const walk = (folder: TFolder) => {
            if (folder.path && folder.path !== '/') {
                if (folder.path.toLowerCase().contains(lower)) {
                    folders.push(folder);
                }
            }
            for (const child of folder.children) {
                if (child instanceof TFolder) walk(child);
            }
        };
        walk(root);
        return folders.sort((a, b) => a.path.localeCompare(b.path));
    }

    renderSuggestion(folder: TFolder, el: HTMLElement): void {
        el.setText(folder.path);
    }

    selectSuggestion(folder: TFolder): void {
        this.setValue(folder.path);
        this.close();
    }
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- end of file-wide suppression block opened at line 1 */
