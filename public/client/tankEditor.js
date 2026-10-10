const COLORS = [
    ["Grey", 0], ["Yellow", 1], ["Blue", 2], ["Green", 3], ["Red", 4], ["Purple", 5],
    ["Teal", 6], ["Lime", 7], ["Pink", 8], ["Brown", 9], ["White", 10], ["Black", 11],
    ["Gold", 12], ["Orange", 13], ["Dark Blue", 14], ["Dark Green", 15], ["Dark Red", 16],
    ["Dark Grey", 17], ["Rainbow", 18],
];
const SHAPES = ["Circle", "Square", "Cone / triangle", "Pentagon", "Hexagon", "Heptagon", "Octagon", "Nonagon", "Decagon", "Star", "Cross", "Diamond", "12-sided"];
const PROJECTILE_SHAPES = [["Trap triangle", -3], ["Boomerang pentagon", -5], ...SHAPES.map((name, shape) => [name, shape])];
const PROJECTILES = [
    ["Bullet", "bullet"], ["Missile", "missile"], ["Launcher missile", "launcherMissile"],
    ["Trap", "trap"], ["Drone", "drone"], ["Swarm", "swarm"], ["Minion", "minion"],
    ["Hypermissile", "hypermissile"], ["Spin missile", "spinmissile"],
    ["Sunchip", "sunchip"], ["Boomerang", "boomerang"], ["Hive", "hive"],
];
const PROJECTILE_DEFAULTS = {
    bullet: { HEALTH: 0.165, DAMAGE: 6, SPEED: 3.75, ACCELERATION: 0, RANGE: 90, RESIST: 0, DENSITY: 1.25, PUSHABILITY: 0.3, PENETRATION: 1, KNOCKBACK: 1 },
    missile: { HEALTH: 0.165, DAMAGE: 6, SPEED: 3.75, ACCELERATION: 0, RANGE: 120, RESIST: 0, DENSITY: 1.25, PUSHABILITY: 0.3, PENETRATION: 1, KNOCKBACK: 1 },
    launcherMissile: { HEALTH: 0.165, DAMAGE: 6, SPEED: 3.75, ACCELERATION: 0, RANGE: 120, RESIST: 0, DENSITY: 1.25, PUSHABILITY: 0.3, PENETRATION: 1, KNOCKBACK: 1 },
    hypermissile: { HEALTH: 0.165, DAMAGE: 6, SPEED: 3.75, ACCELERATION: 0, RANGE: 120, RESIST: 0, DENSITY: 1.25, PUSHABILITY: 0.3, PENETRATION: 1, KNOCKBACK: 1 },
    spinmissile: { HEALTH: 0.165, DAMAGE: 6, SPEED: 3.75, ACCELERATION: 0, RANGE: 120, RESIST: 0, DENSITY: 1.25, PUSHABILITY: 0.3, PENETRATION: 1, KNOCKBACK: 1 },
    trap: { HEALTH: 0.5, DAMAGE: 3, SPEED: 0, ACCELERATION: 0, RANGE: 450, RESIST: 2.5, DENSITY: 2.5, PUSHABILITY: 1, PENETRATION: 1, KNOCKBACK: 1 },
    boomerang: { HEALTH: 0.5, DAMAGE: 3, SPEED: 1.25, ACCELERATION: 0, RANGE: 120, RESIST: 2.5, DENSITY: 2.5, PUSHABILITY: 1, PENETRATION: 1, KNOCKBACK: 1 },
    drone: { HEALTH: 0.3, DAMAGE: 3.375, SPEED: 3.8, ACCELERATION: 0.085, RANGE: 200, RESIST: 1.5, DENSITY: 0.03, PUSHABILITY: 0.6, PENETRATION: 1.2, KNOCKBACK: 1 },
    sunchip: { HEALTH: 0.3, DAMAGE: 3.375, SPEED: 3.8, ACCELERATION: 0.085, RANGE: 200, RESIST: 1.5, DENSITY: 0.03, PUSHABILITY: 0.6, PENETRATION: 1.2, KNOCKBACK: 1 },
    hive: { HEALTH: 0.165, DAMAGE: 6, SPEED: 3.75, ACCELERATION: 0, RANGE: 90, RESIST: 0, DENSITY: 1.25, PUSHABILITY: 0.3, PENETRATION: 1, KNOCKBACK: 1 },
    swarm: { HEALTH: 0.175, DAMAGE: 2.25, SPEED: 4.5, ACCELERATION: 3, RANGE: 225, RESIST: 1.6, DENSITY: 12, PUSHABILITY: 0.6, PENETRATION: 1.5, KNOCKBACK: 1 },
    minion: { HEALTH: 5, DAMAGE: 1.2, SPEED: 1.8, ACCELERATION: 1, RANGE: 90, RESIST: 1, DENSITY: 0.4, PUSHABILITY: 1, PENETRATION: 1, KNOCKBACK: 1 },
};
const PROJECTILE_AI_DEFAULTS = { drone: { BLIND: true }, sunchip: { BLIND: true }, minion: { BLIND: true }, hive: { NO_LEAD: true } };
const PROJECTILE_SHAPE_DEFAULTS = { trap: -3, boomerang: -5, drone: 3, swarm: 3, sunchip: 4 };
const BARREL_PROFILES = [["Standard", "1"], ["Cannon taper", "0.55"], ["Needle", "0.08"], ["Flared muzzle", "-0.55"]];
const MAX_WEAPONS_PER_TANK = 32;
const MAX_TURRETS_PER_TANK = 6;
const MAX_GUNS_PER_TURRET = 8;
let editorMounted = false;

const styleText = `
#aetherTankEditor{position:fixed;z-index:1000000;inset:0;display:flex;flex-direction:column;background:radial-gradient(ellipse at 52% 42%,#15243a 0,#0b111c 56%,#080b12 100%);color:#edf4ff;font:13px/1.4 Arial,sans-serif}
#aetherTankEditor *{box-sizing:border-box}#aetherTankEditor button,#aetherTankEditor input,#aetherTankEditor select,#aetherTankEditor textarea{font:inherit}#aetherTankEditor header{height:58px;flex:0 0 58px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;background:#101722;border-bottom:1px solid #29394d;font-weight:bold;letter-spacing:.04em}#aetherTankEditor header span:before{content:"◆";color:#72c7ff;margin-right:10px}#aetherTankEditor header button{cursor:pointer;background:#25354a;color:#fff;border:1px solid #3a4f6a;border-radius:7px;padding:8px 14px}#aetherTankEditorContent{flex:1;min-height:0;overflow:hidden;padding:14px;display:grid;grid-template-columns:minmax(250px,310px) minmax(360px,1fr) minmax(310px,390px);gap:14px}#aetherTankEditor .te-rail,#aetherTankEditor .te-inspector{min-height:0;overflow:auto;scrollbar-color:#38506a #101722;scrollbar-width:thin}#aetherTankEditor .te-stage{min-width:0;min-height:0;display:flex;flex-direction:column;align-items:stretch;border:1px solid #31445c;border-radius:16px;background:linear-gradient(145deg,#15243a,#0c1421 70%);box-shadow:0 20px 60px #0006;overflow:hidden}#aetherTankEditor .te-stage-heading{padding:20px 22px 4px;color:#a9bdd5;text-transform:uppercase;letter-spacing:.16em;font-size:11px}#aetherTankEditor .te-preview-title{padding:2px 22px 0;font-size:clamp(20px,2vw,30px);font-weight:700}#aetherTankEditor .te-preview-subtitle{padding:3px 22px;color:#8399b4}#aetherTankEditor .te-preview-wrap{position:relative;flex:1;min-height:240px;margin:14px;border:1px solid #253a53;border-radius:12px;overflow:hidden;background-color:#0c1726;background-image:radial-gradient(#39506d7a 1px,transparent 1px);background-size:24px 24px}#aetherTankEditor #tePreview{width:100%;height:100%;display:block}#aetherTankEditor .te-preview-hint{position:absolute;left:14px;bottom:12px;color:#8fa6c2;font-size:11px;pointer-events:none}#aetherTankEditor .te-preview-actions{display:flex;align-items:center;gap:8px;padding:0 14px 14px}#aetherTankEditor .te-preview-actions button{border:1px solid #3a5779;border-radius:8px;padding:10px 15px;background:#1a2b42;color:#eaf5ff;cursor:pointer}#aetherTankEditor .te-preview-actions .te-play{background:linear-gradient(135deg,#36a3ff,#526bff);border:0;font-weight:bold;box-shadow:0 7px 20px #316fff55}#aetherTankEditor .te-preview-actions .te-fire.active{background:#8e3349}#aetherTankEditor .te-inspector fieldset,#aetherTankEditor .te-rail fieldset{background:#111a27;border:1px solid #293a4f;border-radius:10px;margin:0 0 10px;padding:11px}#aetherTankEditor label{display:flex;flex-direction:column;gap:4px;margin:7px 0;color:#bed0e8;font-size:12px}#aetherTankEditor input,#aetherTankEditor select,#aetherTankEditor textarea{width:100%;min-height:32px;padding:5px 7px;background:#090e16;color:#fff;border:1px solid #394d65;border-radius:6px}#aetherTankEditor .te-range-field{display:grid;grid-template-columns:1fr auto;align-items:center}#aetherTankEditor .te-range-field output{color:#90c4ff;font-weight:bold}#aetherTankEditor .te-range-field input{grid-column:1/-1;min-height:20px;padding:0;accent-color:#69b7ff}#aetherTankEditor .te-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 8px}#aetherTankEditor legend{color:#90c4ff;padding:0 5px;font-weight:bold}#aetherTankEditor .te-actions{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}#aetherTankEditor .te-actions button{flex:1 1 100px;border:0;border-radius:6px;padding:8px;background:#2866a8;color:white;cursor:pointer}#aetherTankEditor .te-actions button.secondary{background:#39495f}#aetherTankEditor .te-actions button.danger{background:#873c48}#aetherTankEditor #teStatus{min-height:20px;color:#9fd4ff;padding:2px 4px}#aetherTankEditor details{margin:8px 0;color:#ced7e2}#aetherTankEditor small{color:#aebbd0}#aetherTankEditor .te-owner{border-color:#9b7c3b;background:#18170f}#aetherTankEditor .te-owner pre{max-height:210px;overflow:auto;white-space:pre-wrap;word-break:break-word;background:#080c12;padding:8px;border-radius:4px}#aetherTankEditor .te-owner textarea{margin:4px 0}#aetherTankEditor .te-live-label{display:flex;flex-direction:row;align-items:center;gap:8px;white-space:nowrap}#aetherTankEditor .te-live-label input{width:auto;min-height:auto}#aetherTankEditor .te-test-actions button{flex:1 1 120px}#aetherTankRestore{position:fixed;z-index:1000001;top:12px;left:12px;display:none;border:1px solid #71a9ff;border-radius:8px;padding:9px 13px;background:#101722;color:#fff;cursor:pointer}
@media(max-width:1050px){#aetherTankEditorContent{grid-template-columns:minmax(220px,280px) minmax(300px,1fr);grid-template-rows:minmax(0,1fr) minmax(260px,.8fr);overflow:auto}#aetherTankEditor .te-inspector{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:10px}#aetherTankEditor .te-inspector>*{min-width:0}}
@media(max-width:700px){#aetherTankEditor header{height:50px;flex-basis:50px;padding:0 12px}#aetherTankEditorContent{overflow:auto;display:flex;flex-direction:column;padding:8px;gap:8px}#aetherTankEditor .te-rail,#aetherTankEditor .te-inspector{overflow:visible}#aetherTankEditor .te-stage{min-height:62vh;order:-1}#aetherTankEditor .te-inspector{display:block}#aetherTankEditor .te-preview-wrap{min-height:38vh}}
/* Arras-like flat palette, crisp outlines and a game-grid work surface. */
#aetherTankEditor{background:#f4f4f4;color:#242424;font:13px/1.35 Arial,sans-serif}
#aetherTankEditor header{background:#fff;color:#222;border-bottom:2px solid #555;letter-spacing:0}
#aetherTankEditor header span:before{content:"";margin:0}
#aetherTankEditor header button,#aetherTankEditor .te-preview-actions button{background:#e7e7e7;color:#222;border:2px solid #555;border-radius:3px;box-shadow:0 2px 0 #999}
#aetherTankEditorContent{background:#f0f0f0}
#aetherTankEditor .te-stage{border:2px solid #555;border-radius:3px;background:#fafafa;box-shadow:0 3px 0 #bbb}
#aetherTankEditor .te-stage-heading{color:#5b5b5b;letter-spacing:.08em}
#aetherTankEditor .te-preview-title{color:#222}
#aetherTankEditor .te-preview-subtitle{color:#666}
#aetherTankEditor .te-preview-wrap{border:2px solid #777;border-radius:2px;background-color:#f5f5f5;background-image:linear-gradient(#dedede 1px,transparent 1px),linear-gradient(90deg,#dedede 1px,transparent 1px);background-size:32px 32px}
#aetherTankEditor .te-preview-hint{color:#555;text-shadow:0 1px #fff}
#aetherTankEditor .te-rail fieldset,#aetherTankEditor .te-inspector fieldset{background:#fff;border:2px solid #777;border-radius:3px;box-shadow:0 2px 0 #bbb}
#aetherTankEditor legend{color:#333}
#aetherTankEditor label{color:#383838}
#aetherTankEditor input,#aetherTankEditor select,#aetherTankEditor textarea{background:#fff;color:#222;border:2px solid #888;border-radius:2px}
#aetherTankEditor .te-range-field output{color:#176db0}
#aetherTankEditor .te-actions button{background:#5498ce;border:2px solid #326b99;border-radius:2px;box-shadow:0 2px 0 #9aa7ae}
#aetherTankEditor .te-actions button.secondary{background:#e4e4e4;border:2px solid #888;color:#222}
#aetherTankEditor .te-actions button.danger{background:#d36d6d;border-color:#994747;color:#fff}
#aetherTankEditor #teStatus{color:#2e6593}
#aetherTankEditor details{color:#444}
#aetherTankEditor small{color:#666}
#aetherTankEditor .te-preview-actions .te-play{background:#579bd0;color:#fff;border:2px solid #326b99;border-radius:2px;box-shadow:0 3px 0 #8c9ca8}
#aetherTankEditor .te-preview-actions .te-fire.active{background:#c96969;color:#fff}
#aetherTankRestore,#aetherTankQuickPick{position:fixed;z-index:1000001;top:12px;display:none;border:2px solid #555;border-radius:3px;padding:9px 14px;background:#f7f7f7;color:#222;box-shadow:0 3px 0 #999;font:bold 14px Arial,sans-serif;cursor:pointer}
#aetherTankRestore{left:12px}#aetherTankQuickPick{right:12px}
#aetherTankPicker{position:fixed;z-index:1000002;inset:0;display:none;align-items:center;justify-content:center;padding:18px;background:#0008;font:14px Arial,sans-serif;color:#222}
#aetherTankPicker .te-picker-card{width:min(540px,100%);max-height:min(720px,90vh);display:flex;flex-direction:column;background:#f5f5f5;border:3px solid #555;box-shadow:0 5px 0 #999}
#aetherTankPicker header{display:flex;justify-content:space-between;align-items:center;padding:12px;background:#fff;border-bottom:2px solid #777;font-size:18px;font-weight:bold}
#aetherTankPicker button{padding:8px 12px;border:2px solid #777;border-radius:2px;background:#e9e9e9;color:#222;cursor:pointer;font:inherit}
#aetherTankPicker .te-picker-list{overflow:auto;padding:10px}
#aetherTankPicker .te-picker-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;padding:10px;margin:6px 0;background:#fff;border:2px solid #aaa}
#aetherTankPicker .te-picker-name{font-weight:bold}.te-picker-meta{color:#666;font-size:12px}
#aetherTankPicker .te-picker-row button{background:#589bd0;border-color:#326b99;color:#fff;font-weight:bold}
#aetherTankEditor #tePreview{cursor:crosshair}
#aetherTankEditor .te-gun-controls[hidden]{display:none}
#aetherTankEditor .te-gun-card-actions{display:flex;gap:6px;margin:3px 0 7px}
#aetherTankEditor .te-gun-card-actions button{min-width:72px;padding:5px 10px;border:2px solid #888;border-radius:2px;background:#e8e8e8;color:#222;cursor:pointer}
#aetherTankEditor .te-gun-card-actions button.te-gun-edit{background:#579bd0;border-color:#326b99;color:#fff}
#aetherTankEditor .te-inspector fieldset.te-selected{border-color:#2786c5;box-shadow:0 0 0 2px #58a5d566}
#aetherTankEditor .te-rail fieldset.te-selected{border-color:#2786c5;box-shadow:0 0 0 2px #58a5d566}
#aetherTankEditor .te-gun-controls details{margin:8px 0;padding:6px;background:#f2f2f2;border:1px solid #c8c8c8}
#aetherTankEditor .te-gun-controls summary{padding:4px;color:#333;font-weight:bold;cursor:pointer}
/* Compact high-tech workshop skin while keeping the tank chassis Aether blue. */
#aetherTankEditor{background:radial-gradient(ellipse at 50% 42%,#14243a 0,#0b1422 58%,#070d16 100%);color:#e9f4ff;font-family:Arial,sans-serif}
#aetherTankEditor header{background:linear-gradient(90deg,#0d1928,#142a40);color:#e9f4ff;border-bottom:1px solid #2d5674;box-shadow:0 3px 18px #0007}
#aetherTankEditor header span:before{content:"◆";color:#63c8ff;margin-right:10px}
#aetherTankEditor header button,#aetherTankEditor .te-preview-actions button{background:#14263a;color:#dff4ff;border:1px solid #3f779e;border-radius:6px;box-shadow:0 0 12px #3ab8ff20}
#aetherTankEditor .te-stage{border:1px solid #326184;border-radius:10px;background:linear-gradient(145deg,#101e30,#0b1421 72%);box-shadow:0 12px 44px #0008}
#aetherTankEditor .te-stage-heading{color:#65c9ff;letter-spacing:.16em}
#aetherTankEditor .te-preview-title{color:#f1f8ff}
#aetherTankEditor .te-preview-subtitle{color:#91a9c2}
#aetherTankEditor .te-preview-wrap{border:1px solid #356383;border-radius:7px;background-color:#0b1726;background-image:linear-gradient(#1c3650 1px,transparent 1px),linear-gradient(90deg,#1c3650 1px,transparent 1px);background-size:32px 32px}
#aetherTankEditor .te-preview-hint{color:#b4d8ef;text-shadow:0 1px #000}
#aetherTankEditor .te-rail fieldset,#aetherTankEditor .te-inspector fieldset{background:linear-gradient(150deg,#142236,#0f1a29);border:1px solid #31506d;border-radius:7px;box-shadow:0 4px 14px #0004}
#aetherTankEditor legend{color:#7fd2ff}
#aetherTankEditor label{color:#c6d8e9}
#aetherTankEditor input,#aetherTankEditor select,#aetherTankEditor textarea{background:#091320;color:#e9f4ff;border:1px solid #42617e;border-radius:4px}
#aetherTankEditor input:focus,#aetherTankEditor select:focus,#aetherTankEditor textarea:focus{outline:2px solid #35baff;outline-offset:1px}
#aetherTankEditor .te-range-field output{color:#66caff}
#aetherTankEditor .te-actions button{background:linear-gradient(135deg,#126a9d,#168ec1);border:1px solid #50c9ff;border-radius:4px;box-shadow:0 0 10px #27aaff25;color:#fff}
#aetherTankEditor .te-actions button.secondary{background:#172b40;border:1px solid #55718c;color:#d9efff}
#aetherTankEditor .te-actions button:hover,#aetherTankEditor .te-preview-actions button:hover{filter:brightness(1.2);box-shadow:0 0 15px #2cbcff66}
#aetherTankEditor #teStatus{color:#71d0ff}
#aetherTankEditor details{color:#d5e9f7}
#aetherTankEditor .te-preview-actions .te-play{background:linear-gradient(135deg,#087db7,#375de1);color:#fff;border:1px solid #68d2ff;box-shadow:0 0 18px #368dff55}
#aetherTankEditor .te-gun-controls details{background:#0d1a29;border-color:#31516c}
#aetherTankEditor .te-gun-controls summary{color:#9cddff}
#aetherTankEditor .te-gun-card-actions button{background:#172c41;color:#dff4ff;border-color:#4d6d89}
#aetherTankEditor .te-gun-card-actions button.te-gun-edit{background:#126d9f;border-color:#52caff;color:#fff}
#aetherTankEditor fieldset.te-turret-gun{background:linear-gradient(135deg,#0c1927,#12253a);border:1px solid #3c7399;border-left:3px solid #27b8f5;border-radius:5px;margin:8px 0;padding:10px;box-shadow:inset 0 0 18px #158ac115}
#aetherTankEditor .te-turret-gun legend{color:#9ae2ff;text-transform:uppercase;letter-spacing:.08em;font-size:11px}
#aetherTankEditor .te-turret-gun .te-actions{margin:4px 0 0}
#aetherTankEditor .te-gun-card-actions button:hover,#aetherTankEditor .te-turret-gun button:hover{border-color:#69d4ff;box-shadow:0 0 10px #35baff42}
/* Component tree + direct canvas + focused weapon dock + stat inspector. */
#aetherTankEditorContent.te-workspace{grid-template-columns:minmax(185px,235px) minmax(360px,1fr) minmax(245px,305px);grid-template-rows:minmax(300px,1fr) minmax(225px,34vh);gap:9px;padding:9px;overflow:hidden}
#aetherTankEditor .te-rail{grid-column:1;grid-row:1/3;display:flex;flex-direction:column;gap:8px}
#aetherTankEditor .te-stage{grid-column:2;grid-row:1;min-height:0}
#aetherTankEditor .te-inspector{grid-column:3;grid-row:1/3}
#aetherTankEditor .te-build-dock{grid-column:2;grid-row:2;min-height:0;overflow:auto;background:linear-gradient(145deg,#101e30,#0b1421);border:1px solid #326184;border-radius:8px;padding:8px}
#aetherTankEditor .te-build-tabs{display:flex;gap:6px;margin-bottom:8px}
#aetherTankEditor .te-build-tabs button,#aetherTankEditor .te-canvas-tools button{background:#14263a;color:#dff4ff;border:1px solid #3f779e;border-radius:4px;padding:6px 10px;cursor:pointer}
#aetherTankEditor .te-build-tabs button.active{background:#126d9f;border-color:#52caff;color:#fff}
#aetherTankEditor .te-structure-list{display:flex;flex-direction:column;gap:4px;max-height:36vh;overflow:auto}
#aetherTankEditor .te-structure-item{width:100%;text-align:left;padding:7px 8px;background:#0b1725;color:#d9efff;border:1px solid #31516c;border-radius:4px;cursor:pointer}
#aetherTankEditor .te-structure-item:hover,#aetherTankEditor .te-structure-item.active{background:#12517c;border-color:#52caff}
#aetherTankEditor .te-structure-item.nested{padding-left:24px;color:#a9d9f2}
#aetherTankEditor .te-canvas-tools{display:flex;justify-content:flex-end;gap:6px;padding:5px 12px}
#aetherTankEditor .te-preview-wrap{touch-action:none}
#aetherTankEditor .te-stage-heading{padding-top:10px}
#aetherTankEditor .te-stage .te-preview-title{font-size:18px}
@media(max-width:1120px){#aetherTankEditorContent.te-workspace{grid-template-columns:minmax(170px,210px) minmax(320px,1fr);grid-template-rows:minmax(330px,1fr) minmax(235px,.8fr) minmax(200px,.55fr);overflow:auto}#aetherTankEditor .te-rail{grid-column:1;grid-row:1/4}#aetherTankEditor .te-stage{grid-column:2;grid-row:1}#aetherTankEditor .te-build-dock{grid-column:2;grid-row:2}#aetherTankEditor .te-inspector{grid-column:2;grid-row:3;display:grid;grid-template-columns:1fr 1fr;gap:8px}}
@media(max-width:700px){#aetherTankEditorContent.te-workspace{display:flex;flex-direction:column;overflow:auto}#aetherTankEditor .te-stage{order:0;min-height:58vh}#aetherTankEditor .te-build-dock{order:1}#aetherTankEditor .te-rail{order:2}#aetherTankEditor .te-inspector{order:3;display:block}#aetherTankEditor .te-structure-list{max-height:220px}}
`;

const numField = (label, value, key, min, max, step = "any") => {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const input = document.createElement("input");
    input.type = "number";
    input.dataset.key = key;
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    wrapper.appendChild(input);
    return wrapper;
};

const rangeField = (label, value, key, min, max, step = "0.05") => {
    const wrapper = document.createElement("label");
    wrapper.className = "te-range-field";
    const heading = document.createElement("span");
    const output = document.createElement("output");
    const input = document.createElement("input");
    heading.textContent = label;
    input.type = "range";
    input.min = min;
    input.max = max;
    input.step = step;
    const numericValue = Number(value);
    input.value = Number.isFinite(numericValue) ? Math.min(max, Math.max(min, numericValue)) : min;
    input.dataset.key = key;
    output.textContent = input.value;
    input.addEventListener("input", () => output.textContent = input.value);
    wrapper.append(heading, output, input);
    return wrapper;
};

const checkField = (label, checked, key) => {
    const wrapper = document.createElement("label");
    wrapper.style.flexDirection = "row";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "8px";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked === true;
    input.dataset.key = key;
    input.style.width = "auto";
    wrapper.append(input, document.createTextNode(label));
    return wrapper;
};

const selectField = (label, data, value, key) => {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const select = document.createElement("select");
    select.dataset.key = key;
    for (const [name, id] of data) {
        const option = document.createElement("option");
        option.textContent = name;
        option.value = id;
        select.appendChild(option);
    }
    select.value = value;
    wrapper.appendChild(select);
    return wrapper;
};

const textField = (label, value, key, maxLength = 32) => {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = maxLength;
    input.dataset.key = key;
    input.value = value;
    wrapper.appendChild(input);
    return wrapper;
};

export function initTankEditor(global) {
    if (location.hash.slice(1).toLowerCase() !== "te" || editorMounted) return;
    editorMounted = true;
    const style = document.createElement("style");
    style.textContent = styleText;
    document.head.appendChild(style);
    const panel = document.createElement("section");
    panel.id = "aetherTankEditor";
    const header = document.createElement("header");
    const title = document.createElement("span");
    title.textContent = "AETHER · TANK EDITOR BETA";
    const collapse = document.createElement("button");
    collapse.type = "button";
    collapse.textContent = "Hide";
    header.append(title, collapse);
    const content = document.createElement("div");
    content.id = "aetherTankEditorContent";
    panel.append(header, content);
    panel.style.display = "none";
    let savedPanel = {};
    try { savedPanel = JSON.parse(localStorage.getItem("aetherTankEditorPanel") || "{}"); } catch {}
    const panelSizes = { compact: "340px", balanced: "430px", wide: "560px" };
    const applyPanelSettings = settings => {
        panel.style.width = `min(${panelSizes[settings.size] || panelSizes.balanced},calc(100vw - 16px))`;
        panel.style.left = settings.side === "right" ? "auto" : "8px";
        panel.style.right = settings.side === "right" ? "8px" : "auto";
        panel.style.backgroundColor = `rgba(16,20,29,${settings.opacity || 0.96})`;
    };
    const restore = document.createElement("button");
    restore.id = "aetherTankRestore";
    restore.type = "button";
    restore.textContent = "Open Tank Editor";
    const quickPickButton = document.createElement("button");
    quickPickButton.id = "aetherTankQuickPick";
    quickPickButton.type = "button";
    quickPickButton.textContent = "Tank";
    const picker = document.createElement("div");
    picker.id = "aetherTankPicker";
    picker.setAttribute("role", "dialog");
    picker.setAttribute("aria-modal", "true");
    const pickerCard = document.createElement("section");
    pickerCard.className = "te-picker-card";
    const pickerHeader = document.createElement("header");
    const pickerTitle = document.createElement("span");
    pickerTitle.textContent = "Choose a saved tank";
    const pickerClose = document.createElement("button");
    pickerClose.type = "button";
    pickerClose.textContent = "Close";
    pickerHeader.append(pickerTitle, pickerClose);
    const pickerList = document.createElement("div");
    pickerList.className = "te-picker-list";
    pickerCard.append(pickerHeader, pickerList);
    picker.appendChild(pickerCard);
    document.body.append(panel, restore, quickPickButton, picker);
    window.addEventListener("hashchange", () => {
        if (location.hash.slice(1).toLowerCase() !== "te") {
            panel.style.display = "none";
            restore.style.display = "none";
            quickPickButton.style.display = "none";
            picker.style.display = "none";
        } else if (global.gameStart) {
            panel.style.display = "flex";
            quickPickButton.style.display = "none";
        }
    });

    const status = document.createElement("div");
    status.id = "teStatus";
    const help = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Quick training manual";
    const manual = document.createElement("div");
    manual.innerHTML = "<p><b>1.</b> Build gameplay: add/remove/duplicate/reorder barrels and turrets, then configure each gun's projectile class, firing, position, projectile body, and weapon stats.</p><p><b>2.</b> The preview fire is an illustration. Choose <b>Play · Test in Arena</b> to run the generated definition through Aether's real weapon and projectile systems.</p><p><b>3.</b> Save drafts and testing versions. Open <b>Tank</b> in the arena to choose and become any of your saved designs.</p><p><b>4.</b> Developer review tools remain available only to authenticated Aether administrators. Tank data is validated by the server and cannot run custom code.</p><small>Aether supports staggered firing with per-barrel delay. Burst shot counts and alternating gun-cycle patterns are not native settings, so the editor does not pretend to implement them.</small>";
    help.append(summary, manual);
    content.appendChild(help);

    const savedSet = document.createElement("fieldset");
    const savedLegend = document.createElement("legend");
    savedLegend.textContent = "Your saved tanks";
    savedSet.appendChild(savedLegend);
    const saved = document.createElement("select");
    saved.id = "teSavedTanks";
    const emptySaved = document.createElement("option");
    emptySaved.value = "";
    emptySaved.textContent = "No saved tanks yet";
    saved.appendChild(emptySaved);
    savedSet.appendChild(saved);
    const savedActions = document.createElement("div");
    savedActions.className = "te-actions";
    const become = document.createElement("button");
    become.type = "button";
    become.textContent = "Become this tank";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.className = "danger";
    savedActions.append(become, remove);
    savedSet.appendChild(savedActions);
    content.appendChild(savedSet);

    const ownerSet = document.createElement("fieldset");
    ownerSet.className = "te-owner";
    ownerSet.style.display = "none";
    const ownerLegend = document.createElement("legend");
    ownerLegend.textContent = "AETHER BETA WORKSHOP · DEVELOPER REVIEW";
    ownerSet.appendChild(ownerLegend);
    const ownerSearch = document.createElement("input");
    ownerSearch.placeholder = "Search tank or creator";
    const ownerFilter = document.createElement("div");
    ownerFilter.className = "te-grid";
    const ownerStatus = selectField("Status", [["All statuses", ""], ...["Draft", "Testing", "Submitted", "Approved", "Rejected", "Archived"].map(value => [value, value])], "", "OWNER.STATUS").querySelector("select");
    const ownerSort = selectField("Sort by", [["Newest first", "newest"], ["Oldest first", "oldest"]], "newest", "OWNER.SORT").querySelector("select");
    const ownerCreator = document.createElement("input");
    ownerCreator.placeholder = "Filter creator";
    ownerFilter.append(ownerStatus, ownerSort, ownerCreator);
    const ownerList = document.createElement("select");
    ownerList.size = 5;
    let ownerPage = 0;
    const ownerPageControls = document.createElement("div");
    ownerPageControls.className = "te-actions";
    const previousPage = document.createElement("button");
    previousPage.type = "button";
    previousPage.textContent = "Previous 100";
    previousPage.className = "secondary";
    const nextPage = document.createElement("button");
    nextPage.type = "button";
    nextPage.textContent = "Next 100";
    nextPage.className = "secondary";
    ownerPageControls.append(previousPage, nextPage);
    const ownerVersions = document.createElement("div");
    ownerVersions.className = "te-grid";
    const versionA = document.createElement("select");
    const versionB = document.createElement("select");
    ownerVersions.append(versionA, versionB);
    const reviewNote = document.createElement("textarea");
    reviewNote.placeholder = "Developer review notes";
    const ownerActions = document.createElement("div");
    ownerActions.className = "te-actions";
    const adminId = () => ownerList.selectedOptions[0]?.value || "";
    const ownerButton = (label, action, danger = false) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.className = danger ? "danger" : "secondary";
        button.addEventListener("click", action);
        ownerActions.appendChild(button);
        return button;
    };
    ownerButton("Refresh library", () => refreshOwnerLibrary());
    ownerButton("Test selected", () => adminId() && send("adminTest", { id: adminId() }));
    ownerButton("Duplicate", () => adminId() && send("adminDuplicate", { id: adminId() }));
    ownerButton("Rename", () => { const name = prompt("New tank name:"); if (name && adminId()) send("adminRename", { id: adminId(), name }); });
    ownerButton("Delete permanently", () => { if (adminId() && confirm("Delete this beta tank and its version history?")) send("adminDelete", { id: adminId() }); }, true);
    ownerButton("Approve", () => adminId() && send("adminReview", { id: adminId(), status: "Approved", note: reviewNote.value }));
    ownerButton("Reject", () => adminId() && send("adminReview", { id: adminId(), status: "Rejected", note: reviewNote.value }), true);
    ownerButton("Archive", () => adminId() && send("adminReview", { id: adminId(), status: "Archived", note: reviewNote.value }));
    ownerButton("Restore version A", () => adminId() && send("adminRestore", { id: adminId(), version: Number(versionA.value) }));
    ownerButton("Compare A / B", () => adminId() && send("adminCompare", { id: adminId(), first: Number(versionA.value), second: Number(versionB.value) }));
    const ownerInfo = document.createElement("pre");
    ownerInfo.textContent = "Select a saved beta tank to inspect its properties and version history.";
    ownerSet.append(ownerSearch, ownerFilter, ownerList, ownerPageControls, ownerVersions, reviewNote, ownerActions, ownerInfo);
    content.appendChild(ownerSet);

    const tankSet = document.createElement("fieldset");
    const tankLegend = document.createElement("legend");
    tankLegend.textContent = "Design name";
    tankSet.appendChild(tankLegend);
    const baseGrid = document.createElement("div");
    baseGrid.className = "te-grid";
    baseGrid.append(textField("Design name", "My Aether Tank", "tankName"), textField("Description", "", "tankDescription", 500));
    const panelControls = document.createElement("div");
    panelControls.className = "te-grid";
    panelControls.append(
        selectField("Panel size", [["Compact", "compact"], ["Balanced", "balanced"], ["Wide", "wide"]], savedPanel.size || "balanced", "PANEL.SIZE"),
        selectField("Panel side", [["Left", "left"], ["Right", "right"]], savedPanel.side || "left", "PANEL.SIDE"),
    );
    const panelOptions = document.createElement("fieldset");
    const panelOptionsTitle = document.createElement("legend");
    panelOptionsTitle.textContent = "Editor panel settings";
    panelOptions.append(panelOptionsTitle, panelControls, rangeField("Panel opacity", savedPanel.opacity ?? 0.96, "PANEL.OPACITY", 0.7, 1, 0.02));
    tankSet.appendChild(baseGrid);
    content.appendChild(panelOptions);
    content.appendChild(tankSet);

    const bodySet = document.createElement("fieldset");
    const bodyLegend = document.createElement("legend");
    bodyLegend.textContent = "Tank body · shape and stat multipliers";
    bodySet.appendChild(bodyLegend);
    const bodyGrid = document.createElement("div");
    bodyGrid.className = "te-grid";
    bodyGrid.append(
        selectField("Body shape", SHAPES.map((name, shape) => [name, shape]), 0, "TANK.SHAPE"),
        rangeField("Body size", 12, "TANK.SIZE", 4, 30, 1),
    );
    const bodyStats = document.createElement("details");
    const bodyStatsSummary = document.createElement("summary");
    bodyStatsSummary.textContent = "Body stats";
    const bodyStatsGrid = document.createElement("div");
    bodyStatsGrid.className = "te-grid";
    bodyStatsGrid.append(
        rangeField("Health", 1, "BODY.HEALTH", 0.2, 5, 0.05),
        rangeField("Regeneration", 1, "BODY.REGEN", 0, 5, 0.05),
        rangeField("Body damage", 1, "BODY.DAMAGE", 0.2, 5, 0.05),
        rangeField("Shield", 0, "BODY.SHIELD", 0, 5, 0.05),
        rangeField("Penetration", 1, "BODY.PENETRATION", 0.2, 5, 0.05),
        rangeField("Density", 1, "BODY.DENSITY", 0.2, 5, 0.05),
        rangeField("Field of view", 1, "BODY.FOV", 0.6, 1.8, 0.05),
    );
    bodyStats.append(bodyStatsSummary, bodyStatsGrid);
    bodySet.appendChild(bodyGrid);
    bodySet.appendChild(bodyStats);
    content.appendChild(bodySet);

    const gunsSet = document.createElement("fieldset");
    const gunsLegend = document.createElement("legend");
    gunsLegend.textContent = "Weapons · add, arrange, and configure each gun";
    gunsSet.appendChild(gunsLegend);
    const gunsContainer = document.createElement("div");
    const gunsActions = document.createElement("div");
    gunsActions.className = "te-actions";
    const addGun = document.createElement("button");
    addGun.type = "button";
    addGun.textContent = "Add barrel";
    addGun.className = "secondary";
    const addCenterAutoGun = document.createElement("button");
    addCenterAutoGun.type = "button";
    addCenterAutoGun.textContent = "+ Center auto gun";
    addCenterAutoGun.className = "secondary";
    addCenterAutoGun.title = "Add a center-mounted gun that fires automatically";
    const quickWeaponButtons = [
        ["Missile launcher", "missile"], ["Trap launcher", "trap"], ["Drone launcher", "drone"],
        ["Swarm launcher", "swarm"], ["Minion spawner", "minion"],
    ].map(([label, projectile]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary";
        button.textContent = `+ ${label}`;
        button.title = `Add a barrel that fires ${label.toLowerCase()} projectiles`;
        button.dataset.projectile = projectile;
        return button;
    });
    gunsActions.append(addGun, addCenterAutoGun, ...quickWeaponButtons);
    gunsSet.append(gunsActions, gunsContainer);
    content.appendChild(gunsSet);

    const turretsSet = document.createElement("fieldset");
    const turretsLegend = document.createElement("legend");
    turretsLegend.textContent = "Mounted turrets · each can have multiple guns";
    turretsSet.appendChild(turretsLegend);
    const turretsContainer = document.createElement("div");
    turretsSet.appendChild(turretsContainer);
    const turretActions = document.createElement("div");
    turretActions.className = "te-actions";
    const addTurret = document.createElement("button");
    addTurret.type = "button";
    addTurret.textContent = "+ Add Turret";
    addTurret.className = "secondary";
    turretActions.appendChild(addTurret);
    turretsSet.appendChild(turretActions);
    content.appendChild(turretsSet);

    const structureSet = document.createElement("fieldset");
    const structureLegend = document.createElement("legend");
    structureLegend.textContent = "Tank Structure";
    const structureList = document.createElement("div");
    structureList.className = "te-structure-list";
    structureSet.append(structureLegend, structureList);
    const weaponDock = document.createElement("section");
    weaponDock.className = "te-build-dock";
    const weaponTabs = document.createElement("div");
    weaponTabs.className = "te-build-tabs";
    const selectWeaponTab = kind => {
        const showGuns = kind === "guns";
        gunsSet.hidden = !showGuns;
        turretsSet.hidden = showGuns;
        for (const tab of weaponTabs.children) tab.classList.toggle("active", tab.dataset.tab === kind);
    };
    for (const [label, kind] of [["Barrels / Guns", "guns"], ["Turrets", "turrets"]]) {
        const tab = document.createElement("button");
        tab.type = "button"; tab.textContent = label; tab.dataset.tab = kind;
        tab.onclick = () => selectWeaponTab(kind);
        weaponTabs.appendChild(tab);
    }
    weaponDock.append(weaponTabs, gunsSet, turretsSet);
    selectWeaponTab("guns");

    const mainActions = document.createElement("div");
    mainActions.className = "te-actions";
    const newTank = document.createElement("button");
    newTank.type = "button";
    newTank.textContent = "New Tank";
    newTank.className = "secondary";
    const apply = document.createElement("button");
    apply.type = "button";
    apply.textContent = "Apply to test";
    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Save Draft";
    const saveTesting = document.createElement("button");
    saveTesting.type = "button";
    saveTesting.textContent = "Save Testing Version";
    const submitReview = document.createElement("button");
    submitReview.type = "button";
    submitReview.textContent = "Submit for Review";
    mainActions.append(newTank, apply, save, saveTesting, submitReview);
    content.append(mainActions, status);

    const setStatus = message => { status.textContent = message; };
    const socket = () => window.__ARRAS_SOCKET__;
    const selectedTank = () => saved.selectedOptions[0]?.dataset.tankId || "";
    let ownerToken = localStorage.getItem("aetherTankEditorOwnerToken");
    if (!/^[0-9a-f-]{36}$/i.test(ownerToken || "")) {
        if (crypto.randomUUID) {
            ownerToken = crypto.randomUUID();
        } else {
            const bytes = crypto.getRandomValues(new Uint8Array(16));
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;
            ownerToken = [bytes.slice(0, 4), bytes.slice(4, 6), bytes.slice(6, 8), bytes.slice(8, 10), bytes.slice(10)]
                .map(group => Array.from(group, byte => byte.toString(16).padStart(2, "0")).join(""))
                .join("-");
        }
        localStorage.setItem("aetherTankEditorOwnerToken", ownerToken);
    }
    const send = (action, payload) => {
        const activeSocket = socket();
        if (!activeSocket?.open || !global.gameStart) {
            setStatus("Join and spawn in Tank Editor Beta first.");
            return false;
        }
        activeSocket.talk("TE", action, ownerToken, ...(payload === undefined ? [] : [typeof payload === "string" ? payload : JSON.stringify(payload)]));
        return true;
    };

    const pickerStatus = document.createElement("div");
    pickerStatus.className = "te-picker-meta";
    pickerStatus.style.padding = "0 12px 12px";
    pickerCard.appendChild(pickerStatus);
    quickPickButton.addEventListener("click", () => {
        picker.style.display = "flex";
        pickerStatus.textContent = "Loading your saved tanks…";
        send("list");
    });
    pickerClose.addEventListener("click", () => { picker.style.display = "none"; });
    picker.addEventListener("click", event => { if (event.target === picker) picker.style.display = "none"; });

    const refreshOwnerLibrary = () => send("adminList", {
        search: ownerSearch.value, status: ownerStatus.value, creator: ownerCreator.value,
        sort: ownerSort.value, offset: ownerPage * 100, limit: 100,
    });
    const refreshPrivateLibrary = () => send("list");

    const gunRows = [];
    const turretRows = [];
    let activeGunCard = null;
    const activateGunCard = (card, index, scroll = false) => {
        const closeCurrent = activeGunCard === card;
        if (closeCurrent) {
            activeGunCard = null;
            selectedPreviewGun = -1;
            card.classList.remove("te-selected");
            card.querySelector(".te-gun-controls").hidden = true;
            card.querySelector(".te-gun-edit").textContent = "Edit";
            card.querySelector(".te-gun-edit").setAttribute("aria-expanded", "false");
            refreshPreview();
            return;
        }
        activeGunCard = card;
        selectedPreviewGun = index;
        bodySet.classList.remove("te-selected");
        for (const row of gunRows) {
            const active = row === card;
            row.classList.toggle("te-selected", active);
            const controls = row.querySelector(".te-gun-controls");
            const edit = row.querySelector(".te-gun-edit");
            controls.hidden = !active;
            edit.textContent = active ? "Done" : "Edit";
            edit.setAttribute("aria-expanded", String(active));
        }
        if (scroll) card.scrollIntoView({ block: "nearest", behavior: "smooth" });
        refreshPreview();
    };
    const makeGunCard = (data = {}, index = gunRows.length) => {
        const position = data.POSITION || {};
        const properties = data.PROPERTIES || {};
        const shoot = properties.SHOOT_SETTINGS || {};
        const projectile = properties.TYPE && typeof properties.TYPE === "object" ? properties.TYPE : {};
        const projectileBody = projectile.BODY || {};
        const bodyDefaults = PROJECTILE_DEFAULTS[projectile.PARENT || "bullet"] || PROJECTILE_DEFAULTS.bullet;
        const aiDefaults = PROJECTILE_AI_DEFAULTS[projectile.PARENT] || {};
        const card = document.createElement("fieldset");
        card.dataset.disabled = data.EDITOR_DISABLED === true ? "true" : "false";
        if (card.dataset.disabled === "true") card.style.opacity = "0.55";
        const legend = document.createElement("legend");
        legend.textContent = `Barrel ${index + 1}`;
        card.appendChild(legend);
        const cardActions = document.createElement("div");
        cardActions.className = "te-gun-card-actions";
        const editBarrel = document.createElement("button");
        editBarrel.type = "button";
        editBarrel.className = "secondary te-gun-edit";
        editBarrel.textContent = "Edit";
        const removeGun = document.createElement("button");
        removeGun.type = "button";
        removeGun.className = "secondary";
        removeGun.textContent = "Remove";
        const duplicateGun = document.createElement("button");
        duplicateGun.type = "button";
        duplicateGun.className = "secondary";
        duplicateGun.textContent = "Duplicate";
        const moveGunUp = document.createElement("button");
        moveGunUp.type = "button";
        moveGunUp.className = "secondary";
        moveGunUp.textContent = "↑";
        moveGunUp.title = "Move weapon up";
        const moveGunDown = document.createElement("button");
        moveGunDown.type = "button";
        moveGunDown.className = "secondary";
        moveGunDown.textContent = "↓";
        moveGunDown.title = "Move weapon down";
        const disableGun = document.createElement("button");
        disableGun.type = "button";
        disableGun.className = "secondary te-gun-disable";
        disableGun.textContent = card.dataset.disabled === "true" ? "Enable" : "Disable";
        cardActions.append(editBarrel, duplicateGun, moveGunUp, moveGunDown, disableGun, removeGun);
        card.appendChild(cardActions);
        const grid = document.createElement("div");
        grid.className = "te-grid te-gun-controls";
        grid.hidden = true;
        const layout = document.createElement("div");
        layout.className = "te-grid";
        const values = [
            ["Barrel length", position.LENGTH ?? 18, "POSITION.LENGTH", 6, 40, 1],
            ["Barrel width", position.WIDTH ?? 8, "POSITION.WIDTH", 3, 20, 1],
            ["Barrel angle", position.ANGLE ?? index * 30, "POSITION.ANGLE", -180, 180, 5],
            ["Fire delay", position.DELAY ?? 0, "POSITION.DELAY", 0, 0.9, 0.03],
            ["Barrel X offset", position.X ?? 0, "POSITION.X", -15, 15, 1],
            ["Barrel Y offset", position.Y ?? 0, "POSITION.Y", -15, 15, 1],
            ["Fire rate · higher is faster", 1 / Number(shoot.reload || 1), "SHOOT_SETTINGS.fireRate", 0.05, 5, 0.05],
        ];
        for (const [label, value, key, min, max, step] of values) layout.appendChild(rangeField(label, value, key, min, max, step));
        const aspect = Number(position.ASPECT ?? 1);
        const closestProfile = BARREL_PROFILES.reduce((best, profile) =>
            Math.abs(Number(profile[1]) - aspect) < Math.abs(Number(best[1]) - aspect) ? profile : best
        , BARREL_PROFILES[0]);
        layout.append(
            selectField("Barrel profile", BARREL_PROFILES, closestProfile[1], "POSITION.ASPECT"),
            selectField("Firing control", [["Primary · left click", "primary"], ["Alt fire · right click", "alt"]], properties.ALT_FIRE ? "alt" : "primary", "FIRING.MODE"),
            selectField("Barrel color", COLORS, properties.COLOR ?? 2, "BARREL.COLOR"),
            selectField("Shot type", PROJECTILES, projectile.PARENT ?? "bullet", "PROJECTILE.PARENT"),
        );
        const projectileAppearance = document.createElement("details");
        const appearanceSummary = document.createElement("summary");
        appearanceSummary.textContent = "Projectile appearance";
        const appearanceGrid = document.createElement("div");
        appearanceGrid.className = "te-grid";
        appearanceGrid.append(
            rangeField("Projectile size", projectile.SIZE ?? 1, "PROJECTILE.SIZE", 0.5, 20, 0.1),
            selectField("Projectile color", COLORS, projectile.COLOR ?? 2, "PROJECTILE.COLOR"),
            selectField("Projectile shape", PROJECTILE_SHAPES, projectile.SHAPE ?? PROJECTILE_SHAPE_DEFAULTS[projectile.PARENT] ?? 0, "PROJECTILE.SHAPE"),
            selectField("Movement behavior", [["Use Aether class default", ""], ["Chase", "chase"], ["Drift", "drift"], ["Glide", "glide"], ["Motor", "motor"], ["Swarm", "swarm"], ["Follow master", "withMaster"], ["Assembler", "assembler"]], projectile.MOTION_TYPE ?? "", "PROJECTILE.MOTION_TYPE"),
            selectField("Facing behavior", [["Use Aether class default", ""], ["Loose to target", "looseToTarget"], ["Smooth to target", "smoothToTarget"], ["Follow motion", "smoothWithMotion"], ["Spin", "spin"], ["Face target", "toTarget"], ["Turn with speed", "turnWithSpeed"]], projectile.FACING_TYPE ?? "", "PROJECTILE.FACING_TYPE"),
            selectField("Collision with own type", [["Use Aether class default", ""], ["Never", "never"], ["Normal", "normal"], ["Push", "push"], ["Hard", "hard"], ["Hard with buffer", "hardWithBuffer"], ["Hard tanks only", "hardOnlyTanks"], ["Hard bosses only", "hardOnlyBosses"], ["Push team only", "pushOnlyTeam"], ["Repel", "repel"], ["Drone collision", "droneCollision"]], projectile.HITS_OWN_TYPE ?? "", "PROJECTILE.HITS_OWN_TYPE"),
            selectField("Range expiration", [["Use Aether class default", "default"], ["Expire at range", "true"], ["Persist beyond range", "false"]], typeof projectile.DIE_AT_RANGE === "boolean" ? String(projectile.DIE_AT_RANGE) : "default", "PROJECTILE.DIE_AT_RANGE"),
            checkField("Blind projectile AI", projectile.AI?.BLIND ?? aiDefaults.BLIND, "PROJECTILE.AI.BLIND"),
            checkField("Target food", projectile.AI?.FARMER ?? aiDefaults.FARMER, "PROJECTILE.AI.FARMER"),
            checkField("AI does not lead targets", projectile.AI?.NO_LEAD ?? aiDefaults.NO_LEAD, "PROJECTILE.AI.NO_LEAD"),
            checkField("Skynet AI", projectile.AI?.SKYNET ?? aiDefaults.SKYNET, "PROJECTILE.AI.SKYNET"),
        );
        projectileAppearance.append(appearanceSummary, appearanceGrid);
        const projectileSettings = document.createElement("details");
        const settingsSummary = document.createElement("summary");
        settingsSummary.textContent = projectile.PARENT === "trap" ? "Trap strength and behavior" : "Projectile strength and behavior";
        const settingsGrid = document.createElement("div");
        settingsGrid.className = "te-grid";
        const settingValues = [
            ["Body health", projectileBody.HEALTH ?? bodyDefaults.HEALTH, "PROJECTILE.BODY.HEALTH", 0.1, 20, 0.005],
            ["Body damage", projectileBody.DAMAGE ?? bodyDefaults.DAMAGE, "PROJECTILE.BODY.DAMAGE", 0.1, 20, 0.1],
            ["Travel speed", projectileBody.SPEED ?? bodyDefaults.SPEED, "PROJECTILE.BODY.SPEED", 0, 10, 0.1],
            ["Acceleration", projectileBody.ACCELERATION ?? bodyDefaults.ACCELERATION, "PROJECTILE.BODY.ACCELERATION", 0, 10, 0.1],
            ["Lifetime / travel range", projectileBody.RANGE ?? bodyDefaults.RANGE, "PROJECTILE.BODY.RANGE", 1, 1000, 1],
            ["Resistance", projectileBody.RESIST ?? bodyDefaults.RESIST, "PROJECTILE.BODY.RESIST", 0, 20, 0.1],
            ["Density", projectileBody.DENSITY ?? bodyDefaults.DENSITY, "PROJECTILE.BODY.DENSITY", 0.01, 20, 0.01],
            ["Pushability", projectileBody.PUSHABILITY ?? bodyDefaults.PUSHABILITY, "PROJECTILE.BODY.PUSHABILITY", 0, 20, 0.1],
            ["Knockback", projectileBody.KNOCKBACK ?? bodyDefaults.KNOCKBACK, "PROJECTILE.BODY.KNOCKBACK", 0, 10, 0.1],
            ["Penetration", projectileBody.PENETRATION ?? bodyDefaults.PENETRATION, "PROJECTILE.BODY.PENETRATION", 0.1, 20, 0.1],
        ];
        const weaponValues = [
            ["Shot health", shoot.health ?? 1, "SHOOT_SETTINGS.health", 0.1, 20, 0.1],
            ["Shot damage", shoot.damage ?? 1, "SHOOT_SETTINGS.damage", 0.1, 20, 0.1],
            ["Shot penetration", shoot.pen ?? 1, "SHOOT_SETTINGS.pen", 0.2, 8, 0.1],
            ["Shot speed", shoot.speed ?? 1, "SHOOT_SETTINGS.speed", 0.1, 10, 0.1],
            ["Shot max speed", shoot.maxSpeed ?? 1, "SHOOT_SETTINGS.maxSpeed", 0.1, 10, 0.1],
            ["Lifetime / range", shoot.range ?? 1, "SHOOT_SETTINGS.range", 0.1, 10, 0.1],
            ["Shot size", shoot.size ?? 1, "SHOOT_SETTINGS.size", 0.1, 10, 0.1],
            ["Max active projectiles", properties.MAX_BULLETS ?? 8, "PROPERTIES.MAX_BULLETS", 1, 100, 1],
            ["Recoil", shoot.recoil ?? 1, "SHOOT_SETTINGS.recoil", 0, 3, 0.05],
            ["Spread", shoot.spray ?? 1, "SHOOT_SETTINGS.spray", 0.1, 3, 0.05],
            ["Density", shoot.density ?? 1, "SHOOT_SETTINGS.density", 0.1, 20, 0.1],
            ["Shudder", shoot.shudder ?? 1, "SHOOT_SETTINGS.shudder", 0, 5, 0.1],
            ["Resistance", shoot.resist ?? 1, "SHOOT_SETTINGS.resist", 0, 5, 0.1],
        ];
        for (const [label, value, key, min, max, step] of settingValues) settingsGrid.appendChild(rangeField(label, value, key, min, max, step));
        projectileSettings.append(settingsSummary, settingsGrid);
        const weaponDetails = document.createElement("details");
        const weaponSummary = document.createElement("summary");
        weaponSummary.textContent = "Firing behavior";
        const weaponGrid = document.createElement("div");
        weaponGrid.className = "te-grid";
        for (const [label, value, key, min, max, step] of weaponValues) weaponGrid.appendChild(rangeField(label, value, key, min, max, step));
        weaponGrid.append(
            selectField("Trigger", [["Manual · primary fire", "manual"], ["Automatic · always fire", "auto"]], properties.AUTOFIRE ? "auto" : "manual", "FIRING.AUTOFIRE"),
            selectField("Skill scaling behavior", [["Default", "default"], ["Thruster", "thruster"], ["Sustained range", "sustained"], ["Sustained low speed", "sustained+lowspeed"], ["Swarm", "swarm"], ["Trap", "trap"], ["Block", "block"], ["Fixed reload", "fixedReload"], ["Necromancer", "necro"], ["Drone", "drone"]], properties.STAT_CALCULATOR || "default", "FIRING.STAT_CALCULATOR"),
            rangeField("Owned children cap · 0 uses game default", properties.MAX_CHILDREN ?? 0, "PROPERTIES.MAX_CHILDREN", 0, 64, 1),
            checkField("Wait for child capacity before cycling", properties.WAIT_TO_CYCLE, "FIRING.WAIT_TO_CYCLE"),
            checkField("Delay projectile spawn until cycle", properties.DELAY_SPAWN, "FIRING.DELAY_SPAWN"),
            checkField("Fixed reload timing", properties.FIXED_RELOAD, "FIRING.FIXED_RELOAD"),
            checkField("Destroy oldest child at capacity", properties.DESTROY_OLDEST_CHILD, "FIRING.DESTROY_OLDEST_CHILD"),
            checkField("Sync projectile skills with tank", properties.SYNCS_SKILLS, "FIRING.SYNCS_SKILLS"),
            checkField("Independent projectiles", properties.INDEPENDENT_CHILDREN, "FIRING.INDEPENDENT_CHILDREN"),
            checkField("Independent projectile owner", properties.INDEPENDENT_MASTER, "FIRING.INDEPENDENT_MASTER"),
            checkField("Negative recoil", properties.NEGATIVE_RECOIL, "FIRING.NEGATIVE_RECOIL"),
            checkField("Fire when tank dies", properties.SHOOT_ON_DEATH, "FIRING.SHOOT_ON_DEATH"),
        );
        weaponDetails.append(weaponSummary, weaponGrid);
        const firingNote = document.createElement("small");
        firingNote.textContent = "Aether fires one projectile per gun cycle. Separate barrels can fire together or be staggered with Fire delay; burst counts and alternating gun cycles are not native weapon settings.";
        weaponDetails.appendChild(firingNote);
        grid.append(layout, projectileAppearance, projectileSettings, weaponDetails);
        card.appendChild(grid);
        editBarrel.addEventListener("click", () => {
            const index = gunRows.indexOf(card);
            activateGunCard(card, index, true);
        });
        removeGun.onclick = () => {
            gunRows.splice(gunRows.indexOf(card), 1);
            if (activeGunCard === card) activeGunCard = null;
            card.remove();
            renumberGuns();
            selectedPreviewGun = -1;
            refreshPreview();
            queueLiveApply();
        };
        duplicateGun.onclick = () => {
            if (currentWeaponCount() >= MAX_WEAPONS_PER_TANK) return setStatus(`This design has reached the ${MAX_WEAPONS_PER_TANK}-weapon server limit.`);
            const copy = collectGunDefinition(card, gunRows.indexOf(card));
            copy.EDITOR_DISABLED = false;
            makeGunCard(copy);
            const added = gunRows[gunRows.length - 1];
            activateGunCard(added, gunRows.length - 1, true);
            setStatus("Weapon duplicated with its current gameplay settings.");
            queueLiveApply();
        };
        const moveGun = direction => {
            const index = gunRows.indexOf(card), next = index + direction;
            if (next < 0 || next >= gunRows.length) return;
            [gunRows[index], gunRows[next]] = [gunRows[next], gunRows[index]];
            const reference = direction < 0 ? gunRows[index + 1] : card;
            gunsContainer.insertBefore(direction < 0 ? card : gunRows[index], reference);
            renumberGuns();
            refreshPreview();
            queueLiveApply();
        };
        moveGunUp.onclick = () => moveGun(-1);
        moveGunDown.onclick = () => moveGun(1);
        disableGun.onclick = () => {
            card.dataset.disabled = card.dataset.disabled === "true" ? "false" : "true";
            card.style.opacity = card.dataset.disabled === "true" ? "0.55" : "";
            disableGun.textContent = card.dataset.disabled === "true" ? "Enable" : "Disable";
            renumberGuns();
            refreshPreview();
            queueLiveApply();
        };
        const typeControl = layout.querySelector('[data-key="PROJECTILE.PARENT"]');
        typeControl.addEventListener("change", () => {
            settingsSummary.textContent = typeControl.value === "trap" ? "Trap strength and behavior" : "Projectile strength and behavior";
            const defaults = PROJECTILE_DEFAULTS[typeControl.value] || PROJECTILE_DEFAULTS.bullet;
            const fields = {
                HEALTH: "PROJECTILE.BODY.HEALTH", DAMAGE: "PROJECTILE.BODY.DAMAGE", SPEED: "PROJECTILE.BODY.SPEED",
                ACCELERATION: "PROJECTILE.BODY.ACCELERATION", RANGE: "PROJECTILE.BODY.RANGE", RESIST: "PROJECTILE.BODY.RESIST",
                DENSITY: "PROJECTILE.BODY.DENSITY", PUSHABILITY: "PROJECTILE.BODY.PUSHABILITY", KNOCKBACK: "PROJECTILE.BODY.KNOCKBACK",
                PENETRATION: "PROJECTILE.BODY.PENETRATION",
            };
            for (const [name, key] of Object.entries(fields)) {
                const input = card.querySelector(`[data-key="${key}"]`);
                input.value = Math.max(Number(input.min), Math.min(Number(input.max), defaults[name]));
                input.parentElement.querySelector("output").textContent = input.value;
            }
            const ai = PROJECTILE_AI_DEFAULTS[typeControl.value] || {};
            for (const [field, key] of [["BLIND", "PROJECTILE.AI.BLIND"], ["FARMER", "PROJECTILE.AI.FARMER"], ["NO_LEAD", "PROJECTILE.AI.NO_LEAD"], ["SKYNET", "PROJECTILE.AI.SKYNET"]]) {
                card.querySelector(`[data-key="${key}"]`).checked = ai[field] === true;
            }
            const shape = card.querySelector('[data-key="PROJECTILE.SHAPE"]');
            const defaultShape = PROJECTILE_SHAPE_DEFAULTS[typeControl.value] ?? 0;
            shape.value = String(defaultShape);
            renumberGuns();
            refreshPreview();
        });
        gunRows.push(card);
        gunsContainer.appendChild(card);
        renumberGuns();
    };

    const collectGunDefinition = (card, index) => {
        const n = key => Number(card.querySelector(`[data-key="${key}"]`).value);
        const s = key => card.querySelector(`[data-key="${key}"]`).value;
        const projectileType = s("PROJECTILE.PARENT");
        const rangeMode = s("PROJECTILE.DIE_AT_RANGE");
        const projectile = {
            PARENT: projectileType,
            LABEL: projectileType,
            COLOR: Number(s("PROJECTILE.COLOR")),
            SHAPE: Number(s("PROJECTILE.SHAPE")),
            SIZE: n("PROJECTILE.SIZE"),
            BODY: {
                HEALTH: n("PROJECTILE.BODY.HEALTH"), DAMAGE: n("PROJECTILE.BODY.DAMAGE"),
                SPEED: n("PROJECTILE.BODY.SPEED"), ACCELERATION: n("PROJECTILE.BODY.ACCELERATION"),
                RANGE: n("PROJECTILE.BODY.RANGE"), RESIST: n("PROJECTILE.BODY.RESIST"),
                DENSITY: n("PROJECTILE.BODY.DENSITY"), PUSHABILITY: n("PROJECTILE.BODY.PUSHABILITY"),
                PENETRATION: n("PROJECTILE.BODY.PENETRATION"), KNOCKBACK: n("PROJECTILE.BODY.KNOCKBACK"),
            },
        };
        const ai = {};
        for (const [field, key] of [["BLIND", "PROJECTILE.AI.BLIND"], ["FARMER", "PROJECTILE.AI.FARMER"], ["NO_LEAD", "PROJECTILE.AI.NO_LEAD"], ["SKYNET", "PROJECTILE.AI.SKYNET"]]) {
            ai[field] = card.querySelector(`[data-key="${key}"]`).checked;
        }
        if (Object.keys(ai).length) projectile.AI = ai;
        const motion = s("PROJECTILE.MOTION_TYPE"), facing = s("PROJECTILE.FACING_TYPE"), collision = s("PROJECTILE.HITS_OWN_TYPE");
        if (motion) projectile.MOTION_TYPE = motion;
        if (facing) projectile.FACING_TYPE = facing;
        if (collision) projectile.HITS_OWN_TYPE = collision;
        if (rangeMode !== "default") projectile.DIE_AT_RANGE = rangeMode === "true";
        return {
            EDITOR_DISABLED: card.dataset.disabled === "true",
            POSITION: {
                LENGTH: n("POSITION.LENGTH"), WIDTH: n("POSITION.WIDTH"), ANGLE: n("POSITION.ANGLE"),
                DELAY: n("POSITION.DELAY"), ASPECT: n("POSITION.ASPECT"), X: n("POSITION.X"), Y: n("POSITION.Y"),
            },
            PROPERTIES: {
                AUTOFIRE: s("FIRING.AUTOFIRE") === "auto",
                ALT_FIRE: s("FIRING.MODE") === "alt",
                FIXED_RELOAD: card.querySelector('[data-key="FIRING.FIXED_RELOAD"]').checked,
                SHOOT_ON_DEATH: card.querySelector('[data-key="FIRING.SHOOT_ON_DEATH"]').checked,
                WAIT_TO_CYCLE: card.querySelector('[data-key="FIRING.WAIT_TO_CYCLE"]').checked,
                DELAY_SPAWN: card.querySelector('[data-key="FIRING.DELAY_SPAWN"]').checked,
                DESTROY_OLDEST_CHILD: card.querySelector('[data-key="FIRING.DESTROY_OLDEST_CHILD"]').checked,
                SYNCS_SKILLS: card.querySelector('[data-key="FIRING.SYNCS_SKILLS"]').checked,
                INDEPENDENT_CHILDREN: card.querySelector('[data-key="FIRING.INDEPENDENT_CHILDREN"]').checked,
                INDEPENDENT_MASTER: card.querySelector('[data-key="FIRING.INDEPENDENT_MASTER"]').checked,
                NEGATIVE_RECOIL: card.querySelector('[data-key="FIRING.NEGATIVE_RECOIL"]').checked,
                STAT_CALCULATOR: s("FIRING.STAT_CALCULATOR"),
                MAX_CHILDREN: n("PROPERTIES.MAX_CHILDREN"),
                COLOR: Number(s("BARREL.COLOR")),
                MAX_BULLETS: n("PROPERTIES.MAX_BULLETS"),
                SHOOT_SETTINGS: {
                    reload: 1 / n("SHOOT_SETTINGS.fireRate"), recoil: n("SHOOT_SETTINGS.recoil"), spray: n("SHOOT_SETTINGS.spray"),
                    health: n("SHOOT_SETTINGS.health"), damage: n("SHOOT_SETTINGS.damage"), speed: n("SHOOT_SETTINGS.speed"),
                    maxSpeed: n("SHOOT_SETTINGS.maxSpeed"), range: n("SHOOT_SETTINGS.range"), density: n("SHOOT_SETTINGS.density"),
                    size: n("SHOOT_SETTINGS.size"), shudder: n("SHOOT_SETTINGS.shudder"), resist: n("SHOOT_SETTINGS.resist"), pen: n("SHOOT_SETTINGS.pen"),
                },
                TYPE: projectile,
            },
        };
    };

    const currentWeaponCount = () => gunRows.length + turretRows.reduce((count, row) => count + (row.turretGunRows?.length || 0), 0);
    const renumberGuns = () => gunRows.forEach((card, index) => {
        const parent = card.querySelector('[data-key="PROJECTILE.PARENT"]')?.value || "bullet";
        card.querySelector("legend").textContent = `${card.dataset.disabled === "true" ? "Disabled · " : ""}Barrel ${index + 1} · ${parent}`;
    });
    const addWeaponPart = (projectile, label) => {
        if (currentWeaponCount() >= MAX_WEAPONS_PER_TANK) return setStatus(`This design has reached the ${MAX_WEAPONS_PER_TANK}-weapon server limit.`);
        makeGunCard();
        const card = gunRows[gunRows.length - 1];
        const selector = card.querySelector('[data-key="PROJECTILE.PARENT"]');
        selector.value = projectile;
        selector.dispatchEvent(new Event("change", { bubbles: true }));
        activateGunCard(card, gunRows.length - 1, true);
        setStatus(`${label} added. Edit the highlighted part to customize it.`);
        queueLiveApply();
    };
    addGun.onclick = () => {
        if (currentWeaponCount() >= MAX_WEAPONS_PER_TANK) return setStatus(`This design has reached the ${MAX_WEAPONS_PER_TANK}-weapon server limit.`);
        makeGunCard();
        const card = gunRows[gunRows.length - 1];
        activateGunCard(card, gunRows.length - 1, true);
        queueLiveApply();
    };
    addCenterAutoGun.onclick = () => {
        if (currentWeaponCount() >= MAX_WEAPONS_PER_TANK) return setStatus(`This design has reached the ${MAX_WEAPONS_PER_TANK}-weapon server limit.`);
        makeGunCard();
        const card = gunRows[gunRows.length - 1];
        card.querySelector('[data-key="FIRING.AUTOFIRE"]').value = "auto";
        card.querySelector('[data-key="POSITION.X"]').value = "0";
        card.querySelector('[data-key="POSITION.Y"]').value = "0";
        activateGunCard(card, gunRows.length - 1, true);
        setStatus("Center auto-firing gun added. Edit its weapon settings to tune it.");
        queueLiveApply();
    };
    for (const button of quickWeaponButtons) button.onclick = () => addWeaponPart(button.dataset.projectile, button.textContent.slice(2));
    makeGunCard();

    const makeTurretCard = (data = {}) => {
        if (turretRows.length >= MAX_TURRETS_PER_TANK) {
            setStatus(`This design has reached the ${MAX_TURRETS_PER_TANK}-turret server limit.`);
            return null;
        }
        const card = document.createElement("fieldset");
        const legend = document.createElement("legend");
        legend.textContent = `Turret ${turretRows.length + 1}`;
        card.appendChild(legend);
        const grid = document.createElement("div");
        grid.className = "te-grid";
        const position = data.POSITION || {};
        grid.append(
            selectField("Turret shape", SHAPES.map((name, shape) => [name, shape]), data.SHAPE ?? 0, "TURRET.SHAPE"),
            selectField("Turret color", COLORS, data.COLOR ?? 2, "TURRET.COLOR"),
            rangeField("Turret size", position.SIZE ?? 10, "TURRET.SIZE", 4, 24, 1),
            rangeField("Position X", position.X ?? 0, "TURRET.X", -24, 24, 1),
            rangeField("Position Y", position.Y ?? 0, "TURRET.Y", -24, 24, 1),
            rangeField("Rotation", position.DIRECTION ?? 0, "TURRET.DIRECTION", -360, 360, 5),
            rangeField("Aim arc", position.ARC ?? 360, "TURRET.ARC", 30, 360, 5),
            rangeField("Scale", position.SCALE ?? 1, "TURRET.SCALE", 0.5, 2, 0.05),
        );
        const weaponHeading = document.createElement("legend");
        weaponHeading.textContent = "Turret weapons";
        const weaponList = document.createElement("div");
        const weaponActions = document.createElement("div");
        weaponActions.className = "te-actions";
        const addTurretGun = document.createElement("button");
        addTurretGun.type = "button";
        addTurretGun.className = "secondary";
        addTurretGun.textContent = "+ Add turret gun";
        weaponActions.appendChild(addTurretGun);
        card.turretGunRows = [];
        const appendTurretGun = (gunData = {}) => {
            if (card.turretGunRows.length >= MAX_GUNS_PER_TURRET || currentWeaponCount() >= MAX_WEAPONS_PER_TANK) {
                return setStatus(`Turrets support up to ${MAX_GUNS_PER_TURRET} guns each and ${MAX_WEAPONS_PER_TANK} total weapon barrels.`);
            }
            const row = document.createElement("fieldset");
            row.className = "te-turret-gun";
            row.dataset.disabled = gunData.EDITOR_DISABLED === true ? "true" : "false";
            if (row.dataset.disabled === "true") row.style.opacity = "0.55";
            const p = gunData.POSITION || {}, gp = gunData.PROPERTIES || {}, shot = gp.SHOOT_SETTINGS || {};
            const type = gp.TYPE || {}, body = type.BODY || {};
            const bodyDefaults = PROJECTILE_DEFAULTS[type.PARENT || "bullet"] || PROJECTILE_DEFAULTS.bullet;
            const aiDefaults = PROJECTILE_AI_DEFAULTS[type.PARENT] || {};
            const title = document.createElement("legend");
            title.textContent = `Turret gun ${card.turretGunRows.length + 1}`;
            row.appendChild(title);
            const controls = document.createElement("div");
            controls.className = "te-grid";
            controls.append(
                selectField("Projectile class", PROJECTILES, type.PARENT || "bullet", "TG.TYPE"),
                selectField("Projectile color", COLORS, type.COLOR ?? 2, "TG.PROJECTILE_COLOR"),
                selectField("Projectile shape", PROJECTILE_SHAPES, type.SHAPE ?? PROJECTILE_SHAPE_DEFAULTS[type.PARENT] ?? 0, "TG.PROJECTILE_SHAPE"),
                selectField("Barrel color", COLORS, gp.COLOR ?? 2, "TG.COLOR"),
                rangeField("Length", p.LENGTH ?? 19, "TG.LENGTH", 2, 60, 1),
                rangeField("Width", p.WIDTH ?? 7, "TG.WIDTH", 2, 30, 1),
                rangeField("Angle", p.ANGLE ?? 0, "TG.ANGLE", -360, 360, 5),
                rangeField("Offset X", p.X ?? 0, "TG.X", -30, 30, 1),
                rangeField("Offset Y", p.Y ?? 0, "TG.Y", -30, 30, 1),
                rangeField("Fire delay", p.DELAY ?? 0, "TG.DELAY", 0, 0.99, 0.03),
                rangeField("Reload", shot.reload ?? 1, "TG.RELOAD", 0.2, 20, 0.1),
                rangeField("Recoil", shot.recoil ?? 1, "TG.RECOIL", 0, 10, 0.1),
                rangeField("Damage", shot.damage ?? 1, "TG.DAMAGE", 0.1, 20, 0.1),
                rangeField("Projectile health", body.HEALTH ?? bodyDefaults.HEALTH, "TG.HEALTH", 0.1, 20, 0.005),
                rangeField("Projectile body damage", body.DAMAGE ?? bodyDefaults.DAMAGE, "TG.BODY_DAMAGE", 0.1, 20, 0.1),
                rangeField("Projectile body speed", body.SPEED ?? bodyDefaults.SPEED, "TG.SPEED", 0, 10, 0.1),
                rangeField("Launch speed multiplier", shot.speed ?? 1, "TG.SHOT_SPEED", 0.1, 10, 0.1),
                rangeField("Max speed", shot.maxSpeed ?? 1, "TG.MAX_SPEED", 0.1, 10, 0.1),
                rangeField("Body acceleration", body.ACCELERATION ?? bodyDefaults.ACCELERATION, "TG.ACCELERATION", 0, 10, 0.1),
                rangeField("Projectile lifetime / range", body.RANGE ?? bodyDefaults.RANGE, "TG.RANGE", 1, 1000, 1),
                rangeField("Projectile size", type.SIZE ?? 1, "TG.SIZE", 0.5, 20, 0.1),
                rangeField("Spread", shot.spray ?? 1, "TG.SPREAD", 0, 10, 0.1),
                rangeField("Penetration", shot.pen ?? 1, "TG.PEN", 0.1, 20, 0.1),
                rangeField("Body penetration", body.PENETRATION ?? bodyDefaults.PENETRATION, "TG.BODY_PEN", 0.1, 20, 0.1),
                rangeField("Body resistance", body.RESIST ?? bodyDefaults.RESIST, "TG.RESIST", 0, 20, 0.1),
                rangeField("Body density", body.DENSITY ?? bodyDefaults.DENSITY, "TG.DENSITY", 0.01, 20, 0.01),
                rangeField("Pushability", body.PUSHABILITY ?? bodyDefaults.PUSHABILITY, "TG.PUSHABILITY", 0, 20, 0.1),
                selectField("Movement", [["Class default", ""], ["Chase", "chase"], ["Drift", "drift"], ["Glide", "glide"], ["Motor", "motor"], ["Swarm", "swarm"], ["Follow master", "withMaster"], ["Assembler", "assembler"]], type.MOTION_TYPE || "", "TG.MOTION"),
                selectField("Facing", [["Class default", ""], ["Loose to target", "looseToTarget"], ["Smooth to target", "smoothToTarget"], ["Follow motion", "smoothWithMotion"], ["Spin", "spin"], ["Face target", "toTarget"], ["Turn with speed", "turnWithSpeed"]], type.FACING_TYPE || "", "TG.FACING"),
                selectField("Own-type collision", [["Class default", ""], ["Never", "never"], ["Normal", "normal"], ["Push", "push"], ["Hard", "hard"], ["Hard with buffer", "hardWithBuffer"], ["Hard tanks", "hardOnlyTanks"], ["Hard bosses", "hardOnlyBosses"], ["Push team", "pushOnlyTeam"], ["Repel", "repel"], ["Drone collision", "droneCollision"]], type.HITS_OWN_TYPE || "", "TG.COLLISION"),
                selectField("Skill scaling behavior", [["Default", "default"], ["Thruster", "thruster"], ["Sustained range", "sustained"], ["Sustained low speed", "sustained+lowspeed"], ["Swarm", "swarm"], ["Trap", "trap"], ["Block", "block"], ["Fixed reload", "fixedReload"], ["Necromancer", "necro"], ["Drone", "drone"]], gp.STAT_CALCULATOR || "default", "TG.STAT_CALCULATOR"),
                selectField("Range expiration", [["Class default", "default"], ["Expire at range", "true"], ["Persist past range", "false"]], typeof type.DIE_AT_RANGE === "boolean" ? String(type.DIE_AT_RANGE) : "default", "TG.DIE_AT_RANGE"),
                checkField("Blind AI", type.AI?.BLIND ?? aiDefaults.BLIND, "TG.AI_BLIND"),
                checkField("Target food", type.AI?.FARMER ?? aiDefaults.FARMER, "TG.AI_FARMER"),
                checkField("Do not lead targets", type.AI?.NO_LEAD ?? aiDefaults.NO_LEAD, "TG.AI_NO_LEAD"),
                checkField("Skynet AI", type.AI?.SKYNET ?? aiDefaults.SKYNET, "TG.AI_SKYNET"),
                rangeField("Max active projectiles", gp.MAX_BULLETS ?? 8, "TG.MAX_BULLETS", 1, 100, 1),
                rangeField("Owned children cap · 0 uses game default", gp.MAX_CHILDREN ?? 0, "TG.MAX_CHILDREN", 0, 64, 1),
                checkField("Auto fire", gp.AUTOFIRE !== false, "TG.AUTOFIRE"),
                checkField("Alt fire input", gp.ALT_FIRE === true, "TG.ALT_FIRE"),
                checkField("Fixed reload timing", gp.FIXED_RELOAD === true, "TG.FIXED_RELOAD"),
                checkField("Wait for child capacity", gp.WAIT_TO_CYCLE === true, "TG.WAIT_TO_CYCLE"),
                checkField("Delay projectile until cycle", gp.DELAY_SPAWN === true, "TG.DELAY_SPAWN"),
                checkField("Destroy oldest child at capacity", gp.DESTROY_OLDEST_CHILD === true, "TG.DESTROY_OLDEST_CHILD"),
                checkField("Sync projectile skills", gp.SYNCS_SKILLS === true, "TG.SYNCS_SKILLS"),
                checkField("Independent projectiles", gp.INDEPENDENT_CHILDREN === true, "TG.INDEPENDENT_CHILDREN"),
                checkField("Independent projectile owner", gp.INDEPENDENT_MASTER === true, "TG.INDEPENDENT_MASTER"),
                checkField("Negative recoil", gp.NEGATIVE_RECOIL === true, "TG.NEGATIVE_RECOIL"),
                checkField("Fire when tank dies", gp.SHOOT_ON_DEATH === true, "TG.SHOOT_ON_DEATH"),
            );
            controls.querySelector('[data-key="TG.TYPE"]').addEventListener("change", event => {
                const defaults = PROJECTILE_DEFAULTS[event.target.value] || PROJECTILE_DEFAULTS.bullet;
                const ai = PROJECTILE_AI_DEFAULTS[event.target.value] || {};
                const bodyFields = { HEALTH: "TG.HEALTH", DAMAGE: "TG.BODY_DAMAGE", SPEED: "TG.SPEED", ACCELERATION: "TG.ACCELERATION", RANGE: "TG.RANGE", PENETRATION: "TG.BODY_PEN", RESIST: "TG.RESIST", DENSITY: "TG.DENSITY", PUSHABILITY: "TG.PUSHABILITY" };
                for (const [field, key] of Object.entries(bodyFields)) {
                    const input = row.querySelector(`[data-key="${key}"]`);
                    input.value = Math.max(Number(input.min), Math.min(Number(input.max), defaults[field]));
                    input.parentElement.querySelector("output").textContent = input.value;
                }
                for (const [field, key] of [["BLIND", "TG.AI_BLIND"], ["FARMER", "TG.AI_FARMER"], ["NO_LEAD", "TG.AI_NO_LEAD"], ["SKYNET", "TG.AI_SKYNET"]]) row.querySelector(`[data-key="${key}"]`).checked = ai[field] === true;
                row.querySelector('[data-key="TG.PROJECTILE_SHAPE"]').value = String(PROJECTILE_SHAPE_DEFAULTS[event.target.value] ?? 0);
                for (const key of ["TG.MOTION", "TG.FACING", "TG.COLLISION"]) row.querySelector(`[data-key="${key}"]`).value = "";
            });
            const actions = document.createElement("div");
            actions.className = "te-actions";
            const duplicate = document.createElement("button");
            duplicate.type = "button";
            duplicate.className = "secondary";
            duplicate.textContent = "Duplicate gun";
            duplicate.onclick = () => {
                if (currentWeaponCount() >= MAX_WEAPONS_PER_TANK || card.turretGunRows.length >= MAX_GUNS_PER_TURRET) return setStatus("This design has reached its safe turret weapon limit.");
                appendTurretGun(collectTurretGun(row));
                queueLiveApply();
            };
            const move = direction => {
                const index = card.turretGunRows.indexOf(row), target = index + direction;
                if (target < 0 || target >= card.turretGunRows.length) return;
                [card.turretGunRows[index], card.turretGunRows[target]] = [card.turretGunRows[target], card.turretGunRows[index]];
                weaponList.insertBefore(card.turretGunRows[target], direction < 0 ? row : card.turretGunRows[index]);
                card.turretGunRows.forEach((entry, order) => entry.querySelector("legend").textContent = `Turret gun ${order + 1}`);
                queueLiveApply();
            };
            const moveUp = document.createElement("button");
            moveUp.type = "button";
            moveUp.className = "secondary";
            moveUp.textContent = "↑";
            moveUp.onclick = () => move(-1);
            const moveDown = document.createElement("button");
            moveDown.type = "button";
            moveDown.className = "secondary";
            moveDown.textContent = "↓";
            moveDown.onclick = () => move(1);
            const disable = document.createElement("button");
            disable.type = "button";
            disable.className = "secondary";
            disable.textContent = row.dataset.disabled === "true" ? "Enable" : "Disable";
            disable.onclick = () => {
                row.dataset.disabled = row.dataset.disabled === "true" ? "false" : "true";
                row.style.opacity = row.dataset.disabled === "true" ? "0.55" : "";
                disable.textContent = row.dataset.disabled === "true" ? "Enable" : "Disable";
                queueLiveApply();
            };
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "secondary";
            remove.textContent = "Remove gun";
            remove.onclick = () => {
                card.turretGunRows.splice(card.turretGunRows.indexOf(row), 1);
                row.remove();
                card.turretGunRows.forEach((entry, index) => entry.querySelector("legend").textContent = `Turret gun ${index + 1}`);
                queueLiveApply();
            };
            actions.append(duplicate, moveUp, moveDown, disable, remove);
            row.append(controls, actions);
            card.turretGunRows.push(row);
            weaponList.appendChild(row);
        };
        const collectTurretGun = row => {
            const n = key => Number(row.querySelector(`[data-key="${key}"]`).value);
            const s = key => row.querySelector(`[data-key="${key}"]`).value;
            const checked = key => row.querySelector(`[data-key="${key}"]`).checked;
            const parent = s("TG.TYPE");
            const type = { PARENT: parent, LABEL: parent, COLOR: n("TG.PROJECTILE_COLOR"), SHAPE: n("TG.PROJECTILE_SHAPE"), SIZE: n("TG.SIZE"), BODY: { HEALTH: n("TG.HEALTH"), DAMAGE: n("TG.BODY_DAMAGE"), SPEED: n("TG.SPEED"), ACCELERATION: n("TG.ACCELERATION"), RANGE: n("TG.RANGE"), PENETRATION: n("TG.BODY_PEN"), RESIST: n("TG.RESIST"), DENSITY: n("TG.DENSITY"), PUSHABILITY: n("TG.PUSHABILITY") }, AI: { BLIND: checked("TG.AI_BLIND"), FARMER: checked("TG.AI_FARMER"), NO_LEAD: checked("TG.AI_NO_LEAD"), SKYNET: checked("TG.AI_SKYNET") } };
            for (const [field, key] of [["MOTION_TYPE", "TG.MOTION"], ["FACING_TYPE", "TG.FACING"], ["HITS_OWN_TYPE", "TG.COLLISION"]]) if (s(key)) type[field] = s(key);
            const rangeMode = s("TG.DIE_AT_RANGE");
            if (rangeMode !== "default") type.DIE_AT_RANGE = rangeMode === "true";
            const properties = { AUTOFIRE: checked("TG.AUTOFIRE"), ALT_FIRE: checked("TG.ALT_FIRE"), FIXED_RELOAD: checked("TG.FIXED_RELOAD"), SHOOT_ON_DEATH: checked("TG.SHOOT_ON_DEATH"), WAIT_TO_CYCLE: checked("TG.WAIT_TO_CYCLE"), DELAY_SPAWN: checked("TG.DELAY_SPAWN"), DESTROY_OLDEST_CHILD: checked("TG.DESTROY_OLDEST_CHILD"), SYNCS_SKILLS: checked("TG.SYNCS_SKILLS"), INDEPENDENT_CHILDREN: checked("TG.INDEPENDENT_CHILDREN"), INDEPENDENT_MASTER: checked("TG.INDEPENDENT_MASTER"), NEGATIVE_RECOIL: checked("TG.NEGATIVE_RECOIL"), STAT_CALCULATOR: s("TG.STAT_CALCULATOR"), COLOR: n("TG.COLOR"), MAX_BULLETS: n("TG.MAX_BULLETS"), MAX_CHILDREN: n("TG.MAX_CHILDREN") };
            return { EDITOR_DISABLED: row.dataset.disabled === "true", POSITION: { LENGTH: n("TG.LENGTH"), WIDTH: n("TG.WIDTH"), ASPECT: 1, X: n("TG.X"), Y: n("TG.Y"), ANGLE: n("TG.ANGLE"), DELAY: n("TG.DELAY") },
                PROPERTIES: { ...properties, SHOOT_SETTINGS: { reload: n("TG.RELOAD"), recoil: n("TG.RECOIL"), damage: n("TG.DAMAGE"), health: 1, pen: n("TG.PEN"), speed: n("TG.SHOT_SPEED"), maxSpeed: n("TG.MAX_SPEED"), range: 1, density: 1, size: 1, shudder: 0.2, resist: 1, spray: n("TG.SPREAD") }, TYPE: type } };
        };
        for (const gun of Array.isArray(data.GUNS) ? data.GUNS : []) appendTurretGun(gun);
        addTurretGun.onclick = () => {
            appendTurretGun();
            queueLiveApply();
        };
        const removeTurret = document.createElement("button");
        removeTurret.type = "button";
        removeTurret.className = "secondary";
        removeTurret.textContent = "Remove turret";
        removeTurret.onclick = () => {
            turretRows.splice(turretRows.indexOf(card), 1);
            card.remove();
            turretRows.forEach((row, index) => row.querySelector(":scope > legend").textContent = `Turret ${index + 1}`);
            refreshPreview();
            queueLiveApply();
        };
        card.append(grid, weaponHeading, weaponList, weaponActions, removeTurret);
        card.collectTurretGun = collectTurretGun;
        turretRows.push(card);
        turretsContainer.appendChild(card);
        return card;
    };
    addTurret.onclick = () => {
        const card = makeTurretCard();
        if (!card) return;
        selectWeaponTab("turrets");
        refreshPreview();
        setStatus(`Added turret ${turretRows.length} of ${MAX_TURRETS_PER_TANK}; customize its weapons below.`);
        queueLiveApply();
    };

    const renderStructureTree = () => {
        structureList.replaceChildren();
        const addItem = (label, nested, onClick, active = false) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `te-structure-item${nested ? " nested" : ""}${active ? " active" : ""}`;
            button.textContent = label; button.onclick = onClick;
            structureList.appendChild(button);
        };
        addItem("●  Main Body", false, () => {
            selectBodyForTree();
        }, activeGunCard === null && selectedPreviewTurret < 0);
        gunRows.forEach((card, index) => {
            const kind = card.querySelector('[data-key="PROJECTILE.PARENT"]')?.value || "bullet";
            addItem(`●  Barrel ${index + 1} · ${kind}`, false, () => {
                selectWeaponTab("guns"); selectedPreviewTurret = -1;
                if (activeGunCard === card) { selectedPreviewGun = index; refreshPreview(); }
                else activateGunCard(card, index, true);
            }, selectedPreviewGun === index);
        });
        turretRows.forEach((card, index) => {
            addItem(`◉  Turret ${index + 1}`, false, () => {
                selectWeaponTab("turrets"); activeGunCard = null; selectedPreviewGun = -1;
                selectedPreviewTurret = index; bodySet.classList.remove("te-selected");
                card.scrollIntoView({ block: "nearest", behavior: "smooth" }); refreshPreview();
            }, selectedPreviewTurret === index);
            (card.turretGunRows || []).forEach((gun, gunIndex) => addItem(`Barrel ${gunIndex + 1}`, true, () => {
                selectWeaponTab("turrets"); selectedPreviewTurret = index;
                gun.scrollIntoView({ block: "nearest", behavior: "smooth" }); refreshPreview();
            }));
        });
    };
    const selectBodyForTree = () => {
        activeGunCard = null; selectedPreviewGun = -1; selectedPreviewTurret = -1;
        bodySet.classList.add("te-selected");
        bodySet.scrollIntoView({ block: "nearest", behavior: "smooth" });
        bodyGrid.querySelector('[data-key="TANK.SHAPE"]').focus({ preventScroll: true });
        refreshPreview();
    };
    const structureObserver = new MutationObserver(renderStructureTree);
    structureObserver.observe(gunsContainer, { childList: true });
    structureObserver.observe(turretsContainer, { childList: true });

    const buildDefinition = () => {
        const guns = gunRows.map(collectGunDefinition);
        const turrets = turretRows.map(card => {
            const n = key => Number(card.querySelector(`[data-key="${key}"]`).value);
            return {
                POSITION: { SIZE: n("TURRET.SIZE"), X: n("TURRET.X"), Y: n("TURRET.Y"), DIRECTION: n("TURRET.DIRECTION"), ARC: n("TURRET.ARC"), SCALE: n("TURRET.SCALE") },
                SHAPE: n("TURRET.SHAPE"), COLOR: n("TURRET.COLOR"),
                GUNS: card.turretGunRows.map(card.collectTurretGun),
            };
        });
        return {
            PARENT: "genericTank",
            LABEL: content.querySelector('[data-key="tankName"]').value.trim() || "Custom Tank",
            SHAPE: Number(content.querySelector('[data-key="TANK.SHAPE"]').value),
            COLOR: 2,
            SIZE: Number(content.querySelector('[data-key="TANK.SIZE"]').value),
            BODY: {
                // Keep player movement on the normal Aether class limits.
                SPEED: 1,
                ACCELERATION: 1,
                HEALTH: Number(content.querySelector('[data-key="BODY.HEALTH"]').value),
                REGEN: Number(content.querySelector('[data-key="BODY.REGEN"]').value),
                DAMAGE: Number(content.querySelector('[data-key="BODY.DAMAGE"]').value),
                SHIELD: Number(content.querySelector('[data-key="BODY.SHIELD"]').value),
                PENETRATION: Number(content.querySelector('[data-key="BODY.PENETRATION"]').value),
                DENSITY: Number(content.querySelector('[data-key="BODY.DENSITY"]').value),
                FOV: Number(content.querySelector('[data-key="BODY.FOV"]').value),
            },
            GUNS: guns,
            TURRETS: turrets,
        };
    };

    // The editor preview is a design canvas, separate from the live player. Play
    // applies this exact validated design through the existing Tank Editor command.
    const previewCanvas = document.createElement("canvas");
    previewCanvas.id = "tePreview";
    previewCanvas.setAttribute("aria-label", "Live tank design preview");
    const previewContext = previewCanvas.getContext("2d");
    let previewFiring = false;
    let pendingPlay = false;
    let previewStart = performance.now();
    let selectedPreviewGun = -1;
    let selectedPreviewTurret = -1;
    let previewZoom = 1;
    const previewPan = { x: 0, y: 0 };
    const shapePath = (ctx, shape, x, y, radius) => {
        if (shape === 0) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            return;
        }
        const sides = Math.abs(shape) === 3 ? 3 : Math.abs(shape) === 5 ? 5 : [0, 4, 3, 5, 6, 7, 8, 9, 10, 10, 4, 4, 12][shape] || 12;
        ctx.beginPath();
        if (shape === 9) {
            for (let i = 0; i < 20; i++) {
                const angle = -Math.PI / 2 + i * Math.PI / 10;
                const r = radius * (i % 2 ? 0.48 : 1);
                const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r;
                if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
        } else if (shape === 10) {
            ctx.moveTo(x - radius * .32, y - radius);
            ctx.lineTo(x + radius * .32, y - radius);
            ctx.lineTo(x + radius * .32, y - radius * .32);
            ctx.lineTo(x + radius, y - radius * .32);
            ctx.lineTo(x + radius, y + radius * .32);
            ctx.lineTo(x + radius * .32, y + radius * .32);
            ctx.lineTo(x + radius * .32, y + radius);
            ctx.lineTo(x - radius * .32, y + radius);
            ctx.lineTo(x - radius * .32, y + radius * .32);
            ctx.lineTo(x - radius, y + radius * .32);
            ctx.lineTo(x - radius, y - radius * .32);
            ctx.lineTo(x - radius * .32, y - radius * .32);
        } else {
            for (let i = 0; i < sides; i++) {
                const angle = -Math.PI / 2 + i * Math.PI * 2 / sides;
                const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
                if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
    };
    const renderPreview = () => {
        if (!previewContext || !previewCanvas.isConnected) return;
        const rect = previewCanvas.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return;
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const width = Math.round(rect.width * dpr), height = Math.round(rect.height * dpr);
        if (previewCanvas.width !== width || previewCanvas.height !== height) {
            previewCanvas.width = width;
            previewCanvas.height = height;
        }
        const ctx = previewContext;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
        const definition = buildDefinition();
        const palette = ["#7d8796", "#f3c642", "#35a8ff", "#56cb72", "#ed5b68", "#a279ee", "#45c6c2", "#a5d847", "#fa8bc1", "#a47a52", "#f4f6fa", "#252a34", "#f6b43a", "#f08138", "#416bd6", "#328c55", "#b7434f", "#555e6b", "#e95bc9"];
        const color = index => palette[Math.max(0, Math.min(palette.length - 1, Number(index) || 0))];
        const cx = rect.width / 2, cy = rect.height / 2;
        const unit = canvasDrag?.type === "body" ? canvasDrag.unit
            : Math.min(rect.width, rect.height) / (Math.max(1, definition.SIZE) * 5.2) * previewZoom;
        const bodyRadius = definition.SIZE * unit;
        ctx.save();
        ctx.translate(cx + previewPan.x, cy + previewPan.y);
        ctx.shadowColor = "#0009";
        ctx.shadowBlur = 18;
        // Barrel art is drawn behind the chassis, as it is in the game.
        definition.GUNS.forEach((gun, index) => {
            if (gun.EDITOR_DISABLED) return;
            const p = gun.POSITION, angle = (Number(p.ANGLE) - 90) * Math.PI / 180;
            ctx.save();
            ctx.translate(Number(p.X) * unit, Number(p.Y) * unit);
            ctx.rotate(angle);
            const length = Number(p.LENGTH) * unit, barrelWidth = Number(p.WIDTH) * unit;
            const start = -bodyRadius * .12, end = bodyRadius + length * .72;
            ctx.fillStyle = color(gun.PROPERTIES.COLOR);
            ctx.strokeStyle = "#10151f";
            ctx.lineWidth = Math.max(2, unit * .45);
            const taper = Number(p.ASPECT) < 0 ? 1.42 : Number(p.ASPECT) < .15 ? .58 : Number(p.ASPECT) < .8 ? .82 : 1;
            ctx.beginPath();
            ctx.moveTo(start, -barrelWidth * .5);
            ctx.lineTo(end - length * .08, -barrelWidth * taper * .5);
            ctx.lineTo(end, -barrelWidth * taper * .5);
            ctx.lineTo(end, barrelWidth * taper * .5);
            ctx.lineTo(end - length * .08, barrelWidth * taper * .5);
            ctx.lineTo(start, barrelWidth * .5);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            if (index === selectedPreviewGun) {
                ctx.strokeStyle = "#8bd5ff"; ctx.lineWidth = 2; ctx.stroke();
            }
            ctx.restore();
        });
        definition.TURRETS.forEach((turret, turretIndex) => {
            const p = turret.POSITION, x = Number(p.X) * unit, y = Number(p.Y) * unit;
            const r = Number(p.SIZE) * unit * .52;
            for (const gun of turret.GUNS || []) {
                if (gun.EDITOR_DISABLED) continue;
                ctx.save(); ctx.translate(x, y); ctx.rotate((Number(p.DIRECTION) - 90) * Math.PI / 180);
                ctx.rotate(Number(gun.POSITION.ANGLE || 0) * Math.PI / 180);
                const length = Number(gun.POSITION.LENGTH) * unit;
                ctx.fillStyle = color(gun.PROPERTIES.COLOR); ctx.strokeStyle = "#10151f";
                ctx.lineWidth = Math.max(2, unit * .4);
                ctx.fillRect(-Number(gun.POSITION.WIDTH) * unit / 2, -r, Number(gun.POSITION.WIDTH) * unit, -length);
                ctx.strokeRect(-Number(gun.POSITION.WIDTH) * unit / 2, -r, Number(gun.POSITION.WIDTH) * unit, -length);
                ctx.restore();
            }
            shapePath(ctx, Number(turret.SHAPE), x, y, r);
            ctx.fillStyle = color(turret.COLOR); ctx.strokeStyle = "#121923"; ctx.lineWidth = 3; ctx.fill(); ctx.stroke();
            if (turretIndex === selectedPreviewTurret) {
                ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2);
                ctx.strokeStyle = "#35c7ff"; ctx.lineWidth = 2; ctx.stroke();
            }
        });
        shapePath(ctx, definition.SHAPE, 0, 0, bodyRadius);
        ctx.fillStyle = "#35a8ff"; ctx.strokeStyle = "#10151f"; ctx.lineWidth = Math.max(3, unit * .65); ctx.fill(); ctx.stroke();
        if (activeGunCard === null && selectedPreviewTurret < 0) {
            ctx.beginPath(); ctx.arc(0, 0, bodyRadius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = "#73d5ff88"; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(0, 0, Math.max(3, bodyRadius * .12), 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff55"; ctx.fill();

        if (previewFiring) {
            const elapsed = (performance.now() - previewStart) / 1000;
            definition.GUNS.forEach((gun, index) => {
                const settings = gun.PROPERTIES.SHOOT_SETTINGS;
                const interval = Math.max(.12, Number(settings.reload) * .62);
                const phase = (elapsed + Number(gun.POSITION.DELAY) + index * .09) % interval;
                const progress = phase / interval;
                if (progress > .72) return;
                const p = gun.POSITION, angle = (Number(p.ANGLE) - 90) * Math.PI / 180;
                const x0 = Number(p.X) * unit + Math.cos(angle) * (bodyRadius + Number(p.LENGTH) * unit * .65);
                const y0 = Number(p.Y) * unit + Math.sin(angle) * (bodyRadius + Number(p.LENGTH) * unit * .65);
                const projectile = gun.PROPERTIES.TYPE;
                const travel = projectile.PARENT === "trap"
                    ? Math.min(progress / .72, .52) * Math.min(rect.width, rect.height) * .2
                    : progress / .72 * Math.min(rect.width, rect.height) * .34;
                const x = x0 + Math.cos(angle) * travel, y = y0 + Math.sin(angle) * travel;
                const radius = Math.max(5, Number(projectile.SIZE) * unit * 2.2);
                shapePath(ctx, projectile.SHAPE, x, y, radius);
                ctx.fillStyle = color(projectile.COLOR); ctx.strokeStyle = "#111925"; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
            });
        }
        ctx.restore();
    };
    let previewFrame = 0;
    const animatePreview = () => {
        renderPreview();
        if (previewFiring && panel.style.display !== "none") previewFrame = requestAnimationFrame(animatePreview);
        else previewFrame = 0;
    };
    const refreshPreview = () => { if (previewFiring) return; renderPreview(); };
    const previewResizeObserver = new ResizeObserver(refreshPreview);
    const resizePreview = () => { if (previewCanvas.isConnected) previewResizeObserver.observe(previewCanvas.parentElement); };

    const loadDefinition = definition => {
        content.querySelector('[data-key="tankName"]').value = definition.LABEL || "Custom Tank";
        content.querySelector('[data-key="TANK.SHAPE"]').value = definition.SHAPE ?? 0;
        content.querySelector('[data-key="TANK.SIZE"]').value = definition.SIZE ?? 12;
        const body = definition.BODY || {};
        for (const [key, fallback] of Object.entries({
            "BODY.HEALTH": 1, "BODY.REGEN": 1,
            "BODY.DAMAGE": 1, "BODY.SHIELD": 0, "BODY.PENETRATION": 1, "BODY.DENSITY": 1, "BODY.FOV": 1,
        })) content.querySelector(`[data-key="${key}"]`).value = body[key.slice(5)] ?? fallback;
        activeGunCard = null;
        selectedPreviewGun = -1;
        gunRows.length = 0;
        gunsContainer.replaceChildren();
        (definition.GUNS || []).forEach((gun, index) => makeGunCard(gun, index));
        if (!definition.GUNS?.length) makeGunCard();
        turretRows.length = 0;
        turretsContainer.replaceChildren();
        (definition.TURRETS || []).forEach(turret => makeTurretCard(turret));
    };

    const renderTanks = (tanks, selectedId = "") => {
        saved.replaceChildren();
        const createOption = document.createElement("option");
        createOption.value = "";
        createOption.textContent = "New tank · save as a separate design";
        createOption.selected = !selectedId;
        saved.appendChild(createOption);
        if (!tanks.length) {
            return;
        }
        for (const tank of tanks) {
            const option = document.createElement("option");
            option.value = tank.id;
            option.dataset.tankId = tank.id;
            option.dataset.definition = JSON.stringify(tank.definition);
            option.dataset.description = tank.description || "";
            option.textContent = `${tank.name} · v${tank.version || 1} · ${tank.status || "Draft"}`;
            option.selected = tank.id === selectedId;
            saved.appendChild(option);
        }
    };

    const renderQuickTankList = tanks => {
        pickerList.replaceChildren();
        if (!tanks?.length) {
            pickerStatus.textContent = "No saved designs yet. Make and save a tank in the workshop first.";
            return;
        }
        pickerStatus.textContent = `${tanks.length} saved design${tanks.length === 1 ? "" : "s"}`;
        for (const tank of tanks) {
            const row = document.createElement("div");
            row.className = "te-picker-row";
            const description = document.createElement("div");
            const name = document.createElement("div");
            name.className = "te-picker-name";
            name.textContent = tank.name;
            const metadata = document.createElement("div");
            metadata.className = "te-picker-meta";
            metadata.textContent = `Version ${tank.version || 1} · ${tank.status || "Draft"}`;
            description.append(name, metadata);
            const equip = document.createElement("button");
            equip.type = "button";
            equip.textContent = "Become tank";
            equip.addEventListener("click", () => {
                pickerStatus.textContent = `Becoming ${tank.name}…`;
                if (!send("equip", tank.id)) pickerStatus.textContent = "Could not contact the Tank Editor Beta server.";
            });
            row.append(description, equip);
            pickerList.appendChild(row);
        }
    };

    let selectedAdminTank = null;
    const renderAdminList = result => {
        ownerSet.style.display = "block";
        const previous = adminId();
        ownerList.replaceChildren();
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select a tank to inspect";
        placeholder.selected = !previous;
        ownerList.appendChild(placeholder);
        for (const tank of result.tanks || []) {
            const option = document.createElement("option");
            option.value = tank.id;
            option.textContent = `${tank.name} · ${tank.creatorName} · ${tank.status} · v${tank.version}`;
            option.selected = tank.id === previous;
            ownerList.appendChild(option);
        }
        ownerPage = Math.floor((result.offset || 0) / 100);
        previousPage.disabled = ownerPage === 0;
        nextPage.disabled = ownerPage * 100 + (result.tanks || []).length >= (result.total || 0);
        ownerInfo.textContent = `${result.total || 0} tank design(s) match · page ${ownerPage + 1}. Select a design to inspect its complete definition and versions.`;
        if (adminId()) send("adminGet", { id: adminId() });
    };
    const renderAdminTank = tank => {
        selectedAdminTank = tank;
        const versions = Array.isArray(tank.versions) ? tank.versions : [];
        for (const select of [versionA, versionB]) {
            select.replaceChildren();
            for (const version of versions) {
                const option = document.createElement("option");
                option.value = version.version;
                option.textContent = `Version ${version.version} · ${new Date(version.savedAt).toLocaleString()} · ${version.status}`;
                select.appendChild(option);
            }
        }
        if (versions.length) versionA.value = String(versions[versions.length - 1].version);
        if (versions.length > 1) versionB.value = String(versions[versions.length - 2].version);
        reviewNote.value = tank.reviewNote || "";
        ownerInfo.textContent = JSON.stringify({
            id: tank.id, name: tank.name, creator: tank.creatorName, createdAt: tank.createdAt,
            updatedAt: tank.updatedAt, status: tank.status, version: tank.version,
            description: tank.description || "",
            reviewNote: tank.reviewNote || "", reviewedBy: tank.reviewedBy || null,
            definition: tank.definition, versions: versions.map(version => ({ version: version.version, savedAt: version.savedAt, status: version.status })),
        }, null, 2);
    };
    let ownerFilterTimer;
    const ownerFiltersChanged = () => {
        ownerPage = 0;
        clearTimeout(ownerFilterTimer);
        ownerFilterTimer = setTimeout(refreshOwnerLibrary, 250);
    };
    ownerSearch.addEventListener("input", ownerFiltersChanged);
    ownerCreator.addEventListener("input", ownerFiltersChanged);
    ownerStatus.addEventListener("change", ownerFiltersChanged);
    ownerSort.addEventListener("change", ownerFiltersChanged);
    ownerList.addEventListener("change", () => { if (adminId()) send("adminGet", { id: adminId() }); });
    previousPage.addEventListener("click", () => { ownerPage = Math.max(0, ownerPage - 1); refreshOwnerLibrary(); });
    nextPage.addEventListener("click", () => { ownerPage++; refreshOwnerLibrary(); });

    let liveApplyTimer;
    const queueLiveApply = () => {
        if (!liveToggle.checked) return;
        clearTimeout(liveApplyTimer);
        liveApplyTimer = setTimeout(() => {
            if (global.gameStart && socket()?.open) send("apply", { definition: buildDefinition() });
        }, 650);
    };

    window.addEventListener("aether-tank-editor-data", event => {
        const data = event.detail;
        if (data.tanks && ["list", "saved", "submitted", "deleted"].includes(data.action)) {
            renderTanks(data.tanks, data.tank?.id || "");
            renderQuickTankList(data.tanks);
        }
        if (data.action === "saved") setStatus(`Saved “${data.tank.name}” as version ${data.tank.version} Draft. Previous versions remain available.`);
        else if (data.action === "submitted") setStatus(`“${data.tank.name}” version ${data.tank.version} was submitted for developer review.`);
        else if (data.action === "deleted") setStatus(data.removed ? "Saved design deleted." : "That saved design was not found.");
        else if (data.action === "equipped") {
            setStatus(`You are now ${data.name}.`);
            picker.style.display = "none";
            panel.style.display = "none";
            restore.style.display = "block";
            quickPickButton.style.display = "block";
        }
        else if (data.action === "applied") {
            setStatus(`${data.name} applied for this arena.`);
            if (pendingPlay) {
                pendingPlay = false;
                previewFiring = false;
                panel.style.display = "none";
                restore.style.display = "block";
                quickPickButton.style.display = "block";
            }
        }
        else if (data.action === "adminList" || data.tanks && ["reviewed", "renamed", "duplicated", "adminDeleted", "restored"].includes(data.action)) renderAdminList(data);
        if (data.action === "adminTank") renderAdminTank(data.tank);
        else if (data.action === "compared") ownerInfo.textContent = JSON.stringify(data.comparison, null, 2);
        else if (data.action === "reviewed") setStatus(`${data.tank.name} marked ${data.tank.status}.`);
        else if (data.action === "renamed") setStatus(`Tank renamed to ${data.tank.name}.`);
        else if (data.action === "duplicated") setStatus(`Created developer copy “${data.tank.name}”.`);
        else if (data.action === "adminDeleted") setStatus(data.removed ? "Tank and version history deleted." : "Tank was already missing.");
        else if (data.action === "restored") setStatus(`Restored version into new version ${data.tank.version}.`);
        else if (data.action === "adminTested") setStatus(`Testing saved design “${data.tank.name}” in this beta arena.`);
        else if (data.action === "error" && !String(data.message || "").startsWith("Owner/developer permissions")) {
            pendingPlay = false;
            setStatus(data.message || "Tank Editor request failed.");
            if (picker.style.display !== "none") pickerStatus.textContent = data.message || "Tank request failed.";
        }
    });

    saved.onchange = () => {
        const definition = saved.selectedOptions[0]?.dataset.definition;
        if (!definition) return;
        try {
            loadDefinition(JSON.parse(definition));
            content.querySelector('[data-key="tankDescription"]').value = saved.selectedOptions[0]?.dataset.description || "";
            queueLiveApply();
            updatePreviewTitle();
        } catch (error) { setStatus("Could not load that saved design."); }
    };
    apply.onclick = () => send("apply", { definition: buildDefinition() });
    const saveDesign = status => send("save", {
        id: selectedTank(), name: content.querySelector('[data-key="tankName"]').value,
        description: content.querySelector('[data-key="tankDescription"]').value,
        status, definition: buildDefinition(),
    });
    save.onclick = () => saveDesign("Draft");
    saveTesting.onclick = () => saveDesign("Testing");
    submitReview.onclick = () => send("submit", {
        id: selectedTank(), name: content.querySelector('[data-key="tankName"]').value,
        description: content.querySelector('[data-key="tankDescription"]').value,
        definition: buildDefinition(),
    });
    become.onclick = () => selectedTank() && send("equip", selectedTank());
    remove.onclick = () => selectedTank() && send("delete", selectedTank());

    const liveLabel = document.createElement("label");
    liveLabel.style.flexDirection = "row";
    liveLabel.style.alignItems = "center";
    liveLabel.style.gap = "8px";
    const liveToggle = document.createElement("input");
    liveToggle.type = "checkbox";
    liveToggle.checked = false;
    liveToggle.style.width = "auto";
    liveLabel.append(liveToggle, document.createTextNode("Live apply edits (updates after a short pause)"));
    liveLabel.hidden = true;
    apply.hidden = true;
    mainActions.before(liveLabel);
    const savePanelSettings = () => {
        savedPanel = {
            size: content.querySelector('[data-key="PANEL.SIZE"]').value,
            side: content.querySelector('[data-key="PANEL.SIDE"]').value,
            opacity: Number(content.querySelector('[data-key="PANEL.OPACITY"]').value),
        };
        applyPanelSettings(savedPanel);
        localStorage.setItem("aetherTankEditorPanel", JSON.stringify(savedPanel));
    };
    panelOptions.addEventListener("input", savePanelSettings);
    panelOptions.addEventListener("change", savePanelSettings);
    content.addEventListener("input", event => {
        if (event.target.matches("[data-key]") && !event.target.dataset.key.startsWith("PANEL.")) queueLiveApply();
    });
    content.addEventListener("change", event => {
        if (event.target.matches("[data-key]") && !event.target.dataset.key.startsWith("PANEL.")) queueLiveApply();
    });

    // Recompose the existing controls into a full-screen workshop. All controls
    // continue to use the same buildDefinition(), save, review and socket flows.
    const workspace = document.createElement("div");
    content.classList.add("te-workspace");
    const rail = document.createElement("aside");
    rail.className = "te-rail";
    const stage = document.createElement("main");
    stage.className = "te-stage";
    const inspector = document.createElement("aside");
    inspector.className = "te-inspector";
    const stageHeading = document.createElement("div");
    stageHeading.className = "te-stage-heading";
    stageHeading.textContent = "Aether Tank Workshop";
    const previewTitle = document.createElement("div");
    previewTitle.className = "te-preview-title";
    const previewSubtitle = document.createElement("div");
    previewSubtitle.className = "te-preview-subtitle";
    previewSubtitle.textContent = "Design mode · your player controls are paused while this workshop is open";
    const previewWrap = document.createElement("div");
    previewWrap.className = "te-preview-wrap";
    previewWrap.appendChild(previewCanvas);
    const previewHint = document.createElement("div");
    previewHint.className = "te-preview-hint";
    previewHint.textContent = "Drag a barrel base to move; drag its tip to aim/resize; Shift-drag to change width. Drag a turret to move and the body rim to resize.";
    previewWrap.appendChild(previewHint);
    const previewActions = document.createElement("div");
    previewActions.className = "te-preview-actions";
    const firePreview = document.createElement("button");
    firePreview.type = "button";
    firePreview.className = "te-fire";
        firePreview.textContent = "▶  Preview fire";
    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.className = "te-play";
    playButton.textContent = "PLAY · TEST IN ARENA";
    previewActions.append(firePreview, playButton);
    const testActions = document.createElement("div");
    testActions.className = "te-test-actions";
    testActions.append(mainActions, liveLabel, status);
    const canvasTools = document.createElement("div");
    canvasTools.className = "te-canvas-tools";
    const zoomOut = document.createElement("button"), zoomIn = document.createElement("button"), centerCanvas = document.createElement("button");
    zoomOut.type = zoomIn.type = centerCanvas.type = "button";
    zoomOut.textContent = "−"; zoomOut.title = "Zoom out";
    zoomIn.textContent = "+"; zoomIn.title = "Zoom in";
    centerCanvas.textContent = "Center";
    canvasTools.append(zoomOut, zoomIn, centerCanvas);
    stage.append(stageHeading, previewTitle, previewSubtitle, canvasTools, previewWrap, previewActions, testActions);
    rail.append(tankSet, savedSet, structureSet, gunsActions, turretActions);
    inspector.append(bodySet, help, ownerSet);
    content.replaceChildren(rail, stage, weaponDock, inspector);
    renderStructureTree();
    zoomIn.onclick = () => { previewZoom = Math.min(2.5, previewZoom * 1.15); refreshPreview(); };
    zoomOut.onclick = () => { previewZoom = Math.max(.55, previewZoom / 1.15); refreshPreview(); };
    centerCanvas.onclick = () => { previewZoom = 1; previewPan.x = 0; previewPan.y = 0; refreshPreview(); };
    panelOptions.hidden = true; // panel-size settings no longer apply to a fullscreen editor
    if (!ownerSet.querySelector("summary")) {
        const ownerDisclosure = document.createElement("details");
        const ownerSummary = document.createElement("summary");
        ownerSummary.textContent = "Developer review tools";
        ownerDisclosure.append(ownerSummary, ownerSet);
        inspector.appendChild(ownerDisclosure);
    }
    previewResizeObserver.observe(previewWrap);
    requestAnimationFrame(renderPreview);
    const updatePreviewTitle = () => {
        previewTitle.textContent = content.querySelector('[data-key="tankName"]').value.trim() || "Untitled Tank";
        refreshPreview();
    };
    newTank.addEventListener("click", () => {
        if (!window.confirm("Start a new tank? Save the current design first if you want to keep its unsaved edits.")) return;
        saved.value = "";
        content.querySelector('[data-key="tankDescription"]').value = "";
        loadDefinition({ LABEL: "New Tank", SHAPE: 0, SIZE: 12, BODY: {}, GUNS: [], TURRETS: [] });
        updatePreviewTitle();
        setStatus("New tank started. Save Draft or Save Testing Version to add it to your saved designs.");
    });
    content.addEventListener("input", event => { if (event.target.matches("[data-key]")) updatePreviewTitle(); });
    content.addEventListener("change", event => { if (event.target.matches("[data-key]")) updatePreviewTitle(); });
    const previewStructureObserver = new MutationObserver(refreshPreview);
    previewStructureObserver.observe(gunsContainer, { childList: true });
    previewStructureObserver.observe(turretsContainer, { childList: true });
    firePreview.addEventListener("click", () => {
        previewFiring = !previewFiring;
        previewStart = performance.now();
        firePreview.classList.toggle("active", previewFiring);
        firePreview.textContent = previewFiring ? "■  Stop preview" : "▶  Preview fire";
        if (previewFiring && !previewFrame) previewFrame = requestAnimationFrame(animatePreview);
        else if (!previewFiring) { cancelAnimationFrame(previewFrame); previewFrame = 0; refreshPreview(); }
    });
    playButton.addEventListener("click", () => {
        pendingPlay = true;
        setStatus("Loading your exact design into the arena…");
        if (!send("apply", { definition: buildDefinition() })) pendingPlay = false;
    });
    let canvasDrag = null;
    const canvasPoint = (event, fixedUnit) => {
        const rect = previewCanvas.getBoundingClientRect(), definition = buildDefinition();
        const unit = fixedUnit || Math.min(rect.width, rect.height) / (Math.max(1, definition.SIZE) * 5.2) * previewZoom;
        return { x: (event.clientX - rect.left - rect.width / 2 - previewPan.x) / unit,
            y: (event.clientY - rect.top - rect.height / 2 - previewPan.y) / unit, unit, definition };
    };
    const writeRange = (root, key, value) => {
        const input = root.querySelector(`[data-key="${key}"]`);
        if (!input) return;
        const bounded = Math.max(Number(input.min), Math.min(Number(input.max), value));
        input.value = input.type === "range" ? String(Math.round(bounded / Number(input.step || 1)) * Number(input.step || 1)) : bounded.toFixed(1);
        const output = input.parentElement.querySelector("output");
        if (output) output.textContent = input.value;
    };
    const clearGunSelection = () => {
        activeGunCard = null; selectedPreviewGun = -1; selectedPreviewTurret = -1;
        for (const row of gunRows) {
            row.classList.remove("te-selected");
            row.querySelector(".te-gun-controls").hidden = true;
            row.querySelector(".te-gun-edit").textContent = "Edit";
            row.querySelector(".te-gun-edit").setAttribute("aria-expanded", "false");
        }
    };
    previewCanvas.addEventListener("pointerdown", event => {
        const { x, y, definition, unit } = canvasPoint(event), d = Math.hypot(x, y);
        if (event.shiftKey && Math.abs(d - definition.SIZE) < Math.max(1.5, 12 / unit)) {
            clearGunSelection(); bodySet.classList.add("te-selected"); canvasDrag = { type: "body", unit };
        } else {
            let picked = false;
            for (let i = definition.TURRETS.length - 1; i >= 0; i--) {
                const p = definition.TURRETS[i].POSITION, radius = Number(p.SIZE) * .52;
                if (Math.hypot(x - Number(p.X), y - Number(p.Y)) <= radius + Math.max(1.5, 9 / unit)) {
                    clearGunSelection(); selectWeaponTab("turrets");
                    canvasDrag = { type: "turret", index: i, startX: x, startY: y,
                        originX: Number(p.X), originY: Number(p.Y), unit };
                    picked = true; break;
                }
            }
            if (!picked) {
                let nearest = { index: -1, dist: Infinity, t: 0 };
                definition.GUNS.forEach((gun, index) => {
                    if (gun.EDITOR_DISABLED) return;
                    const p = gun.POSITION, a = (Number(p.ANGLE) - 90) * Math.PI / 180;
                    const x1 = Number(p.X) - Math.cos(a) * definition.SIZE * .12;
                    const y1 = Number(p.Y) - Math.sin(a) * definition.SIZE * .12;
                    const x2 = Number(p.X) + Math.cos(a) * (definition.SIZE + Number(p.LENGTH) * .72);
                    const y2 = Number(p.Y) + Math.sin(a) * (definition.SIZE + Number(p.LENGTH) * .72);
                    const dx = x2 - x1, dy = y2 - y1;
                    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
                    const dist = Math.hypot(x - x1 - dx * t, y - y1 - dy * t);
                    if (dist < nearest.dist) nearest = { index, dist, t };
                });
                if (nearest.index >= 0 && nearest.dist < Math.max(2, 11 / unit)) {
                    const index = nearest.index, card = gunRows[index], p = definition.GUNS[index].POSITION;
                    selectWeaponTab("guns"); selectedPreviewTurret = -1; bodySet.classList.remove("te-selected");
                    if (activeGunCard !== card) activateGunCard(card, index, true);
                    canvasDrag = { type: event.shiftKey ? "gun-width" : nearest.t > .68 ? "gun-tip" : "gun-move", index,
                        startX: x, startY: y, originX: Number(p.X), originY: Number(p.Y), originWidth: Number(p.WIDTH), unit };
                    picked = true;
                }
            }
            if (!picked && d <= definition.SIZE + Math.max(1.5, 9 / unit)) {
                clearGunSelection(); bodySet.classList.add("te-selected");
                if (Math.abs(d - definition.SIZE) < Math.max(1.8, 12 / unit)) canvasDrag = { type: "body", unit };
                picked = true;
            }
            if (!picked) return;
        }
        previewCanvas.setPointerCapture(event.pointerId); refreshPreview();
    });
    previewCanvas.addEventListener("pointermove", event => {
        if (!canvasDrag) return;
        const drag = canvasDrag, { x, y, definition } = canvasPoint(event, drag.unit);
        if (drag.type === "body") writeRange(bodySet, "TANK.SIZE", Math.hypot(x, y));
        else if (drag.type === "turret") {
            const card = turretRows[drag.index];
            writeRange(card, "TURRET.X", drag.originX + x - drag.startX);
            writeRange(card, "TURRET.Y", drag.originY + y - drag.startY);
        } else {
            const card = gunRows[drag.index];
            if (drag.type === "gun-move") {
                writeRange(card, "POSITION.X", drag.originX + x - drag.startX);
                writeRange(card, "POSITION.Y", drag.originY + y - drag.startY);
            } else if (drag.type === "gun-tip") {
                const dx = x - drag.originX, dy = y - drag.originY;
                if (Math.hypot(dx, dy) > 1) {
                    writeRange(card, "POSITION.ANGLE", ((Math.atan2(dy, dx) * 180 / Math.PI + 90) % 360 + 360) % 360);
                    writeRange(card, "POSITION.LENGTH", (Math.hypot(dx, dy) - definition.SIZE) / .72);
                }
            } else {
                const angle = (Number(definition.GUNS[drag.index].POSITION.ANGLE) - 90) * Math.PI / 180;
                const widthChange = Math.abs(-(x - drag.startX) * Math.sin(angle) + (y - drag.startY) * Math.cos(angle));
                writeRange(card, "POSITION.WIDTH", drag.originWidth + widthChange * 2);
            }
        }
        queueLiveApply(); refreshPreview();
    });
    const releaseCanvas = () => { if (canvasDrag) { canvasDrag = null; refreshPreview(); } };
    previewCanvas.addEventListener("pointerup", releaseCanvas);
    previewCanvas.addEventListener("pointercancel", releaseCanvas);
    // The full-screen editor is a real edit-only mode: game keys do not leak
    // through to the hidden arena. Form controls remain fully keyboard-usable.
    const blockArenaKeys = event => {
        if (panel.style.display === "none" || event.target instanceof Element && event.target.closest("input,select,textarea,[contenteditable=true]")) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    };
    window.addEventListener("keydown", blockArenaKeys, true);
    updatePreviewTitle();

    collapse.textContent = "Play / Exit Workshop";
    collapse.onclick = () => { panel.style.display = "none"; restore.style.display = "block"; quickPickButton.style.display = "block"; previewFiring = false; };
    restore.textContent = "Back to Workshop";
    restore.onclick = () => { panel.style.display = "flex"; restore.style.display = "none"; quickPickButton.style.display = "none"; requestAnimationFrame(renderPreview); };
    let lastSocket = null;
    window.setInterval(() => {
        const activeSocket = socket();
        if (activeSocket && activeSocket !== lastSocket && activeSocket.open && global.gameStart) {
            lastSocket = activeSocket;
            panel.style.display = "flex";
            requestAnimationFrame(renderPreview);
            send("list");
            refreshOwnerLibrary();
            setStatus("Connected. Select a design or create a new tank.");
        }
    }, 500);
    setStatus("Join and spawn in Tank Editor Beta. Your designs are saved per player name.");
}
