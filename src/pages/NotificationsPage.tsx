import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Eye } from 'lucide-react';
import { adminNotificationsApi } from '../lib/api';
import { formatAWST } from '../contexts/AdminAuthContext';
import clsx from 'clsx';

interface Notification { _id: string; type: string; message: string; readAt: string | null; createdAt: string }

const TYPE_ICONS: Record<string, string> = {
  new_booking: '📅', cancellation: '❌', reschedule: '🔄', waitlist_opened: '✅',
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => adminNotificationsApi.list(),
    refetchInterval: 15000,
  });

  const notifications: Notification[] = data?.data?.data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.readAt).length;

  const readMutation = useMutation({
    mutationFn: (id: string) => adminNotificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });
  const readAllMutation = useMutation({
    mutationFn: () => adminNotificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6" aria-hidden="true" /> Notifications
            {unread > 0 && <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-sm">{unread} new</span>}
          </h1>
        </div>
        {unread > 0 && (
          <button onClick={() => readAllMutation.mutate()} disabled={readAllMutation.isPending} className="btn-secondary text-sm">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-12 text-white/30">
          <Bell className="w-10 h-10 mx-auto mb-3" aria-hidden="true" />
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n._id} className={clsx('card transition-all', !n.readAt ? 'border-brand-500/30 bg-brand-500/5' : 'opacity-60')}>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0" aria-hidden="true">{TYPE_ICONS[n.type] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">{n.message}</p>
                  <p className="text-white/30 text-xs mt-1">{formatAWST(n.createdAt)}</p>
                </div>
                {!n.readAt && (
                  <button onClick={() => readMutation.mutate(n._id)} className="btn-ghost p-1.5 flex-shrink-0" aria-label="Mark as read">
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
