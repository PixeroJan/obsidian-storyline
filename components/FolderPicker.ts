import { App, FuzzySuggestModal, TFolder } from 'obsidian';

/** Open a searchable picker for folders in the current vault. */
export function pickVaultFolder(
    app: App,
    onSelect: (path: string) => void,
): void {
    const folders = app.vault.getAllLoadedFiles()
        .filter((file): file is TFolder => file instanceof TFolder && file.path.length > 0)
        .sort((a, b) => a.path.localeCompare(b.path));
    new VaultFolderPickerModal(app, folders, onSelect).open();
}

class VaultFolderPickerModal extends FuzzySuggestModal<TFolder> {
    private folders: TFolder[];
    private onSelect: (path: string) => void;

    constructor(app: App, folders: TFolder[], onSelect: (path: string) => void) {
        super(app);
        this.folders = folders;
        this.onSelect = onSelect;
        this.setPlaceholder('Search for a vault folder...');
    }

    getItems(): TFolder[] {
        return this.folders;
    }

    getItemText(item: TFolder): string {
        return item.path;
    }

    onChooseItem(item: TFolder): void {
        this.onSelect(item.path);
    }
}
