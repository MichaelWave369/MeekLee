# 🌼 MeekLee Adventures

**An endless little puzzle garden, made with love for Mom.**

Named for Mom's maiden name (**Meek**) and middle name (**Lee**). It even sounds like "weekly adventures." ❤️

A completely free React puzzle game with four colorful worlds, generated levels, unlimited turns, hints, shuffles, and individual local saves. No advertising, payment walls, lives, subscriptions, accounts, or APIs.

## Play online

**GitHub Pages:** https://michaelwave369.github.io/MeekLee/

The game deploys from `main` using `.github/workflows/pages.yml` and a production Vite build in `dist/`.

### One-time GitHub Pages setting

If the URL gives a 404 or the Publish MeekLee Adventures workflow fails because the site is not configured:

1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, set **Source: GitHub Actions**.
3. Run **Actions → Publish MeekLee Adventures → Run workflow** on `main`, or push a new commit to `main`.
4. When the deployment is green, use **https://michaelwave369.github.io/MeekLee/**.

This is a GitHub **project** site. `vite.config.js` sets `base: "/MeekLee/"` so the bundled assets load at the correct path.

## Puzzle worlds

| World | Mechanics |
| --- | --- |
| 🌻 Harvest Valley | Swipe or tap-swap crops to match 3+ |
| 🍬 Sugar Mountain | Sweet matches and cascades |
| 🐾 Critter Rescue | Tap connected groups of 2+ |
| 🫧 Bubble Lagoon | Match pieces that rise upward |

All modes have deterministic endless levels, reproducible seeds, legal-move checks, free hints and shuffles, and gentle difficulty waves. Each world remembers its own progress.

## Running locally

Requires Node.js 20.19+:

```bash
npm install
npm run dev
```

Open the URL printed by Vite (the app uses the `/MeekLee/` base path). Other commands:

```bash
npm run check
npm run build
npm run preview
```

## Offline and privacy

The GitHub Pages production build generates a service worker from the exact files emitted by Vite. After the initial online load, subsequent visits can work without a connection. The game uses the browser's `localStorage` under `meeklee-adventures-save-v1`. Switching from the earlier vanilla JavaScript version to React **preserves that save key and game object format**.

Progress is stored on each device, not synchronized across phones. Clearing browser/site data may delete it. Export/import save backup is a planned improvement.

## Testing

The existing unit tests exercise deterministic generation across 800 levels, swaps, connected groups, cascades, invalid moves, completion, and replayability. Another test drives legal turns through 100 generated levels. CI also checks the React production build and service-worker creation. Actual mobile-browser play testing remains important before calling the game a finished release.

## Future additions

- Larger text, optional animations and music, comfort settings
- Original animated maps, characters, objectives, and reward gardens
- Save backup/export and restore
- Touchscreen testing on Mom's own device

**Made with love, not microtransactions.** ❤️
