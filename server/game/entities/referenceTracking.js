const referenceBits = Object.freeze({
    source: 1,
    parentID: 2,
    parent: 4,
    master: 8,
});
const trackedFields = Object.keys(referenceBits);

function getReferenceId(field, value) {
    if (field === "parentID") {
        if (value == null) return null;
        const number = Number(value);
        return Number.isFinite(number) ? number : value;
    }
    if (value == null || (typeof value !== "object" && typeof value !== "function")) return null;
    return value.id ?? null;
}

function removeReference(entity, field, targetId) {
    const index = global.entityReferenceIndex;
    const dependents = index?.get(targetId);
    if (!dependents) return;
    const remainingBits = (dependents.get(entity) || 0) & ~referenceBits[field];
    if (remainingBits) dependents.set(entity, remainingBits);
    else dependents.delete(entity);
    if (!dependents.size) index.delete(targetId);
}

function trackEntityReference(entity, field, value) {
    const storage = `_${field}`;
    const previousId = getReferenceId(field, entity[storage]);
    const nextId = getReferenceId(field, value);
    entity[storage] = value;
    if (previousId === nextId) return;

    if (previousId != null) removeReference(entity, field, previousId);
    const index = global.entityReferenceIndex;
    // Turrets also carry these properties, but are not entries in `entities`.
    // The old destroy scan only visited registered entities, so never index a
    // turret (or another auxiliary object) as a dependent.
    if (!index || !global.entities?.has(entity.id) || nextId == null || nextId === entity.id) return;

    let dependents = index.get(nextId);
    if (!dependents) index.set(nextId, dependents = new Map());
    dependents.set(entity, (dependents.get(entity) || 0) | referenceBits[field]);
}

function trackEntityReferences(entity) {
    for (const field of trackedFields) {
        const value = entity[`_${field}`];
        trackEntityReference(entity, field, null);
        trackEntityReference(entity, field, value);
    }
}

function untrackEntityReferences(entity) {
    for (const field of trackedFields) {
        const targetId = getReferenceId(field, entity[`_${field}`]);
        if (targetId != null) removeReference(entity, field, targetId);
    }
}

module.exports = { referenceBits, trackEntityReference, trackEntityReferences, untrackEntityReferences };
