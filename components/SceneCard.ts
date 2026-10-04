/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
import * as obsidian from 'obsidian';
import { Modal, App } from 'obsidian';
import type SceneCardsPlugin from '../main';
import { resolveTagColor, getPlotlineHSL, resolveStickyNoteColors, resolveStickyNoteFontColor } from '../settings';
import type { SceneManager } from '../services/SceneManager';
import { formatActChapterPrefix } from '../utils/actChapter';
import { parseSceneLocations } from '../services/MetadataParser';
import { ColorCodingMode, Scene, SceneStatus, TIMELINE_MODE_ICONS, TIMELINE_MODE_LABELS, formatSceneLength, getStatusOrder, resolveStatusCfg } from '../models/Scene';

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
        if (scene.inactive) {
            card.addClass('scene-card-inactive');
            card.setAttribute('aria-label', `${scene.title || 'Untitled'} inactive scene`);
        }

        // Corkboard notes get sticky-note styling instead of the scene look
        if (scene.corkboardNote) {
            card.addClass('story-line-kanban-note');
            this.applyNoteColor(card, scene);
        } else {
            // Color stripe based on coding mode (always applied as border-left)
            const colorMode = options?.colorCoding || this.plugin.settings.colorCoding;
            const color = this.getCardColor(scene, colorMode);
            card.setCssStyles({ borderLeftColor: color });

            // Custom per-scene color applied as background overlay (independent of edge color)
            if (scene.color && /^#[0-9a-fA-F]{6}$/.test(scene.color)) {
                this.applySceneColor(card, scene.color);
            }
        }

        // Header
        const header = card.createDiv('scene-card-header');
        const showSeq = this.plugin.settings.showSceneNumberOnCards ?? true;
        if (showSeq) {
            header.createSpan({
                cls: 'scene-card-seq',
                text: this.formatSequence(scene)
            });
        }
        const statusCfg = resolveStatusCfg(scene.status || 'idea');
        const statusIconEl = header.createSpan({
            cls: 'scene-card-status-icon',
            attr: { title: statusCfg.label }
        });
        obsidian.setIcon(statusIconEl, statusCfg.icon);

        // Title
        const displayTitle = this.getDisplayTitle(scene);
        const titleEl = card.createDiv({
            cls: 'scene-card-title',
            text: displayTitle
        });
        if (scene.inactive) {
            titleEl.createSpan({ cls: 'scene-card-inactive-badge', text: 'Inactive' });
        }

        // Subtitle (optional, shown below title)
        if (scene.subtitle) {
            card.createDiv({
                cls: 'scene-card-subtitle',
                text: scene.subtitle
            });
        }

        // Optional preview text (synopsis or first lines of draft) — issue #112
        if (!options?.compact && !scene.corkboardNote) {
            const previewMode = this.plugin.settings.cardPreviewSource || 'none';
            let previewText = '';
            if (previewMode === 'synopsis') {
                previewText = (scene.synopsis || '').trim();
            } else if (previewMode === 'body') {
                previewText = this.extractBodyPreview(scene.body || '');
            } else if (previewMode === 'conflict') {
                previewText = (scene.conflict || '').trim();
            }
            if (previewText) {
                const max = 220;
                const clipped = previewText.length > max ? previewText.slice(0, max).trimEnd() + '…' : previewText;
                card.createDiv({ cls: 'scene-card-preview', text: clipped });
            }
        }

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

        // Arc Point badge (issue #128)
        if (!options?.compact && scene.arcAnchor) {
            const arcBadge = card.createDiv({ cls: 'scene-card-arc-point-badge' });
            const arcIcon = arcBadge.createSpan();
            obsidian.setIcon(arcIcon, 'diamond');
            arcBadge.createSpan({ text: ' Arc Point' });
        }

        if (!options?.compact) {
            const footer = card.createDiv('scene-card-footer');
            if (this.plugin.settings.showWordCounts) {
                const unit = this.plugin.settings.countUnit === 'chars' ? 'chars' : 'words';
                footer.createSpan({
                    cls: 'scene-card-wordcount',
                    text: formatSceneLength(scene, unit),
                });
            }
            const progress = footer.createSpan('scene-card-progress');
            this.renderProgressDots(progress, scene.status || 'idea');

            // Character pill row. POV character is rendered first as a plain
            // pill but with the text "POV: <name>" so the reader can identify
            // whose head we're in without needing a separate metadata line.
            const povName = scene.pov ? scene.pov.trim() : '';
            const allChars = scene.characters || [];
            const otherChars = allChars.filter(
                c => c && c.toLowerCase() !== povName.toLowerCase()
            );
            const havePovInList = !!povName && allChars.some(
                c => c && c.toLowerCase() === povName.toLowerCase()
            );
            if (havePovInList || otherChars.length || (povName && !havePovInList)) {
                const charList = card.createDiv('scene-card-characters');
                let renderedCount = 0;
                const maxPills = 3;
                if (povName) {
                    charList.createSpan({
                        cls: 'scene-card-char-tag',
                        text: `POV: ${povName}`,
                    });
                    renderedCount += 1;
                }
                for (const c of otherChars) {
                    if (renderedCount >= maxPills) break;
                    charList.createSpan({
                        cls: 'scene-card-char-tag',
                        text: c,
                    });
                    renderedCount += 1;
                }
                const totalChars = (povName ? 1 : 0) + otherChars.length;
                if (totalChars > renderedCount) {
                    charList.createSpan({
                        cls: 'scene-card-char-more',
                        text: `+${totalChars - renderedCount}`,
                    });
                }
            }

            // Detected wikilinks badge (from LinkScanner)
            const scanResult = this.plugin.linkScanner?.getResult(scene.filePath);
            if (scanResult && scanResult.links.length > 0) {
                // Count only links NOT already in frontmatter
                const fmChars = new Set((scene.characters || []).map(c => c.toLowerCase()));
                const fmLocs = new Set(parseSceneLocations(scene.location).map(location => location.toLowerCase()));
                const novelCount = scanResult.links.filter(l => {
                    const key = l.name.toLowerCase();
                    if (l.type === 'character' && fmChars.has(key)) return false;
                    if (l.type === 'location' && fmLocs.has(key)) return false;
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

            // Custom (universal) scene field badges + hover summary
            this.renderCustomFieldBadges(scene, card);
        }

        // Intercept internal-link clicks before card-level handlers
        card.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a.internal-link');
            if (link) {
                e.preventDefault();
                e.stopPropagation();
                const href = link.getAttribute('data-href') || link.getAttribute('href');
                if (href) this.plugin.app.workspace.openLinkText(href, scene.filePath, true);
            }
        }, true);

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
     * Render badges for scene custom (universal) field values and a hover
     * tooltip summarizing all of them. Quietly does nothing if no values exist.
     */
    private renderCustomFieldBadges(scene: Scene, card: HTMLElement): void {
        if (!scene.universalFields) return;
        const tpls = this.plugin.fieldTemplates?.getAll()
            .filter(t => (t.category || 'character') === 'scene') ?? [];
        if (tpls.length === 0) return;

        const summary: string[] = [];
        let badgesEl: HTMLElement | null = null;
        let shown = 0;
        const MAX_BADGES = 3;

        for (const tpl of tpls) {
            const raw = scene.universalFields[tpl.id];
            if (raw === undefined || raw === null) continue;
            const display = Array.isArray(raw) ? raw.join(', ') : String(raw);
            if (!display.trim()) continue;
            summary.push(`${tpl.label}: ${display}`);

            if (shown < MAX_BADGES && (tpl.type === 'dropdown' || tpl.type === 'multi-select')) {
                if (!badgesEl) badgesEl = card.createDiv('scene-card-custom-fields');
                const text = display.length > 24 ? display.slice(0, 23) + '…' : display;
                const badge = badgesEl.createSpan({ cls: 'scene-card-custom-badge' });
                badge.createSpan({ cls: 'scene-card-custom-badge-label', text: `${tpl.label}: ` });
                badge.createSpan({ text });
                badge.setAttribute('title', `${tpl.label}: ${display}`);
                shown++;
            }
        }

        if (summary.length > 0) {
            const existing = card.getAttribute('title') || '';
            const merged = existing ? `${existing}\n\n${summary.join('\n')}` : summary.join('\n');
            card.setAttribute('title', merged);
        }
    }

    /**
     * Render status progress dots (●/○)
     */
    private renderProgressDots(container: HTMLElement, status: SceneStatus) {
        const order = getStatusOrder();
        const idx = order.indexOf(status);
        // Show 3 dots for 6 or fewer statuses, otherwise scale number of dots
        const dotCount = Math.max(3, Math.ceil(order.length / 2));
        for (let i = 0; i < dotCount; i++) {
            const threshold = i * Math.max(1, Math.floor(order.length / dotCount));
            const filled = idx >= threshold;
            container.createSpan({
                cls: `scene-card-dot ${filled ? 'filled' : 'empty'}`,
                text: filled ? '●' : '○'
            });
        }
    }

    /** Strip basic markdown from a scene body and return a single condensed line. */
    private extractBodyPreview(body: string): string {
        const text = body
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l.length > 0 && !/^#{1,6}\s/.test(l) && !/^>\s/.test(l))
            .map(l => l.replace(/^[-*+]\s+/, ''))
            .join(' ')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')
            .replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (_m, a, b) => b || a)
            .replace(/\s+/g, ' ')
            .trim();
        return text;
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
                return resolveStatusCfg(scene.status || 'idea').color;
            case 'pov':
                return this.stringToColor(scene.pov || 'none');
            case 'emotion':
                return this.emotionToColor(scene.emotion);
            case 'act':
                return this.actToColor(scene.act);
            case 'tag':
                return this.tagToColor(scene.tags);
            default:
                return resolveStatusCfg(scene.status || 'idea').color;
        }
    }

    /**
     * Get color from first tag that has a user-assigned color
     */
    private tagToColor(tags?: string[]): string {
        if (!tags || tags.length === 0) return 'var(--sl-emotion-default, #9E9E9E)';
        const tagColors = this.plugin.settings.tagColors || {};
        const scheme = this.plugin.settings.colorScheme;
        const allTagsSorted = (this.plugin.sceneManager?.queryService.getAllTags() || []).sort();
        for (const tag of tags) {
            const color = resolveTagColor(tag, Math.max(0, allTagsSorted.indexOf(tag)), scheme, tagColors, getPlotlineHSL(this.plugin.settings));
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
        const lightness = getComputedStyle(activeDocument.body).getPropertyValue('--sl-pov-lightness').trim() || '55%';
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
    /**
     * Apply custom background color to a regular scene card
     */
    private applySceneColor(card: HTMLElement, hex: string): void {
        card.addClass('sl-scene-colored');
        card.style.setProperty('--sl-scene-bg', hex);
        card.style.setProperty('--sl-scene-bg-accent', this.darken(hex, 0.24));
    }

    /**
     * Apply sticky-note background color to a kanban note card
     */
    private applyNoteColor(card: HTMLElement, scene: Scene): void {
        const presets = resolveStickyNoteColors(this.plugin.settings);
        const defaultColor = presets.length > 0 ? presets[0].color : '#F6EDB4';
        const raw = scene.corkboardNoteColor?.trim();
        const base = (raw && /^#[0-9a-fA-F]{6}$/.test(raw)) ? raw.toUpperCase() : defaultColor;
        card.style.setProperty('--sl-note-bg', base);
        card.style.setProperty('--sl-note-accent', this.darken(base, 0.24));
        card.style.setProperty('--sl-note-accent-strong', this.darken(base, 0.34));
        // Issue #205 — optional custom font colour overrides the auto-derived accent.
        // Two buckets (light/dark backgrounds) keep text readable across both.
        const fontColor = resolveStickyNoteFontColor(this.plugin.settings, base);
        if (fontColor) {
            card.style.setProperty('--sl-note-text', fontColor);
        } else {
            card.style.removeProperty('--sl-note-text');
        }
    }

    /** Darken a hex colour by a 0-1 factor */
    private darken(hex: string, factor: number): string {
        const r = Number.parseInt(hex.slice(1, 3), 16);
        const g = Number.parseInt(hex.slice(3, 5), 16);
        const b = Number.parseInt(hex.slice(5, 7), 16);
        const s = Math.max(0, 1 - factor);
        const toHex = (n: number) => Math.round(n * s).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    private formatSequence(scene: Scene): string {
        // formatActChapterPrefix pads pure-numeric values to 2 digits and
        // emits string values verbatim (e.g. "1.1", "Prologue"), so the
        // sequence badge stays meaningful for hierarchical / named acts.
        const act = formatActChapterPrefix(scene.act, '??');
        const chapter = scene.chapter !== undefined
            ? formatActChapterPrefix(scene.chapter, '??')
            : null;
        const seq = scene.sequence !== undefined ? String(scene.sequence).padStart(2, '0') : '??';
        return chapter ? `${act}-${chapter}-${seq}` : `${act}-${seq}`;
    }

    /**
     * Open a color picker modal to set/change/clear the scene background color.
     * Call from any view's context menu.
     */
    static openColorPicker(app: App, scene: Scene, sceneManager: SceneManager, onDone: () => void): void {
        const modal = new Modal(app);
        modal.titleEl.setText('Scene color');
        const colorInput = modal.contentEl.createEl('input', {
            type: 'color',
        });
        colorInput.value = scene.color || '#6366F1';
        colorInput.setCssStyles({
            width: '100%',
            height: '50px',
            cursor: 'pointer',
            border: 'none',
        });

        const btnRow = modal.contentEl.createDiv();
        btnRow.setCssStyles({
            display: 'flex',
            gap: '8px',
            marginTop: '12px',
        });

        const saveBtn = btnRow.createEl('button', { text: 'Save', cls: 'mod-cta' });
        saveBtn.addEventListener('click', async () => {
            await sceneManager.updateScene(scene.filePath, { color: colorInput.value } as Partial<Scene>);
            modal.close();
            onDone();
        });

        if (scene.color) {
            const clearBtn = btnRow.createEl('button', { text: 'Clear color' });
            clearBtn.addEventListener('click', async () => {
                await sceneManager.updateScene(scene.filePath, { color: undefined } as Partial<Scene>);
                modal.close();
                onDone();
            });
        }

        modal.open();
    }
}
/* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion -- end of file-wide suppression block opened at line 1 */
