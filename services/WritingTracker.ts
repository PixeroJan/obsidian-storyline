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
}

export class WritingTracker {
    /** Word count at the moment the session started (or the tracker was reset) */
    private baselineWords = 0;
    /** Timestamp the session started */
    private sessionStart: number = Date.now();
    /** Persisted daily history */
    private history: Record<string, number> = {};

    /**
     * Start (or restart) a session, capturing the current total word count
     * as the baseline.
     */
    startSession(currentTotalWords: number): void {
        this.baselineWords = currentTotalWords;
        this.sessionStart = Date.now();
    }

    /** Words written this session */
    getSessionWords(currentTotalWords: number): number {
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

    /** Flush session words into today's daily total and reset baseline */
    flushSession(currentTotalWords: number): void {
        const sw = this.getSessionWords(currentTotalWords);
        if (sw > 0) {
            this.recordToday(sw);
        }
        this.baselineWords = currentTotalWords;
    }

    /** Get words written today */
    getTodayWords(): number {
        return this.history[this.todayKey()] || 0;
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

    // ── Persistence ────────────────────────────────────

    /** Export data for saving */
    exportData(): WritingTrackerData {
        return { history: { ...this.history } };
    }

    /** Import previously saved data */
    importData(data: WritingTrackerData | undefined): void {
        if (data?.history) {
            this.history = { ...data.history };
        }
    }

    // ── Helpers ────────────────────────────────────────

    private todayKey(): string {
        return this.dateKey(new Date());
    }

    private dateKey(d: Date): string {
        return d.toISOString().split('T')[0];
    }
}
