export function initDevSiegeTools(global) {
    if (document.getElementById("aether-dev-siege-tools")) return;

    const root = document.createElement("div");
    root.id = "aether-dev-siege-tools";
    root.innerHTML = `
        <button type="button" data-toggle aria-expanded="false">SIEGE TOOLS <span data-chevron>+</span></button>
        <section data-panel hidden>
            <strong>Developer wave spawner</strong>
            <select data-wave aria-label="Special Siege wave">
                <option value="bob">Bob — Rammer</option>
                <option value="bobRush">Bob Rush — 3 rammers</option>
                <option value="bobNemesis">Bob and Nemesis</option>
                <option value="eliteTrio">Elite Trio</option>
                <option value="celestialPair">Celestial Pair</option>
            </select>
            <button type="button" data-spawn>SPAWN WAVE</button>
            <div data-status role="status">Ready</div>
        </section>
    `;
    const style = document.createElement("style");
    style.textContent = `
        #aether-dev-siege-tools { position: fixed; z-index: 2147483000; top: 48px; left: 10px; width: 224px; color: #e8f6ff; font: 12px Arial, sans-serif; pointer-events: auto; }
        #aether-dev-siege-tools[hidden], #aether-dev-siege-tools [hidden] { display: none !important; }
        #aether-dev-siege-tools button, #aether-dev-siege-tools select { box-sizing: border-box; width: 100%; border: 1px solid rgba(90,190,255,.6); border-radius: 6px; background: rgba(5,14,27,.94); color: #e8f6ff; padding: 8px 10px; font-weight: 700; cursor: pointer; }
        #aether-dev-siege-tools [data-toggle] { display: flex; justify-content: space-between; letter-spacing: 1px; }
        #aether-dev-siege-tools [data-panel] { margin-top: 5px; padding: 10px; border: 1px solid rgba(90,190,255,.5); border-radius: 7px; background: rgba(5,14,27,.94); box-shadow: 0 5px 22px rgba(0,0,0,.45); }
        #aether-dev-siege-tools strong { display: block; margin-bottom: 8px; color: #8edcff; }
        #aether-dev-siege-tools select { margin-bottom: 7px; }
        #aether-dev-siege-tools [data-spawn] { background: rgba(0,115,170,.55); }
        #aether-dev-siege-tools [data-status] { min-height: 15px; margin-top: 7px; color: #a9c0d1; font-size: 11px; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(root);

    const toggle = root.querySelector("[data-toggle]");
    const panel = root.querySelector("[data-panel]");
    const status = root.querySelector("[data-status]");
    const updateVisibility = () => {
        const server = global.servers?.find(item => item.id === location.hash.slice(1));
        const mode = `${server?.gameMode || global.serverStats?.serverGamemodeName || ""} ${server?.id || ""}`;
        const inGame = global.gameLoading || global.gameConnecting || global.gameStart;
        root.hidden = !(global.developerModeAuthorized === true && inGame && /siege|fortress|citadel/i.test(mode));
    };

    toggle.addEventListener("click", event => {
        event.stopPropagation();
        const expanded = panel.hidden;
        panel.hidden = !expanded;
        toggle.setAttribute("aria-expanded", String(expanded));
        toggle.querySelector("[data-chevron]").textContent = expanded ? "−" : "+";
    });
    root.querySelector("[data-spawn]").addEventListener("click", event => {
        event.stopPropagation();
        if (!global.socket?.open) {
            status.textContent = "Connect to a game first.";
            return;
        }
        status.textContent = "Requesting wave…";
        global.socket.talk("SW", root.querySelector("[data-wave]").value);
    });
    window.addEventListener("aether-dev-siege-response", event => {
        status.textContent = event.detail?.message || "Wave request finished.";
        status.style.color = event.detail?.status === "ok" ? "#88ffc2" : "#ff9c9c";
    });
    window.addEventListener("hashchange", updateVisibility);
    setInterval(updateVisibility, 500);
    updateVisibility();
}
