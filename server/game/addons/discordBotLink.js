"use strict";

const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const linkCodes = require("./discordLinkCodes.js");

const APPLICATION_ID = process.env.AETHER_DISCORD_APPLICATION_ID || "1558196159225528501";
const GUILD_ID = process.env.AETHER_DISCORD_GUILD_ID || "1544739107748446229";
const TRACKING_CHANNEL_ID = process.env.AETHER_DISCORD_TRACKING_CHANNEL_ID || "1558188710984552521";
const API_BASE = "https://discord.com/api/v10";
const projectRoot = path.resolve(__dirname, "../../..");
let started = false;
let announcedOnline = false;

function loadBotToken() {
    if (process.env.AETHER_DISCORD_BOT_TOKEN) return process.env.AETHER_DISCORD_BOT_TOKEN;
    try {
        const dotenv = require("../../lib/dotenv.js");
        const envPath = path.join(projectRoot, ".env");
        const values = dotenv(fs.readFileSync(envPath, "utf8"));
        let token = values.AETHER_DISCORD_BOT_TOKEN;
        if (token && ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'")))) {
            token = token.slice(1, -1);
        }
        return token || null;
    } catch {
        return null;
    }
}

async function apiRequest(endpoint, method, body) {
    const token = loadBotToken();
    if (!token) throw new Error("Discord bot token is not configured.");
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: {
            authorization: `Bot ${token}`,
            "content-type": "application/json"
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Discord API returned HTTP ${response.status}.`);
    if (response.status === 204) return null;
    return response.json();
}

async function registerLinkCommand() {
    const endpoint = `/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`;
    const commands = await apiRequest(endpoint, "GET");
    const existing = commands.find(command => command.name === "link");
    const definition = {
        name: "link",
        description: "Link your Discord account to Aether so bot-spawn alerts can identify you."
    };

    if (existing) {
        await apiRequest(`${endpoint}/${existing.id}`, "PATCH", definition);
    } else {
        await apiRequest(endpoint, "POST", definition);
    }
}

async function respondToInteraction(interaction, content) {
    const response = await fetch(`${API_BASE}/interactions/${interaction.id}/${interaction.token}/callback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            type: 4,
            data: { content, flags: 64 }
        }),
        signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Discord interaction reply returned HTTP ${response.status}.`);
}

async function handleInteraction(interaction) {
    if (interaction.guild_id !== GUILD_ID || interaction.data?.name !== "link") return;
    const user = interaction.member?.user || interaction.user;
    if (!user?.id) return respondToInteraction(interaction, "I couldn't verify your Discord account. Try again.");

    const code = linkCodes.create({
        id: user.id,
        username: user.username,
        displayName: interaction.member?.nick || user.global_name || user.username
    });
    await respondToInteraction(
        interaction,
        `Your one-time Aether link code is **${code.code}**. In the game, enter **$discordlink ${code.code}** in chat within ${code.expiresInMinutes} minutes. Keep this code private.`
    );
}

async function sendOnlineNotice() {
    if (announcedOnline) return;
    try {
        await apiRequest(`/channels/${TRACKING_CHANNEL_ID}/messages`, "POST", {
            content: "Aether Discord tracker is online. Players can use `/link` once per browser to associate their Discord account with their game sessions."
        });
        announcedOnline = true;
    } catch (error) {
        console.warn(`[Discord bot link] Could not post its startup notice (HTTP/API error).`);
    }
}

function connectGateway() {
    const socket = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");
    let heartbeatTimer;
    let heartbeatInterval;
    let heartbeatAcknowledged = true;
    let sequence = null;
    let closedIntentionally = false;

    const clearHeartbeat = () => {
        clearTimeout(heartbeatTimer);
        clearInterval(heartbeatInterval);
    };

    socket.on("message", async raw => {
        let packet;
        try { packet = JSON.parse(raw.toString()); } catch { return; }
        if (packet.s !== null && packet.s !== undefined) sequence = packet.s;

        if (packet.op === 10) {
            heartbeatInterval = setInterval(() => {
                if (!heartbeatAcknowledged) {
                    socket.close();
                    return;
                }
                heartbeatAcknowledged = false;
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ op: 1, d: sequence }));
                }
            }, packet.d.heartbeat_interval);

            socket.send(JSON.stringify({
                op: 2,
                d: {
                    token: loadBotToken(),
                    intents: 1,
                    properties: { os: process.platform, browser: "aether-tracker", device: "aether-tracker" }
                }
            }));
            return;
        }
        if (packet.op === 11) {
            heartbeatAcknowledged = true;
            return;
        }
        if (packet.op === 7 || packet.op === 9) {
            clearHeartbeat();
            socket.close();
            return;
        }
        if (packet.op !== 0) return;

        if (packet.t === "READY") {
            try {
                await registerLinkCommand();
                console.log("[Discord bot link] Connected and /link is ready.");
                await sendOnlineNotice();
            } catch (error) {
                console.warn(`[Discord bot link] Setup failed (${error.message}).`);
            }
        } else if (packet.t === "INTERACTION_CREATE") {
            try {
                await handleInteraction(packet.d);
            } catch (error) {
                console.warn(`[Discord bot link] Could not handle /link (API error).`);
                try { await respondToInteraction(packet.d, "The link command failed. Please try again in a moment."); } catch {}
            }
        }
    });

    socket.on("error", () => {});
    socket.on("close", () => {
        clearHeartbeat();
        if (!closedIntentionally) setTimeout(connectGateway, 5000).unref();
    });
}

function start() {
    if (started) return;
    started = true;
    if (!loadBotToken()) {
        console.log("[Discord bot link] Disabled; add AETHER_DISCORD_BOT_TOKEN to the project .env to enable account linking.");
        return;
    }
    connectGateway();
}

module.exports = { start };
