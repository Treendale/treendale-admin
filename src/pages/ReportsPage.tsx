import { useQuery } from '@tanstack/react-query';
import { adminReportsApi } from '../lib/api';
import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReportsPage() {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', from, to],
    queryFn: () => adminReportsApi.summary(from, to),
  });

  const report = data?.data?.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Reports</h1>

      {/* Date range */}
      <div className="card flex flex-wrap gap-4 items-end">
        <div>
          <label htmlFor="report-from" className="label">From</label>
          <input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input w-auto" />
        </div>
        <div>
          <label htmlFor="report-to" className="label">To</label>
          <input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input w-auto" />
        </div>
        <button onClick={() => refetch()} className="btn-primary text-sm">Apply</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : report && (
        <>
          {/* Stat grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Bookings', value: report.totalBookings },
              { label: 'Confirmed', value: report.confirmedBookings },
              { label: 'Cancelled', value: report.cancelledBookings },
              { label: 'No-shows', value: report.noShowBookings },
            ].map(({ label, value }) => (
              <div key={label} className="stat-card">
                <span className="text-white/40 text-xs uppercase tracking-wider">{label}</span>
                <span className="text-3xl font-bold text-white">{value}</span>
              </div>
            ))}
          </div>

          {/* Rates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card">
              <span className="text-white/40 text-xs uppercase tracking-wider">Cancellation Rate</span>
              <span className="text-3xl font-bold text-yellow-300">{(report.cancellationRate * 100).toFixed(1)}%</span>
            </div>
            <div className="stat-card">
              <span className="text-white/40 text-xs uppercase tracking-wider">No-show Rate</span>
              <span className="text-3xl font-bold text-red-300">{(report.noShowRate * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Bookings by day chart */}
          {report.bookingsByDay?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-white mb-4">Bookings per Day</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.bookingsByDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fill: '#ffffff40', fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fill: '#ffffff40', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
                    <Bar dataKey="count" fill="#d45469" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Most booked services */}
          {report.mostBookedServices?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-white mb-4">Most Booked Services</h2>
              <div className="space-y-3">
                {report.mostBookedServices.map(({ serviceName, count }: { serviceName: string; count: number }, i: number) => (
                  <div key={serviceName} className="flex items-center gap-3">
                    <span className="text-white/30 text-xs w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white">{serviceName}</span>
                        <span className="text-white/40">{count}</span>
                      </div>
                      <div className="h-1.5 bg-admin-border rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-brand-500 to-blush rounded-full" style={{ width: `${(count / report.mostBookedServices[0].count) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
