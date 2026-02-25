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

/**
 * Derive project folder paths from the project .md file's actual location.
 * Works for projects anywhere in the vault — not tied to storyLineRoot.
 *
 * Layout detection:
 *  - New layout:  `Any/Path/MyNovel/MyNovel.md`  → base = `Any/Path/MyNovel`
 *  - Legacy:      `Any/Path/MyNovel.md`           → base = `Any/Path/MyNovel`
 */
export function deriveProjectFoldersFromFilePath(
    filePath: string
): { baseFolder: string; sceneFolder: string; characterFolder: string; locationFolder: string } {
    const lastSlash = filePath.lastIndexOf('/');
    const parentDir = lastSlash >= 0 ? filePath.substring(0, lastSlash) : '';
    const basename = (filePath.split('/').pop() ?? '').replace(/\.md$/i, '');
    const parentName = parentDir.split('/').pop() ?? '';

    // If the file sits inside a folder with the same name → new layout
    const baseFolder = (parentName === basename) ? parentDir : `${parentDir}/${basename}`;
    return {
        baseFolder,
        sceneFolder: `${baseFolder}/Scenes`,
        characterFolder: `${baseFolder}/Characters`,
        locationFolder: `${baseFolder}/Locations`,
    };
}
