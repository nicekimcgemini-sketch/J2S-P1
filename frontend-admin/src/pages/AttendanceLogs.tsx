import { useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Search, Trash2 } from 'lucide-react';
import { attendanceApi, AttendanceFlag, AttendanceLog } from '../services/api';
import { AlertBanner, Button, LoadingRow, Panel, PageHeader, StatRow, StatTile, StatusPill, inputClass } from '../components/dashboard';

const FLAG_LABEL: Record<AttendanceFlag, string> = {
  LATE: '지각',
  EARLY_LEAVE: '조퇴',
  OVERTIME: '야근',
};

// 구분(출근/퇴근) 배지와 헷갈리지 않게 테두리형으로 표시
const FLAG_BADGE: Record<AttendanceFlag, string> = {
  LATE: 'border-amber-300 bg-amber-50 text-amber-700',
  EARLY_LEAVE: 'border-orange-300 bg-orange-50 text-orange-700',
  OVERTIME: 'border-indigo-300 bg-indigo-50 text-indigo-700',
};

type FlagFilter = 'ALL' | AttendanceFlag;

export default function AttendanceLogs() {
  const [allLogs, setAllLogs] = useState<AttendanceLog[]>([]);
  const [flagFilter, setFlagFilter] = useState<FlagFilter>('ALL');
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
      setAllLogs(data);
      setSelected(new Set());
    } catch (err: any) {
      setError(err?.response?.data?.message || '조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const checkIns = allLogs.filter(l => l.type === 'CHECK_IN').length;
  const checkOuts = allLogs.filter(l => l.type === 'CHECK_OUT').length;
  const flagCount = (flag: AttendanceFlag) => allLogs.filter(l => l.flag === flag).length;
  const logs = flagFilter === 'ALL' ? allLogs : allLogs.filter(l => l.flag === flagFilter);

  const changeFilter = (next: FlagFilter) => {
    setFlagFilter(next);
    setSelected(new Set());
  };

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
      <PageHeader
        title="출퇴근 통계"
        sub="한국시간(KST) 기준 기록입니다. 지각·조퇴·야근은 평일 근무시간 기준으로 표시하며 주말 기록은 판정하지 않습니다."
      />

      <StatRow>
        <StatTile label="전체 기록" value={allLogs.length} />
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
        <div className="flex items-center gap-5 border-b border-slate-200 px-5 pt-3">
          {([
            { key: 'ALL' as const, label: '전체', count: allLogs.length },
            { key: 'LATE' as const, label: '지각', count: flagCount('LATE') },
            { key: 'EARLY_LEAVE' as const, label: '조퇴', count: flagCount('EARLY_LEAVE') },
            { key: 'OVERTIME' as const, label: '야근', count: flagCount('OVERTIME') },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => changeFilter(f.key)}
              className={[
                '-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-[13.5px] font-semibold transition-colors',
                flagFilter === f.key
                  ? 'border-brand-600 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-700',
              ].join(' ')}
            >
              {f.label}
              <span className={flagFilter === f.key ? 'text-brand-600' : 'text-slate-300'}>{f.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingRow />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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
                  <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-3.5 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() => toggleOne(l.id)}
                        className="accent-brand-500"
                      />
                    </td>
                    <td className="px-3.5 py-2.5 font-medium text-slate-800">{l.workerName}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12.5px] text-slate-600">{l.employeeNo}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <StatusPill tone={l.type === 'CHECK_IN' ? 'ok' : 'crit'}>
                          {l.type === 'CHECK_IN' ? '출근' : '퇴근'}
                        </StatusPill>
                        {l.flag && (
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${FLAG_BADGE[l.flag]}`}
                          >
                            {FLAG_LABEL[l.flag]}
                          </span>
                        )}
                      </div>
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
