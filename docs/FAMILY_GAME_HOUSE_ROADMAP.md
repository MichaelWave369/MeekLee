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

## Next: Chess, Checkers and Backgammon Nook

Don't ship blank buttons or incomplete rules disguised as games. Build a dedicated **Board Game Nook** one verified engine at a time:

- **Checkers first:** American 8×8 draughts with diagonal moves, forced captures, multiple jumps, king promotion, local bot opponent, large tap targets, undo and save.
- **Chess:** full legal moves, checks/checkmates/stalemates, castling, en passant, promotion, move hints and an adjustable offline opponent. Accessible board coordinates and optional large pieces. Respect the complexity: no false victories or illegal moves.
- **Backgammon:** two players or a bot, dice (secure or suitably random), move legality, bearing off, bar, doubles, points and match scoring, with a gentle optional tutorial.

Start offline and local; extend to private family sessions only after the server is safely deployed and independent per-seat state is tested.

## Next: more Solitaire varieties

After draw-one and draw-three Klondike: **Pyramid**, **TriPeaks**, **Spider (one suit first)**, and **FreeCell**. Give each type its own independent save and legible phone layout, with optional drag or tap.

## Next: new worlds and more garden life

Prioritize meaningfully distinct mechanics, not a reskinned copy of Harvest Valley:

- **Flower Meadow**: clear bouquet sets, celebrate spring.
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
