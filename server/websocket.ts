import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { db } from '@db';
import { eq, desc } from 'drizzle-orm';
import { documents, users, documentMessages } from '@db/schema';
import { randomUUID } from 'crypto';

interface Client {
  id: string;
  ws: WebSocket;
  userId: number;
  username: string;
  documentId?: number;
}

interface ChatMessage {
  type: 'chat_message';
  documentId: number;
  content: string;
  userId: number;
  username: string;
  timestamp: string;
}

interface JoinChat {
  type: 'join_chat';
  documentId: number;
  userId: number;
  username: string;
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
  username: string;
  position: { line: number; ch: number };
}

type Message = ChatMessage | JoinChat | DocumentUpdate | CursorUpdate;

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    verifyClient: (info) => {
      // Skip Vite HMR WebSocket connections
      return !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr');
    }
  });

  const clients = new Map<string, Client>();
  const documentRooms = new Map<number, Set<string>>();

  const broadcastToDocument = (documentId: number, message: any, excludeClientId?: string) => {
    const roomClients = documentRooms.get(documentId);
    if (!roomClients) return;

    roomClients.forEach(clientId => {
      if (excludeClientId && clientId === excludeClientId) return;

      const client = clients.get(clientId);
      if (client?.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  };

  const updateDocumentParticipants = (documentId: number) => {
    const roomClients = documentRooms.get(documentId);
    if (!roomClients) return;

    const participants = Array.from(roomClients)
      .map(clientId => {
        const client = clients.get(clientId);
        return client?.username;
      })
      .filter(Boolean);

    broadcastToDocument(documentId, {
      type: 'collaborators',
      users: participants
    });
  };

  wss.on('connection', (ws) => {
    const clientId = randomUUID();

    ws.on('message', async (data) => {
      try {
        const message: Message = JSON.parse(data.toString());
        const client = clients.get(clientId);

        if (!client) return;

        switch (message.type) {
          case 'join_chat': {
            // Update client with document room info
            client.documentId = message.documentId;

            // Add client to document room
            let room = documentRooms.get(message.documentId);
            if (!room) {
              room = new Set();
              documentRooms.set(message.documentId, room);
            }
            room.add(clientId);

            // Update participants list
            updateDocumentParticipants(message.documentId);

            // Load recent messages
            const recentMessages = await db.query.documentMessages.findMany({
              where: eq(documents.id, message.documentId),
              orderBy: desc(documentMessages.createdAt),
              limit: 50
            });

            ws.send(JSON.stringify({
              type: 'chat_history',
              messages: recentMessages.reverse()
            }));
            break;
          }

          case 'chat_message': {
            // Store message in database
            const [savedMessage] = await db
              .insert(documentMessages)
              .values({
                documentId: message.documentId,
                userId: message.userId,
                content: message.content,
                createdAt: new Date(message.timestamp)
              })
              .returning();

            // Broadcast to all clients in the document room
            const broadcastMessage = {
              type: 'chat_message',
              id: savedMessage.id,
              documentId: message.documentId,
              content: message.content,
              userId: message.userId,
              username: message.username,
              timestamp: message.timestamp
            };

            broadcastToDocument(message.documentId, broadcastMessage);
            break;
          }

          case 'update': {
            // Handle document content updates
            await db
              .update(documents)
              .set({ content: message.content })
              .where(eq(documents.id, message.documentId));

            broadcastToDocument(
              message.documentId,
              {
                type: 'update',
                content: message.content
              },
              clientId
            );
            break;
          }

          case 'cursor': {
            // Broadcast cursor position to other clients
            broadcastToDocument(
              message.documentId,
              {
                type: 'cursor',
                userId: message.userId,
                username: message.username,
                position: message.position
              },
              clientId
            );
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      const client = clients.get(clientId);
      if (client?.documentId) {
        const room = documentRooms.get(client.documentId);
        if (room) {
          room.delete(clientId);
          if (room.size === 0) {
            documentRooms.delete(client.documentId);
          } else {
            updateDocumentParticipants(client.documentId);
          }
        }
      }
      clients.delete(clientId);
    });

    // Handle client authentication
    ws.once('message', (data) => {
      try {
        const { userId, username } = JSON.parse(data.toString());
        clients.set(clientId, { id: clientId, ws, userId, username });
      } catch (error) {
        console.error('WebSocket auth error:', error);
        ws.close();
      }
    });
  });

  return wss;
}