/* eslint-disable @typescript-eslint/no-unused-vars, no-useless-escape -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
/**
 * LinkScanner — extracts [[wikilinks]] AND plain-text character/location
 * mentions from scene body text and classifies each as a known character,
 * known location, or unclassified.
 *
 * This lets StoryLine surface entity mentions that appear organically in the
 * prose without requiring the author to manually add them to frontmatter
 * or wrap every name in [[wikilinks]].
 */

import { CharacterManager } from './CharacterManager';
import { LocationManager } from './LocationManager';
import { CodexManager } from './CodexManager';
import type { Scene } from '../models/Scene';

/** A single detected link with its classification */
export interface DetectedLink {
    /** Display name extracted from the wikilink or plain-text match */
    name: string;
    /** Entity type derived from cross-referencing managers */
    type: 'character' | 'location' | 'codex' | 'other';
}

/** Scan result for one scene */
export interface LinkScanResult {
    /** All unique detected links, classified */
    links: DetectedLink[];
    /** Convenience: only the character names */
    characters: string[];
    /** Convenience: only the location names */
    locations: string[];
    /** Convenience: names that matched neither */
    other: string[];
}

/** An entity that references (or is referenced by) another entity */
export interface EntityReference {
    /** Display name of the referencing entity */
    name: string;
    /** Entity type */
    type: 'character' | 'location' | 'codex' | 'scene';
    /** Vault-relative file path */
    filePath: string;
    /** Codex category id (only when type === 'codex') */
    codexCategory?: string;
}

/**
 * Issue #228 — common title words that should NOT be auto-aliased as a
 * first name. When a character's name starts with one of these (e.g.
 * "Lady of Dreams", "Lord Blackwood", "Sir Galahad"), the first word is a
 * title, not a first name, and auto-aliasing it would tag the character
 * in every scene that uses the title word.
 */
const TITLE_WORDS = new Set([
    'lady', 'lord', 'sir', 'dame', 'madam', 'madame', 'mister', 'mr', 'mrs',
    'ms', 'dr', 'doctor', 'professor', 'prof', 'captain', 'cap', 'lieutenant',
    'lt', 'sergeant', 'sgt', 'general', 'gen', 'colonel', 'col', 'major',
    'maj', 'admiral', 'adm', 'commander', 'cmdr', 'king', 'queen', 'prince',
    'princess', 'duke', 'duchess', 'earl', 'count', 'countess', 'baron',
    'baroness', 'marquis', 'marchioness', 'emperor', 'empress', 'pope',
    'father', 'mother', 'sister', 'brother', 'reverend', 'rev', 'saint',
    'st', 'elder', 'master', 'mistress', 'sheriff', 'deputy', 'officer',
    'agent', 'director', 'president', 'senator', 'judge', 'justice',
]);

/**
 * Issue #228 — connector words that indicate a descriptive phrase rather
 * than a "[FirstName] [LastName]" pattern. When the second word of a name
 * is one of these (e.g. "Lady **of** Dreams", "Keeper **of** the Keys"),
 * the first word is not a first name and should not be auto-aliased.
 */
const CONNECTOR_WORDS = new Set([
    'of', 'the', 'de', 'la', 'le', 'du', 'von', 'van', 'der', 'den', 'das',
    'di', 'da', 'del', 'della', 'des', 'du', 'el', 'al', 'bin', 'ibn',
    'from', 'in', 'on', 'at', 'for', 'to', 'and',
]);

/**
 * Scans scene body text for [[wikilinks]] and plain-text name mentions,
 * then classifies them.
 */
export class LinkScanner {
    /** Cache keyed by scene filePath → scan result */
    private cache: Map<string, LinkScanResult> = new Map();
    /** Cache keyed by scene filePath → the Scene object itself, so
     *  buildEntityIndex() can read structured fields like codexLinks
     *  (issue #213: tagged Codex entries weren't shown in Referenced By). */
    private sceneCache: Map<string, Scene> = new Map();

    private characterManager: CharacterManager;
    private locationManager: LocationManager;
    private codexManager: CodexManager | null = null;

    /** Pre-built lookup sets (lowercased) — rebuilt on invalidate */
    private charNames: Set<string> = new Set();
    private locNames: Set<string> = new Set();
    private codexNames: Set<string> = new Set();

    /**
     * Maps a lowercased name/nickname to the canonical (display) character name.
     * E.g. "anna" → "Anna Svensson" when nickname is "Anna".
     */
    private charCanonical: Map<string, string> = new Map();

    /**
     * Issue #228 — maps a lowercased name to its original-cased form(s).
     * Used by `extractPlainTextMentions()` so that case-sensitive matching
     * tests the real casing (e.g. "Dust") rather than the lowercased key
     * ("dust"). A single lowercased key can map to multiple original
     * casings (e.g. a character named "Dust" and a location named "dust").
     */
    private originalCasedNames: Map<string, string[]> = new Map();

    /**
     * All character/location plain-text names to search for, sorted longest
     * first so that "Anna Svensson" is matched before "Anna".
     */
    private plainTextNames: string[] = [];

    /**
     * Issue #223 — per-codex-entry matching rules.
     * `codexEntryRules` maps a lowercased name (or alias) to the entry's
     * matching configuration: whether it's case-sensitive and which terms
     * should suppress a match. `codexCaseSensitiveNames` lists the names
     * that must be matched with exact case (kept in original casing).
     */
    private codexEntryRules: Map<string, { caseSensitive: boolean; excludeTerms: string[] }> = new Map();
    private codexCaseSensitiveNames: string[] = [];

    /** Last-used manual aliases (stored so internal calls can reuse them) */
    private lastManualAliases?: Record<string, string>;

    constructor(characterManager: CharacterManager, locationManager: LocationManager) {
        this.characterManager = characterManager;
        this.locationManager = locationManager;
    }

    /** Set the codex manager (called after initial construction) */
    setCodexManager(codexManager: CodexManager): void {
        this.codexManager = codexManager;
    }

    // ── Public API ─────────────────────────────────────

    /**
     * Scan a single scene's body and return classified links.
     * Returns a cached result if available.
     */
    scan(scene: Scene): LinkScanResult {
        const cached = this.cache.get(scene.filePath);
        if (cached) {
            // Keep the scene reference fresh even on cache hits
            this.sceneCache.set(scene.filePath, scene);
            return cached;
        }

        const result = this.performScan(scene);
        this.cache.set(scene.filePath, result);
        this.sceneCache.set(scene.filePath, scene);
        return result;
    }

    /**
     * Scan all scenes and return the full cache map.
     */
    scanAll(scenes: Scene[]): Map<string, LinkScanResult> {
        this.rebuildLookups(this.lastManualAliases);
        for (const scene of scenes) {
            if (!this.cache.has(scene.filePath)) {
                this.cache.set(scene.filePath, this.performScan(scene));
            }
            // Always refresh the scene reference so codexLinks stays current
            this.sceneCache.set(scene.filePath, scene);
        }
        return this.cache;
    }

    /**
     * Get a previously computed result (or null).
     */
    getResult(filePath: string): LinkScanResult | null {
        return this.cache.get(filePath) ?? null;
    }

    /**
     * Invalidate a single scene (e.g. when its body changes).
     */
    invalidate(filePath: string): void {
        this.cache.delete(filePath);
        this.sceneCache.delete(filePath);
    }

    /**
     * Clear the entire cache (e.g. after character/location changes).
     */
    invalidateAll(): void {
        this.cache.clear();
        this.sceneCache.clear();
    }

    /**
     * Rebuild the name-lookup sets from the current manager state.
     * Call once before a batch scan, or whenever entity lists change.
     *
     * @param manualAliases  Optional user-defined alias → canonical mappings
     *                       (from plugin settings.characterAliases).
     */
    rebuildLookups(manualAliases?: Record<string, string>): void {
        // Store for later internal calls
        if (manualAliases !== undefined) this.lastManualAliases = manualAliases;
        this.charNames.clear();
        this.locNames.clear();
        this.charCanonical.clear();
        // Issue #228 — character & location matching rules now share the
        // same map codex entries use, so plain-text scanning honours
        // caseSensitive / excludeTerms for every entity type.
        this.codexEntryRules.clear();
        this.codexCaseSensitiveNames = [];
        this.originalCasedNames.clear();

        /** Issue #228 — record the original casing for a lowercased name
         *  so case-sensitive matching can test the real casing. */
        const registerOriginalCasing = (nameLower: string, originalName: string) => {
            const list = this.originalCasedNames.get(nameLower);
            if (list) {
                if (!list.includes(originalName)) list.push(originalName);
            } else {
                this.originalCasedNames.set(nameLower, [originalName]);
            }
        };

        /** Build a {caseSensitive, excludeTerms} rule from any entity that
         *  exposes the Linking & Matching fields. Returns null when neither
         *  flag is set (no rule needed). */
        const buildRule = (e: Record<string, unknown>): { caseSensitive: boolean; excludeTerms: string[] } | null => {
            const caseSensitive = e.caseSensitive === true;
            const excludeRaw = typeof e.excludeTerms === 'string' ? e.excludeTerms : '';
            const excludeTerms = excludeRaw
                .split(/[,\n]/)
                .map(t => t.trim().toLowerCase())
                .filter(Boolean);
            if (!caseSensitive && excludeTerms.length === 0) return null;
            return { caseSensitive, excludeTerms };
        };

        /** Register a rule (if any) for a name + its original casing. */
        const registerRule = (nameLower: string, originalName: string, rule: { caseSensitive: boolean; excludeTerms: string[] } | null) => {
            registerOriginalCasing(nameLower, originalName);
            if (!rule) return;
            this.codexEntryRules.set(nameLower, rule);
            if (rule.caseSensitive) this.codexCaseSensitiveNames.push(originalName);
        };

        // Count first-name occurrences to avoid ambiguous auto-aliases
        const firstNameCount = new Map<string, number>();
        for (const c of this.characterManager.getAllCharacters()) {
            const first = c.name.split(/\s+/)[0]?.toLowerCase();
            if (first) firstNameCount.set(first, (firstNameCount.get(first) || 0) + 1);
        }

        for (const c of this.characterManager.getAllCharacters()) {
            const nameLower = c.name.toLowerCase();
            this.charNames.add(nameLower);
            this.charCanonical.set(nameLower, c.name);

            // Issue #228 — Linking & Matching rules for characters.
            const cRule = buildRule(c as unknown as Record<string, unknown>);
            registerRule(nameLower, c.name, cRule);

            // Auto-add first name as alias (only if unique across characters).
            // Issue #228 — skip the auto-alias when the first word is a title
            // (Lady, Lord, Sir, …) or when the name is a descriptive phrase
            // ("Lady of Dreams", "Keeper of the Keys"). These aren't first
            // names and auto-aliasing them causes false positives in every
            // scene that uses the title word.
            const firstName = c.name.split(/\s+/)[0]?.toLowerCase();
            const nameWords = c.name.split(/\s+/);
            const secondWord = nameWords[1]?.toLowerCase();
            const isTitleOrPhrase =
                TITLE_WORDS.has(firstName) ||
                (secondWord && CONNECTOR_WORDS.has(secondWord));
            if (
                firstName &&
                firstName !== nameLower &&
                (firstNameCount.get(firstName) || 0) <= 1 &&
                !isTitleOrPhrase
            ) {
                this.charNames.add(firstName);
                this.charCanonical.set(firstName, c.name);
                // Issue #228 — always register original casing so the
                // case-sensitive regex can use it when a rule exists.
                registerRule(firstName, c.name.split(/\s+/)[0], cRule);
            }

            if ((c as unknown as Record<string, unknown>).nickname) {
                // Support multiple comma-separated nicknames
                const nicknames = String((c as unknown as Record<string, unknown>).nickname)
                    .split(',')
                    .map((n: string) => n.trim())
                    .filter(Boolean);
                for (const nick of nicknames) {
                    const nickLower = nick.toLowerCase();
                    this.charNames.add(nickLower);
                    this.charCanonical.set(nickLower, c.name);
                    registerRule(nickLower, nick, cRule);
                }
            }
        }

        // Apply manual aliases (always win over auto-detected)
        if (manualAliases) {
            for (const [alias, canonical] of Object.entries(manualAliases)) {
                const aliasLower = alias.toLowerCase();
                this.charNames.add(aliasLower);
                this.charCanonical.set(aliasLower, canonical);
            }
        }

        for (const l of this.locationManager.getAllLocations()) {
            this.locNames.add(l.name.toLowerCase());
            // Issue #228 — Linking & Matching rules for locations.
            const lRule = buildRule(l as unknown as Record<string, unknown>);
            registerRule(l.name.toLowerCase(), l.name, lRule);
            // Support comma-separated nicknames for locations
            if (l.nickname) {
                const nicks = String(l.nickname).split(',').map(n => n.trim()).filter(Boolean);
                for (const nick of nicks) {
                    const nickLower = nick.toLowerCase();
                    this.locNames.add(nickLower);
                    registerRule(nickLower, nick, lRule);
                }
            }
        }
        // Also include worlds
        for (const w of this.locationManager.getAllWorlds()) {
            this.locNames.add(w.name.toLowerCase());
            // Issue #228 — Linking & Matching rules for worlds.
            const wRule = buildRule(w as unknown as Record<string, unknown>);
            registerRule(w.name.toLowerCase(), w.name, wRule);
            // Support comma-separated nicknames for worlds
            if (w.nickname) {
                const nicks = String(w.nickname).split(',').map(n => n.trim()).filter(Boolean);
                for (const nick of nicks) {
                    const nickLower = nick.toLowerCase();
                    this.locNames.add(nickLower);
                    registerRule(nickLower, nick, wRule);
                }
            }
        }

        // Codex entry names
        this.codexNames.clear();
        // Note: codexEntryRules / codexCaseSensitiveNames are shared with
        // character & location rules (Issue #228) and were reset at the top
        // of rebuildLookups() — do NOT clear them again here.
        if (this.codexManager) {
            for (const entry of this.codexManager.getAllEntries()) {
                const lower = entry.name.toLowerCase();
                // Read per-entry matching configuration (Issues #209, #223).
                const caseSensitive = entry.caseSensitive === true;
                const excludeRaw = typeof entry.excludeTerms === 'string' ? entry.excludeTerms : '';
                const excludeTerms = excludeRaw
                    .split(/[,\n]/)
                    .map(t => t.trim().toLowerCase())
                    .filter(Boolean);
                const rules = { caseSensitive, excludeTerms };

                // Don't add if already a character or location name
                if (!this.charNames.has(lower) && !this.locNames.has(lower)) {
                    this.codexNames.add(lower);
                    registerOriginalCasing(lower, entry.name);
                    this.codexEntryRules.set(lower, rules);
                    if (caseSensitive) this.codexCaseSensitiveNames.push(entry.name);
                }
                // Issue #209 — aliases (shared across all codex categories)
                const aliasesRaw = typeof entry.aliases === 'string' ? entry.aliases : '';
                const aliasList = aliasesRaw
                    .split(/[,\n]/)
                    .map(a => a.trim())
                    .filter(Boolean);
                for (const alias of aliasList) {
                    const aLower = alias.toLowerCase();
                    if (!this.charNames.has(aLower) && !this.locNames.has(aLower)) {
                        this.codexNames.add(aLower);
                        registerOriginalCasing(aLower, alias);
                        this.codexEntryRules.set(aLower, rules);
                        if (caseSensitive) this.codexCaseSensitiveNames.push(alias);
                    }
                }
                // Support comma-separated nicknames for codex entries
                const nick = (entry as unknown as Record<string, unknown>).nickname;
                if (nick && typeof nick === 'string') {
                    const nicks = String(nick).split(',').map(n => n.trim()).filter(Boolean);
                    for (const n of nicks) {
                        const nLower = n.toLowerCase();
                        if (!this.charNames.has(nLower) && !this.locNames.has(nLower)) {
                            this.codexNames.add(nLower);
                            registerOriginalCasing(nLower, n);
                            this.codexEntryRules.set(nLower, rules);
                            if (caseSensitive) this.codexCaseSensitiveNames.push(n);
                        }
                    }
                }
            }
        }

        // Build sorted list of all names for plain-text scanning (longest first
        // so "Anna Svensson" matches before "Anna")
        this.plainTextNames = [...this.charNames, ...this.locNames, ...this.codexNames]
            .sort((a, b) => b.length - a.length);
    }

    // ── Internal ───────────────────────────────────────

    private performScan(scene: Scene): LinkScanResult {
        // Include image note caption in the scannable text
        const body = (scene.body || '') + (scene.corkboardNoteCaption ? '\n' + scene.corkboardNoteCaption : '');
        const rawLinks = this.extractWikilinks(body);

        // Ensure lookups are built (cheap if already done)
        if (this.charNames.size === 0 && this.locNames.size === 0) {
            this.rebuildLookups(this.lastManualAliases);
        }

        // Deduplicate (case-insensitive) while preserving first-seen casing
        const seen = new Map<string, string>(); // lowered → original
        for (const name of rawLinks) {
            const key = name.toLowerCase();
            if (!seen.has(key)) seen.set(key, name);
        }

        // Also scan plain text for character and location names
        const plainTextMentions = this.extractPlainTextMentions(body);
        for (const name of plainTextMentions) {
            const key = name.toLowerCase();
            // Use the canonical character name if available (maps nickname → full name)
            const canonical = this.charCanonical.get(key) || name;
            const canonKey = canonical.toLowerCase();
            if (!seen.has(canonKey)) seen.set(canonKey, canonical);
        }

        const links: DetectedLink[] = [];
        const characters: string[] = [];
        const locations: string[] = [];
        const other: string[] = [];

        for (const [key, name] of seen) {
            let type: DetectedLink['type'] = 'other';
            // Issue #223 / #228 — case-sensitive entries (codex, character,
            // or location) only match when the original text casing equals
            // the registered name's casing.
            const rules = this.codexEntryRules.get(key);
            if (rules?.caseSensitive) {
                // The registered case-sensitive names are stored in
                // `codexCaseSensitiveNames` in their original casing. The
                // current `name` preserves the first-seen casing from the
                // text. Only keep the match if that casing is registered.
                if (!this.codexCaseSensitiveNames.some(cs => cs.toLowerCase() === key && cs === name)) {
                    // Casing mismatch — treat as a non-match for this entry.
                    other.push(name);
                    links.push({ name, type: 'other' });
                    continue;
                }
            }
            if (this.charNames.has(key)) {
                type = 'character';
                characters.push(name);
            } else if (this.locNames.has(key)) {
                type = 'location';
                locations.push(name);
            } else if (this.codexNames.has(key)) {
                type = 'codex';
            } else {
                other.push(name);
            }
            links.push({ name, type });
        }

        return { links, characters, locations, other };
    }

    /**
     * Scan plain text (excluding wikilinks) for known character names,
     * nicknames, and location names. Returns matched names (lowercased).
     *
     * Issue #228 — exclude terms are now **contextual**: a match is
     * suppressed only when an exclude term overlaps or directly surrounds
     * the matched name in the text. Previously the whole scene was checked,
     * which meant a single exclude-term occurrence anywhere would suppress
     * all matches — even legitimate ones elsewhere in the scene.
     */
    private extractPlainTextMentions(text: string): string[] {
        if (this.plainTextNames.length === 0) return [];

        // Strip wikilinks from the text so we don't double-count them
        const stripped = text.replace(/\[\[[^\]]+\]\]/g, ' ');

        const results: string[] = [];
        const foundKeys = new Set<string>();

        for (const nameLower of this.plainTextNames) {
            if (foundKeys.has(nameLower)) continue;

            // Issue #223 — per-entry matching rules for codex entries.
            const rules = this.codexEntryRules.get(nameLower);
            const isCaseSensitive = rules?.caseSensitive === true;
            const excludeTerms = rules?.excludeTerms ?? [];

            // Collect all match positions for this name. We need positions
            // so exclude terms can be checked contextually (at the match
            // site) rather than across the whole scene.
            const matchPositions: number[] = [];
            const isCJK = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]/.test(nameLower);

            if (isCJK) {
                if (isCaseSensitive) {
                    const variants = this.originalCasedNames.get(nameLower) ?? [nameLower];
                    for (const v of variants) {
                        let from = 0;
                        let idx: number;
                        while ((idx = stripped.indexOf(v, from)) !== -1) {
                            matchPositions.push(idx);
                            from = idx + v.length;
                        }
                    }
                } else {
                    const lowered = stripped.toLowerCase();
                    let from = 0;
                    let idx: number;
                    while ((idx = lowered.indexOf(nameLower, from)) !== -1) {
                        matchPositions.push(idx);
                        from = idx + nameLower.length;
                    }
                }
            } else {
                if (isCaseSensitive) {
                    const variants = this.originalCasedNames.get(nameLower) ?? [nameLower];
                    for (const v of variants) {
                        const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const re = new RegExp(`\\b${esc}\\b`, 'g');
                        let m: RegExpExecArray | null;
                        while ((m = re.exec(stripped)) !== null) {
                            matchPositions.push(m.index);
                            if (m.index === re.lastIndex) re.lastIndex++;
                        }
                    }
                } else {
                    const escaped = nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const re = new RegExp(`\\b${escaped}\\b`, 'gi');
                    let m: RegExpExecArray | null;
                    while ((m = re.exec(stripped)) !== null) {
                        matchPositions.push(m.index);
                        if (m.index === re.lastIndex) re.lastIndex++;
                    }
                }
            }

            if (matchPositions.length === 0) continue;

            // Issue #228 — contextual exclude-term check. A match is
            // suppressed only if an exclude term overlaps it or appears
            // directly adjacent (within a few characters). If at least one
            // match is clean (not covered by any exclude term), the entity
            // is considered mentioned.
            let hasCleanMatch = matchPositions.length > 0;
            if (excludeTerms.length > 0) {
                const lowered = stripped.toLowerCase();
                const nameLen = nameLower.length;
                // Context window: check a window around each match. The
                // exclude term must start within [matchStart - termLen,
                // matchEnd] to count as overlapping/adjacent.
                hasCleanMatch = false;
                for (const pos of matchPositions) {
                    const matchEnd = pos + nameLen;
                    let suppressed = false;
                    for (const term of excludeTerms) {
                        const termLen = term.length;
                        // Look for the exclude term starting anywhere in a
                        // window that covers the match and a small margin
                        // on either side (to catch "Lady Margaret" when the
                        // matched name is "Lady" at the same position).
                        const windowStart = Math.max(0, pos - termLen);
                        const windowEnd = matchEnd + termLen;
                        const window = lowered.substring(windowStart, windowEnd);
                        if (window.includes(term)) {
                            suppressed = true;
                            break;
                        }
                    }
                    if (!suppressed) {
                        hasCleanMatch = true;
                        break;
                    }
                }
            }

            if (hasCleanMatch) {
                foundKeys.add(nameLower);
                results.push(nameLower);
            }
        }

        return results;
    }

    /**
     * Extract wikilink names from raw markdown body text.
     * Handles [[Name]] and [[Name|alias]] (returns the Name portion).
     */
    private extractWikilinks(text: string): string[] {
        const re = /\[\[([^\]]+)\]\]/g;
        const results: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
            let link = m[1];
            // Handle [[target|display]] — keep the target (left side)
            const pipe = link.indexOf('|');
            if (pipe !== -1) link = link.substring(0, pipe);
            // Strip any heading/block refs  [[Page#heading]]
            const hash = link.indexOf('#');
            if (hash !== -1) link = link.substring(0, hash);
            const trimmed = link.trim();
            if (trimmed) results.push(trimmed);
        }
        return results;
    }

    // ── Public: arbitrary text scanning ────────────────

    /**
     * Scan an arbitrary text string for character names, location names,
     * and #tags.  Returns the same LinkScanResult shape but also includes
     * a `tags` array.
     *
     * This is used by the PlotGrid Cell Inspector so that text typed into
     * any cell is cross-referenced with the character/location databases.
     */
    scanText(text: string): LinkScanResult & { tags: string[] } {
        // Ensure lookups are built
        if (this.charNames.size === 0 && this.locNames.size === 0) {
            this.rebuildLookups(this.lastManualAliases);
        }

        const seen = new Map<string, string>(); // lowered → display name

        // 1. Wikilinks
        for (const name of this.extractWikilinks(text)) {
            const key = name.toLowerCase();
            if (!seen.has(key)) seen.set(key, name);
        }

        // 2. Plain-text character/location mentions
        for (const name of this.extractPlainTextMentions(text)) {
            const key = name.toLowerCase();
            const canonical = this.charCanonical.get(key) || name;
            const canonKey = canonical.toLowerCase();
            if (!seen.has(canonKey)) seen.set(canonKey, canonical);
        }

        // 3. #tags — accept any non-punctuation/whitespace run after `#`, so
        // tags like `#主角` (Chinese) or `#キャラ` (Japanese) work alongside ASCII.
        // Strip [[...]] wikilinks first so section headers like [[Page#heading]]
        // are not mistaken for #tags.
        const tagRe = /#([^\s#.,;:!?()\[\]{}'"“”‘’「」『』，。！？、]+)/g;
        const tags: string[] = [];
        const tagSeen = new Set<string>();
        let tm: RegExpExecArray | null;
        const textForTags = text.replace(/\[\[[^\]]*\]\]/g, ' ');
        while ((tm = tagRe.exec(textForTags)) !== null) {
            const tag = tm[1];
            const low = tag.toLowerCase();
            if (!tagSeen.has(low)) { tagSeen.add(low); tags.push(tag); }
        }

        // Classify
        const links: DetectedLink[] = [];
        const characters: string[] = [];
        const locations: string[] = [];
        const other: string[] = [];

        for (const [key, name] of seen) {
            let type: DetectedLink['type'] = 'other';
            if (this.charNames.has(key)) {
                type = 'character';
                characters.push(this.charCanonical.get(key) || name);
            } else if (this.locNames.has(key)) {
                type = 'location';
                locations.push(name);
            } else if (this.codexNames.has(key)) {
                type = 'codex';
            } else {
                other.push(name);
            }
            links.push({ name, type });
        }

        return { links, characters, locations, other, tags };
    }

    // ── Cross-entity reference index ───────────────────

    /**
     * Build a reverse-lookup index: for each entity name, which other entities
     * mention it in their text fields.
     *
     * Returns a Map keyed by lowercased entity name → array of referencing entities.
     */
    buildEntityIndex(): Map<string, EntityReference[]> {
        // Ensure lookups are built
        if (this.charNames.size === 0 && this.locNames.size === 0) {
            this.rebuildLookups(this.lastManualAliases);
        }

        const index = new Map<string, EntityReference[]>();

        const addRefs = (sourceName: string, sourceType: EntityReference['type'], sourceFilePath: string, text: string, codexCategory?: string) => {
            if (!text) return;
            const result = this.scanText(text);
            for (const link of result.links) {
                const key = link.name.toLowerCase();
                // Don't reference yourself
                if (key === sourceName.toLowerCase()) continue;
                if (!index.has(key)) index.set(key, []);
                const refs = index.get(key)!;
                // Deduplicate by filePath
                if (!refs.some(r => r.filePath === sourceFilePath)) {
                    refs.push({ name: sourceName, type: sourceType, filePath: sourceFilePath, codexCategory });
                }
            }
            // Also match #tags against entity names (e.g. #Aragorn → character Aragorn)
            for (const tag of result.tags) {
                const key = tag.toLowerCase();
                if (key === sourceName.toLowerCase()) continue;
                if (!index.has(key)) index.set(key, []);
                const refs = index.get(key)!;
                if (!refs.some(r => r.filePath === sourceFilePath)) {
                    refs.push({ name: sourceName, type: sourceType, filePath: sourceFilePath, codexCategory });
                }
            }
        };

        // Scan characters
        for (const c of this.characterManager.getAllCharacters()) {
            const textFields = [
                (c as unknown as Record<string, unknown>).backstory, (c as unknown as Record<string, unknown>).appearance, (c as unknown as Record<string, unknown>).personality,
                (c as unknown as Record<string, unknown>).internalMotivation, (c as unknown as Record<string, unknown>).externalMotivation,
                (c as unknown as Record<string, unknown>).strengths, (c as unknown as Record<string, unknown>).flaws, (c as unknown as Record<string, unknown>).fears,
                (c as unknown as Record<string, unknown>).belief, (c as unknown as Record<string, unknown>).misbelief, (c as unknown as Record<string, unknown>).notes,
            ].filter(Boolean).join('\n');
            addRefs(c.name, 'character', c.filePath, textFields);
        }

        // Scan locations and worlds
        for (const l of this.locationManager.getAllLocations()) {
            const textFields = [
                l.description, l.atmosphere, l.significance,
                l.inhabitants, l.connectedLocations, l.mapNotes, l.notes,
            ].filter(Boolean).join('\n');
            addRefs(l.name, 'location', l.filePath, textFields);
        }
        for (const w of this.locationManager.getAllWorlds()) {
            const textFields = [
                w.description, w.geography, w.culture, w.politics,
                w.magicTechnology, w.beliefs, w.economy, w.history, w.notes,
            ].filter(Boolean).join('\n');
            addRefs(w.name, 'location', w.filePath, textFields);
        }

        // Scan codex entries
        if (this.codexManager) {
            for (const entry of this.codexManager.getAllEntries()) {
                const textParts: string[] = [];
                // Gather all string values from the entry
                for (const [key, val] of Object.entries(entry)) {
                    if (key === 'filePath' || key === 'type' || key === 'name' || key === 'image' ||
                        key === 'gallery' || key === 'created' || key === 'modified' || key === 'books') continue;
                    if (typeof val === 'string' && val.length > 0) {
                        textParts.push(val);
                    }
                }
                if (entry.notes) textParts.push(entry.notes);
                const codexCat = entry.type || undefined;
                addRefs(entry.name, 'codex', entry.filePath, textParts.join('\n'), codexCat);
            }
        }

        // Scan scenes (already cached)
        for (const [filePath, result] of this.cache) {
            const sceneName = filePath.split('/').pop()?.replace(/\.md$/i, '') ?? filePath;
            for (const link of result.links) {
                const key = link.name.toLowerCase();
                if (!index.has(key)) index.set(key, []);
                const refs = index.get(key)!;
                if (!refs.some(r => r.filePath === filePath)) {
                    refs.push({ name: sceneName, type: 'scene', filePath });
                }
            }

            // Also honour explicit Codex links tagged via the Inspector
            // (scene.codexLinks). Previously these were stored in frontmatter
            // but never surfaced in the Referenced By panel because the
            // reverse-lookup only scanned scene body text. (Issue #213)
            const scene = this.sceneCache.get(filePath);
            if (scene?.codexLinks) {
                for (const [_catId, names] of Object.entries(scene.codexLinks)) {
                    if (!Array.isArray(names)) continue;
                    for (const name of names) {
                        if (!name) continue;
                        const key = name.toLowerCase();
                        if (!index.has(key)) index.set(key, []);
                        const refs = index.get(key)!;
                        if (!refs.some(r => r.filePath === filePath)) {
                            refs.push({ name: sceneName, type: 'scene', filePath });
                        }
                    }
                }
            }
        }

        return index;
    }

    // ── Codex change detection ─────────────────────────

    /**
     * Compute a content digest for every codex entry.
     * Returns a map of filePath → hash string.
     * Used to detect when a codex entry has been edited since the last review.
     */
    computeCodexDigests(): Record<string, string> {
        if (!this.codexManager) return {};
        const digests: Record<string, string> = {};
        for (const entry of this.codexManager.getAllEntries()) {
            const textParts: string[] = [];
            for (const [key, val] of Object.entries(entry)) {
                if (key === 'filePath' || key === 'type' || key === 'name' || key === 'image' ||
                    key === 'gallery' || key === 'created' || key === 'modified' || key === 'books') continue;
                if (typeof val === 'string' && val.length > 0) textParts.push(val);
            }
            const text = textParts.join('\n');
            if (text) digests[entry.filePath] = this.djb2(text);
        }
        return digests;
    }

    /** Simple DJB2 hash — fast, non-cryptographic, sufficient for change detection */
    private djb2(str: string): string {
        let h = 5381;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) + h) + str.charCodeAt(i);
            h |= 0;
        }
        return h.toString(36);
    }
}
/* eslint-enable @typescript-eslint/no-unused-vars, no-useless-escape -- end of file-wide suppression block opened at line 1 */
