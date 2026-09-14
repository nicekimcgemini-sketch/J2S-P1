import axios from 'axios';

// 공개 API(QR·체크인·기기 등록)는 백엔드로 직접 호출한다
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api',
});

// 관리자 API는 서버 세션 쿠키를 쓰므로 같은 출처(/api/admin)로 호출한다.
// 운영은 프론트 nginx, 로컬은 Vite dev 서버가 백엔드로 프록시한다 (다른 도메인이면 세션 쿠키가 서드파티 쿠키로 차단됨)
const adminHttp = axios.create({ baseURL: '/api' });

/** 관리자 세션이 만료(401)됐을 때 window 로 발송되는 이벤트 */
export const ADMIN_SESSION_EXPIRED_EVENT = 'admin-session-expired';

let lastAdminActivityAt = Date.now();

/** 마지막으로 관리자 API 요청이 성공한 시각 — 서버 세션의 유휴 타이머가 이 시점부터 다시 시작된다 */
export const getLastAdminActivityAt = () => lastAdminActivityAt;

adminHttp.interceptors.response.use(
  (response) => {
    lastAdminActivityAt = Date.now();
    return response;
  },
  (error) => {
    const url: string = error.config?.url ?? '';
    if (error.response?.status === 401 && !url.endsWith('/admin/login')) {
      window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

export interface AdminSession {
  username: string;
  sessionTimeoutSeconds: number;
}

export const authApi = {
  /** 아이디/비밀번호가 틀리면 null */
  login: async (username: string, password: string): Promise<AdminSession | null> => {
    try {
      return (await adminHttp.post<AdminSession>('/admin/login', { username, password })).data;
    } catch {
      return null;
    }
  },

  /** 세션이 살아 있으면 세션 정보, 만료/미로그인이면 null */
  me: async (): Promise<AdminSession | null> => {
    try {
      return (await adminHttp.get<AdminSession>('/admin/me')).data;
    } catch {
      return null;
    }
  },

  logout: () => adminHttp.post('/admin/logout').catch(() => undefined),
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
  checkInAt: string | null;
  checkOutAt: string | null;
}

export const deviceApi = {
  getAll: () => adminHttp.get<Device[]>('/admin/devices').then(r => r.data),
  getPending: () => adminHttp.get<Device[]>('/admin/devices/pending').then(r => r.data),
  updateStatus: (id: number, status: 'APPROVED' | 'REVOKED') =>
    adminHttp.patch<Device>(`/admin/devices/${id}/status`, null, { params: { status } }).then(r => r.data),
  getStatus: (hardwareId: string) =>
    api.get<DeviceStatusResponse>('/devices/status', { params: { hardwareId } }).then(r => r.data),
  register: (hardwareId: string, employeeNo: string, name: string, deviceName: string, osType: string) =>
    api.post('/devices/register', { hardwareId, employeeNo, name, deviceName, osType }).then(r => r.data),
  remove: (id: number) => adminHttp.delete(`/admin/devices/${id}`),
};

export interface AttendanceLogQuery {
  startDate?: string;
  endDate?: string;
  employeeNo?: string;
  name?: string;
}

export const attendanceApi = {
  getLogs: (query: AttendanceLogQuery) =>
    adminHttp.get<AttendanceLog[]>('/admin/attendance/logs', {
      params: query,
    }).then(r => r.data),
  deleteLog: (id: number) => adminHttp.delete(`/admin/attendance/logs/${id}`),
  checkIn: (hardwareId: string, qrToken: string) =>
    api.post('/attendance/check-in', { hardwareId, qrToken }),
  checkOut: (hardwareId: string, qrToken: string) =>
    api.post('/attendance/check-out', { hardwareId, qrToken }),
};

export const ipWhitelistApi = {
  getAll: () => adminHttp.get<IpWhitelistEntry[]>('/admin/ip-whitelist').then(r => r.data),
  add: (ipAddress: string, description: string) =>
    adminHttp.post<IpWhitelistEntry>('/admin/ip-whitelist', { ipAddress, description }).then(r => r.data),
  remove: (id: number) => adminHttp.delete(`/admin/ip-whitelist/${id}`),
};

export const qrApi = {
  generate: () => api.get<{ token: string; expiresAt: string; expiresInSeconds: number }>('/qr/generate').then(r => r.data),
  status: (token: string) =>
    api.get<{ active: boolean }>('/qr/status', { params: { token } }).then(r => r.data),
};
