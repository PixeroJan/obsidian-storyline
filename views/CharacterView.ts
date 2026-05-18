/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import * as obsidian from 'obsidian';
import { SceneManager } from '../services/SceneManager';
import { CharacterManager } from '../services/CharacterManager';
import { renderViewSwitcher } from '../components/ViewSwitcher';
import { RelationshipMap } from '../components/RelationshipMap';
import { StoryGraph } from '../components/StoryGraph';
import { pickImage as pickImageModal, resolveImagePath } from '../components/ImagePicker';
import { isMobile, DESKTOP_ONLY_CHARACTER_MODES, applyMobileClass } from '../components/MobileAdapter';
import { RenameConfirmModal } from '../components/RenameConfirmModal';
import { AddFieldModal } from '../components/AddFieldModal';
import type { UniversalFieldTemplate } from '../services/FieldTemplateService';
import { formatActChapterPrefix } from '../utils/actChapter';

import type SceneCardsPlugin from '../main';

import { attachTooltip } from '../components/Tooltip';
import { renderCodexCategoryTabs } from '../components/CodexCategoryTabs';
import { ItemView, Modal, Notice, Setting, TFile, WorkspaceLeaf } from 'obsidian';
import { CHARACTER_CATEGORIES, CHARACTER_ROLES, Character, CharacterFieldDef, CharacterRelation, CharacterRelationCategory, RELATION_CATEGORIES, RELATION_TYPES_BY_CATEGORY, RoleEntry, TagType, computeReciprocalUpdates, extractCharacterLocationTags, extractCharacterProps, getPrimaryRole, getRoleDisplay, getRoleList, normalizeCharacterRelations } from '../models/Character';
import { CHARACTER_VIEW_TYPE } from '../constants';
import { Scene, resolveStatusCfg } from '../models/Scene';
import { coerceString } from '../utils/narrow';

/**
 * Character View - rich character cards with full profile editing.
 *
 * Overview mode: grid of compact character cards (name, role, scene count).
 * Detail mode: full character profile with collapsible sections and editable fields.
 */
export class CharacterView extends ItemView {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;
    private characterManager: CharacterManager;
    private selectedCharacter: string | null = null;   // file path of selected character
    private rootContainer: HTMLElement | null = null;
    private collapsedSections: Set<string> = new Set();
    private autoSaveTimer: number | null = null;
    /** The draft waiting to be saved (if any) */
    private pendingSaveDraft: Character | null = null;
    /** Snapshot of the character before any edits — used for undo recording */
    private undoSnapshot: Character | null = null;
    /** Timestamp of last self-initiated save; used to suppress external refresh that would steal focus */
    private _lastSaveTime = 0;
    private static readonly SAVE_REFRESH_GRACE_MS = 2000;
    /** Current sub-mode: 'grid' (default), 'map' (relationship map), or 'story-graph' */
    private viewMode: 'grid' | 'map' | 'story-graph' = 'grid';
    /** Active RelationshipMap instance (cleaned up on re-render) */
    private relationshipMap: RelationshipMap | null = null;
    /** Active StoryGraph instance (cleaned up on re-render) */
    private storyGraph: StoryGraph | null = null;
    /** Original name when the detail view was opened — used for cascade rename detection */
    private originalCharacterName: string | null = null;
    /** Last-saved relations snapshot — used to diff for reciprocal sync */
    private _lastSavedRelations: CharacterRelation[] = [];
    /** Flag to prevent reciprocal sync from re-triggering itself */
    private _skipReciprocalSync = false;
    /** Current search/filter text for overview grid */
    private searchText: string = '';
    /** Current sort mode for the overview grid */
    private sortBy: 'name' | 'modified' | 'created' | 'role' = 'name';
    /**
     * When true and the active project belongs to a series, the overview
     * grid hides characters whose `books[]` field excludes the current
     * book (i.e. is non-empty and does not contain the current title).
     */
    private bookFilterActive: boolean = false;

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin, sceneManager: SceneManager) {
        super(leaf);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
        this.characterManager = new CharacterManager(this.app);
    }

    getViewType(): string {
        return CHARACTER_VIEW_TYPE;
    }

    getDisplayText(): string {
        const title = this.plugin?.sceneManager?.activeProject?.title;
        return title ? `StoryLine - ${title}` : 'StoryLine';
    }

    getIcon(): string {
        return 'users';
    }

    async onOpen(): Promise<void> {
        this.plugin.storyLeaf = this.leaf;
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('story-line-character-container');
        applyMobileClass(container);
        this.rootContainer = container;

        await this.sceneManager.initialize();
        await this.characterManager.loadCharacters(this.sceneManager.getCharacterFolder());
        this.renderView(container);
    }

    async onClose(): Promise<void> {
        // Flush any pending auto-save so edits are not lost
        await this.flushPendingSave();
        // Remove any floating lightbox windows from activeDocument.body
        activeDocument.querySelectorAll('.gallery-lightbox-window').forEach(el => el.remove());
    }

    // ── Main render ────────────────────────────────────

    private renderView(container: HTMLElement): void {
        container.empty();

        // Toolbar
        const toolbar = container.createDiv('story-line-toolbar');
        const titleRow = toolbar.createDiv('story-line-title-row');
        titleRow.createEl('h3', { cls: 'story-line-view-title', text: 'StoryLine' });

        renderViewSwitcher(toolbar, CHARACTER_VIEW_TYPE, this.plugin, this.leaf);

        const controls = toolbar.createDiv('story-line-toolbar-controls');

        // ── Codex category tabs ─────────────────────
        renderCodexCategoryTabs(container, {
            activeId: 'characters-pseudo',
            leaf: this.leaf,
            plugin: this.plugin,
        });

        // View mode toggle (Grid / Map) — only shown in overview
        if (!this.selectedCharacter) {
            const modeToggle = controls.createDiv('character-mode-toggle');
            const gridBtn = modeToggle.createEl('button', {
                cls: `character-mode-btn ${this.viewMode === 'grid' ? 'active' : ''}`,
            });
            const gridIcon = gridBtn.createSpan();
            obsidian.setIcon(gridIcon, 'layout-grid');
            gridBtn.createSpan({ text: ' Grid' });
            gridBtn.addEventListener('click', () => {
                if (this.viewMode !== 'grid') {
                    this.viewMode = 'grid';
                    if (this.rootContainer) this.renderView(this.rootContainer);
                }
            });

            // Map and StoryGraph modes — desktop only
            if (!isMobile) {
            const mapBtn = modeToggle.createEl('button', {
                cls: `character-mode-btn ${this.viewMode === 'map' ? 'active' : ''}`,
            });
            const mapIcon = mapBtn.createSpan();
            obsidian.setIcon(mapIcon, 'waypoints');
            mapBtn.createSpan({ text: ' Map' });
            mapBtn.addEventListener('click', () => {
                if (this.viewMode !== 'map') {
                    this.viewMode = 'map';
                    if (this.rootContainer) this.renderView(this.rootContainer);
                }
            });

            const graphBtn = modeToggle.createEl('button', {
                cls: `character-mode-btn ${this.viewMode === 'story-graph' ? 'active' : ''}`,
            });
            const graphIcon = graphBtn.createSpan();
            obsidian.setIcon(graphIcon, 'share-2');
            graphBtn.createSpan({ text: ' Story Graph' });
            graphBtn.addEventListener('click', () => {
                if (this.viewMode !== 'story-graph') {
                    this.viewMode = 'story-graph';
                    if (this.rootContainer) this.renderView(this.rootContainer);
                }
            });
            } // end if (!isMobile)
        }

        // Force grid mode on mobile if user was in a desktop-only mode
        if (isMobile && DESKTOP_ONLY_CHARACTER_MODES.has(this.viewMode)) {
            this.viewMode = 'grid';
        }

        // New character button
        const addBtn = controls.createEl('button', { cls: 'clickable-icon' });
        obsidian.setIcon(addBtn, 'user-round-plus');
        attachTooltip(addBtn, 'New Character');
        addBtn.addEventListener('click', () => this.promptNewCharacter());

        const content = container.createDiv('story-line-character-content');

        // Clean up previous map / graph if any
        if (this.relationshipMap) {
            this.relationshipMap.destroy();
            this.relationshipMap = null;
        }
        if (this.storyGraph) {
            this.storyGraph.destroy();
            this.storyGraph = null;
        }

        if (this.selectedCharacter) {
            this.renderCharacterDetail(content);
        } else if (this.viewMode === 'map') {
            this.renderRelationshipMap(content);
        } else if (this.viewMode === 'story-graph') {
            this.renderStoryGraph(content);
        } else {
            this.renderCharacterOverview(content);
        }
    }

    // ── Overview Grid ──────────────────────────────────

    private renderCharacterOverview(container: HTMLElement): void {
        container.empty();
        container.createEl('h3', { text: 'Characters' });

        // Search + Sort
        const searchRow = container.createDiv('codex-search-row');
        const searchInput = searchRow.createEl('input', {
            cls: 'codex-search-input',
            attr: { type: 'text', placeholder: 'Search characters…' },
        });
        searchInput.value = this.searchText;
        searchInput.addEventListener('input', () => {
            this.searchText = searchInput.value;
            this.renderCharacterOverview(container);
        });
        // Auto-focus the search field and restore cursor position
        window.setTimeout(() => {
            searchInput.focus();
            searchInput.selectionStart = searchInput.selectionEnd = searchInput.value.length;
        }, 0);

        searchRow.createSpan({ cls: 'codex-sort-label', text: 'Sort by' });
        const sortSelect = searchRow.createEl('select', { cls: 'codex-sort-select' });
        for (const opt of [
            { value: 'name', label: 'Name' },
            { value: 'modified', label: 'Last edited' },
            { value: 'created', label: 'Date created' },
            { value: 'role', label: 'Role' },
        ]) {
            const el = sortSelect.createEl('option', { text: opt.label, value: opt.value });
            if (this.sortBy === opt.value) el.selected = true;
        }
        sortSelect.addEventListener('change', () => {
            this.sortBy = sortSelect.value as 'name' | 'role' | 'created' | 'modified';
            this.renderCharacterOverview(container);
        });

        // Series book filter — only meaningful when the active project belongs
        // to a series and characters are shared at series level.
        const currentBook = this.plugin.sceneManager.getCurrentBookTitle();
        const inSeries = !!this.plugin.sceneManager.getSeriesFolder();
        if (inSeries && currentBook) {
            const filterToggle = searchRow.createEl('button', {
                cls: `codex-book-filter${this.bookFilterActive ? ' active' : ''}`,
                text: this.bookFilterActive ? `Showing: ${currentBook}` : 'All books',
            });
            attachTooltip(filterToggle, this.bookFilterActive
                ? `Click to show all series characters`
                : `Click to hide characters not in “${currentBook}”`);
            filterToggle.addEventListener('click', () => {
                this.bookFilterActive = !this.bookFilterActive;
                this.renderCharacterOverview(container);
            });
        }

        const q = this.searchText.toLowerCase();

        let fileCharacters = this.characterManager.getAllCharacters();
        const sceneCharNames = this.sceneManager.queryService.getAllCharacters();
        const scenes = this.sceneManager.getAllScenes();

        // Build alias map: lowered alias → canonical name
        const aliasMap = this.characterManager.buildAliasMap(this.plugin.settings.characterAliases);

        // Kick off async plotgrid scan in the background — will augment cards
        // once resolved. We render the grid immediately and patch in plotgrid
        // data after.
        let plotgridCharacters: Map<string, Set<string>> | null = null;
        if (typeof this.plugin.scanPlotGridCells === 'function') {
            this.plugin.scanPlotGridCells().then(result => {
                plotgridCharacters = result.characters;
                // Re-render plotgrid badges into already-rendered cards
                this.patchPlotGridBadges(container, plotgridCharacters, aliasMap);
            }).catch(() => { /* non-fatal */ });
        }

        // Apply search filter to file-backed characters
        if (q) {
            fileCharacters = fileCharacters.filter(c => c.name.toLowerCase().includes(q));
        }

        // Apply book-membership filter (series mode only).
        // A character is shown when its `books` field is missing/empty
        // (“appears in every book”) or contains the current book title.
        if (this.bookFilterActive && currentBook) {
            const lower = currentBook.toLowerCase();
            fileCharacters = fileCharacters.filter(c => {
                if (!c.books || c.books.length === 0) return true;
                return c.books.some(b => b.toLowerCase() === lower);
            });
        }

        // Apply sort
        if (this.sortBy === 'role') {
            const roleOrder: Record<string, number> = { protagonist: 0, antagonist: 1, supporting: 2, minor: 3 };
            fileCharacters.sort((a, b) => {
                const ra = roleOrder[getPrimaryRole(a.role).toLowerCase()] ?? 99;
                const rb = roleOrder[getPrimaryRole(b.role).toLowerCase()] ?? 99;
                return ra !== rb ? ra - rb : a.name.localeCompare(b.name);
            });
        } else if (this.sortBy === 'modified') {
            fileCharacters.sort((a, b) => (b.modified ?? '').localeCompare(a.modified ?? ''));
        } else if (this.sortBy === 'created') {
            fileCharacters.sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''));
        } else {
            fileCharacters.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        }

        // Characters with files
        if (fileCharacters.length > 0 || sceneCharNames.length > 0) {
            const grid = container.createDiv('character-overview-grid');

            // Render characters that have dedicated files
            for (const char of fileCharacters) {
                this.renderOverviewCard(grid, char, scenes, aliasMap);
            }

            // Find characters from scenes that don't have files yet
            // A scene character is "linked" if any alias resolves to a known profile name
            const fileNames = new Set(fileCharacters.map(c => c.name.toLowerCase()));
            const ignoredSet = new Set(this.plugin.settings.ignoredCharacters.map((n: string) => n.toLowerCase()));
            const manualAliases = this.plugin.settings.characterAliases;
            const unlinked = sceneCharNames.filter(n => {
                const lower = n.toLowerCase();
                // Ignored?
                if (ignoredSet.has(lower)) return false;
                // Manual alias?
                if (manualAliases[lower]) return false;
                // Direct match
                if (fileNames.has(lower)) return false;
                // Auto-alias match (nickname or first name)
                const canonical = aliasMap.get(lower);
                if (canonical && fileNames.has(canonical.toLowerCase())) return false;
                return true;
            });

            // Deduplicate unlinked names: if "Micke" and "Micke Barr" both
            // appear, merge the short (first-name-only) form into the longer
            // full name so only "Micke Barr" is shown.
            let deduped = this.deduplicateUnlinked(unlinked);
            if (q) {
                deduped = deduped.filter(n => n.toLowerCase().includes(q));
            }

            if (deduped.length > 0) {
                // Divider
                if (fileCharacters.length > 0) {
                    const divider = container.createDiv('character-unlinked-divider');
                    divider.createEl('span', { text: 'Characters from scenes (no profile yet)' });
                }
                const ugrid = container.createDiv('character-overview-grid');
                for (const name of deduped) {
                    this.renderUnlinkedCard(ugrid, name, scenes, aliasMap);
                }
            }
        } else {
            const empty = container.createDiv('character-empty-state');
            const emptyIcon = empty.createDiv('character-empty-icon');
            obsidian.setIcon(emptyIcon, 'user-plus');
            empty.createEl('h4', { text: 'No characters yet' });
            empty.createEl('p', { text: 'Click "+ New Character" to create your first character profile, or add characters to your scene frontmatter.' });
        }
    }

    /**
     * After plotgrid scan resolves, patch "Plotgrid" badges into already-rendered cards.
     */
    private patchPlotGridBadges(
        container: HTMLElement,
        pgChars: Map<string, Set<string>>,
        aliasMap: Map<string, string>,
    ): void {
        const cards = container.querySelectorAll('.character-overview-card');
        cards.forEach(cardEl => {
            const nameEl = cardEl.querySelector('h4');
            if (!nameEl) return;
            const charName = nameEl.textContent || '';

            // Gather all alias keys for this character
            const keys = new Set<string>();
            keys.add(charName.toLowerCase());
            for (const [alias, canonical] of aliasMap) {
                if (canonical.toLowerCase() === charName.toLowerCase()) keys.add(alias);
            }

            // Sum plotgrid rows mentioning this character
            let pgRows = new Set<string>();
            for (const key of keys) {
                const rows = pgChars.get(key);
                if (rows) rows.forEach(r => pgRows.add(r));
            }

            if (pgRows.size > 0) {
                // Find the stats div and append plotgrid stat
                const statsDiv = cardEl.querySelector('.character-card-stats');
                if (statsDiv && !statsDiv.querySelector('.character-plotgrid-badge')) {
                    statsDiv.createSpan({ cls: 'character-stat-sep', text: '\u00b7' });
                    const badge = statsDiv.createSpan({ cls: 'character-plotgrid-badge' });
                    badge.textContent = `${pgRows.size} plotgrid`;
                    badge.title = `Mentioned in plotgrid rows: ${[...pgRows].join(', ')}`;
                    badge.setCssStyles({ color: 'var(--text-accent)' });
                }
            }
        });
    }

    private renderOverviewCard(grid: HTMLElement, char: Character, scenes: Scene[], aliasMap?: Map<string, string>): void {
        const card = grid.createDiv('character-overview-card');

        // Role badges — supports string or string[] (issue #72 Tier 1)
        const roleList = getRoleList(char.role);
        if (roleList.length) {
            const wrap = card.createDiv('character-role-badges');
            for (const r of roleList) {
                const badge = wrap.createDiv('character-role-badge');
                badge.textContent = r;
                badge.addClass(this.roleClass(r));
            }
        }

        // Portrait / placeholder
        const portrait = card.createDiv('character-card-portrait');
        if (char.image) {
            const imgSrc = resolveImagePath(this.app, char.image);
            if (imgSrc) {
                const img = portrait.createEl('img', {
                    cls: 'character-portrait-img',
                    attr: { src: imgSrc, alt: char.name }
                });
                img.onerror = () => {
                    img.remove();
                    const ph = portrait.createDiv('character-portrait-placeholder');
                    obsidian.setIcon(ph, 'circle-user-round');
                };
            } else {
                const ph = portrait.createDiv('character-portrait-placeholder');
                obsidian.setIcon(ph, 'circle-user-round');
            }
        } else {
            const placeholder = portrait.createDiv('character-portrait-placeholder');
            obsidian.setIcon(placeholder, 'circle-user-round');
        }

        // Name
        card.createEl('h4', { text: char.name });

        // Short description snippet — per-character tagline field selector, with auto fallback
        const taglineKey = char.tagline; // a field key like 'personality', 'occupation', etc.
        const autoSnippet = char.personality || char.occupation || getRoleDisplay(char.role) || '';
        const snippet = (taglineKey ? coerceString((char as unknown as Record<string, unknown>)[taglineKey]) : '') || autoSnippet;
        if (snippet) {
            card.createEl('p', { cls: 'character-card-snippet', text: snippet });
        }

        // Build the set of all lowercased names that resolve to this character
        const charAliases = new Set<string>();
        charAliases.add(char.name.toLowerCase());
        if (aliasMap) {
            for (const [alias, canonical] of aliasMap) {
                if (canonical.toLowerCase() === char.name.toLowerCase()) {
                    charAliases.add(alias);
                }
            }
        }

        // Scene stats — match against all aliases (frontmatter + LinkScanner)
        let povCount = 0;
        let presentCount = 0;
        for (const s of scenes) {
            const { isPov, isPresent } = this.isCharInScene(s, charAliases);
            if (isPov) povCount++;
            else if (isPresent) presentCount++;
        }
        const total = povCount + presentCount;

        const stats = card.createDiv('character-card-stats');
        if (total > 0) {
            stats.createSpan({ text: `${povCount} POV` });
            stats.createSpan({ cls: 'character-stat-sep', text: '\u00b7' });
            stats.createSpan({ text: `${total} scenes` });
        } else {
            stats.createSpan({ cls: 'character-stat-none', text: 'No scenes yet' });
        }

        // Completeness indicator
        const filled = CHARACTER_CATEGORIES.reduce((acc, cat) =>
            acc + cat.fields.filter(f => {
                const val = char[f.key];
                return val !== undefined && val !== null && val !== '';
            }).length, 0);
        const totalFields = CHARACTER_CATEGORIES.reduce((acc, cat) => acc + cat.fields.length, 0);
        const pct = Math.round((filled / totalFields) * 100);
        const completeness = card.createDiv('character-card-completeness');
        const bar = completeness.createDiv('character-completeness-bar');
        const fill = bar.createDiv('character-completeness-fill');
        fill.setCssStyles({ width: `${pct}%` });
        completeness.createSpan({ cls: 'character-completeness-label', text: `${pct}% complete` });

        // Prop & location tags extracted from character fields
        const overrides = this.plugin.settings.tagTypeOverrides;
        const charProps = extractCharacterProps(char, overrides);
        const charLocTags = extractCharacterLocationTags(char, overrides);
        if (charLocTags.length > 0 || charProps.length > 0) {
            const propsRow = card.createDiv('character-card-props');
            charLocTags.forEach(p => {
                const span = propsRow.createSpan({ cls: 'character-prop-tag character-loc-tag', text: `#${p}` });
                if (overrides[p.toLowerCase()]) span.addClass('tag-overridden');
                this.addTagContextMenu(span, p);
            });
            charProps.slice(0, 5).forEach(p => {
                const span = propsRow.createSpan({ cls: 'character-prop-tag', text: `#${p}` });
                if (overrides[p.toLowerCase()]) span.addClass('tag-overridden');
                this.addTagContextMenu(span, p);
            });
            const totalTags = charLocTags.length + charProps.length;
            if (totalTags > 5 + charLocTags.length) {
                propsRow.createSpan({ cls: 'character-prop-more', text: `+${charProps.length - 5}` });
            }
        }

        card.addEventListener('click', () => {
            this.selectedCharacter = char.filePath;
            this.renderView(this.rootContainer!);
        });

        // Right-click context menu — promote / demote between project and
        // series, and toggle book membership (series mode only).
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showCharacterContextMenu(char, e);
        });
    }

    private renderUnlinkedCard(grid: HTMLElement, name: string, scenes: Scene[], aliasMap?: Map<string, string>): void {
        const card = grid.createDiv('character-overview-card character-unlinked');

        card.createEl('h4', { text: name });

        // Build set of all name variants that belong to this character
        // (the canonical name + any aliases that map to it)
        const nameAliases = new Set<string>();
        nameAliases.add(name.toLowerCase());
        if (aliasMap) {
            // Find all aliases that resolve to this name
            for (const [alias, canonical] of aliasMap) {
                if (canonical.toLowerCase() === name.toLowerCase()) {
                    nameAliases.add(alias);
                }
            }
            // Also check if this name itself maps to something (shouldn't happen
            // after dedup, but be safe)
            const mapped = aliasMap.get(name.toLowerCase());
            if (mapped) {
                nameAliases.add(mapped.toLowerCase());
            }
        }

        // Scene stats — count across all aliases (frontmatter + LinkScanner)
        let povCount = 0;
        let presentCount = 0;
        for (const s of scenes) {
            const { isPov, isPresent } = this.isCharInScene(s, nameAliases);
            if (isPov) povCount++;
            else if (isPresent) presentCount++;
        }

        const stats = card.createDiv('character-card-stats');
        stats.createSpan({ text: `${povCount} POV \u00b7 ${povCount + presentCount} scenes` });

        const btnRow = card.createDiv('character-unlinked-actions');

        const createBtn = btnRow.createEl('button', { cls: 'character-create-profile-btn', text: 'Create Profile' });
        createBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.createCharacterFromName(name);
        });

        const linkBtn = btnRow.createEl('button', { cls: 'character-link-btn', text: 'Link to\u2026' });
        linkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.promptLinkCharacter(name);
        });

        const ignoreBtn = btnRow.createEl('button', { cls: 'character-ignore-btn', text: 'Ignore' });
        ignoreBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.ignoreCharacter(name);
        });
    }

    /**
     * Prompt user to pick which existing character to link an alias to.
     */
    private promptLinkCharacter(aliasName: string): void {
        const characters = this.characterManager.getAllCharacters();
        if (characters.length === 0) {
            new Notice('No character profiles to link to. Create a profile first.');
            return;
        }

        const modal = new LinkCharacterModal(this.app, aliasName, characters, async (canonical) => {
            this.plugin.settings.characterAliases[aliasName.toLowerCase()] = canonical;
            await this.plugin.saveSettings();
            // Rebuild lookups so the alias is immediately recognised
            this.plugin.linkScanner.invalidateAll();
            this.plugin.linkScanner.rebuildLookups(this.plugin.settings.characterAliases);
            new Notice(`"${aliasName}" linked to ${canonical}`);
            if (this.rootContainer) this.renderView(this.rootContainer);
        });
        modal.open();
    }

    /**
     * Add a character name to the ignored list.
     */
    private async ignoreCharacter(name: string): Promise<void> {
        const lower = name.toLowerCase();
        if (!this.plugin.settings.ignoredCharacters.includes(lower)) {
            this.plugin.settings.ignoredCharacters.push(lower);
            await this.plugin.saveSettings();
        }
        new Notice(`"${name}" ignored`);
        if (this.rootContainer) this.renderView(this.rootContainer);
    }

    /**
     * Deduplicate unlinked names: when a first-name-only entry (e.g. "Micke")
     * and a full-name entry (e.g. "Micke Barr") both appear, keep only the
     * full name. The alias map is updated so "micke" → "Micke Barr", which
     * lets the scene-count logic aggregate both.
     */
    private deduplicateUnlinked(names: string[]): string[] {
        // Build a map: first-word (lowered) → list of full names that start with that word
        const byFirst = new Map<string, string[]>();
        for (const n of names) {
            const first = n.split(/\s+/)[0]?.toLowerCase();
            if (first) {
                if (!byFirst.has(first)) byFirst.set(first, []);
                byFirst.get(first)!.push(n);
            }
        }

        const toRemove = new Set<string>(); // lowered names to drop

        for (const [_firstLower, group] of byFirst) {
            if (group.length < 2) continue;
            // Separate single-word names from multi-word names
            const singles = group.filter(n => !n.includes(' '));
            const fulls = group.filter(n => n.includes(' '));
            if (singles.length > 0 && fulls.length === 1) {
                // Exactly one full name — merge all singles into it
                const canonical = fulls[0];
                for (const s of singles) {
                    toRemove.add(s.toLowerCase());
                    // Also register in the plugin settings alias map so
                    // LinkScanner and future renders benefit
                    this.plugin.settings.characterAliases[s.toLowerCase()] = canonical;
                }
                // Persist (fire-and-forget; next reload will have it)
                this.plugin.saveSettings();
            }
            // If there are multiple full names (rare), leave them alone —
            // the user can manually link/ignore.
        }

        return names.filter(n => !toRemove.has(n.toLowerCase()));
    }

    // ── Relationship Map ────────────────────────────────

    private renderRelationshipMap(container: HTMLElement): void {
        container.empty();
        container.createEl('h3', { text: 'Relationship Map' });

        const characters = this.characterManager.getAllCharacters();
        const mapContainer = container.createDiv('relationship-map-container');

        this.relationshipMap = new RelationshipMap(
            mapContainer,
            characters,
            (name: string) => {
                // Double-click a node → open that character's detail view
                const char = characters.find(c => c.name === name);
                if (char) {
                    this.selectedCharacter = char.filePath;
                    this.viewMode = 'grid'; // switch back to grid for detail
                    if (this.rootContainer) this.renderView(this.rootContainer);
                }
            },
        );
        this.relationshipMap.render();
    }

    // ── Scene presence helper (frontmatter + LinkScanner) ──

    /**
     * Check if a character (identified by a set of lowercased aliases) is
     * present in a scene — either via frontmatter characters/pov OR via
     * LinkScanner body-text detection.
     */
    private isCharInScene(scene: Scene, charAliases: Set<string>): { isPov: boolean; isPresent: boolean } {
        const isPov = !!(scene.pov && charAliases.has(scene.pov.toLowerCase()));
        const fmPresent = scene.characters?.some(c => charAliases.has(c.toLowerCase())) ?? false;

        // Check LinkScanner results for body-text mentions
        let scanPresent = false;
        try {
            const scanResult = this.plugin.linkScanner?.getResult(scene.filePath);
            if (scanResult?.characters) {
                scanPresent = scanResult.characters.some(c => charAliases.has(c.toLowerCase()));
            }
        } catch { /* scanner not ready */ }

        return { isPov, isPresent: isPov || fmPresent || scanPresent };
    }

    // ── Story Graph ────────────────────────────────────

    private renderStoryGraph(container: HTMLElement): void {
        container.empty();
        container.createEl('h3', { text: 'Story Graph' });

        const scenes = this.sceneManager.getAllScenes();
        const characters = this.characterManager.getAllCharacters();
        const scanner = this.plugin.linkScanner;
        // Ensure scan results are up to date
        scanner.rebuildLookups(this.plugin.settings.characterAliases);
        const scanResults = scanner.scanAll(scenes);

        const graphContainer = container.createDiv('story-graph-container');

        this.storyGraph = new StoryGraph(
            graphContainer,
            scenes,
            characters,
            scanResults,
            (filePath: string) => {
                // Double-click a scene node → open the file
                const file = this.app.vault.getAbstractFileByPath(filePath);
                if (file) {
                    this.app.workspace.openLinkText(filePath, '', true);
                }
            },
            this.plugin.settings.tagTypeOverrides,
        );
        this.storyGraph.render();
    }

    // ── Character Detail ───────────────────────────────

    private renderCharacterDetail(container: HTMLElement): void {
        container.empty();
        const character = this.characterManager.getCharacter(this.selectedCharacter!);
        if (!character) {
            this.selectedCharacter = null;
            this.renderCharacterOverview(container);
            return;
        }

        // Working copy for editing
        const draft: Character = { ...character, custom: { ...(character.custom || {}) }, universalFields: { ...(character.universalFields || {}) } };
        // Snapshot for undo — taken once when the detail view opens
        this.undoSnapshot = { ...character, custom: { ...(character.custom || {}) }, universalFields: { ...(character.universalFields || {}) } };
        // Track original name for cascade rename detection
        this.originalCharacterName = character.name;
        // Snapshot relations for reciprocal sync diffing
        this._lastSavedRelations = normalizeCharacterRelations(character.relations).map(r => ({ ...r }));

        // Back button + character name header
        const header = container.createDiv('character-detail-header');
        const backBtn = header.createEl('span', { cls: 'codex-nav-back-link' });
        const backIcon = backBtn.createSpan();
        obsidian.setIcon(backIcon, 'circle-arrow-left');
        backBtn.createSpan({ text: ' All Characters' });
        backBtn.addEventListener('click', () => {
            this.selectedCharacter = null;
            this.renderView(this.rootContainer!);
        });

        const headerRight = header.createDiv('character-detail-header-right');

        // Open file button
        const openBtn = headerRight.createEl('button', {
            cls: 'codex-detail-action-btn',
            attr: { 'aria-label': 'Open character file' },
        });
        const openIcon = openBtn.createSpan();
        obsidian.setIcon(openIcon, 'file');
        attachTooltip(openBtn, 'Open character file');
        openBtn.addEventListener('click', () => this.openCharacterFile(character));

        // Delete button
        const deleteBtn = headerRight.createEl('button', {
            cls: 'codex-detail-action-btn codex-detail-delete-btn',
            attr: { 'aria-label': 'Delete character' },
        });
        const deleteIcon = deleteBtn.createSpan();
        obsidian.setIcon(deleteIcon, 'trash');
        attachTooltip(deleteBtn, 'Delete character');
        deleteBtn.addEventListener('click', () => this.confirmDeleteCharacter(character));

        // Portrait area (detail view — larger, clickable to change)
        const portraitArea = container.createDiv('character-detail-portrait');
        const renderPortrait = () => {
            portraitArea.empty();
            if (draft.image) {
                const imgSrc = resolveImagePath(this.app, draft.image);
                if (imgSrc) {
                    const img = portraitArea.createEl('img', {
                        cls: 'character-detail-portrait-img',
                        attr: { src: imgSrc, alt: draft.name }
                    });
                    img.onerror = () => {
                        img.remove();
                        const ph = portraitArea.createDiv('character-detail-portrait-placeholder');
                        obsidian.setIcon(ph, 'circle-user-round');
                    };
                } else {
                    const ph = portraitArea.createDiv('character-detail-portrait-placeholder');
                    obsidian.setIcon(ph, 'circle-user-round');
                }
            } else {
                const ph = portraitArea.createDiv('character-detail-portrait-placeholder');
                obsidian.setIcon(ph, 'circle-user-round');
            }
            const changeLabel = portraitArea.createDiv('character-portrait-change-label');
            changeLabel.textContent = draft.image ? 'Change image' : 'Add image';
        };
        renderPortrait();
        portraitArea.addEventListener('click', () => {
            this.pickImage(draft.image).then(async (picked) => {
                if (picked !== undefined) {
                    draft.image = picked || undefined;
                    await this.characterManager.saveCharacter(draft);
                    renderPortrait();
                }
            });
        });

        // Layout: form on left, scene panel on right
        const layout = container.createDiv('character-detail-layout');
        const formPanel = layout.createDiv('character-detail-form');
        const sidePanel = layout.createDiv('character-detail-side');

        // ── Form sections ──
        for (const category of CHARACTER_CATEGORIES) {
            this.renderCategory(formPanel, category, draft);
        }

        // ── Custom fields section ──
        this.renderCustomFields(formPanel, draft);

        // ── Side panel: gallery + scene info + references ──
        this.renderGallery(sidePanel, draft);
        this.renderScenePanel(sidePanel, character.name);
        this.renderReferencesPanel(sidePanel, character.name);
    }

    private renderCategory(
        parent: HTMLElement,
        category: { title: string; icon: string; fields: CharacterFieldDef[] },
        draft: Character
    ): void {
        const section = parent.createDiv('character-section');
        const isCollapsed = this.collapsedSections.has(category.title);

        // Section header (clickable to collapse)
        const sectionHeader = section.createDiv('character-section-header');
        const chevron = sectionHeader.createSpan('character-section-chevron');
        obsidian.setIcon(chevron, isCollapsed ? 'chevron-right' : 'chevron-down');
        const icon = sectionHeader.createSpan('character-section-icon');
        obsidian.setIcon(icon, category.icon);
        sectionHeader.createSpan({ text: category.title });

        // ── '+' button to add a universal field to this section ──
        const addFieldBtn = sectionHeader.createEl('button', {
            cls: 'character-section-add-field-btn',
            attr: { title: 'Add universal field to this section', 'aria-label': 'Add universal field' },
        });
        obsidian.setIcon(addFieldBtn, 'plus');
        addFieldBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't toggle collapse
            const existingSiblings = this.plugin.fieldTemplates
                .getBySection(category.title, 'character')
                .map(t => ({ id: t.id, label: t.label }));
            const modal = new AddFieldModal(
                this.app,
                category.title,
                null,
                async (template, positionAfterId) => {
                    template.category = 'character';
                    await this.plugin.fieldTemplates.add(template);
                    if (positionAfterId !== undefined) {
                        await this.plugin.fieldTemplates.moveAfter(template.id, positionAfterId);
                    }
                    // Re-render the detail view to show the new field
                    if (this.selectedCharacter && this.rootContainer) {
                        this.renderCharacterDetail(this.rootContainer);
                    }
                },
                undefined,
                undefined,
                existingSiblings,
            );
            modal.open();
        });

        const sectionBody = section.createDiv('character-section-body');
        if (isCollapsed) sectionBody.setCssStyles({ display: 'none' });

        sectionHeader.addEventListener('click', (e) => {
            // Ignore clicks on the add-field button
            if ((e.target as HTMLElement).closest('.character-section-add-field-btn')) return;
            if (this.collapsedSections.has(category.title)) {
                this.collapsedSections.delete(category.title);
                sectionBody.setCssStyles({ display: '' });
                obsidian.setIcon(chevron, 'chevron-down');
            } else {
                this.collapsedSections.add(category.title);
                sectionBody.setCssStyles({ display: 'none' });
                obsidian.setIcon(chevron, 'chevron-right');
            }
        });

        // Built-in fields (skip hidden ones)
        const hiddenKeys = this.plugin.settings.hiddenFields['character'] ?? [];
        const visibleFields = category.fields.filter(f => !hiddenKeys.includes(f.key));
        const hiddenFieldsInCat = category.fields.filter(f => hiddenKeys.includes(f.key));

        // Render fields in user-defined merged order (built-in + universal).
        const universalFields = this.plugin.fieldTemplates.getBySection(category.title, 'character');
        const fieldMap = new Map(visibleFields.map(f => [f.key, f]));
        const tplMap = new Map(universalFields.map(t => [t.id, t]));
        const builtInKeys = visibleFields.map(f => f.key);
        const merged = this.plugin.fieldTemplates.getMergedOrder(category.title, 'character', builtInKeys);
        for (const entry of merged) {
            if (entry.kind === 'builtin') {
                const f = fieldMap.get(entry.key);
                if (f) this.renderField(sectionBody, f, draft, category.title, builtInKeys);
            } else {
                const t = tplMap.get(entry.key);
                if (t) this.renderUniversalField(sectionBody, t, draft, builtInKeys);
            }
        }

        // Show toggle for hidden fields
        if (hiddenFieldsInCat.length > 0) {
            const toggleEl = sectionBody.createDiv('hidden-fields-toggle');
            toggleEl.createEl('a', {
                text: `Show ${hiddenFieldsInCat.length} hidden field${hiddenFieldsInCat.length > 1 ? 's' : ''}`,
                cls: 'hidden-fields-toggle-link',
            });
            const hiddenContainer = sectionBody.createDiv('hidden-fields-container');
            hiddenContainer.setCssStyles({ display: 'none' });
            for (const field of hiddenFieldsInCat) {
                this.renderField(hiddenContainer, field, draft);
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

    private renderField(parent: HTMLElement, field: CharacterFieldDef, draft: Character, sectionTitle?: string, builtInKeys?: string[]): void {
        const row = parent.createDiv('character-field-row');
        const labelEl = row.createEl('label', { cls: 'character-field-label', text: field.label });

        // Up/down chevrons — reorder this built-in field within the section.
        if (sectionTitle && builtInKeys) {
            this.addBuiltInMoveChevrons(labelEl, sectionTitle, 'character', builtInKeys, field.key);
        }

        // Hide/unhide field button (skip for 'name' — always visible)
        if (field.key !== 'name') {
            const hiddenKeys = this.plugin.settings.hiddenFields['character'] ?? [];
            const isHidden = hiddenKeys.includes(field.key);
            const hideBtn = labelEl.createEl('span', {
                cls: 'field-hide-btn',
                attr: { 'aria-label': isHidden ? 'Show this field' : 'Hide this field' },
            });
            obsidian.setIcon(hideBtn, isHidden ? 'eye' : 'eye-off');
            hideBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const settings = this.plugin.settings;
                if (!settings.hiddenFields['character']) settings.hiddenFields['character'] = [];
                const list = settings.hiddenFields['character'];
                const idx = list.indexOf(field.key);
                if (idx >= 0) {
                    list.splice(idx, 1);
                } else {
                    list.push(field.key);
                }
                await this.plugin.saveSettings();
                if (this.selectedCharacter && this.rootContainer) {
                    this.renderCharacterDetail(this.rootContainer);
                }
            });
        }

        // Coerce array shapes (e.g. role: string[]) to a comma-separated string
        // for input rendering. Issue #72 Tier 1.
        const rawValue: unknown = (draft as unknown as Record<string, unknown>)[field.key];
        let value: string = coerceString(rawValue);
        if (Array.isArray(rawValue)) value = rawValue.map(v => coerceString(v).trim()).filter(Boolean).join(', ');

        if (field.key === 'relations') {
            this.renderRelationsField(row, draft);
            return;
        }

        if (field.key === 'tagline') {
            // Tagline is a dropdown that picks which other field to show on the card
            const select = row.createEl('select', { cls: 'character-field-input dropdown' });
            select.createEl('option', { text: 'Auto (personality → occupation → role)', value: '' });
            const taglineOptions: { key: string; label: string }[] = [];
            for (const cat of CHARACTER_CATEGORIES) {
                for (const f of cat.fields) {
                    if (['name', 'tagline', 'relations', 'locations', 'image'].includes(f.key)) continue;
                    taglineOptions.push({ key: f.key, label: f.label });
                }
            }
            for (const opt of taglineOptions) {
                const el = select.createEl('option', { text: opt.label, value: opt.key });
                if (value === opt.key) el.selected = true;
            }
            select.addEventListener('change', () => {
                (draft as unknown as Record<string, unknown>)[field.key] = select.value;
                this.scheduleSave(draft);
            });
            return;
        }

        if (field.key === 'role') {
            // Role accepts a single value or a comma-separated list of values
            // (issue #72 Tier 1). Rendered as a text input with a datalist of
            // suggestions so the user can pick or type freely (e.g.
            // "Mentor, Love Interest, Antagonist").
            const listId = `character-role-list-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const input = row.createEl('input', {
                cls: 'character-field-input',
                type: 'text',
                attr: { placeholder: field.placeholder, list: listId },
            });
            input.value = value;
            const datalist = row.createEl('datalist', { attr: { id: listId } });
            for (const r of CHARACTER_ROLES) {
                datalist.createEl('option', { attr: { value: r } });
            }
            input.addEventListener('input', () => {
                const raw = input.value;
                // Persist as array when comma-separated, else single string
                if (raw.includes(',')) {
                    (draft as unknown as Record<string, unknown>)[field.key] = raw
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean);
                } else {
                    (draft as unknown as Record<string, unknown>)[field.key] = raw;
                }
                this.scheduleSave(draft);
            });

            // Issue #72 Tier 2 — role history editor (repeating rows).
            // Renders below the simple role input; only rows the user has
            // explicitly added are persisted to the `roles:` YAML array.
            this.renderRoleHistoryEditor(row, draft);
        } else if (field.multiline) {
            const textarea = row.createEl('textarea', {
                cls: 'character-field-textarea',
                attr: { placeholder: field.placeholder, rows: '2' },
            });
            textarea.value = value;
            // Auto-grow: fit content, shrink back when empty
            const autoGrow = () => {
                textarea.setCssStyles({ height: 'auto' });
                const scrollH = textarea.scrollHeight;
                const minH = 48; // ~2 rows
                textarea.setCssStyles({ height: Math.max(scrollH, minH) + 'px' });
            };
            // Initial sizing after paint
            window.setTimeout(autoGrow, 0);
            textarea.addEventListener('input', () => {
                (draft as unknown as Record<string, unknown>)[field.key] = textarea.value;
                this.scheduleSave(draft);
                autoGrow();
            });
        } else {
            const input = row.createEl('input', {
                cls: 'character-field-input',
                type: 'text',
                attr: { placeholder: field.placeholder },
            });
            input.value = value;
            input.addEventListener('input', () => {
                (draft as unknown as Record<string, unknown>)[field.key] = input.value;
                this.scheduleSave(draft);
            });

            // ── Cascade rename: check when leaving the Name field ──
            if (field.key === 'name') {
                input.addEventListener('blur', () => {
                    this.checkCharacterRename(draft, input);
                });
            }
        }
    }

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
            if (this.selectedCharacter && this.rootContainer) this.renderCharacterDetail(this.rootContainer);
        });

        const downBtn = labelEl.createEl('span', {
            cls: 'field-move-btn',
            attr: { title: 'Move field down', 'aria-label': 'Move field down' },
        });
        obsidian.setIcon(downBtn, 'chevron-down');
        downBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.plugin.fieldTemplates.moveEntryDown(section, category, builtInKeys, 'builtin', fieldKey);
            if (this.selectedCharacter && this.rootContainer) this.renderCharacterDetail(this.rootContainer);
        });
    }

    /**
     * Render a single universal (template-defined) field inside a section.
     * Values are stored in `draft.universalFields[template.id]`.
     */
    private renderUniversalField(
        parent: HTMLElement,
        tpl: UniversalFieldTemplate,
        draft: Character,
        builtInKeys?: string[],
    ): void {
        if (!draft.universalFields) draft.universalFields = {};
        const value = (draft.universalFields[tpl.id] ?? '') as string;

        const row = parent.createDiv('character-field-row character-universal-field-row');

        // Label with an edit icon
        const labelWrap = row.createDiv('character-universal-label-wrap');
        labelWrap.createEl('label', { cls: 'character-field-label', text: tpl.label });

        const editBtn = labelWrap.createEl('span', {
            cls: 'character-universal-edit-btn',
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
                    if (this.selectedCharacter && this.rootContainer) {
                        this.renderCharacterDetail(this.rootContainer);
                    }
                },
                async () => {
                    await this.plugin.fieldTemplates.remove(tpl.id);
                    // Optionally clean up universalFields[tpl.id] from all characters
                    if (this.selectedCharacter && this.rootContainer) {
                        this.renderCharacterDetail(this.rootContainer);
                    }
                },
                undefined,
                siblings,
            );
            modal.open();
        });

        // Issue #92 — up/down move buttons (revealed on hover)
        const moveUpBtn = labelWrap.createEl('span', {
            cls: 'character-universal-move-btn',
            attr: { title: 'Move field up', 'aria-label': 'Move field up' },
        });
        obsidian.setIcon(moveUpBtn, 'chevron-up');
        moveUpBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.plugin.fieldTemplates.moveEntryUp(
                tpl.section, tpl.category, builtInKeys ?? [], 'universal', tpl.id,
            );
            if (this.selectedCharacter && this.rootContainer) this.renderCharacterDetail(this.rootContainer);
        });

        const moveDownBtn = labelWrap.createEl('span', {
            cls: 'character-universal-move-btn',
            attr: { title: 'Move field down', 'aria-label': 'Move field down' },
        });
        obsidian.setIcon(moveDownBtn, 'chevron-down');
        moveDownBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.plugin.fieldTemplates.moveEntryDown(
                tpl.section, tpl.category, builtInKeys ?? [], 'universal', tpl.id,
            );
            if (this.selectedCharacter && this.rootContainer) this.renderCharacterDetail(this.rootContainer);
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
            const select = row.createEl('select', { cls: 'character-field-input dropdown' });
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
            // If current value isn't in the list, add it
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
                cls: 'character-field-textarea',
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
            // Default: single-line text
            const input = row.createEl('input', {
                cls: 'character-field-input',
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

    /**
     * Issue #72 Tier 2 — repeating-row editor for the structured role
     * history. Each row binds to one entry in `draft.roles`. Rows can be
     * added or removed; empty rows are stripped on save.
     */
    private renderRoleHistoryEditor(row: HTMLElement, draft: Character): void {
        const container = row.createDiv('character-role-history');

        const header = container.createDiv('character-role-history-header');
        header.createSpan({ cls: 'character-role-history-title', text: 'Role history (optional)' });
        header.createSpan({
            cls: 'character-role-history-hint',
            text: 'Track role changes across scenes, plotlines and books.',
        });

        const list = container.createDiv('character-role-history-list');

        const persist = () => {
            const cleaned: RoleEntry[] = [];
            for (const e of (draft.roles || [])) {
                const role = String(e.role || '').trim();
                if (!role) continue;
                const out: RoleEntry = { role };
                if (e.from && e.from.trim()) out.from = e.from.trim();
                if (e.plotline && e.plotline.trim()) out.plotline = e.plotline.trim();
                if (e.book && e.book.trim()) out.book = e.book.trim();
                cleaned.push(out);
            }
            draft.roles = cleaned;
            this.scheduleSave(draft);
        };

        const renderRows = () => {
            list.empty();
            const entries = draft.roles || [];
            entries.forEach((entry, idx) => {
                const r = list.createDiv('character-role-history-row');

                const roleListId = `character-role-history-list-${Date.now()}-${idx}-${Math.random().toString(36).slice(2)}`;

                const roleInput = r.createEl('input', {
                    cls: 'character-role-history-input character-role-history-role',
                    type: 'text',
                    attr: { placeholder: 'role', list: roleListId },
                });
                roleInput.value = entry.role || '';
                const dl = r.createEl('datalist', { attr: { id: roleListId } });
                for (const opt of CHARACTER_ROLES) dl.createEl('option', { attr: { value: opt } });
                roleInput.addEventListener('input', () => {
                    entry.role = roleInput.value;
                    persist();
                });

                const fromInput = r.createEl('input', {
                    cls: 'character-role-history-input character-role-history-from',
                    type: 'text',
                    attr: { placeholder: 'from (scene or [[wikilink]])' },
                });
                fromInput.value = entry.from || '';
                fromInput.addEventListener('input', () => {
                    entry.from = fromInput.value;
                    persist();
                });

                const plotInput = r.createEl('input', {
                    cls: 'character-role-history-input character-role-history-plotline',
                    type: 'text',
                    attr: { placeholder: 'plotline' },
                });
                plotInput.value = entry.plotline || '';
                plotInput.addEventListener('input', () => {
                    entry.plotline = plotInput.value;
                    persist();
                });

                const bookInput = r.createEl('input', {
                    cls: 'character-role-history-input character-role-history-book',
                    type: 'text',
                    attr: { placeholder: 'book label' },
                });
                bookInput.value = entry.book || '';
                bookInput.addEventListener('input', () => {
                    entry.book = bookInput.value;
                    persist();
                });

                const removeBtn = r.createEl('button', {
                    cls: 'character-role-history-remove',
                    text: '×',
                    attr: { title: 'Remove this entry', type: 'button' },
                });
                removeBtn.addEventListener('click', () => {
                    (draft.roles || []).splice(idx, 1);
                    persist();
                    renderRows();
                });
            });

            if (!entries.length) {
                list.createDiv({
                    cls: 'character-role-history-empty',
                    text: 'No role history entries yet.',
                });
            }
        };

        const addBtn = container.createEl('button', {
            cls: 'character-role-history-add',
            text: '+ Add role entry',
            attr: { type: 'button' },
        });
        addBtn.addEventListener('click', () => {
            if (!draft.roles) draft.roles = [];
            draft.roles.push({ role: '' });
            renderRows();
            // Focus the role input on the new last row
            const inputs = list.querySelectorAll('.character-role-history-role');
            const last = inputs[inputs.length - 1] as HTMLInputElement | undefined;
            last?.focus();
        });

        renderRows();
    }

    private renderRelationsField(row: HTMLElement, draft: Character): void {
        const container = row.createDiv('character-tag-field relation-builder-field');
        const list = container.createDiv('character-tag-list relation-builder-list');
        const addRow = container.createDiv('character-tag-add-row relation-builder-add-row');

        const aliasMap = this.characterManager.buildAliasMap(this.plugin.settings.characterAliases);
        const resolveAlias = (n: string): string => aliasMap.get(n.toLowerCase()) || n;

        const fileCharacters = this.characterManager.getAllCharacters().map(c => c.name);
        const sceneCharacters = this.sceneManager.queryService.getAllCharacters();
        const mergedNames = Array.from(new Set([...fileCharacters, ...sceneCharacters].map(resolveAlias)))
            .filter(n => n !== draft.name)
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

        const relations: CharacterRelation[] = normalizeCharacterRelations(draft.relations);
        const NEW_CUSTOM_TYPE_VALUE = '__custom_new__';

        const inferCategoryFromType = (type: string): CharacterRelationCategory => {
            for (const category of RELATION_CATEGORIES) {
                const options = RELATION_TYPES_BY_CATEGORY[category.value];
                if (options.includes(type)) return category.value;
            }
            return 'custom';
        };

        const buildTypeOptions = (select: HTMLSelectElement, currentType?: string) => {
            select.empty();
            for (const category of RELATION_CATEGORIES) {
                const types = RELATION_TYPES_BY_CATEGORY[category.value];
                if (types.length === 0) continue;
                const group = activeDocument.createElement('optgroup');
                group.label = category.label;
                for (const type of types) {
                    const opt = activeDocument.createElement('option');
                    opt.value = type;
                    opt.text = type;
                    if (currentType === type) opt.selected = true;
                    group.appendChild(opt);
                }
                select.appendChild(group);
            }

            const customGroup = activeDocument.createElement('optgroup');
            customGroup.label = 'Custom';
            const createOpt = activeDocument.createElement('option');
            createOpt.value = NEW_CUSTOM_TYPE_VALUE;
            createOpt.text = 'New';
            customGroup.appendChild(createOpt);
            select.appendChild(customGroup);

            if (!select.value) {
                const fallback = RELATION_TYPES_BY_CATEGORY.family[0] || 'sibling';
                select.value = fallback;
            }
        };

        let dragIndex: number | null = null;

        const renderRows = () => {
            list.empty();

            for (let index = 0; index < relations.length; index++) {
                const relation = relations[index];
                const relRow = list.createDiv('character-field-row relation-builder-item');
                relRow.draggable = false;
                const inlineRow = relRow.createDiv('relation-builder-inline-row');
                const typeSelect = inlineRow.createEl('select', { cls: 'character-field-input dropdown relation-builder-type' });
                buildTypeOptions(typeSelect, relation.type);
                const customTypeInput = inlineRow.createEl('input', {
                    cls: 'character-field-input relation-builder-type relation-builder-custom-input',
                    type: 'text',
                    attr: { placeholder: 'Custom relation type (e.g. bodyguard)' },
                });
                customTypeInput.setCssStyles({ display: 'none' });
                const dragHandle = inlineRow.createDiv('relation-builder-drag-handle');
                dragHandle.draggable = true;
                dragHandle.ariaLabel = 'Drag to reorder relation';
                dragHandle.title = 'Drag to reorder';
                obsidian.setIcon(dragHandle, 'ellipsis-vertical');

                const targetSelect = inlineRow.createEl('select', { cls: 'character-field-input dropdown relation-builder-target' });
                targetSelect.createEl('option', { value: '', text: 'Select character' });
                for (const name of mergedNames) {
                    const opt = targetSelect.createEl('option', { value: name, text: name });
                    if (name === relation.target) opt.selected = true;
                }
                if (relation.target && !mergedNames.includes(relation.target)) {
                    const opt = targetSelect.createEl('option', { value: relation.target, text: relation.target });
                    opt.selected = true;
                }

                const removeBtn = inlineRow.createEl('button', { cls: 'character-custom-remove relation-builder-remove', text: '×', attr: { title: 'Remove relation' } });

                const setCustomMode = (enabled: boolean, focus = false) => {
                    typeSelect.setCssStyles({ display: enabled ? 'none' : '' });
                    customTypeInput.setCssStyles({ display: enabled ? '' : 'none' });
                    if (enabled) {
                        customTypeInput.value = relation.type && relation.type !== NEW_CUSTOM_TYPE_VALUE ? relation.type : '';
                        if (focus) customTypeInput.focus();
                    }
                };

                const shouldStartCustomMode = relation.category === 'custom' || relation.type === NEW_CUSTOM_TYPE_VALUE;
                setCustomMode(shouldStartCustomMode);

                typeSelect.addEventListener('change', () => {
                    let selected = typeSelect.value;
                    if (selected === NEW_CUSTOM_TYPE_VALUE) {
                        relation.category = 'custom';
                        relation.type = NEW_CUSTOM_TYPE_VALUE;
                        setCustomMode(true, true);
                        draft.relations = normalizeCharacterRelations(relations);
                        this.scheduleSave(draft);
                        return;
                    }
                    relation.type = selected;
                    relation.category = inferCategoryFromType(relation.type);
                    draft.relations = normalizeCharacterRelations(relations);
                    this.scheduleSave(draft);
                    setCustomMode(false);
                });

                customTypeInput.addEventListener('input', () => {
                    const cleaned = customTypeInput.value.trim().toLowerCase().replace(/\s+/g, '-');
                    if (!cleaned) {
                        relation.type = NEW_CUSTOM_TYPE_VALUE;
                        relation.category = 'custom';
                        draft.relations = normalizeCharacterRelations(relations);
                        this.scheduleSave(draft);
                        return;
                    }
                    relation.type = cleaned;
                    relation.category = 'custom';
                    draft.relations = normalizeCharacterRelations(relations);
                    this.scheduleSave(draft);
                });

                targetSelect.addEventListener('change', () => {
                    relation.target = resolveAlias(targetSelect.value);
                    draft.relations = normalizeCharacterRelations(relations);
                    this.scheduleSave(draft);
                });

                removeBtn.addEventListener('click', () => {
                    relations.splice(index, 1);
                    draft.relations = normalizeCharacterRelations(relations);
                    this.scheduleSave(draft);
                    renderRows();
                });

                dragHandle.addEventListener('dragstart', (event) => {
                    dragIndex = index;
                    relRow.addClass('relation-builder-dragging');
                    event.dataTransfer?.setData('text/plain', String(index));
                    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
                });

                relRow.addEventListener('dragover', (event) => {
                    event.preventDefault();
                    if (dragIndex === null || dragIndex === index) return;
                    relRow.addClass('relation-builder-drag-over');
                    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
                });

                relRow.addEventListener('dragleave', () => {
                    relRow.removeClass('relation-builder-drag-over');
                });

                relRow.addEventListener('drop', (event) => {
                    event.preventDefault();
                    relRow.removeClass('relation-builder-drag-over');
                    if (dragIndex === null || dragIndex === index) return;

                    const [moved] = relations.splice(dragIndex, 1);
                    const insertIndex = dragIndex < index ? index - 1 : index;
                    relations.splice(insertIndex, 0, moved);
                    draft.relations = normalizeCharacterRelations(relations);
                    this.scheduleSave(draft);
                    renderRows();
                });

                relRow.addEventListener('dragend', () => {
                    dragIndex = null;
                    list.querySelectorAll('.relation-builder-drag-over').forEach(el => el.removeClass('relation-builder-drag-over'));
                    list.querySelectorAll('.relation-builder-dragging').forEach(el => el.removeClass('relation-builder-dragging'));
                });
            }
        };

        const addBtn = addRow.createEl('button', { cls: 'character-custom-add-btn', text: '+ Add relation' });
        addBtn.addEventListener('click', () => {
            const existing = addRow.querySelector('.relation-builder-add-picker') as HTMLSelectElement | null;
            if (existing) {
                const existingPicker = existing as HTMLSelectElement & { showPicker?: () => void };
                if (typeof existingPicker.showPicker === 'function') {
                    existingPicker.showPicker();
                } else {
                    existing.focus();
                    existing.click();
                }
                return;
            }

            addBtn.setCssStyles({ display: 'none' });
            const tempSelect = addRow.createEl('select', { cls: 'character-field-input dropdown relation-builder-add-type relation-builder-add-picker' });
            tempSelect.createEl('option', { value: '', text: 'Choose relation type…' });
            buildTypeOptions(tempSelect);
            tempSelect.value = '';

            const cleanup = () => {
                if (tempSelect.parentElement) tempSelect.remove();
                addBtn.setCssStyles({ display: '' });
            };

            tempSelect.addEventListener('change', () => {
                const selectedType = tempSelect.value;
                if (!selectedType) {
                    cleanup();
                    return;
                }
                relations.push({ category: inferCategoryFromType(selectedType), type: selectedType, target: '' });
                draft.relations = normalizeCharacterRelations(relations);
                this.scheduleSave(draft);
                cleanup();
                renderRows();
            });

            tempSelect.addEventListener('blur', () => {
                // Delay to allow change to fire first when selecting an option
                window.setTimeout(() => cleanup(), 50);
            });

            const picker = tempSelect as HTMLSelectElement & { showPicker?: () => void };
            if (typeof picker.showPicker === 'function') {
                picker.showPicker();
            } else {
                tempSelect.focus();
                tempSelect.click();
            }
        });

        renderRows();
    }

    private renderCustomFields(parent: HTMLElement, draft: Character): void {
        const section = parent.createDiv('character-section');
        const title = 'Custom Fields';
        const isCollapsed = this.collapsedSections.has(title);

        const sectionHeader = section.createDiv('character-section-header');
        const chevron = sectionHeader.createSpan('character-section-chevron');
        obsidian.setIcon(chevron, isCollapsed ? 'chevron-right' : 'chevron-down');
        const icon = sectionHeader.createSpan('character-section-icon');
        obsidian.setIcon(icon, 'plus-circle');
        sectionHeader.createSpan({ text: title });

        const sectionBody = section.createDiv('character-section-body');
        if (isCollapsed) sectionBody.setCssStyles({ display: 'none' });

        sectionHeader.addEventListener('click', () => {
            if (this.collapsedSections.has(title)) {
                this.collapsedSections.delete(title);
                sectionBody.setCssStyles({ display: '' });
                obsidian.setIcon(chevron, 'chevron-down');
            } else {
                this.collapsedSections.add(title);
                sectionBody.setCssStyles({ display: 'none' });
                obsidian.setIcon(chevron, 'chevron-right');
            }
        });

        const renderAllCustomFields = () => {
            sectionBody.empty();
            const custom = draft.custom || {};

            for (const [key, val] of Object.entries(custom)) {
                const row = sectionBody.createDiv('character-field-row character-custom-row');
                const keyInput = row.createEl('input', {
                    cls: 'character-field-input character-custom-key',
                    type: 'text',
                    attr: { placeholder: 'Field name' },
                });
                keyInput.value = key;

                const valInput = row.createEl('input', {
                    cls: 'character-field-input character-custom-value',
                    type: 'text',
                    attr: { placeholder: 'Value' },
                });
                valInput.value = val;

                const removeBtn = row.createEl('button', { cls: 'character-custom-remove', attr: { title: 'Remove field' } });
                obsidian.setIcon(removeBtn, 'x');

                keyInput.addEventListener('change', () => {
                    delete draft.custom![key];
                    const newKey = keyInput.value.trim();
                    if (newKey) {
                        draft.custom![newKey] = valInput.value;
                    }
                    this.scheduleSave(draft);
                });

                valInput.addEventListener('input', () => {
                    const k = keyInput.value.trim();
                    if (k) {
                        draft.custom![k] = valInput.value;
                        this.scheduleSave(draft);
                    }
                });

                removeBtn.addEventListener('click', () => {
                    delete draft.custom![key];
                    row.remove();
                    this.scheduleSave(draft);
                });
            }

            // Add button
            const addRow = sectionBody.createDiv('character-custom-add-row');
            const addBtn = addRow.createEl('button', { cls: 'character-custom-add-btn', text: '+ Add Field' });
            addBtn.addEventListener('click', () => {
                if (!draft.custom) draft.custom = {};
                const n = Object.keys(draft.custom).length + 1;
                let newKey = `field_${n}`;
                while (draft.custom[newKey]) newKey = `field_${n}_${Date.now()}`;
                draft.custom[newKey] = '';
                renderAllCustomFields();
            });
        };

        renderAllCustomFields();
    }

    // ── Image gallery carousel ─────────────────────────

    private renderGallery(container: HTMLElement, draft: Character): void {
        const MAX_GALLERY = 10;
        const SECTION_KEY = '__Gallery';

        const wrapper = container.createDiv('character-gallery');

        const gallery = draft.gallery ?? [];

        // Collapsible header with add button
        const isCollapsed = this.collapsedSections.has(SECTION_KEY);
        const header = wrapper.createDiv('character-gallery-header');
        const chevron = header.createSpan('character-section-chevron');
        obsidian.setIcon(chevron, isCollapsed ? 'chevron-right' : 'chevron-down');
        header.createEl('h4', { text: 'Gallery' });

        // Add button in header (like section add-field buttons)
        if (gallery.length < MAX_GALLERY) {
            const addBtn = header.createEl('button', {
                cls: 'character-section-add-field-btn',
                attr: { title: `Add image (${gallery.length}/${MAX_GALLERY})`, 'aria-label': 'Add gallery image' }
            });
            obsidian.setIcon(addBtn, 'plus');
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.pickImage().then(async (picked) => {
                    if (picked && picked !== '') {
                        gallery.push({ path: picked, caption: '' });
                        draft.gallery = [...gallery];
                        await this.characterManager.saveCharacter(draft);
                        // Re-render entire gallery section
                        wrapper.empty();
                        container.removeChild(wrapper);
                        this.renderGallery(container, draft);
                        // Move gallery before scene panel
                        const scenePanel = container.querySelector('.character-side-stats');
                        if (scenePanel) {
                            const galleryEl = container.querySelector('.character-gallery');
                            if (galleryEl) container.insertBefore(galleryEl, scenePanel);
                        }
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
                        attr: { src, alt: entry.caption || 'Gallery image' }
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
                    attr: { type: 'text', placeholder: 'Add caption\u2026', value: entry.caption || '' }
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
                    attr: { title: 'Remove this image' }
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

        // Thumbnail strip
        const renderThumbs = () => {
            thumbStrip.empty();
            for (let i = 0; i < gallery.length; i++) {
                const thumb = thumbStrip.createDiv({
                    cls: `character-gallery-thumb${i === activeIndex ? ' active' : ''}`
                });
                const src = resolveImagePath(this.app, gallery[i].path);
                if (src) {
                    const timg = thumb.createEl('img', { attr: { src } });
                    timg.onerror = () => {
                        timg.remove();
                        obsidian.setIcon(thumb, 'image-off');
                    };
                } else {
                    obsidian.setIcon(thumb, 'image-off');
                }
                const idx = i;
                thumb.addEventListener('click', () => {
                    activeIndex = idx;
                    renderViewer();
                    renderThumbs();
                });
            }
        };

        renderViewer();
        renderThumbs();
    }

    // ── Scene side panel ───────────────────────────────

    private renderScenePanel(container: HTMLElement, characterName: string): void {
        const scenes = this.sceneManager.queryService.getFilteredScenes(
            undefined,
            { field: 'sequence', direction: 'asc' }
        );

        // Build alias set for this character (full name + all aliases)
        const aliasMap = this.characterManager.buildAliasMap(this.plugin.settings.characterAliases);
        const charAliases = new Set<string>();
        charAliases.add(characterName.toLowerCase());
        for (const [alias, canonical] of aliasMap) {
            if (canonical.toLowerCase() === characterName.toLowerCase()) {
                charAliases.add(alias);
            }
        }

        const povScenes = scenes.filter(s => {
            const { isPov } = this.isCharInScene(s, charAliases);
            return isPov;
        });
        const presentScenes = scenes.filter(s => {
            const { isPov, isPresent } = this.isCharInScene(s, charAliases);
            return !isPov && isPresent;
        });
        const allCharScenes = [...povScenes, ...presentScenes];

        // Stats summary
        const statsBox = container.createDiv('character-side-stats');
        statsBox.createEl('h4', { text: 'Scene Presence' });

        const statGrid = statsBox.createDiv('character-stat-grid');
        this.renderStat(statGrid, String(povScenes.length), 'POV');
        this.renderStat(statGrid, String(presentScenes.length), 'Supporting');
        this.renderStat(statGrid, String(allCharScenes.length), 'Total');

        // Plotgrid stat (patched async)
        const pgStatEl = statGrid.createDiv('character-stat-item');
        pgStatEl.setCssStyles({ display: 'none' });
        const pgValEl = pgStatEl.createDiv({ cls: 'character-stat-value', text: '0' });

        // Writing progress
        const totalScenes = allCharScenes.length;
        const completedScenes = allCharScenes
            .filter(s => s.status === 'written' || s.status === 'revised' || s.status === 'final')
            .length;

        if (totalScenes > 0) {
            const progressSection = container.createDiv('character-progress');
            progressSection.createEl('h4', { text: 'Writing Progress' });
            const progressBar = progressSection.createDiv('character-progress-bar');
            const filled = progressBar.createDiv('character-progress-filled');
            const percent = Math.round((completedScenes / totalScenes) * 100);
            filled.setCssStyles({ width: `${percent}%` });
            progressSection.createSpan({
                cls: 'character-progress-label',
                text: `${completedScenes} of ${totalScenes} scenes written (${percent}%)`
            });
        }

        // POV distribution
        if (scenes.length > 0) {
            const totalPovScenes = scenes.filter(s => s.pov).length;
            const charPovPercent = totalPovScenes > 0
                ? Math.round((povScenes.length / totalPovScenes) * 100)
                : 0;
            if (totalPovScenes > 0) {
                const distBox = container.createDiv('character-side-pov-dist');
                distBox.createEl('p', {
                    text: `${charPovPercent}% of all POV scenes`
                });
            }
        }

        // Scene list
        if (allCharScenes.length > 0) {
            const listSection = container.createDiv('character-side-scenes');
            listSection.createEl('h4', { text: 'Scenes' });
            for (const scene of allCharScenes) {
                const item = listSection.createDiv('character-side-scene-item');
                const isPov = scene.pov && charAliases.has(scene.pov.toLowerCase());

                // Use shared formatter so string acts (e.g. "1.1", "Prologue")
                // are shown verbatim and pure-numeric acts are zero-padded.
                const act = formatActChapterPrefix(scene.act, '??');
                const seq = scene.sequence !== undefined ? String(scene.sequence).padStart(2, '0') : '??';

                item.createSpan({ cls: 'scene-id', text: `[${act}-${seq}]` });
                item.createSpan({ cls: 'scene-title', text: ` ${scene.title}` });

                if (isPov) {
                    item.createSpan({ cls: 'character-pov-badge', text: 'POV' });
                }

                const statusCfg = resolveStatusCfg(scene.status || 'idea');
                const statusBadge = item.createSpan({
                    cls: 'scene-status-badge',
                    attr: { title: statusCfg.label }
                });
                obsidian.setIcon(statusBadge, statusCfg.icon);

                item.addEventListener('click', () => this.openScene(scene));
            }
        }

        // Plotgrid cell appearances (async)
        const pgSection = container.createDiv('character-side-scenes character-side-plotgrid');
        pgSection.setCssStyles({ display: 'none' });

        if (typeof this.plugin.scanPlotGridCells === 'function') {
            this.plugin.scanPlotGridCells().then(result => {
                const pgChars = result.characters;
                // Gather all plotgrid rows mentioning this character
                let pgRows = new Set<string>();
                for (const key of charAliases) {
                    const rows = pgChars.get(key);
                    if (rows) rows.forEach(r => pgRows.add(r));
                }
                if (pgRows.size > 0) {
                    // Update the stat counter
                    pgStatEl.setCssStyles({ display: '' });
                    pgValEl.textContent = String(pgRows.size);

                    // Show section
                    pgSection.setCssStyles({ display: '' });
                    pgSection.createEl('h4', { text: 'Plotgrid Appearances' });
                    const sortedRows = [...pgRows].sort();
                    for (const rowLabel of sortedRows) {
                        const item = pgSection.createDiv('character-side-scene-item');
                        const icon = item.createSpan({ cls: 'scene-id' });
                        obsidian.setIcon(icon, 'grid-3x3');
                        item.createSpan({ cls: 'scene-title', text: ` ${rowLabel}` });
                    }
                }
            }).catch(() => { /* non-fatal */ });
        }

        // Character arc intensity curve
        const scenesWithIntensity = allCharScenes
            .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
            .filter(s => s.intensity !== undefined && s.intensity !== null);

        if (scenesWithIntensity.length >= 2) {
            this.renderIntensityCurve(container, characterName, scenesWithIntensity);
        }

        // Gap detection
        this.renderGapDetection(container, characterName, scenes, allCharScenes);
    }

    private renderReferencesPanel(container: HTMLElement, entityName: string): void {
        const index = this.plugin.linkScanner.buildEntityIndex();
        const refs = index.get(entityName.toLowerCase());
        if (!refs || refs.length === 0) return;

        const section = container.createDiv('character-references-panel');
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

    private renderStat(parent: HTMLElement, value: string, label: string): void {
        const stat = parent.createDiv('character-stat-item');
        stat.createDiv({ cls: 'character-stat-value', text: value });
        stat.createDiv({ cls: 'character-stat-label', text: label });
    }

    // ── Auto-save ──────────────────────────────────────

    private scheduleSave(draft: Character): void {
        if (this.autoSaveTimer) window.clearTimeout(this.autoSaveTimer);
        this.pendingSaveDraft = draft;
        this.autoSaveTimer = window.setTimeout(async () => {
            try {
                // Record undo snapshot
                const undoMgr = this.plugin.sceneManager?.undoManager;
                if (undoMgr && this.undoSnapshot) {
                    undoMgr.recordUpdate(
                        draft.filePath,
                        this.undoSnapshot as unknown as unknown as Record<string, unknown>,
                        draft as unknown as unknown as Record<string, unknown>,
                        `Update character "${draft.name}"`,
                        'character'
                    );
                    // Update snapshot so next edit diffs from the saved state
                    this.undoSnapshot = { ...draft, custom: { ...(draft.custom || {}) } };
                }
                this._lastSaveTime = Date.now();
                await this.characterManager.saveCharacter(draft);
                this.pendingSaveDraft = null;

                // ── Reciprocal relation sync ──
                if (!this._skipReciprocalSync) {
                    await this.syncReciprocalRelations(draft);
                }
            } catch (e) {
                console.error('StoryLine: failed to save character', e);
            }
        }, 600);
    }

    /**
     * Compute relation diffs and apply reciprocal updates to target characters.
     */
    private async syncReciprocalRelations(draft: Character): Promise<void> {
        const currentRelations = normalizeCharacterRelations(draft.relations);
        const updates = computeReciprocalUpdates(
            draft.name,
            this._lastSavedRelations,
            currentRelations,
        );

        // Update snapshot for next diff
        this._lastSavedRelations = currentRelations.map(r => ({ ...r }));

        if (updates.length === 0) return;

        // Group updates by target
        const byTarget = new Map<string, typeof updates>();
        for (const u of updates) {
            const key = u.targetName.toLowerCase();
            if (!byTarget.has(key)) byTarget.set(key, []);
            byTarget.get(key)!.push(u);
        }

        for (const [, targetUpdates] of byTarget) {
            const targetName = targetUpdates[0].targetName;
            const targetChar = this.characterManager.findByName(targetName);
            if (!targetChar) continue;

            let relations = normalizeCharacterRelations(targetChar.relations);
            let changed = false;

            for (const u of targetUpdates) {
                const matchKey = `${u.relation.type}|${u.relation.target.toLowerCase()}`;
                const existingIdx = relations.findIndex(
                    r => `${r.type}|${r.target.toLowerCase()}` === matchKey
                );

                if (u.action === 'add' && existingIdx === -1) {
                    relations.push(u.relation);
                    changed = true;
                } else if (u.action === 'remove' && existingIdx !== -1) {
                    relations.splice(existingIdx, 1);
                    changed = true;
                }
            }

            if (changed) {
                targetChar.relations = normalizeCharacterRelations(relations);
                try {
                    this._skipReciprocalSync = true;
                    await this.characterManager.saveCharacter(targetChar);
                } catch (e) {
                    console.error(`StoryLine: failed to sync reciprocal relations to "${targetName}"`, e);
                } finally {
                    this._skipReciprocalSync = false;
                }
            }
        }
    }

    /**
     * Check if the character name changed and offer to cascade-update all references.
     * Called on blur of the Name input field.
     */
    private checkCharacterRename(draft: Character, inputEl: HTMLInputElement): void {
        const oldName = this.originalCharacterName;
        const newName = draft.name?.trim();
        if (!oldName || !newName || oldName === newName) return;

        const service = this.plugin.cascadeRename;
        const preview = service.previewCharacterRename(oldName, newName);
        const total = preview.sceneCount + preview.relationCount;
        if (total === 0) {
            // No references to update — just silently update the tracked name
            this.originalCharacterName = newName;
            return;
        }

        const summary = service.buildSummary(preview);
        const modal = new RenameConfirmModal(
            this.app,
            'character',
            oldName,
            newName,
            preview,
            summary,
            async () => {
                await service.cascadeCharacterRename(oldName, newName);
                this.originalCharacterName = newName;
                new Notice(`Updated ${total} reference${total !== 1 ? 's' : ''} from "${oldName}" to "${newName}"`);
            },
            () => {
                // User cancelled — revert the name back
                draft.name = oldName;
                inputEl.value = oldName;
                this.scheduleSave(draft);
            },
        );
        modal.open();
    }

    /** Immediately flush any pending debounced save */
    private async flushPendingSave(): Promise<void> {
        if (this.autoSaveTimer) {
            window.clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        if (this.pendingSaveDraft) {
            try {
                this._lastSaveTime = Date.now();
                await this.characterManager.saveCharacter(this.pendingSaveDraft);
            } catch (e) {
                console.error('StoryLine: failed to flush character save on close', e);
            }
            this.pendingSaveDraft = null;
        }
    }

    // ── Actions ────────────────────────────────────────

    private promptNewCharacter(): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('New Character');

        let name = '';
        new Setting(modal.contentEl)
            .setName('Character name')
            .addText(text => {
                text.setPlaceholder('Enter character name\u2026')
                    .onChange(v => (name = v));
                window.setTimeout(() => text.inputEl.focus(), 50);
            });

        new Setting(modal.contentEl)
            .addButton(btn => {
                btn.setButtonText('Create')
                    .setCta()
                    .onClick(async () => {
                        if (!name.trim()) {
                            new Notice('Please enter a name.');
                            return;
                        }
                        try {
                            const char = await this.characterManager.createCharacter(
                                this.sceneManager.getCharacterFolder(),
                                name.trim()
                            );
                            this.selectedCharacter = char.filePath;
                            modal.close();
                            this.renderView(this.rootContainer!);
                            new Notice(`Character "${name.trim()}" created`);
                        } catch (e) {
                            new Notice(String(e));
                        }
                    });
            });

        modal.open();
    }

    private async createCharacterFromName(name: string): Promise<void> {
        try {
            const char = await this.characterManager.createCharacter(
                this.sceneManager.getCharacterFolder(),
                name
            );
            this.selectedCharacter = char.filePath;
            this.renderView(this.rootContainer!);
            new Notice(`Character profile created for "${name}"`);
        } catch (e) {
            new Notice(String(e));
        }
    }

    private confirmDeleteCharacter(character: Character): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Delete Character');
        modal.contentEl.createEl('p', {
            text: `Are you sure you want to delete "${character.name}"? The file will be moved to trash.`
        });

        new Setting(modal.contentEl)
            .addButton(btn => {
                btn.setButtonText('Delete')
                    .setWarning()
                    .onClick(async () => {
                        // Record undo before deleting
                        const undoMgr = this.plugin.sceneManager?.undoManager;
                        if (undoMgr) {
                            const file = this.app.vault.getAbstractFileByPath(character.filePath);
                            if (file instanceof TFile) {
                                const content = await this.app.vault.read(file);
                                undoMgr.recordDelete(character.filePath, content, `Delete character "${character.name}"`, 'character');
                            }
                        }
                        await this.characterManager.deleteCharacter(character.filePath);
                        this.selectedCharacter = null;
                        modal.close();
                        this.renderView(this.rootContainer!);
                        new Notice(`"${character.name}" deleted`);
                    });
            })
            .addButton(btn => {
                btn.setButtonText('Cancel')
                    .onClick(() => modal.close());
            });

        modal.open();
    }

    private async openCharacterFile(character: Character): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(character.filePath);
        if (file instanceof TFile) {
            const leaf = this.app.workspace.getLeaf('tab');
            await leaf.openFile(file, { state: { mode: 'source', source: false } });
        }
    }

    private async openScene(scene: Scene): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(scene.filePath);
        if (file instanceof TFile) {
            const leaf = this.app.workspace.getLeaf('tab');
            await leaf.openFile(file, { state: { mode: 'source', source: false } });
        } else {
            new Notice(`Could not find file: ${scene.filePath}`);
        }
    }

    // ── Reused visualisations ──────────────────────────

    private renderGapDetection(
        container: HTMLElement,
        character: string,
        allScenes: Scene[],
        charScenes: Scene[]
    ): void {
        if (charScenes.length < 2 || allScenes.length < 3) return;

        const sortedAll = [...allScenes].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
        const sortedChar = [...charScenes].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

        const GAP_THRESHOLD = 3;
        const gaps: { from: Scene; to: Scene; missedCount: number }[] = [];

        for (let i = 0; i < sortedChar.length - 1; i++) {
            const currentSeq = sortedChar[i].sequence ?? 0;
            const nextSeq = sortedChar[i + 1].sequence ?? 0;
            const missedScenes = sortedAll.filter(s =>
                (s.sequence ?? 0) > currentSeq && (s.sequence ?? 0) < nextSeq
            );
            if (missedScenes.length >= GAP_THRESHOLD) {
                gaps.push({ from: sortedChar[i], to: sortedChar[i + 1], missedCount: missedScenes.length });
            }
        }

        const firstCharSeq = sortedChar[0].sequence ?? 0;
        const lastCharSeq = sortedChar[sortedChar.length - 1].sequence ?? 0;
        const scenesBefore = sortedAll.filter(s => (s.sequence ?? 0) < firstCharSeq).length;
        const scenesAfter = sortedAll.filter(s => (s.sequence ?? 0) > lastCharSeq).length;

        const section = container.createDiv('character-gaps-section');
        section.createEl('h4', { text: 'Presence Gaps' });

        if (gaps.length === 0 && scenesBefore < GAP_THRESHOLD && scenesAfter < GAP_THRESHOLD) {
            const okDiv = section.createDiv('character-gap-ok');
            const okIcon = okDiv.createSpan();
            obsidian.setIcon(okIcon, 'check-circle');
            okDiv.createSpan({ text: ` ${character} appears regularly throughout the story` });
            return;
        }

        // Presence bar
        const heatmap = section.createDiv('character-presence-bar');
        const charLower = character.toLowerCase();
        sortedAll.forEach(scene => {
            const cell = heatmap.createDiv('character-presence-cell');
            const isPresent = scene.pov?.toLowerCase() === charLower ||
                scene.characters?.some(c => c.toLowerCase() === charLower);
            cell.addClass(isPresent ? 'presence-active' : 'presence-absent');
            cell.setAttribute('title', `${scene.title} (seq ${scene.sequence ?? '?'}) \u2014 ${isPresent ? 'Present' : 'Absent'}`);
        });
        section.createDiv({ cls: 'character-presence-legend', text: 'Each cell = one scene. Colored = present, dim = absent.' });

        if (scenesBefore >= GAP_THRESHOLD) {
            const gapDiv = section.createDiv('character-gap-item');
            const gapIcon = gapDiv.createSpan();
            obsidian.setIcon(gapIcon, 'alert-triangle');
            gapDiv.createSpan({ text: ` Absent for first ${scenesBefore} scenes (appears first in scene ${firstCharSeq})` });
        }

        gaps.forEach(gap => {
            const gapDiv = section.createDiv('character-gap-item');
            const gapIcon = gapDiv.createSpan();
            obsidian.setIcon(gapIcon, 'alert-triangle');
            gapDiv.createSpan({ text: ` Gone for ${gap.missedCount} scenes between "${gap.from.title}" and "${gap.to.title}"` });
        });

        if (scenesAfter >= GAP_THRESHOLD) {
            const gapDiv = section.createDiv('character-gap-item');
            const gapIcon = gapDiv.createSpan();
            obsidian.setIcon(gapIcon, 'alert-triangle');
            gapDiv.createSpan({ text: ` Absent for last ${scenesAfter} scenes (last appears at scene ${lastCharSeq})` });
        }
    }

    private renderIntensityCurve(container: HTMLElement, _character: string, scenes: Scene[]): void {
        const section = container.createDiv('character-arc-section');
        section.createEl('h4', { text: 'Character Arc (Intensity)' });

        const width = 400;
        const height = 120;
        const padX = 36;
        const padY = 16;
        const plotW = width - padX * 2;
        const plotH = height - padY * 2;
        const minIntensity = -10;
        const maxIntensity = 10;
        const intensityRange = maxIntensity - minIntensity;

        const svg = activeDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', String(height));
        svg.classList.add('character-arc-svg');

        for (let v = minIntensity; v <= maxIntensity; v += 5) {
            const y = padY + plotH - ((v - minIntensity) / intensityRange) * plotH;
            const line = activeDocument.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', String(padX));
            line.setAttribute('x2', String(padX + plotW));
            line.setAttribute('y1', String(y));
            line.setAttribute('y2', String(y));
            line.setAttribute('class', 'arc-grid-line');
            svg.appendChild(line);
        }

        const yLabelLow = activeDocument.createElementNS('http://www.w3.org/2000/svg', 'text');
        yLabelLow.setAttribute('x', String(padX - 6));
        yLabelLow.setAttribute('y', String(padY + plotH));
        yLabelLow.setAttribute('text-anchor', 'end');
        yLabelLow.setAttribute('class', 'arc-axis-label');
        yLabelLow.textContent = String(minIntensity);
        svg.appendChild(yLabelLow);

        const yLabelHigh = activeDocument.createElementNS('http://www.w3.org/2000/svg', 'text');
        yLabelHigh.setAttribute('x', String(padX - 6));
        yLabelHigh.setAttribute('y', String(padY + 4));
        yLabelHigh.setAttribute('text-anchor', 'end');
        yLabelHigh.setAttribute('class', 'arc-axis-label');
        yLabelHigh.textContent = String(maxIntensity);
        svg.appendChild(yLabelHigh);

        const points: { x: number; y: number; scene: Scene }[] = [];
        scenes.forEach((scene, idx) => {
            const x = padX + (idx / (scenes.length - 1)) * plotW;
            const intensity = typeof scene.intensity === 'number' ? Math.max(minIntensity, Math.min(maxIntensity, scene.intensity)) : 0;
            const y = padY + plotH - ((intensity - minIntensity) / intensityRange) * plotH;
            points.push({ x, y, scene });
        });

        if (points.length >= 2) {
            const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            const path = activeDocument.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathD);
            path.setAttribute('class', 'arc-line');
            svg.appendChild(path);

            const areaD = pathD + ` L ${points[points.length - 1].x} ${padY + plotH} L ${points[0].x} ${padY + plotH} Z`;
            const area = activeDocument.createElementNS('http://www.w3.org/2000/svg', 'path');
            area.setAttribute('d', areaD);
            area.setAttribute('class', 'arc-area');
            svg.appendChild(area);
        }

        points.forEach(p => {
            const circle = activeDocument.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', String(p.x));
            circle.setAttribute('cy', String(p.y));
            circle.setAttribute('r', '4');
            circle.setAttribute('class', 'arc-dot');

            const title = activeDocument.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${p.scene.title} \u2014 intensity: ${p.scene.intensity}`;
            circle.appendChild(title);
            svg.appendChild(circle);

            const label = activeDocument.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', String(p.x));
            label.setAttribute('y', String(padY + plotH + 14));
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('class', 'arc-scene-label');
            label.textContent = String(p.scene.sequence ?? '?');
            svg.appendChild(label);
        });

        section.appendChild(svg);
    }

    // ── Utility ────────────────────────────────────────

    private roleClass(role: string): string {
        const r = role.toLowerCase().replace(/\s+/g, '-');
        return `role-${r}`;
    }

    /**
     * Navigate directly to a character's detail view by file path.
     * Called from the command palette / file-menu when the user wants to
     * jump from the character's freeform note back to the details panel.
     */
    async navigateToCharacter(filePath: string): Promise<void> {
        await this.characterManager.loadCharacters(this.sceneManager.getCharacterFolder());
        const char = this.characterManager.getCharacter(filePath);
        if (!char) {
            new Notice('Character not found in the active project.');
            return;
        }
        this.selectedCharacter = filePath;
        if (this.rootContainer) {
            this.renderView(this.rootContainer);
        }
    }

    /**
     * Public refresh called by the plugin on file changes.
     * If we are in detail-editing mode and the refresh was triggered by our own
     * save (within the grace window), skip the re-render to avoid stealing focus.
     */
    async refresh(): Promise<void> {
        if (
            this.selectedCharacter &&
            Date.now() - this._lastSaveTime < CharacterView.SAVE_REFRESH_GRACE_MS
        ) {
            // Our own save triggered this — silently reload data but don't re-render
            await this.characterManager.loadCharacters(this.sceneManager.getCharacterFolder());
            return;
        }
        await this.characterManager.loadCharacters(this.sceneManager.getCharacterFolder());
        if (this.rootContainer) {
            this.renderView(this.rootContainer);
        }
    }

    /* ───── Character card context menu (promote/demote, book membership) ───── */

    private showCharacterContextMenu(char: Character, e: MouseEvent): void {
        const menu = new obsidian.Menu();
        const sm = this.plugin.sceneManager;
        const seriesFolder = sm.getSeriesFolder();
        const seriesCharFolder = seriesFolder
            ? `${seriesFolder}/Codex/Characters`
            : null;
        const projectCharFolder = sm.getProjectLocalCharacterFolder();
        const currentBook = sm.getCurrentBookTitle();

        menu.addItem(item =>
            item.setTitle(char.name).setDisabled(true));
        menu.addSeparator();

        // Promote / Demote between project and series folder
        if (seriesFolder && seriesCharFolder && projectCharFolder) {
            const inSeries = char.filePath.startsWith(seriesCharFolder + '/');
            if (inSeries) {
                menu.addItem(item =>
                    item.setTitle('Demote to project (book-only)')
                        .setIcon('arrow-down-from-line')
                        .onClick(() => this.demoteCharacterToProject(char, projectCharFolder)));
            } else {
                menu.addItem(item =>
                    item.setTitle('Promote to series (shared)')
                        .setIcon('arrow-up-from-line')
                        .onClick(() => this.promoteCharacterToSeries(char, seriesCharFolder)));
            }
            menu.addSeparator();
        }

        // Toggle current-book membership (only meaningful in series mode)
        if (seriesFolder && currentBook) {
            const lower = currentBook.toLowerCase();
            const inBook = !char.books || char.books.length === 0
                || char.books.some(b => b.toLowerCase() === lower);
            const allBooks = !char.books || char.books.length === 0;

            if (allBooks) {
                menu.addItem(item =>
                    item.setTitle(`Restrict to "${currentBook}" only`)
                        .setIcon('book-marked')
                        .onClick(() => this.setCharacterBooks(char, [currentBook])));
            } else if (inBook) {
                menu.addItem(item =>
                    item.setTitle(`Remove from "${currentBook}"`)
                        .setIcon('book-x')
                        .onClick(() => this.setCharacterBooks(char,
                            (char.books || []).filter(b => b.toLowerCase() !== lower))));
            } else {
                menu.addItem(item =>
                    item.setTitle(`Add to "${currentBook}"`)
                        .setIcon('book-plus')
                        .onClick(() => this.setCharacterBooks(char,
                            [...(char.books || []), currentBook])));
            }
            menu.addItem(item =>
                item.setTitle('Share across all books')
                    .setIcon('books')
                    .setDisabled(allBooks)
                    .onClick(() => this.setCharacterBooks(char, [])));
        }

        menu.showAtMouseEvent(e);
    }

    private async promoteCharacterToSeries(char: Character, seriesCharFolder: string): Promise<void> {
        try {
            await this.characterManager.moveCharacter(char, seriesCharFolder);
            new Notice(`"${char.name}" promoted to series`);
            await this.plugin.refreshOpenViews();
        } catch (err) {
            new Notice(`Could not promote: ${(err as Error).message}`);
        }
    }

    private async demoteCharacterToProject(char: Character, projectCharFolder: string): Promise<void> {
        try {
            await this.characterManager.moveCharacter(char, projectCharFolder);
            new Notice(`"${char.name}" demoted to project`);
            await this.plugin.refreshOpenViews();
        } catch (err) {
            new Notice(`Could not demote: ${(err as Error).message}`);
        }
    }

    private async setCharacterBooks(char: Character, books: string[]): Promise<void> {
        try {
            const updated: Character = { ...char, books: books.length ? books : undefined };
            await this.characterManager.saveCharacter(updated);
            await this.plugin.refreshOpenViews();
        } catch (err) {
            new Notice(`Could not update book membership: ${(err as Error).message}`);
        }
    }

    /* ───── Tag type override context menu ───── */

    private addTagContextMenu(el: HTMLElement, tagName: string): void {
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const low = tagName.toLowerCase();
            const current = this.plugin.settings.tagTypeOverrides[low];

            const types: { label: string; value: TagType | null; icon: string }[] = [
                { label: 'Prop', value: 'prop', icon: 'gem' },
                { label: 'Location', value: 'location', icon: 'map-pin' },
                { label: 'Character', value: 'character', icon: 'user' },
                { label: 'Other', value: 'other', icon: 'file-text' },
                { label: 'Reset to Auto', value: null, icon: 'rotate-ccw' },
            ];

            const menu = new obsidian.Menu();
            menu.addItem(item => item.setTitle(`#${tagName}`).setDisabled(true));
            menu.addSeparator();
            for (const t of types) {
                menu.addItem(item => {
                    item.setTitle(t.label)
                        .setIcon(t.icon)
                        .setChecked(t.value !== null && current === t.value)
                        .onClick(async () => {
                            if (t.value === null) {
                                delete this.plugin.settings.tagTypeOverrides[low];
                            } else {
                                this.plugin.settings.tagTypeOverrides[low] = t.value;
                            }
                            await this.plugin.saveSettings();
                            if (this.rootContainer) this.renderView(this.rootContainer);
                        });
                });
            }
            menu.showAtMouseEvent(e);
        });
    }

    /**
     * Open a modal to pick/import an image file.
     * Returns the vault-relative path of the chosen file, empty string to clear, or undefined if cancelled.
     */
    private pickImage(currentImage?: string): Promise<string | undefined> {
        const sceneFolder = this.sceneManager.getSceneFolder();
        return pickImageModal(this.app, sceneFolder, currentImage);
    }

    /**
     * Open a non-modal, draggable/resizable floating window showing a gallery image.
     * Sized at 2× the gallery panel width. Has prev/next navigation.
     */
    private openGalleryLightbox(
        gallery: Array<{ path: string; caption: string }>,
        startIndex: number,
        galleryWidth: number
    ): void {
        // Close any existing lightbox
        activeDocument.querySelector('.gallery-lightbox-window')?.remove();

        let currentIndex = startIndex;
        const winWidth = Math.min(Math.round(galleryWidth * 2), window.innerWidth - 40);
        const winHeight = Math.round(winWidth * 3 / 4) + 36 + 28; // 4:3 content + titlebar + caption

        // Floating window directly on body (no overlay — non-blocking)
        const win = activeDocument.body.createDiv('gallery-lightbox-window');
        win.setCssStyles({
            width: `${winWidth}px`,
            height: `${winHeight}px`,
        });

        // Titlebar (draggable)
        const titlebar = win.createDiv('gallery-lightbox-titlebar');
        const titleText = titlebar.createSpan({ cls: 'gallery-lightbox-title' });
        const closeBtn = titlebar.createEl('button', { cls: 'gallery-lightbox-close', attr: { title: 'Close' } });
        obsidian.setIcon(closeBtn, 'x');
        closeBtn.addEventListener('click', () => { cleanup(); win.remove(); });

        // Content area with nav + image
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

        // Caption
        const captionEl = win.createDiv('gallery-lightbox-caption');

        // Resize handle
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
            // Hide nav buttons if only one image
            prevBtn.setCssStyles({ display: gallery.length > 1 ? '' : 'none' });
            nextBtn.setCssStyles({ display: gallery.length > 1 ? '' : 'none' });
        };
        renderContent();

        // ── Scroll / pinch to zoom ──
        imgContainer.addEventListener('wheel', (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Math.max(0.5, Math.min(5, getZoom() + delta));
            setZoom(newZoom);
            const img = imgContainer.querySelector('img');
            if (img) img.setCssStyles({ transform: `scale(${newZoom})` });
        }, { passive: false });

        // Touch pinch-to-zoom
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

        // ── Drag logic ──
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        titlebar.addEventListener('pointerdown', (e: PointerEvent) => {
            if ((e.target as HTMLElement).closest('.gallery-lightbox-close')) return;
            isDragging = true;
            // Use getBoundingClientRect to get the actual visual position
            // (handles transform: translate(-50%, -50%) correctly)
            const rect = win.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            // Resolve transform to explicit left/top on first drag
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

        // ── Resize logic ──
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

        // Close on Escape
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                cleanup();
                win.remove();
            }
        };
        activeDocument.addEventListener('keydown', onKey);

        const cleanup = () => {
            activeDocument.removeEventListener('keydown', onKey);
        };
    }
}
/**
 * Modal that lets the user pick an existing character profile to link an alias to.
 */
class LinkCharacterModal extends Modal {
    private aliasName: string;
    private characters: Character[];
    private onSelect: (canonicalName: string) => void;

    constructor(app: import('obsidian').App, aliasName: string, characters: Character[], onSelect: (canonicalName: string) => void) {
        super(app);
        this.aliasName = aliasName;
        this.characters = characters;
        this.onSelect = onSelect;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h3', { text: `Link "${this.aliasName}" to\u2026` });
        contentEl.createEl('p', {
            cls: 'setting-item-description',
            text: `Choose which character "${this.aliasName}" refers to. This alias will be remembered and the name will no longer appear as a separate character.`,
        });

        const list = contentEl.createDiv('link-character-list');

        for (const char of this.characters) {
            const row = list.createDiv('link-character-row');
            row.createSpan({ text: char.name, cls: 'link-character-name' });
            if (char.nickname) {
                row.createSpan({ text: ` (${char.nickname})`, cls: 'link-character-nickname' });
            }
            row.addEventListener('click', () => {
                this.onSelect(char.name);
                this.close();
            });
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- end of file-wide suppression block opened at line 1 */
