import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, X, Clock, Phone, Mail } from 'lucide-react';
import { adminAppointmentsApi } from '../lib/api';
import { formatAWST } from '../contexts/AdminAuthContext';

interface Appointment {
  _id: string;
  clientId: { firstName: string; lastName: string; phone: string; email: string };
  serviceId: { name: string; durationMinutes: number };
  serviceIds?: Array<{ name: string; durationMinutes: number }>;
  startTime: string;
  status: string;
}

export default function BookingsInboxPage() {
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pending-appointments'],
    queryFn: () => adminAppointmentsApi.list({ status: 'pending' }),
    refetchInterval: 15000,
  });

  const appointments: Appointment[] = data?.data?.data?.appointments ?? [];

  const confirmMutation = useMutation({
    mutationFn: (id: string) => adminAppointmentsApi.confirm(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-appointments'] }),
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminAppointmentsApi.reject(id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pending-appointments'] }); setRejectId(null); setRejectReason(''); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bookings Inbox</h1>
          <p className="text-white/40 text-sm mt-1">Pending bookings requiring your confirmation</p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-300 text-sm font-medium">
          {appointments.length} pending
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-16">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-white font-medium">All caught up!</p>
          <p className="text-white/40 text-sm mt-1">No pending bookings to confirm.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div key={apt._id} className="card space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-white font-bold text-lg">{apt.clientId?.firstName} {apt.clientId?.lastName}</p>
                  <p className="text-brand-300 font-semibold text-sm">
                    {apt.serviceIds && apt.serviceIds.length > 0
                      ? apt.serviceIds.map(s => s.name).join(', ')
                      : apt.serviceId?.name}
                  </p>
                  <p className="text-white/50 text-sm flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    {formatAWST(apt.startTime)} · {apt.serviceIds && apt.serviceIds.length > 0
                      ? apt.serviceIds.reduce((sum, s) => sum + s.durationMinutes, 0)
                      : apt.serviceId?.durationMinutes} min
                  </p>
                </div>
                <span className="badge-pending">pending</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 text-sm text-white/40">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{apt.clientId?.phone}</span>
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{apt.clientId?.email}</span>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => confirmMutation.mutate(apt._id)}
                  disabled={confirmMutation.isPending}
                  className="btn-primary flex-1 text-sm"
                  aria-label={`Confirm booking for ${apt.clientId?.firstName}`}
                >
                  <CheckCircle className="w-4 h-4" /> Confirm
                </button>
                <button
                  onClick={() => setRejectId(apt._id)}
                  className="btn-danger flex-1 text-sm"
                  aria-label={`Reject booking for ${apt.clientId?.firstName}`}
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="card max-w-sm w-full space-y-4">
            <h2 className="font-bold text-white">Reject Booking</h2>
            <p className="text-white/50 text-sm">Please provide a reason — this will be emailed to the client.</p>
            <div>
              <label htmlFor="reject-reason-input" className="label">Reason</label>
              <textarea
                id="reject-reason-input"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input resize-none"
                placeholder="e.g. The requested time is no longer available..."
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setRejectId(null); setRejectReason(''); }} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason })}
                disabled={!rejectReason || rejectMutation.isPending}
                className="btn-danger flex-1"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
