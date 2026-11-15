import { MODES, SIZE, adjacent, connectedGroup, findMatches, makeBoard, makeLevel, neighbors, playTurn, rngFrom } from "./core.js";

const KEY = "meeklee-adventures-save-v1";
const worlds = [
  ["harvest", "🌻", "Harvest Valley", "Swap crops to grow a cheerful garden."],
  ["sweets", "🍬", "Sugar Mountain", "Sweet combinations and cascading treats."],
  ["rescue", "🐾", "Critter Rescue", "Tap matching groups to help the animals."],
  ["bubbles", "🫧", "Bubble Lagoon", "Swap bubbles as they float upward."]
];
const root = document.querySelector("#app");
const progressDefault = () => Object.fromEntries(Object.keys(MODES).map(key => [key, 1]));
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") {
      const progress = progressDefault();
      for (const mode of Object.keys(MODES)) {
        if (Number.isSafeInteger(raw.progress?.[mode]) && raw.progress[mode] > 0) progress[mode] = raw.progress[mode];
      }
      return { progress, games: raw.games && typeof raw.games === "object" ? raw.games : {}, mode: MODES[raw.mode] ? raw.mode : "harvest" };
    }
  } catch { /* Private browsing / disabled storage: play without persistence. */ }
  return { progress: progressDefault(), games: {}, mode: "harvest" };
}
const state = load();
let selected = null;
let hint = [];
let message = "";
let pointerStart = null;
let ignoreClickUntil = 0;

function gameValid(game, mode) {
  return game && game.mode === mode && Number.isSafeInteger(game.level) && game.level > 0 &&
    Number.isSafeInteger(game.seed) && Number.isInteger(game.rngState) &&
    Array.isArray(game.board) && game.board.length === SIZE * SIZE &&
    game.board.every(v => Number.isInteger(v) && v >= 0 && v < 6) &&
    Number.isFinite(game.target) && game.target > 0 &&
    Number.isFinite(game.cleared) && game.cleared >= 0 &&
    Number.isFinite(game.score) && Number.isFinite(game.moves) &&
    typeof game.won === "boolean";
}

function activeGame() {
  const mode = state.mode;
  if (!gameValid(state.games[mode], mode)) {
    state.games[mode] = makeLevel(mode, state.progress[mode]);
  }
  return state.games[mode];
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Still playable without storage. */ }
}
function setMessage(text) { message = text; }
function escapeAttr(text) {
  return String(text).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function render() {
  const game = activeGame();
  const rules = MODES[state.mode];
  const pct = Math.min(100, Math.round(game.cleared / game.target * 100));
  const prompt = rules.mechanic === "tap" ? "Tap a group of 2 or more matching critters." :
    state.mode === "bubbles" ? "Swap neighbors to match 3. Bubbles rise upward!" :
    "Tap two neighboring pieces or swipe to match 3.";
  root.innerHTML = \`
    <header class="hero">
      <div class="sun" aria-hidden="true">☀️</div>
      <div class="brand-mark" aria-hidden="true">🌼</div>
      <p class="eyebrow">A little world of happiness</p>
      <h1>MeekLee <span>Adventures</span></h1>
      <p class="tagline">An endless puzzle garden, made with love.</p>
      <div class="promise"><span>💗 No payments</span><span>🌈 No timers</span><span>✨ No limits</span></div>
    </header>
    <main class="main-shell">
      <section class="world-section" aria-labelledby="world-heading">
        <div class="section-heading"><h2 id="world-heading">Choose your adventure</h2><span>4 happy worlds</span></div>
        <div class="worlds">
        \${worlds.map(([id, icon, name, desc]) => \`
          <button class="world \${state.mode === id ? "active" : ""}" data-world="\${id}" aria-pressed="\${state.mode === id}">
            <span class="world-icon" aria-hidden="true">\${icon}</span>
            <span class="world-text"><strong>\${name}</strong><small>\${desc}</small><em>Level \${state.games[id]?.level || state.progress[id]}</em></span>
          </button>\`).join("")}
        </div>
      </section>
      <section class="play-section" aria-labelledby="level-heading">
        <div class="game-panel" style="--world-accent:\${rules.color}">
          <div class="game-heading">
            <div><p class="eyebrow world-label">\${rules.name}</p><h2 id="level-heading">Level \${game.level.toLocaleString()}</h2></div>
            <div class="score-chip">⭐ <strong>\${game.score.toLocaleString()}</strong><small>points</small></div>
          </div>
          <div class="goal-heading"><span>🎯 Collect \${game.target} pieces</span><strong>\${Math.min(game.cleared, game.target)} / \${game.target}</strong></div>
          <div class="progress-track" role="progressbar" aria-label="Level progress" aria-valuemin="0" aria-valuemax="\${game.target}" aria-valuenow="\${Math.min(game.cleared, game.target)}"><span style="width:\${pct}%"></span></div>
          <p class="instruction">\${prompt}</p>
          <div class="board-wrap">
            <div class="game-board \${rules.gravity === "up" ? "floaty" : ""}" role="group" aria-label="\${rules.name} puzzle board">
              \${game.board.map((piece, i) => \`
                <button type="button" class="tile \${selected === i ? "selected" : ""} \${hint.includes(i) ? "hint" : ""}" data-i="\${i}"
                  aria-label="\${escapeAttr(rules.pieces[piece])}, row \${Math.floor(i / SIZE) + 1}, column \${i % SIZE + 1}" aria-pressed="\${selected === i}">
                  <span aria-hidden="true">\${rules.pieces[piece]}</span>
                </button>\`).join("")}
            </div>
          </div>
          <div class="game-bottom"><span>🌟 \${game.moves} moves played</span><span>♾️ Play at your own pace</span></div>
          <div class="game-actions">
            <button class="action secondary" data-action="hint">💡 Free hint</button>
            <button class="action secondary" data-action="shuffle">🔀 Free shuffle</button>
          </div>
          <p class="message" id="message" aria-live="polite">\${escapeAttr(message || "Every level is free, forever.")}</p>
          \${game.won ? \`<div class="win-panel" role="status"><div class="win-emoji">🎉</div><h3>Beautifully done!</h3><p>Another little adventure is waiting.</p><button class="action primary" data-action="next">Next level →</button></div>\` : ""}
        </div>
        <aside class="side-note">
          <div class="note-flower">💐</div>
          <h2>Made for Mom</h2>
          <p>Take your time. Enjoy the colors. There are no lives to lose and no doors that only money can open.</p>
          <p>Finish a level, and a new one grows. The garden just keeps going.</p>
          <div class="note-quote">“Just one more level!”</div>
        </aside>
      </section>
    </main>
    <footer>MeekLee Adventures · Made with love, not microtransactions. <span>❤️</span></footer>\`;
}

function clearSelection() { selected = null; hint = []; }
function applyTurn(first, second) {
  const result = playTurn(activeGame(), first, second);
  clearSelection();
  if (!result.valid) {
    setMessage(state.mode === "rescue" ? "Find two or more matching neighbors!" : "Try swapping pieces to make a row of three!");
    render();
    return;
  }
  state.games[state.mode] = result.game;
  if (result.game.won) {
    state.progress[state.mode] = Math.max(state.progress[state.mode], result.game.level + 1);
    setMessage("Level complete! You've earned another adventure.");
  } else {
    setMessage(result.cascades > 1 ? "Wonderful cascade! ✨" : \`Lovely! \${result.cleared} pieces collected.\`);
  }
  save();
  render();
}

function chooseTile(index) {
  const game = activeGame();
  if (game.won) return;
  if (MODES[state.mode].mechanic === "tap") {
    applyTurn(index);
    return;
  }
  if (selected === null) {
    selected = index;
    hint = [];
    setMessage("Now choose a neighboring piece.");
    render();
    return;
  }
  if (selected === index) {
    clearSelection();
    setMessage("Piece unselected.");
    render();
    return;
  }
  if (!adjacent(selected, index)) {
    selected = index;
    setMessage("Choose a piece right next to it.");
    render();
    return;
  }
  applyTurn(selected, index);
}

function findHint(game) {
  if (MODES[game.mode].mechanic === "tap") {
    for (let i = 0; i < 64; i++) {
      const group = connectedGroup(game.board, i);
      if (group.length >= 2) return group;
    }
  } else {
    for (let i = 0; i < 64; i++) {
      for (const j of neighbors(i)) {
        if (j < i || game.board[i] === game.board[j]) continue;
        const board = [...game.board];
        [board[i], board[j]] = [board[j], board[i]];
        if (findMatches(board).size) return [i, j];
      }
    }
  }
  return [];
}

root.addEventListener("click", event => {
  const tile = event.target.closest("[data-i]");
  if (tile) {
    if (Date.now() < ignoreClickUntil) return;
    chooseTile(Number(tile.dataset.i));
    return;
  }
  const world = event.target.closest("[data-world]");
  if (world) {
    state.mode = world.dataset.world;
    clearSelection();
    setMessage("Welcome to " + MODES[state.mode].name + "!");
    save();
    render();
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "hint") {
    hint = findHint(activeGame());
    selected = null;
    setMessage("Look for the glowing pieces!");
    render();
  }
  if (action === "shuffle") {
    const game = activeGame(), rules = MODES[state.mode];
    const rng = rngFrom(game.seed, game.rngState);
    game.board = makeBoard(rng, rules.mechanic);
    game.rngState = rng.getState();
    clearSelection();
    setMessage("A fresh board, on the house!");
    save();
    render();
  }
  if (action === "next" && activeGame().won) {
    const level = activeGame().level + 1;
    state.progress[state.mode] = Math.max(state.progress[state.mode], level);
    state.games[state.mode] = makeLevel(state.mode, level);
    clearSelection();
    setMessage("A brand-new adventure!");
    save();
    render();
  }
});

root.addEventListener("pointerdown", event => {
  const tile = event.target.closest("[data-i]");
  if (tile && MODES[state.mode].mechanic === "swap") {
    pointerStart = { index: Number(tile.dataset.i), x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  }
});
window.addEventListener("pointerup", event => {
  if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;
  const { index, x, y } = pointerStart;
  pointerStart = null;
  const dx = event.clientX - x, dy = event.clientY - y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  const delta = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : (dy > 0 ? SIZE : -SIZE);
  const next = index + delta;
  if (adjacent(index, next)) {
    ignoreClickUntil = Date.now() + 350;
    applyTurn(index, next);
  }
});
window.addEventListener("pointercancel", () => { pointerStart = null; });

render();
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
