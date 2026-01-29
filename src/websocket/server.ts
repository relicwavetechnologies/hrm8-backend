import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { authenticateWebSocket } from './auth';
import { ClientConnection, WSMessage } from './types';
import { NotificationBroadcastService } from '../modules/notification/notification-broadcast.service';
import { MessagingService } from '../modules/messaging/messaging.service';
import { MessagingRepository } from '../modules/messaging/messaging.repository';
import { ParticipantType } from '@prisma/client';

const messagingService = new MessagingService(new MessagingRepository());

// Map of connections: connectionKey -> ClientConnection
const connections = new Map<string, ClientConnection>();

// Build unique connection key
const buildConnectionKey = (userType: 'USER' | 'CANDIDATE' | 'CONSULTANT' | 'HRM8', userId: string) =>
  `${userType}:${userId}`;

// Initialize WebSocket Server (noServer mode for attaching to HTTP server)
export const wss = new WebSocketServer({ noServer: true });

// --- Broadcast Logic ---
export const broadcast = (
  message: any,
  options: {
    type: 'room' | 'global' | 'users';
    conversationId?: string; // Not used for notifications yet, but ready for chat
    excludeConnectionKey?: string;
    targetConnectionKeys?: string[];
  }
) => {
  const { type, targetConnectionKeys } = options;
  let targetKeys: string[] = [];

  switch (type) {
    case 'global':
      targetKeys = Array.from(connections.keys());
      break;
    case 'users':
      targetKeys = targetConnectionKeys || [];
      break;
    case 'room':
      targetKeys = Array.from(connections.entries())
        .filter(([_, conn]) => conn.conversationId === options.conversationId)
        .map(([key, _]) => key);
      break;
  }

  // Filter excluded
  if (options.excludeConnectionKey) {
    targetKeys = targetKeys.filter(k => k !== options.excludeConnectionKey);
  }

  // Send
  targetKeys.forEach(key => {
    const conn = connections.get(key);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify(message));
    }
  });
};

// Initialize the Broadcast Service Bridge
NotificationBroadcastService.init(broadcast, connections);

// --- Connection Handling ---

wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
  // 1. Authenticate
  const auth = await authenticateWebSocket(req);
  if (!auth) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Authentication failed' } }));
    ws.close();
    return;
  }

  const connectionKey = buildConnectionKey(auth.userType, auth.userId);

  const connection: ClientConnection = {
    ws,
    userEmail: auth.email,
    userName: auth.name,
    userId: auth.userId,
    userType: auth.userType,
    connectionKey,
    authenticated: true
  };

  connections.set(connectionKey, connection);

  // Send success message
  ws.send(JSON.stringify({
    type: 'authentication_success',
    payload: {
      message: 'Connected',
      userEmail: auth.email,
      userName: auth.name,
      userType: auth.userType === 'CANDIDATE' ? 'CANDIDATE' : 'USER'
    }
  }));

  // Heartbeat
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);

  ws.on('message', async (data: Buffer) => {
    try {
      const msg: WSMessage = JSON.parse(data.toString());

      if (msg.type === 'join_conversation') {
        const conversationId = msg.payload?.conversationId;
        if (conversationId) {
          // Verify user has access to conversation (via service)
          const result = await messagingService.getConversation(conversationId);

          // Basic security check: ensure user is participant
          const isParticipant = result?.participants.some(p => p.participantId === auth.userId);

          if (result && isParticipant) {
            connection.conversationId = conversationId;
            console.log(`User ${auth.email} joined conversation: ${conversationId}`);

            // Push message history immediately (Legacy Logic Restoration)
            ws.send(JSON.stringify({
              type: 'messages_loaded',
              payload: {
                conversationId,
                messages: result.messages // Now includes all fields from repo update
              }
            }));

            // Mark as read logic would go here if needed server-side
          } else {
            console.warn(`User ${auth.email} tried to join conversation ${conversationId} without access`);
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Access denied' } }));
          }
        }
      }
      else if (msg.type === 'send_message') {
        const { conversationId, content } = msg.payload as any;
        if (conversationId && content) {
          let senderType: ParticipantType = ParticipantType.SYSTEM;
          if (auth.userType === 'CANDIDATE') senderType = ParticipantType.CANDIDATE;
          else if (auth.userType === 'USER') senderType = ParticipantType.EMPLOYER;
          else if (auth.userType === 'CONSULTANT') senderType = ParticipantType.CONSULTANT;
          else if (auth.userType === 'HRM8') senderType = ParticipantType.EMPLOYER;

          await messagingService.sendMessage({
            conversationId,
            content,
            senderId: auth.userId,
            senderType,
            senderEmail: auth.email,
          });
          console.log(`User ${auth.email} sent message via WS to conversation: ${conversationId}`);
        }
      }

      // Handle client messages (e.g. 'mark_read', 'join_chat') here
      console.log(`Received message from ${auth.email}:`, msg.type);
    } catch (err) {
      console.error('WS Message Error:', err);
    }
  });

  ws.on('close', () => {
    clearInterval(pingInterval);
    connections.delete(connectionKey);
  });

  ws.on('error', (err) => {
    console.error(`WS Error for ${auth.email}:`, err);
  });
});
