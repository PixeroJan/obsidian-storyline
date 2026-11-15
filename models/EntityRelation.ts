export type EntityRelationCategory =
    | 'family'
    | 'romantic'
    | 'social'
    | 'conflict'
    | 'guidance'
    | 'professional'
    | 'story'
    | 'custom';

export interface EntityRelation {
    category: EntityRelationCategory;
    type: string;
    target: string;
    targetId?: string;
    targetType?: string;
    relationId?: string;
    inverseType?: string;
    twoWay?: boolean;
}

const RELATION_CATEGORIES = new Set<EntityRelationCategory>([
    'family', 'romantic', 'social', 'conflict', 'guidance', 'professional', 'story', 'custom',
]);

function normalizedType(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '-');
}

export function normalizeEntityRelations(raw: unknown): EntityRelation[] {
    if (!Array.isArray(raw)) return [];
    const result: EntityRelation[] = [];
    const seen = new Set<string>();

    for (const value of raw) {
        if (!value || typeof value !== 'object') continue;
        const relation = value as Record<string, unknown>;
        if (typeof relation.type !== 'string' || typeof relation.target !== 'string') continue;

        const target = relation.target.trim();
        const type = normalizedType(relation.type);
        if (!target || !type) continue;

        const rawCategory = typeof relation.category === 'string' ? relation.category : 'custom';
        const category = RELATION_CATEGORIES.has(rawCategory as EntityRelationCategory)
            ? rawCategory as EntityRelationCategory
            : 'custom';
        const targetId = typeof relation.targetId === 'string' ? relation.targetId.trim() : '';
        const targetType = typeof relation.targetType === 'string' ? relation.targetType.trim() : '';
        const relationId = typeof relation.relationId === 'string' ? relation.relationId.trim() : '';
        const inverseType = typeof relation.inverseType === 'string' ? normalizedType(relation.inverseType) : '';
        const key = `${category}|${type}|${targetId || target.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        result.push({
            category,
            type,
            target,
            ...(targetId ? { targetId } : {}),
            ...(targetType ? { targetType } : {}),
            ...(relationId ? { relationId } : {}),
            ...(inverseType ? { inverseType } : {}),
            ...(relation.twoWay === false ? { twoWay: false } : {}),
        });
    }

    return result;
}

export function mergeEntityRelations(
    baseRaw: unknown,
    editedRaw: unknown,
    latestRaw: unknown,
): EntityRelation[] {
    const base = normalizeEntityRelations(baseRaw);
    const edited = normalizeEntityRelations(editedRaw);
    const latest = normalizeEntityRelations(latestRaw);
    const keyOf = (relation: EntityRelation): string =>
        relation.relationId || `${relation.targetId || relation.target.toLowerCase()}|${relation.category}|${relation.type}`;
    const baseByKey = new Map(base.map(relation => [keyOf(relation), relation]));
    const editedByKey = new Map(edited.map(relation => [keyOf(relation), relation]));
    const merged = new Map(latest.map(relation => [keyOf(relation), relation]));

    for (const [key, baseRelation] of baseByKey) {
        const editedRelation = editedByKey.get(key);
        if (!editedRelation) {
            merged.delete(key);
        } else if (JSON.stringify(editedRelation) !== JSON.stringify(baseRelation)) {
            merged.set(key, editedRelation);
        }
    }
    for (const [key, editedRelation] of editedByKey) {
        if (!baseByKey.has(key)) merged.set(key, editedRelation);
    }

    return normalizeEntityRelations(Array.from(merged.values()));
}