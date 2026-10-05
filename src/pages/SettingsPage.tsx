import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Plus, Trash2, Settings, Clock, Ban, MapPin, ExternalLink } from 'lucide-react';
import { adminSettingsApi } from '../lib/api';
import clsx from 'clsx';
import AdminDatePicker from '../components/AdminDatePicker';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface BusinessHours { dayOfWeek: number; startTime: string; endTime: string }
interface Closure { _id?: string; date: string; reason: string }
interface BlockedSlot { _id?: string; date: string; startTime: string; endTime: string; reason?: string }
interface SettingsData {
  _id?: string;
  bookingWindowDays: number;
  businessHours: BusinessHours[];
  closures: Closure[];
  blockedSlots: BlockedSlot[];
  slotGranularityMinutes: number;
  timezone: string;
  currency: string;
  address: string;
  addressVisibility: 'public' | 'shared_after_confirmation';
  mapLatitude?: number;
  mapLongitude?: number;
  mapPlaceName?: string;
  mapEmbedUrl?: string;
  categories: string[];
  cancellationWindowHours?: number;
}

const emptyBlockedSlot: Omit<BlockedSlot, '_id'> = { date: '', startTime: '09:00', endTime: '10:00', reason: '' };

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<SettingsData>>({});
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [newClosure, setNewClosure] = useState({ date: '', reason: '' });
  const [newBlockedSlot, setNewBlockedSlot] = useState<Omit<BlockedSlot, '_id'>>({ ...emptyBlockedSlot });

  const { data } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminSettingsApi.get(),
  });

  const settings: SettingsData = data?.data?.data?.settings;

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings?._id]);

  const updateMutation = useMutation({
    mutationFn: (d: unknown) => adminSettingsApi.update(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setSaved(true);
      setSaveError('');
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err: any) => {
      setSaveError(err?.response?.data?.error?.message ?? 'Failed to save settings');
    },
  });

  // ─── Business Hours ───────────────────────────────────────────────────────────

  function toggleDay(day: number) {
    const hours = form.businessHours ?? [];
    const exists = hours.find((h) => h.dayOfWeek === day);
    if (exists) {
      setForm({ ...form, businessHours: hours.filter((h) => h.dayOfWeek !== day) });
    } else {
      setForm({ ...form, businessHours: [...hours, { dayOfWeek: day, startTime: '09:00', endTime: '17:00' }] });
    }
  }

  // ─── Closures ────────────────────────────────────────────────────────────────

  function addClosure() {
    if (!newClosure.date || !newClosure.reason) return;
    setForm({ ...form, closures: [...(form.closures ?? []), newClosure] });
    setNewClosure({ date: '', reason: '' });
  }

  function removeClosure(i: number) {
    const c = [...(form.closures ?? [])];
    c.splice(i, 1);
    setForm({ ...form, closures: c });
  }

  // ─── Blocked Slots ────────────────────────────────────────────────────────────

  function addBlockedSlot() {
    const { date, startTime, endTime } = newBlockedSlot;
    if (!date || !startTime || !endTime) return;
    if (startTime >= endTime) return;
    setForm({ ...form, blockedSlots: [...(form.blockedSlots ?? []), { ...newBlockedSlot }] });
    setNewBlockedSlot({ ...emptyBlockedSlot });
  }

  function removeBlockedSlot(i: number) {
    const arr = [...(form.blockedSlots ?? [])];
    arr.splice(i, 1);
    setForm({ ...form, blockedSlots: arr });
  }

  const slotTimeError =
    newBlockedSlot.startTime && newBlockedSlot.endTime && newBlockedSlot.startTime >= newBlockedSlot.endTime
      ? 'End time must be after start time'
      : '';

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-cocoa flex items-center gap-2">
          <Settings className="w-6 h-6" aria-hidden="true" /> Business Settings
        </h1>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending}
            className="btn-primary text-sm"
            id="save-settings-btn"
          >
            <Save className="w-4 h-4" /> {saved ? '✓ Saved!' : 'Save'}
          </button>
          {saveError && <p className="text-red-400 text-xs">{saveError}</p>}
        </div>
      </div>

      {/* ── General ── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-cocoa">General</h2>

        <div>
          <label htmlFor="booking-window" className="label">Booking Window (days ahead)</label>
          <div className="flex items-center gap-3">
            <input
              id="booking-window"
              type="number"
              min={1}
              max={365}
              className="input w-32"
              value={form.bookingWindowDays ?? 10}
              onChange={(e) => setForm({ ...form, bookingWindowDays: Number(e.target.value) })}
            />
            <span className="text-cocoa/40 text-xs">Clients can book up to this many days from today</span>
          </div>
        </div>

        <div>
          <label htmlFor="cancellation-window" className="label">Cancellation Window (hours)</label>
          <div className="flex items-center gap-3">
            <input
              id="cancellation-window"
              type="number"
              min={0}
              max={720}
              className="input w-32"
              value={form.cancellationWindowHours ?? 24}
              onChange={(e) => setForm({ ...form, cancellationWindowHours: Number(e.target.value) })}
            />
            <span className="text-cocoa/40 text-xs">Clients can cancel their bookings up to this many hours before the slot</span>
          </div>
        </div>

        <div>
          <label htmlFor="booking-interval" className="label">Booking Time Interval</label>
          <div className="flex items-center gap-3">
            <select
              id="booking-interval"
              className="input w-36"
              value={form.slotGranularityMinutes ?? 15}
              onChange={(e) => setForm({ ...form, slotGranularityMinutes: Number(e.target.value) })}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
            <span className="text-cocoa/40 text-xs">Time interval increments offered between booking slots</span>
          </div>
        </div>
      </div>

      {/* ── Salon Location & Pinpoint Map ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand-400" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-cocoa">Salon Location &amp; Pinpoint Map</h2>
            <p className="text-cocoa/40 text-xs">
              Configure the exact studio address and map pin. This map is displayed on the user's booking confirmation screen.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="salon-place-name" className="label text-xs">Studio / Business Name</label>
            <input
              id="salon-place-name"
              type="text"
              className="input text-sm"
              placeholder="e.g. Treendale Threading & Beauty"
              value={form.mapPlaceName ?? 'Treendale Threading & Beauty'}
              onChange={(e) => setForm({ ...form, mapPlaceName: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="salon-address" className="label text-xs">Street Address</label>
            <input
              id="salon-address"
              type="text"
              className="input text-sm"
              placeholder="e.g. Shop 2, 10 The Promenade, Australind WA 6233"
              value={form.address ?? ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="map-latitude" className="label text-xs">Pin Latitude</label>
              <input
                id="map-latitude"
                type="number"
                step="any"
                className="input text-sm font-mono"
                placeholder="-33.2847"
                value={form.mapLatitude ?? -33.2847}
                onChange={(e) => setForm({ ...form, mapLatitude: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>
            <div>
              <label htmlFor="map-longitude" className="label text-xs">Pin Longitude</label>
              <input
                id="map-longitude"
                type="number"
                step="any"
                className="input text-sm font-mono"
                placeholder="115.7196"
                value={form.mapLongitude ?? 115.7196}
                onChange={(e) => setForm({ ...form, mapLongitude: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>
          </div>

          <div className="flex gap-2 items-center flex-wrap pt-1">
            <button
              type="button"
              onClick={() => {
                setForm({
                  ...form,
                  mapLatitude: -33.2847,
                  mapLongitude: 115.7196,
                  address: form.address || 'Shop 2, 10 The Promenade, Australind WA 6233',
                  mapPlaceName: form.mapPlaceName || 'Treendale Threading & Beauty',
                });
              }}
              className="btn-secondary text-xs py-1.5 px-3 min-h-[36px]"
            >
              Set Treendale Australind WA Coordinates
            </button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                (form.mapLatitude && form.mapLongitude) ? `${form.mapLatitude},${form.mapLongitude}` : (form.address || 'Treendale Australind WA')
              )}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-300 hover:text-brand-200 flex items-center gap-1 ml-auto"
            >
              Open in Google Maps <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Live Map Preview */}
          <div className="mt-4 pt-4 border-t border-admin-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-cocoa/60 uppercase tracking-wider">Live Pinpoint Map Preview</span>
              <span className="text-xs text-cocoa/40">Shown on user confirmation</span>
            </div>
            <div className="rounded-xl overflow-hidden border border-admin-border bg-admin-bg relative aspect-video sm:aspect-[21/9] max-h-56">
              <iframe
                title="Salon Pinpoint Map Preview"
                width="100%"
                height="100%"
                className="border-0 w-full h-full"
                loading="lazy"
                src={
                  form.mapEmbedUrl ||
                  `https://maps.google.com/maps?q=${
                    (form.mapLatitude !== undefined && form.mapLongitude !== undefined)
                      ? `${form.mapLatitude},${form.mapLongitude}`
                      : encodeURIComponent(form.address || 'Treendale WA 6233')
                  }&hl=en&z=16&output=embed`
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Dynamic Categories ── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-cocoa">Service Categories</h2>
        <p className="text-cocoa/40 text-xs">Manage dynamic service categories shown in the booking page tabs.</p>
        
        <div className="flex flex-wrap gap-2">
          {(form.categories ?? []).map((cat, i) => (
            <span key={cat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-admin-bg border border-admin-border text-sm text-cocoa">
              {cat}
              <button
                type="button"
                onClick={() => {
                  const nextCats = (form.categories ?? []).filter((_, idx) => idx !== i);
                  setForm({ ...form, categories: nextCats });
                }}
                className="text-red-500 hover:text-red-400 p-0.5"
                aria-label={`Delete category ${cat}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 max-w-sm">
          <input
            type="text"
            id="new-category-input"
            className="input text-sm"
            placeholder="Add new category (e.g. Nails)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const val = e.currentTarget.value.trim();
                if (val && !(form.categories ?? []).includes(val)) {
                  setForm({ ...form, categories: [...(form.categories ?? []), val] });
                  e.currentTarget.value = '';
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('new-category-input') as HTMLInputElement | null;
              const val = el?.value.trim();
              if (val && !(form.categories ?? []).includes(val)) {
                setForm({ ...form, categories: [...(form.categories ?? []), val] });
                if (el) el.value = '';
              }
            }}
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1 text-white min-h-[38px]"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* ── Business Hours ── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-cocoa">Business Hours</h2>
        <p className="text-cocoa/40 text-xs">Click a day to toggle it on/off. Adjust times for each active day.</p>
        <div className="space-y-2">
          {DAYS.map((day, i) => {
            const entry = form.businessHours?.find((h) => h.dayOfWeek === i);
            const active = !!entry;
            return (
              <div key={day} className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => toggleDay(i)}
                  className={clsx(
                    'w-12 py-1.5 rounded-lg text-xs font-medium border transition-all min-h-[44px]',
                    active ? 'bg-brand-500/20 text-blush border-brand-500/30' : 'text-cocoa/30 border-admin-border',
                  )}
                  aria-pressed={active}
                  aria-label={`Toggle ${day}`}
                >
                  {day}
                </button>
                {active && entry && (
                  <>
                    <input
                      type="time"
                      className="input w-32 text-sm"
                      value={entry.startTime}
                      onChange={(e) => setForm({
                        ...form,
                        businessHours: form.businessHours!.map((h) => h.dayOfWeek === i ? { ...h, startTime: e.target.value } : h),
                      })}
                      aria-label={`${day} start time`}
                    />
                    <span className="text-cocoa/30 text-sm">–</span>
                    <input
                      type="time"
                      className="input w-32 text-sm"
                      value={entry.endTime}
                      onChange={(e) => setForm({
                        ...form,
                        businessHours: form.businessHours!.map((h) => h.dayOfWeek === i ? { ...h, endTime: e.target.value } : h),
                      })}
                      aria-label={`${day} end time`}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Closures ── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-cocoa">Closures &amp; Holidays</h2>
        <p className="text-cocoa/40 text-xs">Add WA public holidays or one-off closure dates. No slots will be offered on these dates.</p>

        <div className="flex gap-2 flex-wrap items-center">
          <AdminDatePicker
            value={newClosure.date}
            onChange={(d) => setNewClosure({ ...newClosure, date: d })}
            placeholder="Closure Date"
            className="w-48"
          />
          <input
            type="text"
            className="input flex-1 min-w-32 text-sm"
            placeholder="Reason (e.g. ANZAC Day)"
            value={newClosure.reason}
            onChange={(e) => setNewClosure({ ...newClosure, reason: e.target.value })}
            aria-label="Closure reason"
          />
          <button
            onClick={addClosure}
            disabled={!newClosure.date || !newClosure.reason}
            className="btn-secondary text-sm"
            id="add-closure-btn"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {(form.closures ?? []).length > 0 && (
          <div className="space-y-2">
            {form.closures!.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-admin-bg border border-admin-border">
                <span className="text-cocoa/50 text-sm flex-1">{c.date} — {c.reason}</span>
                <button
                  onClick={() => removeClosure(i)}
                  className="btn-ghost p-1.5 hover:text-red-400"
                  aria-label={`Remove closure ${c.date}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Blocked Time Slots ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Ban className="w-4 h-4 text-brand-400" aria-hidden="true" />
          <h2 className="font-semibold text-cocoa">Blocked Time Slots</h2>
        </div>
        <p className="text-cocoa/40 text-xs">
          Block a specific time window on a date — e.g. "tomorrow 2 pm – 4 pm". Clients won't be able to book any slot that overlaps this window.
        </p>

        <div className="space-y-3 p-4 rounded-xl bg-admin-bg border border-admin-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label htmlFor="blocked-date" className="label text-xs">Date</label>
              <AdminDatePicker
                value={newBlockedSlot.date}
                onChange={(d) => setNewBlockedSlot({ ...newBlockedSlot, date: d })}
                placeholder="Blocked Date"
              />
            </div>
            <div>
              <label htmlFor="blocked-reason" className="label text-xs">Reason (optional)</label>
              <input
                id="blocked-reason"
                type="text"
                className="input text-sm"
                placeholder="e.g. Training session"
                value={newBlockedSlot.reason ?? ''}
                onChange={(e) => setNewBlockedSlot({ ...newBlockedSlot, reason: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Clock className="w-4 h-4 text-cocoa/30 flex-shrink-0" aria-hidden="true" />
              <input
                id="blocked-start-time"
                type="time"
                className="input text-sm flex-1"
                value={newBlockedSlot.startTime}
                onChange={(e) => setNewBlockedSlot({ ...newBlockedSlot, startTime: e.target.value })}
                aria-label="Block start time"
              />
              <span className="text-cocoa/30 text-sm flex-shrink-0">to</span>
              <input
                id="blocked-end-time"
                type="time"
                className="input text-sm flex-1"
                value={newBlockedSlot.endTime}
                onChange={(e) => setNewBlockedSlot({ ...newBlockedSlot, endTime: e.target.value })}
                aria-label="Block end time"
              />
            </div>
            <button
              id="add-blocked-slot-btn"
              onClick={addBlockedSlot}
              disabled={!newBlockedSlot.date || !newBlockedSlot.startTime || !newBlockedSlot.endTime || !!slotTimeError}
              className="btn-primary text-sm flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> Block Slot
            </button>
          </div>

          {slotTimeError && (
            <p className="text-red-400 text-xs">{slotTimeError}</p>
          )}
        </div>

        {(form.blockedSlots ?? []).length > 0 && (
          <div className="space-y-2">
            {form.blockedSlots!.map((bs, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-admin-bg border border-admin-border"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                  <Ban className="w-4 h-4 text-brand-400" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-cocoa text-sm font-medium">{bs.date}</p>
                  <p className="text-cocoa/40 text-xs">
                    {bs.startTime} – {bs.endTime}
                    {bs.reason && <span className="ml-2 text-cocoa/30">· {bs.reason}</span>}
                  </p>
                </div>
                <button
                  onClick={() => removeBlockedSlot(i)}
                  className="btn-ghost p-1.5 hover:text-red-400 flex-shrink-0"
                  aria-label={`Remove blocked slot on ${bs.date} ${bs.startTime}–${bs.endTime}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {(form.blockedSlots ?? []).length === 0 && (
          <p className="text-cocoa/20 text-xs text-center py-2">No blocked slots configured.</p>
        )}
      </div>
    </div>
  );
}
