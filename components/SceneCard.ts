import { Scene, STATUS_CONFIG, SceneStatus, ColorCodingMode, TIMELINE_MODE_LABELS, TIMELINE_MODE_ICONS, TimelineMode } from '../models/Scene';
import * as obsidian from 'obsidian';
import type SceneCardsPlugin from '../main';
import { resolveTagColor } from '../settings';
import type { LinkScanResult } from '../services/LinkScanner';

/**
 * Renders a single scene card element
 */
export class SceneCardComponent {
    private plugin: SceneCardsPlugin;

    constructor(plugin: SceneCardsPlugin) {
        this.plugin = plugin;
    }

    /**
     * Create a scene card DOM element
     */
    render(scene: Scene, container: HTMLElement, options?: {
        compact?: boolean;
        colorCoding?: ColorCodingMode;
        onSelect?: (scene: Scene, event?: MouseEvent) => void;
        onDoubleClick?: (scene: Scene) => void;
        onContextMenu?: (scene: Scene, event: MouseEvent) => void;
        draggable?: boolean;
    }): HTMLElement {
        const card = container.createDiv({
            cls: 'scene-card',
            attr: {
                'data-path': scene.filePath,
                'data-status': scene.status || 'idea',
                'data-act': scene.act !== undefined ? String(scene.act) : '',
                draggable: options?.draggable !== false ? 'true' : 'false',
            }
        });

        // Color stripe based on coding mode
        const colorMode = options?.colorCoding || this.plugin.settings.colorCoding as ColorCodingMode;
        const color = this.getCardColor(scene, colorMode);
        card.style.borderLeftColor = color;

        // Header
        const header = card.createDiv('scene-card-header');
        if (scene.sequence !== undefined) {
            header.createSpan({
                cls: 'scene-card-seq',
                text: this.formatSequence(scene)
            });
        }
        const statusCfg = STATUS_CONFIG[scene.status || 'idea'];
        const statusIconEl = header.createSpan({
            cls: 'scene-card-status-icon',
            attr: { title: statusCfg.label }
        });
        obsidian.setIcon(statusIconEl, statusCfg.icon);

        // Title
        const displayTitle = this.getDisplayTitle(scene);
        card.createDiv({
            cls: 'scene-card-title',
            text: displayTitle
        });

        // Timeline mode badge (for non-linear scenes)
        const cardTlMode = scene.timeline_mode || 'linear';
        if (!options?.compact && cardTlMode !== 'linear') {
            const modeBadge = card.createDiv({ cls: `scene-card-timeline-mode timeline-mode-${cardTlMode}` });
            const modeIcon = modeBadge.createSpan();
            obsidian.setIcon(modeIcon, TIMELINE_MODE_ICONS[cardTlMode] || 'clock');
            modeBadge.createSpan({ text: ` ${TIMELINE_MODE_LABELS[cardTlMode]}` });
            if (scene.timeline_strand) {
                modeBadge.createSpan({ cls: 'scene-card-strand', text: ` · ${scene.timeline_strand}` });
            }
        }

        if (!options?.compact && scene.pov) {
            const meta = card.createDiv('scene-card-meta');
            meta.createSpan({
                cls: 'scene-card-pov',
                text: `POV: ${scene.pov}`
            });
        }
        if (!options?.compact && scene.conflict) {
            card.createDiv({
                cls: 'scene-card-conflict',
                text: scene.conflict.length > 80
                    ? scene.conflict.substring(0, 80) + '...'
                    : scene.conflict
            });
        }
        if (!options?.compact) {
            const footer = card.createDiv('scene-card-footer');
            if (this.plugin.settings.showWordCounts) {
                const wc = scene.wordcount || 0;
                const target = scene.target_wordcount;
                const wcText = target ? `${wc} / ${target}` : String(wc);
                footer.createSpan({
                    cls: 'scene-card-wordcount',
                    text: `${wcText} words`
                });
            }
            const progress = footer.createSpan('scene-card-progress');
            this.renderProgressDots(progress, scene.status || 'idea');
            if (scene.characters?.length) {
                const charList = card.createDiv('scene-card-characters');
                scene.characters.slice(0, 3).forEach(c => {
                    charList.createSpan({
                        cls: 'scene-card-char-tag',
                        text: c
                    });
                });
                if (scene.characters.length > 3) {
                    charList.createSpan({
                        cls: 'scene-card-char-more',
                        text: `+${scene.characters.length - 3}`
                    });
                }
            }

            // Detected wikilinks badge (from LinkScanner)
            const scanResult = this.plugin.linkScanner?.getResult(scene.filePath);
            if (scanResult && scanResult.links.length > 0) {
                // Count only links NOT already in frontmatter
                const fmChars = new Set((scene.characters || []).map(c => c.toLowerCase()));
                const fmLoc = scene.location?.toLowerCase();
                const novelCount = scanResult.links.filter(l => {
                    const key = l.name.toLowerCase();
                    if (l.type === 'character' && fmChars.has(key)) return false;
                    if (l.type === 'location' && key === fmLoc) return false;
                    return true;
                }).length;
                if (novelCount > 0) {
                    const badge = card.createDiv({ cls: 'scene-card-detected-badge' });
                    const badgeIcon = badge.createSpan();
                    obsidian.setIcon(badgeIcon, 'scan-search');
                    badge.createSpan({ text: String(novelCount) });
                    badge.setAttribute('title', `${novelCount} link${novelCount > 1 ? 's' : ''} detected in text`);
                }
            }
        }

        // Wire up event listeners
        if (options?.onSelect) {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                options.onSelect!(scene, e);
            });
        }
        if (options?.onDoubleClick) {
            card.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                options.onDoubleClick!(scene);
            });
        }
        if (options?.onContextMenu) {
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                options.onContextMenu!(scene, e);
            });
        }

        // Drag start
        if (options?.draggable !== false) {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer?.setData('text/scene-path', scene.filePath);
                card.addClass('dragging');
            });
            card.addEventListener('dragend', () => {
                card.removeClass('dragging');
            });
        }

        return card;
    }

    /**
     * Render status progress dots (●/○)
     */
    private renderProgressDots(container: HTMLElement, status: SceneStatus) {
        const order = ['idea', 'outlined', 'draft', 'written', 'revised', 'final'];
        const idx = order.indexOf(status);
        for (let i = 0; i < 3; i++) {
            const r = i * 2;
            const filled = idx >= r;
            container.createSpan({
                cls: `scene-card-dot ${filled ? 'filled' : 'empty'}`,
                text: filled ? '●' : '○'
            });
        }
    }

    private getDisplayTitle(scene: Scene): string {
        if (scene.corkboardNote) {
            const firstLine = (scene.body || '')
                .split(/\r?\n/)
                .map(line => line.trim())
                .find(line => line.length > 0);

            if (firstLine) {
                const cleaned = firstLine
                    .replace(/^#{1,6}\s+/, '')
                    .replace(/^[-*+]\s+/, '')
                    .replace(/^>\s*/, '')
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/\*(.*?)\*/g, '$1')
                    .replace(/`([^`]+)`/g, '$1')
                    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
                    .trim();

                if (cleaned.length > 0) {
                    return cleaned.length > 60 ? `${cleaned.slice(0, 60)}…` : cleaned;
                }
            }

            return 'Note';
        }

        const title = (scene.title || '').trim();
        return title || 'Untitled';
    }

    /**
     * Get card color based on coding mode
     */
    private getCardColor(scene: Scene, mode: ColorCodingMode): string {
        switch (mode) {
            case 'status':
                return STATUS_CONFIG[scene.status || 'idea'].color;
            case 'pov':
                return this.stringToColor(scene.pov || 'none');
            case 'emotion':
                return this.emotionToColor(scene.emotion);
            case 'act':
                return this.actToColor(scene.act);
            case 'tag':
                return this.tagToColor(scene.tags);
            default:
                return STATUS_CONFIG[scene.status || 'idea'].color;
        }
    }

    /**
     * Get color from first tag that has a user-assigned color
     */
    private tagToColor(tags?: string[]): string {
        if (!tags || tags.length === 0) return 'var(--sl-emotion-default, #9E9E9E)';
        const tagColors = this.plugin.settings.tagColors || {};
        const scheme = this.plugin.settings.colorScheme;
        const allTagsSorted = (this.plugin.sceneManager?.getAllTags() || []).sort();
        for (const tag of tags) {
            const color = resolveTagColor(tag, Math.max(0, allTagsSorted.indexOf(tag)), scheme, tagColors);
            if (color && color !== '#888888') return color;
        }
        // Fallback: deterministic color from first tag string
        return this.stringToColor(tags[0]);
    }

    /**
     * Deterministic color from string (for POV characters)
     */
    private stringToColor(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        // Resolve lightness from theme (darker themes need brighter POV colors)
        const lightness = getComputedStyle(document.body).getPropertyValue('--sl-pov-lightness').trim() || '55%';
        return `hsl(${hue}, 65%, ${lightness})`;
    }

    /**
     * Map emotion to color
     */
    private emotionToColor(emotion?: string): string {
        const map: Record<string, string> = {
            tense: 'var(--sl-emotion-tense, #E53935)',
            suspenseful: 'var(--sl-emotion-suspenseful, #D32F2F)',
            joyful: 'var(--sl-emotion-joyful, #43A047)',
            happy: 'var(--sl-emotion-happy, #66BB6A)',
            melancholic: 'var(--sl-emotion-melancholic, #5C6BC0)',
            sad: 'var(--sl-emotion-sad, #7986CB)',
            romantic: 'var(--sl-emotion-romantic, #EC407A)',
            mysterious: 'var(--sl-emotion-mysterious, #8E24AA)',
            angry: 'var(--sl-emotion-angry, #F44336)',
            hopeful: 'var(--sl-emotion-hopeful, #29B6F6)',
            peaceful: 'var(--sl-emotion-peaceful, #26A69A)',
        };
        return map[emotion?.toLowerCase() || ''] || 'var(--sl-emotion-default, #9E9E9E)';
    }

    /**
     * Map act number to color
     */
    private actToColor(act?: number | string): string {
        const colors = [
            'var(--sl-act-1, #2196F3)',
            'var(--sl-act-2, #4CAF50)',
            'var(--sl-act-3, #FF9800)',
            'var(--sl-act-4, #9C27B0)',
            'var(--sl-act-5, #F44336)',
        ];
        const idx = typeof act === 'number' ? act - 1 : 0;
        return colors[idx % colors.length] || colors[0];
    }

    /**
     * Format sequence number for display
     */
    private formatSequence(scene: Scene): string {
        const act = scene.act !== undefined ? String(scene.act).padStart(2, '0') : '??';
        const seq = scene.sequence !== undefined ? String(scene.sequence).padStart(2, '0') : '??';
        return `${act}-${seq}`;
    }
}
