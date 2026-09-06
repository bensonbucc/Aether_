class Train {
    constructor () {}

    loop () {
        let train_able = [];

        for (let instance of entities.values()) {
            if (instance.isPlayer || instance.isBot) train_able.push(instance);
        }

        let teams = new Set(train_able.map(r => r.team));

        for (let team of teams) {
            let train = train_able
                .filter(r => r.team === team)
                .sort((a, b) => b.skill.score - a.skill.score);

            for (let [i, player] of train.entries()) {
                if (i === 0) continue;

                let leader = train[i - 1];

                let dx = leader.x - player.x;
                let dy = leader.y - player.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                const trainSpacing = 100;

                if (distance > trainSpacing) {
                    let strength = util.clamp(distance - trainSpacing, 0, 90);

                    player.velocity.x = (dx / distance) * strength * player.damp * 1.35;
                    player.velocity.y = (dy / distance) * strength * player.damp * 1.35;
                } else {
                    player.velocity.x *= 0.85;
                    player.velocity.y *= 0.85;
                }
            }
        }
    }
}

module.exports = { Train };
