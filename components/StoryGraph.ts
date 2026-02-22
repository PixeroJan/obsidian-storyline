/**
 * StoryGraph — interactive SVG graph showing how scenes connect to
 * characters, locations, and other entities via wikilinks detected in
 * the scene body text.  Also overlays character-to-character relationships
 * (allies / enemies / family) and #prop tags extracted from character fields.
 *
 * - Scene nodes: rectangles (purple)
 * - Character nodes: circles (blue)
 * - Location nodes: diamonds (green)
 * - Other/unknown nodes: small circles (orange)
 * - Prop nodes: hexagons (pink)
 * - Edges: scene → entity, character ↔ character relationships, character → prop
 *
 * Uses the same spring-physics layout pattern as RelationshipMap.
 */

import * as obsidian from 'obsidian';
import type { Scene } from '../models/Scene';
import type { Character } from '../models/Character';
import { extractCharacterProps, extractCharacterLocationTags } from '../models/Character';
import type { LinkScanResult, DetectedLink } from '../services/LinkScanner';

// ── Types ─────────────────────────────────────────────

type EntityType = 'scene' | 'character' | 'location' | 'other' | 'prop';

/** Edge subtypes — character-to-character relationships */
type EdgeKind = EntityType | 'ally' | 'enemy' | 'family' | 'romantic' | 'mentor' | 'other-rel';

interface StoryGraphNode {
    id: string;
    label: string;
    entityType: EntityType;
    /** Number of connections (used for sizing) */
    weight: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
}

interface StoryGraphEdge {
    source: string;   // node id
    target: string;   // node id
    kind: EdgeKind;   // drives colour & dash pattern
}

// ── Colours ───────────────────────────────────────────

function resolveColor(varName: string, fallback: string): string {
    const val = getComputedStyle(document.body).getPropertyValue(varName).trim();
    return val || fallback;
}

function getEntityColors(): Record<EntityType, string> {
    return {
        scene: resolveColor('--sl-sg-scene', '#7C3AED'),
        character: resolveColor('--sl-sg-character', '#2196F3'),
        location: resolveColor('--sl-sg-location', '#4CAF50'),
        other: resolveColor('--sl-sg-other', '#FF9800'),
        prop: resolveColor('--sl-sg-prop', '#E91E63'),
    };
}

function getEdgeColor(kind: EdgeKind): string {
    switch (kind) {
        case 'ally': return resolveColor('--sl-rel-ally', '#4CAF50');
        case 'enemy': return resolveColor('--sl-rel-enemy', '#F44336');
        case 'family': return resolveColor('--sl-rel-family', '#FF9800');
        case 'romantic': return resolveColor('--sl-rel-romantic', '#E91E63');
        case 'mentor': return resolveColor('--sl-rel-mentor', '#9C27B0');
        case 'other-rel': return resolveColor('--sl-rel-other', '#9E9E9E');
        default: return getEntityColors()[kind as EntityType] || '#999';
    }
}

const EDGE_DASH: Record<string, string> = {
    ally: '',
    enemy: '6,3',
    family: '3,3',
    romantic: '2,4',
    mentor: '8,3,2,3',
    'other-rel': '4,4',
};

// ── Component ─────────────────────────────────────────

export class StoryGraph {
    private container: HTMLElement;
    private scenes: Scene[];
    private characters: Character[];
    private scanResults: Map<string, LinkScanResult>;
    private nodes: StoryGraphNode[] = [];
    private edges: StoryGraphEdge[] = [];
    private svg: SVGSVGElement | null = null;
    private width = 900;
    private height = 600;
    private animFrame = 0;
    private dragging: StoryGraphNode | null = null;
    private panX = 0;
    private panY = 0;
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private zoom = 1;

    /** Visibility filters — toggled by the toolbar */
    private showCharacters = true;
    private showLocations = true;
    private showOther = true;
    private showRelationships = true;
    private showProps = true;

    /** Optional callback when a scene node is double-clicked */
    private onSelectScene?: (filePath: string) => void;

    /** Manual tag-type overrides from plugin settings */
    private tagTypeOverrides: Record<string, string>;

    constructor(
        container: HTMLElement,
        scenes: Scene[],
        characters: Character[],
        scanResults: Map<string, LinkScanResult>,
        onSelectScene?: (filePath: string) => void,
        tagTypeOverrides?: Record<string, string>,
    ) {
        this.container = container;
        this.scenes = scenes;
        this.characters = characters;
        this.scanResults = scanResults;
        this.onSelectScene = onSelectScene;
        this.tagTypeOverrides = tagTypeOverrides || {};
    }

    // ── Public API ─────────────────────────────────────

    render(): void {
        this.container.empty();
        this.buildGraph();

        if (this.nodes.length === 0) {
            const empty = this.container.createDiv('story-graph-empty');
            empty.createEl('p', { text: 'No wikilinks detected in scene text. Write [[Character]] or [[Location]] in your scenes to see connections here.' });
            return;
        }

        // Filter toolbar
        this.renderFilterBar();

        // Legend
        this.renderLegend();

        // SVG wrapper
        const wrapper = this.container.createDiv('story-graph-wrapper');
        const rect = wrapper.getBoundingClientRect();
        this.width = Math.max(700, rect.width || 900);
        this.height = Math.max(450, rect.height || 600);

        const svgNS = 'http://www.w3.org/2000/svg';
        this.svg = document.createElementNS(svgNS, 'svg');
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', String(this.height));
        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.classList.add('story-graph-svg');
        wrapper.appendChild(this.svg);

        // Pan support
        this.svg.addEventListener('mousedown', (e) => {
            if (e.target === this.svg) {
                this.isPanning = true;
                this.panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
            }
        });
        window.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.panX = e.clientX - this.panStart.x;
                this.panY = e.clientY - this.panStart.y;
                this.renderSVG();
            }
        });
        window.addEventListener('mouseup', () => { this.isPanning = false; });

        // Zoom support (mouse wheel)
        this.svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            const newZoom = Math.min(5, Math.max(0.2, this.zoom * factor));
            // Zoom toward cursor position
            const svgRect = this.svg!.getBoundingClientRect();
            const mx = e.clientX - svgRect.left;
            const my = e.clientY - svgRect.top;
            this.panX = mx - (mx - this.panX) * (newZoom / this.zoom);
            this.panY = my - (my - this.panY) * (newZoom / this.zoom);
            this.zoom = newZoom;
            this.renderSVG();
        }, { passive: false });

        this.runSimulation();
    }

    destroy(): void {
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.animFrame = 0;
    }

    // ── Filter toolbar ─────────────────────────────────

    private renderFilterBar(): void {
        const bar = this.container.createDiv('story-graph-filters');

        const makeToggle = (label: string, icon: string, active: boolean, onToggle: (v: boolean) => void) => {
            const btn = bar.createEl('button', {
                cls: `story-graph-filter-btn ${active ? 'active' : ''}`,
            });
            const ic = btn.createSpan();
            obsidian.setIcon(ic, icon);
            btn.createSpan({ text: ` ${label}` });
            btn.addEventListener('click', () => {
                const next = !btn.hasClass('active');
                btn.toggleClass('active', next);
                onToggle(next);
                // Rebuild and re-render
                this.destroy();
                this.buildGraph();
                if (this.nodes.length > 0) this.runSimulation();
            });
        };

        makeToggle('Characters', 'user', this.showCharacters, v => { this.showCharacters = v; });
        makeToggle('Locations', 'map-pin', this.showLocations, v => { this.showLocations = v; });
        makeToggle('Relationships', 'heart-handshake', this.showRelationships, v => { this.showRelationships = v; });
        makeToggle('Props', 'tag', this.showProps, v => { this.showProps = v; });
        makeToggle('Other', 'file-text', this.showOther, v => { this.showOther = v; });
    }

    // ── Legend ──────────────────────────────────────────

    private renderLegend(): void {
        const legend = this.container.createDiv('story-graph-legend');
        const colors = getEntityColors();
        const items: [string, string, EntityType][] = [
            ['Scene', 'book-open', 'scene'],
            ['Character', 'user', 'character'],
            ['Location', 'map-pin', 'location'],
            ['Prop', 'tag', 'prop'],
            ['Other', 'file-text', 'other'],
        ];
        for (const [label, icon, type] of items) {
            const item = legend.createDiv('story-graph-legend-item');
            const swatch = item.createSpan({ cls: 'story-graph-legend-swatch' });
            swatch.style.backgroundColor = colors[type];
            item.createSpan({ text: label });
        }
        // Relationship edge legend
        const relItems: [string, string][] = [
            ['Ally', resolveColor('--sl-rel-ally', '#4CAF50')],
            ['Enemy', resolveColor('--sl-rel-enemy', '#F44336')],
            ['Family', resolveColor('--sl-rel-family', '#FF9800')],
            ['Romantic', resolveColor('--sl-rel-romantic', '#E91E63')],
            ['Mentor', resolveColor('--sl-rel-mentor', '#9C27B0')],
            ['Other', resolveColor('--sl-rel-other', '#9E9E9E')],
        ];
        for (const [label, color] of relItems) {
            const item = legend.createDiv('story-graph-legend-item');
            const swatch = item.createSpan({ cls: 'story-graph-legend-swatch story-graph-legend-line' });
            swatch.style.borderBottomColor = color;
            item.createSpan({ text: label });
        }
    }

    // ── Graph building ─────────────────────────────────

    private buildGraph(): void {
        const nodeMap = new Map<string, StoryGraphNode>();
        const edgeList: StoryGraphEdge[] = [];

        const ensureNode = (id: string, label: string, entityType: EntityType): StoryGraphNode => {
            if (!nodeMap.has(id)) {
                nodeMap.set(id, {
                    id, label, entityType, weight: 0,
                    x: this.width / 2 + (Math.random() - 0.5) * this.width * 0.6,
                    y: this.height / 2 + (Math.random() - 0.5) * this.height * 0.6,
                    vx: 0, vy: 0,
                });
            }
            return nodeMap.get(id)!;
        };

        // ── 1. Scene → entity edges (from LinkScanner) ─────────

        for (const scene of this.scenes) {
            const result = this.scanResults.get(scene.filePath);
            if (!result || result.links.length === 0) continue;

            const sceneId = `scene::${scene.filePath}`;
            ensureNode(sceneId, scene.title || 'Untitled', 'scene');

            for (const link of result.links) {
                const resolvedType = (this.tagTypeOverrides[link.name.toLowerCase()] || link.type) as EntityType;
                if (resolvedType === 'character' && !this.showCharacters) continue;
                if (resolvedType === 'location' && !this.showLocations) continue;
                if (resolvedType === 'other' && !this.showOther) continue;
                if (resolvedType === 'prop' && !this.showProps) continue;

                const entityId = `${resolvedType}::${link.name.toLowerCase()}`;
                const node = ensureNode(entityId, link.name, resolvedType);
                nodeMap.get(sceneId)!.weight++;
                node.weight++;

                edgeList.push({ source: sceneId, target: entityId, kind: resolvedType });
            }
        }

        // ── 2. Character ↔ Character relationship edges ────────

        if (this.showRelationships && this.showCharacters) {
            for (const char of this.characters) {
                const fromId = `character::${char.name.toLowerCase()}`;
                // Only add relationship edges for characters that are already in the graph
                // OR create their nodes so the relationship network is visible
                const addRelEdges = (names: string[] | string | undefined, kind: EdgeKind) => {
                    if (!names) return;
                    const arr = Array.isArray(names) ? names
                        : typeof names === 'string' ? names.split(/[,;]/).map(s => s.replace(/\[\[|\]\]/g, '').trim()).filter(Boolean)
                        : [];
                    for (const name of arr) {
                        if (!name) continue;
                        const toId = `character::${name.toLowerCase()}`;
                        // Ensure both nodes exist
                        ensureNode(fromId, char.name, 'character');
                        ensureNode(toId, name, 'character');
                        // Deduplicate bidirectional
                        const fwd = `${fromId}|${toId}|${kind}`;
                        const rev = `${toId}|${fromId}|${kind}`;
                        if (!edgeList.some(e => {
                            const k = `${e.source}|${e.target}|${e.kind}`;
                            return k === fwd || k === rev;
                        })) {
                            nodeMap.get(fromId)!.weight++;
                            nodeMap.get(toId)!.weight++;
                            edgeList.push({ source: fromId, target: toId, kind });
                        }
                    }
                };

                addRelEdges(char.allies, 'ally');
                addRelEdges(char.enemies, 'enemy');
                addRelEdges(char.family, 'family');
                addRelEdges(char.romantic, 'romantic');
                addRelEdges(char.mentors, 'mentor');
                addRelEdges(char.otherRelations, 'other-rel');
            }
        }

        // ── 3. Character → Prop edges (from #hashtags) ─────────

        if (this.showProps) {
            for (const char of this.characters) {
                const props = extractCharacterProps(char, this.tagTypeOverrides);
                if (props.length === 0) continue;
                const charId = `character::${char.name.toLowerCase()}`;
                ensureNode(charId, char.name, 'character');

                for (const prop of props) {
                    const propId = `prop::${prop.toLowerCase()}`;
                    const propNode = ensureNode(propId, `#${prop}`, 'prop');
                    nodeMap.get(charId)!.weight++;
                    propNode.weight++;
                    edgeList.push({ source: charId, target: propId, kind: 'prop' });
                }
            }
        }

        // ── 3b. Character → Location tags (from #tags in residency etc.) ─

        if (this.showLocations) {
            for (const char of this.characters) {
                const locTags = extractCharacterLocationTags(char, this.tagTypeOverrides);
                if (locTags.length === 0) continue;
                const charId = `character::${char.name.toLowerCase()}`;
                ensureNode(charId, char.name, 'character');

                for (const tag of locTags) {
                    const locId = `location::${tag.toLowerCase()}`;
                    const locNode = ensureNode(locId, `#${tag}`, 'location');
                    nodeMap.get(charId)!.weight++;
                    locNode.weight++;
                    edgeList.push({ source: charId, target: locId, kind: 'location' });
                }
            }
        }

        // ── 3c. Character → Location edges (from locations field) ──

        if (this.showLocations) {
            for (const char of this.characters) {
                const locs = char.locations;
                if (!locs || locs.length === 0) continue;
                const charId = `character::${char.name.toLowerCase()}`;
                ensureNode(charId, char.name, 'character');

                for (const loc of locs) {
                    if (!loc) continue;
                    // Strip leading # so "#Place" and "Place" resolve to the same node
                    const cleanLoc = loc.replace(/^#/, '');
                    if (!cleanLoc) continue;
                    const locId = `location::${cleanLoc.toLowerCase()}`;
                    // Avoid duplicate edges if a #tag already created this link
                    const fwd = `${charId}|${locId}|location`;
                    if (edgeList.some(e => `${e.source}|${e.target}|${e.kind}` === fwd)) continue;
                    const locNode = ensureNode(locId, cleanLoc, 'location');
                    nodeMap.get(charId)!.weight++;
                    locNode.weight++;
                    edgeList.push({ source: charId, target: locId, kind: 'location' });
                }
            }
        }

        // ── 4. Clean up orphan scene nodes ─────────────────────

        const connectedScenes = new Set(edgeList.map(e => e.source));
        for (const [id, node] of nodeMap) {
            if (node.entityType === 'scene' && !connectedScenes.has(id)) {
                nodeMap.delete(id);
            }
        }

        this.nodes = Array.from(nodeMap.values());
        this.edges = edgeList;
    }

    // ── Simulation ─────────────────────────────────────

    private runSimulation(): void {
        let iterations = 0;
        const maxIterations = 350;

        const tick = () => {
            if (!this.svg) return;
            iterations++;

            this.applyForces();

            for (const node of this.nodes) {
                if (node === this.dragging) continue;
                node.x += node.vx;
                node.y += node.vy;
                node.vx *= 0.82;
                node.vy *= 0.82;
                node.x = Math.max(50, Math.min(this.width - 50, node.x));
                node.y = Math.max(50, Math.min(this.height - 50, node.y));
            }

            this.renderSVG();

            if (iterations < maxIterations) {
                this.animFrame = requestAnimationFrame(tick);
            }
        };

        this.animFrame = requestAnimationFrame(tick);
    }

    private applyForces(): void {
        const repulsion = 4000;
        const springLength = 100;
        const springK = 0.025;
        const centerGravity = 0.0012;

        // Repulsion between all nodes
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const a = this.nodes[i];
                const b = this.nodes[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                const force = repulsion / (dist * dist);
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                a.vx -= fx;
                a.vy -= fy;
                b.vx += fx;
                b.vy += fy;
            }
        }

        // Spring forces along edges
        for (const edge of this.edges) {
            const a = this.nodes.find(n => n.id === edge.source);
            const b = this.nodes.find(n => n.id === edge.target);
            if (!a || !b) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const displacement = dist - springLength;
            const force = springK * displacement;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx += fx;
            a.vy += fy;
            b.vx -= fx;
            b.vy -= fy;
        }

        // Center gravity
        for (const node of this.nodes) {
            node.vx += (this.width / 2 - node.x) * centerGravity;
            node.vy += (this.height / 2 - node.y) * centerGravity;
        }
    }

    // ── SVG rendering ──────────────────────────────────

    private renderSVG(): void {
        if (!this.svg) return;
        const svgNS = 'http://www.w3.org/2000/svg';

        while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

        const colors = getEntityColors();

        const g = document.createElementNS(svgNS, 'g');
        g.setAttribute('transform', `translate(${this.panX},${this.panY}) scale(${this.zoom})`);
        this.svg.appendChild(g);

        // Draw edges
        for (const edge of this.edges) {
            const a = this.nodes.find(n => n.id === edge.source);
            const b = this.nodes.find(n => n.id === edge.target);
            if (!a || !b) continue;

            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', String(a.x));
            line.setAttribute('y1', String(a.y));
            line.setAttribute('x2', String(b.x));
            line.setAttribute('y2', String(b.y));
            line.setAttribute('stroke', getEdgeColor(edge.kind));
            const isRelEdge = edge.kind === 'ally' || edge.kind === 'enemy' || edge.kind === 'family';
            line.setAttribute('stroke-width', isRelEdge ? '2' : '1.5');
            line.setAttribute('stroke-opacity', isRelEdge ? '0.65' : '0.45');
            if (EDGE_DASH[edge.kind]) {
                line.setAttribute('stroke-dasharray', EDGE_DASH[edge.kind]);
            }
            g.appendChild(line);
        }

        // Draw nodes
        for (const node of this.nodes) {
            const color = colors[node.entityType];
            const radius = this.nodeRadius(node);

            if (node.entityType === 'scene') {
                // Rectangle for scenes
                const rect = document.createElementNS(svgNS, 'rect');
                const rw = radius * 2.4;
                const rh = radius * 1.6;
                rect.setAttribute('x', String(node.x - rw / 2));
                rect.setAttribute('y', String(node.y - rh / 2));
                rect.setAttribute('width', String(rw));
                rect.setAttribute('height', String(rh));
                rect.setAttribute('rx', '4');
                rect.setAttribute('fill', color);
                rect.setAttribute('fill-opacity', '0.85');
                rect.setAttribute('stroke', 'var(--background-primary)');
                rect.setAttribute('stroke-width', '2');
                rect.classList.add('story-graph-node', 'story-graph-node-scene');
                this.wireNodeEvents(rect, node);
                g.appendChild(rect);
            } else if (node.entityType === 'location') {
                // Diamond for locations
                const r = radius;
                const diamond = document.createElementNS(svgNS, 'polygon');
                diamond.setAttribute('points', [
                    `${node.x},${node.y - r}`,
                    `${node.x + r},${node.y}`,
                    `${node.x},${node.y + r}`,
                    `${node.x - r},${node.y}`,
                ].join(' '));
                diamond.setAttribute('fill', color);
                diamond.setAttribute('fill-opacity', '0.85');
                diamond.setAttribute('stroke', 'var(--background-primary)');
                diamond.setAttribute('stroke-width', '2');
                diamond.classList.add('story-graph-node', 'story-graph-node-location');
                this.wireNodeEvents(diamond, node);
                g.appendChild(diamond);
            } else if (node.entityType === 'prop') {
                // Hexagon for props
                const r = radius * 0.9;
                const hex = document.createElementNS(svgNS, 'polygon');
                const pts: string[] = [];
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 6;
                    pts.push(`${node.x + r * Math.cos(angle)},${node.y + r * Math.sin(angle)}`);
                }
                hex.setAttribute('points', pts.join(' '));
                hex.setAttribute('fill', color);
                hex.setAttribute('fill-opacity', '0.85');
                hex.setAttribute('stroke', 'var(--background-primary)');
                hex.setAttribute('stroke-width', '2');
                hex.classList.add('story-graph-node', 'story-graph-node-prop');
                this.wireNodeEvents(hex, node);
                g.appendChild(hex);
            } else {
                // Circle for characters and other
                const circle = document.createElementNS(svgNS, 'circle');
                circle.setAttribute('cx', String(node.x));
                circle.setAttribute('cy', String(node.y));
                circle.setAttribute('r', String(radius));
                circle.setAttribute('fill', color);
                circle.setAttribute('fill-opacity', '0.85');
                circle.setAttribute('stroke', 'var(--background-primary)');
                circle.setAttribute('stroke-width', '2');
                circle.classList.add('story-graph-node', `story-graph-node-${node.entityType}`);
                this.wireNodeEvents(circle, node);
                g.appendChild(circle);
            }

            // Label
            const text = document.createElementNS(svgNS, 'text');
            const labelY = node.entityType === 'scene'
                ? node.y + this.nodeRadius(node) * 1.6 / 2 + 14
                : node.y + this.nodeRadius(node) + 14;
            text.setAttribute('x', String(node.x));
            text.setAttribute('y', String(labelY));
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', 'var(--text-normal)');
            text.setAttribute('font-size', node.entityType === 'scene' ? '10' : '11');
            text.setAttribute('font-weight', node.entityType === 'scene' ? '400' : '600');
            // Truncate long labels
            const maxLen = node.entityType === 'scene' ? 18 : 16;
            text.textContent = node.label.length > maxLen
                ? node.label.substring(0, maxLen - 1) + '…'
                : node.label;
            g.appendChild(text);
        }
    }

    private nodeRadius(node: StoryGraphNode): number {
        const base = node.entityType === 'scene' ? 10 : 14;
        return base + Math.min(node.weight * 1.5, 12);
    }

    private wireNodeEvents(el: SVGElement, node: StoryGraphNode): void {
        // Drag support
        el.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.dragging = node;
            const onMove = (me: MouseEvent) => {
                if (!this.svg) return;
                const svgRect = this.svg.getBoundingClientRect();
                node.x = (me.clientX - svgRect.left - this.panX) / this.zoom;
                node.y = (me.clientY - svgRect.top - this.panY) / this.zoom;
                this.renderSVG();
            };
            const onUp = () => {
                this.dragging = null;
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });

        // Double-click on scene → navigate
        if (node.entityType === 'scene' && this.onSelectScene) {
            el.addEventListener('dblclick', () => {
                const filePath = node.id.replace('scene::', '');
                this.onSelectScene!(filePath);
            });
        }

        el.style.cursor = 'grab';
    }
}
