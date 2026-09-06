const fs = require("fs");

const p = "./server/game/network/sockets.js";
let s = fs.readFileSync(p, "utf8");

if (s.includes('action === "defenders"')) {
    console.log("Defender socket command already installed.");
    process.exit(0);
}

const marker = "    // ============================================\n    // PURGE ONLY BOTS CREATED BY THIS PANEL";

const pos = s.indexOf(marker);

if (pos < 0) {
    console.log("ERROR: insertion point not found.");
    process.exit(1);
}

const insert = `    // ============================================
    // 5 DEFENDER BOTS
    // ============================================
    if (action === "defenders") {
        const owner = socket.player.body;
        const command = String(m[0] || "").toLowerCase();

        if (command === "on") {
            handler.enableDefenders(owner);
        } else if (command === "off") {
            handler.disableDefenders(owner);
        }

        return;
    }

`;

s = s.slice(0, pos) + insert + s.slice(pos);

fs.writeFileSync(p, s, "utf8");

console.log("Defender socket command added successfully.");
