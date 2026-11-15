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

## Easy-to-See mode for phones

For smaller screens (600px wide or less), **Big pieces** and **Clear contrast** default to ON:

- The puzzle board is **6×6**, making the pieces noticeably larger, not merely scaling their pictures.
- Larger text, bold labels, high-contrast outlines and generous **at least 44px** touch targets on 320px-wide phones.
- The large header is compact on phones, with the other puzzle worlds behind a large "Change puzzle world" button.
- Each setting can be switched using labeled buttons above the puzzle.
- "Big pieces" OFF restores the traditional 8×8 board. Both board sizes keep their own saved game state.
- An existing original 8×8 local save is preserved, and the large-board mode inherits its current level number when first added.
- Every puzzle uses recognizable symbols, not color-only distinctions, and can be played through tap-tap controls without precise dragging.
- Phone browser zoom is not disabled. Reduced-motion preferences are honored.

The display preferences are saved locally on each device. No account or subscription is required.

### Accessibility verification

In addition to puzzle generation tests, the GitHub Actions workflow runs real Chromium tests at **320px** and **390px** screen widths, checks board tile dimensions, lateral overflow, tapping with hints, saving/reloading, switching puzzle size, and the desktop default. They don't replace testing on Mom's actual phone, with her preferred device zoom and accessibility settings.

## Mobile board-first layout and match animations

MeekLee now keeps the **game board near the top of the phone screen**. On phones up to 600px wide, the old full-size hero and expanded settings/world cards collapse into two clearly labeled buttons: **🌍 Worlds** and **🔎 Display**. The display preferences still persist between sessions, and the full controls are available with one tap.

When **Animations** is ON, every legal move plays an actual sequence from the puzzle engine:

- Neighboring pieces slide as they swap.
- Matching pieces brighten and pop.
- Existing pieces visibly fall or float into their new positions as appropriate to their world, and new pieces enter from the board edge.
- Natural cascades display **COMBO ×2**, **COMBO ×3**, and so on, with the actual earned points.

The visual frames come from the deterministic puzzle rules, not from random decoration. Inputs are locked for the short animation to prevent accidental double moves; score and saves commit once the turn completes. Extremely long cascades shorten their presentation so no one is stuck waiting.

The Display menu has an **✨ Animations ON/OFF** option. The preference is saved locally; devices requesting reduced motion default to OFF. Turning it off applies game results immediately without the animated sequence. All animations use CSS and no paid libraries or third-party assets.

The automated Playwright phone tests cover the compact view, board placement, saving/reloading, real match → pop → fall transitions, and reduced motion. Actual device testing is still recommended to confirm comfort and animation timing for Mom.
