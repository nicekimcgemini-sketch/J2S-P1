import { useEffect, useMemo, useState } from 'react';
import { Check, ShieldOff, Trash2 } from 'lucide-react';
import { deviceApi, Device } from '../services/api';
import { AlertBanner, Button, LoadingRow, PageHeader, StatRow, StatTile, StatusPill } from '../components/dashboard';

const STATUS_LABEL: Record<string, string> = {
  PENDING: '승인 대기',
  APPROVED: '승인됨',
  REVOKED: '권한 회수',
};

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'crit'> = {
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
    <div className="flex flex-1 flex-col gap-5 p-7">
      <PageHeader title="기기 관리" />

      <StatRow>
        <StatTile label="전체 기기" value={counts.total} />
        <StatTile label="승인 대기" value={counts.pending} tone="warn" />
        <StatTile label="승인됨" value={counts.approved} tone="ok" />
        <StatTile label="권한 회수" value={counts.revoked} tone="crit" />
      </StatRow>

      {error && <AlertBanner>{error}</AlertBanner>}

      <div className="overflow-hidden border border-slate-800 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div className="flex gap-1.5">
            {(['PENDING', 'ALL'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={[
                  'px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                  filter === f ? 'bg-brand-600 text-white' : 'border border-slate-700 text-slate-400 hover:text-white',
                ].join(' ')}
              >
                {f === 'PENDING' ? '승인 대기' : '전체'}
              </button>
            ))}
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-500">{selected.size}건 선택됨</span>
              <Button variant="ok" size="sm" disabled={working} onClick={() => applyStatus([...selected], 'APPROVED')}>
                <Check className="h-3.5 w-3.5" /> 일괄 승인
              </Button>
              <Button variant="crit" size="sm" disabled={working} onClick={() => applyStatus([...selected], 'REVOKED')}>
                <ShieldOff className="h-3.5 w-3.5" /> 일괄 회수
              </Button>
              <Button variant="ghost" size="sm" disabled={working} onClick={() => applyDelete([...selected])}>
                <Trash2 className="h-3.5 w-3.5" /> 일괄 삭제
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <LoadingRow />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-800 bg-black/20 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="whitespace-nowrap px-3.5 py-2.5">
                    <input
                      type="checkbox"
                      checked={devices.length > 0 && selected.size === devices.length}
                      onChange={toggleAll}
                      className="accent-brand-500"
                    />
                  </th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">직원</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">사번</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">기기명</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">OS</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">기기 토큰 (hardwareId)</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">상태</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">등록일</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">작업</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(d => (
                  <tr key={d.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/40">
                    <td className="px-3.5 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(d.id)}
                        onChange={() => toggleOne(d.id)}
                        className="accent-brand-500"
                      />
                    </td>
                    <td className="px-3.5 py-2.5 font-medium text-slate-200">{d.worker.name}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12.5px] text-slate-300">{d.worker.employeeNo}</td>
                    <td className="max-w-[220px] truncate px-3.5 py-2.5 text-slate-300">{d.deviceName}</td>
                    <td className="px-3.5 py-2.5 text-slate-400">{d.osType}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="font-mono text-xs text-slate-500">{d.hardwareId}</span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <StatusPill tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</StatusPill>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs text-slate-500">
                      {new Date(d.registeredAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex gap-1.5">
                        {d.status !== 'APPROVED' && (
                          <Button variant="ok" size="sm" disabled={working} onClick={() => applyStatus([d.id], 'APPROVED')}>승인</Button>
                        )}
                        {d.status !== 'REVOKED' && (
                          <Button variant="crit" size="sm" disabled={working} onClick={() => applyStatus([d.id], 'REVOKED')}>회수</Button>
                        )}
                        <Button variant="ghost" size="sm" disabled={working} onClick={() => applyDelete([d.id])}>삭제</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {devices.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-500">등록된 기기 없음</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
