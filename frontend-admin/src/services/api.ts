import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api',
  auth: {
    username: import.meta.env.VITE_ADMIN_USER ?? 'admin',
    password: import.meta.env.VITE_ADMIN_PASS ?? 'admin1234',
  },
});

export interface Device {
  id: number;
  hardwareId: string;
  deviceName: string;
  osType: string;
  status: 'PENDING' | 'APPROVED' | 'REVOKED';
  worker: { id: number; name: string; employeeNo: string; company: { name: string } };
  registeredAt: string;
  approvedAt: string | null;
}

export interface AttendanceLog {
  id: number;
  workerName: string;
  employeeNo: string;
  companyName: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  checkedAt: string;
}

export const deviceApi = {
  getAll: () => api.get<Device[]>('/admin/devices').then(r => r.data),
  getPending: () => api.get<Device[]>('/admin/devices/pending').then(r => r.data),
  updateStatus: (id: number, status: 'APPROVED' | 'REVOKED') =>
    api.patch<Device>(`/admin/devices/${id}/status`, null, { params: { status } }).then(r => r.data),
};

export const attendanceApi = {
  getLogs: (date: string, companyId?: number) =>
    api.get<AttendanceLog[]>('/admin/attendance/logs', {
      params: { date, companyId },
    }).then(r => r.data),
};

export const qrApi = {
  generate: () => api.get<{ token: string; expiresAt: string; expiresInSeconds: number }>('/qr/generate').then(r => r.data),
};
