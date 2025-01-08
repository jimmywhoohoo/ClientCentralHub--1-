import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { tasks } from '@db/schema';
import { randomUUID } from 'crypto';

interface Client {
  id: string;
  ws: WebSocket;
  userId: number;
  username: string;
}

interface TaskUpdate {
  type: 'task_update';
  taskId: number;
  changes: {
    status: string;
    completedAt: string | null;
    updatedAt: string;
  };
  userId: number;
}

type Message = TaskUpdate;

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    verifyClient: (info: any) => {
      // Skip Vite HMR WebSocket connections
      return !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr');
    }
  });

  const clients = new Map<string, Client>();

  const broadcastToClients = (message: any, excludeClientId?: string) => {
    clients.forEach((client, clientId) => {
      if (excludeClientId && clientId === excludeClientId) return;

      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  };

  wss.on('connection', (ws) => {
    const clientId = randomUUID();

    ws.on('message', async (data) => {
      try {
        const message: Message = JSON.parse(data.toString());
        const client = clients.get(clientId);

        if (!client) return;

        if (message.type === 'task_update' && message.taskId && message.changes) {
          try {
            // Update task in database
            const [updatedTask] = await db
              .update(tasks)
              .set({
                status: message.changes.status,
                completedAt: message.changes.completedAt ? new Date(message.changes.completedAt) : null,
                updatedAt: new Date(message.changes.updatedAt)
              })
              .where(eq(tasks.id, message.taskId))
              .returning();

            if (updatedTask) {
              // Broadcast task update to all clients
              broadcastToClients({
                type: 'task_update',
                task: updatedTask
              }, clientId);

              // Send success response to the originating client
              ws.send(JSON.stringify({
                type: 'task_update_success',
                task: updatedTask
              }));
            }
          } catch (error) {
            console.error('Database update error:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to update task in database'
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
    });

    // Handle client authentication
    ws.once('message', (data) => {
      try {
        const { userId, username } = JSON.parse(data.toString());
        if (userId && username) {
          clients.set(clientId, { id: clientId, ws, userId, username });

          // Send initial sync status
          ws.send(JSON.stringify({
            type: 'connected',
            message: 'Successfully connected to real-time updates'
          }));
        }
      } catch (error) {
        console.error('WebSocket auth error:', error);
        ws.close();
      }
    });
  });

  return wss;
}