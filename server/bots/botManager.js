```js
"use strict";

/*
 * Bot Manager
 * Maximum: 150 bots
 *
 * NOTE:
 * This manager stores bot configuration/state.
 * Actual Arras Entity creation will be connected separately.
 */

const MAX_BOTS = 150;

const BOT_TYPES = Object.freeze({
    FEEDER: "feeder",
    FIGHTER: "fighter"
});

class BotManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.bots = new Map();
        this.nextId = 1;

        this.mouse = {
            x: 0,
            y: 0
        };
    }

    setMouse(x, y) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;

        this.mouse.x = x;
        this.mouse.y = y;

        for (const bot of this.bots.values()) {
            if (!bot.alive) continue;

            bot.targetX = x;
            bot.targetY = y;
        }
    }

    spawn(count = 1, type = BOT_TYPES.FEEDER, tank = "basic") {
        count = Math.max(
            1,
            Math.min(MAX_BOTS, Number(count) || 1)
        );

        type =
            type === BOT_TYPES.FIGHTER
                ? BOT_TYPES.FIGHTER
                : BOT_TYPES.FEEDER;

        tank =
            typeof tank === "string" && tank.trim()
                ? tank.trim()
                : "basic";

        const available = MAX_BOTS - this.bots.size;
        const amount = Math.min(count, available);

        const created = [];

        for (let i = 0; i < amount; i++) {
            const id = this.nextId++;

            const isFighter = type === BOT_TYPES.FIGHTER;

            const bot = {
                id,

                name: `${isFighter ? "Fighter" : "Feeder"} Bot ${id}`,

                type,

                // Tank definition the real entity will use.
                tank,

                // Mouse-follow target.
                targetX: this.mouse.x,
                targetY: this.mouse.y,

                // Spawn position.
                x: this.mouse.x,
                y: this.mouse.y,

                /*
                 * Fighters use the normal game's health/skill system
                 * when we connect them to an Entity.
                 *
                 * Feeders intentionally have no skill upgrades.
                 */
                useHealth: isFighter,
                useUpgrades: isFighter,

                alive: true,

                entity: null
            };

            this.bots.set(id, bot);
            created.push(bot);
        }

        return created;
    }

    remove(id) {
        id = Number(id);

        const bot = this.bots.get(id);

        if (!bot) return false;

        /*
         * The actual Entity will be destroyed here once the
         * Entity integration is connected.
         */
        if (bot.entity && typeof bot.entity.kill === "function") {
            bot.entity.kill();
        }

        this.bots.delete(id);

        return true;
    }

    removeAll() {
        for (const bot of this.bots.values()) {
            if (bot.entity && typeof bot.entity.kill === "function") {
                bot.entity.kill();
            }
        }

        this.bots.clear();
    }

    getBots() {
        return [...this.bots.values()];
    }

    getBot(id) {
        return this.bots.get(Number(id)) || null;
    }

    getCount() {
        return this.bots.size;
    }

    getRemainingSlots() {
        return MAX_BOTS - this.bots.size;
    }

    update() {
        for (const bot of this.bots.values()) {
            if (!bot.alive) continue;

            // Always follow the current mouse target.
            bot.targetX = this.mouse.x;
            bot.targetY = this.mouse.y;

            /*
             * Once connected to the real Entity:
             *
             * bot.entity.control.target = {
             *     x: bot.targetX,
             *     y: bot.targetY
             * };
             */
        }
    }
}

module.exports = {
    BotManager,
    MAX_BOTS,
    BOT_TYPES
};
```
