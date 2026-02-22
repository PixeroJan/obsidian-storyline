import { FilterPreset } from './Scene';

/**
 * Represents a StoryLine project file.
 *
 * A project lives as a markdown file directly inside the StoryLine root folder
 * (e.g. `StoryLine/My Novel.md`) and owns a subfolder tree:
 *
 *   StoryLine/My Novel/Scenes/
 *   StoryLine/My Novel/Characters/
 *   StoryLine/My Novel/Locations/
 */
export interface StoryLineProject {
    /** Vault-relative path of the project .md file */
    filePath: string;
    /** Human-readable title (from frontmatter or filename) */
    title: string;
    /** ISO date string when the project was created */
    created: string;
    /** Description / notes (body of the .md file) */
    description: string;
    /** Derived scene folder path */
    sceneFolder: string;
    /** Derived character folder path */
    characterFolder: string;
    /** Derived location folder path */
    locationFolder: string;

    // ── Project-specific structure ──────────────────────
    /** Defined act numbers (persisted in project frontmatter) */
    definedActs: number[];
    /** Defined chapter numbers (persisted in project frontmatter) */
    definedChapters: number[];
    /** Human-readable labels for acts / beats (act number → label, e.g. 1 → "Opening Image") */
    actLabels: Record<number, string>;
    /** Human-readable labels for chapters (chapter number → label, e.g. 1 → "Opening Image") */
    chapterLabels: Record<number, string>;
    /** Saved filter presets (persisted in project frontmatter) */
    filterPresets: FilterPreset[];
}

/**
 * Build derived folder paths from a root folder and project title.
 */
export function deriveProjectFolders(
    rootFolder: string,
    title: string
): { sceneFolder: string; characterFolder: string; locationFolder: string } {
    const base = `${rootFolder}/${title}`;
    return {
        sceneFolder: `${base}/Scenes`,
        characterFolder: `${base}/Characters`,
        locationFolder: `${base}/Locations`,
    };
}
