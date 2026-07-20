import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle, X, Check, AlertCircle, CalendarX, Clock } from 'lucide-react';
import { adminAppointmentsApi } from '../lib/api';
import AdminDatePicker from '../components/AdminDatePicker';
import clsx from 'clsx';

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-pending', confirmed: 'badge-confirmed',
  cancelled: 'badge-cancelled', completed: 'badge-completed', no_show: 'badge-no_show',
};

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:  return 'st';
    case 2:  return 'nd';
    case 3:  return 'rd';
    default: return 'th';
  }
}

function formatHumanAWST(isoUtc: string): string {
  try {
    const d = new Date(isoUtc);
    const dayStr = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Perth', day: 'numeric' });
    const monthStr = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Perth', month: 'long' });
    const yearStr = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Perth', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-AU', { timeZone: 'Australia/Perth', hour: 'numeric', minute: '2-digit', hour12: true });

    const dayNum = parseInt(dayStr, 10);
    const suffix = getOrdinalSuffix(dayNum);
    const formattedTime = timeStr.toLowerCase().replace(/\s+/g, '');
    
    return `${dayNum}${suffix} ${monthStr} ${yearStr}, ${formattedTime}`;
  } catch (e) {
    return isoUtc;
  }
}

type ViewMode = 'day' | 'week';

interface Appointment {
  _id: string;
  clientId: { firstName: string; lastName: string; phone: string; email: string };
  serviceId: { name: string; price: number; durationMinutes: number; category: string };
  serviceIds?: Array<{ name: string; price: number; durationMinutes: number; category: string }>;
  staffId: { userId: { firstName: string } };
  startTime: string;
  endTime: string;
  status: string;
  cancellationReason?: string;
  overlaps?: Array<{
    _id: string;
    clientName: string;
    startTime: string;
    endTime: string;
    status: string;
  }>;
}

function getPerthMinutes(dateStr: string): number {
  const d = new Date(dateStr);
  const perthTime = d.toLocaleTimeString('en-AU', { timeZone: 'Australia/Perth', hour: '2-digit', minute: '2-digit', hour12: false });
  const [h, m] = perthTime.split(':').map(Number);
  return h * 60 + m;
}

export default function AppointmentsPage() {
  const [view, setView] = useState<ViewMode>('week');
  const [date, setDate] = useState(new Date());
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const queryClient = useQueryClient();

  const { data: rescheduleData, isLoading: isLoadingReschedule } = useQuery({
    queryKey: ['appointments', rescheduleDate, rescheduleDate],
    queryFn: () => adminAppointmentsApi.list({ from: rescheduleDate, to: rescheduleDate }),
    enabled: !!rescheduleDate,
  });
  const rescheduleDateAppointments = rescheduleData?.data?.data?.appointments ?? [];

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
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, startTime }: { id: string; startTime: string }) => adminAppointmentsApi.reschedule(id, startTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSelected(null);
      setIsRescheduling(false);
      setRescheduleDate('');
    },
  });

  function prev() { setDate(d => view === 'day' ? addDays(d, -1) : addDays(d, -7)); }
  function next() { setDate(d => view === 'day' ? addDays(d, 1) : addDays(d, 7)); }

  const dateLabel = view === 'day'
    ? format(date, 'EEEE, d MMMM yyyy')
    : `${format(startOfWeek(date, { weekStartsOn: 1 }), 'd MMM')} – ${format(endOfWeek(date, { weekStartsOn: 1 }), 'd MMM yyyy')}`;

  return (
    <>
      <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-cocoa">Calendar</h1>
        <div className="flex items-center gap-2">
          <div className="flex border border-admin-border rounded-lg overflow-hidden">
            {(['day', 'week'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={clsx('px-4 py-2 text-sm font-medium transition-colors capitalize min-h-[44px]', view === v ? 'bg-brand-500/20 text-blush' : 'text-cocoa/50 hover:text-white')}>
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
        <span className="text-cocoa font-medium text-sm flex-1 text-center">{dateLabel}</span>
        <button onClick={next} className="btn-ghost p-2" aria-label="Next">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => setDate(new Date())} className="btn-secondary text-xs px-3">Today</button>
      </div>

      {/* Appointment list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-12 text-cocoa/30">No appointments in this period.</div>
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
                    <p className="text-cocoa/30 text-xs">
                      {apt.serviceIds && apt.serviceIds.length > 0
                        ? apt.serviceIds.reduce((sum, s) => sum + s.durationMinutes, 0)
                        : apt.serviceId?.durationMinutes}m
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-cocoa font-medium truncate">{apt.clientId?.firstName} {apt.clientId?.lastName}</p>
                    <p className="text-cocoa/40 text-sm truncate">
                      {apt.serviceIds && apt.serviceIds.length > 0
                        ? apt.serviceIds.map(s => `${s.category} - ${s.name}`).join(', ')
                        : apt.serviceId ? `${apt.serviceId.category} - ${apt.serviceId.name}` : ''}
                    </p>
                    <p className="text-cocoa/30 text-xs">{apt.clientId?.phone}</p>
                  </div>
                  {apt.overlaps && apt.overlaps.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                      ⚠️ Overlap
                    </span>
                  )}
                  <span className={STATUS_BADGE[apt.status] ?? ''}>{apt.status.replace('_', ' ')}</span>
                  <ChevronRight className="w-4 h-4 text-cocoa/20" aria-hidden="true" />
                </div>
              </div>
            ))}
        </div>
      )}
      </div>

      {/* Appointment detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="apt-modal-title">
          <div className="card max-w-lg w-full space-y-4 relative">
            <div className="flex items-start justify-between">
              <h2 id="apt-modal-title" className="font-bold text-cocoa text-lg">Appointment Details</h2>
            </div>

            {isRescheduling ? (
              <div className="space-y-4">
                <h3 className="font-bold text-cocoa text-md">Reschedule Appointment</h3>
                <div className="space-y-1">
                  <span className="label text-xs font-bold text-cocoa/65">Select Date</span>
                  <AdminDatePicker
                    value={rescheduleDate}
                    onChange={(date) => setRescheduleDate(date)}
                    placeholder="Select date to view slots"
                  />
                </div>

                {isLoadingReschedule ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : rescheduleDate ? (
                  <div className="space-y-2">
                    <label className="label text-xs font-bold text-cocoa/65">Available Time Slots</label>
                    <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1 border border-admin-border rounded-lg p-2 bg-admin-bg/30">
                      {(() => {
                        const slots = [];
                        const startHour = 8;
                        const endHour = 18;
                        const durationMinutes = selected.serviceIds && selected.serviceIds.length > 0
                          ? selected.serviceIds.reduce((sum, s) => sum + s.durationMinutes, 0)
                          : selected.serviceId?.durationMinutes || 30;

                        for (let hour = startHour; hour < endHour; hour++) {
                          for (let min of [0, 15, 30, 45]) {
                            const slotStartMin = hour * 60 + min;
                            const slotEndMin = slotStartMin + durationMinutes;

                            const overlapping = rescheduleDateAppointments.filter((apt: any) => 
                              apt._id !== selected._id && 
                              apt.status !== 'cancelled' && 
                              getPerthMinutes(apt.startTime) < slotEndMin && 
                              getPerthMinutes(apt.endTime) > slotStartMin
                            );

                            let status: 'available' | 'pending_overlap' | 'booked' = 'available';
                            let conflictingName = '';

                            if (overlapping.length > 0) {
                              const hasConfirmed = overlapping.some((o: any) => ['confirmed', 'completed', 'no_show'].includes(o.status));
                              if (hasConfirmed) {
                                status = 'booked';
                                const confApt = overlapping.find((o: any) => ['confirmed', 'completed', 'no_show'].includes(o.status));
                                conflictingName = `${confApt.clientId?.firstName ?? ''} ${confApt.clientId?.lastName ?? ''}`.trim() || 'Booked';
                              } else {
                                status = 'pending_overlap';
                                conflictingName = `${overlapping[0].clientId?.firstName ?? ''} ${overlapping[0].clientId?.lastName ?? ''}`.trim() || 'Pending';
                              }
                            }

                            const pad = (n: number) => String(n).padStart(2, '0');
                            const timeStr = `${pad(hour)}:${pad(min)}`;
                            const isoString = `${rescheduleDate}T${timeStr}:00+08:00`;

                            const ampm = hour >= 12 ? 'pm' : 'am';
                            const displayHour = hour % 12 === 0 ? 12 : hour % 12;
                            const displayMin = pad(min);
                            const timeLabel = `${displayHour}:${displayMin}${ampm}`;

                            slots.push({ timeLabel, isoString, status, conflictingName });
                          }
                        }

                        if (slots.length === 0) return <p className="text-cocoa/40 text-xs text-center py-4">No slots generated.</p>;

                        return slots.map(({ timeLabel, isoString, status, conflictingName }) => {
                          if (status === 'booked') {
                            return (
                              <div key={timeLabel} className="flex justify-between items-center text-xs py-2.5 px-3 rounded bg-red-500/5 border border-red-500/10 text-cocoa/40 cursor-not-allowed">
                                <span>{timeLabel}</span>
                                <span className="text-[10px] uppercase font-bold text-red-400/60 text-right">Booked ({conflictingName})</span>
                              </div>
                            );
                          }

                          const isPendingConflict = status === 'pending_overlap';
                          return (
                            <button
                              key={timeLabel}
                              onClick={() => {
                                setConfirmDialog({
                                  title: 'Reschedule Appointment',
                                  message: `Are you sure you want to reschedule this appointment to ${rescheduleDate} at ${timeLabel}?${isPendingConflict ? ` Note: This overlaps with a pending request for ${conflictingName}.` : ''}`,
                                  onConfirm: () => rescheduleMutation.mutate({ id: selected._id, startTime: isoString })
                                });
                              }}
                              className={clsx(
                                'w-full flex justify-between items-center text-xs py-2.5 px-3 rounded border transition-all text-left active:scale-98 text-cocoa',
                                isPendingConflict 
                                  ? 'border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10'
                                  : 'border-green-600/30 bg-green-600/5 hover:bg-green-600/10'
                              )}
                            >
                              <span>{timeLabel}</span>
                              <span className="text-[10px] uppercase font-bold text-right text-cocoa/60">
                                {isPendingConflict ? `Pending: ${conflictingName}` : 'Available'}
                              </span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  <p className="text-cocoa/40 text-xs text-center py-4">Please select a date to view available time slots.</p>
                )}

                <button
                  onClick={() => { setIsRescheduling(false); setRescheduleDate(''); }}
                  className="btn-secondary w-full text-xs min-h-[38px] py-1.5"
                >
                  Cancel Rescheduling
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2 text-sm">
                  {[
                    ['Client', `${selected.clientId?.firstName} ${selected.clientId?.lastName}`],
                    ['Phone', selected.clientId?.phone],
                    ['Email', selected.clientId?.email],
                    ['Services', selected.serviceIds && selected.serviceIds.length > 0 
                      ? selected.serviceIds.map(s => `${s.category} - ${s.name}`).join(', ')
                      : selected.serviceId ? `${selected.serviceId.category} - ${selected.serviceId.name}` : ''],
                    ['Time', formatHumanAWST(selected.startTime)],
                    ['Duration', `${selected.serviceIds && selected.serviceIds.length > 0
                      ? selected.serviceIds.reduce((sum, s) => sum + s.durationMinutes, 0)
                      : selected.serviceId?.durationMinutes} min`],
                    ['Status', selected.status.replace('_', ' ')],
                  ].map(([label, val]) => (
                    <div key={label} className="flex gap-2">
                      <span className="text-cocoa/40 w-20 flex-shrink-0">{label}</span>
                      <span className="text-cocoa">{val}</span>
                    </div>
                  ))}
                </div>

                {/* Overlap Conflict Section */}
                {selected.overlaps && selected.overlaps.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs space-y-1.5">
                    <p className="font-bold text-red-400 flex items-center gap-1.5">
                      ⚠️ Overlap Conflict Detected
                    </p>
                    <div className="text-cocoa/60 space-y-1 pl-1">
                      {selected.overlaps.map((other) => (
                        <div key={other._id} className="flex items-start justify-between gap-2 border-b border-white/5 pb-1 last:border-0 last:pb-0">
                          <div>
                            <span className="font-semibold text-cocoa/90">{other.clientName}</span>
                            <div className="text-[10px] text-cocoa/40">
                              {formatHumanAWST(other.startTime).split(', ')[1]} – {formatHumanAWST(other.endTime).split(', ')[1]}
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

                {/* Actions */}
                {['pending', 'confirmed'].includes(selected.status) && (
                  <div className="space-y-2 pt-2 border-t border-admin-border w-full">
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      {selected.status === 'pending' && (
                        <button
                          onClick={() => {
                            setConfirmDialog({
                              title: 'Confirm Booking',
                              message: `Are you sure you want to confirm this booking for ${selected.clientId?.firstName} ${selected.clientId?.lastName}?`,
                              onConfirm: () => { confirmMutation.mutate(selected._id); setSelected(null); }
                            });
                          }}
                          className="btn-secondary text-xs px-3 py-2 rounded-lg w-full sm:flex-1 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4 text-brand-500" /> Confirm Booking
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            title: 'Complete Appointment',
                            message: 'Are you sure you want to mark this appointment as completed?',
                            onConfirm: () => { completeMutation.mutate(selected._id); setSelected(null); }
                          });
                        }}
                        className="btn-secondary text-xs px-3 py-2 rounded-lg w-full sm:flex-1 flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4 text-green-600" /> Mark Completed
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            title: 'Mark No-show',
                            message: 'Are you sure you want to record this client as a No-show?',
                            onConfirm: () => { noShowMutation.mutate(selected._id); setSelected(null); }
                          });
                        }}
                        className="btn-secondary text-xs px-3 py-2 rounded-lg w-full sm:flex-1 flex items-center justify-center gap-1.5"
                      >
                        <AlertCircle className="w-4 h-4 text-amber-500" /> Mark No-show
                      </button>
                    </div>

                    <button
                      onClick={() => setIsRescheduling(true)}
                      className="btn-secondary text-xs px-3 py-2.5 rounded-lg w-full flex items-center justify-center gap-1.5"
                    >
                      <Clock className="w-4 h-4 text-brand-500" /> Reschedule Appointment
                    </button>
                  </div>
                )}

                {/* Cancel Block */}
                {['pending', 'confirmed'].includes(selected.status) && (
                  <div className="border-t border-admin-border pt-4 space-y-3">
                    <div>
                      <label htmlFor="modal-cancel-reason" className="label text-xs font-bold text-brand-950">Cancel with reason</label>
                      <textarea
                        id="modal-cancel-reason"
                        rows={2}
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="input resize-none text-xs"
                        placeholder="Reason for cancellation..."
                      />
                    </div>
                    <button
                      onClick={() => {
                        setConfirmDialog({
                          title: 'Cancel Appointment',
                          message: 'Are you sure you want to cancel this appointment?',
                          onConfirm: () => { cancelMutation.mutate({ id: selected._id, reason: cancelReason }); setSelected(null); }
                        });
                      }}
                      disabled={!cancelReason || cancelMutation.isPending}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-blush text-brand-500 hover:bg-brand-50/50 active:scale-95 transition-all text-xs font-semibold w-full disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CalendarX className="w-4 h-4" /> Cancel Appointment
                    </button>
                  </div>
                )}
              </>
            )}
            <button
              onClick={() => { setSelected(null); setCancelReason(''); setIsRescheduling(false); setRescheduleDate(''); }}
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
