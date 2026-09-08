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
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = filter === 'PENDING' ? await deviceApi.getPending() : await deviceApi.getAll();
    setDevices(data);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const applyStatus = async (ids: number[], status: 'APPROVED' | 'REVOKED') => {
    setWorking(true);
    try {
      await Promise.all(ids.map(id => deviceApi.updateStatus(id, status)));
      await load();
    } finally {
      setWorking(false);
    }
  };

  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => (prev.size === devices.length ? new Set() : new Set(devices.map(d => d.id))));
  };

  return (
    <div style={styles.page}>
      <h2>기기 관리</h2>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        {(['PENDING', 'ALL'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ ...styles.filterBtn, background: filter === f ? '#1677ff' : '#fff', color: filter === f ? '#fff' : '#333' }}
          >
            {f === 'PENDING' ? '승인 대기' : '전체'}
          </button>
        ))}

        {selected.size > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#555' }}>{selected.size}건 선택됨</span>
            <button
              disabled={working}
              style={styles.btnApprove}
              onClick={() => applyStatus([...selected], 'APPROVED')}
            >
              일괄 승인
            </button>
            <button
              disabled={working}
              style={styles.btnRevoke}
              onClick={() => applyStatus([...selected], 'REVOKED')}
            >
              일괄 회수
            </button>
          </div>
        )}
      </div>

      {loading ? <p>로딩 중...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  <input
                    type="checkbox"
                    checked={devices.length > 0 && selected.size === devices.length}
                    onChange={toggleAll}
                  />
                </th>
                <th style={styles.th}>직원</th><th style={styles.th}>사번</th>
                <th style={styles.th}>기기명</th><th style={styles.th}>OS</th>
                <th style={styles.th}>기기 토큰 (hardwareId)</th>
                <th style={styles.th}>상태</th><th style={styles.th}>등록일</th><th style={styles.th}>작업</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id}>
                  <td style={styles.td}>
                    <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleOne(d.id)} />
                  </td>
                  <td style={styles.td}>{d.worker.name}</td>
                  <td style={styles.td}>{d.worker.employeeNo}</td>
                  <td style={styles.td}>{d.deviceName}</td>
                  <td style={styles.td}>{d.osType}</td>
                  <td style={styles.td}>
                    <code style={styles.token}>{d.hardwareId}</code>
                  </td>
                  <td style={styles.td}>
                    <span style={{ color: STATUS_COLOR[d.status], fontWeight: 600 }}>
                      {STATUS_LABEL[d.status]}
                    </span>
                  </td>
                  <td style={styles.td}>{new Date(d.registeredAt).toLocaleDateString()}</td>
                  <td style={{ ...styles.td, display: 'flex', gap: 6 }}>
                    {d.status !== 'APPROVED' && (
                      <button disabled={working} style={styles.btnApprove} onClick={() => applyStatus([d.id], 'APPROVED')}>승인</button>
                    )}
                    {d.status !== 'REVOKED' && (
                      <button disabled={working} style={styles.btnRevoke} onClick={() => applyStatus([d.id], 'REVOKED')}>회수</button>
                    )}
                  </td>
                </tr>
              ))}
              {devices.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>등록된 기기 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24 },
  filterBtn: { padding: '6px 16px', border: '1px solid #d9d9d9', borderRadius: 6, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' },
  td: { padding: '10px 12px', borderTop: '1px solid #f0f0f0' },
  token: { fontFamily: 'monospace', fontSize: 12, color: '#555', whiteSpace: 'nowrap' },
  btnApprove: { padding: '4px 12px', background: '#52c41a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  btnRevoke: { padding: '4px 12px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
};
