import { App, Notice, TFile } from 'obsidian';
import { Scene, STATUS_CONFIG, SceneStatus } from '../models/Scene';
import { StoryLineProject } from '../models/StoryLineProject';
import { SceneManager } from './SceneManager';
import { CharacterManager } from './CharacterManager';
import { LocationManager } from './LocationManager';
import { Character, relationDisplayLabel } from '../models/Character';
import { StoryWorld, StoryLocation } from '../models/Location';
import { SLMarkdownToDocxConverter, SLDocxSettings, SLObsidianFontSettings } from './DocxConverter';
import { SLPdfSettings } from './PdfConverter';

export type ExportFormat = 'md' | 'json' | 'html' | 'csv' | 'docx' | 'pdf';
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

    private docxSettings: SLDocxSettings | null = null;
    private pdfSettings: SLPdfSettings | null = null;

    constructor(app: App, sceneManager: SceneManager, characterManager: CharacterManager, locationManager: LocationManager) {
        this.app = app;
        this.sceneManager = sceneManager;
        this.characterManager = characterManager;
        this.locationManager = locationManager;
    }

    /** Set DOCX export settings (call before exporting to docx) */
    setDocxSettings(settings: SLDocxSettings): void {
        this.docxSettings = settings;
    }

    /** Set PDF export settings (call before exporting to pdf) */
    setPdfSettings(settings: SLPdfSettings): void {
        this.pdfSettings = settings;
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
            case 'html':
                return this.exportPdf(project, scenes, scope);
            case 'csv':
                return this.exportCsv(project, scenes, scope);
            case 'docx':
                return this.exportDocx(project, scenes, scope);
            case 'pdf':
                return this.exportPdfLib(project, scenes, scope);
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

            // Scene body (strip wikilinks for clean export)
            if (scene.body && scene.body.trim()) {
                lines.push(this.stripWikiLinks(scene.body.trim()));
                lines.push('');
            } else {
                lines.push('*No content yet.*');
                lines.push('');
            }

            // (no divider between scenes – the heading structure is sufficient)
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
                    if (Array.isArray(char.relations) && char.relations.length > 0) {
                        for (const relation of char.relations) {
                            lines.push(`**${relationDisplayLabel(relation)}:** ${relation.target}  `);
                        }
                    }
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
                    if (Array.isArray(c.relations) && c.relations.length > 0) obj.relations = c.relations;
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
                // Convert basic markdown paragraphs to HTML (strip wikilinks + tags, convert formatting)
                const cleanBody = this.stripObsidianTags(this.stripWikiLinks(scene.body.trim()));
                const paragraphs = cleanBody.split(/\n{2,}/);
                for (const p of paragraphs) {
                    parts.push(`<p>${this.mdInlineToHtml(p.trim())}</p>`);
                }
            } else {
                parts.push('<p class="no-content">No content yet.</p>');
            }

            parts.push('</div>');
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
                    this.stripWikiLinks(scene.body || ''),
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

    /**
     * Strip Obsidian-style wikilinks from text, keeping only the display name.
     *  - `[[Alias|Display]]`  → `Display`
     *  - `[[Path/To/Note]]`   → `Note`  (last path segment)
     *  - `[[Simple]]`         → `Simple`
     */
    private stripWikiLinks(text: string): string {
        return text.replace(/\[\[([^\]]+)\]\]/g, (_match, inner: string) => {
            if (inner.includes('|')) return inner.split('|').pop()!.trim();
            if (inner.includes('/')) return inner.split('/').pop()!.trim();
            return inner.trim();
        });
    }

    /**
     * Strip Obsidian-style tags (#tag, #PascalTag, #kebab-tag) from text.
     * Preserves heading markers (lines starting with #) and anchor links.
     */
    private stripObsidianTags(text: string): string {
        // Match #word-chars that are NOT at the start of a line (headings)
        // and NOT preceded by & (HTML entities like &#123;)
        return text.replace(/(?<=\s|^)#([\w\-\/]+)/gm, '$1');
    }

    /**
     * Convert inline Markdown formatting to HTML.
     * Handles: **bold**, *italic*, `code`, ~~strikethrough~~, ==highlight==,
     * and single-line breaks → <br>.
     */
    private mdInlineToHtml(text: string): string {
        let s = this.escHtml(text);
        // Bold: **text** or __text__
        s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
        // Italic: *text* or _text_ (but not inside words for _)
        s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
        s = s.replace(/(?<=\s|^)_(.+?)_(?=\s|$)/g, '<em>$1</em>');
        // Inline code: `text`
        s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Strikethrough: ~~text~~
        s = s.replace(/~~(.+?)~~/g, '<s>$1</s>');
        // Highlight: ==text==
        s = s.replace(/==(.+?)==/g, '<mark>$1</mark>');
        // Single newlines → <br>
        s = s.replace(/\n/g, '<br>');
        return s;
    }

    // ─── DOCX Export ──────────────────────────────────────────

    private async exportDocx(
        project: StoryLineProject,
        scenes: Scene[],
        scope: ExportScope,
    ): Promise<string> {
        const settings: SLDocxSettings = this.docxSettings || {
            defaultFontFamily: 'Calibri',
            defaultFontSize: 11,
            includeMetadata: false,
            preserveFormatting: true,
            useObsidianAppearance: false,
            includeFilenameAsHeader: false,
            pageSize: 'A4',
            chunkingThreshold: 100000,
            enablePreprocessing: false,
        };

        const converter = new SLMarkdownToDocxConverter(settings);

        // Build the markdown content (reuse existing builders)
        const lines: string[] = [];
        lines.push(`# ${project.title}`);
        lines.push('');

        if (scope === 'manuscript') {
            this.buildManuscriptMd(lines, scenes);
        } else {
            this.buildOutlineMd(lines, scenes);
        }

        let markdown = lines.join('\n');

        // Strip frontmatter if includeMetadata is false (default)
        if (!settings.includeMetadata) {
            markdown = this.stripFrontmatter(markdown);
        }

        // Get Obsidian font settings if requested
        let obsidianFonts: SLObsidianFontSettings | null = null;
        if (settings.useObsidianAppearance) {
            obsidianFonts = this.getObsidianFontSettings();
        }

        // Create a resource loader for images
        const resourceLoader = async (link: string): Promise<ArrayBuffer | null> => {
            // Try to resolve as a vault file
            const targetFile = this.app.metadataCache.getFirstLinkpathDest(link, '');
            if (!targetFile) return null;
            try {
                return await this.app.vault.readBinary(targetFile);
            } catch {
                return null;
            }
        };

        new Notice('Exporting to Word...');

        const blob = await converter.convert(
            markdown,
            project.title,
            obsidianFonts,
            resourceLoader,
        );

        // Save the DOCX file
        const arrayBuffer = await blob.arrayBuffer();
        const filename = `${project.title} - ${scope === 'manuscript' ? 'Manuscript' : 'Outline'} (${this.timestamp()}).docx`;

        const projectFolder = project.sceneFolder.replace(/\/Scenes\/?$/, '');
        const exportFolder = `${projectFolder}/Exports`;

        if (!(await this.app.vault.adapter.exists(exportFolder))) {
            await this.app.vault.createFolder(exportFolder);
        }

        const filePath = `${exportFolder}/${filename}`;
        await this.app.vault.adapter.writeBinary(filePath, arrayBuffer);

        new Notice(`Exported to ${filename}`, 5000);
        return filePath;
    }

    /** Strip YAML frontmatter (--- ... ---) from markdown content */
    private stripFrontmatter(markdown: string): string {
        if (!markdown.startsWith('---')) return markdown;
        const lines = markdown.split('\n');
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
                // Return everything after the closing --- (skip blank line after it)
                const afterFrontmatter = lines.slice(i + 1).join('\n').replace(/^\n+/, '');
                return afterFrontmatter;
            }
        }
        return markdown; // No closing ---, return as-is
    }

    /** Read Obsidian's computed font settings for DOCX export */
    private getObsidianFontSettings(): SLObsidianFontSettings {
        let editorEl = document.querySelector('.markdown-preview-view, .markdown-source-view');
        if (!editorEl || !(editorEl instanceof HTMLElement)) {
            editorEl = document.body;
        }

        const computedStyle = window.getComputedStyle(editorEl as HTMLElement);

        let textFont = computedStyle.getPropertyValue('--font-text').trim() ||
            computedStyle.getPropertyValue('--default-font').trim() ||
            computedStyle.getPropertyValue('--font-interface').trim();

        if (!textFont || textFont === '') {
            textFont = computedStyle.getPropertyValue('font-family');
        }
        if (textFont) {
            textFont = textFont.replace(/['"]/g, '').split(',')[0].trim();
        }
        if (!textFont || textFont === '') textFont = 'Calibri';

        let monospaceFont = computedStyle.getPropertyValue('--font-monospace').trim() ||
            computedStyle.getPropertyValue('--font-monospace-default').trim() ||
            computedStyle.getPropertyValue('--font-code').trim();

        if (!monospaceFont || monospaceFont === '' || monospaceFont === 'undefined' || monospaceFont === '??' || monospaceFont.includes('??')) {
            monospaceFont = 'Courier New';
        }

        const fontSizeStr = computedStyle.getPropertyValue('--font-text-size') ||
            computedStyle.getPropertyValue('font-size') || '16px';
        const fontSizePx = parseFloat(fontSizeStr);
        const fontSizePt = Math.round(fontSizePx * 0.75);

        const sizeMultiplier = fontSizePt / 11; // Relative to default 11pt

        const lineHeightStr = computedStyle.getPropertyValue('--line-height-normal') ||
            computedStyle.getPropertyValue('line-height') || '1.5';
        const lineHeight = parseFloat(lineHeightStr);

        // Heading sizes
        const headingSizes: number[] = [];
        const headingFonts: string[] = [];
        const headingColors: string[] = [];
        const multipliers = [2.0, 1.6, 1.4, 1.2, 1.1, 1.0];

        for (let i = 1; i <= 6; i++) {
            const selectors = [
                `.markdown-preview-view h${i}`,
                `.cm-header-${i}`,
                `.HyperMD-header-${i}`,
            ];

            let found = false;
            for (const selector of selectors) {
                const headingEl = document.querySelector(selector);
                if (headingEl && headingEl instanceof HTMLElement) {
                    const hStyle = window.getComputedStyle(headingEl);
                    const hFontSizePx = parseFloat(hStyle.getPropertyValue('font-size') || '16px');
                    let hFontSizePt = Math.round(hFontSizePx * 0.75);
                    hFontSizePt = Math.round(hFontSizePt * sizeMultiplier);
                    headingSizes.push(hFontSizePt);
                    headingFonts.push(textFont);
                    headingColors.push(hStyle.getPropertyValue('color') || 'inherit');
                    found = true;
                    break;
                }
            }

            if (!found) {
                headingSizes.push(Math.round(fontSizePt * multipliers[i - 1] * sizeMultiplier));
                headingFonts.push(textFont);
                headingColors.push('inherit');
            }
        }

        return {
            textFont,
            monospaceFont,
            baseFontSize: fontSizePt,
            lineHeight,
            sizeMultiplier,
            headingSizes,
            headingFonts,
            headingColors,
        };
    }

    // ─── PDF Export ──────────────────────────────────────────

    private async exportPdfLib(
        project: StoryLineProject,
        scenes: Scene[],
        scope: ExportScope,
    ): Promise<string> {
        const settings: SLPdfSettings = this.pdfSettings || {
            fontFamily: 'Helvetica',
            fontSize: 11,
            pageSize: 'A4',
            marginTop: 72,
            marginBottom: 72,
            marginLeft: 72,
            marginRight: 72,
            lineSpacing: 1.4,
            includeMetadata: false,
            includePageNumbers: true,
            headerFontSize: 24,
        };

        new Notice('Exporting to PDF...');

        // Uses Electron's <webview>.printToPDF() — Chrome's rendering engine
        // handles all Unicode/fonts natively. Only available on desktop.
        const html = this.buildPdfPrintHtml(project, scenes, scope, settings);
        const pdfBytes = await this.tryElectronPrintToPdf(html, settings);

        if (!pdfBytes) {
            new Notice('PDF export requires the Obsidian desktop app.', 6000);
            return '';
        }

        // Save the PDF file
        const filename = `${project.title} - ${scope === 'manuscript' ? 'Manuscript' : 'Outline'} (${this.timestamp()}).pdf`;

        const projectFolder = project.sceneFolder.replace(/\/Scenes\/?$/, '');
        const exportFolder = `${projectFolder}/Exports`;

        if (!(await this.app.vault.adapter.exists(exportFolder))) {
            await this.app.vault.createFolder(exportFolder);
        }

        const filePath = `${exportFolder}/${filename}`;
        await this.app.vault.adapter.writeBinary(filePath, pdfBytes);

        new Notice(`Exported to ${filename}`, 5000);
        return filePath;
    }

    // ─── Electron printToPDF via <webview> ────────────────────

    /**
     * Attempt to generate a PDF using Electron's <webview>.printToPDF().
     * Returns the PDF bytes on success, or null if not on desktop / webview unavailable.
     */
    private async tryElectronPrintToPdf(html: string, settings: SLPdfSettings): Promise<Uint8Array | null> {
        // Only works in Electron (desktop Obsidian)
        if (typeof (window as any).require !== 'function') return null;

        return new Promise<Uint8Array | null>((resolve) => {
            try {
                const webview = document.createElement('webview') as any;

                // Hide the webview off-screen
                webview.style.position = 'fixed';
                webview.style.left = '-9999px';
                webview.style.top = '-9999px';
                webview.style.width = '1px';
                webview.style.height = '1px';

                // Security: no node integration inside the webview
                webview.setAttribute('nodeintegration', 'false');
                webview.setAttribute('webpreferences', 'contextIsolation=true');

                // Load the HTML as a data URL
                const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
                webview.setAttribute('src', dataUrl);

                const cleanup = () => { try { webview.remove(); } catch { /* noop */ } };

                // Safety timeout (15 s)
                const timer = setTimeout(() => {
                    console.warn('StoryLine PDF: webview printToPDF timed out, falling back to pdf-lib');
                    cleanup();
                    resolve(null);
                }, 15000);

                webview.addEventListener('dom-ready', async () => {
                    try {
                        // Short delay for rendering / images
                        await new Promise(r => setTimeout(r, 500));

                        // Margins are handled via CSS @page in the HTML template
                        // (more reliable than printToPDF margin options across Electron versions).
                        const pdfBuffer = await webview.printToPDF({
                            pageSize: settings.pageSize || 'A4',
                            printBackground: true,
                            preferCSSPageSize: true,
                            displayHeaderFooter: settings.includePageNumbers,
                            headerTemplate: '<span></span>',
                            footerTemplate: settings.includePageNumbers
                                ? '<div style="width:100%;text-align:center;font-size:9px;color:#888;"><span class="pageNumber"></span></div>'
                                : '<span></span>',
                        });

                        clearTimeout(timer);
                        cleanup();
                        resolve(new Uint8Array(pdfBuffer));
                    } catch (e) {
                        console.error('StoryLine PDF: printToPDF failed', e);
                        clearTimeout(timer);
                        cleanup();
                        resolve(null);
                    }
                });

                webview.addEventListener('did-fail-load', () => {
                    clearTimeout(timer);
                    cleanup();
                    resolve(null);
                });

                document.body.appendChild(webview);
            } catch (e) {
                console.error('StoryLine PDF: webview not available', e);
                resolve(null);
            }
        });
    }

    // ─── HTML specifically for printToPDF ─────────────────────

    /**
     * Build a self-contained HTML document tailored for Electron's printToPDF.
     * Uses the PDF settings for font family, font size, line spacing, etc.
     */
    private buildPdfPrintHtml(
        project: StoryLineProject,
        scenes: Scene[],
        scope: ExportScope,
        settings: SLPdfSettings,
    ): string {
        const title = this.escHtml(project.title);
        const body = scope === 'manuscript'
            ? this.buildManuscriptHtml(scenes)
            : this.buildOutlineHtml(scenes);

        // Read font from Obsidian's appearance settings
        const obsFont = this.getObsidianFontSettings();
        const fontFamily = this.escHtml(obsFont.textFont) + ', sans-serif';
        const fontSize = settings.fontSize || obsFont.baseFontSize || 11;
        const lineSpacing = settings.lineSpacing || obsFont.lineHeight || 1.4;

        // Convert pt margins → cm for CSS @page
        const mTop    = ((settings.marginTop    || 72) / 72 * 2.54).toFixed(2);
        const mBottom = ((settings.marginBottom || 72) / 72 * 2.54).toFixed(2);
        const mLeft   = ((settings.marginLeft   || 72) / 72 * 2.54).toFixed(2);
        const mRight  = ((settings.marginRight  || 72) / 72 * 2.54).toFixed(2);

        // Scale heading sizes relative to the base
        const h1Size = Math.round(fontSize * 2.0);
        const h2Size = Math.round(fontSize * 1.6);
        const h3Size = Math.round(fontSize * 1.3);
        const h4Size = Math.round(fontSize * 1.1);

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
    @page {
        size: ${settings.pageSize || 'A4'};
        margin: ${mTop}cm ${mRight}cm ${mBottom}cm ${mLeft}cm;
    }
    * { box-sizing: border-box; }
    body {
        font-family: ${fontFamily};
        font-size: ${fontSize}pt;
        line-height: ${lineSpacing};
        color: #222;
        margin: 0;
        padding: 0;
    }
    h1 { font-size: ${h1Size}pt; margin: 0 0 0.5em 0; border-bottom: 2px solid #333; padding-bottom: 0.3em; }
    h2 { font-size: ${h2Size}pt; margin-top: 1.5em; color: #444; }
    h3 { font-size: ${h3Size}pt; margin-top: 1.2em; color: #555; }
    h4 { font-size: ${h4Size}pt; margin-top: 1em; font-style: italic; }
    p  { margin: 0 0 0.5em 0; }
    hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
    table { width: 100%; border-collapse: collapse; font-size: ${Math.round(fontSize * 0.9)}pt; margin: 1em 0; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .stats { font-size: ${Math.round(fontSize * 0.95)}pt; color: #555; margin-bottom: 1em; }
    .no-content { color: #999; font-style: italic; }
    .scene-block { page-break-inside: avoid; }
    h1 { page-break-after: avoid; }
    h2, h3 { page-break-after: avoid; }
</style>
</head>
<body>
<h1>${title}</h1>
${body}
</body>
</html>`;
    }
}
