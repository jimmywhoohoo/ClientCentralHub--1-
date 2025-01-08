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
    status: 'pending' | 'completed' | 'in_progress' | 'cancelled';
    completedAt: string | null;
    updatedAt: string;
  };
  userId: number;
}

type Message = TaskUpdate;

function validateTaskUpdate(currentStatus: string, newStatus: string): { isValid: boolean; message?: string } {
  const validTransitions: Record<string, string[]> = {
    'pending': ['in_progress', 'completed', 'cancelled'],
    'in_progress': ['completed', 'cancelled', 'pending'],
    'completed': ['pending'],
    'cancelled': ['pending']
  };

  if (!validTransitions[currentStatus]) {
    return { isValid: false, message: `Invalid current status: ${currentStatus}` };
  }

  if (!validTransitions[currentStatus].includes(newStatus)) {
    return { 
      isValid: false, 
      message: `Cannot change task status from '${currentStatus}' to '${newStatus}'. Valid transitions are: ${validTransitions[currentStatus].join(', ')}`
    };
  }

  return { isValid: true };
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    verifyClient: (info: any) => {
      return !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr');
    }
  });

  const clients = new Map<string, Client>();

  const broadcastToClients = (message: any, excludeClientId?: string) => {
    clients.forEach((client, clientId) => {
      if (excludeClientId && clientId === excludeClientId) return;

      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (err) {
          console.error('Failed to broadcast to client:', err);
        }
      }
    });
  };

  wss.on('connection', (ws) => {
    const clientId = randomUUID();

    ws.on('message', async (data) => {
      let parsedMessage: Message;

      try {
        parsedMessage = JSON.parse(data.toString());
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          code: 'MESSAGE_PARSE_ERROR',
          message: 'Invalid message format'
        }));
        return;
      }

      const client = clients.get(clientId);
      if (!client) return;

      if (parsedMessage.type === 'task_update' && parsedMessage.taskId && parsedMessage.changes) {
        try {
          // Fetch current task status
          const [currentTask] = await db
            .select()
            .from(tasks)
            .where(eq(tasks.id, parsedMessage.taskId))
            .limit(1);

          if (!currentTask) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'TASK_NOT_FOUND',
              message: 'Task not found'
            }));
            return;
          }

          // Validate status transition
          const validation = validateTaskUpdate(currentTask.status, parsedMessage.changes.status);
          if (!validation.isValid) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'INVALID_STATUS_TRANSITION',
              message: validation.message
            }));
            return;
          }

          // Update task in database
          const [updatedTask] = await db
            .update(tasks)
            .set({
              status: parsedMessage.changes.status,
              completedAt: parsedMessage.changes.completedAt ? new Date(parsedMessage.changes.completedAt) : null,
              updatedAt: new Date(parsedMessage.changes.updatedAt)
            })
            .where(eq(tasks.id, parsedMessage.taskId))
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
            code: 'DATABASE_ERROR',
            message: 'Failed to update task in database'
          }));
        }
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