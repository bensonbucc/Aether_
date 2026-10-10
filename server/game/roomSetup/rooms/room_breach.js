const {
    normal: open,
    wall,
    base1: blueBase,
    baseprotected1: blueProtected,
} = tileClass;

// Breach battlefield.
// 45 columns x 35 rows.
// The battlefield is intentionally irregular rather than a simple square/maze.
// Walls create several connected routes and open combat areas.

const W = 45;
const H = 35;

let room_breach = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => wall)
);

function carve(x1, y1, x2, y2) {
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            if (x >= 0 && x < W && y >= 0 && y < H) {
                room_breach[y][x] = open;
            }
        }
    }
}

function corridor(points, width = 2) {
    for (let i = 0; i < points.length - 1; i++) {
        let [x1, y1] = points[i];
        let [x2, y2] = points[i + 1];

        let steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));

        for (let s = 0; s <= steps; s++) {
            let t = steps === 0 ? 0 : s / steps;
            let x = Math.round(x1 + (x2 - x1) * t);
            let y = Math.round(y1 + (y2 - y1) * t);

            carve(
                x - Math.floor(width / 2),
                y - Math.floor(width / 2),
                x + Math.floor(width / 2),
                y + Math.floor(width / 2)
            );
        }
    }
}

// Blue starting zone.
carve(2, 14, 7, 20);

// Large opening immediately after the Blue base.
carve(8, 11, 14, 23);

// Main battlefield openings.
carve(15, 7, 24, 14);
carve(16, 20, 27, 29);
carve(27, 9, 35, 18);
carve(30, 21, 39, 30);

// Far Red-side combat areas.
carve(36, 6, 42, 15);
carve(37, 18, 43, 27);

// Twisting primary routes.
corridor([
    [6, 17],
    [11, 17],
    [13, 13],
    [18, 11],
    [23, 13],
    [27, 11],
    [31, 14],
    [35, 11],
    [39, 9],
], 3);

corridor([
    [10, 18],
    [14, 21],
    [18, 24],
    [23, 23],
    [27, 27],
    [32, 25],
    [36, 22],
    [40, 24],
], 3);

// Cross-connections so players can switch routes.
corridor([
    [17, 11],
    [17, 17],
    [20, 21],
], 2);

corridor([
    [24, 13],
    [26, 18],
    [31, 22],
], 2);

corridor([
    [31, 14],
    [31, 19],
    [36, 22],
], 2);

corridor([
    [35, 11],
    [37, 16],
    [40, 19],
], 2);

// Additional side fighting areas.
carve(11, 5, 17, 8);
carve(21, 5, 27, 9);
carve(23, 27, 29, 31);
carve(31, 5, 36, 8);
carve(39, 13, 43, 18);
carve(39, 27, 43, 30);

// Put some walls back into the open battlefield to form cover,
// defensive positions, and meaningful route choices.
for (let y = 5; y <= 9; y++) {
    if (y !== 7) room_breach[y][19] = wall;
}

for (let y = 15; y <= 20; y++) {
    if (y !== 17 && y !== 18) room_breach[y][22] = wall;
}

for (let y = 19; y <= 26; y++) {
    if (y !== 22 && y !== 23) room_breach[y][29] = wall;
}

for (let y = 9; y <= 16; y++) {
    if (y !== 12 && y !== 13) room_breach[y][36] = wall;
}

// A few defensive wall clusters.
for (let x = 12; x <= 15; x++) room_breach[9][x] = wall;
for (let x = 25; x <= 28; x++) room_breach[18][x] = wall;
for (let x = 33; x <= 36; x++) room_breach[19][x] = wall;
for (let x = 38; x <= 41; x++) room_breach[16][x] = wall;

// Blue starting base.
// Several protected tiles give the team a proper starting area.
for (let y = 16; y <= 18; y++) {
    for (let x = 3; x <= 5; x++) {
        room_breach[y][x] = blueBase;
    }
}

room_breach[16][4] = blueProtected;
room_breach[17][4] = blueProtected;
room_breach[18][4] = blueProtected;

module.exports = room_breach;
