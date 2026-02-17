"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wss = void 0;
const ws_1 = require("ws");
const auth_1 = require("./auth");
const notification_broadcast_service_1 = require("../modules/notification/notification-broadcast.service");
const conversation_service_1 = require("../modules/communication/conversation.service");
const client_1 = require("@prisma/client");
// Map of connections: connectionKey -> ClientConnection
const connections = new Map();
// Map of rooms: conversationId -> Set of connectionKeys
const conversationRooms = new Map();
// Build unique connection key
const buildConnectionKey = (userType, userId) => `${userType}:${userId}`;
const resolveParticipantType = (userType) => {
    switch (userType) {
        case 'USER':
            return client_1.ParticipantType.EMPLOYER;
        case 'CANDIDATE':
            return client_1.ParticipantType.CANDIDATE;
        case 'CONSULTANT':
            return client_1.ParticipantType.CONSULTANT;
        case 'HRM8':
            return client_1.ParticipantType.SYSTEM;
        default:
            return client_1.ParticipantType.CANDIDATE;
    }
};
/**
 * Transform Prisma message object to frontend camelCase format
 */
const transformMessageForFrontend = (msg, currentUserId) => ({
    id: msg.id,
    conversationId: msg.conversation_id,
    senderEmail: msg.sender_email,
    senderType: msg.sender_type,
    senderId: msg.sender_id,
    content: msg.content,
    contentType: msg.content_type,
    readBy: msg.read_by || [],
    deliveredAt: msg.delivered_at,
    readAt: msg.read_at,
    createdAt: msg.created_at,
    updatedAt: msg.updated_at,
    isOwn: currentUserId ? msg.sender_id === currentUserId : false,
    attachments: msg.attachments?.map((a) => ({
        id: a.id,
        fileName: a.file_name,
        fileUrl: a.file_url,
        mimeType: a.mime_type,
        size: a.size,
    })) || [],
});
// Initialize WebSocket Server (noServer mode for attaching to HTTP server)
exports.wss = new ws_1.WebSocketServer({ noServer: true });
// --- Broadcasting Logic ---
const broadcast = (message, options) => {
    const { type, conversationId, targetConnectionKeys, excludeConnectionKey } = options;
    let targetKeys = [];
    switch (type) {
        case 'global':
            targetKeys = Array.from(connections.keys());
            break;
        case 'users':
            targetKeys = targetConnectionKeys || [];
            break;
        case 'room':
            if (conversationId) {
                const room = conversationRooms.get(conversationId);
                if (room)
                    targetKeys = Array.from(room);
            }
            break;
    }
    // Filter excluded
    if (excludeConnectionKey) {
        targetKeys = targetKeys.filter(k => k !== excludeConnectionKey);
    }
    // Send
    targetKeys.forEach(key => {
        const conn = connections.get(key);
        if (conn && conn.ws.readyState === ws_1.WebSocket.OPEN) {
            conn.ws.send(JSON.stringify(message));
        }
    });
};
const broadcastToRoom = (conversationId, message, excludeConnectionKey) => {
    broadcast(message, { type: 'room', conversationId, excludeConnectionKey });
};
// Initialize the Broadcast Service Bridge
notification_broadcast_service_1.NotificationBroadcastService.init(broadcast, connections);
// --- Room Management ---
const addUserToRoom = (conversationId, connectionKey) => {
    if (!conversationRooms.has(conversationId)) {
        conversationRooms.set(conversationId, new Set());
    }
    conversationRooms.get(conversationId).add(connectionKey);
};
const removeUserFromRoom = (conversationId, connectionKey) => {
    const room = conversationRooms.get(conversationId);
    if (room) {
        room.delete(connectionKey);
        if (room.size === 0) {
            conversationRooms.delete(conversationId);
        }
    }
};
const sendError = (ws, message, code = 4000) => {
    if (ws.readyState === ws_1.WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', payload: { message, code } }));
    }
};
// --- Connection Handling ---
exports.wss.on('connection', async (ws, req) => {
    // 1. Authenticate
    const auth = await (0, auth_1.authenticateWebSocket)(req);
    if (!auth) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Authentication failed' } }));
        ws.close();
        return;
    }
    const connectionKey = buildConnectionKey(auth.userType, auth.userId);
    const connection = {
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
    // Broadcast authentication success
    ws.send(JSON.stringify({
        type: 'authentication_success',
        payload: {
            userEmail: auth.email,
            userName: auth.name,
            userType: auth.userType,
            message: 'Authentication successful',
        }
    }));
    // Heartbeat
    const pingInterval = setInterval(() => {
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            ws.ping();
        }
        else {
            clearInterval(pingInterval);
        }
    }, 30000);
    ws.on('message', async (data) => {
        try {
            const msg = JSON.parse(data.toString());
            console.log(`Received message from ${auth.email}:`, msg.type);
            const conversationService = new conversation_service_1.ConversationService();
            switch (msg.type) {
                case 'join_conversation': {
                    const { conversationId } = msg.payload;
                    if (!conversationId)
                        return;
                    // Leave previous room if any
                    if (connection.conversationId) {
                        removeUserFromRoom(connection.conversationId, connectionKey);
                    }
                    // Join new room
                    connection.conversationId = conversationId;
                    addUserToRoom(conversationId, connectionKey);
                    // Fetch messages
                    const messages = await conversationService.listMessages(conversationId, 100);
                    ws.send(JSON.stringify({
                        type: 'messages_loaded',
                        payload: {
                            conversationId,
                            messages: messages.map(m => transformMessageForFrontend(m, auth.userId))
                        }
                    }));
                    // Mark as read
                    await conversationService.markMessagesAsRead(conversationId, auth.userId);
                    break;
                }
                case 'send_message': {
                    const { conversationId, content, contentType, attachments } = msg.payload;
                    if (!conversationId || (!content && !attachments))
                        return;
                    // Create message
                    const newMessage = await conversationService.createMessage({
                        conversationId,
                        senderType: resolveParticipantType(auth.userType),
                        senderId: auth.userId,
                        senderEmail: auth.email,
                        content: content || '',
                        contentType: contentType || 'TEXT',
                        attachments
                    });
                    // Transform for broadcasting
                    const transformed = transformMessageForFrontend(newMessage);
                    // Broadcast to room (others)
                    broadcastToRoom(conversationId, {
                        type: 'new_message',
                        payload: transformed
                    }, connectionKey);
                    // Send confirmation to sender (with isOwn: true)
                    ws.send(JSON.stringify({
                        type: 'message_sent',
                        payload: transformMessageForFrontend(newMessage, auth.userId)
                    }));
                    break;
                }
            }
        }
        catch (err) {
            console.error('WS Message Error:', err);
            const errorMessage = err.message || 'Internal server error processing message';
            const statusCode = err.code || err.status || 4000;
            sendError(ws, errorMessage, statusCode);
        }
    });
    ws.on('close', () => {
        clearInterval(pingInterval);
        if (connection.conversationId) {
            removeUserFromRoom(connection.conversationId, connectionKey);
        }
        connections.delete(connectionKey);
    });
    ws.on('error', (err) => {
        console.error(`WS Error for ${auth.email}:`, err);
    });
});
