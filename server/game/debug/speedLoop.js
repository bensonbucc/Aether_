const { monitorEventLoopDelay, PerformanceObserver } = require("node:perf_hooks");
const MIN_ADAPTIVE_BOT_COUNT = 100;

// This is the checking loop. Runs at 1Hz.
class speedcheckloop {
    constructor() {
        this.fails = 0;
        this.isRestarting = false;
        this.metricsEnabled = Config.dev_build === true;
        this.overloadLevel = 0;
        this.overloadSamples = 0;
        this.healthySamples = 0;
        this.tickSamples = new Float64Array(300);
        this.tickTimestamps = new Float64Array(300);
        this.tickSampleCount = 0;
        this.tickSampleCursor = 0;
        this.networkBytes = 0;
        this.serializationMs = 0;
        this.controllerTimings = new Map();
        this.lastCpuAt = performance.now();
        this.lastCpuUsage = typeof process.threadCpuUsage === "function"
            ? process.threadCpuUsage()
            : process.cpuUsage();
        this.eventLoopDelay = this.metricsEnabled
            ? monitorEventLoopDelay({ resolution: 20 })
            : null;
        this.gcCount = 0;
        this.gcDurationMs = 0;
        this.gcObserver = this.metricsEnabled
            ? new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    this.gcCount++;
                    this.gcDurationMs += entry.duration;
                }
            })
            : null;
        if (this.eventLoopDelay) this.eventLoopDelay.enable();
        if (this.gcObserver) this.gcObserver.observe({ entryTypes: ["gc"] });
        this.performanceState = {
            status: "NORMAL",
            overloadLevel: 0,
            tickAverageMs: 0,
            tickWorstMs: 0,
            targetTickMs: 1000 / 30,
            ticksPerSecond: 0,
            eventLoopLagP95Ms: 0,
            threadCpuPercent: 0,
            entities: 0,
            targetableEntities: 0,
            bots: 0,
            controlledBots: 0,
            players: 0,
            heapUsedBytes: 0,
            rssBytes: 0,
            outboundBytesPerSecond: 0,
            serializationMs: 0,
            phaseTimesMs: {},
            topSystems: [],
            topAiControllers: [],
            projectiles: 0,
            gcCount: 0,
            gcDurationMs: 0,
        };
    }
    recordTick(durationMs, timestamp = performance.now()) {
        if (!Number.isFinite(durationMs)) return;
        this.tickSamples[this.tickSampleCursor] = durationMs;
        this.tickTimestamps[this.tickSampleCursor] = timestamp;
        this.tickSampleCursor = (this.tickSampleCursor + 1) % this.tickSamples.length;
        this.tickSampleCount = Math.min(this.tickSampleCount + 1, this.tickSamples.length);
    }
    recordNetworkBytes(bytes) {
        if (this.metricsEnabled && Number.isFinite(bytes) && bytes > 0) this.networkBytes += bytes;
    }
    recordSerializationTime(durationMs) {
        if (this.metricsEnabled && Number.isFinite(durationMs) && durationMs > 0) this.serializationMs += durationMs;
    }
    recordControllerTime(name, durationMs) {
        if (!this.metricsEnabled || !Number.isFinite(durationMs) || durationMs < 0) return;
        const current = this.controllerTimings.get(name);
        if (current) {
            current.totalMs += durationMs;
            current.calls++;
        } else {
            this.controllerTimings.set(name, { totalMs: durationMs, calls: 1 });
        }
    }
    getPerformanceState() {
        return this.performanceState;
    }
    updateOverloadState(tickAverageMs, targetTickMs, cpuPercent, eventLoopLagMs, autonomousBotCount = 0) {
        // Keep normal play untouched for ordinary bot counts. Adaptation is
        // intended for genuinely large autonomous bot fleets, not general load.
        if (autonomousBotCount < MIN_ADAPTIVE_BOT_COUNT) {
            this.overloadLevel = 0;
            this.overloadSamples = 0;
            this.healthySamples = 0;
            global.gameManager.overloadLevel = 0;
            return "NORMAL";
        }
        const tickRatio = targetTickMs > 0 ? tickAverageMs / targetTickMs : 0;
        let requestedLevel = 0;
        // At 20 ms histogram resolution, ordinary timer quantization can itself
        // approach one target tick. Use absolute lag floors to avoid false trips.
        if (tickRatio >= 1.5 && (cpuPercent >= 85 || eventLoopLagMs >= Math.max(80, targetTickMs))) requestedLevel = 3;
        else if (tickRatio >= 1.1 && (cpuPercent >= 80 || eventLoopLagMs >= Math.max(60, targetTickMs * 0.75))) requestedLevel = 2;
        else if (tickRatio >= 0.85 && (cpuPercent >= 70 || eventLoopLagMs >= Math.max(40, targetTickMs * 0.5))) requestedLevel = 1;

        const recovered = tickRatio < 0.6 && cpuPercent < 65 && eventLoopLagMs < Math.max(30, targetTickMs * 0.4);
        if (requestedLevel > this.overloadLevel) {
            this.overloadSamples++;
            this.healthySamples = 0;
            if (this.overloadSamples >= 3) {
                this.overloadLevel = Math.min(3, this.overloadLevel + 1);
                this.overloadSamples = 0;
            }
        } else {
            this.overloadSamples = 0;
            if (recovered) {
                this.healthySamples++;
                if (this.overloadLevel > 0 && this.healthySamples >= 10) {
                    this.overloadLevel--;
                    this.healthySamples = 0;
                }
            } else {
                this.healthySamples = 0;
            }
        }

        global.gameManager.overloadLevel = this.overloadLevel;
        return ["NORMAL", "DEGRADED", "HEAVY LOAD", "CRITICAL LOAD"][this.overloadLevel];
    }
    update() {
        let activationtime = logs.activation.sum(),
            collidetime = logs.collide.sum(),
            movetime = logs.entities.sum(),
            maptime = logs.minimap.sum(),
            physicstime = logs.physics.sum(),
            lifetime = logs.life.sum(),
            thoughtime = logs.though.sum(),
            selfietime = logs.selfie.sum();
        let playertime = logs.network.record();
        let masterrecord = logs.master.record();
        let sum = masterrecord.average + playertime.average;
        let loops = logs.loops.getTallyCount();

        let botCount = 0;
        let controlledBotCount = 0;
        let playerCount = 0;
        let projectileCount = 0;
        let tickSum = 0;
        let worstTick = 0;
        let tickWindowCount = 0;
        const tickWindowEnd = performance.now();
        for (let i = 0; i < this.tickSampleCount; i++) {
            if (tickWindowEnd - this.tickTimestamps[i] > 10000) continue;
            const value = this.tickSamples[i];
            tickSum += value;
            tickWindowCount++;
            if (value > worstTick) worstTick = value;
        }

        if (this.metricsEnabled) {
            for (let e of entities.values()) {
                if (e.type === "bullet" || e.type === "drone" || e.type === "swarm" || e.type === "trap" || e.type === "block") projectileCount++;
                if (e.isBot) {
                    botCount++;
                    if (e.botControlEnabled) controlledBotCount++;
                }
                if (e.isPlayer && e.socket) {
                    playerCount++;
                    e.socket.talk("svInfo", global.gameManager.name, (sum).toFixed(1));
                }
            }
        } else {
            for (let e of entities.values()) {
                if (e.type === "bullet" || e.type === "drone" || e.type === "swarm" || e.type === "trap" || e.type === "block") projectileCount++;
                if (e.isBot) {
                    botCount++;
                    if (e.botControlEnabled) controlledBotCount++;
                }
                if (e.isPlayer && e.socket) e.socket.talk("svInfo", global.gameManager.name, (sum).toFixed(1));
            }
        }

        const now = performance.now();
        const elapsedMs = Math.max(1, now - this.lastCpuAt);
        const cpuNow = typeof process.threadCpuUsage === "function"
            ? process.threadCpuUsage()
            : process.cpuUsage();
        const cpu = typeof process.threadCpuUsage === "function"
            ? process.threadCpuUsage(this.lastCpuUsage)
            : process.cpuUsage(this.lastCpuUsage);
        const cpuPercent = Number((((cpu.user + cpu.system) / (elapsedMs * 10))).toFixed(1));
        const targetTickMs = global.gameManager.room.cycleSpeed;
        const tickAverageMs = tickWindowCount ? tickSum / tickWindowCount : 0;
        const eventLoopLagMs = this.eventLoopDelay ? this.eventLoopDelay.percentile(95) / 1e6 : 0;
        const status = this.updateOverloadState(
            tickAverageMs,
            targetTickMs,
            cpuPercent,
            eventLoopLagMs,
            Math.max(0, botCount - controlledBotCount)
        );
        this.lastCpuAt = now;
        this.lastCpuUsage = cpuNow;

        if (this.metricsEnabled) {
            const heap = process.memoryUsage();
            const phaseTimesMs = {
                entityLife: Number(lifetime.toFixed(3)),
                aiThought: Number(thoughtime.toFixed(3)),
                selfieVisual: Number(selfietime.toFixed(3)),
                physics: Number(physicstime.toFixed(3)),
                collision: Number(collidetime.toFixed(3)),
                activation: Number(activationtime.toFixed(3)),
                clientUpdate: Number(playertime.sum.toFixed(3)),
                leaderboardMinimap: Number(maptime.toFixed(3)),
            };
            const topSystems = Object.entries(phaseTimesMs)
                .map(([name, milliseconds]) => ({ name, milliseconds }))
                .sort((a, b) => b.milliseconds - a.milliseconds)
                .slice(0, 8);
            const topAiControllers = Array.from(this.controllerTimings, ([name, sample]) => ({
                name,
                totalMs: Number(sample.totalMs.toFixed(3)),
                calls: sample.calls,
                averageMs: Number((sample.totalMs / sample.calls).toFixed(5)),
            })).sort((a, b) => b.totalMs - a.totalMs).slice(0, 10);
            this.controllerTimings.clear();
            const state = this.performanceState = {
                status,
                overloadLevel: this.overloadLevel,
                tickAverageMs: Number(tickAverageMs.toFixed(3)),
                tickSampleCount: tickWindowCount,
                tickWorstMs: Number(worstTick.toFixed(3)),
                targetTickMs: Number(targetTickMs.toFixed(3)),
                ticksPerSecond: loops,
                eventLoopLagP95Ms: Number(eventLoopLagMs.toFixed(3)),
                threadCpuPercent: cpuPercent,
                cpuScope: typeof process.threadCpuUsage === "function" ? "thread" : "process",
                entities: entities.size,
                targetableEntities: targetableEntities.size,
                bots: botCount,
                controlledBots: controlledBotCount,
                players: playerCount,
                heapUsedBytes: heap.heapUsed,
                rssBytes: heap.rss,
                memoryScope: "heap=current thread; rss=whole process",
                outboundBytesPerSecond: this.networkBytes,
                serializationMs: Number(this.serializationMs.toFixed(3)),
                phaseTimesMs,
                topSystems,
                topAiControllers,
                projectiles: projectileCount,
                gcCount: this.gcCount,
                gcDurationMs: Number(this.gcDurationMs.toFixed(3)),
            };
            this.networkBytes = 0;
            this.serializationMs = 0;
            this.gcCount = 0;
            this.gcDurationMs = 0;
            if (this.eventLoopDelay) this.eventLoopDelay.reset();
            global.gameManager.performanceState = state;
            if (global.gameManager.parentPort) {
                global.gameManager.parentPort.postMessage(["performance", state]);
            }
        }

        global.fps = (1000/sum).toFixed(2);
        if (sum > 1000 / global.gameManager.roomSpeed / 30) {
            this.fails++;
            if (Config.startup_logs) {
                util.warn(`Last server tick took too long to calculate! Info: [Loops: ${loops}, Total Entities: ${entities.size}, Clients: ${global.gameManager.clients.length} Backlogged: ${(sum * global.gameManager.roomSpeed * 3).toFixed(3)}%]`)
                util.warn('Total activation time: ' + activationtime);
                util.warn('Total collision time: ' + collidetime);
                util.warn('Total cycle time: ' + movetime);
                util.warn('Total player update time: ' + playertime.sum);
                util.warn('Total lb+minimap processing time: ' + maptime);
                util.warn('Total entity physics calculation time: ' + physicstime);
                util.warn('Total entity life+thought cycle time: ' + lifetime);
                util.warn('Total entity thought cycle time: ' + thoughtime);
                util.warn('Total entity selfie-taking time: ' + selfietime);
                util.warn('Total time: ' + (movetime + playertime.sum + maptime));
            }
            // Keep the existing severe-failure restart only as a last resort,
            // after adaptive bot perception has already reached its top level.
            if (this.fails > 20 && this.overloadLevel >= 3 && (sum).toFixed(0) > 300 && !this.isRestarting) {
                this.isRestarting = true;
                util.error("FAILURE!");
                global.gameManager.socketManager.broadcast("Server overloaded! Restarting...");
                global.gameManager.gameHandler.stop();
                setTimeout(() => {global.gameManager.close()}, 900);
                setTimeout(() => {this.isRestarting = false}, 3000);
            }
        } else {
            this.fails = 0;
        }
    }
    onError(error) {
        if (this.isRestarting) return;
        this.isRestarting = true;
        util.error("FAILURE!");
        global.gameManager.socketManager.broadcast("Server Error! Restarting...");
        setTimeout(() => {global.gameManager.close()}, 900);
        setTimeout(() => {this.isRestarting = false}, 3000);
        console.error(error);
    }
}

module.exports = { speedcheckloop };
