import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

function paragraphBounds(view: EditorView, from: number, to: number): { from: number; to: number } {
    let first = view.state.doc.lineAt(from);
    let last = view.state.doc.lineAt(to);
    while (first.number > 1) {
        const previous = view.state.doc.line(first.number - 1);
        if (!previous.text.trim()) break;
        first = previous;
    }
    while (last.number < view.state.doc.lines) {
        const next = view.state.doc.line(last.number + 1);
        if (!next.text.trim()) break;
        last = next;
    }
    return { from: first.from, to: last.to };
}

function buildDecorations(view: EditorView): DecorationSet {
    const activeRanges = view.state.selection.ranges.map(range =>
        paragraphBounds(view, range.from, range.to));
    const builder = new RangeSetBuilder<Decoration>();
    for (let lineNumber = 1; lineNumber <= view.state.doc.lines; lineNumber++) {
        const line = view.state.doc.line(lineNumber);
        if (!line.text.trim()) continue;
        if (activeRanges.some(range => line.to >= range.from && line.from <= range.to)) continue;
        builder.add(line.from, line.from, Decoration.line({ class: 'sl-focus-text-dimmed' }));
    }
    return builder.finish();
}

export function createFocusTextExtension(): ViewPlugin<{
    decorations: DecorationSet;
    update(update: ViewUpdate): void;
}> {
    return ViewPlugin.fromClass(class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildDecorations(view);
        }

        update(update: ViewUpdate): void {
            if (update.docChanged || update.selectionSet || update.focusChanged) {
                this.decorations = buildDecorations(update.view);
            }
        }
    }, {
        decorations: value => value.decorations,
    });
}
