const fs = require("fs");

const path = "./server/game/index.js";
let text = fs.readFileSync(path, "utf8");

if (text.includes("enableDefenders(owner)")) {
    console.log("Defender manager already installed.");
    process.exit(0);
}

const marker = '   spawnBots(loc, team, tank = null, botType = "fighter") {';
const pos = text.indexOf(marker);

if (pos === -1) {
    console.log("ERROR: spawnBots marker not found.");
    process.exit(1);
}

const insert = `
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

`;

text = text.slice(0, pos) + insert + text.slice(pos);

fs.writeFileSync(path, text, "utf8");

console.log("Defender manager added successfully.");
