 
/**
 * WritingTracker — tracks session word counts and daily writing velocity.
 *
 * The tracker captures a "baseline" word count when the session starts and
 * computes session words = current total − baseline. Historical daily totals
 * are persisted through the plugin's data so streaks survive restarts.
 */

export interface DailyEntry {
    /** ISO date string (YYYY-MM-DD) */
    date: string;
    /** Words written that day */
    words: number;
}

export interface WritingTrackerData {
    /** Daily word counts keyed by ISO date */
    history: Record<string, number>;
    /** Daily revision counts (absolute word changes — adds + deletes) keyed by ISO date */
    revisionHistory?: Record<string, number>;
    /** Persisted sprint log entries */
    sprintLog?: SprintLogEntry[];
}

/** A completed sprint record */
export interface SprintLogEntry {
    date: string;       // ISO date
    words: number;      // net words written
    durationMs: number; // actual elapsed time
    wpm: number;        // words per minute
}

export class WritingTracker {
    /** Word count at the moment the session started – null until startSession() is called */
    private baselineWords: number | null = null;
    /** Timestamp the session started */
    private sessionStart: number = Date.now();
    /** Persisted daily history */
    private history: Record<string, number> = {};
    /** Persisted daily revision (absolute change) history */
    private revisionHistory: Record<string, number> = {};
    /** Last known total word count — used to measure revision deltas between flushes */
    private lastKnownTotal: number | null = null;
    /** Session words already flushed to daily history — avoids double-counting */
    private _flushedSessionWords = 0;

    // ── Sprint state ───────────────────────────────────
    /** Whether a timed sprint is currently running */
    private _sprintRunning = false;
    /** Sprint start timestamp (ms) */
    private _sprintStart = 0;
    /** Sprint baseline word count */
    private _sprintBaseline = 0;
    /** Configured sprint duration (ms) */
    private _sprintDurationMs = 25 * 60_000; // default 25 min
    /** Completed sprint log */
    private _sprintLog: SprintLogEntry[] = [];

    /**
     * Start (or restart) a session, capturing the current total word count
     * as the baseline.  Also sanitises today's history entry if it looks
     * corrupted (from earlier 0-baseline bug).
     */
    startSession(currentTotalWords: number): void {
        // If the project word count isn't available yet, don't start — keep
        // baseline null so getSessionWords / flushSession remain no-ops.
        // (flushSession has its own lazy-start fallback — see below.)
        if (currentTotalWords <= 0) return;

        this.baselineWords = currentTotalWords;
        this.lastKnownTotal = currentTotalWords;
        this.sessionStart = Date.now();

        // Sanitise: if today's stored value is unreasonably large (≥ 90% of
        // the entire project AND more than 10,000 words), it's almost
        // certainly corrupted from the old 0-baseline bug.  Clear it.
        // (Issue #238 — the previous 50% threshold wiped legitimate data
        // for small/early-stage projects where a single productive day can
        // easily exceed half the manuscript.)
        const today = this.todayKey();
        const stored = this.history[today] || 0;
        if (stored > 10_000 && stored >= currentTotalWords * 0.9) {
            delete this.history[today];
        }
    }

    /** Words written this session (0 if session not started yet) */
    getSessionWords(currentTotalWords: number): number {
        if (this.baselineWords === null) {
            // Lazy-start: if the init call had 0 but now we have a real count
            if (currentTotalWords > 0) this.startSession(currentTotalWords);
            return 0;
        }
        return Math.max(0, currentTotalWords - this.baselineWords);
    }

    /** How long the session has been running (ms) */
    getSessionDuration(): number {
        return Date.now() - this.sessionStart;
    }

    /** Words per minute for this session */
    getWordsPerMinute(currentTotalWords: number): number {
        const minutes = this.getSessionDuration() / 60_000;
        if (minutes < 0.5) return 0;
        return Math.round(this.getSessionWords(currentTotalWords) / minutes);
    }

    // ── Daily history ──────────────────────────────────

    /** Record today's total to history (call periodically or on save) */
    recordToday(sessionWords: number): void {
        const today = this.todayKey();
        this.history[today] = (this.history[today] || 0) + sessionWords;
    }

    /**
     * Flush session words into today's daily total.
     * Safe to call multiple times — only the incremental difference since the
     * last flush is recorded, so daily history is never double-counted.
     */
    flushSession(currentTotalWords: number): void {
        // Issue #238 — lazy-start: if startSession() bailed because the
        // project word count wasn't available yet (scene scan not done at
        // layout-ready), start now so the session still records words.
        if (this.baselineWords === null) {
            if (currentTotalWords <= 0) return;
            this.startSession(currentTotalWords);
            return; // first flush records nothing (baseline == current)
        }
        const totalSessionWords = this.getSessionWords(currentTotalWords);
        const increment = totalSessionWords - this._flushedSessionWords;
        if (increment > 0) {
            this.recordToday(increment);
            this._flushedSessionWords = totalSessionWords;
        }

        // Track revision volume (absolute change since last flush)
        if (this.lastKnownTotal !== null) {
            const delta = Math.abs(currentTotalWords - this.lastKnownTotal);
            if (delta > 0) {
                this.recordRevisionToday(delta);
            }
        }
        this.lastKnownTotal = currentTotalWords;
    }

    /** Record today's revision volume */
    private recordRevisionToday(absChange: number): void {
        const today = this.todayKey();
        this.revisionHistory[today] = (this.revisionHistory[today] || 0) + absChange;
    }

    /** Get words written today */
    getTodayWords(): number {
        return this.history[this.todayKey()] || 0;
    }

    /** Get revision volume for today (absolute word changes — adds + deletes) */
    getTodayRevisions(): number {
        return this.revisionHistory[this.todayKey()] || 0;
    }

    /** Get recent revision history (most recent first) */
    getRecentRevisionDays(count: number): DailyEntry[] {
        const entries: DailyEntry[] = [];
        const d = new Date();
        for (let i = 0; i < count; i++) {
            const key = this.dateKey(d);
            entries.push({ date: key, words: this.revisionHistory[key] || 0 });
            d.setDate(d.getDate() - 1);
        }
        return entries;
    }

    /** Return the raw daily revision history record (date→words) */
    getFullRevisionHistory(): Record<string, number> {
        return { ...this.revisionHistory };
    }

    /** Get the last N days of history (most recent first) */
    getRecentDays(count: number): DailyEntry[] {
        const entries: DailyEntry[] = [];
        const d = new Date();
        for (let i = 0; i < count; i++) {
            const key = this.dateKey(d);
            entries.push({ date: key, words: this.history[key] || 0 });
            d.setDate(d.getDate() - 1);
        }
        return entries;
    }

    /** Current writing streak (consecutive days with > 0 words) */
    getStreak(): number {
        let streak = 0;
        const d = new Date();
        // If today has no words yet, start checking from yesterday
        if (!this.history[this.dateKey(d)]) {
            d.setDate(d.getDate() - 1);
        }
        while (true) {
            const key = this.dateKey(d);
            if ((this.history[key] || 0) > 0) {
                streak++;
                d.setDate(d.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }

    /** Return the raw daily history record (date→words) */
    getFullHistory(): Record<string, number> {
        return { ...this.history };
    }

    /** Sum of words written across the last N days (inclusive of today). */
    getWordsInLastDays(days: number): number {
        if (days <= 0) return 0;
        let total = 0;
        const d = new Date();
        for (let i = 0; i < days; i++) {
            total += this.history[this.dateKey(d)] || 0;
            d.setDate(d.getDate() - 1);
        }
        return total;
    }

    /** Words written from Monday of the current week through today (inclusive). */
    getThisWeekWords(): number {
        const now = new Date();
        // JS getDay(): 0 = Sunday, 1 = Monday, …, 6 = Saturday.
        // Treat Monday as the first day of the week.
        const dow = now.getDay();
        const daysSinceMonday = dow === 0 ? 6 : dow - 1;
        let total = 0;
        const d = new Date(now);
        for (let i = 0; i <= daysSinceMonday; i++) {
            total += this.history[this.dateKey(d)] || 0;
            d.setDate(d.getDate() - 1);
        }
        return total;
    }

    /** Words written from day 1 of the current calendar month through today. */
    getThisMonthWords(): number {
        const now = new Date();
        const day = now.getDate();
        let total = 0;
        const d = new Date(now);
        for (let i = 0; i < day; i++) {
            total += this.history[this.dateKey(d)] || 0;
            d.setDate(d.getDate() - 1);
        }
        return total;
    }

    // ── Sprint controls ────────────────────────────────

    /** Start a timed writing sprint */
    startSprint(currentTotalWords: number): void {
        this._sprintRunning = true;
        this._sprintStart = Date.now();
        this._sprintBaseline = currentTotalWords;
    }

    /** Stop the current sprint and record it */
    stopSprint(currentTotalWords: number): SprintLogEntry | null {
        if (!this._sprintRunning) return null;
        this._sprintRunning = false;
        const elapsed = Date.now() - this._sprintStart;
        const words = Math.max(0, currentTotalWords - this._sprintBaseline);
        const minutes = elapsed / 60_000;
        const wpm = minutes >= 0.5 ? Math.round(words / minutes) : 0;
        const entry: SprintLogEntry = {
            date: this.todayKey(),
            words,
            durationMs: elapsed,
            wpm,
        };
        this._sprintLog.push(entry);
        return entry;
    }

    /** Reset sprint state without recording */
    resetSprint(): void {
        this._sprintRunning = false;
        this._sprintStart = 0;
        this._sprintBaseline = 0;
    }

    /** Is a sprint currently active? */
    isSprintRunning(): boolean { return this._sprintRunning; }

    /** Elapsed sprint time (ms) */
    getSprintElapsed(): number {
        if (!this._sprintRunning) return 0;
        return Date.now() - this._sprintStart;
    }

    /** Remaining sprint time (ms). Returns 0 if overtime. */
    getSprintRemaining(): number {
        if (!this._sprintRunning) return this._sprintDurationMs;
        return Math.max(0, this._sprintDurationMs - (Date.now() - this._sprintStart));
    }

    /** Words written during the current sprint */
    getSprintWords(currentTotalWords: number): number {
        if (!this._sprintRunning) return 0;
        return Math.max(0, currentTotalWords - this._sprintBaseline);
    }

    /** WPM during the current sprint */
    getSprintWpm(currentTotalWords: number): number {
        const minutes = this.getSprintElapsed() / 60_000;
        if (minutes < 0.5) return 0;
        return Math.round(this.getSprintWords(currentTotalWords) / minutes);
    }

    /** Get/set sprint duration (ms) */
    getSprintDuration(): number { return this._sprintDurationMs; }
    setSprintDuration(ms: number): void { this._sprintDurationMs = Math.max(60_000, ms); }

    /** Get completed sprint log */
    getSprintLog(): SprintLogEntry[] { return [...this._sprintLog]; }

    /** Sprint log summary: total sprints, total words, average wpm */
    getSprintSummary(): { count: number; totalWords: number; avgWpm: number; totalDurationMs: number } {
        const log = this._sprintLog;
        if (log.length === 0) return { count: 0, totalWords: 0, avgWpm: 0, totalDurationMs: 0 };
        const totalWords = log.reduce((s, e) => s + e.words, 0);
        const totalMs = log.reduce((s, e) => s + e.durationMs, 0);
        const avgWpm = totalMs > 30_000 ? Math.round(totalWords / (totalMs / 60_000)) : 0;
        return { count: log.length, totalWords, avgWpm, totalDurationMs: totalMs };
    }

    // ── Persistence ────────────────────────────────────

    /** Export data for saving */
    exportData(): WritingTrackerData {
        return {
            history: { ...this.history },
            revisionHistory: { ...this.revisionHistory },
            sprintLog: [...this._sprintLog],
        };
    }

    /** Import previously saved data */
    importData(data: WritingTrackerData | undefined): void {
        if (data?.history) {
            this.history = { ...data.history };
        }
        if (data?.revisionHistory) {
            this.revisionHistory = { ...data.revisionHistory };
        }
        if (data?.sprintLog) {
            this._sprintLog = [...data.sprintLog];
        }
    }

    // ── Helpers ────────────────────────────────────────

    private todayKey(): string {
        return this.dateKey(new Date());
    }

    private dateKey(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
}
 
