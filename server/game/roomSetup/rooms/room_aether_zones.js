const { normal } = tileClass;

// 6 columns by 4 rows gives Aether Zones its 24 open effect regions.
module.exports = Array.from({ length: 4 }, () => Array(6).fill(normal));
