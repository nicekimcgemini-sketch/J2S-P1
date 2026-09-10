import type { ReactNode } from 'react';

export type Tone = 'default' | 'ok' | 'warn' | 'crit';

const TONE_VALUE: Record<Tone, string> = {
  default: 'text-white',
  ok: 'text-emerald-400',
  warn: 'text-amber-400',
  crit: 'text-rose-400',
};

const TONE_PILL: Record<Exclude<Tone, 'default'>, string> = {
  ok: 'bg-emerald-400/10 text-emerald-400',
  warn: 'bg-amber-400/10 text-amber-400',
  crit: 'bg-rose-400/10 text-rose-400',
};

/** 페이지 상단 요약 수치 카드 */
export function StatTile({ label, value, tone = 'default' }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-white/5 bg-slate-900/60 px-4 py-3.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`font-mono text-2xl font-semibold leading-none tabular ${TONE_VALUE[tone]}`}>{value}</span>
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{children}</div>;
}

/** 상태 배지 (승인 대기 / 승인됨 / 권한 회수 등) */
export function StatusPill({ tone, children }: { tone: Exclude<Tone, 'default'>; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${TONE_PILL[tone]}`}>
      <span className="h-1.5 w-1.5 flex-none rounded-full bg-current" />
      {children}
    </span>
  );
}

/** 카드형 패널 (헤더 + 본문) */
export function Panel({ title, actions, children, padded = false }: {
  title?: ReactNode; actions?: ReactNode; children: ReactNode; padded?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-900/60">
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
          {title && <span className="text-[12.5px] font-bold uppercase tracking-wide text-slate-300">{title}</span>}
          {actions}
        </div>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h1 className="text-lg font-bold text-white">{title}</h1>
      {sub && <p className="text-[13px] text-slate-500">{sub}</p>}
    </div>
  );
}

export function AlertBanner({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3.5 py-2.5 text-[13px] text-rose-300">
      {children}
    </p>
  );
}

export function LoadingRow() {
  return <p className="px-6 py-10 text-center text-sm text-slate-500">로딩 중...</p>;
}

const INPUT_BASE =
  'rounded-lg border border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30';

/** 기본 크기 입력 필드 (관리자 콘솔 폼) */
export const inputClass = `${INPUT_BASE} px-3 py-2 text-[13px]`;

/** 터치 타겟이 큰 입력 필드 (모바일 체크인 화면) */
export const inputClassLg = `${INPUT_BASE} px-3.5 py-3.5 text-base`;

const BTN_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40';
const BTN_SIZE = { md: 'px-3.5 py-2', sm: 'px-2.5 py-1.5 text-xs', lg: 'px-4 py-3.5 text-[15px]' };
const BTN_VARIANT: Record<string, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-500',
  ok: 'bg-emerald-600 text-white hover:bg-emerald-500',
  crit: 'bg-rose-600 text-white hover:bg-rose-500',
  ghost: 'border border-white/10 text-slate-400 hover:border-white/20 hover:text-white',
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
