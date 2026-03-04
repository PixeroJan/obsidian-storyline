import { App, Modal, Setting } from 'obsidian';
import { UniversalFieldTemplate, UniversalFieldType, generateId } from '../services/FieldTemplateService';
import { CHARACTER_CATEGORIES } from '../models/Character';

// ═══════════════════════════════════════════════════════
//  Add / Edit Universal Field Modal
// ═══════════════════════════════════════════════════════

/**
 * Modal to create or edit a universal field template.
 * Opens when the user clicks the '+' button in a section header.
 */
export class AddFieldModal extends Modal {
    private existing: UniversalFieldTemplate | null;
    private defaultSection: string;
    private onSubmit: (template: UniversalFieldTemplate) => void;
    private onDelete?: () => void;

    // Working state
    private label = '';
    private type: UniversalFieldType = 'text';
    private section = '';
    private placeholder = '';
    private options: string[] = [];

    /**
     * @param app            Obsidian App
     * @param defaultSection The section title to pre-select (e.g. 'Basic Information')
     * @param existing       If editing, the existing template; null for new
     * @param onSubmit       Called when the user confirms
     * @param onDelete       Called when the user clicks Delete (edit mode only)
     */
    constructor(
        app: App,
        defaultSection: string,
        existing: UniversalFieldTemplate | null,
        onSubmit: (template: UniversalFieldTemplate) => void,
        onDelete?: () => void,
    ) {
        super(app);
        this.defaultSection = defaultSection;
        this.existing = existing;
        this.onSubmit = onSubmit;
        this.onDelete = onDelete;

        if (existing) {
            this.label = existing.label;
            this.type = existing.type;
            this.section = existing.section;
            this.placeholder = existing.placeholder;
            this.options = [...existing.options];
        } else {
            this.section = defaultSection;
        }
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('storyline-add-field-modal');

        contentEl.createEl('h3', {
            text: this.existing ? 'Edit Universal Field' : 'Add Universal Field',
        });

        contentEl.createEl('p', {
            cls: 'storyline-add-field-desc',
            text: 'This field will appear on every character sheet in the chosen section.',
        });

        // ── Label ──
        new Setting(contentEl)
            .setName('Field label')
            .setDesc('The name shown next to the input')
            .addText(text => {
                text.setPlaceholder('e.g. Species')
                    .setValue(this.label)
                    .onChange(v => { this.label = v.trim(); });
                text.inputEl.focus();
            });

        // ── Section ──
        const sectionNames = CHARACTER_CATEGORIES.map(c => c.title);
        new Setting(contentEl)
            .setName('Section')
            .setDesc('Where this field appears on the character sheet')
            .addDropdown(dd => {
                for (const name of sectionNames) {
                    dd.addOption(name, name);
                }
                dd.setValue(this.section || sectionNames[0]);
                dd.onChange(v => { this.section = v; });
            });

        // ── Type ──
        let optionsContainer: HTMLElement | null = null;
        new Setting(contentEl)
            .setName('Input type')
            .addDropdown(dd => {
                dd.addOption('text', 'Text (single line)');
                dd.addOption('textarea', 'Text block (multi-line)');
                dd.addOption('dropdown', 'Dropdown menu');
                dd.setValue(this.type);
                dd.onChange(v => {
                    this.type = v as UniversalFieldType;
                    if (optionsContainer) {
                        optionsContainer.style.display = this.type === 'dropdown' ? '' : 'none';
                    }
                });
            });

        // ── Placeholder ──
        new Setting(contentEl)
            .setName('Placeholder')
            .setDesc('Hint text shown when the field is empty')
            .addText(text => {
                text.setPlaceholder('e.g. Human, Elf, Dwarf…')
                    .setValue(this.placeholder)
                    .onChange(v => { this.placeholder = v; });
            });

        // ── Dropdown options ──
        optionsContainer = contentEl.createDiv('storyline-field-options-container');
        if (this.type !== 'dropdown') optionsContainer.style.display = 'none';

        const optionsLabel = optionsContainer.createEl('div', {
            cls: 'setting-item-name',
            text: 'Dropdown options',
        });
        optionsLabel.style.marginBottom = '4px';

        const optionsList = optionsContainer.createDiv('storyline-field-options-list');
        const renderOptions = () => {
            optionsList.empty();
            for (let i = 0; i < this.options.length; i++) {
                const row = optionsList.createDiv('storyline-field-option-row');
                const input = row.createEl('input', {
                    cls: 'storyline-field-option-input',
                    type: 'text',
                    attr: { placeholder: `Option ${i + 1}` },
                });
                input.value = this.options[i];
                input.addEventListener('input', () => {
                    this.options[i] = input.value;
                });

                const removeBtn = row.createEl('button', {
                    cls: 'storyline-field-option-remove',
                    text: '×',
                    attr: { title: 'Remove option' },
                });
                removeBtn.addEventListener('click', () => {
                    this.options.splice(i, 1);
                    renderOptions();
                });
            }
        };
        renderOptions();

        const addOptBtn = optionsContainer.createEl('button', {
            cls: 'storyline-field-option-add',
            text: '+ Add option',
        });
        addOptBtn.addEventListener('click', () => {
            this.options.push('');
            renderOptions();
            // Focus the new input
            const inputs = optionsList.querySelectorAll('input');
            if (inputs.length) (inputs[inputs.length - 1] as HTMLInputElement).focus();
        });

        // ── Action buttons ──
        const footer = contentEl.createDiv('storyline-add-field-footer');

        if (this.existing && this.onDelete) {
            const deleteBtn = footer.createEl('button', {
                cls: 'mod-warning storyline-field-delete-btn',
                text: 'Delete field',
            });
            deleteBtn.addEventListener('click', () => {
                this.onDelete!();
                this.close();
            });
        }

        const spacer = footer.createDiv('storyline-add-field-spacer');

        const cancelBtn = footer.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => this.close());

        const confirmBtn = footer.createEl('button', {
            cls: 'mod-cta',
            text: this.existing ? 'Save' : 'Add field',
        });
        confirmBtn.addEventListener('click', () => {
            if (!this.label) {
                // Highlight label field
                const labelInput = contentEl.querySelector('.setting-item:first-child input') as HTMLInputElement;
                if (labelInput) {
                    labelInput.addClass('is-invalid');
                    labelInput.focus();
                }
                return;
            }

            // Filter empty options
            const cleanOptions = this.options.map(o => o.trim()).filter(Boolean);

            const template: UniversalFieldTemplate = {
                id: this.existing?.id ?? generateId(),
                label: this.label,
                section: this.section || CHARACTER_CATEGORIES[0].title,
                type: this.type,
                options: this.type === 'dropdown' ? cleanOptions : [],
                placeholder: this.placeholder,
                order: this.existing?.order ?? Date.now(),
            };

            this.onSubmit(template);
            this.close();
        });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
