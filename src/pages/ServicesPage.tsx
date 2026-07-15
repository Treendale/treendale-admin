import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { adminServicesApi, adminSettingsApi, resolveImageUrl } from '../lib/api';
import { formatPrice } from '../contexts/AdminAuthContext';
import ImageUploader from '../components/ImageUploader';

interface Service { _id: string; name: string; category: string; durationMinutes: number; price: number; active: boolean; description: string; imageUrl?: string }

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Partial<Service> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => adminServicesApi.list(),
  });
  const services: Service[] = data?.data?.data?.services ?? [];

  const { data: settingsData } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminSettingsApi.get(),
  });
  const categories: string[] = settingsData?.data?.data?.settings?.categories ?? ['Facials', 'Waxing', 'Threading', 'Lash & Brow'];

  const createMutation = useMutation({
    mutationFn: (d: unknown) => adminServicesApi.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-services'] }); setEditing(null); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => adminServicesApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-services'] }); setEditing(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminServicesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-services'] }),
  });

  function handleSave() {
    if (!editing) return;
    const { _id, ...rest } = editing;
    const payload = { ...rest, price: Number(rest.price ?? 0), durationMinutes: Number(rest.durationMinutes ?? 30) };
    if (_id) updateMutation.mutate({ id: _id, data: payload });
    else createMutation.mutate(payload);
  }

  const grouped = categories.reduce<Record<string, Service[]>>((acc, cat) => {
    acc[cat] = services.filter((s) => s.category === cat);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Services</h1>
        <button onClick={() => setEditing({ active: true })} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat}>
              <h2 className="font-semibold text-white/60 text-sm uppercase tracking-wider mb-3">{cat}</h2>
              <div className="space-y-2">
                {(grouped[cat] ?? []).map((svc) => (
                  <div key={svc._id} className={`card flex items-center gap-4 flex-wrap ${!svc.active ? 'opacity-50' : ''}`}>
                    {svc.imageUrl ? (
                      <img src={resolveImageUrl(svc.imageUrl)} alt={svc.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-admin-border" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0 border border-admin-border">
                        <span className="text-brand-400 text-lg font-bold">{svc.name[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{svc.name}</p>
                      <p className="text-white/40 text-xs mt-0.5">{svc.durationMinutes} min · {formatPrice(svc.price)}</p>
                    </div>
                    {svc.active ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(svc)} className="btn-ghost p-2" aria-label={`Edit ${svc.name}`}>
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(svc._id)} className="btn-ghost p-2 hover:text-red-400" aria-label={`Deactivate ${svc.name}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {(grouped[cat] ?? []).length === 0 && <p className="text-white/20 text-sm px-2">No services in this category.</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create modal */}
      {editing !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="svc-modal-title">
          <div className="card max-w-md w-full space-y-4 my-4">
            <h2 id="svc-modal-title" className="font-bold text-white text-lg">{editing._id ? 'Edit Service' : 'New Service'}</h2>
            
            {/* Image upload */}
            <ImageUploader
              id="svc-image-uploader"
              label="Service Image"
              aspectClass="aspect-video"
              currentUrl={resolveImageUrl(editing.imageUrl) || undefined}
              onUploaded={(url) => setEditing({ ...editing, imageUrl: url })}
            />

            {[
              { id: 'svc-name', label: 'Name', key: 'name', type: 'text' },
              { id: 'svc-desc', label: 'Description', key: 'description', type: 'textarea' },
              { id: 'svc-duration', label: 'Duration (minutes)', key: 'durationMinutes', type: 'number' },
              { id: 'svc-price', label: 'Price', key: 'price', type: 'number' },
            ].map(({ id, label, key, type }) => (
              <div key={key}>
                <label htmlFor={id} className="label">{label}</label>
                {type === 'textarea' ? (
                  <textarea id={id} rows={2} className="input resize-none" value={(editing as Record<string, unknown>)[key] as string ?? ''}
                    onChange={(e) => setEditing({ ...editing, [key]: e.target.value })} />
                ) : (
                  <input id={id} type={type} className="input" value={(editing as Record<string, unknown>)[key] as string ?? ''}
                    onChange={(e) => setEditing({ ...editing, [key]: e.target.value })} />
                )}
              </div>
            ))}
            <div>
              <label htmlFor="svc-category" className="label">Category</label>
              <select id="svc-category" className="input" value={editing.category ?? ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="w-4 h-4" />
              <span className="text-white/70 text-sm">Active</span>
            </label>

            {(createMutation.isError || updateMutation.isError) && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-700 text-xs">
                {((createMutation.error || updateMutation.error) as any)?.response?.data?.error?.message ?? 'Save failed. Please ensure Name, Price, and Category are filled.'}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary flex-1">
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
