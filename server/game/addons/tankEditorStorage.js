const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { threadId } = require("worker_threads");

const savePath = process.env.AETHER_TANK_EDITOR_STORE || path.join(__dirname, "../../data/tank-editor-saves.json");
const lockPath = `${savePath}.lock`;
const MAX_TANKS_PER_TESTER = 40;
const MAX_TESTERS = 250;
const MAX_STORE_BYTES = 12 * 1024 * 1024;
const MAX_TURRETS = 6;
const MAX_GUNS_PER_TANK = 32;
const MAX_GUNS_PER_TURRET = 8;
const MAX_APPROVED_ARMS_RACE_TANKS = 64;
const PROJECTILE_PARENTS = new Set([
    "bullet", "missile", "hypermissile", "launcherMissile", "spinmissile",
    "trap", "drone", "swarm", "minion", "sunchip", "boomerang", "hive",
]);
const PROJECTILE_MOTION_TYPES = new Set(["chase", "drift", "glide", "motor", "swarm", "withMaster", "assembler"]);
const PROJECTILE_FACING_TYPES = new Set(["looseToTarget", "smoothToTarget", "smoothWithMotion", "spin", "toTarget", "turnWithSpeed"]);
const PROJECTILE_COLLISION_TYPES = new Set(["assembler", "droneCollision", "hard", "hardOnlyBosses", "hardOnlyTanks", "hardWithBuffer", "never", "normal", "push", "pushOnlyTeam", "repel"]);
const GUN_STAT_CALCULATORS = new Set(["default", "thruster", "sustained", "sustained+lowspeed", "swarm", "trap", "block", "fixedReload", "necro", "drone"]);
const PROJECTILE_SHAPE_DEFAULTS = { trap: -3, boomerang: -5, drone: 3, swarm: 3, sunchip: 4 };
const PROJECTILE_BODY_DEFAULTS = {
    bullet: { HEALTH: 0.165, DAMAGE: 6, SPEED: 3.75, ACCELERATION: 0, PENETRATION: 1, DENSITY: 1.25, RESIST: 0, RANGE: 90, PUSHABILITY: 0.3, KNOCKBACK: 1 },
    missile: { HEALTH: 0.165, DAMAGE: 6, SPEED: 3.75, ACCELERATION: 0, PENETRATION: 1, DENSITY: 1.25, RESIST: 0, RANGE: 120, PUSHABILITY: 0.3, KNOCKBACK: 1 },
    launcherMissile: { HEALTH: 0.165, DAMAGE: 6, SPEED: 3.75, ACCELERATION: 0, PENETRATION: 1, DENSITY: 1.25, RESIST: 0, RANGE: 120, PUSHABILITY: 0.3, KNOCKBACK: 1 },
    hypermissile: { HEALTH: 0.165, DAMAGE: 6, SPEED: 3.75, ACCELERATION: 0, PENETRATION: 1, DENSITY: 1.25, RESIST: 0, RANGE: 120, PUSHABILITY: 0.3, KNOCKBACK: 1 },
    spinmissile: { HEALTH: 0.165, DAMAGE: 6, SPEED: 3.75, ACCELERATION: 0, PENETRATION: 1, DENSITY: 1.25, RESIST: 0, RANGE: 120, PUSHABILITY: 0.3, KNOCKBACK: 1 },
    trap: { HEALTH: 0.5, DAMAGE: 3, SPEED: 0, ACCELERATION: 0, PENETRATION: 1, DENSITY: 2.5, RESIST: 2.5, RANGE: 450, PUSHABILITY: 1, KNOCKBACK: 1 },
    boomerang: { HEALTH: 0.5, DAMAGE: 3, SPEED: 1.25, ACCELERATION: 0, PENETRATION: 1, DENSITY: 2.5, RESIST: 2.5, RANGE: 120, PUSHABILITY: 1, KNOCKBACK: 1 },
    drone: { HEALTH: 0.3, DAMAGE: 3.375, SPEED: 3.8, ACCELERATION: 0.085, PENETRATION: 1.2, DENSITY: 0.03, RESIST: 1.5, RANGE: 200, PUSHABILITY: 0.6, KNOCKBACK: 1 },
    sunchip: { HEALTH: 0.3, DAMAGE: 3.375, SPEED: 3.8, ACCELERATION: 0.085, PENETRATION: 1.2, DENSITY: 0.03, RESIST: 1.5, RANGE: 200, PUSHABILITY: 0.6, KNOCKBACK: 1 },
    hive: { HEALTH: 0.165, DAMAGE: 6, SPEED: 3.75, ACCELERATION: 0, PENETRATION: 1, DENSITY: 1.25, RESIST: 0, RANGE: 90, PUSHABILITY: 0.3, KNOCKBACK: 1 },
    swarm: { HEALTH: 0.175, DAMAGE: 2.25, SPEED: 4.5, ACCELERATION: 3, PENETRATION: 1.5, DENSITY: 12, RESIST: 1.6, RANGE: 225, PUSHABILITY: 0.6, KNOCKBACK: 1 },
    minion: { HEALTH: 5, DAMAGE: 1.2, SPEED: 1.8, ACCELERATION: 1, PENETRATION: 1, DENSITY: 0.4, RESIST: 1, RANGE: 90, PUSHABILITY: 1, KNOCKBACK: 1 },
};
const STATUSES = new Set(["Draft", "Testing", "Submitted", "Approved", "Rejected", "Archived"]);
const clampNumber = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};
const safeClone = value => JSON.parse(JSON.stringify(value));
const runtimeGuns = guns => guns.filter(gun => gun.EDITOR_DISABLED !== true).map(gun => {
    const runtimeGun = { ...gun };
    delete runtimeGun.EDITOR_DISABLED;
    return runtimeGun;
});
const cleanName = (value, fallback = "Custom Tank") => String(value || fallback).trim().slice(0, 32) || fallback;
const cleanDescription = value => String(value || "").trim().slice(0, 500);

function normalizeGun(gun, index, label = "Barrel") {
    if (!gun || typeof gun !== "object" || Array.isArray(gun)) throw new Error(`${label} ${index + 1} is invalid.`);
    const position = gun.POSITION && typeof gun.POSITION === "object" && !Array.isArray(gun.POSITION) ? gun.POSITION : {};
    const properties = gun.PROPERTIES && typeof gun.PROPERTIES === "object" && !Array.isArray(gun.PROPERTIES) ? gun.PROPERTIES : {};
    const shoot = properties.SHOOT_SETTINGS && typeof properties.SHOOT_SETTINGS === "object" && !Array.isArray(properties.SHOOT_SETTINGS) ? properties.SHOOT_SETTINGS : {};
    const projectile = properties.TYPE && typeof properties.TYPE === "object" && !Array.isArray(properties.TYPE) ? properties.TYPE : {};
    const projectileBody = projectile.BODY && typeof projectile.BODY === "object" && !Array.isArray(projectile.BODY) ? projectile.BODY : {};
    const projectileAI = projectile.AI && typeof projectile.AI === "object" && !Array.isArray(projectile.AI) ? projectile.AI : {};
    const parent = String(projectile.PARENT || "bullet");
    if (!PROJECTILE_PARENTS.has(parent)) throw new Error(`${label} ${index + 1} uses unsupported projectile class “${parent}”.`);
    const parentDefaults = PROJECTILE_BODY_DEFAULTS[parent] || PROJECTILE_BODY_DEFAULTS.bullet;
    const cleanBoolean = key => properties[key] === true;
    const normalizedProjectile = {
        PARENT: parent,
        LABEL: cleanName(projectile.LABEL, parent).slice(0, 24),
        COLOR: Math.round(clampNumber(projectile.COLOR, 0, 18, 2)),
        SHAPE: Math.round(clampNumber(projectile.SHAPE, -12, 12, PROJECTILE_SHAPE_DEFAULTS[parent] ?? 0)),
        SIZE: clampNumber(projectile.SIZE, 0.5, 20, 1),
        BODY: {
            HEALTH: clampNumber(projectileBody.HEALTH, 0.1, 20, parentDefaults.HEALTH),
            DAMAGE: clampNumber(projectileBody.DAMAGE, 0.1, 20, parentDefaults.DAMAGE),
            SPEED: clampNumber(projectileBody.SPEED, 0, 10, parentDefaults.SPEED),
            ACCELERATION: clampNumber(projectileBody.ACCELERATION, 0, 10, parentDefaults.ACCELERATION),
            PENETRATION: clampNumber(projectileBody.PENETRATION, 0.1, 20, parentDefaults.PENETRATION),
            DENSITY: clampNumber(projectileBody.DENSITY, 0.01, 20, parentDefaults.DENSITY),
            RESIST: clampNumber(projectileBody.RESIST, 0, 20, parentDefaults.RESIST),
            RANGE: clampNumber(projectileBody.RANGE, 1, 1000, parentDefaults.RANGE),
            PUSHABILITY: clampNumber(projectileBody.PUSHABILITY, 0, 20, parentDefaults.PUSHABILITY),
            KNOCKBACK: clampNumber(projectileBody.KNOCKBACK, 0, 10, parentDefaults.KNOCKBACK),
        },
    };
    if (PROJECTILE_MOTION_TYPES.has(projectile.MOTION_TYPE)) normalizedProjectile.MOTION_TYPE = projectile.MOTION_TYPE;
    if (PROJECTILE_FACING_TYPES.has(projectile.FACING_TYPE)) normalizedProjectile.FACING_TYPE = projectile.FACING_TYPE;
    if (PROJECTILE_COLLISION_TYPES.has(projectile.HITS_OWN_TYPE)) normalizedProjectile.HITS_OWN_TYPE = projectile.HITS_OWN_TYPE;
    if (typeof projectile.DIE_AT_RANGE === "boolean") normalizedProjectile.DIE_AT_RANGE = projectile.DIE_AT_RANGE;
    const normalizedAI = {};
    for (const key of ["BLIND", "FARMER", "NO_LEAD", "SKYNET"]) if (typeof projectileAI[key] === "boolean") normalizedAI[key] = projectileAI[key];
    if (Object.keys(normalizedAI).length) normalizedProjectile.AI = normalizedAI;

    const normalized = {
        EDITOR_DISABLED: gun.EDITOR_DISABLED === true,
        POSITION: {
            LENGTH: clampNumber(position.LENGTH, 2, 60, 18),
            WIDTH: clampNumber(position.WIDTH, 2, 30, 8),
            ASPECT: clampNumber(position.ASPECT, -5, 5, 1),
            X: clampNumber(position.X, -30, 30, 0),
            Y: clampNumber(position.Y, -30, 30, 0),
            ANGLE: clampNumber(position.ANGLE, -360, 360, index * 30),
            DELAY: clampNumber(position.DELAY, 0, 0.99, 0),
            LAYER: clampNumber(position.LAYER, -10, 10, 0),
        },
        PROPERTIES: {
            AUTOFIRE: cleanBoolean("AUTOFIRE"),
            ALT_FIRE: cleanBoolean("ALT_FIRE"),
            FIXED_RELOAD: cleanBoolean("FIXED_RELOAD"),
            SHOOT_ON_DEATH: cleanBoolean("SHOOT_ON_DEATH"),
            WAIT_TO_CYCLE: cleanBoolean("WAIT_TO_CYCLE"),
            DELAY_SPAWN: cleanBoolean("DELAY_SPAWN"),
            INDEPENDENT_CHILDREN: cleanBoolean("INDEPENDENT_CHILDREN"),
            INDEPENDENT_MASTER: cleanBoolean("INDEPENDENT_MASTER"),
            SYNCS_SKILLS: cleanBoolean("SYNCS_SKILLS"),
            NEGATIVE_RECOIL: cleanBoolean("NEGATIVE_RECOIL"),
            DESTROY_OLDEST_CHILD: cleanBoolean("DESTROY_OLDEST_CHILD"),
            COLOR: Math.round(clampNumber(properties.COLOR, 0, 18, 2)),
            MAX_BULLETS: Math.round(clampNumber(properties.MAX_BULLETS, 1, 100, 8)),
            SHOOT_SETTINGS: {
                reload: clampNumber(shoot.reload, 0.2, 20, 1),
                recoil: clampNumber(shoot.recoil, 0, 10, 1),
                shudder: clampNumber(shoot.shudder, 0, 10, 1),
                size: clampNumber(shoot.size, 0.1, 10, 1),
                health: clampNumber(shoot.health, 0.1, 20, 1),
                damage: clampNumber(shoot.damage, 0.1, 20, 1),
                pen: clampNumber(shoot.pen, 0.1, 20, 1),
                speed: clampNumber(shoot.speed, 0.1, 10, 1),
                maxSpeed: clampNumber(shoot.maxSpeed, 0.1, 10, 1),
                range: clampNumber(shoot.range, 0.1, 10, 1),
                density: clampNumber(shoot.density, 0.1, 20, 1),
                spray: clampNumber(shoot.spray, 0, 10, 1),
                resist: clampNumber(shoot.resist, 0, 10, 1),
            },
            TYPE: normalizedProjectile,
        },
    };
    if (GUN_STAT_CALCULATORS.has(properties.STAT_CALCULATOR)) normalized.PROPERTIES.STAT_CALCULATOR = properties.STAT_CALCULATOR;
    for (const key of ["INDEPENDENT_CHILDREN", "INDEPENDENT_MASTER", "SYNCS_SKILLS", "NEGATIVE_RECOIL"]) {
        if (properties[key] === true) normalized.PROPERTIES[key] = true;
    }
    if (Number.isFinite(Number(properties.MAX_CHILDREN))) {
        normalized.PROPERTIES.MAX_CHILDREN = Math.round(clampNumber(properties.MAX_CHILDREN, 0, 64, 0));
    }
    if (Number.isFinite(Number(properties.SPAWN_OFFSET))) {
        normalized.PROPERTIES.SPAWN_OFFSET = clampNumber(properties.SPAWN_OFFSET, 0.1, 5, 1);
    }
    return normalized;
}

function normalizeDefinition(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Tank data must be an object.");
    const label = cleanName(input.LABEL);
    const shape = Math.round(clampNumber(input.SHAPE, 0, 12, 0));
    const color = 2;
    const size = clampNumber(input.SIZE, 4, 60, 12);
    const bodyInput = input.BODY && typeof input.BODY === "object" && !Array.isArray(input.BODY) ? input.BODY : {};
    const body = {
        SPEED: 1,
        ACCELERATION: 1,
        HEALTH: clampNumber(bodyInput.HEALTH, 0.1, 10, 1),
        REGEN: clampNumber(bodyInput.REGEN, 0, 10, 1),
        DAMAGE: clampNumber(bodyInput.DAMAGE, 0.1, 10, 1),
        SHIELD: clampNumber(bodyInput.SHIELD, 0, 10, 0),
        PENETRATION: clampNumber(bodyInput.PENETRATION, 0.1, 10, 1),
        DENSITY: clampNumber(bodyInput.DENSITY, 0.1, 10, 1),
        FOV: clampNumber(bodyInput.FOV, 0.5, 2, 1),
    };
    const gunInputs = Array.isArray(input.GUNS) ? input.GUNS : [];
    const turretInputs = Array.isArray(input.TURRETS) ? input.TURRETS : [];
    if (gunInputs.length + turretInputs.reduce((count, turret) => count + (Array.isArray(turret?.GUNS) ? turret.GUNS.length : 0), 0) > MAX_GUNS_PER_TANK) {
        throw new Error(`A tank can have at most ${MAX_GUNS_PER_TANK} active or disabled weapon barrels in total.`);
    }
    if (turretInputs.length > MAX_TURRETS) throw new Error(`A tank can have up to ${MAX_TURRETS} mounted turrets.`);
    const guns = gunInputs.map((gun, index) => normalizeGun(gun, index));
    const turrets = turretInputs.map((turret, index) => {
        if (!turret || typeof turret !== "object" || Array.isArray(turret)) throw new Error(`Turret ${index + 1} is invalid.`);
        const position = turret.POSITION && typeof turret.POSITION === "object" && !Array.isArray(turret.POSITION) ? turret.POSITION : {};
        const turretGuns = Array.isArray(turret.GUNS) ? turret.GUNS : [];
        if (turretGuns.length > MAX_GUNS_PER_TURRET) throw new Error(`Turret ${index + 1} can have up to ${MAX_GUNS_PER_TURRET} guns.`);
        return {
            POSITION: {
                SIZE: clampNumber(position.SIZE, 4, 24, 10),
                X: clampNumber(position.X, -24, 24, 0),
                Y: clampNumber(position.Y, -24, 24, 0),
                DIRECTION: clampNumber(position.DIRECTION ?? position.ANGLE, -360, 360, 0),
                ARC: clampNumber(position.ARC, 30, 360, 360),
                SCALE: clampNumber(position.SCALE, 0.5, 2, 1),
            },
            COLOR: Math.round(clampNumber(turret.COLOR, 0, 18, color)),
            SHAPE: Math.round(clampNumber(turret.SHAPE, 0, 12, 0)),
            GUNS: turretGuns.map((gun, gunIndex) => normalizeGun(gun, gunIndex, `Turret ${index + 1} gun`)),
        };
    });
    return { PARENT: "genericTank", LABEL: label, SHAPE: shape, COLOR: color, SIZE: size, BODY: body, GUNS: guns, TURRETS: turrets };
}

function emptyStore() { return { schemaVersion: 2, testers: {} }; }

function readStore() {
    let raw;
    try { raw = JSON.parse(fs.readFileSync(savePath, "utf8")); }
    catch (error) {
        if (error.code === "ENOENT") return emptyStore();
        console.error("[Tank Editor] Could not read saved tanks:", error.message);
        throw new Error("Saved tank data could not be read; refusing to overwrite it.");
    }
    if (raw?.schemaVersion === 2 && raw.testers && typeof raw.testers === "object" && !Array.isArray(raw.testers)) return raw;

    // Migrate the original private-array format without losing existing saves.
    const migrated = emptyStore();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) for (const [ownerKey, oldTanks] of Object.entries(raw)) {
        if (!Array.isArray(oldTanks)) continue;
        const tanks = oldTanks.map(old => {
            const timestamp = old.updatedAt || new Date(0).toISOString();
            const definition = normalizeDefinition(old.definition || {});
            return {
                id: old.id || crypto.randomUUID(), name: cleanName(old.name || definition.LABEL), description: "",
                creatorName: "Legacy Tester", createdAt: old.createdAt || timestamp, updatedAt: timestamp,
                version: 1, status: "Draft", reviewNote: "", definition,
                versions: [{ version: 1, savedAt: timestamp, name: cleanName(old.name || definition.LABEL), description: "", status: "Draft", definition }],
            };
        });
        if (tanks.length) migrated.testers[ownerKey] = { creatorName: "Legacy Tester", tanks };
    }
    return migrated;
}

async function acquireLock() {
    fs.mkdirSync(path.dirname(savePath), { recursive: true });
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
        try {
            const handle = await fs.promises.open(lockPath, "wx");
            await handle.writeFile(JSON.stringify({ pid: process.pid, threadId, createdAt: Date.now() }));
            return handle;
        } catch (error) {
            if (error.code !== "EEXIST") throw error;
            try {
                const info = await fs.promises.stat(lockPath);
                if (Date.now() - info.mtimeMs > 30000) await fs.promises.unlink(lockPath);
            } catch (statError) { if (statError.code !== "ENOENT") throw statError; }
            await new Promise(resolve => setTimeout(resolve, 20 + Math.floor(Math.random() * 30)));
        }
    }
    throw new Error("Tank storage is busy. Please retry in a moment.");
}

async function mutateStore(mutator) {
    const lock = await acquireLock();
    let tempPath;
    try {
        const store = readStore();
        const result = mutator(store);
        const serialized = JSON.stringify(store, null, 2);
        if (Buffer.byteLength(serialized, "utf8") > MAX_STORE_BYTES) throw new Error("Tank workshop storage is full. Remove old designs first.");
        tempPath = `${savePath}.${process.pid}.${threadId}.${crypto.randomUUID()}.tmp`;
        const tempFile = await fs.promises.open(tempPath, "wx");
        try {
            await tempFile.writeFile(serialized, "utf8");
            await tempFile.sync();
        } finally {
            await tempFile.close();
        }
        await fs.promises.rename(tempPath, savePath);
        return result == null ? result : safeClone(result);
    } finally {
        if (tempPath) await fs.promises.unlink(tempPath).catch(() => {});
        await lock.close().catch(() => {});
        await fs.promises.unlink(lockPath).catch(() => {});
    }
}

function getOwnerKey(name, ownerToken) {
    const normalized = String(name || "").trim().toLowerCase().slice(0, 48);
    const token = String(ownerToken || "");
    if (!normalized || !/^[0-9a-f-]{36}$/i.test(token)) return null;
    return crypto.createHash("sha256").update(`${normalized}\0${token}`).digest("hex");
}

function findRecord(store, id) {
    for (const [ownerKey, tester] of Object.entries(store.testers)) {
        const tank = tester.tanks.find(entry => entry.id === id);
        if (tank) return { ownerKey, tester, tank };
    }
    return null;
}

function snapshot(tank, version) {
    return {
        version,
        savedAt: new Date().toISOString(),
        name: tank.name,
        description: tank.description,
        status: tank.status,
        definition: safeClone(tank.definition),
    };
}

function createRecord(creatorName, data) {
    const definition = normalizeDefinition(data.definition);
    const name = cleanName(data.name || definition.LABEL);
    definition.LABEL = name;
    const record = {
        id: crypto.randomUUID(), name, description: cleanDescription(data.description),
        creatorName: String(creatorName || "Unknown Tester").trim().slice(0, 48) || "Unknown Tester",
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        version: 1, status: STATUSES.has(data.status) && ["Draft", "Testing", "Submitted"].includes(data.status) ? data.status : "Draft",
        reviewNote: "", definition, versions: [],
    };
    record.versions.push(snapshot(record, 1));
    return record;
}

function replaceCurrent(tank, data, status) {
    const definition = normalizeDefinition(data.definition);
    const nextVersion = tank.version + 1;
    tank.name = cleanName(data.name || definition.LABEL);
    tank.description = cleanDescription(data.description);
    definition.LABEL = tank.name;
    tank.definition = definition;
    tank.version = nextVersion;
    tank.status = status;
    tank.updatedAt = new Date().toISOString();
    tank.versions.push(snapshot(tank, nextVersion));
    return tank;
}

function privateList(ownerName, ownerToken) {
    const ownerKey = getOwnerKey(ownerName, ownerToken);
    return ownerKey ? safeClone(readStore().testers[ownerKey]?.tanks || []) : [];
}

function listAll(options = {}) {
    const search = String(options.search || "").trim().toLowerCase().slice(0, 80);
    const status = String(options.status || "");
    const creator = String(options.creator || "").trim().toLowerCase().slice(0, 48);
    const sort = options.sort === "oldest" ? 1 : -1;
    const offset = Math.round(clampNumber(options.offset, 0, 10000, 0));
    const limit = Math.round(clampNumber(options.limit, 1, 100, 50));
    const tanks = [];
    for (const tester of Object.values(readStore().testers)) for (const tank of tester.tanks) {
        if (status && tank.status !== status) continue;
        if (creator && !tank.creatorName.toLowerCase().includes(creator)) continue;
        if (search && !`${tank.name} ${tank.description} ${tank.creatorName}`.toLowerCase().includes(search)) continue;
        tanks.push({ id: tank.id, name: tank.name, creatorName: tank.creatorName, createdAt: tank.createdAt, updatedAt: tank.updatedAt, version: tank.version, status: tank.status });
    }
    tanks.sort((a, b) => sort * (Date.parse(a.updatedAt) - Date.parse(b.updatedAt)));
    return { total: tanks.length, offset, limit, tanks: tanks.slice(offset, offset + limit) };
}

function getTank(id) {
    const found = findRecord(readStore(), String(id || ""));
    if (!found) return null;
    return safeClone(found.tank);
}

function registerClassInNamespace(namespace, tankId, input) {
    const definition = normalizeDefinition(input);
    const livePreview = tankId === "preview";
    const classKey = livePreview
        ? `aetherEditor_${namespace}_preview`
        : `aetherEditor_${namespace}_${crypto.createHash("sha256").update(`${tankId}:${JSON.stringify(definition)}`).digest("hex").slice(0, 20)}`;
    let nextIndex = 0;
    for (const value of Object.values(global.Class)) {
        const current = Number(value?.index);
        if (Number.isInteger(current)) nextIndex = Math.max(nextIndex, current + 1);
    }
    let classIndex = Number(global.Class[classKey]?.index);
    if (!Number.isInteger(classIndex)) classIndex = nextIndex++;
    const turretDefinitions = definition.TURRETS.map((turret, turretIndex) => {
        const turretClass = `${classKey}_turret_${turretIndex}`;
        const currentTurretIndex = Number(global.Class[turretClass]?.index);
        const turretClassIndex = Number.isInteger(currentTurretIndex) ? currentTurretIndex : nextIndex++;
        global.Class[turretClass] = {
            PARENT: "autoTankGun", LABEL: `${definition.LABEL} Turret`, COLOR: turret.COLOR,
            SHAPE: turret.SHAPE, GUNS: runtimeGuns(turret.GUNS), index: String(turretClassIndex),
        };
        global.classMap.set(turretClassIndex, turretClass);
        return {
            POSITION: [turret.POSITION.SIZE, turret.POSITION.X, turret.POSITION.Y, turret.POSITION.DIRECTION, turret.POSITION.ARC, turret.POSITION.SCALE],
            TYPE: turretClass,
        };
    });
    global.Class[classKey] = { ...definition, GUNS: runtimeGuns(definition.GUNS), TURRETS: turretDefinitions, index: String(classIndex) };
    global.classMap.set(classIndex, classKey);
    if (livePreview) for (let turretIndex = definition.TURRETS.length; turretIndex < MAX_TURRETS; turretIndex++) {
        const oldTurret = `${classKey}_turret_${turretIndex}`;
        const oldIndex = Number(global.Class[oldTurret]?.index);
        if (global.Class[oldTurret]) delete global.Class[oldTurret];
        if (Number.isInteger(oldIndex)) global.classMap.delete(oldIndex);
    }
    return classKey;
}

function registerClass(ownerName, ownerToken, tankId, definition) {
    const ownerKey = getOwnerKey(ownerName, ownerToken);
    if (!ownerKey) throw new Error("Your private tester profile is unavailable.");
    return registerClassInNamespace(ownerKey.slice(0, 12), tankId, definition);
}

function registerClassForReview(tankId, definition) {
    return registerClassInNamespace("review", tankId, definition);
}

function registerApprovedArmsRaceTanks() {
    if (!global.Config?.arms_race && !global.Config?.arms_race_only) return [];
    const baseTank = global.Class?.basic;
    if (!baseTank) return [];
    const approved = Object.values(readStore().testers)
        .flatMap(tester => Array.isArray(tester?.tanks) ? tester.tanks : [])
        .filter(tank => tank?.status === "Approved" && tank?.id && tank?.definition)
        .sort((a, b) => String(a.reviewedAt || a.updatedAt).localeCompare(String(b.reviewedAt || b.updatedAt)))
        .slice(0, MAX_APPROVED_ARMS_RACE_TANKS);
    const tier = "UPGRADES_TIER_2";
    if (!Array.isArray(baseTank[tier])) baseTank[tier] = [];
    const registered = [];
    for (const tank of approved) {
        const classKey = registerClassInNamespace("armsRace", tank.id, tank.definition);
        if (!baseTank[tier].includes(classKey)) baseTank[tier].push(classKey);
        registered.push(classKey);
    }
    return registered;
}

async function save(ownerName, ownerToken, data) {
    const ownerKey = getOwnerKey(ownerName, ownerToken);
    if (!ownerKey) throw new Error("Set a player name before saving tanks.");
    const normalizedDefinition = normalizeDefinition(data.definition);
    const status = ["Draft", "Testing", "Submitted"].includes(data.status) ? data.status : "Draft";
    const creatorName = String(ownerName || "Unknown Tester").trim().slice(0, 48) || "Unknown Tester";
    return mutateStore(store => {
        let tester = store.testers[ownerKey];
        if (!tester) {
            if (Object.keys(store.testers).length >= MAX_TESTERS) throw new Error(`The Tank Editor has reached its limit of ${MAX_TESTERS} tester profiles.`);
            tester = store.testers[ownerKey] = { creatorName, tanks: [] };
        }
        const tanks = tester.tanks;
        let existing = data.id ? tanks.find(tank => tank.id === String(data.id)) : null;
        if (!existing && data.id) throw new Error("That tank does not belong to your tester profile.");
        if (existing) {
            return replaceCurrent(existing, { ...data, definition: normalizedDefinition }, status);
        }
        if (tanks.length >= MAX_TANKS_PER_TESTER) throw new Error(`You can save up to ${MAX_TANKS_PER_TESTER} tanks.`);
        const tank = createRecord(creatorName, { ...data, definition: normalizedDefinition, status });
        tanks.push(tank);
        return tank;
    });
}

async function remove(ownerName, ownerToken, id) {
    const ownerKey = getOwnerKey(ownerName, ownerToken);
    if (!ownerKey) return false;
    return mutateStore(store => {
        const tester = store.testers[ownerKey];
        if (!tester) return false;
        const index = tester.tanks.findIndex(tank => tank.id === id);
        if (index === -1) return false;
        tester.tanks.splice(index, 1);
        if (!tester.tanks.length) delete store.testers[ownerKey];
        return true;
    });
}

async function adminReview(id, status, note, reviewer) {
    if (!new Set(["Approved", "Rejected", "Archived", "Submitted", "Testing", "Draft"]).has(status)) throw new Error("Invalid review status.");
    return mutateStore(store => {
        const found = findRecord(store, id);
        if (!found) throw new Error("That saved tank was not found.");
        found.tank.status = status;
        found.tank.reviewNote = String(note || "").trim().slice(0, 1000);
        found.tank.reviewedBy = String(reviewer || "Developer").trim().slice(0, 48);
        found.tank.reviewedAt = new Date().toISOString();
        found.tank.updatedAt = new Date().toISOString();
        return found.tank;
    });
}

async function adminRename(id, name) {
    const clean = cleanName(name);
    return mutateStore(store => {
        const found = findRecord(store, id);
        if (!found) throw new Error("That saved tank was not found.");
        replaceCurrent(found.tank, { name: clean, description: found.tank.description, definition: found.tank.definition }, "Draft");
        return found.tank;
    });
}

async function adminDuplicate(id, creatorName = "Aether Developer") {
    return mutateStore(store => {
        const found = findRecord(store, id);
        if (!found) throw new Error("That saved tank was not found.");
        if (found.tester.tanks.length >= MAX_TANKS_PER_TESTER) throw new Error(`This tester already has ${MAX_TANKS_PER_TESTER} tanks.`);
        const copy = createRecord(creatorName, {
            name: `${found.tank.name} Copy`, description: found.tank.description,
            definition: found.tank.definition, status: "Draft",
        });
        copy.duplicatedFrom = found.tank.id;
        found.tester.tanks.push(copy);
        return copy;
    });
}

async function adminDelete(id) {
    return mutateStore(store => {
        const found = findRecord(store, id);
        if (!found) return false;
        found.tester.tanks.splice(found.tester.tanks.indexOf(found.tank), 1);
        if (!found.tester.tanks.length) delete store.testers[found.ownerKey];
        return true;
    });
}

async function adminRestore(id, versionNumber) {
    return mutateStore(store => {
        const found = findRecord(store, id);
        if (!found) throw new Error("That saved tank was not found.");
        const oldVersion = found.tank.versions.find(version => version.version === Number(versionNumber));
        if (!oldVersion) throw new Error("That version was not found.");
        replaceCurrent(found.tank, { name: oldVersion.name, description: oldVersion.description, definition: oldVersion.definition }, "Draft");
        found.tank.restoredFromVersion = oldVersion.version;
        return found.tank;
    });
}

function adminCompare(id, firstVersion, secondVersion) {
    const tank = getTank(id);
    if (!tank) throw new Error("That saved tank was not found.");
    const first = tank.versions.find(version => version.version === Number(firstVersion));
    const second = tank.versions.find(version => version.version === Number(secondVersion));
    if (!first || !second) throw new Error("One of those versions was not found.");
    return { id: tank.id, name: tank.name, first: safeClone(first), second: safeClone(second) };
}

module.exports = {
    list: privateList, listAll, getTank, save, remove, normalizeDefinition, registerClass,
    registerClassForReview, registerApprovedArmsRaceTanks, adminReview, adminRename, adminDuplicate, adminDelete, adminRestore,
    adminCompare, STATUSES,
};
