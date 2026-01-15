import {
  Bell,
  Package,
  AlertTriangle,
  FileText,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { Card, Button } from '../components/ui';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks/useData';

export default function NotificationsPage() {
  const { data, isLoading, error } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading notifications: {(error as Error).message}
      </div>
    );
  }

  const { notifications, unread_count } = data || {
    notifications: [],
    unread_count: 0,
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'bag_used':
        return <Package className="w-5 h-5" />;
      case 'threshold_alert':
        return <AlertTriangle className="w-5 h-5" />;
      case 'daily_summary':
        return <FileText className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'bag_used':
        return 'text-green-600 bg-green-100';
      case 'threshold_alert':
        return 'text-amber-600 bg-amber-100';
      case 'daily_summary':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleMarkRead = async (notificationId: string) => {
    try {
      await markReadMutation.mutateAsync(notificationId);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {unread_count > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {unread_count} unread notification{unread_count !== 1 ? 's' : ''}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            isLoading={markAllReadMutation.isPending}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        </div>
      )}

      {/* Notifications List */}
      <Card padding="none">
        <div className="divide-y divide-gray-200">
          {notifications.map((notification: any) => (
            <div
              key={notification.id}
              className={`flex items-start gap-4 p-4 cursor-pointer transition-colors ${
                notification.is_read ? 'bg-white' : 'bg-blue-50 hover:bg-blue-100'
              }`}
              onClick={() => !notification.is_read && handleMarkRead(notification.id)}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(
                  notification.notification_type
                )}`}
              >
                {getNotificationIcon(notification.notification_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4
                    className={`font-medium ${
                      notification.is_read ? 'text-gray-700' : 'text-gray-900'
                    }`}
                  >
                    {notification.title}
                  </h4>
                  {!notification.is_read && (
                    <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                  )}
                </div>
                <p
                  className={`text-sm mt-1 ${
                    notification.is_read ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {notification.body}
                </p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {formatTime(notification.created_at)}
              </span>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No notifications</p>
              <p className="text-sm text-gray-400">
                You're all caught up!
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
