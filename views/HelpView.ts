import { ItemView, WorkspaceLeaf, MarkdownRenderer, Component } from 'obsidian';
import type SceneCardsPlugin from '../main';
import { HELP_VIEW_TYPE } from '../constants';

/**
 * HelpView — displays the HELP.md documentation in a dedicated
 * right-split pane with clickable TOC and scrollable content.
 */
export class HelpView extends ItemView {
    private plugin: SceneCardsPlugin;
    private renderComponent: Component;

    constructor(leaf: WorkspaceLeaf, plugin: SceneCardsPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.renderComponent = new Component();
    }

    getViewType(): string {
        return HELP_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'StoryLine Help';
    }

    getIcon(): string {
        return 'help-circle';
    }

    async onOpen(): Promise<void> {
        this.renderComponent.load();
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('storyline-help-container');

        await this.renderHelp(container);
    }

    async onClose(): Promise<void> {
        this.renderComponent.unload();
    }

    /**
     * Read HELP.md from the plugin folder and render it as
     * native Obsidian markdown inside the pane.
     */
    private async renderHelp(container: HTMLElement): Promise<void> {
        let markdown = '';

        try {
            // Resolve the plugin's own installation folder
            const pluginDir = this.plugin.manifest.dir;
            if (pluginDir) {
                const helpPath = `${pluginDir}/HELP.md`;
                const exists = await this.app.vault.adapter.exists(helpPath);
                if (exists) {
                    markdown = await this.app.vault.adapter.read(helpPath);
                }
            }
        } catch {
            // fall through to fallback
        }

        if (!markdown) {
            container.createEl('p', {
                text: 'Could not load HELP.md. Make sure the file is in the StoryLine plugin folder.',
                cls: 'storyline-help-error',
            });
            return;
        }

        // Wrapper for rendered content
        const content = container.createDiv('storyline-help-content markdown-rendered');

        // Use Obsidian's MarkdownRenderer to get native styling
        await MarkdownRenderer.render(
            this.app,
            markdown,
            content,
            '',
            this.renderComponent,
        );

        // Make internal anchor links scroll within the pane
        content.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (!href) return;
                const targetId = href.slice(1);
                // Obsidian's renderer creates heading IDs from the heading text
                const target = content.querySelector(`[data-heading="${this.headingToDataAttr(targetId)}"]`)
                    || content.querySelector(`#${CSS.escape(targetId)}`);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    /**
     * Convert a URL-fragment slug back to the heading text format
     * Obsidian uses for data-heading attributes.
     * e.g. "board-view" → "Board View"
     */
    private headingToDataAttr(slug: string): string {
        return slug
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }
}
