import { ItemView, WorkspaceLeaf, TFile, Setting, Notice, Menu, Modal } from 'obsidian';
import * as obsidian from 'obsidian';
import { Scene } from '../models/Scene';
import { SceneManager } from '../services/SceneManager';
import { renderViewSwitcher } from '../components/ViewSwitcher';
import type SceneCardsPlugin from '../main';

import { STORYLINE_VIEW_TYPE } from '../constants';
import { applyMobileClass } from '../components/MobileAdapter';
import { enableDragToPan } from '../components/DragToPan';
import { resolveTagColor } from '../settings';

type SortMode = 'alpha' | 'scenes-desc' | 'scenes-asc' | 'book-order';
type PlotlineViewMode = 'list' | 'subway';

/**
 * Plotlines View — shows scenes grouped by plotline tags.
 * Each plotline can be renamed, deleted, and scenes can be
 * assigned or removed via click menus.
 */
export class StorylineView extends ItemView {
    private plugin: SceneCardsPlugin;
    private sceneManager: SceneManager;
    private rootContainer: HTMLElement | null = null;
    private sortMode: SortMode = 'book-order';
    private plotlineViewMode: PlotlineViewMode = 'subway';

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin, sceneManager: SceneManager) {
        super(leaf);
        this.plugin = plugin;
        this.sceneManager = sceneManager;
    }

    getViewType(): string {
        return STORYLINE_VIEW_TYPE;
    }

    getDisplayText(): string {
        const title = this.plugin?.sceneManager?.activeProject?.title;
        return title ? `StoryLine - ${title}` : 'StoryLine';
    }

    getIcon(): string {
        return 'git-branch';
    }

    async onOpen(): Promise<void> {
        this.plugin.storyLeaf = this.leaf;
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('story-line-storyline-container');
        applyMobileClass(container);
        this.rootContainer = container;

        await this.sceneManager.initialize();
        this.renderView(container);
    }

    async onClose(): Promise<void> {}

    private renderView(container: HTMLElement): void {
        container.empty();

        // Toolbar
        const toolbar = container.createDiv('story-line-toolbar');
        const titleRow = toolbar.createDiv('story-line-title-row');
        titleRow.createEl('h3', { cls: 'story-line-view-title', text: 'StoryLine' });
        // project name shown in top-center only; no inline project selector here

        // View switcher tabs
        renderViewSwitcher(toolbar, STORYLINE_VIEW_TYPE, this.plugin, this.leaf);

        // Controls row
        const controls = toolbar.createDiv('story-line-toolbar-controls');

        // Sort button
        const sortBtn = controls.createEl('button', {
            cls: 'story-line-toolbar-btn',
            attr: { 'aria-label': 'Sort plotlines', title: 'Sort plotlines' },
        });
        const sortIconSpan = sortBtn.createSpan();
        obsidian.setIcon(sortIconSpan, 'arrow-down-up');
        sortBtn.addEventListener('click', (e) => {
            const menu = new Menu();
            menu.addItem((item: any) => {
                item.setTitle(`${this.sortMode === 'alpha' ? '✓ ' : ''}Alphabetical`)
                    .onClick(() => { this.sortMode = 'alpha'; this.refresh(); });
            });
            menu.addItem((item: any) => {
                item.setTitle(`${this.sortMode === 'scenes-desc' ? '✓ ' : ''}Most scenes first`)
                    .onClick(() => { this.sortMode = 'scenes-desc'; this.refresh(); });
            });
            menu.addItem((item: any) => {
                item.setTitle(`${this.sortMode === 'scenes-asc' ? '✓ ' : ''}Fewest scenes first`)
                    .onClick(() => { this.sortMode = 'scenes-asc'; this.refresh(); });
            });
            menu.addItem((item: any) => {
                item.setTitle(`${this.sortMode === 'book-order' ? '✓ ' : ''}Book order (scene #)`)
                    .onClick(() => { this.sortMode = 'book-order'; this.refresh(); });
            });
            menu.showAtPosition({ x: e.clientX, y: e.clientY });
        });

        // New plotline button
        const addPlotlineBtn = controls.createEl('button', {
            cls: 'mod-cta story-line-add-btn',
            text: '+ New Plotline'
        });
        addPlotlineBtn.addEventListener('click', () => this.openNewPlotlineModal());

        // View mode toggle (list vs subway)
        const viewToggle = controls.createDiv('storyline-view-toggle');
        const listBtn = viewToggle.createEl('button', {
            cls: `storyline-toggle-btn ${this.plotlineViewMode === 'list' ? 'active' : ''}`,
            attr: { 'aria-label': 'List view', title: 'List view' },
        });
        const listIcon = listBtn.createSpan();
        obsidian.setIcon(listIcon, 'list');
        listBtn.addEventListener('click', () => { this.plotlineViewMode = 'list'; this.refresh(); });

        const subwayBtn = viewToggle.createEl('button', {
            cls: `storyline-toggle-btn ${this.plotlineViewMode === 'subway' ? 'active' : ''}`,
            attr: { 'aria-label': 'Subway map', title: 'Subway map' },
        });
        const subwayIcon = subwayBtn.createSpan();
        obsidian.setIcon(subwayIcon, 'chart-gantt');
        subwayBtn.addEventListener('click', () => { this.plotlineViewMode = 'subway'; this.refresh(); });

        const content = container.createDiv('story-line-storyline-content');

        const scenes = this.sceneManager.getFilteredScenes(
            undefined,
            { field: 'sequence', direction: 'asc' }
        );

        // Group scenes by plotline tags
        const plotlines = this.groupByPlotline(scenes);

        if (plotlines.size === 0 && scenes.length === 0) {
            content.createDiv({
                cls: 'story-line-empty',
                text: 'No scenes found. Create scenes first, then create plotlines to organize them.'
            });
            return;
        }

        // Sort plotline keys
        let plotlineKeys = Array.from(plotlines.keys());
        if (this.sortMode === 'alpha') {
            plotlineKeys.sort();
        } else if (this.sortMode === 'scenes-desc') {
            plotlineKeys.sort((a, b) => (plotlines.get(b)?.length || 0) - (plotlines.get(a)?.length || 0));
        } else if (this.sortMode === 'scenes-asc') {
            plotlineKeys.sort((a, b) => (plotlines.get(a)?.length || 0) - (plotlines.get(b)?.length || 0));
        } else if (this.sortMode === 'book-order') {
            plotlineKeys.sort((a, b) => {
                const aScenes = plotlines.get(a) || [];
                const bScenes = plotlines.get(b) || [];
                const aSeq = aScenes.length > 0 ? Math.min(...aScenes.map(s => s.sequence ?? Infinity)) : Infinity;
                const bSeq = bScenes.length > 0 ? Math.min(...bScenes.map(s => s.sequence ?? Infinity)) : Infinity;
                return aSeq - bSeq;
            });
        }

        if (this.plotlineViewMode === 'subway') {
            this.renderSubwayMap(content, scenes, plotlines, plotlineKeys);
        } else {
            this.renderListView(content, scenes, plotlines, plotlineKeys);
        }
    }

    // ═══════════════════════════════════════════════════════
    //  LIST VIEW (original)
    // ═══════════════════════════════════════════════════════

    private renderListView(
        content: HTMLElement,
        scenes: Scene[],
        plotlines: Map<string, Scene[]>,
        plotlineKeys: string[],
    ): void {
        // Help text
        if (plotlineKeys.length > 0) {
            const helpText = content.createDiv('storyline-help');
            const helpSpan = helpText.createSpan({ cls: 'storyline-help-text' });
            helpSpan.appendText('A plotline groups scenes that share a story thread — e.g. "main mystery" or "love story". Hover a plotline header for ');
            const penIcon = helpSpan.createSpan({ cls: 'storyline-help-icon' });
            obsidian.setIcon(penIcon, 'pencil');
            helpSpan.appendText(' rename, ');
            const plusIcon = helpSpan.createSpan({ cls: 'storyline-help-icon' });
            obsidian.setIcon(plusIcon, 'plus');
            helpSpan.appendText(' add scenes, or ');
            const trashIcon = helpSpan.createSpan({ cls: 'storyline-help-icon' });
            obsidian.setIcon(trashIcon, 'trash-2');
            helpSpan.appendText(' delete. Click any scene to assign/remove it from plotlines.');
        }

        // Render each plotline
        for (const plotline of plotlineKeys) {
            const plotScenes = plotlines.get(plotline) || [];
            this.renderPlotline(content, plotline, plotScenes, scenes);
        }

        // Unassigned scenes
        const unassigned = scenes.filter(s => !s.tags || s.tags.length === 0);
        if (unassigned.length > 0) {
            const unassignedSection = content.createDiv('storyline-orphaned');
            const header = unassignedSection.createDiv('storyline-header storyline-unassigned-header');
            header.createSpan({
                cls: 'storyline-unassigned-label',
                text: `Unassigned (${unassigned.length} scenes)`
            });
            header.createSpan({
                cls: 'storyline-unassigned-hint',
                text: '— click a scene to assign it to a plotline'
            });

            const nodeRow = unassignedSection.createDiv('storyline-nodes');
            unassigned.forEach(scene => {
                this.renderSceneNode(nodeRow, scene, plotlineKeys);
            });
        }

        // If no plotlines exist but scenes do, show getting-started hint
        if (plotlineKeys.length === 0 && scenes.length > 0) {
            const hint = content.createDiv('storyline-getting-started');
            hint.createEl('h4', { text: 'What are plotlines?' });
            hint.createEl('p', {
                text: 'A plotline is a story thread that runs through your scenes. '
                    + 'For example: "main mystery", "love story", "character arc — Flora".'
            });
            hint.createEl('h4', { text: 'How to get started' });
            const steps = hint.createEl('ol');
            steps.createEl('li', { text: 'Click "+ New Plotline" above' });
            steps.createEl('li', { text: 'Give it a name (e.g. "main mystery")' });
            steps.createEl('li', { text: 'Select which scenes belong to it' });
            hint.createEl('p', {
                cls: 'storyline-help-text',
                text: 'You can assign a scene to multiple plotlines. '
                    + 'This helps you see how each thread weaves through your story.'
            });
        }
    }

    // ═══════════════════════════════════════════════════════
    //  SUBWAY MAP VIEW
    // ═══════════════════════════════════════════════════════

    private renderSubwayMap(
        content: HTMLElement,
        scenes: Scene[],
        plotlines: Map<string, Scene[]>,
        plotlineKeys: string[],
    ): void {
        if (plotlineKeys.length === 0) {
            this.renderListView(content, scenes, plotlines, plotlineKeys);
            return;
        }

        const tagColors = this.plugin.settings.tagColors || {};
        const scheme = this.plugin.settings.colorScheme;

        // ── Layout constants ──
        const NODE_RADIUS = 10;
        const LINE_WIDTH = 8;
        const LABEL_LEFT = 14;
        const TRACK_LEFT = 160;
        const SCENE_SPACING = 220;
        const TOP_MARGIN = 55;

        // Each lane needs room for: the track line + scene label + tag pills below it
        const LANE_TRACK = 30;         // space for the line itself
        const LANE_INFO = 65;          // space for scene title + tag pills below node
        const LANE_HEIGHT = LANE_TRACK + LANE_INFO;  // total per lane

        // ── Build ordered scene columns ──
        const allTaggedScenes = scenes.filter(s => s.tags && s.tags.length > 0);
        const orderedScenes: Scene[] = [];
        const seenPaths = new Set<string>();
        for (const s of allTaggedScenes) {
            if (!seenPaths.has(s.filePath)) {
                seenPaths.add(s.filePath);
                orderedScenes.push(s);
            }
        }
        orderedScenes.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

        if (orderedScenes.length === 0) {
            this.renderListView(content, scenes, plotlines, plotlineKeys);
            return;
        }

        const colOf = new Map<string, number>();
        orderedScenes.forEach((s, i) => colOf.set(s.filePath, i));

        const numCols = orderedScenes.length;
        const numLanes = plotlineKeys.length;

        const laneColor = (idx: number, plotline: string): string =>
            resolveTagColor(plotline, idx, scheme, tagColors);

        // ── SVG dimensions ──
        const svgWidth = TRACK_LEFT + numCols * SCENE_SPACING + 60;
        const trackBottom = TOP_MARGIN + numLanes * LANE_HEIGHT;
        const svgHeight = trackBottom + 30;

        const wrapper = content.createDiv('subway-map-wrapper');
        wrapper.style.overflowX = 'auto';
        wrapper.style.overflowY = 'auto';
        wrapper.style.padding = '12px 0';

        // Enable drag-to-pan
        enableDragToPan(wrapper);

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', String(svgWidth));
        svg.setAttribute('height', String(svgHeight));
        svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        svg.style.minWidth = `${svgWidth}px`;
        wrapper.appendChild(svg);

        const colX = (col: number) => TRACK_LEFT + col * SCENE_SPACING + SCENE_SPACING / 2;
        // Track Y sits in the upper portion of the lane
        const laneY = (lane: number) => TOP_MARGIN + lane * LANE_HEIGHT + LANE_TRACK / 2;

        // ── Build plotline → columns map ──
        const plotlineCols = new Map<string, number[]>();
        for (const pk of plotlineKeys) {
            const pScenes = plotlines.get(pk) || [];
            const cols = pScenes
                .map(s => colOf.get(s.filePath))
                .filter((c): c is number => c !== undefined)
                .sort((a, b) => a - b);
            plotlineCols.set(pk, cols);
        }

        // Which lanes are active at each column
        const sceneToLanes = new Map<number, number[]>();
        for (let li = 0; li < plotlineKeys.length; li++) {
            const cols = plotlineCols.get(plotlineKeys[li]) || [];
            for (const col of cols) {
                if (!sceneToLanes.has(col)) sceneToLanes.set(col, []);
                sceneToLanes.get(col)!.push(li);
            }
        }

        // ── Act dividers ──
        const acts = new Map<number, number[]>();
        orderedScenes.forEach((s, col) => {
            const act = s.act ?? 0;
            if (!acts.has(act)) acts.set(act, []);
            acts.get(act)!.push(col);
        });

        const actEntries = [...acts.entries()].sort((a, b) => a[0] - b[0]);
        for (let ai = 0; ai < actEntries.length; ai++) {
            const [actNum, cols] = actEntries[ai];
            const minCol = Math.min(...cols);
            const maxCol = Math.max(...cols);

            // Act label
            const centerX = (colX(minCol) + colX(maxCol)) / 2;
            const actLabel = document.createElementNS(svgNS, 'text');
            actLabel.setAttribute('x', String(centerX));
            actLabel.setAttribute('y', String(TOP_MARGIN - 20));
            actLabel.setAttribute('text-anchor', 'middle');
            actLabel.setAttribute('font-size', '16');
            actLabel.setAttribute('font-weight', '700');
            actLabel.setAttribute('fill', 'var(--text-muted)');
            actLabel.textContent = actNum > 0 ? `ACT ${actNum}` : '';
            svg.appendChild(actLabel);

            // Vertical divider line before this act group (clear, visible)
            if (ai > 0) {
                const divX = colX(minCol) - SCENE_SPACING / 2;
                const line = document.createElementNS(svgNS, 'line');
                line.setAttribute('x1', String(divX));
                line.setAttribute('y1', String(TOP_MARGIN - 10));
                line.setAttribute('x2', String(divX));
                line.setAttribute('y2', String(trackBottom));
                line.setAttribute('stroke', 'var(--text-faint)');
                line.setAttribute('stroke-width', '2');
                line.setAttribute('stroke-dasharray', '8,6');
                svg.appendChild(line);
            }
        }

        // ── Draw track lines ──
        // Each plotline starts at its FIRST scene node and ends at its LAST scene node
        for (let li = 0; li < plotlineKeys.length; li++) {
            const pk = plotlineKeys[li];
            const color = laneColor(li, pk);
            const cols = plotlineCols.get(pk) || [];
            const y = laneY(li);

            // Plotline label on the left
            const label = document.createElementNS(svgNS, 'text');
            label.setAttribute('x', String(LABEL_LEFT));
            label.setAttribute('y', String(y + 5));
            label.setAttribute('font-size', '15');
            label.setAttribute('font-weight', '700');
            label.setAttribute('fill', color);
            label.textContent = this.formatPlotlineName(pk);
            svg.appendChild(label);

            if (cols.length === 0) continue;

            // Track runs from first node to last node (with short lead-in curve + trail)
            const firstX = colX(cols[0]);
            const lastX = colX(cols[cols.length - 1]);
            const leadIn = 30; // small rounded approach before first node
            const trailOut = 30; // small trail after last node

            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute('d', `M ${firstX - leadIn} ${y} L ${lastX + trailOut} ${y}`);
            path.setAttribute('stroke', color);
            path.setAttribute('stroke-width', String(LINE_WIDTH));
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('opacity', '0.9');
            svg.appendChild(path);
        }

        // ── Shared-scene connectors ──
        for (const [col, lanes] of sceneToLanes) {
            if (lanes.length <= 1) continue;
            const x = colX(col);
            const sortedLanes = [...lanes].sort((a, b) => a - b);
            const topY = laneY(sortedLanes[0]) - NODE_RADIUS;
            const botY = laneY(sortedLanes[sortedLanes.length - 1]) + NODE_RADIUS;

            // Gradient connector
            const gradId = `conn-grad-${col}`;
            const defs = svg.querySelector('defs') || (() => {
                const d = document.createElementNS(svgNS, 'defs');
                svg.insertBefore(d, svg.firstChild);
                return d;
            })();
            const grad = document.createElementNS(svgNS, 'linearGradient');
            grad.setAttribute('id', gradId);
            grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
            grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1');
            const stop1 = document.createElementNS(svgNS, 'stop');
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('stop-color', laneColor(sortedLanes[0], plotlineKeys[sortedLanes[0]]));
            const stop2 = document.createElementNS(svgNS, 'stop');
            stop2.setAttribute('offset', '100%');
            stop2.setAttribute('stop-color', laneColor(sortedLanes[sortedLanes.length - 1], plotlineKeys[sortedLanes[sortedLanes.length - 1]]));
            grad.appendChild(stop1);
            grad.appendChild(stop2);
            defs.appendChild(grad);

            const connector = document.createElementNS(svgNS, 'rect');
            connector.setAttribute('x', String(x - 3));
            connector.setAttribute('y', String(topY));
            connector.setAttribute('width', '6');
            connector.setAttribute('height', String(botY - topY));
            connector.setAttribute('rx', '3');
            connector.setAttribute('fill', `url(#${gradId})`);
            connector.setAttribute('opacity', '0.55');
            svg.appendChild(connector);
        }

        // ── Draw nodes + inline scene labels + tag pills ──
        // For each node, render the circle, and BELOW it on the same lane,
        // show the scene title + tag pills (like the reference subway map)
        for (let li = 0; li < plotlineKeys.length; li++) {
            const pk = plotlineKeys[li];
            const color = laneColor(li, pk);
            const cols = plotlineCols.get(pk) || [];
            const y = laneY(li);

            for (const col of cols) {
                const x = colX(col);
                const scene = orderedScenes[col];

                // Circle node
                const circle = document.createElementNS(svgNS, 'circle');
                circle.setAttribute('cx', String(x));
                circle.setAttribute('cy', String(y));
                circle.setAttribute('r', String(NODE_RADIUS));
                circle.setAttribute('fill', 'var(--background-primary)');
                circle.setAttribute('stroke', color);
                circle.setAttribute('stroke-width', '3.5');
                circle.style.cursor = 'pointer';
                svg.appendChild(circle);

                circle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openScene(scene);
                });

                // Tooltip
                const titleEl = document.createElementNS(svgNS, 'title');
                const actStr = scene.act !== undefined ? String(scene.act).padStart(2, '0') : '??';
                const seqStr = scene.sequence !== undefined ? String(scene.sequence).padStart(2, '0') : '??';
                let tip = `[${actStr}-${seqStr}] ${scene.title || 'Untitled'}`;
                tip += `\nPlotlines: ${(scene.tags || []).join(', ')}`;
                if (scene.storyDate) tip += `\nDate: ${scene.storyDate}`;
                if (scene.storyTime) tip += `\nTime: ${scene.storyTime}`;
                tip += '\nClick to open';
                titleEl.textContent = tip;
                circle.appendChild(titleEl);

                // Story time above node (small)
                const timeStr = scene.storyTime || scene.storyDate || '';
                if (timeStr) {
                    const timeLabel = document.createElementNS(svgNS, 'text');
                    timeLabel.setAttribute('x', String(x));
                    timeLabel.setAttribute('y', String(y - NODE_RADIUS - 6));
                    timeLabel.setAttribute('text-anchor', 'middle');
                    timeLabel.setAttribute('font-size', '9');
                    timeLabel.setAttribute('fill', 'var(--text-faint)');
                    timeLabel.textContent = timeStr;
                    svg.appendChild(timeLabel);
                }

                // ── Scene title below node ──
                const labelY1 = y + NODE_RADIUS + 16;
                const labelText = `[${actStr}-${seqStr}] ${scene.title || 'Untitled'}`;

                const sceneLabel = document.createElementNS(svgNS, 'text');
                sceneLabel.setAttribute('x', String(x));
                sceneLabel.setAttribute('y', String(labelY1));
                sceneLabel.setAttribute('text-anchor', 'middle');
                sceneLabel.setAttribute('font-size', '11');
                sceneLabel.setAttribute('font-weight', '600');
                sceneLabel.setAttribute('fill', 'var(--text-normal)');
                sceneLabel.style.cursor = 'pointer';
                sceneLabel.textContent = labelText;
                sceneLabel.addEventListener('click', () => this.openScene(scene));
                svg.appendChild(sceneLabel);

                // ── Tag pills below scene title ──
                if (scene.tags?.length) {
                    const pillY = labelY1 + 14;
                    const pillSpacing = 3;
                    const pillData = scene.tags.map(tag => ({
                        tag,
                        width: tag.length * 6 + 12,
                    }));
                    const totalWidth = pillData.reduce((s, p) => s + p.width + pillSpacing, -pillSpacing);
                    let px = x - totalWidth / 2;

                    for (const { tag, width } of pillData) {
                        const pillIdx = plotlineKeys.indexOf(tag);
                        const pillColor = resolveTagColor(tag, Math.max(0, pillIdx), scheme, tagColors);
                        const rect = document.createElementNS(svgNS, 'rect');
                        rect.setAttribute('x', String(px));
                        rect.setAttribute('y', String(pillY - 8));
                        rect.setAttribute('width', String(width));
                        rect.setAttribute('height', '15');
                        rect.setAttribute('rx', '7');
                        rect.setAttribute('fill', pillColor);
                        svg.appendChild(rect);

                        const text = document.createElementNS(svgNS, 'text');
                        text.setAttribute('x', String(px + width / 2));
                        text.setAttribute('y', String(pillY + 3));
                        text.setAttribute('text-anchor', 'middle');
                        text.setAttribute('font-size', '9');
                        text.setAttribute('fill', '#fff');
                        text.textContent = tag;
                        svg.appendChild(text);

                        px += width + pillSpacing;
                    }
                }
            }
        }
    }

    private renderPlotline(
        container: HTMLElement,
        plotline: string,
        scenes: Scene[],
        allScenes: Scene[]
    ): void {
        const section = container.createDiv('storyline-section');
        const tagColors = this.plugin.settings.tagColors || {};
        const scheme = this.plugin.settings.colorScheme;
        const plotlineIdx = allScenes.reduce((tags, s) => {
            (s.tags || []).forEach(t => { if (!tags.includes(t)) tags.push(t); });
            return tags;
        }, [] as string[]).sort().indexOf(plotline);
        const plotlineColor = resolveTagColor(plotline, Math.max(0, plotlineIdx), scheme, tagColors);

        // Collapsible header
        const header = section.createDiv('storyline-header');
        if (plotlineColor) {
            header.style.borderLeftColor = plotlineColor;
        }
        const toggle = header.createSpan({ cls: 'storyline-toggle', text: '▼ ' });
        const titleSpan = header.createSpan({
            cls: 'storyline-plotline-title',
            text: `${this.formatPlotlineName(plotline)} (${scenes.length})`
        });

        // Header action buttons (right side)
        const actions = header.createDiv('storyline-header-actions');

        // Color picker button
        const colorBtn = actions.createEl('button', {
            cls: 'clickable-icon storyline-action-btn',
            attr: { 'aria-label': 'Change plotline color', title: 'Change color' }
        });
        const colorIcon = colorBtn.createSpan();
        obsidian.setIcon(colorIcon, 'palette');
        // Hidden native color input
        const colorInput = colorBtn.createEl('input', { type: 'color' }) as HTMLInputElement;
        colorInput.style.position = 'absolute';
        colorInput.style.width = '0';
        colorInput.style.height = '0';
        colorInput.style.opacity = '0';
        colorInput.style.overflow = 'hidden';
        colorInput.value = plotlineColor || '#888888';
        colorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            colorInput.click();
        });
        colorInput.addEventListener('input', async (e) => {
            const newColor = (e.target as HTMLInputElement).value;
            this.plugin.settings.tagColors[plotline] = newColor;
            await this.plugin.saveSettings();
            this.renderContent();
        });

        // Rename button
        const renameBtn = actions.createEl('button', {
            cls: 'clickable-icon storyline-action-btn',
            attr: { 'aria-label': 'Rename plotline', title: 'Rename' }
        });
        const renameIcon = renameBtn.createSpan();
        obsidian.setIcon(renameIcon, 'pencil');
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openRenamePlotlineModal(plotline);
        });

        // Add scenes button
        const addToPlotBtn = actions.createEl('button', {
            cls: 'clickable-icon storyline-action-btn',
            attr: { 'aria-label': 'Add scenes to this plotline', title: 'Add scenes' }
        });
        const addIcon = addToPlotBtn.createSpan();
        obsidian.setIcon(addIcon, 'plus');
        addToPlotBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openAddSceneToPlotlineModal(plotline, scenes, allScenes);
        });

        // Delete button
        const deleteBtn = actions.createEl('button', {
            cls: 'clickable-icon storyline-action-btn storyline-delete-btn',
            attr: { 'aria-label': 'Delete plotline', title: 'Delete' }
        });
        const deleteIcon = deleteBtn.createSpan();
        obsidian.setIcon(deleteIcon, 'trash-2');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDeletePlotline(plotline, scenes.length);
        });

        // Right-click context menu
        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const menu = new Menu();
            menu.addItem((item: any) => {
                item.setTitle('Change color')
                    .setIcon('palette')
                    .onClick(() => colorInput.click());
            });
            if (this.plugin.settings.tagColors[plotline]) {
                menu.addItem((item: any) => {
                    item.setTitle('Reset color')
                        .setIcon('rotate-ccw')
                        .onClick(async () => {
                            delete this.plugin.settings.tagColors[plotline];
                            await this.plugin.saveSettings();
                            this.renderContent();
                        });
                });
            }
            menu.addItem((item: any) => {
                item.setTitle('Rename plotline')
                    .setIcon('pencil')
                    .onClick(() => this.openRenamePlotlineModal(plotline));
            });
            menu.addItem((item: any) => {
                item.setTitle('Add scenes')
                    .setIcon('plus')
                    .onClick(() => this.openAddSceneToPlotlineModal(plotline, scenes, allScenes));
            });
            menu.addSeparator();
            menu.addItem((item: any) => {
                item.setTitle('Delete plotline')
                    .setIcon('trash-2')
                    .onClick(() => this.confirmDeletePlotline(plotline, scenes.length));
            });
            menu.showAtPosition({ x: e.clientX, y: e.clientY });
        });

        const body = section.createDiv('storyline-body');

        // Group scenes by act for visual flow
        const actGroups = new Map<string, Scene[]>();
        for (const scene of scenes) {
            const actKey = scene.act !== undefined ? `Act ${scene.act}` : 'No Act';
            if (!actGroups.has(actKey)) actGroups.set(actKey, []);
            actGroups.get(actKey)!.push(scene);
        }

        if (actGroups.size > 1 || (actGroups.size === 1 && !actGroups.has('No Act'))) {
            // Show scenes grouped by act with a visual flow
            for (const [actLabel, actScenes] of actGroups) {
                const actGroup = body.createDiv('plotline-act-group');
                actGroup.createSpan({ cls: 'plotline-act-label', text: actLabel });
                const flow = actGroup.createDiv('storyline-flow');
                actScenes.forEach((scene, idx) => {
                    this.renderSceneNode(flow, scene, [plotline]);
                    if (idx < actScenes.length - 1) {
                        flow.createSpan({ cls: 'storyline-arrow', text: '→' });
                    }
                });
            }
        } else {
            // Simple flow when no acts
            const flow = body.createDiv('storyline-flow');
            scenes.forEach((scene, idx) => {
                this.renderSceneNode(flow, scene, [plotline]);
                if (idx < scenes.length - 1) {
                    flow.createSpan({ cls: 'storyline-arrow', text: '→' });
                }
            });
        }

        // Coverage summary
        const totalScenes = allScenes.length;
        const pct = totalScenes > 0 ? Math.round((scenes.length / totalScenes) * 100) : 0;
        const summary = body.createDiv('plotline-summary');
        summary.createSpan({
            cls: 'plotline-summary-text',
            text: `${scenes.length} of ${totalScenes} scenes (${pct}%)`
        });
        // Mini progress bar
        const bar = summary.createDiv('plotline-progress-bar');
        const fill = bar.createDiv('plotline-progress-fill');
        fill.style.width = `${pct}%`;
        if (plotlineColor) {
            fill.style.backgroundColor = plotlineColor;
        }

        // Toggle collapse
        let collapsed = false;
        header.addEventListener('click', () => {
            collapsed = !collapsed;
            body.style.display = collapsed ? 'none' : 'block';
            toggle.textContent = collapsed ? '▶ ' : '▼ ';
        });
    }

    private renderSceneNode(
        container: HTMLElement,
        scene: Scene,
        availablePlotlines: string[]
    ): void {
        const node = container.createDiv('storyline-node');
        const act = scene.act !== undefined ? String(scene.act).padStart(2, '0') : '??';
        const seq = scene.sequence !== undefined ? String(scene.sequence).padStart(2, '0') : '??';

        node.createSpan({
            cls: 'storyline-node-id',
            text: `[${act}-${seq}]`
        });
        node.createSpan({
            cls: 'storyline-node-title',
            text: ` ${scene.title || 'Untitled'}`
        });

        // Show existing tags as small badges
        if (scene.tags?.length) {
            const tagsEl = node.createDiv('storyline-node-tags');
            const tagColors = this.plugin.settings.tagColors || {};
            const scheme = this.plugin.settings.colorScheme;
            const allTagsSorted = this.sceneManager.getAllTags().sort();
            scene.tags.forEach(tag => {
                const badge = tagsEl.createSpan({ cls: 'storyline-tag-badge', text: tag });
                const badgeColor = resolveTagColor(tag, Math.max(0, allTagsSorted.indexOf(tag)), scheme, tagColors);
                badge.style.backgroundColor = badgeColor;
            });
        }

        // Status indicator
        node.setAttribute('data-status', scene.status || 'idea');

        // Click to open tag assignment menu
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showTagAssignMenu(scene, node);
        });

        node.setAttribute('title', `${scene.title || 'Untitled'}\nTags: ${scene.tags?.join(', ') || 'none'}\nClick to assign/remove plotline`);
    }

    /**
     * Show a menu to assign/remove plotline tags from a scene
     */
    private showTagAssignMenu(scene: Scene, anchorEl: HTMLElement): void {
        const menu = new Menu();
        const allTags = this.sceneManager.getAllTags();
        const sceneTags = new Set(scene.tags || []);

        if (allTags.length > 0) {
            for (const tag of allTags) {
                const hasTag = sceneTags.has(tag);
                menu.addItem((item: any) => {
                    item.setTitle(`${hasTag ? '✓ ' : '   '}${this.formatPlotlineName(tag)}`)
                        .onClick(async () => {
                            const newTags = hasTag
                                ? (scene.tags || []).filter((t: string) => t !== tag)
                                : [...(scene.tags || []), tag];
                            await this.sceneManager.updateScene(scene.filePath, { tags: newTags });
                            this.refresh();
                        });
                });
            }
            menu.addSeparator();
        }

        menu.addItem((item: any) => {
            item.setTitle('+ Create new plotline…')
                .setIcon('plus')
                .onClick(() => this.openNewPlotlineForScene(scene));
        });

        const rect = anchorEl.getBoundingClientRect();
        menu.showAtPosition({ x: rect.left, y: rect.bottom });
    }

    // ── Rename ─────────────────────────────────────────────

    private openRenamePlotlineModal(plotline: string): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Rename Plotline');
        let newName = plotline;

        new Setting(modal.contentEl)
            .setName('Plotline name')
            .setDesc(`Current tag: "${plotline}". The tag will be updated in all scenes that use it.`)
            .addText((text: any) => {
                text.setValue(plotline);
                text.onChange((v: string) => (newName = v));
            });

        new Setting(modal.contentEl)
            .addButton((btn: any) => {
                btn.setButtonText('Rename').setCta().onClick(async () => {
                    const slug = newName.trim().toLowerCase().replace(/\s+/g, '-');
                    if (!slug || slug === plotline) {
                        modal.close();
                        return;
                    }
                    const count = await this.sceneManager.renameTag(plotline, slug);
                    new Notice(`Renamed plotline in ${count} scene${count !== 1 ? 's' : ''}`);
                    this.refresh();
                    modal.close();
                });
            });
        modal.open();
    }

    // ── Delete ─────────────────────────────────────────────

    private confirmDeletePlotline(plotline: string, sceneCount: number): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Delete Plotline');
        modal.contentEl.createEl('p', {
            text: `Remove the tag "${plotline}" from ${sceneCount} scene${sceneCount !== 1 ? 's' : ''}? The scenes themselves will not be deleted.`
        });

        new Setting(modal.contentEl)
            .addButton((btn: any) => {
                btn.setButtonText('Cancel').onClick(() => modal.close());
            })
            .addButton((btn: any) => {
                btn.setButtonText('Delete').setWarning().onClick(async () => {
                    const count = await this.sceneManager.deleteTag(plotline);
                    new Notice(`Removed plotline from ${count} scene${count !== 1 ? 's' : ''}`);
                    this.refresh();
                    modal.close();
                });
            });
        modal.open();
    }

    // ── Create new plotline for a scene ────────────────────

    private openNewPlotlineForScene(scene: Scene): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('New Plotline');
        let tagName = '';

        new Setting(modal.contentEl)
            .setName('Plotline name')
            .setDesc(`Will be added to "${scene.title || 'Untitled'}"`)
            .addText((text: any) => {
                text.setPlaceholder('e.g. main-mystery');
                text.onChange((v: string) => (tagName = v));
            });

        new Setting(modal.contentEl)
            .addButton((btn: any) => {
                btn.setButtonText('Create & Assign').setCta().onClick(async () => {
                    if (!tagName.trim()) return;
                    const slug = tagName.trim().toLowerCase().replace(/\s+/g, '-');
                    const newTags = [...(scene.tags || []), slug];
                    await this.sceneManager.updateScene(scene.filePath, { tags: newTags });
                    this.refresh();
                    modal.close();
                });
            });
        modal.open();
    }

    // ── Create new plotline (toolbar button) ───────────────

    private openNewPlotlineModal(): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('New Plotline');
        let tagName = '';

        new Setting(modal.contentEl)
            .setName('Plotline name')
            .setDesc('Enter a name for the plotline. It will be stored as a tag on each assigned scene.')
            .addText((text: any) => {
                text.setPlaceholder('e.g. love-triangle');
                text.onChange((v: string) => (tagName = v));
            });

        const scenePicker = modal.contentEl.createDiv('storyline-scene-picker');
        scenePicker.createEl('p', {
            cls: 'setting-item-description',
            text: 'Select scenes to include (optional):'
        });

        const scenes = this.sceneManager.getFilteredScenes(undefined, { field: 'sequence', direction: 'asc' });
        const selectedPaths = new Set<string>();

        const sceneList = scenePicker.createDiv('storyline-scene-picker-list');
        scenes.forEach(scene => {
            const row = sceneList.createDiv('storyline-scene-picker-row');
            const cb = row.createEl('input', { type: 'checkbox' });
            row.createSpan({ text: `[${String(scene.act ?? '?').toString().padStart(2, '0')}-${String(scene.sequence ?? '?').toString().padStart(2, '0')}] ${scene.title || 'Untitled'}` });
            cb.addEventListener('change', () => {
                if (cb.checked) selectedPaths.add(scene.filePath);
                else selectedPaths.delete(scene.filePath);
            });
        });

        new Setting(modal.contentEl)
            .addButton((btn: any) => {
                btn.setButtonText('Create Plotline').setCta().onClick(async () => {
                    if (!tagName.trim()) return;
                    const slug = tagName.trim().toLowerCase().replace(/\s+/g, '-');
                    for (const path of selectedPaths) {
                        const scene = this.sceneManager.getScene(path);
                        if (scene) {
                            const newTags = [...(scene.tags || []), slug];
                            await this.sceneManager.updateScene(path, { tags: newTags });
                        }
                    }
                    this.refresh();
                    modal.close();
                });
            });
        modal.open();
    }

    // ── Add scenes to existing plotline ────────────────────

    private openAddSceneToPlotlineModal(
        plotline: string,
        currentScenes: Scene[],
        allScenes: Scene[]
    ): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText(`Add scenes to "${this.formatPlotlineName(plotline)}"`);

        const currentPaths = new Set(currentScenes.map(s => s.filePath));
        const available = allScenes.filter(s => !currentPaths.has(s.filePath));
        const selectedPaths = new Set<string>();

        if (available.length === 0) {
            modal.contentEl.createEl('p', { text: 'All scenes are already in this plotline.' });
        } else {
            const sceneList = modal.contentEl.createDiv('storyline-scene-picker-list');
            available.forEach(scene => {
                const row = sceneList.createDiv('storyline-scene-picker-row');
                const cb = row.createEl('input', { type: 'checkbox' });
                row.createSpan({ text: `[${String(scene.act ?? '?').toString().padStart(2, '0')}-${String(scene.sequence ?? '?').toString().padStart(2, '0')}] ${scene.title || 'Untitled'}` });
                cb.addEventListener('change', () => {
                    if (cb.checked) selectedPaths.add(scene.filePath);
                    else selectedPaths.delete(scene.filePath);
                });
            });
        }

        new Setting(modal.contentEl)
            .addButton((btn: any) => {
                btn.setButtonText('Add to Plotline').setCta().onClick(async () => {
                    for (const path of selectedPaths) {
                        const scene = this.sceneManager.getScene(path);
                        if (scene) {
                            const newTags = [...(scene.tags || []), plotline];
                            await this.sceneManager.updateScene(path, { tags: newTags });
                        }
                    }
                    this.refresh();
                    modal.close();
                });
            });
        modal.open();
    }

    // ── Helpers ────────────────────────────────────────────

    private groupByPlotline(scenes: Scene[]): Map<string, Scene[]> {
        const groups = new Map<string, Scene[]>();

        for (const scene of scenes) {
            if (!scene.tags || scene.tags.length === 0) continue;

            for (const tag of scene.tags) {
                if (!groups.has(tag)) {
                    groups.set(tag, []);
                }
                groups.get(tag)!.push(scene);
            }
        }

        return groups;
    }

    private formatPlotlineName(tag: string): string {
        // Convert "main-mystery" → "Main Mystery"
        // Use split instead of \b\w regex to avoid issues with
        // non-ASCII characters like å, ä, ö being treated as word boundaries.
        const name = tag.split('/').pop() || tag;
        return name
            .replace(/[-_]/g, ' ')
            .split(' ')
            .map(w => w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : '')
            .join(' ');
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

    /**
     * Public refresh called by the plugin on file changes
     */
    refresh(): void {
        if (this.rootContainer) {
            this.renderView(this.rootContainer);
        }
    }
}
