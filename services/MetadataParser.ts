/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unnecessary-type-assertion -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { hydrateUniversalFieldsFromTopLevel, mirrorUniversalFieldsToTopLevel } from './FieldTemplateService';
import { App, TFile, parseYaml, stringifyYaml } from 'obsidian';
import { Scene, SceneStatus, TIMELINE_MODES, TimelineMode } from '../models/Scene';
import { coerceString } from '../utils/narrow';
import { tokenizeWords, DEFAULT_STORYLINE_LOCALE, resolveLocale, type StoryLineLocale } from '../utils/locale';

/**
 * Issue #73 — frontmatter scene fields that point at other entities (scenes,
 * characters, locations) and should ideally be written as `[[wikilinks]]` so
 * Obsidian keeps them in sync on rename. Readers strip wikilink syntax in
 * either case, so flipping this on/off is non-destructive.
 */
const SCENE_LINK_FIELDS_SCALAR = ['pov', 'location'] as const;
const SCENE_LINK_FIELDS_ARRAY = ['characters', 'setup_scenes', 'payoff_scenes'] as const;

/** Wrap a plain entity name in `[[Name]]`, idempotent. */
export function toWikilink(name: string | undefined | null): string | undefined {
    if (name === undefined || name === null) return undefined;
    const s = String(name).trim();
    if (!s) return undefined;
    if (/^\[\[.+\]\]$/.test(s)) return s; // already a wikilink
    return `[[${s}]]`;
}

/**
 * Module-level toggle controlling whether `MetadataParser` writes scene
 * link-fields as wikilinks. Set from main.ts when settings load.
 */
let _writeSceneFieldsAsWikilinks = true;
export function setWriteSceneFieldsAsWikilinks(on: boolean): void {
    _writeSceneFieldsAsWikilinks = !!on;
}

/**
 * Issue #212 — Map from scene title to file-stem (filename without path/extension)
 * used by `wrapArray` to emit `[[stem|title]]` aliased wikilinks for setup/payoff
 * fields. Obsidian resolves the link by file stem; StoryLine reads back the alias
 * (title) via `cleanWikilink`, so both link resolution and internal matching work.
 * Set by SceneManager before writing setup/payoff updates.
 */
let _sceneTitleToStem: Map<string, string> = new Map();
export function setSceneTitleToStemMap(map: Map<string, string>): void {
    _sceneTitleToStem = map;
}

/**
 * Issue #78 — module-level toggles controlling what countWords skips:
 *  - %%…%% Obsidian comment blocks (default on)
 *  - markdown task lines like `- [ ]` / `- [x]` (default off)
 * Set from main.ts when settings load/save.
 */
let _excludeCommentsFromWordcount = true;
let _excludeChecklistFromWordcount = false;
export function setWordcountExclusions(opts: { comments?: boolean; checklists?: boolean }): void {
    if (typeof opts.comments === 'boolean') _excludeCommentsFromWordcount = opts.comments;
    if (typeof opts.checklists === 'boolean') _excludeChecklistFromWordcount = opts.checklists;
}

/**
 * Module-level active locale (BCP-47) used by `countWords`. Set from
 * `SceneManager` whenever the active project changes so word counts respect
 * the project's `language:` frontmatter (CJK, Thai, etc. tokenise differently
 * from whitespace-delimited Latin scripts).
 */
let _wordcountLocale: StoryLineLocale = DEFAULT_STORYLINE_LOCALE;
export function setWordcountLocale(locale: StoryLineLocale): void {
    _wordcountLocale = locale || DEFAULT_STORYLINE_LOCALE;
}
export function getWordcountLocale(): StoryLineLocale {
    return _wordcountLocale;
}
function wrapScalar(v: unknown): unknown {
    if (!_writeSceneFieldsAsWikilinks) return v;
    if (v === undefined || v === null || v === '') return v;
    const s = coerceString(v);
    return s ? toWikilink(s) : v;
}
function wrapArray(arr: unknown): unknown {
    if (!_writeSceneFieldsAsWikilinks) return arr;
    if (!Array.isArray(arr)) return arr;
    return arr
        .map((s: unknown) => {
            const title = coerceString(s);
            if (!title) return undefined;
            const stem = _sceneTitleToStem.get(title);
            // If the file stem differs from the title (e.g. "01-01 Opening Image" vs
            // "Opening Image"), emit `[[stem|title]]` so Obsidian's graph resolves
            // the link to the real file while `cleanWikilink` still reads the title.
            if (stem && stem !== title) return `[[${stem}|${title}]]`;
            return toWikilink(title);
        })
        .filter((s): s is string => !!s);
}

/** Parse the existing scalar location field as a comma-separated list. */
export function parseSceneLocations(value: unknown): string[] {
    const rawValues = Array.isArray(value) ? value : (value === undefined || value === null ? [] : [value]);
    return rawValues
        .flatMap(item => String(item).split(','))
        .map(item => MetadataParser.cleanWikilink(item))
        .filter((item): item is string => !!item);
}

function formatSceneLocations(value: unknown): string | undefined {
    const locations = parseSceneLocations(value);
    if (locations.length === 0) return undefined;
    return _writeSceneFieldsAsWikilinks
        ? locations.map(location => toWikilink(location)).filter((location): location is string => !!location).join(', ')
        : locations.join(', ');
}

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
        const fmRaw = this.extractFrontmatter(content);
        if (!fmRaw || fmRaw.type !== 'scene') {
            return null;
        }
        const frontmatter = fmRaw as Partial<Scene> & Record<string, unknown>;

        const body = this.extractBody(content);

        return {
            filePath,
            type: 'scene',
            title: frontmatter.title || this.titleFromPath(filePath),
            act: frontmatter.act,
            chapter: frontmatter.chapter,
            sequence: frontmatter.sequence,
            chronologicalOrder: frontmatter.chronologicalOrder ?? (frontmatter.chronological_order as number | undefined),
            pov: this.cleanWikilink(frontmatter.pov),
            characters: this.parseCharacters(frontmatter.characters),
            location: parseSceneLocations(frontmatter.location).join(', ') || undefined,
            timeline: frontmatter.timeline,
            storyDate: this.normalizeFrontmatterString(frontmatter.storyDate ?? frontmatter.story_date),
            storyTime: this.normalizeFrontmatterString(frontmatter.storyTime ?? frontmatter.story_time),
            status: this.parseStatus(frontmatter.status),
            conflict: frontmatter.conflict,
            emotion: frontmatter.emotion,
            intensity: frontmatter.intensity,
            wordcount: this.countWords(body),
            charcount: this.countChars(body),
            target_wordcount: frontmatter.target_wordcount,
            tags: frontmatter.tags || [],
            setup_scenes: this.parseStringArray(frontmatter.setup_scenes),
            payoff_scenes: this.parseStringArray(frontmatter.payoff_scenes),
            ignored_detections: this.parseStringArray(frontmatter.ignored_detections),
            inactive: this.parseBooleanFlag(frontmatter.inactive),
            created: frontmatter.created,
            modified: frontmatter.modified,
            body,
            notes: frontmatter.notes,
            notesFile: this.normalizeFrontmatterString(frontmatter.notesFile ?? frontmatter.notes_file),
            synopsis: this.normalizeFrontmatterString(frontmatter.synopsis),
            corkboardNote: this.parseBooleanFlag(frontmatter.corkboardNote ?? (frontmatter.corkboard_note as boolean | undefined)),
            corkboardNoteColor: this.normalizeFrontmatterString(frontmatter.corkboardNoteColor ?? frontmatter.corkboard_note_color),
            corkboardNoteImage: this.normalizeFrontmatterString(frontmatter.corkboardNoteImage),
            corkboardNoteCaption: this.normalizeFrontmatterString(frontmatter.corkboardNoteCaption),
            plotgridOrigin: this.normalizeFrontmatterString(frontmatter.plotgridOrigin ?? frontmatter.plotgrid_origin),
            timeline_mode: this.parseTimelineMode(frontmatter.timeline_mode),
            timeline_strand: frontmatter.timeline_strand,
            subtitle: frontmatter.subtitle,
            color: frontmatter.color,
            codexLinks: this.parseCodexLinks(frontmatter.codexLinks),
            universalFields: hydrateUniversalFieldsFromTopLevel(
                frontmatter,
                frontmatter.universalFields && typeof frontmatter.universalFields === 'object'
                    ? (frontmatter.universalFields as Record<string, string | string[]>)
                    : undefined,
            ) as Record<string, string | string[]> | undefined,
            beatsheet: frontmatter.beatsheet,
            arcAnchor: this.parseBooleanFlag(frontmatter.arcAnchor ?? (frontmatter.arc_anchor as boolean | undefined)),
        };
    }

    /**
     * Issue #182 — coerce a frontmatter value into a trimmed string or undefined.
     * Obsidian's YAML parser can produce `undefined`, `number`, `boolean`, or even
     * `object`/`array` for fields typed as `string`. Passing these directly into
     * Obsidian APIs (normalizePath, getAbstractFileByPath, stringifyYaml) crashes
     * with `Cannot read properties of undefined (reading 'replace')`. This helper
     * is the single normalization point so downstream code always receives a
     * properly typed value.
     */
    private static normalizeFrontmatterString(value: unknown): string | undefined {
        if (value === undefined || value === null) return undefined;
        if (typeof value === 'string') {
            const s = value.trim();
            return s.length > 0 ? s : undefined;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        // objects, arrays, symbols, etc. → undefined (never leak to Obsidian APIs)
        return undefined;
    }

    /**
     * Extract frontmatter from markdown content
     */
    static extractFrontmatter(content: string): Record<string, unknown> | null {
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
        const match = content.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)([\s\S]*)$/);
        return match ? match[1] : content;
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
            if (key === 'synopsis' && !value) { delete frontmatter[key]; continue; }
            if (key === 'corkboardNote' && !value) { delete frontmatter[key]; continue; }
            if (key === 'corkboardNoteColor' && !value) { delete frontmatter[key]; continue; }
            if (key === 'corkboardNoteImage' && !value) { delete frontmatter[key]; continue; }
            if (key === 'corkboardNoteCaption' && !value) { delete frontmatter[key]; continue; }
            if (key === 'plotgridOrigin' && !value) { delete frontmatter[key]; continue; }
            if (key === 'subtitle' && !value) { delete frontmatter[key]; continue; }
            if (key === 'color' && !value) { delete frontmatter[key]; continue; }
            if (key === 'beatsheet' && !value) { delete frontmatter[key]; continue; }
            if (key === 'arcAnchor' && !value) { delete frontmatter[key]; continue; }
            if (key === 'inactive' && !value) { delete frontmatter[key]; continue; }
            if (key === 'ignored_detections') {
                if (Array.isArray(value) && value.length > 0) frontmatter[key] = value;
                else delete frontmatter[key];
                continue;
            }
            if (key === 'codexLinks') {
                if (value && typeof value === 'object' && Object.keys(value).some(k => {
                    const arr = (value as Record<string, unknown>)[k];
                    return Array.isArray(arr) && arr.length > 0;
                })) {
                    frontmatter[key] = value;
                } else {
                    delete frontmatter[key];
                }
                continue;
            }
            if (key === 'universalFields') {
                if (value && typeof value === 'object') {
                    // Issue #175 — drop empty entries so emptied custom fields
                    // don't linger as `fieldId: ''` in the frontmatter.
                    const cleaned: Record<string, unknown> = {};
                    for (const [fk, fv] of Object.entries(value as Record<string, unknown>)) {
                        if (fv === undefined || fv === null || fv === '') continue;
                        if (Array.isArray(fv) && fv.length === 0) continue;
                        cleaned[fk] = fv;
                    }
                    if (Object.keys(cleaned).length > 0) {
                        frontmatter[key] = cleaned;
                    } else {
                        delete frontmatter[key];
                    }
                } else {
                    delete frontmatter[key];
                }
                continue;
            }
            if (key === 'location') {
                const formatted = formatSceneLocations(value);
                if (formatted) frontmatter[key] = formatted;
                else delete frontmatter[key];
                continue;
            }
            if (value !== undefined) {
                if ((SCENE_LINK_FIELDS_SCALAR as readonly string[]).includes(key)) {
                    frontmatter[key] = wrapScalar(value);
                } else if ((SCENE_LINK_FIELDS_ARRAY as readonly string[]).includes(key)) {
                    frontmatter[key] = wrapArray(value);
                } else {
                    frontmatter[key] = value;
                }
            } else {
                delete frontmatter[key];
            }
        }

        // Update modified date
        frontmatter.modified = new Date().toISOString().split('T')[0];

        // Always recount words from the final body text
        const finalBody = updates.body ?? body;
        frontmatter.wordcount = this.countWords(finalBody);
        frontmatter.charcount = this.countChars(finalBody);

        // Issue #71 — mirror universal fields to top-level YAML keys
        mirrorUniversalFieldsToTopLevel(frontmatter, frontmatter.universalFields as Record<string, unknown> | undefined);

        // Keep the body exactly as read after the frontmatter delimiter so
        // metadata edits do not normalize headings or blank-line spacing.
        const newContent = `---\n${stringifyYaml(frontmatter)}---\n${finalBody}`;
        await app.vault.modify(file, newContent);
    }

    /**
     * Generate frontmatter content for a new scene.
     *
     * Issue #77 \u2014 `extraFrontmatter` lets callers (SceneManager.createScene)
     * inject arbitrary YAML keys defined under Settings \u2192 "Default scene
     * frontmatter" (e.g. `cssclasses: [fountain]`). StoryLine-managed keys
     * always win on conflict so the scene model stays consistent.
     */
    static generateSceneContent(
        scene: Partial<Scene>,
        _template?: string,
        extraFrontmatter?: Record<string, unknown>,
    ): string {
        const fm: Record<string, unknown> = {
            type: 'scene',
            title: scene.title || 'Untitled Scene',
        };

        if (scene.act !== undefined) fm.act = scene.act;
        if (scene.chapter !== undefined) fm.chapter = scene.chapter;
        if (scene.sequence !== undefined) fm.sequence = scene.sequence;
        if (scene.chronologicalOrder !== undefined) fm.chronologicalOrder = scene.chronologicalOrder;
        if (scene.pov) fm.pov = wrapScalar(scene.pov);
        if (scene.characters?.length) fm.characters = wrapArray(scene.characters);
        if (scene.location) fm.location = formatSceneLocations(scene.location);
        if (scene.timeline) fm.timeline = scene.timeline;
        if (scene.storyDate) fm.storyDate = scene.storyDate;
        if (scene.storyTime) fm.storyTime = scene.storyTime;
        fm.status = scene.status || 'idea';
        if (scene.conflict) fm.conflict = scene.conflict;
        if (scene.emotion) fm.emotion = scene.emotion;
        if (scene.tags?.length) fm.tags = scene.tags;
        if (scene.setup_scenes?.length) fm.setup_scenes = wrapArray(scene.setup_scenes);
        if (scene.payoff_scenes?.length) fm.payoff_scenes = wrapArray(scene.payoff_scenes);
        if (scene.notes) fm.notes = scene.notes;
        if (scene.notesFile) fm.notesFile = scene.notesFile;
        if (scene.synopsis) fm.synopsis = scene.synopsis;
        if (scene.corkboardNote) fm.corkboardNote = true;
        if (scene.corkboardNoteColor) fm.corkboardNoteColor = scene.corkboardNoteColor;
        if (scene.corkboardNoteImage) fm.corkboardNoteImage = scene.corkboardNoteImage;
        if (scene.corkboardNoteCaption) fm.corkboardNoteCaption = scene.corkboardNoteCaption;
        if (scene.plotgridOrigin) fm.plotgridOrigin = scene.plotgridOrigin;
        if (scene.timeline_mode && scene.timeline_mode !== 'linear') fm.timeline_mode = scene.timeline_mode;
        if (scene.timeline_strand) fm.timeline_strand = scene.timeline_strand;
        if (scene.subtitle) fm.subtitle = scene.subtitle;
        if (scene.color) fm.color = scene.color;
        if (scene.beatsheet) fm.beatsheet = scene.beatsheet;
        if (scene.arcAnchor) fm.arcAnchor = true;
        if (scene.inactive) fm.inactive = true;
        if (scene.codexLinks && Object.keys(scene.codexLinks).some(k => scene.codexLinks![k]?.length)) {
            fm.codexLinks = scene.codexLinks;
        }
        if (scene.universalFields && Object.keys(scene.universalFields).length > 0) {
            fm.universalFields = scene.universalFields;
        }
        // Issue #71 — mirror universal fields to top-level YAML keys
        mirrorUniversalFieldsToTopLevel(fm, scene.universalFields);
        fm.wordcount = scene.body ? this.countWords(scene.body) : 0;
        fm.charcount = scene.body ? this.countChars(scene.body) : 0;
        fm.created = new Date().toISOString().split('T')[0];
        fm.modified = new Date().toISOString().split('T')[0];

        // Issue #77 \u2014 merge user-defined "Default scene frontmatter" keys.
        // StoryLine-owned keys always win, so we only add keys that aren't
        // already present.
        if (extraFrontmatter && typeof extraFrontmatter === 'object') {
            for (const [k, v] of Object.entries(extraFrontmatter)) {
                if (k && !(k in fm) && v !== undefined && v !== null) {
                    fm[k] = v;
                }
            }
        }

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

    private static parseBooleanFlag(value: unknown): boolean | undefined {
        if (value === true || value === false) return value;
        if (typeof value === 'string') {
            const v = value.trim().toLowerCase();
            if (v === 'true') return true;
            if (v === 'false') return false;
        }
        if (typeof value === 'number') {
            if (value === 1) return true;
            if (value === 0) return false;
        }
        return undefined;
    }

    /**
     * Strip wikilink brackets from a string. Handles:
     *   `[[Name]]`             → `Name`
     *   `[[Path/To/Name]]`     → `Name`     (last path segment)
     *   `[[Name|Display]]`     → `Display`  (alias preferred for display)
     *   `[[Name#heading]]`     → `Name`
     * Quoted YAML strings are also unwrapped. Issue #73.
     *
     * Since v1.10.35 (issue #186): plain (non-wikilink) strings that look like
     * file paths or filenames are also normalised to the scene title — e.g.
     * `"MyProject/Scenes/Scene 10.md"` → `"Scene 10"`, `"Scene 10.md"` →
     * `"Scene 10"`. This makes setup/payoff links tolerant of values written
     * as paths (as the old template comment suggested) instead of titles.
     */
    static cleanWikilink(value: string | undefined): string | undefined {
        if (value === undefined || value === null) return undefined;
        let s = String(value).trim();
        if (!s) return undefined;
        // Strip surrounding YAML quotes that may have leaked through
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
            s = s.slice(1, -1).trim();
        }
        const m = s.match(/^\[\[([^\]]+)\]\]$/);
        if (!m) {
            // Plain string (not a wikilink). If it looks like a path or a
            // filename with a .md extension, normalise it to the scene title
            // so setup/payoff links stored as paths still resolve. Issue #186.
            return MetadataParser.stripPathAndExtension(s);
        }
        let inner = m[1];
        // Alias: prefer the right-hand display label
        const pipe = inner.indexOf('|');
        if (pipe >= 0) {
            inner = inner.slice(pipe + 1).trim();
        } else {
            // Drop block/heading refs and keep last path segment
            inner = inner.split('#')[0];
            const slash = inner.lastIndexOf('/');
            if (slash >= 0) inner = inner.slice(slash + 1);
        }
        inner = inner.trim();
        // Also strip a trailing .md extension that may survive after the
        // last-segment extraction above (e.g. `[[Scene 10.md]]`).
        return MetadataParser.stripPathAndExtension(inner);
    }

    /**
     * Normalise a plain scene-reference string to its title form:
     * drop any folder path prefix and a trailing `.md` extension.
     * `"Folder/Scene 10.md"` → `"Scene 10"`, `"Scene 10"` → `"Scene 10"`.
     * Issue #186.
     */
    private static stripPathAndExtension(s: string): string {
        let out = s;
        const slash = out.lastIndexOf('/');
        if (slash >= 0) out = out.slice(slash + 1);
        const backslash = out.lastIndexOf('\\');
        if (backslash >= 0) out = out.slice(backslash + 1);
        if (out.toLowerCase().endsWith('.md')) out = out.slice(0, -3);
        return out.trim();
    }

    /**
     * Parse characters array, cleaning wikilinks
     */
    private static parseCharacters(chars: unknown): string[] | undefined {
        if (!Array.isArray(chars)) return undefined;
        return chars
            .map((c: unknown) => this.cleanWikilink(String(c)) ?? '')
            .filter(s => s.length > 0);
    }

    /**
     * Parse an array of strings, cleaning wikilinks
     */
    private static parseStringArray(arr: unknown): string[] | undefined {
        if (!Array.isArray(arr)) return undefined;
        return arr
            .map((s: unknown) => this.cleanWikilink(String(s)) ?? '')
            .filter(s => s.length > 0);
    }

    /**
     * Validate and parse scene status.
     * Accepts any status that appears in the current status order (built-in + custom).
     * Unknown strings are preserved as-is to prevent data loss.
     */
    private static parseStatus(status: string | undefined): SceneStatus | undefined {
        if (!status) return undefined;
        const lower = String(status).toLowerCase().trim();
        if (!lower) return undefined;
        // Accept anything — the status order list is the source of truth for known
        // statuses, but we preserve unknown strings so user data is never silently
        // dropped (e.g. hand-edited YAML with a status not yet defined in settings).
        return lower as SceneStatus;
    }

    /**
     * Parse codexLinks: Record<string, string[]> from frontmatter.
     * Accepts { categoryId: ['EntryName', ...] } or undefined.
     */
    private static parseCodexLinks(raw: unknown): Record<string, string[]> | undefined {
        if (!raw || typeof raw !== 'object') return undefined;
        const result: Record<string, string[]> = {};
        let hasAny = false;
        for (const [key, val] of Object.entries(raw)) {
            if (Array.isArray(val)) {
                const arr = val
                    .map((v: unknown) => this.cleanWikilink(String(v)) ?? '')
                    .filter(Boolean);
                if (arr.length > 0) {
                    result[key] = arr;
                    hasAny = true;
                }
            }
        }
        return hasAny ? result : undefined;
    }

    /**
     * Count words in body text. Issue #78 — strips Obsidian `%%comments%%`
     * (and optionally markdown task lines) before tokenising so production
     * wordcounts match what will actually be exported.
     */
    private static countWords(text: string): number {
        if (!text) return 0;
        let working = text;
        // Issue #78 — strip Obsidian comment blocks first (multiline, non-greedy)
        if (_excludeCommentsFromWordcount) {
            working = working.replace(/%%[\s\S]*?%%/g, '');
        }
        // Issue #78 — optionally drop checkbox/task lines (`- [ ]`, `- [x]`, `* [X]`)
        if (_excludeChecklistFromWordcount) {
            working = working.replace(/^[ \t]*[-*+]\s*\[[ xX]\]\s.*$/gm, '');
        }
        // Remove markdown headers, links, etc
        const cleaned = working
            .replace(/^#+\s+.*/gm, '')
            .replace(/\[\[.*?\]\]/g, '')
            .replace(/[*_~`]/g, '')
            .trim();
        if (!cleaned) return 0;
        return tokenizeWords(cleaned, resolveLocale(_wordcountLocale, cleaned, DEFAULT_STORYLINE_LOCALE)).length;
    }

    /**
     * Count characters in the scene body, applying the same exclusions as
     * `countWords` (comments, checklists, markdown markup) so the two counts
     * stay aligned. Whitespace is collapsed but not stripped, so the count
     * reflects the readable prose length.
     */
    private static countChars(text: string): number {
        if (!text) return 0;
        let working = text;
        if (_excludeCommentsFromWordcount) {
            working = working.replace(/%%[\s\S]*?%%/g, '');
        }
        if (_excludeChecklistFromWordcount) {
            working = working.replace(/^[ \t]*[-*+]\s*\[[ xX]\]\s.*$/gm, '');
        }
        const cleaned = working
            .replace(/^#+\s+.*/gm, '')
            .replace(/\[\[.*?\]\]/g, '')
            .replace(/[*_~`]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        return cleaned.length;
    }

    /**
     * Extract a title from file path
     */
    private static titleFromPath(filePath: string): string {
        const name = filePath.split('/').pop() || '';
        return name.replace(/\.md$/, '');
    }
}
/* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unnecessary-type-assertion -- end of file-wide suppression block opened at line 1 */
