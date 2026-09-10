import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { attendanceApi, AttendanceLog } from '../services/api';
import { Button, LoadingRow, Panel, PageHeader, StatRow, StatTile, StatusPill, inputClass } from '../components/dashboard';

export default function AttendanceLogs() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await attendanceApi.getLogs(date);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [date]);

  const checkIns = logs.filter(l => l.type === 'CHECK_IN').length;
  const checkOuts = logs.filter(l => l.type === 'CHECK_OUT').length;

  return (
    <div className="flex flex-1 flex-col gap-5 p-7">
      <PageHeader title="출퇴근 통계" sub="한국시간(KST) 기준 기록입니다." />

      <StatRow>
        <StatTile label="전체 기록" value={logs.length} />
        <StatTile label="출근" value={checkIns} tone="ok" />
        <StatTile label="퇴근" value={checkOuts} tone="crit" />
      </StatRow>

      <Panel
        actions={
          <div className="flex items-center gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
            <Button onClick={load}><Search className="h-3.5 w-3.5" /> 조회</Button>
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
                  <th className="whitespace-nowrap px-3.5 py-2.5">직원</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">사번</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">구분</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">시간</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    <td className="px-3.5 py-2.5 font-medium text-slate-200">{l.workerName}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12.5px] text-slate-300">{l.employeeNo}</td>
                    <td className="px-3.5 py-2.5">
                      <StatusPill tone={l.type === 'CHECK_IN' ? 'ok' : 'crit'}>
                        {l.type === 'CHECK_IN' ? '출근' : '퇴근'}
                      </StatusPill>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs text-slate-500">
                      {new Date(l.checkedAt).toLocaleTimeString('ko-KR', { hour12: false })}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">기록 없음</td>
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
