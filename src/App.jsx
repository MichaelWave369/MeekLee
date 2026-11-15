import { useEffect, useRef, useState } from "react";
import { MODES, SIZE, adjacent, connectedGroup, findMatches, makeBoard, makeLevel, neighbors, playTurn, rngFrom } from "./core.js";
import { SAVE_KEY, createSaveState } from "./save.js";

const WORLDS = [
  { id: "harvest", icon: "🌻", name: "Harvest Valley", desc: "Swap crops to grow a cheerful garden." },
  { id: "sweets", icon: "🍬", name: "Sugar Mountain", desc: "Sweet combinations and cascading treats." },
  { id: "rescue", icon: "🐾", name: "Critter Rescue", desc: "Tap matching groups to help the animals." },
  { id: "bubbles", icon: "🫧", name: "Bubble Lagoon", desc: "Swap bubbles as they float upward." }
];

function initialize() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); }
  catch { /* No storage access: play normally without persistence. */ }
  const onPhone = typeof window !== "undefined" && window.matchMedia("(max-width: 600px), (pointer: coarse)").matches;
  return createSaveState(raw, onPhone);
}

function hintFor(game) {
  const size = game.size ?? SIZE;
  if (MODES[game.mode].mechanic === "tap") {
    for (let i = 0; i < game.board.length; i++) {
      const group = connectedGroup(game.board, i);
      if (group.length >= 2) return group;
    }
  } else {
    for (let i = 0; i < game.board.length; i++) {
      for (const j of neighbors(i, size)) {
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
  const [animation, setAnimation] = useState(null);
  const busyRef = useRef(false);
  const [showSettings, setShowSettings] = useState(() =>
    typeof window === "undefined" || !window.matchMedia("(max-width: 600px), (pointer: coarse)").matches);
  const [message, setMessage] = useState("Every level is free, forever.");
  const [showWorlds, setShowWorlds] = useState(() => typeof window === "undefined" || !window.matchMedia("(max-width: 600px), (pointer: coarse)").matches);
  const pointer = useRef(null);
  const suppressClickUntil = useRef(0);
  const { mode, settings } = saved;
  const gameKey = settings.easy ? "easyGames" : "games";
  const progressKey = settings.easy ? "easyProgress" : "progress";
  const games = saved[gameKey];
  const game = games[mode];
  const size = game.size ?? SIZE;
  const rules = MODES[mode];
  const busy = Boolean(animation);
  const stage = animation?.trace[animation.index] ?? null;
  const shownBoard = stage?.board ?? game.board;
  const movements = new Map((stage?.movements ?? []).map(move => [move.to, move]));
  const percent = Math.min(100, Math.round(game.cleared * 100 / game.target));
  const instruction = rules.mechanic === "tap" ?
    "Tap a group of 2 or more matching critters." :
    mode === "bubbles" ? "Swap neighbors to match 3. Bubbles rise upward!" :
      "Tap two neighboring pieces or swipe to match 3.";
  const mobileInstruction = rules.mechanic === "tap" ? "Tap matching groups of 2+" :
    mode === "bubbles" ? "Match 3 bubbles to make them float!" : "Tap or swipe to match 3";

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); }
    catch { /* No storage = still playable. */ }
  }, [saved]);

  function clearSelection() { setSelected(null); setHint([]); }

  function commitTurn(result, turnMode = mode, turnGameKey = gameKey, turnProgressKey = progressKey) {
    setSaved(previous => {
      const progress = { ...previous[turnProgressKey] };
      if (result.game.won) progress[turnMode] = Math.max(progress[turnMode], result.game.level + 1);
      return {
        ...previous,
        [turnProgressKey]: progress,
        [turnGameKey]: { ...previous[turnGameKey], [turnMode]: result.game }
      };
    });
    const cascades = result.cascades || 0;
    setMessage(result.game.won ? "Beautifully done! A new adventure is waiting." :
      cascades >= 3 ? "Amazing! " + cascades + " incredible combos!" :
      cascades > 1 ? "Wonderful! " + cascades + " combos in a row!" :
      "Lovely! " + result.cleared + " pieces collected.");
  }

  function takeTurn(first, second) {
    if (game.won || busyRef.current) return;
    const result = playTurn(game, first, second);
    clearSelection();
    if (!result.valid) {
      setMessage(mode === "rescue" ?
        "Find two or more matching neighbors!" :
        "Try swapping pieces to make a row of three!");
      return;
    }
    if (settings.motion && result.trace?.length) {
      busyRef.current = true;
      // Long cascades remain playable without trapping someone in an animation.
      const trace = result.trace.length > 16 ?
        [...result.trace.slice(0, 15), { type: "shuffle", board: [...result.game.board] }] : result.trace;
      setAnimation({ trace, index: 0, result, turnMode: mode, turnGameKey: gameKey, turnProgressKey: progressKey });
    } else {
      commitTurn(result);
    }
  }

  // Display actual intermediate boards. Input is locked during match animations.
  // Each stage has one timer with effect cleanup.
  useEffect(() => {
    if (!animation) return;
    const frame = animation.trace[animation.index];
    const delay = frame.type === "swap" ? 200 :
      frame.type === "pop" ? (frame.combo >= 2 ? 450 : 320) :
      frame.type === "fall" ? 450 : 260;
    const timer = window.setTimeout(() => {
      if (animation.index + 1 < animation.trace.length) {
        setAnimation({ ...animation, index: animation.index + 1 });
      } else {
        commitTurn(animation.result, animation.turnMode, animation.turnGameKey, animation.turnProgressKey);
        busyRef.current = false;
        setAnimation(null);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [animation]);

  function chooseTile(index) {
    if (game.won || busyRef.current) return;
    if (rules.mechanic === "tap") { takeTurn(index); return; }
    if (selected === null) {
      setSelected(index);
      setHint([]);
      setMessage("Now choose a neighboring piece.");
    } else if (selected === index) {
      clearSelection();
      setMessage("Piece unselected.");
    } else if (!adjacent(selected, index, size)) {
      setSelected(index);
      setMessage("Choose a piece right next to it.");
    } else {
      takeTurn(selected, index);
    }
  }

  function changeWorld(next) {
    if (!(next in MODES) || busyRef.current) return;
    clearSelection();
    setSaved({ ...saved, mode: next });
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 600px), (pointer: coarse)").matches) setShowWorlds(false);
    setMessage("Welcome to " + MODES[next].name + "!");
  }

  function shuffle() {
    if (busyRef.current || game.won) return;
    const rng = rngFrom(game.seed, game.rngState);
    const board = makeBoard(rng, rules.mechanic, size);
    setSaved({
      ...saved, [gameKey]: {
        ...games, [mode]: { ...game, board, rngState: rng.getState() }
      }
    });
    clearSelection();
    setMessage("A fresh board, on the house!");
  }

  function nextLevel() {
    if (!game.won || busyRef.current) return;
    const next = game.level + 1;
    if (!Number.isSafeInteger(next)) {
      setMessage("You've reached the computer's maximum level number!");
      return;
    }
    setSaved({
      ...saved,
      [progressKey]: { ...saved[progressKey], [mode]: Math.max(saved[progressKey][mode], next) },
      [gameKey]: { ...games, [mode]: makeLevel(mode, next, size) }
    });
    clearSelection();
    setMessage("A brand-new adventure!");
  }

  function onPointerDown(event, index) {
    if (rules.mechanic !== "swap" || game.won || busyRef.current) return;
    if (event.pointerType === "mouse") return;
    pointer.current = { index, x: event.clientX, y: event.clientY, id: event.pointerId };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Optional on older browsers. */ }
  }

  function onPointerUp(event) {
    const begin = pointer.current;
    pointer.current = null;
    if (!begin || begin.id !== event.pointerId || busyRef.current) return;
    const dx = event.clientX - begin.x, dy = event.clientY - begin.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
    const delta = Math.abs(dx) > Math.abs(dy) ?
      (dx > 0 ? 1 : -1) : (dy > 0 ? size : -size);
    const to = begin.index + delta;
    suppressClickUntil.current = Date.now() + 450;
    if (adjacent(begin.index, to, size)) takeTurn(begin.index, to);
  }

  return (
    <div className={"app-root" + (settings.easy ? " easy-see" : "") + (settings.highContrast ? " high-contrast" : "")}>
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
        <nav className="mobile-quickbar" aria-label="Game menu">
          <button type="button" className="quick-toggle" disabled={busy}
            aria-expanded={showWorlds} aria-controls="meeklee-worlds"
            onClick={() => { setShowWorlds(!showWorlds); setShowSettings(false); }}>
            🌍 Worlds
          </button>
          <button type="button" className="quick-toggle" disabled={busy}
            aria-expanded={showSettings} aria-controls="meeklee-visibility"
            onClick={() => { setShowSettings(!showSettings); setShowWorlds(false); }}>
            🔎 Display
          </button>
        </nav>
        <section id="meeklee-visibility" className={"comfort-bar" + (showSettings ? " open" : "")} aria-label="Visibility and animation settings">
          <div className="comfort-heading">
            <strong>Made easy to see</strong>
            <span>Choose what looks best to you.</span>
          </div>
          <div className="comfort-actions">
            <button type="button" className="comfort-button" disabled={busy}
              aria-pressed={settings.easy}
              aria-label={"Big pieces, " + (settings.easy ? "on" : "off") + ". Switch between six by six and eight by eight puzzle boards."}
              onClick={() => {
                setSaved({ ...saved, settings: { ...settings, easy: !settings.easy } });
                clearSelection(); setMessage("Your puzzle size is set. Your progress is saved in both modes.");
              }}>
              🔎 Big pieces: <strong>{settings.easy ? "ON" : "OFF"}</strong>
            </button>
            <button type="button" className="comfort-button" disabled={busy}
              aria-pressed={settings.highContrast}
              aria-label={"High contrast, " + (settings.highContrast ? "on" : "off")}
              onClick={() => setSaved({ ...saved, settings: { ...settings, highContrast: !settings.highContrast } })}>
              ◐ Clear contrast: <strong>{settings.highContrast ? "ON" : "OFF"}</strong>
            </button>
            <button type="button" className="comfort-button" disabled={busy}
              aria-pressed={settings.motion}
              aria-label={"Match animations, " + (settings.motion ? "on" : "off")}
              onClick={() => setSaved({ ...saved, settings: { ...settings, motion: !settings.motion } })}>
              ✨ Animations: <strong>{settings.motion ? "ON" : "OFF"}</strong>
            </button>
          </div>
        </section>
        <section id="meeklee-worlds" className={"world-section" + (showWorlds ? " open" : "")} aria-labelledby="world-heading">
          <div className="section-heading">
            <h2 id="world-heading">Choose your adventure</h2>
            <span>4 happy worlds</span>
          </div>
          <button type="button" className="world-chooser" disabled={busy} aria-expanded={showWorlds}
            onClick={() => setShowWorlds(!showWorlds)}>
            {showWorlds ? "Hide other worlds" : "🌎 Change puzzle world"}
          </button>
          {showWorlds && <div className="worlds">
            {WORLDS.map(world => (
              <button key={world.id} type="button"
                className={"world " + (mode === world.id ? "active" : "")} disabled={busy}
                onClick={() => changeWorld(world.id)} aria-pressed={mode === world.id}>
                <span className="world-icon" aria-hidden="true">{world.icon}</span>
                <span className="world-text">
                  <strong>{world.name}</strong>
                  <small>{world.desc}</small>
                  <em>Level {games[world.id].level.toLocaleString()}</em>
                </span>
              </button>
            ))}
          </div>}
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
            <p className="instruction"><span className="desktop-tip">{instruction}</span><span className="mobile-tip">{mobileInstruction}</span></p>
            <div className={"board-wrap" + (busy ? " is-animating" : "")}>
              {stage?.type === "pop" && (
                <div key={"combo-" + animation.index} className={"combo-toast" + (stage.combo >= 2 ? " big-combo" : "")}
                  aria-hidden="true">
                  <span>{stage.combo >= 2 ? "COMBO ×" + stage.combo + "!" : "Lovely match!"}</span>
                  <small>+{stage.gained} points ✨</small>
                </div>
              )}
              <div className={"game-board " + (rules.gravity === "up" ? "floaty" : "")}
                style={{ "--grid-size": size }}
                role="group" aria-label={rules.name + " puzzle board, " + size + " by " + size}
                aria-busy={busy}
                onPointerUp={onPointerUp} onPointerCancel={() => { pointer.current = null; }}>
                {shownBoard.map((piece, index) => {
                  const move = movements.get(index);
                  const swappedFrom = stage?.type === "swap" && stage.indices?.includes(index) ?
                    (stage.indices[0] === index ? stage.indices[1] : stage.indices[0]) : null;
                  const from = move ? move.from : swappedFrom;
                  const tileStyle = from == null ? undefined : {
                    "--from-cols": (from % size) - (index % size),
                    "--from-rows": Math.floor(from / size) - Math.floor(index / size)
                  };
                  const matching = stage?.type === "pop" && stage.matched.includes(index);
                  return (
                    <button type="button" key={(animation ? animation.index + "-" : "idle-") + index}
                      disabled={busy}
                      className={"tile " + (selected === index && !busy ? "selected " : "") +
                        (hint.includes(index) && !busy ? "hint " : "") +
                        (matching ? "fx-pop " : "") +
                        (stage?.type === "fall" ? "fx-fall " : "") +
                        (swappedFrom !== null ? "fx-swap " : "") +
                        (move?.fresh ? "fx-new " : "")}
                      style={tileStyle}
                      aria-label={rules.pieces[piece] + ", row " + (Math.floor(index / size) + 1) +
                        ", column " + (index % size + 1)}
                      aria-pressed={!busy && selected === index}
                      onPointerDown={event => onPointerDown(event, index)}
                      onClick={() => {
                        if (Date.now() >= suppressClickUntil.current) chooseTile(index);
                      }}>
                      <span aria-hidden="true">{rules.pieces[piece]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="game-bottom">
              <span>🌟 {game.moves} moves played</span>
              <span>♾️ Play at your own pace</span>
            </div>
            <div className="game-actions">
              <button type="button" className="action secondary"
                disabled={game.won || busy}
                onClick={() => {
                  clearSelection(); setHint(hintFor(game));
                  setMessage("Look for the glowing pieces!");
                }}>💡 Free hint</button>
              <button type="button" className="action secondary"
                disabled={game.won || busy} onClick={shuffle}>🔀 Free shuffle</button>
            </div>
            <p className="message" aria-live="polite">{message}</p>
            {game.won && (
              <div className="win-panel" role="status">
                <div className="win-emoji">🎉</div>
                <h3>Beautifully done!</h3>
                <p>Another little adventure is waiting.</p>
                <button type="button" className="action primary" disabled={busy}
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
    </div>
  );
}
