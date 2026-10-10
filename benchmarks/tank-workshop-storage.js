// Persistent Tank Workshop API checks (no game server required).
// Run: node benchmarks/tank-workshop-storage.js
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

async function main() {
    global.tileClass = { normal: { color: "normal" } };
    const editorRoom = require("../server/game/roomSetup/rooms/room_tank_editor.js");
    assert.equal(editorRoom.length, 50, "beta arena should have 50 rows");
    assert.equal(editorRoom.every(row => row.length === 50), true, "beta arena should have 50 columns");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "aether-tank-workshop-"));
    const file = path.join(root, "tanks.json");
    process.env.AETHER_TANK_EDITOR_STORE = file;
    let storage = require("../server/game/addons/tankEditorStorage.js");
    const name = "Workshop Tester";
    const token = crypto.randomUUID();
    const definition = {
        LABEL: "Persistent Reaper", SHAPE: 4, COLOR: 7, SIZE: 20,
        BODY: { HEALTH: 1.8, SPEED: 1.2 },
        GUNS: Array.from({ length: 14 }, (_, i) => ({
            POSITION: { LENGTH: 999, WIDTH: 6, ANGLE: i * 30 },
            PROPERTIES: { TYPE: { PARENT: "trap", SIZE: 999, BODY: { DAMAGE: 999 } }, SHOOT_SETTINGS: { reload: 0.01 } },
        })),
    };
    const normalized = storage.normalizeDefinition(definition);
    assert.equal(normalized.GUNS.length, 12, "barrel count must be bounded");
    assert.equal(normalized.GUNS[0].POSITION.LENGTH, 60, "barrel lengths must be clamped");
    assert.equal(normalized.GUNS[0].PROPERTIES.TYPE.BODY.DAMAGE, 20, "projectile values must be clamped");
    assert.equal(normalized.BODY.HEALTH, 1.8, "body stats should map into the game definition");
    global.Class = { genericTank: { index: "0" } };
    global.classMap = new Map([[0, "genericTank"]]);
    const previewKey = storage.registerClass(name, token, "preview", normalized);
    const classCount = Object.keys(global.Class).length;
    assert.equal(storage.registerClass(name, token, "preview", { ...normalized, LABEL: "Preview Update", BODY: { ...normalized.BODY, HEALTH: 2.3 } }), previewKey, "live edits should reuse one runtime class");
    assert.equal(Object.keys(global.Class).length, classCount, "live preview changes must not leak a new class for every edit");
    assert.equal(global.Class[previewKey].BODY.HEALTH, 2.3, "runtime preview class should update to the latest validated data");
    assert.equal(global.Class[previewKey].GUNS.length, 12, "runtime classes should contain the bounded barrel list");
    const withTurret = { ...normalized, TURRETS: [{ POSITION: { SIZE: 10 }, GUNS: [] }] };
    storage.registerClass(name, token, "preview", withTurret);
    const withTurretCount = Object.keys(global.Class).length;
    storage.registerClass(name, token, "preview", { ...withTurret, LABEL: "Preview Turret Update" });
    assert.equal(Object.keys(global.Class).length, withTurretCount, "turret edits should reuse runtime turret classes");
    const assignedIndexes = Object.values(global.Class).map(value => value.index).filter(value => value != null);
    assert.equal(new Set(assignedIndexes).size, assignedIndexes.length, "dynamic preview classes must keep unique mockup indexes");

    let tank = await storage.save(name, token, { name: "Persistent Reaper", description: "first draft", definition, status: "Draft" });
    assert.equal(tank.version, 1);
    tank = await storage.save(name, token, { id: tank.id, name: "Persistent Reaper", description: "barrel revision", definition: { ...definition, GUNS: definition.GUNS.slice(0, 3) }, status: "Testing" });
    assert.equal(tank.version, 2, "saving edits must preserve history and bump the version");
    tank = await storage.save(name, token, { id: tank.id, name: tank.name, description: tank.description, definition: tank.definition, status: "Submitted" });
    assert.equal(tank.version, 3);
    assert.equal(storage.listAll({ status: "Submitted" }).total, 1);
    assert.equal(storage.adminCompare(tank.id, 1, 3).first.definition.GUNS.length, 12);
    await storage.adminReview(tank.id, "Approved", "Looks safe in the arena.", "Aether Owner");
    assert.equal(storage.getTank(tank.id).status, "Approved");
    tank = await storage.adminRestore(tank.id, 1);
    assert.equal(tank.version, 4, "restore must create a new version instead of overwriting history");
    tank = await storage.adminRename(tank.id, "Reaper Mk II");
    assert.equal(tank.version, 5);
    const copy = await storage.adminDuplicate(tank.id, "Aether Owner");
    assert.equal(copy.status, "Draft");
    assert.equal(await storage.adminDelete(copy.id), true);

    const parallel = await Promise.all(Array.from({ length: 6 }, (_, index) =>
        storage.save(`Tester ${index}`, crypto.randomUUID(), { name: `Concurrent ${index}`, definition: { LABEL: `Concurrent ${index}` } })
    ));
    assert.equal(parallel.length, 6);
    assert.equal(storage.listAll({}).total, 7, "serialized concurrent saves should all persist");

    // Reload the module to confirm reads come back from disk, not module memory.
    delete require.cache[require.resolve("../server/game/addons/tankEditorStorage.js")];
    storage = require("../server/game/addons/tankEditorStorage.js");
    assert.equal(storage.list(name, token)[0].id, tank.id, "saved tanks must survive a storage-module reload");
    assert.equal(storage.getTank(tank.id).versions.length, 5);
    const readInFreshProcess = spawnSync(process.execPath, ["-e", `const s=require(${JSON.stringify(require.resolve("../server/game/addons/tankEditorStorage.js"))}); console.log(s.list(${JSON.stringify(name)}, ${JSON.stringify(token)})[0].id);`], {
        encoding: "utf8", env: { ...process.env, AETHER_TANK_EDITOR_STORE: file },
    });
    assert.equal(readInFreshProcess.status, 0, readInFreshProcess.stderr);
    assert.equal(readInFreshProcess.stdout.trim(), tank.id, "saved tanks must remain readable in a fresh Node process");

    // Verify migration of the former owner-key -> array format.
    const legacyFile = path.join(root, "legacy.json");
    const legacyName = "Legacy Tester";
    const legacyToken = crypto.randomUUID();
    const legacyKey = crypto.createHash("sha256").update(`${legacyName.toLowerCase()}\0${legacyToken}`).digest("hex");
    fs.writeFileSync(legacyFile, JSON.stringify({ [legacyKey]: [{ id: "legacy-id", name: "Old Tank", definition: { LABEL: "Old Tank" }, updatedAt: new Date(0).toISOString() }] }));
    process.env.AETHER_TANK_EDITOR_STORE = legacyFile;
    delete require.cache[require.resolve("../server/game/addons/tankEditorStorage.js")];
    const legacyStorage = require("../server/game/addons/tankEditorStorage.js");
    assert.equal(legacyStorage.list(legacyName, legacyToken)[0].name, "Old Tank");
    await legacyStorage.save(legacyName, legacyToken, { id: "legacy-id", name: "Old Tank", definition: { LABEL: "Old Tank" } });
    assert.equal(JSON.parse(fs.readFileSync(legacyFile, "utf8")).schemaVersion, 2, "legacy data should migrate on the first write");

    fs.rmSync(root, { recursive: true, force: true });
    console.log(JSON.stringify({ test: "tank-workshop-persistence-and-review", passed: true, versions: tank.versions.length, concurrentSaves: parallel.length, freshProcessRead: true, migration: true, malformedValuesClamped: true, smallArena: "50x50" }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
