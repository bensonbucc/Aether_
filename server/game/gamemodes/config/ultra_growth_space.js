module.exports = {
    growth: true,
    level_cap: 1000,
    game_speed: 1.25,
    run_speed: 2.25,
    growth_rate: 1.5,
    growth_health_multiplier: 1.75,
    kill_score_multiplier: 2,
    space_physics: true,
    space_speed_multiplier: 1.5,
    space_drag: 0.002,
    map_tile_width: 500,
    round_arena: false,
    defineLevelSkillPoints: level => {
        if (level < 2) return 0;
        if (level <= 40) return 1;
        if (level <= 45 && (level & 1) === 1) return 1;
        if (level <= 51 && level % 2 === 1) return 1;
        if (level % 10 === 1) return 1;
        return 0;
    },
};
