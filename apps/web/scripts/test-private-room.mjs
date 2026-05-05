// Quick smoke test: create a private room, join from a second client, verify both see each other.
// Run: node scripts/test-private-room.mjs
import { Client, ServerError } from "colyseus.js";

const ENDPOINT = "ws://localhost:2567";
const PASSWORD = "secret123";

async function main() {
  const host = new Client(ENDPOINT);
  const guest = new Client(ENDPOINT);

  console.log("[host] creating private room…");
  const roomA = await host.create("poker", {
    private: true,
    password: PASSWORD,
    tableName: "Smoke Test Table",
    name: "Host",
  });
  console.log(`[host] joined room ${roomA.roomId} as ${roomA.sessionId}`);

  // wait for initial state
  await new Promise((r) => setTimeout(r, 200));

  console.log("[guest] joining with WRONG password (should fail)…");
  try {
    await guest.joinById(roomA.roomId, { name: "Guest", password: "wrong" });
    throw new Error("Wrong password should have been rejected!");
  } catch (e) {
    if (e instanceof ServerError && /invalid_password/.test(e.message)) {
      console.log("  ✓ rejected as expected");
    } else {
      console.log("  ⚠ unexpected error type:", e.message);
    }
  }

  console.log("[guest] joining with CORRECT password…");
  const roomB = await guest.joinById(roomA.roomId, {
    name: "Guest",
    password: PASSWORD,
  });
  console.log(`[guest] joined as ${roomB.sessionId}`);

  // wait for state propagation
  await new Promise((r) => setTimeout(r, 300));

  const hostSees = [];
  roomA.state.players.forEach((p) =>
    hostSees.push(`${p.name}@seat${p.seat}`),
  );
  const guestSees = [];
  roomB.state.players.forEach((p) =>
    guestSees.push(`${p.name}@seat${p.seat}`),
  );

  console.log("[host] sees players:", hostSees);
  console.log("[guest] sees players:", guestSees);
  console.log("[host] tableName:", roomA.state.tableName);
  console.log("[host] isPrivate:", roomA.state.isPrivate);

  if (hostSees.length === 2 && guestSees.length === 2) {
    console.log("\n✅ PASS — private room with password works end-to-end");
  } else {
    console.log("\n❌ FAIL — expected 2 players visible to each side");
    process.exit(1);
  }

  roomA.leave();
  roomB.leave();
  process.exit(0);
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
