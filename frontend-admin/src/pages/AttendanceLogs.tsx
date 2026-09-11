import { useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Search, Trash2 } from 'lucide-react';
import { attendanceApi, AttendanceLog } from '../services/api';
import { AlertBanner, Button, LoadingRow, Panel, PageHeader, StatRow, StatTile, StatusPill, inputClass } from '../components/dashboard';

export default function AttendanceLogs() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [employeeNo, setEmployeeNo] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await attendanceApi.getLogs({
        startDate,
        endDate,
        employeeNo: employeeNo.trim() || undefined,
        name: name.trim() || undefined,
      });
      setLogs(data);
      setSelected(new Set());
    } catch (err: any) {
      setError(err?.response?.data?.message || '조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const checkIns = logs.filter(l => l.type === 'CHECK_IN').length;
  const checkOuts = logs.filter(l => l.type === 'CHECK_OUT').length;

  const applyDelete = async (ids: number[]) => {
    if (!confirm(`${ids.length}건을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setWorking(true);
    setError('');
    try {
      await Promise.all(ids.map(id => attendanceApi.deleteLog(id)));
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
    setSelected(prev => (prev.size === logs.length ? new Set() : new Set(logs.map(l => l.id))));
  };

  return (
    <div className="flex flex-1 flex-col gap-5 p-7">
      <PageHeader title="출퇴근 통계" sub="한국시간(KST) 기준 기록입니다." />

      <StatRow>
        <StatTile label="전체 기록" value={logs.length} />
        <StatTile label="출근" value={checkIns} tone="ok" />
        <StatTile label="퇴근" value={checkOuts} tone="crit" />
      </StatRow>

      {error && <AlertBanner>{error}</AlertBanner>}

      <Panel
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
            <span className="text-xs text-slate-500">~</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={e => setName(e.target.value)}
              className={`${inputClass} w-28`}
            />
            <input
              type="text"
              placeholder="사번 (예: S06098)"
              value={employeeNo}
              onChange={e => setEmployeeNo(e.target.value.toUpperCase())}
              className={`${inputClass} w-36`}
            />
            <Button onClick={load}><Search className="h-3.5 w-3.5" /> 조회</Button>
            {selected.size > 0 && (
              <Button variant="ghost" size="md" disabled={working} onClick={() => applyDelete([...selected])}>
                <Trash2 className="h-3.5 w-3.5" /> {selected.size}건 삭제
              </Button>
            )}
          </div>
        }
      >
        {loading ? (
          <LoadingRow />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="whitespace-nowrap px-3.5 py-2.5">
                    <input
                      type="checkbox"
                      checked={logs.length > 0 && selected.size === logs.length}
                      onChange={toggleAll}
                      className="accent-brand-500"
                    />
                  </th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">직원</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">사번</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">구분</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">일시</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">작업</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    <td className="px-3.5 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() => toggleOne(l.id)}
                        className="accent-brand-500"
                      />
                    </td>
                    <td className="px-3.5 py-2.5 font-medium text-slate-200">{l.workerName}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12.5px] text-slate-300">{l.employeeNo}</td>
                    <td className="px-3.5 py-2.5">
                      <StatusPill tone={l.type === 'CHECK_IN' ? 'ok' : 'crit'}>
                        {l.type === 'CHECK_IN' ? '출근' : '퇴근'}
                      </StatusPill>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs text-slate-500">
                      {new Date(l.checkedAt).toLocaleString('ko-KR', { hour12: false })}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Button variant="ghost" size="sm" disabled={working} onClick={() => applyDelete([l.id])}>삭제</Button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">기록 없음</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
