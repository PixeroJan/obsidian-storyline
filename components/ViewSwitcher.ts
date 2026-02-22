import { WorkspaceLeaf } from 'obsidian';
import * as obsidian from 'obsidian';
import type SceneCardsPlugin from '../main';
import { ExportModal } from './ExportModal';
import {
    BOARD_VIEW_TYPE,
    TIMELINE_VIEW_TYPE,
    STORYLINE_VIEW_TYPE,
    CHARACTER_VIEW_TYPE,
    STATS_VIEW_TYPE,
    PLOTGRID_VIEW_TYPE,
    LOCATION_VIEW_TYPE,
} from '../constants';

export interface ViewSwitcherEntry {
    type: string;
    label: string;
    icon: string;  // Lucide icon name
}

export const VIEW_ENTRIES: ViewSwitcherEntry[] = [
    { type: BOARD_VIEW_TYPE, label: 'Board', icon: 'layout-grid' },
    { type: PLOTGRID_VIEW_TYPE, label: 'Plotgrid', icon: 'table' },
    { type: TIMELINE_VIEW_TYPE, label: 'Timeline', icon: 'clock' },
    { type: STORYLINE_VIEW_TYPE, label: 'Plotlines', icon: 'git-branch' },
    { type: CHARACTER_VIEW_TYPE, label: 'Characters', icon: 'users' },
    { type: LOCATION_VIEW_TYPE, label: 'Locations', icon: 'map-pin' },
    { type: STATS_VIEW_TYPE, label: 'Stats', icon: 'bar-chart-2' },
];

/**
 * Renders view-switcher tabs into a toolbar container.
 * Uses the leaf reference directly from the owning view so
 * setViewState always targets the correct leaf.
 */
export function renderViewSwitcher(
    container: HTMLElement,
    activeViewType: string,
    plugin: SceneCardsPlugin,
    leaf: WorkspaceLeaf
): HTMLElement {
    const switcher = container.createDiv('story-line-view-switcher');

    for (const entry of VIEW_ENTRIES) {
        const tab = switcher.createEl('button', {
            cls: `story-line-view-tab ${entry.type === activeViewType ? 'active' : ''}`,
            attr: { 'aria-label': entry.label, title: entry.label },
        });
        const iconSpan = tab.createSpan({ cls: 'view-tab-icon' });
        obsidian.setIcon(iconSpan, entry.icon);
        tab.createSpan({ cls: 'view-tab-label', text: entry.label });

        if (entry.type !== activeViewType) {
            tab.addEventListener('click', async (e) => {
                e.preventDefault();
                // Directly switch the leaf that owns this view.
                // The leaf object persists across view changes –
                // only the view inside it is replaced.
                try {
                    await leaf.setViewState({
                        type: entry.type,
                        active: true,
                        state: {},
                    });
                    plugin.app.workspace.revealLeaf(leaf);
                } catch (err) {
                    console.error('StoryLine: view switch failed, falling back', err);
                    plugin.activateView(entry.type);
                }
            });
        }
    }

    // Export button (after all view tabs)
    const exportBtn = switcher.createEl('button', {
        cls: 'story-line-view-tab story-line-export-btn',
        attr: { 'aria-label': 'Export', title: 'Export' },
    });
    const exportIcon = exportBtn.createSpan({ cls: 'view-tab-icon' });
    obsidian.setIcon(exportIcon, 'download');
    exportBtn.createSpan({ cls: 'view-tab-label', text: 'Export' });
    exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        new ExportModal(plugin).open();
    });

    return switcher;
}
