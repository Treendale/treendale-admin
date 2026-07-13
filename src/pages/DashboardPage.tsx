import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, Clock, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { adminAppointmentsApi } from '../lib/api';
import { formatAWST } from '../contexts/AdminAuthContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import clsx from 'clsx';

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-pending', confirmed: 'badge-confirmed',
  cancelled: 'badge-cancelled', completed: 'badge-completed', no_show: 'badge-no_show',
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: todayData } = useQuery({
    queryKey: ['appointments-today'],
    queryFn: () => adminAppointmentsApi.list({ from: today, to: today }),
    refetchInterval: 60000,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['appointments-pending'],
    queryFn: () => adminAppointmentsApi.list({ status: 'pending' }),
    refetchInterval: 30000,
  });

  const todayAppts = todayData?.data?.data?.appointments ?? [];
  const pendingAppts = pendingData?.data?.data?.appointments ?? [];

  const confirmMutation = useMutation({
    mutationFn: (id: string) => adminAppointmentsApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments-today'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-pending'] });
    },
  });

  const todayStats = {
    total: todayAppts.length,
    confirmed: todayAppts.filter((a: { status: string }) => a.status === 'confirmed').length,
    pending: todayAppts.filter((a: { status: string }) => a.status === 'pending').length,
    completed: todayAppts.filter((a: { status: string }) => a.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">
          {new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Perth', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())} — AWST
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Total", value: todayStats.total, icon: CalendarCheck, color: 'text-blue-400' },
          { label: 'Confirmed', value: todayStats.confirmed, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Pending', value: todayStats.pending, icon: Clock, color: 'text-yellow-400' },
          { label: 'All Pending', value: pendingAppts.length, icon: AlertCircle, color: 'text-brand-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-xs uppercase tracking-wider">{label}</span>
              <Icon className={clsx('w-4 h-4', color)} aria-hidden="true" />
            </div>
            <span className="text-3xl font-bold text-white">{value}</span>
          </div>
        ))}
      </div>

      {/* Pending confirmations */}
      {pendingAppts.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" aria-hidden="true" />
              Needs Confirmation ({pendingAppts.length})
            </h2>
            <Link to="/inbox" className="text-blush text-xs hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {pendingAppts.slice(0, 5).map((apt: {
              _id: string;
              clientId: { firstName: string; lastName: string; phone: string; email: string };
              serviceId: { name: string; price: number };
              startTime: string;
              status: string;
            }) => (
              <div key={apt._id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-admin-bg border border-admin-border flex-wrap">
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {apt.clientId?.firstName} {apt.clientId?.lastName}
                  </p>
                  <p className="text-white/40 text-xs">{apt.serviceId?.name} · {formatAWST(apt.startTime)}</p>
                  <p className="text-white/30 text-xs">{apt.clientId?.phone}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => confirmMutation.mutate(apt._id)}
                    disabled={confirmMutation.isPending}
                    className="btn-primary text-xs px-3 py-1.5"
                    aria-label={`Confirm ${apt.clientId?.firstName}'s booking`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Confirm
                  </button>
                  <Link to="/inbox" className="btn-secondary text-xs px-3 py-1.5">Details</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's schedule */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-blush" aria-hidden="true" />
            Today's Schedule
          </h2>
          <Link to="/appointments" className="text-blush text-xs hover:underline flex items-center gap-1">
            Full calendar <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {todayAppts.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">No appointments today.</p>
        ) : (
          <div className="space-y-2">
            {todayAppts
              .sort((a: { startTime: string }, b: { startTime: string }) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .map((apt: {
                _id: string;
                clientId: { firstName: string; lastName: string };
                serviceId: { name: string };
                startTime: string;
                status: string;
              }) => (
                <div key={apt._id} className="flex items-center gap-4 p-3 rounded-lg bg-admin-bg border border-admin-border">
                  <div className="text-center w-16 flex-shrink-0">
                    <p className="text-blush font-bold text-sm">
                      {new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Perth', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(apt.startTime))}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {apt.clientId?.firstName} {apt.clientId?.lastName}
                    </p>
                    <p className="text-white/40 text-xs">{apt.serviceId?.name}</p>
                  </div>
                  <span className={STATUS_BADGE[apt.status] ?? ''}>{apt.status}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
