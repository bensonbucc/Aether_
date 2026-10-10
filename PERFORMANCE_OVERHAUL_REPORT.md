# Aether server performance pass

Date: 2026-10-07

## Audit profile

The active simulation loop in `server/game/index.js` clears the broad-phase grid, then walks every entity. Each entity handles mortality/death, physics, active life/controller work, selfie generation, friction/confinement, AABB and grid collision candidates, activation, and tick events. Active players and active entities run `bringToLife()` in `server/loaders/global.js`; each controller's `think()` runs synchronously, followed by movement/facing, guns, turret life, and skill maintenance. The main loop then updates every ready client view. The nominal target is 30 Hz.

The supplied trace is already diagnostic: entity life plus thought (27.5959 ms) and nested controller thought (6.5573 ms) dominate the 37.2784 ms cycle. Selfie camera construction costs another 2.7347 ms. Physics is 0.8234 ms and collision reports 0 ms, so changing collision resolution or lowering tick rate would target the wrong work.

AI scans remain a scaling concern. The active `nearestDifferentMaster` target builder examines `targetableEntities` per scan (approximately bots × targetable entities), and `io_avoid` searches the entity collection on its perception cadence. The target builder already avoids a duplicate wall test and filtered-array allocations; a rebuilt spatial target grid was benchmarked previously and rejected because it regressed at 200–1000 bots. Entity destruction already uses the reverse-reference index instead of scanning all entities. Visibility refresh still makes a full entity-map pass per client refresh. Collision uses the existing 128-unit `HashGrid`; dense cells can still increase local candidate work.

`takeSelfie()` calls `camera()` for active entities. Camera construction was doing array conversion, concatenation, sorting, and mapping even when guns/turrets/props were absent. The modified code avoids empty collection churn, computes `size` once for the photo, avoids concatenating child lists, and preserves an immutable empty result array. `bringToLife()` now updates the existing no-goal object instead of allocating a replacement every tick.

## Files changed

- `server/game/entities/entity.js` — camera/selfie allocation and repeated getter work.
- `server/loaders/global.js` — opt-in per-controller timing and no-goal allocation reduction.
- `server/game/debug/speedLoop.js` — top controller/phase timing, serialization, projectile count in dev snapshots.
- `server/game/network/sockets.js` — dev-only protocol encode timing and outbound byte counting.
- `benchmarks/entity-camera.js` and `benchmarks/performance-monitor.js` — behavior/measurement checks.
- `PERFORMANCE_CHANGELOG.md` — dated change and test record.

Before editing, source backups were created with the suffix `.before-performance-overhaul-20261007`. The changelog and monitor benchmark also have backups with that suffix. A timer-logger optimization experiment was rejected and reverted because paired measurements were inconsistent.

## Benchmarks

These are paired microbenchmarks, not full server capacity measurements. Camera fixtures run the actual `Entity.camera()` methods from the pre-change backup and current file, consume returned data, and assert deep equality. The fixture includes empty collections, guns, turrets/props, and child camera offsets.

| Camera fixtures | Before median / sweep | After median / sweep | Change |
|---:|---:|---:|---:|
| 100 | 0.094 ms | 0.072 ms | -23.4% |
| 200 | 0.160 ms | 0.139 ms | -13.1% |
| 500 | 0.139 ms | 0.119 ms | -14.4% |
| 750 | 0.143 ms | 0.077 ms | -46.2% |
| 1,000 | 0.150 ms | 0.080 ms | -46.7% |

Raw timings varied between runs on this host, especially around 500+ fixtures. These are within-run paired medians; use them as directional evidence for the selfie construction path, not as stable full-tick predictions.

The timer-logger experiment was rejected and reverted: 282 marks/sweep measured 0.831→1.086 ms (+30.6%); 500 measured 1.501→1.302 ms (-13.3%); 1,000 measured 2.856→2.731 ms (-4.4%); 2,500 measured 9.022→9.019 ms (flat). The results are inconsistent, so the shipping logger remains unchanged.

Other measured existing paths (current optimized code compared with saved prior implementations): target-list construction matched behavior and measured -37.8%, -45.7%, -46.8%, -25.7%, and -27.2% at 100, 200, 500, 750, and 1,000 bots/targets in the latest run. Grid-only average tick cost at 700, 1,400, 3,500, 5,250, and 7,000 entities was 0.269, 0.266, 0.752, 1.171, and 1.354 ms; no grid change was made. The entity-destroy benchmark at 20,000 entities / 1,000 destructions measured 7,917.035 ms for the saved scan implementation versus 3.181 ms for the existing reference index, with behavior-equivalence checks passing.

These fixtures omit complete entity life, real AI/controller mixes, physics, networking, workers, and gamemode rules. They cannot predict real tick throughput or establish an after-change improvement over the reported 37.2784 ms trace.

## Diagnostics and adaptive protection

Dev builds expose the existing `/api/performance` snapshots with rolling tick average/worst/rate, event-loop p95, thread CPU, entity/bot/player/memory/GC/network counts, and now phase times, top AI controller classes, serialization milliseconds, and projectile count. Controller timers execute only when `Config.dev_build === true`; normal builds do not call `performance.now()` around each controller.

The existing overload policy remains staged and automatic. It only changes autonomous bot target-list scan cadence (3 normal, 4 degraded, 6 heavy, 9 critical ticks); it does not lower the global tick rate or skip player input, physics, collisions, projectile life, or controlled Bot Control entities. It requires at least 100 autonomous bots and sustained tick-budget pressure plus CPU or event-loop pressure for three one-second samples before stepping up. Recovery requires tick average below 60% of budget, CPU below 65%, and event-loop p95 below the recovery bound for ten one-second samples; recovery steps down one level at a time. `node benchmarks/adaptive-overload.js` passed activation, hysteresis, small-bot-count gating, and full recovery.

## Verification and limits

Syntax checks passed for the four changed server files and two changed benchmark files. Camera equivalence, performance snapshot fields, overload policy, bot targeting, spatial grid, and destruction benchmarks passed.

An Aether start attempt loaded all 21 definition groups, all 16 addons, and combined 2,230 definitions, then failed binding the HTTP server with `EADDRINUSE` on port 3000. The listener query did not reveal an owning process, and no process was killed. Full server worker startup, normal Sandbox play, high-AI gamemodes, and live 100–1,000 bot battles therefore remain unverified. The browser also cannot reach the local game server in this environment. Do not interpret the microbenchmark table as before/after live-server tick measurements.

## Remaining work

1. Run `/api/performance` in a Dev build and use `topAiControllers` with the real controller mix to identify which AI classes contribute the 6.56 ms thought bucket.
2. Profile `io_avoid`, `io_healTeamMasters`, target selection, and visibility under a controlled match before adding a new spatial index; the prior index rebuild regressed under measured bot counts.
3. Capture same-worker before/after tick distributions, CPU, event-loop delay, heap/GC, bytes, and 100/200/500/750/1,000 entity/bot scenarios. Include a Cube/3D-heavy case and at least Sandbox, Normal Sandbox, Tank Editor, Siege, Outbreak, and a growth/large-entity mode.
4. Recheck adaptive activation and recovery under real severe load; current policy tests are deterministic unit tests, not an operating server.
