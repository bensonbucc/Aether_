const fs = require("fs");

const p = "./server/miscFiles/controllers.js";
let s = fs.readFileSync(p, "utf8");

const classStart = s.indexOf("class io_defenderBot extends IO {");
const typesStart = s.indexOf("let ioTypes = {");

if (classStart < 0) {
    console.log("ERROR: defenderBot class not found.");
    process.exit(1);
}

if (typesStart < 0) {
    console.log("ERROR: ioTypes block not found.");
    process.exit(1);
}

if (classStart < typesStart) {
    console.log("Defender controller is already correctly placed.");
    process.exit(0);
}

// The defender class was appended after module.exports,
// so everything from classStart to the end is the defender class.
const defenderClass = s.slice(classStart).trim();

// Remove the appended defender class.
s = s.slice(0, classStart).trimEnd() + "\n";

// Insert it immediately before ioTypes.
const newTypesStart = s.indexOf("let ioTypes = {");

if (newTypesStart < 0) {
    console.log("ERROR: ioTypes block disappeared.");
    process.exit(1);
}

s = s.slice(0, newTypesStart)
    + defenderClass
    + "\n\n"
    + s.slice(newTypesStart);

fs.writeFileSync(p, s, "utf8");

console.log("Defender controller moved successfully.");
