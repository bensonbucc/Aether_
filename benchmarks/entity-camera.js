// Compares active Entity.camera() selfie construction with the saved baseline.
// Run: node --expose-gc benchmarks/entity-camera.js
const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");
const Before = require("../server/game/entities/entity.js.before-performance-overhaul-20261007").Entity;
const After = require("../server/game/entities/entity.js").Entity;

global.lazyRealSizes = Array.from({ length: 16 }, (_, index) => 1 + index / 10);
global.Config = { growth: false, level_cap: 45, growth_wall_clearance_ratio: 0 };
global.gameManager = { room: { tileWidth: 0, width: 10000 } };

function makeActor(EntityType, index) {
    const actor = Object.create(EntityType.prototype);
    actor.SIZE = 20 + index % 10;
    actor.coreSize = actor.SIZE;
    actor.sizeMultiplier = 1;
    actor.turrets = new Map();
    actor.props = new Map();
    actor.guns = new Map();
    actor.settings = { drawHealth: false, connectChildrenOnCamera: false };
    actor.type = "food";
    actor.layerID = 0;
    actor.bond = null;
    actor.shape = index % 8;
    actor.skill = { score: index * 10, level: 1 };
    actor.incognito = false;
    actor.health = { display: () => 1 };
    actor.shield = { display: () => 0 };
    actor.velocity = { x: index % 3, y: index % 5 };
    actor.alpha = 1;
    actor.facing = index / 100;
    actor.vfacing = actor.facing;
    actor.facingType = "withMotion";
    actor.eastereggs = { braindamage: false };
    actor.control = { alt: false };
    actor.syncWithTank = false;
    actor.color = { compiled: "#ffffff" };
    actor.borderless = false;
    actor.drawFill = true;
    actor.nameColor = "#ffffff";
    actor.name = `fixture-${index}`;
    actor.children = [];
    actor.bulletchildren = [];
    if (index % 7 === 0) {
        actor.settings.connectChildrenOnCamera = true;
        actor.children.push({ x: index + 2, y: index + 3 });
        actor.bulletchildren.push({ x: index + 4, y: index + 5 });
        actor.turrets.set(0, { bound: { layer: 2 }, camera: () => ({ index: "turret", turrets: [] }) });
        actor.props.set(0, { bound: { layer: 1 }, camera: () => ({ index: "prop", turrets: [] }) });
    }
    if (index % 5 === 0) {
        actor.guns.set(0, { getPhotoInfo: () => ({ angle: index / 10, length: 20, color: "#fff" }) });
        actor.guns.set(1, { getPhotoInfo: () => ({ angle: index / 20, length: 10, color: "#000" }) });
    }
    return actor;
}

function run(EntityType, count, sweeps) {
    const actors = Array.from({ length: count }, (_, index) => makeActor(EntityType, index));
    for (let i = 0; i < 3; i++) for (const actor of actors) actor.camera();
    if (global.gc) global.gc();
    const heapBefore = process.memoryUsage().heapUsed;
    const durations = [];
    let checksum = 0;
    for (let sweep = 0; sweep < sweeps; sweep++) {
        const start = performance.now();
        for (const actor of actors) {
            const photo = actor.camera();
            checksum += photo.x + photo.y + photo.size + photo.guns.length + photo.turrets.length;
        }
        durations.push(performance.now() - start);
    }
    if (global.gc) global.gc();
    durations.sort((a, b) => a - b);
    return {
        averageSweepMs: Number((durations.reduce((sum, value) => sum + value, 0) / sweeps).toFixed(3)),
        worstSweepMs: Number(durations.at(-1).toFixed(3)),
        heapGrowthAfterGcBytes: process.memoryUsage().heapUsed - heapBefore,
        checksum,
    };
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

function pairedRun(count, sweeps = 10, rounds = 5) {
    const beforeTimes = [], afterTimes = [];
    const beforeWorst = [], afterWorst = [];
    let beforeChecksum, afterChecksum;
    for (let round = 0; round < rounds; round++) {
        const order = round % 2 === 0
            ? [[Before, beforeTimes, beforeWorst], [After, afterTimes, afterWorst]]
            : [[After, afterTimes, afterWorst], [Before, beforeTimes, beforeWorst]];
        for (const [EntityType, averages, worsts] of order) {
            const measured = run(EntityType, count, sweeps);
            averages.push(measured.averageSweepMs);
            worsts.push(measured.worstSweepMs);
            if (EntityType === Before) beforeChecksum = measured.checksum;
            else afterChecksum = measured.checksum;
        }
    }
    assert.equal(afterChecksum, beforeChecksum, "Camera output checksum changed during measured sweeps");
    return {
        before: { medianSweepMs: median(beforeTimes), medianWorstSweepMs: median(beforeWorst) },
        after: { medianSweepMs: median(afterTimes), medianWorstSweepMs: median(afterWorst) },
        changePercent: Number(((median(afterTimes) / median(beforeTimes) - 1) * 100).toFixed(1)),
    };
}

const results = [];
for (const count of [100, 200, 500, 750, 1000]) {
    const beforePhoto = makeActor(Before, count).camera();
    const afterPhoto = makeActor(After, count).camera();
    assert.deepStrictEqual(afterPhoto, beforePhoto, `Camera output changed for fixture ${count}`);
    results.push({ entities: count, ...pairedRun(count) });
}
console.log(JSON.stringify({
    benchmark: "entity-camera-selfie-construction",
    node: process.version,
    behaviorEquivalent: true,
    sweepsPerRound: 10,
    pairedRounds: 5,
    results,
}, null, 2));
