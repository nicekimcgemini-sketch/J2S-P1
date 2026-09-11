import { useEffect, useMemo, useState } from 'react';
import { Check, ShieldOff, Trash2 } from 'lucide-react';
import { deviceApi, Device } from '../services/api';
import { AlertBanner, Button, LoadingRow, PageHeader, StatusPill } from '../components/dashboard';

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
  const [filter, setFilter] = useState<'ALL' | 'PENDING'>('ALL');
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
      <PageHeader
        title="기기 관리"
        sub={`전체 ${counts.total}대 · 승인 ${counts.approved} · 대기 ${counts.pending} · 회수 ${counts.revoked}`}
      />

      {error && <AlertBanner>{error}</AlertBanner>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <div className="flex items-center gap-5">
            {([
              { key: 'ALL' as const, label: '전체', count: counts.total },
              { key: 'PENDING' as const, label: '승인 대기', count: counts.pending },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={[
                  '-mb-px flex items-center gap-1.5 border-b-2 pb-3 text-[13.5px] font-semibold transition-colors',
                  filter === f.key
                    ? 'border-brand-600 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-700',
                ].join(' ')}
              >
                {f.label}
                <span className={filter === f.key ? 'text-brand-600' : 'text-slate-300'}>{f.count}</span>
              </button>
            ))}
          </div>

          {selected.size > 0 && (
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400">{selected.size}건 선택됨</span>
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
        <div className="border-b border-slate-200" />

        {loading ? (
          <LoadingRow />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="whitespace-nowrap px-5 py-2.5">
                    <input
                      type="checkbox"
                      checked={devices.length > 0 && selected.size === devices.length}
                      onChange={toggleAll}
                      className="accent-brand-500"
                    />
                  </th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">작업자</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">기기</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">상태</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">등록일</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5 text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(d => (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(d.id)}
                        onChange={() => toggleOne(d.id)}
                        className="accent-brand-500"
                      />
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{d.worker.name}</span>
                        <span className="font-mono text-[11.5px] text-slate-400">{d.worker.employeeNo}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex flex-col">
                        <span className="max-w-[200px] truncate text-slate-700">{d.deviceName || '(기기명 없음)'}</span>
                        <span className="font-mono text-[11px] text-slate-400">{d.osType} · {d.hardwareId.slice(0, 12)}…</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      <StatusPill tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</StatusPill>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-slate-400">
                      {new Date(d.registeredAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex justify-end gap-1">
                        {d.status !== 'APPROVED' && (
                          <button
                            title="승인"
                            disabled={working}
                            onClick={() => applyStatus([d.id], 'APPROVED')}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {d.status !== 'REVOKED' && (
                          <button
                            title="권한 회수"
                            disabled={working}
                            onClick={() => applyStatus([d.id], 'REVOKED')}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40"
                          >
                            <ShieldOff className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          title="삭제"
                          disabled={working}
                          onClick={() => applyDelete([d.id])}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {devices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">등록된 기기 없음</td>
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
