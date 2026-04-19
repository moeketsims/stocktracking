import { api } from './client';

export interface NotificationItem {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  data: Record<string, unknown>;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unread_count: number;
}

export const notificationsApi = {
  list: () => api.get<NotificationsResponse>('/api/notifications'),
  markRead: (id: string) => api.post(`/api/notifications/${id}/read`),
  markAllRead: () => api.post('/api/notifications/read-all'),
  unreadCount: () => api.get<{ unread_count: number }>('/api/notifications/unread-count'),
};
