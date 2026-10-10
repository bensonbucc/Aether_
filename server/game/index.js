class gameHandler {
    constructor() {
    this.botControl = {
    mode: "mouse",
    x: 0,
    y: 0
};   
 this.loopCounter = 0;
        this.loophealCounter = 0;
        this.bots = [];
        this.defenders = new Map();
        this.foods = [];
        this.nestFoods = [];
        this.enemyFoods = [];
        this.auraCollideTypes = ["miniboss", "tank", "food", "crasher"]
        this.naturallySpawnedBosses = [];
        this.bossTimer = 0;
        this.active = false;

        // Persistent NULL AI memory.
        this.nullMemory = new (require("./ai/nullMemory").NullMemory)();
    }
    checkUsers = () => global.gameManager.clients.length >= 1;
    // Collision stuff
    collide = (instance, other) => {

        // Fast exit for noclip or ghosts
        if (instance.noclip || other.noclip) return 0;

        // Emit collision events
        instance.emit('collide', { body: instance, instance, other });
        other.emit('collide', { body: other, instance: other, other: instance });
        // Custom tick handlers for bullet entities
        if (instance.tickHandler) instance.tickHandler(instance, instance, other);
        if (other.tickHandler) other.tickHandler(other, other, instance);

        if (instance.settings.no_collisions || 
            instance.master.master.settings.no_collisions || 
            other.settings.no_collisions || 
            other.master.master.settings.no_collisions
        )  return 0;

        // Ghost checks (merged for less code repetition)
        for (const obj of [instance, other]) {
            if (obj.isGhost || obj.isDead()) {
                if (obj.isInGrid) {
                    obj.destroy();
                }
                return 0;
            }
        }

        // Fast exit for inactive or invisible entities
        if (
            (instance.isArenaCloser && !instance.alpha) ||
            (other.isArenaCloser && !other.alpha)
        ) return 0;

        // Fast exit for wall-vs-wall with never-collide
        if (
            instance.settings.hitsOwnType === "never" &&
            other.settings.hitsOwnType === "never" &&
            instance.team === other.team &&
            instance.type === "wall" && other.type === "wall"
        ) return;
        switch (true) {
            case instance.isPortal || other.isPortal:
                let [portal, otherBody] = instance.isPortal ? [instance, other] : [other, instance];

                if (portal.settings.destination && otherBody.isPlayer && otherBody.socket) {
                    global.gameManager.socketManager.sendToServer(otherBody.socket, portal.settings.destination);
                } else if (["bullet", "drone", "trap", "satellite"].includes(otherBody.type)) {
                    if (otherBody.master !== portal) otherBody.kill();
                }
                else if (!["wall", "aura"].includes(otherBody.type)) advancedcollide(portal, otherBody, false, false);
                break;
            case instance.type === "wall" || other.type === "wall":
                if (instance.type === "wall" && other.type === "wall") return;
                if (instance.type === "aura" || other.type === "aura") return;
                if (instance.type === "satellite" || other.type === "satellite") return;
                let wall = instance.type === "wall" ? instance : other;
                let entity = instance.type === "wall" ? other : instance;
                if (entity.isArenaCloser || entity.master.isArenaCloser) return;
                switch (wall.shape) {
                    case 4:
                        switch (wall.walltype) {
                            case 1:
                                mazewallcollide(wall, entity);
                                break;
                            default:
                                mazewallcustomcollide(wall, entity);
                                break;
                        }
                        break;
                    default:
                        mooncollide(wall, entity);
                        break;
                }
                break;
            case instance.team === other.team &&
                (instance.settings.hitsOwnType === "pushOnlyTeam" ||
                    other.settings.hitsOwnType === "pushOnlyTeam"):
                {
                    let pusher = instance.settings.hitsOwnType === "pushOnlyTeam" ? instance : other;
                    let entity = instance.settings.hitsOwnType === "pushOnlyTeam" ? other : instance;
                    // Dominator / Mothership collisions
                    if (
                        instance.settings.hitsOwnType === other.settings.hitsOwnType ||
                        entity.settings.hitsOwnType === "never"
                    ) return;
                    let a = 1 + 10 / (Math.max(entity.velocity.length, pusher.velocity.length) + 10);
                    advancedcollide(pusher, entity, false, false, a);
                }
                break;
            case instance.team === other.team &&
                (instance.settings.hitsOwnType === "droneCollision" &&
                    other.settings.hitsOwnType === "droneCollision"):
                {
                    let a = 1 + 10 / (Math.max(instance.velocity.length, other.velocity.length));
                    firmcollide(instance, other, a);
                }
                break;
            case (instance.type === "crasher" && other.type === "food" && instance.team === other.team) ||
                (other.type === "crasher" && instance.type === "food" && other.team === instance.team):
                firmcollide(instance, other);
                break;
            case instance.team !== other.team ||
                (instance.team === other.team && (instance.healer && instance.master.id !== other.id) || (other.healer && other.master.id !== instance.id)):
                // Exits if the aura is not hitting a boss, tank, food, or crasher
                if (instance.type === "aura") {
                    if (!(this.auraCollideTypes.includes(other.type))) return;
                } else if (other.type === "aura") {
                    if (!(this.auraCollideTypes.includes(instance.type))) return;
                }
                advancedcollide(instance, other, true, true);
                const ricochetBullet = instance.type === "bullet" && instance.aetherRicochet
                    ? instance
                    : other.type === "bullet" && other.aetherRicochet ? other : null;
                const ricochetTarget = ricochetBullet === instance ? other : instance;
                if (ricochetBullet && ricochetTarget.type === "tank") {
                    let normalX = ricochetBullet.x - ricochetTarget.x;
                    let normalY = ricochetBullet.y - ricochetTarget.y;
                    let normalLength = Math.hypot(normalX, normalY);
                    if (normalLength < 0.001) {
                        normalLength = Math.hypot(ricochetBullet.velocity.x, ricochetBullet.velocity.y) || 1;
                        normalX = -ricochetBullet.velocity.x / normalLength;
                        normalY = -ricochetBullet.velocity.y / normalLength;
                    } else {
                        normalX /= normalLength;
                        normalY /= normalLength;
                    }
                    const velocity = ricochetBullet.velocity;
                    const towardTarget = velocity.x * normalX + velocity.y * normalY;
                    if (towardTarget < 0) {
                        velocity.x -= 2 * towardTarget * normalX;
                        velocity.y -= 2 * towardTarget * normalY;
                    }
                    const currentSpeed = Math.hypot(velocity.x, velocity.y);
                    if (currentSpeed > 0) {
                        const nextTopSpeed = Math.min(ricochetBullet.aetherRicochetBaseSpeed * 3, Math.max(ricochetBullet.topSpeed, ricochetBullet.aetherRicochetBaseSpeed) * 1.3);
                        const boostedSpeed = Math.min(currentSpeed * 1.3, nextTopSpeed);
                        ricochetBullet.velocity.x = velocity.x / currentSpeed * boostedSpeed;
                        ricochetBullet.velocity.y = velocity.y / currentSpeed * boostedSpeed;
                        ricochetBullet.topSpeed = nextTopSpeed;
                        ricochetBullet.maxSpeed = nextTopSpeed;
                    }
                    ricochetBullet.x = ricochetTarget.x + normalX * (ricochetTarget.realSize + ricochetBullet.realSize + 2);
                    ricochetBullet.y = ricochetTarget.y + normalY * (ricochetTarget.realSize + ricochetBullet.realSize + 2);
                    ricochetBullet.damageReceived = 0;
                    ricochetBullet.health.amount = ricochetBullet.health.max;
                }
                break;
            case instance.settings.hitsOwnType == "never" ||
                other.settings.hitsOwnType == "never":
                break;
            case instance.settings.hitsOwnType === other.settings.hitsOwnType:
                switch (instance.settings.hitsOwnType) {
                    case 'assembler': {
                        if (instance.assemblerLevel == null) instance.assemblerLevel = 1;
                        if (other.assemblerLevel == null) other.assemblerLevel = 1;
                        const [target1, target2] = (instance.id > other.id) ? [instance, other] : [other, instance];
                        if (
                            target2.assemblerLevel >= 10 || target1.assemblerLevel >= 10 ||
                            target1.isDead() || target2.isDead() ||
                            (target1.parent.id !== target2.parent.id &&
                                target1.parent.id != null &&
                                target2.parent.id != null)
                        ) {
                            advancedcollide(instance, other, false, false); // continue push
                            break;
                        }
                        const better = (state) => (target1[state] > target2[state] ? target1[state] : target2[state]);
                        target1.assemblerLevel = Math.min(target2.assemblerLevel + target1.assemblerLevel, 10);
                        target1.SIZE = better('SIZE') * 1.15;
                        target1.SPEED = better('SPEED') * 0.9;
                        target1.HEALTH = better('HEALTH') * 1.2;
                        target1.health.amount = target1.health.max;
                        target1.DAMAGE = better('DAMAGE') * 1.1;
                        target2.kill();
                        target1.refreshBodyAttributes();
                        for (let i = 0; i < 10; ++i) {
                            const o = new Entity(target1, target1);
                            o.define('assemblerEffect');
                            o.team = target1.team;
                            o.color = target1.color;
                            o.SIZE = target1.SIZE / 1.5;
                            o.velocity = new Vector((Math.random() - 0.5) * 25, (Math.random() - 0.5) * 15);
                            o.refreshBodyAttributes();
                            o.life();
                        }
                    } // don't break
                    case "push":
                        advancedcollide(instance, other, false, false);
                        break;
                    case "hard":
                        firmcollide(instance, other);
                        break;
                    case "hardWithBuffer":
                        firmcollide(instance, other, 30);
                        break;
                    case "hardOnlyTanks":
                        if (
                            instance.type === "tank" &&
                            other.type === "tank" &&
                            !instance.isDominator &&
                            !other.isDominator
                        ) {
                            switch (Config.train) {
                                case true:
                                    firmcollidehard(instance, other, 20);
                                    break;
                                default: 
                                    firmcollide(instance, other);
                                    break;
                            }
                            
                        };
                        break;
                    case "hardOnlyBosses":
                        if (instance.type === other.type && instance.type === "miniboss")
                            firmcollide(instance, other);
                        break;
                    case "repel":
                        simplecollide(instance, other);
                        break;
                }
                break;
        }
    };

    gameloop() {
        logs.loops.tally();
        logs.master.set();

        // Do entities life
        logs.entities.set();
        grid.clear();
        for (const instance of entities.values()) {
            if (instance.contemplationOfMortality() === 1) {
                if (Config.outbreak && !instance.zombified && !instance.isLamentisCursed && (instance.isPlayer || instance.isBot)) {
                    instance.zombified = true;
                    instance.settings.no_collisions = true;
                    instance.alpha = 0;
                    instance.takeSelfie();
                    Config.OURBREAK_FUNCTIONS.zombify(instance);
                } else instance.destroy();
                continue;
            }

            // Reset collision array once at the beginning
            instance.collisionArray.length = 0;

            // Handle physics only if not bonded
            if (instance.bond == null) {
                // Resolve the physical behavior from the last collision cycle.
                logs.physics.set();
                instance.physics();
                logs.physics.mark();
            }

            if (instance.activation.active || instance.isPlayer) {
                logs.entities.tally();
                // Think about my actions.
                logs.life.set();
                instance.life();
                logs.life.mark();
                // Take a selfie.
                logs.selfie.set();
                instance.takeSelfie();
                logs.selfie.mark();
                // Apply friction.
                instance.friction();
                instance.confinementToTheseEarthlyShackles();
            }

            // Update axis-aligned bounding box
            instance.updateAABB(instance.activation.active);
            // Check collisions.
            logs.collide.set();
            for (const other of grid.query(instance.minX, instance.minY, instance.maxX, instance.maxY).values()) {
                this.collide(instance, other);
            }
            // A bullet/trap that hit a maze wall gets one collision pass so
            // it can still hit a target occupying the wall area. Keep it alive
            // briefly so the client can actually render the projectile.
            if (instance.destroyAfterCollisionPass) {
                if (Date.now() >= instance.wallHitVisualUntil) {
                    instance.destroyAfterCollisionPass = false;
                    instance.destroy();
                    continue;
                }

                logs.collide.mark();
                continue;
            }

            if (instance.isInGrid) grid.insert(instance, instance.minX, instance.minY, instance.maxX, instance.maxY);
            if ((instance.touchingSizeWall === false || instance.collisionArray.length === 0) && instance.originalSize) {
                instance.SIZE = instance.originalSize;
                instance.originalSize = undefined;
            }
            if ((instance.touchingFovWall === false || instance.collisionArray.length === 0) && instance.originalFov) {
                instance.FOV = instance.originalFov;
                instance.originalFov = undefined;
            }
            // Check whether we want to live.
            logs.activation.set();
            instance.activation.update();
            logs.activation.mark();

            instance.emit('tick', { body: instance });
        }
        logs.entities.mark();
        logs.master.mark();
        // Update lastCycle only once
        global.gameManager.room.lastCycle = util.time();
        for (let i = 0; i < global.gameManager.clients.length; i++) {
            let client = global.gameManager.clients[i];
            if (client.status.readyToBroadcast) {
                client.view.gazeUpon();
            }
        }
    };

    foodloop() {
        if (global.gameManager.arenaClosed) return;

        // Helper to pick a type from a weighted set
        const pickFromChanceSet = (set) => {
            while (Array.isArray(set)) {
                set = set[ran.chooseChance(...set.map(e => e[0]))][1];
            }
            return set;
        };

        // Helper to spawn a food entity
        const spawnFoodEntity = (tile, layeredSet) => {
            const o = new Entity(tile);
            const type = pickFromChanceSet(layeredSet);
            o.define(type);
            o.facing = ran.randomAngle();
            o.team = TEAM_ENEMIES;
            o.isFood = true;
            return o;
        };

        if (Math.random() >= 0.1) return; // 1/10 chance to spawn food

        let totalFoods = 1;
        if (Math.random() < 0.2) { // 1/5 chance to spawn a group
            totalFoods = 1 + Math.floor(Math.random() * Config.food_group_cap);
        }

        // Helper for cleanup interval
        const setupCleanup = (arr, o) => {
            const loop = setInterval(() => {
                if (o.isDead()) {
                    util.remove(arr, arr.indexOf(o));
                    clearInterval(loop);
                }
            }, 1500);
        };

        // Nest food/enemy spawn
        if (Math.random() < 1 / 3 && global.gameManager.room.spawnable[TEAM_ENEMIES]) {
            // Enemy spawn
            if (Config.classic_food && Math.random() < 1 / 3 && this.enemyFoods.length < Config.enemy_cap_nest) {
                const tile = ran.choose(global.gameManager.room.spawnable[TEAM_ENEMIES]).randomInside();
                const o = spawnFoodEntity(tile, Config.classic_enemy_types_nest);
                this.enemyFoods.push(o);
                setupCleanup(this.enemyFoods, o);
            }
            // Nest food spawn
            if (this.nestFoods.length < Config.food_cap_nest) {
                const tile = ran.choose(global.gameManager.room.spawnable[TEAM_ENEMIES]).randomInside();
                for (let i = 0; i < totalFoods; i++) {
                    if (Config.classic_food) {
                        const o = spawnFoodEntity(tile, Config.classic_food_types_nest);
                        this.nestFoods.push(o);
                        setupCleanup(this.nestFoods, o);
                    } else {
                        const o = spawnFoodEntity(tile, Config.food_types_nest);
                        this.nestFoods.push(o);
                        setupCleanup(this.nestFoods, o);
                    }
                }
            }
        } else if (this.foods.length < Config.food_cap) {
            // Regular food spawn
            const tile = ran.choose(global.gameManager.room.spawnableDefault).randomInside();
            for (let i = 0; i < totalFoods; i++) {
                if (Config.classic_food) {
                    const o = spawnFoodEntity(tile, Config.classic_food_types);
                    this.foods.push(o);
                    setupCleanup(this.foods, o);
                } else {
                    const o = spawnFoodEntity(tile, Config.food_types);
                    this.foods.push(o);
                    setupCleanup(this.foods, o);
                }
            }
        }
    }

    regenHealthAndShield() {
        for (let instance of entities.values()) {
            if (instance.shield.max) {
                instance.shield.regenerate();
            }
            if (instance.health.amount) {
                instance.health.regenerate(instance.shield.max && instance.shield.max === instance.shield.amount);
            }
        }
    };
    
    maintainloop = () => {   
        // Upgrade bots's skill
        for (let i = 0; i < this.bots.length; i++) {
            let o = this.bots[i];
            if (o.skill.level < Config.level_cap && o.skill.level >= Config.bot_start_level) {
                o.skill.score += Config.bot_xp_gain;            
            }
        }
        // Spawn bosses
        if (this.checkUsers() && Config.enable_bosses && !this.naturallySpawnedBosses.length && this.bossTimer++ > Config.boss_spawn_cooldown) {
            this.bossTimer = -Config.boss_spawn_delay - 2;
            let selectionIndex = ran.chooseChance(...Config.boss_types.map((selection) => selection.chance)),
                selection = Config.boss_types[selectionIndex];
            if (!selection || !selection.amount || !selection.bosses || !selection.bosses.length) {
                console.warn('Boss spawn skipped: invalid boss selection.');
                this.bossTimer = 0;
                return;
            }
            let amount = ran.chooseChance(...selection.amount) + 1;
            setSyncedTimeout(() => {
                let names = ran.chooseBossName(selection.nameType, amount);
                for (let i = 0; i < amount; i++) {
                    let spot, attempts = 30, name = names[i];
                    do { spot = getSpawnableArea(TEAM_ENEMIES, global.gameManager); } while (attempts-- && dirtyCheck(spot, 500));

                    let boss = new Entity(spot);
                    boss.define(selection.bosses.sort(() => 0.5 - Math.random())[i % selection.bosses.length]);
                    boss.team = TEAM_ENEMIES;
                    boss.isBoss = true;
                    if (name) {
                        boss.name = name;
                    }

                    this.naturallySpawnedBosses.push(boss);
                    boss.on('dead', () => util.remove(this.naturallySpawnedBosses, this.naturallySpawnedBosses.indexOf(boss)));
                }

                global.gameManager.socketManager.broadcast(`${util.listify(names)} ${names.length == 1 ? 'has' : 'have'} arrived!`);
            }, Config.boss_spawn_delay * 30);
        }
    };

    quickMaintainLoop = () => {
        // Auto get score
        for (let i = 0; i < this.bots.length; i++) {
            let o = this.bots[i];
            o.skill.maintain();
            
            if (o.botControlEnabled && o.botType === "feeder") {
                o.refreshSkills();
            } else {
                o.skillUp([ "atk", "hlt", "spd", "str", "pen", "dam", "rld", "mob", "rgn", "shi" ][ran.chooseChance(...Config.bot_skill_upgrade_chances)]);
                o.refreshSkills();
                if (!o.__openArrasBotControl && o.leftoverUpgrades && o.upgrade(ran.irandomRange(0, o.upgrades.length))) {
                    o.leftoverUpgrades--;
                }
            }
        }
    }


    enableDefenders(owner) {
        if (!owner) return;
        if (!this.defenders) this.defenders = new Map();

        let state = this.defenders.get(owner);

        if (!state) {
            state = {
                enabled: true,
                bots: new Set()
            };
            this.defenders.set(owner, state);
        } else {
            state.enabled = true;
        }

        while (state.bots.size < 5) {
            this.spawnDefender(owner);
        }
    }

    disableDefenders(owner) {
        const state = this.defenders?.get(owner);
        if (!state) return;

        state.enabled = false;

        for (const bot of [...state.bots]) {
            if (!bot) continue;

            bot.__defenderEnabled = false;

            try {
                if (!bot.isDead()) bot.kill();
            } catch (e) {
                try {
                    bot.destroy();
                } catch (_) {}
            }
        }

        state.bots.clear();
        this.defenders.delete(owner);
    }

    spawnDefender(owner) {
        const state = this.defenders?.get(owner);

        if (!owner || !state || !state.enabled || state.bots.size >= 5) {
            return null;
        }

        const loc = getSpawnableArea(
            owner.team,
            global.gameManager
        );

        const bot = this.spawnBots(
            loc,
            owner.team,
            "basic",
            "fighter"
        );

        if (!bot) return null;

        bot.__isDefender = true;
        bot.__defenderOwner = owner;
        bot.__defenderEnabled = true;

        bot.invuln = false;
        bot.godmode = false;

        state.bots.add(bot);

        bot.controllers = [];

        bot.define({
            CONTROLLERS: ["defenderBot"],
            MOTION_TYPE: "motor"
        }, false, true, false);

        bot.on("dead", () => {
            const currentState = this.defenders?.get(owner);

            if (!currentState) return;

            currentState.bots.delete(bot);

            if (
                currentState.enabled &&
                currentState.bots.size < 5 &&
                owner &&
                typeof owner.isDead === "function" &&
                !owner.isDead()
            ) {
                setTimeout(() => {
                    const latestState = this.defenders?.get(owner);

                    if (
                        latestState &&
                        latestState.enabled &&
                        latestState.bots.size < 5
                    ) {
                        this.spawnDefender(owner);
                    }
                }, 250);
            }
        });

        return bot;
    }

    autoSpawnBots = () => {

        // Sandbox never gets automatic AI bots.

        if (Config.sandbox) return;
        if (Config.breach) return;
        // Some servers disable ambient fighter bots while keeping their mode AI.
        // Siege boss waves are managed separately and are not affected here.
        if (Config.disable_auto_bots) return;
        // Only run once for this game handler.
        if (this.autoBotsSpawned) return;
        this.autoBotsSpawned = true;

        // Legion has one coordinated AI force: all automatic bots spawn red.
        if (Config.legion) {
            for (let i = 0; i < Config.bot_cap; i++) {
                const loc = getSpawnableArea(TEAM_RED, global.gameManager);
                const bot = this.spawnBots(loc, TEAM_RED, null, "fighter");
                if (!bot) break;
                bot.__aetherAutoBot = true;
            }
            return;
        }

        const teams = Number(Config.teams) || 0;

        // FFA: 10 total AI.
        if (!teams) {
            for (let i = 0; i < 10; i++) {
                const loc = getSpawnableArea(
                    null,
                    global.gameManager
                );

                const bot = this.spawnBots(
                    loc,
                    null,
                    null,
                    "fighter"
                );
                    if (bot) {
                        bot.__aetherAutoBot = true;
                    }


                if (!bot) break;
            }

            return;
        }

        // Assault: 15 Blue bots + 15 Green bots.
        if (Config.assault) {
            const assaultTeams = [TEAM_BLUE, TEAM_GREEN];

            for (const team of assaultTeams) {
                for (let i = 0; i < 15; i++) {
                    const room = global.gameManager.room;
                    const teamTiles = room.spawnable?.[team] || [];
                    const dominatorTiles = room.spawnable?.assaultDominators || [];

                    const baseTiles = teamTiles.filter(tile =>
                        !dominatorTiles.includes(tile)
                    );

                    const loc = baseTiles.length
                        ? ran.choose(baseTiles).randomInside()
                        : getSpawnableArea(team, global.gameManager);

                    const bot = this.spawnBots(
                        loc,
                        team,
                        null,
                        "fighter"
                    );
                    if (bot) {
                        bot.__aetherAutoBot = true;
                    }


                    if (!bot) break;
                }
            }

            return;
        }

        // Other team modes: 15 AI on every configured team.
        for (let team = -1; team >= -teams; team--) {
            for (let i = 0; i < 15; i++) {
                const loc = getSpawnableArea(
                    team,
                    global.gameManager
                );

                const bot = this.spawnBots(
                    loc,
                    team,
                    null,
                    "fighter"
                );
                    if (bot) {
                        bot.__aetherAutoBot = true;
                    }


                if (!bot) break;
            }
        }
    };
   spawnBots(loc, team, tank = null, botType = "fighter", customName = null, elite = false) {
    if (Config.legion) team = TEAM_RED;
    const botControllers = Config.legion
        ? ["nearestDifferentMaster", "mapTargetToGoal"]
        : Class.bot.CONTROLLERS;
    const botAISettings = Config.legion
        ? { IGNORE_SHAPES: true, BLIND: true, SKYNET: true, CHASE: true, view360: true, seeInvisible: true }
        : Class.bot.AI;
    let botName = (typeof customName === "string" && customName.trim()) ? customName.trim() : "AC_130";
    let o = new Entity(loc);

    o.define(tank || Config.spawn_class);

    const controlled = tank !== null;

    o.define({
        CONTROLLERS: controlled ? ["playerBotControl"] : botControllers,
        AI: botAISettings,
        MOTION_TYPE: controlled ? "motor" : undefined
    }, false, false, false);

    o.refreshBodyAttributes();
    o.isBot = true;
    o.botType = botType;
    o.botControlEnabled = controlled;
    o.__openArrasBotOwner = null;
    o.name = botName;
    o.invuln = true;
    o.__aetherBotWaitingForMovement = true;

    o.leftoverUpgrades = ran.chooseChance(...Config.bot_class_upgrade_chances);

    let color = Config.legion
        ? getTeamColor(TEAM_RED)
        : Config.random_body_colors
        ? Math.floor(Math.random() * 20)
        : team
            ? getTeamColor(team)
            : 'red';

    o.color.base = color;
    o.leaderboardColor = color;
    o.minimapColor = color;

    o.skill.reset();

    if (elite) {
        o.__aetherEliteAI = true;
        o.__aetherElitePreparing = true;
        o.__aetherEliteReady = false;
        o.invuln = true;

        while (o.skill.level < Config.bot_start_level) {
            o.skill.score += o.skill.levelScore;
            o.skill.maintain();
        }

        const eliteBuild = [
            "rld",
            "atk",
            "dam",
            "pen",
            "str",
            "mob",
            "spd",
            "hlt",
            "shi",
            "rgn"
        ];

        let buildIndex = 0;

        while (o.skill.points > 0) {
            let upgraded = false;

            for (let i = 0; i < eliteBuild.length; i++) {
                const stat = eliteBuild[(buildIndex + i) % eliteBuild.length];

                if (o.skill.amount(stat) < o.skill.cap(stat)) {
                    if (o.skillUp(stat)) {
                        buildIndex = (buildIndex + i + 1) % eliteBuild.length;
                        upgraded = true;
                        break;
                    }
                }
            }

            if (!upgraded) break;
        }

        o.refreshBodyAttributes();
        o.refreshSkills();
        o.__aetherElitePreparing = false;
        o.__aetherEliteReady = true;
        o.invuln = false;
    }


    let leveling = setInterval(() => {
        if (o.skill.level < Config.bot_start_level) {
            o.skill.score += o.skill.levelScore;
            o.skill.maintain();
        } else {
            clearInterval(leveling);
        }
    }, 100);

    o.refreshBodyAttributes();

    if (team) o.team = team;

    this.bots.push(o);

    if (Config.tag) {
        Config.tag_data.addBot(o);
        global.nextTagBotTeam = null;
    }

    if (!controlled) {
        setTimeout(() => {
            let CC = Class[o.defs[0]];
            if (!CC) CC = {};

            o.controllers = [];

            o.define({
                CONTROLLERS: Config.legion
                    ? botControllers
                    : CC.CONTROLLERS
                        ? [...botControllers, ...CC.CONTROLLERS]
                        : botControllers,
                FACING_TYPE: CC.FACING_TYPE
                    ? CC.FACING_TYPE
                    : Class.bot.FACING_TYPE,
                AI: botAISettings,
            }, false, true, false);

            if (CC && CC.HEALING_TANK && !Config.legion) {
                o.controllers = [];

                o.define({
                    CONTROLLERS: [
                        "healTeamMasters",
                        "minion",
                        ["wanderAroundMap", {
                            replicatePlayerMovement: true,
                            lookAtGoal: true
                        }]
                    ],
                    FACING_TYPE: CC.FACING_TYPE
                        ? CC.FACING_TYPE
                        : Class.bot.FACING_TYPE,
                    AI: Class.bot.AI,
                }, false, true, false);
            }

            o.name = botName;
            o.refreshBodyAttributes();
            o.invuln = false;

            o.on("define", () => {
                let CC = Class[o.defs[0]];

                if (CC && CC.HEALING_TANK && !Config.legion) {
                    o.controllers = [];

                    o.define({
                        CONTROLLERS: [
                            "healTeamMasters",
                            "minion",
                            ["wanderAroundMap", {
                                replicatePlayerMovement: true,
                                lookAtGoal: true
                            }]
                        ],
                        FACING_TYPE: CC.FACING_TYPE
                            ? CC.FACING_TYPE
                            : Class.bot.FACING_TYPE,
                        AI: botAISettings,
                    }, false, true, false);
                }

                o.define({
                    FACING_TYPE: CC.FACING_TYPE
                        ? CC.FACING_TYPE
                        : Class.bot.FACING_TYPE,
                    AI: botAISettings,
                }, false, true, false);
            });
        }, 3000 + Math.floor(Math.random() * 7000));
    } else {
        setTimeout(() => {
            if (o && !o.isDead()) {
                o.invuln = false;
            }
        }, 3000 + Math.floor(Math.random() * 7000));
    }

    o.on('kill', (killData) => {
        if (o.__aetherNullAI && killData?.entity) this.nullMemory.recordWin(killData.entity, o);
    });

    o.on('dead', (deathData) => {
        // NULL learns from every death without restarting Aether.
        if (o.__aetherNullAI === true) {
            this.nullMemory.recordDeath(o, deathData);
        }

        const shouldRespawn = o.__aetherAutoBot === true;
        const respawnTeam = o.team;

        util.remove(this.bots, this.bots.indexOf(o));

        if (!shouldRespawn) return;

        setTimeout(() => {
            if (!this.active) return;

            const room = global.gameManager.room;
            const teamTiles = room.spawnable?.[respawnTeam] || [];
            const dominatorTiles = room.spawnable?.assaultDominators || [];

            const baseTiles = teamTiles.filter(tile =>
                !dominatorTiles.includes(tile)
            );

            const loc = baseTiles.length
                ? ran.choose(baseTiles).randomInside()
                : getSpawnableArea(respawnTeam, global.gameManager);

            const bot = this.spawnBots(
                loc,
                respawnTeam,
                null,
                "fighter"
            );

            if (bot) {
                bot.__aetherAutoBot = true;
            }
        }, 1000);
    });

    return o;
};

    run() {
        this.active = true;
        this.autoBotsSpawned = false;

        // Spawn normal AI for every new arena.
        setTimeout(() => {
            if (this.active && !global.gameManager.arenaClosed) {
                this.autoSpawnBots();
            }
        }, 1000);
        let gameLoop;
        const runGameLoop = () => {
            if (!this.active) return;

            const tickStart = performance.now();

            if (this.checkUsers()) {
                try {
                    this.gameloop();
                    syncedDelaysLoop();
                    if (Config.enable_food) this.foodloop();
                    global.gameManager.roomLoop();
                    global.gameManager.gamemodeManager.request("quickloop");
                } catch (e) {
                    global.gameManager.gameSpeedCheckHandler.onError(e);
                    this.stop();
                    return;
                };
            }

            const tickEnd = performance.now();
            const tickTime = tickEnd - tickStart;
            global.gameManager.gameSpeedCheckHandler.recordTick(tickTime, tickEnd);
            const targetDelay = Math.max(
                0,
                global.gameManager.room.cycleSpeed - tickTime
            );

            gameLoop = setTimeout(runGameLoop, targetDelay);
        };

        gameLoop = setTimeout(
            runGameLoop,
            global.gameManager.room.cycleSpeed
        );
        let maintainloop = setInterval(() => {
            if (!this.active) return clearInterval(maintainloop);
            global.gameManager.gameSpeedCheckHandler.update();
            global.gameManager.gamemodeManager.request("loop");
            this.maintainloop();
        }, 1000);
        let otherloop = setInterval(() => {
            if (!this.active) return clearInterval(otherloop);
            this.quickMaintainLoop();
            global.gameManager.socketManager.chatLoop();
        }, 500)
        let healingLoop = setInterval(() => {
            if (!this.active) return clearInterval(healingLoop);
            this.regenHealthAndShield();
        }, Config.regenerate_tick);
    }
    stop() {
        this.active = false;

    }
}

module.exports = { gameHandler };
























































