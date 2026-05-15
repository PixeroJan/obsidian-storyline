/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { ItemView, WorkspaceLeaf, TFile, Notice, Modal, Setting, FuzzySuggestModal } from 'obsidian';
import * as obsidian from 'obsidian';
import type SceneCardsPlugin from '../main';
import { ResearchManager } from '../services/ResearchManager';
import { ResearchPost, ResearchType, RESEARCH_TYPE_CONFIG } from '../models/Research';
import { RESEARCH_VIEW_TYPE } from '../constants';
import { attachTooltip } from '../components/Tooltip';
import { DEFAULT_STORYLINE_LOCALE, isCjkStoryLineLocale, tokenizeWords } from '../utils/locale';

/**
 * ResearchView — a right-sidebar panel for browsing, searching,
 * and creating research posts while writing.
 *
 * Features:
 *  - Free-text search across title, body, and tags
 *  - Tag chip filter
 *  - Type filter (note, webclip, image, question)
 *  - Auto-suggest based on active scene metadata
 *  - Inline detail reader
 *  - Create / edit / delete posts
 *  - Open-question badge
 */
export class ResearchView extends ItemView {
    private plugin: SceneCardsPlugin;
    private manager: ResearchManager;
    private rootEl: HTMLElement | null = null;

    // UI state
    private searchQuery = '';
    private activeTag: string | null = null;
    private activeType: ResearchType | null = null;
    private expandedPost: string | null = null; // filePath of currently expanded post
    private autoMode = false; // auto-suggest mode

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin, manager: ResearchManager) {
        super(leaf);
        this.plugin = plugin;
        this.manager = manager;
    }

    getViewType(): string { return RESEARCH_VIEW_TYPE; }
    getDisplayText(): string { return 'Research'; }
    getIcon(): string { return 'library-big'; }

    async onOpen(): Promise<void> {
        await this.manager.scan();
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('sl-research-panel');
        this.rootEl = container;
        this.render();
    }

    async onClose(): Promise<void> {}

    refresh(): void {
        this.manager.scan().then(() => {
            if (this.rootEl) {
                this.rootEl.empty();
                this.render();
            }
        });
    }

    // ════════════════════════════════════════════════════
    //  Main render
    // ════════════════════════════════════════════════════

    private render(): void {
        if (!this.rootEl) return;
        const container = this.rootEl;

        // ── Header ──
        const header = container.createDiv('sl-research-header');
        header.createSpan({ cls: 'sl-research-title', text: 'Research' });

        const openQ = this.manager.getOpenQuestionCount();
        if (openQ > 0) {
            const badge = header.createSpan({ cls: 'sl-research-question-badge' });
            badge.setText(`${openQ}`);
            badge.title = `${openQ} open question${openQ > 1 ? 's' : ''}`;
        }

        const newBtn = header.createEl('button', { cls: 'clickable-icon sl-research-new-btn' });
        obsidian.setIcon(newBtn, 'plus');
        newBtn.title = 'New research post';
        newBtn.addEventListener('click', () => this.openCreateModal());

        const linkBtn = header.createEl('button', { cls: 'clickable-icon sl-research-link-btn' });
        obsidian.setIcon(linkBtn, 'link');
        linkBtn.title = 'Link an existing vault note';
        linkBtn.addEventListener('click', () => this.openLinkNoteModal());

        // ── Search bar ──
        const searchRow = container.createDiv('sl-research-search-row');
        const searchInput = searchRow.createEl('input', {
            cls: 'sl-research-search-input',
            attr: { type: 'text', placeholder: 'Search research…' },
        });
        searchInput.value = this.searchQuery;
        searchInput.addEventListener('input', () => {
            this.searchQuery = searchInput.value;
            this.autoMode = false;
            this.renderResults(resultContainer);
        });

        // Auto-suggest toggle
        const autoBtn = searchRow.createEl('button', {
            cls: `clickable-icon sl-research-auto-btn ${this.autoMode ? 'is-active' : ''}`,
        });
        obsidian.setIcon(autoBtn, 'sparkles');
        autoBtn.title = 'Auto-suggest from active scene';
        autoBtn.addEventListener('click', () => {
            this.autoMode = !this.autoMode;
            autoBtn.toggleClass('is-active', this.autoMode);
            if (this.autoMode) {
                this.searchQuery = '';
                searchInput.value = '';
            }
            this.renderResults(resultContainer);
        });

        // ── Tag chips ──
        const allTags = this.manager.getAllTags();
        if (allTags.length > 0) {
            const tagRow = container.createDiv('sl-research-tag-row');
            for (const tag of allTags) {
                const chip = tagRow.createSpan({
                    cls: `sl-research-tag-chip ${this.activeTag === tag ? 'is-active' : ''}`,
                    text: `#${tag}`,
                });
                chip.addEventListener('click', () => {
                    this.activeTag = this.activeTag === tag ? null : tag;
                    this.renderResults(resultContainer);
                    // Re-render tag chips to update active state
                    tagRow.empty();
                    for (const t of allTags) {
                        const c = tagRow.createSpan({
                            cls: `sl-research-tag-chip ${this.activeTag === t ? 'is-active' : ''}`,
                            text: `#${t}`,
                        });
                        c.addEventListener('click', () => {
                            this.activeTag = this.activeTag === t ? null : t;
                            this.renderResults(resultContainer);
                            this.render(); // full re-render to update chip states
                        });
                    }
                });
            }
        }

        // ── Type filter row ──
        const typeRow = container.createDiv('sl-research-type-row');
        const types: (ResearchType | null)[] = [null, 'note', 'webclip', 'image', 'question'];
        for (const t of types) {
            const label = t ? RESEARCH_TYPE_CONFIG[t].label : 'All';
            const icon = t ? RESEARCH_TYPE_CONFIG[t].icon : 'layers';
            const btn = typeRow.createDiv({
                cls: `sl-research-type-btn ${this.activeType === t ? 'is-active' : ''}`,
            });
            obsidian.setIcon(btn, icon);
            attachTooltip(btn, label);
            btn.addEventListener('click', () => {
                this.activeType = t;
                this.renderResults(resultContainer);
                typeRow.querySelectorAll('.sl-research-type-btn').forEach((el, i) => {
                    el.toggleClass('is-active', types[i] === t);
                });
            });
        }

        // ── Result list ──
        const resultContainer = container.createDiv('sl-research-results');
        this.renderResults(resultContainer);
    }

    // ════════════════════════════════════════════════════
    //  Result rendering
    // ════════════════════════════════════════════════════

    private renderResults(container: HTMLElement): void {
        container.empty();
        let posts: ResearchPost[];

        if (this.autoMode) {
            const keywords = this.getSceneKeywords();
            if (keywords.length === 0) {
                container.createDiv({
                    cls: 'sl-research-empty',
                    text: 'Open a scene to see auto-suggestions.',
                });
                return;
            }
            posts = this.manager.autoSuggest(keywords);
            // Apply additional filters
            if (this.activeTag) {
                const tag = this.activeTag.toLowerCase();
                posts = posts.filter(p => p.tags.some(t => t.toLowerCase() === tag));
            }
            if (this.activeType) {
                posts = posts.filter(p => p.researchType === this.activeType);
            }
        } else {
            posts = this.manager.search(
                this.searchQuery,
                this.activeTag ?? undefined,
                this.activeType ?? undefined,
            );
        }

        if (posts.length === 0) {
            container.createDiv({
                cls: 'sl-research-empty',
                text: this.searchQuery || this.activeTag || this.activeType
                    ? 'No matching posts.'
                    : 'No research posts yet. Click + to create one.',
            });
            return;
        }

        // Group posts by subfolder
        const rootPosts: ResearchPost[] = [];
        const grouped = new Map<string, ResearchPost[]>();
        for (const post of posts) {
            if (post.subfolder) {
                let arr = grouped.get(post.subfolder);
                if (!arr) { arr = []; grouped.set(post.subfolder, arr); }
                arr.push(post);
            } else {
                rootPosts.push(post);
            }
        }

        // Render root-level posts first
        for (const post of rootPosts) {
            this.renderPostCard(container, post);
        }

        // Render grouped folders
        const sortedFolders = Array.from(grouped.keys()).sort();
        for (const folderName of sortedFolders) {
            const section = container.createEl('details', { cls: 'sl-research-folder-group' });
            section.setAttribute('open', '');
            const summary = section.createEl('summary', { cls: 'sl-research-folder-header' });
            const icon = summary.createSpan({ cls: 'sl-research-folder-icon' });
            obsidian.setIcon(icon, 'folder');
            summary.createSpan({ text: folderName });
            const count = grouped.get(folderName)!.length;
            summary.createSpan({ cls: 'sl-research-folder-count', text: `${count}` });
            for (const post of grouped.get(folderName)!) {
                this.renderPostCard(section, post);
            }
        }
    }

    private renderPostCard(container: HTMLElement, post: ResearchPost): void {
        const isExpanded = this.expandedPost === post.filePath;
        const card = container.createDiv(`sl-research-card ${isExpanded ? 'is-expanded' : ''}`);

        // Header row
        const headerRow = card.createDiv('sl-research-card-header');
        const typeIcon = headerRow.createSpan({ cls: 'sl-research-card-icon' });
        obsidian.setIcon(typeIcon, RESEARCH_TYPE_CONFIG[post.researchType].icon);

        // Question resolved indicator
        if (post.researchType === 'question') {
            typeIcon.addClass(post.resolved ? 'is-resolved' : 'is-open');
        }

        headerRow.createSpan({ cls: 'sl-research-card-title', text: post.title });

        // Linked note indicator
        if (post.isLinked) {
            const linkIcon = headerRow.createSpan({ cls: 'sl-research-card-link-icon' });
            obsidian.setIcon(linkIcon, 'link');
            linkIcon.title = 'Linked vault note';
        }

        // Expand / collapse
        headerRow.addEventListener('click', () => {
            this.expandedPost = isExpanded ? null : post.filePath;
            if (this.rootEl) {
                this.rootEl.empty();
                this.render();
            }
        });

        // Tag chips
        if (post.tags.length > 0) {
            const tags = card.createDiv('sl-research-card-tags');
            for (const tag of post.tags) {
                tags.createSpan({ cls: 'sl-research-mini-tag', text: `#${tag}` });
            }
        }

        // Expanded detail
        if (isExpanded) {
            // Body preview
            if (post.body) {
                const bodyEl = card.createDiv('sl-research-card-body');
                obsidian.MarkdownRenderer.render(
                    this.app,
                    post.body.substring(0, 2000),
                    bodyEl,
                    post.filePath,
                    this,
                );
            }

            // Source URL
            if (post.sourceUrl) {
                const srcRow = card.createDiv('sl-research-card-source');
                srcRow.createSpan({ text: 'Source: ' });
                srcRow.createEl('a', {
                    text: post.sourceUrl.substring(0, 60) + (post.sourceUrl.length > 60 ? '…' : ''),
                    attr: { href: post.sourceUrl },
                });
            }

            // Action buttons
            const actions = card.createDiv('sl-research-card-actions');

            // Open URL in browser (webclips with a sourceUrl)
            if (post.sourceUrl) {
                const openUrlBtn = actions.createEl('button', { cls: 'sl-research-action-btn', text: 'Open' });
                openUrlBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (post.sourceUrl) window.open(post.sourceUrl);
                });
            } else {
                // Open file in editor
                const openBtn = actions.createEl('button', { cls: 'sl-research-action-btn', text: 'Open' });
                openBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const file = this.app.vault.getAbstractFileByPath(post.filePath);
                    if (file instanceof TFile) {
                        this.app.workspace.getLeaf('tab').openFile(file);
                    }
                });
            }

            // Edit metadata
            const editBtn = actions.createEl('button', { cls: 'sl-research-action-btn', text: 'Edit' });
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditModal(post);
            });

            // Toggle resolved (questions only)
            if (post.researchType === 'question') {
                const resolveBtn = actions.createEl('button', {
                    cls: 'sl-research-action-btn',
                    text: post.resolved ? 'Reopen' : 'Resolve',
                });
                resolveBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.manager.updatePost(post.filePath, { resolved: !post.resolved });
                    this.refresh();
                });
            }

            // Delete or Unlink
            if (post.isLinked) {
                const unlinkBtn = actions.createEl('button', { cls: 'sl-research-action-btn mod-destructive', text: 'Unlink' });
                unlinkBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.manager.unlinkNote(post.filePath);
                    this.expandedPost = null;
                    this.refresh();
                });
            } else {
                const delBtn = actions.createEl('button', { cls: 'sl-research-action-btn mod-destructive', text: 'Delete' });
                delBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.manager.deletePost(post.filePath);
                    this.expandedPost = null;
                    this.refresh();
                });
            }
        }
    }

    // ════════════════════════════════════════════════════
    //  Auto-suggest: extract keywords from active scene
    // ════════════════════════════════════════════════════

    private getSceneKeywords(): string[] {
        const keywords: string[] = [];
        // Find active scene from the active editor
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return keywords;

        const scene = this.plugin.sceneManager.getScene(activeFile.path);
        if (!scene) return keywords;

        // Characters
        if (scene.characters) keywords.push(...scene.characters);
        if (scene.pov) keywords.push(scene.pov);
        // Location
        if (scene.location) keywords.push(scene.location);
        // Tags
        if (scene.tags) keywords.push(...scene.tags);
        // Title words (3+ chars)
        if (scene.title) {
            const locale = this.plugin.sceneManager?.activeProject?.locale ?? DEFAULT_STORYLINE_LOCALE;
            tokenizeWords(scene.title, locale)
                .filter(w => w.length >= (isCjkStoryLineLocale(locale) ? 2 : 3))
                .forEach(w => keywords.push(w));
        }

        return [...new Set(keywords)];
    }

    // ════════════════════════════════════════════════════
    //  Link existing vault note
    // ════════════════════════════════════════════════════

    private openLinkNoteModal(): void {
        const allFiles = this.app.vault.getFiles();
        // Exclude files already in the Research folder or already linked
        const researchFolder = this.manager.getResearchFolder();
        const linked = new Set(this.manager.getLinkedPaths());
        const candidates = allFiles.filter(f => {
            if (researchFolder && f.path.startsWith(researchFolder + '/')) return false;
            if (linked.has(f.path)) return false;
            return true;
        });

        const picker = new VaultNotePickerModal(this.app, candidates, async (file) => {
            await this.manager.linkNote(file.path);
            this.refresh();
            new Notice(`Linked "${file.basename}" to Research`);
        });
        picker.open();
    }

    // ════════════════════════════════════════════════════
    //  Create modal
    // ════════════════════════════════════════════════════

    private openCreateModal(): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('New Research Post');
        modal.contentEl.addClass('sl-research-create-modal');

        let title = '';
        let researchType: ResearchType = 'note';
        let tags = '';
        let sourceUrl = '';
        let body = '';

        // Dynamic fields container — rebuilt when type changes
        const dynamicContainer = modal.contentEl.createDiv();

        const rebuildFields = () => {
            dynamicContainer.empty();

            new Setting(dynamicContainer)
                .setName('Title')
                .addText(text => {
                    text.setPlaceholder(
                        researchType === 'question' ? 'Your question…'
                            : researchType === 'webclip' ? 'Page title or description'
                            : 'Research topic'
                    ).setValue(title).onChange(v => { title = v; });
                    if (!title) window.setTimeout(() => text.inputEl.focus(), 50);
                });

            new Setting(dynamicContainer)
                .setName('Tags')
                .addText(text => {
                    text.setPlaceholder('sailing, history, 1800s')
                        .setValue(tags).onChange(v => { tags = v; });
                });

            if (researchType === 'webclip') {
                new Setting(dynamicContainer)
                    .setName('URL')
                    .addText(text => {
                        text.setPlaceholder('https://...')
                            .setValue(sourceUrl).onChange(v => { sourceUrl = v; });
                    });
            }

            if (researchType === 'note' || researchType === 'question') {
                new Setting(dynamicContainer)
                    .setName(researchType === 'question' ? 'Details' : 'Notes')
                    .addTextArea(text => {
                        text.setPlaceholder(
                            researchType === 'question'
                                ? 'Context or details about the question…'
                                : 'Your research notes…'
                        ).setValue(body).onChange(v => { body = v; });
                        text.inputEl.rows = 6;
                        text.inputEl.setCssStyles({ width: '100%' });
                    });
            }
        };

        // Type picker row — icon buttons
        const typeRow = modal.contentEl.createDiv('sl-research-type-picker');
        const allTypes: ResearchType[] = ['note', 'webclip', 'image', 'question'];
        const typeButtons: HTMLElement[] = [];

        for (const t of allTypes) {
            const btn = typeRow.createDiv({
                cls: `sl-research-type-pick-btn ${researchType === t ? 'is-active' : ''}`,
            });
            obsidian.setIcon(btn, RESEARCH_TYPE_CONFIG[t].icon);
            attachTooltip(btn, RESEARCH_TYPE_CONFIG[t].label);
            typeButtons.push(btn);
            btn.addEventListener('click', () => {
                researchType = t;
                typeButtons.forEach((b, i) => b.toggleClass('is-active', allTypes[i] === t));
                rebuildFields();
            });
        }

        // Move dynamic container after type picker
        modal.contentEl.appendChild(dynamicContainer);
        rebuildFields();

        const btnRow = modal.contentEl.createDiv('sl-research-modal-buttons');
        const saveBtn = btnRow.createEl('button', { cls: 'mod-cta', text: 'Create' });
        saveBtn.addEventListener('click', async () => {
            if (!title.trim()) {
                new Notice('Title is required');
                return;
            }
            const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
            await this.manager.createPost(title.trim(), researchType, body, tagList, sourceUrl || undefined);
            modal.close();
            this.refresh();
            new Notice(`Research post "${title.trim()}" created`);
        });
        const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => modal.close());

        modal.open();
    }

    private openEditModal(post: ResearchPost): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Edit Research Post');
        modal.contentEl.addClass('sl-research-create-modal');

        let title = post.title;
        let tags = post.tags.join(', ');
        let sourceUrl = post.sourceUrl || '';

        new Setting(modal.contentEl)
            .setName('Title')
            .addText(text => {
                text.setPlaceholder('Title')
                    .setValue(title).onChange(v => { title = v; });
                window.setTimeout(() => text.inputEl.focus(), 50);
            });

        new Setting(modal.contentEl)
            .setName('Tags')
            .addText(text => {
                text.setPlaceholder('sailing, history, 1800s')
                    .setValue(tags).onChange(v => { tags = v; });
            });

        if (post.researchType === 'webclip') {
            new Setting(modal.contentEl)
                .setName('URL')
                .addText(text => {
                    text.setPlaceholder('https://...')
                        .setValue(sourceUrl).onChange(v => { sourceUrl = v; });
                });
        }

        const btnRow = modal.contentEl.createDiv('sl-research-modal-buttons');
        const saveBtn = btnRow.createEl('button', { cls: 'mod-cta', text: 'Save' });
        saveBtn.addEventListener('click', async () => {
            if (!title.trim()) {
                new Notice('Title is required');
                return;
            }
            const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
            await this.manager.updatePost(post.filePath, {
                title: title.trim(),
                tags: tagList,
                sourceUrl: sourceUrl || undefined,
            });
            modal.close();
            this.refresh();
        });
        const cancelBtn2 = btnRow.createEl('button', { text: 'Cancel' });
        cancelBtn2.addEventListener('click', () => modal.close());

        modal.open();
    }
}

/** FuzzySuggestModal for picking any vault markdown file to link. */
class VaultNotePickerModal extends FuzzySuggestModal<TFile> {
    private files: TFile[];
    private onSelect: (file: TFile) => void;

    constructor(app: obsidian.App, files: TFile[], onSelect: (file: TFile) => void) {
        super(app);
        this.files = files;
        this.onSelect = onSelect;
        this.setPlaceholder('Search for a note to link…');
    }

    getItems(): TFile[] {
        return this.files;
    }

    getItemText(item: TFile): string {
        return item.path;
    }

    onChooseItem(item: TFile): void {
        this.onSelect(item);
    }
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- end of file-wide suppression block opened at line 1 */
