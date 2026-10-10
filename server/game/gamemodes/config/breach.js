module.exports = {
    level_cap: 120,

    do_not_override_room: false,
    room_setup: ["room_breach"],

    map_tile_width: 2400,
    map_tile_height: 2000,

    classic_food: true,
    food_cap: 500,

    growth: true,

    defineLevelSkillPoints: level => {
        if (level <= 40) return 1;
        if (level <= 45 && (level & 1) == 1) return 1;
        if (level <= 51 && (level % 2) == 1) return 1;
        if (level % 10 == 1) return 1;
        return 0;
    },

    breach: true,
};
