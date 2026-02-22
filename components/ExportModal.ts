import { Modal, Setting, Notice } from 'obsidian';
import { ExportService, ExportFormat, ExportScope } from '../services/ExportService';
import type SceneCardsPlugin from '../main';

/**
 * Modal that lets the user pick format (MD / JSON / PDF) and scope
 * (manuscript / outline), then triggers the export.
 */
export class ExportModal extends Modal {
    private plugin: SceneCardsPlugin;
    private exportService: ExportService;

    private format: ExportFormat = 'md';
    private exportScope: ExportScope = 'outline';

    constructor(plugin: SceneCardsPlugin) {
        super(plugin.app);
        this.plugin = plugin;
        this.exportService = new ExportService(plugin.app, plugin.sceneManager, plugin.characterManager, plugin.locationManager);
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('storyline-export-modal');

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
        new Setting(contentEl)
            .setName('Content')
            .setDesc('What to include in the export')
            .addDropdown(dd => {
                dd.addOption('outline', 'Outline (metadata, stats, table)');
                dd.addOption('manuscript', 'Manuscript (scene text in order)');
                dd.setValue(this.exportScope);
                dd.onChange(v => { this.exportScope = v as ExportScope; });
            });

        // Format selection
        new Setting(contentEl)
            .setName('Format')
            .addDropdown(dd => {
                dd.addOption('md', 'Markdown (.md)');
                dd.addOption('json', 'JSON (.json)');
                dd.addOption('csv', 'CSV (.csv)');
                dd.addOption('pdf', 'PDF (print dialog)');
                dd.setValue(this.format);
                dd.onChange(v => { this.format = v as ExportFormat; });
            });

        // Actions
        const actions = contentEl.createDiv({ cls: 'storyline-export-actions' });

        const exportBtn = actions.createEl('button', { text: 'Export', cls: 'mod-cta' });
        exportBtn.setAttr('type', 'button');
        exportBtn.addEventListener('click', async () => {
            exportBtn.disabled = true;
            exportBtn.textContent = 'Exporting…';
            try {
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
