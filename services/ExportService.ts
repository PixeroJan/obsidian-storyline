import { App, Notice, TFile } from 'obsidian';
import { Scene, STATUS_CONFIG, SceneStatus } from '../models/Scene';
import { StoryLineProject } from '../models/StoryLineProject';
import { SceneManager } from './SceneManager';
import { CharacterManager } from './CharacterManager';
import { LocationManager } from './LocationManager';
import { Character } from '../models/Character';
import { StoryWorld, StoryLocation } from '../models/Location';

export type ExportFormat = 'md' | 'json' | 'pdf' | 'csv';
export type ExportScope = 'manuscript' | 'outline';

/**
 * Export service — generates Markdown, JSON, or PDF exports
 * of the active project's scenes.
 */
export class ExportService {
    private app: App;
    private sceneManager: SceneManager;
    private characterManager: CharacterManager;
    private locationManager: LocationManager;

    constructor(app: App, sceneManager: SceneManager, characterManager: CharacterManager, locationManager: LocationManager) {
        this.app = app;
        this.sceneManager = sceneManager;
        this.characterManager = characterManager;
        this.locationManager = locationManager;
    }

    // ─── Public API ────────────────────────────────────────────

    /**
     * Run an export. Returns the vault-relative path of the created file
     * (for md/json) or opens the print dialog (for pdf).
     */
    async export(format: ExportFormat, scope: ExportScope): Promise<string | void> {
        const project = this.sceneManager.activeProject;
        if (!project) {
            new Notice('No active project');
            return;
        }

        const scenes = this.getSortedScenes();
        if (scenes.length === 0) {
            new Notice('No scenes to export');
            return;
        }

        switch (format) {
            case 'md':
                return this.exportMarkdown(project, scenes, scope);
            case 'json':
                return this.exportJson(project, scenes, scope);
            case 'pdf':
                return this.exportPdf(project, scenes, scope);
            case 'csv':
                return this.exportCsv(project, scenes, scope);
        }
    }

    // ─── Helpers ───────────────────────────────────────────────

    private getSortedScenes(): Scene[] {
        return this.sceneManager.getFilteredScenes(
            undefined,
            { field: 'sequence', direction: 'asc' }
        );
    }

    private timestamp(): string {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // ─── Markdown Export ───────────────────────────────────────

    private async exportMarkdown(
        project: StoryLineProject,
        scenes: Scene[],
        scope: ExportScope,
    ): Promise<string> {
        const lines: string[] = [];
        lines.push(`# ${project.title}`);
        lines.push('');

        if (scope === 'manuscript') {
            this.buildManuscriptMd(lines, scenes);
        } else {
            this.buildOutlineMd(lines, scenes);
        }

        const filename = `${project.title} - ${scope === 'manuscript' ? 'Manuscript' : 'Outline'} (${this.timestamp()}).md`;
        const filePath = await this.writeExportFile(project, filename, lines.join('\n'));
        new Notice(`Exported to ${filename}`);
        return filePath;
    }

    private buildManuscriptMd(lines: string[], scenes: Scene[]): void {
        let currentAct: string | number | undefined;
        let currentChapter: string | number | undefined;

        for (const scene of scenes) {
            // Act heading
            if (scene.act !== undefined && scene.act !== currentAct) {
                currentAct = scene.act;
                lines.push(`## Act ${currentAct}`);
                lines.push('');
                currentChapter = undefined; // reset chapter on act change
            }

            // Chapter heading
            if (scene.chapter !== undefined && scene.chapter !== currentChapter) {
                currentChapter = scene.chapter;
                lines.push(`### Chapter ${currentChapter}`);
                lines.push('');
            }

            // Scene heading
            lines.push(`#### ${scene.title || 'Untitled Scene'}`);
            lines.push('');

            // Scene body
            if (scene.body && scene.body.trim()) {
                lines.push(scene.body.trim());
                lines.push('');
            } else {
                lines.push('*No content yet.*');
                lines.push('');
            }

            lines.push('---');
            lines.push('');
        }
    }

    private buildOutlineMd(lines: string[], scenes: Scene[]): void {
        // Summary stats
        const totalWords = scenes.reduce((sum, s) => sum + (s.wordcount || 0), 0);
        const statusCounts: Record<string, number> = {};
        for (const s of scenes) {
            const st = s.status || 'idea';
            statusCounts[st] = (statusCounts[st] || 0) + 1;
        }

        lines.push(`**Scenes:** ${scenes.length}  `);
        lines.push(`**Total words:** ${totalWords.toLocaleString()}  `);
        const statusLine = Object.entries(statusCounts)
            .map(([s, c]) => `${STATUS_CONFIG[s as SceneStatus]?.label || s}: ${c}`)
            .join(' | ');
        lines.push(`**Status:** ${statusLine}`);
        lines.push('');

        // Scene table
        lines.push('| # | Title | Act | Ch | Chrono | Status | POV | Location | Words | Emotion | Intensity | Conflict | Tags | Timeline Mode | Strand | Notes |');
        lines.push('|---|-------|-----|----|--------|--------|-----|----------|-------|---------|-----------|----------|------|---------------|--------|-------|');

        for (const scene of scenes) {
            const seq = scene.sequence ?? '';
            const title = scene.title || 'Untitled';
            const act = scene.act ?? '';
            const ch = scene.chapter ?? '';
            const chrono = scene.chronologicalOrder ?? '';
            const status = STATUS_CONFIG[scene.status as SceneStatus]?.label || scene.status || '';
            const pov = scene.pov || '';
            const location = (scene.location || '').replace(/\|/g, '/');
            const words = scene.wordcount ?? '';
            const emotion = scene.emotion || '';
            const intensity = scene.intensity ?? '';
            const conflict = (scene.conflict || '').replace(/\|/g, '/');
            const tags = (scene.tags || []).join(', ');
            const notes = (scene.notes || '').replace(/\|/g, '/').replace(/\n/g, ' ');
            const tlMode = scene.timeline_mode || '';
            const tlStrand = scene.timeline_strand || '';
            lines.push(`| ${seq} | ${title} | ${act} | ${ch} | ${chrono} | ${status} | ${pov} | ${location} | ${words} | ${emotion} | ${intensity} | ${conflict} | ${tags} | ${tlMode} | ${tlStrand} | ${notes} |`);
        }

        lines.push('');

        // Characters summary
        const allChars = new Set<string>();
        for (const s of scenes) {
            if (s.pov) allChars.add(s.pov);
            if (s.characters) s.characters.forEach(c => allChars.add(c));
        }
        if (allChars.size > 0) {
            lines.push('## Characters');
            lines.push('');
            const characters = this.characterManager.getAllCharacters();
            if (characters.length > 0) {
                for (const char of characters) {
                    lines.push(`### ${char.name}`);
                    lines.push('');
                    if (char.role) lines.push(`**Role:** ${char.role}  `);
                    if (char.age) lines.push(`**Age:** ${char.age}  `);
                    if (char.occupation) lines.push(`**Occupation:** ${char.occupation}  `);
                    if (char.personality) lines.push(`**Personality:** ${char.personality}  `);
                    if (char.formativeMemories) lines.push(`**Backstory:** ${char.formativeMemories}  `);
                    if (char.startingPoint) lines.push(`**Starting point:** ${char.startingPoint}  `);
                    if (char.goal) lines.push(`**Goal:** ${char.goal}  `);
                    if (char.expectedChange) lines.push(`**Expected change:** ${char.expectedChange}  `);
                    if (char.internalMotivation) lines.push(`**Internal motivation:** ${char.internalMotivation}  `);
                    if (char.externalMotivation) lines.push(`**External motivation:** ${char.externalMotivation}  `);
                    if (char.allies) lines.push(`**Allies:** ${char.allies}  `);
                    if (char.enemies) lines.push(`**Enemies:** ${char.enemies}  `);
                    lines.push('');
                }
            } else {
                lines.push(Array.from(allChars).sort().join(', '));
                lines.push('');
            }
        }

        // Locations & Worlds summary
        const worlds = this.locationManager.getAllWorlds();
        const locations = this.locationManager.getAllLocations();
        if (worlds.length > 0 || locations.length > 0) {
            lines.push('## Worlds & Locations');
            lines.push('');
            for (const world of worlds) {
                lines.push(`### 🌍 ${world.name}`);
                lines.push('');
                if (world.description) lines.push(`${world.description}  `);
                if (world.geography) lines.push(`**Geography:** ${world.geography}  `);
                if (world.culture) lines.push(`**Culture:** ${world.culture}  `);
                if (world.politics) lines.push(`**Politics:** ${world.politics}  `);
                if (world.magicTechnology) lines.push(`**Magic/Technology:** ${world.magicTechnology}  `);
                if (world.history) lines.push(`**History:** ${world.history}  `);
                lines.push('');
                // Locations under this world
                const worldLocs = this.locationManager.getLocationsForWorld(world.name);
                for (const loc of worldLocs) {
                    this.appendLocationMd(lines, loc, '####');
                }
            }
            // Orphan locations
            const orphans = this.locationManager.getOrphanLocations();
            for (const loc of orphans) {
                this.appendLocationMd(lines, loc, '###');
            }
        }

        // Tags / plotlines summary
        const allTags = new Set<string>();
        for (const s of scenes) {
            if (s.tags) s.tags.forEach(t => allTags.add(t));
        }
        if (allTags.size > 0) {
            lines.push('## Plotlines / Tags');
            lines.push('');
            lines.push(Array.from(allTags).sort().join(', '));
            lines.push('');
        }
    }

    private appendLocationMd(lines: string[], loc: StoryLocation, heading: string): void {
        const typeLabel = loc.locationType ? ` (${loc.locationType})` : '';
        lines.push(`${heading} \ud83d\udccd ${loc.name}${typeLabel}`);
        lines.push('');
        if (loc.description) lines.push(`${loc.description}  `);
        if (loc.atmosphere) lines.push(`**Atmosphere:** ${loc.atmosphere}  `);
        if (loc.significance) lines.push(`**Significance:** ${loc.significance}  `);
        if (loc.inhabitants) lines.push(`**Inhabitants:** ${loc.inhabitants}  `);
        if (loc.parent) lines.push(`**Inside:** ${loc.parent}  `);
        lines.push('');
    }

    // ─── JSON Export ───────────────────────────────────────────

    private async exportJson(
        project: StoryLineProject,
        scenes: Scene[],
        scope: ExportScope,
    ): Promise<string> {
        let data: any;

        if (scope === 'manuscript') {
            data = {
                project: project.title,
                exported: new Date().toISOString(),
                scenes: scenes.map(s => ({
                    title: s.title,
                    act: s.act,
                    chapter: s.chapter,
                    sequence: s.sequence,
                    chronologicalOrder: s.chronologicalOrder,
                    body: s.body || '',
                })),
            };
        } else {
            data = {
                project: project.title,
                exported: new Date().toISOString(),
                totalScenes: scenes.length,
                totalWords: scenes.reduce((sum, s) => sum + (s.wordcount || 0), 0),
                scenes: scenes.map(s => ({
                    title: s.title,
                    filePath: s.filePath,
                    act: s.act,
                    chapter: s.chapter,
                    sequence: s.sequence,
                    chronologicalOrder: s.chronologicalOrder,
                    status: s.status,
                    pov: s.pov,
                    characters: s.characters,
                    location: s.location,
                    storyDate: s.storyDate,
                    storyTime: s.storyTime,
                    conflict: s.conflict,
                    emotion: s.emotion,
                    intensity: s.intensity,
                    wordcount: s.wordcount,
                    target_wordcount: s.target_wordcount,
                    tags: s.tags,
                    setup_scenes: s.setup_scenes,
                    payoff_scenes: s.payoff_scenes,
                    notes: s.notes,
                    timeline_mode: s.timeline_mode,
                    timeline_strand: s.timeline_strand,
                })),
                characters: this.characterManager.getAllCharacters().map(c => {
                    const obj: Record<string, any> = { name: c.name };
                    if (c.role) obj.role = c.role;
                    if (c.age) obj.age = c.age;
                    if (c.occupation) obj.occupation = c.occupation;
                    if (c.personality) obj.personality = c.personality;
                    if (c.formativeMemories) obj.backstory = c.formativeMemories;
                    if (c.startingPoint) obj.startingPoint = c.startingPoint;
                    if (c.goal) obj.goal = c.goal;
                    if (c.expectedChange) obj.expectedChange = c.expectedChange;
                    if (c.internalMotivation) obj.internalMotivation = c.internalMotivation;
                    if (c.externalMotivation) obj.externalMotivation = c.externalMotivation;
                    if (c.appearance) obj.appearance = c.appearance;
                    if (c.strengths) obj.strengths = c.strengths;
                    if (c.flaws) obj.flaws = c.flaws;
                    if (c.fears) obj.fears = c.fears;
                    if (c.allies) obj.allies = c.allies;
                    if (c.enemies) obj.enemies = c.enemies;
                    if (c.custom && Object.keys(c.custom).length) obj.custom = c.custom;
                    return obj;
                }),
                worlds: this.locationManager.getAllWorlds().map(w => {
                    const obj: Record<string, any> = { name: w.name };
                    if (w.description) obj.description = w.description;
                    if (w.geography) obj.geography = w.geography;
                    if (w.culture) obj.culture = w.culture;
                    if (w.politics) obj.politics = w.politics;
                    if (w.magicTechnology) obj.magicTechnology = w.magicTechnology;
                    if (w.history) obj.history = w.history;
                    obj.locations = this.locationManager.getLocationsForWorld(w.name).map(l => l.name);
                    return obj;
                }),
                locations: this.locationManager.getAllLocations().map(l => {
                    const obj: Record<string, any> = { name: l.name };
                    if (l.locationType) obj.type = l.locationType;
                    if (l.world) obj.world = l.world;
                    if (l.parent) obj.parent = l.parent;
                    if (l.description) obj.description = l.description;
                    if (l.atmosphere) obj.atmosphere = l.atmosphere;
                    if (l.significance) obj.significance = l.significance;
                    if (l.inhabitants) obj.inhabitants = l.inhabitants;
                    if (l.custom && Object.keys(l.custom).length) obj.custom = l.custom;
                    return obj;
                }),
            };
        }

        const filename = `${project.title} - ${scope === 'manuscript' ? 'Manuscript' : 'Outline'} (${this.timestamp()}).json`;
        const filePath = await this.writeExportFile(project, filename, JSON.stringify(data, null, 2));
        new Notice(`Exported to ${filename}`);
        return filePath;
    }

    // ─── PDF Export (print dialog) ─────────────────────────────

    private async exportPdf(
        project: StoryLineProject,
        scenes: Scene[],
        scope: ExportScope,
    ): Promise<string> {
        const html = this.buildPdfHtml(project, scenes, scope);

        // Save HTML file to Exports folder
        const filename = `${project.title} - ${scope === 'manuscript' ? 'Manuscript' : 'Outline'} (${this.timestamp()}).html`;
        const filePath = await this.writeExportFile(project, filename, html);

        // Also open print dialog for direct PDF save
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            new Notice(`Saved as ${filename} — open it in a browser to print as PDF`);
            return filePath;
        }

        printWindow.document.write(html);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.print();
        }, 400);

        new Notice(`Exported to ${filename}`);
        return filePath;
    }

    private buildPdfHtml(
        project: StoryLineProject,
        scenes: Scene[],
        scope: ExportScope,
    ): string {
        const title = this.escHtml(project.title);
        const body = scope === 'manuscript'
            ? this.buildManuscriptHtml(scenes)
            : this.buildOutlineHtml(scenes);

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
    @page { margin: 2cm; }
    body {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #222;
        max-width: 700px;
        margin: 0 auto;
        padding: 20px;
    }
    h1 { font-size: 24pt; margin-bottom: 0.5em; border-bottom: 2px solid #333; padding-bottom: 0.3em; }
    h2 { font-size: 18pt; margin-top: 1.5em; color: #444; }
    h3 { font-size: 14pt; margin-top: 1.2em; color: #555; }
    h4 { font-size: 12pt; margin-top: 1em; font-style: italic; }
    hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin: 1em 0; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .stats { font-size: 11pt; color: #555; margin-bottom: 1em; }
    .no-content { color: #999; font-style: italic; }
    @media print {
        body { padding: 0; }
        h1 { page-break-after: avoid; }
        h2, h3 { page-break-after: avoid; }
        .scene-block { page-break-inside: avoid; }
    }
</style>
</head>
<body>
<h1>${title}</h1>
${body}
</body>
</html>`;
    }

    private buildManuscriptHtml(scenes: Scene[]): string {
        const parts: string[] = [];
        let currentAct: string | number | undefined;
        let currentChapter: string | number | undefined;

        for (const scene of scenes) {
            if (scene.act !== undefined && scene.act !== currentAct) {
                currentAct = scene.act;
                parts.push(`<h2>Act ${this.escHtml(String(currentAct))}</h2>`);
                currentChapter = undefined;
            }

            if (scene.chapter !== undefined && scene.chapter !== currentChapter) {
                currentChapter = scene.chapter;
                parts.push(`<h3>Chapter ${this.escHtml(String(currentChapter))}</h3>`);
            }

            parts.push('<div class="scene-block">');
            parts.push(`<h4>${this.escHtml(scene.title || 'Untitled Scene')}</h4>`);

            if (scene.body && scene.body.trim()) {
                // Convert basic markdown paragraphs to HTML
                const paragraphs = scene.body.trim().split(/\n{2,}/);
                for (const p of paragraphs) {
                    parts.push(`<p>${this.escHtml(p.trim())}</p>`);
                }
            } else {
                parts.push('<p class="no-content">No content yet.</p>');
            }

            parts.push('</div>');
            parts.push('<hr>');
        }

        return parts.join('\n');
    }

    private buildOutlineHtml(scenes: Scene[]): string {
        const parts: string[] = [];
        const totalWords = scenes.reduce((sum, s) => sum + (s.wordcount || 0), 0);

        parts.push(`<div class="stats">`);
        parts.push(`<strong>Scenes:</strong> ${scenes.length} &nbsp;&bull;&nbsp; <strong>Words:</strong> ${totalWords.toLocaleString()}`);
        parts.push('</div>');

        parts.push('<table>');
        parts.push('<tr><th>#</th><th>Chrono</th><th>Title</th><th>Act</th><th>Ch</th><th>Status</th><th>POV</th><th>Location</th><th>Words</th><th>Emotion</th><th>Mode</th><th>Conflict</th></tr>');

        for (const scene of scenes) {
            parts.push('<tr>');
            parts.push(`<td>${scene.sequence ?? ''}</td>`);
            parts.push(`<td>${scene.chronologicalOrder ?? ''}</td>`);
            parts.push(`<td>${this.escHtml(scene.title || 'Untitled')}</td>`);
            parts.push(`<td>${scene.act ?? ''}</td>`);
            parts.push(`<td>${scene.chapter ?? ''}</td>`);
            parts.push(`<td>${this.escHtml(STATUS_CONFIG[scene.status as SceneStatus]?.label || scene.status || '')}</td>`);
            parts.push(`<td>${this.escHtml(scene.pov || '')}</td>`);
            parts.push(`<td>${this.escHtml(scene.location || '')}</td>`);
            parts.push(`<td>${scene.wordcount ?? ''}</td>`);
            parts.push(`<td>${this.escHtml(scene.emotion || '')}</td>`);
            parts.push(`<td>${this.escHtml(scene.timeline_mode || '')}</td>`);
            parts.push(`<td>${this.escHtml(scene.conflict || '')}</td>`);
            parts.push('</tr>');
        }

        parts.push('</table>');
        return parts.join('\n');
    }

    // ─── CSV Export ────────────────────────────────────────────

    private async exportCsv(
        project: StoryLineProject,
        scenes: Scene[],
        scope: ExportScope,
    ): Promise<string> {
        const rows: string[][] = [];

        if (scope === 'outline') {
            // Header row
            rows.push([
                'Sequence', 'Chronological Order', 'Title', 'Act', 'Chapter', 'Status',
                'POV', 'Location', 'Characters', 'Emotion', 'Intensity',
                'Word Count', 'Target Words', 'Conflict',
                'Tags', 'Story Date', 'Story Time',
                'Setup Scenes', 'Payoff Scenes',
                'Timeline Mode', 'Timeline Strand', 'Notes',
            ]);

            for (const scene of scenes) {
                rows.push([
                    String(scene.sequence ?? ''),
                    String(scene.chronologicalOrder ?? ''),
                    scene.title || 'Untitled',
                    String(scene.act ?? ''),
                    String(scene.chapter ?? ''),
                    STATUS_CONFIG[scene.status as SceneStatus]?.label || scene.status || '',
                    scene.pov || '',
                    scene.location || '',
                    (scene.characters || []).join('; '),
                    scene.emotion || '',
                    String(scene.intensity ?? ''),
                    String(scene.wordcount ?? ''),
                    String(scene.target_wordcount ?? ''),
                    scene.conflict || '',
                    (scene.tags || []).join('; '),
                    scene.storyDate || '',
                    scene.storyTime || '',
                    (scene.setup_scenes || []).join('; '),
                    (scene.payoff_scenes || []).join('; '),
                    scene.timeline_mode || '',
                    scene.timeline_strand || '',
                    scene.notes || '',
                ]);
            }

            // Append character sheet if characters exist
            const characters = this.characterManager.getAllCharacters();
            if (characters.length > 0) {
                rows.push([]);  // blank separator
                rows.push(['--- Characters ---']);
                rows.push([
                    'Name', 'Role', 'Age', 'Occupation', 'Personality',
                    'Backstory', 'Starting Point', 'Goal', 'Expected Change',
                    'Internal Motivation', 'External Motivation', 'Allies', 'Enemies',
                ]);
                for (const c of characters) {
                    rows.push([
                        c.name, c.role || '', String(c.age ?? ''), c.occupation || '',
                        c.personality || '', c.formativeMemories || '', c.startingPoint || '',
                        c.goal || '', c.expectedChange || '',
                        c.internalMotivation || '', c.externalMotivation || '',
                        Array.isArray(c.allies) ? c.allies.join(', ') : (c.allies || ''),
                        Array.isArray(c.enemies) ? c.enemies.join(', ') : (c.enemies || ''),
                    ]);
                }
            }

            // Append location sheet if locations exist
            const locations = this.locationManager.getAllLocations();
            if (locations.length > 0) {
                rows.push([]);
                rows.push(['--- Locations ---']);
                rows.push(['Name', 'Type', 'Description', 'Significance']);
                for (const loc of locations) {
                    rows.push([
                        loc.name, loc.type || '', loc.description || '', loc.significance || '',
                    ]);
                }
            }
        } else {
            // Manuscript scope: title + full body text per row
            rows.push(['Sequence', 'Chronological Order', 'Title', 'Act', 'Chapter', 'Body']);
            for (const scene of scenes) {
                rows.push([
                    String(scene.sequence ?? ''),
                    String(scene.chronologicalOrder ?? ''),
                    scene.title || 'Untitled',
                    String(scene.act ?? ''),
                    String(scene.chapter ?? ''),
                    scene.body || '',
                ]);
            }
        }

        const csv = rows.map(row => row.map(cell => this.csvEscape(cell)).join(',')).join('\r\n');
        const filename = `${project.title} - ${scope === 'manuscript' ? 'Manuscript' : 'Outline'} (${this.timestamp()}).csv`;
        // sep=, hint for Excel locale delimiter detection
        const csvWithBom = 'sep=,\r\n' + csv;
        const filePath = await this.writeCsvExportFile(project, filename, csvWithBom);
        new Notice(`CSV exported → ${filePath}`);
        return filePath;
    }

    /** Escape a cell value for CSV (RFC 4180) */
    private csvEscape(value: string): string {
        if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    // ─── File I/O ──────────────────────────────────────────────

    /**
     * Write a CSV file with explicit UTF-8 BOM bytes via the low-level
     * vault adapter so the BOM is preserved exactly on disk.
     */
    private async writeCsvExportFile(
        project: StoryLineProject,
        filename: string,
        csvContent: string,
    ): Promise<string> {
        // Encode CSV text to UTF-8 bytes
        const encoder = new TextEncoder();
        const csvBytes = encoder.encode(csvContent);

        // Build final buffer: BOM (EF BB BF) + CSV bytes
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const combined = new Uint8Array(bom.length + csvBytes.length);
        combined.set(bom, 0);
        combined.set(csvBytes, bom.length);

        const projectFolder = project.sceneFolder.replace(/\/Scenes\/?$/, '');
        const exportFolder = `${projectFolder}/Exports`;

        // Ensure export folder exists (adapter level)
        if (!(await this.app.vault.adapter.exists(exportFolder))) {
            await this.app.vault.createFolder(exportFolder);
        }

        const filePath = `${exportFolder}/${filename}`;
        // Write raw bytes directly via adapter — bypasses vault caching that may strip BOM
        await this.app.vault.adapter.writeBinary(filePath, combined.buffer);
        return filePath;
    }

    private async writeExportFile(
        project: StoryLineProject,
        filename: string,
        content: string,
    ): Promise<string> {
        // Write into the project's root folder (sibling of Scenes/)
        const projectFolder = project.sceneFolder.replace(/\/Scenes\/?$/, '');
        const exportFolder = `${projectFolder}/Exports`;

        // Ensure folder exists
        const folderExists = this.app.vault.getAbstractFileByPath(exportFolder);
        if (!folderExists) {
            await this.app.vault.createFolder(exportFolder);
        }

        const filePath = `${exportFolder}/${filename}`;

        // Overwrite if exists
        const existing = this.app.vault.getAbstractFileByPath(filePath);
        if (existing instanceof TFile) {
            await this.app.vault.modify(existing, content);
        } else {
            await this.app.vault.create(filePath, content);
        }

        return filePath;
    }

    private escHtml(s: string): string {
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
