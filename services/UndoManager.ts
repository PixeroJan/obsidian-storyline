import { App, TFile, Notice } from 'obsidian';
import { Scene } from '../models/Scene';
import { MetadataParser } from './MetadataParser';

/**
 * Types of undoable actions
 */
type UndoActionType = 'update' | 'create' | 'delete';

/**
 * Domain that the action belongs to — drives which manager re-applies changes.
 */
type UndoDomain = 'scene' | 'character' | 'location';

/**
 * A single undoable action.
 */
interface UndoAction {
    type: UndoActionType;
    /** Which domain this action belongs to */
    domain: UndoDomain;
    /** Human-readable description (e.g. "Update status of 'The Red Door'") */
    label: string;
    filePath: string;
    /** For 'update': the field values *before* the change */
    oldValues?: Record<string, any>;
    /** For 'update': the field values *after* the change */
    newValues?: Record<string, any>;
    /** For 'delete': full file content so we can re-create the file */
    fileContent?: string;
    /** For 'create': we store the content so undo can delete, redo can re-create */
    createdContent?: string;
}

const MAX_STACK = 50;

/**
 * Manages an undo/redo stack for scene operations.
 *
 * Usage:
 *  - Before an update:  `undoManager.recordUpdate(filePath, oldSnap, newUpdates, label)`
 *  - Before a delete:   `undoManager.recordDelete(filePath, fileContent, label)`
 *  - After a create:    `undoManager.recordCreate(filePath, fileContent, label)`
 *  - Undo:              `await undoManager.undo()`
 *  - Redo:              `await undoManager.redo()`
 */
export class UndoManager {
    private app: App;
    private undoStack: UndoAction[] = [];
    private redoStack: UndoAction[] = [];
    /** Callback fired after undo/redo so views can refresh */
    onAfterUndoRedo: (() => void) | null = null;

    constructor(app: App) {
        this.app = app;
    }

    // ─── Recording ──────────────────────────────────────────────

    /**
     * Record a scene update (field changes).
     * @param filePath  Scene file path
     * @param oldSnap   Snapshot of the scene **before** the update
     * @param newUpdates The partial updates being applied
     * @param label     Human-readable description
     * @param domain    Which domain ('scene' | 'character' | 'location')
     */
    recordUpdate(
        filePath: string,
        oldSnap: Record<string, any>,
        newUpdates: Record<string, any>,
        label?: string,
        domain: UndoDomain = 'scene'
    ): void {
        // Only store the fields that are actually changing
        const oldValues: Record<string, any> = {};
        for (const key of Object.keys(newUpdates)) {
            oldValues[key] = oldSnap[key];
        }

        this.push({
            type: 'update',
            domain,
            label: label || `Update ${domain}`,
            filePath,
            oldValues,
            newValues: { ...newUpdates },
        });
    }

    /**
     * Record a deletion.
     * @param filePath     File path
     * @param fileContent  Full markdown content of the file (so it can be restored)
     * @param label        Human-readable description
     * @param domain       Which domain ('scene' | 'character' | 'location')
     */
    recordDelete(filePath: string, fileContent: string, label?: string, domain: UndoDomain = 'scene'): void {
        this.push({
            type: 'delete',
            domain,
            label: label || `Delete ${domain}`,
            filePath,
            fileContent,
        });
    }

    /**
     * Record a creation.
     * @param filePath       Newly-created file path
     * @param fileContent    Content that was written
     * @param label          Human-readable description
     * @param domain         Which domain ('scene' | 'character' | 'location')
     */
    recordCreate(filePath: string, fileContent: string, label?: string, domain: UndoDomain = 'scene'): void {
        this.push({
            type: 'create',
            domain,
            label: label || `Create ${domain}`,
            filePath,
            createdContent: fileContent,
        });
    }

    // ─── Undo / Redo ────────────────────────────────────────────

    get canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    get canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    async undo(): Promise<boolean> {
        const action = this.undoStack.pop();
        if (!action) {
            new Notice('Nothing to undo');
            return false;
        }

        try {
            await this.applyReverse(action);
            this.redoStack.push(action);
            if (this.redoStack.length > MAX_STACK) this.redoStack.shift();
            new Notice(`Undo: ${action.label}`);
            this.onAfterUndoRedo?.();
            return true;
        } catch (e) {
            console.error('StoryLine: undo failed', e);
            new Notice(`Undo failed: ${(e as Error).message}`);
            return false;
        }
    }

    async redo(): Promise<boolean> {
        const action = this.redoStack.pop();
        if (!action) {
            new Notice('Nothing to redo');
            return false;
        }

        try {
            await this.applyForward(action);
            this.undoStack.push(action);
            if (this.undoStack.length > MAX_STACK) this.undoStack.shift();
            new Notice(`Redo: ${action.label}`);
            this.onAfterUndoRedo?.();
            return true;
        } catch (e) {
            console.error('StoryLine: redo failed', e);
            new Notice(`Redo failed: ${(e as Error).message}`);
            return false;
        }
    }

    /**
     * Clear all history (e.g. on project switch)
     */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }

    // ─── Internal ───────────────────────────────────────────────

    private push(action: UndoAction): void {
        this.undoStack.push(action);
        if (this.undoStack.length > MAX_STACK) this.undoStack.shift();
        // A new action always clears the redo stack
        this.redoStack = [];
    }

    /**
     * Apply the *reverse* of an action (for undo).
     */
    private async applyReverse(action: UndoAction): Promise<void> {
        switch (action.type) {
            case 'update': {
                const file = this.app.vault.getAbstractFileByPath(action.filePath);
                if (!file || !(file instanceof TFile)) throw new Error('File not found');
                await MetadataParser.updateFrontmatter(this.app, file, action.oldValues! as Partial<Scene>);
                break;
            }
            case 'delete': {
                // Re-create the deleted file
                if (!action.fileContent) throw new Error('No saved content for undo-delete');
                await this.ensureParentFolder(action.filePath);
                await this.app.vault.create(action.filePath, action.fileContent);
                break;
            }
            case 'create': {
                // Delete the created file
                const file = this.app.vault.getAbstractFileByPath(action.filePath);
                if (file && file instanceof TFile) {
                    await this.app.vault.trash(file, true);
                }
                break;
            }
        }
    }

    /**
     * Apply an action forward (for redo).
     */
    private async applyForward(action: UndoAction): Promise<void> {
        switch (action.type) {
            case 'update': {
                const file = this.app.vault.getAbstractFileByPath(action.filePath);
                if (!file || !(file instanceof TFile)) throw new Error('File not found');
                await MetadataParser.updateFrontmatter(this.app, file, action.newValues! as Partial<Scene>);
                break;
            }
            case 'delete': {
                // Delete the file again
                const file = this.app.vault.getAbstractFileByPath(action.filePath);
                if (file && file instanceof TFile) {
                    await this.app.vault.trash(file, true);
                }
                break;
            }
            case 'create': {
                // Re-create the file
                if (!action.createdContent) throw new Error('No saved content for redo-create');
                await this.ensureParentFolder(action.filePath);
                await this.app.vault.create(action.filePath, action.createdContent);
                break;
            }
        }
    }

    private async ensureParentFolder(filePath: string): Promise<void> {
        const parts = filePath.split('/');
        parts.pop(); // remove filename
        if (parts.length === 0) return;
        const folder = parts.join('/');
        const existing = this.app.vault.getAbstractFileByPath(folder);
        if (!existing) {
            await this.app.vault.createFolder(folder);
        }
    }
}
