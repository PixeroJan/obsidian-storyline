import { Scene, STATUS_CONFIG, SceneStatus, TIMELINE_MODE_LABELS, TIMELINE_MODE_ICONS, TimelineMode, TIMELINE_MODES } from '../models/Scene';
import { Modal, App, FuzzySuggestModal } from 'obsidian';
import * as obsidian from 'obsidian';
import { openConfirmModal } from './ConfirmModal';
import { SceneManager } from '../services/SceneManager';
import type SceneCardsPlugin from '../main';
import { LocationManager } from '../services/LocationManager';
import type { SnapshotManager, SceneSnapshot } from '../services/SnapshotManager';
import { LinkScanner, LinkScanResult } from '../services/LinkScanner';

/**
 * Scene inspector sidebar component
 */
export class InspectorComponent {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;
    private container: HTMLElement;
    private currentScene: Scene | null = null;
    private onEdit: (scene: Scene) => void;
    private onDelete: (scene: Scene) => void;
    private onStatusChange: (scene: Scene, newStatus: SceneStatus) => void;

    /**
     * Format intensity value for display (-10 to +10)
     */
    private formatIntensity(val: number): string {
        if (val > 0) return `+${val}`;
        if (val < 0) return `${val}`;
        return '0';
    }

    constructor(
        container: HTMLElement,
        plugin: SceneCardsPlugin,
        sceneManager: SceneManager,
        callbacks: {
            onEdit: (scene: Scene) => void;
            onDelete: (scene: Scene) => void;
            onStatusChange: (scene: Scene, newStatus: SceneStatus) => void;
        }
    ) {
        this.container = container;
        this.plugin = plugin;
        this.sceneManager = sceneManager;
        this.onEdit = callbacks.onEdit;
        this.onDelete = callbacks.onDelete;
        this.onStatusChange = callbacks.onStatusChange;
    }

    /**
     * Show inspector for a scene
     */
    show(scene: Scene): void {
        this.currentScene = scene;
        this.render();
        this.container.style.display = 'block';
    }

    /**
     * Hide inspector
     */
    hide(): void {
        this.currentScene = null;
        this.container.style.display = 'none';
    }

    /**
     * Render the inspector content
     */
    private render(): void {
        const scene = this.currentScene;
        if (!scene) return;

        this.container.empty();
        this.container.addClass('story-line-inspector');

        // Header
        const header = this.container.createDiv('inspector-header');
        header.createEl('h3', { text: 'Scene Details' });
        const closeBtn = header.createEl('button', {
            cls: 'clickable-icon inspector-close',
            text: '×'
        });
        closeBtn.addEventListener('click', () => this.hide());

        // Sequence + Title
        const titleSection = this.container.createDiv('inspector-title-section');
        if (scene.sequence !== undefined) {
            const act = scene.act !== undefined ? String(scene.act).padStart(2, '0') : '??';
            const seq = String(scene.sequence).padStart(2, '0');
            titleSection.createDiv({ cls: 'inspector-seq', text: `${act}-${seq}` });
        }
        if (scene.chronologicalOrder !== undefined && scene.chronologicalOrder !== scene.sequence) {
            const chronoSeq = String(scene.chronologicalOrder).padStart(2, '0');
            const chronoBadge = titleSection.createDiv({ cls: 'inspector-chrono-seq', text: `C${chronoSeq}` });
            chronoBadge.setAttribute('title', `Chronological order: ${chronoSeq}`);
        }
        // Timeline mode badge (shown for non-linear scenes)
        const mode = scene.timeline_mode || 'linear';
        if (mode !== 'linear') {
            const modeBadge = titleSection.createDiv({ cls: `inspector-timeline-mode-badge timeline-mode-${mode}` });
            const modeIcon = modeBadge.createSpan();
            obsidian.setIcon(modeIcon, TIMELINE_MODE_ICONS[mode] || 'clock');
            modeBadge.createSpan({ text: ` ${TIMELINE_MODE_LABELS[mode]}` });
            if (scene.timeline_strand) {
                modeBadge.createSpan({ cls: 'inspector-strand-label', text: ` (${scene.timeline_strand})` });
            }
        }
        titleSection.createEl('h4', { text: scene.title || 'Untitled' });

        // Status dropdown (custom with Lucide icons)
        const statusSection = this.container.createDiv('inspector-section');
        statusSection.createSpan({ cls: 'inspector-label', text: 'Status: ' });
        
        const statusDropdown = statusSection.createDiv('inspector-status-dropdown');
        const currentStatus = scene.status || 'idea';
        const currentCfg = STATUS_CONFIG[currentStatus];
        
        const statusButton = statusDropdown.createEl('button', {
            cls: 'inspector-status-button',
        });
        const btnIcon = statusButton.createSpan({ cls: 'inspector-status-icon' });
        obsidian.setIcon(btnIcon, currentCfg.icon);
        const btnLabel = statusButton.createSpan({ text: currentCfg.label });
        const btnChevron = statusButton.createSpan({ cls: 'inspector-status-chevron' });
        obsidian.setIcon(btnChevron, 'chevron-down');

        const statusMenu = statusDropdown.createDiv('inspector-status-menu');
        statusMenu.style.display = 'none';

        const statuses: SceneStatus[] = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];
        statuses.forEach(s => {
            const cfg = STATUS_CONFIG[s];
            const item = statusMenu.createDiv({
                cls: `inspector-status-item ${s === currentStatus ? 'active' : ''}`
            });
            const itemIcon = item.createSpan({ cls: 'inspector-status-icon' });
            obsidian.setIcon(itemIcon, cfg.icon);
            item.createSpan({ text: cfg.label });

            item.addEventListener('click', () => {
                statusMenu.style.display = 'none';
                this.onStatusChange(scene, s);
            });
        });

        statusButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = statusMenu.style.display !== 'none';
            statusMenu.style.display = isVisible ? 'none' : 'block';
        });

        // Close menu when clicking outside
        const closeMenu = (e: MouseEvent) => {
            if (!statusDropdown.contains(e.target as Node)) {
                statusMenu.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            }
        };
        statusButton.addEventListener('click', () => {
            setTimeout(() => document.addEventListener('click', closeMenu), 0);
        });

        // Word count
        const wcSection = this.container.createDiv('inspector-section');
        const wc = scene.wordcount || 0;
        const target = scene.target_wordcount || this.plugin.settings.defaultTargetWordCount;
        wcSection.createSpan({ cls: 'inspector-label', text: 'Words: ' });
        wcSection.createSpan({ text: `${wc}` });
        if (target) {
            wcSection.createSpan({ cls: 'inspector-target', text: ` / ~${target} target` });
        }

        // POV
        if (scene.pov) {
            const povSection = this.container.createDiv('inspector-section');
            povSection.createSpan({ cls: 'inspector-label', text: 'POV: ' });
            povSection.createSpan({ text: scene.pov });
        }

        // Location (editable dropdown)
        const locSection = this.container.createDiv('inspector-section');
        locSection.createSpan({ cls: 'inspector-label', text: 'Location: ' });
        const locSelect = locSection.createEl('select', { cls: 'inspector-location-select' });
        locSelect.createEl('option', { text: 'None', value: '' });
        const locationNames = this.getLocationNames();
        for (const name of locationNames) {
            const opt = locSelect.createEl('option', { text: name, value: name });
            if (scene.location === name) opt.selected = true;
        }
        // If scene has a location not in the list, add it
        if (scene.location && !locationNames.includes(scene.location)) {
            const opt = locSelect.createEl('option', { text: scene.location, value: scene.location });
            opt.selected = true;
        }
        locSelect.addEventListener('change', async () => {
            const newLoc = locSelect.value || undefined;
            await this.sceneManager.updateScene(scene.filePath, { location: newLoc } as any);
            scene.location = newLoc;
        });

        // Timeline
        if (scene.timeline) {
            const timeSection = this.container.createDiv('inspector-section');
            timeSection.createSpan({ cls: 'inspector-label', text: 'Time: ' });
            timeSection.createSpan({ text: scene.timeline });
        }

        // Characters
        if (scene.characters?.length) {
            const charSection = this.container.createDiv('inspector-section');
            charSection.createSpan({ cls: 'inspector-label', text: 'Characters:' });
            const charList = charSection.createEl('ul', { cls: 'inspector-list' });
            scene.characters.forEach(c => {
                const li = charList.createEl('li');
                li.createSpan({ text: c });
                if (c === scene.pov) {
                    li.createSpan({ cls: 'inspector-pov-badge', text: ' (POV)' });
                }
            });
        }

        // Detected in text (LinkScanner results)
        this.renderDetectedLinks(scene);

        // Plotlines/Tags
        if (scene.tags?.length) {
            const tagSection = this.container.createDiv('inspector-section');
            tagSection.createSpan({ cls: 'inspector-label', text: 'Plotlines / Tags:' });
            const tagList = tagSection.createEl('ul', { cls: 'inspector-list' });
            const tagColors = this.plugin.settings.tagColors || {};
            scene.tags.forEach(t => {
                const li = tagList.createEl('li');
                if (tagColors[t]) {
                    const swatch = li.createSpan({ cls: 'inspector-tag-swatch' });
                    swatch.style.backgroundColor = tagColors[t];
                }
                li.appendText(t);
            });
        }

        // Description (body text)
        if (scene.body) {
            const descSection = this.container.createDiv('inspector-section');
            descSection.createSpan({ cls: 'inspector-label', text: 'Description:' });
            descSection.createEl('p', {
                cls: 'inspector-description',
                text: scene.body.length > 300
                    ? scene.body.substring(0, 300) + '...'
                    : scene.body
            });
        }

        // Conflict
        if (scene.conflict) {
            const conflictSection = this.container.createDiv('inspector-section');
            conflictSection.createSpan({ cls: 'inspector-label', text: 'Conflict:' });
            conflictSection.createEl('p', {
                cls: 'inspector-conflict',
                text: scene.conflict
            });
        }

        // Emotion
        if (scene.emotion) {
            const emotionSection = this.container.createDiv('inspector-section');
            emotionSection.createSpan({ cls: 'inspector-label', text: 'Emotion: ' });
            emotionSection.createSpan({ text: scene.emotion });
        }

        // Intensity slider (always shown, editable)
        const intensitySection = this.container.createDiv('inspector-section inspector-intensity');
        intensitySection.createSpan({ cls: 'inspector-label', text: 'Intensity: ' });
        const intensityRow = intensitySection.createDiv('inspector-intensity-row');
        const slider = intensityRow.createEl('input', {
            attr: {
                type: 'range',
                min: '-10',
                max: '10',
                step: '1',
                value: String(scene.intensity ?? 0),
            },
            cls: 'inspector-intensity-slider',
        });
        const valueLabel = intensityRow.createSpan({
            cls: 'inspector-intensity-value',
            text: this.formatIntensity(scene.intensity ?? 0),
        });
        slider.addEventListener('input', () => {
            const val = Number(slider.value);
            valueLabel.textContent = this.formatIntensity(val);
            valueLabel.className = 'inspector-intensity-value ' +
                (val > 0 ? 'intensity-positive' : val < 0 ? 'intensity-negative' : 'intensity-neutral');
        });
        slider.addEventListener('change', async () => {
            const val = Number(slider.value);
            await this.sceneManager.updateScene(scene.filePath, { intensity: val } as any);
        });
        // Set initial color class
        const initVal = scene.intensity ?? 0;
        valueLabel.className = 'inspector-intensity-value ' +
            (initVal > 0 ? 'intensity-positive' : initVal < 0 ? 'intensity-negative' : 'intensity-neutral');

        // Setup / Payoff tracking
        this.renderSetupPayoff(scene);

        // Editorial Notes / Revision Comments
        this.renderNotes(scene);

        // Snapshots / Version History
        this.renderSnapshots(scene);

        // Action buttons
        const actions = this.container.createDiv('inspector-actions');

        const editBtn = actions.createEl('button', {
            cls: 'mod-cta',
            text: 'Edit Scene'
        });
        editBtn.addEventListener('click', () => this.onEdit(scene));

        const deleteBtn = actions.createEl('button', {
            cls: 'mod-warning',
            text: 'Delete'
        });
        deleteBtn.addEventListener('click', () => {
            openConfirmModal(this.plugin.app, {
                title: 'Delete Scene',
                message: `Delete scene "${scene.title || 'Untitled'}"?`,
                confirmLabel: 'Delete',
                onConfirm: () => {
                    this.onDelete(scene);
                    this.hide();
                },
            });
        });
    }

    /**
     * Render the Setup / Payoff tracking section
     */
    private renderSetupPayoff(scene: Scene): void {
        const section = this.container.createDiv('inspector-section inspector-setup-payoff');
        section.createSpan({ cls: 'inspector-label', text: 'Setup / Payoff:' });

        // --- "Sets up" list (scenes this scene sets up) ---
        const payoffLabel = section.createDiv('inspector-sp-row');
        const payoffIcon = payoffLabel.createSpan();
        obsidian.setIcon(payoffIcon, 'arrow-right');
        payoffLabel.createSpan({ text: ' Sets up:', cls: 'inspector-sp-label' });

        const payoffList = section.createDiv('inspector-sp-list');
        if (scene.payoff_scenes?.length) {
            scene.payoff_scenes.forEach(target => {
                const chip = payoffList.createDiv('inspector-sp-chip');
                chip.createSpan({ text: target.replace(/^\[\[|\]\]$/g, '') });
                const removeBtn = chip.createEl('button', { cls: 'inspector-sp-remove clickable-icon', text: '×' });
                removeBtn.addEventListener('click', async () => {
                    const updated = (scene.payoff_scenes || []).filter(s => s !== target);
                    await this.sceneManager.updateScene(scene.filePath, { payoff_scenes: updated } as any);
                    // Also remove reverse link
                    const targetScene = this.sceneManager.getAllScenes().find(s => s.title === target);
                    if (targetScene && targetScene.setup_scenes?.includes(scene.title)) {
                        const rev = targetScene.setup_scenes.filter(s => s !== scene.title);
                        await this.sceneManager.updateScene(targetScene.filePath, { setup_scenes: rev } as any);
                    }
                    // Refresh inspector
                    const fresh = this.sceneManager.getAllScenes().find(s => s.filePath === scene.filePath);
                    if (fresh) this.show(fresh);
                });
            });
        } else {
            payoffList.createSpan({ cls: 'inspector-sp-empty', text: 'None' });
        }

        const addPayoffBtn = section.createEl('button', { cls: 'story-line-chip inspector-sp-add', text: '+ Link payoff scene' });
        addPayoffBtn.addEventListener('click', () => {
            this.openScenePicker(scene, 'payoff');
        });

        // --- "Set up by" list (scenes that set this one up) ---
        const setupLabel = section.createDiv('inspector-sp-row');
        const setupIcon = setupLabel.createSpan();
        obsidian.setIcon(setupIcon, 'arrow-left');
        setupLabel.createSpan({ text: ' Set up by:', cls: 'inspector-sp-label' });

        const setupList = section.createDiv('inspector-sp-list');
        if (scene.setup_scenes?.length) {
            scene.setup_scenes.forEach(source => {
                const chip = setupList.createDiv('inspector-sp-chip');
                chip.createSpan({ text: source.replace(/^\[\[|\]\]$/g, '') });
                const removeBtn = chip.createEl('button', { cls: 'inspector-sp-remove clickable-icon', text: '×' });
                removeBtn.addEventListener('click', async () => {
                    const updated = (scene.setup_scenes || []).filter(s => s !== source);
                    await this.sceneManager.updateScene(scene.filePath, { setup_scenes: updated } as any);
                    // Also remove reverse link
                    const sourceScene = this.sceneManager.getAllScenes().find(s => s.title === source);
                    if (sourceScene && sourceScene.payoff_scenes?.includes(scene.title)) {
                        const rev = sourceScene.payoff_scenes.filter(s => s !== scene.title);
                        await this.sceneManager.updateScene(sourceScene.filePath, { payoff_scenes: rev } as any);
                    }
                    const fresh = this.sceneManager.getAllScenes().find(s => s.filePath === scene.filePath);
                    if (fresh) this.show(fresh);
                });
            });
        } else {
            setupList.createSpan({ cls: 'inspector-sp-empty', text: 'None' });
        }

        const addSetupBtn = section.createEl('button', { cls: 'story-line-chip inspector-sp-add', text: '+ Link setup scene' });
        addSetupBtn.addEventListener('click', () => {
            this.openScenePicker(scene, 'setup');
        });

        // Warning: dangling setup (this scene sets up something but the target doesn't exist or has no payoff back)
        if (scene.payoff_scenes?.length) {
            const allScenes = this.sceneManager.getAllScenes();
            const dangling = scene.payoff_scenes.filter(target => {
                const targetScene = allScenes.find(s => s.title === target);
                return !targetScene; // Target scene doesn't exist in project
            });
            if (dangling.length > 0) {
                const warn = section.createDiv('inspector-sp-warning');
                const warnIcon = warn.createSpan();
                obsidian.setIcon(warnIcon, 'alert-triangle');
                warn.createSpan({ text: ` Missing payoff target: ${dangling.join(', ')}` });
            }
        }
    }

    /**
     * Open a fuzzy picker to select a scene for setup/payoff linking
     */
    private openScenePicker(scene: Scene, direction: 'setup' | 'payoff'): void {
        const allScenes = this.sceneManager.getAllScenes().filter(s => s.filePath !== scene.filePath);
        const modal = new ScenePickerModal(this.plugin.app, allScenes, async (picked) => {
            if (direction === 'payoff') {
                // "This scene sets up picked scene"
                const currentPayoff = scene.payoff_scenes ? [...scene.payoff_scenes] : [];
                if (!currentPayoff.includes(picked.title)) {
                    currentPayoff.push(picked.title);
                    await this.sceneManager.updateScene(scene.filePath, { payoff_scenes: currentPayoff } as any);
                }
                // Add reverse link: picked scene is set up by this scene
                const pickedSetup = picked.setup_scenes ? [...picked.setup_scenes] : [];
                if (!pickedSetup.includes(scene.title)) {
                    pickedSetup.push(scene.title);
                    await this.sceneManager.updateScene(picked.filePath, { setup_scenes: pickedSetup } as any);
                }
            } else {
                // "This scene is set up by picked scene"
                const currentSetup = scene.setup_scenes ? [...scene.setup_scenes] : [];
                if (!currentSetup.includes(picked.title)) {
                    currentSetup.push(picked.title);
                    await this.sceneManager.updateScene(scene.filePath, { setup_scenes: currentSetup } as any);
                }
                // Add reverse link: picked scene pays off in this scene
                const pickedPayoff = picked.payoff_scenes ? [...picked.payoff_scenes] : [];
                if (!pickedPayoff.includes(scene.title)) {
                    pickedPayoff.push(scene.title);
                    await this.sceneManager.updateScene(picked.filePath, { payoff_scenes: pickedPayoff } as any);
                }
            }
            // Refresh inspector with updated scene data
            const fresh = this.sceneManager.getAllScenes().find(s => s.filePath === scene.filePath);
            if (fresh) this.show(fresh);
        });
        modal.open();
    }

    /**
     * Render detected wikilinks from scene body text (via LinkScanner).
     */
    private renderDetectedLinks(scene: Scene): void {
        const scanner = this.plugin.linkScanner;
        const result = scanner.getResult(scene.filePath) ?? scanner.scan(scene);

        if (result.links.length === 0) return;

        const overrides = this.plugin.settings.tagTypeOverrides;

        // Exclude links that are already listed in frontmatter characters / location
        const fmChars = new Set((scene.characters || []).map(c => c.toLowerCase()));
        const fmLoc = scene.location?.toLowerCase();
        const novel = result.links.filter(l => {
            const key = l.name.toLowerCase();
            if (l.type === 'character' && fmChars.has(key)) return false;
            if (l.type === 'location' && key === fmLoc) return false;
            return true;
        });

        if (novel.length === 0) return;

        const section = this.container.createDiv('inspector-section inspector-detected-links');
        const headerRow = section.createDiv('inspector-detected-header');
        const hdrIcon = headerRow.createSpan();
        obsidian.setIcon(hdrIcon, 'scan-search');
        headerRow.createSpan({ cls: 'inspector-label', text: ' Detected in text' });

        const pillContainer = section.createDiv('inspector-detected-pills');
        const typeIcons: Record<string, string> = {
            character: 'user',
            location: 'map-pin',
            prop: 'gem',
            other: 'file-text',
        };

        for (const link of novel) {
            const low = link.name.toLowerCase();
            const resolvedType = overrides[low] || link.type;
            const pill = pillContainer.createDiv(`inspector-detected-pill detected-type-${resolvedType}`);
            if (overrides[low]) pill.addClass('tag-overridden');
            const icon = pill.createSpan({ cls: 'inspector-detected-icon' });
            obsidian.setIcon(icon, typeIcons[resolvedType] || 'file-text');
            pill.createSpan({ text: link.name });

            // Right-click to override type
            pill.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showTagTypeMenu(e, link.name, () => {
                    if (this.currentScene) this.render();
                });
            });
        }
    }

    /**
     * Show a context menu to override the type of a detected link / tag.
     */
    private showTagTypeMenu(e: MouseEvent, tagName: string, onUpdate: () => void): void {
        const low = tagName.toLowerCase();
        const current = this.plugin.settings.tagTypeOverrides[low];

        const types: { label: string; value: string | null; icon: string }[] = [
            { label: 'Prop', value: 'prop', icon: 'gem' },
            { label: 'Location', value: 'location', icon: 'map-pin' },
            { label: 'Character', value: 'character', icon: 'user' },
            { label: 'Other', value: 'other', icon: 'file-text' },
            { label: 'Reset to Auto', value: null, icon: 'rotate-ccw' },
        ];

        const menu = new obsidian.Menu();
        menu.addItem(item => item.setTitle(tagName).setDisabled(true));
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
                        onUpdate();
                    });
            });
        }
        menu.showAtMouseEvent(e);
    }

    /**
     * Render an editable editorial notes / revision comments textarea.
     */
    private renderNotes(scene: Scene): void {
        const section = this.container.createDiv('inspector-section inspector-notes');
        const labelRow = section.createDiv('inspector-notes-header');
        const icon = labelRow.createSpan();
        obsidian.setIcon(icon, 'message-square');
        labelRow.createSpan({ cls: 'inspector-label', text: ' Notes / Comments' });

        const textarea = section.createEl('textarea', {
            cls: 'inspector-notes-textarea',
            attr: { placeholder: 'Add revision notes or editorial comments…', rows: '4' },
        });
        textarea.value = scene.notes || '';

        let saveTimer: ReturnType<typeof setTimeout>;
        textarea.addEventListener('input', () => {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(async () => {
                const val = textarea.value.trim();
                await this.sceneManager.updateScene(scene.filePath, { notes: val || undefined } as any);
                scene.notes = val || undefined;
            }, 600);
        });
    }

    /**
     * Render the Snapshots / Version History section.
     */
    private renderSnapshots(scene: Scene): void {
        const section = this.container.createDiv('inspector-section inspector-snapshots');
        const headerRow = section.createDiv('inspector-snapshots-header');
        const hdrIcon = headerRow.createSpan();
        obsidian.setIcon(hdrIcon, 'history');
        headerRow.createSpan({ cls: 'inspector-label', text: ' Snapshots' });

        const saveBtn = headerRow.createEl('button', {
            cls: 'inspector-snapshot-save-btn clickable-icon',
            attr: { title: 'Save snapshot' },
        });
        obsidian.setIcon(saveBtn, 'save');

        const listEl = section.createDiv('inspector-snapshot-list');

        // Load existing snapshots
        const mgr = this.plugin.snapshotManager;
        const loadList = async () => {
            listEl.empty();
            const snapshots = await mgr.listSnapshots(scene.filePath);
            if (snapshots.length === 0) {
                listEl.createSpan({ cls: 'inspector-sp-empty', text: 'No snapshots yet' });
                return;
            }
            for (const snap of snapshots) {
                const row = listEl.createDiv('inspector-snapshot-row');
                const info = row.createDiv('inspector-snapshot-info');
                info.createSpan({ cls: 'inspector-snapshot-label', text: snap.label });
                const dateStr = snap.timestamp.split('T')[0];
                const wcStr = snap.wordcount ? ` · ${snap.wordcount}w` : '';
                info.createSpan({ cls: 'inspector-snapshot-meta', text: `${dateStr}${wcStr}` });

                const btns = row.createDiv('inspector-snapshot-btns');
                const restoreBtn = btns.createEl('button', {
                    cls: 'clickable-icon',
                    attr: { title: 'Restore this snapshot' },
                });
                obsidian.setIcon(restoreBtn, 'undo-2');
                restoreBtn.addEventListener('click', () => {
                    openConfirmModal(this.plugin.app, {
                        title: 'Restore Snapshot',
                        message: `Replace scene with snapshot "${snap.label}"? Save a snapshot first to avoid losing current content.`,
                        confirmLabel: 'Restore',
                        onConfirm: async () => {
                            await mgr.restoreSnapshot(snap.filePath, scene.filePath);
                            // Refresh scene from disk
                            const fresh = this.sceneManager.getAllScenes().find(s => s.filePath === scene.filePath);
                            if (fresh) this.show(fresh);
                        },
                    });
                });

                const delBtn = btns.createEl('button', {
                    cls: 'clickable-icon',
                    attr: { title: 'Delete snapshot' },
                });
                obsidian.setIcon(delBtn, 'trash-2');
                delBtn.addEventListener('click', async () => {
                    await mgr.deleteSnapshot(snap.filePath);
                    await loadList();
                });
            }
        };

        saveBtn.addEventListener('click', () => {
            // Prompt for label
            const modal = new SnapshotLabelModal(this.plugin.app, async (label) => {
                await mgr.saveSnapshot(scene.filePath, label);
                await loadList();
            });
            modal.open();
        });

        loadList();
    }

    /**
     * Collect all known location names from LocationManager + scene metadata.
     */
    private getLocationNames(): string[] {
        const names = new Map<string, string>(); // lowercase → display

        // From LocationManager on the plugin
        const lm = this.plugin.locationManager;
        if (lm) {
            for (const loc of lm.getAllLocations()) {
                const key = loc.name.toLowerCase();
                if (!names.has(key)) names.set(key, loc.name);
            }
        }

        // From scene metadata (catches locations not yet profiled)
        const sceneLocations = this.sceneManager.getUniqueValues('location');
        for (const name of sceneLocations) {
            const key = name.toLowerCase();
            if (!names.has(key)) names.set(key, name);
        }

        return Array.from(names.values()).sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase())
        );
    }
}

/**
 * Fuzzy search modal to pick a scene
 */
class ScenePickerModal extends FuzzySuggestModal<Scene> {
    private scenes: Scene[];
    private onChoose: (scene: Scene) => void;

    constructor(app: App, scenes: Scene[], onChoose: (scene: Scene) => void) {
        super(app);
        this.scenes = scenes;
        this.onChoose = onChoose;
        this.setPlaceholder('Search for a scene…');
    }

    getItems(): Scene[] {
        return this.scenes;
    }

    getItemText(scene: Scene): string {
        const act = scene.act !== undefined ? `Act ${scene.act} — ` : '';
        return `${act}${scene.title || 'Untitled'}`;
    }

    onChooseItem(scene: Scene): void {
        this.onChoose(scene);
    }
}

/**
 * Simple modal to enter a snapshot label
 */
class SnapshotLabelModal extends Modal {
    private onSubmit: (label: string) => void;

    constructor(app: App, onSubmit: (label: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.createEl('h3', { text: 'Save Snapshot' });
        contentEl.createEl('p', { text: 'Enter a name for this snapshot (e.g. "before major rewrite")' });

        const input = contentEl.createEl('input', {
            attr: { type: 'text', placeholder: 'Snapshot label…' },
            cls: 'snapshot-label-input',
        });
        input.style.width = '100%';
        input.style.marginBottom = '12px';
        setTimeout(() => input.focus(), 50);

        const btnRow = contentEl.createDiv({ cls: 'snapshot-label-btns' });
        btnRow.style.display = 'flex';
        btnRow.style.gap = '8px';
        btnRow.style.justifyContent = 'flex-end';

        const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => this.close());

        const saveBtn = btnRow.createEl('button', { text: 'Save', cls: 'mod-cta' });
        const doSave = () => {
            const label = input.value.trim() || `Snapshot ${new Date().toLocaleDateString()}`;
            this.onSubmit(label);
            this.close();
        };
        saveBtn.addEventListener('click', doSave);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doSave();
        });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
