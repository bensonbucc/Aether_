// Compares the checked-in nearestDifferentMaster buildList against its saved
// pre-optimization copy under a deterministic bot/target workload.
// Run: node --expose-gc benchmarks/bot-targeting.js
const { PerformanceObserver, performance } = require("node:perf_hooks");
const Before = require("../server/miscFiles/controllers.js.before-performance-target-list").ioTypes.nearestDifferentMaster;
const After = require("../server/miscFiles/controllers.js").ioTypes.nearestDifferentMaster;
const cpuRead = typeof process.threadCpuUsage === "function"
    ? previous => process.threadCpuUsage(previous)
    : previous => process.cpuUsage(previous);
const cpuScope = typeof process.threadCpuUsage === "function" ? "thread" : "process";

global.TEAM_ROOM = -100;
global.ran = { irandom: () => 0 };
let wallDistanceChecks = 0;
global.walls = [];
global.util = {
    getDistance: (a, b) => {
        wallDistanceChecks++;
        return Math.hypot(a.x - b.x, a.y - b.y);
    },
    getDistanceSquared: (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2,
    getDirection: (a, b) => Math.atan2(b.y - a.y, b.x - a.x),
    angleDifference: (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))),
};

const botsPerScenario = [100, 200, 500, 750, 1000];
const warmupSweeps = 2;
const measuredSweeps = 8;
let gcCount = 0;
let gcDurationMs = 0;
const observer = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
        gcCount++;
        gcDurationMs += entry.duration;
    }
});
observer.observe({ entryTypes: ["gc"] });

function buildActors(count) {
    const targets = new Map();
    for (let i = 0; i < count; i++) {
        const entity = {
            id: i + 2,
            x: (i % 100) * 60 - 3000,
            y: Math.floor(i / 100) * 60 - 300,
            type: "tank",
            team: -1,
            master: null,
            health: { amount: 100 },
            dangerValue: 5,
            alpha: 1,
            invuln: false,
            godmode: false,
            passive: false,
            aiSettings: {},
        };
        entity.master = entity;
        targets.set(entity.id, entity);
    }
    const body = {
        id: 1,
        x: 0,
        y: 0,
        type: "tank",
        team: -2,
        master: null,
        health: { amount: 100 },
        aiSettings: { view360: true, BLIND: false, SKYNET: false },
        firingArc: [0, Math.PI],
        alpha: 1,
    };
    body.master = body;
    return { targets, body };
}

function runScenario(Controller, count) {
    const { targets, body } = buildActors(count);
    global.targetableEntities = targets;
    const controllers = Array.from({ length: count }, () => new Controller(body, { lockThroughWalls: false }));
    wallDistanceChecks = 0;
    const tickDurations = [];
    for (let sweep = 0; sweep < warmupSweeps; sweep++) {
        for (const controller of controllers) controller.buildList(5000);
    }
    if (global.gc) global.gc();
    const heapBefore = process.memoryUsage().heapUsed;
    const cpuBefore = cpuRead();
    const start = performance.now();
    for (let sweep = 0; sweep < measuredSweeps; sweep++) {
        const tickStart = performance.now();
        for (const controller of controllers) controller.buildList(5000);
        tickDurations.push(performance.now() - tickStart);
    }
    const wallMs = performance.now() - start;
    const cpu = cpuRead(cpuBefore);
    const distanceChecks = wallDistanceChecks;
    if (global.gc) global.gc();
    const heapGrowthAfterGcBytes = process.memoryUsage().heapUsed - heapBefore;
    tickDurations.sort((a, b) => a - b);
    return {
        averageFleetScanMs: Number((tickDurations.reduce((a, b) => a + b, 0) / tickDurations.length).toFixed(2)),
        worstFleetScanMs: Number(tickDurations.at(-1).toFixed(2)),
        wallDistanceChecks,
        heapGrowthAfterGcBytes,
        cpuPercentOfOneCore: Number(((cpu.user + cpu.system) / (wallMs * 10)).toFixed(1)),
        distanceChecksPerBotTargetPair: Number((distanceChecks / (count * count * measuredSweeps)).toFixed(2)),
    };
}

function assertBehaviorEquivalent() {
    const { targets, body } = buildActors(40);
    for (const entity of targets.values()) {
        entity.dangerValue = entity.id % 5 === 0 ? 1 : 5;
        if (entity.id % 7 === 0) entity.team = body.team;
        if (entity.id % 11 === 0) entity.invuln = true;
        if (entity.id % 13 === 0) entity.alpha = 0.1;
        if (entity.id % 17 === 0) entity.type = "food";
    }
    global.targetableEntities = targets;
    const cases = [
        { view360: true, farm: false, seeInvisible: true, IGNORE_SHAPES: false, targetLock: 3 },
        { view360: false, farm: false, seeInvisible: true, IGNORE_SHAPES: false, targetLock: 4 },
        { view360: true, farm: true, seeInvisible: false, IGNORE_SHAPES: true, targetLock: 7 },
    ];
    for (const config of cases) {
        Object.assign(body.aiSettings, config);
        body.firingArc = [0.35, 1.25];
        const before = new Before(body, { lockThroughWalls: false });
        const after = new After(body, { lockThroughWalls: false });
        before.targetLock = targets.get(config.targetLock);
        after.targetLock = before.targetLock;
        const beforeIds = before.buildList(5000).map(entity => entity.id);
        const afterIds = after.buildList(5000).map(entity => entity.id);
        if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) {
            throw new Error(`Target candidate mismatch for behavior case ${JSON.stringify(config)}`);
        }
        if ((before.targetLock?.id ?? null) !== (after.targetLock?.id ?? null)) {
            throw new Error(`Target lock mismatch for behavior case ${JSON.stringify(config)}`);
        }
    }
}

assertBehaviorEquivalent();
const results = [];
for (const bots of botsPerScenario) {
    const before = runScenario(Before, bots);
    const after = runScenario(After, bots);
    results.push({
        bots,
        targets: bots,
        before,
        after,
        averageChangePercent: Number(((after.averageFleetScanMs / before.averageFleetScanMs - 1) * 100).toFixed(1)),
    });
}

setImmediate(() => {
    observer.disconnect();
    console.log(JSON.stringify({
        benchmark: "bot-targeting-buildList",
        node: process.version,
        cpuScope,
        behaviorEquivalent: true,
        warmupSweeps,
        measuredSweeps,
        gcCount,
        gcDurationMs: Number(gcDurationMs.toFixed(3)),
        results,
    }, null, 2));
});
