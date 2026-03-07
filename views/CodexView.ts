import { ItemView, WorkspaceLeaf, Modal, Setting, Notice } from 'obsidian';
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
    private _saveTimer: ReturnType<typeof setTimeout> | null = null;
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
            this.sortBy = sortSelect.value as any;
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
            if (file) {
                const img = portraitArea.createEl('img', {
                    attr: { src: this.app.vault.getResourcePath(file as any) },
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

        // Side panel — gallery + notes
        this.renderGallerySection(sidePanel, draft);
        this.renderNotesSection(sidePanel, draft);
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
            const modal = new AddFieldModal(
                this.app,
                cat.title,
                null,
                async (template) => {
                    await this.plugin.fieldTemplates.add(template);
                    if (this.rootContainer) this.renderView(this.rootContainer);
                },
                undefined,
                sectionNames,
            );
            modal.open();
        });

        if (!isCollapsed) {
            const body = section.createDiv('codex-section-body');
            for (const field of cat.fields) {
                this.renderField(body, field, draft, catDef);
            }

            // Render universal fields for this section
            const universalFields = this.plugin.fieldTemplates.getBySection(cat.title);
            for (const tpl of universalFields) {
                this.renderUniversalField(body, tpl, draft);
            }
        }
    }

    private renderField(
        container: HTMLElement,
        field: CodexFieldDef,
        draft: CodexEntry,
        catDef: CodexCategoryDef,
    ): void {
        const { key, label, placeholder, multiline, characterRef } = field;
        const row = container.createDiv('codex-field-row');
        row.createEl('label', { cls: 'codex-field-label', text: label });

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
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            });
            // Initial auto-grow
            requestAnimationFrame(() => {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
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

    private renderUniversalField(
        parent: HTMLElement,
        tpl: UniversalFieldTemplate,
        draft: CodexEntry,
    ): void {
        if (!draft.universalFields) draft.universalFields = {};
        const value = draft.universalFields[tpl.id] ?? '';

        const row = parent.createDiv('codex-field-row codex-universal-field-row');

        // Label with an edit icon
        const labelWrap = row.createDiv('codex-universal-label-wrap');
        labelWrap.createEl('label', { cls: 'codex-field-label', text: tpl.label });

        const editBtn = labelWrap.createEl('button', {
            cls: 'codex-universal-edit-btn',
            attr: { title: 'Edit or remove this universal field', 'aria-label': 'Edit field' },
        });
        obsidian.setIcon(editBtn, 'pencil');
        editBtn.addEventListener('click', () => {
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
            );
            modal.open();
        });

        // Input control based on template type
        if (tpl.type === 'dropdown') {
            const select = row.createEl('select', { cls: 'codex-field-input dropdown' });
            select.createEl('option', { text: tpl.placeholder || 'Select…', value: '' });
            for (const opt of tpl.options) {
                const el = select.createEl('option', { text: opt, value: opt });
                if (value === opt) el.selected = true;
            }
            if (value && !tpl.options.includes(value)) {
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
                textarea.style.height = 'auto';
                textarea.style.height = Math.max(textarea.scrollHeight, 48) + 'px';
            };
            setTimeout(autoGrow, 0);
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
        if (isCollapsed) body.style.display = 'none';

        header.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('.character-section-add-field-btn')) return;
            if (this.collapsedSections.has(SECTION_KEY)) {
                this.collapsedSections.delete(SECTION_KEY);
                body.style.display = '';
                obsidian.setIcon(chevron, 'chevron-down');
            } else {
                this.collapsedSections.add(SECTION_KEY);
                body.style.display = 'none';
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
                    img.style.cursor = 'pointer';
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
                setTimeout(() => text.inputEl.focus(), 50);
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
        el.createEl('p', { cls: 'setting-item-description', text: 'Toggle categories to show in the Codex. Characters and Locations are always available.' });

        const enabled = new Set(this.plugin.settings.codexEnabledCategories);

        // Built-in categories
        for (const cat of BUILTIN_CODEX_CATEGORIES) {
            const row = el.createDiv('codex-category-manager-row');
            const toggle = row.createEl('input', { attr: { type: 'checkbox' } }) as HTMLInputElement;
            toggle.checked = enabled.has(cat.id);
            const iconSpan = row.createSpan({ cls: 'codex-category-manager-icon' });
            obsidian.setIcon(iconSpan, cat.icon);
            row.createSpan({ text: cat.label });

            toggle.addEventListener('change', () => {
                if (toggle.checked) {
                    enabled.add(cat.id);
                } else {
                    enabled.delete(cat.id);
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

                toggle.addEventListener('change', () => {
                    if (toggle.checked) {
                        enabled.add(cc.id);
                    } else {
                        enabled.delete(cc.id);
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
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(async () => {
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
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }
        if (this._pendingDraft) {
            await this.executeSave(this._pendingDraft);
        }
    }
}

// ═══════════════════════════════════════════════════
//  Small modal for adding a custom field
// ═══════════════════════════════════════════════════

class AddCustomFieldModal extends Modal {
    private callback: (name: string) => void;

    constructor(app: any, callback: (name: string) => void) {
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
                setTimeout(() => text.inputEl.focus(), 50);
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
