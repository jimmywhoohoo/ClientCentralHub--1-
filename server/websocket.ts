import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import type { Task } from '@db/schema';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { tasks } from '@db/schema';

interface Client {
  id: string;
  ws: WebSocket;
  userId: number;
}

interface TaskUpdate {
  type: 'task_update';
  taskId: number;
  status: string;
  userId: number;
}

type Message = TaskUpdate;

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    verifyClient: (info) => {
      // Skip Vite HMR WebSocket connections
      return !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr');
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

        if (message.type === 'task_update') {
          // Update task status in database
          await db.update(tasks)
            .set({ status: message.status })
            .where(eq(tasks.id, message.taskId));

          // Broadcast to all other clients
          Array.from(clients.values()).forEach((otherClient) => {
            if (otherClient.id !== clientId) {
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

    // Handle client authentication
    ws.on('message', (data) => {
      try {
        const { userId } = JSON.parse(data.toString());
        clients.set(clientId, { id: clientId, ws, userId });
      } catch (error) {
        console.error('WebSocket auth error:', error);
      }
    });
  });

  return wss;
}