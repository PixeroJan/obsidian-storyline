import { App, TFile, TFolder, parseYaml, stringifyYaml } from 'obsidian';
import { Scene, SceneStatus, TimelineMode, TIMELINE_MODES } from '../models/Scene';

/**
 * Parses frontmatter from markdown content and extracts Scene data
 */
export class MetadataParser {

    /**
     * Parse a TFile into a Scene object
     */
    static async parseFile(app: App, file: TFile): Promise<Scene | null> {
        const content = await app.vault.read(file);
        return this.parseContent(content, file.path);
    }

    /**
     * Parse markdown content into a Scene object
     */
    static parseContent(content: string, filePath: string): Scene | null {
        const frontmatter = this.extractFrontmatter(content);
        if (!frontmatter || frontmatter.type !== 'scene') {
            return null;
        }

        const body = this.extractBody(content);

        return {
            filePath,
            type: 'scene',
            title: frontmatter.title || this.titleFromPath(filePath),
            act: frontmatter.act,
            chapter: frontmatter.chapter,
            sequence: frontmatter.sequence,
            chronologicalOrder: frontmatter.chronologicalOrder ?? frontmatter.chronological_order,
            pov: this.cleanWikilink(frontmatter.pov),
            characters: this.parseCharacters(frontmatter.characters),
            location: this.cleanWikilink(frontmatter.location),
            timeline: frontmatter.timeline,
            storyDate: frontmatter.storyDate ?? frontmatter.story_date,
            storyTime: frontmatter.storyTime ?? frontmatter.story_time,
            status: this.parseStatus(frontmatter.status),
            conflict: frontmatter.conflict,
            emotion: frontmatter.emotion,
            intensity: frontmatter.intensity,
            wordcount: this.countWords(body),
            target_wordcount: frontmatter.target_wordcount,
            tags: frontmatter.tags || [],
            setup_scenes: this.parseStringArray(frontmatter.setup_scenes),
            payoff_scenes: this.parseStringArray(frontmatter.payoff_scenes),
            created: frontmatter.created,
            modified: frontmatter.modified,
            body,
            notes: frontmatter.notes,
            timeline_mode: this.parseTimelineMode(frontmatter.timeline_mode),
            timeline_strand: frontmatter.timeline_strand,
        };
    }

    /**
     * Extract frontmatter from markdown content
     */
    static extractFrontmatter(content: string): Record<string, any> | null {
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!match) return null;
        try {
            return parseYaml(match[1]);
        } catch {
            return null;
        }
    }

    /**
     * Extract body content (everything after frontmatter)
     */
    static extractBody(content: string): string {
        const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
        return match ? match[1].trim() : content;
    }

    /**
     * Update frontmatter fields in a file
     */
    static async updateFrontmatter(
        app: App,
        file: TFile,
        updates: Partial<Scene>
    ): Promise<void> {
        const content = await app.vault.read(file);
        const frontmatter = this.extractFrontmatter(content) || {};
        const body = this.extractBody(content);

        // Apply updates to frontmatter
        for (const [key, value] of Object.entries(updates)) {
            if (key === 'filePath' || key === 'body') continue;
            // Remove empty notes rather than storing blank string
            if (key === 'notes' && !value) { delete frontmatter[key]; continue; }
            if (value !== undefined) {
                frontmatter[key] = value;
            }
        }

        // Update modified date
        frontmatter.modified = new Date().toISOString().split('T')[0];

        // Always recount words from the final body text
        const finalBody = updates.body ?? body;
        frontmatter.wordcount = this.countWords(finalBody);

        const newContent = `---\n${stringifyYaml(frontmatter)}---\n\n${finalBody}`;
        await app.vault.modify(file, newContent);
    }

    /**
     * Generate frontmatter content for a new scene
     */
    static generateSceneContent(scene: Partial<Scene>, template?: string): string {
        const fm: Record<string, any> = {
            type: 'scene',
            title: scene.title || 'Untitled Scene',
        };

        if (scene.act !== undefined) fm.act = scene.act;
        if (scene.chapter !== undefined) fm.chapter = scene.chapter;
        if (scene.sequence !== undefined) fm.sequence = scene.sequence;
        if (scene.chronologicalOrder !== undefined) fm.chronologicalOrder = scene.chronologicalOrder;
        if (scene.pov) fm.pov = scene.pov;
        if (scene.characters?.length) fm.characters = scene.characters;
        if (scene.location) fm.location = scene.location;
        if (scene.timeline) fm.timeline = scene.timeline;
        if (scene.storyDate) fm.storyDate = scene.storyDate;
        if (scene.storyTime) fm.storyTime = scene.storyTime;
        fm.status = scene.status || 'idea';
        if (scene.conflict) fm.conflict = scene.conflict;
        if (scene.emotion) fm.emotion = scene.emotion;
        if (scene.tags?.length) fm.tags = scene.tags;
        if (scene.setup_scenes?.length) fm.setup_scenes = scene.setup_scenes;
        if (scene.payoff_scenes?.length) fm.payoff_scenes = scene.payoff_scenes;
        if (scene.notes) fm.notes = scene.notes;
        if (scene.timeline_mode && scene.timeline_mode !== 'linear') fm.timeline_mode = scene.timeline_mode;
        if (scene.timeline_strand) fm.timeline_strand = scene.timeline_strand;
        fm.wordcount = scene.body ? this.countWords(scene.body) : 0;
        fm.created = new Date().toISOString().split('T')[0];
        fm.modified = new Date().toISOString().split('T')[0];

        const body = scene.body || '';

        return `---\n${stringifyYaml(fm)}---\n\n${body}`;
    }

    /**
     * Validate and parse timeline_mode
     */
    private static parseTimelineMode(mode: string | undefined): TimelineMode | undefined {
        if (mode && TIMELINE_MODES.includes(mode as TimelineMode)) {
            return mode as TimelineMode;
        }
        return undefined;
    }

    /**
     * Strip wikilink brackets from a string
     */
    private static cleanWikilink(value: string | undefined): string | undefined {
        if (!value) return undefined;
        return value.replace(/^\[\[/, '').replace(/\]\]$/, '');
    }

    /**
     * Parse characters array, cleaning wikilinks
     */
    private static parseCharacters(chars: any): string[] | undefined {
        if (!Array.isArray(chars)) return undefined;
        return chars.map((c: string) => c.replace(/^\[\[/, '').replace(/\]\]$/, ''));
    }

    /**
     * Parse an array of strings, cleaning wikilinks
     */
    private static parseStringArray(arr: any): string[] | undefined {
        if (!Array.isArray(arr)) return undefined;
        return arr.map((s: string) => String(s).replace(/^\[\[/, '').replace(/\]\]$/, ''));
    }

    /**
     * Validate and parse scene status
     */
    private static parseStatus(status: string | undefined): SceneStatus | undefined {
        const valid: SceneStatus[] = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];
        if (status && valid.includes(status as SceneStatus)) {
            return status as SceneStatus;
        }
        return undefined;
    }

    /**
     * Count words in body text
     */
    private static countWords(text: string): number {
        if (!text) return 0;
        // Remove markdown headers, links, etc
        const cleaned = text
            .replace(/^#+\s+.*/gm, '')
            .replace(/\[\[.*?\]\]/g, '')
            .replace(/[*_~`]/g, '')
            .trim();
        if (!cleaned) return 0;
        return cleaned.split(/\s+/).filter(w => w.length > 0).length;
    }

    /**
     * Extract a title from file path
     */
    private static titleFromPath(filePath: string): string {
        const name = filePath.split('/').pop() || '';
        return name.replace(/\.md$/, '');
    }
}
