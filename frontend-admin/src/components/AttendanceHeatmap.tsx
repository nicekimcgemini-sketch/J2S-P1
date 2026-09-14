import { useState } from 'react';
import { eachDayOfInterval, format, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DailyAttendance, DailyStatus } from '../services/api';

/**
 * 일별 × 직원별 근태 현황 히트맵. 행 = 직원, 열 = 날짜, 칸 = 그날 근태 상태.
 * 좋고 나쁨의 의미가 있는 상태라 dataviz 고정 status 팔레트(good/warning/serious/critical)를 쓰고,
 * 색만으로 구분하지 않도록 칸마다 한 글자 라벨을 함께 둔다. 라벨 글자색은 채움 대비로 골랐다
 * (critical 만 흰색 4.8:1, 나머지는 어두운 잉크 4.9~9.7:1). 같은 값은 아래 일별 근태 표에서도 읽을 수 있다.
 */

type CellKind = 'normal' | 'lateEarly' | 'missing' | 'absent' | 'dayOffWork' | 'today' | 'dayOff' | 'none';

const KIND_STYLE: Record<CellKind, { fill: string; ink: string; outline?: string }> = {
  normal: { fill: '#0ca30c', ink: '#1f170b' },
  lateEarly: { fill: '#fab219', ink: '#1f170b' },
  missing: { fill: '#ec835a', ink: '#1f170b' },
  absent: { fill: '#d03b3b', ink: '#ffffff' },
  dayOffWork: { fill: '#898781', ink: '#1f170b' },
  today: { fill: '#ffffff', ink: '#6b5030', outline: '#c7aa74' },
  dayOff: { fill: '#f8f1e3', ink: '#c7aa74' },
  none: { fill: 'transparent', ink: 'transparent' },
};

const LEGEND: { kind: CellKind; label: string }[] = [
  { kind: 'normal', label: '정상' },
  { kind: 'lateEarly', label: '지각·조퇴' },
  { kind: 'missing', label: '기록 누락' },
  { kind: 'absent', label: '결근' },
  { kind: 'dayOffWork', label: '주말·휴일 근무' },
  { kind: 'today', label: '오늘(근무 중·미출근)' },
  { kind: 'dayOff', label: '휴무일' },
];

const STATUS_TEXT: Record<DailyStatus, string> = {
  NORMAL: '정상', LATE: '지각', EARLY_LEAVE: '조퇴', OVERTIME: '야근', ABSENT: '결근',
  MISSING_CHECK_IN: '출근 누락', MISSING_CHECK_OUT: '퇴근 누락', WORKING: '근무 중', NOT_YET: '미출근',
  WEEKEND_WORK: '주말 특근', HOLIDAY_WORK: '휴일 근무',
};

function classify(row: DailyAttendance): { kind: CellKind; label: string } {
  const s = new Set(row.statuses);
  const overtime = s.has('OVERTIME') ? '야' : '';
  if (s.has('WEEKEND_WORK') || s.has('HOLIDAY_WORK')) return { kind: 'dayOffWork', label: '휴' };
  if (s.has('ABSENT')) return { kind: 'absent', label: '결' };
  if (s.has('MISSING_CHECK_IN') || s.has('MISSING_CHECK_OUT')) return { kind: 'missing', label: `누${overtime}` };
  if (s.has('WORKING')) return { kind: 'today', label: s.has('LATE') ? '지' : '중' };
  if (s.has('NOT_YET')) return { kind: 'today', label: '–' };
  const lateEarly = `${s.has('LATE') ? '지' : ''}${s.has('EARLY_LEAVE') ? '조' : ''}`;
  if (lateEarly) return { kind: 'lateEarly', label: `${lateEarly}${overtime}` };
  return { kind: 'normal', label: overtime || '정' };
}

const hhmm = (iso: string | null) => (iso ? format(parseISO(iso), 'HH:mm') : '-');
const duration = (m: number | null) => (m == null ? '-' : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`);

interface Tip {
  x: number;
  y: number;
  title: string;
  lines: { label: string; value: string }[];
}

export function AttendanceHeatmap({ rows, startDate, endDate, holidays }: {
  rows: DailyAttendance[];
  startDate: string;
  endDate: string;
  /** 기간 안의 등록된 휴일 (yyyy-MM-dd → 이름) */
  holidays: Map<string, string>;
}) {
  const [tip, setTip] = useState<Tip | null>(null);

  const today = new Date();
  const start = parseISO(startDate);
  const requestedEnd = parseISO(endDate);
  const end = requestedEnd > today ? today : requestedEnd;   // 미래 날짜는 판정하지 않으므로 표시하지 않는다
  if (end < start || rows.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-slate-500">표시할 근태 기록이 없습니다.</p>;
  }
  const days = eachDayOfInterval({ start, end });

  const workers = [...new Map(rows.map(r => [r.employeeNo, r.workerName])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'ko'));
  const byKey = new Map(rows.map(r => [`${r.employeeNo}|${r.date}`, r]));

  const isDayOff = (d: Date) => d.getDay() === 0 || d.getDay() === 6 || holidays.has(format(d, 'yyyy-MM-dd'));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        {LEGEND.map(l => {
          const st = KIND_STYLE[l.kind];
          return (
            <span key={l.kind} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span
                className="h-3 w-3 rounded-[3px]"
                style={{ backgroundColor: st.fill, boxShadow: st.outline ? `inset 0 0 0 1px ${st.outline}` : undefined }}
              />
              {l.label}
            </span>
          );
        })}
        <span className="text-xs text-slate-500">칸 글자: 정 정상 · 지 지각 · 조 조퇴 · 야 야근 · 누 기록 누락 · 결 결근 · 휴 휴일 근무</span>
      </div>

      <div className="overflow-x-auto pb-1">
        <table className="border-separate border-spacing-[2px] text-[11px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-28 bg-white px-2 text-left font-semibold text-slate-500">직원</th>
              {days.map((d, i) => {
                const key = format(d, 'yyyy-MM-dd');
                const showMonth = i === 0 || d.getDate() === 1;
                return (
                  <th
                    key={key}
                    title={holidays.get(key) ?? format(d, 'M월 d일 EEEE', { locale: ko })}
                    className={`w-7 min-w-7 pb-1 text-center font-medium tabular ${isDayOff(d) ? 'text-rose-600' : 'text-slate-500'}`}
                  >
                    <div className="h-3.5 text-[10px] font-semibold text-slate-700">{showMonth ? `${d.getMonth() + 1}월` : ''}</div>
                    <div className={isSameDay(d, today) ? 'rounded-full bg-brand-600 text-white' : ''}>{d.getDate()}</div>
                    <div className="text-[10px] font-normal">{format(d, 'EEEEE', { locale: ko })}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {workers.map(([employeeNo, workerName]) => (
              <tr key={employeeNo}>
                <th className="sticky left-0 z-10 bg-white px-2 py-0.5 text-left font-normal">
                  <div className="truncate text-[12.5px] font-medium text-slate-800">{workerName}</div>
                  <div className="font-mono text-[10.5px] text-slate-400">{employeeNo}</div>
                </th>
                {days.map(d => {
                  const date = format(d, 'yyyy-MM-dd');
                  const row = byKey.get(`${employeeNo}|${date}`);
                  const holidayName = holidays.get(date);
                  const { kind, label } = row
                    ? classify(row)
                    : { kind: (isDayOff(d) ? 'dayOff' : 'none') as CellKind, label: '' };
                  const st = KIND_STYLE[kind];
                  const title = `${workerName} · ${format(d, 'M/d (EEE)', { locale: ko })}${holidayName ? ` · ${holidayName}` : ''}`;
                  const lines = row
                    ? [
                        { label: '상태', value: row.statuses.map(s => STATUS_TEXT[s]).join(', ') },
                        { label: '출근', value: hhmm(row.checkInAt) },
                        { label: '퇴근', value: hhmm(row.checkOutAt) },
                        { label: '근무시간', value: `${duration(row.workMinutes)}${row.breakMinutes ? ` (휴게 ${duration(row.breakMinutes)} 차감)` : ''}` },
                      ]
                    : [{ label: '상태', value: kind === 'dayOff' ? '휴무일' : '판정 대상 아님 (기기 승인 전 등)' }];
                  return (
                    <td
                      key={date}
                      onPointerMove={e => setTip({ x: e.clientX, y: e.clientY, title, lines })}
                      onPointerLeave={() => setTip(null)}
                      className="h-7 w-7 min-w-7 rounded-[4px] text-center align-middle text-[10.5px] font-bold leading-none transition-[filter] hover:brightness-110 hover:ring-2 hover:ring-slate-700/40"
                      style={{
                        backgroundColor: st.fill,
                        color: st.ink,
                        boxShadow: st.outline ? `inset 0 0 0 1px ${st.outline}` : undefined,
                      }}
                    >
                      {label}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 min-w-48 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-lg shadow-slate-900/10"
          style={{ left: tip.x + 14, top: tip.y + 14 }}
        >
          <div className="mb-1.5 font-semibold text-slate-500">{tip.title}</div>
          {tip.lines.map(l => (
            <div key={l.label} className="flex justify-between gap-4 py-0.5">
              <span className="text-slate-500">{l.label}</span>
              <span className="text-right font-bold tabular text-slate-900">{l.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
