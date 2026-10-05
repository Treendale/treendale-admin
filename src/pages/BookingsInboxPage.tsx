import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, X, Clock, Phone, Mail } from 'lucide-react';
import { adminAppointmentsApi } from '../lib/api';
import { formatAWST } from '../contexts/AdminAuthContext';
import clsx from 'clsx';

interface Appointment {
  _id: string;
  clientId: { firstName: string; lastName: string; phone: string; email: string };
  serviceId: { name: string; durationMinutes: number; category: string };
  serviceIds?: Array<{ name: string; durationMinutes: number; category: string }>;
  startTime: string;
  endTime?: string;
  status: string;
  overlaps?: Array<{
    _id: string;
    clientName: string;
    startTime: string;
    endTime: string;
    status: string;
  }>;
}

export default function BookingsInboxPage() {
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

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
    <>
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cocoa">Bookings Inbox</h1>
          <p className="text-cocoa/40 text-sm mt-1">Pending bookings requiring your confirmation</p>
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
          <p className="text-cocoa font-medium">All caught up!</p>
          <p className="text-cocoa/40 text-sm mt-1">No pending bookings to confirm.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div key={apt._id} className="card space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-cocoa font-bold text-lg">{apt.clientId?.firstName} {apt.clientId?.lastName}</p>
                  <p className="text-brand-300 font-semibold text-sm">
                    {apt.serviceIds && apt.serviceIds.length > 0
                      ? apt.serviceIds.map(s => `${s.category} - ${s.name}`).join(', ')
                      : apt.serviceId ? `${apt.serviceId.category} - ${apt.serviceId.name}` : ''}
                  </p>
                  <p className="text-cocoa/50 text-sm flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    {formatAWST(apt.startTime)} · {apt.serviceIds && apt.serviceIds.length > 0
                      ? apt.serviceIds.reduce((sum, s) => sum + s.durationMinutes, 0)
                      : apt.serviceId?.durationMinutes} min
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="badge-pending">pending</span>
                  {apt.overlaps && apt.overlaps.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                      ⚠️ Overlap
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 text-sm text-cocoa/40">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{apt.clientId?.phone}</span>
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{apt.clientId?.email}</span>
              </div>

              {/* Overlap Conflict Section */}
              {apt.overlaps && apt.overlaps.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs space-y-1.5">
                  <p className="font-bold text-red-400 flex items-center gap-1.5">
                    ⚠️ Overlap Conflict Detected
                  </p>
                  <div className="text-cocoa/60 space-y-1 pl-1">
                    {apt.overlaps.map((other) => (
                      <div key={other._id} className="flex items-start justify-between gap-2 border-b border-white/5 pb-1 last:border-0 last:pb-0">
                        <div>
                          <span className="font-semibold text-cocoa/90">{other.clientName}</span>
                          <div className="text-[10px] text-cocoa/40">
                            {formatAWST(other.startTime).split(', ')[1] || formatAWST(other.startTime)} – {formatAWST(other.endTime!).split(', ')[1] || formatAWST(other.endTime!)}
                          </div>
                        </div>
                        <span className={clsx('text-[10px] font-semibold uppercase tracking-wider', 
                          other.status === 'confirmed' ? 'text-green-400' : 'text-yellow-400'
                        )}>
                          {other.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    setConfirmDialog({
                      title: 'Confirm Booking',
                      message: `Are you sure you want to confirm this booking for ${apt.clientId?.firstName} ${apt.clientId?.lastName}?`,
                      onConfirm: () => confirmMutation.mutate(apt._id)
                    });
                  }}
                  disabled={confirmMutation.isPending}
                  className="btn-secondary flex-1 text-sm"
                  aria-label={`Confirm booking for ${apt.clientId?.firstName}`}
                >
                  <CheckCircle className="w-4 h-4 text-brand-500" /> Confirm
                </button>
                <button
                  onClick={() => setRejectId(apt._id)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-blush text-brand-500 hover:bg-brand-50/50 active:scale-95 transition-all text-sm font-semibold flex-1 min-h-[44px]"
                  aria-label={`Reject booking for ${apt.clientId?.firstName}`}
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="card max-w-sm w-full space-y-4 relative">
            <div className="flex items-start justify-between">
              <h2 className="font-bold text-cocoa text-lg">Reject Booking</h2>
            </div>
            <p className="text-cocoa/50 text-sm">Please provide a reason — this will be emailed to the client.</p>
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
                onClick={() => {
                  setConfirmDialog({
                    title: 'Reject Booking',
                    message: 'Are you sure you want to reject this booking? This will cancel the booking request and notify the client.',
                    onConfirm: () => rejectMutation.mutate({ id: rejectId, reason: rejectReason })
                  });
                }}
                disabled={!rejectReason || rejectMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-blush text-brand-500 hover:bg-brand-50/50 active:scale-95 transition-all text-sm font-semibold flex-1 min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
            <button
              onClick={() => { setRejectId(null); setRejectReason(''); }}
              className="absolute top-0 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/70 transition-all z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="card max-w-sm w-full space-y-4 relative">
            <h2 className="font-bold text-cocoa text-lg">{confirmDialog.title}</h2>
            <p className="text-cocoa/60 text-sm leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary flex-1 py-2 text-xs"
              >
                No, Cancel
              </button>
              <button
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                className="btn-primary flex-1 py-2 text-xs"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
