/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { Modal, Setting, Notice, DropdownComponent, ToggleComponent } from 'obsidian';
import { ExportService, ExportFormat, ExportScope } from '../services/ExportService';
import type SceneCardsPlugin from '../main';

/**
 * Modal that lets the user pick format (MD / JSON / HTML) and scope
 * (manuscript / outline), then triggers the export.
 */
export class ExportModal extends Modal {
    private plugin: SceneCardsPlugin;
    private exportService: ExportService;

    private format: ExportFormat = 'md';
    private exportScope: ExportScope = 'manuscript';

    // Per-export options (issues #85 / #87)
    private includeSceneTitles = true;
    private numberScenesOnExport = false;
    private includeCorkboardNotes = false;
    private includeInactiveScenes = false;
    private sceneSeparatorType: 'blank' | 'asterisks' | 'custom' = 'blank';
    private sceneSeparatorCustom = '';

    constructor(plugin: SceneCardsPlugin) {
        super(plugin.app);
        this.plugin = plugin;
        this.exportService = new ExportService(plugin.app, plugin.sceneManager, plugin.characterManager, plugin.locationManager);
        
        this.sceneSeparatorType = plugin.settings.exportSceneSeparatorType || 'blank';
        this.sceneSeparatorCustom = plugin.settings.exportSceneSeparatorCustom || '';
        // Pass DOCX settings to the export service
        if (plugin.settings.docxSettings) {
            this.exportService.setDocxSettings(plugin.settings.docxSettings);
        }
        // Pass PDF settings to the export service
        if (plugin.settings.pdfSettings) {
            this.exportService.setPdfSettings(plugin.settings.pdfSettings);
        }
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('storyline-export-modal');
        this.modalEl.addClass('mod-storyline-export');

        contentEl.createEl('h2', { text: 'Export Project' });

        const project = this.plugin.sceneManager.activeProject;
        if (!project) {
            contentEl.createEl('p', { text: 'No active project. Open a project first.' });
            return;
        }

        contentEl.createEl('p', {
            text: `Project: ${project.title}`,
            cls: 'storyline-export-project-name',
        });

        // Scope selection
        let scopeDropdown: DropdownComponent | undefined;
        let renderManuscriptOptions: () => void = () => {};
        new Setting(contentEl)
            .setName('Content')
            .setDesc('What to include in the export')
            .addDropdown(dd => {
                scopeDropdown = dd;
                dd.addOption('outline', 'Outline (metadata, stats, table)');
                dd.addOption('manuscript', 'Manuscript (scene text in order)');
                dd.setValue(this.exportScope);
                dd.onChange(v => {
                    this.exportScope = v as ExportScope;
                    renderManuscriptOptions();
                });
            });

        // Format selection
        new Setting(contentEl)
            .setName('Format')
            .addDropdown(dd => {
                dd.addOption('md', 'Markdown (.md)');
                dd.addOption('docx', 'Word (.docx)');
                dd.addOption('pdf', 'PDF (.pdf)');
                dd.addOption('html', 'HTML (.html)');
                dd.addOption('csv', 'CSV (.csv)');
                dd.addOption('json', 'JSON (.json)');
                dd.setValue(this.format);
                dd.onChange(v => {
                    this.format = v as ExportFormat;
                    // Auto-switch to Manuscript when DOCX or PDF is selected
                    if ((v === 'docx' || v === 'pdf') && this.exportScope !== 'manuscript') {
                        this.exportScope = 'manuscript';
                        scopeDropdown?.setValue('manuscript');
                        renderManuscriptOptions();
                    }
                });
            });

        // Actions
        const actions = contentEl.createDiv({ cls: 'storyline-export-actions' });

        // Export options. Scene titles / numbering / corkboard notes are manuscript-only.
        // Issues #85 and #87.
        const manuscriptOptions = contentEl.createDiv({ cls: 'storyline-export-options' });

        renderManuscriptOptions = () => {
            manuscriptOptions.empty();

            new Setting(manuscriptOptions)
                .setName('Include inactive scenes')
                .setDesc('Include parked scenes marked inactive. Off by default.')
                .addToggle(t => {
                    t.setValue(this.includeInactiveScenes);
                    t.onChange(v => { this.includeInactiveScenes = v; });
                });

            if (this.exportScope !== 'manuscript') return;

            let titlesToggle: ToggleComponent | undefined;
            let numberToggle: ToggleComponent | undefined;

            new Setting(manuscriptOptions)
                .setName('Include scene titles')
                .setDesc('Show "#### Scene Title" before each scene. Disable for a clean reader copy.')
                .addToggle(t => {
                    titlesToggle = t;
                    t.setValue(this.includeSceneTitles && !this.numberScenesOnExport);
                    t.onChange(v => {
                        this.includeSceneTitles = v;
                        if (v) {
                            this.numberScenesOnExport = false;
                            numberToggle?.setValue(false);
                        }
                    });
                });

            new Setting(manuscriptOptions)
                .setName('Number scenes (1, 2, 3\u2026)')
                .setDesc('Replace scene titles with sequential numbers in the export.')
                .addToggle(t => {
                    numberToggle = t;
                    t.setValue(this.numberScenesOnExport);
                    t.onChange(v => {
                        this.numberScenesOnExport = v;
                        if (v) {
                            this.includeSceneTitles = false;
                            titlesToggle?.setValue(false);
                        }
                    });
                });

            new Setting(manuscriptOptions)
                .setName('Include corkboard notes')
                .setDesc('Include sticky / brainstorm notes from the corkboard. Off by default.')
                .addToggle(t => {
                    t.setValue(this.includeCorkboardNotes);
                    t.onChange(v => { this.includeCorkboardNotes = v; });
                });

            new Setting(manuscriptOptions)
                .setName('Scene separator')
                .setDesc('Separator used between scenes in manuscript exports.')
                .addDropdown(dd => dd
                    .addOptions({
                        'blank': 'Blank Line',
                        'asterisks': '* * *',
                        'custom': 'Custom Separator',
                    })
                    .setValue(this.sceneSeparatorType)
                    .onChange(async (v) => {
                        this.sceneSeparatorType = v as 'blank' | 'asterisks' | 'custom';
                        this.plugin.settings.exportSceneSeparatorType = this.sceneSeparatorType;
                        await this.plugin.saveSettings();
                        renderManuscriptOptions();
                    }));

            if (this.sceneSeparatorType === 'custom') {
                new Setting(manuscriptOptions)
                    .setName('Custom separator')
                    .setDesc('Enter any UTF-8 character or text to use as a scene separator.')
                    .addText(text => text
                        .setPlaceholder('e.g. ~ ~ ~')
                        .setValue(this.sceneSeparatorCustom)
                        .onChange(async (v) => {
                            this.sceneSeparatorCustom = v;
                            this.plugin.settings.exportSceneSeparatorCustom = v;
                            await this.plugin.saveSettings();
                        }));
            }

        };
        renderManuscriptOptions();

        const exportBtn = actions.createEl('button', { text: 'Export', cls: 'mod-cta' });
        exportBtn.setAttr('type', 'button');
        exportBtn.addEventListener('click', async () => {
            exportBtn.disabled = true;
            exportBtn.textContent = 'Exporting…';
            try {
                this.exportService.setExportOptions({
                    includeSceneTitles: this.includeSceneTitles,
                    numberScenesOnExport: this.numberScenesOnExport,
                    includeCorkboardNotes: this.includeCorkboardNotes,
                    includeInactiveScenes: this.includeInactiveScenes,
                });
                this.exportService.setSeparatorSettings(
                    this.sceneSeparatorType,
                    this.sceneSeparatorCustom
                );
                await this.exportService.export(this.format, this.exportScope);
                this.close();
            } catch (err) {
                new Notice('Export failed: ' + String(err));
                exportBtn.disabled = false;
                exportBtn.textContent = 'Export';
            }
        });

        const cancelBtn = actions.createEl('button', { text: 'Cancel' });
        cancelBtn.setAttr('type', 'button');
        cancelBtn.addEventListener('click', () => this.close());
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- end of file-wide suppression block opened at line 1 */
