const fs = require("fs");
const path = require("path");

const memoryPath = path.join(__dirname, "null-memory.json");

const DEFAULT_MEMORY = {
    version: 2,
    fights: 0,
    deaths: 0,
    wins: 0,
    killers: {},
    killingTools: {},
    opponents: {},
    recentDeaths: [],
    lessons: []
};

function loadMemory() {
    try {
        if (!fs.existsSync(memoryPath)) {
            fs.writeFileSync(memoryPath, JSON.stringify(DEFAULT_MEMORY, null, 2));
            return structuredClone(DEFAULT_MEMORY);
        }

        const parsed = JSON.parse(fs.readFileSync(memoryPath, "utf8"));

        return {
            ...structuredClone(DEFAULT_MEMORY),
            ...parsed,
            opponents: parsed.opponents || {},
            recentDeaths: parsed.recentDeaths || [],
            lessons: parsed.lessons || []
        };
    } catch (error) {
        console.error("[NULL AI] Failed to load memory:", error);
        return structuredClone(DEFAULT_MEMORY);
    }
}

class NullMemory {
    constructor() {
        this.data = loadMemory();

        console.log(
            `[NULL AI] Memory loaded. ` +
            `Fights: ${this.data.fights}, ` +
            `Deaths: ${this.data.deaths}, ` +
            `Wins: ${this.data.wins}, ` +
            `Opponent profiles: ${Object.keys(this.data.opponents).length}`
        );
    }

    save() {
        try {
            fs.writeFileSync(memoryPath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error("[NULL AI] Failed to save memory:", error);
        }
    }

    getOpponentKey(entity) {
        if (!entity) return "unknown";

        // Remember the same PvP opponent across reconnects even if they
        // change tanks; NPC and boss lessons remain keyed by tank class.
        if (entity.isPlayer && typeof entity.name === "string" && entity.name.trim()) {
            return "player:" + entity.name.trim().toLowerCase().slice(0, 48);
        }

        if (Array.isArray(entity.defs) && entity.defs[0]) {
            return entity.defs[0];
        }

        if (entity.label) return entity.label;
        if (entity.type) return entity.type;

        return "unknown";
    }

    getOpponentProfile(entity) {
        const key = this.getOpponentKey(entity);

        if (!this.data.opponents[key]) {
            this.data.opponents[key] = {
                fights: 0,
                deaths: 0,
                wins: 0,
                closeRangeDeaths: 0,
                longRangeDeaths: 0,
                closeRangeWins: 0,
                longRangeWins: 0,
                lowHealthDeaths: 0,
                bulletDeaths: 0,
                droneDeaths: 0,
                wallDeaths: 0,
                tactics: {
                    retreat: 0,
                    approach: 0,
                    orbit: 0,
                    closeAttack: 0,
                    longAttack: 0
                }
            };
        }

        const profile = this.data.opponents[key];
        profile.closeRangeWins ??= 0;
        profile.longRangeWins ??= 0;
        return profile;
    }

    recordDeath(body, deathData = {}) {
        if (!body || body.__aetherNullAI !== true) return;

        this.data.fights++;
        this.data.deaths++;

        const killers = Array.isArray(deathData.killers)
            ? deathData.killers
            : [];

        const killTools = Array.isArray(deathData.killTools)
            ? deathData.killTools
            : [];

        const killerInfo = killers.map(killer => ({
            id: killer?.id ?? null,
            name: killer?.name || "",
            label: killer?.label || "",
            type: killer?.type || "",
            class: Array.isArray(killer?.defs)
                ? killer.defs[0] || ""
                : ""
        }));

        const toolInfo = killTools.map(tool => ({
            id: tool?.id ?? null,
            type: tool?.type || "",
            label: tool?.label || "",
            class: Array.isArray(tool?.defs)
                ? tool.defs[0] || ""
                : ""
        }));

        for (const killer of killerInfo) {
            const key =
                killer.class ||
                killer.label ||
                killer.type ||
                "unknown";

            this.data.killers[key] =
                (this.data.killers[key] || 0) + 1;
        }

        for (const tool of toolInfo) {
            const key =
                tool.class ||
                tool.label ||
                tool.type ||
                "unknown";

            this.data.killingTools[key] =
                (this.data.killingTools[key] || 0) + 1;
        }

        const primaryKiller = killers[0];
        const profile = this.getOpponentProfile(primaryKiller);

        profile.fights++;
        profile.deaths++;

        const distance = Number.isFinite(body.__aetherNullLastDistance)
            ? body.__aetherNullLastDistance
            : null;

        const combatMode = body.__aetherNullLastCombatMode || "unknown";

        if (distance !== null) {
            if (distance < 350) {
                profile.closeRangeDeaths++;
            } else {
                profile.longRangeDeaths++;
            }
        }

        const health = body.health?.amount ?? 0;
        const maxHealth = body.health?.max ?? 0;

        if (maxHealth > 0 && health / maxHealth < 0.15) {
            profile.lowHealthDeaths++;
        }

        if (toolInfo.some(tool =>
            tool.type === "bullet" ||
            tool.class === "bullet"
        )) {
            profile.bulletDeaths++;
        }

        if (toolInfo.some(tool =>
            tool.type === "drone" ||
            tool.type === "swarm"
        )) {
            profile.droneDeaths++;
        }

        if (toolInfo.some(tool => tool.type === "wall")) {
            profile.wallDeaths++;
        }

        const tactic =
            combatMode === "retreat" ? "retreat" :
            combatMode === "approach" ? "approach" :
            combatMode === "attack" && distance !== null && distance < 350
                ? "closeAttack" :
            combatMode === "attack"
                ? "longAttack" :
            combatMode === "reposition"
                ? "orbit" :
            null;

        if (tactic && profile.tactics[tactic] !== undefined) {
            profile.tactics[tactic]++;
        }

        this.data.recentDeaths.push({
            time: new Date().toISOString(),
            nullClass: Array.isArray(body.defs)
                ? body.defs[0] || ""
                : "",
            x: Number.isFinite(body.x) ? body.x : 0,
            y: Number.isFinite(body.y) ? body.y : 0,
            health,
            maxHealth,
            distance,
            combatMode,
            killers: killerInfo,
            killingTools: toolInfo
        });

        if (this.data.recentDeaths.length > 100) {
            this.data.recentDeaths =
                this.data.recentDeaths.slice(-100);
        }

        this.data.lessons.push({
            time: new Date().toISOString(),
            type: "death",
            opponent: this.getOpponentKey(primaryKiller),
            distance,
            combatMode,
            killerClasses: killerInfo.map(
                k => k.class || k.label || k.type
            ),
            toolClasses: toolInfo.map(
                t => t.class || t.label || t.type
            )
        });

        if (this.data.lessons.length > 500) {
            this.data.lessons =
                this.data.lessons.slice(-500);
        }

        this.save();

        console.log(
            `[NULL AI] Learned from death #${this.data.deaths}. ` +
            `Opponent: ${this.getOpponentKey(primaryKiller)} ` +
            `Mode: ${combatMode} ` +
            `Memory saved.`
        );
    }

    recordWin(opponent, body = null) {
        this.data.fights++;
        this.data.wins++;

        const profile = this.getOpponentProfile(opponent);
        profile.fights++;
        profile.wins++;

        const distance = Number.isFinite(body?.__aetherNullLastDistance)
            ? body.__aetherNullLastDistance
            : null;
        if (distance !== null) {
            if (distance < 350) profile.closeRangeWins++;
            else profile.longRangeWins++;
        }

        this.data.lessons.push({
            time: new Date().toISOString(),
            type: "win",
            opponent: this.getOpponentKey(opponent),
            distance
        });

        if (this.data.lessons.length > 500) {
            this.data.lessons =
                this.data.lessons.slice(-500);
        }

        this.save();

        console.log(
            `[NULL AI] Learned from victory. ` +
            `Opponent: ${this.getOpponentKey(opponent)}`
        );
    }

    getTactics(opponent) {
        const profile = this.getOpponentProfile(opponent);

        return {
            ...profile.tactics,
            fights: profile.fights,
            deaths: profile.deaths,
            wins: profile.wins,
            closeRangeDeaths: profile.closeRangeDeaths,
            longRangeDeaths: profile.longRangeDeaths,
            closeRangeWins: profile.closeRangeWins,
            longRangeWins: profile.longRangeWins,
            lowHealthDeaths: profile.lowHealthDeaths,
            bulletDeaths: profile.bulletDeaths,
            droneDeaths: profile.droneDeaths,
            wallDeaths: profile.wallDeaths
        };
    }
}

module.exports = {
    NullMemory,
    memoryPath
};
