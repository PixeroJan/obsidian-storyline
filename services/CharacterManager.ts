import { App, TFile, TFolder, parseYaml, stringifyYaml, normalizePath } from 'obsidian';
import { Character, CHARACTER_FIELD_KEYS } from '../models/Character';

/**
 * Manages character .md files — loading, saving, creating, and deleting
 * character profiles from the project's Characters/ folder.
 */
export class CharacterManager {
    private app: App;
    private characters: Map<string, Character> = new Map();

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Load all character files from a given folder path.
     * Uses the vault adapter (filesystem) for reliable discovery of
     * externally-created or synced files.
     */
    async loadCharacters(folderPath: string): Promise<Character[]> {
        this.characters.clear();
        const adapter = this.app.vault.adapter;
        if (!await adapter.exists(folderPath)) return [];

        const listing = await adapter.list(folderPath);
        for (const f of listing.files) {
            if (f.endsWith('.md')) {
                try {
                    const content = await adapter.read(f);
                    const character = this.parseCharacterContent(content, f);
                    if (character) {
                        this.characters.set(f, character);
                    }
                } catch { /* file unreadable — skip */ }
            }
        }

        return this.getAllCharacters();
    }

    /**
     * Get all loaded characters sorted by name.
     */
    getAllCharacters(): Character[] {
        return Array.from(this.characters.values()).sort((a, b) =>
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
    }

    /**
     * Get a character by file path.
     */
    getCharacter(filePath: string): Character | undefined {
        return this.characters.get(filePath);
    }

    /**
     * Find a character by name (case-insensitive).
     */
    findByName(name: string): Character | undefined {
        const lower = name.toLowerCase();
        for (const char of this.characters.values()) {
            if (char.name.toLowerCase() === lower) return char;
            // Also check nickname
            if (char.nickname && char.nickname.toLowerCase().includes(lower)) return char;
        }
        return undefined;
    }

    /**
     * Create a new character file.
     */
    async createCharacter(folderPath: string, name: string): Promise<Character> {
        await this.ensureFolder(folderPath);
        const safeName = name.replace(/[\\/:*?"<>|]/g, '-');
        const filePath = normalizePath(`${folderPath}/${safeName}.md`);

        // Check if file already exists
        if (this.app.vault.getAbstractFileByPath(filePath)) {
            throw new Error(`Character file already exists: ${filePath}`);
        }

        const now = new Date().toISOString().split('T')[0];
        const fm: Record<string, any> = {
            type: 'character',
            name,
            created: now,
            modified: now,
        };

        const content = `---\n${stringifyYaml(fm)}---\n`;
        await this.app.vault.create(filePath, content);

        const character: Character = {
            filePath,
            type: 'character',
            name,
            created: now,
            modified: now,
        };

        this.characters.set(filePath, character);
        return character;
    }

    /**
     * Save/update a character back to its file.
     */
    async saveCharacter(character: Character): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(character.filePath);
        if (!(file instanceof TFile)) {
            throw new Error(`Character file not found: ${character.filePath}`);
        }

        const content = await this.app.vault.read(file);
        const existingFm = this.extractFrontmatter(content) || {};
        const body = this.extractBody(content);

        // Build frontmatter from character object
        const fm: Record<string, any> = { ...existingFm };
        fm.type = 'character';
        fm.name = character.name;
        fm.modified = new Date().toISOString().split('T')[0];
        if (character.created) fm.created = character.created;

        // Write all standard fields
        for (const key of CHARACTER_FIELD_KEYS) {
            if (key === 'name') continue; // already set above
            const val = character[key];
            if (val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0)) {
                fm[key] = val;
            } else {
                delete fm[key]; // Remove empty fields to keep frontmatter clean
            }
        }
        // Clean up legacy keys
        delete fm['coreBeliefs'];
        delete fm['romanticHistory'];

        // Custom fields
        if (character.custom && Object.keys(character.custom).length > 0) {
            fm.custom = character.custom;
        } else {
            delete fm.custom;
        }

        // Write notes to body
        const finalBody = character.notes ?? body;
        const newContent = `---\n${stringifyYaml(fm)}---\n${finalBody ? '\n' + finalBody : ''}`;
        await this.app.vault.modify(file, newContent);

        // Update in-memory cache
        this.characters.set(character.filePath, { ...character });
    }

    /**
     * Delete a character file.
     */
    async deleteCharacter(filePath: string): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
            await this.app.vault.trash(file, true);
        }
        this.characters.delete(filePath);
    }

    /**
     * Rename a character — renames the file and updates the name field.
     */
    async renameCharacter(character: Character, newName: string, folderPath: string): Promise<Character> {
        const safeName = newName.replace(/[\\/:*?"<>|]/g, '-');
        const newPath = normalizePath(`${folderPath}/${safeName}.md`);

        const file = this.app.vault.getAbstractFileByPath(character.filePath);
        if (file instanceof TFile && newPath !== character.filePath) {
            await this.app.fileManager.renameFile(file, newPath);
        }

        this.characters.delete(character.filePath);
        const updated: Character = { ...character, filePath: newPath, name: newName };
        this.characters.set(newPath, updated);
        await this.saveCharacter(updated);
        return updated;
    }

    // ── Private helpers ────────────────────────────────

    private async parseCharacterFile(file: TFile): Promise<Character | null> {
        const content = await this.app.vault.read(file);
        return this.parseCharacterContent(content, file.path);
    }

    /**
     * Parse raw markdown content as a Character.
     * Used by both TFile-based and adapter-based loading.
     */
    private parseCharacterContent(content: string, filePath: string): Character | null {
        const fm = this.extractFrontmatter(content);
        if (!fm || fm.type !== 'character') return null;

        const body = this.extractBody(content);
        const basename = filePath.split('/').pop()?.replace(/\.md$/i, '') ?? filePath;

        const character: Character = {
            filePath,
            type: 'character',
            name: fm.name || basename,
            nickname: fm.nickname,
            age: fm.age != null ? String(fm.age) : undefined,
            role: fm.role,
            occupation: fm.occupation,
            residency: fm.residency,
            locations: Array.isArray(fm.locations) ? fm.locations : (fm.locations ? String(fm.locations).split(',').map((s: string) => s.trim()).filter(Boolean) : undefined),
            family: fm.family,
            appearance: fm.appearance,
            distinguishingFeatures: fm.distinguishingFeatures,
            style: fm.style,
            quirks: fm.quirks,
            personality: fm.personality,
            internalMotivation: fm.internalMotivation,
            externalMotivation: fm.externalMotivation,
            strengths: fm.strengths,
            flaws: fm.flaws,
            fears: fm.fears,
            belief: fm.belief || fm.coreBeliefs,
            misbelief: fm.misbelief,
            formativeMemories: fm.formativeMemories,
            accomplishments: fm.accomplishments,
            secrets: fm.secrets,
            allies: Array.isArray(fm.allies) ? fm.allies : (fm.allies ? String(fm.allies).split(',').map((s: string) => s.trim()).filter(Boolean) : undefined),
            enemies: Array.isArray(fm.enemies) ? fm.enemies : (fm.enemies ? String(fm.enemies).split(',').map((s: string) => s.trim()).filter(Boolean) : undefined),
            romantic: Array.isArray(fm.romantic) ? fm.romantic : (fm.romantic ? String(fm.romantic).split(',').map((s: string) => s.trim()).filter(Boolean) : undefined),
            mentors: Array.isArray(fm.mentors) ? fm.mentors : (fm.mentors ? String(fm.mentors).split(',').map((s: string) => s.trim()).filter(Boolean) : undefined),
            otherRelations: Array.isArray(fm.otherRelations) ? fm.otherRelations : (fm.otherRelations ? String(fm.otherRelations).split(',').map((s: string) => s.trim()).filter(Boolean) : undefined),
            startingPoint: fm.startingPoint,
            goal: fm.goal,
            expectedChange: fm.expectedChange,
            habits: fm.habits,
            props: fm.props,
            custom: fm.custom && typeof fm.custom === 'object' ? fm.custom : undefined,
            created: fm.created,
            modified: fm.modified,
            notes: body || undefined,
        };

        return character;
    }

    private extractFrontmatter(content: string): Record<string, any> | null {
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!match) return null;
        try {
            return parseYaml(match[1]);
        } catch {
            return null;
        }
    }

    private extractBody(content: string): string {
        const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
        return match ? match[1].trim() : '';
    }

    private async ensureFolder(folderPath: string): Promise<void> {
        if (this.app.vault.getAbstractFileByPath(folderPath)) return;
        await this.app.vault.createFolder(folderPath);
    }
}
