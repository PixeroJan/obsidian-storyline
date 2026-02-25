/**
 * ImagePicker — shared image selection component.
 *
 * Provides:
 *   - Import from computer (uses hidden <input type="file">, copies into vault)
 *   - Choose from vault (fuzzy suggest modal)
 *   - Remove image
 */
import { App, Modal, TFile, Notice, FuzzySuggestModal } from 'obsidian';
import * as obsidian from 'obsidian';

/**
 * Helper function to resolve an image path to a valid resource URL
 * Tries multiple approaches to handle different image storage methods
 */
export function resolveImagePath(app: App, imagePath: string): string {
    if (!imagePath) return '';
    
    // Handle direct URLs
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    // Try to get the file object — vault.getResourcePath(TFile) is the most reliable
    try {
        const imageFile = app.vault.getAbstractFileByPath(imagePath);
        if (imageFile instanceof TFile) {
            return app.vault.getResourcePath(imageFile);
        }
    } catch { /* fall through */ }
    
    // Fallback to adapter resource path
    return app.vault.adapter.getResourcePath(imagePath);
}

/**
 * Get the project-level Images folder path.
 * Derives it from the scene folder (strips /Scenes, appends /Images).
 */
function getImagesFolderPath(app: App, sceneFolder: string): string {
    const projectRoot = sceneFolder.replace(/\\/g, '/').replace(/\/Scenes\/?$/, '');
    return `${projectRoot}/Images`;
}

/**
 * Import a file from the user's computer into the vault Images folder.
 * Returns the vault-relative path of the imported file, or undefined on cancel/error.
 */
function importImageFromComputer(app: App, sceneFolder: string): Promise<string | undefined> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/gif,image/svg+xml,image/webp,image/bmp,image/avif';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            document.body.removeChild(input);

            if (!file) {
                resolve(undefined);
                return;
            }

            try {
                const imagesFolder = getImagesFolderPath(app, sceneFolder);
                


                // Ensure Images folder exists
                if (!(await app.vault.adapter.exists(imagesFolder))) {
                    await app.vault.createFolder(imagesFolder);
                }

                // Read file as ArrayBuffer
                const buffer = await file.arrayBuffer();

                // Deduplicate filename if it already exists
                let fileName = file.name;
                let targetPath = `${imagesFolder}/${fileName}`;
                let counter = 1;
                while (await app.vault.adapter.exists(targetPath)) {
                    const ext = fileName.lastIndexOf('.') >= 0
                        ? fileName.slice(fileName.lastIndexOf('.'))
                        : '';
                    const base = fileName.lastIndexOf('.') >= 0
                        ? fileName.slice(0, fileName.lastIndexOf('.'))
                        : fileName;
                    targetPath = `${imagesFolder}/${base}-${counter}${ext}`;
                    counter++;
                }

                // Write to vault
                await app.vault.createBinary(targetPath, buffer);

                new Notice(`Image imported: ${targetPath.split('/').pop()}`);
                
                resolve(targetPath);
            } catch (err) {
                console.error('[StoryLine] Image import failed:', err);
                new Notice(`❌ Failed to import image: ${String(err)}`);
                resolve(undefined);
            }
        });

        input.addEventListener('cancel', () => {
            document.body.removeChild(input);
            resolve(undefined);
        });

        // Fallback: if the dialog is dismissed without firing 'change' or 'cancel'
        // we listen for focus returning to the window
        const onFocus = () => {
            setTimeout(() => {
                if (document.body.contains(input)) {
                    document.body.removeChild(input);
                }
                window.removeEventListener('focus', onFocus);
            }, 300);
        };
        window.addEventListener('focus', onFocus);

        input.click();
    });
}

/**
 * Main entry point — opens a choice modal for picking / importing an image.
 *
 * @param app          Obsidian App
 * @param sceneFolder  The active project's scene folder path (used to derive Images folder)
 * @param currentImage Current image path (or undefined)
 * @returns vault-relative path of selected image, empty string to remove, or undefined if cancelled
 */
export function pickImage(
    app: App,
    sceneFolder: string,
    currentImage?: string,
): Promise<string | undefined> {
    return new Promise((resolve) => {
        const modal = new ImageChoiceModal(app, sceneFolder, currentImage, resolve);
        modal.open();
    });
}

// ── Choice Modal ────────────────────────────────────

class ImageChoiceModal extends Modal {
    private sceneFolder: string;
    private currentImage?: string;
    private onResult: (result: string | undefined) => void;
    private resolved = false;

    constructor(app: App, sceneFolder: string, currentImage: string | undefined, onResult: (result: string | undefined) => void) {
        super(app);
        this.sceneFolder = sceneFolder;
        this.currentImage = currentImage;
        this.onResult = onResult;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('storyline-image-choice-modal');

        contentEl.createEl('h3', { text: 'Set Image' });

        // Current image preview
        if (this.currentImage) {
            const preview = contentEl.createDiv('image-choice-preview');
            try {
                // Use the helper function to resolve the image path
                const imgSrc = resolveImagePath(this.app, this.currentImage);
                
                const img = preview.createEl('img', { attr: { src: imgSrc } });
                img.style.maxWidth = '160px';
                img.style.maxHeight = '120px';
                img.style.borderRadius = '8px';
                img.style.objectFit = 'cover';
                
                // Add error handler to show placeholder if image fails to load
                img.onerror = () => {
                    img.remove();
                    const placeholder = preview.createDiv('image-choice-preview-placeholder');
                    placeholder.setText('Image not found');
                    console.log('Failed to load image in picker:', this.currentImage);
                };
            } catch (error) {
                console.error('Error loading image in picker:', error);
                const placeholder = preview.createDiv('image-choice-preview-placeholder');
                placeholder.setText('Image not found');
            }
            img.style.border = '1px solid var(--background-modifier-border)';

            const pathLabel = preview.createDiv();
            pathLabel.style.fontSize = '11px';
            pathLabel.style.color = 'var(--text-muted)';
            pathLabel.style.marginTop = '4px';
            pathLabel.textContent = this.currentImage;
        }

        const btnRow = contentEl.createDiv('image-choice-buttons');

        // Import from computer
        const importBtn = btnRow.createEl('button', { cls: 'mod-cta', text: 'Import from computer' });
        const importIcon = importBtn.createSpan({ cls: 'image-choice-btn-icon' });
        obsidian.setIcon(importIcon, 'upload');
        importBtn.prepend(importIcon);
        importBtn.addEventListener('click', async () => {
            this.close();
            const result = await importImageFromComputer(this.app, this.sceneFolder);
            if (result) {
                this.resolved = true;
                this.onResult(result);
            } else {
                this.resolved = true;
                this.onResult(undefined);
            }
        });

        // Choose from vault
        const vaultBtn = btnRow.createEl('button', { text: 'Choose from vault' });
        const vaultIcon = vaultBtn.createSpan({ cls: 'image-choice-btn-icon' });
        obsidian.setIcon(vaultIcon, 'folder-open');
        vaultBtn.prepend(vaultIcon);
        vaultBtn.addEventListener('click', () => {
            this.close();
            const allFiles = this.app.vault.getFiles()
                .filter(f => /\.(png|jpe?g|gif|svg|webp|bmp|avif)$/i.test(f.path))
                .sort((a, b) => a.path.localeCompare(b.path));

            const picker = new VaultImagePickerModal(this.app, allFiles, (result) => {
                this.resolved = true;
                this.onResult(result);
            });
            picker.open();
        });

        // Remove image (only if one is set)
        if (this.currentImage) {
            const removeBtn = btnRow.createEl('button', { cls: 'mod-warning', text: 'Remove image' });
            const removeIcon = removeBtn.createSpan({ cls: 'image-choice-btn-icon' });
            obsidian.setIcon(removeIcon, 'x');
            removeBtn.prepend(removeIcon);
            removeBtn.addEventListener('click', () => {
                this.resolved = true;
                this.onResult('');
                this.close();
            });
        }
    }

    onClose(): void {
        this.contentEl.empty();
        if (!this.resolved) {
            this.onResult(undefined);
        }
    }
}

// ── Vault Image Picker (fuzzy suggest) ──────────────

class VaultImagePickerModal extends FuzzySuggestModal<TFile> {
    private imageFiles: TFile[];
    private onSelect: (path: string | undefined) => void;
    private picked = false;

    constructor(app: App, files: TFile[], onSelect: (path: string | undefined) => void) {
        super(app);
        this.imageFiles = files;
        this.onSelect = onSelect;
        this.setPlaceholder('Search for an image file…');
    }

    getItems(): TFile[] {
        return this.imageFiles;
    }

    getItemText(item: TFile): string {
        return item.path;
    }

    onChooseItem(item: TFile): void {
        this.picked = true;
        this.onSelect(item.path);
    }

    onClose(): void {
        super.onClose();
        if (!this.picked) {
            this.onSelect(undefined);
        }
    }
}
