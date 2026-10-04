/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { App } from 'obsidian';
import { CharacterManager } from './CharacterManager';
import { LocationManager } from './LocationManager';
import { SceneManager } from './SceneManager';
import { Scene } from '../models/Scene';
import { CharacterRelation } from '../models/Character';
import { parseSceneLocations } from './MetadataParser';

/**
 * Preview result describing what a rename will affect.
 */
export interface RenamePreview {
    /** Number of scenes where pov/characters/location will be updated */
    sceneCount: number;
    /** Number of character relationship entries that will be updated */
    relationCount: number;
    /** Number of locations whose world/parent field will be updated */
    locationCount: number;
    /** Number of characters whose locations[] array will be updated */
    characterLocationCount: number;
}

/**
 * Handles cascading renames across the entire project.
 *
 * When a character, world, or location name changes, all references
 * in scenes, other characters, and child locations are updated.
 */
export class CascadeRenameService {
    constructor(
         
        private app: App,
        private sceneManager: SceneManager,
        private characterManager: CharacterManager,
        private locationManager: LocationManager,
    ) {}

    // ────────────────────────────────────
    //  Character rename
    // ────────────────────────────────────

    /**
     * Preview how many entities would be affected by renaming a character.
     */
    previewCharacterRename(oldName: string, _newName: string): RenamePreview {
        const lowerOld = oldName.toLowerCase();
        let sceneCount = 0;
        let relationCount = 0;

        // Scenes: check pov and characters[]
        for (const scene of this.sceneManager.getAllScenes()) {
            let hit = false;
            if (scene.pov && scene.pov.toLowerCase() === lowerOld) hit = true;
            if (scene.characters?.some(c => c.toLowerCase() === lowerOld)) hit = true;
            if (hit) sceneCount++;
        }

        // Other characters: check relations[].target
        for (const char of this.characterManager.getAllCharacters()) {
            if (char.name.toLowerCase() === lowerOld) continue; // skip self
            if (char.relations) {
                for (const rel of char.relations) {
                    if (rel.target.toLowerCase() === lowerOld) relationCount++;
                }
            }
        }

        return { sceneCount, relationCount, locationCount: 0, characterLocationCount: 0 };
    }

    /**
     * Execute the cascade rename for a character across all scenes and relationships.
     */
    async cascadeCharacterRename(oldName: string, newName: string): Promise<number> {
        const lowerOld = oldName.toLowerCase();
        let totalUpdated = 0;

        // ── Update scenes ──
        for (const scene of this.sceneManager.getAllScenes()) {
            const updates: Partial<Scene> = {};
            let dirty = false;

            if (scene.pov && scene.pov.toLowerCase() === lowerOld) {
                updates.pov = newName;
                dirty = true;
            }

            if (scene.characters) {
                const newChars = scene.characters.map(c =>
                    c.toLowerCase() === lowerOld ? newName : c
                );
                if (newChars.some((c, i) => c !== scene.characters![i])) {
                    updates.characters = newChars;
                    dirty = true;
                }
            }

            if (dirty) {
                await this.sceneManager.updateScene(scene.filePath, updates);
                totalUpdated++;
            }
        }

        // ── Update other characters' relations ──
        for (const char of this.characterManager.getAllCharacters()) {
            if (char.name.toLowerCase() === lowerOld) continue; // skip self
            if (!char.relations) continue;

            let dirty = false;
            const newRelations: CharacterRelation[] = char.relations.map(rel => {
                if (rel.target.toLowerCase() === lowerOld) {
                    dirty = true;
                    return { ...rel, target: newName };
                }
                return rel;
            });

            if (dirty) {
                char.relations = newRelations;
                await this.characterManager.saveCharacter(char);
                totalUpdated++;
            }
        }

        return totalUpdated;
    }

    // ────────────────────────────────────
    //  World rename
    // ────────────────────────────────────

    /**
     * Preview how many entities would be affected by renaming a world.
     */
    previewWorldRename(oldName: string, _newName: string): RenamePreview {
        const lowerOld = oldName.toLowerCase();
        let locationCount = 0;

        for (const loc of this.locationManager.getAllLocations()) {
            if (loc.world && loc.world.toLowerCase() === lowerOld) locationCount++;
        }

        return { sceneCount: 0, relationCount: 0, locationCount, characterLocationCount: 0 };
    }

    /**
     * Execute the cascade rename for a world across all child locations.
     */
    async cascadeWorldRename(oldName: string, newName: string): Promise<number> {
        const lowerOld = oldName.toLowerCase();
        let totalUpdated = 0;

        for (const loc of this.locationManager.getAllLocations()) {
            if (loc.world && loc.world.toLowerCase() === lowerOld) {
                loc.world = newName;
                await this.locationManager.saveLocation(loc);
                totalUpdated++;
            }
        }

        return totalUpdated;
    }

    // ────────────────────────────────────
    //  Location rename
    // ────────────────────────────────────

    /**
     * Preview how many entities would be affected by renaming a location.
     */
    previewLocationRename(oldName: string, _newName: string): RenamePreview {
        const lowerOld = oldName.toLowerCase();
        let sceneCount = 0;
        let locationCount = 0;
        let characterLocationCount = 0;

        // Scenes: check location field
        for (const scene of this.sceneManager.getAllScenes()) {
            if (parseSceneLocations(scene.location).some(location => location.toLowerCase() === lowerOld)) {
                sceneCount++;
            }
        }

        // Child locations: check parent field
        for (const loc of this.locationManager.getAllLocations()) {
            if (loc.parent && loc.parent.toLowerCase() === lowerOld) {
                locationCount++;
            }
        }

        // Characters: check locations[] array
        for (const char of this.characterManager.getAllCharacters()) {
            if (char.locations?.some(l => l.toLowerCase() === lowerOld)) {
                characterLocationCount++;
            }
        }

        return { sceneCount, relationCount: 0, locationCount, characterLocationCount };
    }

    /**
     * Execute the cascade rename for a location across scenes, child locations,
     * and character location references.
     */
    async cascadeLocationRename(oldName: string, newName: string): Promise<number> {
        const lowerOld = oldName.toLowerCase();
        let totalUpdated = 0;

        // ── Update scenes ──
        for (const scene of this.sceneManager.getAllScenes()) {
            const locations = parseSceneLocations(scene.location);
            if (locations.some(location => location.toLowerCase() === lowerOld)) {
                const updatedLocations = locations.map(location => location.toLowerCase() === lowerOld ? newName : location);
                await this.sceneManager.updateScene(scene.filePath, { location: updatedLocations.join(', ') });
                totalUpdated++;
            }
        }

        // ── Update child locations (parent field) ──
        for (const loc of this.locationManager.getAllLocations()) {
            if (loc.parent && loc.parent.toLowerCase() === lowerOld) {
                loc.parent = newName;
                await this.locationManager.saveLocation(loc);
                totalUpdated++;
            }
        }

        // ── Update characters' locations[] ──
        for (const char of this.characterManager.getAllCharacters()) {
            if (char.locations?.some(l => l.toLowerCase() === lowerOld)) {
                char.locations = char.locations.map(l =>
                    l.toLowerCase() === lowerOld ? newName : l
                );
                await this.characterManager.saveCharacter(char);
                totalUpdated++;
            }
        }

        return totalUpdated;
    }

    // ────────────────────────────────────
    //  Scene title rename (setup/payoff links)
    // ────────────────────────────────────

    /**
     * Update setup_scenes / payoff_scenes references in all scenes
     * when a scene title changes.
     */
    async cascadeSceneTitleRename(oldTitle: string, newTitle: string): Promise<number> {
        let totalUpdated = 0;

        for (const scene of this.sceneManager.getAllScenes()) {
            const updates: Partial<Scene> = {};
            let dirty = false;

            if (scene.setup_scenes?.includes(oldTitle)) {
                updates.setup_scenes = scene.setup_scenes.map(s => s === oldTitle ? newTitle : s);
                dirty = true;
            }

            if (scene.payoff_scenes?.includes(oldTitle)) {
                updates.payoff_scenes = scene.payoff_scenes.map(s => s === oldTitle ? newTitle : s);
                dirty = true;
            }

            if (dirty) {
                await this.sceneManager.updateScene(scene.filePath, updates as Partial<Scene>);
                totalUpdated++;
            }
        }

        return totalUpdated;
    }

    // ────────────────────────────────────
    //  Utility: build a human-readable summary
    // ────────────────────────────────────

    /**
     * Build a summary string from a RenamePreview for display in a confirmation modal.
     */
    buildSummary(preview: RenamePreview): string {
        const parts: string[] = [];
        if (preview.sceneCount > 0) {
            parts.push(`${preview.sceneCount} scene${preview.sceneCount !== 1 ? 's' : ''}`);
        }
        if (preview.relationCount > 0) {
            parts.push(`${preview.relationCount} relationship${preview.relationCount !== 1 ? 's' : ''}`);
        }
        if (preview.locationCount > 0) {
            parts.push(`${preview.locationCount} location${preview.locationCount !== 1 ? 's' : ''}`);
        }
        if (preview.characterLocationCount > 0) {
            parts.push(`${preview.characterLocationCount} character location ref${preview.characterLocationCount !== 1 ? 's' : ''}`);
        }
        if (parts.length === 0) return 'No other references found.';
        return `This will update ${parts.join(', ')}.`;
    }
}
/* eslint-enable @typescript-eslint/no-unnecessary-type-assertion -- end of file-wide suppression block opened at line 1 */
