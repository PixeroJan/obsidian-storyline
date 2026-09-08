/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises -- DOM/event handlers and Obsidian dynamic API */
import * as obsidian from 'obsidian';
import type SceneCardsPlugin from '../main';
import { SceneManager } from '../services/SceneManager';
import { Scene, getStatusOrder, resolveStatusCfg } from '../models/Scene';
import { renderAutocompleteInput } from './InlineSuggest';

/**
 * Lightweight "Info" side panel — a planning-focused mini Inspector.
 *
 * Shows: Status · POV · Location · Synopsis · Word count · Notes
 * All fields are bound to the same Scene model the main Inspector edits,
 * so changes round-trip through the normal frontmatter pipeline.
 */
export type InfoPanelMode = 'full' | 'synopsis' | 'notes';

export class InfoPanelComponent {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;
    private container: HTMLElement;
    private currentScene: Scene | null = null;
    private mode: InfoPanelMode;
    private notesLeaf: obsidian.WorkspaceLeaf | null = null;
    private notesPath: string | null = null;
    private notesSaveTimer: number | null = null;

    constructor(container: HTMLElement, plugin: SceneCardsPlugin, sceneManager: SceneManager, mode: InfoPanelMode = 'full') {
        this.container = container;
        this.plugin = plugin;
        this.sceneManager = sceneManager;
        this.mode = mode;
    }

    show(scene: Scene): void {
        const sameScene = this.currentScene?.filePath === scene.filePath;
        this.currentScene = scene;

        // Keep the embedded notes editor alive while scene metadata changes.
        // Re-rendering it here resets its scroll position and selection.
        if (sameScene && this.mode === 'notes') return;

        // Don't clobber active typing inside the panel
        if (this.container.querySelector('input:focus, textarea:focus, select:focus, .cm-focused')) {
            return;
        }
        this.render();
    }

    hide(): void {
        this.currentScene = null;
        this.detachNotesEditor();
        this.container.empty();
    }

    isVisible(): boolean {
        return this.currentScene !== null;
    }

    getCurrentScene(): Scene | null {
        return this.currentScene;
    }

    isNotesEditorLeaf(leaf: obsidian.WorkspaceLeaf | null | undefined): boolean {
        return !!leaf && leaf === this.notesLeaf;
    }

    isNotesFilePath(filePath: string | null | undefined): boolean {
        return !!filePath && !!this.notesPath && filePath === this.notesPath;
    }

    isNotesEditorFocused(): boolean {
        return !!this.container.querySelector('.sl-info-notes-embedded-split .cm-focused');
    }

    async refreshNotesFromDisk(): Promise<void> {
        if (!this.notesLeaf || !this.notesPath || this.isNotesEditorFocused()) return;

        const file = this.plugin.app.vault.getAbstractFileByPath(this.notesPath);
        if (!(file instanceof obsidian.TFile)) return;

        const editor = (this.notesLeaf.view as unknown as { editor?: obsidian.Editor })?.editor;
        if (!editor) return;

        const diskValue = await this.plugin.app.vault.read(file);
        if (editor.getValue() !== diskValue) {
            editor.setValue(diskValue);
        }
    }

    private render(): void {
        this.detachNotesEditor();
        this.container.empty();
        const scene = this.currentScene;
        if (!scene) return;

        this.container.addClass('sl-info-panel');

        if (this.mode === 'synopsis') {
            this.container.addClass('sl-info-panel-mode-synopsis');
            // Title kept small for context
            const titleEl = this.container.createDiv('sl-info-title');
            titleEl.setText(scene.title || 'Untitled');
            this.renderSynopsis(scene);
            return;
        }

        if (this.mode === 'notes') {
            this.container.addClass('sl-info-panel-mode-notes');
            const titleEl = this.container.createDiv('sl-info-title');
            titleEl.setText(scene.title || 'Untitled');
            this.renderNotes(scene);
            return;
        }

        // Title
        const titleEl = this.container.createDiv('sl-info-title');
        titleEl.setText(scene.title || 'Untitled');

        // ── Status ──
        this.renderStatusRow(scene);

        // ── POV ──
        this.renderPovRow(scene);

        // ── Location ──
        this.renderLocationRow(scene);

        // ── Word count (read-only) ──
        this.renderWordCountRow(scene);
    }

    private renderStatusRow(scene: Scene): void {
        const row = this.container.createDiv('sl-info-row');
        row.createSpan({ cls: 'sl-info-label', text: 'Status' });

        const dropdown = row.createDiv('sl-info-status-dropdown');
        const currentStatus = scene.status || 'idea';
        const currentCfg = resolveStatusCfg(currentStatus);

        const button = dropdown.createEl('button', { cls: 'sl-info-status-button' });
        const icon = button.createSpan({ cls: 'sl-info-status-icon' });
        obsidian.setIcon(icon, currentCfg.icon);
        button.createSpan({ cls: 'sl-info-status-label', text: currentCfg.label });
        const chevron = button.createSpan({ cls: 'sl-info-status-chevron' });
        obsidian.setIcon(chevron, 'chevron-down');

        const menu = dropdown.createDiv('sl-info-status-menu');
        menu.setCssStyles({ display: 'none' });

        for (const s of getStatusOrder()) {
            const cfg = resolveStatusCfg(s);
            const item = menu.createDiv({
                cls: `sl-info-status-item ${s === currentStatus ? 'active' : ''}`,
            });
            const itemIcon = item.createSpan({ cls: 'sl-info-status-icon' });
            obsidian.setIcon(itemIcon, cfg.icon);
            item.createSpan({ text: cfg.label });
            item.addEventListener('click', async () => {
                menu.setCssStyles({ display: 'none' });
                await this.sceneManager.updateScene(scene.filePath, { status: s });
                scene.status = s;
                this.render();
            });
        }

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const visible = menu.style.display !== 'none';
            menu.setCssStyles({ display: visible ? 'none' : 'block' });
        });
        const closeMenu = (e: MouseEvent) => {
            if (!dropdown.contains(e.target as Node)) {
                menu.setCssStyles({ display: 'none' });
            }
        };
        button.addEventListener('click', () => {
            window.setTimeout(() => activeDocument.addEventListener('click', closeMenu), 0);
        });
    }

    private renderPovRow(scene: Scene): void {
        const row = this.container.createDiv('sl-info-row');
        row.createSpan({ cls: 'sl-info-label', text: 'POV' });
        const field = row.createDiv('sl-info-field');
        renderAutocompleteInput({
            container: field,
            value: scene.pov || '',
            getSuggestions: () => this.getCharacterNames(),
            onChange: async (val) => {
                await this.sceneManager.updateScene(scene.filePath, { pov: val });
                scene.pov = val;
            },
            placeholder: 'Search characters…',
        });
    }

    private renderLocationRow(scene: Scene): void {
        const row = this.container.createDiv('sl-info-row');
        row.createSpan({ cls: 'sl-info-label', text: 'Location' });
        const field = row.createDiv('sl-info-field');
        renderAutocompleteInput({
            container: field,
            value: scene.location || '',
            getSuggestions: () => this.getLocationNames(),
            onChange: async (val) => {
                await this.sceneManager.updateScene(scene.filePath, { location: val });
                scene.location = val;
            },
            placeholder: 'Search locations…',
        });
    }

    private renderWordCountRow(scene: Scene): void {
        const row = this.container.createDiv('sl-info-row');
        row.createSpan({ cls: 'sl-info-label', text: 'Words' });
        const value = row.createSpan({ cls: 'sl-info-value' });
        const current = scene.wordcount ?? 0;
        const target = scene.target_wordcount;
        value.setText(target ? `${current} / ${target}` : `${current}`);
    }

    private renderSynopsis(scene: Scene): void {
        const section = this.container.createDiv('sl-info-section');
        section.createDiv({ cls: 'sl-info-section-label', text: 'Synopsis' });

        const textarea = section.createEl('textarea', {
            cls: 'sl-info-synopsis-textarea',
            attr: { placeholder: 'Brief scene synopsis…' },
        });
        textarea.value = scene.synopsis || '';
        textarea.addEventListener('change', async () => {
            const val = textarea.value.trim();
            await this.sceneManager.updateScene(scene.filePath, { synopsis: val || undefined });
            scene.synopsis = val || undefined;
        });
    }

    private renderNotes(scene: Scene): void {
        const section = this.container.createDiv('sl-info-section');
        section.createDiv({ cls: 'sl-info-section-label', text: 'Notes' });
        const notesContainer = section.createDiv('sl-info-notes-container sl-info-notes-editor-host');
        void this.mountNotesEditor(notesContainer, scene);
    }

    private async mountNotesEditor(container: HTMLElement, scene: Scene): Promise<void> {
        container.empty();
        // Issue #200 — read-only lookup so mounting the Notes tab doesn't
        // create an empty notes file. The file is created lazily when the
        // user actually types something (see writeSceneNotes()).
        const notesPath = this.sceneManager.getSceneNotesFile(scene);
        this.notesPath = notesPath ?? null;

        const file = notesPath
            ? this.plugin.app.vault.getAbstractFileByPath(notesPath)
            : null;
        if (!(file instanceof obsidian.TFile)) {
            // No notes file yet — show a clickable placeholder that creates
            // the file on first input instead of eagerly on render.
            const placeholder = container.createDiv({ cls: 'sl-info-notes-placeholder', text: 'Click to add notes…' });
            placeholder.addEventListener('click', () => {
                void this.sceneManager.getOrCreateSceneNotesFile(scene).then((path) => {
                    this.notesPath = path;
                    void this.mountNotesEditor(container, scene);
                });
            });
            return;
        }

        const raw = await this.plugin.app.vault.read(file);
        const cleaned = this.stripRedundantNotesHeadings(raw, scene);
        if (cleaned !== raw) {
            await this.plugin.app.vault.modify(file, cleaned);
        }

        const split = new (obsidian.WorkspaceSplit as unknown as new (workspace: unknown, dir: string) => obsidian.WorkspaceSplit)(this.plugin.app.workspace, 'vertical');
        const splitEl = (split as unknown as { containerEl: HTMLElement }).containerEl;
        splitEl.addClass('sl-info-notes-embedded-split');
        container.appendChild(splitEl);

        const leaf = this.plugin.app.workspace.createLeafInParent(split, 0);
        await leaf.openFile(file, { state: { mode: 'source', source: false } });
        this.notesLeaf = leaf;
        this.attachNotesAutosave(splitEl, leaf, file);
        window.requestAnimationFrame(() => this.hideEmbeddedNotesHeadings(splitEl));
    }

    private attachNotesAutosave(splitEl: HTMLElement, leaf: obsidian.WorkspaceLeaf, file: obsidian.TFile): void {
        const saveNow = (): void => {
            const editor = (leaf.view as unknown as { editor?: obsidian.Editor })?.editor;
            if (!editor) return;
            const value = editor.getValue();
            void this.plugin.app.vault.read(file).then((diskValue) => {
                if (diskValue !== value) {
                    return this.plugin.app.vault.modify(file, value);
                }
            });
        };

        const scheduleSave = (): void => {
            if (this.notesSaveTimer !== null) window.clearTimeout(this.notesSaveTimer);
            this.notesSaveTimer = window.setTimeout(() => {
                this.notesSaveTimer = null;
                saveNow();
            }, 250);
        };

        splitEl.addEventListener('input', scheduleSave, true);
        splitEl.addEventListener('keyup', scheduleSave, true);
        splitEl.addEventListener('focusout', saveNow, true);
    }

    private stripRedundantNotesHeadings(content: string, scene: Scene): string {
        const title = (scene.title || 'Untitled').trim();
        const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);

        let index = 0;
        while (index < lines.length && lines[index].trim() === '') index++;

        while (index < lines.length) {
            const text = lines[index].trim().replace(/^#{1,6}\s+/, '').trim();
            const isHeading = /^#{1,6}\s+/.test(lines[index].trim());
            const isRedundant = isHeading && (
                text === title ||
                text === `Notes: ${title}` ||
                text === 'Notes'
            );
            if (!isRedundant) break;
            lines.splice(index, 1);
            while (index < lines.length && lines[index].trim() === '') lines.splice(index, 1);
        }

        return lines.join('\n').trimStart();
    }

    private hideEmbeddedNotesHeadings(splitEl: HTMLElement): void {
        // Hide legacy headings already present in previously-created notes files
        // so the Notes tab only shows the small scene title/header above it.
        const headingSelectors = [
            '.cm-line.HyperMD-header-1',
            '.cm-line.HyperMD-header-2',
            '.markdown-preview-view h1',
            '.markdown-preview-view h2',
        ];
        for (const selector of headingSelectors) {
            splitEl.querySelectorAll(selector).forEach((el) => {
                const text = (el.textContent || '').trim();
                if (text === this.currentScene?.title || text.startsWith('Notes:')) {
                    (el as HTMLElement).addClass('sl-notes-hidden-heading');
                }
            });
        }
    }

    private detachNotesEditor(): void {
        if (this.notesSaveTimer !== null) {
            window.clearTimeout(this.notesSaveTimer);
            this.notesSaveTimer = null;
        }
        this.notesLeaf?.detach();
        this.notesLeaf = null;
        this.notesPath = null;
    }

    /**
     * Live markdown notes: rendered preview by default.
     * Click to edit (textarea), blur to save & return to preview.
     * Checkboxes are interactive in preview mode.
     */
    private renderNotesLive(container: HTMLElement, scene: Scene): void {
        container.empty();

        if (!scene.notes) {
            // Empty state — show a clickable placeholder that opens the editor
            const placeholder = container.createDiv('sl-info-notes-live is-empty');
            placeholder.createDiv({ cls: 'sl-info-notes-placeholder', text: 'Click to add notes…' });
            placeholder.addEventListener('click', () => {
                this.renderNotesEditor(container, scene);
            });
            return;
        }

        // Rendered markdown preview
        const previewEl = container.createDiv('sl-info-notes-live is-preview');
        obsidian.MarkdownRenderer.render(
            this.plugin.app,
            scene.notes,
            previewEl,
            scene.filePath,
            this,
        );

        // Click on preview → switch to editor (but not on links/checkboxes)
        previewEl.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'A' || target.tagName === 'INPUT') return;
            this.renderNotesEditor(container, scene);
        });

        // Interactive checkboxes
        previewEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            const checkbox = cb as HTMLInputElement;
            checkbox.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const checked = checkbox.checked;
                const notes = scene.notes || '';
                const lines = notes.split('\n');
                let lineIdx = 0;
                let foundIdx = -1;
                for (const line of lines) {
                    const match = line.match(/^(\s*-\s*)\[([ xX])\]/);
                    if (match) {
                        if (previewEl.querySelectorAll('input[type="checkbox"]')[lineIdx] === checkbox) {
                            foundIdx = lines.indexOf(line);
                            break;
                        }
                        lineIdx++;
                    }
                }
                if (foundIdx >= 0) {
                    lines[foundIdx] = lines[foundIdx].replace(/- \[[ xX]\]/, checked ? '- [x]' : '- [ ]');
                    const newNotes = lines.join('\n');
                    await this.sceneManager.updateScene(scene.filePath, { notes: newNotes });
                    scene.notes = newNotes;
                    await this.sceneManager.writeSceneNotes(scene, newNotes ? `${newNotes}\n` : '');
                    this.renderNotesLive(container, scene);
                }
            });
        });
    }

    private renderNotesEditor(container: HTMLElement, scene: Scene): void {
        container.empty();
        const editorEl = container.createDiv('sl-info-notes-live is-editing');

        const textarea = editorEl.createEl('textarea', {
            cls: 'sl-info-notes-textarea',
            attr: { placeholder: 'Write notes in markdown — use - [ ] for checkboxes, **bold**, [[wikilinks]]' },
        });
        textarea.value = scene.notes || '';

        // Auto-focus
        window.requestAnimationFrame(() => textarea.focus());

        // Save on blur → return to live preview
        textarea.addEventListener('blur', async () => {
            const val = textarea.value;
            const trimmed = val.trim();
            await this.sceneManager.updateScene(scene.filePath, { notes: trimmed || undefined });
            scene.notes = trimmed || undefined;
            await this.sceneManager.writeSceneNotes(scene, trimmed ? `${trimmed}\n` : '');
            this.renderNotesLive(container, scene);
        });

        // Escape to finish editing
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                textarea.blur();
            }
        });
    }

    // ── helpers ────────────────────────────────────────────────────

    private getCharacterNames(): string[] {
        const names = new Map<string, string>();
        for (const c of this.sceneManager.queryService.getAllCharacters()) {
            names.set(c.toLowerCase(), c);
        }
        const cm = this.plugin.characterManager;
        if (cm) {
            for (const ch of cm.getAllCharacters()) {
                if (!names.has(ch.name.toLowerCase())) names.set(ch.name.toLowerCase(), ch.name);
            }
        }
        return Array.from(names.values()).sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase())
        );
    }

    private getLocationNames(): string[] {
        const names = new Map<string, string>();
        const lm = this.plugin.locationManager;
        if (lm) {
            for (const loc of lm.getAllLocations()) {
                names.set(loc.name.toLowerCase(), loc.name);
            }
        }
        for (const name of this.sceneManager.queryService.getUniqueValues('location')) {
            if (!names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
        }
        return Array.from(names.values()).sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase())
        );
    }
}
/* eslint-enable @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises -- end file-wide suppression for Obsidian DOM and event APIs */
