async function getServer(server) {
    try {
        let data = await fetch(`${server.ip.startsWith("localhost") ? "http" : "https"}://${server.ip}/portalPermission`).then(r => r.json()).catch(() => false);
        if (!data) return false;
        data = data.find(x => x.ip === server.ip) || data[0];
        return {
            name: data.gameMode.trim(),
            players: data.players,
            ip: server.ip,
            destination: `${server.ip.startsWith("localhost") ? "http://" : "https://"}${data.ip}`
        };
    } catch (e) {
        console.log(e);
    }
}

function findSafeCentralPortalLocation(room, radiusTiles) {
    if (!room?.setup || !(room.tileWidth > 0) || !(room.tileHeight > 0)) return null;
    const maxDistance = Math.max(room.tileWidth, room.tileHeight) * radiusTiles;
    const maxDistanceSquared = maxDistance * maxDistance;
    const walls = Array.isArray(global.walls) ? global.walls : [];
    const activePortals = [...global.entities.values()].filter(entity => entity.isPortal && !entity.isDead());
    const candidates = [];
    const step = Math.max(1, Math.min(room.tileWidth, room.tileHeight) / 4);

    for (let y = room.center.y - maxDistance; y <= room.center.y + maxDistance; y += step) {
        for (let x = room.center.x - maxDistance; x <= room.center.x + maxDistance; x += step) {
            if (!room.isInRoom({ x, y })) continue;
            const centerDx = x - room.center.x;
            const centerDy = y - room.center.y;
            const centerDistanceSquared = centerDx * centerDx + centerDy * centerDy;
            if (centerDistanceSquared > maxDistanceSquared) continue;

            const overlapsWall = walls.some(wall => {
                if (!wall || wall.isDead?.()) return false;
                const wallExtent = (wall.realSize || wall.size) / Math.SQRT2 + 2 + 35;
                return Math.abs(x - wall.x) <= wallExtent && Math.abs(y - wall.y) <= wallExtent;
            });
            if (overlapsWall) continue;

            const overlapsPortal = activePortals.some(portal =>
                Math.hypot(x - portal.x, y - portal.y) < 90
            );
            if (!overlapsPortal) candidates.push({ x, y, distanceSquared: centerDistanceSquared });
        }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => a.distanceSquared - b.distanceSquared);
    const nearCenter = candidates.slice(0, Math.min(8, candidates.length));
    const selected = ran.choose(nearCenter);
    return { x: selected.x, y: selected.y };
}

// Portal spawner class
let Portal = class {
    constructor(name, players, destination, ip) {
        this.name = name;
        this.players = players;
        this.destination = destination;
        this.ip = ip;
        this.body = null;
    }
    spawn(loc, color = "#ffffff", duration) {
        if (loc.data) loc.data.has_portal = true;
        this.body = new Entity(loc.data ? loc.randomInside() : loc);
        this.body.define("serverPortal");
        this.body.isPortal = true;
        this.body.color.base = color;
        this.body.godmode = true;
        this.body.team = -101;
        this.body.isPortal = true;
        this.body.name = this.name;
        this.body.settings.scoreLabel = `${this.players} player${this.players === 1 ? "" : "s"}`;
        this.body.settings.destination = this.destination;
        this.body.allowedOnMinimap = true;
        this.body.alwaysShowOnMinimap = true;
        this.body.minimapColor = 19;
        let updateInterval = setInterval(async () => {
            let data = await getServer({ip: this.ip});
            if (data) {
                this.body.settings.scoreLabel = `${data.players} player${data.players === 1 ? "" : "s"}`;
                this.body.name = data.name;
            }
        }, 5000);
        setTimeout(() => {
            clearInterval(updateInterval);
            this.body.destroy();
            if (loc.data) loc.data.has_portal = false;
        }, duration);
    }
}
class serverTravelHandler {
    constructor(self, spawnChance, color) {
        this.self = self;
        this.spawnChance = spawnChance;
        this.color = color;
    }
    async spawnRandom() {
        let spawnChance = Math.random() < 1 / this.spawnChance;
        if (spawnChance) {
            let server = await getServer(this.self);
            if (server) {
                const room = global.gameManager.room;
                const centralRadius = Number(this.self.portal_properties?.central_area_radius_tiles) || 0;
                let loc;
                if (centralRadius > 0) {
                    loc = findSafeCentralPortalLocation(room, centralRadius);
                    if (!loc) {
                        console.warn(`[SERVER TRAVEL] No wall-free central portal location is available for ${server.name}.`);
                        return;
                    }
                } else {
                    let tiles = room.portalTiles ? room.portalTiles.filter(tile => tile && !tile.data.has_portal) : [];
                    if (!tiles.length) tiles = false;
                    loc = tiles ? ran.choose(tiles) : room.random();
                }
                let portal = new Portal(server.name, server.players, server.destination, server.ip);
                portal.spawn(loc, this.color, 60000);
            }
        }
    }
}
if (loadedAddons.includes("chatCommands")) {
    addChatCommand({
        command: ["join", "j"],
        description: "Connects you to another server",
        level: 3,
        hidden: true,
        run: ({ args, socket }) => {
            if (!args[0]) {
                socket.talk("m", 5_000, "No server specified.");
                return;
            }
            let server = Config.servers.find(
                s => s.id === args[0]
            );
            if (!server) {
                socket.talk("m", 5_000, "Server not found.");
                return;
            }
            global.gameManager.socketManager.sendToServer(socket, `http://${server.host}`);
        }
    })
}

module.exports = { serverTravelHandler }
