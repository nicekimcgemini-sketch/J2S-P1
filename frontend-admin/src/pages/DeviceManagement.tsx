import { useEffect, useMemo, useState } from 'react';
import { deviceApi, Device } from '../services/api';

const STATUS_LABEL: Record<string, string> = {
  PENDING: '승인 대기',
  APPROVED: '승인됨',
  REVOKED: '권한 회수',
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'warn',
  APPROVED: 'ok',
  REVOKED: 'crit',
};

export default function DeviceManagement() {
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING'>('PENDING');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await deviceApi.getAll();
    setAllDevices(data);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    total: allDevices.length,
    pending: allDevices.filter(d => d.status === 'PENDING').length,
    approved: allDevices.filter(d => d.status === 'APPROVED').length,
    revoked: allDevices.filter(d => d.status === 'REVOKED').length,
  }), [allDevices]);

  const devices = filter === 'PENDING' ? allDevices.filter(d => d.status === 'PENDING') : allDevices;

  const applyStatus = async (ids: number[], status: 'APPROVED' | 'REVOKED') => {
    setWorking(true);
    setError('');
    try {
      await Promise.all(ids.map(id => deviceApi.updateStatus(id, status)));
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || '처리에 실패했습니다.');
    } finally {
      setWorking(false);
    }
  };

  const applyDelete = async (ids: number[]) => {
    if (!confirm(`${ids.length}건을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setWorking(true);
    setError('');
    try {
      await Promise.all(ids.map(id => deviceApi.remove(id)));
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || '삭제에 실패했습니다.');
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
    <div className="page-body">
      <h1 className="page-title">기기 관리</h1>

      <div className="stat-row">
        <div className="stat-tile">
          <span className="stat-label">전체 기기</span>
          <span className="stat-value">{counts.total}</span>
        </div>
        <div className="stat-tile warn">
          <span className="stat-label">승인 대기</span>
          <span className="stat-value">{counts.pending}</span>
        </div>
        <div className="stat-tile ok">
          <span className="stat-label">승인됨</span>
          <span className="stat-value">{counts.approved}</span>
        </div>
        <div className="stat-tile crit">
          <span className="stat-label">권한 회수</span>
          <span className="stat-value">{counts.revoked}</span>
        </div>
      </div>

      {error && <p className="alert-banner">{error}</p>}

      <div className="panel">
        <div className="panel-header">
          <div className="filter-tabs">
            {(['PENDING', 'ALL'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={'filter-tab' + (filter === f ? ' active' : '')}
              >
                {f === 'PENDING' ? '승인 대기' : '전체'}
              </button>
            ))}
          </div>

          {selected.size > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="mono">{selected.size}건 선택됨</span>
              <button disabled={working} className="btn btn-ok btn-sm" onClick={() => applyStatus([...selected], 'APPROVED')}>
                일괄 승인
              </button>
              <button disabled={working} className="btn btn-crit btn-sm" onClick={() => applyStatus([...selected], 'REVOKED')}>
                일괄 회수
              </button>
              <button disabled={working} className="btn btn-ghost btn-sm" onClick={() => applyDelete([...selected])}>
                일괄 삭제
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <p style={{ padding: 24, color: 'var(--text-muted)' }}>로딩 중...</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={devices.length > 0 && selected.size === devices.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>직원</th><th>사번</th>
                  <th>기기명</th><th>OS</th>
                  <th>기기 토큰 (hardwareId)</th>
                  <th>상태</th><th>등록일</th><th>작업</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(d => (
                  <tr key={d.id}>
                    <td>
                      <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleOne(d.id)} />
                    </td>
                    <td>{d.worker.name}</td>
                    <td className="mono-strong">{d.worker.employeeNo}</td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.deviceName}</td>
                    <td>{d.osType}</td>
                    <td><span className="mono">{d.hardwareId}</span></td>
                    <td><span className={'status-pill ' + STATUS_CLASS[d.status]}>{STATUS_LABEL[d.status]}</span></td>
                    <td className="mono">{new Date(d.registeredAt).toLocaleDateString('ko-KR')}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      {d.status !== 'APPROVED' && (
                        <button disabled={working} className="btn btn-ok btn-sm" onClick={() => applyStatus([d.id], 'APPROVED')}>승인</button>
                      )}
                      {d.status !== 'REVOKED' && (
                        <button disabled={working} className="btn btn-crit btn-sm" onClick={() => applyStatus([d.id], 'REVOKED')}>회수</button>
                      )}
                      <button disabled={working} className="btn btn-ghost btn-sm" onClick={() => applyDelete([d.id])}>삭제</button>
                    </td>
                  </tr>
                ))}
                {devices.length === 0 && (
                  <tr><td colSpan={9} className="empty-row">등록된 기기 없음</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
