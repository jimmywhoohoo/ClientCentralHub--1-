import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import type { Document } from '@db/schema';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { documents } from '@db/schema';

interface Client {
  id: string;
  ws: WebSocket;
  documentId: number;
  userId: number;
}

interface DocumentUpdate {
  type: 'update';
  documentId: number;
  content: string;
  userId: number;
}

interface CursorUpdate {
  type: 'cursor';
  documentId: number;
  userId: number;
  position: { line: number; ch: number };
}

type Message = DocumentUpdate | CursorUpdate;

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    verifyClient: ({ req }) => {
      // Skip Vite HMR WebSocket connections
      return !req.headers['sec-websocket-protocol']?.includes('vite-hmr');
    }
  });

  const clients = new Map<string, Client>();

  wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substring(7);

    ws.on('message', async (data) => {
      try {
        const message: Message = JSON.parse(data.toString());
        const client = clients.get(clientId);

        if (!client) return;

        if (message.type === 'update') {
          // Save document changes to database
          await db.update(documents)
            .set({ content: message.content })
            .where(eq(documents.id, message.documentId));

          // Broadcast to all clients viewing this document
          Array.from(clients.entries()).forEach(([id, otherClient]) => {
            if (otherClient.documentId === message.documentId && id !== clientId) {
              otherClient.ws.send(JSON.stringify(message));
            }
          });
        } else if (message.type === 'cursor') {
          // Broadcast cursor position to other clients
          Array.from(clients.entries()).forEach(([id, otherClient]) => {
            if (otherClient.documentId === message.documentId && id !== clientId) {
              otherClient.ws.send(JSON.stringify(message));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
    });

    // Handle client authentication and document joining
    ws.on('message', (data) => {
      try {
        const { documentId, userId } = JSON.parse(data.toString());
        clients.set(clientId, { id: clientId, ws, documentId, userId });
      } catch (error) {
        console.error('WebSocket auth error:', error);
      }
    });
  });

  return wss;
}