import { App, Modal, Setting } from 'obsidian';

export interface SceneFilenameSyncChange {
    currentPath: string;
    newPath: string;
}

export class SceneFilenameSyncModal extends Modal {
    constructor(
        app: App,
        private changes: SceneFilenameSyncChange[],
        private onConfirm: () => void | Promise<void>,
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        this.titleEl.setText('Synchronize scene filenames');
        contentEl.createEl('p', {
            text: `${this.changes.length} scene filename${this.changes.length === 1 ? '' : 's'} will be updated from current metadata. Scene content and frontmatter will not be changed.`,
        });

        const list = contentEl.createEl('ul', { cls: 'storyline-filename-sync-list' });
        for (const change of this.changes.slice(0, 100)) {
            const item = list.createEl('li');
            item.createEl('code', { text: change.currentPath });
            item.createSpan({ text: ' -> ' });
            item.createEl('code', { text: change.newPath });
        }
        if (this.changes.length > 100) {
            contentEl.createEl('p', {
                text: `Showing the first 100 changes of ${this.changes.length}.`,
                cls: 'mod-muted',
            });
        }

        new Setting(contentEl)
            .addButton(btn => btn.setButtonText('Cancel').onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText('Synchronize filenames')
                .setCta()
                .onClick(async () => {
                    this.close();
                    await this.onConfirm();
                }));
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
