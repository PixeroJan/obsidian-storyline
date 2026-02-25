import * as obsidian from 'obsidian';
import type SceneCardsPlugin from '../main';
import type { StoryLineProject } from '../models/StoryLineProject';

/**
 * Renders a project selector dropdown into a toolbar container.
 * Shows the active project title and allows switching between projects.
 */
export function renderProjectSelector(
    container: HTMLElement,
    plugin: SceneCardsPlugin,
    onSwitch: () => void
): HTMLElement {
    const wrapper = container.createDiv('story-line-project-selector');

    const projects = plugin.sceneManager.getProjects();
    const active = plugin.sceneManager.activeProject;

    if (projects.length <= 1 && active) {
        // Only one project – just show the name, no dropdown
        const label = wrapper.createSpan({
            cls: 'project-selector-label',
            text: active.title,
        });
        return wrapper;
    }

    // Dropdown
    const select = wrapper.createEl('select', { cls: 'dropdown project-selector-dropdown' });

    for (const project of projects) {
        // Show folder hint for projects outside the default root
        const rootPath = plugin.settings.storyLineRoot;
        const isCustomLocation = !project.filePath.startsWith(rootPath + '/');
        const parentDir = project.filePath.substring(0, project.filePath.lastIndexOf('/'));
        const displayText = isCustomLocation
            ? `${project.title}  (${parentDir})`
            : project.title;

        const option = select.createEl('option', {
            text: displayText,
            value: project.filePath,
        });
        if (active && project.filePath === active.filePath) {
            option.selected = true;
        }
    }

    select.addEventListener('change', async () => {
        const selectedPath = select.value;
        const selectedProject = projects.find(p => p.filePath === selectedPath);
        if (selectedProject) {
            await plugin.sceneManager.setActiveProject(selectedProject);
            onSwitch();
        }
    });

    // "New project" button
    const newBtn = wrapper.createEl('button', {
        cls: 'clickable-icon project-selector-new',
        attr: { 'aria-label': 'New StoryLine project', title: 'New project' },
    });
    obsidian.setIcon(newBtn, 'plus');

    newBtn.addEventListener('click', () => {
        // Trigger via command palette
        (plugin.app as any).commands.executeCommandById('storyline:create-new-project');
    });

    return wrapper;
}
