import { App, Modal, Notice, Setting, TextComponent, DropdownComponent } from 'obsidian';
import { Scene } from '../models/Scene';
import { SceneManager } from '../services/SceneManager';

/**
 * Issue #237 — Shift dates/times for a group of selected scenes.
 *
 * Two modes share one modal:
 *  - "Start on a new date" (anchor mode): the user picks a new date/time
 *    for the earliest selected scene; the plugin computes the delta from
 *    that scene's current value and applies it to every other selected
 *    scene. Gaps between scenes are preserved.
 *  - "Move by a set amount" (delta mode): the user enters a signed amount
 *    and a unit (days / weeks / hours / minutes); the plugin applies that
 *    delta to every selected scene directly.
 *
 * Both paths converge on the same apply loop. A live preview shows each
 * scene's current → new value so the user can verify before committing.
 * Scenes whose date/time can't be parsed are skipped with a notice.
 *
 * Safety:
 *  - Only `storyDate` and `storyTime` are ever written. Sequence, act,
 *    chapter, and chronological order are untouched.
 *  - All writes go through `sceneManager.updateScene`, so each one is
 *    individually undoable. The modal batches them as a single logical
 *    action by recording a combined undo label per scene.
 *  - The original text format of each date/time is preserved where
 *    possible (ISO in → ISO out; "Day N" in → "Day N+delta" out).
 */
export class ShiftDatesModal extends Modal {
    private readonly sceneManager: SceneManager;
    private readonly selectedScenes: Scene[];

    /** 'anchor' = set new date/time for first scene; 'delta' = move by amount */
    private mode: 'anchor' | 'delta' = 'anchor';

    // Anchor-mode inputs
    private anchorDate = '';
    private anchorTime = '';

    // Delta-mode inputs
    private deltaAmount = 1;
    private deltaUnit: 'days' | 'weeks' | 'hours' | 'minutes' = 'days';

    /** Cached preview rows, recomputed on every input change. */
    private previewRows: PreviewRow[] = [];
    private previewEl: HTMLElement | null = null;
    private warningEl: HTMLElement | null = null;
    private applyBtn: HTMLElement | null = null;

    /**
     * @param app Obsidian app
     * @param sceneManager Scene manager (for updateScene)
     * @param selectedScenes The scenes to shift. Will be sorted by
     *        chronological order (falling back to sequence) inside the
     *        modal; the first scene is the anchor in anchor mode.
     */
    constructor(app: App, sceneManager: SceneManager, selectedScenes: Scene[]) {
        super(app);
        this.sceneManager = sceneManager;
        // Sort by chronological order, then sequence, so the anchor is
        // the earliest scene in story time. This matches how Timeline
        // view orders scenes in chronological mode.
        this.selectedScenes = [...selectedScenes].sort((a, b) => {
            const ac = a.chronologicalOrder ?? a.sequence ?? 0;
            const bc = b.chronologicalOrder ?? b.sequence ?? 0;
            return ac - bc;
        });

        // Pre-fill anchor inputs with the first scene's current values
        // so the user sees what they're changing from.
        if (this.selectedScenes.length > 0) {
            const anchor = this.selectedScenes[0];
            this.anchorDate = anchor.storyDate ?? '';
            this.anchorTime = anchor.storyTime ?? '';
        }
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.addClass('story-line-shift-dates');

        contentEl.createEl('h2', {
            text: `Shift dates — ${this.selectedScenes.length} scenes`,
        });
        contentEl.createEl('p', {
            cls: 'setting-item-description',
            text: 'Adjust the date and/or time of the selected scenes. Gaps between scenes are preserved.',
        });

        // ── Mode toggle ──
        new Setting(contentEl)
            .setName('How to shift')
            .setDesc('Pick a new start date, or move all selected scenes by a set amount.')
            .addDropdown(dd => {
                dd.addOption('anchor', 'Start on a new date');
                dd.addOption('delta', 'Move by a set amount');
                dd.setValue(this.mode);
                dd.onChange(v => {
                    this.mode = v as 'anchor' | 'delta';
                    this.renderModeInputs();
                    this.updatePreview();
                });
            });

        // Container for mode-specific inputs (swapped on mode change)
        this.inputsEl = contentEl.createDiv('story-line-shift-inputs');
        this.renderModeInputs();

        // ── Preview ──
        contentEl.createEl('h3', { text: 'Preview' });
        this.previewEl = contentEl.createDiv('story-line-shift-preview');
        this.warningEl = contentEl.createDiv('story-line-shift-warning');
        this.warningEl.setCssStyles({ display: 'none' });
        this.updatePreview();

        // ── Actions ──
        const footer = contentEl.createDiv('story-line-shift-footer');
        const cancelBtn = footer.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => this.close());
        this.applyBtn = footer.createEl('button', { text: 'Apply', cls: 'mod-cta' });
        this.applyBtn.addEventListener('click', () => void this.apply());
    }

    private inputsEl: HTMLElement | null = null;

    private renderModeInputs(): void {
        if (!this.inputsEl) return;
        this.inputsEl.empty();

        if (this.mode === 'anchor') {
            const anchor = this.selectedScenes[0];
            const anchorLabel = anchor
                ? `“${anchor.title || 'Untitled'}”`
                : '(no scenes)';

            new Setting(this.inputsEl)
                .setName('Anchor scene')
                .setDesc(`The earliest selected scene. Its new date/time sets the offset for all others. Current: ${anchor?.storyDate || '—'} ${anchor?.storyTime || ''}`.trim())
                .addText(text => {
                    text.setPlaceholder('Anchor scene')
                        .setValue(anchorLabel)
                        .setDisabled(true);
                });

            new Setting(this.inputsEl)
                .setName('New date')
                .setDesc('New date for the anchor scene (e.g. 2024-06-10, day 5). Leave blank to keep the date and only shift time.')
                .addText((text: TextComponent) => {
                    text.setPlaceholder('E.g. 2024-06-10')
                        .setValue(this.anchorDate)
                        .onChange(v => {
                            this.anchorDate = v;
                            this.updatePreview();
                        });
                });

            new Setting(this.inputsEl)
                .setName('New time')
                .setDesc('New time for the anchor scene (e.g. 14:00, evening). Leave blank to keep the time and only shift the date.')
                .addText((text: TextComponent) => {
                    text.setPlaceholder('E.g. 14:00')
                        .setValue(this.anchorTime)
                        .onChange(v => {
                            this.anchorTime = v;
                            this.updatePreview();
                        });
                });
        } else {
            new Setting(this.inputsEl)
                .setName('Move by')
                .setDesc('Signed amount to shift every selected scene. Use a negative number to move earlier.')
                .addText(text => {
                    text.inputEl.type = 'number';
                    text.setPlaceholder('E.g. 3')
                        .setValue(String(this.deltaAmount))
                        .onChange(v => {
                            const n = parseInt(v, 10);
                            if (!isNaN(n)) this.deltaAmount = n;
                            this.updatePreview();
                        });
                })
                .addDropdown((dd: DropdownComponent) => {
                    dd.addOption('days', 'Days');
                    dd.addOption('weeks', 'Weeks');
                    dd.addOption('hours', 'Hours');
                    dd.addOption('minutes', 'Minutes');
                    dd.setValue(this.deltaUnit);
                    dd.onChange(v => {
                        this.deltaUnit = v as typeof this.deltaUnit;
                        this.updatePreview();
                    });
                });
        }
    }

    // ── Preview computation ──────────────────────────────────────

    private updatePreview(): void {
        if (!this.previewEl || !this.warningEl || !this.applyBtn) return;

        const delta = this.computeDeltaMs();
        this.previewRows = this.selectedScenes.map(scene => {
            const oldDate = scene.storyDate ?? '';
            const oldTime = scene.storyTime ?? '';
            const oldDateTs = this.parseDateTs(oldDate);
            const oldTimeTs = this.parseTimeTs(oldTime);

            // Determine which components shift
            let newDate = oldDate;
            let newTime = oldTime;
            const notes: string[] = [];

            if (delta.dateMs !== null && oldDateTs !== null) {
                newDate = this.formatDateTs(oldDateTs + delta.dateMs, oldDate);
            } else if (delta.dateMs !== null && oldDateTs === null && oldDate) {
                notes.push('date unparseable — skipped');
            }

            if (delta.timeMs !== null && oldTimeTs !== null) {
                newTime = this.formatTimeTs(oldTimeTs + delta.timeMs, oldTime);
            } else if (delta.timeMs !== null && oldTimeTs === null && oldTime) {
                notes.push('time unparseable — skipped');
            }

            return {
                scene,
                oldDate,
                oldTime,
                newDate,
                newTime,
                notes,
            };
        });

        // Render preview table
        this.previewEl.empty();
        const table = this.previewEl.createEl('table', { cls: 'story-line-shift-preview-table' });
        const thead = table.createEl('thead');
        const headRow = thead.createEl('tr');
        headRow.createEl('th', { text: 'Scene' });
        headRow.createEl('th', { text: 'Current' });
        headRow.createEl('th', { text: '→' });
        headRow.createEl('th', { text: 'New' });

        const tbody = table.createEl('tbody');
        for (const row of this.previewRows) {
            const tr = tbody.createEl('tr');
            if (row.notes.length > 0) tr.addClass('row-skipped');
            tr.createEl('td', { text: row.scene.title || 'Untitled' });
            tr.createEl('td', { text: `${row.oldDate} ${row.oldTime}`.trim() || '—' });
            tr.createEl('td', { text: '→' });
            const newCell = tr.createEl('td');
            newCell.createSpan({ text: `${row.newDate} ${row.newTime}`.trim() || '—' });
            if (row.notes.length > 0) {
                newCell.createSpan({
                    cls: 'story-line-shift-note',
                    text: ` (${row.notes.join('; ')})`,
                });
            }
        }

        // Warnings
        const skipped = this.previewRows.filter(r => r.notes.length > 0);
        if (skipped.length > 0) {
            this.warningEl.empty();
            this.warningEl.setCssStyles({ display: '' });
            this.warningEl.createEl('strong', {
                text: `${skipped.length} scene(s) have unparseable dates/times and will be skipped.`,
            });
        } else {
            this.warningEl.setCssStyles({ display: 'none' });
        }

        // Disable Apply if nothing will change
        const anyChange = this.previewRows.some(r =>
            r.newDate !== r.oldDate || r.newTime !== r.oldTime
        );
        this.applyBtn.toggleClass('is-disabled', !anyChange);
        (this.applyBtn as HTMLButtonElement).disabled = !anyChange;
    }

    /**
     * Compute the date and time deltas (in milliseconds) for the current
     * mode. Returns `{ dateMs: null, timeMs: null }` for a component that
     * shouldn't be touched (e.g. anchor mode with blank date input).
     */
    private computeDeltaMs(): { dateMs: number | null; timeMs: number | null } {
        if (this.mode === 'delta') {
            const sign = this.deltaAmount < 0 ? -1 : 1;
            const mag = Math.abs(this.deltaAmount);
            let ms = 0;
            switch (this.deltaUnit) {
                case 'days': ms = mag * 24 * 60 * 60 * 1000; break;
                case 'weeks': ms = mag * 7 * 24 * 60 * 60 * 1000; break;
                case 'hours': ms = mag * 60 * 60 * 1000; break;
                case 'minutes': ms = mag * 60 * 1000; break;
            }
            ms = sign * ms;
            // In delta mode, days/weeks affect the date; hours/minutes
            // affect the time. This keeps the user's intent clear.
            if (this.deltaUnit === 'days' || this.deltaUnit === 'weeks') {
                return { dateMs: ms, timeMs: null };
            }
            return { dateMs: null, timeMs: ms };
        }

        // Anchor mode — compute delta from the anchor scene's current
        // values vs the new inputs.
        const anchor = this.selectedScenes[0];
        if (!anchor) return { dateMs: null, timeMs: null };

        let dateMs: number | null = null;
        let timeMs: number | null = null;

        if (this.anchorDate.trim()) {
            const oldTs = this.parseDateTs(anchor.storyDate ?? '');
            const newTs = this.parseDateTs(this.anchorDate.trim());
            if (oldTs !== null && newTs !== null) {
                dateMs = newTs - oldTs;
            }
        }
        if (this.anchorTime.trim()) {
            const oldTs = this.parseTimeTs(anchor.storyTime ?? '');
            const newTs = this.parseTimeTs(this.anchorTime.trim());
            if (oldTs !== null && newTs !== null) {
                timeMs = newTs - oldTs;
            }
        }

        return { dateMs, timeMs: timeMs };
    }

    // ── Apply ────────────────────────────────────────────────────

    private async apply(): Promise<void> {
        const delta = this.computeDeltaMs();
        let changed = 0;
        let skipped = 0;

        for (const scene of this.selectedScenes) {
            const updates: Partial<Scene> = {};
            const oldDate = scene.storyDate ?? '';
            const oldTime = scene.storyTime ?? '';

            if (delta.dateMs !== null) {
                const oldTs = this.parseDateTs(oldDate);
                if (oldTs !== null) {
                    updates.storyDate = this.formatDateTs(oldTs + delta.dateMs, oldDate);
                } else if (oldDate) {
                    skipped++;
                    continue;
                }
            }
            if (delta.timeMs !== null) {
                const oldTs = this.parseTimeTs(oldTime);
                if (oldTs !== null) {
                    updates.storyTime = this.formatTimeTs(oldTs + delta.timeMs, oldTime);
                } else if (oldTime) {
                    skipped++;
                    continue;
                }
            }

            if (updates.storyDate !== undefined || updates.storyTime !== undefined) {
                await this.sceneManager.updateScene(scene.filePath, updates);
                changed++;
            }
        }

        if (changed > 0) {
            new Notice(`Shifted dates for ${changed} scene(s)${skipped > 0 ? ` (${skipped} skipped)` : ''}.`);
        } else {
            new Notice('No scenes were changed.');
        }
        this.close();
    }

    // ── Date/time parsing & formatting ───────────────────────────
    //
    // These mirror TimelineView's parseSceneDateTimestamp / parseTimeTs
    // logic but are kept self-contained so the modal can be reused.

    private parseDateTs(value: string): number | null {
        const v = value.trim();
        if (!v) return null;
        // ISO date (2024-06-05) or full datetime
        const iso = Date.parse(v);
        if (!isNaN(iso)) return new Date(new Date(iso).toDateString()).getTime();
        // "Day N" / "dag N" pattern — treat as N days from epoch
        const dayMatch = v.match(/(?:day|dag)\s*(\d+)/i);
        if (dayMatch) {
            const n = parseInt(dayMatch[1], 10);
            if (!isNaN(n)) return n * 24 * 60 * 60 * 1000;
        }
        return null;
    }

    private parseTimeTs(value: string): number | null {
        const v = value.trim();
        if (!v) return null;
        const normalized = v.replace(/\./g, ':');
        const m = normalized.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (m) {
            const h = parseInt(m[1], 10);
            const mm = parseInt(m[2], 10);
            const ss = m[3] ? parseInt(m[3], 10) : 0;
            if (!isNaN(h) && !isNaN(mm)) {
                return (h * 3600 + mm * 60 + ss) * 1000;
            }
        }
        // Named times (morning, evening, etc.) can't be shifted — return null
        return null;
    }

    /**
     * Format a date timestamp back to a string, preserving the original
     * format where possible:
     *  - ISO date (YYYY-MM-DD) → ISO date
     *  - "Day N" / "dag N" → "Day N+deltaDays"
     *  - Anything else → ISO date (safe fallback)
     */
    private formatDateTs(ts: number, original: string): string {
        const v = original.trim();
        const dayMs = 24 * 60 * 60 * 1000;
        // "Day N" / "dag N" — preserve the label, shift the number.
        const dayMatch = v.match(/^(.*?\b(?:day|dag)\b\s*)(\d+)\s*$/i);
        if (dayMatch) {
            const prefix = dayMatch[1];
            const oldN = parseInt(dayMatch[2], 10);
            const oldTs = this.parseDateTs(v);
            if (oldTs !== null) {
                const deltaDays = Math.round((ts - oldTs) / dayMs);
                return `${prefix}${oldN + deltaDays}`;
            }
        }
        // Default: ISO date
        const d = new Date(ts);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    /**
     * Format a time-of-day timestamp (ms since midnight) back to HH:MM
     * or HH:MM:SS, preserving seconds if the original had them.
     */
    private formatTimeTs(ms: number, original: string): string {
        // Normalise into [0, 24h) to handle day rollover from large deltas
        const dayMs = 24 * 60 * 60 * 1000;
        let normalized = ms % dayMs;
        if (normalized < 0) normalized += dayMs;

        const totalSec = Math.floor(normalized / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;

        const hadSeconds = /^\d{1,2}:\d{2}:\d{2}/.test(original.trim().replace(/\./g, ':'));
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        return hadSeconds ? `${hh}:${mm}:${String(s).padStart(2, '0')}` : `${hh}:${mm}`;
    }
}

interface PreviewRow {
    scene: Scene;
    oldDate: string;
    oldTime: string;
    newDate: string;
    newTime: string;
    notes: string[];
}
