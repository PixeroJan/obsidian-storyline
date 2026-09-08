 
/**
 * SnapshotManager — save, list, compare and restore named snapshots
 * of individual scene files.
 *
 * Snapshots are stored as sibling files in a `.snapshots/` sub-folder
 * next to each scene, or alternatively under the project's `.snapshots/`
 * directory. Each snapshot is a plain markdown file containing the full
 * scene content (frontmatter + body) at the moment of capture.
 *
 * Naming convention:
 *   <scene-basename>__<timestamp>__<label>.md
 */

import { App, TFile, TFolder, normalizePath, Notice, type DataAdapter } from 'obsidian';
import { tokenizeWords, DEFAULT_STORYLINE_LOCALE, type StoryLineLocale } from '../utils/locale';

export interface SceneSnapshot {
    /** Vault-relative path of the snapshot file */
    filePath: string;
    /** Original scene file path */
    sceneFilePath: string;
    /** User-provided label */
    label: string;
    /** ISO timestamp of when the snapshot was taken */
    timestamp: string;
    /** Word count at snapshot time */
    wordcount?: number;
}

export class SnapshotManager {
    private app: App;
    private getLocale: () => StoryLineLocale;

    constructor(app: App, getLocale: () => StoryLineLocale = () => DEFAULT_STORYLINE_LOCALE) {
        this.app = app;
        this.getLocale = getLocale;
    }

    /**
     * Save a named snapshot of a scene.
     */
    async saveSnapshot(sceneFilePath: string, label: string): Promise<SceneSnapshot> {
        // Issue #182 — guard against non-string inputs that would crash
        // downstream `.replace()` calls when building the snapshot filename.
        const safePath = typeof sceneFilePath === 'string' ? sceneFilePath : String(sceneFilePath ?? '');
        const safeLabel = typeof label === 'string' ? label : String(label ?? 'Snapshot');
        const file = this.app.vault.getAbstractFileByPath(safePath);
        if (!(file instanceof TFile)) {
            throw new Error(`Scene file not found: ${safePath}`);
        }

        // Migrate any legacy snapshots from the (vault-invisible) `.snapshots`
        // folder into the current snapshot folder before saving.
        await this.migrateLegacySnapshotsFolder(safePath);

        const content = await this.app.vault.read(file);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeName = file.basename.replace(/[\\/:*?"<>|]/g, '-');
        const safeLabelPart = safeLabel.replace(/[\\/:*?"<>|]/g, '-').substring(0, 40);

        const snapshotDir = this.getSnapshotDir(safePath);
        await this.ensureFolder(snapshotDir);

        const snapshotFileName = `${safeName}__${timestamp}__${safeLabelPart}.md`;
        const snapshotPath = normalizePath(`${snapshotDir}/${snapshotFileName}`);

        // Write the snapshot as an exact copy of the scene file so it opens
        // identically in Obsidian (frontmatter on line 1 is recognized as
        // Properties and collapsed away). Metadata (label, timestamp,
        // wordcount) is recovered from the filename + body on listing.
        const wordcount = this.countWords(content);
        await this.app.vault.create(snapshotPath, content);

        new Notice(`Snapshot "${safeLabel}" saved`);

        return {
            filePath: snapshotPath,
            sceneFilePath: safePath,
            label: safeLabel,
            timestamp: new Date().toISOString(),
            wordcount,
        };
    }

    /**
     * List all snapshots for a given scene, newest first.
     */
    async listSnapshots(sceneFilePath: string): Promise<SceneSnapshot[]> {
        const file = this.app.vault.getAbstractFileByPath(sceneFilePath);
        if (!(file instanceof TFile)) return [];

        // Migrate any legacy snapshots from `.snapshots` (hidden from Obsidian's
        // vault index) into the visible snapshot folder.
        await this.migrateLegacySnapshotsFolder(sceneFilePath);

        const snapshotDir = this.getSnapshotDir(sceneFilePath);
        const folder = this.app.vault.getAbstractFileByPath(snapshotDir);
        if (!(folder instanceof TFolder)) return [];

        const baseName = file.basename;
        const snapshots: SceneSnapshot[] = [];

        for (const child of folder.children) {
            if (!(child instanceof TFile) || !child.name.startsWith(baseName + '__')) continue;

            // Parse filename: basename__timestamp__label.md
            const parts = child.basename.split('__');
            if (parts.length < 3) continue;

            const content = await this.app.vault.read(child);
            // Legacy snapshots carried a `<!-- StoryLine Snapshot ... -->`
            // header with label/timestamp/wordcount; new ones are exact copies
            // of the source and derive metadata from the filename + body.
            const meta = this.parseSnapshotHeader(content);
            const body = content.replace(/^<!--[\s\S]*?-->\n?/, '');

            snapshots.push({
                filePath: child.path,
                sceneFilePath,
                label: meta.label || parts.slice(2).join('__'),
                timestamp: meta.timestamp || parts[1].replace(/-/g, ':'),
                wordcount: meta.wordcount ?? this.countWords(body),
            });
        }

        // Sort newest first
        snapshots.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        return snapshots;
    }

    /**
     * Read the content of a snapshot. Legacy snapshots had a leading HTML
     * comment header that is stripped here; modern snapshots are exact copies
     * of the source file and are returned unchanged.
     */
    async readSnapshotContent(snapshotPath: string): Promise<string> {
        const file = this.app.vault.getAbstractFileByPath(snapshotPath);
        if (!(file instanceof TFile)) throw new Error(`Snapshot not found: ${snapshotPath}`);

        const content = await this.app.vault.read(file);
        // Strip the legacy StoryLine header comment if present.
        return content.replace(/^<!--\s*StoryLine Snapshot[\s\S]*?-->\n?/, '');
    }

    /**
     * Restore a snapshot — replaces the scene file content with the snapshot.
     */
    async restoreSnapshot(snapshotPath: string, sceneFilePath: string): Promise<void> {
        const sceneFile = this.app.vault.getAbstractFileByPath(sceneFilePath);
        if (!(sceneFile instanceof TFile)) throw new Error(`Scene not found: ${sceneFilePath}`);

        const snapshotContent = await this.readSnapshotContent(snapshotPath);
        await this.app.vault.modify(sceneFile, snapshotContent);
        new Notice('Snapshot restored');
    }

    /**
     * Delete a snapshot file.
     */
    async deleteSnapshot(snapshotPath: string): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(snapshotPath);
        if (file instanceof TFile) {
            await this.app.fileManager.trashFile(file);
        }
    }

    /** Keep snapshot filenames aligned with a renamed scene file. */
    async renameSceneSnapshots(oldSceneFilePath: string, newSceneFilePath: string): Promise<void> {
        const oldBase = oldSceneFilePath.split('/').pop()?.replace(/\.md$/, '');
        const newBase = newSceneFilePath.split('/').pop()?.replace(/\.md$/, '');
        if (!oldBase || !newBase || oldBase === newBase) return;

        await this.migrateLegacySnapshotsFolder(oldSceneFilePath);

        const oldDir = this.getSnapshotDir(oldSceneFilePath);
        const newDir = this.getSnapshotDir(newSceneFilePath);
        const oldFolder = this.app.vault.getAbstractFileByPath(oldDir);
        if (!(oldFolder instanceof TFolder)) return;
        if (oldDir !== newDir) await this.ensureFolder(newDir);

        for (const child of [...oldFolder.children]) {
            if (!(child instanceof TFile) || !child.name.startsWith(`${oldBase}__`)) continue;
            const newName = `${newBase}${child.name.slice(oldBase.length)}`;
            const destination = normalizePath(`${newDir}/${newName}`);
            if (this.app.vault.getAbstractFileByPath(destination)) continue;
            try {
                await this.app.fileManager.renameFile(child, destination);
            } catch {
                // A snapshot rename should never block the scene rename.
            }
        }
    }

    /**
     * Simple diff: returns lines that differ between snapshot and current scene.
     */
    async compareSnapshot(snapshotPath: string, sceneFilePath: string): Promise<{ added: string[]; removed: string[] }> {
        const sceneFile = this.app.vault.getAbstractFileByPath(sceneFilePath);
        if (!(sceneFile instanceof TFile)) return { added: [], removed: [] };

        const currentContent = await this.app.vault.read(sceneFile);
        const snapshotContent = await this.readSnapshotContent(snapshotPath);

        const currentLines = currentContent.split('\n');
        const snapshotLines = snapshotContent.split('\n');

        const currentSet = new Set(currentLines);
        const snapshotSet = new Set(snapshotLines);

        const added = currentLines.filter(l => !snapshotSet.has(l) && l.trim());
        const removed = snapshotLines.filter(l => !currentSet.has(l) && l.trim());

        return { added, removed };
    }

    // ── Helpers ────────────────────────────────────────

    private getSnapshotDir(sceneFilePath: string): string {
        // Place snapshots folder next to the scene. Use an underscore prefix
        // (not a dot) so the folder is visible to Obsidian's vault index —
        // dot-prefixed folders are treated as hidden/system files and are
        // skipped by `vault.getAbstractFileByPath`, which made snapshots
        // appear to vanish even though the file was written to disk.
        const parts = sceneFilePath.split('/');
        parts.pop(); // remove filename
        const dir = parts.join('/');
        return normalizePath((dir ? dir + '/' : '') + '_snapshots');
    }

    private getLegacySnapshotDir(sceneFilePath: string): string {
        const parts = sceneFilePath.split('/');
        parts.pop();
        const dir = parts.join('/');
        return normalizePath((dir ? dir + '/' : '') + '.snapshots');
    }

    private async ensureFolder(path: string): Promise<void> {
        if (!this.app.vault.getAbstractFileByPath(path)) {
            await this.app.vault.createFolder(path);
        }
    }

    /**
     * One-shot migration: move any snapshots from the legacy `.snapshots`
     * folder (invisible to Obsidian) into the new `_snapshots` folder so
     * existing files written under the old scheme appear in the UI again.
     */
    private async migrateLegacySnapshotsFolder(sceneFilePath: string): Promise<void> {
        const legacyDir = this.getLegacySnapshotDir(sceneFilePath);
        const newDir = this.getSnapshotDir(sceneFilePath);
        const adapter: DataAdapter = this.app.vault.adapter;
        try {
            const exists = await adapter.exists(legacyDir);
            if (!exists) return;
            const listing = await adapter.list(legacyDir);
            const files: string[] = (listing && listing.files) || [];
            if (files.length === 0) return;
            await this.ensureFolder(newDir);
            for (const src of files) {
                const name = src.split('/').pop();
                if (!name) continue;
                const dst = normalizePath(`${newDir}/${name}`);
                const dstExists = await adapter.exists(dst);
                if (dstExists) continue;
                try {
                    await adapter.rename(src, dst);
                } catch {
                    // Fall back to copy + remove if rename fails
                    try {
                        const data = await adapter.read(src);
                        await adapter.write(dst, data);
                        await adapter.remove(src);
                    } catch { /* ignore */ }
                }
            }
            // Try to remove the now-empty legacy folder (best-effort)
            try {
                const after = await adapter.list(legacyDir);
                if (after && (after.files || []).length === 0 && (after.folders || []).length === 0) {
                    await adapter.rmdir(legacyDir, false);
                }
            } catch { /* ignore */ }
        } catch {
            /* migration is best-effort */
        }
    }

    private countWords(content: string): number {
        // Strip frontmatter
        const body = content.replace(/^---[\s\S]*?---\n?/, '');
        return tokenizeWords(body.trim(), this.getLocale()).length;
    }

    private parseSnapshotHeader(content: string): { label?: string; timestamp?: string; wordcount?: number } {
        const match = content.match(/^<!--[\s\S]*?-->/);
        if (!match) return {};

        const header = match[0];
        const label = header.match(/label:\s*(.+)/)?.[1]?.trim();
        const timestamp = header.match(/timestamp:\s*(.+)/)?.[1]?.trim();
        const wc = header.match(/wordcount:\s*(\d+)/)?.[1];

        return {
            label,
            timestamp,
            wordcount: wc ? Number(wc) : undefined,
        };
    }
}
 
