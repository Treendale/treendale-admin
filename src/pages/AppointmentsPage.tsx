import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle, X } from 'lucide-react';
import { adminAppointmentsApi } from '../lib/api';
import { formatAWST } from '../contexts/AdminAuthContext';
import clsx from 'clsx';

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-pending', confirmed: 'badge-confirmed',
  cancelled: 'badge-cancelled', completed: 'badge-completed', no_show: 'badge-no_show',
};

type ViewMode = 'day' | 'week';

interface Appointment {
  _id: string;
  clientId: { firstName: string; lastName: string; phone: string; email: string };
  serviceId: { name: string; price: number; durationMinutes: number };
  serviceIds?: Array<{ name: string; price: number; durationMinutes: number }>;
  staffId: { userId: { firstName: string } };
  startTime: string;
  endTime: string;
  status: string;
  cancellationReason?: string;
}

export default function AppointmentsPage() {
  const [view, setView] = useState<ViewMode>('week');
  const [date, setDate] = useState(new Date());
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const queryClient = useQueryClient();

  const from = view === 'day'
    ? format(date, 'yyyy-MM-dd')
    : format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const to = view === 'day'
    ? format(date, 'yyyy-MM-dd')
    : format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', from, to],
    queryFn: () => adminAppointmentsApi.list({ from, to }),
  });

  const appointments: Appointment[] = data?.data?.data?.appointments ?? [];

  const confirmMutation = useMutation({
    mutationFn: (id: string) => adminAppointmentsApi.confirm(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });
  const completeMutation = useMutation({
    mutationFn: (id: string) => adminAppointmentsApi.complete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });
  const noShowMutation = useMutation({
    mutationFn: (id: string) => adminAppointmentsApi.noShow(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminAppointmentsApi.cancel(id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['appointments'] }); setSelected(null); },
  });

  function prev() { setDate(d => view === 'day' ? addDays(d, -1) : addDays(d, -7)); }
  function next() { setDate(d => view === 'day' ? addDays(d, 1) : addDays(d, 7)); }

  const dateLabel = view === 'day'
    ? format(date, 'EEEE, d MMMM yyyy')
    : `${format(startOfWeek(date, { weekStartsOn: 1 }), 'd MMM')} – ${format(endOfWeek(date, { weekStartsOn: 1 }), 'd MMM yyyy')}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
        <div className="flex items-center gap-2">
          <div className="flex border border-admin-border rounded-lg overflow-hidden">
            {(['day', 'week'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={clsx('px-4 py-2 text-sm font-medium transition-colors capitalize min-h-[44px]', view === v ? 'bg-brand-500/20 text-blush' : 'text-white/50 hover:text-white')}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-3">
        <button onClick={prev} className="btn-ghost p-2" aria-label="Previous">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-white font-medium text-sm flex-1 text-center">{dateLabel}</span>
        <button onClick={next} className="btn-ghost p-2" aria-label="Next">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => setDate(new Date())} className="btn-secondary text-xs px-3">Today</button>
      </div>

      {/* Appointment list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-12 text-white/30">No appointments in this period.</div>
      ) : (
        <div className="space-y-2">
          {appointments
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .map((apt) => (
              <div
                key={apt._id}
                className="card hover:border-blush/30 transition-all cursor-pointer"
                onClick={() => setSelected(apt)}
                role="button"
                tabIndex={0}
                aria-label={`${apt.clientId?.firstName} ${apt.clientId?.lastName} — ${apt.serviceIds && apt.serviceIds.length > 0 ? apt.serviceIds.map(s => s.name).join(', ') : apt.serviceId?.name}`}
                onKeyDown={(e) => e.key === 'Enter' && setSelected(apt)}
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-center w-20 flex-shrink-0">
                    <p className="text-blush font-bold text-sm">
                      {new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Perth', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(apt.startTime))}
                    </p>
                    <p className="text-white/30 text-xs">
                      {apt.serviceIds && apt.serviceIds.length > 0
                        ? apt.serviceIds.reduce((sum, s) => sum + s.durationMinutes, 0)
                        : apt.serviceId?.durationMinutes}m
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{apt.clientId?.firstName} {apt.clientId?.lastName}</p>
                    <p className="text-white/40 text-sm truncate">
                      {apt.serviceIds && apt.serviceIds.length > 0
                        ? apt.serviceIds.map(s => s.name).join(', ')
                        : apt.serviceId?.name}
                    </p>
                    <p className="text-white/30 text-xs">{apt.clientId?.phone}</p>
                  </div>
                  <span className={STATUS_BADGE[apt.status] ?? ''}>{apt.status.replace('_', ' ')}</span>
                  <ChevronRight className="w-4 h-4 text-white/20" aria-hidden="true" />
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Appointment detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="apt-modal-title">
          <div className="card max-w-md w-full space-y-4">
            <div className="flex items-start justify-between">
              <h2 id="apt-modal-title" className="font-bold text-white text-lg">Appointment Details</h2>
              <button onClick={() => { setSelected(null); setCancelReason(''); }} className="btn-ghost p-1" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              {[
                ['Client', `${selected.clientId?.firstName} ${selected.clientId?.lastName}`],
                ['Phone', selected.clientId?.phone],
                ['Email', selected.clientId?.email],
                ['Services', selected.serviceIds && selected.serviceIds.length > 0 
                  ? selected.serviceIds.map(s => s.name).join(', ')
                  : selected.serviceId?.name],
                ['Time', formatAWST(selected.startTime)],
                ['Duration', `${selected.serviceIds && selected.serviceIds.length > 0
                  ? selected.serviceIds.reduce((sum, s) => sum + s.durationMinutes, 0)
                  : selected.serviceId?.durationMinutes} min`],
                ['Status', selected.status.replace('_', ' ')],
              ].map(([label, val]) => (
                <div key={label} className="flex gap-2">
                  <span className="text-white/40 w-20 flex-shrink-0">{label}</span>
                  <span className="text-white">{val}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              {selected.status === 'pending' && (
                <button onClick={() => { confirmMutation.mutate(selected._id); setSelected(null); }} className="btn-primary text-sm">
                  <CheckCircle className="w-3.5 h-3.5" /> Confirm
                </button>
              )}
              {['pending', 'confirmed'].includes(selected.status) && (
                <button onClick={() => { completeMutation.mutate(selected._id); setSelected(null); }} className="btn-secondary text-sm">
                  Complete
                </button>
              )}
              {['pending', 'confirmed'].includes(selected.status) && (
                <button onClick={() => { noShowMutation.mutate(selected._id); setSelected(null); }} className="btn-secondary text-sm">
                  No-show
                </button>
              )}
            </div>

            {/* Cancel */}
            {['pending', 'confirmed'].includes(selected.status) && (
              <div>
                <label htmlFor="modal-cancel-reason" className="label">Cancel with reason</label>
                <textarea
                  id="modal-cancel-reason"
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="input resize-none mb-2"
                  placeholder="Reason for cancellation..."
                />
                <button
                  onClick={() => cancelMutation.mutate({ id: selected._id, reason: cancelReason })}
                  disabled={!cancelReason || cancelMutation.isPending}
                  className="btn-danger text-sm w-full"
                >
                  Cancel Appointment
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
