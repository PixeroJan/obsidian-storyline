import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { scanCommentFragments } from '../components/CommentsPanel';

class PointCommentWidget extends WidgetType {
    constructor(
        private readonly id: string,
        private readonly comment: string,
        private readonly author: string,
    ) {
        super();
    }

    eq(other: WidgetType): boolean {
        return other instanceof PointCommentWidget
            && other.id === this.id
            && other.comment === this.comment
            && other.author === this.author;
    }

    toDOM(): HTMLElement {
        const label = this.author ? `Comment by ${this.author}: ${this.comment}` : `Comment: ${this.comment}`;
        const marker = document.createElement('span');
        marker.className = 'sl-comment-marker';
        marker.dataset.commentId = this.id;
        marker.setAttribute('aria-label', label);
        marker.setAttribute('role', 'button');
        marker.setAttribute('tabindex', '0');
        marker.title = label;
        marker.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            marker.click();
        });
        return marker;
    }
}

function buildCommentDecorations(view: EditorView): DecorationSet {
    const decorations: ReturnType<typeof Decoration.range>[] = [];
    const source = view.state.doc.toString();

    for (const fragment of scanCommentFragments(source)) {
        if (fragment.kind === 'point') {
            decorations.push(Decoration.replace({
                widget: new PointCommentWidget(fragment.id, fragment.comment, fragment.author),
            }).range(fragment.openStart, fragment.closeEnd));
            continue;
        }

        decorations.push(Decoration.replace({}).range(fragment.openStart, fragment.openEnd));
        decorations.push(Decoration.mark({
            class: 'sl-comment-highlight',
            attributes: { 'data-comment-id': fragment.id },
        }).range(fragment.openEnd, fragment.closeStart));
        decorations.push(Decoration.replace({}).range(fragment.closeStart, fragment.closeEnd));
    }

    return decorations.length > 0 ? Decoration.set(decorations, true) : Decoration.none;
}

class CommentDecorations {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = buildCommentDecorations(view);
    }

    update(update: ViewUpdate): void {
        if (update.docChanged) this.decorations = buildCommentDecorations(update.view);
    }
}

export function createCommentEditorExtension(): ReturnType<typeof ViewPlugin.fromClass> {
    return ViewPlugin.fromClass(CommentDecorations, {
        decorations: (plugin) => plugin.decorations,
    });
}