# MeekLee's Family Table: private online Rook

An optional online room service using the existing family-rule Rook engine.

**Hosting status:** The browser UI can ship on MeekLee's GitHub Pages site without running a paid service. Until a Family Table Worker is deployed and its URL configured, it displays an **explicitly marked preview**. This is not a fake shared table: online play, invitations and chat need a real room server.

## Family experience

- Mom or any relative opens Cards → Family Rook Table, enters a name and creates a private table.
- A copyable invitation link opens the right room, no account or installation required.
- Four seats, opposite-seat partnerships (0+2 vs. 1+3), existing 41-card Rook rules, server-managed shuffled cards and legal actions. Missing players get the existing Rook bots.
- Extra relatives watch public played cards and send text messages.
- Late spectators can ask to replace a bot, but only at the **next fresh deal**, never during a trick.
- Reopen the link in the same browser to recover the private seat after a network interruption. No turn timer.
- Different private rooms can run at the same time.
- Offline Rook, Solitaire, Color Parade, puzzles and garden remain isolated and unchanged.

## Privacy and security model

The Worker generates hard-to-guess private room codes (128-bit UUIDs with about 122 random bits) and a random token for each participant. Room codes and server origin appear in the invite URL fragment. Session tokens are stored in browser local storage and sent with an HTTP Authorization header or WebSocket subprotocol, not copied into invitations.

The **server** keeps the deck, nest, bid state and scores in a SQLite-backed Durable Object. Each player receives only their own hand and public cards. A spectator receives no private cards. All actions are validated by the authoritative Rook engine, and stale turn versions are rejected. Chat has a length cap, rate limit and short retained history. React renders messages as text, never as executable markup.

**Limitations:** Anyone with an invitation can read chat, and users' names are not authenticated. Messages are not end-to-end encrypted. No host ban/kick list exists in v1. Share links only with people you trust. Cloudflare may retain chat and game state for up to **30 days of room inactivity**, after which the room is purged. Up to 18 extra visitors may watch/chat per room. Voice chat is not part of this version.

## Deploy the room service on Cloudflare's Free plan

Cloudflare supports SQLite-backed Durable Objects on Workers Free, with daily resource limits. Hibernating WebSockets avoid a continuously billed server. **Stay on the Free plan and monitor usage:** when a daily free limit is exceeded, requests may fail until the next reset. Do not enable a paid plan unless you explicitly want its costs.

A Cloudflare account is required for actual deployment. This code alone does not provision a service in another person's account.

1. Clone https://github.com/MichaelWave369/MeekLee and run npm ci.
2. Run: npx wrangler@4 login. Sign in to the Cloudflare account.
3. Run: npm run family:deploy. This uses family/wrangler.toml and applies the new_sqlite_classes Durable Object migration.
4. Copy the published URL, something like https://meeklee-family-table.your-subdomain.workers.dev.
5. Open https://michaelwave369.github.io/MeekLee/ then choose Menu → Cards → Family Rook Table.
6. Open Set up family room server, paste the HTTPS Worker URL, and tap Save Server Address.
7. Enter a name, Create Private Family Table, and Copy Family Invite to send privately.
8. Relatives tap that link and enter their names. The invite embeds the Worker origin, so they do not configure the backend separately.

The existing GitHub Pages site remains static and free. No other account, paid database or account migration is required. To set a default server URL for first visits rather than configuring manually, set the Vite VITE_FAMILY_API_URL build environment variable to the Worker origin.

## Local development

From one terminal in a clone:

    npm ci
    npm run family:dev

This serves the local Worker at http://localhost:8787.

From a second terminal:

    npm run dev

Open http://localhost:5173/MeekLee/ and set the family room server URL to http://localhost:8787. Open a second private window or browser profile to test another player. Use distinct browser storage for different relatives. Do not send a localhost link to family in another home: it resolves to their computer, not yours.

Before inviting the real family, deploy the Worker and test with at least two devices on two independent networks, with both players taking turns and rejoining after an interruption. GitHub Actions currently validates engine and UI behavior but does not substitute for that real connectivity test.

## Implementation and checks

- family/room-core.js: authoritative rules, privacy views, bot turns, spectators, queued joins, chat
- family/worker.js: HTTP API, authorization, Cloudflare Durable Object and hibernating WebSocket transport
- family/wrangler.toml: Worker configuration with SQLite-backed Durable Object
- src/FamilyTable.jsx: phone room setup, invites, legal Rook UI, reconnect and chat
- src/family-table.css: original kitchen-table preview, large controls and responsive design
- tests/family-room.test.mjs: private cards, four seats, spectator queue, illegal moves, full bot game, chat
- tests/family-worker.test.mjs: mocked Worker requests, CORS, auth, game actions and chat
- tests/browser/family-table.spec.mjs: honest preview, mobile layout and two-device simulated server

Run npm run check and npm run test:browser. Offline MeekLee remains playable even if this optional room backend is unreachable.
