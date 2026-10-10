# Aether server performance audit

Date: 2026-10-07  
Runtime requested: Node 24.19.0

## Scope and measurement limits

This audit follows the active server files, not the many `.before-*` and backup copies in the repository. No production limits, ports, hashes, or game modes were changed for the audit.

The currently running local Node server was already present before this audit. A read-only request to `/getServers.json` returned 33 servers and one connected player. Process 30128 reported about 3.19 GB working set and 3.58 GB private memory at the time sampled. Its command line could not be read because Windows denied access, so this memory figure cannot be attributed to a specific game worker or current working-tree revision. Its live server list has seven Assault entries and therefore does not appear to be running the current edited configuration.

The code has phase timers in `server/game/debug/logs.js` and reports aggregate phase times once per second through `speedLoop.js`, but it does not retain per-tick rolling distributions, event-loop delay, CPU utilization, GC data, or per-worker memory. It also restarts after sustained slow ticks rather than adapting update work. Therefore, this audit can identify structural hot spots from the code and record host observations, but cannot claim a representative in-game CPU profile or a measured 100–1000 bot capacity without a controlled server load run.

## Architecture observed

- `server/server.js` starts one Node `Worker` thread per configured game server. Each worker runs a separate game loop and has its own game state, but all workers share the same operating-system process and compete for CPU and memory bandwidth. The main HTTP server also runs in that process.
- `server/game/index.js` drives game simulation with a recursive `setTimeout` loop, targeting `room.cycleSpeed` (nominally 30 Hz). It runs entity simulation, delayed events, food spawning, room logic, and gamemode quick-loop work serially on each worker's event loop.
- Entity physics and collision use the existing `HashGrid` from `server/lib/hashgrid.js`, with 128-unit cells. The grid limits broad-phase checks to overlapping cells and AABBs; this is preferable to an all-entities collision pass. Dense cells can still produce quadratic local candidate work.
- `gameloop()` visits entities once per tick, runs physics, active entity life/controller work, selfies, collision queries, and activation. Player and bot entities are always simulated; distant inactive entities skip life/selfie but still receive some per-entity handling.
- Each connected player's `eyes()` view performs a full entity-map scan when its visible list refreshes. It then performs a more exact visibility pass and builds perspective/update data. This scales approximately with players times entities at the configured refresh interval.
- Several AI controllers scan `targetableEntities` to select targets. `io_nearestDifferentMaster.buildList()` and the NULL AI scans can visit the entire target set for each AI decision, adding bot-count times target-count work. NULL AI additionally builds per-scan lists and sorts them.
- `Entity.destroy()` scans the global entity map to find dependents and update parent/master/source references. Repeated destruction during projectile-heavy fights can make cleanup approach destroyed-entities times total-entities work. That scan is correctness-sensitive because ownership references are assigned in multiple entity/gun paths; replacing it without a complete reference index risks breaking children and bots.
- The 250 ms leaderboard/minimap task computes shared deltas but performs leaderboard updates and packet work per subscriber. The 1.5 s traffic monitor and per-socket heartbeats add recurring work as player count grows.
- Hot-path allocations include per-tick hash-grid cell arrays, collision/event argument objects, collision math intermediates, AI candidate/visibility objects and arrays, view result arrays/sets, and packet/perspective arrays. High projectile churn also increases allocation and cleanup pressure.
- `speedLoop.js` currently reacts to sustained overload by warning and eventually closing/restarting the game. There is no gradual overload state or recovery behavior. A safe adaptive policy should first observe load and then selectively reduce non-critical AI perception frequency; it should not delay the event loop or lower the global simulation rate blindly.

## Prioritized findings

| Priority | Hot spot | Scaling / evidence | Recommended action |
|---|---|---|---|
| P0 | Bot target selection | Full `targetableEntities` scans per bot decision; roughly O(B × T), repeated several times per bot over time. `io_nearestDifferentMaster.buildList()` also repeated wall checks and created filtered arrays. | The safe redundant-check/allocation part is optimized and benchmarked. A per-tick target HashGrid rebuild was tested but made fleet scans 35–82% slower at 200–1000 bots, so it was reverted. The remaining O(B × T) cost needs an incremental index or a measured break-even policy. |
| P0 | Destruction cleanup | A full entity-map scan for each `destroy()`; O(D × E) during high churn, especially bullets and child-heavy tanks. | Replaced with a shared reverse-reference index over `source`, `parentID`, `parent`, and `master`. A follow-up regression fix restricts dependents to registered live entities while still indexing references to turret targets. Synthetic behavior equivalence passes. With 1,000 destructions, the latest run measured 10,660 ms at 20,000 entities using the scan versus 4.8 ms indexed. Live memory overhead and a real-match smoke test remain outstanding. |
| P1 | Spatial grid rebuild | Collision broad phase is already spatially bounded, but `HashGrid.clear()` discards every cell array and `insert()` allocates arrays again each tick. This is measurable allocation churn, although a reuse pool must be benchmarked because clearing/copying also costs CPU. | Benchmark and, if it wins, recycle cell arrays with a bounded pool. Retain the existing grid and collision semantics. |
| P1 | Player visibility | Each refreshed player's broad visibility pass visits all entities: O(P × E) per refresh window. View arrays, mockup sets, flattening, and perspective packets add allocations and serialization. | Measure scan time and visible counts. A spatial query must preserve current camera bounds and visibility rules before replacing the full scan. |
| P1 | Per-collision work | The spatial hash prevents global O(E²), but dense overlapping cells can still be O(k²). Collision dispatch emits events and creates temporary objects; advanced collision math is substantial. | Add candidate-pair counters and benchmark dense/sparse cases before changing collision behavior. |
| P2 | Leaderboard/minimap/network | A periodic pass runs every 250 ms, builds/updates deltas, and may send data for each socket. Current instrumentation reports aggregate minimap and network time, not bytes per player or serialization cost. | Record bytes and encode time by packet category, then remove only proven redundant work while preserving protocol compatibility. |
| P2 | Multi-mode deployment | 33 game modes were observed from the live server endpoint. Worker threads are not CPU isolation: all game loops contend in one process and memory pressure is shared. The live process's large memory footprint needs per-worker measurements before any topology change. | Add per-worker diagnostics and benchmark representative mode combinations. Process isolation is a deployment tradeoff, not an automatic optimization. |
| P2 | Adaptive protection | Current watchdog counts slow seconds and may restart after repeated severe delay; it had no rolling tick/worst-tick or event-loop-lag series and no gradual recovery. | Added rolling per-worker snapshots and a hysteretic 4-state controller. Bot targeting throttling requires at least 100 autonomous bots plus sustained tick/CPU/event-loop pressure. Physics, projectiles, player input, and controlled Bot Control tanks remain at normal cadence. The exact thresholds still need full-match tuning. |

## First benchmark and limits

The first reproducible benchmark targets `HashGrid` insertion and broad-phase query cost at 100, 200, 500, 750, and 1000 simulated bots, with a configurable projectile multiplier. It measures grid-phase average/worst duration, approximate candidates examined, process CPU time, heap growth, and GC-observed heap after collection. This is a microbenchmark, not a claim about full-game tick capacity: it excludes entity definitions, AI, physics resolution, socket serialization, players, and the cost of the other configured game workers.

A full end-to-end load benchmark requires a controlled server instance and bot injection. The existing process is already using about 3.2 GB working set, so this audit will not start a second 33-worker server beside it. Per-worker runtime instrumentation and a dedicated, isolated load profile are required to report average/worst tick, TPS, CPU, memory, GC, bandwidth, entity count, bot count, overload activation, and recovery credibly.

The first same-process controller comparison completed successfully on Node v24.19.0. With equal numbers of simulated controllers and targets (100–1000), the optimized `buildList()` matched the saved baseline's candidate IDs and target-lock results. Average fleet scan time improved by 20.8–33.3% from 200 through 1000; the 100-controller run improved by 33.3%. At 1000 controllers/targets, average time fell from 46.77 ms to 33.69 ms and wall-distance checks fell from 20 million to 10 million over eight measured fleet scans. This measures only target-list construction, not full gameplay or server capacity. A separate grid-array recycling experiment made 1000-entity grid time 26.5% slower in a same-process comparison and was reverted.

The paired target-scan benchmark was repeated under variable contention from the already-running game process. Across the two runs, all bot-count cases improved; the measured average reduction ranged from 18.3% to 54.3%. At 1000 controllers/targets, paired runs measured 46.77→33.69 ms and 64.55→46.89 ms per fleet scan. Candidate/lock equivalence passed. This spread is evidence of host load variance, so use the reproducible harness for comparisons and do not interpret the raw values as production tick capacity.

A spatial target-grid trial rebuilt a coarser `HashGrid` three times per fleet scan to account for its per-tick cost. Candidate sets matched after normalizing order, but end-to-end scan time regressed at 200–1000 bots (34.8–82.3% slower); the trial was discarded. The active collision grid was not replaced or modified.

The indexed destruction cleanup was compared with the old full-map loop in `benchmarks/entity-destroy.js`. On Node v24.19.0, the synthetic fixture produced equivalent effects on surviving entities for normal and Bacteria masters, including persistent children, and tests both registered entity targets and unregistered turret targets. In the latest 20,000-entity / 1,000-destruction run, cleanup measured 10,660 ms for the old scan and 4.8 ms with the index. This synthetic cleanup benchmark omits entity simulation and does not measure the additional production heap used by reference maps.

Added `/api/performance` snapshots include rolling tick average/worst/rate, target tick, event-loop p95, thread CPU, entity/targetable/bot/player counts, heap/RSS, GC counts/duration, and outbound byte rate. A deterministic policy test verified three-sample staged activation, hysteresis, and ten-sample stepwise recovery. These tests verify metric plumbing and state transitions, not full multi-worker runtime behavior. The full system has not yet been load-tested with real 100–1000 bot battles.

## Safety constraints for implementation

- Back up each existing source file before editing it.
- Make one logical change at a time and run syntax checks after each change.
- Keep all existing ports, hashes, game modes, gameplay mechanics, bot ownership/control, and Assault spawn rules intact.
- Do not increase bot/player/entity caps or lower simulation quality as a substitute for optimization.
- Keep a per-change record in `PERFORMANCE_CHANGELOG.md`, including test limitations.
