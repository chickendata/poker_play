import { Server, matchMaker } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "node:http";
import { PokerRoom } from "./rooms/PokerRoom.js";

const PORT = Number(process.env.PORT ?? 2567);

const httpServer = createServer(async (req, res) => {
  // CORS — dev web runs on a different port (3000) than the WS server (2567).
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // GET /rooms/<roomName> — list available public rooms (excludes private rooms).
  // (Note: Colyseus claims /matchmake/* routes for itself.)
  const matchMatch = req.url?.match(/^\/rooms\/([^?/]+)/);
  if (matchMatch && req.method === "GET") {
    try {
      const rooms = await matchMaker.query({
        name: matchMatch[1],
        private: false,
      });
      const data = rooms.map((r) => ({
        roomId: r.roomId,
        name: r.name,
        metadata: r.metadata,
        clients: r.clients,
        maxClients: r.maxClients,
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("poker", PokerRoom);

httpServer.listen(PORT, () => {
  console.log(`[poker-server] listening on ws://localhost:${PORT}`);
});
