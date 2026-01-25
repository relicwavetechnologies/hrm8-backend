import { WebSocket } from 'ws';

export interface ClientConnection {
  ws: WebSocket;
  userEmail: string;
  userName: string;
  userId: string;
  userType: 'USER' | 'CANDIDATE' | 'CONSULTANT' | 'HRM8';
  connectionKey: string;
  authenticated: boolean;
  conversationId?: string; // Current room
}

export interface WSMessage {
  type: string;
  payload: any;
}
