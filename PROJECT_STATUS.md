# poker_play — Project Status

> Tài liệu tổng hợp trạng thái kỹ thuật của dự án multiplayer Texas Hold'em.
> Cập nhật lần cuối: **2026-05-05**.

---

## 1. Tổng quan

Web game multiplayer Texas Hold'em, mục tiêu MVP "chơi được với bạn bè qua link riêng".

**Trạng thái hiện tại:** MVP playable end-to-end. Có thể tạo private room, join by code, chơi từ preflop → showdown, chia chip đúng kể cả trong scenario all-in side pot, refresh trang không mất ghế.

**Nguyên tắc kiến trúc:**
- **Server-authoritative**: mọi logic poker (deal, evaluate, validate action, award pot) chạy ở server. Client chỉ gửi action + render state.
- **Pure engine tách khỏi network**: `packages/shared/src/engine.ts` không biết đến Colyseus, dễ test, dùng được cả ở bot/AI sau này.
- **Atomic design** cho UI: atoms → molecules → organisms → templates → pages.
- **Free-tier-friendly**: stack hiện tại chạy hoàn toàn miễn phí (Vercel + Render free tiers; Supabase free khi thêm).

---

## 2. Kiến trúc

### 2.1 Monorepo

```
poker_play/
├── apps/
│   ├── server/          # Colyseus game server (Node + tsx)
│   └── web/             # Next.js 15 + Tailwind v4 + shadcn-ready
├── packages/
│   └── shared/          # Pure TS: poker engine, hand eval, types
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json         # root scripts
```

### 2.2 Stack

| Layer | Tech | Version | Lý do chọn |
|---|---|---|---|
| Realtime | Colyseus | 0.16 | Built-in room/state sync, schema-based binary protocol |
| Game server | Node + tsx | 20.x | Same lang as web, hot reload via tsx watch |
| Web framework | Next.js (App Router) | 15.1 | SSR sẵn, Tailwind v4 OK, v0.dev tương thích |
| Styling | Tailwind v4 + CSS variables | 4.0 | Theme dynamic, shadcn compatible |
| UI atoms | shadcn-ready (chưa cài) | — | Sẽ install on-demand khi cần |
| Animation | Framer Motion | 11.11 | Spring physics, AnimatePresence cho mount/unmount |
| Icons | lucide-react | 0.460 | Consistent với shadcn |
| Test runner | `node:test` (built-in) | Node 20+ | Zero extra deps |
| TS runner | tsx | 4.19 | TypeScript-aware test execution |

### 2.3 Data flow

```
[Client UI]
   ↕  WebSocket (Colyseus binary schema)
[PokerRoom (Colyseus)]
   ↕  pure function calls
[Engine (packages/shared)]
```

- Engine `GameState` là source of truth trong session.
- `syncStateToSchema()` mirror engine state → Colyseus schema sau mỗi action.
- Hole cards **không** ở schema (private), gửi qua `client.send("hole", {cards})`.
- Reveal hole cards ở showdown qua `Player.revealedHole[]` (public).

---

## 3. Đã hoàn thành

### 3.1 Engine (packages/shared) — pure functions

| File | Nội dung | Test |
|---|---|---|
| `cards.ts` | `Card` type, `freshDeck()`, ranks, suits | implicit |
| `shuffle.ts` | Fisher-Yates + Mulberry32 PRNG (deterministic seed cho test) | implicit |
| `handEval.ts` | `evaluate5`, `evaluateBest` (best of 7), `compareHands`, `rankShowdown` | **21 tests** |
| `sidePots.ts` | `computeSidePots(players)` → `{pots, refunds}` layered by all-in cap | **7 tests** |
| `engine.ts` | `startHand`, `applyAction`, full state machine | **9 tests** |
| `types.ts` | `Stage`, `PlayerAction`, message types | — |

**Hand evaluator chi tiết:**
- 9 categories: high_card, pair, two_pair, three_of_a_kind, straight, flush, full_house, four_of_a_kind, straight_flush
- Wheel straight (A-2-3-4-5, high=5) handled
- Royal flush = straight flush A-high
- Tiebreaker tuple-based comparison (kicker order)
- 7-card best evaluator: brute-force C(7,5)=21 combos, picks max

**Engine state machine:**
- `startHand({players, dealerIdx, smallBlind, bigBlind, deck?})` — post blinds, deal hole cards, set first-to-act
- `applyAction(state, playerId, action)` — validate + apply, throws on illegal
- Actions: `fold | check | call | bet | raise` (raise amount = TARGET total bet, not increment)
- Auto-advance: round complete → deal next street → showdown
- All-in detected when `chips === 0` after a bet/call
- `isRoundComplete`: lone active player must still call/fold; multiple active → all hasActed && bet===currentBet
- Heads-up rule: dealer = SB, SB acts first preflop, BB first post-flop
- Multi-way: SB+1 (UTG) acts first preflop, SB first post-flop

**Side pots:**
- Layered by ascending `totalBet` levels
- Each pot has `eligibleIds` (non-folded with `totalBet >= cap`)
- Folded contributors still add to pot but can't win
- Refund when over-bettor folded above the highest non-folded cap (uncalled bet returned)
- Aggregate winnings per player → single entry per winner in `state.winners`

**Test coverage (37/37):**
- Hand eval: 21 tests covering all categories + wheel + tiebreakers + 7-card selection
- Side pots: 7 tests covering equal/uneven/folded/refund + chip conservation invariant
- Engine: 9 tests covering startHand, fold-out, full hand to showdown, raise+fold, illegal actions, split pot tie, **side pot integration**, **uncalled bet refund**

### 3.2 Server (apps/server) — Colyseus

**`PokerRoom`** (`apps/server/src/rooms/PokerRoom.ts`):
- Max 6 seats, $1000 starting chips, blinds 5/10
- Private room support: `setPrivate(true)` + password via `onAuth`
- Auto-start hand 1.5s sau khi đủ 2+ player
- Auto-start next hand 5s sau showdown
- Dealer button rotates clockwise theo `lastDealerSeat`
- Engine integration: `engine` field là source of truth, `syncStateToSchema()` mirror sau mọi action
- Hole cards: `holeByPlayer: Map<sessionId, [Card, Card]>` cached, gửi qua `client.send("hole")` riêng cho từng player
- Action message routing: `onMessage<Action>("action", ...)` → `applyAction` → sync → check hand complete
- Side pots: computed sau mỗi action, sync vào `state.sidePots[]`
- Showdown reveal: `state.players[id].revealedHole[]` populated cho non-folded players ở `runShowdown`
- Reconnection: `await this.allowReconnection(client, 30s)`, sessionId + seat preserved
- Auto-fold disconnected actor: `maybeAutoFoldActor()` — nếu người đến lượt là disconnected → fold qua `applyAction` để ván không stall, chain nếu nhiều người liên tiếp disconnect
- `onLeave(client, consented)` — graceful exit (back to lobby) vs network drop (refresh) phân biệt qua flag `consented`

**Schema** (`PokerState.ts`):
```ts
class Player extends Schema {
  id, name, seat, chips, bet, totalBet, status,
  connected, hasActed, hasHoleCards,
  revealedHole[]    // populated only at showdown
}
class SidePotInfo extends Schema { amount, eligibleIds[] }
class Winner extends Schema { id, amount, category }
class PokerState extends Schema {
  players: MapSchema<Player>
  communityCards[], winners[], sidePots[]
  tableName, isPrivate
  stage, pot, currentBet, minRaise, smallBlind, bigBlind
  dealerSeat, activeSeat
}
```

**Server entrypoint** (`apps/server/src/index.ts`):
- Plain Node `http.createServer` + `WebSocketTransport` từ `@colyseus/ws-transport`
- `/health` endpoint (cho Render/Railway healthchecks)
- Listen port 2567 (env `PORT` overrideable)

### 3.3 Web (apps/web) — Next.js 15

**Atomic structure:**
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # Lobby
│   └── table/[roomId]/page.tsx   # Bàn chơi
├── components/
│   ├── atoms/      → ChipStack, DealerButton, GameStatusBadge,
│   │                NeonCorners, NeonText, PlayingCard, CardBack
│   ├── molecules/  → BalanceCard, CommunityCards, HoleCards,
│   │                PlayerSeat, PotDisplay, StatRow
│   └── organisms/  → ActionBar, CreatePrivateRoomDialog, GameList,
│                    JoinByCodeDialog, LobbyHeader, PlayerStatsPanel,
│                    PokerTable, TableInfoPanel
├── hooks/
│   └── usePokerRoom.ts            # Colyseus room → React state
└── lib/
    ├── colyseus.ts                # Client + create/join/reconnect helpers
    └── utils.ts                   # cn() helper
```

**Lobby (`app/page.tsx`):**
- Header với balance card (mock data hiện tại)
- "+ Create Private Room" / "Join by Code" buttons
- Demo game list (1 row static — chưa wire matchmake API)
- Stats panel bên phải (winRate, gamesPlayed, totalProfit — mock)

**Table page (`app/table/[roomId]/page.tsx`):**
- Top-left: back button, table name, stage label, blinds
- Top-right: room code với nút copy
- Center: PokerTable organism (community cards + pot + 6 seats)
- Bottom: ActionBar (khi đến lượt) / "Waiting" / "Folded" message / WinnerBanner (showdown)
- Toast: action error từ server

**ActionBar:**
- Fold (đỏ) / Check / Call $X / Bet/Raise to $X
- Bet slider min → all-in, có numeric input đồng bộ
- Tự động chuyển giữa Bet và Raise dựa vào `currentBet`
- Disabled state cho insufficient chips

**Hook `usePokerRoom`:**
- Init chain: `takeActiveRoom` (in-memory từ lobby) → `tryReconnect` (sessionStorage token) → fresh `joinById`
- Subscribe `onStateChange` → setView()
- Subscribe `onMessage("hole")` → setHoleCards()
- Subscribe `onMessage("error")` → setActionError() (auto-clear sau 3s)
- Expose `sendAction()`, `isYourTurn`, `me`, `holeCards`

**Reconnection client side:**
- Sau create/join: lưu `{name, password, reconnectionToken, roomId}` vào sessionStorage
- `tryReconnect(roomId)` — gọi `client.reconnect(token)`, return null nếu token invalid → fall-back fresh join
- Refresh page → tự reconnect → seat + chip preserved

**Animations (Framer Motion):**
- Community cards: spring slide-down with stagger 0.05s
- Hole cards reveal: 3D flip (rotateY 180° → 0°) với delay 0.1s giữa 2 lá
- Bet chip badge: scale-in spring khi xuất hiện, scale-out khi disappear
- Winner banner: spring slide-up với scale
- Error toast: slide-up + fade

### 3.4 Network smoke tests

`apps/web/scripts/`:

| Script | Verifies |
|---|---|
| `test-private-room.mjs` | Create private room, wrong password rejected, correct password joins, both see each other |
| `test-full-hand.mjs` | 2 clients, server auto-starts, hole cards delivered privately, drive full hand → showdown via `action` messages, chip conservation |
| `test-reconnect.mjs` | Drop connection without consent, server marks `connected=false` + auto-fold, reconnect with token, sessionId + seat preserved, opponent sees reconnect |

---

## 4. Đang nợ kỹ thuật

### 4.1 Game mechanics

| Item | Mức độ | Ghi chú |
|---|---|---|
| **Hand history** | Cao | Cần để post-mortem ván chơi, debug, replay. Hiện tại refresh = mất hết log. |
| **Per-action timer** | Cao | Player có thể think forever. Cần ~30s timer + auto-fold khi timeout. |
| **Sit-out / sit-back** | TB | Player muốn nghỉ 1 ván nhưng giữ ghế. |
| **Rebuy** | TB | Hết chip → cần buy thêm để tiếp tục. Hiện tại player với `chips < bigBlind` bị bỏ qua mãi. |
| **Ante** | Thấp | Forced bet beyond blinds (tournament). |
| **Variable blind levels** | Thấp | Tournament structure (blinds tăng theo time). |
| **Tournament mode** | Thấp | Single/multi-table, knockout, prize structure. |
| **Multi-table** | Thấp | 1 player chơi nhiều bàn cùng lúc. |
| **Spectator mode** | Thấp | Xem ván không tham gia. |

### 4.2 Server / network

| Item | Mức độ | Ghi chú |
|---|---|---|
| **Public room list** | Cao | Colyseus 0.16 không expose `getAvailableRooms` qua WS — cần mount matchmake HTTP routes (express) hoặc dùng `client.http.get('/matchmake/poker')`. Lobby hiện chỉ có 1 row demo. |
| **Auto-fold disconnect không phải lượt mình** | TB | Hiện tại nếu player A disconnect khi không phải lượt A, A vẫn "active". Khi đến lượt A → engine throw. Cần flag `pendingAutoFold` set trong onLeave. |
| **Reconnection grace UI** | TB | Hiện disconnect = mất ván (auto-fold ngay nếu là lượt). Có thể nới: hiển thị "Alice reconnecting…" 5s rồi mới fold. |
| **Server restart = mất state** | Cao | Engine state in-memory. Server restart → mọi room mất. Cần snapshot vào Redis/DB nếu muốn graceful restart. |
| **Single Colyseus instance** | TB | Chưa horizontal scale. Vài trăm concurrent rooms = OK; ngàn = cần Colyseus + presence. |

### 4.3 UI / UX

| Item | Mức độ | Ghi chú |
|---|---|---|
| **Mobile responsive** | Cao | Bàn poker chỉ design cho desktop wide. Mobile sẽ vỡ layout. |
| **Sound effects** | TB | Chip clink, card deal, winner fanfare — tăng UX rất nhiều. |
| **Bet/chip movement to pot animation** | Thấp | Chip bay từ ghế vào giữa bàn khi bet. |
| **Bet slider focus loss** | Thấp | Slider có thể mất focus khi clamp re-render. |
| **Winner banner không show losing hand** | Thấp | Hiện chỉ show winner. Show cả losing hand cho comparison sẽ hay. |
| **Avatar pictures** | Thấp | Hiện chỉ hiển thị tên. |
| **Accessibility** | Cao | Không có aria-labels, không keyboard navigation, không screen reader support. WCAG contrast có thể fail. |
| **i18n** | Thấp | Hard-coded English UI text. |
| **Dark/light theme switch** | Thấp | Hiện chỉ dark. |

### 4.4 Persistence / accounts

| Item | Mức độ | Ghi chú |
|---|---|---|
| **Supabase auth** | Cao | Chưa wire. Hiện guest-only. Tên/balance lost khi đóng tab. |
| **Persistent chip balance** | Cao | Cần để cash game có ý nghĩa giữa các session. |
| **User profile** | TB | Avatar, display name, stats. |
| **Hand history persistence** | TB | Lưu mọi ván vào DB cho replay/audit. |
| **Win/loss/profit stats** | TB | Per-user lifetime stats. |
| **Leaderboard** | Thấp | Top winners theo tuần/tháng. |

### 4.5 Dev infra

| Item | Mức độ | Ghi chú |
|---|---|---|
| **CI** | Cao | Chưa có GitHub Actions. Cần: typecheck, test, build trên PR. |
| **ESLint + Prettier** | TB | TypeScript strict OK nhưng style chưa enforce. |
| **Pre-commit hooks** | Thấp | husky + lint-staged. |
| **E2E tests (Playwright)** | TB | Smoke tests hiện chạy WS layer; thiếu UI E2E. |
| **Property-based testing** | Thấp | `fast-check` cho engine — sinh random state test invariant (chip conservation, no negative chips, etc.). |
| **Load testing** | Thấp | Test với 100+ concurrent rooms. |
| **Production deployment config** | Cao | Chưa có Dockerfile, chưa config Render/Railway/Vercel. |

---

## 5. Cảnh báo & rủi ro

### 5.1 Security

⚠️ **Passwords sent in plaintext qua WebSocket.** OK trên `wss://` (TLS) ở production. **MUST** dùng `wss` (không `ws`) trên prod.

⚠️ **Không có rate limiting.** Một client có thể spam `joinById` hoặc `action` messages. Chưa thấy trong test thực tế nhưng nên thêm trước khi public.

⚠️ **Không có verification client owns claimed name.** Anyone có thể join với tên "Alice". Cần Supabase auth để có identity verified.

⚠️ **Hole cards over wire.** Gửi qua `client.send("hole", ...)` — Colyseus addressing dựa vào sessionId. Secure as long as session integrity được Colyseus đảm bảo (HTTPS/WSS).

⚠️ **Server trusts client message types.** Engine validate legality (đúng lượt, đủ chip), nhưng nếu client gửi action với amount âm hoặc NaN, engine có thể behave kỳ lạ. Nên thêm validation ở `handleAction` boundary.

⚠️ **Anti-collusion / anti-bot chưa có.** Nếu cho chơi tiền thật, cần pattern detection (2 player luôn raise bỏ pot cho nhau, etc.).

### 5.2 Game correctness

✅ **Side pots correct** (verified by `chip conservation` test).

✅ **Tie split correct** (remainder đi về player gần dealer nhất theo luật chuẩn).

✅ **Wheel straight (A-2-3-4-5) handled** correctly.

⚠️ **Burn cards** lấy ra khỏi deck nhưng không expose. Đúng luật nhưng client không thấy → cosmetic only.

⚠️ **Rake (house cut) chưa implement.** Pot return 100% cho winner. Real money game cần extract rake.

⚠️ **Engine assumes deck has enough cards** — `dealCommunity` throws nếu deck underflow. Không bao giờ xảy ra với 9 player + standard 52-card deck (max 9*2 + 5 + 3 burn = 26 cards), nhưng nếu thay đổi deck size/player count cần check.

⚠️ **`evaluate7` brute force C(7,5)=21 evals.** OK ở scale hiện tại; tournament high-volume nên dùng [Cactus Kev evaluator](http://suffe.cool/poker/evaluator.html) hoặc 2+2 lookup table (5x faster).

### 5.3 Performance

⚠️ **Schema sync gửi full state mỗi action.** Colyseus có internal patching nhưng chưa optimize. Vài trăm action/giây trên 1 room = OK; nghìn = cần investigate.

⚠️ **Side pot computation O(n²) worst case.** OK với 9 max player.

⚠️ **Hole cards delivered via individual `client.send` loop.** O(n) per deal, không scale issue ở 9 max.

⚠️ **No connection pooling.** Mỗi WebSocket độc lập, mỗi tab browser = 1 connection. Một user mở 5 tab = 5 connection.

### 5.4 Robustness

⚠️ **Heads-up cả 2 disconnect cùng lúc** → ván stall đến hết grace period (30s) cho cả 2.

⚠️ **Mass reconnect.** Nhiều player reconnect đồng thời → có thể overload (chưa test, không có backpressure).

⚠️ **Colyseus schema breaking changes during deploy.** Nếu sửa schema và deploy mới, client cũ kết nối có thể parse lỗi. Cần versioned schema hoặc forced refresh.

⚠️ **Engine state mất khi server restart.** Mọi đang-chơi mất. Acceptable cho MVP nhưng cần snapshot khi vào production.

### 5.5 UX

⚠️ **Auto-fold đột ngột khi disconnect là actor.** Player refresh tab khi đến lượt → fold ngay. Có thể wait 5s mới fold để forgiving hơn.

⚠️ **Fixed 6-seat layout.** Thêm 7-9 seat cần recalculate `SEAT_POSITIONS_6`.

⚠️ **Card visuals dùng Unicode (♠♥♦♣).** Render khác nhau giữa OS/font. Replace bằng SVG là lý tưởng.

⚠️ **Color-only status indicators.** Color-blind users có thể khó phân biệt fold/all-in/active. Thêm icon/text.

⚠️ **Engine tests dùng deterministic deck.** Real shuffle có thể xảy ra edge case không cover. Property-based testing sẽ catch nhiều hơn.

---

## 6. Roadmap phát triển

### Phase 1 — Playable Beta (1-2 tuần)

Mục tiêu: làm UX đủ tốt để mời bạn bè chơi thử công khai.

- [ ] **Per-action timer** — 30s countdown, auto-fold khi timeout. UI: progress ring quanh active seat.
- [ ] **Sound effects** — card deal, chip clink, check tap, fold whoosh, winner fanfare. Dùng [howler.js](https://howlerjs.com/) hoặc native `Audio()`. Asset packs free trên freesound.org.
- [ ] **Hand history (in-memory)** — last 10 hands trong `state` schema (community cards, actions, winner). Hiển thị panel bên phải bàn.
- [ ] **Mobile responsive** — bàn poker stack vertical trên mobile, ActionBar fixed bottom. Test trên iPhone SE / Pixel.
- [ ] **Public room list** — wire Colyseus matchmake HTTP routes qua Express. `client.http.get('/matchmake/poker')` trả `RoomAvailable[]`.
- [ ] **Better disconnect UX** — show "Alice reconnecting… (5s)" trên ghế trước khi auto-fold, cho người dùng thấy đang chờ.
- [ ] **Player count online indicator** — real count từ `gameServer.presence`.
- [ ] **Reveal losing hands** — show cả tay thua khi showdown để compare.

### Phase 2 — Persistence & Accounts (1 tháng)

Mục tiêu: account-based experience, chip balance persistent.

- [ ] **Supabase setup** — project, RLS policies, migrations checked in
- [ ] **Auth: Google OAuth + email magic link** — Supabase Auth UI
- [ ] **User profile table**: id, display_name, avatar_url, chip_balance, created_at
- [ ] **Hand history table**: id, room_id, players[], community[], winners[], created_at
- [ ] **Stats: wins, losses, hands_played, total_profit** — derived view hoặc cached
- [ ] **Server reads chip balance từ DB khi join room** — không còn STARTING_CHIPS hardcode
- [ ] **Server commits balance changes sau mỗi hand**
- [ ] **Lobby**: hiển thị real balance + stats
- [ ] **Profile page**: edit display name, view stats
- [ ] **Leaderboard page**: top profit/win rate weekly/monthly
- [ ] **Cron**: weekly leaderboard reset, daily login reward

### Phase 3 — Full Game Features (2-3 tháng)

Mục tiêu: feature-complete cash game + basic tournaments.

- [ ] **Tournament mode (Sit & Go)** — fixed buy-in, blinds tăng theo level (5min), winner-take-all hoặc payout structure
- [ ] **Multi-table tournament (MTT)** — coordinator phân player vào table, balance khi player ra, final table
- [ ] **Rebuy + add-on + top-up** cho cash game
- [ ] **Ante** (forced contribution beyond blinds, common ở tournament late stage)
- [ ] **Time bank** — extra time pool khi running low (e.g. 30s base + 60s bank)
- [ ] **Sit-out / sit-back** — player skip vài ván rồi quay lại
- [ ] **Configurable rake** per table (cash game)
- [ ] **Auto-rebuy option** when stack drops
- [ ] **Showdown order standard** — không auto reveal mọi player, chỉ những người được hỏi (raiser → first to call clockwise)

### Phase 4 — Production-ready (1-2 tháng)

Mục tiêu: deploy public với reasonable scale + monitoring.

- [ ] **Dockerfile** cho server
- [ ] **Deploy server**: Render hoặc Railway hoặc Fly.io. WSS qua Cloudflare hoặc native TLS.
- [ ] **Deploy web**: Vercel
- [ ] **GitHub Actions CI**: typecheck, test, build trên PR
- [ ] **Monitoring**: Sentry cho error tracking, posthog/plausible cho analytics
- [ ] **Logging**: structured logs (pino), aggregator (Logtail/Better Stack)
- [ ] **Metrics**: room count, active games, hand-per-second — exposed `/metrics` (Prometheus)
- [ ] **Snapshot engine state to Redis** sau mỗi action — graceful restart
- [ ] **Horizontal scale**: multi-instance Colyseus với Redis presence + driver
- [ ] **CDN**: static assets via Vercel/Cloudflare
- [ ] **Rate limiting**: per-session message throttle
- [ ] **DOS protection**: Cloudflare hoặc Vercel built-in
- [ ] **Schema versioning**: client check version trên connect, force refresh nếu mismatch

### Phase 5 — Monetization & Compliance (3-6 tháng)

Mục tiêu: chuẩn bị nếu chuyển sang real-money (need legal/compliance research).

- [ ] **Wallet system**: deposit/withdraw, transaction log (audit-ready)
- [ ] **Payment integration**: Stripe (cho deposit fiat → in-game chip)
- [ ] **KYC verification**: ID upload, age check (jurisdiction dependent)
- [ ] **Anti-collusion detection**: pattern analysis (2 players soft-play cho nhau, dump chips, etc.)
- [ ] **Anti-bot detection**: behavioral analysis (timing patterns, GTO-like decisions), captcha thresholds
- [ ] **Customer support tools**: ticket system, hand replay tool, refund flow
- [ ] **Moderation dashboard**: admin có thể view rooms, ban players, refund hands
- [ ] **Compliance**: GDPR (data export/delete), gambling regulations per jurisdiction
- [ ] **Tax reporting**: 1099/W-2G generation cho US users

### Phase 6 — Variants & Social (ongoing)

- [ ] **Variants**: Omaha (4 hole cards), Stud, Razz, Pineapple, Short-deck
- [ ] **Heads-up Sit & Go**: dedicated 1-vs-1 format
- [ ] **Achievements / badges**: "first royal flush", "win 100 hands", etc.
- [ ] **Daily/weekly challenges**: quest system
- [ ] **In-game chat**: per-table, per-friend, with profanity filter
- [ ] **Emotes / reactions**: tap-to-send animated icons
- [ ] **Friends list**: add/remove, see online status, invite to table
- [ ] **Private invite links**: shareable URL với 1-time-use code
- [ ] **PWA + push notifications**: "Your turn", "Friend started a table"
- [ ] **Voice chat**: Discord integration hoặc native WebRTC
- [ ] **Tournament chip-stack visualizer**: real-time bar chart of all stacks
- [ ] **Replay tool**: rewind through hand history with playback controls

### Tech debt & refactoring (ongoing)

- [ ] Add ESLint + Prettier + EditorConfig — consistent style
- [ ] Add `fast-check` property-based tests cho engine
- [ ] Replace `evaluate7` brute-force với Cactus Kev / 2+2 evaluator (~5x faster)
- [ ] Move Colyseus schema serialization to typed delta patches để giảm bandwidth
- [ ] Replace Unicode card suits với inline SVG cho consistency
- [ ] Extract magic numbers (chip amounts, timers) thành config file
- [ ] Add JSDoc cho public engine API
- [ ] Bundle size budget (Next.js analyzer)
- [ ] Lighthouse score targets (perf > 90, a11y > 90)

---

## 7. Lệnh hay dùng

```bash
# Dev
pnpm dev:server              # Colyseus on ws://localhost:2567
pnpm dev:web                 # Next.js on http://localhost:3000

# Test
pnpm test                    # Run engine + side pot + handEval tests (37 total)
pnpm typecheck               # Typecheck cả monorepo

# Smoke tests (require dev:server running)
cd apps/web
node scripts/test-private-room.mjs
node scripts/test-full-hand.mjs
node scripts/test-reconnect.mjs

# Build (chưa setup production yet)
pnpm build                   # build cả 3 workspace
```

---

## 8. File reference

### Engine (packages/shared/src/)
```
cards.ts            - Card type, freshDeck()
shuffle.ts          - Fisher-Yates + Mulberry32 seeded PRNG
handEval.ts         - 5-card eval, 7-card best, comparator
handEval.test.ts    - 21 tests
sidePots.ts         - Layered pot construction + refunds
sidePots.test.ts    - 7 tests
engine.ts           - Game state machine (startHand, applyAction)
engine.test.ts      - 9 tests
types.ts            - Stage, PlayerAction, message types
index.ts            - Re-exports
```

### Server (apps/server/src/)
```
index.ts                          - HTTP + WebSocketTransport bootstrap
rooms/PokerRoom.ts                - Game room logic (engine + reconnection)
rooms/schema/PokerState.ts        - Colyseus schema
```

### Web (apps/web/src/)
```
app/
  layout.tsx                      - Root layout
  page.tsx                        - Lobby
  globals.css                     - Tailwind + theme + neon animations
  table/[roomId]/page.tsx         - Table page (active state, ActionBar, WinnerBanner)
components/
  atoms/
    ChipStack.tsx                 - Animated chip stack
    DealerButton.tsx              - "D" badge
    GameStatusBadge.tsx           - "RUNNING"/"OPEN" pill
    NeonCorners.tsx               - Decorative corners
    NeonText.tsx                  - Glowing text wrapper
    PlayingCard.tsx               - Card front + CardBack
  molecules/
    BalanceCard.tsx               - Header balance display
    CommunityCards.tsx            - 5-slot community area (animated)
    HoleCards.tsx                 - 2-slot hole cards (3D flip)
    PlayerSeat.tsx                - Per-player seat (cards + chips + status)
    PotDisplay.tsx                - Single or multi-pot display
    StatRow.tsx                   - Label + value row
  organisms/
    ActionBar.tsx                 - Fold/Check/Call/Bet+slider
    CreatePrivateRoomDialog.tsx   - Create flow
    GameList.tsx                  - Public games (currently demo)
    JoinByCodeDialog.tsx          - Join flow with password
    LobbyHeader.tsx               - Top bar with balance
    PlayerStatsPanel.tsx          - Right sidebar stats
    PokerTable.tsx                - The table itself (community + seats + pot)
    TableInfoPanel.tsx            - Bottom-right info panel (unused on table page now)
hooks/
  usePokerRoom.ts                 - Room subscription + state mapping + sendAction
lib/
  colyseus.ts                     - Client + create/join/reconnect/storage
  utils.ts                        - cn() helper
scripts/
  test-private-room.mjs           - Private room smoke test
  test-full-hand.mjs              - Full hand smoke test
  test-reconnect.mjs              - Reconnection smoke test
```

### Root
```
package.json                      - Root scripts + dev deps
pnpm-workspace.yaml               - Workspace config
tsconfig.base.json                - Shared tsconfig
.gitignore
PROJECT_STATUS.md                 - This file
```

---

## 9. Memory / context cho future sessions

Project status, tech stack decisions, và user preferences đã được lưu vào Claude Code memory tại:

```
/Users/mac/.claude/projects/-Users-mac-buildinpublic-poker-play/memory/
├── MEMORY.md
├── user_profile.md          # User language + project context
├── project_poker_play.md    # Project goals + scope
└── project_tech_stack.md    # Stack decisions (Colyseus, Supabase plan, v0.dev workflow)
```

Khi quay lại session sau, Claude Code sẽ tự load những memory này và biết tiếp tục từ đâu.
