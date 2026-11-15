import React from "react";
import { PAGE_SIZE, pageForLevel, levelStatus, maxPage, levelsForPage } from "./trail.js";

export const WORLD_TRAILS = {
  harvest: { icon: "🌻", title: "Garden Walk", marker: "🌼", scenery: ["🌳","🌾","🏡","🌷"] },
  sweets: { icon: "🍬", title: "Sugar Trail", marker: "🍭", scenery: ["🍩","🍒","🧁","🍬"] },
  rescue: { icon: "🐾", title: "Critter Path", marker: "🐞", scenery: ["🌲","🦊","🍄","🌿"] },
  bubbles: { icon: "🫧", title: "Lagoon Journey", marker: "🐚", scenery: ["🐠","🪸","🐟","⭐"] }
};
export default function LevelTrail({ mode, page, unlocked, current, onPage, onLevel, onBack }) {
  const world = WORLD_TRAILS[mode];
  const start = page * PAGE_SIZE + 1;
  const nodes = levelsForPage(page);
  const accessible = maxPage(unlocked);
  const atCurrentPage = page === pageForLevel(unlocked);
  return (
    <section className={"trail-screen trail-" + mode} aria-label={world.title + " adventure path"}>
      <div className="trail-heading">
        <button type="button" className="trail-back" onClick={onBack}>‹ Worlds</button>
        <div><p className="trail-eyebrow">{world.icon} {world.title}</p>
          <h2>Adventure Path</h2></div>
        <span className="trail-badge">Page {page + 1}</span>
      </div>
      <p className="trail-help">Follow the little {world.marker} along the path. Choose your glowing level to play!</p>
      <div className="trail-landscape">
        <div className="trail-decor decor-one" aria-hidden="true">{world.scenery[0]}</div>
        <div className="trail-decor decor-two" aria-hidden="true">{world.scenery[1]}</div>
        <div className="trail-decor decor-three" aria-hidden="true">{world.scenery[2]}</div>
        <div className="trail-decor decor-four" aria-hidden="true">{world.scenery[3]}</div>
        <svg className="trail-route" viewBox="0 0 300 650" preserveAspectRatio="none" aria-hidden="true">
          <path d="M72 591 C175 567 245 553 226 497 S55 455 71 390 S256 326 227 261 S48 208 76 137 S201 92 225 63" stroke="#ffffffb3" strokeWidth="26" strokeLinecap="round" fill="none"/>
          <path d="M72 591 C175 567 245 553 226 497 S55 455 71 390 S256 326 227 261 S48 208 76 137 S201 92 225 63" stroke="#c9ad87" strokeWidth="15" strokeLinecap="round" strokeDasharray="3 23" fill="none"/>
        </svg>
        <div className="trail-nodes">
          {nodes.map((level, index) => {
            const status = levelStatus(level, unlocked);
            // Zig-zag progression from bottom to top on an easy-to-see illustrated page.
            const col = [24, 53, 74, 70, 42, 24, 40, 74, 67, 39][index];
            const bottom = 5 + index * 9.5;
            return (
              <button key={level} type="button"
                className={"trail-node " + status + (current === level ? " playing" : "")}
                style={{ left: col + "%", bottom: bottom + "%" }}
                disabled={status === "locked"}
                onClick={() => onLevel(level)}
                aria-label={"Level " + level + ", " + status + (status === "current" ? ", play now" : "")}>
                {status === "current" && <span className="trail-marker" aria-hidden="true">{world.marker}</span>}
                <span className="trail-number">{level}</span>
                {status === "completed" && <span className="trail-check" aria-hidden="true">✓</span>}
                {status === "locked" && <span className="trail-lock" aria-hidden="true">🔒</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="trail-controls">
        <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)}>← Previous 10</button>
        <strong>Levels {start}–{start + 9}</strong>
        <button type="button" disabled={page >= accessible} onClick={() => onPage(page + 1)}>Next 10 →</button>
      </div>
      <button className="trail-play" type="button" onClick={() => onLevel(unlocked)}>
        {world.marker} Play Level {unlocked} →
      </button>
      <p className="trail-footnote">Completed levels can be replayed for free. New pages unlock as you finish each ten-level journey.</p>
    </section>
  );
}
