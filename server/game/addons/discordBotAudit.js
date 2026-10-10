"use strict";

const fs = require("fs");
const path = require("path");
const MAX_QUEUE = 100;
const SEND_INTERVAL_MS = 1100;

const queue = [];
let sending = false;

function getWebhookUrl() {
    let value = process.env.AETHER_DISCORD_AUDIT_WEBHOOK;
    if (!value) {
        try {
            const envFile = fs.readFileSync(path.resolve(__dirname, "../../../.env"), "utf8");
            const prefix = "AETHER_DISCORD_AUDIT_WEBHOOK=";
            const entry = envFile.split(/\r?\n/).find(line => line.trim().startsWith(prefix));
            if (entry) {
                value = entry.trim().slice(prefix.length).trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
            }
        } catch {
            return null;
        }
    }
    if (!value) return null;

    try {
        const url = new URL(value);
        const allowedHosts = new Set(["discord.com", "discordapp.com"]);
        if (
            url.protocol !== "https:" ||
            !allowedHosts.has(url.hostname.toLowerCase()) ||
            !url.pathname.startsWith("/api/webhooks/")
        ) return null;
        return url.toString();
    } catch {
        return null;
    }
}

function clean(value, maxLength = 100) {
    return String(value ?? "")
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/@/g, "@\u200b")
        .replace(/[<>]/g, "")
        .trim()
        .slice(0, maxLength) || "Unknown";
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function makePayload(event) {
    const body = event.playerBody;
    const count = Math.max(1, Math.floor(Number(event.count) || 1));
    const discordLink = event.discordLink;
    const displayName = body.displayName && body.displayName !== body.name
        ? ` (${clean(body.displayName, 80)})`
        : "";
    const mode = Array.isArray(event.mode) ? event.mode.join(", ") : event.mode;
    const accountDetails = discordLink
        ? `${clean(discordLink.displayName, 80)} (@${clean(discordLink.username, 80)})\nDiscord ID: ${clean(discordLink.id, 32)}`
        : "Not linked to this game session";

    return {
        embeds: [{
            title: `Aether bot-spawn alert: ${count} bot${count === 1 ? "" : "s"}`,
            color: 0x7654d6,
            fields: [
                { name: "In-game player", value: `${clean(body.name, 80)}${displayName}\nSession ID: ${clean(body.id, 32)}`, inline: true },
                { name: "Discord account", value: accountDetails, inline: true },
                { name: "Spawn details", value: `${clean(event.tank, 60)} · ${clean(event.botType, 30)} · ${count} spawned`, inline: true },
                { name: "Server", value: `${clean(event.serverName || mode, 80)} · port ${clean(event.port, 10)}`, inline: false },
                { name: "Action", value: clean(event.source, 50), inline: false }
            ],
            timestamp: new Date().toISOString()
        }],
        allowed_mentions: { parse: [] }
    };
}

async function drainQueue() {
    if (sending) return;
    sending = true;

    while (queue.length) {
        const webhookUrl = getWebhookUrl();
        if (!webhookUrl) {
            queue.length = 0;
            break;
        }

        const payload = queue.shift();
        try {
            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(5000)
            });

            if (response.status === 429) {
                const retryAfter = Number(response.headers.get("retry-after")) * 1000;
                queue.unshift(payload);
                await wait(Math.min(Math.max(retryAfter || SEND_INTERVAL_MS, SEND_INTERVAL_MS), 30000));
                continue;
            }
            if (!response.ok) {
                console.warn(`[Discord bot audit] Webhook delivery failed (HTTP ${response.status}).`);
            }
        } catch (error) {
            console.warn(`[Discord bot audit] Webhook delivery failed (${error.name || "network error"}).`);
        }

        if (queue.length) await wait(SEND_INTERVAL_MS);
    }

    sending = false;
}

module.exports = function notifyBotSpawn(event) {
    if (!event?.playerBody || !getWebhookUrl()) return false;
    if (queue.length >= MAX_QUEUE) {
        console.warn("[Discord bot audit] Alert queue is full; a spawn alert was dropped.");
        return false;
    }

    queue.push(makePayload(event));
    void drainQueue();
    return true;
};
