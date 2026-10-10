module.exports = {
    // Development
    dev_build: true, // Whether this version is unstable and should be clearly marked as such.

    // Client
    main_menu: 'index.html', // Where the main menu is located (in the /public folder).
    host: process.env.RENDER_EXTERNAL_HOSTNAME ? process.env.RENDER_EXTERNAL_HOSTNAME : '192.168.50.117:3000', // Game server domain. If the host is 'localhost:NUMBER', the NUMBER must be the port setting.
    port: Number(process.env.PORT) || 3000, // Which port to run the web server on.

    // Server
    visible_list_interval: 250, // How often to update the list of the entities that players can see. Has effects of when entities are activated.
    startup_logs: true, // Enable detailed startup logs and log speed loop warnings in the terminal
    load_all_mockups: false, // Set to true if you want every mockup to be loaded when the server starts. May noticeably slow down server startup.
    editor: true, // Enable the editor at '[host]/ext/editor'.
    tank_editor: false, // Disabled: Tank Editor Beta has been removed from the playable server list.

    /* SERVER PROPERTIES INFORMATION - Make sure to change the host, port and id between servers!

        share_client_server - Forces your server to share the same host and port as the client. (by default, 3000)
        - Only one server at a time can have this enabled.
        - This is REQUIRED if your server host doesn't support multi-ports and forces everything through the main server.

        host        - Server host location.
        port        - The port on the server.
        id          - (<host>/#<id>)

        region      - The region tab the server is sorted into on the main menu.
        serverhost  - The host of the server in the server list tooltip.
        location    - The location of the server in the server list tooltip.

        gamemode    - The selected gamemode.
        player_cap  - Not including bots. Set to 0 to disable.

        featured    - Whether the server is featured or not.
        unlisted    - Whether the server shows up in the server list (if its id isn't in the url).
        private     - Whether the server requires a privileged token to join (except through server travel).

        properties  - This overrides other settings in this file, assuming the selected gamemode doesn't also override it.
    */

    servers: [
        {
            share_client_server: false,
            host: 'localhost:4000',
            port: 4000,
            id: 'c',

            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gamemode: ['tdm'],
            player_cap: 80,

            featured: false,
            unlisted: true,
            private: false,

            properties: {
                server_travel_properties: {
                    loop_interval: 10000,
                    portals: 2
                },
                server_travel: [
                    {
                        ip: 'localhost:3021',
                        portal_properties: {
                            spawn_chance: 1,
                            color: 'red'
                        }
                    },
                    {
                        ip: 'localhost:3031',
                        portal_properties: {
                            spawn_chance: 1,
                            color: 'blue'
                        }
                    }
                ]
            }
        },
        {
            share_client_server: false,
            host: 'localhost:5050',
            port: 5050,
            id: 'x',

            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gamemode: ['ffa'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: true,

            properties: {

            }
        },
        {
            share_client_server: false,
            host: 'localhost:3001',
            port: 3001,
            id: 'la',

            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gamemode: ['ffa'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {
                bot_cap: 5,
                daily_tank: {
                    tank: 'whirlwind',
                    tier: 3,
                    ads: false,
                    ad_sources: [
                        {
                            file: 'example_video_ad.mp4',
                            use_regular_ad_size: true
                        },
                        {
                            file: 'example_image_ad.png',
                            use_regular_ad_size: true
                        }
                    ]
                }
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3002',
            port: 3002,
            id: 'lb',

            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gamemode: ['maze'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {
                allow_server_travel: true
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3003',
            port: 3003,
            id: 'lc',

            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gamemode: ['tdm'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {
                teams: 2,
                bot_cap: 15,
                server_travel_properties: {
                    loop_interval: 10_000, // how often the portal loop executes in seconds
                    portals: 1, // amount of portals to spawn
                },
                server_travel: [
                    {
                        ip: 'localhost:3002', // destination server host, don't add "https://" or any slashes to it
                        portal_properties: {
                            spawn_chance: 3, // chance for a portal to spawn somewhere in the map each loop iteration (higher = lower chances, lower = higher chance)
                            color: 'red', // portal color
                        }
                    }
                ]
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3004',
            port: 3004,
            id: 'ld',

            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gamemode: ['mothership'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {
                mothership_time_limit: 30_000,
                teams: 3,
                bot_cap: 15
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3099',
            port: 3099,
            id: 'lz',

            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gamemode: ['sandbox'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {

            }
        },
        {
            share_client_server: false,
            host: 'localhost:3100',
            port: 3100,
            id: 'ls',

            region: "Local",
            serverhost: "Local",
            location: "Normal Sandbox",
            gamemode: ['normal_sandbox'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {
                teams: 1,
                bot_cap: 0,
                disable_auto_bots: true
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3005',
            port: 3005,
            id: 'lg',

            region: "Local",
            serverhost: "Local",
            location: "Growth Open",
            gamemode: ['growth'],
            player_cap: 80,

            featured: true,
            unlisted: false,
            private: false,

            properties: {
                bot_cap: 15
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3006',
            port: 3006,
            id: 'gm',

            region: "Local",
            serverhost: "Local",
            location: "Growth 2TDM Maze",
            gamemode: ['tdm', 'growth', 'open_maze'],
            player_cap: 80,

            featured: true,
            unlisted: false,
            private: false,

            properties: {
                teams: 2,
                no_bases: true,
                bot_cap: 15
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3024',
            port: 3024,
            id: 'ug',

            region: "Local",
            serverhost: "Local",
            location: "Ultra Growth Space Maze",
            gamemode: ['tdm', 'ultra_growth', 'open_maze', 'space'],
            player_cap: 80,

            featured: true,
            unlisted: false,
            private: false,

            properties: {
                teams: 2,
                bot_cap: 15
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3025',
            port: 3025,
            id: 'oval',

            region: "Local",
            serverhost: "Local",
            location: "The Oval Arena",
            gamemode: ['the_oval_arena'],
            player_cap: 80,

            featured: true,
            unlisted: false,
            private: false,

            properties: {
                teams: 0,
                bot_cap: 15
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3026',
            port: 3026,
            id: 'ugs',

            region: "Local",
            serverhost: "Local",
            location: "Ultra Growth Space",
            gamemode: ['ultra_growth_space'],
            player_cap: 80,

            featured: true,
            unlisted: false,
            private: false,

            properties: {
                teams: 0,
                bot_cap: 15
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3023',
            port: 3023,
            id: 'gs',
            region: "Local",
            serverhost: "Local",
            location: "Growth Squads Maze",
            gamemode: ['squads', 'growth', 'maze'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {
                teams: 4,
                bot_cap: 15
            }
        },
        {
            port: 3032,
            id: 'rc',
            region: "Local",
            serverhost: "Local",
            location: "Ricochet",
            gamemode: ['ricochet'],
            player_cap: 80,
            featured: false,
            unlisted: false,
            private: false,
            properties: {
                teams: 0,
                bot_cap: 50
            }
        },

        {
            share_client_server: false,
            host: 'localhost:3019',
            port: 3019,
            id: 'gar',

            region: "Local",
            serverhost: "Local",
            location: "Growth Arms Race Maze",
            gamemode: ['ffa', 'growth', 'maze', 'arms_race'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {
                teams: 0,
                bot_cap: 10
            }
        },

        {
            share_client_server: false,
            host: 'localhost:3020',
            port: 3020,
            id: 'nx',

            region: "Local",
            serverhost: "Local",
            location: "Nexus",
            gamemode: ['nexus'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3031',
            port: 3031,
            id: 'forge',

            region: "Local",
            serverhost: "Local",
            location: "Forge",
            gamemode: ['forge'],
            player_cap: 80,

            featured: false,
            unlisted: true,
            private: false,

            properties: {
                bot_cap: 0,
                disable_auto_bots: true,
                enable_bosses: false,
                allow_server_travel: true,
                dreadnought_forge: true,
                old_dreadnought_unlock_score: 10_000_000,
                server_travel_properties: {
                    loop_interval: 30000,
                    portals: 1
                },
                server_travel: [
                    {
                        ip: 'localhost:3022',
                        portal_properties: {
                            spawn_chance: 1,
                            color: 'blue',
                            central_area_radius_tiles: 5
                        }
                    },
                    {
                        ip: 'localhost:3021',
                        portal_properties: {
                            spawn_chance: 1,
                            color: 'red',
                            central_area_radius_tiles: 5
                        }
                    }
                ]
            }
        },
{
            share_client_server: false,
            host: 'localhost:3021',
            port: 3021,
            id: 'od',

            region: "Local",
            serverhost: "Local",
            location: "Old Dreads",
            gamemode: ['labyrinth'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {
                teams: 0,
                bot_cap: 0,
                disable_auto_bots: true,
                enable_bosses: false,
                allow_server_travel: true,
                server_travel_properties: {
                    loop_interval: 30000,
                    portals: 1
                },
                server_travel: [
                    {
                        ip: 'localhost:3022',
                        portal_properties: {
                            spawn_chance: 1,
                            color: 'blue',
                            central_area_radius_tiles: 5
                        }
                    },
                    {
                        ip: 'localhost:3031',
                        portal_properties: {
                            spawn_chance: 1,
                            color: 'red',
                            central_area_radius_tiles: 5
                        }
                    }
                ],
                growth_wall_clearance_ratio: 0.32,
                growth_size_score_cap: 1_500_000,
                old_dreadnought_large_tank_speed_factor: 1.25,
                growth_health_score_step: 250_000,
                growth_health_score_bonus_per_step: 0.005,
                growth_health_size_overflow_step: 0.5,
                growth_health_score_bonus: 0.08,
                growth_health_score_bonus_cap: 0.2,
                old_dreadnought_unlock_score: 10_000_000,
                classic_food_types: [
                    [1, [[5, 'egg'], [10, 'triangle'], [15, 'square'], [45, 'pentagon'], [25, 'betaPentagon'], [10, 'alphaPentagon']]],
                    [1/12, [[25, 'shinyTriangle'], [12, 'shinySquare'], [5, 'shinyPentagon']]],
                    [1/70, [[12, 'legendaryTriangle'], [6, 'legendarySquare'], [2, 'legendaryPentagon']]],
                    [1/250, [[3, 'shadowPentagon'], [2, 'rainbowPentagon'], [1, 'transPentagon']]],
                    [1/600, [[5, 'cube'], [4, 'tetrahedron'], [3, 'octahedron'], [2, 'dodecahedron'], [1, 'icosahedron'], [1, 'tesseract']]]
                ]
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3022',
            port: 3022,
            id: 'odopen',

            region: "Local",
            serverhost: "Local",
            location: "Open Old Dreads",
            gamemode: ['open_old_dreads'],
            player_cap: 80,

            featured: false,
            unlisted: true,
            private: false,

            properties: {
                teams: 0,
                bot_cap: 0,
                disable_auto_bots: true,
                enable_bosses: false,
                allow_server_travel: true,
                server_travel_properties: {
                    loop_interval: 30000,
                    portals: 1
                },
                server_travel: [
                    {
                        ip: 'localhost:3021',
                        portal_properties: {
                            spawn_chance: 1,
                            color: 'red',
                            central_area_radius_tiles: 5
                        }
                    },
                    {
                        ip: 'localhost:3031',
                        portal_properties: {
                            spawn_chance: 1,
                            color: 'purple',
                            central_area_radius_tiles: 5
                        }
                    }
                ]
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3007',
            port: 3007,

            id: 'ob',
            region: "Local",
            serverhost: "Local",
            location: "Outbreak",
            gamemode: ['outbreak'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {
                teams: 2,
                bot_cap: 15
            }
        },

        {
            share_client_server: false,
            host: 'localhost:3008',
            port: 3008,
            id: 'om',

            region: "Local",
            serverhost: "Local",
            location: "Outbreak Maze",
            gamemode: ['outbreak', 'maze'],
            player_cap: 80,

            featured: true,
            unlisted: false,
            private: false,

            properties: {
                bot_cap: 15
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3009',
            port: 3009,
            id: 'ha',

            region: "Local",
            serverhost: "Local",
            location: "Haunted Asylum",
            gamemode: ['halloween'],
            player_cap: 80,

            featured: true,
            unlisted: false,
            private: false,

            properties: {
                bot_cap: 15
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3035',
            port: 3035,
            id: 'mm',

            region: "Local",
            serverhost: "Local",
            location: "2 Team Mothership Maze",
            gamemode: ['mothership', 'maze'],
            player_cap: 80,

            featured: true,
            unlisted: false,
            private: false,

            properties: {
                teams: 2,
                bot_cap: 15
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3010',
            port: 3010,
            id: 'sf',

            region: "Local",
            serverhost: "Local",
            location: "Siege Fortress",
            gamemode: ['siege_fortress'],
            player_cap: 80,

            featured: true,
            unlisted: false,
            private: false,

            properties: {
                bot_cap: 15
            }
        },

        {
            share_client_server: false,
            host: 'localhost',
            port: 3011,
            id: 'g4',
            region: "Local",
            serverhost: "Local",
            location: "Growth 4TDM No Bases",
            gamemode: ['tdm', 'growth'],
            player_cap: 80,
            featured: true,
            unlisted: false,
            private: false,
            properties: {
                teams: 4,
                no_bases: true,
                disable_base_check: true,
                bot_cap: 15
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3030',
            port: 3030,
            id: 'sgb',

            region: "Local",
            serverhost: "Local",
            location: "Siege Growth Blitz",
            gamemode: ['siege_blitz', 'growth'],
            player_cap: 80,

            featured: true,
            unlisted: false,
            private: false,

            properties: {
                bot_cap: 15,
                disable_auto_bots: true
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3012',
            port: 3012,
            id: 'aa',
            region: "Local",
            serverhost: "Local",
            location: "Assault",
            gamemode: ['assault_acropolis'],
            player_cap: 80,
            featured: true,
            unlisted: false,
            private: false,
            properties: {
                bot_cap: 15,
                assault_rotation: [
                    "assault_acropolis", "assault_booster", "assault_bunker",
                    "assault_eye", "assault_line", "assault_trenches", "assault_yinyang"
                ]
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3033',
            port: 3033,
            id: 'legion',
            region: "Local",
            serverhost: "Local",
            location: "Legion",
            gamemode: ['legion'],
            player_cap: 80,
            featured: true,
            unlisted: false,
            private: false,
            properties: {
                bot_cap: 15
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3034',
            port: 3034,
            id: 'az',
            region: "Local",
            serverhost: "Local",
            location: "Aether Zones",
            gamemode: ['aether_zones'],
            player_cap: 80,
            featured: true,
            unlisted: false,
            private: false,
            properties: {}
        },
    ],
    // Web Server
    allow_ACAO: false, // Access-Control-Allow-Origin, allows any server/client to access data from the WebServer.

    // Map
    map_tile_width: 420,
    map_tile_height: 420,

    // The message that appears once a player spawns.
    spawn_message: "You have spawned! Welcome to the game.\n"
                 + "You will be invulnerable until you move or shoot.",
    token_message: "Friendly reminder: Please do not repeatedly kill others with an overpowered tank.",

    chat_message_duration: 15_000, // How long a chat message lasts in milliseconds.
    popup_message_duration: 10_000, // How long a popup message lasts in milliseconds.
    sanitize_chat_input: true, // If you don't want your players to color their messages. They get sanitized after addons interpret them, but before they're added to the chat message dictionary.

    // Seasonal
    fireworks: false, // Toggles fireworks (automatic around July 4 in US-region servers)
    thanksgiving: false, // Toggles the seasonal thanksgiving theme (replaces Motherships with Turkeys)
    spooky_theme: false, // Toggles the seasonal halloween theme (adds eyes to walls and replaces rocks to pumpkins)

    // Gameplay
    game_speed: 1, // General game speed.
    run_speed: 1.5, // General multiplier for acceleration and max speeds.
    max_heartbeat_interval: 300_000, // How long (in milliseconds) a socket can be disconnected before their tank self-destructs.
    respawn_delay: 0, // How long (in seconds) you have to wait to respawn. Set to 0 to disable.

    upgrade_delay: 3_000, // How long (in milliseconds) you have to stay still to upgrade outside of a base. Set to 0 to disable.
    upgrade_delay_reminder: 20_000, // How often (in milliseconds) you will be reminded to stay still and not shoot to upgrade outside of a base if you haven't upgraded yet.

    bullet_spawn_offset: 1, // Where the bullet spawns, where 1 is fully outside the barrel and -1 is fully inside the barrel, and 0 is halfway between.
    damage_multiplier: 1, // General damage multiplier everytime damage is dealt.
    knockback_multiplier: 1.1, // General knockback multiplier everytime knockback is applied.
    glass_health_factor: 2, // TODO: Figure out how the math behind this works.
    room_bound_force: 0.01,// How strong the force is that confines entities to the map and portals apply to entities.
    soft_max_skill: 0.59, // TODO: Find out what the intention behind the implementation of this configuration is.

    mothership_time_limit: 0, // How long (in milliseconds) a player can have in control of their team's mothership. Set to 0 to disable.

    // When an entity reaches a level, this function is called and returns how many skill points that entity gets for reaching that level.
    defineLevelSkillPoints: level => {
        if (level < 2) return 0;
        if (level <= 40) return 1;
        if (level <= 45 && level & 1 === 1) return 1;
        return 0;
    },

    level_cap: 45, // Maximum normally achievable level.
    level_cap_cheat: 45, // Maximum level via the level-up key and auto-level-up.

    skill_cap: 9, // Default skill caps.
    tier_multiplier: 15, // Level difference between each upgrade tier.

    // Bots
    bot_cap: 5, // Maximum number of bots that can be on the server. Set to 0 to disable bots.
    bot_xp_gain: 60, // How much XP bots get until they reach level_cap.
    bot_start_level: 45, // How much XP bots will receive when first created.
    bot_skill_upgrade_chances: [1, 1, 3, 4, 4, 4, 4, 2, 1, 1], // The chances of a bot upgrading a specific skill when skill upgrades are available.
    bot_class_upgrade_chances: [1, 5, 20, 37, 37], // The chances of a bot upgrading a specific amount of times before it stops upgrading.
    bot_name_prefix: "[AI] ", // This is prefixed before the bot's randomly chosen name.

    // The class that players and bots spawn as.
    spawn_class: 'basic',

    // How every entity regenerates their health.
    regenerate_tick: 100,

    // Food
    enable_food: true, // Allows food to spawn.
    food_cap: 70, // Maximum number of regular food at any time.
    food_cap_nest: 15, // Maximum number of nest food at any time.
    enemy_cap_nest: 10, // Maximum number of enemy nest food at any time.
    food_group_cap: 6, // Number of foods that random food groups spawn with

    // Tiered Food
    food_types: Array(3).fill().map((_, i, a) => [ // Possible food types outside the nest
        // Chance of spawning in exponents of 4
        4 ** (a.length - i),
        // 4-wide dimension of the 4 shape tiers - regular, beta, alpha, omega
        Array(3).fill().map((_, j, b) => [
            // Chance of spawning in exponents of 5
            5 ** (b.length - j),
            // 6-wide dimension of the 6 shiny modifiers
            Array(6).fill().map((_, k, c) => [
                // Chance of spawning, set to 200mil for regular polygons and exponents of 10 otherwise
                k ? 10 ** (c.length - k - 1) : 200_000_000,

                // 2-wide dimension of the 2 shape "ranks" - normal, crasher
                // laby_${poly}_${tier}_${shiny}_${rank}
                [
                    [24, `laby_${i}_${j}_${k}_0`],
                    //[1, `laby_${i}_${j}_${k}_1`] // uncomment to enable crashers outside nest
                ]
            ])
        ])
    ]),
    food_types_nest: Array(2).fill().map((_, i, a) => [ // Possible food types in the nest
        // Chance of spawning in exponents of 4
        4 ** (a.length - i),
        // 4-wide dimension of the 4 shape tiers - regular, beta, alpha, omega
        Array(3).fill().map((_, j, b) => [
            // Chance of spawning in exponents of 5
            5 ** (b.length - j),
            // 6-wide dimension of the 6 shiny modifiers
            Array(6).fill().map((_, k, c) => [
                // Chance of spawning, set to 200mil for regular polygons and exponents of 10 otherwise
                k ? 10 ** (c.length - k - 1) : 200_000_000,

                // 2-wide dimension of the 2 shape "ranks" - normal, crasher
                // laby_${poly}_${tier}_${shiny}_${rank}
                [
                    [24, `laby_${i + 3}_${j}_${k}_0`],
                    //[1, `laby_${i + 3}_${j}_${k}_1`] // uncomment to enable crashers in nest
                ]
            ])
        ])
    ]),

    // Classic Food
    old_dreadnoughts: false,
    classic_food: false, // Enables classic (Old Dreadnoughts) food types.
    classic_food_types: [
        [1, [
            [5, 'egg'], [10, 'triangle'], [15, 'square'], [45, 'pentagon'], [25, 'betaPentagon'], [10, 'alphaPentagon']
        ]],
        [1/15, [
            [25, 'shinyTriangle'], [12, 'shinySquare'], [5, 'shinyPentagon']
        ]],
        [1/100, [
            [12, 'legendaryTriangle'], [6, 'legendarySquare'], [2, 'legendaryPentagon']
        ]],
        [1/500, [
            [3, 'shadowPentagon'], [2, 'rainbowPentagon'], [1, 'transPentagon']
        ]],
        [1/1500, [
            [1, 'cube'], [1, 'dodecahedron'], [1, 'icosahedron']
        ]]
    ],
    classic_food_types_nest: [ // Possible classic food types in the nest
        [1, [
            [16, 'pentagon'], [4, 'betaPentagon'], [1, 'alphaPentagon']/*, [16, 'presentRY'], [16, 'presentRP'], [16, 'presentRW'], [16, 'presentGY'], [16, 'presentGP'], [16, 'presentGW'], [16, 'presentBY'], [16, 'presentBP'], [16, 'presentBW'],*/
        ]]
    ],
    classic_enemy_types_nest: [ // Possible classic enemy food types in the nest
        [1, [
            [1, 'crasher']
        ]],
        [1/20, [
            [1, 'sentryGun'], [1, 'sentrySwarm'], [1, 'sentryTrap']
        ]]
    ],

    // Bosses
    enable_bosses: true,
    boss_control: false, // Allows players to control bosses like dominators and motherships.
    boss_spawn_cooldown: 260, // The delay (in seconds) between boss spawns.
    boss_spawn_delay: 6, // The delay (in seconds) between the boss spawn being announced and the boss(es) actually spawning.
    boss_types: [
        {
            bosses: ['eliteDestroyer', 'eliteGunner', 'eliteSprayer', 'eliteBattleship', 'eliteSpawner'],
            amount: [5, 5, 4, 2, 1], chance: 2, nameType: 'a',
        },
        {
            bosses: ['roguePalisade'],
            amount: [4, 1], chance: 1, nameType: 'castle',
            message: 'A strange trembling...',
        },
        {
            bosses: ['summoner', 'eliteSkimmer', 'nestKeeper'],
            amount: [2, 2, 1], chance: 1, nameType: 'a',
            message: 'A strange trembling...',
        },
        /*{
            bosses: ['paladin', 'freyja', 'zaphkiel', 'nyx', 'theia'],
            amount: [1], chance: 0.01,
            message: 'The world tremors as the celestials are reborn anew!',
        },
        {
            bosses: ['julius', 'genghis', 'napoleon'],
            amount: [1], chance: 0.1,
            message: 'The darkness arrives as the realms are torn apart!',
        }*/
    ],

    // How many members a team can have in comparison to an unweighed team.
    // Example: We have team A and B. If the weight of A is 2 and B is 1, then the game will try to give A twice as many members as B.
    // Check game/gamemodes/config to see how this works.
    team_weights: {},

    // Fun
    brain_damage: false, // Violently shakes your camera and tank if you name yourself 'Brain Damage'. Disabled by default for epilepsy concerns.
    random_body_colors: false,

    // Room setup (don't change these unless you know what you're doing)
    room_setup: ['room_default'],
    round_arena: false,
    mode: 'ffa',
}




























































