---
title: Poker Play Server
emoji: "\U0001F0CF"
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# poker_play

Multiplayer Texas Hold'em web game. Colyseus realtime server + Next.js 15 web client, pnpm workspace.

```
apps/
  server/   @poker/server   — Colyseus WebSocket room server
  web/      @poker/web      — Next.js 15 + React 19 client
packages/
  shared/   @poker/shared   — shared types + game logic
```

## Dev

```bash
pnpm install
pnpm dev:server   # ws://localhost:2567
pnpm dev:web      # http://localhost:3000
```

## Deploy

See [DEPLOY.md](./DEPLOY.md) — server on Hugging Face Spaces, web on Vercel.

The YAML frontmatter above is consumed by Hugging Face Spaces (Docker SDK) when this repo is pushed to a Space.
