import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { FileMessageStore, StoredMessage } from './store';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

interface Client extends WebSocket {
  subscribedTopics: Set<string>;
}

(async () => {
  // --- initialize persistence (optional) ---
  const store = new FileMessageStore();
  await store.init();

  // --- HTTP + WS setup ---
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // serve client HTML/JS
  app.use(express.static('public'));

  // helper: broadcast to all clients subscribed to `topic`
  const broadcast = (topic: string, payload: any) => {
    const msg = JSON.stringify({ topic, payload, timestamp: Date.now() });
    for (const client of wss.clients as Set<Client>) {
      if (client.readyState === WebSocket.OPEN && client.subscribedTopics.has(topic)) {
        client.send(msg);
      }
    }
  };

  wss.on('connection', (ws: WebSocket) => {
    const client = ws as Client;
    client.subscribedTopics = new Set();

    ws.on('message', async raw => {
      try {
        const { action, topic, payload } = JSON.parse(raw.toString());
        switch (action) {
          case 'subscribe':
            client.subscribedTopics.add(topic);
            break;
          case 'unsubscribe':
            client.subscribedTopics.delete(topic);
            break;
          case 'publish':
            // optionally persist
            const record: StoredMessage = { topic, payload, timestamp: Date.now() };
            await store.save(record);
            // broadcast
            broadcast(topic, payload);
            break;
          default:
            ws.send(JSON.stringify({ error: 'unknown action' }));
        }
      } catch (err) {
        ws.send(JSON.stringify({ error: 'invalid message format' }));
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`Pub/Sub WS server running at http://localhost:${PORT}`);
  });
})();
