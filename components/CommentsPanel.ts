import { Notice, TFile, setIcon } from 'obsidian';
import type SceneCardsPlugin from '../main';
import type { Scene } from '../models/Scene';
import { attachTooltip } from './Tooltip';

type CommentStatus = 'open' | 'resolved';
type CommentFilter = CommentStatus;

interface AttributeSpan {
    name: string;
    start: number;
    end: number;
    valueStart: number | null;
    valueEnd: number | null;
    quote: string | null;
}

interface CommentFragment {
    id: string;
    kind: 'range' | 'point';
    comment: string;
    author: string;
    status: CommentStatus;
    quote: string;
    openStart: number;
    openEnd: number;
    closeStart: number;
    closeEnd: number;
}

interface ScribeComment {
    id: string;
    kind: 'range' | 'point';
    comment: string;
    author: string;
    status: CommentStatus;
    quote: string;
    fragments: number;
}

type CommentMutation =
    | { type: 'status'; status: CommentStatus }
    | { type: 'edit'; comment: string; author: string }
    | { type: 'delete' };

const OPENING_TAG = /<(mark|span)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;

export class CommentsPanelComponent {
    private readonly container: HTMLElement;
    private readonly plugin: SceneCardsPlugin;
    private readonly onEdit: () => void;
    private currentScene: Scene | null = null;
    private filter: CommentFilter = 'open';
    private editingId: string | null = null;
    private confirmingDeleteId: string | null = null;

    constructor(container: HTMLElement, plugin: SceneCardsPlugin, onEdit: () => void) {
        this.container = container;
        this.plugin = plugin;
        this.onEdit = onEdit;
    }

    show(scene: Scene): void {
        this.currentScene = scene;
        if (this.container.querySelector('input:focus, textarea:focus')) return;
        this.render();
    }

    hide(): void {
        this.currentScene = null;
        this.container.empty();
    }

    getCurrentScene(): Scene | null {
        return this.currentScene;
    }

    private render(): void {
        this.container.empty();
        this.container.addClass('sl-comments-panel');
        const scene = this.currentScene;
        if (!scene) return;

        const comments = readScribeComments(scene.body || '');
        const openCount = comments.filter((comment) => comment.status === 'open').length;
        const resolvedCount = comments.length - openCount;

        const header = this.container.createDiv('sl-comments-header');
        header.createDiv({ cls: 'sl-comments-title', text: scene.title || 'Untitled' });
        header.createDiv({ cls: 'sl-comments-count', text: `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}` });

        const filters = this.container.createDiv('sl-comments-filters');
        this.createFilterButton(filters, 'open', `Open ${openCount}`);
        this.createFilterButton(filters, 'resolved', `Resolved ${resolvedCount}`);

        const visibleComments = comments.filter((comment) => comment.status === this.filter);
        if (visibleComments.length === 0) {
            this.container.createDiv({
                cls: 'sl-comments-empty',
                text: comments.length === 0
                    ? 'No Scribe comments in this scene.'
                    : `No ${this.filter} comments.`,
            });
            return;
        }

        const list = this.container.createDiv('sl-comments-list');
        for (const comment of visibleComments) {
            this.renderComment(list, scene, comment);
        }
    }

    private createFilterButton(container: HTMLElement, filter: CommentFilter, label: string): void {
        const button = container.createEl('button', {
            cls: `sl-comments-filter ${this.filter === filter ? 'is-active' : ''}`,
            text: label,
        });
        button.setAttr('aria-pressed', String(this.filter === filter));
        button.addEventListener('click', () => {
            this.filter = filter;
            this.render();
        });
    }

    private renderComment(container: HTMLElement, scene: Scene, comment: ScribeComment): void {
        const card = container.createDiv('sl-comment-item');
        const metadata = card.createDiv('sl-comment-item-meta');
        metadata.createSpan({ cls: 'sl-comment-author', text: comment.author || 'Unknown author' });
        metadata.createSpan({ cls: 'sl-comment-kind', text: comment.kind });
        if (comment.fragments > 1) {
            metadata.createSpan({ cls: 'sl-comment-fragments', text: `${comment.fragments} fragments` });
        }

        if (this.confirmingDeleteId === comment.id) {
            card.createDiv({
                cls: 'sl-comment-delete-prompt',
                text: comment.kind === 'range'
                    ? 'Remove this comment? The selected text will stay in the scene.'
                    : 'Remove this comment marker?',
            });
            const confirmActions = card.createDiv('sl-comment-actions');
            const cancel = confirmActions.createEl('button', { text: 'Cancel' });
            cancel.addEventListener('click', () => {
                this.confirmingDeleteId = null;
                this.render();
            });
            const remove = confirmActions.createEl('button', { cls: 'mod-warning', text: 'Remove' });
            remove.addEventListener('click', () => void this.applyMutation(scene, comment.id, { type: 'delete' }));
            return;
        }

        if (this.editingId === comment.id) {
            this.renderEditor(card, scene, comment);
            return;
        }

        card.createDiv({ cls: 'sl-comment-text', text: comment.comment || '(Empty comment)' });
        if (comment.quote) {
            card.createDiv({ cls: 'sl-comment-quote', text: comment.quote });
        } else if (comment.kind === 'point') {
            card.createDiv({ cls: 'sl-comment-quote is-point', text: 'Point comment' });
        }

        const actions = card.createDiv('sl-comment-actions');
        this.createIconButton(
            actions,
            comment.status === 'open' ? 'check' : 'rotate-ccw',
            comment.status === 'open' ? 'Resolve comment' : 'Reopen comment',
            () => void this.applyMutation(scene, comment.id, {
                type: 'status',
                status: comment.status === 'open' ? 'resolved' : 'open',
            }),
        );
        this.createIconButton(actions, 'pencil', 'Edit comment', () => {
            this.editingId = comment.id;
            this.render();
        });
        this.createIconButton(actions, 'trash-2', 'Delete comment', () => {
            this.confirmingDeleteId = comment.id;
            this.render();
        });
    }

    private renderEditor(container: HTMLElement, scene: Scene, comment: ScribeComment): void {
        const authorField = container.createDiv('sl-comment-edit-field');
        authorField.createEl('label', { text: 'Author' });
        const authorInput = authorField.createEl('input', { attr: { type: 'text' } });
        authorInput.value = comment.author;

        const textField = container.createDiv('sl-comment-edit-field');
        textField.createEl('label', { text: 'Comment' });
        const commentInput = textField.createEl('textarea');
        commentInput.value = comment.comment;

        const actions = container.createDiv('sl-comment-actions');
        this.createIconButton(actions, 'check', 'Save comment', () => {
            void this.applyMutation(scene, comment.id, {
                type: 'edit',
                comment: commentInput.value,
                author: authorInput.value,
            });
        });
        this.createIconButton(actions, 'x', 'Cancel editing', () => {
            this.editingId = null;
            this.render();
        });
    }

    private createIconButton(container: HTMLElement, icon: string, tooltip: string, action: () => void): void {
        const button = container.createEl('button', { cls: 'clickable-icon sl-comment-action' });
        setIcon(button, icon);
        attachTooltip(button, tooltip);
        button.addEventListener('click', action);
    }

    private async applyMutation(scene: Scene, id: string, mutation: CommentMutation): Promise<void> {
        const file = this.plugin.app.vault.getAbstractFileByPath(scene.filePath);
        if (!(file instanceof TFile)) {
            new Notice('Scene file not found.');
            return;
        }

        try {
            let nextBody = scene.body || '';
            let changed = false;
            await this.plugin.app.vault.process(file, (content) => {
                const bodyStart = findSceneBodyStart(content);
                const body = content.slice(bodyStart);
                nextBody = mutateScribeComments(body, id, mutation);
                changed = nextBody !== body;
                return changed ? `${content.slice(0, bodyStart)}${nextBody}` : content;
            });

            if (!changed) {
                new Notice('This comment is no longer in the scene.');
            } else {
                scene.body = nextBody;
                this.onEdit();
            }
            this.editingId = null;
            this.confirmingDeleteId = null;
            this.render();
        } catch (error) {
            console.error('[StoryLine] Failed to update Scribe comment:', error);
            new Notice('Unable to save comment.');
        }
    }
}

function readScribeComments(markdown: string): ScribeComment[] {
    const comments = new Map<string, ScribeComment>();
    for (const fragment of scanCommentFragments(markdown)) {
        const existing = comments.get(fragment.id);
        if (existing) {
            existing.quote += fragment.quote;
            existing.fragments++;
            continue;
        }
        comments.set(fragment.id, {
            id: fragment.id,
            kind: fragment.kind,
            comment: fragment.comment,
            author: fragment.author,
            status: fragment.status,
            quote: fragment.quote,
            fragments: 1,
        });
    }
    return Array.from(comments.values());
}

function scanCommentFragments(markdown: string): CommentFragment[] {
    const codeRanges = findCodeRanges(markdown);
    const fragments: CommentFragment[] = [];

    for (const match of markdown.matchAll(OPENING_TAG)) {
        const tag = match[0];
        const tagName = (match[1] || '').toLowerCase();
        const openStart = match.index ?? 0;
        const openEnd = openStart + tag.length;
        if (codeRanges.some((range) => openStart >= range.start && openStart < range.end)) continue;

        const attributes = readAttributes(tag);
        const classes = (attributes.get('class') || '').split(/\s+/);
        const kind = tagName === 'mark' && classes.includes('sl-comment-highlight')
            ? 'range'
            : tagName === 'span' && classes.includes('sl-comment-marker')
                ? 'point'
                : null;
        const id = attributes.get('data-comment-id') || '';
        if (!kind || !id) continue;

        const closing = findClosingTag(markdown, tagName, openEnd);
        if (!closing) continue;
        const inner = markdown.slice(openEnd, closing.start);
        if (kind === 'point' && inner.trim() !== '') continue;

        const rawStatus = attributes.get('data-comment-status');
        fragments.push({
            id,
            kind,
            comment: attributes.get('data-comment') ?? attributes.get('comment') ?? '',
            author: attributes.get('data-author') ?? attributes.get('author') ?? '',
            status: rawStatus === 'resolved' ? 'resolved' : 'open',
            quote: kind === 'range' ? htmlToText(inner) : '',
            openStart,
            openEnd,
            closeStart: closing.start,
            closeEnd: closing.end,
        });
    }
    return fragments;
}

function findCodeRanges(markdown: string): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];
    let fence: { marker: string; length: number } | null = null;
    const linePattern = /([^\r\n]*)(\r\n|\r|\n|$)/g;
    let lineMatch: RegExpExecArray | null;
    while ((lineMatch = linePattern.exec(markdown)) !== null) {
        if (lineMatch[0] === '') break;
        const line = lineMatch[1];
        const start = lineMatch.index;
        const end = start + lineMatch[0].length;
        if (fence) {
            ranges.push({ start, end });
            const close = new RegExp(`^ {0,3}${fence.marker}{${fence.length},}[ \\t]*$`);
            if (close.test(line)) fence = null;
            continue;
        }

        const opening = /^ {0,3}(`{3,}|~{3,})/.exec(line);
        if (opening) {
            fence = { marker: opening[1][0], length: opening[1].length };
            ranges.push({ start, end });
        }
    }

    const inFence = (index: number): boolean => ranges.some((range) => index >= range.start && index < range.end);
    let cursor = 0;
    while (cursor < markdown.length) {
        const start = markdown.indexOf('`', cursor);
        if (start < 0) break;
        if (inFence(start) || isEscaped(markdown, start)) {
            cursor = start + 1;
            continue;
        }
        let runEnd = start + 1;
        while (markdown[runEnd] === '`') runEnd++;
        const runLength = runEnd - start;
        let candidate = runEnd;
        let closeStart = -1;
        let closeEnd = -1;
        while ((candidate = markdown.indexOf('`', candidate)) >= 0) {
            if (inFence(candidate)) {
                candidate++;
                continue;
            }
            let candidateEnd = candidate + 1;
            while (markdown[candidateEnd] === '`') candidateEnd++;
            if (candidateEnd - candidate === runLength) {
                closeStart = candidate;
                closeEnd = candidateEnd;
                break;
            }
            candidate = candidateEnd;
        }
        if (closeStart >= 0) {
            ranges.push({ start, end: closeEnd });
            cursor = closeEnd;
        } else {
            cursor = runEnd;
        }
    }
    return ranges;
}

function isEscaped(source: string, index: number): boolean {
    let backslashes = 0;
    for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor--) backslashes++;
    return backslashes % 2 === 1;
}

function findClosingTag(source: string, tagName: string, start: number): { start: number; end: number } | null {
    const pattern = new RegExp(`<\\/?${tagName}\\b(?:[^>"']|"[^"]*"|'[^']*')*>`, 'gi');
    pattern.lastIndex = start;
    let depth = 1;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
        const token = match[0];
        if (/^<\//.test(token)) {
            depth--;
            if (depth === 0) return { start: match.index, end: pattern.lastIndex };
        } else if (!/\/>$/.test(token)) {
            depth++;
        }
    }
    return null;
}

function readAttributes(tag: string): Map<string, string> {
    const values = new Map<string, string>();
    for (const attribute of getAttributeSpans(tag)) {
        if (attribute.valueStart === null || attribute.valueEnd === null) continue;
        values.set(attribute.name, decodeHtmlAttribute(tag.slice(attribute.valueStart, attribute.valueEnd)));
    }
    return values;
}

function getAttributeSpans(tag: string): AttributeSpan[] {
    const spans: AttributeSpan[] = [];
    let cursor = 1;
    while (cursor < tag.length && /[A-Za-z0-9:-]/.test(tag[cursor])) cursor++;

    while (cursor < tag.length) {
        while (/\s/.test(tag[cursor] || '')) cursor++;
        if (!tag[cursor] || tag[cursor] === '>' || tag[cursor] === '/') break;

        const start = cursor;
        while (cursor < tag.length && !/[\s=/>]/.test(tag[cursor])) cursor++;
        if (cursor === start) break;
        const name = tag.slice(start, cursor).toLowerCase();
        const nameEnd = cursor;
        while (/\s/.test(tag[cursor] || '')) cursor++;

        let valueStart: number | null = null;
        let valueEnd: number | null = null;
        let quote: string | null = null;
        let end = nameEnd;
        if (tag[cursor] === '=') {
            cursor++;
            while (/\s/.test(tag[cursor] || '')) cursor++;
            if (tag[cursor] === '"' || tag[cursor] === "'") {
                quote = tag[cursor++];
                valueStart = cursor;
                while (cursor < tag.length && tag[cursor] !== quote) cursor++;
                valueEnd = cursor;
                if (tag[cursor] === quote) cursor++;
            } else {
                valueStart = cursor;
                while (cursor < tag.length && !/[\s>]/.test(tag[cursor])) cursor++;
                valueEnd = cursor;
            }
            end = cursor;
        }
        spans.push({ name, start, end, valueStart, valueEnd, quote });
    }
    return spans;
}

function decodeHtmlAttribute(value: string): string {
    const document = new DOMParser().parseFromString(`<span data-value="${value}"></span>`, 'text/html');
    return document.body.firstElementChild?.getAttribute('data-value') || '';
}

function htmlToText(value: string): string {
    const document = new DOMParser().parseFromString(value, 'text/html');
    return document.body.textContent || '';
}

function mutateScribeComments(markdown: string, id: string, mutation: CommentMutation): string {
    const fragments = scanCommentFragments(markdown).filter((fragment) => fragment.id === id);
    const edits: Array<{ start: number; end: number; text: string }> = [];
    for (const fragment of fragments) {
        if (mutation.type === 'delete') {
            if (fragment.kind === 'point') {
                edits.push({ start: fragment.openStart, end: fragment.closeEnd, text: '' });
            } else {
                edits.push({ start: fragment.openStart, end: fragment.openEnd, text: '' });
                edits.push({ start: fragment.closeStart, end: fragment.closeEnd, text: '' });
            }
            continue;
        }

        const tag = markdown.slice(fragment.openStart, fragment.openEnd);
        const attributes = readAttributes(tag);
        const updates: Record<string, string> = mutation.type === 'status'
            ? { 'data-comment-status': mutation.status }
            : {
                'data-comment': mutation.comment,
                'data-author': mutation.author,
                'title': mutation.author ? `${mutation.author}: ${mutation.comment}` : mutation.comment,
            };
        if (mutation.type === 'edit') {
            if (attributes.has('comment')) updates.comment = mutation.comment;
            if (attributes.has('author')) updates.author = mutation.author;
            if (!attributes.has('title')) delete updates.title;
        }
        const updatedTag = updateOpeningTag(tag, updates);
        if (updatedTag !== tag) edits.push({ start: fragment.openStart, end: fragment.openEnd, text: updatedTag });
    }

    let result = markdown;
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
        result = `${result.slice(0, edit.start)}${edit.text}${result.slice(edit.end)}`;
    }
    return result;
}

function updateOpeningTag(tag: string, updates: Record<string, string>): string {
    const spans = getAttributeSpans(tag);
    const remaining = new Set(Object.keys(updates));
    const edits: Array<{ start: number; end: number; text: string }> = [];
    for (const span of spans) {
        const value = updates[span.name];
        if (value === undefined) continue;
        edits.push({ start: span.start, end: span.end, text: `${span.name}="${escapeHtmlAttribute(value)}"` });
        remaining.delete(span.name);
    }

    let result = tag;
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
        result = `${result.slice(0, edit.start)}${edit.text}${result.slice(edit.end)}`;
    }
    if (remaining.size > 0) {
        const insertAt = result.endsWith('/>') ? result.length - 2 : result.length - 1;
        const attributes = Array.from(remaining, (name) => `${name}="${escapeHtmlAttribute(updates[name])}"`).join(' ');
        result = `${result.slice(0, insertAt)} ${attributes}${result.slice(insertAt)}`;
    }
    return result;
}

function escapeHtmlAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function findSceneBodyStart(content: string): number {
    const frontmatter = /^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(content);
    return frontmatter?.[0].length ?? 0;
}