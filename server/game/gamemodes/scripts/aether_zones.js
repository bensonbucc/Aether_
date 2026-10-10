const EFFECTS = [
    { name: "Floaty", color: "#b9ddff", speed: 1.08, reload: 1 },
    { name: "Speed Surge", color: "#a8f0d0", speed: 1.28, reload: 1 },
    { name: "Heavy Tank", color: "#c8c6ff", speed: 0.78, reload: 1 },
    { name: "Rapid Fire", color: "#ffd18c", speed: 1, reload: 1.35 },
    { name: "Slow Fire", color: "#d6c7ff", speed: 1, reload: 0.72 },
    { name: "Slow Shots", color: "#bfe4eb", speed: 1, reload: 1, bulletSpeed: 0.25 },
    { name: "Giant Bullets", color: "#ffc3ad", speed: 1, reload: 1, bulletSize: 1.5 },
    { name: "Glass", color: "#ffd0dc", speed: 1, reload: 1, fragile: true },
    { name: "Bumper", color: "#e4c2ff", speed: 1.08, reload: 1, bumper: 2.5 },
    { name: "Slippery", color: "#bde7ff", speed: 1.12, reload: 1, slippery: true },
    { name: "Reverse", color: "#ffb8a6", speed: 1, reload: 1, reverse: true },
    { name: "Ricochet", color: "#ffe49b", speed: 1, reload: 1, ricochet: true },
    { name: "Healing Field", color: "#aaffc2", speed: 1, reload: 1, healing: true },
    { name: "Heavy Ammo", color: "#ffc68b", speed: 1, reload: 0.88, bulletDamage: 1.3 },
    { name: "Tiny Tank", color: "#c7f2eb", speed: 1.12, reload: 1, size: 0.68 },
    { name: "Giant Tank", color: "#f2c2c2", speed: 0.82, reload: 1, size: 1.45 },
    { name: "Portal", color: "#c6b7ff", speed: 1, reload: 1, teleport: true },
    { name: "Mirror Shots", color: "#d9edff", speed: 1, reload: 1, reverseShots: true },
    { name: "Wild Shots", color: "#ffe0b8", speed: 1, reload: 1.1, spread: 2.4, randomBulletSpeed: [0.55, 1.5] },
    { name: "Low Gravity", color: "#c8ecff", speed: 1.08, reload: 1 },
    { name: "Invisible", color: "#d8d2eb", speed: 1, reload: 1, invisible: true },
    { name: "Echo", color: "#c1b0ff", speed: 1, reload: 1, echo: true, echoDamage: 0.08 },
    { name: "Ammo Bloom", color: "#d8ffa9", speed: 1, reload: 1.1, bulletSize: 1.18 },
    { name: "Overdrive", color: "#ffb7d1", speed: 1.18, reload: 1.18 },
];

const CELL_COUNT = 24;
const ROTATION_MS = 60_000;

class AetherZones {
    constructor(game) {
        this.game = game;
        this.cells = Array.from({ length: CELL_COUNT }, (_, index) => index);
        this.startedAt = 0;
        this.lastRotation = 0;
        this.lastPlayerUpdate = 0;
        this.lastBotUpdate = 0;
    }

    shuffle() {
        // A Fisher-Yates shuffle keeps all 24 effects represented exactly once.
        for (let i = this.cells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cells[i], this.cells[j]] = [this.cells[j], this.cells[i]];
        }
    }

    publish() {
        const packet = JSON.stringify({ cells: this.cells, effects: EFFECTS.map(({ name, color }) => ({ name, color })), next: Date.now() + ROTATION_MS });
        for (const client of this.game.socketManager.clients) {
            if (client.status?.verified) {
                client.talk("AZ", packet);
                client.aetherZonesSent = true;
            }
        }
    }

    start() {
        this.startedAt = Date.now();
        this.shuffle();
        this.lastRotation = this.startedAt;
        this.publish();
    }

    update() {
        const now = Date.now();
        const packetNeeded = this.game.socketManager.clients.some(client => client.status?.verified && !client.aetherZonesSent);
        if (packetNeeded) this.publish();
        if (now - this.lastRotation >= ROTATION_MS) {
            this.shuffle();
            this.lastRotation = now;
            this.publish();
        }
        if (now - this.lastBotUpdate >= 1000 && this.game.gameHandler.active) {
            this.lastBotUpdate = now;
            const bots = this.game.gameHandler.bots.filter(bot => bot.__aetherZoneBot && !bot.isDead());
            while (bots.length < Config.bot_cap) {
                const loc = getSpawnableArea(null, this.game);
                const bot = this.game.gameHandler.spawnBots(loc, null, null, "fighter", "Aether AI");
                if (!bot) break;
                bot.__aetherZoneBot = true;
                bots.push(bot);
            }
        }
        if (now - this.lastPlayerUpdate < 200) return;
        this.lastPlayerUpdate = now;

        const room = this.game.room;
        const width = room.width;
        const height = room.height;
        const participants = [
            ...this.game.socketManager.players.map(player => player.body),
            ...this.game.gameHandler.bots.filter(bot => bot.__aetherZoneBot),
        ];
        for (const body of participants) {
            if (!body || body.isDead()) continue;
            const col = Math.max(0, Math.min(5, Math.floor((body.x + width / 2) / width * 6)));
            const row = Math.max(0, Math.min(3, Math.floor((body.y + height / 2) / height * 4)));
            const effect = EFFECTS[this.cells[row * 6 + col]];
            const previousZone = body.aetherZoneIndex;
            body.aetherZoneEffect = effect;
            body.aetherZoneIndex = row * 6 + col;
            body.sizeMultiplier = effect.size || 1;
            if (effect.teleport && previousZone !== body.aetherZoneIndex && now >= (body.aetherTeleportCooldown || 0)) {
                body.x = (Math.random() - 0.5) * width * 0.9;
                body.y = (Math.random() - 0.5) * height * 0.9;
                body.aetherTeleportCooldown = now + 1500;
            }
            if (effect.invisible) {
                body.alpha = 0.035;
                body.alphaRange = [0.02, 0.06];
            } else if (body.aetherWasInvisible) {
                body.alpha = 1;
                body.alphaRange = [0, 1];
            }
            body.aetherWasInvisible = !!effect.invisible;
            if (effect.healing && body.health.amount < body.health.max) body.health.amount = Math.min(body.health.max, body.health.amount + 0.035);
            if (effect.echo) body.damageReceived += effect.echoDamage;
        }
    }
}

module.exports = { AetherZones };
