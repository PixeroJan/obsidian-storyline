/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import { App, ItemView, WorkspaceLeaf, Modal, Setting, Notice, TFile } from 'obsidian';
import * as obsidian from 'obsidian';
import type SceneCardsPlugin from '../main';
import { SceneManager } from '../services/SceneManager';
import { CodexManager } from '../services/CodexManager';
import { CodexEntry, CodexCategoryDef, CodexFieldCategory, CodexFieldDef, BUILTIN_CODEX_CATEGORIES, makeCustomCodexCategory, CODEX_ICON_OPTIONS } from '../models/Codex';
import { CODEX_VIEW_TYPE, CHARACTER_VIEW_TYPE, LOCATION_VIEW_TYPE } from '../constants';
import { renderViewSwitcher } from '../components/ViewSwitcher';
import { applyMobileClass } from '../components/MobileAdapter';
import { pickImage as pickImageModal, resolveImagePath } from '../components/ImagePicker';
import { AddFieldModal } from '../components/AddFieldModal';
import { attachTooltip } from '../components/Tooltip';
import type { UniversalFieldTemplate } from '../services/FieldTemplateService';

/**
 * Codex View — central hub for all codex categories.
 *
 * Shows category tabs (Characters, Locations, Items, …) across the top,
 * with a grid of entry cards below.  Clicking a card opens a detail editor
 * panel (split into form + side panel), following the same pattern as
 * CharacterView and LocationView.
 *
 * Characters and Locations tabs simply switch to their dedicated views.
 */
export class CodexView extends ItemView {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;
    private codexManager: CodexManager;
    private rootContainer: HTMLElement | null = null;

    /** File path of the currently-selected entry, or null for overview */
    private selectedEntry: string | null = null;
    /** Active category tab id */
    private activeCategory: string = '';
    private sortBy: 'name' | 'modified' | 'created' | 'type' = 'name';
    /** Sections collapsed in detail view */
    private collapsedSections: Set<string> = new Set();
    /** Search filter text */
    private searchText: string = '';

    // ── Auto-save state ────────────────────────────────
    private _saveTimer: number | null = null;
    private _lastSaveTime = 0;
    private _pendingDraft: CodexEntry | null = null;
    private _undoSnapshot: CodexEntry | null = null;
    private static SAVE_DEBOUNCE_MS = 600;
    private static SAVE_REFRESH_GRACE_MS = 1500;

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin, sceneManager: SceneManager) {
        super(leaf);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
        this.codexManager = plugin.codexManager;
    }

    getViewType(): string { return CODEX_VIEW_TYPE; }
    getDisplayText(): string {
        const title = this.plugin?.sceneManager?.activeProject?.title;
        return title ? `StoryLine — ${title}` : 'StoryLine';
    }
    getIcon(): string { return 'book-open'; }

    async onOpen(): Promise<void> {
        this.plugin.storyLeaf = this.leaf;
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('story-line-codex-container');
        applyMobileClass(container);
        this.rootContainer = container;

        await this.sceneManager.initialize();

        // Load codex data
        const codexFolder = this.sceneManager.getCodexFolder();
        this.codexManager.initCategories(
            this.plugin.settings.codexEnabledCategories,
            this.resolveCustomDefs(),
        );
        await this.codexManager.loadAll(codexFolder);

        // Reset to hub state — no category pre-selected
        this.activeCategory = '';
        this.selectedEntry = null;

        this.renderView(container);
    }

    async onClose(): Promise<void> {
        await this.flushPendingSave();
        activeDocument.querySelectorAll('.gallery-lightbox-window').forEach(w => w.remove());
    }

    /**
     * Public method so the ViewSwitcher dropdown can navigate directly
     * to a specific codex category tab.
     */
    setActiveCategory(categoryId: string): void {
        this.activeCategory = categoryId;
        this.selectedEntry = null;
        if (this.rootContainer) this.renderView(this.rootContainer);
    }

    /**
     * Navigate directly to a codex entry's detail view by file path.
     */
    async navigateToEntry(filePath: string): Promise<void> {
        const codexFolder = this.sceneManager.getCodexFolder();
        this.codexManager.initCategories(
            this.plugin.settings.codexEnabledCategories,
            this.resolveCustomDefs(),
        );
        await this.codexManager.loadAll(codexFolder);
        const entry = this.codexManager.getEntry(filePath);
        if (!entry) {
            new Notice('Codex entry not found in the active project.');
            return;
        }
        this.activeCategory = entry.type;
        this.selectedEntry = filePath;
        if (this.rootContainer) {
            this.renderView(this.rootContainer);
        }
    }

    /** Called by refreshOpenViews */
    async refresh(): Promise<void> {
        // Grace period — skip re-render if we just saved ourselves
        if (this.selectedEntry && (Date.now() - this._lastSaveTime) < CodexView.SAVE_REFRESH_GRACE_MS) {
            const codexFolder = this.sceneManager.getCodexFolder();
            await this.codexManager.loadAll(codexFolder);
            return;
        }
        const codexFolder = this.sceneManager.getCodexFolder();
        this.codexManager.initCategories(
            this.plugin.settings.codexEnabledCategories,
            this.resolveCustomDefs(),
        );
        await this.codexManager.loadAll(codexFolder);
        if (this.rootContainer) this.renderView(this.rootContainer);
    }

    // ══════════════════════════════════════════════════
    //  Render — main entry
    // ══════════════════════════════════════════════════

    private renderView(container: HTMLElement): void {
        container.empty();

        // ── Toolbar ────────────────────────────────────
        const toolbar = container.createDiv('story-line-toolbar');
        const titleRow = toolbar.createDiv('story-line-title-row');
        titleRow.createEl('h3', { cls: 'story-line-view-title', text: 'StoryLine' });
        renderViewSwitcher(toolbar, CODEX_VIEW_TYPE, this.plugin, this.leaf);

        // ── Controls row ───────────────────────────────
        const controls = toolbar.createDiv('story-line-toolbar-controls');

        // Manage categories button (icon-only)
        const addCatBtn = controls.createEl('button', {
            cls: 'codex-toolbar-icon-btn',
        });
        obsidian.setIcon(addCatBtn, 'settings');
        attachTooltip(addCatBtn, 'Manage categories');
        addCatBtn.addEventListener('click', () => this.openManageCategoriesModal());

        // Add entry button (icon-only)
        const addBtn = controls.createEl('button', {
            cls: 'codex-toolbar-icon-btn codex-toolbar-add-btn',
        });
        obsidian.setIcon(addBtn, 'plus');
        attachTooltip(addBtn, 'New entry');
        addBtn.addEventListener('click', () => this.promptNewEntry());

        // ── Content area ───────────────────────────────
        const content = container.createDiv('story-line-codex-content');

        if (this.selectedEntry) {
            this.renderDetail(content);
        } else {
            this.renderOverview(content);
        }
    }

    // ══════════════════════════════════════════════════
    //  Overview — category tabs + card grid
    // ══════════════════════════════════════════════════

    private renderOverview(container: HTMLElement): void {
        container.empty();

        // ── Category tabs ──────────────────────────────
        const tabs = container.createDiv('codex-category-tabs');

        // Built-in "Characters" pseudo-tab → switches to CharacterView
        this.renderPseudoTab(tabs, 'Characters', 'users', () => {
            this.switchToView(CHARACTER_VIEW_TYPE);
        });

        // Built-in "Locations" pseudo-tab → switches to LocationView
        this.renderPseudoTab(tabs, 'Locations', 'map-pin', () => {
            this.switchToView(LOCATION_VIEW_TYPE);
        });

        // Codex category tabs
        const cats = this.codexManager.getCategories();
        for (const cat of cats) {
            const tab = tabs.createEl('button', {
                cls: `codex-tab ${cat.id === this.activeCategory ? 'active' : ''}`,
                attr: { 'aria-label': cat.label },
            });
            const icon = tab.createSpan({ cls: 'codex-tab-icon' });
            obsidian.setIcon(icon, cat.icon);
            tab.createSpan({ cls: 'codex-tab-label', text: cat.label });

            tab.addEventListener('click', () => {
                this.activeCategory = cat.id;
                if (this.rootContainer) this.renderView(this.rootContainer);
            });
        }

        // ── Category heading (when a specific category is selected) ──
        if (this.activeCategory) {
            const catDef = this.codexManager.getCategoryDef(this.activeCategory);
            if (catDef) {
                container.createEl('h3', { text: catDef.label });
            }
        }

        // ── Search + Sort ──────────────────────────────
        const searchRow = container.createDiv('codex-search-row');
        const searchInput = searchRow.createEl('input', {
            cls: 'codex-search-input',
            attr: { type: 'text', placeholder: 'Search entries…' },
        });
        searchInput.value = this.searchText;
        searchInput.addEventListener('input', () => {
            this.searchText = searchInput.value;
            this.renderList(listContainer);
        });

        searchRow.createSpan({ cls: 'codex-sort-label', text: 'Sort by' });
        const sortSelect = searchRow.createEl('select', { cls: 'codex-sort-select' });
        const sortOptions: { value: string; label: string }[] = [
            { value: 'name', label: 'Name' },
            { value: 'modified', label: 'Last edited' },
            { value: 'created', label: 'Date created' },
            { value: 'type', label: 'Type' },
        ];
        for (const opt of sortOptions) {
            const el = sortSelect.createEl('option', { text: opt.label, value: opt.value });
            if (this.sortBy === opt.value) el.selected = true;
        }
        sortSelect.addEventListener('change', () => {
            this.sortBy = sortSelect.value as 'type' | 'name' | 'created' | 'modified';
            this.renderList(listContainer);
        });

        // ── List ───────────────────────────────────────
        const listContainer = container.createDiv('codex-list-container');
        this.renderList(listContainer);
    }

    private renderList(container: HTMLElement): void {
        container.empty();
        const isHub = !this.activeCategory;
        const catDef = isHub ? undefined : this.codexManager.getCategoryDef(this.activeCategory);

        // Hub mode: only show results when the user is actively searching
        if (isHub && !this.searchText) {
            container.createEl('p', { cls: 'codex-empty-state', text: 'Select a category or search for entries.' });
            return;
        }

        // Gather entries — all categories on hub search, single category otherwise
        let entries: CodexEntry[] = isHub
            ? this.codexManager.getAllEntries()
            : (catDef ? this.codexManager.getEntries(this.activeCategory) : []);

        // Filter by search query
        if (this.searchText) {
            const q = this.searchText.toLowerCase();
            entries = entries.filter(e => e.name.toLowerCase().includes(q));
        }

        // Resolve catDef per-entry helper for hub mode
        const getCatDef = (entry: CodexEntry) =>
            isHub ? this.codexManager.getCategoryDef(entry.type) : catDef;

        // Sort
        entries = [...entries].sort((a, b) => {
            switch (this.sortBy) {
                case 'modified':
                    return (b.modified ?? '').localeCompare(a.modified ?? '');
                case 'created':
                    return (b.created ?? '').localeCompare(a.created ?? '');
                case 'type': {
                    const cdA = getCatDef(a);
                    const cdB = getCatDef(b);
                    const tA = cdA ? this.getTypeField(a, cdA) : '';
                    const tB = cdB ? this.getTypeField(b, cdB) : '';
                    return tA.localeCompare(tB) || a.name.localeCompare(b.name);
                }
                default:
                    return a.name.localeCompare(b.name);
            }
        });

        // In hub search mode, also gather matching Characters and Locations
        interface HubResult { name: string; icon: string; badge: string; onClick: () => void }
        const hubExtras: HubResult[] = [];
        if (isHub && this.searchText) {
            const q = this.searchText.toLowerCase();
            // Characters
            if (this.plugin.characterManager) {
                for (const ch of this.plugin.characterManager.getAllCharacters()) {
                    if (ch.name.toLowerCase().includes(q)) {
                        hubExtras.push({
                            name: ch.name,
                            icon: 'users',
                            badge: 'Character',
                            onClick: () => this.switchToView(CHARACTER_VIEW_TYPE),
                        });
                    }
                }
            }
            // Locations
            if (this.plugin.locationManager) {
                for (const loc of this.plugin.locationManager.getAllLocations()) {
                    if (loc.name.toLowerCase().includes(q)) {
                        hubExtras.push({
                            name: loc.name,
                            icon: 'map-pin',
                            badge: 'Location',
                            onClick: () => this.switchToView(LOCATION_VIEW_TYPE),
                        });
                    }
                }
            }
        }

        if (entries.length === 0 && hubExtras.length === 0) {
            if (isHub) {
                container.createEl('p', { cls: 'codex-empty-state', text: 'No matching entries.' });
            } else if (catDef) {
                const empty = container.createDiv('codex-empty-state');
                empty.createEl('p', { text: `No ${catDef.label.toLowerCase()} yet.` });
                const createBtn = empty.createEl('button', {
                    cls: 'mod-cta',
                    text: `Create first ${catDef.label.toLowerCase().replace(/s$/, '')}`,
                });
                createBtn.addEventListener('click', () => this.promptNewEntry());
            }
            return;
        }

        const list = container.createDiv('codex-entry-list');
        for (const entry of entries) {
            const entryCatDef = getCatDef(entry);
            if (entryCatDef) this.renderListItem(list, entry, entryCatDef);
        }

        // Render character/location hub results
        for (const hr of hubExtras) {
            const row = list.createDiv('codex-entry-row');
            const iconEl = row.createSpan({ cls: 'codex-entry-icon' });
            obsidian.setIcon(iconEl, hr.icon);
            row.createSpan({ cls: 'codex-entry-name', text: hr.name });
            row.createSpan({ cls: 'codex-entry-type-badge', text: hr.badge });
            row.addEventListener('click', hr.onClick);
        }
    }

    private renderListItem(list: HTMLElement, entry: CodexEntry, catDef: CodexCategoryDef): void {
        const row = list.createDiv('codex-entry-row');

        // Category icon
        const icon = row.createSpan({ cls: 'codex-entry-icon' });
        obsidian.setIcon(icon, catDef.icon);

        // Name
        row.createSpan({ cls: 'codex-entry-name', text: entry.name });

        // Type badge
        const typeVal = this.getTypeField(entry, catDef);
        if (typeVal) {
            row.createSpan({ cls: 'codex-entry-type-badge', text: typeVal });
        }

        // Completeness indicator (compact)
        const filled = this.countFilledFields(entry, catDef);
        const total = catDef.fieldKeys.length;
        if (total > 0) {
            const pct = Math.round((filled / total) * 100);
            row.createSpan({ cls: 'codex-entry-pct', text: `${pct}%` });
        }

        row.addEventListener('click', () => {
            this.activeCategory = entry.type;
            this.selectedEntry = entry.filePath;
            if (this.rootContainer) this.renderView(this.rootContainer);
        });
    }

    // ══════════════════════════════════════════════════
    //  Detail — editor panel
    // ══════════════════════════════════════════════════

    private renderDetail(container: HTMLElement): void {
        container.empty();
        const entry = this.codexManager.getEntry(this.selectedEntry!);
        if (!entry) {
            this.selectedEntry = null;
            this.renderOverview(container);
            return;
        }

        const catDef = this.codexManager.getCategoryDef(entry.type);
        if (!catDef) {
            this.selectedEntry = null;
            this.renderOverview(container);
            return;
        }

        const draft: CodexEntry = { ...entry };
        this._undoSnapshot = { ...entry };
        this._pendingDraft = draft;

        // ── Header ─────────────────────────────────────
        const header = container.createDiv('codex-detail-header');

        const backBtn = header.createEl('span', { cls: 'codex-back-link' });
        const backIcon = backBtn.createSpan();
        obsidian.setIcon(backIcon, 'circle-arrow-left');
        backBtn.createSpan({ text: ` All ${catDef.label}` });
        backBtn.addEventListener('click', async () => {
            await this.flushPendingSave();
            this.selectedEntry = null;
            if (this.rootContainer) this.renderView(this.rootContainer);
        });

        const headerRight = header.createDiv('codex-detail-header-right');

        // Open in editor
        const openBtn = headerRight.createEl('button', {
            cls: 'codex-detail-action-btn',
            attr: { 'aria-label': 'Open file' },
        });
        const openIcon = openBtn.createSpan();
        obsidian.setIcon(openIcon, 'file');
        attachTooltip(openBtn, 'Open file');
        openBtn.addEventListener('click', () => {
            const file = this.app.vault.getAbstractFileByPath(entry.filePath);
            if (file) this.app.workspace.openLinkText(entry.filePath, '', true);
        });

        // Delete
        const deleteBtn = headerRight.createEl('button', {
            cls: 'codex-detail-action-btn codex-detail-delete-btn',
            attr: { 'aria-label': 'Delete' },
        });
        const deleteIcon = deleteBtn.createSpan();
        obsidian.setIcon(deleteIcon, 'trash');
        attachTooltip(deleteBtn, 'Delete');
        deleteBtn.addEventListener('click', () => this.confirmDeleteEntry(entry));

        // ── Type label ─────────────────────────────────
        const typeLabel = container.createDiv('codex-detail-type-label');
        const typeIcon = typeLabel.createSpan({ cls: 'codex-detail-type-icon' });
        obsidian.setIcon(typeIcon, catDef.icon);
        typeLabel.createSpan({ text: catDef.label.replace(/s$/, '') });

        // ── Portrait / image ───────────────────────────
        const portraitArea = container.createDiv('codex-detail-portrait');
        if (draft.image) {
            const file = this.app.vault.getAbstractFileByPath(draft.image);
            if (file instanceof TFile) {
                const img = portraitArea.createEl('img', {
                    attr: { src: this.app.vault.getResourcePath(file) },
                });
                img.addClass('codex-detail-img');
            }
        } else {
            const placeholder = portraitArea.createDiv('codex-detail-portrait-placeholder');
            obsidian.setIcon(placeholder, 'image');
            placeholder.createEl('span', { text: 'Click to add image' });
        }
        portraitArea.addEventListener('click', () => {
            const sceneFolder = this.sceneManager.getSceneFolder();
            pickImageModal(this.app, sceneFolder, draft.image).then(async (picked) => {
                if (picked !== undefined) {
                    draft.image = picked;
                    this.scheduleSave(draft);
                    if (this.rootContainer) this.renderView(this.rootContainer);
                }
            });
        });

        // ── Layout: form + side ────────────────────────
        const layout = container.createDiv('codex-detail-layout');
        const formPanel = layout.createDiv('codex-detail-form');
        const sidePanel = layout.createDiv('codex-detail-side');

        // Render field categories
        for (const cat of catDef.categories) {
            this.renderFieldCategory(formPanel, cat, draft, catDef);
        }

        // Custom fields section
        this.renderCustomFields(formPanel, draft);

        // Books (series-ready)
        this.renderBooksField(formPanel, draft);

        // Side panel — gallery + notes + references
        this.renderGallerySection(sidePanel, draft);
        this.renderNotesSection(sidePanel, draft);
        this.renderReferencesPanel(sidePanel, entry.name);

        // Show stale-entry warning if codex content changed since last review
        void this.renderStaleWarning(sidePanel, entry);
    }

    // ── Field category rendering ───────────────────────

    private renderFieldCategory(
        container: HTMLElement,
        cat: CodexFieldCategory,
        draft: CodexEntry,
        catDef: CodexCategoryDef,
    ): void {
        const sectionKey = `${catDef.id}-${cat.title}`;
        const isCollapsed = this.collapsedSections.has(sectionKey);

        const section = container.createDiv('codex-section');
        const sectionHeader = section.createDiv('codex-section-header');
        sectionHeader.addEventListener('click', (e) => {
            // Ignore clicks on the add-field button
            if ((e.target as HTMLElement).closest('.character-section-add-field-btn')) return;
            if (this.collapsedSections.has(sectionKey)) {
                this.collapsedSections.delete(sectionKey);
            } else {
                this.collapsedSections.add(sectionKey);
            }
            if (this.rootContainer) this.renderView(this.rootContainer);
        });

        const chevron = sectionHeader.createSpan({ cls: 'codex-section-chevron' });
        obsidian.setIcon(chevron, isCollapsed ? 'chevron-right' : 'chevron-down');

        const catIcon = sectionHeader.createSpan({ cls: 'codex-section-icon' });
        obsidian.setIcon(catIcon, cat.icon);

        sectionHeader.createSpan({ cls: 'codex-section-title', text: cat.title });

        // '+' button to add a universal field to this section
        const addFieldBtn = sectionHeader.createEl('button', {
            cls: 'character-section-add-field-btn',
            attr: { title: 'Add universal field to this section', 'aria-label': 'Add universal field' },
        });
        obsidian.setIcon(addFieldBtn, 'plus');
        addFieldBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sectionNames = catDef.categories.map(c => c.title);
            const existingSiblings = this.plugin.fieldTemplates
                .getBySection(cat.title, catDef.id)
                .map(t => ({ id: t.id, label: t.label }));
            const modal = new AddFieldModal(
                this.app,
                cat.title,
                null,
                async (template, positionAfterId) => {
                    template.category = catDef.id;
                    await this.plugin.fieldTemplates.add(template);
                    if (positionAfterId !== undefined) {
                        await this.plugin.fieldTemplates.moveAfter(template.id, positionAfterId);
                    }
                    if (this.rootContainer) this.renderView(this.rootContainer);
                },
                undefined,
                sectionNames,
                existingSiblings,
            );
            modal.open();
        });

        if (!isCollapsed) {
            const body = section.createDiv('codex-section-body');

            // Filter hidden fields
            const hiddenKeys = this.plugin.settings.hiddenFields[catDef.id] ?? [];
            const visibleFields = cat.fields.filter(f => !hiddenKeys.includes(f.key));
            const hiddenFieldsInCat = cat.fields.filter(f => hiddenKeys.includes(f.key));

            // Render fields in user-defined merged order (built-in + universal).
            // Issue #92 follow-up — universal fields can be moved past built-ins
            // and built-ins themselves can be reordered via the up/down chevrons
            // that appear on hover.
            const universalFields = this.plugin.fieldTemplates.getBySection(cat.title, catDef.id);
            const fieldMap = new Map(visibleFields.map(f => [f.key, f]));
            const tplMap = new Map(universalFields.map(t => [t.id, t]));
            const builtInKeys = visibleFields.map(f => f.key);
            const merged = this.plugin.fieldTemplates.getMergedOrder(cat.title, catDef.id, builtInKeys);
            for (const entry of merged) {
                if (entry.kind === 'builtin') {
                    const f = fieldMap.get(entry.key);
                    if (f) this.renderField(body, f, draft, catDef, cat.title, builtInKeys);
                } else {
                    const t = tplMap.get(entry.key);
                    if (t) this.renderUniversalField(body, t, draft, builtInKeys);
                }
            }

            // Hidden fields toggle
            if (hiddenFieldsInCat.length > 0) {
                const toggleEl = body.createDiv('hidden-fields-toggle');
                toggleEl.createEl('a', {
                    text: `Show ${hiddenFieldsInCat.length} hidden field${hiddenFieldsInCat.length > 1 ? 's' : ''}`,
                    cls: 'hidden-fields-toggle-link',
                });
                const hiddenContainer = body.createDiv('hidden-fields-container');
                hiddenContainer.setCssStyles({ display: 'none' });
                for (const field of hiddenFieldsInCat) {
                    this.renderField(hiddenContainer, field, draft, catDef);
                }
                let showing = false;
                toggleEl.addEventListener('click', () => {
                    showing = !showing;
                    hiddenContainer.setCssStyles({ display: showing ? '' : 'none' });
                    toggleEl.querySelector('a')!.textContent = showing
                        ? `Hide ${hiddenFieldsInCat.length} hidden field${hiddenFieldsInCat.length > 1 ? 's' : ''}`
                        : `Show ${hiddenFieldsInCat.length} hidden field${hiddenFieldsInCat.length > 1 ? 's' : ''}`;
                });
            }
        }
    }

    private renderField(
        container: HTMLElement,
        field: CodexFieldDef,
        draft: CodexEntry,
        catDef: CodexCategoryDef,
        sectionTitle?: string,
        builtInKeys?: string[],
    ): void {
        const { key, label, placeholder, multiline, characterRef } = field;
        const row = container.createDiv('codex-field-row');
        const labelEl = row.createEl('label', { cls: 'codex-field-label', text: label });

        // Up/down chevrons — reorder this built-in field within the section,
        // interleaved with universal fields. Only shown when we have the
        // section context to dispatch the move call.
        if (sectionTitle && builtInKeys) {
            this.addBuiltInMoveChevrons(labelEl, sectionTitle, catDef.id, builtInKeys, key);
        }

        // Hide/unhide toggle (skip 'name')
        if (key !== 'name') {
            const hiddenKeys = this.plugin.settings.hiddenFields[catDef.id] ?? [];
            const isHidden = hiddenKeys.includes(key);
            const hideBtn = labelEl.createEl('span', {
                cls: 'field-hide-btn',
                attr: { 'aria-label': isHidden ? 'Show this field' : 'Hide this field' },
            });
            obsidian.setIcon(hideBtn, isHidden ? 'eye' : 'eye-off');
            hideBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const settings = this.plugin.settings;
                if (!settings.hiddenFields[catDef.id]) settings.hiddenFields[catDef.id] = [];
                const list = settings.hiddenFields[catDef.id];
                const idx = list.indexOf(key);
                if (idx >= 0) {
                    list.splice(idx, 1);
                } else {
                    list.push(key);
                }
                await this.plugin.saveSettings();
                if (this.rootContainer) this.renderView(this.rootContainer);
            });
        }

        const currentValue = draft[key] != null ? String(draft[key]) : '';

        if (characterRef) {
            // Render a character dropdown
            const select = row.createEl('select', { cls: 'codex-field-input dropdown' });
            select.createEl('option', { text: placeholder || 'Select character…', value: '' });

            const characters = this.plugin.characterManager
                .getAllCharacters()
                .map(c => c.name)
                .sort((a, b) => a.localeCompare(b));

            for (const name of characters) {
                const opt = select.createEl('option', { text: name, value: name });
                if (currentValue === name) opt.selected = true;
            }
            // If current value is set but not in characters list, keep it
            if (currentValue && !characters.includes(currentValue)) {
                const opt = select.createEl('option', { text: currentValue, value: currentValue });
                opt.selected = true;
            }
            select.addEventListener('change', () => {
                draft[key] = select.value;
                this.scheduleSave(draft);
            });
        } else if (multiline) {
            const textarea = row.createEl('textarea', {
                cls: 'codex-field-textarea',
                attr: { placeholder, rows: '3' },
            });
            textarea.value = currentValue;
            textarea.addEventListener('input', () => {
                draft[key] = textarea.value;
                this.scheduleSave(draft);
                // Auto-grow
                textarea.setCssStyles({ height: "auto" });

                textarea.setCssStyles({ height: textarea.scrollHeight + 'px' });
            });
            // Initial auto-grow
            window.requestAnimationFrame(() => {
                textarea.setCssStyles({ height: "auto" });

                textarea.setCssStyles({ height: textarea.scrollHeight + 'px' });
            });
        } else {
            const input = row.createEl('input', {
                cls: 'codex-field-input',
                attr: { type: 'text', placeholder },
            });
            input.value = currentValue;
            input.addEventListener('input', () => {
                draft[key] = input.value;
                this.scheduleSave(draft);
            });

            // Name field: cascade rename on blur
            if (key === 'name') {
                input.addEventListener('blur', async () => {
                    const newName = input.value.trim();
                    if (newName && newName !== draft.name) {
                        try {
                            const codexFolder = this.sceneManager.getCodexFolder();
                            const renamed = await this.codexManager.renameEntry(draft, newName, codexFolder);
                            this.selectedEntry = renamed.filePath;
                            if (this.rootContainer) this.renderView(this.rootContainer);
                        } catch (err) {
                            new Notice(`Rename failed: ${err}`);
                        }
                    }
                });
            }
        }
    }

    // ── Universal field rendering ──────────────────────

    /** Shared helper — attach up/down chevron buttons to a built-in field's
     *  label so it participates in the merged section ordering. */
    private addBuiltInMoveChevrons(
        labelEl: HTMLElement,
        section: string,
        category: string,
        builtInKeys: string[],
        fieldKey: string,
    ): void {
        const upBtn = labelEl.createEl('span', {
            cls: 'field-move-btn',
            attr: { title: 'Move field up', 'aria-label': 'Move field up' },
        });
        obsidian.setIcon(upBtn, 'chevron-up');
        upBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.plugin.fieldTemplates.moveEntryUp(section, category, builtInKeys, 'builtin', fieldKey);
            if (this.rootContainer) this.renderView(this.rootContainer);
        });

        const downBtn = labelEl.createEl('span', {
            cls: 'field-move-btn',
            attr: { title: 'Move field down', 'aria-label': 'Move field down' },
        });
        obsidian.setIcon(downBtn, 'chevron-down');
        downBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.plugin.fieldTemplates.moveEntryDown(section, category, builtInKeys, 'builtin', fieldKey);
            if (this.rootContainer) this.renderView(this.rootContainer);
        });
    }

    private renderUniversalField(
        parent: HTMLElement,
        tpl: UniversalFieldTemplate,
        draft: CodexEntry,
        builtInKeys?: string[],
    ): void {
        if (!draft.universalFields) draft.universalFields = {};
        const value = (draft.universalFields[tpl.id] ?? '') as string;

        const row = parent.createDiv('codex-field-row codex-universal-field-row');

        // Label with an edit icon
        const labelWrap = row.createDiv('codex-universal-label-wrap');
        labelWrap.createEl('label', { cls: 'codex-field-label', text: tpl.label });

        const editBtn = labelWrap.createEl('span', {
            cls: 'codex-universal-edit-btn',
            attr: { title: 'Edit or remove this universal field', 'aria-label': 'Edit field' },
        });
        obsidian.setIcon(editBtn, 'pencil');
        editBtn.addEventListener('click', () => {
            const siblings = this.plugin.fieldTemplates
                .getBySection(tpl.section, tpl.category)
                .map(t => ({ id: t.id, label: t.label }));
            const modal = new AddFieldModal(
                this.app,
                tpl.section,
                tpl,
                async (updated) => {
                    await this.plugin.fieldTemplates.update(tpl.id, updated);
                    if (this.rootContainer) this.renderView(this.rootContainer);
                },
                async () => {
                    await this.plugin.fieldTemplates.remove(tpl.id);
                    if (this.rootContainer) this.renderView(this.rootContainer);
                },
                undefined,
                siblings,
            );
            modal.open();
        });

        // Issue #92 — up/down move buttons (revealed on hover)
        const moveUpBtn = labelWrap.createEl('span', {
            cls: 'codex-universal-move-btn',
            attr: { title: 'Move field up', 'aria-label': 'Move field up' },
        });
        obsidian.setIcon(moveUpBtn, 'chevron-up');
        moveUpBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.plugin.fieldTemplates.moveEntryUp(
                tpl.section, tpl.category, builtInKeys ?? [], 'universal', tpl.id,
            );
            if (this.rootContainer) this.renderView(this.rootContainer);
        });

        const moveDownBtn = labelWrap.createEl('span', {
            cls: 'codex-universal-move-btn',
            attr: { title: 'Move field down', 'aria-label': 'Move field down' },
        });
        obsidian.setIcon(moveDownBtn, 'chevron-down');
        moveDownBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.plugin.fieldTemplates.moveEntryDown(
                tpl.section, tpl.category, builtInKeys ?? [], 'universal', tpl.id,
            );
            if (this.rootContainer) this.renderView(this.rootContainer);
        });

        // Input control based on template type
        if (tpl.type === 'multi-select') {
            const raw = draft.universalFields[tpl.id];
            const selected: string[] = Array.isArray(raw) ? [...raw] : (typeof raw === 'string' && raw ? [raw] : []);

            const allOptions = [...tpl.options];
            if (tpl.folderSource) {
                const folder = this.app.vault.getAbstractFileByPath(tpl.folderSource);
                if (folder && 'children' in folder) {
                    for (const child of (folder as obsidian.TFolder).children) {
                        if (child instanceof obsidian.TFile && child.extension === 'md') {
                            if (!allOptions.includes(child.basename)) allOptions.push(child.basename);
                        }
                    }
                }
            }
            allOptions.sort((a, b) => a.localeCompare(b));

            const msContainer = row.createDiv('universal-multi-select');
            const pillsEl = msContainer.createDiv('universal-multi-pills');
            const inputRow = msContainer.createDiv('universal-multi-input-row');
            const msInput = inputRow.createEl('input', {
                cls: 'universal-multi-input',
                type: 'text',
                attr: { placeholder: tpl.placeholder || 'Type to add\u2026' },
            });
            const msDropdown = inputRow.createDiv('universal-multi-dropdown');
            msDropdown.setCssStyles({ display: 'none' });

            const renderPills = () => {
                pillsEl.empty();
                for (const item of selected) {
                    const pill = pillsEl.createSpan({ cls: 'universal-multi-pill' });
                    pill.createSpan({ text: item });
                    const x = pill.createSpan({ cls: 'universal-multi-pill-x', text: '\u00d7' });
                    x.addEventListener('click', () => {
                        const idx = selected.indexOf(item);
                        if (idx >= 0) selected.splice(idx, 1);
                        draft.universalFields![tpl.id] = [...selected];
                        this.scheduleSave(draft);
                        renderPills();
                    });
                }
            };
            renderPills();

            const updateMsDropdown = (filter: string) => {
                msDropdown.empty();
                const lf = filter.toLowerCase();
                const available = allOptions.filter(o => !selected.includes(o) && o.toLowerCase().includes(lf));
                if (available.length === 0) { msDropdown.setCssStyles({ display: 'none' }); return; }
                msDropdown.setCssStyles({ display: '' });
                // Issue #91 — reposition via fixed coords so the popup escapes section overflow
                const r = msInput.getBoundingClientRect();
                const spaceBelow = window.innerHeight - r.bottom;
                const popupMax = 200;
                const flipUp = spaceBelow < 120 && r.top > spaceBelow;
                msDropdown.setCssStyles({
                    position: 'fixed',
                    left: r.left + 'px',
                    width: r.width + 'px',
                    top: flipUp ? '' : (r.bottom + 'px'),
                    bottom: flipUp ? (window.innerHeight - r.top) + 'px' : '',
                    maxHeight: Math.min(popupMax, flipUp ? r.top - 8 : spaceBelow - 8) + 'px',
                    zIndex: '1000',
                });
                for (const opt of available) {
                    const item = msDropdown.createDiv({ cls: 'universal-multi-dropdown-item', text: opt });
                    item.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        selected.push(opt);
                        draft.universalFields![tpl.id] = [...selected];
                        this.scheduleSave(draft);
                        renderPills();
                        msInput.value = '';
                        updateMsDropdown('');
                    });
                }
            };

            msInput.addEventListener('focus', () => updateMsDropdown(msInput.value));
            msInput.addEventListener('input', () => updateMsDropdown(msInput.value));
            msInput.addEventListener('blur', () => { window.setTimeout(() => { msDropdown.setCssStyles({ display: 'none' }); }, 200); });
            msInput.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Enter' && msInput.value.trim()) {
                    e.preventDefault();
                    const val = msInput.value.trim();
                    if (!selected.includes(val)) {
                        selected.push(val);
                        draft.universalFields![tpl.id] = [...selected];
                        this.scheduleSave(draft);
                        renderPills();
                    }
                    msInput.value = '';
                    updateMsDropdown('');
                }
            });
        } else if (tpl.type === 'dropdown') {
            const select = row.createEl('select', { cls: 'codex-field-input dropdown' });
            select.createEl('option', { text: tpl.placeholder || 'Select…', value: '' });

            const dropdownOptions = [...tpl.options];
            if (tpl.folderSource) {
                const folder = this.app.vault.getAbstractFileByPath(tpl.folderSource);
                if (folder && 'children' in folder) {
                    for (const child of (folder as obsidian.TFolder).children) {
                        if (child instanceof obsidian.TFile && child.extension === 'md') {
                            if (!dropdownOptions.includes(child.basename)) dropdownOptions.push(child.basename);
                        }
                    }
                }
                dropdownOptions.sort((a, b) => a.localeCompare(b));
            }

            for (const opt of dropdownOptions) {
                const el = select.createEl('option', { text: opt, value: opt });
                if (value === opt) el.selected = true;
            }
            if (value && !dropdownOptions.includes(value)) {
                const el = select.createEl('option', { text: value, value });
                el.selected = true;
            }
            select.addEventListener('change', () => {
                draft.universalFields![tpl.id] = select.value;
                this.scheduleSave(draft);
            });
        } else if (tpl.type === 'textarea') {
            const textarea = row.createEl('textarea', {
                cls: 'codex-field-textarea',
                attr: { placeholder: tpl.placeholder, rows: '2' },
            });
            textarea.value = value;
            const autoGrow = () => {
                textarea.setCssStyles({ height: 'auto' });
                textarea.setCssStyles({ height: Math.max(textarea.scrollHeight, 48) + 'px' });
            };
            window.setTimeout(autoGrow, 0);
            textarea.addEventListener('input', () => {
                draft.universalFields![tpl.id] = textarea.value;
                this.scheduleSave(draft);
                autoGrow();
            });
        } else {
            const input = row.createEl('input', {
                cls: 'codex-field-input',
                type: 'text',
                attr: { placeholder: tpl.placeholder },
            });
            input.value = value;
            input.addEventListener('input', () => {
                draft.universalFields![tpl.id] = input.value;
                this.scheduleSave(draft);
            });
        }
    }

    // ── Custom fields ──────────────────────────────────

    private renderCustomFields(container: HTMLElement, draft: CodexEntry): void {
        const section = container.createDiv('codex-section');
        const header = section.createDiv('codex-section-header');
        const chevron = header.createSpan({ cls: 'codex-section-chevron' });

        const sectionKey = 'custom-fields';
        const isCollapsed = this.collapsedSections.has(sectionKey);
        obsidian.setIcon(chevron, isCollapsed ? 'chevron-right' : 'chevron-down');

        const icon = header.createSpan({ cls: 'codex-section-icon' });
        obsidian.setIcon(icon, 'plus-circle');
        header.createSpan({ cls: 'codex-section-title', text: 'Custom Fields' });

        header.addEventListener('click', () => {
            if (this.collapsedSections.has(sectionKey)) {
                this.collapsedSections.delete(sectionKey);
            } else {
                this.collapsedSections.add(sectionKey);
            }
            if (this.rootContainer) this.renderView(this.rootContainer);
        });

        if (isCollapsed) return;

        const body = section.createDiv('codex-section-body');
        const custom = draft.custom || {};

        for (const [fieldName, fieldValue] of Object.entries(custom)) {
            const row = body.createDiv('codex-field-row codex-custom-field-row');
            row.createEl('label', { cls: 'codex-field-label', text: fieldName });

            const input = row.createEl('input', {
                cls: 'codex-field-input',
                attr: { type: 'text', placeholder: `Value for ${fieldName}` },
            });
            input.value = fieldValue;
            input.addEventListener('input', () => {
                if (!draft.custom) draft.custom = {};
                draft.custom[fieldName] = input.value;
                this.scheduleSave(draft);
            });

            const removeBtn = row.createEl('button', {
                cls: 'codex-custom-field-remove',
                attr: { 'aria-label': 'Remove field' },
            });
            obsidian.setIcon(removeBtn, 'x');
            removeBtn.addEventListener('click', () => {
                if (draft.custom) {
                    delete draft.custom[fieldName];
                    if (Object.keys(draft.custom).length === 0) draft.custom = undefined;
                }
                this.scheduleSave(draft);
                if (this.rootContainer) this.renderView(this.rootContainer);
            });
        }

        // Add custom field button
        const addRow = body.createDiv('codex-add-custom-field-row');
        const addBtn = addRow.createEl('button', { cls: 'codex-add-custom-btn', text: '+ Add custom field' });
        addBtn.addEventListener('click', () => {
            const modal = new AddCustomFieldModal(this.app, (name) => {
                if (!draft.custom) draft.custom = {};
                draft.custom[name] = '';
                this.scheduleSave(draft);
                if (this.rootContainer) this.renderView(this.rootContainer);
            });
            modal.open();
        });
    }

    // ── Books (series-ready) ───────────────────────────

    private renderBooksField(container: HTMLElement, draft: CodexEntry): void {
        const series = this.plugin.settings.series;
        if (!series) return; // Only show if project is part of a series

        const section = container.createDiv('codex-section');
        const header = section.createDiv('codex-section-header');
        const chevron = header.createSpan({ cls: 'codex-section-chevron' });

        const sectionKey = 'books';
        const isCollapsed = this.collapsedSections.has(sectionKey);
        obsidian.setIcon(chevron, isCollapsed ? 'chevron-right' : 'chevron-down');

        const icon = header.createSpan({ cls: 'codex-section-icon' });
        obsidian.setIcon(icon, 'library');
        header.createSpan({ cls: 'codex-section-title', text: 'Appears In (Books)' });

        header.addEventListener('click', () => {
            if (this.collapsedSections.has(sectionKey)) {
                this.collapsedSections.delete(sectionKey);
            } else {
                this.collapsedSections.add(sectionKey);
            }
            if (this.rootContainer) this.renderView(this.rootContainer);
        });

        if (isCollapsed) return;

        const body = section.createDiv('codex-section-body');
        const books = draft.books || [];

        for (let i = 0; i < books.length; i++) {
            const row = body.createDiv('codex-field-row');
            const input = row.createEl('input', {
                cls: 'codex-field-input',
                attr: { type: 'text', placeholder: 'Book title' },
            });
            input.value = books[i];
            const idx = i;
            input.addEventListener('input', () => {
                if (!draft.books) draft.books = [];
                draft.books[idx] = input.value;
                this.scheduleSave(draft);
            });
        }

        const addBtn = body.createEl('button', { cls: 'codex-add-custom-btn', text: '+ Add book' });
        addBtn.addEventListener('click', () => {
            if (!draft.books) draft.books = [];
            draft.books.push('');
            this.scheduleSave(draft);
            if (this.rootContainer) this.renderView(this.rootContainer);
        });
    }

    // ── Gallery section ────────────────────────────────

    private renderGallerySection(container: HTMLElement, draft: CodexEntry): void {
        const MAX_GALLERY = 10;
        const SECTION_KEY = '__Gallery';

        const wrapper = container.createDiv('character-gallery');
        const gallery = draft.gallery ?? [];

        // Collapsible header with add button
        const isCollapsed = this.collapsedSections.has(SECTION_KEY);
        const header = wrapper.createDiv('character-gallery-header');
        const chevron = header.createSpan('location-section-chevron');
        obsidian.setIcon(chevron, isCollapsed ? 'chevron-right' : 'chevron-down');
        header.createEl('h4', { text: 'Gallery' });

        // Add button in header
        if (gallery.length < MAX_GALLERY) {
            const addBtn = header.createEl('button', {
                cls: 'character-section-add-field-btn',
                attr: { title: `Add image (${gallery.length}/${MAX_GALLERY})`, 'aria-label': 'Add gallery image' },
            });
            obsidian.setIcon(addBtn, 'plus');
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sceneFolder = this.sceneManager.getSceneFolder();
                pickImageModal(this.app, sceneFolder).then(async (picked) => {
                    if (picked !== undefined) {
                        if (!draft.gallery) draft.gallery = [];
                        draft.gallery.push({ path: picked, caption: '' });
                        this.scheduleSave(draft);
                        if (this.rootContainer) this.renderView(this.rootContainer);
                    }
                });
            });
        }

        const body = wrapper.createDiv('character-gallery-body');
        if (isCollapsed) body.setCssStyles({ display: 'none' });

        header.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('.character-section-add-field-btn')) return;
            if (this.collapsedSections.has(SECTION_KEY)) {
                this.collapsedSections.delete(SECTION_KEY);
                body.setCssStyles({ display: '' });
                obsidian.setIcon(chevron, 'chevron-down');
            } else {
                this.collapsedSections.add(SECTION_KEY);
                body.setCssStyles({ display: 'none' });
                obsidian.setIcon(chevron, 'chevron-right');
            }
        });

        // Active (large) image display
        const viewer = body.createDiv('character-gallery-viewer');
        const captionEl = body.createDiv('character-gallery-caption');
        let activeIndex = gallery.length > 0 ? 0 : -1;

        const renderViewer = () => {
            viewer.empty();
            captionEl.empty();
            if (activeIndex >= 0 && activeIndex < gallery.length) {
                const entry = gallery[activeIndex];
                const src = resolveImagePath(this.app, entry.path);
                if (src) {
                    const img = viewer.createEl('img', {
                        cls: 'character-gallery-img',
                        attr: { src, alt: entry.caption || 'Gallery image' },
                    });
                    img.setCssStyles({ cursor: 'pointer' });
                    img.addEventListener('click', () => {
                        const galleryWidth = wrapper.offsetWidth;
                        this.openGalleryLightbox(gallery, activeIndex, galleryWidth);
                    });
                    img.onerror = () => {
                        img.remove();
                        const ph = viewer.createDiv('character-gallery-placeholder');
                        obsidian.setIcon(ph, 'image-off');
                    };
                } else {
                    const ph = viewer.createDiv('character-gallery-placeholder');
                    obsidian.setIcon(ph, 'image-off');
                }

                // Editable caption
                const captionInput = captionEl.createEl('input', {
                    cls: 'character-gallery-caption-input',
                    attr: { type: 'text', placeholder: 'Add caption\u2026', value: entry.caption || '' },
                });
                const idx = activeIndex;
                captionInput.addEventListener('input', () => {
                    gallery[idx].caption = captionInput.value;
                    draft.gallery = gallery.length ? [...gallery] : undefined;
                    this.scheduleSave(draft);
                });

                // Remove button for active image
                const removeBtn = captionEl.createEl('button', {
                    cls: 'character-gallery-remove-btn',
                    attr: { title: 'Remove this image' },
                });
                obsidian.setIcon(removeBtn, 'x');
                removeBtn.addEventListener('click', () => {
                    gallery.splice(idx, 1);
                    draft.gallery = gallery.length ? [...gallery] : undefined;
                    this.scheduleSave(draft);
                    activeIndex = gallery.length > 0 ? Math.min(idx, gallery.length - 1) : -1;
                    renderViewer();
                    renderThumbs();
                });
            } else {
                const ph = viewer.createDiv('character-gallery-empty');
                ph.textContent = 'No images yet';
            }
        };

        // Navigation row: prev | thumbs | next
        const nav = body.createDiv('character-gallery-nav');
        const prevBtn = nav.createEl('button', { cls: 'character-gallery-arrow', attr: { title: 'Previous' } });
        obsidian.setIcon(prevBtn, 'chevron-left');
        prevBtn.addEventListener('click', () => {
            if (gallery.length === 0) return;
            activeIndex = (activeIndex - 1 + gallery.length) % gallery.length;
            renderViewer();
            renderThumbs();
        });

        const thumbStrip = nav.createDiv('character-gallery-thumbs');

        const nextBtn = nav.createEl('button', { cls: 'character-gallery-arrow', attr: { title: 'Next' } });
        obsidian.setIcon(nextBtn, 'chevron-right');
        nextBtn.addEventListener('click', () => {
            if (gallery.length === 0) return;
            activeIndex = (activeIndex + 1) % gallery.length;
            renderViewer();
            renderThumbs();
        });

        const renderThumbs = () => {
            thumbStrip.empty();
            for (let i = 0; i < gallery.length; i++) {
                const thumb = thumbStrip.createDiv(`character-gallery-thumb-item ${i === activeIndex ? 'active' : ''}`);
                const src = resolveImagePath(this.app, gallery[i].path);
                if (src) {
                    thumb.createEl('img', { attr: { src } });
                } else {
                    obsidian.setIcon(thumb, 'image-off');
                }
                thumb.addEventListener('click', () => {
                    activeIndex = i;
                    renderViewer();
                    renderThumbs();
                });
            }
        };

        renderViewer();
        renderThumbs();
    }

    // ── Notes section ──────────────────────────────────

    private renderNotesSection(container: HTMLElement, draft: CodexEntry): void {
        const section = container.createDiv('codex-side-section');
        section.createEl('h4', { text: 'Notes' });

        const textarea = section.createEl('textarea', {
            cls: 'codex-notes-textarea',
            attr: { placeholder: 'Free-form notes (markdown)…', rows: '8' },
        });
        textarea.value = draft.notes || '';
        textarea.addEventListener('input', () => {
            draft.notes = textarea.value;
            this.scheduleSave(draft);
        });
    }

    // ══════════════════════════════════════════════════
    //  Actions
    // ══════════════════════════════════════════════════

    private promptNewEntry(): void {
        const catDef = this.codexManager.getCategoryDef(this.activeCategory);
        if (!catDef) {
            new Notice('Select a category first');
            return;
        }

        const modal = new Modal(this.app);
        modal.titleEl.setText(`New ${catDef.label.replace(/s$/, '')}`);

        let nameValue = '';
        new Setting(modal.contentEl)
            .setName('Name')
            .addText(text => {
                text.setPlaceholder(`Enter ${catDef.label.toLowerCase().replace(/s$/, '')} name`);
                text.onChange(v => { nameValue = v; });
                // Allow Enter to create
                text.inputEl.addEventListener('keydown', async (e) => {
                    if (e.key === 'Enter' && nameValue.trim()) {
                        e.preventDefault();
                        modal.close();
                        await this.createEntry(nameValue.trim());
                    }
                });
                // Auto-focus
                window.setTimeout(() => text.inputEl.focus(), 50);
            });

        new Setting(modal.contentEl)
            .addButton(btn => btn
                .setButtonText('Create')
                .setCta()
                .onClick(async () => {
                    if (!nameValue.trim()) return;
                    modal.close();
                    await this.createEntry(nameValue.trim());
                }));

        modal.open();
    }

    private async createEntry(name: string): Promise<void> {
        try {
            const codexFolder = this.sceneManager.getCodexFolder();
            const entry = await this.codexManager.createEntry(codexFolder, this.activeCategory, name);
            this.selectedEntry = entry.filePath;
            new Notice(`Created ${name}`);
            if (this.rootContainer) this.renderView(this.rootContainer);
        } catch (err) {
            new Notice(`Failed to create entry: ${err}`);
        }
    }

    private confirmDeleteEntry(entry: CodexEntry): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Delete entry');
        modal.contentEl.createEl('p', {
            text: `Are you sure you want to delete "${entry.name}"? This cannot be undone.`,
        });
        new Setting(modal.contentEl)
            .addButton(btn => btn
                .setButtonText('Delete')
                .setWarning()
                .onClick(async () => {
                    modal.close();
                    try {
                        await this.codexManager.deleteEntry(entry.filePath);
                        this.selectedEntry = null;
                        if (this.rootContainer) this.renderView(this.rootContainer);
                    } catch (err) {
                        new Notice(`Delete failed: ${err}`);
                    }
                }))
            .addButton(btn => btn.setButtonText('Cancel').onClick(() => modal.close()));
        modal.open();
    }

    private renderReferencesPanel(container: HTMLElement, entityName: string): void {
        const index = this.plugin.linkScanner.buildEntityIndex();
        const refs = index.get(entityName.toLowerCase());
        if (!refs || refs.length === 0) return;

        const section = container.createDiv('codex-references-panel');
        section.createEl('h3', { text: 'Referenced By' });

        const groups: Record<string, typeof refs> = {};
        for (const ref of refs) {
            const label = ref.type === 'codex' && ref.codexCategory
                ? ref.codexCategory
                : ref.type;
            if (!groups[label]) groups[label] = [];
            groups[label].push(ref);
        }

        for (const [groupLabel, groupRefs] of Object.entries(groups)) {
            const groupEl = section.createDiv('reference-group');
            groupEl.createEl('h4', { text: groupLabel.charAt(0).toUpperCase() + groupLabel.slice(1) });
            const list = groupEl.createEl('ul', { cls: 'reference-list' });
            for (const ref of groupRefs) {
                const li = list.createEl('li');
                const link = li.createEl('a', { text: ref.name, cls: 'reference-link' });
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.app.workspace.openLinkText(ref.filePath, '', false);
                });
            }
        }
    }

    // ── Stale codex entry warning ──────────────────────

    private async renderStaleWarning(container: HTMLElement, entry: CodexEntry): Promise<void> {
        const staleEntries = await this.plugin.getStaleCodexEntries();
        const match = staleEntries.find(s => s.entry.filePath === entry.filePath);
        if (!match || match.affectedScenes.length === 0) return;

        const section = container.createDiv('codex-stale-warning');
        const header = section.createDiv('codex-stale-header');
        const icon = header.createSpan();
        obsidian.setIcon(icon, 'alert-triangle');
        header.createSpan({ text: ` Modified — ${match.affectedScenes.length} scene${match.affectedScenes.length !== 1 ? 's' : ''} may need review` });

        const list = section.createEl('ul', { cls: 'codex-stale-scene-list' });
        for (const ref of match.affectedScenes) {
            const li = list.createEl('li');
            const link = li.createEl('a', { text: ref.name, cls: 'reference-link' });
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.app.workspace.openLinkText(ref.filePath, '', false);
            });
        }

        const reviewBtn = section.createEl('button', {
            text: 'Mark as reviewed',
            cls: 'codex-stale-reviewed-btn',
        });
        reviewBtn.addEventListener('click', async () => {
            await this.plugin.markCodexEntryReviewed(entry.filePath);
            section.remove();
            new Notice('Entry marked as reviewed');
        });
    }

    // ══════════════════════════════════════════════════
    //  Category management modal
    // ══════════════════════════════════════════════════

    private openManageCategoriesModal(): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Manage Codex Categories');
        this.renderCategoryManager(modal.contentEl, modal);
        modal.open();
    }

    private renderCategoryManager(el: HTMLElement, modal: Modal): void {
        el.empty();
        el.addClass('codex-category-manager');

        el.createEl('h4', { text: 'Enabled Categories' });
        el.createEl('p', { cls: 'setting-item-description', text: 'Toggle categories to show in the Codex. Use the sidebar toggle to also show them in the Scene Inspector.' });

        const enabled = new Set(this.plugin.settings.codexEnabledCategories);
        const sidebarSet = new Set(this.plugin.settings.codexSidebarCategories || []);

        // Built-in categories
        for (const cat of BUILTIN_CODEX_CATEGORIES) {
            const row = el.createDiv('codex-category-manager-row');
            const toggle = row.createEl('input', { attr: { type: 'checkbox' } }) as HTMLInputElement;
            toggle.checked = enabled.has(cat.id);
            const iconSpan = row.createSpan({ cls: 'codex-category-manager-icon' });
            obsidian.setIcon(iconSpan, cat.icon);
            row.createSpan({ text: cat.label });

            // Sidebar toggle
            const sidebarLabel = row.createEl('label', { cls: 'codex-sidebar-toggle' });
            sidebarLabel.setCssStyles({
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                opacity: '0.7',
            });
            const sidebarCheck = sidebarLabel.createEl('input', { attr: { type: 'checkbox' } }) as HTMLInputElement;
            sidebarCheck.checked = sidebarSet.has(cat.id);
            sidebarLabel.createSpan({ text: 'Inspector' });
            sidebarCheck.addEventListener('change', () => {
                if (sidebarCheck.checked) sidebarSet.add(cat.id);
                else sidebarSet.delete(cat.id);
            });

            toggle.addEventListener('change', () => {
                if (toggle.checked) {
                    enabled.add(cat.id);
                } else {
                    enabled.delete(cat.id);
                    sidebarSet.delete(cat.id);
                    sidebarCheck.checked = false;
                }
            });
        }

        // Custom categories
        const customCats = this.plugin.settings.codexCustomCategories;
        if (customCats.length > 0) {
            el.createEl('h4', { text: 'Custom Categories' });
            for (const cc of customCats) {
                const row = el.createDiv('codex-category-manager-row');
                const toggle = row.createEl('input', { attr: { type: 'checkbox' } }) as HTMLInputElement;
                toggle.checked = enabled.has(cc.id);
                const iconSpan = row.createSpan({ cls: 'codex-category-manager-icon' });
                obsidian.setIcon(iconSpan, cc.icon);
                row.createSpan({ text: cc.label });

                // Sidebar toggle
                const sidebarLabel = row.createEl('label', { cls: 'codex-sidebar-toggle' });
                sidebarLabel.setCssStyles({
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    opacity: '0.7',
                });
                const sidebarCheck = sidebarLabel.createEl('input', { attr: { type: 'checkbox' } }) as HTMLInputElement;
                sidebarCheck.checked = sidebarSet.has(cc.id);
                sidebarLabel.createSpan({ text: 'Inspector' });
                sidebarCheck.addEventListener('change', () => {
                    if (sidebarCheck.checked) sidebarSet.add(cc.id);
                    else sidebarSet.delete(cc.id);
                });

                toggle.addEventListener('change', () => {
                    if (toggle.checked) {
                        enabled.add(cc.id);
                    } else {
                        enabled.delete(cc.id);
                        sidebarSet.delete(cc.id);
                        sidebarCheck.checked = false;
                    }
                });

                // Delete custom category
                const deleteBtn = row.createEl('button', { cls: 'codex-category-delete-btn' });
                obsidian.setIcon(deleteBtn, 'trash');
                deleteBtn.addEventListener('click', () => {
                    const idx = this.plugin.settings.codexCustomCategories.findIndex(c => c.id === cc.id);
                    if (idx >= 0) this.plugin.settings.codexCustomCategories.splice(idx, 1);
                    enabled.delete(cc.id);
                    this.renderCategoryManager(el, modal);
                });
            }
        }

        // Add custom category
        el.createEl('h4', { text: 'Add Custom Category' });
        let newLabel = '';
        let newIcon = 'file-text';

        new Setting(el)
            .setName('Label')
            .addText(text => {
                text.setPlaceholder('e.g. Factions, Artifacts, Magic…');
                text.onChange(v => { newLabel = v; });
            });

        new Setting(el)
            .setName('Icon')
            .addDropdown(dd => {
                for (const opt of CODEX_ICON_OPTIONS) {
                    dd.addOption(opt.value, opt.label);
                }
                dd.setValue(newIcon);
                dd.onChange(v => { newIcon = v; });
            });

        new Setting(el)
            .addButton(btn => btn
                .setButtonText('Add Category')
                .setCta()
                .onClick(() => {
                    if (!newLabel.trim()) {
                        new Notice('Please enter a label');
                        return;
                    }
                    const id = newLabel.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                    if (!id) {
                        new Notice('Invalid label');
                        return;
                    }
                    // Check duplicates
                    if (BUILTIN_CODEX_CATEGORIES.some(c => c.id === id) ||
                        this.plugin.settings.codexCustomCategories.some(c => c.id === id)) {
                        new Notice('Category already exists');
                        return;
                    }
                    this.plugin.settings.codexCustomCategories.push({
                        id,
                        label: newLabel.trim(),
                        icon: newIcon,
                    });
                    enabled.add(id);
                    this.renderCategoryManager(el, modal);
                }));

        // Save & close
        new Setting(el)
            .addButton(btn => btn
                .setButtonText('Save')
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.codexEnabledCategories = Array.from(enabled);
                    this.plugin.settings.codexSidebarCategories = Array.from(sidebarSet);
                    await this.plugin.saveSettings();
                    // Reinitialise codex manager with new categories
                    this.codexManager.initCategories(
                        this.plugin.settings.codexEnabledCategories,
                        this.resolveCustomDefs(),
                    );
                    const codexFolder = this.sceneManager.getCodexFolder();
                    await this.codexManager.loadAll(codexFolder);
                    // Reset to first available category if current is disabled
                    const cats = this.codexManager.getCategories();
                    if (!cats.find(c => c.id === this.activeCategory) && cats.length > 0) {
                        this.activeCategory = cats[0].id;
                    }
                    modal.close();
                    if (this.rootContainer) this.renderView(this.rootContainer);
                }));
    }

    // ══════════════════════════════════════════════════
    //  Helpers
    // ══════════════════════════════════════════════════

    private resolveCustomDefs() {
        return this.plugin.settings.codexCustomCategories.map(cc =>
            makeCustomCodexCategory(cc.id, cc.label, cc.icon)
        );
    }

    private switchToView(viewType: string): void {
        try {
            this.leaf.setViewState({ type: viewType, active: true, state: {} });
            this.plugin.app.workspace.revealLeaf(this.leaf);
        } catch {
            this.plugin.activateView(viewType);
        }
    }

    private getTypeField(entry: CodexEntry, catDef: CodexCategoryDef): string {
        // Look for fields ending in 'Type' (itemType, creatureType, etc.)
        for (const key of catDef.fieldKeys) {
            if (key.endsWith('Type') && entry[key]) return String(entry[key]);
        }
        return '';
    }

    private countFilledFields(entry: CodexEntry, catDef: CodexCategoryDef): number {
        let count = 0;
        for (const key of catDef.fieldKeys) {
            const val = entry[key];
            if (val !== undefined && val !== null && val !== '' &&
                !(Array.isArray(val) && val.length === 0)) {
                count++;
            }
        }
        return count;
    }

    private renderPseudoTab(
        tabs: HTMLElement,
        label: string,
        icon: string,
        onClick: () => void,
    ): void {
        const tab = tabs.createEl('button', {
            cls: 'codex-tab codex-pseudo-tab',
            attr: { 'aria-label': label },
        });
        const iconSpan = tab.createSpan({ cls: 'codex-tab-icon' });
        obsidian.setIcon(iconSpan, icon);
        tab.createSpan({ cls: 'codex-tab-label', text: label });
        tab.addEventListener('click', onClick);
    }

    // ── Auto-save ──────────────────────────────────────

    private scheduleSave(draft: CodexEntry): void {
        this._pendingDraft = draft;
        if (this._saveTimer) window.clearTimeout(this._saveTimer);
        this._saveTimer = window.setTimeout(async () => {
            this._saveTimer = null;
            await this.executeSave(draft);
        }, CodexView.SAVE_DEBOUNCE_MS);
    }

    private async executeSave(draft: CodexEntry): Promise<void> {
        try {
            await this.codexManager.saveEntry(draft);
            this._lastSaveTime = Date.now();
            this._pendingDraft = null;
        } catch (err) {
            console.error('StoryLine Codex: save failed', err);
        }
    }

    private async flushPendingSave(): Promise<void> {
        if (this._saveTimer) {
            window.clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }
        if (this._pendingDraft) {
            await this.executeSave(this._pendingDraft);
        }
    }

    /**
     * Open a non-modal, draggable/resizable floating window showing a gallery image.
     * Mirrors the lightbox in CharacterView / LocationView so codex entries
     * (items, etc.) can also expand thumbnails to a larger view.
     */
    private openGalleryLightbox(
        gallery: Array<{ path: string; caption: string }>,
        startIndex: number,
        galleryWidth: number,
    ): void {
        activeDocument.querySelector('.gallery-lightbox-window')?.remove();

        let currentIndex = startIndex;
        const winWidth = Math.min(Math.round(galleryWidth * 2), window.innerWidth - 40);
        const winHeight = Math.round((winWidth * 3) / 4) + 36 + 28;

        const win = activeDocument.body.createDiv('gallery-lightbox-window');
        win.setCssStyles({
            width: `${winWidth}px`,
            height: `${winHeight}px`,
        });

        const titlebar = win.createDiv('gallery-lightbox-titlebar');
        const titleText = titlebar.createSpan({ cls: 'gallery-lightbox-title' });
        const closeBtn = titlebar.createEl('button', { cls: 'gallery-lightbox-close', attr: { title: 'Close' } });
        obsidian.setIcon(closeBtn, 'x');
        closeBtn.addEventListener('click', () => { cleanup(); win.remove(); });

        const contentRow = win.createDiv('gallery-lightbox-content-row');

        const prevBtn = contentRow.createEl('button', { cls: 'gallery-lightbox-nav-btn', attr: { title: 'Previous' } });
        obsidian.setIcon(prevBtn, 'chevron-left');
        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + gallery.length) % gallery.length;
            renderContent();
        });

        const imgContainer = contentRow.createDiv('gallery-lightbox-content');

        const nextBtn = contentRow.createEl('button', { cls: 'gallery-lightbox-nav-btn', attr: { title: 'Next' } });
        obsidian.setIcon(nextBtn, 'chevron-right');
        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % gallery.length;
            renderContent();
        });

        const captionEl = win.createDiv('gallery-lightbox-caption');
        const resizeHandle = win.createDiv('gallery-lightbox-resize-handle');

        const zoomLevels = new Map<number, number>();
        const getZoom = () => zoomLevels.get(currentIndex) ?? 1;
        const setZoom = (z: number) => { zoomLevels.set(currentIndex, z); };

        const renderContent = () => {
            const entry = gallery[currentIndex];
            const src = resolveImagePath(this.app, entry.path);
            titleText.textContent = entry.caption || `Image ${currentIndex + 1} of ${gallery.length}`;
            imgContainer.empty();
            if (src) {
                const img = imgContainer.createEl('img', { attr: { src, alt: entry.caption || 'Gallery image' } });
                img.setCssStyles({ transformOrigin: 'center center' });
                const z = getZoom();
                if (z !== 1) img.setCssStyles({ transform: `scale(${z})` });
            }
            captionEl.textContent = entry.caption || '';
            captionEl.setCssStyles({ display: entry.caption ? '' : 'none' });
            prevBtn.setCssStyles({ display: gallery.length > 1 ? '' : 'none' });
            nextBtn.setCssStyles({ display: gallery.length > 1 ? '' : 'none' });
        };
        renderContent();

        imgContainer.addEventListener('wheel', (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Math.max(0.5, Math.min(5, getZoom() + delta));
            setZoom(newZoom);
            const img = imgContainer.querySelector('img');
            if (img) img.setCssStyles({ transform: `scale(${newZoom})` });
        }, { passive: false });

        let pinchStartDist = 0;
        let pinchStartZoom = 1;
        imgContainer.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchStartDist = Math.hypot(dx, dy);
                pinchStartZoom = getZoom();
            }
        }, { passive: true });
        imgContainer.addEventListener('touchmove', (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                const scale = dist / pinchStartDist;
                const newZoom = Math.max(0.5, Math.min(5, pinchStartZoom * scale));
                setZoom(newZoom);
                const img = imgContainer.querySelector('img');
                if (img) img.setCssStyles({ transform: `scale(${newZoom})` });
            }
        }, { passive: false });

        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        titlebar.addEventListener('pointerdown', (e: PointerEvent) => {
            if ((e.target as HTMLElement).closest('.gallery-lightbox-close')) return;
            isDragging = true;
            const rect = win.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            win.setCssStyles({
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                transform: 'none',
            });
            titlebar.setPointerCapture(e.pointerId);
            e.preventDefault();
        });
        titlebar.addEventListener('pointermove', (e: PointerEvent) => {
            if (!isDragging) return;
            win.setCssStyles({
                left: `${e.clientX - dragOffsetX}px`,
                top: `${e.clientY - dragOffsetY}px`,
            });
        });
        titlebar.addEventListener('pointerup', () => { isDragging = false; });
        titlebar.addEventListener('lostpointercapture', () => { isDragging = false; });

        let isResizing = false;
        let resizeStartX = 0;
        let resizeStartY = 0;
        let startW = 0;
        let startH = 0;
        resizeHandle.addEventListener('pointerdown', (e: PointerEvent) => {
            isResizing = true;
            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            startW = win.offsetWidth;
            startH = win.offsetHeight;
            resizeHandle.setPointerCapture(e.pointerId);
            e.preventDefault();
            e.stopPropagation();
        });
        resizeHandle.addEventListener('pointermove', (e: PointerEvent) => {
            if (!isResizing) return;
            const newW = Math.max(200, startW + (e.clientX - resizeStartX));
            const newH = Math.max(150, startH + (e.clientY - resizeStartY));
            win.setCssStyles({
                width: `${newW}px`,
                height: `${newH}px`,
            });
        });
        resizeHandle.addEventListener('pointerup', () => { isResizing = false; });
        resizeHandle.addEventListener('lostpointercapture', () => { isResizing = false; });

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { cleanup(); win.remove(); }
        };
        activeDocument.addEventListener('keydown', onKey);
        const cleanup = () => { activeDocument.removeEventListener('keydown', onKey); };
    }
}

// ═══════════════════════════════════════════════════
//  Small modal for adding a custom field
// ═══════════════════════════════════════════════════

class AddCustomFieldModal extends Modal {
    private callback: (name: string) => void;

    constructor(app: App, callback: (name: string) => void) {
        super(app);
        this.callback = callback;
    }

    onOpen(): void {
        this.titleEl.setText('Add Custom Field');
        let fieldName = '';
        new Setting(this.contentEl)
            .setName('Field name')
            .addText(text => {
                text.setPlaceholder('e.g. Rarity, Alignment…');
                text.onChange(v => { fieldName = v; });
                text.inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && fieldName.trim()) {
                        e.preventDefault();
                        this.close();
                        this.callback(fieldName.trim());
                    }
                });
                window.setTimeout(() => text.inputEl.focus(), 50);
            });

        new Setting(this.contentEl)
            .addButton(btn => btn
                .setButtonText('Add')
                .setCta()
                .onClick(() => {
                    if (fieldName.trim()) {
                        this.close();
                        this.callback(fieldName.trim());
                    }
                }));
    }
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- end of file-wide suppression block opened at line 1 */
