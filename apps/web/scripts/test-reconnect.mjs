// Smoke test for reconnection: simulate a player "refreshing the page" by
// closing the WebSocket and then calling client.reconnect(token). Verify the
// player keeps their seat and chips.
import { Client } from "colyseus.js";

const ENDPOINT = "ws://localhost:2567";

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

async function main() {
  // Use TWO Client instances so they have separate WebSocket connections
  // (a single Client multiplexes; we want to fully drop one without affecting the other).
  const cA = new Client(ENDPOINT);
  const cB = new Client(ENDPOINT);

  console.log("[A] creating private room…");
  const roomA = await cA.create("poker", {
    private: true,
    password: "secret",
    tableName: "Reconnect Test",
    name: "Alice",
  });
  const roomId = roomA.roomId;
  const aSession = roomA.sessionId;
  const aReconnectToken = roomA.reconnectionToken;
  console.log(
    `[A] joined ${roomId} session=${aSession} token=${aReconnectToken?.slice(0, 12)}…`,
  );

  console.log("[B] joining…");
  const roomB = await cB.joinById(roomId, { name: "Bob", password: "secret" });
  console.log(`[B] joined session=${roomB.sessionId}`);

  // Wait for hand to start
  await waitFor(() => roomA.state.stage === "preflop", 5000);
  console.log("[..] hand started");
  console.log(
    "[A] seen players:",
    [...roomA.state.players.values()].map((p) => `${p.name}(seat${p.seat})`),
  );

  // Now simulate Alice "refreshing the page": drop her connection without consent.
  console.log("[A] simulating refresh — dropping connection (no consent)");
  await roomA.leave(false); // false = not consented (simulates network drop / refresh)

  // Bob's view: A should be marked connected=false
  await new Promise((r) => setTimeout(r, 300));
  const bobSeesA = [...roomB.state.players.values()].find(
    (p) => p.id === aSession,
  );
  console.log(
    `[B] sees A: connected=${bobSeesA?.connected}, status=${bobSeesA?.status}`,
  );
  if (bobSeesA?.connected !== false) {
    throw new Error("expected A to be marked disconnected from B's view");
  }

  // Now Alice "reloads" — same Client instance, calls reconnect with the token
  console.log("[A] reconnecting with token…");
  const cA2 = new Client(ENDPOINT);
  const roomA2 = await cA2.reconnect(aReconnectToken);
  console.log(
    `[A2] reconnected session=${roomA2.sessionId} (should match original ${aSession})`,
  );

  if (roomA2.sessionId !== aSession) {
    throw new Error("session ID changed on reconnect");
  }

  await new Promise((r) => setTimeout(r, 300));

  // From Bob's view, A should be back to connected=true
  const bobSeesAAgain = [...roomB.state.players.values()].find(
    (p) => p.id === aSession,
  );
  console.log(
    `[B] sees A after reconnect: connected=${bobSeesAAgain?.connected}, status=${bobSeesAAgain?.status}`,
  );
  if (bobSeesAAgain?.connected !== true) {
    throw new Error("expected A to be reconnected from B's view");
  }

  // A should still have her seat
  const aOwnSeat = roomA2.state.players.get(aSession)?.seat;
  console.log(`[A2] still sits at seat ${aOwnSeat}`);
  if (aOwnSeat !== 0) throw new Error("A lost her seat on reconnect");

  console.log("\n✅ PASS — reconnect preserves seat, chips, and session");

  roomA2.leave();
  roomB.leave();
  process.exit(0);
}

main().catch((e) => {
  console.error("\n❌ FAIL:", e);
  process.exit(1);
});
