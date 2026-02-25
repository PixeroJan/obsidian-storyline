import { Modal, Setting, Notice } from 'obsidian';
import { Scene, STATUS_ORDER, STATUS_CONFIG, SceneStatus } from '../models/Scene';
import type SceneCardsPlugin from '../main';

// ────────────────────────────────────────────────────────
//  Split Scene Modal
// ────────────────────────────────────────────────────────

/**
 * Modal that lets the user place a split point in a scene's body text
 * and provide titles for the two resulting scenes.
 */
export class SplitSceneModal extends Modal {
    private plugin: SceneCardsPlugin;
    private scene: Scene;
    private onDone: () => void;

    private splitOffset = 0;
    private titleA: string;
    private titleB: string;
    private textAreaEl: HTMLTextAreaElement | null = null;
    private previewEl: HTMLElement | null = null;

    constructor(plugin: SceneCardsPlugin, scene: Scene, onDone: () => void) {
        super(plugin.app);
        this.plugin = plugin;
        this.scene = scene;
        this.onDone = onDone;
        this.titleA = scene.title || 'Untitled';
        this.titleB = `${scene.title || 'Untitled'} (part 2)`;
    }

    onOpen(): void {
        const { contentEl } = this;
        this.titleEl.setText('Split Scene');
        contentEl.addClass('storyline-split-modal');

        const body = this.scene.body || '';
        if (!body.trim()) {
            contentEl.createEl('p', { text: 'This scene has no body text to split.' });
            new Setting(contentEl).addButton(btn =>
                btn.setButtonText('Close').onClick(() => this.close())
            );
            return;
        }

        // Info
        contentEl.createEl('p', {
            text: 'Click in the text below to place the split point. Everything above the marker becomes Scene A, everything below becomes Scene B.',
            cls: 'setting-item-description',
        });

        // Titles
        new Setting(contentEl)
            .setName('Scene A title')
            .addText(text => {
                text.setValue(this.titleA);
                text.onChange(v => (this.titleA = v));
            });
        new Setting(contentEl)
            .setName('Scene B title')
            .addText(text => {
                text.setValue(this.titleB);
                text.onChange(v => (this.titleB = v));
            });

        // Text area for split placement
        const label = contentEl.createEl('div', {
            cls: 'setting-item-name',
            text: 'Click to place split point:',
        });
        label.style.marginBottom = '6px';

        this.textAreaEl = contentEl.createEl('textarea', {
            cls: 'storyline-split-textarea',
        });
        this.textAreaEl.value = body;
        this.textAreaEl.readOnly = true;
        this.textAreaEl.style.width = '100%';
        this.textAreaEl.style.height = '250px';
        this.textAreaEl.style.fontFamily = 'var(--font-monospace)';
        this.textAreaEl.style.fontSize = '13px';
        this.textAreaEl.style.resize = 'vertical';

        // Default split at midpoint (nearest paragraph break)
        const mid = Math.floor(body.length / 2);
        const parBreak = body.indexOf('\n\n', mid);
        this.splitOffset = parBreak >= 0 ? parBreak : mid;

        this.textAreaEl.addEventListener('click', () => {
            if (this.textAreaEl) {
                this.splitOffset = this.textAreaEl.selectionStart;
                this.updatePreview(body);
            }
        });

        // Preview
        this.previewEl = contentEl.createDiv('storyline-split-preview');
        this.updatePreview(body);

        // Buttons
        new Setting(contentEl)
            .addButton(btn => {
                btn.setButtonText('Split').setCta().onClick(async () => {
                    if (this.splitOffset <= 0 || this.splitOffset >= body.length) {
                        new Notice('Split point must be within the text');
                        return;
                    }
                    try {
                        await this.plugin.sceneManager.splitScene(
                            this.scene.filePath,
                            this.splitOffset,
                            this.titleA.trim() || undefined,
                            this.titleB.trim() || undefined,
                        );
                        this.close();
                        this.onDone();
                    } catch (err) {
                        new Notice('Split failed: ' + String(err));
                    }
                });
            })
            .addButton(btn => {
                btn.setButtonText('Cancel').onClick(() => this.close());
            });
    }

    private updatePreview(body: string): void {
        if (!this.previewEl) return;
        this.previewEl.empty();

        const partA = body.substring(0, this.splitOffset).trim();
        const partB = body.substring(this.splitOffset).trim();
        const wordCountA = partA ? partA.split(/\s+/).length : 0;
        const wordCountB = partB ? partB.split(/\s+/).length : 0;

        this.previewEl.createEl('div', {
            text: `Scene A: ~${wordCountA} words  |  Scene B: ~${wordCountB} words`,
            cls: 'setting-item-description',
        });

        // Highlight the cursor position in the textarea
        if (this.textAreaEl) {
            this.textAreaEl.setSelectionRange(this.splitOffset, this.splitOffset);
            this.textAreaEl.focus();
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }
}

// ────────────────────────────────────────────────────────
//  Merge Scenes Modal
// ────────────────────────────────────────────────────────

/**
 * Modal that shows a preview of merging 2+ scenes, highlighting
 * metadata conflicts and letting the user confirm or adjust the title.
 */
export class MergeSceneModal extends Modal {
    private plugin: SceneCardsPlugin;
    private scenes: Scene[];
    private onDone: () => void;
    private mergedTitle: string;

    constructor(plugin: SceneCardsPlugin, scenes: Scene[], onDone: () => void) {
        super(plugin.app);
        this.plugin = plugin;
        this.scenes = scenes;
        this.onDone = onDone;
        this.mergedTitle = scenes[0]?.title || 'Merged Scene';
    }

    onOpen(): void {
        const { contentEl } = this;
        this.titleEl.setText('Merge Scenes');
        contentEl.addClass('storyline-merge-modal');

        if (this.scenes.length < 2) {
            contentEl.createEl('p', { text: 'Select at least 2 scenes to merge.' });
            new Setting(contentEl).addButton(btn =>
                btn.setButtonText('Close').onClick(() => this.close())
            );
            return;
        }

        // List scenes being merged
        contentEl.createEl('p', {
            text: `Merging ${this.scenes.length} scenes (in sequence order). The first scene's file will be kept.`,
            cls: 'setting-item-description',
        });

        const list = contentEl.createEl('ol', { cls: 'storyline-merge-scene-list' });
        for (const s of this.scenes) {
            const li = list.createEl('li');
            li.createEl('strong', { text: s.title || 'Untitled' });
            li.createSpan({ text: ` — ${s.wordcount ?? 0} words, status: ${STATUS_CONFIG[s.status as SceneStatus]?.label || s.status}` });
        }

        // Title
        new Setting(contentEl)
            .setName('Merged scene title')
            .addText(text => {
                text.setValue(this.mergedTitle);
                text.onChange(v => (this.mergedTitle = v));
            });

        // Metadata conflict preview
        const conflicts = this.detectConflicts();
        if (conflicts.length > 0) {
            const conflictSection = contentEl.createDiv('storyline-merge-conflicts');
            conflictSection.createEl('h4', { text: 'Metadata differences (will be resolved automatically):' });
            const ul = conflictSection.createEl('ul');
            for (const c of conflicts) {
                ul.createEl('li', { text: c });
            }
        }

        // Combined word count
        const totalWords = this.scenes.reduce((sum, s) => sum + (s.wordcount ?? 0), 0);
        contentEl.createEl('p', {
            text: `Combined word count: ~${totalWords.toLocaleString()}`,
            cls: 'setting-item-description',
        });

        // Buttons
        new Setting(contentEl)
            .addButton(btn => {
                btn.setButtonText('Merge').setCta().onClick(async () => {
                    try {
                        const paths = this.scenes.map(s => s.filePath);
                        await this.plugin.sceneManager.mergeScenes(paths, this.mergedTitle.trim() || undefined);
                        this.close();
                        this.onDone();
                    } catch (err) {
                        new Notice('Merge failed: ' + String(err));
                    }
                });
            })
            .addButton(btn => {
                btn.setButtonText('Cancel').onClick(() => this.close());
            });
    }

    /**
     * Detect any metadata differences between the scenes being merged
     * and describe how they'll be resolved.
     */
    private detectConflicts(): string[] {
        const conflicts: string[] = [];
        const scenes = this.scenes;
        const primary = scenes[0];

        // POV
        const povs = [...new Set(scenes.map(s => s.pov).filter(Boolean))];
        if (povs.length > 1) {
            conflicts.push(`POV differs (${povs.join(', ')}) → keeping "${primary.pov}"`);
        }

        // Location
        const locs = [...new Set(scenes.map(s => s.location).filter(Boolean))];
        if (locs.length > 1) {
            conflicts.push(`Locations differ (${locs.join(', ')}) → combining as "${locs.join(', ')}"`);
        }

        // Status
        const statuses = [...new Set(scenes.map(s => s.status).filter(Boolean))];
        if (statuses.length > 1) {
            const lowest = statuses.reduce((lo, s) => {
                const iC = STATUS_ORDER.indexOf(s as any) ?? 99;
                const iL = STATUS_ORDER.indexOf(lo as any) ?? 99;
                return iC < iL ? s : lo;
            });
            conflicts.push(`Status differs (${statuses.join(', ')}) → using lowest: "${lowest}"`);
        }

        // Act
        const acts = [...new Set(scenes.map(s => s.act).filter(a => a !== undefined))];
        if (acts.length > 1) {
            conflicts.push(`Acts differ (${acts.join(', ')}) → keeping Act ${primary.act}`);
        }

        // Chapter
        const chapters = [...new Set(scenes.map(s => s.chapter).filter(c => c !== undefined))];
        if (chapters.length > 1) {
            conflicts.push(`Chapters differ (${chapters.join(', ')}) → keeping Chapter ${primary.chapter}`);
        }

        return conflicts;
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
