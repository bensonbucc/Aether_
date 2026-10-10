module.exports = {
    growth: true,
    level_cap: 1000,
    game_speed: 1.5,
    run_speed: 2,
    defineLevelSkillPoints: level => {
        if (level < 2) return 0;
        if (level <= 40) return 1;
        if (level <= 45 && (level & 1) === 1) return 1;
        if (level <= 51 && level % 2 === 1) return 1;
        if (level % 10 === 1) return 1;
        return 0;
    },
};
