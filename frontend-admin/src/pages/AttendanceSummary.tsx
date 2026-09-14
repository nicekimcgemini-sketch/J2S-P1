import { useEffect, useMemo, useState } from 'react';
import { endOfMonth, format, parseISO, startOfMonth, subDays, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Search } from 'lucide-react';
import { attendanceApi, DailyAttendance, DailyStatus, holidayApi } from '../services/api';
import { AlertBanner, Button, LoadingRow, PageHeader, Panel, inputClass } from '../components/dashboard';
import { aggregateWorkerStats, formatHours, WorkerStatsCharts } from '../components/WorkerStatsCharts';
import { AttendanceHeatmap } from '../components/AttendanceHeatmap';

const STATUS_LABEL: Record<DailyStatus, string> = {
  NORMAL: '정상',
  LATE: '지각',
  EARLY_LEAVE: '조퇴',
  OVERTIME: '야근',
  ABSENT: '결근',
  MISSING_CHECK_IN: '출근 누락',
  MISSING_CHECK_OUT: '퇴근 누락',
  WORKING: '근무 중',
  NOT_YET: '미출근',
  WEEKEND_WORK: '주말 특근',
  HOLIDAY_WORK: '휴일 근무',
};

const STATUS_BADGE: Record<DailyStatus, string> = {
  NORMAL: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  LATE: 'border-amber-300 bg-amber-50 text-amber-700',
  EARLY_LEAVE: 'border-orange-300 bg-orange-50 text-orange-700',
  OVERTIME: 'border-indigo-300 bg-indigo-50 text-indigo-700',
  ABSENT: 'border-rose-300 bg-rose-50 text-rose-700',
  MISSING_CHECK_IN: 'border-slate-300 bg-slate-50 text-slate-600',
  MISSING_CHECK_OUT: 'border-slate-300 bg-slate-50 text-slate-600',
  WORKING: 'border-sky-300 bg-sky-50 text-sky-700',
  NOT_YET: 'border-slate-200 bg-white text-slate-500',
  WEEKEND_WORK: 'border-violet-300 bg-violet-50 text-violet-700',
  HOLIDAY_WORK: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700',
};

type StatusFilter = 'ALL' | 'ABSENT' | 'LATE' | 'EARLY_LEAVE' | 'OVERTIME' | 'MISSING';

const FILTERS: { key: StatusFilter; label: string; match: (s: DailyStatus[]) => boolean }[] = [
  { key: 'ALL', label: '전체', match: () => true },
  { key: 'ABSENT', label: '결근', match: s => s.includes('ABSENT') },
  { key: 'LATE', label: '지각', match: s => s.includes('LATE') },
  { key: 'EARLY_LEAVE', label: '조퇴', match: s => s.includes('EARLY_LEAVE') },
  { key: 'OVERTIME', label: '야근', match: s => s.includes('OVERTIME') },
  { key: 'MISSING', label: '기록 누락', match: s => s.includes('MISSING_CHECK_IN') || s.includes('MISSING_CHECK_OUT') },
];

const today = () => format(new Date(), 'yyyy-MM-dd');
const timeOf = (iso: string | null) => (iso ? format(parseISO(iso), 'HH:mm') : '-');
const durationOf = (minutes: number | null) =>
  minutes == null ? '-' : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

export default function AttendanceSummary() {
  const [rows, setRows] = useState<DailyAttendance[]>([]);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(today());
  const [name, setName] = useState('');
  const [employeeNo, setEmployeeNo] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  // 마지막으로 조회한 기간과 그 기간의 휴일 (입력칸만 바꾸고 조회하지 않았을 때 히트맵이 흔들리지 않게 따로 둔다)
  const [loadedRange, setLoadedRange] = useState({ startDate, endDate });
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map());

  const load = async (range?: { startDate: string; endDate: string }) => {
    const query = range ?? { startDate, endDate };
    setLoading(true);
    setError('');
    try {
      const startYear = Number(query.startDate.slice(0, 4));
      const endYear = Number(query.endDate.slice(0, 4));
      const years = Array.from({ length: Math.max(1, endYear - startYear + 1) }, (_, i) => startYear + i);
      const [daily, ...holidayLists] = await Promise.all([
        attendanceApi.getDailySummary({
          ...query,
          employeeNo: employeeNo.trim() || undefined,
          name: name.trim() || undefined,
        }),
        ...years.map(y => holidayApi.getAll(y)),
      ]);
      setRows(daily);
      setHolidays(new Map(holidayLists.flat().map(h => [h.date, h.name])));
      setLoadedRange(query);
      setLoaded(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || '조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const applyPreset = (range: { startDate: string; endDate: string }) => {
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    load(range);
  };

  const presets = [
    { label: '이번 달', range: { startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'), endDate: today() } },
    {
      label: '지난 달',
      range: {
        startDate: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
      },
    },
    { label: '최근 30일', range: { startDate: format(subDays(new Date(), 29), 'yyyy-MM-dd'), endDate: today() } },
  ];

  const stats = useMemo(() => aggregateWorkerStats(rows), [rows]);
  const visibleRows = rows.filter(r => FILTERS.find(f => f.key === filter)!.match(r.statuses));
  const countOf = (key: StatusFilter) => rows.filter(r => FILTERS.find(f => f.key === key)!.match(r.statuses)).length;

  return (
    <div className="flex flex-1 flex-col gap-5 p-7">
      <PageHeader
        title="근태 요약"
        sub={`직원 ${stats.length}명 · 결근 ${countOf('ABSENT')} · 지각 ${countOf('LATE')} · 조퇴 ${countOf('EARLY_LEAVE')} · 야근 ${countOf('OVERTIME')} · 기록 누락 ${countOf('MISSING')} — 평일 근무시간 기준, 주말과 공휴일 관리에 등록된 휴일은 근무일에서 뺍니다.`}
      />

      {/* 기간·직원 조건은 아래 그래프·통계표·일별 표 전체에 함께 적용된다 */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-900/5">
        {presets.map(p => (
          <Button key={p.label} variant="ghost" size="sm" disabled={loading} onClick={() => applyPreset(p.range)}>
            {p.label}
          </Button>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
        <span className="text-xs text-slate-500">~</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
        <input type="text" placeholder="이름" value={name} onChange={e => setName(e.target.value)} className={`${inputClass} w-28`} />
        <input
          type="text"
          placeholder="사번 (예: S06098)"
          value={employeeNo}
          onChange={e => setEmployeeNo(e.target.value.toUpperCase())}
          className={`${inputClass} w-36`}
        />
        <Button onClick={() => load()} disabled={loading}><Search className="h-3.5 w-3.5" /> 조회</Button>
      </div>

      {error && <AlertBanner>{error}</AlertBanner>}

      {!loaded ? (
        <LoadingRow />
      ) : (
        // 다시 조회하는 동안에는 이전 결과를 흐리게 유지한다 (레이아웃 흔들림 방지)
        <div className={`flex flex-col gap-5 transition-opacity ${loading ? 'opacity-50' : ''}`}>
          <WorkerStatsCharts stats={stats} />

          <Panel title="일별·직원별 근태 현황" padded>
            <AttendanceHeatmap
              rows={rows}
              startDate={loadedRange.startDate}
              endDate={loadedRange.endDate}
              holidays={holidays}
            />
          </Panel>

          <Panel title="직원별 통계표">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="whitespace-nowrap px-3.5 py-2.5">직원</th>
                    {['근무일', '총 근무시간', '정상', '지각', '조퇴', '야근', '결근', '기록 누락', '주말·휴일 근무'].map(h => (
                      <th key={h} className="whitespace-nowrap px-3.5 py-2.5 text-right">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.map(s => (
                    <tr key={s.employeeNo} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-3.5 py-2.5">
                        <div className="font-medium text-slate-800">{s.workerName}</div>
                        <div className="font-mono text-[11.5px] text-slate-400">{s.employeeNo}</div>
                      </td>
                      {[
                        `${s.workDays}일`, formatHours(s.totalMinutes), s.normal, s.late, s.earlyLeave,
                        s.overtime, s.absent, s.missing, s.weekendWork,
                      ].map((v, i) => (
                        <td key={i} className="whitespace-nowrap px-3.5 py-2.5 text-right tabular text-slate-700">{v}</td>
                      ))}
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr><td colSpan={10} className="px-6 py-10 text-center text-sm text-slate-500">기록 없음</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 pt-3">
              <div className="flex flex-wrap items-center gap-5">
                <span className="pb-2.5 text-[13px] font-bold text-slate-700">일별 근태</span>
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={[
                      '-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-[13.5px] font-semibold transition-colors',
                      filter === f.key
                        ? 'border-brand-600 text-slate-900'
                        : 'border-transparent text-slate-400 hover:text-slate-700',
                    ].join(' ')}
                  >
                    {f.label}
                    <span className={filter === f.key ? 'text-brand-600' : 'text-slate-300'}>{countOf(f.key)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="whitespace-nowrap px-3.5 py-2.5">날짜</th>
                    <th className="whitespace-nowrap px-3.5 py-2.5">직원</th>
                    <th className="whitespace-nowrap px-3.5 py-2.5">출근</th>
                    <th className="whitespace-nowrap px-3.5 py-2.5">퇴근</th>
                    <th className="whitespace-nowrap px-3.5 py-2.5">근무시간</th>
                    <th className="whitespace-nowrap px-3.5 py-2.5">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(r => (
                    <tr key={`${r.date}-${r.employeeNo}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3.5 py-2.5">
                        <div className="font-mono text-xs text-slate-600">{format(parseISO(r.date), 'M/d (EEE)', { locale: ko })}</div>
                        {r.holidayName && <div className="text-[11px] text-fuchsia-700">{r.holidayName}</div>}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="font-medium text-slate-800">{r.workerName}</span>
                        <span className="ml-1.5 font-mono text-[11.5px] text-slate-400">{r.employeeNo}</span>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs text-slate-600">{timeOf(r.checkInAt)}</td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs text-slate-600">{timeOf(r.checkOutAt)}</td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs text-slate-600">
                        {durationOf(r.workMinutes)}
                        {!!r.breakMinutes && <span className="ml-1.5 text-[11px] text-slate-400">휴게 {durationOf(r.breakMinutes)}</span>}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {r.statuses.map(s => (
                            <span
                              key={s}
                              className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${STATUS_BADGE[s]}`}
                            >
                              {STATUS_LABEL[s]}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleRows.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">기록 없음</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
