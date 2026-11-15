import { Modal, Notice, Setting, TFile, normalizePath, setIcon } from 'obsidian';
import type SceneCardsPlugin from '../main';
import type { EntityReference } from '../services/LinkScanner';
import { hydrateUniversalFieldsFromTopLevel, mirrorUniversalFieldsToTopLevel } from '../services/FieldTemplateService';
import { CUSTOM_SECTION_KEY_SEP, normalizeField, type CustomSection } from './CustomSectionsRenderer';

type EntityKind = 'character' | 'location' | 'codex';
type FieldKind = 'universal' | 'custom';

interface RelationField {
    label: string;
    kind: FieldKind;
    key: string;
    type: 'dropdown' | 'multi-select';
    folderSource: string;
}

interface RelationSource {
    name: string;
    filePath: string;
    kind: EntityKind;
    categoryId: string;
    categoryLabel: string;
}

interface EntityReferencesPanelOptions {
    container: HTMLElement;
    plugin: SceneCardsPlugin;
    entityName: string;
    entityPath: string;
    panelClass: string;
    onOpenReference: (reference: EntityReference) => void;
    onRefresh: () => void;
}

function folderContains(folderSource: string, filePath: string): boolean {
    const folder = normalizePath(folderSource).replace(/^\/+|\/+$/g, '');
    return !!folder && normalizePath(filePath).startsWith(`${folder}/`);
}

function getRelationSources(plugin: SceneCardsPlugin): RelationSource[] {
    const sources: RelationSource[] = [
        ...plugin.characterManager.getAllCharacters().map(character => ({
            name: character.name, filePath: character.filePath, kind: 'character' as const,
            categoryId: 'character', categoryLabel: 'Character',
        })),
        ...plugin.locationManager.getAllLocations().map(location => ({
            name: location.name, filePath: location.filePath, kind: 'location' as const,
            categoryId: 'location', categoryLabel: 'Location',
        })),
        ...plugin.locationManager.getAllWorlds().map(world => ({
            name: world.name, filePath: world.filePath, kind: 'location' as const,
            categoryId: 'location', categoryLabel: 'World',
        })),
        ...plugin.codexManager.getAllEntries().map(entry => ({
            name: entry.name, filePath: entry.filePath, kind: 'codex' as const,
            categoryId: entry.type,
            categoryLabel: plugin.codexManager.getCategoryDef(entry.type)?.label ?? entry.type,
        })),
    ];
    const uniqueSources = new Map<string, RelationSource>();
    for (const source of sources) uniqueSources.set(normalizePath(source.filePath), source);
    return Array.from(uniqueSources.values());
}

function getCustomSections(plugin: SceneCardsPlugin, source: RelationSource): CustomSection[] {
    const sections = source.kind === 'character'
        ? plugin.settings.characterCustomSections
        : source.kind === 'location'
            ? plugin.settings.locationCustomSections
            : plugin.settings.codexCategoryCustomSections?.[source.categoryId];
    return (sections ?? []) as CustomSection[];
}

function getRelationFields(plugin: SceneCardsPlugin, source: RelationSource, targetPath: string): RelationField[] {
    const fields: RelationField[] = [];
    for (const template of plugin.fieldTemplates.getAll()) {
        if ((template.category || 'character') !== source.categoryId
            || template.linkTarget !== 'folder'
            || !template.folderSource
            || (template.type !== 'dropdown' && template.type !== 'multi-select')
            || !folderContains(template.folderSource, targetPath)) continue;
        fields.push({ label: template.label, kind: 'universal', key: template.id, type: template.type, folderSource: template.folderSource });
    }
    for (const section of getCustomSections(plugin, source)) {
        for (const field of section.fields) {
            const definition = normalizeField(field);
            if (definition.linkTarget !== 'folder'
                || !definition.folderSource
                || (definition.type !== 'dropdown' && definition.type !== 'multi-select')
                || !folderContains(definition.folderSource, targetPath)) continue;
            fields.push({
                label: `${section.title}: ${definition.name}`, kind: 'custom',
                key: `${section.title}${CUSTOM_SECTION_KEY_SEP}${definition.name}`,
                type: definition.type, folderSource: definition.folderSource,
            });
        }
    }
    return fields;
}

function getTargetName(targetPath: string): string {
    return normalizePath(targetPath).split('/').pop()?.replace(/\.md$/i, '') ?? targetPath;
}

function valueMatchesTarget(value: unknown, targetPath: string, sourcePath: string, plugin: SceneCardsPlugin): boolean {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (!trimmed.startsWith('[[') || !trimmed.endsWith(']]')) return trimmed === getTargetName(targetPath);
    const linkText = trimmed.slice(2, -2).split('|')[0].split('#')[0].trim();
    const resolved = plugin.app.metadataCache.getFirstLinkpathDest(linkText, sourcePath);
    return normalizePath(resolved?.path ?? `${linkText}.md`) === normalizePath(targetPath);
}

function updateValue(
    value: unknown, field: RelationField, targetPath: string, sourcePath: string,
    add: boolean, plugin: SceneCardsPlugin,
): { changed: boolean; value: unknown } {
    const targetLink = `[[${normalizePath(targetPath).replace(/\.md$/i, '')}]]`;
    const values = Array.isArray(value)
        ? value.map(item => String(item))
        : typeof value === 'string' && value.trim() ? [value] : [];
    if (field.type === 'multi-select') {
        if (add) {
            if (values.some(item => valueMatchesTarget(item, targetPath, sourcePath, plugin))) return { changed: false, value };
            return { changed: true, value: [...values, targetLink] };
        }
        const remaining = values.filter(item => !valueMatchesTarget(item, targetPath, sourcePath, plugin));
        return { changed: remaining.length !== values.length, value: remaining };
    }
    if (add) {
        if (values.length === 1 && valueMatchesTarget(values[0], targetPath, sourcePath, plugin)) return { changed: false, value };
        return { changed: true, value: targetLink };
    }
    if (values.length === 1 && valueMatchesTarget(values[0], targetPath, sourcePath, plugin)) return { changed: true, value: undefined };
    return { changed: false, value };
}

async function updateRelation(
    plugin: SceneCardsPlugin, sourcePath: string, targetPath: string, field: RelationField, add: boolean,
): Promise<boolean> {
    const file = plugin.app.vault.getAbstractFileByPath(normalizePath(sourcePath));
    if (!(file instanceof TFile)) return false;
    let changed = false;
    await plugin.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
        if (field.kind === 'universal') {
            const raw = frontmatter.universalFields && typeof frontmatter.universalFields === 'object'
                ? { ...(frontmatter.universalFields as Record<string, unknown>) }
                : {};
            const universal = hydrateUniversalFieldsFromTopLevel(frontmatter, raw) ?? {};
            const result = updateValue(universal[field.key], field, targetPath, sourcePath, add, plugin);
            if (!result.changed) return;
            changed = true;
            if (result.value === undefined || (Array.isArray(result.value) && result.value.length === 0)) delete universal[field.key];
            else universal[field.key] = result.value;
            if (Object.keys(universal).length > 0) frontmatter.universalFields = universal;
            else delete frontmatter.universalFields;
            mirrorUniversalFieldsToTopLevel(frontmatter, universal);
            return;
        }
        const custom = frontmatter.custom && typeof frontmatter.custom === 'object'
            ? { ...(frontmatter.custom as Record<string, unknown>) }
            : {};
        const result = updateValue(custom[field.key], field, targetPath, sourcePath, add, plugin);
        if (!result.changed) return;
        changed = true;
        if (result.value === undefined || (Array.isArray(result.value) && result.value.length === 0)) delete custom[field.key];
        else custom[field.key] = result.value;
        if (Object.keys(custom).length > 0) frontmatter.custom = custom;
        else delete frontmatter.custom;
    });
    return changed;
}

function sourceForReference(plugin: SceneCardsPlugin, reference: EntityReference): RelationSource | undefined {
    return getRelationSources(plugin).find(source => normalizePath(source.filePath) === normalizePath(reference.filePath));
}

function openAddRelationModal(options: EntityReferencesPanelOptions): void {
    const { plugin, entityName, entityPath } = options;
    const candidates = getRelationSources(plugin)
        .filter(source => normalizePath(source.filePath) !== normalizePath(entityPath))
        .map(source => ({ source, fields: getRelationFields(plugin, source, entityPath) }))
        .filter(candidate => candidate.fields.length > 0);
    if (candidates.length === 0) {
        new Notice('No linked fields can target this entry.');
        return;
    }
    const modal = new Modal(plugin.app);
    modal.titleEl.setText('Add linked relationship');
    modal.contentEl.createEl('p', {
        cls: 'setting-item-description',
        text: `Choose an entity and field that should link to "${entityName}".`,
    });
    const sourceSelect = modal.contentEl.createEl('select', { cls: 'codex-relation-modal-select' });
    for (const candidate of candidates) {
        sourceSelect.createEl('option', {
            text: `${candidate.source.name} (${candidate.source.categoryLabel}) — ${candidate.source.filePath}`,
            value: candidate.source.filePath,
        });
    }
    const fieldSelect = modal.contentEl.createEl('select', { cls: 'codex-relation-modal-select' });
    const renderFields = () => {
        fieldSelect.empty();
        const candidate = candidates.find(item => item.source.filePath === sourceSelect.value);
        for (const field of candidate?.fields ?? []) {
            fieldSelect.createEl('option', { text: `${field.label} (${field.type})`, value: `${field.kind}:${field.key}` });
        }
    };
    sourceSelect.addEventListener('change', renderFields);
    renderFields();
    new Setting(modal.contentEl)
        .addButton(button => button.setButtonText('Add link').setCta().onClick(async () => {
            const candidate = candidates.find(item => item.source.filePath === sourceSelect.value);
            const field = candidate?.fields.find(item => `${item.kind}:${item.key}` === fieldSelect.value);
            if (!candidate || !field) return;
            const changed = await updateRelation(plugin, candidate.source.filePath, entityPath, field, true);
            if (!changed) {
                new Notice('That relationship already exists.');
                return;
            }
            modal.close();
            await plugin.reloadEntities();
            options.onRefresh();
        }))
        .addButton(button => button.setButtonText('Cancel').onClick(() => modal.close()));
    modal.open();
}

export function renderEntityReferencesPanel(options: EntityReferencesPanelOptions): void {
    const { container, plugin, entityPath, panelClass } = options;
    const references = plugin.linkScanner.buildEntityPathIndex().get(normalizePath(entityPath)) ?? [];
    const section = container.createDiv(panelClass);
    const header = section.createDiv('codex-references-header');
    header.createEl('h3', { text: 'Referenced by' });
    const addButton = header.createEl('button', {
        cls: 'codex-reference-add-btn clickable-icon',
        attr: { 'aria-label': 'Add linked relationship', title: 'Add linked relationship' },
    });
    setIcon(addButton, 'link-2');
    addButton.addEventListener('click', () => openAddRelationModal(options));

    if (references.length === 0) {
        section.createEl('p', { cls: 'codex-references-empty', text: 'No linked entities yet.' });
        return;
    }
    const groups: Record<string, EntityReference[]> = {};
    for (const reference of references) {
        const label = reference.type === 'codex' && reference.codexCategory
            ? plugin.codexManager.getCategoryDef(reference.codexCategory)?.label ?? reference.codexCategory
            : reference.type;
        if (!groups[label]) groups[label] = [];
        groups[label].push(reference);
    }
    for (const [groupLabel, groupReferences] of Object.entries(groups)) {
        const group = section.createDiv('reference-group');
        group.createEl('h4', { text: groupLabel.charAt(0).toUpperCase() + groupLabel.slice(1) });
        const list = group.createEl('ul', { cls: 'reference-list' });
        for (const reference of groupReferences) {
            const item = list.createEl('li', { cls: 'reference-item' });
            const link = item.createEl('a', { text: reference.name, cls: 'reference-link' });
            link.addEventListener('click', event => {
                event.preventDefault();
                options.onOpenReference(reference);
            });
            const source = sourceForReference(plugin, reference);
            const fields = source ? getRelationFields(plugin, source, entityPath) : [];
            if (fields.length === 0) continue;
            const removeButton = item.createEl('button', {
                cls: 'codex-reference-remove-btn clickable-icon',
                attr: { 'aria-label': `Remove link from ${reference.name}`, title: 'Remove relationship' },
            });
            setIcon(removeButton, 'unlink');
            removeButton.addEventListener('click', () => {
                void (async () => {
                    let changed = false;
                    for (const field of fields) {
                        changed = await updateRelation(plugin, reference.filePath, entityPath, field, false) || changed;
                    }
                    if (!changed) return;
                    await plugin.reloadEntities();
                    options.onRefresh();
                })();
            });
        }
    }
}