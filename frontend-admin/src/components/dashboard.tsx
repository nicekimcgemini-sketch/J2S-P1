import type { ReactNode } from 'react';

export type Tone = 'default' | 'ok' | 'warn' | 'crit';

const TONE_VALUE: Record<Tone, string> = {
  default: 'text-slate-900',
  ok: 'text-emerald-600',
  warn: 'text-amber-600',
  crit: 'text-rose-600',
};

const TONE_PILL: Record<Exclude<Tone, 'default'>, string> = {
  ok: 'bg-emerald-100 text-emerald-700',
  warn: 'bg-amber-100 text-amber-700',
  crit: 'bg-rose-100 text-rose-700',
};

/** 페이지 상단 요약 수치 카드 */
export function StatTile({ label, value, tone = 'default' }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm shadow-slate-900/5">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <span className={`text-2xl font-bold leading-none tabular ${TONE_VALUE[tone]}`}>{value}</span>
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{children}</div>;
}

/** 상태 배지 (승인 대기 / 승인됨 / 권한 회수 등) */
export function StatusPill({ tone, children }: { tone: Exclude<Tone, 'default'>; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-semibold ${TONE_PILL[tone]}`}>
      {children}
    </span>
  );
}

/** 카드형 패널 (헤더 + 본문) */
export function Panel({ title, actions, children, padded = false }: {
  title?: ReactNode; actions?: ReactNode; children: ReactNode; padded?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          {title && <span className="text-[13px] font-bold text-slate-700">{title}</span>}
          {actions}
        </div>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-[22px] font-bold text-slate-900">{title}</h1>
      {sub && <p className="text-[13px] text-slate-500">{sub}</p>}
    </div>
  );
}

export function AlertBanner({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">
      {children}
    </p>
  );
}

export function LoadingRow() {
  return <p className="px-6 py-10 text-center text-sm text-slate-500">로딩 중...</p>;
}

const INPUT_BASE =
  'rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-brand-400 focus:ring-4 focus:ring-brand-100';

/** 기본 크기 입력 필드 (관리자 콘솔 폼) */
export const inputClass = `${INPUT_BASE} px-3 py-2 text-[13px]`;

/** 터치 타겟이 큰 입력 필드 (모바일 체크인 화면) */
export const inputClassLg = `${INPUT_BASE} px-3.5 py-3.5 text-base`;

const BTN_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-xl text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40';
const BTN_SIZE = { md: 'px-3.5 py-2', sm: 'px-2.5 py-1.5 text-xs', lg: 'px-4 py-3.5 text-[15px] font-bold' };
const BTN_VARIANT: Record<string, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  ok: 'bg-emerald-600 text-white hover:bg-emerald-700',
  crit: 'bg-rose-600 text-white hover:bg-rose-700',
  ghost: 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
};

export function Button({
  variant = 'primary', size = 'md', className = '', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN_VARIANT; size?: keyof typeof BTN_SIZE }) {
  return (
    <button
      className={`${BTN_BASE} ${BTN_SIZE[size]} ${BTN_VARIANT[variant]} ${className}`}
      {...props}
    />
  );
}
