/**
 * RelationshipMap — interactive SVG graph of character relationships.
 *
 * Parses allies / enemies / family fields and renders
 * a force-directed-style graph using simple spring physics.
 */

import * as obsidian from 'obsidian';
import type { Character } from '../models/Character';
import { RELATION_BASE_TYPE_BY_CATEGORY } from '../models/Character';

export type RelationshipType = 'ally' | 'enemy' | 'romantic' | 'family' | 'mentor' | 'other';

export interface CharacterRelationship {
    from: string;
    to: string;
    type: RelationshipType;
    label?: string;
}

interface GraphNode {
    id: string;
    label: string;
    role?: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Is this character matched to a full Character file? */
    hasProfile: boolean;
}

interface GraphEdge {
    source: string;
    target: string;
    type: RelationshipType;
    label?: string;
}

/** Read a CSS custom property from the body, falling back to the provided default */
function resolveThemeColor(varName: string, fallback: string): string {
    const val = getComputedStyle(document.body).getPropertyValue(varName).trim();
    return val || fallback;
}

function getEdgeColors(): Record<RelationshipType, string> {
    return {
        ally: resolveThemeColor('--sl-rel-ally', '#4CAF50'),
        enemy: resolveThemeColor('--sl-rel-enemy', '#F44336'),
        romantic: resolveThemeColor('--sl-rel-romantic', '#E91E63'),
        family: resolveThemeColor('--sl-rel-family', '#FF9800'),
        mentor: resolveThemeColor('--sl-rel-mentor', '#9C27B0'),
        other: resolveThemeColor('--sl-rel-other', '#9E9E9E'),
    };
}

const EDGE_DASHES: Record<RelationshipType, string> = {
    ally: '',
    enemy: '6,3',
    romantic: '2,4',
    family: '',
    mentor: '8,3,2,3',
    other: '4,4',
};

/**
 * Renders an interactive relationship map inside the given container.
 */
export class RelationshipMap {
    private container: HTMLElement;
    private characters: Character[];
    private nodes: GraphNode[] = [];
    private edges: GraphEdge[] = [];
    private svg: SVGSVGElement | null = null;
    private width = 800;
    private height = 500;
    private animFrame = 0;
    private dragging: GraphNode | null = null;
    private panX = 0;
    private panY = 0;
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private zoom = 1;
    private onSelectCharacter?: (name: string) => void;

    constructor(
        container: HTMLElement,
        characters: Character[],
        onSelectCharacter?: (name: string) => void,
    ) {
        this.container = container;
        this.characters = characters;
        this.onSelectCharacter = onSelectCharacter;
    }

    render(): void {
        this.container.empty();

        // Build graph data
        this.buildGraph();

        if (this.nodes.length === 0) {
            const empty = this.container.createDiv('relationship-map-empty');
            empty.createEl('p', { text: 'No relationships to display. Add allies, enemies, or romantic history to your characters.' });
            return;
        }

        // Legend
        const legend = this.container.createDiv('relationship-map-legend');
        const edgeColors = getEdgeColors();
        for (const [type, color] of Object.entries(edgeColors)) {
            const item = legend.createDiv('relationship-map-legend-item');
            const swatch = item.createEl('span', { cls: 'relationship-map-legend-swatch' });
            swatch.style.backgroundColor = color;
            if (type === 'enemy') swatch.style.borderStyle = 'dashed';
            if (type === 'romantic') swatch.style.borderRadius = '50%';
            item.createEl('span', { text: type.charAt(0).toUpperCase() + type.slice(1) });
        }

        // SVG container
        const wrapper = this.container.createDiv('relationship-map-wrapper');
        const rect = wrapper.getBoundingClientRect();
        this.width = Math.max(600, rect.width || 800);
        this.height = Math.max(400, rect.height || 500);

        const svgNS = 'http://www.w3.org/2000/svg';
        this.svg = document.createElementNS(svgNS, 'svg');
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', String(this.height));
        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.classList.add('relationship-map-svg');
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

        // Start simulation
        this.runSimulation();
    }

    destroy(): void {
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.animFrame = 0;
    }

    // ── Graph building ─────────────────────────────────

    private buildGraph(): void {
        const nodeMap = new Map<string, GraphNode>();
        const edgeList: GraphEdge[] = [];

        // Create nodes for all characters with profiles
        for (const char of this.characters) {
            const key = char.name.toLowerCase();
            if (!nodeMap.has(key)) {
                nodeMap.set(key, {
                    id: key,
                    label: char.name,
                    role: char.role,
                    x: this.width / 2 + (Math.random() - 0.5) * this.width * 0.6,
                    y: this.height / 2 + (Math.random() - 0.5) * this.height * 0.6,
                    vx: 0,
                    vy: 0,
                    hasProfile: true,
                });
            }
        }

        // Parse relationships from structured rows
        for (const char of this.characters) {
            const fromKey = char.name.toLowerCase();
            if (Array.isArray(char.relations)) {
                for (const relation of char.relations) {
                    const baseType = RELATION_BASE_TYPE_BY_CATEGORY[relation.category] || 'other';
                    const name = relation.target?.trim();
                    if (!name) continue;
                    this.ensureNode(nodeMap, name);
                    edgeList.push({ source: fromKey, target: name.toLowerCase(), type: baseType });
                }
            }

            // Legacy free-text family/background field may contain relatives by name.
            if (char.family) {
                for (const name of this.parseNames(char.family)) {
                    this.ensureNode(nodeMap, name);
                    edgeList.push({ source: fromKey, target: name.toLowerCase(), type: 'family' });
                }
            }
        }

        // Deduplicate edges (if A→B and B→A exist, keep one)
        const edgeSet = new Set<string>();
        const deduped: GraphEdge[] = [];
        for (const e of edgeList) {
            const fwd = `${e.source}|${e.target}|${e.type}`;
            const rev = `${e.target}|${e.source}|${e.type}`;
            if (!edgeSet.has(fwd) && !edgeSet.has(rev)) {
                edgeSet.add(fwd);
                deduped.push(e);
            }
        }

        this.nodes = Array.from(nodeMap.values());
        this.edges = deduped;
    }

    private ensureNode(map: Map<string, GraphNode>, name: string): void {
        const key = name.toLowerCase();
        if (!map.has(key)) {
            map.set(key, {
                id: key,
                label: name,
                x: this.width / 2 + (Math.random() - 0.5) * this.width * 0.6,
                y: this.height / 2 + (Math.random() - 0.5) * this.height * 0.6,
                vx: 0,
                vy: 0,
                hasProfile: false,
            });
        }
    }

    /**
     * Parse a free-text field into individual names.
     * Handles comma-separated, [[wikilinks]], and lines.
     */
    private parseNames(text: string): string[] {
        // Strip wikilinks
        let cleaned = text.replace(/\[\[([^\]]+)\]\]/g, '$1');
        // Split on commas, semicolons, newlines, "and"
        const parts = cleaned.split(/[,;\n]|\band\b/i);
        return parts
            .map(p => p.trim())
            .filter(p => p.length > 0 && p.length < 60);
    }

    // ── Simulation & rendering ─────────────────────────

    private runSimulation(): void {
        const svgNS = 'http://www.w3.org/2000/svg';
        let iterations = 0;
        const maxIterations = 300;

        const tick = () => {
            if (!this.svg) return;
            iterations++;

            // Physics step
            this.applyForces();

            // Update node positions
            for (const node of this.nodes) {
                if (node === this.dragging) continue;
                node.x += node.vx;
                node.y += node.vy;
                node.vx *= 0.85; // damping
                node.vy *= 0.85;
                // Keep in bounds
                node.x = Math.max(40, Math.min(this.width - 40, node.x));
                node.y = Math.max(40, Math.min(this.height - 40, node.y));
            }

            this.renderSVG();

            if (iterations < maxIterations) {
                this.animFrame = requestAnimationFrame(tick);
            }
        };

        this.animFrame = requestAnimationFrame(tick);
    }

    private applyForces(): void {
        const repulsion = 3000;
        const springLength = 120;
        const springK = 0.02;
        const centerGravity = 0.001;

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

    private renderSVG(): void {
        if (!this.svg) return;
        const svgNS = 'http://www.w3.org/2000/svg';

        // Clear and re-draw (simple approach — works fine for < 100 nodes)
        while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

        const edgeColors = getEdgeColors();

        // Transform group for panning + zoom
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
            line.setAttribute('stroke', edgeColors[edge.type]);
            line.setAttribute('stroke-width', '2');
            if (EDGE_DASHES[edge.type]) {
                line.setAttribute('stroke-dasharray', EDGE_DASHES[edge.type]);
            }
            g.appendChild(line);

            // Edge label at midpoint
            if (edge.label) {
                const text = document.createElementNS(svgNS, 'text');
                text.setAttribute('x', String((a.x + b.x) / 2));
                text.setAttribute('y', String((a.y + b.y) / 2 - 6));
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('fill', edgeColors[edge.type]);
                text.setAttribute('font-size', '10');
                text.textContent = edge.label;
                g.appendChild(text);
            }
        }

        // Draw nodes
        for (const node of this.nodes) {
            // Circle
            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', String(node.x));
            circle.setAttribute('cy', String(node.y));
            circle.setAttribute('r', node.hasProfile ? '18' : '12');
            circle.setAttribute('fill', node.hasProfile
                ? 'var(--interactive-accent)'
                : 'var(--background-modifier-border)');
            circle.setAttribute('stroke', 'var(--background-primary)');
            circle.setAttribute('stroke-width', '2');
            circle.classList.add('relationship-map-node');

            // Drag support
            circle.addEventListener('mousedown', (e) => {
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

            // Click to select
            circle.addEventListener('dblclick', () => {
                if (this.onSelectCharacter && node.hasProfile) {
                    this.onSelectCharacter(node.label);
                }
            });

            g.appendChild(circle);

            // Label
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', String(node.x));
            text.setAttribute('y', String(node.y + (node.hasProfile ? 30 : 24)));
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', 'var(--text-normal)');
            text.setAttribute('font-size', node.hasProfile ? '12' : '10');
            text.setAttribute('font-weight', node.hasProfile ? '600' : '400');
            text.textContent = node.label;
            g.appendChild(text);

            // Role badge
            if (node.role && node.hasProfile) {
                const badge = document.createElementNS(svgNS, 'text');
                badge.setAttribute('x', String(node.x));
                badge.setAttribute('y', String(node.y - 24));
                badge.setAttribute('text-anchor', 'middle');
                badge.setAttribute('fill', 'var(--text-muted)');
                badge.setAttribute('font-size', '9');
                badge.textContent = node.role;
                g.appendChild(badge);
            }
        }
    }
}
