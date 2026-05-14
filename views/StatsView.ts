/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { SceneManager } from '../services/SceneManager';
import { renderViewSwitcher } from '../components/ViewSwitcher';
import * as obsidian from 'obsidian';
import type SceneCardsPlugin from '../main';
import type { WritingTracker } from '../services/WritingTracker';

import { STATS_VIEW_TYPE } from '../constants';
import { applyMobileClass } from '../components/MobileAdapter';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Scene, getStatusOrder, resolveStatusCfg } from '../models/Scene';
import { PlotWarning, Validator } from '../services/Validator';
import { DEFAULT_STORYLINE_LOCALE, getReadingWordsPerMinute, isCjkStoryLineLocale, tokenizeWords } from '../utils/locale';

/**
 * Statistics Dashboard View
 */
export class StatsView extends ItemView {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;
    private rootContainer: HTMLElement | null = null;
    private proseCache: { readability: ReadabilityResult; wordFreq: [string, number][] } | null = null;
    private echoCache: { echoes: EchoCluster[]; perScene: SceneEchoReport[] } | null = null;
    private sprintTimerId: number | null = null;

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

    async onClose(): Promise<void> {
        if (this.sprintTimerId) { window.clearInterval(this.sprintTimerId); this.sprintTimerId = null; }
    }

    // ════════════════════════════════════════════════════
    //  Main render
    // ════════════════════════════════════════════════════

    private renderView(container: HTMLElement): void {
        container.empty();

        // Toolbar
        const toolbar = container.createDiv('story-line-toolbar');
        const titleRow = toolbar.createDiv('story-line-title-row');
        titleRow.createEl('h3', { cls: 'story-line-view-title', text: 'StoryLine' });

        renderViewSwitcher(toolbar, STATS_VIEW_TYPE, this.plugin, this.leaf);

        const content = container.createDiv('story-line-stats-content');
        const stats = this.sceneManager.queryService.getStatistics();
        const allScenes = this.sceneManager.getAllScenes();

        // 1. Overview (always open)
        this.renderOverview(content, stats);

        // 2. Writing Sprint (always open)
        this.renderWritingSprint(content, stats.totalWords);

        // 3. Writing History (collapsible, default open)
        this.renderCollapsible(content, 'calendar', 'Writing History', true, body =>
            this.renderWritingHistory(body));

        // 4. Progress Breakdown (collapsible, default open)
        this.renderCollapsible(content, 'list-checks', 'Progress Breakdown', true, body =>
            this.renderProgressBreakdown(body, stats, allScenes));

        // 5. Characters & World (collapsible, default collapsed)
        this.renderCollapsible(content, 'users', 'Characters & World', false, body =>
            this.renderCharactersWorld(body, stats, allScenes));

        // 5b. Setup & Payoff Map (collapsible, default collapsed)
        this.renderCollapsible(content, 'link', 'Setup & Payoff Map', false, body =>
            this.renderSetupPayoffMap(body, allScenes));

        // 6. Pacing & Tension (collapsible, default collapsed)
        this.renderCollapsible(content, 'activity', 'Pacing & Tension', false, body =>
            this.renderPacingTension(body, allScenes));

        // 7. Prose Analysis (collapsible, default collapsed — lazy)
        this.renderCollapsible(content, 'text', 'Prose Analysis', false, body =>
            this.renderProseAnalysisPlaceholder(body, allScenes));

        // 7b. Echo Finder (collapsible, default collapsed — lazy)
        this.renderCollapsible(content, 'repeat', 'Echo Finder', false, body =>
            this.renderEchoFinderPlaceholder(body, allScenes));

        // 8. Warnings & Plot Holes (collapsible, default collapsed)
        this.renderCollapsible(content, 'alert-triangle', 'Warnings & Plot Holes', false, body =>
            this.renderWarnings(body, allScenes));
    }

    // ════════════════════════════════════════════════════
    //  Collapsible section helper
    // ════════════════════════════════════════════════════

    private renderCollapsible(
        parent: HTMLElement,
        icon: string,
        title: string,
        defaultOpen: boolean,
        renderFn: (body: HTMLElement) => void,
    ): void {
        const details = parent.createEl('details', { cls: 'stats-collapsible' });
        if (defaultOpen) details.setAttribute('open', '');
        const summary = details.createEl('summary', { cls: 'stats-collapsible-summary' });
        const iconEl = summary.createSpan({ cls: 'stats-collapsible-icon' });
        obsidian.setIcon(iconEl, icon);
        summary.createSpan({ text: title });
        const body = details.createDiv('stats-collapsible-body');
        renderFn(body);
    }

    // ════════════════════════════════════════════════════
    //  1. Overview
    // ════════════════════════════════════════════════════

    private renderOverview(
        parent: HTMLElement,
        stats: ReturnType<SceneManager['getStatistics']>,
    ): void {
        const section = parent.createDiv('stats-section');
        section.createEl('h4', { text: 'Overview' });

        const row = section.createDiv('stats-sprint-row');
        this.createStatCard(row, 'file-text', 'Scenes', String(stats.totalScenes));
        this.createStatCard(row, 'pen-tool', 'Words', stats.totalWords.toLocaleString());

        // Estimated reading time
        const locale = this.sceneManager.activeProject?.locale ?? DEFAULT_STORYLINE_LOCALE;
        const readMinutes = Math.round(stats.totalWords / getReadingWordsPerMinute(locale));
        const readH = Math.floor(readMinutes / 60);
        const readM = readMinutes % 60;
        this.createStatCard(row, 'book-open', 'Read Time',
            readH > 0 ? `${readH}h ${readM}m` : `${readMinutes}m`);

        // Word-goal progress bar
        const totalTarget = this.plugin.settings.projectWordGoal || stats.totalTargetWords || 80000;
        const wordPct = Math.round((stats.totalWords / totalTarget) * 100);
        const goalRow = section.createDiv('stats-sprint-goal');
        goalRow.createSpan({
            text: `${stats.totalWords.toLocaleString()} / ${totalTarget.toLocaleString()} words (${wordPct}%)`,
        });
        const bar = goalRow.createDiv('stats-bar stats-bar-wide');
        const fill = bar.createDiv('stats-bar-fill');
        fill.setCssStyles({
            width: `${Math.min(100, wordPct)}%`,
            backgroundColor: 'var(--sl-success, #4CAF50)',
        });

        // Pace-to-deadline projection
        const tracker = this.plugin.writingTracker;
        const history = tracker.getFullHistory();
        const activeDays = Object.entries(history).filter(([, w]) => w > 0);
        if (activeDays.length >= 3) {
            const totalHistWords = activeDays.reduce((s, [, w]) => s + w, 0);
            const avgDaily = Math.round(totalHistWords / activeDays.length);
            const remaining = Math.max(0, totalTarget - stats.totalWords);
            if (remaining > 0 && avgDaily > 0) {
                const daysLeft = Math.ceil(remaining / avgDaily);
                const finishDate = new Date();
                finishDate.setDate(finishDate.getDate() + daysLeft);
                const dateStr = finishDate.toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric',
                });
                section.createDiv({
                    cls: 'stats-pace-projection',
                    text: `${remaining.toLocaleString()} words remaining · ~${daysLeft} days at `
                        + `${avgDaily.toLocaleString()} words/day · est. ${dateStr}`,
                });
            }
        }
    }

    // ════════════════════════════════════════════════════
    //  2. Writing Sprint
    // ════════════════════════════════════════════════════

    private renderWritingSprint(parent: HTMLElement, currentTotalWords: number): void {
        const tracker = this.plugin.writingTracker;
        const section = parent.createDiv('stats-section');
        section.createEl('h4', { text: 'Writing Sprint' });

        // ── Sprint Timer Controls ──────────────────────
        const sprintPanel = section.createDiv('stats-sprint-controls');

        // Duration selector
        const durationRow = sprintPanel.createDiv('stats-sprint-duration-row');
        durationRow.createSpan({ cls: 'stats-sprint-duration-label', text: 'Duration:' });
        const durationInput = durationRow.createEl('input', {
            cls: 'stats-sprint-duration-input',
            attr: { type: 'number', min: '1', max: '120', step: '1' },
        });
        durationInput.value = String(Math.round(tracker.getSprintDuration() / 60_000));
        durationInput.addEventListener('change', () => {
            const mins = Math.max(1, Math.min(120, Number(durationInput.value) || 25));
            durationInput.value = String(mins);
            tracker.setSprintDuration(mins * 60_000);
        });
        durationRow.createSpan({ cls: 'stats-sprint-duration-unit', text: 'min' });

        // Timer display
        const timerEl = sprintPanel.createDiv('stats-sprint-timer');
        const timerDisplay = timerEl.createSpan({ cls: 'stats-sprint-timer-display' });
        const sprintWordsEl = timerEl.createSpan({ cls: 'stats-sprint-timer-words' });
        const sprintWpmEl = timerEl.createSpan({ cls: 'stats-sprint-timer-wpm' });

        // Buttons
        const btnRow = sprintPanel.createDiv('stats-sprint-btn-row');
        const startBtn = btnRow.createEl('button', { cls: 'stats-sprint-btn stats-sprint-btn-start', text: 'Start' });
        const stopBtn = btnRow.createEl('button', { cls: 'stats-sprint-btn stats-sprint-btn-stop', text: 'Stop' });
        const resetBtn = btnRow.createEl('button', { cls: 'stats-sprint-btn stats-sprint-btn-reset', text: 'Reset' });

        // Track whether the sprint-end chime has fired for this sprint
        let sprintEndChimePlayed = false;

        const updateTimerDisplay = () => {
            const stats = this.sceneManager.queryService.getStatistics();
            const totalNow = stats.totalWords;
            if (tracker.isSprintRunning()) {
                const remaining = tracker.getSprintRemaining();
                const mins = Math.floor(remaining / 60_000);
                const secs = Math.floor((remaining % 60_000) / 1000);
                timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                timerDisplay.classList.toggle('stats-sprint-timer-overtime', remaining === 0);
                if (remaining === 0) {
                    // Play chime once when sprint reaches zero
                    if (!sprintEndChimePlayed && this.plugin.settings.sprintEndSound) {
                        sprintEndChimePlayed = true;
                        this.playSprintEndChime();
                    }
                    const overtime = tracker.getSprintElapsed() - tracker.getSprintDuration();
                    const oMins = Math.floor(overtime / 60_000);
                    const oSecs = Math.floor((overtime % 60_000) / 1000);
                    timerDisplay.textContent = `+${String(oMins).padStart(2, '0')}:${String(oSecs).padStart(2, '0')}`;
                }
                sprintWordsEl.textContent = `${tracker.getSprintWords(totalNow).toLocaleString()} words`;
                sprintWpmEl.textContent = `${tracker.getSprintWpm(totalNow)} wpm`;
                startBtn.disabled = true;
                stopBtn.disabled = false;
                durationInput.disabled = true;
            } else {
                const dur = tracker.getSprintDuration();
                const mins = Math.floor(dur / 60_000);
                const secs = Math.floor((dur % 60_000) / 1000);
                timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                timerDisplay.classList.remove('stats-sprint-timer-overtime');
                sprintWordsEl.textContent = '';
                sprintWpmEl.textContent = '';
                startBtn.disabled = false;
                stopBtn.disabled = true;
                durationInput.disabled = false;
            }
        };

        startBtn.addEventListener('click', () => {
            sprintEndChimePlayed = false;
            const stats = this.sceneManager.queryService.getStatistics();
            tracker.startSprint(stats.totalWords);
            if (this.sprintTimerId) window.clearInterval(this.sprintTimerId);
            this.sprintTimerId = window.setInterval(updateTimerDisplay, 1000);
            updateTimerDisplay();
        });

        stopBtn.addEventListener('click', () => {
            const stats = this.sceneManager.queryService.getStatistics();
            const entry = tracker.stopSprint(stats.totalWords);
            if (this.sprintTimerId) { window.clearInterval(this.sprintTimerId); this.sprintTimerId = null; }
            updateTimerDisplay();
            // Persist and re-render to show updated log
            this.plugin.saveProjectSystemData();
            this.renderSprintLog(logSection, tracker);
            if (entry) {
                new obsidian.Notice(`Sprint complete: ${entry.words} words in ${Math.round(entry.durationMs / 60_000)} min (${entry.wpm} wpm)`);
            }
        });

        resetBtn.addEventListener('click', () => {
            tracker.resetSprint();
            if (this.sprintTimerId) { window.clearInterval(this.sprintTimerId); this.sprintTimerId = null; }
            updateTimerDisplay();
        });

        // Restore timer tick if sprint is still running (view re-opened)
        if (tracker.isSprintRunning()) {
            if (this.sprintTimerId) window.clearInterval(this.sprintTimerId);
            this.sprintTimerId = window.setInterval(updateTimerDisplay, 1000);
        }
        updateTimerDisplay();

        // ── Overall Session Stats ──────────────────────
        section.createEl('h5', { cls: 'stats-subsection-title', text: 'Session (since project opened)' });

        const sessionWords = tracker.getSessionWords(currentTotalWords);
        const wpm = tracker.getWordsPerMinute(currentTotalWords);
        const minutes = Math.floor(tracker.getSessionDuration() / 60_000);
        const streak = tracker.getStreak();

        const sessionRow = section.createDiv('stats-sprint-row');
        this.createStatCard(sessionRow, 'pencil', 'Session', `${sessionWords.toLocaleString()} words`);
        this.createStatCard(sessionRow, 'clock', 'Duration', `${minutes} min`);
        this.createStatCard(sessionRow, 'zap', 'Speed', `${wpm} wpm`);
        if (streak > 0) {
            this.createStatCard(sessionRow, 'flame', 'Streak', `${streak} day${streak > 1 ? 's' : ''}`);
        }

        // Revision volume (absolute changes — adds + deletes)
        const todayRevisions = tracker.getTodayRevisions();
        if (todayRevisions > 0) {
            this.createStatCard(sessionRow, 'rotate-cw', 'Revisions', `${todayRevisions.toLocaleString()} words`);
        }

        // ── Sprint Log Summary ─────────────────────────
        const logSection = section.createDiv('stats-sprint-log');
        this.renderSprintLog(logSection, tracker);

        // ── Daily / Weekly / Monthly goal rings ────────
        const dailyGoal = this.plugin.settings.dailyWordGoal || 1000;
        const weeklyGoal = this.plugin.settings.weeklyWordGoal || 7000;
        const monthlyGoal = this.plugin.settings.monthlyWordGoal || 30000;
        const todayWords = tracker.getTodayWords();
        const weekWords = tracker.getThisWeekWords();
        const monthWords = tracker.getThisMonthWords();

        const goalPct = Math.min(100, Math.round((todayWords / dailyGoal) * 100));
        const goalRow = section.createDiv('stats-sprint-goal');
        goalRow.createSpan({ text: `Today: ${todayWords.toLocaleString()} / ${dailyGoal.toLocaleString()} words (${goalPct}%)` });
        const goalBar = goalRow.createDiv('stats-bar stats-bar-wide');
        const goalFill = goalBar.createDiv('stats-bar-fill');
        goalFill.setCssStyles({
            width: `${goalPct}%`,
            backgroundColor: goalPct >= 100 ? 'var(--sl-success, #4CAF50)' : 'var(--sl-info, #2196F3)',
        });

        // Trio of progress rings (Today / This week / This month)
        const ringsRow = section.createDiv('stats-rings');
        this.renderProgressRing(ringsRow, 'Today', todayWords, dailyGoal, 'var(--sl-info, #2196F3)');
        this.renderProgressRing(ringsRow, 'This week', weekWords, weeklyGoal, 'var(--sl-accent, #9c6bff)');
        this.renderProgressRing(ringsRow, 'This month', monthWords, monthlyGoal, 'var(--sl-warning, #ffb74d)');

        // 7-day sparkline
        const recent = tracker.getRecentDays(7).reverse();
        const maxDay = Math.max(...recent.map(d => d.words), 1);
        const sparkSection = section.createDiv('stats-sprint-sparkline');
        sparkSection.createSpan({ cls: 'stats-sprint-sparkline-label', text: 'Last 7 days:' });
        const sparkRow = sparkSection.createDiv('stats-sprint-spark-row');
        for (const day of recent) {
            const col = sparkRow.createDiv('stats-sprint-spark-col');
            const hPct = (day.words / maxDay) * 100;
            const b = col.createDiv('stats-sprint-spark-bar');
            b.setCssStyles({ height: `${Math.max(2, hPct)}%` });
            b.setAttribute('title', `${day.date}: ${day.words} words`);
            col.createDiv({ cls: 'stats-sprint-spark-label', text: day.date.slice(5) });
        }

        // 7-day revision sparkline (if any revision data exists)
        const recentRevisions = tracker.getRecentRevisionDays(7).reverse();
        const hasRevisionData = recentRevisions.some(d => d.words > 0);
        if (hasRevisionData) {
            const maxRev = Math.max(...recentRevisions.map(d => d.words), 1);
            const revSection = section.createDiv('stats-sprint-sparkline');
            revSection.createSpan({ cls: 'stats-sprint-sparkline-label', text: 'Revisions (7 days):' });
            const revRow = revSection.createDiv('stats-sprint-spark-row');
            for (const day of recentRevisions) {
                const col = revRow.createDiv('stats-sprint-spark-col');
                const hPct = (day.words / maxRev) * 100;
                const b = col.createDiv('stats-sprint-spark-bar stats-revision-bar');
                b.setCssStyles({ height: `${Math.max(2, hPct)}%` });
                b.setAttribute('title', `${day.date}: ${day.words} words revised`);
                col.createDiv({ cls: 'stats-sprint-spark-label', text: day.date.slice(5) });
            }
        }
    }

    /** Play a short chime using Web Audio API when the sprint timer ends */
    private playSprintEndChime(): void {
        try {
            const ctx = new (window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext)();
            const playTone = (freq: number, startTime: number, duration: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.3, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };
            const now = ctx.currentTime;
            playTone(880, now, 0.15);        // A5
            playTone(1108.73, now + 0.15, 0.15); // C#6
            playTone(1318.51, now + 0.3, 0.3);  // E6
        } catch {
            // Web Audio not available — silent fallback
        }
    }

    /** Render the sprint log summary and recent entries */
    private renderSprintLog(container: HTMLElement, tracker: WritingTracker): void {
        container.empty();
        const summary = tracker.getSprintSummary();
        if (summary.count === 0) return;

        container.createEl('h5', { cls: 'stats-subsection-title', text: 'Sprint History' });
        const summaryRow = container.createDiv('stats-sprint-row');
        this.createStatCard(summaryRow, 'timer', 'Sprints', String(summary.count));
        this.createStatCard(summaryRow, 'pencil', 'Sprint Words', summary.totalWords.toLocaleString());
        this.createStatCard(summaryRow, 'zap', 'Avg WPM', String(summary.avgWpm));
        const totalMins = Math.round(summary.totalDurationMs / 60_000);
        this.createStatCard(summaryRow, 'clock', 'Sprint Time', `${totalMins} min`);

        // Show last 5 sprints
        const log = tracker.getSprintLog();
        const recent = log.slice(-5).reverse();
        if (recent.length > 0) {
            const list = container.createEl('ul', { cls: 'stats-sprint-log-list' });
            for (const entry of recent) {
                const mins = Math.round(entry.durationMs / 60_000);
                list.createEl('li', {
                    text: `${entry.date} — ${entry.words} words in ${mins} min (${entry.wpm} wpm)`,
                });
            }
        }
    }

    // ════════════════════════════════════════════════════
    //  3. Writing History
    // ════════════════════════════════════════════════════

    private renderWritingHistory(parent: HTMLElement): void {
        const history = this.plugin.writingTracker.getFullHistory();
        const entries = Object.entries(history)
            .map(([date, words]) => ({ date, words }))
            .sort((a, b) => a.date.localeCompare(b.date));

        if (entries.length < 2) {
            parent.createEl('p', { cls: 'stats-empty', text: 'Not enough history yet. Keep writing!' });
            return;
        }

        // Range selector
        const rangeBar = parent.createDiv('stats-history-range-bar');
        const ranges = [7, 30, 90, 0];
        const labels = ['7d', '30d', '90d', 'All'];
        const defaultRange = entries.length <= 30 ? 0 : 30;

        const renderChart = (days: number) => {
            parent.querySelector('.stats-history-chart-wrap')?.remove();
            const sliced = days > 0 ? entries.slice(-days) : entries;
            const wrap = parent.createDiv('stats-history-chart-wrap');

            // Daily bar chart
            this.renderHistoryBarChart(wrap, sliced);


        };

        ranges.forEach((days, i) => {
            const btn = rangeBar.createSpan({
                cls: `stats-range-btn${days === defaultRange ? ' active' : ''}`,
                text: labels[i],
            });
            btn.addEventListener('click', () => {
                rangeBar.querySelectorAll('.stats-range-btn').forEach(b => b.removeClass('active'));
                btn.addClass('active');
                renderChart(days);
            });
        });

        renderChart(defaultRange);
    }

    private renderHistoryBarChart(parent: HTMLElement, data: { date: string; words: number }[]): void {
        const maxVal = Math.max(...data.map(d => d.words), 1);
        const chart = parent.createDiv('stats-history-chart');
        for (const entry of data) {
            const col = chart.createDiv('stats-history-col');
            const hPct = (entry.words / maxVal) * 100;
            const bar = col.createDiv('stats-history-bar');
            bar.setCssStyles({ height: `${Math.max(2, hPct)}%` });
            bar.setAttribute('title', `${entry.date}: ${entry.words.toLocaleString()} words`);
            if (data.length <= 31) {
                col.createDiv({ cls: 'stats-history-label', text: entry.date.slice(5) });
            }
        }
    }

    // ════════════════════════════════════════════════════
    //  4. Progress Breakdown
    // ════════════════════════════════════════════════════

    private renderProgressBreakdown(
        parent: HTMLElement,
        stats: ReturnType<SceneManager['getStatistics']>,
        allScenes: Scene[],
    ): void {
        // ── Status breakdown ──
        const statusSec = parent.createDiv('stats-subsection');
        statusSec.createEl('h5', { cls: 'stats-subsection-title', text: 'Status Breakdown' });
        const statusList = statusSec.createEl('ul', { cls: 'stats-list' });

        const allStatuses = getStatusOrder();
        for (const status of allStatuses) {
            const count = stats.statusCounts[status] || 0;
            const pct = stats.totalScenes > 0 ? Math.round((count / stats.totalScenes) * 100) : 0;
            const cfg = resolveStatusCfg(status);
            const li = statusList.createEl('li');
            const lic = li.createSpan({ cls: 'stats-status-entry' });
            const ico = lic.createSpan({ cls: 'stats-status-icon' });
            obsidian.setIcon(ico, cfg.icon);
            lic.createSpan({ text: ` ${cfg.label}: ${count} (${pct}%)` });
            const bar = li.createDiv('stats-bar');
            const fill = bar.createDiv('stats-bar-fill');
            fill.setCssStyles({
                width: `${pct}%`,
                backgroundColor: cfg.color,
            });
        }

        // ── Chapter word counts ──
        const chapterMap: Record<string, { words: number; scenes: number }> = {};
        for (const s of allScenes) {
            const aKey = s.act !== undefined ? String(s.act) : '?';
            const cKey = s.chapter !== undefined ? String(s.chapter) : '?';
            const key = `Act ${aKey}, Ch ${cKey}`;
            if (!chapterMap[key]) chapterMap[key] = { words: 0, scenes: 0 };
            chapterMap[key].words += s.wordcount || 0;
            chapterMap[key].scenes += 1;
        }

        const chapEntries = Object.entries(chapterMap)
            .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

        if (chapEntries.length > 1) {
            const chapSec = parent.createDiv('stats-subsection');
            chapSec.createEl('h5', { cls: 'stats-subsection-title', text: 'Chapter Word Counts' });
            const maxCw = Math.max(...chapEntries.map(([, v]) => v.words), 1);
            const medianCw = this.median(chapEntries.map(([, v]) => v.words));
            const outlierThresh = medianCw * 1.5;

            const tbl = chapSec.createDiv('pacing-avg-table');
            for (const [label, data] of chapEntries) {
                const pct = (data.words / maxCw) * 100;
                const outlier = data.words > outlierThresh && medianCw > 0;
                const row = tbl.createDiv(`pacing-avg-row${outlier ? ' stats-outlier' : ''}`);
                row.createSpan({ cls: 'pacing-avg-label', text: label });
                row.createSpan({
                    cls: 'pacing-avg-value',
                    text: `${data.words.toLocaleString()} words (${data.scenes} scene${data.scenes !== 1 ? 's' : ''})`,
                });
                const bar = row.createDiv('stats-bar');
                const fill = bar.createDiv('stats-bar-fill');
                fill.setCssStyles({
                    width: `${pct}%`,
                    backgroundColor: outlier ? 'var(--sl-warning, #FF9800)' : 'var(--sl-info, #2196F3)',
                });
            }
        }

        // ── Act balance ──
        // Numeric-aware compare so "Act 2" sorts before "Act 10" and
        // hierarchical labels like "Act 1.1" / "Act 1.10" stay in order.
        const actEntries = Object.entries(stats.actCounts).sort(([a], [b]) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
        );
        if (actEntries.length > 0) {
            const actSec = parent.createDiv('stats-subsection');
            actSec.createEl('h5', { cls: 'stats-subsection-title', text: 'Act Balance' });
            for (const [act, count] of actEntries) {
                const pct = stats.totalScenes > 0 ? Math.round((count / stats.totalScenes) * 100) : 0;
                const row = actSec.createDiv('stats-row');
                row.createSpan({ text: `${act}: ${count} scenes` });
                const bar = row.createDiv('stats-bar');
                const fill = bar.createDiv('stats-bar-fill');
                fill.setCssStyles({ width: `${pct}%` });
                row.createSpan({ cls: 'stats-percent', text: `${pct}%` });
            }
        }
    }

    // ════════════════════════════════════════════════════
    //  5. Characters & World
    // ════════════════════════════════════════════════════

    private renderCharactersWorld(
        parent: HTMLElement,
        stats: ReturnType<SceneManager['getStatistics']>,
        allScenes: Scene[],
    ): void {
        // Build alias map so "Flora" and "Flora Blomkvist" merge into one entry
        const aliasMap = this.plugin.characterManager.buildAliasMap(
            this.plugin.settings?.characterAliases,
        );
        const resolve = (name: string): string =>
            aliasMap.get(name.toLowerCase()) || name;

        // Helper: merge frontmatter characters + LinkScanner body detections
        const sceneChars = (scene: Scene): Set<string> => {
            const chars = new Set<string>();
            if (scene.pov) chars.add(resolve(scene.pov));
            if (scene.characters) scene.characters.forEach(c => chars.add(resolve(c)));
            try {
                const scanResult = this.plugin.linkScanner?.getResult(scene.filePath);
                if (scanResult?.characters) {
                    for (const c of scanResult.characters) chars.add(resolve(c));
                }
            } catch { /* LinkScanner not ready yet */ }
            return chars;
        };

        // ── POV distribution (merge aliases) ──
        const mergedPov: Record<string, number> = {};
        for (const [pov, count] of Object.entries(stats.povCounts)) {
            const canon = resolve(pov);
            mergedPov[canon] = (mergedPov[canon] || 0) + count;
        }
        const povEntries = Object.entries(mergedPov).sort(([, a], [, b]) => b - a);
        if (povEntries.length > 0) {
            const sec = parent.createDiv('stats-subsection');
            sec.createEl('h5', { cls: 'stats-subsection-title', text: 'POV Distribution' });
            const maxPov = Math.max(...povEntries.map(([, c]) => c), 1);
            for (const [pov, count] of povEntries) {
                const pct = stats.totalScenes > 0 ? Math.round((count / stats.totalScenes) * 100) : 0;
                const row = sec.createDiv('stats-row');
                row.createSpan({ text: `${pov}: ${count} scenes (${pct}%)` });
                const bar = row.createDiv('stats-bar');
                bar.createDiv('stats-bar-fill').setCssStyles({ width: `${(count / maxPov) * 100}%` });
            }
        }

        // ── Character scene coverage (merge aliases + LinkScanner) ──
        const charCounts: Record<string, number> = {};
        for (const scene of allScenes) {
            for (const c of sceneChars(scene)) charCounts[c] = (charCounts[c] || 0) + 1;
        }
        const charEntries = Object.entries(charCounts).sort(([, a], [, b]) => b - a);
        if (charEntries.length > 0) {
            const sec = parent.createDiv('stats-subsection');
            sec.createEl('h5', { cls: 'stats-subsection-title', text: 'Character Scene Coverage' });
            const maxC = Math.max(...charEntries.map(([, c]) => c), 1);
            const LIMIT = 15;
            const renderRows = (entries: [string, number][], container: HTMLElement) => {
                for (const [name, count] of entries) {
                    const row = container.createDiv('stats-row');
                    row.createSpan({ text: `${name}: ${count} scene${count !== 1 ? 's' : ''}` });
                    const bar = row.createDiv('stats-bar');
                    bar.createDiv('stats-bar-fill').setCssStyles({ width: `${(count / maxC) * 100}%` });
                }
            };
            renderRows(charEntries.slice(0, LIMIT), sec);
            if (charEntries.length > LIMIT) {
                const btn = sec.createEl('button', {
                    cls: 'stats-show-more-btn',
                    text: `Show ${charEntries.length - LIMIT} more…`,
                });
                btn.addEventListener('click', () => {
                    btn.remove();
                    renderRows(charEntries.slice(LIMIT), sec);
                });
            }
        }

        // ── Location frequency ──
        const locEntries = Object.entries(stats.locationCounts).sort(([, a], [, b]) => b - a);
        if (locEntries.length > 0) {
            const sec = parent.createDiv('stats-subsection');
            sec.createEl('h5', { cls: 'stats-subsection-title', text: 'Location Frequency' });
            const maxL = Math.max(...locEntries.map(([, c]) => c), 1);
            for (const [loc, count] of locEntries.slice(0, 15)) {
                const row = sec.createDiv('stats-row');
                row.createSpan({ text: `${loc}: ${count} scene${count !== 1 ? 's' : ''}` });
                const bar = row.createDiv('stats-bar');
                bar.createDiv('stats-bar-fill').setCssStyles({ width: `${(count / maxL) * 100}%` });
            }
        } else {
            parent.createEl('p', { cls: 'stats-empty', text: 'No location data.' });
        }

        // ── Character Appearance Heatmap (character × chapter) ──
        this.renderCharacterHeatmap(parent, allScenes, resolve, sceneChars);
    }

    private renderCharacterHeatmap(
        parent: HTMLElement,
        allScenes: Scene[],
        _resolve: (name: string) => string,
        sceneChars: (scene: Scene) => Set<string>,
    ): void {
        // Build chapter list (sorted)
        const chapterSet = new Set<string>();
        for (const s of allScenes) {
            if (s.chapter !== undefined) chapterSet.add(String(s.chapter));
        }
        const chapters = Array.from(chapterSet).sort((a, b) =>
            // Numeric-aware string compare handles "2" vs "10" and "1.1" vs "1.10".
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
        );
        if (chapters.length < 2) return;

        // Build character × chapter matrix (includes LinkScanner detections)
        const charChapterMap: Record<string, Record<string, number>> = {};
        for (const s of allScenes) {
            const ch = s.chapter !== undefined ? String(s.chapter) : null;
            if (!ch) continue;
            for (const c of sceneChars(s)) {
                if (!charChapterMap[c]) charChapterMap[c] = {};
                charChapterMap[c][ch] = (charChapterMap[c][ch] || 0) + 1;
            }
        }

        // Sort characters by total appearances (descending), limit to top 15
        const charEntries = Object.entries(charChapterMap)
            .map(([name, counts]) => ({
                name,
                counts,
                total: Object.values(counts).reduce((s, c) => s + c, 0),
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 15);

        if (charEntries.length === 0) return;

        const maxCount = Math.max(...charEntries.flatMap(c => Object.values(c.counts)), 1);

        const sec = parent.createDiv('stats-subsection');
        sec.createEl('h5', { cls: 'stats-subsection-title', text: 'Character × Chapter Heatmap' });
        sec.createEl('p', { cls: 'stats-hint', text: 'Darker cells = more scene appearances in that chapter.' });

        const table = sec.createEl('table', { cls: 'stats-heatmap-table' });

        // Header row
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        headerRow.createEl('th', { text: '' }); // empty corner
        for (const ch of chapters) {
            headerRow.createEl('th', { text: `Ch ${ch}`, cls: 'stats-heatmap-ch-header' });
        }

        // Data rows
        const tbody = table.createEl('tbody');
        for (const entry of charEntries) {
            const row = tbody.createEl('tr');
            row.createEl('td', { text: entry.name, cls: 'stats-heatmap-name' });
            for (const ch of chapters) {
                const count = entry.counts[ch] || 0;
                const cell = row.createEl('td', { cls: 'stats-heatmap-cell' });
                if (count > 0) {
                    const opacity = Math.max(0.15, count / maxCount);
                    cell.setCssStyles({ backgroundColor: `rgba(var(--sl-accent-rgb, 66, 150, 252), ${opacity})` });
                    cell.setAttribute('title', `${entry.name} in Ch ${ch}: ${count} scene${count !== 1 ? 's' : ''}`);
                    cell.textContent = String(count);
                }
            }
        }
    }

    // ════════════════════════════════════════════════════
    //  5b. Setup & Payoff Map
    // ════════════════════════════════════════════════════

    private renderSetupPayoffMap(parent: HTMLElement, allScenes: Scene[]): void {
        const titleMap = new Map<string, Scene>();
        allScenes.forEach(s => titleMap.set(s.title, s));

        // Collect all setup → payoff links
        const links: { from: Scene; to: Scene; label: 'payoff' | 'setup' }[] = [];
        const danglingSetups: Scene[] = [];
        const danglingPayoffs: Scene[] = [];

        for (const scene of allScenes) {
            if (scene.payoff_scenes?.length) {
                for (const target of scene.payoff_scenes) {
                    const targetScene = titleMap.get(target);
                    if (targetScene) {
                        links.push({ from: scene, to: targetScene, label: 'payoff' });
                    }
                }
            }
            if (scene.setup_scenes?.length) {
                for (const source of scene.setup_scenes) {
                    const sourceScene = titleMap.get(source);
                    if (sourceScene) {
                        // Avoid duplicates — only add if not already covered by from→to
                        const exists = links.some(l =>
                            l.from.filePath === sourceScene.filePath && l.to.filePath === scene.filePath
                        );
                        if (!exists) {
                            links.push({ from: sourceScene, to: scene, label: 'setup' });
                        }
                    }
                }
            }
        }

        // Find scenes that set things up but have no payoff pointing back
        for (const scene of allScenes) {
            if (scene.payoff_scenes?.length) {
                const hasPayoffBack = scene.payoff_scenes.some(t => {
                    const ts = titleMap.get(t);
                    return ts?.setup_scenes?.includes(scene.title);
                });
                if (!hasPayoffBack) danglingSetups.push(scene);
            }
            // Scenes with setup_scenes but no one references them as payoff
            if (scene.setup_scenes?.length) {
                const hasSetupRef = scene.setup_scenes.some(s => {
                    const ss = titleMap.get(s);
                    return ss?.payoff_scenes?.includes(scene.title);
                });
                if (!hasSetupRef) danglingPayoffs.push(scene);
            }
        }

        if (links.length === 0) {
            parent.createEl('p', { cls: 'stats-empty', text: 'No setup/payoff links found. Add setup_scenes or payoff_scenes to your scene frontmatter to track them.' });
            return;
        }

        // ── Visual map ──
        const mapSec = parent.createDiv('stats-subsection');
        mapSec.createEl('h5', { cls: 'stats-subsection-title', text: `Setup → Payoff Chains (${links.length} link${links.length !== 1 ? 's' : ''})` });
        mapSec.createEl('p', { cls: 'stats-hint', text: 'Each row shows a setup scene and where it pays off.' });

        // Group by "from" scene to show chains
        const byFrom = new Map<string, { from: Scene; targets: Scene[] }>();
        for (const link of links) {
            const key = link.from.filePath;
            if (!byFrom.has(key)) byFrom.set(key, { from: link.from, targets: [] });
            byFrom.get(key)!.targets.push(link.to);
        }

        // Sort by sequence
        const sorted = Array.from(byFrom.values()).sort((a, b) =>
            (a.from.sequence ?? 0) - (b.from.sequence ?? 0)
        );

        for (const chain of sorted) {
            const row = mapSec.createDiv('stats-setup-payoff-row');

            // From scene
            const fromEl = row.createDiv('stats-sp-from');
            const seqLabel = chain.from.sequence !== undefined ? `#${chain.from.sequence} ` : '';
            const fromLink = fromEl.createEl('a', {
                text: `${seqLabel}${chain.from.title}`,
                cls: 'stats-scene-link',
            });
            fromLink.addEventListener('click', () => {
                this.app.workspace.openLinkText(chain.from.filePath, '', true);
            });

            // Arrow
            row.createSpan({ cls: 'stats-sp-arrow', text: '→' });

            // To scenes
            const toEl = row.createDiv('stats-sp-to');
            for (const target of chain.targets.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))) {
                const tSeq = target.sequence !== undefined ? `#${target.sequence} ` : '';
                const toLink = toEl.createEl('a', {
                    text: `${tSeq}${target.title}`,
                    cls: 'stats-scene-link stats-sp-target',
                });
                toLink.addEventListener('click', () => {
                    this.app.workspace.openLinkText(target.filePath, '', true);
                });
            }
        }

        // ── Dangling setups (Chekhov's guns that haven't fired) ──
        const orphanSetups = allScenes.filter(s =>
            s.payoff_scenes?.length && s.payoff_scenes.length > 0 &&
            !s.payoff_scenes.some(t => titleMap.has(t))
        );

        // Scenes that have payoff_scenes pointing to non-existent scenes
        if (orphanSetups.length > 0) {
            const warnSec = mapSec.createDiv('stats-subsection');
            warnSec.createEl('h5', {
                cls: 'stats-subsection-title stats-overused-title',
                text: `Broken Links (${orphanSetups.length})`,
            });
            const list = warnSec.createEl('ul', { cls: 'stats-list' });
            for (const scene of orphanSetups) {
                const li = list.createEl('li');
                const link = li.createEl('a', { text: scene.title, cls: 'stats-scene-link' });
                link.addEventListener('click', () => {
                    this.app.workspace.openLinkText(scene.filePath, '', true);
                });
                const missing = scene.payoff_scenes!.filter(t => !titleMap.has(t));
                li.createSpan({ text: ` → ${missing.map(t => `"${t}"`).join(', ')} (not found)` });
            }
        }

        // Summary
        const summaryRow = mapSec.createDiv('stats-sprint-row');
        const totalSetups = new Set(links.map(l => l.from.filePath)).size;
        const totalPayoffs = new Set(links.map(l => l.to.filePath)).size;
        this.createStatCard(summaryRow, 'target', 'Setups', String(totalSetups));
        this.createStatCard(summaryRow, 'check-circle', 'Payoffs', String(totalPayoffs));
        this.createStatCard(summaryRow, 'link', 'Links', String(links.length));
    }

    // ════════════════════════════════════════════════════
    //  6. Pacing & Tension
    // ════════════════════════════════════════════════════

    private renderPacingTension(parent: HTMLElement, allScenes: Scene[]): void {
        if (allScenes.length === 0) {
            parent.createEl('p', { cls: 'stats-empty', text: 'No scenes to analyze.' });
            return;
        }

        // ── Avg scene length per act ──
        const avgSec = parent.createDiv('stats-subsection');
        avgSec.createEl('h5', { cls: 'stats-subsection-title', text: 'Avg Scene Length per Act' });

        const actWordMap: Record<string, { total: number; count: number }> = {};
        for (const s of allScenes) {
            const k = s.act !== undefined ? `Act ${s.act}` : 'No Act';
            if (!actWordMap[k]) actWordMap[k] = { total: 0, count: 0 };
            actWordMap[k].total += s.wordcount || 0;
            actWordMap[k].count += 1;
        }
        const actEntries = Object.entries(actWordMap).sort(([a], [b]) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
        );
        const maxAvg = Math.max(...actEntries.map(([, v]) => v.count > 0 ? v.total / v.count : 0), 1);

        const avgTbl = avgSec.createDiv('pacing-avg-table');
        for (const [act, data] of actEntries) {
            const avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
            const pct = (avg / maxAvg) * 100;
            const row = avgTbl.createDiv('pacing-avg-row');
            row.createSpan({ cls: 'pacing-avg-label', text: act });
            row.createSpan({ cls: 'pacing-avg-value', text: `${avg.toLocaleString()} avg words (${data.count} scene${data.count !== 1 ? 's' : ''})` });
            const bar = row.createDiv('stats-bar');
            bar.createDiv('stats-bar-fill').setCssStyles({ width: `${pct}%`, background: 'var(--sl-info,#2196F3)' });
        }

        // ── Word-count distribution histogram ──
        const distSec = parent.createDiv('stats-subsection');
        distSec.createEl('h5', { cls: 'stats-subsection-title', text: 'Word Count Distribution' });

        const wcs = allScenes.map(s => s.wordcount || 0);
        const maxWc = Math.max(...wcs, 1);
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
            buckets.push({ label: `${lo}–${hi}`, count: wcs.filter(w => w >= lo && w < hi).length });
        }
        const maxBkt = Math.max(...buckets.map(b => b.count), 1);
        const chart = distSec.createDiv('pacing-dist-chart');
        for (const bkt of buckets) {
            const col = chart.createDiv('pacing-dist-col');
            const bar = col.createDiv('pacing-dist-bar');
            bar.setCssStyles({ height: `${Math.max(2, (bkt.count / maxBkt) * 100)}%` });
            bar.setAttribute('title', `${bkt.label} words: ${bkt.count} scene${bkt.count !== 1 ? 's' : ''}`);
            col.createDiv({ cls: 'pacing-dist-count', text: String(bkt.count) });
            col.createDiv({ cls: 'pacing-dist-label', text: bkt.label });
        }

        // ── Scene-length outliers ──
        const medianWc = this.median(wcs);
        const meanWc = wcs.reduce((s, w) => s + w, 0) / (wcs.length || 1);
        const stdDev = Math.sqrt(wcs.reduce((s, w) => s + (w - meanWc) ** 2, 0) / (wcs.length || 1));
        const loThresh = Math.max(0, medianWc - 2 * stdDev);
        const hiThresh = medianWc + 2 * stdDev;
        const outliers = allScenes.filter(s => {
            const w = s.wordcount || 0;
            return w < loThresh || w > hiThresh;
        });
        if (outliers.length > 0) {
            const oSec = parent.createDiv('stats-subsection');
            oSec.createEl('h5', { cls: 'stats-subsection-title', text: `Scene Length Outliers (${outliers.length})` });
            oSec.createEl('p', {
                cls: 'stats-hint',
                text: `Median: ${medianWc.toLocaleString()} words · Flagged outside ${Math.round(loThresh)}–${Math.round(hiThresh)} range`,
            });
            const list = oSec.createEl('ul', { cls: 'stats-list' });
            for (const scene of outliers.sort((a, b) => (b.wordcount || 0) - (a.wordcount || 0))) {
                const li = list.createEl('li', { cls: 'stats-outlier-item' });
                const link = li.createEl('a', { text: scene.title || 'Untitled', cls: 'stats-scene-link' });
                link.addEventListener('click', () => {
                    this.app.workspace.openLinkText(scene.filePath, '', true);
                });
                li.createSpan({ text: ` — ${(scene.wordcount || 0).toLocaleString()} words` });
            }
        }

        // ── Dialogue vs narrative ──
        this.renderDialogueRatio(parent, allScenes);

        // ── Pacing Coach ──
        this.renderPacingCoach(parent, allScenes);

        // ── Tension curve ──
        const ordered = this.sceneManager.queryService.getFilteredScenes(undefined, { field: 'sequence', direction: 'asc' });
        const intensityScenes = ordered.filter(s => s.intensity !== undefined);
        if (intensityScenes.length > 2) {
            this.renderTensionCurve(parent, intensityScenes);
        }
    }

    private renderDialogueRatio(parent: HTMLElement, allScenes: Scene[]): void {
        const withBody = allScenes.filter(s => s.body && s.body.trim().length > 0);
        if (withBody.length === 0) return;

        const quoteRe = /[""\u201C](.*?)[""\u201D]/gs;
        let totalDlg = 0;
        let totalAll = 0;
        const actDlg: Record<string, { dialogue: number; total: number }> = {};

        for (const scene of withBody) {
            const body = scene.body!;
            const total = body.length;
            let dlg = 0;
            let m: RegExpExecArray | null;
            quoteRe.lastIndex = 0;
            while ((m = quoteRe.exec(body)) !== null) dlg += m[1].length;
            totalDlg += dlg;
            totalAll += total;
            const k = scene.act !== undefined ? `Act ${scene.act}` : 'No Act';
            if (!actDlg[k]) actDlg[k] = { dialogue: 0, total: 0 };
            actDlg[k].dialogue += dlg;
            actDlg[k].total += total;
        }

        const overallPct = totalAll > 0 ? Math.round((totalDlg / totalAll) * 100) : 0;
        const sec = parent.createDiv('stats-subsection');
        sec.createEl('h5', { cls: 'stats-subsection-title', text: 'Dialogue vs Narrative' });
        sec.createEl('p', { text: `Overall: ${overallPct}% dialogue, ${100 - overallPct}% narrative` });

        for (const [act, data] of Object.entries(actDlg).sort(([a], [b]) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
        )) {
            const pct = data.total > 0 ? Math.round((data.dialogue / data.total) * 100) : 0;
            const row = sec.createDiv('stats-row');
            row.createSpan({ text: `${act}: ${pct}% dialogue` });
            const bar = row.createDiv('stats-bar stats-stacked-bar');
            const df = bar.createDiv('stats-bar-fill stats-dialogue-fill');
            df.setCssStyles({ width: `${pct}%` });
            const nf = bar.createDiv('stats-bar-fill stats-narrative-fill');
            nf.setCssStyles({ width: `${100 - pct}%` });
        }
    }

    private renderTensionCurve(parent: HTMLElement, scenes: { title: string; intensity?: number }[]): void {
        const sec = parent.createDiv('stats-subsection');
        sec.createEl('h5', { cls: 'stats-subsection-title', text: 'Tension Curve' });
        const chart = sec.createDiv('tension-chart');
        for (const scene of scenes) {
            const col = chart.createDiv('tension-col');
            const val = scene.intensity || 0;
            const bar = col.createDiv('tension-bar');
            bar.setCssStyles({ height: `${(val / 10) * 100}%` });
            bar.setAttribute('title', `${scene.title || 'Untitled'}: ${val}/10`);
            col.createDiv({ cls: 'tension-label', text: String(val) });
        }
    }

    // ════════════════════════════════════════════════════
    //  7. Prose Analysis (lazy)
    // ════════════════════════════════════════════════════

    private renderProseAnalysisPlaceholder(parent: HTMLElement, allScenes: Scene[]): void {
        const withBody = allScenes.filter(s => s.body && s.body.trim().length > 0);
        if (withBody.length === 0) {
            parent.createEl('p', { cls: 'stats-empty', text: 'No scene body text available for analysis.' });
            return;
        }

        if (this.proseCache) {
            this.renderProseResults(parent, this.proseCache);
            return;
        }

        const spinner = parent.createDiv('stats-spinner-wrap');
        const ico = spinner.createSpan({ cls: 'stats-spinner' });
        obsidian.setIcon(ico, 'loader');
        spinner.createSpan({ text: ' Analyzing prose…' });

        window.requestAnimationFrame(() => {
            const allText = withBody.map(s => s.body!).join('\n\n');
            this.proseCache = {
                readability: this.computeReadability(allText),
                wordFreq: this.computeWordFrequency(allText),
            };
            spinner.remove();
            this.renderProseResults(parent, this.proseCache);
        });
    }

    private renderProseResults(
        parent: HTMLElement,
        cache: { readability: ReadabilityResult; wordFreq: [string, number][] },
    ): void {
        const { readability, wordFreq } = cache;

        // Readability cards
        const rSec = parent.createDiv('stats-subsection');
        rSec.createEl('h5', { cls: 'stats-subsection-title', text: 'Readability' });
        const row = rSec.createDiv('stats-sprint-row');
        this.createStatCard(row, 'graduation-cap', 'FK Grade', String(readability.fleschKincaidGrade));
        this.createStatCard(row, 'book', 'Reading Ease', String(readability.fleschReadingEase));
        this.createStatCard(row, 'align-left', 'Avg Sentence', `${readability.avgSentenceLength} words`);
        this.createStatCard(row, 'type', 'Avg Word', `${readability.avgWordLength} chars`);

        const ease = readability.fleschReadingEase;
        const interp = ease >= 80 ? 'Very easy to read — suitable for a wide audience.'
            : ease >= 60 ? 'Standard fiction level — clear and accessible.'
            : ease >= 40 ? 'Moderately difficult — literary fiction range.'
            : 'Difficult — dense or academic prose.';
        rSec.createEl('p', { cls: 'stats-hint', text: interp });

        // Word frequency — top 20
        const totalWc = wordFreq.reduce((s, [, c]) => s + c, 0);
        const fSec = parent.createDiv('stats-subsection');
        fSec.createEl('h5', { cls: 'stats-subsection-title', text: 'Most Used Words' });

        const top20 = wordFreq.slice(0, 20);
        const maxF = top20.length > 0 ? top20[0][1] : 1;
        for (const [word, count] of top20) {
            const r = fSec.createDiv('stats-row stats-word-freq-row');
            r.createSpan({ cls: 'stats-word-freq-word', text: word });
            r.createSpan({ cls: 'stats-word-freq-count', text: `${count.toLocaleString()} (${((count / totalWc) * 100).toFixed(2)}%)` });
            const bar = r.createDiv('stats-bar');
            bar.createDiv('stats-bar-fill').setCssStyles({ width: `${(count / maxF) * 100}%` });
        }

        // Overused words (>0.5% of total)
        const overused = wordFreq.filter(([, c]) => (c / totalWc) > 0.005);
        if (overused.length > 0) {
            const oSec = parent.createDiv('stats-subsection');
            oSec.createEl('h5', { cls: 'stats-subsection-title stats-overused-title', text: `Overused Words (${overused.length})` });
            oSec.createEl('p', { cls: 'stats-hint', text: 'Words appearing in more than 0.5% of total text (excluding common words).' });
            const tags = oSec.createDiv('stats-overused-tags');
            for (const [word, count] of overused) {
                tags.createSpan({
                    cls: 'stats-overused-tag',
                    text: `${word} (${((count / totalWc) * 100).toFixed(1)}%)`,
                });
            }
        }
    }

    // ── Readability helpers ────────────────────────────

    private computeReadability(text: string): ReadabilityResult {
        const clean = text
            .replace(/^---[\s\S]*?---/gm, '')
            .replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, '$3$1')
            .replace(/[#*_~`>\[\]()!]/g, '')
            .replace(/\n+/g, ' ')
            .trim();

        const sentences = clean.split(/[.!?。！？]+/).filter(s => s.trim().length > 0);
        const locale = this.sceneManager.activeProject?.locale ?? DEFAULT_STORYLINE_LOCALE;
        const words = tokenizeWords(clean, locale);
        const totalS = Math.max(sentences.length, 1);
        const totalW = Math.max(words.length, 1);

        let syllables = 0;
        let charLen = 0;
        for (const w of words) {
            syllables += this.countSyllables(w);
            charLen += isCjkStoryLineLocale(locale)
                ? w.replace(/\s/g, '').length
                : w.replace(/[^a-zA-Z]/g, '').length;
        }

        const avgSL = Math.round((totalW / totalS) * 10) / 10;
        const avgWL = Math.round((charLen / totalW) * 10) / 10;
        const spw = syllables / totalW;

        return {
            fleschKincaidGrade: Math.max(0, Math.round((0.39 * (totalW / totalS) + 11.8 * spw - 15.59) * 10) / 10),
            fleschReadingEase: Math.max(0, Math.min(100, Math.round(206.835 - 1.015 * (totalW / totalS) - 84.6 * spw))),
            avgSentenceLength: avgSL,
            avgWordLength: avgWL,
        };
    }

    private countSyllables(word: string): number {
        const w = word.toLowerCase().replace(/[^a-z]/g, '');
        if (w.length <= 2) return 1;
        const matches = w.replace(/e$/, '').match(/[aeiouy]+/g);
        return Math.max(1, matches ? matches.length : 1);
    }

    private computeWordFrequency(text: string): [string, number][] {
        const clean = text
            .replace(/^---[\s\S]*?---/gm, '')
            .replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, '$3$1')
            .replace(/[#*_~`>\[\]()!]/g, '')
            .toLowerCase();

        const locale = this.sceneManager.activeProject?.locale ?? DEFAULT_STORYLINE_LOCALE;
        const words = tokenizeWords(clean, locale)
            .map(w => isCjkStoryLineLocale(locale) ? w.trim() : w.replace(/^[^a-z]+|[^a-z]+$/g, ''))
            .filter(w => isCjkStoryLineLocale(locale) ? w.length > 0 : w.length > 2);

        const stop = new Set([
            'the','and','was','for','that','with','his','her','had','not','but','you','are',
            'from','they','she','been','have','him','has','this','were','said','each','its',
            'who','which','their','will','would','could','than','them','then','into','more',
            'some','when','what','there','about','just','like','all','out','did','one','over',
            'how','back','down','only','very','after','before','even','also','other','our',
            'own','still','being','your','too','here','those','both','does','where','most',
            'much','through','while','now','way','may','any','well','between','another',
            'because','such','never',
        ]);

        const freq: Record<string, number> = {};
        for (const w of words) if (!stop.has(w)) freq[w] = (freq[w] || 0) + 1;
        return Object.entries(freq).sort(([, a], [, b]) => b - a);
    }

    // ════════════════════════════════════════════════════
    //  7b. Echo Finder
    // ════════════════════════════════════════════════════

    private renderEchoFinderPlaceholder(parent: HTMLElement, allScenes: Scene[]): void {
        const withBody = allScenes.filter(s => s.body && s.body.trim().length > 0);
        if (withBody.length === 0) {
            parent.createEl('p', { cls: 'stats-empty', text: 'No scene body text available for echo analysis.' });
            return;
        }

        if (this.echoCache) {
            this.renderEchoResults(parent, this.echoCache);
            return;
        }

        const spinner = parent.createDiv('stats-spinner-wrap');
        const ico = spinner.createSpan({ cls: 'stats-spinner' });
        obsidian.setIcon(ico, 'loader');
        spinner.createSpan({ text: ' Finding echoes…' });

        window.requestAnimationFrame(() => {
            this.echoCache = this.computeEchoes(withBody);
            spinner.remove();
            this.renderEchoResults(parent, this.echoCache);
        });
    }

    private computeEchoes(scenes: Scene[]): { echoes: EchoCluster[]; perScene: SceneEchoReport[] } {
        const stop = new Set([
            'the','and','was','for','that','with','his','her','had','not','but','you','are',
            'from','they','she','been','have','him','has','this','were','said','each','its',
            'who','which','their','will','would','could','than','them','then','into','more',
            'some','when','what','there','about','just','like','all','out','did','one','over',
            'how','back','down','only','very','after','before','even','also','other','our',
            'own','still','being','your','too','here','those','both','does','where','most',
            'much','through','while','now','way','may','any','well','between','another',
            'because','such','never','went','came','made','around','long','time','know',
            'looked','thought','could','would','should','going','come','take','make',
        ]);

        const echoes: EchoCluster[] = [];
        const perScene: SceneEchoReport[] = [];

        // Compute global word frequency across all scenes
        const globalFreq: Record<string, number> = {};
        let globalTotal = 0;
        for (const scene of scenes) {
            const words = this.extractWords(scene.body!);
            for (const w of words) {
                if (!stop.has(w) && w.length > 2) {
                    globalFreq[w] = (globalFreq[w] || 0) + 1;
                    globalTotal++;
                }
            }
        }
        const globalRate: Record<string, number> = {};
        for (const [w, c] of Object.entries(globalFreq)) globalRate[w] = c / globalTotal;

        for (const scene of scenes) {
            const body = scene.body!;
            // Sentence split — avoid lookbehind for iOS <16.4 compatibility.
            const sentences = body.replace(/([.!?])\s+/g, '$1\u0001').split('\u0001').filter(s => s.trim().length > 0);
            const sceneWordList = this.extractWords(body);
            const sceneFreq: Record<string, number> = {};
            const sceneTotal = sceneWordList.filter(w => !stop.has(w) && w.length > 2).length;

            for (const w of sceneWordList) {
                if (!stop.has(w) && w.length > 2) {
                    sceneFreq[w] = (sceneFreq[w] || 0) + 1;
                }
            }

            // Find proximity echoes: same word repeated within a window of 3 sentences
            const sentenceWords: string[][] = sentences.map(s =>
                this.extractWords(s).filter(w => !stop.has(w) && w.length > 2)
            );

            const proximityMap: Record<string, number> = {};
            for (let i = 0; i < sentenceWords.length; i++) {
                const window = new Set<string>();
                for (let j = Math.max(0, i - 2); j < i; j++) {
                    for (const w of sentenceWords[j]) window.add(w);
                }
                for (const w of sentenceWords[i]) {
                    if (window.has(w)) {
                        proximityMap[w] = (proximityMap[w] || 0) + 1;
                    }
                }
            }

            // Filter to significant echoes (repeated in proximity ≥ 2 times)
            const sceneEchoes = Object.entries(proximityMap)
                .filter(([, count]) => count >= 2)
                .sort(([, a], [, b]) => b - a)
                .map(([word, count]) => ({ word, proximityHits: count, total: sceneFreq[word] || 0 }));

            if (sceneEchoes.length > 0) {
                echoes.push({
                    sceneTitle: scene.title || 'Untitled',
                    filePath: scene.filePath,
                    echoes: sceneEchoes.slice(0, 10),
                });
            }

            // Per-scene favourite words: words whose frequency in this scene is ≥ 2× the global rate
            const favourites: { word: string; sceneRate: number; globalRate: number; count: number }[] = [];
            if (sceneTotal > 50) {
                for (const [w, c] of Object.entries(sceneFreq)) {
                    const sRate = c / sceneTotal;
                    const gRate = globalRate[w] || 0;
                    if (c >= 3 && gRate > 0 && sRate >= gRate * 2.5) {
                        favourites.push({ word: w, sceneRate: sRate, globalRate: gRate, count: c });
                    }
                }
            }

            if (favourites.length > 0 || sceneEchoes.length > 0) {
                perScene.push({
                    sceneTitle: scene.title || 'Untitled',
                    filePath: scene.filePath,
                    favourites: favourites.sort((a, b) => (b.sceneRate / b.globalRate) - (a.sceneRate / a.globalRate)).slice(0, 8),
                    echoCount: sceneEchoes.length,
                });
            }
        }

        return { echoes, perScene };
    }

    private extractWords(text: string): string[] {
        return text
            .replace(/^---[\s\S]*?---/gm, '')
            .replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, '$3$1')
            .replace(/[#*_~`>\[\]()!]/g, '')
            .toLowerCase()
            .split(/\s+/)
            .map(w => w.replace(/^[^a-z]+|[^a-z]+$/g, ''))
            .filter(w => w.length > 0);
    }

    private renderEchoResults(
        parent: HTMLElement,
        cache: { echoes: EchoCluster[]; perScene: SceneEchoReport[] },
    ): void {
        const { echoes, perScene } = cache;

        if (echoes.length === 0) {
            parent.createEl('p', { cls: 'stats-empty', text: 'No significant word echoes detected. Great variety!' });
            return;
        }

        // Proximity echoes per scene
        const echoSec = parent.createDiv('stats-subsection');
        echoSec.createEl('h5', { cls: 'stats-subsection-title', text: `Proximity Echoes (${echoes.length} scene${echoes.length !== 1 ? 's' : ''})` });
        echoSec.createEl('p', { cls: 'stats-hint', text: 'Words repeated within 3 sentences of each other — often unintentional.' });

        const shown = echoes.slice(0, 10);
        for (const cluster of shown) {
            const row = echoSec.createDiv('stats-echo-scene');
            const link = row.createEl('a', { text: cluster.sceneTitle, cls: 'stats-scene-link' });
            link.addEventListener('click', () => {
                this.app.workspace.openLinkText(cluster.filePath, '', true);
            });
            const tags = row.createDiv('stats-overused-tags');
            for (const e of cluster.echoes) {
                tags.createSpan({
                    cls: 'stats-echo-tag',
                    text: `${e.word} ×${e.proximityHits}`,
                    title: `"${e.word}" appears close together ${e.proximityHits} times (${e.total} total in scene)`,
                });
            }
        }
        if (echoes.length > 10) {
            echoSec.createEl('p', { cls: 'stats-hint', text: `…and ${echoes.length - 10} more scenes with echoes.` });
        }

        // Per-scene favourites (words overused relative to manuscript average)
        const withFavourites = perScene.filter(r => r.favourites.length > 0);
        if (withFavourites.length > 0) {
            const favSec = parent.createDiv('stats-subsection');
            favSec.createEl('h5', { cls: 'stats-subsection-title stats-overused-title', text: 'Scene-specific Favourite Words' });
            favSec.createEl('p', { cls: 'stats-hint', text: 'Words used much more in a specific scene than in the rest of the manuscript.' });

            const showFav = withFavourites.slice(0, 10);
            for (const report of showFav) {
                const row = favSec.createDiv('stats-echo-scene');
                const link = row.createEl('a', { text: report.sceneTitle, cls: 'stats-scene-link' });
                link.addEventListener('click', () => {
                    this.app.workspace.openLinkText(report.filePath, '', true);
                });
                const tags = row.createDiv('stats-overused-tags');
                for (const f of report.favourites) {
                    const ratio = (f.sceneRate / f.globalRate).toFixed(1);
                    tags.createSpan({
                        cls: 'stats-overused-tag',
                        text: `${f.word} (${ratio}×)`,
                        title: `"${f.word}" appears ${f.count} times — ${ratio}× the manuscript average`,
                    });
                }
            }
            if (withFavourites.length > 10) {
                favSec.createEl('p', { cls: 'stats-hint', text: `…and ${withFavourites.length - 10} more scenes.` });
            }
        }
    }

    // ════════════════════════════════════════════════════
    //  Pacing Coach (inside Pacing & Tension)
    // ════════════════════════════════════════════════════

    private renderPacingCoach(parent: HTMLElement, _allScenes: Scene[]): void {
        const ordered = this.sceneManager.queryService.getFilteredScenes(undefined, { field: 'sequence', direction: 'asc' });
        if (ordered.length < 3) return;

        const sec = parent.createDiv('stats-subsection');
        sec.createEl('h5', { cls: 'stats-subsection-title', text: 'Pacing Coach' });
        sec.createEl('p', { cls: 'stats-hint', text: 'Scene length (bars) with conflict presence (dots). Long scenes without conflict may slow pacing.' });

        const maxWc = Math.max(...ordered.map(s => s.wordcount || 0), 1);
        const chart = sec.createDiv('pacing-coach-chart');

        for (const scene of ordered) {
            const wc = scene.wordcount || 0;
            const hasConflict = !!(scene.conflict && scene.conflict.trim().length > 0);
            const hPct = (wc / maxWc) * 100;

            const col = chart.createDiv('pacing-coach-col');
            const bar = col.createDiv('pacing-coach-bar');
            bar.setCssStyles({ height: `${Math.max(2, hPct)}%` });

            if (!hasConflict && wc > 0) {
                bar.addClass('pacing-no-conflict');
            }

            // Conflict dot
            const dot = col.createDiv('pacing-coach-dot');
            if (hasConflict) {
                dot.addClass('pacing-has-conflict');
            }

            const actLabel = scene.act !== undefined ? ` (Act ${scene.act})` : '';
            bar.setAttribute('title', `${scene.title || 'Untitled'}${actLabel}\n${wc.toLocaleString()} words${hasConflict ? '\n✓ Has conflict' : '\n✗ No conflict'}`);
        }

        // Legend
        const legend = sec.createDiv('pacing-coach-legend');
        const l1 = legend.createSpan({ cls: 'pacing-coach-legend-item' });
        l1.createSpan({ cls: 'pacing-coach-legend-swatch pacing-coach-bar-swatch' });
        l1.createSpan({ text: ' With conflict' });
        const l2 = legend.createSpan({ cls: 'pacing-coach-legend-item' });
        l2.createSpan({ cls: 'pacing-coach-legend-swatch pacing-coach-noconflict-swatch' });
        l2.createSpan({ text: ' No conflict' });

        // Summary stats
        const withConflict = ordered.filter(s => s.conflict && s.conflict.trim().length > 0);
        const avgWithConflict = withConflict.length > 0
            ? Math.round(withConflict.reduce((s, sc) => s + (sc.wordcount || 0), 0) / withConflict.length)
            : 0;
        const withoutConflict = ordered.filter(s => !s.conflict || s.conflict.trim().length === 0);
        const avgWithout = withoutConflict.length > 0
            ? Math.round(withoutConflict.reduce((s, sc) => s + (sc.wordcount || 0), 0) / withoutConflict.length)
            : 0;

        const summaryRow = sec.createDiv('stats-sprint-row');
        this.createStatCard(summaryRow, 'swords', 'With conflict', `${withConflict.length} scenes (avg ${avgWithConflict.toLocaleString()} words)`);
        this.createStatCard(summaryRow, 'minus-circle', 'No conflict', `${withoutConflict.length} scenes (avg ${avgWithout.toLocaleString()} words)`);

        // Flag long scenes without conflict
        const longNoConflict = withoutConflict
            .filter(s => (s.wordcount || 0) > avgWithConflict * 1.5 && (s.wordcount || 0) > 500)
            .sort((a, b) => (b.wordcount || 0) - (a.wordcount || 0));

        if (longNoConflict.length > 0) {
            const flagSec = sec.createDiv('stats-subsection');
            flagSec.createEl('p', {
                cls: 'stats-hint stats-overused-title',
                text: `${longNoConflict.length} long scene${longNoConflict.length !== 1 ? 's' : ''} without conflict — potential pacing issues:`,
            });
            const list = flagSec.createEl('ul', { cls: 'stats-list' });
            for (const scene of longNoConflict.slice(0, 8)) {
                const li = list.createEl('li');
                const link = li.createEl('a', { text: scene.title || 'Untitled', cls: 'stats-scene-link' });
                link.addEventListener('click', () => {
                    this.app.workspace.openLinkText(scene.filePath, '', true);
                });
                li.createSpan({ text: ` — ${(scene.wordcount || 0).toLocaleString()} words, no conflict` });
            }
        }
    }

    // ════════════════════════════════════════════════════
    //  8. Warnings & Plot Holes
    // ════════════════════════════════════════════════════

    private renderWarnings(parent: HTMLElement, allScenes: Scene[]): void {
        if (this.plugin.settings.enablePlotHoleDetection && allScenes.length > 0) {
            const warnings = Validator.validate(allScenes);
            if (warnings.length === 0) {
                const ok = parent.createDiv('stats-ok');
                const ic = ok.createSpan();
                obsidian.setIcon(ic, 'check-circle');
                ok.createSpan({ text: ' No issues detected' });
            } else {
                const byCategory = new Map<string, PlotWarning[]>();
                for (const w of warnings) {
                    const arr = byCategory.get(w.category) || [];
                    arr.push(w);
                    byCategory.set(w.category, arr);
                }
                const errs = warnings.filter(w => w.severity === 'error').length;
                const warns = warnings.filter(w => w.severity === 'warning').length;
                const infos = warnings.filter(w => w.severity === 'info').length;

                const summary = parent.createDiv('stats-warning-summary');
                if (errs > 0) summary.createSpan({ cls: 'stats-severity-error', text: `${errs} error${errs > 1 ? 's' : ''}` });
                if (warns > 0) summary.createSpan({ cls: 'stats-severity-warning', text: `${warns} warning${warns > 1 ? 's' : ''}` });
                if (infos > 0) summary.createSpan({ cls: 'stats-severity-info', text: `${infos} info` });

                for (const [cat, cw] of byCategory) {
                    const catSec = parent.createDiv('stats-warning-category');
                    catSec.createEl('h5', { text: cat });
                    const list = catSec.createEl('ul', { cls: 'stats-list stats-warning-list' });
                    for (const w of cw) {
                        const li = list.createEl('li', { cls: `stats-severity-${w.severity}` });
                        const ic = li.createSpan({ cls: 'stats-warning-icon' });
                        switch (w.severity) {
                            case 'error': obsidian.setIcon(ic, 'x-circle'); break;
                            case 'warning': obsidian.setIcon(ic, 'alert-triangle'); break;
                            case 'info': obsidian.setIcon(ic, 'info'); break;
                        }
                        li.createSpan({ text: ` ${w.message}` });
                    }
                }
            }
        } else if (allScenes.length === 0) {
            parent.createEl('p', { text: 'No scenes to analyze.' });
        } else {
            parent.createEl('p', {
                cls: 'stats-ok',
                text: 'Plot hole detection is disabled. Enable it in Settings → Advanced.',
            });
        }
    }

    // ════════════════════════════════════════════════════
    //  Shared helpers
    // ════════════════════════════════════════════════════

    private createStatCard(parent: HTMLElement, icon: string, label: string, value: string): void {
        const card = parent.createDiv('stats-sprint-card');
        const iconEl = card.createSpan({ cls: 'stats-sprint-card-icon' });
        obsidian.setIcon(iconEl, icon);
        card.createDiv({ cls: 'stats-sprint-card-value', text: value });
        card.createDiv({ cls: 'stats-sprint-card-label', text: label });
    }

    /**
     * Render a circular SVG progress ring with label, current/goal text, and
     * a percentage in the center. Arc turns green when goal is reached;
     * percentage is uncapped (e.g. 127% if user blew past their goal).
     */
    private renderProgressRing(
        parent: HTMLElement,
        label: string,
        current: number,
        goal: number,
        color: string,
        size = 92,
    ): void {
        const wrap = parent.createDiv('stats-ring');
        wrap.createDiv({ cls: 'stats-ring-label', text: label });

        const safeGoal = goal > 0 ? goal : 1;
        const ratio = current / safeGoal;
        const pct = Math.round(ratio * 100);
        const reached = current >= goal && goal > 0;

        const stroke = 10;
        const r = (size - stroke) / 2;
        const c = size / 2;
        const circumference = 2 * Math.PI * r;
        const filled = Math.max(0, Math.min(1, ratio));
        const dash = circumference * filled;
        const arcColor = reached ? 'var(--sl-success, #4CAF50)' : color;

        const SVG_NS = 'http://www.w3.org/2000/svg';
        const svg = activeDocument.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        svg.classList.add('stats-ring-svg');

        const track = activeDocument.createElementNS(SVG_NS, 'circle');
        track.setAttribute('cx', String(c));
        track.setAttribute('cy', String(c));
        track.setAttribute('r', String(r));
        track.setAttribute('fill', 'none');
        track.setAttribute('stroke', 'var(--background-modifier-border, #444)');
        track.setAttribute('stroke-width', String(stroke));
        svg.appendChild(track);

        const arc = activeDocument.createElementNS(SVG_NS, 'circle');
        arc.setAttribute('cx', String(c));
        arc.setAttribute('cy', String(c));
        arc.setAttribute('r', String(r));
        arc.setAttribute('fill', 'none');
        arc.setAttribute('stroke', arcColor);
        arc.setAttribute('stroke-width', String(stroke));
        arc.setAttribute('stroke-linecap', 'round');
        arc.setAttribute('stroke-dasharray', `${dash} ${circumference}`);
        arc.setAttribute('transform', `rotate(-90 ${c} ${c})`);
        svg.appendChild(arc);

        const text = activeDocument.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', String(c));
        text.setAttribute('y', String(c));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('class', 'stats-ring-pct');
        text.textContent = `${pct}%`;
        svg.appendChild(text);

        wrap.appendChild(svg);
        wrap.createDiv({
            cls: 'stats-ring-sub',
            text: `${current.toLocaleString()} / ${goal.toLocaleString()}`,
        });
    }


    private median(values: number[]): number {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
            ? sorted[mid]
            : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    }

    /**
     * Public refresh called by the plugin on file changes
     */
    refresh(): void {
        this.proseCache = null;
        this.echoCache = null;
        if (this.rootContainer) {
            this.renderView(this.rootContainer);
        }
    }
}

interface ReadabilityResult {
    fleschKincaidGrade: number;
    fleschReadingEase: number;
    avgSentenceLength: number;
    avgWordLength: number;
}

interface EchoCluster {
    sceneTitle: string;
    filePath: string;
    echoes: { word: string; proximityHits: number; total: number }[];
}

interface SceneEchoReport {
    sceneTitle: string;
    filePath: string;
    favourites: { word: string; sceneRate: number; globalRate: number; count: number }[];
    echoCount: number;
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- end of file-wide suppression block opened at line 1 */
