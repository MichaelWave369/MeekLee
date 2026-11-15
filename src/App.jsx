import { useEffect, useRef, useState } from "react";
import { MODES, SIZE, adjacent, connectedGroup, findMatches, makeBoard, makeLevel, neighbors, playTurn, rngFrom } from "./core.js";

const SAVE_KEY = "meeklee-adventures-save-v1";
const WORLDS = [
  { id: "harvest", icon: "🌻", name: "Harvest Valley", desc: "Swap crops to grow a cheerful garden." },
  { id: "sweets", icon: "🍬", name: "Sugar Mountain", desc: "Sweet combinations and cascading treats." },
  { id: "rescue", icon: "🐾", name: "Critter Rescue", desc: "Tap matching groups to help the animals." },
  { id: "bubbles", icon: "🫧", name: "Bubble Lagoon", desc: "Swap bubbles as they float upward." }
];

function isValidGame(game, mode) {
  return game && game.mode === mode &&
    Number.isSafeInteger(game.level) && game.level >= 1 &&
    Number.isSafeInteger(game.seed) && Number.isInteger(game.rngState) &&
    Array.isArray(game.board) && game.board.length === SIZE * SIZE &&
    game.board.every(p => Number.isInteger(p) && p >= 0 && p < 6) &&
    Number.isFinite(game.target) && game.target > 0 &&
    Number.isFinite(game.cleared) && game.cleared >= 0 &&
    Number.isFinite(game.score) && Number.isFinite(game.moves) &&
    typeof game.won === "boolean";
}

function initialize() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); }
  catch { /* Browsers without storage still run the game. */ }
  const progress = {};
  const games = {};
  for (const mode of Object.keys(MODES)) {
    const level = raw && Number.isSafeInteger(raw.progress?.[mode]) &&
      raw.progress[mode] > 0 ? raw.progress[mode] : 1;
    progress[mode] = level;
    games[mode] = isValidGame(raw?.games?.[mode], mode) ?
      raw.games[mode] : makeLevel(mode, level);
  }
  return { mode: raw && MODES[raw.mode] ? raw.mode : "harvest", games, progress };
}

function hintFor(game) {
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

export default function App() {
  const [saved, setSaved] = useState(initialize);
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState([]);
  const [message, setMessage] = useState("Every level is free, forever.");
  const pointer = useRef(null);
  const suppressClickUntil = useRef(0);
  const { mode, games } = saved;
  const game = games[mode];
  const rules = MODES[mode];
  const percent = Math.min(100, Math.round(game.cleared * 100 / game.target));
  const instruction = rules.mechanic === "tap" ?
    "Tap a group of 2 or more matching critters." :
    mode === "bubbles" ? "Swap neighbors to match 3. Bubbles rise upward!" :
      "Tap two neighboring pieces or swipe to match 3.";

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); }
    catch { /* No storage = still playable. */ }
  }, [saved]);

  function clearSelection() { setSelected(null); setHint([]); }

  function takeTurn(first, second) {
    if (game.won) return;
    const result = playTurn(game, first, second);
    clearSelection();
    if (!result.valid) {
      setMessage(mode === "rescue" ?
        "Find two or more matching neighbors!" :
        "Try swapping pieces to make a row of three!");
      return;
    }
    const progress = { ...saved.progress };
    if (result.game.won) progress[mode] = Math.max(progress[mode], game.level + 1);
    setSaved({ ...saved, progress, games: { ...games, [mode]: result.game } });
    setMessage(result.game.won ? "Level complete! Another adventure awaits." :
      result.cascades > 1 ? "Wonderful cascade! ✨" :
        "Lovely! " + result.cleared + " pieces collected.");
  }

  function chooseTile(index) {
    if (game.won) return;
    if (rules.mechanic === "tap") { takeTurn(index); return; }
    if (selected === null) {
      setSelected(index);
      setHint([]);
      setMessage("Now choose a neighboring piece.");
    } else if (selected === index) {
      clearSelection();
      setMessage("Piece unselected.");
    } else if (!adjacent(selected, index)) {
      setSelected(index);
      setMessage("Choose a piece right next to it.");
    } else {
      takeTurn(selected, index);
    }
  }

  function changeWorld(next) {
    if (!(next in MODES)) return;
    clearSelection();
    setSaved({ ...saved, mode: next });
    setMessage("Welcome to " + MODES[next].name + "!");
  }

  function shuffle() {
    const rng = rngFrom(game.seed, game.rngState);
    const board = makeBoard(rng, rules.mechanic);
    setSaved({
      ...saved, games: {
        ...games, [mode]: { ...game, board, rngState: rng.getState() }
      }
    });
    clearSelection();
    setMessage("A fresh board, on the house!");
  }

  function nextLevel() {
    if (!game.won) return;
    const next = game.level + 1;
    if (!Number.isSafeInteger(next)) {
      setMessage("You've reached the computer's maximum level number!");
      return;
    }
    setSaved({
      ...saved,
      progress: { ...saved.progress, [mode]: Math.max(saved.progress[mode], next) },
      games: { ...games, [mode]: makeLevel(mode, next) }
    });
    clearSelection();
    setMessage("A brand-new adventure!");
  }

  function onPointerDown(event, index) {
    if (rules.mechanic !== "swap" || game.won) return;
    if (event.pointerType === "mouse") return;
    pointer.current = { index, x: event.clientX, y: event.clientY, id: event.pointerId };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Optional on older browsers. */ }
  }

  function onPointerUp(event) {
    const begin = pointer.current;
    pointer.current = null;
    if (!begin || begin.id !== event.pointerId) return;
    const dx = event.clientX - begin.x, dy = event.clientY - begin.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
    const delta = Math.abs(dx) > Math.abs(dy) ?
      (dx > 0 ? 1 : -1) : (dy > 0 ? SIZE : -SIZE);
    const to = begin.index + delta;
    suppressClickUntil.current = Date.now() + 450;
    if (adjacent(begin.index, to)) takeTurn(begin.index, to);
  }

  return (
    <>
      <header className="hero">
        <div className="sun" aria-hidden="true">☀️</div>
        <div className="brand-mark" aria-hidden="true">🌼</div>
        <p className="eyebrow">A little world of happiness</p>
        <h1>MeekLee <span>Adventures</span></h1>
        <p className="tagline">An endless puzzle garden, made with love.</p>
        <div className="promise">
          <span>💗 No payments</span><span>🌈 No timers</span><span>✨ No limits</span>
        </div>
      </header>
      <main className="main-shell">
        <section className="world-section" aria-labelledby="world-heading">
          <div className="section-heading">
            <h2 id="world-heading">Choose your adventure</h2>
            <span>4 happy worlds</span>
          </div>
          <div className="worlds">
            {WORLDS.map(world => (
              <button key={world.id} type="button"
                className={"world " + (mode === world.id ? "active" : "")}
                onClick={() => changeWorld(world.id)} aria-pressed={mode === world.id}>
                <span className="world-icon" aria-hidden="true">{world.icon}</span>
                <span className="world-text">
                  <strong>{world.name}</strong>
                  <small>{world.desc}</small>
                  <em>Level {games[world.id].level.toLocaleString()}</em>
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="play-section" aria-labelledby="level-heading">
          <div className="game-panel" style={{ "--world-accent": rules.color }}>
            <div className="game-heading">
              <div>
                <p className="eyebrow world-label">{rules.name}</p>
                <h2 id="level-heading">Level {game.level.toLocaleString()}</h2>
              </div>
              <div className="score-chip">
                ⭐ <strong>{game.score.toLocaleString()}</strong><small>points</small>
              </div>
            </div>
            <div className="goal-heading">
              <span>🎯 Collect {game.target} pieces</span>
              <strong>{Math.min(game.cleared, game.target)} / {game.target}</strong>
            </div>
            <div className="progress-track" role="progressbar" aria-label="Level progress"
              aria-valuemin={0} aria-valuemax={game.target}
              aria-valuenow={Math.min(game.cleared, game.target)}>
              <span style={{ width: percent + "%" }}/>
            </div>
            <p className="instruction">{instruction}</p>
            <div className="board-wrap">
              <div className={"game-board " + (rules.gravity === "up" ? "floaty" : "")}
                role="group" aria-label={rules.name + " puzzle board"}
                onPointerUp={onPointerUp} onPointerCancel={() => { pointer.current = null; }}>
                {game.board.map((piece, index) => (
                  <button type="button" key={index}
                    className={"tile " + (selected === index ? "selected " : "") +
                      (hint.includes(index) ? "hint" : "")}
                    aria-label={rules.pieces[piece] + ", row " + (Math.floor(index / SIZE) + 1) +
                      ", column " + (index % SIZE + 1)}
                    aria-pressed={selected === index}
                    onPointerDown={event => onPointerDown(event, index)}
                    onClick={() => {
                      if (Date.now() >= suppressClickUntil.current) chooseTile(index);
                    }}>
                    <span aria-hidden="true">{rules.pieces[piece]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="game-bottom">
              <span>🌟 {game.moves} moves played</span>
              <span>♾️ Play at your own pace</span>
            </div>
            <div className="game-actions">
              <button type="button" className="action secondary"
                disabled={game.won}
                onClick={() => {
                  clearSelection(); setHint(hintFor(game));
                  setMessage("Look for the glowing pieces!");
                }}>💡 Free hint</button>
              <button type="button" className="action secondary"
                disabled={game.won} onClick={shuffle}>🔀 Free shuffle</button>
            </div>
            <p className="message" aria-live="polite">{message}</p>
            {game.won && (
              <div className="win-panel" role="status">
                <div className="win-emoji">🎉</div>
                <h3>Beautifully done!</h3>
                <p>Another little adventure is waiting.</p>
                <button type="button" className="action primary"
                  onClick={nextLevel}>Next level →</button>
              </div>
            )}
          </div>
          <aside className="side-note">
            <div className="note-flower">💐</div>
            <h2>Made for Mom</h2>
            <p>Take your time. Enjoy the colors. There are no lives to lose and no doors that only money can open.</p>
            <p>Finish a level, and a new one grows. The garden just keeps going.</p>
            <div className="note-quote">“Just one more level!”</div>
          </aside>
        </section>
      </main>
      <footer>MeekLee Adventures · Made with love, not microtransactions. ❤️</footer>
    </>
  );
}
