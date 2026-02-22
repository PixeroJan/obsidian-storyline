/**
 * LinkScanner — extracts [[wikilinks]] from scene body text and classifies
 * each link as a known character, known location, or unclassified.
 *
 * This lets StoryLine surface entity mentions that appear organically in the
 * prose without requiring the author to manually add them to frontmatter.
 */

import { CharacterManager } from './CharacterManager';
import { LocationManager } from './LocationManager';
import type { Scene } from '../models/Scene';

/** A single detected link with its classification */
export interface DetectedLink {
    /** Display name extracted from the wikilink */
    name: string;
    /** Entity type derived from cross-referencing managers */
    type: 'character' | 'location' | 'other';
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

/**
 * Scans scene body text for [[wikilinks]] and classifies them.
 */
export class LinkScanner {
    /** Cache keyed by scene filePath → scan result */
    private cache: Map<string, LinkScanResult> = new Map();

    private characterManager: CharacterManager;
    private locationManager: LocationManager;

    /** Pre-built lookup sets (lowercased) — rebuilt on invalidate */
    private charNames: Set<string> = new Set();
    private locNames: Set<string> = new Set();

    constructor(characterManager: CharacterManager, locationManager: LocationManager) {
        this.characterManager = characterManager;
        this.locationManager = locationManager;
    }

    // ── Public API ─────────────────────────────────────

    /**
     * Scan a single scene's body and return classified links.
     * Returns a cached result if available.
     */
    scan(scene: Scene): LinkScanResult {
        const cached = this.cache.get(scene.filePath);
        if (cached) return cached;

        const result = this.performScan(scene);
        this.cache.set(scene.filePath, result);
        return result;
    }

    /**
     * Scan all scenes and return the full cache map.
     */
    scanAll(scenes: Scene[]): Map<string, LinkScanResult> {
        this.rebuildLookups();
        for (const scene of scenes) {
            if (!this.cache.has(scene.filePath)) {
                this.cache.set(scene.filePath, this.performScan(scene));
            }
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
    }

    /**
     * Clear the entire cache (e.g. after character/location changes).
     */
    invalidateAll(): void {
        this.cache.clear();
    }

    /**
     * Rebuild the name-lookup sets from the current manager state.
     * Call once before a batch scan, or whenever entity lists change.
     */
    rebuildLookups(): void {
        this.charNames.clear();
        this.locNames.clear();

        for (const c of this.characterManager.getAllCharacters()) {
            this.charNames.add(c.name.toLowerCase());
            if ((c as any).nickname) this.charNames.add((c as any).nickname.toLowerCase());
        }
        for (const l of this.locationManager.getAllLocations()) {
            this.locNames.add(l.name.toLowerCase());
        }
        // Also include worlds
        for (const w of this.locationManager.getAllWorlds()) {
            this.locNames.add(w.name.toLowerCase());
        }
    }

    // ── Internal ───────────────────────────────────────

    private performScan(scene: Scene): LinkScanResult {
        const body = scene.body || '';
        const rawLinks = this.extractWikilinks(body);

        // Ensure lookups are built (cheap if already done)
        if (this.charNames.size === 0 && this.locNames.size === 0) {
            this.rebuildLookups();
        }

        // Deduplicate (case-insensitive) while preserving first-seen casing
        const seen = new Map<string, string>(); // lowered → original
        for (const name of rawLinks) {
            const key = name.toLowerCase();
            if (!seen.has(key)) seen.set(key, name);
        }

        const links: DetectedLink[] = [];
        const characters: string[] = [];
        const locations: string[] = [];
        const other: string[] = [];

        for (const [key, name] of seen) {
            // Skip links that are already in the frontmatter characters or location
            // (we still include them in the result so the UI can show all detected links,
            //  but we classify them the same way)
            let type: DetectedLink['type'] = 'other';
            if (this.charNames.has(key)) {
                type = 'character';
                characters.push(name);
            } else if (this.locNames.has(key)) {
                type = 'location';
                locations.push(name);
            } else {
                other.push(name);
            }
            links.push({ name, type });
        }

        return { links, characters, locations, other };
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
}
