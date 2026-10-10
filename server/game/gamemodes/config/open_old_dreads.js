const growth = require("./growth.js");

module.exports = {
    ...growth,
    mode: "ffa",
    old_dreadnoughts: true,
    classic_food: true,
    room_setup: ["room_sandbox"],
    bot_cap: 0,
    disable_auto_bots: true,
    enable_bosses: false,
};
