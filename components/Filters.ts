import { Setting, Notice } from 'obsidian';
import * as obsidian from 'obsidian';
import { SceneFilter, SceneStatus, SortConfig, SortField, SortDirection, FilterPreset } from '../models/Scene';
import { SceneManager } from '../services/SceneManager';
import type SceneCardsPlugin from '../main';

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
    private visible = false;

    constructor(
        container: HTMLElement,
        sceneManager: SceneManager,
        onChange: (filter: SceneFilter, sort: SortConfig) => void,
        plugin?: SceneCardsPlugin
    ) {
        this.container = container;
        this.sceneManager = sceneManager;
        this.onChange = onChange;
        this.plugin = plugin ?? null;
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
        dirBtn.addEventListener('click', () => {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
            // Optionally rotate the icon or visually indicate direction
            dirBtn.toggleClass('is-desc', this.currentSort.direction === 'desc');
            this.emitChange();
        });

        // Filter toggle button (Lucide icon)
        const toggleBtn = topBar.createEl('button', {
            cls: 'story-line-filter-toggle clickable-icon',
            attr: { title: 'Show/hide filters' }
        });
        const filterIcon = toggleBtn.createSpan();
        obsidian.setIcon(filterIcon, 'list-filter');
        toggleBtn.addEventListener('click', () => {
            this.visible = !this.visible;
            filterPanel.style.display = this.visible ? 'block' : 'none';
        });

        // Expandable filter panel
        const filterPanel = this.container.createDiv('story-line-filter-panel');
        filterPanel.style.display = this.visible ? 'block' : 'none';

        this.renderFilterPanel(filterPanel);
    }

    /**
     * Render the expanded filter panel
     */
    private renderFilterPanel(panel: HTMLElement): void {
        // Status filter
        const statusValues = this.sceneManager.getUniqueValues('status');
        if (statusValues.length > 0) {
            const statusSetting = new Setting(panel).setName('Status');
            const statusContainer = panel.createDiv('story-line-filter-chips');
            const allStatuses: SceneStatus[] = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];
            allStatuses.forEach(status => {
                const chip = statusContainer.createEl('button', {
                    cls: 'story-line-chip',
                    text: status.charAt(0).toUpperCase() + status.slice(1),
                });
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
        const actValues = this.sceneManager.getUniqueValues('act');
        if (actValues.length > 0) {
            new Setting(panel).setName('Act');
            const actContainer = panel.createDiv('story-line-filter-chips');
            actValues.forEach(act => {
                const chip = actContainer.createEl('button', {
                    cls: 'story-line-chip',
                    text: `Act ${act}`,
                });
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

        // POV filter
        const povValues = this.sceneManager.getUniqueValues('pov');
        if (povValues.length > 0) {
            new Setting(panel).setName('POV');
            const povContainer = panel.createDiv('story-line-filter-chips');
            povValues.forEach(pov => {
                const chip = povContainer.createEl('button', {
                    cls: 'story-line-chip',
                    text: pov,
                });
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
        const charValues = this.sceneManager.getAllCharacters();
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
        const locValues = this.sceneManager.getUniqueValues('location');
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
        const tagValues = this.sceneManager.getAllTags();
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

        // --- Filter Presets ---
        if (this.plugin) {
            const presetSection = panel.createDiv('story-line-preset-section');
            const presetHeader = presetSection.createDiv('story-line-preset-header');
            presetHeader.createEl('span', { text: 'Saved Presets', cls: 'setting-item-name' });

            // Save current filter as preset
            const saveBtn = presetHeader.createEl('button', {
                cls: 'story-line-chip story-line-preset-save',
                text: '+ Save current',
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
                // Prompt for name
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.placeholder = 'Preset name…';
                nameInput.className = 'story-line-preset-name-input';
                presetHeader.appendChild(nameInput);
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
                    this.sceneManager.removeFilterPreset(idx);
                    this.render();
                    new Notice(`Deleted preset "${preset.name}"`);
                });
            });
        }

        // Clear filters button
        const clearBtn = panel.createEl('button', {
            cls: 'story-line-clear-filters',
            text: 'Clear All Filters',
        });
        clearBtn.addEventListener('click', () => {
            this.currentFilter = {};
            this.render(); // Re-render to reset chip states
            this.emitChange();
        });
    }

    private emitChange(): void {
        this.onChange(this.currentFilter, this.currentSort);
    }

    getFilter(): SceneFilter {
        return this.currentFilter;
    }

    getSort(): SortConfig {
        return this.currentSort;
    }
}
