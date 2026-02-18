const http = require("http");
const { WebSocketServer } = require("ws");
const path = require("path");
const fs = require("fs");

const PORT = 3000;

const httpServer = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    const filePath = path.join(__dirname, "index.html");
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("index.html not found");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

const wss = new WebSocketServer({ server: httpServer });

const rooms = new Map();

function broadcast(roomId, senderWs, message) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(message);
  for (const client of room) {
    if (client !== senderWs && client.readyState === 1 /* OPEN */) {
      client.send(data);
    }
  }
}

wss.on("connection", (ws) => {
  let currentRoom = null;
  console.log("[server] New connection");

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    const { type, roomId } = msg;

    switch (type) {
      case "join": {
        currentRoom = roomId;
        if (!rooms.has(roomId)) rooms.set(roomId, new Set());
        const room = rooms.get(roomId);

        if (room.size >= 2) {
          ws.send(JSON.stringify({ type: "error", message: "Room is full (max 2 peers)." }));
          return;
        }

        room.add(ws);
        const isInitiator = room.size === 1;
        ws.send(JSON.stringify({ type: "joined", roomId, isInitiator, peers: room.size }));

        if (room.size === 2) {
          broadcast(roomId, ws, { type: "peer-joined" });
        }
        console.log(`[server] Room "${roomId}" has ${room.size} peer(s)`);
        break;
      }

      case "offer":
        console.log(`[server] Relaying offer in room "${currentRoom}"`);
        broadcast(currentRoom, ws, { type: "offer", sdp: msg.sdp });
        break;

      case "answer":
        console.log(`[server] Relaying answer in room "${currentRoom}"`);
        broadcast(currentRoom, ws, { type: "answer", sdp: msg.sdp });
        break;

      case "ice-candidate":
        broadcast(currentRoom, ws, { type: "ice-candidate", candidate: msg.candidate });
        break;

      default:
        console.warn("[server] Unknown message type:", type);
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(ws);
      console.log(`[server] Peer left room "${currentRoom}"`);
      broadcast(currentRoom, ws, { type: "peer-left" });
      if (rooms.get(currentRoom).size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });

  ws.on("error", (err) => console.error("[server] WS error:", err.message));
});

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Signaling server running at http://localhost:${PORT}`);
  console.log(`   Open two browser tabs to the same URL and use the same Room ID.\n`);
});