class HauntedAsylum {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.active = false;

        this.generators = [];
        this.generatorStates = [true, true];

        this.doors = [];
        this.buttons = [];
        this.lastDarkState = "";
    }

    tileLocation(x, y) {
        const room = this.gameManager.room;

        return {
            x: room.tileWidth * (x + 0.5) - room.width / 2,
            y: room.tileHeight * (y + 0.5) - room.height / 2
        };
    }

    createGenerator(x, y, side, powered) {
        const o = new Entity(this.tileLocation(x, y));

        o.define("dominator");

        o.team = TEAM_ROOM;
        o.name = side === 0
            ? "Western Generator"
            : "Eastern Generator";

        o.displayName = true;
        o.isHauntedGenerator = true;
        o.hauntedSide = side;
        o.hauntedPowered = powered;

        // Large Dominator-style generator.
        o.SIZE = this.gameManager.room.tileWidth / 15;
        o.permanentSize = o.SIZE;

        // Very high health so normal bullets don't instantly destroy it.
        if (o.health) {
            o.health.max = 15000;
            o.health.amount = 15000;
        }

        if (o.shield) {
            o.shield.max = 5000;
            o.shield.amount = 5000;
        }

        o.invuln = false;
        o.godmode = false;

        if (o.velocity) {
            o.velocity.x = 0;
            o.velocity.y = 0;
        }

        this.setGeneratorState(o, powered);

        o.on("dead", () => {
            if (!this.active) return;

            const newState = !powered;

            this.generatorStates[side] = newState;
            this.syncDarkness();

            const sideName =
                side === 0 ? "Western" : "Eastern";

            global.gameManager.socketManager.broadcast(
                `${sideName} generator ${newState ? "powered on" : "powered off"}`
            );

            setTimeout(() => {
                if (!this.active) return;
                if (global.gameManager.arenaClosed) return;
                const respawnSpots = side === 0
                    ? [[20, 29], [47, 22], [47, 38]]
                    : [[147, 29], [120, 22], [120, 38]];
                const [nextX, nextY] = ran.choose(respawnSpots);
                this.generators[side] = this.createGenerator(nextX, nextY, side, newState);
                this.syncDarkness();
            }, 1500);
        });

        return o;
    }

    setGeneratorState(generator, powered) {
        if (!generator) return;

        generator.hauntedPowered = powered;

        // Green = powered = lights on. Red = offline = that wing is dark.
        if (generator.color) {
            generator.color.base =
                powered ? "green" : "red";
        }

        // Actual minimap marker.
        generator.minimapColor =
            powered ? "green" : "red";

        generator.refreshBodyAttributes();
        this.generatorStates[generator.hauntedSide] = powered;
        this.syncDarkness();
    }

    syncDarkness() {
        const westDark = !this.generatorStates[0];
        const eastDark = !this.generatorStates[1];
        Config.haunted_west_dark = westDark;
        Config.haunted_east_dark = eastDark;
        const state = `${westDark}:${eastDark}`;
        if (state === this.lastDarkState) return;
        this.lastDarkState = state;
        for (const client of this.gameManager.clients) client.talk("HA", westDark, eastDark);
    }

    createDoor(x, y) {
        const o = new Entity(this.tileLocation(x, y));

        o.define("wall");
        o.team = TEAM_ROOM;

        o.isHauntedDoor = true;
        o.hauntedDoorOpen = false;

        o.SIZE = this.gameManager.room.tileWidth / 2;
        o.permanentSize = o.SIZE;

        o.protect();
        o.life();

        makeHitbox(o);
        walls.push(o);

        o.on("dead", () => {
            util.remove(walls, walls.indexOf(o));
        });

        this.doors.push(o);

        return o;
    }

    toggleDoor(door) {
        if (!door || door.isDead()) return;

        door.hauntedDoorOpen = !door.hauntedDoorOpen;

        if (door.hauntedDoorOpen) {
            door.godmode = true;
            door.SIZE = 0.01;
        } else {
            door.godmode = false;
            door.SIZE = this.gameManager.room.tileWidth / 2;
        }
        makeHitbox(door);
    }

    createButton(x, y, door) {
        const o = new Entity(this.tileLocation(x, y));

        o.define("smasher");
        o.team = TEAM_ROOM;

        o.name = "Door Button";
        o.displayName = false;
        o.isHauntedButton = true;

        o.SIZE = this.gameManager.room.tileWidth / 4;
        o.permanentSize = o.SIZE;

        o.color.base = "grey";
        o.controllers = [];

        this.buttons.push(o);

        o.on("dead", () => {
            if (!this.active) return;

            this.toggleDoor(door);

            setTimeout(() => {
                if (!this.active) return;
                if (global.gameManager.arenaClosed) return;

                this.createButton(x, y, door);
            }, 1500);
        });

        return o;
    }

    setupObjects() {
        // The asylum starts dark; destroying a generator restores that side's lights.
        this.generators[0] =
            this.createGenerator(20, 29, 0, false);

        this.generators[1] =
            this.createGenerator(147, 29, 1, false);

        const door1 = this.createDoor(64, 24);
        this.toggleDoor(door1); // Doors begin open; shoot their controls to close them.
        this.createButton(61, 24, door1);

        const door2 = this.createDoor(64, 36);
        this.toggleDoor(door2);
        this.createButton(67, 36, door2);

    }

    start() {
        if (this.active) return;

        this.active = true;

        this.generators = [];
        this.doors = [];
        this.buttons = [];

        this.generatorStates = [false, false];

        Config.blackout = false;
        this.lastDarkState = "";
        Config.haunted_west_dark = true;
        Config.haunted_east_dark = true;

        this.setupObjects();
        this.syncDarkness();

        global.gameManager.socketManager.broadcast(
            "HAUNTED ASYLUM: GENERATORS OFFLINE"
        );
    }

    loop() {
        if (!this.active) return;

        Config.blackout = false;
        this.syncDarkness();

        const players = this.gameManager.socketManager.players || [];
    }

    reset() {
        this.active = false;

        Config.blackout = false;
        Config.haunted_west_dark = false;
        Config.haunted_east_dark = false;

        for (const door of this.doors) {
            if (door && !door.isDead()) door.kill();
        }

        for (const button of this.buttons) {
            if (button && !button.isDead()) button.kill();
        }

        for (const generator of this.generators) {
            if (generator && !generator.isDead()) generator.kill();
        }
        this.generators = [];
        this.doors = [];
        this.buttons = [];

        this.generatorStates = [true, true];
    }
}

module.exports = { HauntedAsylum };




