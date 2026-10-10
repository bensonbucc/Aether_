module.exports = {
    level_cap: 1000,
    maze: true,
    maze_type: 80,
    map_tile_width: 1200,
    map_tile_height: 1200,
    old_dreadnoughts: true,
    classic_food: true,
    food_cap: 700,
    growth: true,
    defineLevelSkillPoints: level => {
        if (level <= 40) return 1;
        if (level <= 45 && (level & 1) == 1) return 1;
        if (level <= 51 && (level % 2) == 1) return 1;
        if (level % 10 == 1) return 1;
        return 0;
    },
}



