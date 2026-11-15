import { useEffect, useRef, useState } from "react";
import { MODES, SIZE, adjacent, connectedGroup, findMatches, makeBoard, makeLevel, neighbors, playTurn, rngFrom } from "./core.js";
import { SAVE_KEY, createSaveState } from "./save.js";
import { dragPreview } from "./drag.js";
import LevelTrail from "./LevelTrail.jsx";
import BubbleShooter from "./BubbleShooter.jsx";
import { makeShooterLevel } from "./shooter.js";
import { pageForLevel } from "./trail.js";
import { motionCssVariables, stageDuration } from "./motion.js";

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
  const [view, setView] = useState("play");
  const [trailPage, setTrailPage] = useState(0);
  const busyRef = useRef(false);
  const boardRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(() =>
    typeof window === "undefined" || !window.matchMedia("(max-width: 600px), (pointer: coarse)").matches);
  const [message, setMessage] = useState("Every level is free, forever.");
  const [showWorlds, setShowWorlds] = useState(() => typeof window === "undefined" || !window.matchMedia("(max-width: 600px), (pointer: coarse)").matches);
  const pointer = useRef(null);
  const [drag, setDrag] = useState(null);
  const suppressClickUntil = useRef(0);
  const { mode, settings } = saved;
  const gameKey = mode === "bubbles" ?
    (settings.easy ? "easyShooterGames" : "shooterGames") :
    (settings.easy ? "easyGames" : "games");
  const progressKey = mode === "bubbles" ?
    (settings.easy ? "easyShooterProgress" : "shooterProgress") :
    (settings.easy ? "easyProgress" : "progress");
  const games = saved[gameKey];
  const game = games[mode];
  const size = game.size ?? SIZE;
  const rules = MODES[mode];
  const busy = Boolean(animation);
  const stage = animation?.trace[animation.index] ?? null;
  const visualSpeed = animation?.speed ?? settings.motionSpeed;
  const shownBoard = stage?.board ?? game.board;
  const movements = new Map((stage?.movements ?? []).map(move => [move.to, move]));
  const percent = Math.min(100, Math.round(game.cleared * 100 / game.target));
  const instruction = rules.mechanic === "tap" ?
    "Tap a group of 2 or more matching critters." :
    mode === "bubbles" ? "Swap neighbors to match 3. Bubbles rise upward!" :
      "Drag a piece onto its neighbor and release, or tap two neighbors to match 3.";
  const mobileInstruction = rules.mechanic === "tap" ? "Tap matching groups of 2+" :
    mode === "bubbles" ? "Drag & release to match bubbles!" : "Drag & release to match 3";

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
      // Pixel distances avoid CSS calc multiplication that some phone browsers ignore.
      const board = boardRef.current;
      const tile = board?.querySelector(".tile");
      const tileRect = tile?.getBoundingClientRect();
      const boardStyle = board && window.getComputedStyle(board);
      const gapX = Number.parseFloat(boardStyle?.columnGap) || 0;
      const gapY = Number.parseFloat(boardStyle?.rowGap) || 0;
      setAnimation({
        trace, index: 0, result, turnMode: mode, turnGameKey: gameKey, turnProgressKey: progressKey,
        speed: settings.motionSpeed,
        cellX: (tile?.offsetWidth || tileRect?.width || 50) + gapX,
        cellY: (tile?.offsetHeight || tileRect?.height || 50) + gapY
      });
    } else {
      commitTurn(result);
    }
  }

  // Display actual intermediate boards. Input is locked during match animations.
  // Each stage has one timer with effect cleanup.
  useEffect(() => {
    if (!animation) return;
    const frame = animation.trace[animation.index];
    const delay = stageDuration(frame, animation.speed);
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
    setMenuOpen(false);
    setShowSettings(false);
    setShowWorlds(false);
    setSaved({ ...saved, mode: next });
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 600px), (pointer: coarse)").matches) setShowWorlds(false);
    setMessage("Welcome to " + MODES[next].name + "!");
    if (view === "trail") {
      const nextProgressKey = next === "bubbles" ?
        (settings.easy ? "easyShooterProgress" : "shooterProgress") :
        (settings.easy ? "easyProgress" : "progress");
      setTrailPage(pageForLevel(saved[nextProgressKey][next]));
    }
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

  function showPath() {
    if (busyRef.current) return;
    clearSelection();
    setTrailPage(pageForLevel(saved[progressKey][mode]));
    setView("trail");
  }

  function startTrailLevel(level) {
    if (busyRef.current || !Number.isSafeInteger(level) || level < 1 ||
        level > saved[progressKey][mode]) return;
    setSaved(previous => {
      const old = previous[gameKey][mode];
      const replacement = old.level === level && !old.won ? old : (mode === "bubbles" ? makeShooterLevel(level, size) : makeLevel(mode, level, size));
      return { ...previous, [gameKey]: { ...previous[gameKey], [mode]: replacement } };
    });
    clearSelection();
    setMessage("Enjoy Level " + level + "!");
    setView("play");
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

  // Keep the piece visibly attached to the finger. The puzzle doesn't commit
  // until release, so a partial drag or cancelled touch cannot consume a turn.
  function onPointerDown(event, index) {
    if (rules.mechanic !== "swap" || game.won || busyRef.current || pointer.current) return;
    if (event.isPrimary === false || (event.pointerType === "mouse" && event.button !== 0)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const board = event.currentTarget.parentElement;
    const styles = window.getComputedStyle(board);
    const gapX = Number.parseFloat(styles.columnGap) || 0;
    const gapY = Number.parseFloat(styles.rowGap) || 0;
    pointer.current = {
      index, id: event.pointerId,
      x: event.clientX, y: event.clientY,
      cellWidth: rect.width + gapX, cellHeight: rect.height + gapY,
      moved: false
    };
    try { event.currentTarget.setPointerCapture(event.pointerId); }
    catch { /* Event remains usable on browsers without capture. */ }
  }

  function onPointerMove(event) {
    const origin = pointer.current;
    if (!origin || origin.id !== event.pointerId || busyRef.current) return;
    const preview = dragPreview({
      index: origin.index, size,
      dx: event.clientX - origin.x, dy: event.clientY - origin.y,
      cellWidth: origin.cellWidth, cellHeight: origin.cellHeight
    });
    if (preview.active) {
      if (!origin.moved) { setSelected(null); setHint([]); }
      origin.moved = true;
      setDrag({ index: origin.index, ...preview });
    } else if (origin.moved) {
      setDrag(null);
    }
  }

  function onPointerUp(event) {
    const origin = pointer.current;
    if (!origin || origin.id !== event.pointerId) return;
    pointer.current = null;
    const preview = dragPreview({
      index: origin.index, size,
      dx: event.clientX - origin.x, dy: event.clientY - origin.y,
      cellWidth: origin.cellWidth, cellHeight: origin.cellHeight
    });
    const wasDragging = origin.moved || preview.active;
    setDrag(null);
    if (!wasDragging) return; // A stationary touch remains a normal tap-to-select.

    // Browsers can synthesize a click after pointerup; do not double-submit.
    suppressClickUntil.current = Date.now() + 650;
    clearSelection();
    if (preview.ready && preview.target !== null && !busyRef.current) {
      takeTurn(origin.index, preview.target);
    } else {
      setMessage("Slide a piece onto a neighbor, then let go.");
    }
  }

  function onPointerCancel(event) {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    setDrag(null);
    suppressClickUntil.current = Date.now() + 650;
  }


  return (
    <div className={"app-root" + (settings.easy ? " easy-see" : "") + (settings.highContrast ? " high-contrast" : "") + (settings.motion ? " motion-active" : "")}
      style={motionCssVariables(visualSpeed)}>
      <header className={"hero" + (menuOpen ? " menu-open" : "")}>
        <button type="button" className="mobile-menu-trigger"
          aria-label={menuOpen ? "Close game menu" : "Open game menu"}
          aria-expanded={menuOpen} aria-controls="meeklee-game-menu"
          onClick={() => {
            // A sticky bar can be tapped mid-page. Bring its dropdown into view.
            if (!menuOpen && window.scrollY > 0) window.scrollTo({ top: 0, behavior: "auto" });
            setMenuOpen(!menuOpen);
            if (menuOpen) { setShowWorlds(false); setShowSettings(false); }
          }}>
          <span className="mobile-menu-brand">🌼 MeekLee <span>Adventures</span></span>
          <span className="mobile-menu-action">{menuOpen ? "✕ Close" : "☰ Menu"}</span>
        </button>
        <div className="hero-content">
        <div className="sun" aria-hidden="true">☀️</div>
        <div className="brand-mark" aria-hidden="true">🌼</div>
        <p className="eyebrow">A little world of happiness</p>
        <h1>MeekLee <span>Adventures</span></h1>
        <p className="tagline">An endless puzzle garden, made with love.</p>
        <div className="promise">
          <span>💗 No payments</span><span>🌈 No timers</span><span>✨ No limits</span>
        </div>
        </div>
      </header>
      <main className="main-shell">
        <nav id="meeklee-game-menu" className={"mobile-quickbar" + (menuOpen ? " menu-open" : "")} aria-label="Game menu">
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
            <button type="button" className="comfort-button" disabled={busy || !settings.motion}
              aria-label={"Animation pace, " + (settings.motionSpeed === "relaxed" ? "relaxed" : "quick")}
              onClick={() => setSaved({
                ...saved,
                settings: { ...settings, motionSpeed: settings.motionSpeed === "relaxed" ? "classic" : "relaxed" }
              })}>
              🐢 Animation pace: <strong>{settings.motionSpeed === "relaxed" ? "Relaxed" : "Quick"}</strong>
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
                  <em>Level {(world.id === "bubbles" ?
                    saved[settings.easy ? "easyShooterGames" : "shooterGames"].bubbles :
                    saved[settings.easy ? "easyGames" : "games"][world.id]).level.toLocaleString()}</em>
                </span>
              </button>
            ))}
          </div>}
        </section>
        {view === "trail" ? (
          <LevelTrail mode={mode} page={trailPage} unlocked={saved[progressKey][mode]}
            current={game.level} onPage={setTrailPage} onLevel={startTrailLevel}
            onBack={() => {
              setMenuOpen(true);
              setShowWorlds(true);
              setShowSettings(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }} />
        ) : mode === "bubbles" ? (
          <BubbleShooter game={game} settings={settings} onPath={showPath}
            onChange={nextGame => setSaved(previous => {
              const high = { ...previous[progressKey] };
              if (nextGame.won) high.bubbles = Math.max(high.bubbles, nextGame.level + 1);
              return {
                ...previous,
                [gameKey]: { ...previous[gameKey], bubbles: nextGame },
                [progressKey]: high
              };
            })}/>
        ) : (
        <section className="play-section" aria-labelledby="level-heading">
          <div className="game-panel" style={{ "--world-accent": rules.color }}>
            <div className="game-heading">
              <div>
                <p className="eyebrow world-label">{rules.name}</p>
                <h2 id="level-heading">Level {game.level.toLocaleString()}</h2>
              </div>
              <button type="button" className="map-shortcut" disabled={busy} onClick={showPath}
                aria-label="Open Adventure Path">🗺️ Path</button>
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
            {game.won && !busy ? (
              <div className="trail-victory" role="status">
                <div className="victory-garden" aria-hidden="true">🌼 🎉 🌷</div>
                <h3>Level {game.level} Complete!</h3>
                <p>Beautifully done! Your marker moved one step farther along the Adventure Path.</p>
                <div className="victory-results"><span>⭐ {game.score.toLocaleString()} points</span><span>🌟 {game.moves} moves</span></div>
                <button className="trail-play" type="button" onClick={showPath}>🌼 See My Adventure Path →</button>
                <p className="victory-no-rush">No rush. Your next adventure is ready whenever you are.</p>
              </div>
            ) : (
            <div className={"board-wrap" + (busy ? " is-animating" : "")}>
              {stage?.type === "pop" && (
                <div key={"combo-" + animation.index} className={"combo-toast" + (stage.combo >= 2 ? " big-combo" : "")}
                  aria-hidden="true">
                  <span>{stage.combo >= 2 ? "COMBO ×" + stage.combo + "!" : "Lovely match!"}</span>
                  <small>+{stage.gained} points ✨</small>
                </div>
              )}
              <div className={"game-board " + (rules.gravity === "up" ? "floaty" : "")}
                ref={boardRef}
                style={{ "--grid-size": size, "--meeklee-active-pop-ms": stage?.type === "pop" ? stageDuration(stage, visualSpeed) + "ms" : undefined,
                  "--meeklee-gravity-bounce": rules.gravity === "up" ? "-6px" : "6px" }}
                role="group" aria-label={rules.name + " puzzle board, " + size + " by " + size}
                aria-busy={busy}
                >
                {shownBoard.map((piece, index) => {
                  const move = movements.get(index);
                  const swappedFrom = stage?.type === "swap" && stage.indices?.includes(index) ?
                    (stage.indices[0] === index ? stage.indices[1] : stage.indices[0]) : null;
                  const from = move ? move.from : swappedFrom;
                  const tileStyle = from == null ? undefined : {
                    "--shift-x": (((from % size) + size) % size - (index % size)) * (animation?.cellX || 50) + "px",
                    "--shift-y": (Math.floor(from / size) - Math.floor(index / size)) * (animation?.cellY || 50) + "px"
                  };
                  const matching = stage?.type === "pop" && stage.matched.includes(index);
                  const lifted = drag?.index === index && !busy;
                  const dropTarget = drag?.target === index && drag?.ready && !busy;
                  const fingerStyle = lifted ? {
                    transform: "translate3d(" + drag.x + "px," + drag.y + "px,0) scale(1.075)",
                    transition: "none"
                  } : undefined;
                  return (
                    <button type="button" key={(animation ? animation.index + "-" : "idle-") + index}
                      disabled={busy}
                      className={"tile " + (selected === index && !busy ? "selected " : "") +
                        (hint.includes(index) && !busy ? "hint " : "") +
                        (matching ? "fx-pop " : "") +
                        (stage?.type === "fall" ? "fx-fall " : "") +
                        (swappedFrom !== null ? "fx-swap " : "") +
                        (move?.fresh ? "fx-new " : "") +
                        (lifted ? "finger-dragging " : "") +
                        (dropTarget ? "finger-drop-target " : "")}
                      style={lifted ? { ...tileStyle, ...fingerStyle } : tileStyle}
                      aria-label={rules.pieces[piece] + ", row " + (Math.floor(index / size) + 1) +
                        ", column " + (index % size + 1)}
                      aria-pressed={!busy && selected === index}
                      onPointerDown={event => onPointerDown(event, index)}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerCancel={onPointerCancel}
                      onLostPointerCapture={onPointerCancel}
                      onClick={() => {
                        if (Date.now() >= suppressClickUntil.current) chooseTile(index);
                      }}>
                      <span aria-hidden="true">{rules.pieces[piece]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            )}
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

          </div>
          <aside className="side-note">
            <div className="note-flower">💐</div>
            <h2>Made for Mom</h2>
            <p>Take your time. Enjoy the colors. There are no lives to lose and no doors that only money can open.</p>
            <p>Finish a level, and a new one grows. The garden just keeps going.</p>
            <div className="note-quote">“Just one more level!”</div>
          </aside>
        </section>
        )}
      </main>
      <footer>MeekLee Adventures · Made with love, not microtransactions. ❤️</footer>
    </div>
  );
}
