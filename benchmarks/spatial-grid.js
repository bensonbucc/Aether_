// Reproducible microbenchmark for the existing broad-phase HashGrid.
// Run: node --expose-gc benchmarks/spatial-grid.js
// Optional: BOTS=500 PROJECTILES_PER_BOT=6 WARMUP_TICKS=10 MEASURE_TICKS=40 node --expose-gc benchmarks/spatial-grid.js
// This deliberately excludes physics resolution, AI, and networking; it is
// intended to compare grid changes under the same deterministic workload.
const { PerformanceObserver, performance } = require("node:perf_hooks");
const HashGrid = require("../server/lib/hashgrid.js");
const cpuRead = typeof process.threadCpuUsage === "function"
    ? previous => process.threadCpuUsage(previous)
    : previous => process.cpuUsage(previous);
const cpuScope = typeof process.threadCpuUsage === "function" ? "thread" : "process";

const botCounts = process.env.BOTS
    ? process.env.BOTS.split(",").map(Number).filter(Number.isFinite)
    : [100, 200, 500, 750, 1000];
const projectilesPerBot = Math.max(0, Number(process.env.PROJECTILES_PER_BOT ?? 6));
const warmupTicks = Math.max(1, Number(process.env.WARMUP_TICKS ?? 10));
const measureTicks = Math.max(1, Number(process.env.MEASURE_TICKS ?? 40));
let gcCount = 0;
let gcDurationMs = 0;
const gcObserver = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
        gcCount++;
        gcDurationMs += entry.duration;
    }
});
gcObserver.observe({ entryTypes: ["gc"] });

function makeEntities(botCount) {
    let seed = 0x4a37 + botCount;
    const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 0x100000000;
    };
    const entities = [];
    const total = botCount * (projectilesPerBot + 1);
    for (let i = 0; i < total; i++) {
        const radius = i < botCount ? 24 : 5;
        const x = random() * 12000 - 6000;
        const y = random() * 12000 - 6000;
        entities.push({
            bond: null,
            minX: x - radius,
            minY: y - radius,
            maxX: x + radius,
            maxY: y + radius,
        });
    }
    return entities;
}

function runTick(grid, entities) {
    grid.clear();
    let candidates = 0;
    for (const entity of entities) {
        candidates += grid.query(entity.minX, entity.minY, entity.maxX, entity.maxY).size;
        grid.insert(entity, entity.minX, entity.minY, entity.maxX, entity.maxY);
    }
    return candidates;
}

const results = [];
for (const botCount of botCounts) {
    const entities = makeEntities(botCount);
    const grid = new HashGrid(7);
    for (let i = 0; i < warmupTicks; i++) runTick(grid, entities);

    if (global.gc) global.gc();
    const heapBefore = process.memoryUsage().heapUsed;
    const cpuBefore = cpuRead();
    const wallStart = performance.now();
    const samples = new Array(measureTicks);
    let candidates = 0;
    for (let i = 0; i < measureTicks; i++) {
        const tickStart = performance.now();
        candidates += runTick(grid, entities);
        samples[i] = performance.now() - tickStart;
    }
    const wallMs = performance.now() - wallStart;
    const cpu = cpuRead(cpuBefore);
    if (global.gc) global.gc();
    const heapAfter = process.memoryUsage().heapUsed;
    samples.sort((a, b) => a - b);
    const averageTickMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    results.push({
        bots: botCount,
        entities: entities.length,
        projectileEntities: entities.length - botCount,
        averageGridTickMs: Number(averageTickMs.toFixed(3)),
        worstGridTickMs: Number(samples[samples.length - 1].toFixed(3)),
        p95GridTickMs: Number(samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))].toFixed(3)),
        simulatedTicksPerSecond: Number((1000 / averageTickMs).toFixed(1)),
        averageReturnedCandidatesPerTick: Number((candidates / measureTicks).toFixed(1)),
        cpuPercentOfOneCore: Number(((cpu.user + cpu.system) / (wallMs * 10)).toFixed(1)),
        heapGrowthAfterGcBytes: heapAfter - heapBefore,
    });
}

setImmediate(() => {
    gcObserver.disconnect();
    console.log(JSON.stringify({
        benchmark: "spatial-grid",
        node: process.version,
        platform: `${process.platform}-${process.arch}`,
        cpuScope,
        projectilesPerBot,
        warmupTicks,
        measureTicks,
        gcCount,
        gcDurationMs: Number(gcDurationMs.toFixed(3)),
        gcMeasured: !!global.gc,
        results,
    }, null, 2));
});
