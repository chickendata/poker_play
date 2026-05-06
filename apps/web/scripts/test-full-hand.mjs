// End-to-end smoke test: 2 clients join a room, server auto-starts a hand,
// each receives hole cards privately, drives a full hand to showdown via 'action' messages.
// Run: node scripts/test-full-hand.mjs
import { Client } from "colyseus.js";

const ENDPOINT = "ws://localhost:2567";

function once(target, event) {
  return new Promise((resolve) => {
    const off = target.onMessage(event, (msg) => {
      off();
      resolve(msg);
    });
  });
}

function waitFor(predicate, timeoutMs = 5000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (predicate()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error("timeout"));
      setTimeout(tick, 50);
    };
    tick();
  });
}

function snap(state) {
  const players = [];
  state.players.forEach((p) =>
    players.push({
      id: p.id.slice(0, 4),
      seat: p.seat,
      chips: p.chips,
      bet: p.bet,
      status: p.status,
      hasActed: p.hasActed,
    }),
  );
  players.sort((a, b) => a.seat - b.seat);
  return {
    stage: state.stage,
    pot: state.pot,
    activeSeat: state.activeSeat,
    dealerSeat: state.dealerSeat,
    community: state.communityCards.toArray
      ? state.communityCards.toArray()
      : [...state.communityCards],
    players,
    winners: (state.winners.toArray
      ? state.winners.toArray()
      : [...state.winners]
    ).map((w) => ({ id: w.id.slice(0, 4), amount: w.amount, cat: w.category })),
  };
}

async function main() {
  const cA = new Client(ENDPOINT);
  const cB = new Client(ENDPOINT);

  console.log("[A] creating private room…");
  const roomA = await cA.create("poker", {
    private: true,
    tableName: "FullHand Test",
    name: "Alice",
  });
  console.log(`[A] joined ${roomA.roomId}`);

  // Wire hole-card listener BEFORE the server might send (server only deals after 2 players).
  const holes = { A: null, B: null };
  roomA.onMessage("hole", (m) => (holes.A = m.cards));

  console.log("[B] joining…");
  const roomB = await cB.joinById(roomA.roomId, { name: "Bob" });
  roomB.onMessage("hole", (m) => (holes.B = m.cards));

  // Private rooms wait for explicit start. Bob readies, Alice (host) starts.
  await new Promise((r) => setTimeout(r, 100));
  console.log("[B] ready");
  roomB.send("ready");
  await new Promise((r) => setTimeout(r, 100));
  console.log("[A] start");
  roomA.send("start");

  console.log("[..] waiting for hand to start…");
  await waitFor(() => roomA.state.stage === "preflop", 6000);
  // Give a beat for hole cards to arrive
  await new Promise((r) => setTimeout(r, 200));

  console.log("[A] state:", snap(roomA.state));
  console.log("[A] hole:", holes.A);
  console.log("[B] hole:", holes.B);

  if (!holes.A || !holes.B) throw new Error("hole cards not delivered");
  if (holes.A.length !== 2 || holes.B.length !== 2)
    throw new Error("hole cards wrong length");

  // Heads-up: dealer = SB. activeSeat will be SB's seat (0 or 1) preflop.
  const activeId = (room) => {
    let id = null;
    room.state.players.forEach((p) => {
      if (p.seat === room.state.activeSeat) id = p.id;
    });
    return id;
  };

  // Drive: SB calls, BB checks (preflop), then check it down through flop/turn/river.
  async function actAndWait(room, sessionId, action) {
    const before = JSON.stringify(snap(room.state));
    room.send("action", action);
    await waitFor(
      () => JSON.stringify(snap(room.state)) !== before,
      3000,
    );
    void sessionId;
  }

  // Preflop: SB acts first (heads-up rule)
  let actor = activeId(roomA);
  console.log(`[..] preflop: actor=${actor.slice(0, 4)}`);
  if (actor === roomA.sessionId)
    await actAndWait(roomA, actor, { type: "call" });
  else await actAndWait(roomB, actor, { type: "call" });

  // BB's turn
  actor = activeId(roomA);
  console.log(`[..] preflop: actor=${actor.slice(0, 4)}`);
  if (actor === roomA.sessionId)
    await actAndWait(roomA, actor, { type: "check" });
  else await actAndWait(roomB, actor, { type: "check" });

  await waitFor(() => roomA.state.stage === "flop");
  console.log("[..] FLOP:", snap(roomA.state).community);

  // Check it down: BB acts first post-flop in heads-up
  for (const stage of ["flop", "turn", "river"]) {
    for (let i = 0; i < 2; i++) {
      const a = activeId(roomA);
      if (a === roomA.sessionId)
        await actAndWait(roomA, a, { type: "check" });
      else await actAndWait(roomB, a, { type: "check" });
    }
    if (stage !== "river") {
      await waitFor(
        () => roomA.state.stage !== stage,
        3000,
      );
      console.log(`[..] ${roomA.state.stage.toUpperCase()}:`, snap(roomA.state).community);
    }
  }

  // Should have completed hand
  await waitFor(
    () => roomA.state.stage === "complete",
    3000,
  );
  const final = snap(roomA.state);
  console.log("[..] FINAL:", final);

  if (final.winners.length === 0) throw new Error("no winner declared");
  const totalChips = final.players.reduce((s, p) => s + p.chips, 0);
  // Private rooms: 2 players × 2000 starting chips = 4000.
  if (totalChips !== 4000)
    throw new Error(`chip total drift: ${totalChips} (expected 4000)`);

  console.log("\n✅ PASS — full hand drives to showdown, pot awarded, chips conserved");

  roomA.leave();
  roomB.leave();
  process.exit(0);
}

main().catch((e) => {
  console.error("\n❌ FAIL:", e);
  process.exit(1);
});
