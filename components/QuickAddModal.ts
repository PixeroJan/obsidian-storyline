import { App, Modal, Setting, DropdownComponent, TextComponent, Notice } from 'obsidian';
import { Scene, SceneStatus, SceneTemplate, BUILTIN_SCENE_TEMPLATES } from '../models/Scene';
import { SceneManager } from '../services/SceneManager';
import { LocationManager } from '../services/LocationManager';
import type SceneCardsPlugin from '../main';

/**
 * Modal for quickly creating new scenes
 */
export class QuickAddModal extends Modal {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;
    private result: Partial<Scene> & { description?: string } = {};
    private conflictSameAsDescription = false;
    private selectedTemplate: SceneTemplate | null = null;
    private onSubmit: (scene: Partial<Scene>, openAfter: boolean) => void;

    constructor(
        app: App,
        plugin: SceneCardsPlugin,
        sceneManager: SceneManager,
        onSubmit: (scene: Partial<Scene>, openAfter: boolean) => void
    ) {
        super(app);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
        this.onSubmit = onSubmit;
        this.result.status = plugin.settings.defaultStatus as SceneStatus;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('story-line-quick-add');

        contentEl.createEl('h2', { text: 'Create New Scene' });

        // Template selector
        const allTemplates = [...BUILTIN_SCENE_TEMPLATES, ...this.plugin.settings.sceneTemplates];
        new Setting(contentEl)
            .setName('Template')
            .setDesc('Pre-fill fields and body from a template')
            .addDropdown(dd => {
                dd.addOption('', '(none)');
                allTemplates.forEach((tpl, idx) => dd.addOption(String(idx), tpl.name));
                dd.onChange(value => {
                    if (value === '') {
                        this.selectedTemplate = null;
                    } else {
                        this.selectedTemplate = allTemplates[Number(value)];
                    }
                });
            });

        // Title
        new Setting(contentEl)
            .setName('Title')
            .addText(text => {
                text.setPlaceholder('Scene title...')
                    .onChange(value => this.result.title = value);
                text.inputEl.addClass('story-line-title-input');
                // Auto-focus
                setTimeout(() => text.inputEl.focus(), 50);
            });

        // Act + Chapter row (manual layout — side by side)
        const actChapterRow = contentEl.createDiv({ cls: 'story-line-act-chapter-row' });

        const actGroup = actChapterRow.createDiv({ cls: 'story-line-field-group' });
        actGroup.createEl('label', { text: 'Act', cls: 'story-line-field-label' });
        const actSelect = actGroup.createEl('select', { cls: 'dropdown story-line-field-input' });
        actSelect.createEl('option', { text: 'None', value: '' });
        for (let i = 1; i <= 5; i++) {
            actSelect.createEl('option', { text: `Act ${i}`, value: String(i) });
        }
        actSelect.addEventListener('change', () => {
            this.result.act = actSelect.value ? Number(actSelect.value) : undefined;
        });

        const chapterGroup = actChapterRow.createDiv({ cls: 'story-line-field-group' });
        chapterGroup.createEl('label', { text: 'Chapter', cls: 'story-line-field-label' });
        const chapterInput = chapterGroup.createEl('input', {
            type: 'text',
            cls: 'story-line-field-input',
            placeholder: 'Chapter #'
        });
        chapterInput.addEventListener('input', () => {
            const val = chapterInput.value;
            this.result.chapter = val ? (Number(val) || val) : undefined;
        });

        // POV
        new Setting(contentEl)
            .setName('POV Character')
            .addDropdown(dropdown => {
                dropdown.addOption('', 'None');
                const characters = this.sceneManager.getAllCharacters();
                characters.forEach(c => dropdown.addOption(c, c));
                dropdown.onChange(value => this.result.pov = value || undefined);
            })
            .addExtraButton(btn => {
                btn.setIcon('plus')
                    .setTooltip('Type a new character name')
                    .onClick(() => {
                        // Fallback: allow typing manually
                        const input = contentEl.createEl('input', {
                            attr: { type: 'text', placeholder: 'New character name...' }
                        });
                        input.addEventListener('change', () => {
                            this.result.pov = input.value;
                        });
                    });
            });

        // Location (dropdown with existing locations + manual entry)
        new Setting(contentEl)
            .setName('Location')
            .addDropdown(dropdown => {
                dropdown.addOption('', 'None');
                const locationNames = this.getLocationNames();
                locationNames.forEach(name => dropdown.addOption(name, name));
                dropdown.onChange(value => this.result.location = value || undefined);
            })
            .addExtraButton(btn => {
                btn.setIcon('plus')
                    .setTooltip('Type a new location name')
                    .onClick(() => {
                        const input = contentEl.createEl('input', {
                            attr: { type: 'text', placeholder: 'New location name...' }
                        });
                        input.addEventListener('change', () => {
                            this.result.location = input.value || undefined;
                        });
                    });
            });

        // Characters
        new Setting(contentEl)
            .setName('Characters')
            .addTextArea(area => {
                area.setPlaceholder('Anna, Marcus, ...')
                    .onChange(value => {
                        this.result.characters = value
                            ? value.split(',').map(c => c.trim()).filter(Boolean)
                            : undefined;
                    });
                area.inputEl.rows = 2;
                area.inputEl.addClass('story-line-wide-input');
            });

        // Description (becomes body text)
        new Setting(contentEl)
            .setName('Description')
            .addTextArea(area => {
                area.setPlaceholder('Describe the scene...')
                    .onChange(value => this.result.description = value || undefined);
                area.inputEl.rows = 3;
                area.inputEl.addClass('story-line-wide-input');
            });

        // Conflict section wrapper
        const conflictWrapper = contentEl.createDiv('story-line-conflict-section');
        
        // Conflict header with toggle
        const conflictHeader = conflictWrapper.createDiv('story-line-conflict-header');
        const conflictToggle = conflictHeader.createEl('label', { cls: 'story-line-conflict-toggle' });
        const checkbox = conflictToggle.createEl('input', { attr: { type: 'checkbox' } });
        conflictToggle.createSpan({ text: 'Same as description' });

        const conflictSetting = new Setting(conflictWrapper)
            .setName('Conflict')
            .addTextArea(area => {
                area.setPlaceholder('What is the main conflict?')
                    .onChange(value => this.result.conflict = value || undefined);
                area.inputEl.rows = 2;
                area.inputEl.addClass('story-line-wide-input');
            });

        checkbox.addEventListener('change', () => {
            this.conflictSameAsDescription = checkbox.checked;
            conflictSetting.settingEl.style.display = checkbox.checked ? 'none' : '';
        });

        // Tags / Plotlines
        new Setting(contentEl)
            .setName('Tags / Plotlines')
            .addText(text => {
                text.setPlaceholder('plotline/main, theme/courage, ...')
                    .onChange(value => {
                        this.result.tags = value
                            ? value.split(',').map(t => t.trim()).filter(Boolean)
                            : undefined;
                    });
            });

        // Status
        new Setting(contentEl)
            .setName('Status')
            .addDropdown(dropdown => {
                const statuses: SceneStatus[] = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];
                statuses.forEach(s => dropdown.addOption(s, s.charAt(0).toUpperCase() + s.slice(1)));
                dropdown.setValue(this.result.status || 'idea');
                dropdown.onChange(value => this.result.status = value as SceneStatus);
            });

        // Buttons
        const buttonRow = contentEl.createDiv('story-line-button-row');

        const cancelBtn = buttonRow.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => this.close());

        const createEditBtn = buttonRow.createEl('button', {
            text: 'Create & Edit',
            cls: 'mod-cta'
        });
        createEditBtn.addEventListener('click', () => {
            if (!this.result.title) {
                new Notice('Please enter a scene title');
                return;
            }
            this.prepareResult();
            this.onSubmit(this.result, true);
            this.close();
        });

        const createBtn = buttonRow.createEl('button', { text: 'Create' });
        createBtn.addEventListener('click', () => {
            if (!this.result.title) {
                new Notice('Please enter a scene title');
                return;
            }
            this.prepareResult();
            this.onSubmit(this.result, false);
            this.close();
        });
    }

    /**
     * Merge template defaults + description text into body field before submitting
     */
    private prepareResult(): void {
        // Apply template default fields (only for fields the user didn't explicitly set)
        if (this.selectedTemplate) {
            const df = this.selectedTemplate.defaultFields;
            if (df.status && !this.result.status) this.result.status = df.status;
            if (df.emotion && !this.result.emotion) this.result.emotion = df.emotion;
            if (df.conflict && !this.result.conflict) this.result.conflict = df.conflict;
            if (df.target_wordcount && !this.result.target_wordcount) this.result.target_wordcount = df.target_wordcount;
            if (df.tags?.length && (!this.result.tags || this.result.tags.length === 0)) {
                this.result.tags = [...df.tags];
            }
        }

        const desc = (this.result as any).description;
        if (desc) {
            this.result.body = desc;
            if (this.conflictSameAsDescription) {
                this.result.conflict = desc;
            }
            delete (this.result as any).description;
        }

        // Append template body after user description
        if (this.selectedTemplate?.bodyTemplate) {
            const existing = this.result.body || '';
            const separator = existing ? '\n\n' : '';
            this.result.body = existing + separator + this.selectedTemplate.bodyTemplate;
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * Collect all known location names from LocationManager + scene metadata.
     */
    private getLocationNames(): string[] {
        const names = new Map<string, string>(); // lowercase → display

        // From LocationManager on the plugin
        const lm = this.plugin.locationManager;
        if (lm) {
            for (const loc of lm.getAllLocations()) {
                const key = loc.name.toLowerCase();
                if (!names.has(key)) names.set(key, loc.name);
            }
        }

        // From scene metadata (catches locations not yet profiled)
        const sceneLocations = this.sceneManager.getUniqueValues('location');
        for (const name of sceneLocations) {
            const key = name.toLowerCase();
            if (!names.has(key)) names.set(key, name);
        }

        return Array.from(names.values()).sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase())
        );
    }
}
