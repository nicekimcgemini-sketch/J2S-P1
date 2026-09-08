import { useEffect, useState } from 'react';
import { deviceApi, Device } from '../services/api';

const STATUS_LABEL: Record<string, string> = {
  PENDING: '승인 대기',
  APPROVED: '승인',
  REVOKED: '권한 회수',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#faad14',
  APPROVED: '#52c41a',
  REVOKED: '#ff4d4f',
};

export default function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING'>('PENDING');

  const load = async () => {
    setLoading(true);
    const data = filter === 'PENDING' ? await deviceApi.getPending() : await deviceApi.getAll();
    setDevices(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleStatus = async (id: number, status: 'APPROVED' | 'REVOKED') => {
    await deviceApi.updateStatus(id, status);
    await load();
  };

  return (
    <div style={styles.page}>
      <h2>기기 관리</h2>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        {(['PENDING', 'ALL'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ ...styles.filterBtn, background: filter === f ? '#1677ff' : '#fff', color: filter === f ? '#fff' : '#333' }}
          >
            {f === 'PENDING' ? '승인 대기' : '전체'}
          </button>
        ))}
      </div>

      {loading ? <p>로딩 중...</p> : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th>직원</th><th>사번</th>
              <th>기기명</th><th>OS</th><th>상태</th><th>등록일</th><th>작업</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => (
              <tr key={d.id}>
                <td>{d.worker.name}</td>
                <td>{d.worker.employeeNo}</td>
                <td>{d.deviceName}</td>
                <td>{d.osType}</td>
                <td>
                  <span style={{ color: STATUS_COLOR[d.status], fontWeight: 600 }}>
                    {STATUS_LABEL[d.status]}
                  </span>
                </td>
                <td>{new Date(d.registeredAt).toLocaleDateString()}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  {d.status !== 'APPROVED' && (
                    <button style={styles.btnApprove} onClick={() => handleStatus(d.id, 'APPROVED')}>승인</button>
                  )}
                  {d.status !== 'REVOKED' && (
                    <button style={styles.btnRevoke} onClick={() => handleStatus(d.id, 'REVOKED')}>회수</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24 },
  filterBtn: { padding: '6px 16px', border: '1px solid #d9d9d9', borderRadius: 6, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  btnApprove: { padding: '4px 12px', background: '#52c41a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  btnRevoke: { padding: '4px 12px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
};
