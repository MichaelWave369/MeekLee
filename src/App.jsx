import { useEffect, useRef, useState } from "react";
import { MODES, SIZE, adjacent, connectedGroup, connectedBouquet, pumpkinHarvest, moonlightHarvest, moonPhase, KITCHEN_RECIPES, kitchenNextIngredient, findMatches, makeBoard, makeLevel, neighbors, playTurn, rngFrom } from "./core.js";
import { SAVE_KEY, createSaveState } from "./save.js";
import { dragPreview } from "./drag.js";
import LevelTrail from "./LevelTrail.jsx";
import BubbleShooter from "./BubbleShooter.jsx";
import Garden, { CompanionBadge } from "./Garden.jsx";
import BonusBloom from "./BonusBloom.jsx";
import CardCorner from "./CardCorner.jsx";
import {recordRookTransition} from "./rook-night.js";
import {
  isChestClaimable, totalAvailableChests, claimChapterChest, completeBonus,
  gardenInventory, selectCompanion, toggleDecoration, placeGardenVillageDecor, storeGardenVillageDecor, playGardenVillageActivity, strollGardenVillage, interactGardenVillageLandmark, recordJigsawGardenReward,
  recordMeadowReward, meadowPrizeForLevel, recordPumpkinReward, pumpkinPrizeForLevel,
  recordMoonlightReward, moonlightPrizeForLevel,
  recordKitchenReward, kitchenPrizeForLevel
} from "./collection.js";
import { nextShooterLevel, retryShooter } from "./shooter.js";
import { pageForLevel } from "./trail.js";
import { motionCssVariables, stageDuration } from "./motion.js";
import { WORLD_POWER_LABELS, awardWorldTurn, redeemWorldPower, nextWorldLevel, worldStars } from "./world-powers.js";

const WORLDS = [
  { id: "harvest", icon: "🌻", name: "Harvest Valley", desc: "Swap crops to grow a cheerful garden." },
  { id: "sweets", icon: "🍬", name: "Sugar Mountain", desc: "Sweet combinations and cascading treats." },
  { id: "rescue", icon: "🐾", name: "Critter Rescue", desc: "Tap matching groups to help the animals." },
  { id: "bubbles", icon: "🫧", name: "Bubble Lagoon", desc: "Aim, bounce and pop colorful bubbles." },
  { id: "meadow", icon: "🌷", name: "Flower Meadow", desc: "Tap diagonal bouquets of 3+ flowers. Larger clusters scatter pollen!" },
  { id: "pumpkin", icon: "🎃", name: "Pumpkin Patch", desc: "Gather matching crops across rows and columns; big harvests create leaf gusts!" },
  { id: "moonlight", icon: "🌙", name: "Moonlight Orchard", desc: "Gather fruits within a growing moonlit halo. Crescent, half and full moon!" },
  { id: "kitchen", icon: "🥣", name: "Grandma's Kitchen", desc: "Find the next ingredient in order and finish cozy pretend recipes, one dish at a time!" }
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
  if (["tap","bouquet","cross","moon","recipe"].includes(MODES[game.mode].mechanic)) {
    const mechanic=MODES[game.mode].mechanic;
    if(mechanic==="recipe"){
      const next=kitchenNextIngredient(game);
      const index=game.board.indexOf(next);
      return index>=0?[index]:[];
    }
    for (let i = 0; i < game.board.length; i++) {
      const group=mechanic==="moon"?
        moonlightHarvest(game.board,i,size,moonPhase(game.moves).radius):
        mechanic==="cross"?pumpkinHarvest(game.board,i,size):
        mechanic==="bouquet"?connectedBouquet(game.board,i,size):
        connectedGroup(game.board,i,size);
      if(group.length>=(mechanic==="tap"?2:3))
        return (mechanic==="cross"||mechanic==="moon")?[i]:group;
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
  const [cardStartAt,setCardStartAt]=useState(null);
  const [trailPage, setTrailPage] = useState(0);
  const [activeBonusId, setActiveBonusId] = useState(null);
  const [gardenReturnView, setGardenReturnView] = useState("play");
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
  const worldPowers = WORLD_POWER_LABELS[mode];
  const {pets: rescuedPets} = gardenInventory(saved.collection);
  const companion = rescuedPets.find(p => p.id === saved.collection.companion) || null;
  const chestReady = game.won && game.level % 10 === 0 &&
    isChestClaimable(saved,mode,game.level / 10);
  const busy = Boolean(animation);
  const stage = animation?.trace[animation.index] ?? null;
  const visualSpeed = animation?.speed ?? settings.motionSpeed;
  const shownBoard = stage?.board ?? game.board;
  const movements = new Map((stage?.movements ?? []).map(move => [move.to, move]));
  const percent = Math.min(100, Math.round(game.cleared * 100 / game.target));
  const instruction = rules.mechanic === "tap" ?
    "Tap a group of 2 or more matching critters." :
    rules.mechanic === "bouquet" ?
    "Tap 3+ matching flowers touching at edges or corners. Five or more scatter bonus pollen!" :
    rules.mechanic === "cross" ?
    "Tap a crop to gather 3+ matching crops along its row and column. Five or more create a leaf gust!" :
    rules.mechanic === "moon" ?
    "Tap a fruit to gather 3+ matching fruit within its moonlit halo. The halo grows with each moon phase, then starts again. 5+ add stardust!" :
    rules.mechanic === "recipe" ?
    "Read Grandma's recipe card, then tap the three ingredients in the right order. Each finished dish brings a cozy bonus!" :
    mode === "bubbles" ? "Swap neighbors to match 3. Bubbles rise upward!" :
      "Drag a piece onto its neighbor and release, or tap two neighbors to match 3.";
  const mobileInstruction = rules.mechanic === "tap" ? "Tap matching groups of 2+" :
    rules.mechanic === "bouquet" ? "Tap bouquets of 3+; diagonals count!" :
    rules.mechanic === "cross" ? "Tap 3+ matching crops in a row-and-column cross!" :
    rules.mechanic === "moon" ? "Tap 3+ matching fruit in the moon's glowing halo!" :
    rules.mechanic === "recipe" ? "Find the next recipe ingredient in order!" :
    mode === "bubbles" ? "Drag & release to match bubbles!" : "Drag & release to match 3";

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); }
    catch { /* No storage = still playable. */ }
  }, [saved]);

  function clearSelection() { setSelected(null); setHint([]); }

  function commitTurn(result, turnMode = mode, turnGameKey = gameKey, turnProgressKey = progressKey) {
    setSaved(previous => {
      const progress = { ...previous[turnProgressKey] };
      const starsKey = turnGameKey === "easyGames" ? "easyWorldStars" : "worldStars";
      const existingStars = previous[starsKey]?.[turnMode] || {};
      const improvedStars = result.game.won ? {
        ...existingStars,
        [result.game.level]: Math.max(existingStars[result.game.level] || 0, worldStars(result.game))
      } : existingStars;
      if (result.game.won) progress[turnMode] = Math.max(progress[turnMode], result.game.level + 1);
      const previousGame=previous[turnGameKey]?.[turnMode];
      const collection=turnMode==="meadow"&&result.game.won?
        recordMeadowReward(previous.collection,previousGame,result.game):
        turnMode==="pumpkin"&&result.game.won?
        recordPumpkinReward(previous.collection,previousGame,result.game):
        turnMode==="moonlight"&&result.game.won?
        recordMoonlightReward(previous.collection,previousGame,result.game):
        turnMode==="kitchen"&&result.game.won?
        recordKitchenReward(previous.collection,previousGame,result.game):
        previous.collection;
      return {
        ...previous,collection,
        [turnProgressKey]: progress,
        [turnGameKey]: { ...previous[turnGameKey], [turnMode]: result.game },
        [starsKey]: { ...previous[starsKey], [turnMode]: improvedStars }
      };
    });
    const cascades = result.cascades || 0;
    const earned = result.earned || {};
    const rewardText = (earned.small || earned.big) ?
      " Earned " + [
        earned.small ? earned.small + " " + WORLD_POWER_LABELS[turnMode].small.name : null,
        earned.big ? earned.big + " " + WORLD_POWER_LABELS[turnMode].big.name : null
      ].filter(Boolean).join(" and ") + "!" : "";
    setMessage(result.game.won ? "Beautifully done! A new adventure is waiting." :
      result.powerUsed ? WORLD_POWER_LABELS[turnMode][result.powerUsed].name + "! " + result.cleared + " pieces cleared." :
      cascades >= 3 ? "Amazing! " + cascades + " incredible combos!" + rewardText :
      cascades > 1 ? "Wonderful! " + cascades + " combos in a row!" + rewardText :
      "Lovely! " + result.cleared + " pieces collected." + rewardText);
  }

  function animateResult(result) {
    if (settings.motion && result.trace?.length) {
      busyRef.current = true;
      // Long cascades remain playable without trapping someone in an animation.
      const trace = result.trace.length > 16 ?
        [...result.trace.slice(0, 15), { type: "shuffle", board: [...result.game.board] }] : result.trace;
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

  function takeTurn(first, second) {
    if (game.won || busyRef.current) return;
    const result = awardWorldTurn(game, playTurn(game, first, second));
    clearSelection();
    if (!result.valid) {
      setMessage(mode === "rescue" ?
        "Find two or more matching neighbors!" :
        mode === "meadow" ?
        "Gather 3 or more matching flowers. Corners count, too!" :
        mode === "pumpkin" ?
        "Look for three matching crops across one row and column!" :
        mode === "moonlight" ?
        "Choose a fruit with at least three of its kind inside the glowing moon halo!" :
        mode === "kitchen" ?
        "Look at the next ingredient highlighted on Grandma's recipe card!" :
        "Try swapping pieces to make a row of three!");
      return;
    }
    animateResult(result);
  }

  function takeWorldPower(kind) {
    if (!worldPowers || game.won || busyRef.current) return;
    const result = redeemWorldPower(game, kind);
    if (!result.valid) return;
    clearSelection();
    animateResult(result);
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
    if (["tap","bouquet","cross","moon","recipe"].includes(rules.mechanic)) { takeTurn(index); return; }
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
    if (view === "garden" || view === "bonus" || view === "cards") setView("play");
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

  function showCardCorner() {
    if (busyRef.current) return;
    setCardStartAt(null);
    clearSelection();
    setMenuOpen(false);setShowSettings(false);setShowWorlds(false);
    setView("cards");
    if (typeof window !== "undefined") window.scrollTo({top:0,behavior:"auto"});
  }
  function showKitchenNotebook(){
    if(busyRef.current)return;
    clearSelection();
    setCardStartAt("porch");
    setMenuOpen(false);setShowSettings(false);setShowWorlds(false);
    setView("cards");
    if(typeof window!=="undefined")window.scrollTo({top:0,behavior:"auto"});
  }
  function leaveCardCorner() {
    setCardStartAt(null);
    setView("play");
    if (typeof window !== "undefined") window.scrollTo({top:0,behavior:"auto"});
  }
  function saveCardGame(kind,nextGame) {
    if (!["solitaire","rook","parade","war","stack","jigsaw","checkers","backgammon","chess","dice","pyramid","tripeaks","spider","freecell"].includes(kind)) return;
    setSaved(previous=>({
      ...previous,cards:{
        ...previous.cards,
        [kind]:nextGame,
        // Count only actual game transitions; reloading a saved win cannot
        // duplicate Mom's wins, streaks, or trump choices.
        rookStats: kind==="rook" ?
          recordRookTransition(previous.cards.rookStats,previous.cards.rook,nextGame):
          previous.cards.rookStats
      },
      collection:kind==="jigsaw"?
        recordJigsawGardenReward(previous.collection,previous.cards.jigsaw,nextGame):
        previous.collection
    }));
  }

  function showGarden() {
    if (busyRef.current) return;
    setGardenReturnView(view === "garden" || view === "bonus" ? "play" : view);
    clearSelection();
    setMenuOpen(false);setShowSettings(false);setShowWorlds(false);
    setView("garden");
    if (typeof window !== "undefined") window.scrollTo({top:0,behavior:"auto"});
  }
  function leaveGarden() {
    setView(gardenReturnView);
    if (typeof window !== "undefined") window.scrollTo({top:0,behavior:"auto"});
  }
  function openBonus(key) {
    if (!saved.collection.claimed[key]) return;
    setActiveBonusId(key);
    setView("bonus");
    if (typeof window !== "undefined") window.scrollTo({top:0,behavior:"auto"});
  }
  function claimChest(mode, chapter) {
    setSaved(previous => {
      const result=claimChapterChest(previous,mode,chapter);
      return result.valid ? {...previous,collection:result.collection} : previous;
    });
  }
  function changeCompanion(petId) {
    setSaved(previous => ({...previous,collection:selectCompanion(previous.collection,petId)}));
  }
  function plantDecoration(id) {
    setSaved(previous => ({...previous,collection:toggleDecoration(previous.collection,id)}));
  }
  function placeVillageDecoration(id,plot){
    setSaved(previous=>{
      const result=placeGardenVillageDecor(previous.collection,id,plot);
      return result.valid?{...previous,collection:result.collection}:previous;
    });
  }
  function storeVillageDecoration(id){
    setSaved(previous=>{
      const result=storeGardenVillageDecor(previous.collection,id);
      return result.valid?{...previous,collection:result.collection}:previous;
    });
  }
  function playVillageActivity(district,choice){
    setSaved(previous=>{
      const result=playGardenVillageActivity(previous.collection,district,choice);
      return result.valid?{...previous,collection:result.collection}:previous;
    });
  }
  function strollVillage(){
    setSaved(previous=>{
      const result=strollGardenVillage(previous.collection);
      return result.valid?{...previous,collection:result.collection}:previous;
    });
  }
  function interactVillageLandmark(district){
    setSaved(previous=>{
      const result=interactGardenVillageLandmark(previous.collection,district);
      return result.valid?{...previous,collection:result.collection}:previous;
    });
  }
  function finishBonus(key,moves) {
    setSaved(previous => {
      const result=completeBonus(previous.collection,key,moves);
      return result.valid ? {...previous,collection:result.collection} : previous;
    });
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
      const replacement = old.level === level && !old.won && !old.failed ? old :
        (mode === "bubbles" ?
          (old.level === level && old.failed ? retryShooter(old).game : nextShooterLevel(level, size, old)) :
          nextWorldLevel(mode, level, size, old));
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
      [gameKey]: { ...games, [mode]: nextWorldLevel(mode, next, size, game) }
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
          <button type="button" className="quick-toggle" disabled={busy}
            onClick={showGarden}>
            🌷 Garden
          </button>
          <button type="button" className="quick-toggle" disabled={busy}
            onClick={showCardCorner}>🃏 Cards</button>
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
            <span>8 happy worlds</span>
            <button type="button" className="desktop-garden-shortcut" disabled={busy}
              onClick={showGarden}>🌷 Mom's Garden</button>
            <button type="button" className="desktop-garden-shortcut" disabled={busy}
              onClick={showCardCorner}>🃏 Card Corner</button>
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
        {view === "cards" ? (
          <CardCorner key={cardStartAt||"shelf"} startAt={cardStartAt}
            cards={saved.cards} onChange={saveCardGame}
            settings={settings} onBack={leaveCardCorner}/>
        ) : view === "garden" ? (
          <Garden saved={saved} onClaim={claimChest} onSelectPet={changeCompanion}
            onToggleDecor={plantDecoration} onPlaceVillage={placeVillageDecoration}
            onStoreVillage={storeVillageDecoration} onVillageActivity={playVillageActivity}
            onVillageStroll={strollVillage} onVillageLandmark={interactVillageLandmark}
            onVisitWorld={changeWorld} onVisitPorch={showKitchenNotebook}
            onBonus={openBonus} onBack={leaveGarden} />
        ) : view === "bonus" && activeBonusId ? (
          <BonusBloom key={activeBonusId} bonusId={activeBonusId}
            bestMoves={saved.collection.completedBonuses[activeBonusId]}
            onComplete={finishBonus} onBack={() => setView("garden")} />
        ) : view === "trail" ? (
          <LevelTrail mode={mode} page={trailPage} unlocked={saved[progressKey][mode]}
            medals={mode === "bubbles" ? saved[settings.easy ? "easyShooterStars" : "shooterStars"].bubbles :
              saved[settings.easy ? "easyWorldStars" : "worldStars"]?.[mode]}
            current={game.level} onPage={setTrailPage} onLevel={startTrailLevel}
            onGarden={showGarden} companion={companion} settings={settings}
            chestsReady={totalAvailableChests(saved)}
            onBack={() => {
              setMenuOpen(true);
              setShowWorlds(true);
              setShowSettings(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }} />
        ) : mode === "bubbles" ? (
          <BubbleShooter game={game} settings={settings} onPath={showPath}
            onGarden={showGarden} chapterChestReady={chestReady} companion={companion}
            onChange={nextGame => setSaved(previous => {
              const high = { ...previous[progressKey] };
              const starsKey = settings.easy ? "easyShooterStars" : "shooterStars";
              const previousStars = previous[starsKey]?.bubbles || {};
              if (nextGame.won) high.bubbles = Math.max(high.bubbles, nextGame.level + 1);
              return {
                ...previous,
                [gameKey]: { ...previous[gameKey], bubbles: nextGame },
                [progressKey]: high,
                [starsKey]: { bubbles: nextGame.won ? {
                  ...previousStars,
                  [nextGame.level]: Math.max(previousStars[nextGame.level] || 0, nextGame.stars || 1)
                } : previousStars }
              };
            })}/>
        ) : (
        <section className="play-section" aria-labelledby="level-heading">
          <div className={"game-panel"+(mode==="moonlight"?" moonlight-panel":"")} style={{ "--world-accent": rules.color }}>
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
            {mode==="kitchen"&&
              <section className="kitchen-order" aria-label={"Kitchen recipe: "+KITCHEN_RECIPES[game.recipeId].name}>
                <div className="kitchen-order-heading">
                  <div><span aria-hidden="true">🥣</span>
                    <strong>Grandma's Recipe Card</strong>
                    <p>{KITCHEN_RECIPES[game.recipeId].name} · {game.dishes} {game.dishes===1?"dish":"dishes"} served</p>
                  </div>
                  <button type="button" className="kitchen-notebook-link"
                    onClick={showKitchenNotebook}>📖 My Private Family Recipes</button>
                </div>
                <div className="kitchen-steps" role="group" aria-label="Three ordered recipe ingredients">
                  {KITCHEN_RECIPES[game.recipeId].ingredients.map((ingredient,i)=>
                    <div key={i} className={"kitchen-step"+
                      (i<game.recipeStep?" gathered":i===game.recipeStep?" next":"")}
                      aria-label={"Step "+(i+1)+": "+rules.pieces[ingredient]+
                        (i<game.recipeStep?", gathered":i===game.recipeStep?", gather next":", coming next")}>
                      <span aria-hidden="true">{rules.pieces[ingredient]}</span>
                      <strong>{i<game.recipeStep?"✓ Added":i===game.recipeStep?"Gather next":"Step "+(i+1)}</strong>
                    </div>)}
                </div>
                <p className="kitchen-order-note">Playful recipe patterns only.
                  Your family's real recipes stay private in the Family Porch notebook on this device.</p>
              </section>}
            {mode==="moonlight"&&
              <div className="moonlight-phase" role="status" aria-label={"Moon phase: "+moonPhase(game.moves).name}>
                <span className="moonlight-phase-icon" aria-hidden="true">{moonPhase(game.moves).icon}</span>
                <strong>{moonPhase(game.moves).name}</strong>
                <span>Halo reaches {moonPhase(game.moves).radius} {moonPhase(game.moves).radius===1?"space":"spaces"} in every direction.</span>
                <small>Next: {moonPhase(game.moves+1).icon} {moonPhase(game.moves+1).name}</small>
              </div>}
            {game.won && !busy ? (
              <div className="trail-victory" role="status">
                <div className="victory-garden" aria-hidden="true">🌼 🎉 🌷</div>
                <h3>Level {game.level} Complete!</h3>
                <p>Beautifully done! Your marker moved one step farther along the Adventure Path.</p>
                {mode==="meadow"&&meadowPrizeForLevel(game.level)&&
                  <button type="button" className="victory-chest" onClick={showGarden}>
                    {meadowPrizeForLevel(game.level).icon} You've earned the {meadowPrizeForLevel(game.level).name}! Visit Your Garden →
                  </button>}
                {mode==="pumpkin"&&pumpkinPrizeForLevel(game.level)&&
                  <button type="button" className="victory-chest" onClick={showGarden}>
                    {pumpkinPrizeForLevel(game.level).icon} You've earned the {pumpkinPrizeForLevel(game.level).name}! Visit Your Garden →
                  </button>}
                {mode==="moonlight"&&moonlightPrizeForLevel(game.level)&&
                  <button type="button" className="victory-chest" onClick={showGarden}>
                    {moonlightPrizeForLevel(game.level).icon} You've earned the {moonlightPrizeForLevel(game.level).name}! Visit Your Garden →
                  </button>}
                {mode==="kitchen"&&kitchenPrizeForLevel(game.level)&&
                  <button type="button" className="victory-chest" onClick={showGarden}>
                    {kitchenPrizeForLevel(game.level).icon} You've earned the {kitchenPrizeForLevel(game.level).name}! Visit Your Garden →
                  </button>}
                <div className="victory-stars" aria-label={worldStars(game) + " out of 3 stars"}>
                  {"★".repeat(worldStars(game))}<span>{"☆".repeat(3 - worldStars(game))}</span>
                </div>
                <div className="victory-results"><span>⭐ {game.score.toLocaleString()} points</span><span>🌟 {game.moves} moves</span></div>
                {chestReady && <button className="victory-chest" type="button" onClick={showGarden}>
                  🎁 Open Your Chapter Treasure Chest!
                </button>}
                <button className="trail-play" type="button" onClick={showPath}>🌼 See My Adventure Path →</button>
                <p className="victory-no-rush">No rush. Your next adventure is ready whenever you are.</p>
              </div>
            ) : (
            <div className={"board-wrap" + (busy ? " is-animating" : "")}>
              {stage?.type === "pop" && (
                <div key={"combo-" + animation.index} className={"combo-toast" + (stage.combo >= 2 ? " big-combo" : "")}
                  aria-hidden="true">
                  <span>{stage.powerUsed ? "✨ " + worldPowers?.[stage.powerUsed]?.name + "!" :
                    stage.reward?.big ? worldPowers?.big.icon + " " + worldPowers?.big.name + "!" :
                    stage.reward?.small ? worldPowers?.small.icon + " " + worldPowers?.small.name + "!" :
                    stage.pollen?.length ? "POLLEN BLOOM! +" + stage.pollen.length + "!" :
                     stage.gust?.length ? "LEAF GUST! +" + stage.gust.length + "!" :
                     stage.stardust?.length ? "STARDUST! +" + stage.stardust.length + "!" :
                     stage.kitchenDish ? "DISH SERVED! " + stage.kitchenDish + "!" :
                     stage.combo >= 2 ? "COMBO ×" + stage.combo + "!" : "Lovely match!"}</span>
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
            {!game.won && worldPowers && (
              <div className="world-powers-wrap">
                <p className="world-powers-tip">Match 3: {worldPowers.small.icon} · 4+: {worldPowers.big.icon} · 5+: both!</p>
              <div className="world-powers" role="group" aria-label="Earned special powers">
                {(["small", "big"]).map(kind => (
                  <button key={kind} type="button" className={"world-power " + kind}
                    disabled={busy || !(game.powers?.[kind] > 0)}
                    aria-label={"Use " + worldPowers[kind].name + ", " + (game.powers?.[kind] || 0) + " saved, " + worldPowers[kind].action}
                    title={worldPowers[kind].action}
                    onClick={() => takeWorldPower(kind)}>
                    <span>{worldPowers[kind].icon} {worldPowers[kind].name}</span>
                    <strong>×{game.powers?.[kind] || 0}</strong>
                  </button>
                ))}
              </div>
              </div>
            )}
            <div className="game-bottom">
              <span>🌟 {game.moves} moves played</span>
              <CompanionBadge collection={saved.collection} settings={settings} />
              <span>♾️ Play at your own pace</span>
            </div>
            <div className="game-actions">
              <button type="button" className="action secondary"
                disabled={game.won || busy}
                onClick={() => {
                  clearSelection(); setHint(hintFor(game));
                  setMessage(mode==="pumpkin"?"Tap the glowing crop to harvest its row and column!":
                     mode==="moonlight"?"Tap the glowing fruit to gather the moonlit harvest!":
                     mode==="kitchen"?"Tap the glowing ingredient to continue Grandma's recipe!":
                     "Look for the glowing pieces!");
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
