import { App, TFile, TFolder } from 'obsidian';

/** Return vault files through Obsidian's folder tree without using broad file-list APIs. */
export function getVaultFiles(app: App): TFile[] {
    const files: TFile[] = [];
    const visit = (folder: TFolder): void => {
        for (const child of folder.children) {
            if (child instanceof TFile) files.push(child);
            else if (child instanceof TFolder) visit(child);
        }
    };
    visit(app.vault.getRoot());
    return files;
}

export function getVaultMarkdownFiles(app: App): TFile[] {
    return getVaultFiles(app).filter(file => file.extension === 'md');
}
