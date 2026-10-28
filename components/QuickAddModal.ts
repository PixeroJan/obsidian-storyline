/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { Scene, SceneStatus, SceneTemplate, BUILTIN_SCENE_TEMPLATES, getStatusOrder, getStatusConfig } from '../models/Scene';
import { SceneManager } from '../services/SceneManager';
import type SceneCardsPlugin from '../main';
import { renderAutocompleteInput, renderTagPillInput } from './InlineSuggest';
import { isPureNumericActChapter, nextNumericActChapter, getActDisplayLabel } from '../utils/actChapter';
import { App, Modal, Notice, Setting } from 'obsidian';

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
    private defaults: Partial<Scene>;

    constructor(
        app: App,
        plugin: SceneCardsPlugin,
        sceneManager: SceneManager,
        onSubmit: (scene: Partial<Scene>, openAfter: boolean) => void,
        defaults?: Partial<Scene>
    ) {
        super(app);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
        this.onSubmit = onSubmit;
        this.defaults = defaults || {};
        this.result.status = plugin.settings.defaultStatus;
        // Apply defaults
        Object.assign(this.result, this.defaults);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('story-line-quick-add');

        contentEl.createEl('h2', { text: 'Create new scene' });

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
                window.setTimeout(() => text.inputEl.focus(), 50);
            });

        // Act + Chapter row (manual layout — side by side)
        const actChapterRow = contentEl.createDiv({ cls: 'story-line-act-chapter-row' });

        const actGroup = actChapterRow.createDiv({ cls: 'story-line-field-group' });
        actGroup.createEl('label', { text: 'Act', cls: 'story-line-field-label' });
        const actSelect = actGroup.createEl('select', { cls: 'dropdown story-line-field-input' });
        actSelect.createEl('option', { text: 'None', value: '' });
        // Dynamic act count: offer at least 5, or up to max existing numeric act + 2.
        // Non-numeric acts (e.g. "1.1", "Prologue") are skipped so they don't
        // collapse the count via NaN poisoning. To assign a custom string-named
        // act, set it from the Inspector (free-text input).
        const maxExistingAct = nextNumericActChapter(
            this.sceneManager.getAllScenes().map(s => s.act),
        ) - 1;
        const actCount = Math.max(5, maxExistingAct + 2);
        // Add Prologue option at the top
        actSelect.createEl('option', { text: 'Prologue', value: '0' });
        for (let i = 1; i <= actCount; i++) {
            actSelect.createEl('option', { text: getActDisplayLabel(i), value: String(i) });
        }
        // Add Epilogue option at the bottom
        actSelect.createEl('option', { text: 'Epilogue', value: '99' });
        if (this.result.act != null) {
            // If the prefilled act isn't in the dropdown (e.g. a string act),
            // append it as a one-off option so the user sees it preserved.
            if (!isPureNumericActChapter(this.result.act)) {
                actSelect.createEl('option', { text: getActDisplayLabel(this.result.act), value: String(this.result.act) });
            }
            actSelect.value = String(this.result.act);
        }
        actSelect.addEventListener('change', () => {
            const raw = actSelect.value;
            if (!raw) { this.result.act = undefined; return; }
            // Preserve string acts; coerce pure integers to number.
            this.result.act = isPureNumericActChapter(raw) ? Number(raw) : raw;
        });

        const chapterGroup = actChapterRow.createDiv({ cls: 'story-line-field-group' });
        chapterGroup.createEl('label', { text: 'Chapter', cls: 'story-line-field-label' });

        // Build list of existing chapters from scenes
        const allScenes = this.sceneManager.getAllScenes();
        const chapterSet = new Set<number>();
        for (const s of allScenes) {
            if (s.chapter != null && !isNaN(Number(s.chapter))) chapterSet.add(Number(s.chapter));
        }
        const existingChapters = Array.from(chapterSet).sort((a, b) => a - b);
        const nextChapter = existingChapters.length > 0 ? Math.max(...existingChapters) + 1 : 1;

        const chapterSelect = chapterGroup.createEl('select', {
            cls: 'dropdown story-line-field-input',
        });
        chapterSelect.createEl('option', { text: 'None', value: '' });
        for (const ch of existingChapters) {
            const label = this.sceneManager.getChapterLabel(ch);
            const scenesInCh = allScenes.filter(s => Number(s.chapter) === ch).length;
            const display = label
                ? `Ch ${ch} — ${label.replace(/^Ch(?:apter)?\s*\d+\s*[—:]\s*/i, '')} (${scenesInCh})`
                : `Chapter ${ch} (${scenesInCh} scene${scenesInCh !== 1 ? 's' : ''})`;
            chapterSelect.createEl('option', { text: display, value: String(ch) });
        }
        chapterSelect.createEl('option', { text: `+ New chapter (${nextChapter})`, value: String(nextChapter) });

        if (this.result.chapter != null) {
            chapterSelect.value = String(this.result.chapter);
        } else if (existingChapters.length > 0) {
            // Default to the latest (highest) chapter so new scenes are added there
            const latestCh = existingChapters[existingChapters.length - 1];
            chapterSelect.value = String(latestCh);
            this.result.chapter = latestCh;
        }
        chapterSelect.addEventListener('change', () => {
            const val = chapterSelect.value;
            this.result.chapter = val ? Number(val) : undefined;
        });

        // POV (autocomplete input)
        const povSetting = new Setting(contentEl).setName('Pov character');
        const povContainer = povSetting.controlEl.createDiv('sl-quickadd-autocomplete');
        renderAutocompleteInput({
            container: povContainer,
            value: this.result.pov || '',
            getSuggestions: () => {
                const characters = this.sceneManager.queryService.getAllCharacters();
                const cm = this.plugin.characterManager;
                const names = new Map<string, string>();
                for (const c of characters) names.set(c.toLowerCase(), c);
                if (cm) {
                    for (const ch of cm.getAllCharacters()) {
                        if (!names.has(ch.name.toLowerCase())) names.set(ch.name.toLowerCase(), ch.name);
                    }
                }
                return Array.from(names.values()).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            },
            onChange: (value) => { this.result.pov = value || undefined; },
            placeholder: 'Search characters…',
        });

        // Location (autocomplete input)
        const locSetting = new Setting(contentEl).setName('Location');
        const locContainer = locSetting.controlEl.createDiv('sl-quickadd-autocomplete');
        renderAutocompleteInput({
            container: locContainer,
            value: '',
            getSuggestions: () => this.getLocationNames(),
            onChange: (value) => { this.result.location = value || undefined; },
            placeholder: 'Search locations…',
            getDisplayLabel: this.getLocationDisplayLabel(),
        });

        // Characters (tag-pill autocomplete)
        const charSetting = new Setting(contentEl).setName('Characters');
        const charContainer = charSetting.controlEl.createDiv('sl-quickadd-tagpill');
        renderTagPillInput({
            container: charContainer,
            values: [],
            getSuggestions: () => {
                const characters = this.sceneManager.queryService.getAllCharacters();
                const cm = this.plugin.characterManager;
                const names = new Map<string, string>();
                for (const c of characters) names.set(c.toLowerCase(), c);
                if (cm) {
                    for (const ch of cm.getAllCharacters()) {
                        if (!names.has(ch.name.toLowerCase())) names.set(ch.name.toLowerCase(), ch.name);
                    }
                }
                return Array.from(names.values()).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            },
            onChange: (values) => { this.result.characters = values.length > 0 ? values : undefined; },
            placeholder: 'Add character…',
        });

        // Scene Draft (becomes body text)
        new Setting(contentEl)
            .setName('Scene draft')
            .addTextArea(area => {
                area.setPlaceholder('Write your scene draft here…')
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
            conflictSetting.settingEl.setCssStyles({ display: checkbox.checked ? 'none' : '' });
        });

        // Tags / Plotlines (autocomplete tag-pill input)
        const tagSetting = new Setting(contentEl).setName('Tags / plotlines');
        const tagContainer = tagSetting.controlEl.createDiv('sl-quickadd-tagpill');
        renderTagPillInput({
            container: tagContainer,
            values: this.result.tags || [],
            getSuggestions: () => this.sceneManager.queryService.getAllTags().sort(),
            onChange: (values) => { this.result.tags = values.length > 0 ? values : undefined; },
            placeholder: 'Add plotline…',
        });

        // Status
        new Setting(contentEl)
            .setName('Status')
            .addDropdown(dropdown => {
                const statuses = getStatusOrder();
                const cfg = getStatusConfig();
                statuses.forEach(s => dropdown.addOption(s, cfg[s]?.label ?? (s.charAt(0).toUpperCase() + s.slice(1))));
                dropdown.setValue(this.result.status || 'idea');
                dropdown.onChange(value => this.result.status = value as SceneStatus);
            });

        // Buttons
        const buttonRow = contentEl.createDiv('story-line-button-row');

        const cancelBtn = buttonRow.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => this.close());

        const createEditBtn = buttonRow.createEl('button', {
            text: 'Create & edit',
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

        const desc = (this.result as unknown as Record<string, unknown>).description as string | undefined;
        if (desc) {
            this.result.body = desc;
            if (this.conflictSameAsDescription) {
                this.result.conflict = desc;
            }
            delete (this.result as unknown as Record<string, unknown>).description;
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
        const sceneLocations = this.sceneManager.queryService.getUniqueValues('location');
        for (const name of sceneLocations) {
            const key = name.toLowerCase();
            if (!names.has(key)) names.set(key, name);
        }

        return Array.from(names.values()).sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase())
        );
    }

    /**
     * Build a display-label function for locations (e.g., "Parent > Child").
     */
    private getLocationDisplayLabel(): (value: string) => string {
        const lm = this.plugin.locationManager;
        if (!lm) return (v) => v;
        const displayMap = lm.getDisplayNameMap();
        return (value: string) => displayMap.get(value) || value;
    }
}
/* eslint-enable @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion -- end of file-wide suppression block opened at line 1 */
