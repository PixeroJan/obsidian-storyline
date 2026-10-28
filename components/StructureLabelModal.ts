/* eslint-disable no-undef, @typescript-eslint/no-misused-promises -- Obsidian UI globals and async DOM handlers are intentional. */
import { App, Modal, Setting } from 'obsidian';

export function openStructureLabelModal(
    app: App,
    type: 'Act' | 'Chapter',
    number: number,
    current: string,
    onSave: (label: string) => Promise<void>,
): void {
    const modal = new Modal(app);
    modal.titleEl.setText(`Rename ${type} ${number}`);

    let value = current;
    new Setting(modal.contentEl)
        .setName('Label')
        .setDesc(`Display name for ${type} ${number}. Leave blank to remove.`)
        .addText(text => {
            text.setValue(current)
                .setPlaceholder('E.g. The beginning')
                .onChange(next => { value = next; });
            window.setTimeout(() => text.inputEl.focus(), 50);
        });

    const buttons = modal.contentEl.createDiv('structure-close-row');
    buttons.createEl('button', { text: 'Save', cls: 'mod-cta' }).addEventListener('click', async () => {
        await onSave(value);
        modal.close();
    });
    buttons.createEl('button', { text: 'Cancel' }).addEventListener('click', () => modal.close());
    modal.open();
}