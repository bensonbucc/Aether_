export function initDevTools(global) {
    if (document.getElementById("aether-dev-tools")) return;

    const root = document.createElement("div");
    root.id = "aether-dev-tools";
    root.hidden = true;
    root.innerHTML = `
        <button type="button" data-launcher aria-expanded="false">DEV TOOLS <span>+</span></button>
        <section data-panel hidden aria-label="Developer panel">
            <header><strong>DEV PANEL</strong><span>AETHER CONTROL</span></header>
            <div class="dev-section"><b>AI COMMANDS <small>(THIS MODE)</small></b>
                <div class="dev-grid"><button data-command="follow">GATHER TO ME</button><button data-command="huntAll">HUNT ALL PLAYERS</button><button data-command="normal">NORMAL AI</button><button data-refresh>PLAYER LIST / HUNT</button></div>
                <label>Spawn AI <input data-count type="number" min="1" max="10" value="1"><select data-ai-tank aria-label="AI tank class"><option value="basic">Loading tank list…</option></select></label><button data-spawn-ai>SPAWN AI</button>
                <div data-players class="dev-players"><i>Press refresh to list players.</i></div>
            </div>
            <div class="dev-section"><b>AI MESSAGES</b><input data-message maxlength="120" placeholder="Message for AI to say"><div class="dev-grid"><button data-say>AI SAY IN THIS MODE</button><button data-say-all>AI SAY IN ALL MODES</button></div></div>
            <div class="dev-section"><b>SPAWNERS</b>
                <label>Tank class <select data-tank aria-label="Tank class"><option value="basic">Loading tank list…</option></select></label><button data-spawn-tank>SPAWN TANK</button><div data-tank-status role="status"></div>
                <button data-duplicate>MAKE A DUPLICATE</button><div data-duplicate-status role="status">Copies your current tank and build.</div>
                <select data-shape aria-label="Rare shape"><option value="cube">Cube</option><option value="tetrahedron">Tetrahedron</option><option value="octahedron">Octahedron</option><option value="dodecahedron">Dodecahedron</option><option value="icosahedron">Icosahedron</option><option value="tesseract">Tesseract — 4D</option><option value="penteract">Penteract — 5D</option><option value="egg">Egg</option><option value="square">Square</option><option value="triangle">Triangle</option><option value="pentagon">Pentagon</option><option value="betaPentagon">Beta Pentagon</option><option value="alphaPentagon">Alpha Pentagon</option></select><button data-spawn-shape>SPAWN SHAPE</button><div data-shape-status role="status"></div>
            </div>
            <footer><span data-command-status>Esc closes this panel</span><button data-close>DISMISS</button></footer>
        </section>`;
    const style = document.createElement("style");
    style.textContent = `
      #aether-dev-tools[hidden], #aether-dev-tools [hidden] { display:none!important }
      #aether-dev-tools { position:fixed; z-index:2147483000; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; color:#f1eaff; font:12px Arial,sans-serif }
      #aether-dev-tools [data-launcher] { position:fixed; top:10px; left:10px; z-index:2; pointer-events:auto; min-height:34px; border:1px solid #9c5cff; border-radius:7px; padding:8px 11px; color:#f1eaff; background:rgba(22,13,40,.96); font-weight:700; letter-spacing:1px; cursor:pointer; box-shadow:0 0 14px #7838bd55 }
      #aether-dev-tools [data-panel] { pointer-events:auto; position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); width:min(460px,92vw); max-height:82vh; overflow:auto; box-sizing:border-box; padding:14px; border:1px solid #9c5cff; border-radius:12px; background:linear-gradient(145deg,rgba(22,13,40,.98),rgba(8,9,20,.98)); box-shadow:0 0 24px #7838bd66,0 18px 60px #000b }
      #aether-dev-tools header,#aether-dev-tools footer { display:flex; align-items:center; justify-content:space-between; gap:8px }
      #aether-dev-tools header { padding:2px 0 12px; border-bottom:1px solid #583a76; cursor:grab; touch-action:none; user-select:none }
      #aether-dev-tools header:active { cursor:grabbing }
      #aether-dev-tools header strong { color:#d8b5ff; font-size:18px; letter-spacing:3px }
      #aether-dev-tools header span,#aether-dev-tools small { color:#a88ac7; letter-spacing:1px }
      #aether-dev-tools .dev-section { padding:12px 0; border-bottom:1px solid #392747 }
      #aether-dev-tools .dev-section>b { display:block; margin-bottom:9px; color:#cba5ff; letter-spacing:1px }
      #aether-dev-tools button,#aether-dev-tools input,#aether-dev-tools select { box-sizing:border-box; min-height:32px; border:1px solid #67438a; border-radius:6px; background:#171222; color:#f1eaff; padding:7px 9px; font:inherit }
      #aether-dev-tools button { cursor:pointer; font-weight:700; background:linear-gradient(#302044,#1b1427) }
      #aether-dev-tools button:hover { border-color:#bd8eff; background:#392552 }
      #aether-dev-tools input { min-width:0 }
      #aether-dev-tools label { display:flex; align-items:center; gap:7px; margin:8px 0 }
      #aether-dev-tools label input[data-count] { width:60px }
      #aether-dev-tools label input[data-ai-tank] { flex:1 }
      #aether-dev-tools [data-tank],#aether-dev-tools [data-message],#aether-dev-tools select { width:100%; margin:6px 0 }
      #aether-dev-tools .dev-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px }
      #aether-dev-tools [data-players] { max-height:160px; overflow:auto; margin-top:9px }
      #aether-dev-tools [data-ai-tank] { flex:1; max-width:240px }
      #aether-dev-tools .dev-player { display:grid; grid-template-columns:minmax(0,1fr) auto auto auto; gap:4px; align-items:center; padding:5px 0; border-top:1px solid #30243d }
      #aether-dev-tools .dev-player span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
      #aether-dev-tools .dev-player button { min-height:27px; padding:4px 6px; font-size:10px }
      #aether-dev-tools [role=status] { margin:5px 0; color:#b9a9c9 }
      #aether-dev-tools footer { padding-top:10px; color:#9e8eb0 }
    `;
    document.head.appendChild(style);
    document.body.appendChild(root);
    const panel = root.querySelector("[data-panel]");
    const panelHeader = panel.querySelector("header");
    const launcher = root.querySelector("[data-launcher]");
    const commandStatus = root.querySelector("[data-command-status]");
    const setStatus = (message, status) => { commandStatus.textContent = message || "Command finished."; commandStatus.style.color = status === "error" ? "#ff9c9c" : status === "ok" ? "#88ffc2" : "#b9a9c9"; };
    const canUse = () => global.developerModeAuthorized === true && !!(global.gameLoading || global.gameConnecting || global.gameStart) && !!global.socket?.open;
    const send = data => { if (!canUse()) return setStatus("Connect to a game with developer permissions first.", "error"); global.socket.talk("DA", JSON.stringify(data)); };
    const updateVisibility = () => { root.hidden = !(global.developerModeAuthorized === true && (global.gameLoading || global.gameConnecting || global.gameStart)); if (root.hidden) { panel.hidden = true; launcher.setAttribute("aria-expanded", "false"); } };
    try {
        const savedPosition = JSON.parse(localStorage.getItem("aether-dev-panel-position") || "null");
        if (Number.isFinite(savedPosition?.left) && Number.isFinite(savedPosition?.top)) {
            panel.style.left = `${savedPosition.left}px`;
            panel.style.top = `${savedPosition.top}px`;
            panel.style.transform = "none";
        }
    } catch {}
    panelHeader.addEventListener("pointerdown", event => {
        if (event.button !== 0 || event.target.closest("button")) return;
        const rect = panel.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.top}px`;
        panel.style.transform = "none";
        panelHeader.setPointerCapture(event.pointerId);
        const move = moveEvent => {
            const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
            const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight);
            const left = Math.max(0, Math.min(maxLeft, moveEvent.clientX - offsetX));
            const top = Math.max(0, Math.min(maxTop, moveEvent.clientY - offsetY));
            panel.style.left = `${left}px`;
            panel.style.top = `${top}px`;
        };
        const finish = () => {
            panelHeader.removeEventListener("pointermove", move);
            panelHeader.removeEventListener("pointerup", finish);
            panelHeader.removeEventListener("pointercancel", finish);
            try { localStorage.setItem("aether-dev-panel-position", JSON.stringify({ left: panel.offsetLeft, top: panel.offsetTop })); } catch {}
        };
        panelHeader.addEventListener("pointermove", move);
        panelHeader.addEventListener("pointerup", finish, { once:true });
        panelHeader.addEventListener("pointercancel", finish, { once:true });
        event.preventDefault();
    });
    const requestList = () => send({ action:"list" });
    const setPanelOpen = open => { panel.hidden = !open; launcher.setAttribute("aria-expanded", String(open)); launcher.querySelector("span").textContent = open ? "−" : "+"; if (open) requestList(); };
    const playerList = root.querySelector("[data-players]");
    const buildPlayerList = players => {
        playerList.replaceChildren();
        if (!players?.length) { playerList.innerHTML = "<i>No players in this mode.</i>"; return; }
        for (const player of players) {
            const row = document.createElement("div"); row.className = "dev-player";
            const name = document.createElement("span"); name.textContent = player.name || "Unnamed";
            const hunt = document.createElement("button"); hunt.textContent = "HUNT"; hunt.title = "Send all normal AI in this mode after this player"; hunt.addEventListener("click", () => send({ action:"hunt", targetId:player.id }));
            const ally = document.createElement("button"); ally.textContent = "ALLY"; ally.addEventListener("click", () => send({ action:"team", targetId:player.id }));
            const undo = document.createElement("button"); undo.textContent = "UNDO"; undo.title = "Restore their previous team"; undo.addEventListener("click", () => send({ action:"unteam", targetId:player.id }));
            row.append(name,hunt,ally,undo); playerList.append(row);
        }
    };
    const buildTankLists = tanks => {
        if (!Array.isArray(tanks) || !tanks.length) return;
        for (const selector of [root.querySelector("[data-ai-tank]"), root.querySelector("[data-tank]")]) {
            const previous = selector.value;
            selector.replaceChildren();
            for (const tank of tanks) { const option = document.createElement("option"); option.value = tank.name; option.textContent = tank.label; selector.append(option); }
            if (tanks.some(tank => tank.name === previous)) selector.value = previous;
            else if (tanks.some(tank => tank.name === "basic")) selector.value = "basic";
        }
    };
    window.addEventListener("keydown", event => {
        if (event.code !== "Escape" || event.altKey || event.ctrlKey || event.metaKey || global.developerModeAuthorized !== true || !(global.gameLoading || global.gameConnecting || global.gameStart)) return;
        event.preventDefault(); event.stopImmediatePropagation();
        if (root.hidden) return;
        setPanelOpen(panel.hidden);
    }, true);
    launcher.addEventListener("click", () => setPanelOpen(panel.hidden));
    root.querySelector("[data-close]").addEventListener("click", () => setPanelOpen(false));
    root.querySelector("[data-refresh]").addEventListener("click", requestList);
    root.querySelectorAll("[data-command]").forEach(button => button.addEventListener("click", () => send({ action:button.dataset.command })));
    root.querySelector("[data-spawn-ai]").addEventListener("click", () => send({ action:"spawn", count:root.querySelector("[data-count]").value, tank:root.querySelector("[data-ai-tank]").value }));
    root.querySelector("[data-say]").addEventListener("click", () => send({ action:"say", message:root.querySelector("[data-message]").value }));
    root.querySelector("[data-say-all]").addEventListener("click", () => send({ action:"sayAll", message:root.querySelector("[data-message]").value }));
    root.querySelector("[data-spawn-tank]").addEventListener("click", () => { if (!canUse()) return setStatus("Developer permissions required.","error"); global.socket.talk("DT",root.querySelector("[data-tank]").value.trim()); });
    root.querySelector("[data-duplicate]").addEventListener("click", () => { if (!canUse()) return setStatus("Developer permissions required.","error"); global.socket.talk("DC"); });
    root.querySelector("[data-spawn-shape]").addEventListener("click", () => { if (!canUse()) return setStatus("Developer permissions required.","error"); global.socket.talk("DS",root.querySelector("[data-shape]").value); });
    window.addEventListener("aether-dev-ai-response", event => { const detail = event.detail || {}; setStatus(detail.message, detail.status); if (detail.players) buildPlayerList(detail.players); if (detail.tanks) buildTankLists(detail.tanks); });
    for (const [eventName, selector] of [["aether-dev-tank-response","[data-tank-status]"],["aether-dev-duplicate-response","[data-duplicate-status]"],["aether-dev-shape-response","[data-shape-status]"]]) window.addEventListener(eventName, event => { const node = root.querySelector(selector); node.textContent = event.detail?.message || "Request finished."; node.style.color = event.detail?.status === "ok" ? "#88ffc2" : "#ff9c9c"; });
    window.addEventListener("hashchange", updateVisibility);
    setInterval(updateVisibility, 500);
    updateVisibility();
}
