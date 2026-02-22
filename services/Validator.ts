import { Scene, TimelineMode } from '../models/Scene';

/**
 * Severity levels for plot hole warnings
 */
export type WarningSeverity = 'error' | 'warning' | 'info';

/**
 * A single plot hole / consistency warning
 */
export interface PlotWarning {
    severity: WarningSeverity;
    category: string;
    message: string;
    /** File paths of scenes involved (for navigation) */
    scenePaths?: string[];
}

/** Set of timeline modes that are exempt from date-order and continuity checks */
const EXEMPT_FROM_DATE_ORDER: Set<TimelineMode | undefined> = new Set([
    'flashback', 'flash_forward', 'dream', 'mythic', 'circular', 'simultaneous',
]);

/** Set of timeline modes that are exempt from ALL continuity checks (intensity, emotion streaks) */
const EXEMPT_FROM_CONTINUITY: Set<TimelineMode | undefined> = new Set([
    'dream', 'mythic',
]);

/** Set of timeline modes that suppress gap / sequence gap warnings */
const EXEMPT_FROM_GAP: Set<TimelineMode | undefined> = new Set([
    'timeskip', 'dream', 'mythic',
]);

/**
 * Validates story consistency and detects potential plot holes.
 *
 * Categories of checks:
 * 1. Timeline — out-of-order dates, sequence gaps
 * 2. Characters — disappearing characters, POV-less scenes, unnamed POV
 * 3. Plotlines — tags that start but drop off, unbalanced plotlines
 * 4. Setup/Payoff — dangling setups, missing targets, broken reverse links
 * 5. Structure — empty acts, huge act imbalances, missing metadata
 * 6. Continuity — location jumps without transition, intensity curve anomalies
 */
export class Validator {

    /**
     * Run all plot hole checks and return a list of warnings.
     */
    static validate(scenes: Scene[]): PlotWarning[] {
        if (scenes.length === 0) return [];

        const warnings: PlotWarning[] = [];

        this.checkTimeline(scenes, warnings);
        this.checkCharacters(scenes, warnings);
        this.checkPlotlines(scenes, warnings);
        this.checkSetupPayoff(scenes, warnings);
        this.checkStructure(scenes, warnings);
        this.checkContinuity(scenes, warnings);

        return warnings;
    }

    // ─── Timeline Checks ───────────────────────────────────────

    private static checkTimeline(scenes: Scene[], warnings: PlotWarning[]): void {
        // Only check "linear" scenes for the main timeline.
        // Parallel and frame scenes are checked within their own strands below.
        const sorted = [...scenes].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

        // ── Duplicate sequence numbers (always checked, all modes) ──
        const seqCounts = new Map<number, Scene[]>();
        for (const s of sorted) {
            if (s.sequence !== undefined) {
                const list = seqCounts.get(s.sequence) || [];
                list.push(s);
                seqCounts.set(s.sequence, list);
            }
        }
        for (const [seq, list] of seqCounts) {
            if (list.length > 1) {
                warnings.push({
                    severity: 'warning',
                    category: 'Timeline',
                    message: `Duplicate sequence #${seq}: ${list.map(s => `"${s.title}"`).join(', ')}`,
                    scenePaths: list.map(s => s.filePath),
                });
            }
        }

        // ── Sequence gap checks (skip scenes marked timeskip/dream/mythic at either end of the gap) ──
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            const prevSeq = prev.sequence ?? 0;
            const currSeq = curr.sequence ?? 0;
            if (currSeq - prevSeq > 5) {
                // Suppress if either scene is a timeskip or otherwise exempt
                if (EXEMPT_FROM_GAP.has(prev.timeline_mode) || EXEMPT_FROM_GAP.has(curr.timeline_mode)) continue;
                warnings.push({
                    severity: 'info',
                    category: 'Timeline',
                    message: `Large sequence gap: #${prevSeq} → #${currSeq} (gap of ${currSeq - prevSeq - 1})`,
                    scenePaths: [prev.filePath, curr.filePath],
                });
            }
        }

        // ── Date ordering checks ──
        // For the "main" timeline, only consider scenes that are linear (or undefined mode).
        // For parallel/frame strands, group by strand and check order within each.
        const mainTimeline = sorted.filter(s => {
            const mode = s.timeline_mode || 'linear';
            return mode === 'linear' || mode === 'timeskip' || mode === 'simultaneous';
        });
        this.checkDateOrderForGroup(mainTimeline, 'main timeline', warnings);

        // Per-strand date order checks for parallel and frame scenes
        const strandScenes = new Map<string, Scene[]>();
        for (const s of sorted) {
            if ((s.timeline_mode === 'parallel' || s.timeline_mode === 'frame') && s.timeline_strand) {
                const strand = s.timeline_strand;
                const list = strandScenes.get(strand) || [];
                list.push(s);
                strandScenes.set(strand, list);
            }
        }
        for (const [strand, list] of strandScenes) {
            this.checkDateOrderForGroup(list, `strand "${strand}"`, warnings);
        }
    }

    /**
     * Check storyDate ordering within a group of scenes (main timeline or a named strand).
     * Scenes in the same group that are marked 'simultaneous' are allowed to share a date.
     */
    private static checkDateOrderForGroup(scenes: Scene[], groupLabel: string, warnings: PlotWarning[]): void {
        const withDates = scenes.filter(s => s.storyDate);
        for (let i = 1; i < withDates.length; i++) {
            const prev = withDates[i - 1];
            const curr = withDates[i];
            const prevDate = prev.storyDate!;
            const currDate = curr.storyDate!;
            if (currDate < prevDate) {
                // Allow simultaneous scenes to have same or any date
                if (curr.timeline_mode === 'simultaneous' || prev.timeline_mode === 'simultaneous') continue;
                warnings.push({
                    severity: 'warning',
                    category: 'Timeline',
                    message: `Date out of order in ${groupLabel}: "${curr.title}" (${currDate}) comes after "${prev.title}" (${prevDate}) but has an earlier date`,
                    scenePaths: [prev.filePath, curr.filePath],
                });
            }
        }
    }

    // ─── Character Checks ──────────────────────────────────────

    private static checkCharacters(scenes: Scene[], warnings: PlotWarning[]): void {
        // Scenes with no POV
        const noPov = scenes.filter(s => !s.pov);
        if (noPov.length > 0 && noPov.length < scenes.length) {
            warnings.push({
                severity: 'info',
                category: 'Characters',
                message: `${noPov.length} scene(s) have no POV character assigned`,
                scenePaths: noPov.map(s => s.filePath),
            });
        }

        // Characters who appear once then vanish
        const sorted = [...scenes].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
        const charApps = new Map<string, Scene[]>();
        for (const s of sorted) {
            const chars = new Set<string>();
            if (s.pov) chars.add(s.pov.toLowerCase());
            s.characters?.forEach(c => chars.add(c.toLowerCase()));
            for (const c of chars) {
                const list = charApps.get(c) || [];
                list.push(s);
                charApps.set(c, list);
            }
        }

        // Characters that appear only once (suspicious if there are many scenes)
        if (scenes.length >= 5) {
            for (const [char, apps] of charApps) {
                if (apps.length === 1) {
                    warnings.push({
                        severity: 'info',
                        category: 'Characters',
                        message: `Character "${apps[0].pov?.toLowerCase() === char ? apps[0].pov : (apps[0].characters?.find(c => c.toLowerCase() === char) || char)}" appears in only 1 scene ("${apps[0].title}")`,
                        scenePaths: [apps[0].filePath],
                    });
                }
            }
        }

        // Characters who disappear for a long stretch (> 40% of total scenes)
        const GAP_THRESHOLD = Math.max(5, Math.floor(scenes.length * 0.4));
        for (const [char, apps] of charApps) {
            if (apps.length < 2) continue;
            const displayName = apps[0].pov?.toLowerCase() === char
                ? apps[0].pov!
                : (apps[0].characters?.find(c => c.toLowerCase() === char) || char);

            for (let i = 1; i < apps.length; i++) {
                const prevSeq = apps[i - 1].sequence ?? 0;
                const currSeq = apps[i].sequence ?? 0;
                const between = sorted.filter(s =>
                    (s.sequence ?? 0) > prevSeq && (s.sequence ?? 0) < currSeq
                ).length;

                if (between >= GAP_THRESHOLD) {
                    warnings.push({
                        severity: 'warning',
                        category: 'Characters',
                        message: `"${displayName}" disappears for ${between} scenes (between "${apps[i - 1].title}" and "${apps[i].title}")`,
                        scenePaths: [apps[i - 1].filePath, apps[i].filePath],
                    });
                }
            }
        }
    }

    // ─── Plotline Checks ───────────────────────────────────────

    private static checkPlotlines(scenes: Scene[], warnings: PlotWarning[]): void {
        const sorted = [...scenes].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

        // Build per-tag scene lists
        const tagScenes = new Map<string, Scene[]>();
        for (const s of sorted) {
            s.tags?.forEach(t => {
                const list = tagScenes.get(t) || [];
                list.push(s);
                tagScenes.set(t, list);
            });
        }

        // Find the total act range
        const actsUsed = new Set<number>();
        scenes.forEach(s => {
            if (s.act !== undefined) actsUsed.add(Number(s.act));
        });
        const sortedActs = Array.from(actsUsed).sort((a, b) => a - b);

        if (sortedActs.length >= 2) {
            for (const [tag, taggedScenes] of tagScenes) {
                if (taggedScenes.length < 2) continue;

                const tagActs = new Set(taggedScenes.map(s => Number(s.act)));

                // Check if plotline starts but doesn't appear in later acts
                const firstAct = Math.min(...Array.from(tagActs));
                const lastAct = Math.max(...Array.from(tagActs));

                // Missing middle acts
                for (const act of sortedActs) {
                    if (act > firstAct && act < lastAct && !tagActs.has(act)) {
                        warnings.push({
                            severity: 'warning',
                            category: 'Plotlines',
                            message: `Plotline "${tag}" has no scenes in Act ${act} (present in Acts ${firstAct}–${lastAct})`,
                        });
                    }
                }

                // Plotline appears early but doesn't reach the final act
                if (lastAct < sortedActs[sortedActs.length - 1] && taggedScenes.length >= 3) {
                    warnings.push({
                        severity: 'info',
                        category: 'Plotlines',
                        message: `Plotline "${tag}" was last seen in Act ${lastAct} but story continues to Act ${sortedActs[sortedActs.length - 1]}`,
                    });
                }
            }
        }

        // Scenes with no tags at all
        const untagged = scenes.filter(s => !s.tags || s.tags.length === 0);
        if (untagged.length > 0 && untagged.length < scenes.length) {
            warnings.push({
                severity: 'info',
                category: 'Plotlines',
                message: `${untagged.length} scene(s) have no plotline tags`,
                scenePaths: untagged.map(s => s.filePath),
            });
        }
    }

    // ─── Setup / Payoff Checks ─────────────────────────────────

    private static checkSetupPayoff(scenes: Scene[], warnings: PlotWarning[]): void {
        const titleMap = new Map<string, Scene>();
        scenes.forEach(s => titleMap.set(s.title, s));

        for (const scene of scenes) {
            // Check payoff targets exist
            if (scene.payoff_scenes?.length) {
                for (const target of scene.payoff_scenes) {
                    if (!titleMap.has(target)) {
                        warnings.push({
                            severity: 'error',
                            category: 'Setup/Payoff',
                            message: `"${scene.title}" sets up "${target}" but that scene doesn't exist`,
                            scenePaths: [scene.filePath],
                        });
                    }
                }
            }

            // Check setup sources exist
            if (scene.setup_scenes?.length) {
                for (const source of scene.setup_scenes) {
                    if (!titleMap.has(source)) {
                        warnings.push({
                            severity: 'error',
                            category: 'Setup/Payoff',
                            message: `"${scene.title}" references setup scene "${source}" but that scene doesn't exist`,
                            scenePaths: [scene.filePath],
                        });
                    }
                }
            }

            // Check broken reverse links  
            if (scene.payoff_scenes?.length) {
                for (const target of scene.payoff_scenes) {
                    const targetScene = titleMap.get(target);
                    if (targetScene && (!targetScene.setup_scenes || !targetScene.setup_scenes.includes(scene.title))) {
                        warnings.push({
                            severity: 'warning',
                            category: 'Setup/Payoff',
                            message: `"${scene.title}" → "${target}": reverse link missing (target doesn't list this scene as setup)`,
                            scenePaths: [scene.filePath, targetScene.filePath],
                        });
                    }
                }
            }

            // Setup comes AFTER payoff in sequence (wrong order)
            if (scene.payoff_scenes?.length && scene.sequence !== undefined) {
                for (const target of scene.payoff_scenes) {
                    const targetScene = titleMap.get(target);
                    if (targetScene && targetScene.sequence !== undefined && targetScene.sequence < scene.sequence) {
                        warnings.push({
                            severity: 'warning',
                            category: 'Setup/Payoff',
                            message: `Setup "${scene.title}" (seq ${scene.sequence}) comes AFTER its payoff "${target}" (seq ${targetScene.sequence})`,
                            scenePaths: [scene.filePath, targetScene.filePath],
                        });
                    }
                }
            }
        }
    }

    // ─── Structure Checks ──────────────────────────────────────

    private static checkStructure(scenes: Scene[], warnings: PlotWarning[]): void {
        // Missing titles
        const untitled = scenes.filter(s => !s.title || s.title === 'Untitled Scene' || s.title === 'Untitled');
        if (untitled.length > 0) {
            warnings.push({
                severity: 'info',
                category: 'Structure',
                message: `${untitled.length} scene(s) have no title`,
                scenePaths: untitled.map(s => s.filePath),
            });
        }

        // Scenes with no act assignment
        const noAct = scenes.filter(s => s.act === undefined);
        if (noAct.length > 0 && noAct.length < scenes.length) {
            warnings.push({
                severity: 'warning',
                category: 'Structure',
                message: `${noAct.length} scene(s) have no act assigned`,
                scenePaths: noAct.map(s => s.filePath),
            });
        }

        // Act balance — warn if one act has 3x the scenes of another
        const actCounts = new Map<number, number>();
        scenes.forEach(s => {
            if (s.act !== undefined) {
                const a = Number(s.act);
                actCounts.set(a, (actCounts.get(a) || 0) + 1);
            }
        });
        if (actCounts.size >= 2) {
            const counts = Array.from(actCounts.values());
            const maxCount = Math.max(...counts);
            const minCount = Math.min(...counts);
            if (minCount > 0 && maxCount / minCount >= 3) {
                const maxAct = Array.from(actCounts.entries()).find(([, v]) => v === maxCount)![0];
                const minAct = Array.from(actCounts.entries()).find(([, v]) => v === minCount)![0];
                warnings.push({
                    severity: 'info',
                    category: 'Structure',
                    message: `Act imbalance: Act ${maxAct} has ${maxCount} scenes vs Act ${minAct} with ${minCount} scenes (${(maxCount / minCount).toFixed(1)}× ratio)`,
                });
            }
        }

        // Scenes with no conflict defined
        const noConflict = scenes.filter(s => !s.conflict);
        if (noConflict.length > 0 && noConflict.length < scenes.length) {
            const pct = Math.round((noConflict.length / scenes.length) * 100);
            if (pct >= 30) {
                warnings.push({
                    severity: 'info',
                    category: 'Structure',
                    message: `${noConflict.length} scene(s) (${pct}%) have no conflict defined`,
                    scenePaths: noConflict.map(s => s.filePath),
                });
            }
        }
    }

    // ─── Continuity Checks ─────────────────────────────────────

    private static checkContinuity(scenes: Scene[], warnings: PlotWarning[]): void {
        const sorted = [...scenes].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

        // Intensity drops of 6+ points between consecutive scenes (pacing concern)
        // Skip pairs where either scene is dream/mythic (exempt from continuity)
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            if (EXEMPT_FROM_CONTINUITY.has(prev.timeline_mode) || EXEMPT_FROM_CONTINUITY.has(curr.timeline_mode)) continue;
            if (prev.intensity !== undefined && curr.intensity !== undefined) {
                const drop = prev.intensity - curr.intensity;
                if (drop >= 6) {
                    warnings.push({
                        severity: 'info',
                        category: 'Pacing',
                        message: `Sharp intensity drop: "${prev.title}" (${prev.intensity}) → "${curr.title}" (${curr.intensity}), a drop of ${drop} points`,
                        scenePaths: [prev.filePath, curr.filePath],
                    });
                }
            }
        }

        // Long stretch of same emotion (may indicate monotony)
        // Dream/mythic scenes break the streak
        let streakEmotion: string | null = null;
        let streakStart = 0;
        for (let i = 0; i < sorted.length; i++) {
            if (EXEMPT_FROM_CONTINUITY.has(sorted[i].timeline_mode)) {
                streakEmotion = null;
                streakStart = i + 1;
                continue;
            }
            const emotion = sorted[i].emotion?.toLowerCase();
            if (emotion && emotion === streakEmotion) {
                const len = i - streakStart + 1;
                if (len === 5) {
                    warnings.push({
                        severity: 'info',
                        category: 'Pacing',
                        message: `5+ consecutive scenes with emotion "${emotion}" starting at "${sorted[streakStart].title}" — consider varying the tone`,
                        scenePaths: sorted.slice(streakStart, i + 1).map(s => s.filePath),
                    });
                }
            } else {
                streakEmotion = emotion || null;
                streakStart = i;
            }
        }
    }
}
