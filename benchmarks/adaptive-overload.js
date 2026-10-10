// Verifies adaptive overload hysteresis without starting a game server.
// Run: node benchmarks/adaptive-overload.js
global.Config = { dev_build: false };
global.gameManager = { overloadLevel: 0 };
const { speedcheckloop } = require("../server/game/debug/speedLoop.js");
const monitor = new speedcheckloop();
const target = 1000 / 30;
const feed = (tickRatio, cpu, lag, count = 1, bots = 100) => {
    for (let i = 0; i < count; i++) {
        monitor.updateOverloadState(target * tickRatio, target, cpu, lag, bots);
    }
};
const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

feed(1.6, 90, 100, 4, 30);
assert(monitor.overloadLevel === 0, "Ordinary bot counts must not activate adaptive throttling.");
feed(1.6, 90, 100, 2);
assert(monitor.overloadLevel === 0, "Overload must remain inactive for isolated/short samples.");
feed(1.6, 90, 100, 1);
assert(monitor.overloadLevel === 1, "Three sustained severe samples should activate one gradual level.");
feed(1.6, 90, 100, 3);
assert(monitor.overloadLevel === 2, "Sustained severe load should ramp one level at a time.");
feed(1.6, 90, 100, 3);
assert(monitor.overloadLevel === 3, "Sustained severe load should reach critical gradually.");
feed(0.75, 50, 20, 20);
assert(monitor.overloadLevel === 3, "Intermediate load must not immediately clear overload.");
feed(0.4, 30, 5, 10);
assert(monitor.overloadLevel === 2, "Ten healthy samples should begin gradual recovery.");
feed(0.4, 30, 5, 20);
assert(monitor.overloadLevel === 0, "Sustained healthy samples should restore normal level.");
console.log(JSON.stringify({
    test: "adaptive-overload-hysteresis",
    passed: true,
    overloadLevels: ["NORMAL", "DEGRADED", "HEAVY LOAD", "CRITICAL LOAD"],
    overloadActivationSamples: 3,
    healthySamplesPerRecoveryStep: 10,
    recoveredLevel: monitor.overloadLevel,
}, null, 2));
