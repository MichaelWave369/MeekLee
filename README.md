# 🌼 MeekLee Adventures

**An endless little puzzle garden, made with love for Mom.**

MeekLee Adventures is a free, original, browser-based puzzle game inspired by the relaxing appeal of colorful matching and group-clearing puzzles. Its name is a family tribute. There are no ads, lives, payments, subscriptions, timers, or daily energy limits. If you want to play another level, you play another level.

## Play

Open \`index.html\` using a local HTTP server or visit the GitHub Pages deployment once enabled. The simplest local option with Python:

\`\`\`bash
python -m http.server 8000
\`\`\`

Then visit \`http://localhost:8000\`. Opening \`index.html\` as a \`file://\` URL directly will not load ES modules reliably.

### Four little worlds

| World | Rules |
| --- | --- |
| 🌻 Harvest Valley | Swap neighboring crops to make 3+ in a line |
| 🍬 Sugar Mountain | Match sweets and enjoy cascading combinations |
| 🐾 Critter Rescue | Tap connected groups of 2+ animals to clear them |
| 🫧 Bubble Lagoon | Match bubbles while new pieces float up from below |

Every world has its own level and save. Use tap-tap or swipe gestures for swap puzzles, a tap for group clearing, **Free hint** for a suggested move, and **Free shuffle** for a fresh solvable board.

## Infinite-level design

Levels are reproducibly generated from a world ID and integer level number. The generator avoids pre-existing line matches on initial swap boards, confirms there is at least one legal move (or connected group), and rebuilds the board when there are no legal actions. Level goals rise and fall in gentle nine-level cycles instead of becoming arbitrarily punishing. Moves are tracked only for fun; they are **never limited**.

This is an initial playable foundation. It is **not** a mathematical proof that every finite board can be finished in a specified number of turns, because there is no turn limit. Valid actions always remain available and free reshuffling is unlimited.

## Privacy and offline play

No third-party analytics, ads, API keys, accounts, or backend. Save data lives locally under \`meeklee-adventures-save-v1\` in your browser, one saved game per world. Installed browsers can cache the app shell with a service worker for offline sessions after the first successful online visit. Clearing site data removes progress, so eventual import/export backup is on the roadmap.

Typography tries a Google-hosted font but automatically falls back to local fonts when offline; gameplay has no font dependency.

## Development

Requires Node 20+ for automated checks. Runtime gameplay has **zero dependencies**.

\`\`\`bash
npm run check
\`\`\`

Tests cover 800 generated levels across all four worlds, deterministic seeds, valid swaps, group clears, invalid actions, no turn caps, and win progression.

## Roadmap

- Expanded goals and obstacles, character animations, and authored world maps
- Bonus adventures and optional collectibles (all free)
- Larger accessibility and comfort settings for Mom
- Save export/import, high-quality original illustrations, sound effects with mute
- PNG app icons and compatibility checks across Android, desktop, and tablets
- Real-device touch and offline QA before a formal v1 release

**Made with love, not microtransactions.** ❤️

Code is licensed according to the repository's LICENSE file. Original artwork and characters should remain distinct from commercial puzzle game franchises.
