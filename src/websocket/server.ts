import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { authenticateWebSocket } from './auth';
import { ClientConnection, WSMessage } from './types';
import { NotificationBroadcastService } from '../modules/notification/notification-broadcast.service';

// Map of connections: connectionKey -> ClientConnection
const connections = new Map<string, ClientConnection>();

// Build unique connection key
const buildConnectionKey = (userType: 'USER' | 'CANDIDATE' | 'CONSULTANT' | 'HRM8', userId: string) =>
  `${userType}:${userId}`;

// Initialize WebSocket Server (noServer mode for attaching to HTTP server)
export const wss = new WebSocketServer({ noServer: true });

// --- Broadcast Logic ---

const broadcast = (
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
      // Implement room logic when chat is migrated
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
    type: 'connection_established',
    payload: { 
      message: 'Connected', 
      user: { id: auth.userId, name: auth.name, type: auth.userType } 
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

  ws.on('message', (data: Buffer) => {
    try {
      const msg: WSMessage = JSON.parse(data.toString());
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
