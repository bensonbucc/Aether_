const fs = require("fs");

const p = "./server/miscFiles/controllers.js";
let s = fs.readFileSync(p, "utf8");

const oldLine = "            if (entityMaster.team === owner.team) continue;";
const newLine = "            if (owner.team != null && entityMaster.team === owner.team) continue;";

if (!s.includes(oldLine)) {
    console.log("Target team-filter line not found.");
    process.exit(1);
}

s = s.replace(oldLine, newLine);

fs.writeFileSync(p, s, "utf8");

console.log("Defender FFA team check fixed.");
