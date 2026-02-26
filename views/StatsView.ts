import { ItemView, WorkspaceLeaf } from 'obsidian';
import { STATUS_CONFIG, SceneStatus } from '../models/Scene';
import { SceneManager } from '../services/SceneManager';
import { Validator, PlotWarning, WarningSeverity } from '../services/Validator';
import { renderViewSwitcher } from '../components/ViewSwitcher';
import * as obsidian from 'obsidian';
import type SceneCardsPlugin from '../main';
import type { WritingTracker } from '../services/WritingTracker';

import { STATS_VIEW_TYPE } from '../constants';
import { applyMobileClass } from '../components/MobileAdapter';

/**
 * Statistics Dashboard View
 */
export class StatsView extends ItemView {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;
    private rootContainer: HTMLElement | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin, sceneManager: SceneManager) {
        super(leaf);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
    }

    getViewType(): string {
        return STATS_VIEW_TYPE;
    }

    getDisplayText(): string {
        const title = this.plugin?.sceneManager?.activeProject?.title;
        return title ? `StoryLine - ${title}` : 'StoryLine';
    }

    getIcon(): string {
        return 'bar-chart-2';
    }

    async onOpen(): Promise<void> {
        this.plugin.storyLeaf = this.leaf;
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('story-line-stats-container');
        applyMobileClass(container);
        this.rootContainer = container;

        await this.sceneManager.initialize();
        this.renderView(container);
    }

    async onClose(): Promise<void> {}

    private renderView(container: HTMLElement): void {
        container.empty();

        // Toolbar
        const toolbar = container.createDiv('story-line-toolbar');
        const titleRow = toolbar.createDiv('story-line-title-row');
        titleRow.createEl('h3', { cls: 'story-line-view-title', text: 'StoryLine' });
        // project name shown in top-center only; no inline project selector here

        // View switcher tabs
        renderViewSwitcher(toolbar, STATS_VIEW_TYPE, this.plugin, this.leaf);

        const content = container.createDiv('story-line-stats-content');
        const stats = this.sceneManager.getStatistics();

        // Total scenes
        const overviewSection = content.createDiv('stats-section');
        overviewSection.createEl('h4', { text: 'Overview' });
        overviewSection.createEl('p', {
            cls: 'stats-big-number',
            text: `Total Scenes: ${stats.totalScenes}`
        });

        // Writing Sprint / Velocity
        this.renderWritingSprint(content, stats.totalWords);

        // Status breakdown
        const statusSection = content.createDiv('stats-section');
        statusSection.createEl('h4', { text: 'Status Breakdown' });
        const statusList = statusSection.createEl('ul', { cls: 'stats-list' });

        const allStatuses: SceneStatus[] = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];
        allStatuses.forEach(status => {
            const count = stats.statusCounts[status] || 0;
            const percent = stats.totalScenes > 0
                ? Math.round((count / stats.totalScenes) * 100)
                : 0;
            const cfg = STATUS_CONFIG[status];
            const li = statusList.createEl('li');
            const liContent = li.createSpan({ cls: 'stats-status-entry' });
            const iconEl = liContent.createSpan({ cls: 'stats-status-icon' });
            obsidian.setIcon(iconEl, cfg.icon);
            liContent.createSpan({ text: ` ${cfg.label}: ${count} (${percent}%)` });

            // Bar
            const bar = li.createDiv('stats-bar');
            const fill = bar.createDiv('stats-bar-fill');
            fill.style.width = `${percent}%`;
            fill.style.backgroundColor = cfg.color;
        });

        // Word count
        const wordSection = content.createDiv('stats-section');
        wordSection.createEl('h4', { text: 'Word Count' });
        const totalTarget = this.plugin.settings.projectWordGoal || stats.totalTargetWords || 80000;
        const wordPercent = Math.round((stats.totalWords / totalTarget) * 100);
        wordSection.createEl('p', {
            text: `${stats.totalWords.toLocaleString()} / ${totalTarget.toLocaleString()} (${wordPercent}%)`
        });
        const wcBar = wordSection.createDiv('stats-bar stats-bar-wide');
        const wcFill = wcBar.createDiv('stats-bar-fill');
        wcFill.style.width = `${Math.min(100, wordPercent)}%`;
        wcFill.style.backgroundColor = 'var(--sl-success, #4CAF50)';

        // Act balance
        const actSection = content.createDiv('stats-section');
        actSection.createEl('h4', { text: 'Act Balance' });
        const actEntries = Object.entries(stats.actCounts)
            .sort(([a], [b]) => a.localeCompare(b));
        actEntries.forEach(([act, count]) => {
            const percent = stats.totalScenes > 0
                ? Math.round((count / stats.totalScenes) * 100)
                : 0;
            const row = actSection.createDiv('stats-row');
            row.createSpan({ text: `${act}: ${count} scenes` });
            const bar = row.createDiv('stats-bar');
            const fill = bar.createDiv('stats-bar-fill');
            fill.style.width = `${percent}%`;
            row.createSpan({ cls: 'stats-percent', text: `${percent}%` });
        });

        // --- Pacing Analysis ---
        this.renderPacingAnalysis(content);

        // POV distribution
        const povSection = content.createDiv('stats-section');
        povSection.createEl('h4', { text: 'POV Distribution' });
        const povEntries = Object.entries(stats.povCounts)
            .sort(([, a], [, b]) => b - a);
        povEntries.forEach(([pov, count]) => {
            const percent = stats.totalScenes > 0
                ? Math.round((count / stats.totalScenes) * 100)
                : 0;
            const row = povSection.createDiv('stats-row');
            row.createSpan({ text: `${pov}: ${count} scenes (${percent}%)` });
            const bar = row.createDiv('stats-bar');
            const fill = row.createDiv('stats-bar-fill');
            fill.style.width = `${percent}%`;
        });

        // Top locations
        const locSection = content.createDiv('stats-section');
        locSection.createEl('h4', { text: 'Top Locations' });
        const locEntries = Object.entries(stats.locationCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
        if (locEntries.length > 0) {
            const locList = locSection.createEl('ul', { cls: 'stats-list' });
            locEntries.forEach(([loc, count]) => {
                locList.createEl('li', { text: `${loc}: ${count} scenes` });
            });
        } else {
            locSection.createEl('p', { text: 'No location data' });
        }

        // Warnings / Plot Hole Detection
        const warningSection = content.createDiv('stats-section');
        warningSection.createEl('h4', { text: 'Warnings & Plot Hole Detection' });

        const allScenes = this.sceneManager.getAllScenes();

        if (this.plugin.settings.enablePlotHoleDetection && allScenes.length > 0) {
            const warnings = Validator.validate(allScenes);

            if (warnings.length === 0) {
                const ok = warningSection.createDiv('stats-ok');
                const okIcon = ok.createSpan();
                obsidian.setIcon(okIcon, 'check-circle');
                ok.createSpan({ text: ' No issues detected' });
            } else {
                // Group by category
                const byCategory = new Map<string, PlotWarning[]>();
                for (const w of warnings) {
                    const list = byCategory.get(w.category) || [];
                    list.push(w);
                    byCategory.set(w.category, list);
                }

                // Summary counts
                const errorCount = warnings.filter(w => w.severity === 'error').length;
                const warnCount = warnings.filter(w => w.severity === 'warning').length;
                const infoCount = warnings.filter(w => w.severity === 'info').length;

                const summary = warningSection.createDiv('stats-warning-summary');
                if (errorCount > 0) summary.createSpan({ cls: 'stats-severity-error', text: `${errorCount} error${errorCount > 1 ? 's' : ''}` });
                if (warnCount > 0) summary.createSpan({ cls: 'stats-severity-warning', text: `${warnCount} warning${warnCount > 1 ? 's' : ''}` });
                if (infoCount > 0) summary.createSpan({ cls: 'stats-severity-info', text: `${infoCount} info` });

                for (const [category, catWarnings] of byCategory) {
                    const catSection = warningSection.createDiv('stats-warning-category');
                    catSection.createEl('h5', { text: category });
                    const list = catSection.createEl('ul', { cls: 'stats-list stats-warning-list' });
                    for (const w of catWarnings) {
                        const li = list.createEl('li', { cls: `stats-severity-${w.severity}` });
                        const icon = li.createSpan({ cls: 'stats-warning-icon' });
                        switch (w.severity) {
                            case 'error': obsidian.setIcon(icon, 'x-circle'); break;
                            case 'warning': obsidian.setIcon(icon, 'alert-triangle'); break;
                            case 'info': obsidian.setIcon(icon, 'info'); break;
                        }
                        li.createSpan({ text: ` ${w.message}` });
                    }
                }
            }
        } else if (allScenes.length === 0) {
            warningSection.createEl('p', { text: 'No scenes to analyze.' });
        } else {
            warningSection.createEl('p', {
                cls: 'stats-ok',
                text: 'Plot hole detection is disabled. Enable it in Settings → Advanced.'
            });
        }

        // Tension curve (if intensity data exists)
        const scenes = this.sceneManager.getFilteredScenes(
            undefined,
            { field: 'sequence', direction: 'asc' }
        );
        const intensityScenes = scenes.filter(s => s.intensity !== undefined);
        if (intensityScenes.length > 2) {
            this.renderTensionCurve(content, intensityScenes);
        }
    }

    /**
     * Render pacing analysis — average scene length per act + word-count distribution chart
     */
    private renderPacingAnalysis(container: HTMLElement): void {
        const allScenes = this.sceneManager.getAllScenes();
        if (allScenes.length === 0) return;

        // --- Average scene length per act ---
        const pacingSection = container.createDiv('stats-section');
        pacingSection.createEl('h4', { text: 'Pacing Analysis' });

        // Group scenes by act and compute average word count
        const actWordMap: Record<string, { total: number; count: number }> = {};
        for (const scene of allScenes) {
            const actKey = scene.act !== undefined ? `Act ${scene.act}` : 'No Act';
            if (!actWordMap[actKey]) actWordMap[actKey] = { total: 0, count: 0 };
            actWordMap[actKey].total += scene.wordcount || 0;
            actWordMap[actKey].count += 1;
        }

        const actEntries = Object.entries(actWordMap).sort(([a], [b]) => a.localeCompare(b));
        const maxAvg = Math.max(...actEntries.map(([, v]) => v.count > 0 ? v.total / v.count : 0), 1);

        const avgTable = pacingSection.createDiv('pacing-avg-table');
        for (const [act, data] of actEntries) {
            const avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
            const pct = (avg / maxAvg) * 100;
            const row = avgTable.createDiv('pacing-avg-row');
            row.createSpan({ cls: 'pacing-avg-label', text: act });
            row.createSpan({ cls: 'pacing-avg-value', text: `${avg.toLocaleString()} avg words (${data.count} scene${data.count !== 1 ? 's' : ''})` });
            const bar = row.createDiv('stats-bar');
            const fill = bar.createDiv('stats-bar-fill');
            fill.style.width = `${pct}%`;
            fill.style.backgroundColor = 'var(--sl-info, #2196F3)';
        }

        // --- Word-count distribution histogram ---
        const distSection = container.createDiv('stats-section');
        distSection.createEl('h4', { text: 'Word Count Distribution' });

        // Collect word counts and bucket them
        const wordCounts = allScenes.map(s => s.wordcount || 0);
        const maxWc = Math.max(...wordCounts, 1);

        // Choose sensible bucket size
        let bucketSize: number;
        if (maxWc <= 500) bucketSize = 100;
        else if (maxWc <= 2000) bucketSize = 250;
        else if (maxWc <= 5000) bucketSize = 500;
        else bucketSize = 1000;

        const buckets: { label: string; count: number }[] = [];
        const numBuckets = Math.ceil(maxWc / bucketSize) || 1;
        for (let i = 0; i < numBuckets; i++) {
            const lo = i * bucketSize;
            const hi = lo + bucketSize;
            const count = wordCounts.filter(wc => wc >= lo && wc < hi).length;
            buckets.push({ label: `${lo}–${hi}`, count });
        }

        const maxBucket = Math.max(...buckets.map(b => b.count), 1);

        const chart = distSection.createDiv('pacing-dist-chart');
        for (const bucket of buckets) {
            const col = chart.createDiv('pacing-dist-col');
            const heightPct = (bucket.count / maxBucket) * 100;
            const bar = col.createDiv('pacing-dist-bar');
            bar.style.height = `${Math.max(2, heightPct)}%`;
            bar.setAttribute('title', `${bucket.label} words: ${bucket.count} scene${bucket.count !== 1 ? 's' : ''}`);
            const countLabel = col.createDiv('pacing-dist-count');
            countLabel.textContent = String(bucket.count);
            const rangeLabel = col.createDiv('pacing-dist-label');
            rangeLabel.textContent = bucket.label;
        }
    }

    /**
     * Render a Writing Sprint / Velocity section
     */
    private renderWritingSprint(container: HTMLElement, currentTotalWords: number): void {
        const tracker = this.plugin.writingTracker;
        const section = container.createDiv('stats-section');
        section.createEl('h4', { text: 'Writing Sprint' });

        const sessionWords = tracker.getSessionWords(currentTotalWords);
        const wpm = tracker.getWordsPerMinute(currentTotalWords);
        const durationMs = tracker.getSessionDuration();
        const minutes = Math.floor(durationMs / 60_000);
        const dailyGoal = this.plugin.settings.dailyWordGoal || 1000;
        const todayWords = tracker.getTodayWords() + sessionWords;
        const streak = tracker.getStreak();

        // Session stats row
        const sessionRow = section.createDiv('stats-sprint-row');
        this.createStatCard(sessionRow, 'pencil', 'Session', `${sessionWords.toLocaleString()} words`);
        this.createStatCard(sessionRow, 'clock', 'Duration', `${minutes} min`);
        this.createStatCard(sessionRow, 'zap', 'Speed', `${wpm} wpm`);
        if (streak > 0) {
            this.createStatCard(sessionRow, 'flame', 'Streak', `${streak} day${streak > 1 ? 's' : ''}`);
        }

        // Daily goal progress
        const goalPercent = Math.min(100, Math.round((todayWords / dailyGoal) * 100));
        const goalRow = section.createDiv('stats-sprint-goal');
        goalRow.createSpan({ text: `Today: ${todayWords.toLocaleString()} / ${dailyGoal.toLocaleString()} words (${goalPercent}%)` });
        const goalBar = goalRow.createDiv('stats-bar stats-bar-wide');
        const goalFill = goalBar.createDiv('stats-bar-fill');
        goalFill.style.width = `${goalPercent}%`;
        goalFill.style.backgroundColor = goalPercent >= 100 ? 'var(--sl-success, #4CAF50)' : 'var(--sl-info, #2196F3)';

        // Weekly sparkline — last 7 days
        const recent = tracker.getRecentDays(7).reverse(); // oldest first
        const maxDay = Math.max(...recent.map(d => d.words), 1);
        const sparkSection = section.createDiv('stats-sprint-sparkline');
        sparkSection.createSpan({ cls: 'stats-sprint-sparkline-label', text: 'Last 7 days:' });
        const sparkRow = sparkSection.createDiv('stats-sprint-spark-row');
        for (const day of recent) {
            const col = sparkRow.createDiv('stats-sprint-spark-col');
            const heightPct = (day.words / maxDay) * 100;
            const bar = col.createDiv('stats-sprint-spark-bar');
            bar.style.height = `${Math.max(2, heightPct)}%`;
            bar.setAttribute('title', `${day.date}: ${day.words} words`);
            const label = col.createDiv('stats-sprint-spark-label');
            label.textContent = day.date.slice(5); // MM-DD
        }
    }

    /** Small stat card helper */
    private createStatCard(parent: HTMLElement, icon: string, label: string, value: string): void {
        const card = parent.createDiv('stats-sprint-card');
        const iconEl = card.createSpan({ cls: 'stats-sprint-card-icon' });
        obsidian.setIcon(iconEl, icon);
        card.createDiv({ cls: 'stats-sprint-card-value', text: value });
        card.createDiv({ cls: 'stats-sprint-card-label', text: label });
    }

    /**
     * Render a simple ASCII-like tension curve using div bars
     */
    private renderTensionCurve(container: HTMLElement, scenes: { title: string; intensity?: number; act?: number | string }[]): void {
        const section = container.createDiv('stats-section');
        section.createEl('h4', { text: 'Tension Curve' });

        const chart = section.createDiv('tension-chart');
        const maxIntensity = 10;

        scenes.forEach(scene => {
            const col = chart.createDiv('tension-col');
            const intensity = scene.intensity || 0;
            const heightPercent = (intensity / maxIntensity) * 100;

            const bar = col.createDiv('tension-bar');
            bar.style.height = `${heightPercent}%`;
            bar.setAttribute('title', `${scene.title || 'Untitled'}: ${intensity}/10`);

            col.createDiv({
                cls: 'tension-label',
                text: String(intensity),
            });
        });
    }

    /**
     * Public refresh called by the plugin on file changes
     */
    refresh(): void {
        if (this.rootContainer) {
            this.renderView(this.rootContainer);
        }
    }
}
