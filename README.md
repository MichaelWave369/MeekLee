# 🌼 MeekLee Adventures

**An endless little puzzle garden, made with love for Mom.**

Named for Mom's maiden name (**Meek**) and middle name (**Lee**). It even sounds like "weekly adventures." ❤️

A completely free React puzzle game with four colorful worlds, generated levels, free retries, earned power-ups, hints, shuffles, and individual local saves. No advertising, payment walls, lives, subscriptions, accounts, or APIs.

## 🔺 Solitaire Garden · Pyramid Solitaire

**Now playable offline:** Pyramid Solitaire joins Klondike in Mom's Card Corner. All 28 pyramid cards start face-up in seven rows. Remove **two exposed cards totaling 13**, or remove an **exposed king** by itself. The top waste card can pair with another available card; covered pyramid cards cannot be played until both cards directly beneath them are removed. Clear all 28 pyramid cards to win. The 24-card draw pile is draw-one, with **two recycles** for a relaxed total of three passes through the stock.

On phones, open **☰ Menu → 🃏 Cards → Pyramid Solitaire**. A scrollable pyramid sits alongside **large accessible action buttons for all exposed cards**, so small card taps aren't required. Hint, undo, new-deal confirmation and automatic local save/resume are supported. All cards, rules and styling use free original MeekLee assets.

Pyramid uses a separately validated `cards.pyramid` save slot. Klondike's existing `cards.solitaire` data, all prior games, Harvest Valley (including high-level saves), garden, pets and other progress are preserved. No accounts, timer, payments or external services.

## 🎲 Family Game House · Five Dice with Pip

**Now playable:** An original, free five-dice game with the familiar Yahtzee-style 13-row scorecard. Choose **Mom vs. Pip** (friendly offline computer opponent) or **Mom solo** before a fresh game. Roll five dice up to three times each turn, tap to hold/release individual dice, then choose one available scorecard category. The score preview is shown before committing; choosing a row uses it forever, even when it scores zero.

The rules include ones through sixes, three/four of a kind, full house, small/large straight, Five Dice (five of a kind), and chance. Reach 63 or more in the six upper rows for a 35-point bonus. After the Five Dice row scores 50, further five-of-a-kind rolls earn a 100-point bonus, with the matching-upper-row obligation and Joker full-house/straight scores. No money or timed play. Games save in a validated, independent `cards.dice` slot and work offline once cached. Mom's existing worlds, pets, other card games and garden remain untouched.

On a phone: **☰ Menu → 🃏 Cards → Five Dice with Pip**. Hold a die with one tap, roll again or select an available row. Play solo without needing Pip.

## ♔ Board Game Nook · Chess with Pip

**Now playable:** Complete offline Chess against Pip, with both sides' legal moves, checks, checkmates, stalemates, safe castling, en passant, four promotion choices and casual draw rules. Select Pip's Gentle or Confident level, use large touch-friendly squares, Hint, Undo Turn and New Game confirmation. Save/resume is independent under `cards.chess`, without changing Mom's garden or any other game. The heuristic bot is not tournament strength.

On a phone: **☰ Menu → 🃏 Cards → Board Game Nook → Chess**. Works offline after caching, with no payment, timer or account.

## 🎲 Board Game Nook · Backgammon with Pip

**Now playable:** a free, offline, no-pressure **Backgammon** match against Pip, with 15 checkers per side and a friendly first-to-five-point score. The 24-point board, opening roll, dice, compulsory maximum number of moves, doubles, blocked points, hits, bar entries, bearing off and single/gammon/backgammon wins use real rules. A friendly doubling cube is included with no financial stakes. The casual family scoring does not claim tournament mode or Crawford/Jacoby conventions.

On a phone open **☰ Menu → 🃏 Cards → Board Game Nook → Backgammon with Pip**. The board scrolls horizontally if necessary; the same legal moves are always displayed as large buttons, so no tiny pieces need to be dragged. A move hint and full-turn undo are available. After a game ends, start the next game within the five-point match or begin a fresh match with confirmation.

Games are saved separately under `cards.backgammon`; existing puzzle worlds, garden, checkers, Rook and Solitaire remain untouched. The bot runs offline without subscriptions or an external server. Read the [Family Game House roadmap](docs/FAMILY_GAME_HOUSE_ROADMAP.md) for future Chess, more Solitaire variants and worlds.

## ♟️ Board Game Nook · Checkers with Pip

**Now playable:** free, offline, phone-friendly **American Checkers** against Pip. Mom controls red; Pip controls blue. The game enforces 8×8 standard moves, mandatory captures, multi-jumps with the same piece, king promotion, and king movement in both directions. Human-friendly hints, turn-level undo, automatic saves, and a no-pressure new game button are included.

On a phone, open **☰ Menu → 🃏 Cards → Checkers with Pip** in the new Board Game Nook section. Tap a red piece and then a glowing destination. If a jump is available, it must be taken. Pip plays his turn automatically. Every match uses its own `cards.checkers` save, so Harvest Valley, Mom's garden, other puzzle worlds, and the rest of Card Corner are untouched.

**Chess and Backgammon are now playable offline**, alongside Checkers. The [Family Game House roadmap](docs/FAMILY_GAME_HOUSE_ROADMAP.md) tracks the next stage.

## 🌼 Family Game House · More ways to play

The expanded **Card Corner** now contains **War (Mom vs. Pip)**, **Stack & Bloom** (an original 1–12 stockpile-card race inspired by traditional family card play), and the original Solitaire, Rook, and Color Parade. Stack & Bloom offers short and longer deals, shared numbered building piles, wild stars, four discard piles and an offline Pip opponent.

**Klondike Solitaire** now offers *draw one* or *draw three* when starting a new deal, plus mouse and touch drag-to-place on the tableau/foundations. The original tap-to-select, hints, undo, and old draw-one saves still work.

The **Picture Puzzle Porch** has three original illustrated scenes (Harvest Valley, Pip's Garden, Bubble Lagoon) with 9-, 16- and 25-piece swap puzzles. Completing a scene at each size can unlock **nine new garden decorations**. Your chapter chests, companions and puzzle-world levels remain unchanged.

The **Family Porch** is an intentionally *private notebook* for game suggestions, recipes and stories saved on the current phone. You can explicitly share a note through the phone's share sheet or clipboard, but there is no public posting, automatic synchronization, or account requirement. Public game requests can use the GitHub issue template with a free GitHub account.

**Next, not yet playable:** additional Solitaire variants, more genuinely distinct puzzle worlds and new garden life. A moderated, consent-based family recipe/story community is a separate future project, not something to release without privacy protections.

See [Family Game House roadmap](docs/FAMILY_GAME_HOUSE_ROADMAP.md) for the staged plan and safe migration/test expectations.

## 🏡 MeekLee's Family Table (online Rook preview + server)

Card Corner now includes an optional **Family Rook Table**: a cozy, accessible room for four relatives to play together, with bots in empty seats, spectators, private invitations, reconnectable seats and text chat. Late spectators can ask to take a bot chair at the next fresh hand.

**Important:** GitHub Pages alone cannot host real-time rooms. Until a separate Cloudflare Durable Object Worker is deployed and its URL configured, this menu option shows a clearly labelled **design preview**, not a live multiplayer room. Offline Rook and every other game work normally.

The full server and testable multiplayer implementation is in [family/README.md](family/README.md), including Free-plan hosting setup, privacy limitations and deployment instructions. No online accounts or subscriptions are required of players; server deployment does require a Cloudflare account. Voice chat is not included in v1.

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

## Finger-follow swipe controls (mobile and mouse)

Swap puzzles now support **press → drag → release**:

- Touch a fruit/candy/bubble and slide it toward an adjacent piece. The selected piece visibly lifts and follows the finger. Its neighbor highlights as the valid drop target.
- Release to commit the swap, then watch the existing match, pop, gravity and combo sequence. The board is **not** changed while the finger is down.
- Short movements, ambiguous diagonals, canceled touches and off-board drags snap back without consuming a move.
- If the swap makes no match, it is rejected without consuming a move.
- Tap-to-select then tap a neighboring piece still works, as does desktop mouse dragging.
- Large 6×6 puzzle pieces, high contrast, saved progress and optional match animations are unchanged.
- The controls require no network requests, external services or paid libraries.

Tests cover direction recognition and edge safety, plus a **real simulated touchscreen swipe upward** in Chromium that verifies the source follows the finger, highlights the neighbor, and spends precisely one move only after release. Cancel and simple-tap fallback are also covered.

## Clear, relaxed animations on phones

Mobile players now default to **Relaxed** timing with more time to see each swap, pop, combo and gravity drop. In **🔎 Display**, turn **✨ Animations** ON and select the **🐢 Animation pace** button to switch between **Relaxed** and **Quick**. The preferences save alongside existing progress without changing any puzzle boards or levels.

Motion pacing is shared by the React animation scheduler and the CSS keyframes, using simple measured pixel offsets for cross-browser compatibility. Unlike the earlier version, a saved explicit Animations ON preference is respected even when the phone reports an operating-system reduced-motion setting. For new visitors whose device requests reduced motion, animations still default OFF until explicitly enabled.

Chromium tests check rendered animation names and durations at mobile widths, including simulated reduced-motion devices, and confirm the final move count and saved progress. Phone-specific real-device visual testing remains valuable: browser emulation cannot reproduce every Android GPU or refresh-rate behavior.

## Adventure Path

Every world now has an illustrated, easy-to-see **Adventure Path** with ten numbered level markers per page. The little flower or world character marks Mom's current unlocked level, completed markers get checkmarks, and future levels remain locked until she completes the previous one. Page 2 starts at Level 11, page 3 at Level 21, and the same infinite ten-at-a-time pattern continues.

Use **🗺️ Path** from the puzzle board to see progress. When the objective is completed, the board stops on a large **Level Complete!** screen with score and moves. Tapping **See My Adventure Path** returns to the trail and shows the next unlocked marker. Earlier completed levels can be replayed without reducing the highest unlocked level. Existing progress and saves are retained, with 6×6 and 8×8 progress remaining separate.

All paths and illustrations use local CSS, SVG and original emoji scenery. There are no licensed commercial assets or paid dependencies. The new browser tests cover opening the map, selecting an unlocked level, and the boundary where winning Level 10 unlocks Level 11 and the next path page.

## Bubble Lagoon: an original bubble shooter

Bubble Lagoon is now a **real bubble-shooter world**, not a repainted match-3 board. Tap or drag on the big lagoon arena to choose an angle and release to shoot the bubble. The dotted guide previews the path, including reflections off the side walls. Matching three or more connected hex-grid bubbles clears the group, and any bubbles left disconnected from the ceiling fall away. A launcher shows the current and upcoming bubble, with large **Aim Left**, **Shoot!**, and **Aim Right** buttons for anyone who prefers buttons to precision dragging.

There are **no paid boosters, lives, ads, or timers**. Each shooter level has a generous but finite shot budget. A completed three-bubble match earns a **Pearl Boost** (redeem for three extra balls); four or more earns a **Rainbow Burst** (clear a connected color cluster), with an extra Pearl for matches of five or more. The larger match rewards are saved on that level, and unused boosters carry forward. If the balls and earned boosters run out, she can **retry the same level for free**, with three extra shots on every subsequent attempt (capped at a generous bonus). The high-water level and medals are never lost. When the lagoon is cleared, the Level Complete screen returns to the ten-stop Adventure Path. The bubbles are distinguished by high-contrast symbols (star, heart, flower, diamond, sun) as well as color.

The new deterministic shooter engine has its own \`shooterGames\`, \`easyShooterGames\`, \`shooterProgress\`, and \`easyShooterProgress\` local save slots. Old Bubble Lagoon match-3 saves are retained separately and the shooter inherits each difficulty mode's existing unlocked level on first launch. This keeps all of Mom's existing puzzle progress intact even though the bubble world now uses a completely different mechanic.

Phone and logic tests cover seeded boards, hex adjacency, projectile paths and wall reflections, group popping, free completion by Rainbow Rescue, touch aiming, offline saves, and the Level 10-to-11 path transition. This is original code and artwork rather than a copy of any commercial game.

## Focused full-screen phone play

On phones, **MeekLee Adventures** now opens in a **game-first layout**: the large title and the always-visible **Worlds / Display** controls are replaced by one small, high-contrast, full-width **🌼 MeekLee Adventures · ☰ Menu** bar. It is easy to tap, works as a sticky header while scrolling, and opens a menu containing the same Worlds and Display controls. Close the menu to put the board first again. The menu starts closed on each visit; accessibility settings and progress remain saved unchanged. Desktop keeps its original header and controls.

Bubble Lagoon scales its whole SVG arena uniformly, rather than squishing circles, with a viewport-aware maximum width. On ordinary portrait phones this brings **Shoot** and **Free Rainbow Rescue** into the first screen while retaining large aiming buttons and visible shape symbols. The Adventure Path is more compact too, so **Play Level** is reachable without a long scroll. Extremely short screens may still scroll rather than shrink the pieces below a usable size.

New real Chromium phone tests verify opening/closing the menu, access to the settings and worlds after rotation, a 44px+ menu target, no sideways overflow, visible shooter controls within a 390×780 viewport, and an immediately accessible ten-level map button. The game rules, per-world saved levels, combo timing and shot trajectories are unchanged.


### Bubble Lagoon progression rewards

The shot counter is always visible, while the earned **🦪 Pearl +3** and **🌈 Rainbow Burst** buttons sit inside the unused launcher corners, avoiding extra phone scrolling. Rewards are based on the **actual connected bubble group that pops**, not how many drop from the ceiling. A 3-bubble pop earns one Pearl; 4+ earns one Rainbow; 5+ earns both. Both power-ups have a small cap on the number saved to keep their displays simple and the challenge meaningful. Neither requires payment or watching an ad.

Finishing a level awards **one to three stars** according to unused shots, saved per completed level and displayed under the numbered marker on the **10-stop Adventure Path**. Completing levels 10, 20, 30, etc. also gives **two bonus Pearls when entering the next chapter**. Older Bubble Lagoon local saves are upgraded in place without erasing their bubbles, score, moves, or unlocked level.

Exhausting the shot budget ends the **current attempt**, not the adventure or her account. **Try Again** generates the original deterministic level board with additional balls, at no cost. The initial booster stock is restored on retry. If she has earned an unused Pearl or Rainbow when the last ball is fired, the relevant power-up remains available, so she can still save her attempt.

## Earned special powers in Harvest, Sugar and Critter worlds

All three original tile puzzles now have their own **free, earned power buttons**, without changing the original piece IDs, deterministic level generation, board size, score rules or existing saved game progress.

| World | Pop exactly 3 | Pop 4+ | Pop 5+ |
| --- | --- | --- | --- |
| 🌻 Harvest Valley | 🌱 **Seed Sprout**, collects three crops | 🧺 **Harvest Basket**, clears a whole column | Earn both |
| 🍬 Sugar Mountain | ✨ **Sweet Spark**, collects three candies | 🍭 **Candy Stripe**, clears a whole row | Earn both |
| 🐾 Critter Rescue | 🐾 **Helping Paw**, rescues three critters | 🦊 **Forest Friend**, rescues the most common critter type | Earn both |

Rewards use the largest connected matching group that *actually popped*, including cascades. A sum of unrelated matches does not count as a 4-piece match. Buttons clearly display saved stock, and unused powers carry into later levels (up to nine per type). Boosts trigger actual pop, gravity and cascade effects with the same relaxed phone animations. Using a power does not consume a turn, and new boards stay playable.

Winning awards **one to three stars** depending on how efficiently the puzzle was finished; the best medal is saved per level and displayed on the ten-stop Adventure Path. Classic 8×8 and large 6×6 medals are saved separately, and previously saved games migrate without being erased. Bubble Lagoon keeps its independently earned Pearl/Rainbow and finite-shot mechanic. The three classic worlds still have no lives, turn limits or payments.

Tests cover real 3/4/5-piece matches, each power's deterministic board changes, actual animation frames, saved boosters, world-specific replay, phone accessibility and star persistence.

## Mom's Happy Garden: chapter treasure chests, rescued friends and bonus boards

Every ten levels completed in **any** of the four worlds unlocks a treasure chest for that world and chapter. The chest becomes claimable after finishing Level 10, 20, 30, and so on. Its gift is **deterministic and once-only** across both the 6×6 phone and 8×8 classic modes, so switching board sizes or replaying a level never duplicates rewards. Existing players with milestone progress can also open their already-earned unopened chests.

Each chest opens to reveal three completely free gifts:

1. **One garden decoration.** The garden starts empty and grows into a cheerful CSS-illustrated scene with flowers, trees, a fountain, and more. Earned decorations can be planted or temporarily put away with big buttons. They always stay in Mom's collection.
2. **One rescue companion.** Meet characters such as **Pip the Bunny, Biscuit the Puppy, and Muffin the Kitten**. Select a favorite pet in the garden and it will gently bounce alongside her on Adventure Paths and cheer her on during puzzles. Motion follows MeekLee's existing Animations setting and the device's accessibility preference.
3. **One Treasure Match bonus board.** Each chest unlocks its own deterministic 4×4 memory-matching game with eight picture pairs. There is no timer, move cap, penalty, or paywall. Completing it earns a permanent memory badge with the best recorded number of turns. Boards are replayable at any time, without duplicating chest rewards.

The new **🌷 Garden** button lives inside the compact phone menu. A direct button also appears on the victory screen when completing a chapter, and the Adventure Path has its own Garden shortcut. The desktop world picker includes a Garden link.

### Saving and privacy

The collection is stored in the existing **meeklee-adventures-save-v1** local save, in an isolated \`collection\` object containing claimed chest keys, selected pet, planted decorations, and best bonus-board scores. The migration preserves all original boards, level progress, earned powers and stars. Only a completed milestone can open its chest, and each reward is derived from the world and chapter rather than a paid random prize.

Every garden, bonus game and character uses local React, CSS and emoji symbols. Nothing requires an account or network connection after loading the offline app. All prizes are earned by play. Tests cover ten-level boundaries, old-save migration, no duplicate claims, phone treasure openings, permanent collectibles, bonus board victories and narrow-screen touch targets.

## Mom's Card Corner: three free card games

Tap **☰ Menu → 🃏 Cards** on a phone or **Card Corner** beside the world selector on a desktop. The new hub is independent of the four puzzle worlds and Happy Garden. All three games run locally in the existing offline-first app with automatic saved-game resume, large high-contrast cards and no payments or accounts.

### ♠ Klondike Solitaire
- Familiar draw-one Klondike: a shuffled 52-card deck, seven tableau columns, four suit foundations and a recyclable stock/waste pile
- Move face-up sequences by alternating color and descending rank; build each foundation from Ace to King
- Tap a card, then a target column or foundation to move it, including legal multi-card runs
- **Hint**, **Auto Home**, **Undo**, and a deliberately confirmed **New Deal**
- Red hearts/diamonds and black spades/clubs have large numbers and distinct symbols; the seven columns scroll horizontally *inside* the board on narrow phones to avoid shrinking cards below readable size

### 🐦 Four-player Rook-style partnership table
- **Mom + Pip** versus **Willow + Fern**, three offline computer opponents
- Implements the **41-card Kentucky Discard-style partnership variant**: four colors with ranks 5–14 plus the Bird, nine cards per player, five-card nest, bidding from 70 in increments of five, trump, following the led color when able, and tricks; first partnership to 300 points
- The winning bidder picks up the nest, sets five cards aside, and names trump. The Bird is highest trump. The team that wins the last trick scores nest counters
- Captured counters: 5 = 5, 10 = 10, 14 = 10, Bird = 20. A bidding team that misses the bid loses the bid amount
- Computer players make their own bids, pick nest cards, choose trump and play only legal cards, based on their own hand and public trick information
- Rook has many regional variants. This first version is clearly labeled; it does **not** pretend to implement every house rule or the 57-card version. It uses original symbols rather than Hasbro card art, and is not affiliated with Hasbro

### 🌈 Color Parade, an original Uno-style card game
- Mom competes with three bots to match the top card by **color, number, or action symbol**, or choose a new color with a Wild
- An original 108-card deck with four cheerful colors and Skip, Reverse, Take Two, and Wild cards
- Draw a single card or play, then end the turn. First to empty their hand wins a round; scores are accumulated for remaining opponent cards, aiming for 200
- This is a familiar game *type* with original naming, interface and original card graphics, **not** the UNO brand, printed cards, or official licensed product

### Saving, accessibility and testing

Each card game has an isolated local save under \`cards.solitaire\`, \`cards.rook\`, or \`cards.parade\` in the existing \`meeklee-adventures-save-v1\` record. Existing puzzle levels, powers, garden decorations and bonus matches remain untouched. Games auto-resume on reopening Card Corner. No account or remote service is used for bots.

Automated engine tests cover Klondike's 52 unique cards, legal red/black descending tableau runs, foundations, recycling and undo; Rook's 41-card deal, bidding, kitty, follow-color enforcement, tricks, scoring and many full bot games; and Color Parade's action cards, wild colors, draws, reshuffles and complete multi-bot matches. Phone browser tests cover each game at 390px and 320px, menu navigation, saving/reloading, and readability without horizontal page overflow.


### Rook Family Game Night

The Rook table now feels like a cozy family kitchen game night, with warm wood-texture table edges, bright readable cards, a welcome sign, and three distinct computer-player personalities. **Pip** cheers Mom as her teammate, **Willow** offers thoughtful competitive encouragement, and **Fern** provides playful challenges. Their remarks respond to public bids, trick outcomes, turn changes, and the final score; they never look at hidden opponent cards or change the actual Rook rules.

When Mom and Pip win the match, the victory screen shows a special trophy, Pip's congratulations, and a gentle burst of decorative confetti. The confetti is disabled when **Animations** is switched off (and new reduced-motion visitors have animations off by default). Winning and losing messages remain readable without any motion.

A compact **🏆 Rook Records** panel expands on tap to reveal locally saved statistics:
- Games played and partnership wins
- Current and best consecutive-win streak
- Total hands completed
- Favorite trump color, counted **only when Mom personally names trump**, not when the other players do

Stats are updated only on real game transitions. Reloading a completed match, reopening Card Corner, starting a new deal, or reviewing the victory screen does **not** award duplicate wins. All records migrate safely into \`cards.rookStats\` in the existing local save. Existing Solitaire, Color Parade, puzzle and Happy Garden progress remains intact. No analytics service, account, ads, purchases, or new dependency is required.

Phone-browser regressions exercise the kitchen-table scene, individual bot remarks, tap-to-expand records, Mom's trump selection and reload, real last-trick victory and single-count stats, celebratory confetti, and a 320px reduced-motion layout. The original multi-round bidding/trick/scoring engine tests remain in place.
