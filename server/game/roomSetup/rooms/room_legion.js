// A clear 50-by-50 arena: normal tiles only, with no walls or shape spawners.
const normal = tileClass.normal;
module.exports = Array.from({ length: 50 }, () => Array(50).fill(normal));
