import { Modal, App, Setting } from 'obsidian';

/**
 * A reusable confirmation dialog that replaces native `confirm()`.
 *
 * Uses Obsidian's Modal API so it integrates with the theme, doesn't
 * block the UI thread, and works on mobile.
 *
 * Usage:
 *   openConfirmModal(app, {
 *       title: 'Delete Scene',
 *       message: 'Are you sure you want to delete "The Chase"?',
 *       confirmLabel: 'Delete',
 *       confirmClass: 'mod-warning',
 *       onConfirm: () => { ... },
 *   });
 */

export interface ConfirmModalOptions {
    /** Title shown in the modal header */
    title: string;
    /** Body message (can include HTML-safe text) */
    message: string;
    /** Label for the confirm button (default: "Confirm") */
    confirmLabel?: string;
    /** CSS class for the confirm button (default: "mod-warning") */
    confirmClass?: string;
    /** Label for the cancel button (default: "Cancel") */
    cancelLabel?: string;
    /** Called when the user clicks confirm */
    onConfirm: () => void | Promise<void>;
    /** Called when the user clicks cancel (optional) */
    onCancel?: () => void;
}

export function openConfirmModal(app: App, opts: ConfirmModalOptions): void {
    const modal = new Modal(app);
    modal.titleEl.setText(opts.title);
    modal.contentEl.createEl('p', { text: opts.message });

    new Setting(modal.contentEl)
        .addButton(btn => {
            btn.setButtonText(opts.cancelLabel ?? 'Cancel')
                .onClick(() => {
                    modal.close();
                    opts.onCancel?.();
                });
        })
        .addButton(btn => {
            const b = btn.setButtonText(opts.confirmLabel ?? 'Confirm');
            if (opts.confirmClass === 'mod-cta') {
                b.setCta();
            } else {
                b.setWarning();
            }
            b.onClick(async () => {
                modal.close();
                await opts.onConfirm();
            });
        });

    modal.open();
}
