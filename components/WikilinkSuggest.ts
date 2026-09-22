 
/**
 * WikilinkSuggest \u2014 a lightweight wikilink autocomplete for plain
 * <textarea> elements (issue #84).
 *
 * Watches typing in a textarea, detects an unclosed `[[` token before the
 * caret, and pops up a small fuzzy-matched list of vault notes. Pressing
 * Enter / Tab or clicking inserts `Name]]` at the caret.
 *
 * Unlike Obsidian's built-in EditorSuggest, this works on plain textareas
 * (which the StoryLine Inspector uses for the Notes / Comments field).
 */

import { App } from 'obsidian';
import { getVaultMarkdownFiles } from '../utils/vault';

export interface WikilinkSuggestOptions {
    app: App;
    textareaEl: HTMLTextAreaElement;
    /** Maximum suggestions in the dropdown (default 8). */
    maxVisible?: number;
}

export class WikilinkSuggest {
    private app: App;
    private textareaEl: HTMLTextAreaElement;
    private maxVisible: number;
    private dropdown: HTMLDivElement | null = null;
    private items: { name: string; el: HTMLDivElement }[] = [];
    private activeIndex = -1;
    private alive = true;
    private triggerStart = -1; // caret index of the `[[`

    constructor(opts: WikilinkSuggestOptions) {
        this.app = opts.app;
        this.textareaEl = opts.textareaEl;
        this.maxVisible = opts.maxVisible ?? 8;

        this.textareaEl.addEventListener('input', this.handleInput);
        this.textareaEl.addEventListener('keydown', this.handleKeydown);
        this.textareaEl.addEventListener('blur', this.handleBlur);
        this.textareaEl.addEventListener('click', this.handleInput);
    }

    destroy(): void {
        this.alive = false;
        this.textareaEl.removeEventListener('input', this.handleInput);
        this.textareaEl.removeEventListener('keydown', this.handleKeydown);
        this.textareaEl.removeEventListener('blur', this.handleBlur);
        this.textareaEl.removeEventListener('click', this.handleInput);
        this.removeDropdown();
    }

    // ─── Trigger detection ────────────────────────────────────

    /**
     * Look back from the caret for the most recent `[[`. Return the
     * query (text after `[[`) or null when no active trigger exists,
     * e.g. when a `]]` has already closed the link.
     */
    private detectTrigger(): { start: number; query: string } | null {
        const value = this.textareaEl.value;
        const caret = this.textareaEl.selectionStart ?? value.length;
        const before = value.slice(0, caret);
        const open = before.lastIndexOf('[[');
        if (open === -1) return null;
        const between = before.slice(open + 2);
        // Cancel if user already started closing the link or jumped to a new line.
        if (between.includes(']]') || between.includes('\n')) return null;
        return { start: open + 2, query: between };
    }

    private handleInput = () => {
        if (!this.alive) return;
        const trigger = this.detectTrigger();
        if (!trigger) {
            this.removeDropdown();
            return;
        }
        this.triggerStart = trigger.start;
        this.renderDropdown(trigger.query);
    };

    private handleKeydown = (e: KeyboardEvent) => {
        if (!this.dropdown) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.moveSelection(-1);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (this.activeIndex >= 0 && this.activeIndex < this.items.length) {
                e.preventDefault();
                this.commit(this.items[this.activeIndex].name);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.removeDropdown();
        }
    };

    private handleBlur = () => {
        // Delay so a click on a dropdown item still registers.
        window.setTimeout(() => { if (this.alive) this.removeDropdown(); }, 150);
    };

    // ─── Suggestions ──────────────────────────────────────────

    private getCandidates(query: string): string[] {
        const files = getVaultMarkdownFiles(this.app);
        const q = query.toLowerCase();
        const scored: { name: string; score: number }[] = [];
        for (const f of files) {
            const score = this.fuzzyScore(q, f.basename.toLowerCase());
            if (score >= 0) scored.push({ name: f.basename, score });
        }
        scored.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
        // Deduplicate by basename (vault may have multiple files with same name).
        const seen = new Set<string>();
        const out: string[] = [];
        for (const s of scored) {
            if (seen.has(s.name)) continue;
            seen.add(s.name);
            out.push(s.name);
            if (out.length >= this.maxVisible) break;
        }
        return out;
    }

    private fuzzyScore(query: string, target: string): number {
        if (!query) return 0;
        let qi = 0;
        let score = 0;
        let last = -1;
        for (let ti = 0; ti < target.length && qi < query.length; ti++) {
            if (target[ti] === query[qi]) {
                score += ti === last + 1 ? 0 : (ti - (last + 1));
                last = ti;
                qi++;
            }
        }
        return qi === query.length ? score : -1;
    }

    private renderDropdown(query: string): void {
        const candidates = this.getCandidates(query);
        if (candidates.length === 0) {
            this.removeDropdown();
            return;
        }

        this.ensureDropdown();
        if (!this.dropdown) return;
        this.dropdown.empty();
        this.items = [];
        this.activeIndex = 0;

        for (let i = 0; i < candidates.length; i++) {
            const name = candidates[i];
            const item = this.dropdown.createDiv('sl-suggest-item');
            item.textContent = name;
            if (i === 0) item.addClass('is-active');
            item.addEventListener('mousedown', (ev) => {
                // mousedown (not click) so we run before blur removes the dropdown.
                ev.preventDefault();
                this.commit(name);
            });
            this.items.push({ name, el: item });
        }

        this.positionDropdown();
    }

    private ensureDropdown(): void {
        if (this.dropdown) return;
        this.dropdown = activeDocument.body.createDiv({ cls: 'sl-suggest-dropdown sl-wikilink-suggest' });
    }

    private removeDropdown(): void {
        if (!this.dropdown) return;
        this.dropdown.remove();
        this.dropdown = null;
        this.items = [];
        this.activeIndex = -1;
    }

    private moveSelection(delta: number): void {
        if (this.items.length === 0) return;
        this.activeIndex = (this.activeIndex + delta + this.items.length) % this.items.length;
        for (let i = 0; i < this.items.length; i++) {
            this.items[i].el.toggleClass('is-active', i === this.activeIndex);
        }
        this.items[this.activeIndex].el.scrollIntoView({ block: 'nearest' });
    }

    private positionDropdown(): void {
        if (!this.dropdown) return;
        const rect = this.textareaEl.getBoundingClientRect();
        // Simple heuristic: anchor below the textarea, indented by caret column
        // approximation. Good enough for a small notes field.
        this.dropdown.setCssStyles({
            position: 'fixed',
            left: `${Math.round(rect.left)}px`,
            top: `${Math.round(rect.bottom + 2)}px`,
            minWidth: `${Math.min(320, Math.max(180, rect.width))}px`,
            maxWidth: '420px',
            maxHeight: '240px',
            overflowY: 'auto',
            zIndex: '9999',
            background: 'var(--background-primary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            padding: '4px',
        });
    }

    // ─── Commit ───────────────────────────────────────────────

    private commit(name: string): void {
        if (this.triggerStart < 0) {
            this.removeDropdown();
            return;
        }
        const value = this.textareaEl.value;
        const caret = this.textareaEl.selectionStart ?? value.length;
        const before = value.slice(0, this.triggerStart);
        const after = value.slice(caret);
        // Insert "<name>]]" replacing the in-progress query.
        const inserted = `${name}]]`;
        const newValue = `${before}${inserted}${after}`;
        const newCaret = before.length + inserted.length;
        this.textareaEl.value = newValue;
        this.textareaEl.setSelectionRange(newCaret, newCaret);
        // Trigger input + change so listeners (e.g. autosave) react.
        this.textareaEl.dispatchEvent(new Event('input', { bubbles: true }));
        this.textareaEl.dispatchEvent(new Event('change', { bubbles: true }));
        this.removeDropdown();
        this.textareaEl.focus();
    }
}
 
