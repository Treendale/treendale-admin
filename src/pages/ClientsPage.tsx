import { useQuery } from '@tanstack/react-query';
import { adminReportsApi } from '../lib/api';
import { formatAWST } from '../contexts/AdminAuthContext';
import { Users, CalendarCheck } from 'lucide-react';

interface ClientEntry {
  _id: string;
  client: { firstName: string; lastName: string; email: string; phone: string };
  totalBookings: number;
  lastBooking: string;
}

export default function ClientsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => adminReportsApi.clients(),
  });

  const clients: ClientEntry[] = data?.data?.data?.clients ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-cocoa">Clients</h1>
        <p className="text-cocoa/40 text-sm mt-1">All customers with booking history, sorted by most bookings</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : clients.length === 0 ? (
        <div className="card text-center py-12 text-cocoa/30">
          <Users className="w-10 h-10 mx-auto mb-3" />
          <p>No client data yet.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border">
                {['Name', 'Email', 'Phone', 'Bookings', 'Last Visit'].map((h) => (
                  <th key={h} className="text-left text-cocoa/40 text-xs uppercase tracking-wider py-3 px-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c._id} className="table-row">
                  <td className="py-3 px-3 text-cocoa font-medium">{c.client?.firstName} {c.client?.lastName}</td>
                  <td className="py-3 px-3 text-cocoa/50">{c.client?.email}</td>
                  <td className="py-3 px-3 text-cocoa/50">{c.client?.phone}</td>
                  <td className="py-3 px-3">
                    <span className="flex items-center gap-1 text-brand-300">
                      <CalendarCheck className="w-3.5 h-3.5" /> {c.totalBookings}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-cocoa/40">{c.lastBooking ? formatAWST(c.lastBooking) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
