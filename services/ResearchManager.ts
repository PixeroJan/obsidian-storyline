/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { App, TFile, TFolder, normalizePath, parseYaml, stringifyYaml } from 'obsidian';
import { ResearchPost, ResearchType } from '../models/Research';
import type SceneCardsPlugin from '../main';
import { DEFAULT_STORYLINE_LOCALE, tokenizeWords } from '../utils/locale';

/**
 * ResearchManager — CRUD, indexing, and search for research posts.
 *
 * Research posts are markdown files stored in `{project}/Research/`
 * with YAML frontmatter `type: research`.
 */
export class ResearchManager {
    private posts = new Map<string, ResearchPost>();
    /** Vault paths of linked notes (stored in .links.json) */
    private linkedPaths = new Set<string>();

    constructor(
        private app: App,
        private plugin: SceneCardsPlugin,
    ) {}

    // ────────────────────────────────────
    //  Scanning / indexing
    // ────────────────────────────────────

    /** Scan the active project's Research/ folder and index all posts, including linked notes. */
    async scan(): Promise<void> {
        this.posts.clear();
        const folder = this.getResearchFolder();
        if (!folder) return;

        const abstract = this.app.vault.getAbstractFileByPath(folder);
        if (!(abstract instanceof TFolder)) return;

        await this.scanFolder(abstract, undefined);

        // Load linked notes
        await this.loadLinks();
        for (const vaultPath of this.linkedPaths) {
            const file = this.app.vault.getAbstractFileByPath(vaultPath);
            if (file instanceof TFile) {
                const post = await this.parseLinkedFile(file);
                if (post) this.posts.set(post.filePath, post);
            }
        }
    }

    /** Recursively scan a folder for research posts. */
    private async scanFolder(folder: TFolder, subfolder: string | undefined): Promise<void> {
        for (const child of folder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                const post = await this.parseFile(child);
                if (post) {
                    post.subfolder = subfolder;
                    this.posts.set(post.filePath, post);
                }
            } else if (child instanceof TFolder) {
                await this.scanFolder(child, child.name);
            }
        }
    }

    /** Get the active project's Research/ folder path, or undefined. */
    getResearchFolder(): string | undefined {
        const project = this.plugin.sceneManager?.activeProject;
        if (!project) return undefined;
        return project.researchFolder;
    }

    private async parseFile(file: TFile): Promise<ResearchPost | null> {
        const content = await this.app.vault.read(file);
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fmMatch) return null;

        try {
            const fm = parseYaml(fmMatch[1]);
            if (fm?.type !== 'research') return null;

            const body = content.substring(fmMatch[0].length).trim();

            return {
                filePath: file.path,
                title: fm.title || file.basename,
                researchType: fm.researchType || 'note',
                tags: Array.isArray(fm.tags) ? fm.tags : [],
                body,
                sourceUrl: fm.sourceUrl || undefined,
                resolved: fm.resolved ?? false,
                created: fm.created || file.stat.ctime.toString(),
                modified: fm.modified || new Date(file.stat.mtime).toISOString(),
            };
        } catch {
            return null;
        }
    }

    // ────────────────────────────────────
    //  Getters
    // ────────────────────────────────────

    getAllPosts(): ResearchPost[] {
        return Array.from(this.posts.values());
    }

    getPost(filePath: string): ResearchPost | undefined {
        return this.posts.get(filePath);
    }

    /** Get all unique tags across all research posts. */
    getAllTags(): string[] {
        const tags = new Set<string>();
        for (const post of this.posts.values()) {
            post.tags.forEach(t => tags.add(t));
        }
        return Array.from(tags).sort();
    }

    /** Count of unresolved questions. */
    getOpenQuestionCount(): number {
        let count = 0;
        for (const post of this.posts.values()) {
            if (post.researchType === 'question' && !post.resolved) count++;
        }
        return count;
    }

    // ────────────────────────────────────
    //  Search
    // ────────────────────────────────────

    /**
     * Search posts by free text query. Matches title, body, and tags.
     * Uses case-insensitive prefix matching for a lightweight fuzzy feel.
     */
    search(query: string, tagFilter?: string, typeFilter?: ResearchType): ResearchPost[] {
        let results = this.getAllPosts();

        if (typeFilter) {
            results = results.filter(p => p.researchType === typeFilter);
        }

        if (tagFilter) {
            const tag = tagFilter.toLowerCase();
            results = results.filter(p => p.tags.some(t => t.toLowerCase() === tag));
        }

        if (query.trim()) {
            const locale = this.plugin.sceneManager?.activeProject?.locale ?? DEFAULT_STORYLINE_LOCALE;
            const terms = tokenizeWords(query.toLowerCase(), locale);
            results = results.filter(post => {
                const haystack = `${post.title} ${post.body} ${post.tags.join(' ')}`.toLowerCase();
                return terms.every(term => haystack.includes(term));
            });
        }

        return results;
    }

    /**
     * Auto-suggest: find posts relevant to the current scene's metadata.
     * Matches scene characters, location, tags, and title words against post content.
     */
    autoSuggest(sceneKeywords: string[]): ResearchPost[] {
        if (sceneKeywords.length === 0) return [];
        const lower = sceneKeywords.map(k => k.toLowerCase());

        const scored: { post: ResearchPost; score: number }[] = [];
        for (const post of this.posts.values()) {
            const haystack = `${post.title} ${post.body} ${post.tags.join(' ')}`.toLowerCase();
            let score = 0;
            for (const kw of lower) {
                if (kw.length < 2) continue;
                if (haystack.includes(kw)) score++;
            }
            if (score > 0) scored.push({ post, score });
        }

        scored.sort((a, b) => b.score - a.score);
        return scored.map(s => s.post);
    }

    // ────────────────────────────────────
    //  CRUD
    // ────────────────────────────────────

    /** Create a new research post. Returns the created post. */
    async createPost(title: string, researchType: ResearchType, body = '', tags: string[] = [], sourceUrl?: string): Promise<ResearchPost> {
        const folder = this.getResearchFolder();
        if (!folder) throw new Error('No active project');

        await this.ensureFolder(folder);
        const safeName = title.replace(/[\\/:*?"<>|]/g, '-').substring(0, 100);
        let filePath = normalizePath(`${folder}/${safeName}.md`);

        // Handle name collision
        let counter = 1;
        while (this.app.vault.getAbstractFileByPath(filePath)) {
            filePath = normalizePath(`${folder}/${safeName} (${counter}).md`);
            counter++;
        }

        const now = new Date().toISOString();
        const fm: Record<string, unknown> = {
            type: 'research',
            title,
            researchType,
            tags,
            created: now,
            modified: now,
        };
        if (sourceUrl) fm.sourceUrl = sourceUrl;
        if (researchType === 'question') fm.resolved = false;

        const content = `---\n${stringifyYaml(fm)}---\n${body}\n`;
        await this.app.vault.create(filePath, content);

        const post: ResearchPost = {
            filePath,
            title,
            researchType,
            tags,
            body,
            sourceUrl,
            resolved: researchType === 'question' ? false : undefined,
            created: now,
            modified: now,
        };
        this.posts.set(filePath, post);
        return post;
    }

    /** Update frontmatter fields on an existing post. */
    async updatePost(filePath: string, updates: Partial<Pick<ResearchPost, 'title' | 'tags' | 'researchType' | 'sourceUrl' | 'resolved'>>): Promise<void> {
        const post = this.posts.get(filePath);
        if (!post) return;

        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof TFile)) return;

        const content = await this.app.vault.read(file);
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fmMatch) return;

        const fm = parseYaml(fmMatch[1]) || {};
        const body = content.substring(fmMatch[0].length);

        if (updates.title !== undefined) { fm.title = updates.title; post.title = updates.title; }
        if (updates.tags !== undefined) { fm.tags = updates.tags; post.tags = updates.tags; }
        if (updates.researchType !== undefined) { fm.researchType = updates.researchType; post.researchType = updates.researchType; }
        if (updates.sourceUrl !== undefined) { fm.sourceUrl = updates.sourceUrl; post.sourceUrl = updates.sourceUrl; }
        if (updates.resolved !== undefined) { fm.resolved = updates.resolved; post.resolved = updates.resolved; }

        fm.modified = new Date().toISOString();
        post.modified = fm.modified;

        const newContent = `---\n${stringifyYaml(fm)}---${body}`;
        await this.app.vault.modify(file, newContent);
    }

    /** Delete a research post from disk and index. */
    async deletePost(filePath: string): Promise<void> {
        this.posts.delete(filePath);
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
            await this.app.fileManager.trashFile(file);
        }
    }

    // ────────────────────────────────────
    //  Linked notes
    // ────────────────────────────────────

    /** Read the .links.json manifest from the Research/ folder. */
    private async loadLinks(): Promise<void> {
        this.linkedPaths.clear();
        const folder = this.getResearchFolder();
        if (!folder) return;
        const linksPath = normalizePath(`${folder}/.links.json`);
        const adapter = this.app.vault.adapter;
        if (!await adapter.exists(linksPath)) return;
        try {
            const raw = await adapter.read(linksPath);
            const data = JSON.parse(raw);
            if (Array.isArray(data)) {
                for (const entry of data) {
                    if (typeof entry === 'string') this.linkedPaths.add(entry);
                    else if (entry?.path) this.linkedPaths.add(entry.path);
                }
            }
        } catch { /* corrupted file — ignore */ }
    }

    /** Persist the linked paths to .links.json. */
    private async saveLinks(): Promise<void> {
        const folder = this.getResearchFolder();
        if (!folder) return;
        await this.ensureFolder(folder);
        const linksPath = normalizePath(`${folder}/.links.json`);
        const data = Array.from(this.linkedPaths);
        await this.app.vault.adapter.write(linksPath, JSON.stringify(data, null, 2));
    }

    /** Parse any vault file as a linked research post. */
    private async parseLinkedFile(file: TFile): Promise<ResearchPost | null> {
        const ext = file.extension.toLowerCase();
        const isBinary = !['md', 'txt', 'csv', 'json', 'html', 'xml'].includes(ext);

        let title = file.basename;
        let tags: string[] = [];
        let body = '';
        let researchType: ResearchType = 'note';

        if (isBinary) {
            // Images and other binary files — show as image type with path reference
            if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
                researchType = 'image';
                body = `![[${file.path}]]`;
            } else {
                body = `Linked file: \`${file.path}\``;
            }
        } else {
            const content = await this.app.vault.read(file);
            body = content;

            if (ext === 'md') {
                const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
                if (fmMatch) {
                    try {
                        const fm = parseYaml(fmMatch[1]);
                        if (fm?.title) title = fm.title;
                        if (Array.isArray(fm?.tags)) tags = fm.tags;
                    } catch { /* ignore bad frontmatter */ }
                    body = content.substring(fmMatch[0].length).trim();
                }
            }
        }

        return {
            filePath: file.path,
            title,
            researchType,
            tags,
            body,
            isLinked: true,
            created: new Date(file.stat.ctime).toISOString(),
            modified: new Date(file.stat.mtime).toISOString(),
        };
    }

    /** Link an existing vault note to the Research panel. */
    async linkNote(vaultPath: string): Promise<void> {
        this.linkedPaths.add(vaultPath);
        await this.saveLinks();
        // Index it immediately
        const file = this.app.vault.getAbstractFileByPath(vaultPath);
        if (file instanceof TFile) {
            const post = await this.parseLinkedFile(file);
            if (post) this.posts.set(post.filePath, post);
        }
    }

    /** Unlink a note from the Research panel (does not delete the file). */
    async unlinkNote(vaultPath: string): Promise<void> {
        this.linkedPaths.delete(vaultPath);
        this.posts.delete(vaultPath);
        await this.saveLinks();
    }

    /** Check if a path is a linked note. */
    isLinked(vaultPath: string): boolean {
        return this.linkedPaths.has(vaultPath);
    }

    /** Get all linked note paths. */
    getLinkedPaths(): string[] {
        return Array.from(this.linkedPaths);
    }

    // ────────────────────────────────────
    //  Helpers
    // ────────────────────────────────────

    private async ensureFolder(path: string): Promise<void> {
        if (!this.app.vault.getAbstractFileByPath(path)) {
            await this.app.vault.createFolder(path);
        }
    }
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- end of file-wide suppression block opened at line 1 */
