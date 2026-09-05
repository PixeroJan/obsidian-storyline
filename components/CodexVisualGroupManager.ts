import { App, Modal, Notice, Setting, setIcon } from 'obsidian';
import type { CodexVisualGroup } from '../settings';

interface VisualGroupStore {
    codexVisualGroups: Record<string, CodexVisualGroup[]>;
}

interface VisualGroupPointerState {
    sourceGroupId: string | null;
    sourceSection: HTMLElement | null;
    targetSection: HTMLElement | null;
}

const visualGroupPointerStates = new WeakMap<HTMLElement, VisualGroupPointerState>();

export function attachCodexVisualGroupReorder(
    section: HTMLElement,
    handle: HTMLElement,
    group: CodexVisualGroup,
    groups: CodexVisualGroup[],
    save: () => Promise<void>,
    rerender: () => void,
): void {
    const container = section.parentElement;
    if (!container) return;
    const state = visualGroupPointerStates.get(container) ?? {
        sourceGroupId: null,
        sourceSection: null,
        targetSection: null,
    };
    visualGroupPointerStates.set(container, state);
    section.dataset.codexVisualGroupId = group.id;
    handle.addClass('codex-visual-group-reorder-handle');
    handle.setAttribute('title', `Reorder ${group.name}`);

    const clearDrag = (): void => {
        state.sourceSection?.removeClass('codex-group-dragging');
        state.targetSection?.removeClass('codex-group-drag-over');
        state.sourceGroupId = null;
        state.sourceSection = null;
        state.targetSection = null;
    };

    handle.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        event.preventDefault();
        state.sourceGroupId = group.id;
        state.sourceSection = section;
        state.targetSection = null;
        section.addClass('codex-group-dragging');
        handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
        if (state.sourceGroupId !== group.id) return;
        const target = document.elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLElement>('.codex-visual-group');
        if (!target || target.parentElement !== container || target === section
            || target.dataset.codexVisualGroupId === state.sourceGroupId) {
            state.targetSection?.removeClass('codex-group-drag-over');
            state.targetSection = null;
            return;
        }
        state.targetSection?.removeClass('codex-group-drag-over');
        state.targetSection = target;
        target.addClass('codex-group-drag-over');
    });

    const finishDrag = (event: PointerEvent): void => {
        if (state.sourceGroupId !== group.id) return;
        const targetId = state.targetSection?.dataset.codexVisualGroupId;
        if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
        if (targetId && targetId !== group.id) {
            const fromIndex = groups.findIndex(item => item.id === group.id);
            const toIndex = groups.findIndex(item => item.id === targetId);
            if (fromIndex >= 0 && toIndex >= 0) {
                const [moved] = groups.splice(fromIndex, 1);
                groups.splice(toIndex, 0, moved);
                clearDrag();
                void save();
                rerender();
                return;
            }
        }
        clearDrag();
    };
    handle.addEventListener('pointerup', finishDrag);
    handle.addEventListener('pointercancel', finishDrag);
}

export function getCodexVisualGroups(store: VisualGroupStore, categoryKey: string): CodexVisualGroup[] {
    if (!store.codexVisualGroups) store.codexVisualGroups = {};
    if (!store.codexVisualGroups[categoryKey]) store.codexVisualGroups[categoryKey] = [];
    return store.codexVisualGroups[categoryKey];
}

export function openCodexVisualGroupManager(
    app: App,
    store: VisualGroupStore,
    categoryKey: string,
    categoryLabel: string,
    save: () => Promise<void>,
    onDone: () => void,
): void {
    const modal = new Modal(app);
    modal.titleEl.setText(`Visual groups - ${categoryLabel}`);
    let draggedGroupId: string | null = null;
    let draggedRow: HTMLElement | null = null;
    let dropTargetRow: HTMLElement | null = null;
    const clearPointerDrag = (): void => {
        draggedRow?.removeClass('codex-group-dragging');
        dropTargetRow?.removeClass('codex-group-drag-over');
        draggedGroupId = null;
        draggedRow = null;
        dropTargetRow = null;
    };
    const render = () => {
        modal.contentEl.empty();
        modal.contentEl.addClass('codex-category-manager');
        modal.contentEl.createEl('p', {
            cls: 'setting-item-description',
            text: `Create named display groups for ${categoryLabel.toLowerCase()}. Groups only change the codex view and do not modify entry files.`,
        });

        const groups = getCodexVisualGroups(store, categoryKey);
        if (groups.length > 0) {
            modal.contentEl.createEl('h4', { text: 'Groups' });
            for (const group of groups) {
                const row = modal.contentEl.createDiv('codex-category-manager-row');
                row.dataset.groupId = group.id;
                const dragHandle = row.createSpan({
                    cls: 'codex-category-manager-drag-handle clickable-icon',
                    attr: { 'aria-label': `Reorder ${group.name}`, title: `Reorder ${group.name}` },
                });
                setIcon(dragHandle, 'grip-vertical');
                dragHandle.addEventListener('pointerdown', event => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    draggedGroupId = group.id;
                    draggedRow = row;
                    row.addClass('codex-group-dragging');
                    dragHandle.setPointerCapture(event.pointerId);
                });
                dragHandle.addEventListener('pointermove', event => {
                    if (draggedGroupId !== group.id) return;
                    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('.codex-category-manager-row');
                    if (!target || target === row || target.dataset.groupId === draggedGroupId) {
                        dropTargetRow?.removeClass('codex-group-drag-over');
                        dropTargetRow = null;
                        return;
                    }
                    dropTargetRow?.removeClass('codex-group-drag-over');
                    dropTargetRow = target;
                    dropTargetRow.addClass('codex-group-drag-over');
                });
                const finishPointerDrag = (event: PointerEvent): void => {
                    if (draggedGroupId !== group.id) return;
                    const targetId = dropTargetRow?.dataset.groupId;
                    if (dragHandle.hasPointerCapture(event.pointerId)) dragHandle.releasePointerCapture(event.pointerId);
                    if (targetId && targetId !== group.id) {
                        const fromIndex = groups.findIndex(item => item.id === group.id);
                        const toIndex = groups.findIndex(item => item.id === targetId);
                        if (fromIndex >= 0 && toIndex >= 0) {
                            const [moved] = groups.splice(fromIndex, 1);
                            groups.splice(toIndex, 0, moved);
                            clearPointerDrag();
                            void save();
                            render();
                            return;
                        }
                    }
                    clearPointerDrag();
                };
                dragHandle.addEventListener('pointerup', finishPointerDrag);
                dragHandle.addEventListener('pointercancel', finishPointerDrag);
                const input = row.createEl('input', {
                    cls: 'codex-visual-group-name-input',
                    attr: { type: 'text', 'aria-label': `Rename ${group.name}`, draggable: 'false' },
                });
                input.value = group.name;
                input.addEventListener('change', () => {
                    const name = input.value.trim();
                    if (!name) {
                        input.value = group.name;
                        return;
                    }
                    group.name = name;
                    void save();
                });
                row.createSpan({
                    cls: 'codex-visual-group-count',
                    text: `${group.entryPaths.length} entr${group.entryPaths.length === 1 ? 'y' : 'ies'}`,
                });
                const deleteBtn = row.createEl('button', {
                    cls: 'codex-category-delete-btn clickable-icon',
                    attr: { 'aria-label': `Delete ${group.name}`, draggable: 'false' },
                });
                deleteBtn.setText('×');
                deleteBtn.addEventListener('click', () => {
                    const index = groups.indexOf(group);
                    if (index >= 0) groups.splice(index, 1);
                    void save();
                    render();
                });
            }
        }

        modal.contentEl.createEl('h4', { text: 'Add group' });
        let groupInput: HTMLInputElement | null = null;
        new Setting(modal.contentEl)
            .setName('Group name')
            .addText(text => {
                text.setPlaceholder('Friends');
                groupInput = text.inputEl;
            });
        new Setting(modal.contentEl)
            .addButton(button => button
                .setButtonText('Create group')
                .setCta()
                .onClick(() => {
                    const name = groupInput?.value.trim() ?? '';
                    if (!name) {
                        new Notice('Enter a group name.');
                        return;
                    }
                    if (groups.some(group => group.name.toLowerCase() === name.toLowerCase())) {
                        new Notice('A group with that name already exists.');
                        return;
                    }
                    groups.push({ id: `${categoryKey}-${Date.now()}-${Math.random().toString(36).slice(2)}`, name, entryPaths: [] });
                    void save();
                    render();
                }));
        new Setting(modal.contentEl)
            .addButton(button => button
                .setButtonText('Done')
                .onClick(() => {
                    modal.close();
                    onDone();
                }));
    };
    render();
    modal.open();
}
