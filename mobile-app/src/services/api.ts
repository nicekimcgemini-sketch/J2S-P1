import axios from 'axios';

const api = axios.create({
  baseURL: __DEV__ ? 'http://10.0.2.2:8080/api' : 'https://your-api-domain.com/api',
  timeout: 10_000,
});

export interface DeviceStatus {
  status: 'PENDING' | 'APPROVED' | 'REVOKED';
  id: number;
}

export const deviceApi = {
  register: (params: {
    hardwareId: string;
    employeeNo: string;
    deviceName: string;
    osType: string;
  }) => api.post<DeviceStatus>('/devices/register', params).then(r => r.data),
};

export const attendanceApi = {
  checkIn: (qrToken: string, hardwareId: string) =>
    api.post('/attendance/check-in', { qrToken, hardwareId }),

  checkOut: (qrToken: string, hardwareId: string) =>
    api.post('/attendance/check-out', { qrToken, hardwareId }),
};
