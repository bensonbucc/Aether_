// Smoke-checks development performance snapshots without starting game workers.
// Run: node benchmarks/performance-monitor.js
global.Config = { dev_build: true, startup_logs: false };
global.entities = new Map();
global.targetableEntities = new Map();
global.util = { warn() {}, error() {} };
const counter = {
    sum: () => 0,
    record: () => ({ sum: 0, average: 0 }),
    getTallyCount: () => 30,
};
global.logs = {
    activation: counter,
    collide: counter,
    entities: counter,
    minimap: counter,
    physics: counter,
    life: counter,
    though: counter,
    selfie: counter,
    network: counter,
    master: counter,
    loops: counter,
};
global.gameManager = {
    name: "performance-benchmark",
    roomSpeed: 1,
    room: { cycleSpeed: 1000 / 30 },
    clients: [],
    parentPort: null,
    socketManager: { broadcast() {} },
    gameHandler: { stop() {} },
};

const { speedcheckloop } = require("../server/game/debug/speedLoop.js");
const monitor = new speedcheckloop();
for (let i = 0; i < 30; i++) monitor.recordTick(8, performance.now());
monitor.recordNetworkBytes(1200);
monitor.recordSerializationTime(1.25);
monitor.recordControllerTime("nearestDifferentMaster", 0.5);
monitor.recordControllerTime("nearestDifferentMaster", 0.25);
monitor.update();
const state = monitor.getPerformanceState();
if (
    state.status !== "NORMAL" ||
    state.ticksPerSecond !== 30 ||
    state.tickSampleCount !== 30 ||
    state.tickAverageMs !== 8 ||
    state.entities !== 0 ||
    state.outboundBytesPerSecond !== 1200 ||
    state.serializationMs !== 1.25 ||
    state.phaseTimesMs.aiThought !== 0 ||
    state.topAiControllers[0]?.name !== "nearestDifferentMaster" ||
    state.topAiControllers[0]?.calls !== 2 ||
    !Number.isFinite(state.threadCpuPercent)
) {
    throw new Error(`Unexpected performance snapshot: ${JSON.stringify(state)}`);
}
monitor.eventLoopDelay?.disable();
monitor.gcObserver?.disconnect();
console.log(JSON.stringify({ test: "performance-monitor-snapshot", passed: true, state }, null, 2));
