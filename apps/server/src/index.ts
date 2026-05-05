import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "node:http";
import { PokerRoom } from "./rooms/PokerRoom.js";

const PORT = Number(process.env.PORT ?? 2567);

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
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
