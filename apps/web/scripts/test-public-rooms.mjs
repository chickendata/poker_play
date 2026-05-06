// Smoke test: create a public room, fetch /rooms/poker, verify it shows up; private room should NOT.
// Run: node scripts/test-public-rooms.mjs
import { Client } from "colyseus.js";

const ENDPOINT = "ws://localhost:2567";
const HTTP = "http://localhost:2567";

async function fetchRooms() {
  const r = await fetch(`${HTTP}/rooms/poker`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function main() {
  const client = new Client(ENDPOINT);

  // baseline
  let list = await fetchRooms();
  if (!Array.isArray(list)) throw new Error("expected JSON array");
  const before = list.length;
  console.log(`[baseline] ${before} room(s) listed`);

  console.log("[host] creating PUBLIC room…");
  const pub = await client.create("poker", {
    private: false,
    tableName: "Public Smoke",
    name: "Host",
  });
  console.log(`  → ${pub.roomId}`);

  console.log("[host] creating PRIVATE room…");
  const priv = await client.create("poker", {
    private: true,
    password: "x",
    tableName: "Private Smoke",
    name: "Host2",
  });
  console.log(`  → ${priv.roomId}`);

  await new Promise((r) => setTimeout(r, 300));

  list = await fetchRooms();
  console.log(`[after] ${list.length} room(s) listed:`);
  for (const r of list) {
    console.log(
      `  - ${r.roomId} "${r.metadata?.tableName ?? "?"}" private=${!!r.metadata?.isPrivate} clients=${r.clients}/${r.maxClients}`,
    );
  }

  const hasPub = list.some((r) => r.roomId === pub.roomId);
  const hasPriv = list.some((r) => r.roomId === priv.roomId);

  if (!hasPub) throw new Error("public room missing from /rooms/poker");
  if (hasPriv) throw new Error("private room incorrectly listed in /rooms/poker");
  console.log("  ✓ public room visible");
  console.log("  ✓ private room hidden");

  pub.leave(true);
  priv.leave(true);
  console.log("✅ pass");
}

main().catch((e) => {
  console.error("❌ fail:", e);
  process.exit(1);
});
