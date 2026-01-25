import { UniversalNotification, NotificationRecipientType } from '@prisma/client';

// Types defining the interface for the WebSocket system
export type BroadcastFunction = (
    message: any,
    options: {
        type: 'room' | 'global' | 'users';
        targetConnectionKeys?: string[];
        excludeConnectionKey?: string;
    }
) => void;

export type ConnectionsMap = Map<string, any>;

let broadcastFn: BroadcastFunction | null = null;
let connectionsMap: ConnectionsMap | null = null;

export class NotificationBroadcastService {
  
  static init(broadcast: BroadcastFunction, connections: ConnectionsMap) {
    broadcastFn = broadcast;
    connectionsMap = connections;
  }

  static buildConnectionKey(
    recipientType: NotificationRecipientType,
    recipientId: string
  ): string {
    const userTypeMap: Record<NotificationRecipientType, string> = {
        USER: 'USER',
        CANDIDATE: 'CANDIDATE',
        CONSULTANT: 'CONSULTANT',
        HRM8_USER: 'HRM8',
    };
    return `${userTypeMap[recipientType]}:${recipientId}`;
  }

  static broadcastNotification(notification: UniversalNotification): boolean {
    if (!broadcastFn || !connectionsMap) {
        // Silent fail if WS not initialized (e.g. during tests or scripts)
        return false;
    }

    const connectionKey = this.buildConnectionKey(
        notification.recipient_type,
        notification.recipient_id
    );

    // Check if user is connected
    if (!connectionsMap.has(connectionKey)) {
        return false;
    }

    const message = {
        type: 'notification',
        payload: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            actionUrl: notification.action_url,
            createdAt: notification.created_at,
            read: notification.read,
        },
    };

    broadcastFn(message, {
        type: 'users',
        targetConnectionKeys: [connectionKey],
    });

    return true;
  }
}
