# WebRTC Messenger

Peer-to-peer chat following the architecture diagram:
**Peer A ↔ STUN ↔ TURN ↔ Signal Channel ↔ Peer B**

## Architecture Map

| Diagram Component | Implementation |
|---|---|
| **Signal Channel** | `server.js` — WebSocket server relays SDP + ICE |
| **STUN** | Google's public STUN servers (`stun.l.google.com`) |
| **TURN** | Configurable in `ICE_SERVERS` array in `index.html` |
| **Peer A / B** | Browser tabs running `index.html` |

## Handshake Flow (matches diagram)

1. Peer A → STUN: "Who am I?" → gets public IP/port (server-reflexive candidate)
2. Peer A → Signal: "Channel please" (WebSocket join)
3. Signal → Peer B: Offer SDP forwarded
4. Peer B → STUN: "Who am I?" → gets its candidate
5. Peer B → Signal: Answer SDP forwarded
6. Both peers exchange ICE candidates (A) and (B) via Signal
7. DataChannel opens — all messages flow P2P (no server relay)

## Quick Start

```bash
npm install
npm start
# → http://localhost:3000
```

Open **two browser tabs** to `http://localhost:3000`.  
Type the **same Room ID** in both tabs and click **Join Room**.

## Adding TURN (for Symmetric NAT)

Edit `ICE_SERVERS` in `index.html`:

```js
{
  urls: "turn:your-turn-server.com:3478",
  username: "your-username",
  credential: "your-password",
}
```

Free options: [Metered.ca](https://www.metered.ca/tools/openrelay/), [Twilio NTS](https://www.twilio.com/stun-turn)
