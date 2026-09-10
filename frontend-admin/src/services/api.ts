import axios from 'axios';

const AUTH_STORAGE_KEY = 'admin_auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api',
});

api.interceptors.request.use((config) => {
  const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (stored) {
    config.headers.Authorization = `Basic ${stored}`;
  }
  return config;
});

export const authApi = {
  isLoggedIn: () => sessionStorage.getItem(AUTH_STORAGE_KEY) !== null,

  login: async (username: string, password: string): Promise<boolean> => {
    const encoded = btoa(`${username}:${password}`);
    try {
      await api.get('/admin/me', { headers: { Authorization: `Basic ${encoded}` } });
      sessionStorage.setItem(AUTH_STORAGE_KEY, encoded);
      return true;
    } catch {
      return false;
    }
  },

  logout: () => sessionStorage.removeItem(AUTH_STORAGE_KEY),
};

export interface Device {
  id: number;
  hardwareId: string;
  deviceName: string;
  osType: string;
  status: 'PENDING' | 'APPROVED' | 'REVOKED';
  worker: { id: number; name: string; employeeNo: string };
  registeredAt: string;
  approvedAt: string | null;
}

export interface AttendanceLog {
  id: number;
  workerName: string;
  employeeNo: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  checkedAt: string;
}

export interface IpWhitelistEntry {
  id: number;
  ipAddress: string;
  description: string | null;
  createdAt: string;
}

export interface DeviceStatusResponse {
  status: 'NOT_REGISTERED' | 'PENDING' | 'APPROVED' | 'REVOKED';
  workerName: string | null;
  checkedInToday: boolean;
}

export const deviceApi = {
  getAll: () => api.get<Device[]>('/admin/devices').then(r => r.data),
  getPending: () => api.get<Device[]>('/admin/devices/pending').then(r => r.data),
  updateStatus: (id: number, status: 'APPROVED' | 'REVOKED') =>
    api.patch<Device>(`/admin/devices/${id}/status`, null, { params: { status } }).then(r => r.data),
  getStatus: (hardwareId: string) =>
    api.get<DeviceStatusResponse>('/devices/status', { params: { hardwareId } }).then(r => r.data),
  register: (hardwareId: string, employeeNo: string, name: string, deviceName: string, osType: string) =>
    api.post('/devices/register', { hardwareId, employeeNo, name, deviceName, osType }).then(r => r.data),
  remove: (id: number) => api.delete(`/admin/devices/${id}`),
};

export const attendanceApi = {
  getLogs: (date: string) =>
    api.get<AttendanceLog[]>('/admin/attendance/logs', {
      params: { date },
    }).then(r => r.data),
  checkIn: (hardwareId: string, qrToken: string) =>
    api.post('/attendance/check-in', { hardwareId, qrToken }),
  checkOut: (hardwareId: string, qrToken: string) =>
    api.post('/attendance/check-out', { hardwareId, qrToken }),
};

export const ipWhitelistApi = {
  getAll: () => api.get<IpWhitelistEntry[]>('/admin/ip-whitelist').then(r => r.data),
  add: (ipAddress: string, description: string) =>
    api.post<IpWhitelistEntry>('/admin/ip-whitelist', { ipAddress, description }).then(r => r.data),
  remove: (id: number) => api.delete(`/admin/ip-whitelist/${id}`),
};

export const qrApi = {
  generate: () => api.get<{ token: string; expiresAt: string; expiresInSeconds: number }>('/qr/generate').then(r => r.data),
};
