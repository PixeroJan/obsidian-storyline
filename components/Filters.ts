/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-floating-promises -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { Setting, Notice } from 'obsidian';
import * as obsidian from 'obsidian';
import { SceneManager } from '../services/SceneManager';
import type SceneCardsPlugin from '../main';
import type { SceneFilter, SortConfig, SortField, FilterPreset } from '../models/Scene';
import { getStatusOrder } from '../models/Scene';
import { getActDisplayLabel } from '../utils/actChapter';

type FocusModeCallback = (active: boolean) => void;

/**
 * Filter controls component for scene views
 */
export class FiltersComponent {
    private container: HTMLElement;
    private sceneManager: SceneManager;
    private plugin: SceneCardsPlugin | null;
    private currentFilter: SceneFilter = {};
    private currentSort: SortConfig = { field: 'sequence', direction: 'asc' };
    private onChange: (filter: SceneFilter, sort: SortConfig) => void;
    private onFocusModeChange?: FocusModeCallback;
    private visible = false;

    constructor(
        container: HTMLElement,
        sceneManager: SceneManager,
        onChange: (filter: SceneFilter, sort: SortConfig) => void,
        plugin: SceneCardsPlugin,
        onFocusModeChange?: FocusModeCallback,
        initialFilter?: SceneFilter,
        initialSort?: SortConfig,
    ) {
        this.container = container;
        this.sceneManager = sceneManager;
        this.onChange = onChange;
        this.plugin = plugin ?? null;
        this.onFocusModeChange = onFocusModeChange;
        this.currentFilter = initialFilter ? JSON.parse(JSON.stringify(initialFilter)) as SceneFilter : {};
        this.currentSort = initialSort ? { ...initialSort } : { field: 'sequence', direction: 'asc' };
    }

    /**
     * Render the filter bar
     */
    render(): void {
        this.container.empty();
        this.container.addClass('story-line-filters-container');

        // Top bar: search + sort + toggle
        const topBar = this.container.createDiv('story-line-filter-bar');

        // Search (with Lucide icon)
        const searchWrapper = topBar.createDiv('story-line-search-wrapper');
        const searchIcon = searchWrapper.createSpan();
        obsidian.setIcon(searchIcon, 'search');
        const searchInput = searchWrapper.createEl('input', {
            cls: 'story-line-search',
            attr: {
                type: 'text',
                placeholder: 'Search scenes...',
            }
        });
        searchInput.value = this.currentFilter.searchText ?? '';
        searchInput.addEventListener('input', () => {
            this.currentFilter.searchText = searchInput.value || undefined;
            this.emitChange();
        });

        // Sort dropdown
        const sortContainer = topBar.createDiv('story-line-sort');
        const sortIcon = sortContainer.createSpan();
        obsidian.setIcon(sortIcon, 'arrow-down-up');
        const sortSelect = sortContainer.createEl('select', { cls: 'dropdown' });
        const sortOptions: { value: SortField; label: string }[] = [
            { value: 'sequence', label: 'Sequence' },
            { value: 'title', label: 'Title' },
            { value: 'status', label: 'Status' },
            { value: 'act', label: 'Act' },
            { value: 'chapter', label: 'Chapter' },
            { value: 'wordcount', label: 'Word Count' },
            { value: 'modified', label: 'Modified' },
        ];
        sortOptions.forEach(opt => {
            const option = sortSelect.createEl('option', { text: opt.label, value: opt.value });
            if (opt.value === this.currentSort.field) option.selected = true;
        });
        sortSelect.addEventListener('change', () => {
            this.currentSort.field = sortSelect.value as SortField;
            this.emitChange();
        });

        // Sort direction toggle (Lucide icon)
        const dirBtn = sortContainer.createEl('button', {
            cls: 'story-line-sort-dir clickable-icon',
            attr: { title: 'Toggle sort direction' }
        });
        const dirIcon = dirBtn.createSpan();
        obsidian.setIcon(dirIcon, 'arrow-down-up');
        dirBtn.toggleClass('is-desc', this.currentSort.direction === 'desc');
        dirBtn.addEventListener('click', () => {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
            // Optionally rotate the icon or visually indicate direction
            dirBtn.toggleClass('is-desc', this.currentSort.direction === 'desc');
            this.emitChange();
        });

        // Arc Points filter toggle (All / Scenes / Arc Points)
        const arcFilterContainer = topBar.createDiv('story-line-arc-filter');
        const arcModes: { value: 'all' | 'scenes' | 'arcPoints'; label: string }[] = [
            { value: 'all', label: 'All' },
            { value: 'scenes', label: 'Scenes' },
            { value: 'arcPoints', label: 'Arc Points' },
        ];
        for (const mode of arcModes) {
            const btn = arcFilterContainer.createEl('button', {
                cls: `story-line-arc-filter-btn${(this.currentFilter.arcAnchorFilter || 'all') === mode.value ? ' is-active' : ''}`,
                text: mode.label,
            });
            btn.addEventListener('click', () => {
                this.currentFilter.arcAnchorFilter = mode.value === 'all' ? undefined : mode.value;
                arcFilterContainer.querySelectorAll('.story-line-arc-filter-btn').forEach(b => b.removeClass('is-active'));
                btn.addClass('is-active');
                this.emitChange();
            });
        }

        // Active-state filter toggle (Active / All / Inactive)
        const activeFilterContainer = topBar.createDiv('story-line-active-filter');
        const activeModes: { value: 'active' | 'all' | 'inactive'; label: string }[] = [
            { value: 'active', label: 'Active' },
            { value: 'all', label: 'All' },
            { value: 'inactive', label: 'Inactive' },
        ];
        for (const mode of activeModes) {
            const btn = activeFilterContainer.createEl('button', {
                cls: `story-line-active-filter-btn${(this.currentFilter.activeState || 'active') === mode.value ? ' is-active' : ''}`,
                text: mode.label,
            });
            btn.addEventListener('click', () => {
                this.currentFilter.activeState = mode.value === 'active' ? undefined : mode.value;
                activeFilterContainer.querySelectorAll('.story-line-active-filter-btn').forEach(b => b.removeClass('is-active'));
                btn.addClass('is-active');
                this.emitChange();
            });
        }

        // Filter toggle button (Lucide icon)
        const toggleBtn = topBar.createEl('button', {
            cls: 'story-line-filter-toggle clickable-icon',
            attr: { title: 'Show/hide filters' }
        });
        const filterIcon = toggleBtn.createSpan();
        obsidian.setIcon(filterIcon, 'list-filter');
        this.updateFilterToggle(toggleBtn);
        toggleBtn.addEventListener('click', () => {
            this.visible = !this.visible;
            filterPanel.setCssStyles({ display: this.visible ? 'block' : 'none' });
        });

        // Expandable filter panel
        const filterPanel = this.container.createDiv('story-line-filter-panel');
        filterPanel.setCssStyles({ display: this.visible ? 'block' : 'none' });

        this.renderFilterPanel(filterPanel);
    }

    /**
     * Render the expanded filter panel
     */
    private renderFilterPanel(panel: HTMLElement): void {
        // Status filter
        const statusValues = this.sceneManager.queryService.getUniqueValues('status');
        if (statusValues.length > 0) {
            const statusContainer = panel.createDiv('story-line-filter-chips');
            const allStatuses = getStatusOrder();
            allStatuses.forEach(status => {
                const chip = statusContainer.createEl('button', {
                    cls: 'story-line-chip',
                    text: status.charAt(0).toUpperCase() + status.slice(1),
                });
                if (this.currentFilter.status?.includes(status)) chip.addClass('active');
                chip.addEventListener('click', () => {
                    if (!this.currentFilter.status) this.currentFilter.status = [];
                    const idx = this.currentFilter.status.indexOf(status);
                    if (idx >= 0) {
                        this.currentFilter.status.splice(idx, 1);
                        chip.removeClass('active');
                    } else {
                        this.currentFilter.status.push(status);
                        chip.addClass('active');
                    }
                    this.emitChange();
                });
            });
        }

        // Act filter
        const actValues = this.sceneManager.queryService.getUniqueValues('act');
        if (actValues.length > 0) {
            new Setting(panel).setName('Act');
            const actContainer = panel.createDiv('story-line-filter-chips');
            actValues.forEach(act => {
                const chip = actContainer.createEl('button', {
                    cls: 'story-line-chip',
                    text: getActDisplayLabel(act),
                });
                if (this.currentFilter.act?.map(String).includes(act)) chip.addClass('active');
                chip.addEventListener('click', () => {
                    if (!this.currentFilter.act) this.currentFilter.act = [];
                    const idx = this.currentFilter.act.map(String).indexOf(act);
                    if (idx >= 0) {
                        this.currentFilter.act.splice(idx, 1);
                        chip.removeClass('active');
                    } else {
                        this.currentFilter.act.push(act);
                        chip.addClass('active');
                    }
                    this.emitChange();
                });
            });
        }

        // Chapter filter
        const chapterValues = this.sceneManager.queryService.getUniqueValues('chapter');
        if (chapterValues.length > 0) {
            new Setting(panel).setName('Chapter');
            const chapterContainer = panel.createDiv('story-line-filter-chips');
            chapterValues.forEach(chapter => {
                const chip = chapterContainer.createEl('button', {
                    cls: 'story-line-chip',
                    text: `Chapter ${chapter}`,
                });
                if (this.currentFilter.chapter?.map(String).includes(chapter)) chip.addClass('active');
                chip.addEventListener('click', () => {
                    if (!this.currentFilter.chapter) this.currentFilter.chapter = [];
                    const idx = this.currentFilter.chapter.map(String).indexOf(chapter);
                    if (idx >= 0) {
                        this.currentFilter.chapter.splice(idx, 1);
                        chip.removeClass('active');
                    } else {
                        this.currentFilter.chapter.push(chapter);
                        chip.addClass('active');
                    }
                    this.emitChange();
                });
            });
        }

        // POV filter
        const povValues = this.sceneManager.queryService.getUniqueValues('pov');
        if (povValues.length > 0) {
            new Setting(panel).setName('POV');
            const povContainer = panel.createDiv('story-line-filter-chips');
            povValues.forEach(pov => {
                const chip = povContainer.createEl('button', {
                    cls: 'story-line-chip',
                    text: pov,
                });
                if (this.currentFilter.pov?.includes(pov)) chip.addClass('active');
                chip.addEventListener('click', () => {
                    if (!this.currentFilter.pov) this.currentFilter.pov = [];
                    const idx = this.currentFilter.pov.indexOf(pov);
                    if (idx >= 0) {
                        this.currentFilter.pov.splice(idx, 1);
                        chip.removeClass('active');
                    } else {
                        this.currentFilter.pov.push(pov);
                        chip.addClass('active');
                    }
                    this.emitChange();
                });
            });
        }

        // Character filter
        const charValues = this.sceneManager.queryService.getAllCharacters();
        if (charValues.length > 0) {
            new Setting(panel).setName('Characters');
            const charContainer = panel.createDiv('story-line-filter-chips');
            charValues.forEach(char => {
                const chip = charContainer.createEl('button', {
                    cls: 'story-line-chip',
                    text: char.replace(/\[\[|\]\]/g, ''),
                });
                if (this.currentFilter.characters?.includes(char)) chip.addClass('active');
                chip.addEventListener('click', () => {
                    if (!this.currentFilter.characters) this.currentFilter.characters = [];
                    const idx = this.currentFilter.characters.indexOf(char);
                    if (idx >= 0) {
                        this.currentFilter.characters.splice(idx, 1);
                        chip.removeClass('active');
                    } else {
                        this.currentFilter.characters.push(char);
                        chip.addClass('active');
                    }
                    this.emitChange();
                });
            });
        }

        // Location filter
        const locValues = this.sceneManager.queryService.getUniqueValues('location');
        if (locValues.length > 0) {
            new Setting(panel).setName('Location');
            const locContainer = panel.createDiv('story-line-filter-chips');
            locValues.forEach(loc => {
                const chip = locContainer.createEl('button', {
                    cls: 'story-line-chip',
                    text: loc.replace(/\[\[|\]\]/g, ''),
                });
                if (this.currentFilter.locations?.includes(loc)) chip.addClass('active');
                chip.addEventListener('click', () => {
                    if (!this.currentFilter.locations) this.currentFilter.locations = [];
                    const idx = this.currentFilter.locations.indexOf(loc);
                    if (idx >= 0) {
                        this.currentFilter.locations.splice(idx, 1);
                        chip.removeClass('active');
                    } else {
                        this.currentFilter.locations.push(loc);
                        chip.addClass('active');
                    }
                    this.emitChange();
                });
            });
        }

        // Tag filter
        const tagValues = this.sceneManager.queryService.getAllTags();
        if (tagValues.length > 0) {
            new Setting(panel).setName('Tags');
            const tagContainer = panel.createDiv('story-line-filter-chips');
            tagValues.forEach(tag => {
                const chip = tagContainer.createEl('button', {
                    cls: 'story-line-chip',
                    text: tag,
                });
                if (this.currentFilter.tags?.includes(tag)) chip.addClass('active');
                chip.addEventListener('click', () => {
                    if (!this.currentFilter.tags) this.currentFilter.tags = [];
                    const idx = this.currentFilter.tags.indexOf(tag);
                    if (idx >= 0) {
                        this.currentFilter.tags.splice(idx, 1);
                        chip.removeClass('active');
                    } else {
                        this.currentFilter.tags.push(tag);
                        chip.addClass('active');
                    }
                    this.emitChange();
                });
            });
        }

        // Custom (universal) scene field filters — one chip group per dropdown / multi-select template
        if (this.plugin?.fieldTemplates) {
            const sceneTpls = this.plugin.fieldTemplates.getAll()
                .filter(t => (t.category || 'character') === 'scene')
                .filter(t => t.type === 'dropdown' || t.type === 'multi-select');

            for (const tpl of sceneTpls) {
                // Collect all values actually used for this field across scenes,
                // unioned with template-defined options.
                const used = new Set<string>();
                for (const scene of this.sceneManager.getAllScenes()) {
                    const raw = scene.universalFields?.[tpl.id];
                    if (Array.isArray(raw)) raw.forEach(v => v && used.add(String(v)));
                    else if (typeof raw === 'string' && raw.trim()) used.add(raw);
                }
                for (const opt of tpl.options) used.add(opt);

                if (used.size === 0) continue;

                new Setting(panel).setName(tpl.label);
                const cfContainer = panel.createDiv('story-line-filter-chips');
                const sorted = Array.from(used).sort((a, b) => a.localeCompare(b));
                sorted.forEach(val => {
                    const chip = cfContainer.createEl('button', {
                        cls: 'story-line-chip',
                        text: val,
                    });
                    if (this.currentFilter.customFields?.[tpl.id]?.includes(val)) chip.addClass('active');
                    chip.addEventListener('click', () => {
                        if (!this.currentFilter.customFields) this.currentFilter.customFields = {};
                        const arr = this.currentFilter.customFields[tpl.id] ?? [];
                        const idx = arr.indexOf(val);
                        if (idx >= 0) {
                            arr.splice(idx, 1);
                            chip.removeClass('active');
                        } else {
                            arr.push(val);
                            chip.addClass('active');
                        }
                        if (arr.length === 0) {
                            delete this.currentFilter.customFields[tpl.id];
                        } else {
                            this.currentFilter.customFields[tpl.id] = arr;
                        }
                        if (Object.keys(this.currentFilter.customFields).length === 0) {
                            delete this.currentFilter.customFields;
                        }
                        this.emitChange();
                    });
                });
            }
        }

        // --- Filter Presets ---
        if (this.plugin) {
            const presetSection = panel.createDiv('story-line-preset-section');
            const presetHeader = presetSection.createDiv('story-line-preset-header');
            presetHeader.createSpan({ text: 'Saved Presets', cls: 'setting-item-name' });

            // Save current filter as preset
            const saveBtn = presetHeader.createEl('button', {
                cls: 'story-line-chip story-line-preset-save',
                text: '+ save current',
            });
            saveBtn.addEventListener('click', () => {
                // Check if there's anything to save
                const hasFilter = Object.values(this.currentFilter).some(v =>
                    v !== undefined && (typeof v !== 'object' || (Array.isArray(v) && v.length > 0))
                );
                if (!hasFilter) {
                    new Notice('No active filters to save');
                    return;
                }
                // Prompt for name (attached to presetHeader via createEl method — safe on 1.12.x)
                const nameInput = presetHeader.createEl('input', {
                    type: 'text',
                    cls: 'story-line-preset-name-input',
                    attr: { placeholder: 'Preset name…' },
                });
                nameInput.focus();
                const doSave = () => {
                    const name = nameInput.value.trim();
                    if (!name) { nameInput.remove(); return; }
                    const preset: FilterPreset = { name, filter: JSON.parse(JSON.stringify(this.currentFilter)) };
                    this.sceneManager.addFilterPreset(preset);
                    nameInput.remove();
                    this.render(); // re‑render to show new preset chip
                    new Notice(`Filter preset "${name}" saved`);
                };
                nameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') doSave();
                    if (e.key === 'Escape') nameInput.remove();
                });
                nameInput.addEventListener('blur', doSave);
            });

            // Render existing preset chips
            const presetChips = presetSection.createDiv('story-line-filter-chips');
            const presets = this.sceneManager.getFilterPresets();
            presets.forEach((preset, idx) => {
                const chip = presetChips.createEl('button', {
                    cls: 'story-line-chip story-line-preset-chip',
                    text: preset.name,
                    attr: { title: 'Click to apply, right‑click to delete' },
                });
                chip.addEventListener('click', () => {
                    this.currentFilter = JSON.parse(JSON.stringify(preset.filter));
                    this.render();
                    this.emitChange();
                    new Notice(`Applied preset "${preset.name}"`);
                });
                chip.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    const deletingActivePreset = JSON.stringify(this.currentFilter) === JSON.stringify(preset.filter);
                    void this.sceneManager.removeFilterPreset(idx);
                    if (deletingActivePreset) this.currentFilter = {};
                    this.render();
                    this.emitChange();
                    new Notice(`Deleted preset "${preset.name}"`);
                });
            });
        }

        // Clear filters button
        const clearBtn = panel.createEl('button', {
            cls: 'story-line-clear-filters',
            text: 'Clear all filters',
        });
        clearBtn.addEventListener('click', () => {
            this.currentFilter = {};
            this.render(); // Re-render to reset chip states
            this.emitChange();
        });
    }

    private emitChange(): void {
        const toggleBtn = this.container.querySelector('.story-line-filter-toggle');
        if (toggleBtn) this.updateFilterToggle(toggleBtn);
        this.onChange(this.currentFilter, this.currentSort);
    }

    private updateFilterToggle(toggleBtn: HTMLElement): void {
        const activeCount = Object.values(this.currentFilter).filter(value =>
            value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0)
        ).length;
        toggleBtn.toggleClass('has-filter', activeCount > 0);
        toggleBtn.setAttribute('title', activeCount > 0
            ? `Show/hide filters (${activeCount} active)`
            : 'Show/hide filters');
    }

    getFilter(): SceneFilter {
        return this.currentFilter;
    }

    getSort(): SortConfig {
        return this.currentSort;
    }
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-floating-promises -- end of file-wide suppression block opened at line 1 */
