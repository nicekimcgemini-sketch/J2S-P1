import { useState, type ReactNode } from 'react';
import type { DailyAttendance } from '../services/api';

/** 직원 1명의 기간 합계 (일별 근태 요약 행을 집계) */
export interface WorkerStats {
  employeeNo: string;
  workerName: string;
  workDays: number;
  /** 출퇴근이 모두 있어 근무시간을 잴 수 있는 날 수 */
  measuredDays: number;
  totalMinutes: number;
  normal: number;
  late: number;
  earlyLeave: number;
  overtime: number;
  absent: number;
  missing: number;
  weekendWork: number;
}

export function aggregateWorkerStats(rows: DailyAttendance[]): WorkerStats[] {
  const map = new Map<string, WorkerStats>();
  for (const r of rows) {
    let s = map.get(r.employeeNo);
    if (!s) {
      s = {
        employeeNo: r.employeeNo, workerName: r.workerName, workDays: 0, measuredDays: 0, totalMinutes: 0,
        normal: 0, late: 0, earlyLeave: 0, overtime: 0, absent: 0, missing: 0, weekendWork: 0,
      };
      map.set(r.employeeNo, s);
    }
    if (r.checkInAt || r.checkOutAt) s.workDays++;
    if (r.workMinutes != null) {
      s.measuredDays++;
      s.totalMinutes += r.workMinutes;
    }
    for (const st of r.statuses) {
      if (st === 'NORMAL') s.normal++;
      if (st === 'LATE') s.late++;
      if (st === 'EARLY_LEAVE') s.earlyLeave++;
      if (st === 'OVERTIME') s.overtime++;
      if (st === 'ABSENT') s.absent++;
      if (st === 'MISSING_CHECK_IN' || st === 'MISSING_CHECK_OUT') s.missing++;
      if (st === 'WEEKEND_WORK') s.weekendWork++;
    }
  }
  return [...map.values()].sort((a, b) => a.workerName.localeCompare(b.workerName, 'ko'));
}

export const formatHours = (minutes: number) => `${(minutes / 60).toFixed(1)}시간`;

// 근태 이상 누적 막대의 계열. 색은 dataviz 기본 범주형 팔레트 1~4번 슬롯을 고정 순서로 사용
// (validate_palette.js light/#ffffff 통과, 3·4번은 3:1 미만 대비라 합계 라벨·범례·통계표로 보완)
const ISSUE_SERIES = [
  { key: 'late', label: '지각', color: '#2a78d6' },
  { key: 'earlyLeave', label: '조퇴', color: '#eb6834' },
  { key: 'absent', label: '결근', color: '#1baf7a' },
  { key: 'missing', label: '기록 누락', color: '#eda100' },
] as const satisfies readonly { key: keyof WorkerStats; label: string; color: string }[];

// 단일 계열(근무시간)은 범주형 색과 겹치지 않게 테마의 중립 갈색(slate-600) 사용
const HOURS_COLOR = '#86673f';

interface Tip {
  x: number;
  y: number;
  title: string;
  rows: { label: string; value: string; color?: string }[];
}

function ChartCard({ title, sub, legend, children }: { title: string; sub: string; legend?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{sub}</p>
        </div>
        {legend}
      </div>
      {children}
    </div>
  );
}

function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 min-w-40 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-lg shadow-slate-900/10"
      style={{ left: tip.x + 14, top: tip.y + 14 }}
    >
      <div className="mb-1.5 font-semibold text-slate-500">{tip.title}</div>
      {tip.rows.map(r => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-slate-500">
            {r.color && <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: r.color }} />}
            {r.label}
          </span>
          <span className="font-bold tabular text-slate-900">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** 막대 한 줄: 이름 | 막대 | 값. 행 전체가 hover/focus 대상 */
function BarRow({ name, sub, value, onTip, children }: {
  name: string; sub: string; value: string;
  onTip: (e: { clientX: number; clientY: number } | null) => void;
  children: ReactNode;
}) {
  return (
    <div
      tabIndex={0}
      onPointerMove={e => onTip(e)}
      onPointerLeave={() => onTip(null)}
      onFocus={e => {
        const r = e.currentTarget.getBoundingClientRect();
        onTip({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
      }}
      onBlur={() => onTip(null)}
      className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-3 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-200"
    >
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-slate-800">{name}</div>
        <div className="font-mono text-[11px] text-slate-400">{sub}</div>
      </div>
      <div className="h-4">{children}</div>
      <div className="text-right text-[12.5px] font-semibold tabular text-slate-700">{value}</div>
    </div>
  );
}

export function WorkerStatsCharts({ stats }: { stats: WorkerStats[] }) {
  const [tip, setTip] = useState<Tip | null>(null);

  if (stats.length === 0) {
    return <p className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">표시할 직원 통계가 없습니다.</p>;
  }

  const issueTotal = (s: WorkerStats) => ISSUE_SERIES.reduce((sum, k) => sum + s[k.key], 0);
  const byIssues = [...stats].sort((a, b) => issueTotal(b) - issueTotal(a));
  const maxIssues = Math.max(1, ...stats.map(issueTotal));

  const byHours = [...stats].sort((a, b) => b.totalMinutes - a.totalMinutes);
  const maxMinutes = Math.max(1, ...stats.map(s => s.totalMinutes));

  const showTip = (title: string, rows: Tip['rows']) =>
    (e: { clientX: number; clientY: number } | null) =>
      setTip(e ? { x: e.clientX, y: e.clientY, title, rows } : null);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="직원별 근태 이상"
        sub="기간 내 지각·조퇴·결근·기록 누락 횟수 (많은 순)"
        legend={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {ISSUE_SERIES.map(s => (
              <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        }
      >
        <div className="flex flex-col">
          {byIssues.map(s => {
            const total = issueTotal(s);
            return (
              <BarRow
                key={s.employeeNo}
                name={s.workerName}
                sub={s.employeeNo}
                value={`${total}회`}
                onTip={showTip(`${s.workerName} · ${s.employeeNo}`, [
                  ...ISSUE_SERIES.map(k => ({ label: k.label, value: `${s[k.key]}회`, color: k.color })),
                  { label: '합계', value: `${total}회` },
                ])}
              >
                {total > 0 && (
                  <div className="flex h-full gap-[2px]" style={{ width: `${(total / maxIssues) * 100}%` }}>
                    {ISSUE_SERIES.filter(k => s[k.key] > 0).map((k, i, arr) => (
                      <div
                        key={k.key}
                        className={i === arr.length - 1 ? 'rounded-r-[4px]' : ''}
                        style={{ flex: `${s[k.key]} 1 0`, backgroundColor: k.color }}
                      />
                    ))}
                  </div>
                )}
              </BarRow>
            );
          })}
        </div>
      </ChartCard>

      <ChartCard title="직원별 총 근무시간" sub="출근~퇴근 시간 합계, 휴게시간 미차감 (많은 순)">
        <div className="flex flex-col">
          {byHours.map(s => (
            <BarRow
              key={s.employeeNo}
              name={s.workerName}
              sub={s.employeeNo}
              value={formatHours(s.totalMinutes)}
              onTip={showTip(`${s.workerName} · ${s.employeeNo}`, [
                { label: '총 근무시간', value: formatHours(s.totalMinutes) },
                { label: '근무일', value: `${s.workDays}일` },
                { label: '하루 평균', value: s.measuredDays ? formatHours(s.totalMinutes / s.measuredDays) : '-' },
                { label: '야근', value: `${s.overtime}회` },
              ])}
            >
              {s.totalMinutes > 0 && (
                <div
                  className="h-full rounded-r-[4px]"
                  style={{ width: `${(s.totalMinutes / maxMinutes) * 100}%`, backgroundColor: HOURS_COLOR }}
                />
              )}
            </BarRow>
          ))}
        </div>
      </ChartCard>

      <Tooltip tip={tip} />
    </div>
  );
}
