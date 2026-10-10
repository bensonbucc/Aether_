"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const pendingDirectory = path.resolve(__dirname, "../../../.aether-discord-links");
const accountDirectory = path.join(pendingDirectory, "accounts");
const CODE_TTL_MS = 10 * 60 * 1000;

function makeCode() {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function create(discordUser) {
    fs.mkdirSync(pendingDirectory, { recursive: true });

    let code;
    let file;
    do {
        code = makeCode();
        file = path.join(pendingDirectory, `${code}.json`);
    } while (fs.existsSync(file));

    const record = {
        discordId: String(discordUser.id),
        username: String(discordUser.username || "Discord user").slice(0, 80),
        displayName: String(discordUser.displayName || discordUser.username || "Discord user").slice(0, 80),
        expiresAt: Date.now() + CODE_TTL_MS
    };
    fs.writeFileSync(file, JSON.stringify(record), { flag: "wx" });
    return { code, expiresInMinutes: CODE_TTL_MS / 60_000 };
}

function claim(code) {
    const normalized = String(code || "").trim().toUpperCase();
    if (!/^[A-F0-9]{8}$/.test(normalized)) return null;

    const source = path.join(pendingDirectory, `${normalized}.json`);
    const claimed = path.join(pendingDirectory, `${normalized}.${process.pid}.${crypto.randomUUID()}.claimed`);
    try {
        // Rename is atomic, so only one game worker can redeem a code.
        fs.renameSync(source, claimed);
    } catch {
        return null;
    }

    try {
        const record = JSON.parse(fs.readFileSync(claimed, "utf8"));
        if (!record.discordId || !record.expiresAt || record.expiresAt < Date.now()) return null;

        const token = crypto.randomBytes(32).toString("base64url");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        fs.mkdirSync(accountDirectory, { recursive: true });
        fs.writeFileSync(
            path.join(accountDirectory, `${tokenHash}.json`),
            JSON.stringify({
                discordId: record.discordId,
                username: record.username,
                displayName: record.displayName,
                linkedAt: Date.now()
            }),
            { flag: "wx" }
        );
        return { ...record, token };
    } catch {
        return null;
    } finally {
        try { fs.unlinkSync(claimed); } catch {}
    }
}

function resolveToken(token) {
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    try {
        const record = JSON.parse(fs.readFileSync(path.join(accountDirectory, `${tokenHash}.json`), "utf8"));
        return record.discordId ? record : null;
    } catch {
        return null;
    }
}

module.exports = { create, claim, resolveToken };
