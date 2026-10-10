const { workerData } = require('worker_threads');

const http = require("http");
const ws = require("ws");
const fs = require("fs");
const path = require("path");
const url = require("url");

let { socketManager } = require("./game/network/sockets.js");
let { Editor } = require("./game/network/editor.js");
let { LagLogger } = require("./game/debug/lagLogger.js");
let { speedcheckloop } = require("./game/debug/speedLoop.js");
let { gameHandler } = require("./game/index.js");
let { gamemodeManager } = require("./game/gamemodeManager.js");

const ASSAULT_VARIANTS = [
    "assault_acropolis", "assault_booster", "assault_bunker", "assault_eye",
    "assault_line", "assault_trenches", "assault_yinyang",
];

// Gamemode names
const getName = (name, gamemodeData) => {
    const nameMap = { // commented-out gamemodes haven't been implemented yet

    // FFA
        ffa: "FFA",
        aether_zones: "Aether Zones",
        halloween: "Haunted Asylum",

    // Squads
        clan_wars: "Clan Wars",
        duos: "Duos",
        squads: "Squads",
        trios: "Trios",

    // TDM
        tdm: `${gamemodeData.teams}TDM`,
            open_tdm: `Open ${gamemodeData.teams}TDM`,
        ultra_growth: "Ultra Growth",
        ultra_growth_space: "Ultra Growth Space",
        the_oval_arena: "The Oval Arena",
        open_maze: "Open Maze",
        tetromino: `${gamemodeData.teams} Team Tetromino`,

    // Minigames
        assault_acropolis: "Assault Acropolis",
        assault_booster: "Assault Booster",
        assault_bunker: "Assault Bunker",
        assault_eye: "Assault Eye",
        assault_line: "Assault Line",
        assault_trenches: "Assault Trenches",
        assault_yinyang: "Assault Yin Yang",
        //ctf: "Capture The Flag",
        domination: `${gamemodeData.teams} Team Domination`,
        //elimination: "Elimination",
        //grudge_ball: "Grudge Ball",
        mothership: `${gamemodeData.teams} Team Mothership`,
        old_siege: "Old Siege",
        //pandemic: "Pandemic",
        siege_blitz: "Siege Blitz",
        siege_citadel: "Siege Citadel",
        siege_classic: "Siege Classic",
        siege_fortress: "Siege Fortress",
        //soccer: "Soccer",
        tag: `${gamemodeData.teams} Team Tag`,

    // Sandbox
        sandbox: "Sandbox",
    normal_sandbox: "Sandbox",
    tank_editor: "Tank Editor",
    legion: "Legion",

    // Lobbies
        forge: "Forge",
        open_old_dreads: "Open Old Dreads",
            //old_forge: "Old Forge",
        limbo: "Limbo",
        nexus: "Nexus",

    // Miscellaneous
        tartarus: "Tartarus",

    // Modifiers
        arms_race: "Arms Race",
        blackout: "Blackout",
        classic: "Classic",
        diep: "Diep",
        //dreadnoughts: "Dreadnoughts",
            old_dreadnoughts: "Old Dreadnoughts",
            labyrinth: "Old Dreads",
        fast: "Fast",
        growth: "Growth",
            //old_growth: "Old Growth",
            //overgrowth: "Overgrowth",
        //half: "Half",
        //manhunt: "Manhunt",
        march_madness: "March Madness",
        maze: "Maze",
        ricochet: "Ricochet",
            //labyrinth: "Labyrinth",
                //old_labyrinth: "Old Labyrinth",
            //magic_maze: "Magic Maze",
            rock: "Rock",
                //pumpkin_patch: "Pumpkin Patch",
        outbreak: "Outbreak",
        portal: "Portal",
        retrograde: "Retrograde",
        //skinwalkers: "Skinwalkers",
        space: "Space",

    };
    return nameMap[name];
}

// Here is our actual game server
class gameServer {
    constructor(host, port, gamemode, region, serverHost, location, webProperties, serverProperties, isfeatured, isUnlisted, isPrivate, parentPort, loaderGlobal) {
        // Override the default settings in Config.js.
        Object.keys(serverProperties).forEach(key => {
            Config[key] = serverProperties[key];
        })
        // Define host, port, gamemode, region, and publicly define webProperties, and serverProperties.
        this.host = host;
        this.port = port;
        this.gamemode = gamemode;
        this.region = region;
        this.serverhost = serverHost;
        this.location = location;
        this.webProperties = webProperties;
        this.serverProperties = serverProperties;
        this.assaultRotation = Array.isArray(serverProperties.assault_rotation)
            ? [...new Set(serverProperties.assault_rotation.filter(variant => ASSAULT_VARIANTS.includes(variant)))]
            : [];
        this.assaultVariant = null;
        this.assaultConfigDefaults = {};
        this.assaultConfigKeys = new Set();
        for (const variant of ASSAULT_VARIANTS) {
            const mode = require(`./game/gamemodes/config/${variant}.js`);
            for (const key of Object.keys(mode)) {
                this.assaultConfigKeys.add(key);
                if (!Object.prototype.hasOwnProperty.call(this.assaultConfigDefaults, key)) this.assaultConfigDefaults[key] = Config[key];
            }
        }
        this.name = "Unknown";
        this.featured = isfeatured;
        this.unlisted = isUnlisted;
        this.private = isPrivate;
        this.parentPort = parentPort;
        this.definitionsCombiner = new definitionCombiner(
            {
                groups: path.join(__dirname, './lib/definitions/groups'),
                addonsFolder: path.join(__dirname, './lib/definitions/entityAddons')
            }
        );
        this.loaderGlobal = loaderGlobal;
        // Initalize.
        this.roomSpeed = Config.game_speed;
        this.runSpeed = Config.run_speed;
        this.clients = [];
        this.views = [];
        this.minimap = [];
        this.walls = [];
        this.room = {};
        this.arenaClosed = false;
        this.importedRoom = [];
        this.importRoom = [];
        this.currentRoom = null;
        this.showConsoleLoggings = true;
        this.lagLogger = new LagLogger();
        this.socketManager = new socketManager(this);
        this.editor = new Editor(this);
        this.gameHandler = new gameHandler(this);
        this.gameSpeedCheckHandler = new speedcheckloop(this);

        // Modify the console log with an instance index on it.
        if (!global.launchedOnMainServer) {
            console._log = console.log;
            console.log = (...args) => this.showConsoleLoggings && console._log(`[I${workerData.index}]`, ...args);
        }

        // Make it public
        global.gameManager = this;
        if (this.parentPort) this.parentPort.on("message", message => {
            if (!Array.isArray(message) || message[0] !== "aetherDevSayAllModes") return;
            const text = typeof message[1] === "string" ? message[1].slice(0, 120) : "";
            if (!text) return;
            for (const ai of global.entities.values()) {
                if (ai && !ai.isGhost && !ai.isDead() && (ai.isBot || ai.zombified || ai.type === "miniboss" || ai.type === "crasher")) ai.say(text);
            }
            global.gameManager.socketManager.chatLoop();
        });

        // Don't forget to bind our manager!
        this.gamemodeManager = new gamemodeManager(this);

        // Start the party
        this.startServer();
    }

    // Get the game info
    getInfo(includegameManager = false) {
        return {
            hidden: this.serverProperties.hidden ?? false,
            ip: this.host === "localhost" ? `${this.host}:${this.port}` : this.host,
            port: this.port,
            players: this.socketManager.clients.length,
            maxPlayers: this.webProperties.maxPlayers,
            id: this.webProperties.id,
            featured: this.featured,
            unlisted: this.unlisted,
            private: this.private,
            region: this.region,
            serverhost: this.serverhost,
            location: this.location,
            gameMode: this.name,
            betaOnly: this.serverProperties.betaOnly === true,
            gameManager: includegameManager ? this : false,
        }
    }

    // Create a new web server class to handle incoming requests
    startWebServer(socketManager) {
        // Create the socket
        this.wsServer = new ws.WebSocketServer({ noServer: true });
        // Create the http server
        this.httpServer = http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            const { pathname, query } = url.parse(req.url, true);
            switch (pathname) {
                case "/api/performance": {
                    if (Config.dev_build !== true) {
                        res.writeHead(404);
                        res.end("Not Found");
                        return;
                    }
                    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
                    res.end(JSON.stringify(this.performanceState || this.gameSpeedCheckHandler.getPerformanceState()));
                } break;
                case "/api/sendPlayer": {
                    if (query.api_key !== process.env.API_KEY) {
                        res.writeHead(403);
                        res.end("Access Denied");
                        return;
                    }
                    let body = "";
                    req.on("data", c => body += c);
                    req.on("end", () => {
                        let json = null;
                        try {
                            json = JSON.parse(body);
                    } catch { }
                        if (json) {
                            let { id, name, definition, score, level, skillcap, skill, points, killCount } = json;
                            global.travellingPlayers.push({ id, name, definition, score, level, skillcap, skill, points, killCount });
                            res.writeHead(200);
                            res.end("OK");
                        } else {
                            res.writeHead(400);
                            res.end("Invalid JSON body");
                        }
                    });
                } break;
                case "/api/hurts-bots": {
    const sendJson = (status, data) => {
        res.writeHead(status, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
        });
        res.end(JSON.stringify(data));
    };

    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
        });
        res.end();
        return;
    }


    const handler = this.gameHandler;
    const room = this.room;

    if (!handler) {
        sendJson(503, {
            ok: false,
            error: "Game handler unavailable"
        });
        return;
    }

    if (!handler.hurtsBotsControl) {
        handler.hurtsBotsControl = {
            mode: "mouse",
            mouseX: 0,
            mouseY: 0,
            followPlayerId: null,
            followPlayerName: "",
            mousePlayerId: null,
            mousePlayerName: ""
        };
    }

    const hurtsBots = () => {
        return Array.isArray(handler.bots)
            ? handler.bots.filter(bot =>
                bot &&
                bot.__hurtsBots === true &&
                !bot.isDead()
            )
            : [];
    };

    const getPlayers = () => {
        const clients = Array.isArray(this.socketManager?.clients)
            ? this.socketManager.clients
            : [];

        return clients
            .map(socket => {
                const body =
                    socket &&
                    socket.player &&
                    socket.player.body;

                if (!body || body.isDead?.()) return null;

                return {
                    id: body.id,
                    name: String(body.name || ""),
                    team: Number(body.team),
                    x: Number(body.x) || 0,
                    y: Number(body.y) || 0
                };
            })
            .filter(Boolean);
    };

    if (req.method === "GET") {
        sendJson(200, {
            ok: true,
            bots: hurtsBots().length,
            limit: 10,
            mode: handler.hurtsBotsControl.mode,
            room: {
                width: Number(room?.width) || 0,
                height: Number(room?.height) || 0,
                center: room?.center || null
            },
            players: getPlayers()
        });
        return;
    }

    if (req.method !== "POST") {
        sendJson(405, {
            ok: false,
            error: "POST required"
        });
        return;
    }

    let bodyText = "";

    req.on("data", chunk => {
        bodyText += chunk;
        if (bodyText.length > 100000) {
            req.destroy();
        }
    });

    req.on("end", () => {
        let json;

        try {
            json = JSON.parse(bodyText);
        } catch {
            sendJson(400, {
                ok: false,
                error: "Invalid JSON body"
            });
            return;
        }

        if (!json || typeof json !== "object") {
            sendJson(400, {
                ok: false,
                error: "Invalid JSON body"
            });
            return;
        }

        const action = String(json.action || "").trim();

        if (action === "status") {
            sendJson(200, {
                ok: true,
                bots: hurtsBots().length,
                limit: 10,
                mode: handler.hurtsBotsControl.mode,
                players: getPlayers()
            });
            return;
        }

        if (action === "spawn") {
            const current = hurtsBots().length;

            if (current >= 10) {
                sendJson(409, {
                    ok: false,
                    error: "Hurts Bots limit reached",
                    bots: current,
                    limit: 10
                });
                return;
            }

            let amount = Math.floor(Number(json.amount) || 1);
            amount = Math.max(1, Math.min(10 - current, amount));

            const tank =
                typeof json.tank === "string" &&
                json.tank.trim()
                    ? json.tank.trim()
                    : "basic";

            const botType =
                json.botType === "feeder"
                    ? "feeder"
                    : "fighter";

            let team;

            if (
                json.team !== undefined &&
                json.team !== null &&
                String(json.team).trim() !== "" &&
                String(json.team).toLowerCase() !== "auto"
            ) {
                const requestedTeam = Number(json.team);

                if ([-1, -2, -3, -4].includes(requestedTeam)) {
                    team = requestedTeam;
                }
            }

            if (
                team === undefined &&
                (
                    Config.mode === "tdm" ||
                    Config.mode === "tag"
                )
            ) {
                const players = getPlayers();

                if (players.length > 0) {
                    team = players[0].team;
                }
            }

            const customName =
                typeof json.name === "string"
                    ? json.name.trim().slice(0, 32)
                    : "";

            let spawned = 0;

            for (let i = 0; i < amount; i++) {
                const loc = getSpawnableArea(
                    team,
                    this
                );

                const bot = handler.spawnBots(
                    loc,
                    team,
                    tank,
                    botType,
                    customName || null
                );

                if (!bot) continue;

                bot.__hurtsBots = true;
                bot.__hurtsBotsOwner = "Hurts Bots";
                bot.botControlEnabled = true;
                bot.botControlType = botType;
                bot.hurtsBotsControl = handler.hurtsBotsControl;

                spawned++;
            }

            sendJson(200, {
                ok: true,
                action: "spawn",
                spawned,
                bots: hurtsBots().length,
                limit: 10
            });
            return;
        }

        if (action === "removeAll") {
            let removed = 0;

            for (const bot of hurtsBots()) {
                try {
                    bot.kill();
                    removed++;
                } catch (e) {
                    try {
                        bot.destroy();
                        removed++;
                    } catch (_) {}
                }
            }

            sendJson(200, {
                ok: true,
                action: "removeAll",
                removed,
                bots: hurtsBots().length
            });
            return;
        }

        if (action === "mode") {
            const validModes = [
                "mouse",
                "follow-player",
                "center",
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right"
            ];

            const mode = String(json.mode || "").trim();

            if (!validModes.includes(mode)) {
                sendJson(400, {
                    ok: false,
                    error: "Invalid movement mode"
                });
                return;
            }

            handler.hurtsBotsControl.mode = mode;

            sendJson(200, {
                ok: true,
                mode
            });
            return;
        }

        if (action === "mouse") {
            const x = Number(json.x);
            const y = Number(json.y);

            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                sendJson(400, {
                    ok: false,
                    error: "Invalid mouse coordinates"
                });
                return;
            }

            handler.hurtsBotsControl.mouseX = x;
            handler.hurtsBotsControl.mouseY = y;

            sendJson(200, {
                ok: true,
                x,
                y
            });
            return;
        }

        if (action === "mousePlayer") {
            const playerId =
                json.playerId !== undefined &&
                json.playerId !== null
                    ? Number(json.playerId)
                    : null;

            const playerName =
                typeof json.playerName === "string"
                    ? json.playerName.trim()
                    : "";

            const players = getPlayers();

            const target = players.find(player => {
                if (
                    Number.isFinite(playerId) &&
                    player.id === playerId
                ) {
                    return true;
                }

                return playerName &&
                    player.name.toLowerCase() === playerName.toLowerCase();
            });

            if (!target) {
                sendJson(404, {
                    ok: false,
                    error: "Player not found",
                    players
                });
                return;
            }

            handler.hurtsBotsControl.mode = "mouse";
            handler.hurtsBotsControl.mousePlayerId = target.id;
            handler.hurtsBotsControl.mousePlayerName = target.name;

            sendJson(200, {
                ok: true,
                mode: "mouse",
                player: target
            });
            return;
        }
        if (action === "followPlayer") {
            const playerId =
                json.playerId !== undefined &&
                json.playerId !== null
                    ? Number(json.playerId)
                    : null;

            const playerName =
                typeof json.playerName === "string"
                    ? json.playerName.trim()
                    : "";

            const players = getPlayers();

            const target = players.find(player => {
                if (
                    Number.isFinite(playerId) &&
                    player.id === playerId
                ) {
                    return true;
                }

                return playerName &&
                    player.name.toLowerCase() === playerName.toLowerCase();
            });

            if (!target) {
                sendJson(404, {
                    ok: false,
                    error: "Player not found",
                    players
                });
                return;
            }

            handler.hurtsBotsControl.mode = "follow-player";
            handler.hurtsBotsControl.followPlayerId = target.id;
            handler.hurtsBotsControl.followPlayerName = target.name;

            sendJson(200, {
                ok: true,
                player: target
            });
            return;
        }

        sendJson(400, {
            ok: false,
            error: "Unknown action"
        });
    });

    return;
} break;
case "/portalPermission": {
                    if (Config.allow_server_travel) {
                        res.writeHead(200);
                        res.end(JSON.stringify([{
                            ip: this.host,
                            players: this.socketManager.clients.length,
                            gameMode: this.name,
                        }]));
                    } else {
                        res.writeHead(404);
                        res.end("Denied.");
                    }
                } break;
                case "/isOnline": {
                    res.writeHead(200);
                    res.end("True");
                } break;
                default: {
                    // Return the file
                    res.writeHead(200);
                    res.end("Not found");
                } break;
            }
        }).listen(this.port);
        // Reroute all the upgrade messages to our socket
        this.httpServer.on("upgrade", (req, socket, head) => {
            this.wsServer.handleUpgrade(req, socket, head, ws => {
                if (req.url.startsWith("/api/editor")) this.editor.connect(ws, req);
                else socketManager.connect(ws, req);
            })
        });
    }

    // Start our server
    startServer() {
        // This code is for loading through the main server only!
        if (!this.parentPort) {
            // Start the server
            this.start();
            // Send the info to the main server so the client can get the info. (in a expensive way)
            for (let i = 0; i < global.servers.length; i++) {
                let server = global.servers[i];
                if (server.loadedViaMainServer) global.servers[i] = this.getInfo(true);
            }
            console.log(global.servers.length == 1 ? "Your game server has successfully started." : "Game server " + this.name + " successfully booted up via main server (port " + this.port + ")");
            onServerLoaded();
            return;
        };

        // Start the WS Server
        this.startWebServer(this.socketManager);

        // Start the server and send data!
        this.start();

        // If no errors has accoured then annouce that the game server has succssfully booted up.
        console.log("Game server " + this.name + " successfully started. Listening on port", this.port);

        // Send the info to the main server so the client can get the info.
        this.parentPort.postMessage([false, this.getInfo()]);

        // let the main server know that it successfully booted.
        this.parentPort.postMessage(["doneLoading"]);
    }

    // Start our game
    start(softStart = false) {
        // Are we starting for the first time?
        if (!softStart) {
            if (this.assaultRotation.length) {
                this.assaultVariant = this.pickNextAssaultVariant();
                this.gamemode = [this.assaultVariant];
            }
            let overrideRoom = true;
            // Get gamemode
            for (let gamemode of this.gamemode) {
                let mode = require(`./game/gamemodes/config/${gamemode}.js`);
                for (let key in mode) {
                    if (key == "do_not_override_room") {
                        overrideRoom = mode[key];
                    } else if (key == "room_setup") {
                        if (!overrideRoom) Config.room_setup = mode[key]; else Config[key].push(...mode[key]);
                    } else {
                        Config[key] = mode[key];
                    }
                }
            };
            // Update the server gamemode name
            this.name = this.gamemode.map(x => getName(x, Config) || (x[0].toUpperCase() + x.slice(1))).join(' ');
            if (this.assaultRotation.length) this.location = this.name;

            this.showConsoleLoggings = false; // We do not like duplicate messages that uses console.log();

            // Get the definitions before we can initalize the rest.
            this.definitionsCombiner.loadDefinitions(false);

            // Get the tile definitions
            if (this.parentPort) this.loaderGlobal.loadRooms(false);

            // Also load all mockups if needed.
            if (Config.load_all_mockups) global.loadAllMockups(false);

            // Now we can show everything whatever it shows.
            this.showConsoleLoggings = true;

            // Initalize the room
            this.setRoom();

            setTimeout(() => {
                // Set the gamemode manager
                this.gamemodeManager.redefine(this);
                // Wake it up
                this.gamemodeManager.request("start");
            }, 200);

            // Check if we have a server travel properties.
            if (Config.server_travel) {
                if (!Config.server_travel_properties) {
                    console.warn(this.name + " Config.server_travel_properties is not set up! Please set the properties for the server travel system to work.\nProcess terminated.");
                    process.exit(1);
                }
                this.serverTravelHandler = [];
                for (let i = 0; i < Config.server_travel.length; i++) {
                    let instance = Config.server_travel[i];
                    this.serverTravelHandler[i] = new (require("./game/addons/serverTravel.js").serverTravelHandler)(instance, instance.portal_properties.spawn_chance, instance.portal_properties.color);
                    setInterval(() => {
                        let y = 1;
                        if (Config.server_travel_properties.portals) y = Config.server_travel_properties.portals;
                        for (let o = 0; o < y; o++) this.serverTravelHandler[i].spawnRandom();
                    }, Config.server_travel_properties.loop_interval);
                }
            }
        }
        // If not, then...
        if (softStart) {
            // Reset 2 stats so we can respawn.
            this.arenaClosed = false;
            global.cannotRespawn = false;
            const rotatingAssault = this.assaultRotation.length > 0;
            if (rotatingAssault) {
                this.assaultVariant = this.pickNextAssaultVariant();
                this.gamemode = [this.assaultVariant];
                this.applyAssaultVariantConfig();
                this.name = getName(this.assaultVariant, Config);
                this.location = this.name;
                this.importedRoom = [];
                this.setRoom();
                if (this.parentPort) this.parentPort.postMessage(["mode", this.name, this.location]);
            } else {
                // Redefine the room
                this.defineRoom();
            }
            // Log that we are running again
            util.log(`New game instance is now running`);

            // Init every tile
            if (!rotatingAssault) {
                for (let y = 0; y < this.room.setup.length; y++) {
                    for (let x = 0; x < this.room.setup[y].length; x++) {
                        let tile = this.room.setup[y][x];
                        tile.entities = [];
                        tile.init(tile, this.room, this);
                    }
                }
            }


            // Set the gamemode manager again.
            this.gamemodeManager.redefine(this);
            // Wake up gamemode manager
            this.gamemodeManager.request("start");
        }

        // Run the server
        this.gameHandler.run();
    }

    pickNextAssaultVariant() {
        const choices = this.assaultRotation.filter(variant => variant !== this.assaultVariant);
        return ran.choose(choices.length ? choices : this.assaultRotation);
    }

    applyAssaultVariantConfig() {
        for (const key of this.assaultConfigKeys) Config[key] = this.assaultConfigDefaults[key];
        const mode = require(`./game/gamemodes/config/${this.assaultVariant}.js`);
        let overrideRoom = true;
        for (const key in mode) {
            if (key === "do_not_override_room") {
                overrideRoom = mode[key];
            } else if (key === "room_setup") {
                if (!overrideRoom) Config[key] = mode[key];
                else Config[key].push(...mode[key]);
            } else {
                Config[key] = mode[key];
            }
        }
    }

    // Define the room itself
    defineRoom() {
        this.room = {
            lastCycle: undefined,
            cycleSpeed: 1000 / this.roomSpeed / 30,
            partyHash: Number(((Math.random() * 1000000 | 0) + 1000000).toString().replace("0.", "")),
            setup: this.importedRoom,
            roomxgrid: this.importedRoom[0].length,
            roomygrid: this.importedRoom.length,
            xgrid: this.importedRoom[0].length,
            ygrid: this.importedRoom.length,
            spawnableDefault: [],
            center: {},
            spawnable: {},
            settings: {
                sandbox: {
                    do_not_change_arena_size: false
                }
            },
        };
        if (!this.wallGrid) {
            this.room.wallGrid = {
                xgrid: Config.sandbox ? 10 : 15,
                ygrid: Config.sandbox ? 10 : 15,
                width: Config.sandbox ? 1800 : 900,
                height: Config.sandbox ? 1800 : 900,
                getGrid: (location) => {
                    let x = Math.floor((location.x + this.room.wallGrid.width / 2) * this.room.wallGrid.xgrid / this.room.wallGrid.width);
                    let y = Math.floor((location.y + this.room.wallGrid.height / 2) * this.room.wallGrid.ygrid / this.room.wallGrid.height);
                    return {
                        x: (x + .5) / this.room.wallGrid.xgrid * this.room.wallGrid.width - this.room.wallGrid.width / 2,
                        y: (y + .5) / this.room.wallGrid.ygrid * this.room.wallGrid.height - this.room.wallGrid.height / 2,
                        id: x * this.room.wallGrid.xgrid + y
                    };
                }
            }
        }

        // Set properties.
        this.setRoomProperties();

        // And a bunch of functions to it

        // Are we in the room?
        this.room.isInRoom = location => {
            return location.x >= -this.room.width / 2 && location.x <= this.room.width / 2 && location.y >= -this.room.height / 2 && location.y <= this.room.height / 2
        };

        // Are we near the circle?
        this.room.near = function (position, radius) {
            let point = ran.pointInUnitCircle();
            return {
                x: Math.round(position.x + radius * point.x),
                y: Math.round(position.y + radius * point.y)
            };
        };

        // Get a random position in the room
        this.room.random = () => {
            return {
                x: ran.irandom(this.room.width) - this.room.width / 2,
                y: ran.irandom(this.room.height) - this.room.height / 2
            };
        };

        // Get a tile in the room
        this.room.getAt = location => {
            try {
                if (!this.room.isInRoom(location)) return null;
                let a = Math.floor((location.y + this.room.height / 2) / this.room.tileWidth);
                let b = Math.floor((location.x + this.room.width / 2) / this.room.tileHeight);
                return this.room.setup[a][b];
            } catch (e) {
                return undefined;
            }
        };

        // Tile locator
        this.room.isAt = (location) => {
            if (!this.room.isInRoom(location)) return false;
            let x = Math.floor((location.x + this.room.width / 2) * this.room.xgrid / this.room.width);
            let y = Math.floor((location.y + this.room.height / 2) * this.room.ygrid / this.room.height);
            return {
                x: (x + .5) / this.room.xgrid * this.room.width - this.room.width / 2,
                y: (y + .5) / this.room.ygrid * this.room.height - this.room.height / 2,
                id: x * this.room.xgrid + y
            };
        };
    }

    // Define room properties
    setRoomProperties() {
        // It's size
        Object.defineProperties(this.room, {
            tileWidth: { get: () => Config.map_tile_width, set: v => Config.map_tile_width = v },
            tileHeight: { get: () => Config.map_tile_height, set: v => Config.map_tile_height = v },
            width: { get: () => this.room.xgrid * Config.map_tile_width, set: v => Config.map_tile_width = v / this.room.xgrid },
            height: { get: () => this.room.ygrid * Config.map_tile_height, set: v => Config.map_tile_height = v / this.room.ygrid }
        });

        // And center
        Object.defineProperties(this.room.center, {
            x: { get: () => this.room.xgrid * Config.map_tile_width / 2 - this.room.width / 2, set: v => Config.map_tile_width = v * 2 / this.room.xgrid - this.room.width / 2 },
            y: { get: () => this.room.ygrid * Config.map_tile_height / 2 - this.room.height / 2, set: v => Config.map_tile_height = v * 2 / this.room.ygrid - this.room.height / 2 }
        });
    }

    // Set up the room
    setRoom() {
        // Get the room setup(s)
        for (let filename of Config.room_setup) {
            // ... get the current setup
            this.currentRoom = require(`./game/roomSetup/rooms/${filename}.js`);
            Config.roomHeight = this.currentRoom.length;
            Config.roomWidth = this.currentRoom[0].length;

            // Now we loop for tiles
            for (let y = 0; y < Config.roomHeight; y++) {
                for (let x = 0; x < Config.roomWidth; x++) {
                    if (this.importedRoom[y] == null) {
                        // Keep cached room definitions pristine so an Assault rotation can
                        // safely load the same map module again after the next match.
                        this.importedRoom[y] = this.currentRoom[y].slice();
                    } else if (this.currentRoom[y][x]) {
                        this.importedRoom[y][x] = this.currentRoom[y][x];
                    }
                }
            }
        };

        // Set the room
        this.defineRoom();

        // Now lets make the tiles as TileEntity so they can work properly
        for (let y in this.room.setup) {
            for (let x in this.room.setup[y]) {
                let tile = this.room.setup[y][x] = new tileEntity(this.room.setup[y][x], { x, y }, this);
                // Initialize the tile
                tile.init(tile, this.room, this);
            }
        };
    }

    // Room living loop
    roomLoop() {
        // Update all the entities
        for (let entity of entities.values()) {
            let tile = this.room.getAt(entity);
            if (tile && !entity.godmode && !entity.bond && !entity.immuneToTiles) tile.entities.push(entity);
        }
        // Update all the tiles
        for (let y = 0; y < this.room.setup.length; y++) {
            for (let x = 0; x < this.room.setup[y].length; x++) {
                let tile = this.room.setup[y][x];
                tile.tick(tile, this.room, this);
                // We can clean the tile entities now
                tile.entities = [];
            }
        }

        // If a client doesn't yet know what are we doing, broadcast it to him.
        // But only once
        if (this.room.sendColorsToClient) {
            this.room.sendColorsToClient = false;
            sockets.broadcastRoom();
        }
    }

    // Arena closers here we come
    closeArena() {
        // Check if the arena is closed
        if (this.arenaClosed) return;
        // Log this
        util.saveToLog("Game Instance Ending", "Game running " + this.gamemode + " at `" + this.gamemode + "` is now closing.", 0xEE4132);
        util.log(`Arena Closing initiated`);
        // And broadcast it
        this.socketManager.broadcast("Arena closed: No players may join!");
        this.arenaClosed = true;
        // Wait 5 seconds first, then we actually spawn arena closers
        let spawnTimeout = setTimeout(() => {
            for (let i = 0; i < 15; i++) {
                // Decide where we are facing
                let angle = ((Math.PI * 2) / 15) * i;
                // Spawn the entity
                let o = new Entity({
                    x: (this.room.width / 2 * this.room.xgrid / this.room.width) + (this.room.width / 0.7) * Math.cos(angle),
                    y: (this.room.width / 2 * this.room.xgrid / this.room.width) + (this.room.width / 0.7) * Math.sin(angle),
                });

                // Define it as arena closer
                o.define('arenaCloser');
                o.define({
                    COLOR: "yellow",
                    SIZE: 68,
                    ACCEPTS_SCORE: false,
                    AI: {
                        FULL_VIEW: true,
                        SKYNET: true,
                        BLIND: true,
                        CHASE: true,
                    },
                    CAN_BE_ON_LEADERBOARD: false,
                    CAN_GO_OUTSIDE_ROOM: true,
                    CONTROLLERS: [["nearestDifferentMaster", { lockThroughWalls: true }], "mapTargetToGoal"],
                    SKILL: Array(10).fill(9),
                });
                // Set it's team, name and minimap color
                o.team = TEAM_ENEMIES;
                o.name = "Arena Closer";
                o.minimapColor = "yellow";
                o.alwaysActive = true;
            }
        }, 500)
        // Every second we check how well arena closers are doing
        let ticks = 0;
        let loop = setInterval(() => {
            ticks++;
            // If they fail, we close anyway
            if (ticks >= 50) return clearInterval(loop), this.close(spawnTimeout);

            let alive = false;
            for (const instance of entities.values()) {
                if (
                    (instance.isPlayer && !instance.invuln && !instance.godmode) || instance.isMothership ||
                    instance.isBot ||
                    (instance.isDominator && instance.team !== TEAM_ENEMIES)
                ) {
                    alive = true;
                }
            }

            // Can we close?
            if (!alive) clearInterval(loop), this.close(spawnTimeout);
        }, 1000);
    }

    // For sandbox mainly
    updateBounds(width, height) {
        // Get room size
        const widthSize = parseInt(width);
        const heightSize = parseInt(height);
        // Update the value
        this.room.width = widthSize;
        this.room.height = heightSize;
        // Rebroadcast the room
        this.socketManager.broadcastRoom();
    }

    close(spawnTimeout) {
        // Log that we are closing
        util.log(`Ending Game instance`);
        // Clear the timeout if the arena closers did not spawn yet
        if (spawnTimeout) clearTimeout(spawnTimeout);
        // Now broadcast it
        this.socketManager.broadcast("Closing!");
        this.arenaClosed = true;
        for (let entity of entities.values()) if (entity.isPlayer || entity.isBot) entity.kill(); // Kill all players and bots.
        setTimeout(() => {
            // Wipe everyone
            for (let client of this.clients) {
                client.close();
            };
            // Kill the gamemode and the game looper
            this.gamemodeManager.terminate();
            this.gameHandler.stop();

            setTimeout(() => {
                // Wipe everything
                entities.clear();
                global.entityReferenceIndex?.clear();
                targetableEntities.clear();
                this.views = [];
                this.minimap = [];
                this.walls = [];
                this.gameHandler.bots = [];
                this.gameHandler.foods = [];
                this.gameHandler.nestFoods = [];
                global.grid.clear();
                global.spawnPoint = undefined;
                this.onEnd();
            }, 1000)
        }, 1000)
    }

    onEnd() {
        // Log that we are restarting
        util.log(`Game instance is now over. Soft restarting the server.`);
        // Set this to true to run the softstart code
        this.start(true);
    }

    reloadDefinitions = () => this.definitionsCombiner.loadDefinitions(false, false); 
}

module.exports = { gameServer };











