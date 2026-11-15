import type { Character, CharacterRelation } from '../models/Character';
import { inferCategoryForType } from '../models/Character';
import type { CodexEntry } from '../models/Codex';
import { normalizeEntityRelations } from '../models/EntityRelation';
import type { CharacterManager } from './CharacterManager';
import type { CodexManager } from './CodexManager';
import { Notice } from 'obsidian';

export type RelationshipEntity = Character | CodexEntry;

function makeId(): string {
    return globalThis.crypto.randomUUID();
}

function getEntityRelations(entity: RelationshipEntity): CharacterRelation[] {
    return normalizeEntityRelations(entity.relations);
}

function relationKey(relation: CharacterRelation): string {
    return relation.relationId || `${relation.targetId || relation.target.toLowerCase()}|${relation.category}|${relation.type}`;
}

function inverseType(relation: CharacterRelation): string {
    return relation.inverseType || relation.type;
}

export class EntityRelationshipService {
    constructor(
        private readonly characterManager: CharacterManager,
        private readonly codexManager: CodexManager,
    ) {}

    getEntities(): RelationshipEntity[] {
        const entities = [
            ...this.characterManager.getAllCharactersForRelationships(),
            ...this.codexManager.getAllEntries(),
        ];
        return Array.from(new Map(entities.map(entity => [entity.filePath, entity])).values());
    }

    getDisplayLabels(entities: RelationshipEntity[]): Map<string, string> {
        const nameCounts = new Map<string, number>();
        for (const entity of entities) {
            const name = entity.name.toLowerCase();
            nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
        }

        const labels = new Map(entities.map(entity => {
            const category = entity.type === 'character'
                ? 'Characters'
                : this.codexManager.getCategoryDef(entity.type)?.label || entity.type;
            const basename = entity.filePath.split('/').pop()?.replace(/\.md$/i, '') ?? entity.filePath;
            const name = nameCounts.get(entity.name.toLowerCase())! > 1
                ? `${entity.name} (${basename})`
                : entity.name;
            return [entity.filePath, `${category}: ${name}`];
        }));
        const labelCounts = new Map<string, number>();
        for (const label of labels.values()) {
            labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
        }
        for (const entity of entities) {
            const label = labels.get(entity.filePath)!;
            if (labelCounts.get(label)! > 1) labels.set(entity.filePath, `${label} (${entity.filePath})`);
        }
        return labels;
    }

    getEntityById(entityId: string): RelationshipEntity | undefined {
        const matches = this.getEntities().filter(entity => entity.entityId === entityId);
        return matches.length === 1 ? matches[0] : undefined;
    }

    getTarget(relation: CharacterRelation): RelationshipEntity | undefined {
        if (!relation.targetId) return undefined;
        const target = this.getEntityById(relation.targetId);
        return target && (!relation.targetType || target.type === relation.targetType) ? target : undefined;
    }

    async setTarget(
        source: RelationshipEntity,
        relation: CharacterRelation,
        target: RelationshipEntity,
    ): Promise<void> {
        if (source.filePath === target.filePath) return;
        await this.ensureEntityId(source);
        relation.targetId = await this.ensureEntityId(target);
        relation.targetType = target.type;
        relation.target = target.name;
        relation.relationId ||= makeId();
    }

    async prepareRelations(entity: RelationshipEntity): Promise<CharacterRelation[]> {
        const relations = getEntityRelations(entity);
        if (relations.some(relation => relation.targetId)) {
            await this.ensureEntityId(entity);
            for (const relation of relations) {
                if (!relation.targetId) continue;
                const target = this.getTarget(relation);
                if (target) {
                    relation.target = target.name;
                    relation.targetType = target.type;
                }
                relation.relationId ||= makeId();
            }
        }
        return relations;
    }

    async syncChanges(
        source: RelationshipEntity,
        oldRelations: CharacterRelation[],
        newRelations: CharacterRelation[],
    ): Promise<void> {
        const oldMap = new Map(oldRelations.filter(relation => relation.targetId).map(relation => [relationKey(relation), relation]));
        const newMap = new Map(newRelations.filter(relation => relation.targetId).map(relation => [relationKey(relation), relation]));
        const targetIds = new Set<string>();

        for (const oldRelation of oldMap.values()) {
            const next = newMap.get(relationKey(oldRelation));
            if (oldRelation.twoWay === false) continue;
            if (!next || next.targetId !== oldRelation.targetId || next.twoWay === false || inverseType(next) !== inverseType(oldRelation) || next.type !== oldRelation.type) {
                const target = this.getEntityById(oldRelation.targetId!);
                if (!target || target.filePath === source.filePath || (oldRelation.targetType && target.type !== oldRelation.targetType)) continue;
                targetIds.add(oldRelation.targetId!);
            }
        }
        for (const next of newMap.values()) {
            if (next.twoWay !== false) {
                const target = this.getEntityById(next.targetId!);
                if (!target || target.filePath === source.filePath || (next.targetType && target.type !== next.targetType)) continue;
                targetIds.add(next.targetId!);
            }
        }

        if (targetIds.size === 0) return;
        await this.ensureEntityId(source);

        for (const targetId of targetIds) {
            const target = this.getEntityById(targetId);
            if (!target || target.filePath === source.filePath) continue;
            const relations = getEntityRelations(target);
            let changed = false;

            for (const [key, oldRelation] of oldMap) {
                if (oldRelation.targetId !== targetId || oldRelation.twoWay === false) continue;
                const next = newMap.get(key);
                if (next && next.targetId === oldRelation.targetId && next.twoWay !== false && inverseType(next) === inverseType(oldRelation) && next.type === oldRelation.type) continue;
                const reciprocalType = inverseType(oldRelation);
                const index = relations.findIndex(relation => this.isReciprocalOf(relation, oldRelation, source, target, reciprocalType));
                if (index >= 0) {
                    relations.splice(index, 1);
                    changed = true;
                }
            }

            for (const next of newMap.values()) {
                if (next.targetId !== targetId || next.twoWay === false) continue;
                if (next.targetType && target.type !== next.targetType) continue;
                const reciprocal = this.makeReciprocal(next, source);
                const index = relations.findIndex(relation => this.isReciprocalOf(relation, next, source, target, reciprocal.type));
                if (index >= 0) {
                    if (JSON.stringify(relations[index]) !== JSON.stringify(reciprocal)) {
                        relations[index] = reciprocal;
                        changed = true;
                    }
                } else {
                    relations.push(reciprocal);
                    changed = true;
                }
            }

            if (changed) {
                target.relations = normalizeEntityRelations(relations);
                try {
                    await this.saveEntity(target);
                } catch (error) {
                    new Notice('The relationship was saved, but its reciprocal link could not be updated. Save again to retry.');
                    throw error;
                }
            }
        }
    }

    private makeReciprocal(relation: CharacterRelation, source: RelationshipEntity): CharacterRelation {
        const type = inverseType(relation);
        const inferredCategory = inferCategoryForType(type);
        return {
            category: inferredCategory === 'custom' ? relation.category : inferredCategory,
            type,
            target: source.name,
            targetId: source.entityId,
            targetType: source.type,
            relationId: relation.relationId,
            inverseType: relation.type,
        };
    }

    private isReciprocalOf(
        candidate: CharacterRelation,
        relation: CharacterRelation,
        source: RelationshipEntity,
        target: RelationshipEntity,
        reciprocalType: string,
    ): boolean {
        if (relation.relationId && candidate.relationId === relation.relationId) return true;
        return candidate.type === reciprocalType && (
            candidate.targetId === source.entityId
            || (source.type === 'character' && target.type === 'character'
                && !candidate.targetId && candidate.target.toLowerCase() === source.name.toLowerCase())
        );
    }

    private async ensureEntityId(entity: RelationshipEntity): Promise<string> {
        if (entity.entityId) {
            const matches = this.getEntities().filter(candidate => candidate.entityId === entity.entityId);
            if (matches.length > 1) {
                new Notice(`Cannot link to "${entity.name}" because its entity ID is duplicated.`);
                throw new Error(`Duplicate entity ID: ${entity.entityId}`);
            }
            return entity.entityId;
        }
        entity.entityId = makeId();
        await this.saveEntity(entity);
        return entity.entityId;
    }

    private async saveEntity(entity: RelationshipEntity): Promise<void> {
        if (entity.type === 'character') {
            await this.characterManager.saveCharacter(entity as Character);
        } else {
            await this.codexManager.saveEntry(entity as CodexEntry);
        }
    }
}