// Benchmarks and behavior-checks the reference-index replacement for the
// entity-map scan in Entity/Bullet/Turret destroy paths.
// Run: node --expose-gc benchmarks/entity-destroy.js
const { performance } = require("node:perf_hooks");
const { referenceBits, trackEntityReference, trackEntityReferences, untrackEntityReferences } = require("../server/game/entities/referenceTracking.js");

global.entityReferenceIndex = new Map();
global.entities = new Map();
global.targetableEntities = new Map();

function makeWorld(total, bacteria = false, registerTarget = true) {
    global.entityReferenceIndex = new Map();
    global.entities = new Map();
    global.targetableEntities = new Map();
    const target = { id: 1, label: bacteria ? "Bacteria" : "Test Tank", settings: {}, master: null, source: null, parent: null, killed: false, kill() { this.killed = true; } };
    target.master = target;
    target.source = target;
    target.parent = target;
    if (registerTarget) global.entities.set(target.id, target);
    if (registerTarget) global.targetableEntities.set(target.id, true);

    for (let id = 2; id <= total; id++) {
        const entity = {
            id,
            settings: { persistsAfterDeath: id % 13 === 0 },
            master: null,
            source: null,
            parent: null,
            parentID: undefined,
            killed: false,
            kill() { this.killed = true; },
        };
        for (const field of ["master", "source", "parent", "parentID"]) {
            Object.defineProperty(entity, field, {
                get() { return this[`_${field}`]; },
                set(value) { trackEntityReference(this, field, value); },
            });
        }
        trackEntityReference(entity, "master", entity);
        trackEntityReference(entity, "source", entity);
        trackEntityReference(entity, "parent", entity);
        if (id % 8 === 0) trackEntityReference(entity, "source", target);
        if (id % 11 === 0) trackEntityReference(entity, "parentID", String(target.id));
        if (id % 14 === 0) trackEntityReference(entity, "parent", target);
        if (id % 17 === 0) trackEntityReference(entity, "master", target);
        global.entities.set(id, entity);
        trackEntityReferences(entity);
        global.targetableEntities.set(id, true);
    }
    return target;
}

function legacyCleanup(target) {
    for (const entity of global.entities.values()) {
        if (entity.source.id === target.id || entity.parentID == target.id) {
            if (entity.settings.persistsAfterDeath) entity.source = entity;
            else if (target.master.label !== "Bacteria") {
                entity.kill();
                global.targetableEntities.delete(entity.id);
            }
        }
        if (entity.parent && entity.parent.id === target.id) entity.parent = null;
        if (entity.master.id === target.id && target.master.label !== "Bacteria") {
            entity.kill();
            entity.master = entity;
            global.targetableEntities.delete(entity.id);
        }
    }
    global.targetableEntities.delete(target.id);
}

function indexedCleanup(target) {
    const dependents = global.entityReferenceIndex.get(target.id);
    if (dependents) for (const [entity, references] of dependents) {
        if (references & (referenceBits.source | referenceBits.parentID)) {
            if (entity.settings.persistsAfterDeath) trackEntityReference(entity, "source", entity);
            else if (target.master.label !== "Bacteria") {
                entity.kill();
                global.targetableEntities.delete(entity.id);
            }
        }
        if (references & referenceBits.parent) trackEntityReference(entity, "parent", null);
        if ((references & referenceBits.master) && target.master.label !== "Bacteria") {
            entity.kill();
            trackEntityReference(entity, "master", entity);
            global.targetableEntities.delete(entity.id);
        }
    }
    global.entityReferenceIndex.delete(target.id);
    untrackEntityReferences(target);
    global.targetableEntities.delete(target.id);
}

function snapshot(total, bacteria, cleanup, registerTarget = true) {
    const target = makeWorld(total, bacteria, registerTarget);
    cleanup(target);
    return [...global.entities.values()].filter(entity => entity !== target).map(entity => [
        entity.id,
        !!entity.killed,
        entity.source.id,
        entity.parent?.id ?? null,
        entity.master.id,
        global.targetableEntities.has(entity.id),
    ]);
}

for (const bacteria of [false, true]) for (const registerTarget of [false, true]) {
    const before = snapshot(500, bacteria, legacyCleanup, registerTarget);
    const after = snapshot(500, bacteria, indexedCleanup, registerTarget);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
        const mismatch = before.findIndex((entry, index) => JSON.stringify(entry) !== JSON.stringify(after[index]));
        throw new Error(`Indexed cleanup differs from legacy semantics (Bacteria=${bacteria}, registerTarget=${registerTarget}) at entity ${mismatch + 1}: ${JSON.stringify(before[mismatch])} vs ${JSON.stringify(after[mismatch])}`);
    }
}

function timeCleanup(total, operation, destructions) {
    const targets = [];
    makeWorld(total);
    for (let id = 1; id <= destructions; id++) targets.push(global.entities.get(id));
    const started = performance.now();
    for (const target of targets) operation(target);
    return Number((performance.now() - started).toFixed(3));
}

const results = [];
for (const total of [1000, 5000, 10000, 20000]) {
    const destructions = Math.min(1000, Math.floor(total / 2));
    const legacyMs = timeCleanup(total, legacyCleanup, destructions);
    const indexedMs = timeCleanup(total, indexedCleanup, destructions);
    results.push({ totalEntities: total, destructions, legacyCleanupMs: legacyMs, indexedCleanupMs: indexedMs });
}

console.log(JSON.stringify({
    benchmark: "entity-destroy-reference-cleanup",
    node: process.version,
    behaviorEquivalent: true,
    results,
}, null, 2));
