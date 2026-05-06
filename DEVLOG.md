# Devlog

> Nhật ký phát triển hàng ngày của poker_play. File này log những gì đã làm và những việc tiếp theo. Trạng thái tổng quan vẫn xem ở `PROJECT_STATUS.md`.

---

## 2026-05-06 (hôm nay)

### 1. Phase 1 — Playable Beta (4/8 items)

| Item | Files chính |
|---|---|
| **Per-action timer 30s + auto-fold** | `apps/server/src/rooms/PokerRoom.ts` (refreshTurnTimer, onTurnTimeout), `PokerState.ts` (`turnDeadline`), `apps/web/src/components/molecules/PlayerSeat.tsx` (TurnCountdownRing SVG, color shift xanh→vàng→đỏ ở 5s cuối) |
| **Reveal losing hands ở showdown** | Server: `revealShowdownCards` đánh giá hand category cho mọi non-folded player; schema `Player.revealedCategory`. Client: PlayerSeat hiển thị label dưới revealed cards, winner highlight neon. |
| **Mobile responsive** | Tailwind `sm:` breakpoints xuyên suốt: PokerTable (`aspect-[5/4] sm:aspect-video`), PlayerSeat (`w-20 sm:w-32`), PlayingCard (size scaling), ActionBar (`w-full sm:min-w-[320px]`), top headers compact, lobby header stack vertical |
| **Public room list** | `GET /rooms/poker` trên server (Colyseus chiếm `/matchmake/*`); CreateRoomDialog có toggle Public/Private; lobby poll 5s; smoke test `test-public-rooms.mjs` |

### 2. Private room redesign

- Starting chips: $2000 cho private, $1000 cho public (`STARTING_CHIPS_PRIVATE/PUBLIC`)
- Schema: `Player.ready`, `PokerState.hostId`
- Auto-start bị skip cho private room → host phải bấm Start
- `onMessage("ready")` toggle guest's ready (host implicitly ready)
- `onMessage("start")` chỉ host gọi được, yêu cầu ≥2 player + tất cả ready
- Host reassignment khi host rời (lowest-seat connected player)
- UI: `PrivateLobbyPanel` trong waiting stage hiển thị danh sách player + nút Ready/Start tùy vai trò

### 3. Đa ngôn ngữ (i18n)

- DIY i18n không dependency: `apps/web/src/i18n/translations.ts` (vi default + en, flat keys với `{var}` interpolation), `LocaleContext.tsx` (Provider + `useT()` hook)
- Default `vi` để SSR/CSR khớp; useEffect đọc localStorage sau mount để upgrade
- `SettingsDialog` với toggle Tiếng Việt / English
- Gear icon (⚙️) trong LobbyHeader bên cạnh BalanceCard
- ~80 strings dịch xuyên các component: lobby, dialogs, table page, ActionBar, PrivateLobbyPanel, WinnerBanner, PlayerSeat, PotDisplay, hand category names

### 4. Bug fixes

| Bug | Nguyên nhân | Fix |
|---|---|---|
| Hydration mismatch | `Number.toLocaleString()` không pin locale → server vs browser format khác (vi-VN: `25.750`, en-US: `25,750`) | `formatChips(n)` helper trong `lib/utils.ts` pin về `en-US`, replace 12 chỗ |
| "Room has been disposed" khi tạo phòng | React 18 Strict Mode chạy useEffect mount→cleanup→mount; cleanup gọi `r.leave()` ngay → server dispose room → mount tiếp không tìm được | Defer `r.leave()` 50ms qua `pendingLeaveRef`; mount kế tiếp cancel timer trước khi nó fire |

### 5. Visual redesign

#### Cards — phong cách casino chuyên nghiệp
- **`SuitSymbol.tsx`** atom mới: SVG paths cho ♠♥♦♣ thay Unicode (render đồng nhất giữa OS/font)
- **PlayingCard**: corner indices (rank + small suit) ở top-left + bottom-right rotated 180°, big center suit (opacity 80%), white-to-grey gradient, double shadow
- **CardBack**: cross-hatch neon green pattern, inner border frame, center diamond emblem với blur halo glow

#### Animation
- **Community cards** (`CommunityCards.tsx`): cards bay từ y=-120 với scale/rotate scatter, stagger 140ms giữa 3 lá flop (lần lượt thay vì đồng thời), turn/river deal đơn lẻ
- **Hole cards** (`HoleCards.tsx`): face-down lần lượt rớt với stagger 180ms; reveal multi-track transition (opacity, y, scale, rotateY) — y/scale entrance trước, rotateY flip sau 0.15s; perspective 600
- **Deal-cards overlay** (`DealAnimation.tsx` molecule mới):
  - Khi stage chuyển sang preflop, render overlay 2N face-down cards bay từ dealer seat → từng player seat
  - Round 1 phát hết, rồi vòng 2; stagger 100ms; flight 0.5s
  - Position % cho mỗi seat (`SEAT_DEAL_POSITIONS`) — rotate `-25° → 8° → 0°`, scale `0.7 → 1`
  - PokerTable detect transition qua `useRef` + `useEffect`, hide hole cards trong khi dealing, render overlay với nonce
  - `dealAnimationDurationMs(playerCount)` helper compute total time

### 6. Smoke tests

- Update `test-full-hand.mjs` + `test-reconnect.mjs`: send `ready` từ guest + `start` từ host trước khi đợi preflop; chip total 2000 → 4000 (2 players × 2000 starting chips private)
- Mới: `test-public-rooms.mjs` verify `/rooms/poker` chỉ list public, ẩn private
- Tất cả 4 smoke tests + 37 engine tests pass

---

## 2026-05-07 (kế hoạch)

### Phase 1 — Playable Beta (4 items còn)

| Item | Hint implementation |
|---|---|
| **Sound effects** | Native `Audio()` hoặc `howler.js`. Asset: card deal, chip clink, check tap, fold whoosh, winner fanfare. Volume slider trong Settings. Mute persist localStorage. Trigger qua hook `useSounds()` listen `view.stage` + `actionError`. |
| **Hand history (in-memory)** | Schema `PokerState.handHistory: ArraySchema<HandSummary>` (last 10 hands: community[], winners[], stage, timestamp). Server push sau mỗi showdown. Client: panel side-bar phải bàn (mobile: collapsible drawer). |
| **Better disconnect UX** | Hiện disconnect = auto-fold ngay nếu đến lượt. Đổi: hiển thị "Alice reconnecting… 5s" trên ghế (badge + countdown) trước khi fold. Server delay `maybeAutoFoldActor` 5s, cancel nếu reconnect kịp. |
| **Player count online indicator** | `gameServer.presence.subscribe('online_count')` + presence increment/decrement trong onJoin/onLeave. Expose qua matchmake metadata hoặc HTTP endpoint `/online`. Lobby header poll. |

### Polish + làm sạch

- **Reset lại token reconnect khi join failed** ("room has been disposed") — clear sessionStorage để khỏi loop fail.
- **Tinh chỉnh deal animation** nếu position các seat hơi lệch sau khi test thực tế (`SEAT_DEAL_POSITIONS` có thể cần tweak per breakpoint).
- **Hand category labels VN** — review lại "Mậu thầu", "Sám", "Cù lũ"… với người chơi VN xem có cách gọi phổ biến hơn (e.g. "Cao", "Bộ ba", "Full") không.
- **Sound asset license** — chốt nguồn (freesound.org CC0) trước khi commit binary.
- **Test trên thiết bị thực**: iPhone SE / Android cũ — verify mobile responsive + animation perf (low-end GPU).

### Tech debt nhẹ có thể xen vào

- **Reset `ready` flag khi quay về waiting** sau stall (hiện tại guest's ready persist qua reconnect — OK, nhưng nếu nhiều người leave + new join → ready flag cũ vẫn còn, host start được mà guest mới chưa ack)
- **Engine state mất khi server restart** — chưa cần Redis, nhưng add log `room disposed` với metadata để debug
- **`onLeave` của host trong khi host chưa start** — đã có `reassignHost`, verify thực tế hoạt động đúng (smoke test mới)

### Stretch (nếu nhanh)

- **Showdown chip-fly animation** — chips bay từ pot về winner seat sau showdown (parallel với WinnerBanner)
- **Bet chips bay vào pot** khi player call/bet — visual feedback
- **Avatar placeholder** SVG cho mỗi player (deterministic từ name hash)

---

## Cấu trúc các phase tiếp theo

Phase 1 hoàn thành sẽ closing với 4 items kế hoạch ngày mai. Sau đó:

- **Phase 2 — Persistence & Accounts**: Supabase auth, user profile, persistent chip balance, hand history DB
- **Phase 3 — Full Game Features**: tournament, rebuy, time bank, sit-out
- **Phase 4 — Production**: Docker, deploy, CI, monitoring

Detail trong `PROJECT_STATUS.md` Section 6.
