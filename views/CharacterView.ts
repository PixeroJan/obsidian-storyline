import { ItemView, WorkspaceLeaf, TFile, Notice, Modal, Setting } from 'obsidian';
import * as obsidian from 'obsidian';
import { Scene, STATUS_CONFIG } from '../models/Scene';
import { Character, CHARACTER_CATEGORIES, CHARACTER_ROLES, CharacterFieldDef, extractCharacterProps, extractCharacterLocationTags, extractAllCharacterTags, TagType } from '../models/Character';
import { SceneManager } from '../services/SceneManager';
import { CharacterManager } from '../services/CharacterManager';
import { renderViewSwitcher } from '../components/ViewSwitcher';
import { UndoManager } from '../services/UndoManager';
import { RelationshipMap } from '../components/RelationshipMap';
import { StoryGraph } from '../components/StoryGraph';

import type SceneCardsPlugin from '../main';

import { CHARACTER_VIEW_TYPE } from '../constants';

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
    private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
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
        this.rootContainer = container;

        await this.sceneManager.initialize();
        await this.characterManager.loadCharacters(this.sceneManager.getCharacterFolder());
        this.renderView(container);
    }

    async onClose(): Promise<void> {
        // Flush any pending auto-save so edits are not lost
        await this.flushPendingSave();
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
        }

        // New character button
        const addBtn = controls.createEl('button', { cls: 'mod-cta character-add-btn', text: '+ New Character' });
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

        const fileCharacters = this.characterManager.getAllCharacters();
        const sceneCharNames = this.sceneManager.getAllCharacters();
        const scenes = this.sceneManager.getAllScenes();

        // Characters with files
        if (fileCharacters.length > 0 || sceneCharNames.length > 0) {
            const grid = container.createDiv('character-overview-grid');

            // Render characters that have dedicated files
            for (const char of fileCharacters) {
                this.renderOverviewCard(grid, char, scenes);
            }

            // Find characters from scenes that don't have files yet
            const fileNames = new Set(fileCharacters.map(c => c.name.toLowerCase()));
            const unlinked = sceneCharNames.filter(n => !fileNames.has(n.toLowerCase()));
            if (unlinked.length > 0) {
                // Divider
                if (fileCharacters.length > 0) {
                    const divider = container.createDiv('character-unlinked-divider');
                    divider.createEl('span', { text: 'Characters from scenes (no profile yet)' });
                }
                const ugrid = container.createDiv('character-overview-grid');
                for (const name of unlinked) {
                    this.renderUnlinkedCard(ugrid, name, scenes);
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

    private renderOverviewCard(grid: HTMLElement, char: Character, scenes: Scene[]): void {
        const card = grid.createDiv('character-overview-card');

        // Role badge
        if (char.role) {
            const badge = card.createDiv('character-role-badge');
            badge.textContent = char.role;
            badge.addClass(this.roleClass(char.role));
        }

        // Name
        card.createEl('h4', { text: char.name });

        // Short description snippet
        const snippet = char.personality || char.occupation || char.age || '';
        if (snippet) {
            card.createEl('p', { cls: 'character-card-snippet', text: snippet });
        }

        // Scene stats
        const charLower = char.name.toLowerCase();
        const povCount = scenes.filter(s => s.pov?.toLowerCase() === charLower).length;
        const presentCount = scenes.filter(s =>
            s.characters?.some(c => c.toLowerCase() === charLower) &&
            s.pov?.toLowerCase() !== charLower
        ).length;
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
        fill.style.width = `${pct}%`;
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
    }

    private renderUnlinkedCard(grid: HTMLElement, name: string, scenes: Scene[]): void {
        const card = grid.createDiv('character-overview-card character-unlinked');

        card.createEl('h4', { text: name });

        const charLower = name.toLowerCase();
        const povCount = scenes.filter(s => s.pov?.toLowerCase() === charLower).length;
        const presentCount = scenes.filter(s =>
            s.characters?.some(c => c.toLowerCase() === charLower) &&
            s.pov?.toLowerCase() !== charLower
        ).length;

        const stats = card.createDiv('character-card-stats');
        stats.createSpan({ text: `${povCount} POV \u00b7 ${povCount + presentCount} scenes` });

        const createBtn = card.createEl('button', { cls: 'character-create-profile-btn', text: 'Create Profile' });
        createBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.createCharacterFromName(name);
        });
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

    // ── Story Graph ────────────────────────────────────

    private renderStoryGraph(container: HTMLElement): void {
        container.empty();
        container.createEl('h3', { text: 'Story Graph' });

        const scenes = this.sceneManager.getAllScenes();
        const characters = this.characterManager.getAllCharacters();
        const scanner = this.plugin.linkScanner;
        // Ensure scan results are up to date
        scanner.rebuildLookups();
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
        const draft: Character = { ...character, custom: { ...(character.custom || {}) } };
        // Snapshot for undo — taken once when the detail view opens
        this.undoSnapshot = { ...character, custom: { ...(character.custom || {}) } };

        // Back button + character name header
        const header = container.createDiv('character-detail-header');
        const backBtn = header.createEl('button', { cls: 'character-back-btn' });
        obsidian.setIcon(backBtn, 'arrow-left');
        backBtn.createSpan({ text: ' All Characters' });
        backBtn.addEventListener('click', () => {
            this.selectedCharacter = null;
            this.renderView(this.rootContainer!);
        });

        const headerRight = header.createDiv('character-detail-header-right');
        // Delete button
        const deleteBtn = headerRight.createEl('button', { cls: 'character-delete-btn', attr: { title: 'Delete character' } });
        obsidian.setIcon(deleteBtn, 'trash-2');
        deleteBtn.addEventListener('click', () => this.confirmDeleteCharacter(character));

        // Open file button
        const openBtn = headerRight.createEl('button', { cls: 'character-open-btn', attr: { title: 'Open character file' } });
        obsidian.setIcon(openBtn, 'file-text');
        openBtn.addEventListener('click', () => this.openCharacterFile(character));

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

        // ── Side panel: scene info ──
        this.renderScenePanel(sidePanel, character.name);
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

        const sectionBody = section.createDiv('character-section-body');
        if (isCollapsed) sectionBody.style.display = 'none';

        sectionHeader.addEventListener('click', () => {
            if (this.collapsedSections.has(category.title)) {
                this.collapsedSections.delete(category.title);
                sectionBody.style.display = '';
                obsidian.setIcon(chevron, 'chevron-down');
            } else {
                this.collapsedSections.add(category.title);
                sectionBody.style.display = 'none';
                obsidian.setIcon(chevron, 'chevron-right');
            }
        });

        // Fields
        for (const field of category.fields) {
            this.renderField(sectionBody, field, draft);
        }
    }

    private renderField(parent: HTMLElement, field: CharacterFieldDef, draft: Character): void {
        const row = parent.createDiv('character-field-row');
        row.createEl('label', { cls: 'character-field-label', text: field.label });

        const value = (draft as any)[field.key] ?? '';

        // Allies & Enemies get a tag-style character picker
        if (field.key === 'allies' || field.key === 'enemies') {
            this.renderCharacterTagField(row, field, draft);
            return;
        }

        if (field.key === 'role') {
            // Role gets a dropdown
            const select = row.createEl('select', { cls: 'character-field-input dropdown' });
            select.createEl('option', { text: field.placeholder, value: '' });
            for (const r of CHARACTER_ROLES) {
                const opt = select.createEl('option', { text: r, value: r });
                if (value === r) opt.selected = true;
            }
            // Also allow freeform if current value isn't in list
            if (value && !CHARACTER_ROLES.includes(value)) {
                const opt = select.createEl('option', { text: value, value: value });
                opt.selected = true;
            }
            select.addEventListener('change', () => {
                (draft as any)[field.key] = select.value;
                this.scheduleSave(draft);
            });
        } else if (field.multiline) {
            const textarea = row.createEl('textarea', {
                cls: 'character-field-textarea',
                attr: { placeholder: field.placeholder, rows: '3' },
            });
            textarea.value = value;
            textarea.addEventListener('input', () => {
                (draft as any)[field.key] = textarea.value;
                this.scheduleSave(draft);
            });
        } else {
            const input = row.createEl('input', {
                cls: 'character-field-input',
                type: 'text',
                attr: { placeholder: field.placeholder },
            });
            input.value = value;
            input.addEventListener('input', () => {
                (draft as any)[field.key] = input.value;
                this.scheduleSave(draft);
            });
        }
    }

    /**
     * Render a tag-style character picker for allies/enemies fields.
     * Shows existing selections as removable tags, a dropdown to pick from existing characters,
     * and a "+" button to quickly create a new character.
     */
    private renderCharacterTagField(row: HTMLElement, field: CharacterFieldDef, draft: Character): void {
        const container = row.createDiv('character-tag-field');

        // Current values as array
        const currentValues: string[] = Array.isArray((draft as any)[field.key])
            ? [...(draft as any)[field.key]]
            : [];

        // Get all available character names (from character files + scene references)
        const fileCharacters = this.characterManager.getAllCharacters();
        const allCharNames = fileCharacters.map(c => c.name);
        const sceneCharNames = this.sceneManager.getAllCharacters();
        const mergedNames = new Set([...allCharNames, ...sceneCharNames]);
        // Exclude the current character and already-selected names
        const available = Array.from(mergedNames)
            .filter(n => n !== draft.name && !currentValues.includes(n))
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

        const tagsContainer = container.createDiv('character-tag-list');

        const renderTags = () => {
            tagsContainer.empty();
            for (const name of currentValues) {
                const tag = tagsContainer.createSpan('character-tag');
                tag.createSpan({ text: name });
                const removeBtn = tag.createSpan({ cls: 'character-tag-remove', text: '×' });
                removeBtn.addEventListener('click', () => {
                    const idx = currentValues.indexOf(name);
                    if (idx >= 0) currentValues.splice(idx, 1);
                    (draft as any)[field.key] = [...currentValues];
                    this.scheduleSave(draft);
                    renderTags();
                    refreshDropdown();
                });
            }
        };

        // Add row: dropdown + add button
        const addRow = container.createDiv('character-tag-add-row');
        const select = addRow.createEl('select', { cls: 'character-field-input dropdown character-tag-select' });

        const refreshDropdown = () => {
            select.empty();
            select.createEl('option', { text: field.placeholder, value: '' });
            const remaining = Array.from(mergedNames)
                .filter(n => n !== draft.name && !currentValues.includes(n))
                .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            for (const name of remaining) {
                select.createEl('option', { text: name, value: name });
            }
        };
        refreshDropdown();

        select.addEventListener('change', () => {
            const chosen = select.value;
            if (chosen && !currentValues.includes(chosen)) {
                currentValues.push(chosen);
                (draft as any)[field.key] = [...currentValues];
                this.scheduleSave(draft);
                renderTags();
                refreshDropdown();
            }
        });

        // Quick-add "+" button to create a new character
        const addBtn = addRow.createEl('button', {
            cls: 'clickable-icon character-tag-add-btn',
            attr: { 'aria-label': 'Create new character and add' },
        });
        obsidian.setIcon(addBtn, 'plus');
        addBtn.addEventListener('click', async () => {
            // Open a small modal to type a name
            const modal = new Modal(this.app);
            modal.titleEl.setText('New Character');
            let newName = '';
            new Setting(modal.contentEl)
                .setName('Name')
                .addText(text => {
                    text.setPlaceholder('Character name')
                        .onChange(v => { newName = v; });
                    setTimeout(() => text.inputEl.focus(), 50);
                });
            const btnRow = modal.contentEl.createDiv('structure-close-row');
            const createBtn = btnRow.createEl('button', { text: 'Create & Add', cls: 'mod-cta' });
            createBtn.addEventListener('click', async () => {
                if (!newName.trim()) return;
                const trimmed = newName.trim();
                // Create the character file
                try {
                    await this.characterManager.createCharacter(
                        this.sceneManager.getCharacterFolder(),
                        trimmed
                    );
                } catch (e) {
                    // Character may already exist as a file — that's fine
                }
                // Add to the tag list
                if (!currentValues.includes(trimmed)) {
                    currentValues.push(trimmed);
                    (draft as any)[field.key] = [...currentValues];
                    this.scheduleSave(draft);
                    mergedNames.add(trimmed);
                    renderTags();
                    refreshDropdown();
                }
                modal.close();
            });
            modal.open();
        });

        renderTags();
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
        if (isCollapsed) sectionBody.style.display = 'none';

        sectionHeader.addEventListener('click', () => {
            if (this.collapsedSections.has(title)) {
                this.collapsedSections.delete(title);
                sectionBody.style.display = '';
                obsidian.setIcon(chevron, 'chevron-down');
            } else {
                this.collapsedSections.add(title);
                sectionBody.style.display = 'none';
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

    // ── Scene side panel ───────────────────────────────

    private renderScenePanel(container: HTMLElement, characterName: string): void {
        const scenes = this.sceneManager.getFilteredScenes(
            undefined,
            { field: 'sequence', direction: 'asc' }
        );

        const charLower = characterName.toLowerCase();
        const povScenes = scenes.filter(s => s.pov?.toLowerCase() === charLower);
        const presentScenes = scenes.filter(s =>
            s.pov?.toLowerCase() !== charLower &&
            s.characters?.some(c => c.toLowerCase() === charLower)
        );
        const allCharScenes = [...povScenes, ...presentScenes];

        // Stats summary
        const statsBox = container.createDiv('character-side-stats');
        statsBox.createEl('h4', { text: 'Scene Presence' });

        const statGrid = statsBox.createDiv('character-stat-grid');
        this.renderStat(statGrid, String(povScenes.length), 'POV');
        this.renderStat(statGrid, String(presentScenes.length), 'Supporting');
        this.renderStat(statGrid, String(allCharScenes.length), 'Total');

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
            filled.style.width = `${percent}%`;
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
                const isPov = scene.pov?.toLowerCase() === charLower;

                const act = scene.act !== undefined ? String(scene.act).padStart(2, '0') : '??';
                const seq = scene.sequence !== undefined ? String(scene.sequence).padStart(2, '0') : '??';

                item.createSpan({ cls: 'scene-id', text: `[${act}-${seq}]` });
                item.createSpan({ cls: 'scene-title', text: ` ${scene.title}` });

                if (isPov) {
                    item.createSpan({ cls: 'character-pov-badge', text: 'POV' });
                }

                const statusCfg = STATUS_CONFIG[scene.status || 'idea'];
                const statusBadge = item.createSpan({
                    cls: 'scene-status-badge',
                    attr: { title: statusCfg.label }
                });
                obsidian.setIcon(statusBadge, statusCfg.icon);

                item.addEventListener('click', () => this.openScene(scene));
            }
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

    private renderStat(parent: HTMLElement, value: string, label: string): void {
        const stat = parent.createDiv('character-stat-item');
        stat.createDiv({ cls: 'character-stat-value', text: value });
        stat.createDiv({ cls: 'character-stat-label', text: label });
    }

    // ── Auto-save ──────────────────────────────────────

    private scheduleSave(draft: Character): void {
        if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
        this.pendingSaveDraft = draft;
        this.autoSaveTimer = setTimeout(async () => {
            try {
                // Record undo snapshot
                const undoMgr = this.plugin.sceneManager?.undoManager;
                if (undoMgr && this.undoSnapshot) {
                    undoMgr.recordUpdate(
                        draft.filePath,
                        this.undoSnapshot as unknown as Record<string, any>,
                        draft as unknown as Record<string, any>,
                        `Update character "${draft.name}"`,
                        'character'
                    );
                    // Update snapshot so next edit diffs from the saved state
                    this.undoSnapshot = { ...draft, custom: { ...(draft.custom || {}) } };
                }
                this._lastSaveTime = Date.now();
                await this.characterManager.saveCharacter(draft);
                this.pendingSaveDraft = null;
            } catch (e) {
                console.error('StoryLine: failed to save character', e);
            }
        }, 600);
    }

    /** Immediately flush any pending debounced save */
    private async flushPendingSave(): Promise<void> {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
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
                setTimeout(() => text.inputEl.focus(), 50);
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
            await leaf.openFile(file);
        }
    }

    private async openScene(scene: Scene): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(scene.filePath);
        if (file instanceof TFile) {
            const leaf = this.app.workspace.getLeaf('tab');
            await leaf.openFile(file);
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

    private renderIntensityCurve(container: HTMLElement, character: string, scenes: Scene[]): void {
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

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', String(height));
        svg.classList.add('character-arc-svg');

        for (let v = minIntensity; v <= maxIntensity; v += 5) {
            const y = padY + plotH - ((v - minIntensity) / intensityRange) * plotH;
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', String(padX));
            line.setAttribute('x2', String(padX + plotW));
            line.setAttribute('y1', String(y));
            line.setAttribute('y2', String(y));
            line.setAttribute('class', 'arc-grid-line');
            svg.appendChild(line);
        }

        const yLabelLow = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        yLabelLow.setAttribute('x', String(padX - 6));
        yLabelLow.setAttribute('y', String(padY + plotH));
        yLabelLow.setAttribute('text-anchor', 'end');
        yLabelLow.setAttribute('class', 'arc-axis-label');
        yLabelLow.textContent = String(minIntensity);
        svg.appendChild(yLabelLow);

        const yLabelHigh = document.createElementNS('http://www.w3.org/2000/svg', 'text');
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
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathD);
            path.setAttribute('class', 'arc-line');
            svg.appendChild(path);

            const areaD = pathD + ` L ${points[points.length - 1].x} ${padY + plotH} L ${points[0].x} ${padY + plotH} Z`;
            const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            area.setAttribute('d', areaD);
            area.setAttribute('class', 'arc-area');
            svg.appendChild(area);
        }

        points.forEach(p => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', String(p.x));
            circle.setAttribute('cy', String(p.y));
            circle.setAttribute('r', '4');
            circle.setAttribute('class', 'arc-dot');

            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${p.scene.title} \u2014 intensity: ${p.scene.intensity}`;
            circle.appendChild(title);
            svg.appendChild(circle);

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
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
}
