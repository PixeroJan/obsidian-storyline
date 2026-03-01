import { App, PluginSettingTab, Setting, Modal, TextAreaComponent } from 'obsidian';
import * as obsidian from 'obsidian';
import { ColorCodingMode, SceneStatus, ViewType, SceneTemplate, BUILTIN_SCENE_TEMPLATES } from './models/Scene';
import type SceneCardsPlugin from './main';
import { HELP_VIEW_TYPE } from './constants';
import { SLDocxSettings, SL_DEFAULT_DOCX_SETTINGS } from './services/DocxConverter';
import { SLPdfSettings, SL_DEFAULT_PDF_SETTINGS } from './services/PdfConverter';

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

/**
 * Resolve the effective color for a tag.
 * Priority: custom tagColors override > scheme auto-assignment > fallback.
 */
export function resolveTagColor(
    tag: string,
    tagIndex: number,
    scheme: ColorScheme,
    tagColors: Record<string, string>,
): string {
    // Custom override always wins
    if (tagColors[tag]) return tagColors[tag];
    // Scheme auto-assign
    const palette = getSchemeColors(scheme);
    if (palette) return palette[tagIndex % palette.length];
    // Fallback grey
    return '#888888';
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

    // Display
    defaultView: ViewType;
    defaultBoardMode: 'corkboard' | 'kanban';
    showNotesInKanban: boolean;
    showScenesInCorkboard: boolean;
    colorCoding: ColorCodingMode;
    showWordCounts: boolean;
    compactCardView: boolean;
    characterCardPortraitSize: number;
    characterDetailPortraitSize: number;
    locationTreeThumbSize: number;
    locationDetailPortraitWidth: number;
    locationDetailPortraitHeight: number;

    // Writing goals
    dailyWordGoal: number;
    projectWordGoal: number;

    // Advanced
    enablePlotHoleDetection: boolean;
    showWarnings: boolean;
    debugMode: boolean;

    // Scene templates
    sceneTemplates: SceneTemplate[];

    // Tag / plotline color scheme
    colorScheme: ColorScheme;

    // Tag / plotline color assignments (custom overrides)
    tagColors: Record<string, string>;

    // Manual tag-type overrides (tag name lowercased → 'prop' | 'location' | 'character' | 'other')
    tagTypeOverrides: Record<string, string>;

    // Manual character alias mappings (lowercased alias → canonical character name)
    // e.g. { "sven": "Sven Andersson" } — user-defined via "Link to…" in Characters view
    characterAliases: Record<string, string>;

    // Character names to hide from the "no profile yet" list (lowercased)
    ignoredCharacters: string[];

    // Hide frontmatter (properties) in live preview / reading mode
    hideFrontmatter: boolean;

    // DOCX export settings (adapted from ToWord plugin)
    docxSettings: SLDocxSettings;

    // PDF export settings (using pdf-lib)
    pdfSettings: SLPdfSettings;
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

    defaultView: 'board',
    defaultBoardMode: 'corkboard',
    showNotesInKanban: false,
    showScenesInCorkboard: true,
    colorCoding: 'status',
    showWordCounts: true,
    compactCardView: false,
    characterCardPortraitSize: 64,
    characterDetailPortraitSize: 96,
    locationTreeThumbSize: 20,
    locationDetailPortraitWidth: 120,
    locationDetailPortraitHeight: 80,

    dailyWordGoal: 1000,
    projectWordGoal: 80000,

    enablePlotHoleDetection: true,
    showWarnings: true,
    debugMode: false,

    sceneTemplates: [],

    colorScheme: 'mocha' as ColorScheme,

    tagColors: {},

    tagTypeOverrides: {},

    characterAliases: {},

    ignoredCharacters: [],

    hideFrontmatter: true,

    docxSettings: { ...SL_DEFAULT_DOCX_SETTINGS },

    pdfSettings: { ...SL_DEFAULT_PDF_SETTINGS },
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

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h1', { text: 'StoryLine Settings' });

        // --- Documentation link ---
        new Setting(containerEl)
            .setName('Documentation')
            .setDesc('Open the full StoryLine help guide in a side pane')
            .addButton(btn => btn
                .setButtonText('Open Help')
                .setCta()
                .onClick(() => {
                    this.plugin.openHelp();
                }));

        // --- StoryLine Root ---
        containerEl.createEl('h2', { text: 'StoryLine Root' });

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

        // --- Scene Defaults ---
        containerEl.createEl('h2', { text: 'Scene Defaults' });

        new Setting(containerEl)
            .setName('Default status')
            .setDesc('Status for newly created scenes')
            .addDropdown(dropdown => {
                const statuses: SceneStatus[] = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];
                statuses.forEach(s => dropdown.addOption(s, s.charAt(0).toUpperCase() + s.slice(1)));
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

        // --- Display Options ---
        containerEl.createEl('h2', { text: 'Display Options' });

        new Setting(containerEl)
            .setName('Default view')
            .setDesc('Which view to open by default')
            .addDropdown(dropdown => {
                dropdown.addOption('board', 'Board');
                dropdown.addOption('timeline', 'Timeline');
                dropdown.addOption('storyline', 'Storylines');
                dropdown.addOption('character', 'Characters');
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
            .setName('Show word counts')
            .setDesc('Display word counts on scene cards')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showWordCounts)
                .onChange(async (value) => {
                    this.plugin.settings.showWordCounts = value;
                    await this.plugin.saveSettings();
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

        const imageDetails = containerEl.createEl('details', { cls: 'story-line-image-size-section' });
        imageDetails.createEl('summary', { text: 'Image & frame sizes' });
        const imageBody = imageDetails.createDiv();
        imageBody.style.padding = '8px 0';

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
                    this.display();
                }));

        // --- Writing Goals ---
        containerEl.createEl('h2', { text: 'Writing Goals' });

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
            .setName('Project word goal')
            .setDesc('Target total words for the active project (shown in Stats view)')
            .addText(text => text
                .setPlaceholder('80000')
                .setValue(String(this.plugin.settings.projectWordGoal))
                .onChange(async (value) => {
                    this.plugin.settings.projectWordGoal = Number(value) || 80000;
                    await this.plugin.saveSettings();
                }));

        // --- Advanced ---
        containerEl.createEl('h2', { text: 'Advanced' });

        new Setting(containerEl)
            .setName('Enable plot hole detection')
            .setDesc('Show warnings for potential plot holes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enablePlotHoleDetection)
                .onChange(async (value) => {
                    this.plugin.settings.enablePlotHoleDetection = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show warnings')
            .setDesc('Display warning notifications')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showWarnings)
                .onChange(async (value) => {
                    this.plugin.settings.showWarnings = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Debug mode')
            .setDesc('Enable debug logging in console')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Hide frontmatter')
            .setDesc('Hide the properties/frontmatter block in live preview and reading mode. Since all fields are editable from the Inspector, frontmatter can safely be hidden.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hideFrontmatter)
                .onChange(async (value) => {
                    this.plugin.settings.hideFrontmatter = value;
                    await this.plugin.saveSettings();
                    // Apply Obsidian\'s built-in "Properties in document" setting
                    (this.app.vault as any).setConfig?.('propertiesInDocument', value ? 'hidden' : 'visible');
                }));

        // --- Tag / Plotline Colors (collapsible) ---
        const colorDetails = containerEl.createEl('details', { cls: 'story-line-color-section' });
        colorDetails.createEl('summary', { text: 'Plotline Color Scheme' });

        const colorBody = colorDetails.createDiv();
        colorBody.style.padding = '8px 0';

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
                    groupLabel.style.fontSize = '11px';
                    groupLabel.style.fontWeight = '600';
                    groupLabel.style.color = 'var(--text-muted)';
                    groupLabel.style.textTransform = 'uppercase';
                    groupLabel.style.letterSpacing = '0.05em';
                    groupLabel.style.marginTop = '10px';
                    groupLabel.style.marginBottom = '6px';
                    groupLabel.textContent = group.label;
                }

                const schemeRow = schemeContainer.createDiv();
                schemeRow.style.display = 'flex';
                schemeRow.style.gap = '8px';
                schemeRow.style.flexWrap = 'wrap';
                schemeRow.style.marginBottom = '8px';

                for (const scheme of group.schemes) {
                    const label = COLOR_SCHEME_LABELS[scheme];
                    const hintText = COLOR_SCHEME_HINTS[scheme];
                    const palette = getSchemeColors(scheme);

                    const card = schemeRow.createDiv();
                    card.style.cursor = 'pointer';
                    card.style.padding = '6px 10px';
                    card.style.borderRadius = '8px';
                    card.style.border = scheme === current
                        ? '2px solid var(--interactive-accent)'
                        : '2px solid var(--background-modifier-border)';
                    card.style.background = scheme === current
                        ? 'var(--background-modifier-hover)'
                        : 'transparent';
                    card.style.minWidth = '100px';
                    card.style.textAlign = 'center';
                    card.style.transition = 'border-color 0.15s';

                    // Label
                    const nameEl = card.createDiv();
                    nameEl.style.fontSize = '11px';
                    nameEl.style.fontWeight = '600';
                    nameEl.style.marginBottom = '4px';
                    nameEl.textContent = label;

                    // Mood hint
                    const hint = card.createDiv();
                    hint.style.fontSize = '9px';
                    hint.style.color = 'var(--text-faint)';
                    hint.style.marginBottom = '4px';
                    hint.textContent = hintText;

                    // Swatches
                    if (palette) {
                        const swatchRow = card.createDiv();
                        swatchRow.style.display = 'flex';
                        swatchRow.style.gap = '2px';
                        swatchRow.style.justifyContent = 'center';
                        swatchRow.style.flexWrap = 'wrap';
                        for (let i = 0; i < Math.min(7, palette.length); i++) {
                            const dot = swatchRow.createDiv();
                            dot.style.width = '10px';
                            dot.style.height = '10px';
                            dot.style.borderRadius = '50%';
                            dot.style.background = palette[i];
                        }
                    } else {
                        const iconEl = card.createDiv();
                        iconEl.style.display = 'flex';
                        iconEl.style.justifyContent = 'center';
                        obsidian.setIcon(iconEl, 'palette');
                        iconEl.style.color = 'var(--text-muted)';
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
        helpText.style.marginTop = '8px';
        helpText.textContent = 'Colors are auto-assigned to plotline tags. To override a specific tag color, use the color picker in the Plotlines view.';

        // Per-tag overrides summary (compact — only show if there ARE overrides)
        const overrides = Object.entries(this.plugin.settings.tagColors || {});
        if (overrides.length > 0) {
            const overrideSection = colorBody.createDiv();
            overrideSection.style.marginTop = '10px';
            const overrideHeader = overrideSection.createDiv();
            overrideHeader.style.display = 'flex';
            overrideHeader.style.alignItems = 'center';
            overrideHeader.style.gap = '8px';
            overrideHeader.style.marginBottom = '6px';
            overrideHeader.createSpan({ text: 'Custom overrides', cls: 'setting-item-name' });

            const clearBtn = overrideHeader.createEl('button', { text: 'Clear all' });
            clearBtn.style.fontSize = '11px';
            clearBtn.style.padding = '2px 8px';
            clearBtn.addEventListener('click', async () => {
                this.plugin.settings.tagColors = {};
                await this.plugin.saveSettings();
                overrideSection.remove();
                this.plugin.refreshOpenViews();
            });

            const chipRow = overrideSection.createDiv();
            chipRow.style.display = 'flex';
            chipRow.style.gap = '4px';
            chipRow.style.flexWrap = 'wrap';
            for (const [tag, color] of overrides) {
                const chip = chipRow.createSpan();
                chip.style.padding = '2px 8px';
                chip.style.borderRadius = '10px';
                chip.style.fontSize = '11px';
                chip.style.background = color;
                chip.style.color = '#fff';
                chip.style.cursor = 'pointer';
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

        // --- Scene Templates ---
        containerEl.createEl('h2', { text: 'Scene Templates' });
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

        // --- DOCX Export Settings (collapsible) ---
        this.renderDocxSettings(containerEl);

        // --- PDF Export Settings (collapsible) ---
        this.renderPdfSettings(containerEl);
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
            allTags = this.plugin.sceneManager?.getAllTags() || [];
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
            const schemeColor = resolveTagColor(tag, ti, scheme, {});
            const effectiveColor = customColor || schemeColor;
            const isOverridden = !!customColor;

            const s = new Setting(container);
            
            // Color swatch before the name
            const nameEl = s.nameEl;
            const swatch = nameEl.createSpan();
            swatch.style.display = 'inline-block';
            swatch.style.width = '14px';
            swatch.style.height = '14px';
            swatch.style.borderRadius = '4px';
            swatch.style.background = effectiveColor;
            swatch.style.marginRight = '8px';
            swatch.style.verticalAlign = 'middle';
            swatch.style.border = '1px solid var(--background-modifier-border)';
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
                    swatch.style.background = value;
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
                    this.plugin.settings.docxSettings.pageSize = value as any;
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
                    this.plugin.settings.pdfSettings.fontFamily = value as any;
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
                    this.plugin.settings.pdfSettings.pageSize = value as any;
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
        contentEl.createEl('h3', { text: this.template.name ? 'Edit Template' : 'New Template' });

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
                const statuses: SceneStatus[] = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];
                statuses.forEach(s => dd.addOption(s, s.charAt(0).toUpperCase() + s.slice(1)));
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
        bodyArea.inputEl.style.width = '100%';
        bodyArea.inputEl.style.fontFamily = 'var(--font-monospace)';

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
