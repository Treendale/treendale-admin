import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';

export const BACKEND_URL = BASE_URL.replace('/api/v1', '');

export function resolveImageUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const adminAuthApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/staff-login', data),
  me: () => api.get('/auth/me'),
};

export const adminServicesApi = {
  list: () => api.get('/services?active=all'),
  listActive: () => api.get('/services'),
  create: (data: unknown) => api.post('/services', data),
  update: (id: string, data: unknown) => api.patch(`/services/${id}`, data),
  delete: (id: string) => api.delete(`/services/${id}`),
};

export const adminStaffApi = {
  list: () => api.get('/staff'),
  getById: (id: string) => api.get(`/staff/${id}`),
  create: (data: unknown) => api.post('/staff', data),
  update: (id: string, data: unknown) => api.patch(`/staff/${id}`, data),
  delete: (id: string) => api.delete(`/staff/${id}`),
};

export const adminAppointmentsApi = {
  list: (params?: Record<string, string>) => api.get('/appointments', { params }),
  confirm: (id: string) => api.patch(`/appointments/${id}/confirm`),
  reject: (id: string, reason: string) => api.patch(`/appointments/${id}/reject`, { cancellationReason: reason }),
  cancel: (id: string, reason: string) => api.patch(`/appointments/${id}/cancel`, { cancellationReason: reason }),
  complete: (id: string) => api.patch(`/appointments/${id}/complete`),
  noShow: (id: string) => api.patch(`/appointments/${id}/no-show`),
  reschedule: (id: string, startTime: string) => api.patch(`/appointments/${id}/reschedule`, { startTime }),
};

export const adminSettingsApi = {
  get: () => api.get('/settings'),
  update: (data: unknown) => api.patch('/settings', data),
};

export const adminContentApi = {
  getPage: (page: string) => api.get(`/content/${page}`),
  update: (page: string, key: string, value: string) => api.patch(`/content/${page}/${key}`, { value }),
};

export const adminNotificationsApi = {
  list: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const adminReportsApi = {
  summary: (from: string, to: string) => api.get('/reports/summary', { params: { from, to } }),
  clients: () => api.get('/reports/clients'),
};

export const adminWaitlistApi = {
  list: () => api.get('/waitlist'),
  remove: (id: string) => api.delete(`/waitlist/${id}`),
};

export const uploadsApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  list: () => api.get('/uploads'),
  delete: (filename: string) => api.delete(`/uploads/${filename}`),
};

