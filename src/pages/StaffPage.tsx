import { useQuery } from '@tanstack/react-query';
import { adminStaffApi, resolveImageUrl } from '../lib/api';
import { Users } from 'lucide-react';

interface Staff {
  _id: string;
  userId: { firstName: string; lastName: string; email: string; phone: string };
  bio: string;
  photoUrl: string;
  serviceIds: { name: string }[];
  active: boolean;
  workingHours: { dayOfWeek: number; startTime: string; endTime: string }[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StaffPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: () => adminStaffApi.list(),
  });
  const staffList: Staff[] = data?.data?.data?.staff ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff</h1>
          <p className="text-white/40 text-sm mt-1">Manage staff profiles, working hours, and services</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : staffList.length === 0 ? (
        <div className="card text-center py-12 text-white/30">
          <Users className="w-10 h-10 mx-auto mb-3" aria-hidden="true" />
          <p>No staff members found.</p>
          <p className="text-xs mt-1">Create a User with role "staff", then add their Staff profile via the API.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {staffList.map((s) => (
            <div key={s._id} className={`card space-y-4 ${!s.active ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-4">
                {s.photoUrl ? (
                  <img src={resolveImageUrl(s.photoUrl)} alt={`${s.userId?.firstName} ${s.userId?.lastName}`} className="w-14 h-14 rounded-2xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/30 to-blush/30 flex items-center justify-center text-blush font-bold text-xl">
                    {s.userId?.firstName?.[0]}
                  </div>
                )}
                <div>
                  <p className="text-white font-bold">{s.userId?.firstName} {s.userId?.lastName}</p>
                  <p className="text-white/40 text-xs">{s.userId?.email}</p>
                  <span className={s.active ? 'badge-confirmed' : 'badge-cancelled'}>{s.active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>

              {s.bio && <p className="text-white/50 text-sm">{s.bio}</p>}

              {/* Services */}
              {s.serviceIds?.length > 0 && (
                <div>
                  <p className="label mb-2">Services offered</p>
                  <div className="flex flex-wrap gap-1">
                    {s.serviceIds.map((svc, i) => (
                      <span key={i} className="px-2 py-0.5 bg-brand-500/10 text-brand-300 text-xs rounded-full border border-brand-500/20">
                        {svc.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Working hours */}
              {s.workingHours?.length > 0 && (
                <div>
                  <p className="label mb-2">Working hours</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {s.workingHours.map((wh) => (
                      <span key={wh.dayOfWeek} className="text-white/50">
                        {DAYS[wh.dayOfWeek]}: {wh.startTime} – {wh.endTime}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-white/30 text-xs text-center">To add or edit staff details, use the API endpoints or seed script. Full UI editor coming in next phase.</p>
    </div>
  );
}
