module.exports = {
    level_cap: 1000,
    growth: true,
    defineLevelSkillPoints: level => {
        if (level < 2) return 0;
        if (level <= 40) return 1;
        if (level <= 45 && level & 1 === 1) return 1;
        if (level <= 51 && (level % 2) == 1) return 1;
        if (level % 10 == 1) return 1;
        return 0;
    },
    mode: "tdm",
    teams: 2,
    assault: true,
    enable_bosses: false,
    map_tile_width: 400,
    map_tile_height: 400,
    do_not_override_room: false,
    room_setup: ["room_assault_bunker"],
    maze: true,
    maze_type: 10,
    team_weights: {
        [TEAM_BLUE]: 1.1
    }
}



