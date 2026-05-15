/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
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

import { App, TFile, TFolder, normalizePath, Notice } from 'obsidian';
import { DEFAULT_STORYLINE_LOCALE, StoryLineLocale, tokenizeWords } from '../utils/locale';

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
        const file = this.app.vault.getAbstractFileByPath(sceneFilePath);
        if (!(file instanceof TFile)) {
            throw new Error(`Scene file not found: ${sceneFilePath}`);
        }

        const content = await this.app.vault.read(file);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeName = file.basename.replace(/[\\/:*?"<>|]/g, '-');
        const safeLabel = label.replace(/[\\/:*?"<>|]/g, '-').substring(0, 40);

        const snapshotDir = this.getSnapshotDir(sceneFilePath);
        await this.ensureFolder(snapshotDir);

        const snapshotFileName = `${safeName}__${timestamp}__${safeLabel}.md`;
        const snapshotPath = normalizePath(`${snapshotDir}/${snapshotFileName}`);

        // Prepend a small header comment
        const wordcount = this.countWords(content);
        const header = [
            `<!-- StoryLine Snapshot`,
            `  scene: ${sceneFilePath}`,
            `  label: ${label}`,
            `  timestamp: ${new Date().toISOString()}`,
            `  wordcount: ${wordcount}`,
            `-->`,
            '',
        ].join('\n');

        await this.app.vault.create(snapshotPath, header + content);

        new Notice(`Snapshot "${label}" saved`);

        return {
            filePath: snapshotPath,
            sceneFilePath,
            label,
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
            const meta = this.parseSnapshotHeader(content);

            snapshots.push({
                filePath: child.path,
                sceneFilePath,
                label: meta.label || parts.slice(2).join('__'),
                timestamp: meta.timestamp || parts[1].replace(/-/g, ':'),
                wordcount: meta.wordcount,
            });
        }

        // Sort newest first
        snapshots.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        return snapshots;
    }

    /**
     * Read the content of a snapshot (without the header comment).
     */
    async readSnapshotContent(snapshotPath: string): Promise<string> {
        const file = this.app.vault.getAbstractFileByPath(snapshotPath);
        if (!(file instanceof TFile)) throw new Error(`Snapshot not found: ${snapshotPath}`);

        const content = await this.app.vault.read(file);
        // Strip the header comment
        return content.replace(/^<!--[\s\S]*?-->\n?/, '');
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
        // Place snapshots folder next to the scene's parent folder
        const parts = sceneFilePath.split('/');
        parts.pop(); // remove filename
        return normalizePath(parts.join('/') + '/.snapshots');
    }

    private async ensureFolder(path: string): Promise<void> {
        if (!this.app.vault.getAbstractFileByPath(path)) {
            await this.app.vault.createFolder(path);
        }
    }

    private countWords(content: string): number {
        // Strip frontmatter
        const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
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
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- end of file-wide suppression block opened at line 1 */
