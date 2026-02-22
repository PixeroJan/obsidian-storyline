import { App, PluginSettingTab, Setting, Modal, TextAreaComponent } from 'obsidian';
import { ColorCodingMode, SceneStatus, ViewType, SceneTemplate, BUILTIN_SCENE_TEMPLATES } from './models/Scene';
import type SceneCardsPlugin from './main';

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
    colorCoding: ColorCodingMode;
    showWordCounts: boolean;
    compactCardView: boolean;

    // Writing goals
    dailyWordGoal: number;

    // Advanced
    enablePlotHoleDetection: boolean;
    showWarnings: boolean;
    debugMode: boolean;

    // Scene templates
    sceneTemplates: SceneTemplate[];

    // Tag / plotline color assignments
    tagColors: Record<string, string>;

    // Manual tag-type overrides (tag name lowercased → 'prop' | 'location' | 'character' | 'other')
    tagTypeOverrides: Record<string, string>;
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
    colorCoding: 'status',
    showWordCounts: true,
    compactCardView: false,

    dailyWordGoal: 1000,

    enablePlotHoleDetection: true,
    showWarnings: true,
    debugMode: false,

    sceneTemplates: [],

    tagColors: {},

    tagTypeOverrides: {},
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

        // --- Tag / Plotline Colors ---
        containerEl.createEl('h2', { text: 'Tag / Plotline Colors' });
        containerEl.createEl('p', {
            text: 'Assign colors to tags (plotlines) that persist across all views. Tags without a color use the default accent.',
            cls: 'setting-item-description',
        });

        const tagColorListEl = containerEl.createDiv('story-line-tag-color-list');
        this.renderTagColorList(tagColorListEl);

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
    }

    /** Render the tag-color assignment list with color pickers */
    private renderTagColorList(container: HTMLElement): void {
        container.empty();
        const tagColors = this.plugin.settings.tagColors || {};

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

        for (const tag of combinedTags) {
            const currentColor = tagColors[tag] || '';
            const s = new Setting(container)
                .setName(tag)
                .setDesc(currentColor ? `Custom: ${currentColor}` : 'Using default accent');

            // Color picker
            s.addColorPicker(picker => {
                picker.setValue(currentColor || '#888888');
                picker.onChange(async (value) => {
                    this.plugin.settings.tagColors[tag] = value;
                    s.setDesc(`Custom: ${value}`);
                    await this.plugin.saveSettings();
                    this.plugin.refreshOpenViews();
                });
            });

            // Reset button
            s.addExtraButton(btn => btn
                .setIcon('x')
                .setTooltip('Remove custom color')
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
