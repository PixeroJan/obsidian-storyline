/**
 * InlineSuggest — a lightweight inline autocomplete dropdown.
 *
 * Attaches to a text <input> and shows a filtered suggestion list below it.
 * Supports fuzzy matching, keyboard navigation, and "create new" entry.
 */

export interface InlineSuggestOptions {
    /** The text input element to attach to */
    inputEl: HTMLInputElement;
    /** Function that returns all available suggestions */
    getSuggestions: () => string[];
    /** Called when a suggestion is selected (or Enter pressed on a new value) */
    onSelect: (value: string) => void;
    /** Called when the input is dismissed without selection (Escape / blur) */
    onDismiss?: () => void;
    /** Placeholder for the input */
    placeholder?: string;
    /** Allow creating new values not in the suggestion list (default: true) */
    allowNew?: boolean;
    /** Label for the "create new" entry (default: 'Add "{query}"') */
    newLabel?: (query: string) => string;
    /** Maximum visible suggestions (default: 8) */
    maxVisible?: number;
    /** Minimum characters before showing suggestions (default: 0) */
    minChars?: number;
}

/**
 * Fuzzy match: checks if all characters of `query` appear in `target` in order.
 * Returns a score (lower = better) or -1 if no match.
 */
function fuzzyScore(query: string, target: string): number {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    if (q.length === 0) return 0;
    let qi = 0;
    let score = 0;
    let lastMatchIdx = -1;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) {
            // Bonus for consecutive matches
            score += (ti === lastMatchIdx + 1) ? 0 : (ti - (lastMatchIdx + 1));
            lastMatchIdx = ti;
            qi++;
        }
    }
    return qi === q.length ? score : -1;
}

export class InlineSuggest {
    private dropdown: HTMLDivElement | null = null;
    private items: HTMLDivElement[] = [];
    private activeIndex = -1;
    private alive = true;

    private inputEl: HTMLInputElement;
    private getSuggestions: () => string[];
    private onSelect: (value: string) => void;
    private onDismiss?: () => void;
    private allowNew: boolean;
    private newLabel: (query: string) => string;
    private maxVisible: number;
    private minChars: number;

    constructor(opts: InlineSuggestOptions) {
        this.inputEl = opts.inputEl;
        this.getSuggestions = opts.getSuggestions;
        this.onSelect = opts.onSelect;
        this.onDismiss = opts.onDismiss;
        this.allowNew = opts.allowNew ?? true;
        this.newLabel = opts.newLabel ?? ((q) => `Add "${q}"`);
        this.maxVisible = opts.maxVisible ?? 8;
        this.minChars = opts.minChars ?? 0;

        if (opts.placeholder) this.inputEl.placeholder = opts.placeholder;

        this.inputEl.addEventListener('input', this.handleInput);
        this.inputEl.addEventListener('keydown', this.handleKeydown);
        this.inputEl.addEventListener('blur', this.handleBlur);
        this.inputEl.addEventListener('focus', this.handleInput); // re-show on re-focus

        // Initial render if input already has focus
        if (document.activeElement === this.inputEl) {
            this.updateDropdown();
        }
    }

    destroy() {
        this.alive = false;
        this.inputEl.removeEventListener('input', this.handleInput);
        this.inputEl.removeEventListener('keydown', this.handleKeydown);
        this.inputEl.removeEventListener('blur', this.handleBlur);
        this.inputEl.removeEventListener('focus', this.handleInput);
        this.removeDropdown();
    }

    private handleInput = () => {
        this.updateDropdown();
    };

    private handleKeydown = (e: KeyboardEvent) => {
        if (!this.dropdown) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.moveSelection(-1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.activeIndex >= 0 && this.activeIndex < this.items.length) {
                this.selectItem(this.activeIndex);
            } else {
                // Commit raw value
                const val = this.inputEl.value.trim();
                if (val) {
                    this.commit(val);
                }
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.dismiss();
        } else if (e.key === 'Tab') {
            // Auto-complete the highlighted suggestion on Tab
            if (this.activeIndex >= 0 && this.activeIndex < this.items.length) {
                e.preventDefault();
                this.selectItem(this.activeIndex);
            }
        }
    };

    private handleBlur = () => {
        // Delay to allow click on dropdown item to register
        setTimeout(() => {
            if (!this.alive) return;
            this.removeDropdown();
            // If the input still has a value, commit it
            const val = this.inputEl.value.trim();
            if (val) {
                this.commit(val);
            } else {
                this.onDismiss?.();
            }
        }, 150);
    };

    private updateDropdown() {
        const query = this.inputEl.value.trim();

        if (query.length < this.minChars && this.minChars > 0) {
            this.removeDropdown();
            return;
        }

        const all = this.getSuggestions();

        // Filter + sort by fuzzy score
        type Scored = { name: string; score: number };
        let scored: Scored[];
        if (query.length === 0) {
            scored = all.map(name => ({ name, score: 0 }));
        } else {
            scored = [];
            for (const name of all) {
                const s = fuzzyScore(query, name);
                if (s >= 0) scored.push({ name, score: s });
            }
            scored.sort((a, b) => a.score - b.score);
        }

        const visible = scored.slice(0, this.maxVisible);

        // Check if query exactly matches something (case-insensitive)
        const exactMatch = all.some(n => n.toLowerCase() === query.toLowerCase());
        const showNewEntry = this.allowNew && query.length > 0 && !exactMatch;

        if (visible.length === 0 && !showNewEntry) {
            this.removeDropdown();
            return;
        }

        this.ensureDropdown();
        if (!this.dropdown) return;
        this.dropdown.empty();
        this.items = [];
        this.activeIndex = -1;

        for (let i = 0; i < visible.length; i++) {
            const item = this.dropdown.createDiv('sl-suggest-item');
            // Highlight matched characters
            this.renderHighlighted(item, visible[i].name, query);
            item.addEventListener('mousedown', (e) => {
                e.preventDefault(); // prevent blur
            });
            item.addEventListener('click', () => {
                this.commit(visible[i].name);
            });
            item.addEventListener('mouseenter', () => {
                this.setActive(i);
            });
            this.items.push(item);
        }

        if (showNewEntry) {
            const newItem = this.dropdown.createDiv('sl-suggest-item sl-suggest-new');
            newItem.textContent = this.newLabel(query);
            const idx = this.items.length;
            newItem.addEventListener('mousedown', (e) => { e.preventDefault(); });
            newItem.addEventListener('click', () => {
                this.commit(query);
            });
            newItem.addEventListener('mouseenter', () => {
                this.setActive(idx);
            });
            this.items.push(newItem);
        }

        // Auto-highlight first item
        if (this.items.length > 0 && query.length > 0) {
            this.setActive(0);
        }
    }

    private renderHighlighted(container: HTMLElement, text: string, query: string) {
        if (!query) {
            container.textContent = text;
            return;
        }
        const q = query.toLowerCase();
        const t = text.toLowerCase();
        let qi = 0;
        for (let i = 0; i < text.length; i++) {
            if (qi < q.length && t[i] === q[qi]) {
                container.createSpan({ cls: 'sl-suggest-highlight', text: text[i] });
                qi++;
            } else {
                container.appendText(text[i]);
            }
        }
    }

    private ensureDropdown() {
        if (this.dropdown) return;
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'sl-suggest-dropdown';

        // Position below the input
        const rect = this.inputEl.getBoundingClientRect();
        this.dropdown.style.position = 'fixed';
        this.dropdown.style.left = `${rect.left}px`;
        this.dropdown.style.top = `${rect.bottom + 2}px`;
        this.dropdown.style.width = `${Math.max(rect.width, 200)}px`;
        this.dropdown.style.zIndex = '10000';

        document.body.appendChild(this.dropdown);
    }

    private removeDropdown() {
        if (this.dropdown) {
            this.dropdown.remove();
            this.dropdown = null;
            this.items = [];
            this.activeIndex = -1;
        }
    }

    private moveSelection(delta: number) {
        if (this.items.length === 0) return;
        let next = this.activeIndex + delta;
        if (next < 0) next = this.items.length - 1;
        if (next >= this.items.length) next = 0;
        this.setActive(next);
    }

    private setActive(index: number) {
        for (const item of this.items) item.removeClass('sl-suggest-active');
        this.activeIndex = index;
        if (index >= 0 && index < this.items.length) {
            this.items[index].addClass('sl-suggest-active');
            this.items[index].scrollIntoView({ block: 'nearest' });
        }
    }

    private selectItem(index: number) {
        const el = this.items[index];
        if (!el) return;
        // Get text from the element (strip the "Add " prefix for new items)
        if (el.hasClass('sl-suggest-new')) {
            this.commit(this.inputEl.value.trim());
        } else {
            // Extract plain text (skipping highlight spans)
            this.commit(el.textContent ?? '');
        }
    }

    private commit(value: string) {
        this.removeDropdown();
        this.inputEl.value = '';
        this.onSelect(value);
    }

    private dismiss() {
        this.removeDropdown();
        this.inputEl.value = '';
        this.onDismiss?.();
    }
}

/**
 * Helper: Create an autocomplete tag-pill input.
 *
 * Shows existing values as removable pills and an inline text input with
 * autocomplete for adding new ones.
 */
export interface TagPillInputOptions {
    /** Container element to render into */
    container: HTMLElement;
    /** Current values */
    values: string[];
    /** All available suggestions */
    getSuggestions: () => string[];
    /** Called when the value list changes */
    onChange: (values: string[]) => void;
    /** Placeholder for the add input */
    placeholder?: string;
    /** Optional: highlight a specific value (e.g. POV character) */
    highlightValue?: string;
    /** Optional: label for highlighted chip */
    highlightLabel?: string;
}

export function renderTagPillInput(opts: TagPillInputOptions): { refresh: (values: string[], highlightValue?: string) => void } {
    const { container, getSuggestions, onChange, placeholder } = opts;
    let currentValues = [...opts.values];
    let currentHighlight = opts.highlightValue;
    let activeSuggest: InlineSuggest | null = null;

    const cleanup = () => {
        if (activeSuggest) {
            activeSuggest.destroy();
            activeSuggest = null;
        }
    };

    const render = () => {
        cleanup();
        container.empty();
        container.addClass('sl-tag-pill-container');

        for (let i = 0; i < currentValues.length; i++) {
            const val = currentValues[i];
            const pill = container.createSpan({ cls: 'sl-tag-pill' });
            pill.createSpan({ cls: 'sl-tag-pill-text', text: val });

            if (currentHighlight && val === currentHighlight && opts.highlightLabel) {
                pill.createSpan({ cls: 'sl-tag-pill-badge', text: ` ${opts.highlightLabel}` });
                pill.addClass('sl-tag-pill-highlighted');
            }

            const removeBtn = pill.createSpan({ cls: 'sl-tag-pill-remove', text: '×' });
            removeBtn.addEventListener('click', () => {
                currentValues = currentValues.filter((_, idx) => idx !== i);
                onChange(currentValues);
                render();
            });
        }

        // Inline input for adding
        const input = container.createEl('input', {
            cls: 'sl-tag-pill-input',
            attr: { type: 'text' }
        });

        activeSuggest = new InlineSuggest({
            inputEl: input,
            getSuggestions: () => {
                // Exclude already-selected values
                const lower = new Set(currentValues.map(v => v.toLowerCase()));
                return getSuggestions().filter(s => !lower.has(s.toLowerCase()));
            },
            onSelect: (value) => {
                if (value && !currentValues.some(v => v.toLowerCase() === value.toLowerCase())) {
                    currentValues = [...currentValues, value];
                    onChange(currentValues);
                }
                render();
                // Re-focus the new input after re-render
                setTimeout(() => {
                    const newInput = container.querySelector('.sl-tag-pill-input') as HTMLInputElement;
                    if (newInput) newInput.focus();
                }, 10);
            },
            onDismiss: () => {
                // Do nothing — keep the input
            },
            placeholder: placeholder ?? 'Type to add…',
            allowNew: true,
        });
    };

    render();

    return {
        refresh: (values: string[], highlightValue?: string) => {
            currentValues = [...values];
            currentHighlight = highlightValue;
            render();
        }
    };
}

/**
 * Helper: Create a single-value autocomplete input (for Location, POV, etc.)
 * Shows current value as text with an edit button, or an input with suggestions.
 */
export interface AutocompleteInputOptions {
    /** Container element to render into */
    container: HTMLElement;
    /** Current value */
    value: string;
    /** All available suggestions */
    getSuggestions: () => string[];
    /** Called when value changes */
    onChange: (value: string | undefined) => void;
    /** Placeholder */
    placeholder?: string;
    /** Allow empty / "None" (default: true) */
    allowEmpty?: boolean;
}

export function renderAutocompleteInput(opts: AutocompleteInputOptions): { refresh: (value: string) => void } {
    const { container, getSuggestions, onChange, placeholder } = opts;
    let currentValue = opts.value;
    const allowEmpty = opts.allowEmpty ?? true;
    let activeSuggest: InlineSuggest | null = null;

    /** Destroy the current InlineSuggest instance before re-rendering. */
    const cleanup = () => {
        if (activeSuggest) {
            activeSuggest.destroy();
            activeSuggest = null;
        }
    };

    const render = () => {
        cleanup();
        container.empty();
        container.addClass('sl-autocomplete-container');

        if (currentValue) {
            // Show current value as a pill with clear button
            const display = container.createDiv('sl-autocomplete-display');
            display.createSpan({ cls: 'sl-autocomplete-value', text: currentValue });

            const clearBtn = display.createSpan({ cls: 'sl-autocomplete-clear', text: '×' });
            clearBtn.addEventListener('click', () => {
                currentValue = '';
                onChange(undefined);
                switchToInput(true);
            });

            // Click the value to edit
            display.addEventListener('click', (e) => {
                if ((e.target as HTMLElement).hasClass('sl-autocomplete-clear')) return;
                switchToInput(true);
            });
        } else {
            // Empty state: show input but don't auto-focus (prevents
            // infinite open→dismiss→re-open loop).
            switchToInput(false);
        }
    };

    const switchToInput = (autoFocus: boolean) => {
        cleanup();
        container.empty();
        const input = container.createEl('input', {
            cls: 'sl-autocomplete-input',
            attr: { type: 'text' }
        });
        input.value = '';

        activeSuggest = new InlineSuggest({
            inputEl: input,
            getSuggestions,
            onSelect: (value) => {
                currentValue = value;
                onChange(value || undefined);
                render();
            },
            onDismiss: () => {
                render();
            },
            placeholder: placeholder ?? 'Type to search…',
            allowNew: true,
        });

        if (autoFocus) {
            input.focus();
        }
    };

    render();

    return {
        refresh: (value: string) => {
            currentValue = value;
            render();
        }
    };
}
