class Breach {
    constructor() {
        this.room = global.gameManager.room;
        this.gameActive = false;
        this.bots = [];
        this.tick = 0;

        this.positions = [
            { name: "Red Outpost 1", x: 1900, y: 500, radius: 350, defenders: 5 },
            { name: "Red Outpost 2", x: 1450, y: 900, radius: 350, defenders: 6 },
            { name: "Heavy Checkpoint 1", x: 1850, y: 1200, radius: 400, defenders: 8, heavy: true },
            { name: "Red Outpost 3", x: 1050, y: 1450, radius: 350, defenders: 6 },
            { name: "Heavy Checkpoint 2", x: 650, y: 1000, radius: 400, defenders: 8, heavy: true },
            { name: "Final Fortress", x: 300, y: 1650, radius: 500, defenders: 12, fortress: true },
        ];
    }

    start() {
        this.room = global.gameManager.room;
        this.gameActive = true;
        this.tick = 0;
        this.bots = [];

        console.log("[BREACH] Breach mode started.");

        this.spawnDefenders();
    }

    spawnDefenders() {
        for (const position of this.positions) {
            for (let i = 0; i < position.defenders; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * position.radius * 0.65;

                const loc = {
                    x: position.x + Math.cos(angle) * distance,
                    y: position.y + Math.sin(angle) * distance
                };

                const bot = global.gameManager.gameHandler.spawnBots(
                    loc,
                    TEAM_RED,
                    null,
                    "fighter"
                );

                if (!bot) continue;

                bot.isBreachDefender = true;
                bot.breachPosition = position;
                bot.breachHomeX = position.x;
                bot.breachHomeY = position.y;
                bot.breachHomeRadius = position.radius;
                bot.invuln = false;

                bot.controllers = [
                    new ioTypes.breachAI(bot, {
                        homeX: position.x,
                        homeY: position.y,
                        combatRange: position.fortress ? 950 : 750,
                        leashRange: position.fortress ? 700 : 500
                    })
                ];

                this.bots.push(bot);
            }
        }

        console.log(`[BREACH] Spawned ${this.bots.length} Red defenders.`);
    }

    loop() {
        if (!this.gameActive) return;

        this.tick++;

        if (this.tick % 10 !== 0) return;

        for (const bot of this.bots) {
            if (!bot || bot.isDead()) continue;

            const homeX = bot.breachHomeX;
            const homeY = bot.breachHomeY;
            const dx = bot.x - homeX;
            const dy = bot.y - homeY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > bot.breachHomeRadius) {
                bot.aiGoal = {
                    x: homeX,
                    y: homeY
                };
            }
        }
    }

    reset() {
        this.gameActive = false;

        for (const bot of this.bots) {
            if (bot && !bot.isDead()) bot.kill();
        }

        this.bots.length = 0;
        this.tick = 0;
    }

    redefine(theshit) {
        this.room = theshit.room;
        this.gameActive = false;
        this.bots.length = 0;
        this.tick = 0;
    }
}

module.exports = { Breach };

