import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Eye, ArrowRight } from 'lucide-react';
import { adminNotificationsApi } from '../lib/api';
import { formatAWST } from '../contexts/AdminAuthContext';
import clsx from 'clsx';

interface Notification {
  _id: string;
  type: string;
  message: string;
  relatedAppointmentId?: any;
  readAt: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  new_booking: '📅',
  cancellation: '❌',
  reschedule: '🔄',
  waitlist_opened: '✅',
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  function handleCardClick(n: Notification) {
    if (!n.readAt) {
      readMutation.mutate(n._id);
    }
    if (['new_booking', 'cancellation', 'reschedule'].includes(n.type) || n.relatedAppointmentId) {
      navigate('/appointments');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cocoa flex items-center gap-2">
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
        <div className="card text-center py-12 text-cocoa/30">
          <Bell className="w-10 h-10 mx-auto mb-3" aria-hidden="true" />
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n._id}
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick(n)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(n); } }}
              className={clsx(
                'card transition-all cursor-pointer select-none hover:shadow-md hover:border-brand-500/40 active:scale-[0.99]',
                !n.readAt ? 'border-brand-500/40 bg-brand-500/10' : 'opacity-65 hover:opacity-100 hover:bg-admin-bg',
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">{TYPE_ICONS[n.type] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={clsx('text-sm', !n.readAt ? 'text-cocoa font-semibold' : 'text-cocoa/90')}>
                      {n.message}
                    </p>
                    {!n.readAt && (
                      <span className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0 animate-pulse" title="Unread" />
                    )}
                  </div>
                  <p className="text-cocoa/40 text-xs mt-1">{formatAWST(n.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 self-center">
                  {!n.readAt && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        readMutation.mutate(n._id);
                      }}
                      className="btn-ghost p-1.5 hover:text-brand-300"
                      aria-label="Mark as read"
                      title="Mark as read"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <div className="text-cocoa/30 hover:text-cocoa p-1">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
