# MeekLee Family Game House · expansion roadmap

MeekLee began as a gift for Mom. Keep the game **free, cozy, accessible, offline where possible, and respectful of every saved level, pet and garden ornament**.

## This expansion: playable and tested

1. **War**: 52-card game against Pip, full tie-triggered War rounds, automatic card collection, saved rounds, and no timer.
2. **Stack & Bloom**: original-numbered-card stockpile race inspired by the familiar 1–12 family game, using original MeekLee naming and art. Four shared building piles, four personal discard piles, wild stars, two-player bot, 10-card quick and 30-card classic starting stocks. Free and offline.
3. **Picture Puzzle Porch**: three fully original vector illustrations (Harvest Valley, Pip's Garden, Bubble Lagoon), swappable image pieces, 3×3/4×4/5×5 difficulty, touch and desktop drag, save/resume, and nine unique earned garden decorations.
4. **Klondike Solitaire**: retain default draw-one; optional draw-three on the next deal and touch/mouse drag onto columns and suit foundations, with tap controls, hints and undo still supported.
5. **Garden**: nine new rewards for finishing each illustration at each difficulty, independently from the original chest schedule and old progress.
6. **Family Porch**: private device notebook for game suggestions, family recipes, and stories. Native share/copy lets relatives deliberately send entries to one another. No public uploads or account requirement. A separate GitHub issue form accepts public game requests from people who have GitHub accounts.

The key `meeklee-adventures-save-v1` and original four world engines remain unchanged. All new games store separate slots under `saved.cards`. The notebook has an independent local storage key. Completing a picture writes its award in the same state update as the completed puzzle.

## Solitaire Garden: FreeCell Solitaire

**Now playable and offline:** 52 unique cards, all face-up in eight columns (seven in each of the first four, six in the rest), with four single-card free cells and four suit foundations. Tableau builds alternate color and descend by one rank; foundation builds ascend by suit from Ace to King. An exposed card may move to an empty free cell or legal tableau/foundation. Any properly ordered contiguous descending alternate-color sequence may be moved together, with legal capacity `(empty cells + 1) × 2^(usable empty columns)`; the target empty column does not count as workspace. Foundation placements are permanent. Clear all 52 cards into foundations to win.

Support a scrollable tableau plus large move-source and destination buttons for small-phone touch and keyboard access. Include hints, last-20-move undo, confirmed new deal, blocked-state messaging and validated independent `cards.freecell` save. Test capacity bounds, suit foundation legality, sequence transfers, unique 52-card accounting, win and save isolation at level 6001+.

## Solitaire Garden: Spider Solitaire (one suit)

**Now playable and offline:** 104 distinct card identities across eight identical spade suits, dealt into 10 columns (six cards in each of the first four, five in each remaining column), with the rest as five ten-card stock deals. One top card starts face-up per column. Move descending contiguous runs as a group onto a card one rank higher or into an empty column, reveal concealed cards as exposed, and automatically clear complete 13-card King-to-Ace runs. Win after eight complete runs clear. Stock deals are legal only with a card in every column; no stock recycle.

On phones, provide a horizontally scrollable visual board plus accessible, large run-selection and destination buttons. Add hints, last-20-move undo, blocked-game notice, restart confirmation and isolated validated `cards.spider` save. Test eight-run completion, legal sequences, stock gating, 320px layout, and no regressions for existing games or garden.

## Solitaire Garden: TriPeaks Solitaire

**Now playable and offline:** TriPeaks adds the familiar three-peak overlap game with 28 tableau cards, a 23-card stock and an initial waste card. Only initially exposed base cards may be played; higher cards turn face-up after both directly covering cards are removed. Take a card one rank above or below the top waste, regardless of suit, with Ace/King wrap enabled for relaxed family play. Removed cards become the new waste card and build a streak score; drawing from stock resets the streak. There is **no stock recycle** in TriPeaks. Win by clearing all 28 tableau cards.

Large playable-card buttons make phone play practical without tiny taps, alongside hint, undo, win/stuck notice and confirmation before a fresh deal. The save uses a separately validated `cards.tripeaks` state and never replaces Klondike, Pyramid, gardens, puzzle progress or the other games. Include 320px browser tests, 100 seeded-engine games and save-migration regression.

## Solitaire Garden: Pyramid Solitaire

**Now playable and offline:** Pyramid joins Klondike as an independent Solitaire game. It uses a standard 52-card deck, 28 face-up pyramid cards in seven rows and 24 stock cards. Only cards not covered by the two directly below them can be removed. Two exposed cards totaling 13 form a pair; an exposed king can be removed alone. The top waste card is playable, and two stock recycles allow three relaxed passes. Win by clearing all 28 pyramid cards.

Provide large alternative buttons for exposed cards on small screens, hints, move undo, clear win/stuck messaging, new-deal confirmation, and a separate validated `cards.pyramid` save. Do not migrate or overwrite existing `cards.solitaire` Klondike games, board games, garden pets or high-level puzzle worlds.

**Still next:** TriPeaks, Spider (one suit first), and FreeCell, each with separate save slots and working gameplay.

## Family Game House: Five Dice with Pip

**Now playable and offline:** Mom's favorite five-dice scorecard game joins Card Corner under MeekLee's original name **Five Dice with Pip**, inspired by the classic Yahtzee-style rules. Five tappable dice, up to three rolls, held-dice indicators and roll persistence, 13 real score categories, the upper-section 63-point threshold/35-point bonus, multiple five-of-a-kind 100-point bonuses, forced upper placement and Joker rules are supported. Pip plays locally with a lightweight heuristic opponent, and solo mode is available. No internet, timer, payment or sign-up required.

Dice games have a separate validated `cards.dice` save slot. Score rows can be scratched for zero, games have a 13-round completion, and new games require a second confirmation before clearing only the dice match. Include 320px phone tests, exact roll constraints, Joker scoring and saved-farm regressions before merging. The game's artwork and branding are MeekLee originals.

## Board Game Nook: Checkers with Pip

**Now playable and offline:** American 8×8 Checkers, with Mom playing red against Pip. The rules engine enforces forward movement for men, compulsory captures, same-piece multiple jumps, promotion that ends the current turn, and kings moving in both directions. A deterministic local bot, optional hint and full-turn undo are included. Checkers is saved separately from all other games, and the board has large touch controls and accessible square labels.

## Board Game Nook: Backgammon with Pip

**Now playable and offline:** Backgammon joins Checkers. Mom moves 15 cream checkers from Point 24 to Point 1 against Pip's 15 blue checkers traveling the other way. The engine enforces a separate higher-player opening roll, mandatory maximum dice usage, choosing the higher die when only one can be played, doubles as four moves, blocked points, blot hits, bar re-entry, home-board bearing off, and single/gammon/backgammon points. A friendly doubling cube (no money) and first-to-five-point match scores are supported, along with move hints, full-turn undo and local bot turns.

The 24-point board scrolls inside its own area on small phones, **but every legal move is also offered as a large button** for players who don't want to tap small triangles. Dice are generated from a deterministic pseudo-random state so a saved game and automated tests remain repeatable. This is a casual five-point family match, **not a rated/tournament mode**: the optional Crawford and Jacoby conventions are not applied. The opponent has a basic heuristic, not a tournament-strength engine.

## Board Game Nook: Chess with Pip

**Now playable and offline:** Real 8×8 Chess with Mom playing cream against Pip. Legal moves prevent exposing the king, including for pinned pieces. Complete king safety, castling through safe squares, en passant after an immediate two-step pawn move, underpromotion (queen, rook, bishop or knight), checkmate and stalemate are supported. Casual automatic draw handling covers threefold repetition, fifty-move rule and basic insufficient material. Play with hints, full-turn undo, fresh-game confirmation and an adjustable **Gentle / Confident** local opponent. The board is keyboard-accessible and adapts to 320px phones.

Chess is saved only in its own validated `cards.chess` slot. Existing worlds, saved levels, garden items and every other card game stay unchanged. The bot is a friendly offline heuristic opponent, not an advanced chess engine or online service.

Private live family Chess sessions are still future work and require separately tested seat authorization and the family server.

## Next: more Solitaire varieties

Solitaire collection delivered: draw-one/draw-three Klondike, Pyramid, TriPeaks, one-suit Spider and FreeCell. Optional later difficulties: two/four-suit Spider, additional Solitaire varieties and accessible drag gestures. Give each type its own independent save and legible phone layout, with optional drag or tap.

## New Puzzle World: Pumpkin Patch

**Now playable and offline:** Pumpkin Patch is MeekLee's sixth puzzle world. It uses a separate **cross-harvest** mechanic: tap a crop when at least **three identical crops** occur across the tapped crop's full row or column combined. No adjacency or swapping is required. Each tap collects the matching crops in the tapped row and column. A harvest of five or more earns an additional **leaf gust**, collecting neighboring different crops for more points. The engine generates deterministic 6×6 and 8×8 boards that always allow a legal harvest, maintains its own endless Adventure Path/medals, and uses the existing offline save key.

**Six earned autumn garden decorations:** levels 3, 6, 9, 12, 15 and 18 grant Autumn Pumpkin Lantern, Hay Bale Bench, Friendly Scarecrow, Cornfield Garden Gate, Little Cider Stand and Autumn Leaf Gazebo. Prizes are validated under `collection.pumpkinPrizes`, awarded only on the first completed milestone across easy/classic, and can be planted/hidden alongside older ornaments. **No modification to the original four-world chapter chests, Flower Meadow rewards, jigsaw prizes, cards, pets or older progress.** Free hints identify valid cross anchors and are never charged.

## New Puzzle World: Flower Meadow

**Now playable and offline:** Flower Meadow is the fifth world, featuring a truly separate **bouquet** mechanic. Players tap a connected set of **at least three same-color flowers**, with connections in all eight directions, including diagonals. This differs from Rescue's orthogonal groups of two and the swapping worlds' match-three runs. Large groups (five or more) release pollen and collect adjacent differently colored flowers around the tapped bloom for extra points. Deterministic generators guarantee an available bouquet on 6×6 and 8×8 boards. Every victory advances an independent meadow Adventure Path and star records.

**Six extra no-cost garden rewards:** complete Flower Meadow levels 3, 6, 9, 12, 15 and 18 to earn Daisy Wreath, Flower Wind Chimes, Pollinator Cottage, Lily Walkway, Flower Market Cart and Ribbon Blossom Arch, once per milestone across both board sizes. The validated `collection.meadowPrizes` field preserves the old chest, companion, hidden decoration and jigsaw prize data. These rewards can be planted or hidden in the existing Garden. **Do not change the four original worlds' milestone chest schedule** or legacy saves. FreeCell and all four older puzzle worlds must remain fully playable.

## Next: new worlds and more garden life

Prioritize meaningfully distinct mechanics, not a reskinned copy of Harvest Valley:

- **Flower Meadow**: now playable with diagonal bouquets, pollen bursts and earned decorations.
- **Pumpkin Patch**: relaxed seasonal harvest puzzles.
- **Moonlight Orchard**: gentle evening match puzzles, high-contrast friendly.
- **Grandma's Kitchen**: ingredient arrangement/cooking puzzles, tied to the recipe notebook.

More collectible garden ornaments, seasonal flowers, new animal companions and cozy furniture should always be earned, never purchased. Avoid changing existing chest rewards or taking away old pets.

## Next: family sharing and community

The current notebook is **private to one browser**. A real community for sharing family recipes and stories needs opt-in accounts or pseudonyms, explicit consent, moderation/reporting, delete/export controls, anti-spam measures, clear sharing privacy, and safeguards for photos or details about other people. Start with invite-only family groups and plain text. Preserve the right to keep personal notes completely private. Do not imply GitHub Pages itself is a server.

## Validation gates

- Pure engine tests for complete games, edge-case transitions, illegal moves, deterministic state and save migration.
- Phone browser tests at 320 px and normal phones. Preserve keyboard support and reduced-motion settings.
- Check that a saved Harvest Valley level 21+ and Pip's garden are untouched by all upgrades.
- Ensure existing offline service worker precaches original illustrations and game code.
- PR branch + PR CI must pass before merging. Confirm Pages deployment on the merge commit.
