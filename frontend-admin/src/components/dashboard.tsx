import type { ReactNode } from 'react';

export type Tone = 'default' | 'ok' | 'warn' | 'crit';

const TONE_VALUE: Record<Tone, string> = {
  default: 'text-white',
  ok: 'text-emerald-400',
  warn: 'text-amber-400',
  crit: 'text-rose-400',
};

const TONE_DOT: Record<Exclude<Tone, 'default'>, string> = {
  ok: 'bg-emerald-400',
  warn: 'bg-amber-400',
  crit: 'bg-rose-400',
};

/** 페이지 상단 요약 수치 카드 — StatRow 안에서 gap-px 로 서로 구분되는 한 묶음의 띠로 쓰인다 */
export function StatTile({ label, value, tone = 'default' }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="flex flex-col gap-1 bg-slate-900 px-4 py-3.5">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={`font-display text-[26px] font-semibold leading-none tabular ${TONE_VALUE[tone]}`}>{value}</span>
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-px border border-slate-800 bg-slate-800 sm:grid-cols-3 md:grid-cols-4">{children}</div>;
}

/** 상태 표시 (승인 대기 / 승인됨 / 권한 회수 등) — 배지가 아니라 절제된 인라인 라벨 */
export function StatusPill({ tone, children }: { tone: Exclude<Tone, 'default'>; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium ${TONE_VALUE[tone]}`}>
      <span className={`h-[7px] w-[7px] flex-none ${TONE_DOT[tone]}`} />
      {children}
    </span>
  );
}

/** 카드형 패널 (헤더 + 본문) */
export function Panel({ title, actions, children, padded = false }: {
  title?: ReactNode; actions?: ReactNode; children: ReactNode; padded?: boolean;
}) {
  return (
    <div className="border border-slate-800 bg-slate-900">
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          {title && <span className="text-[13px] font-semibold text-slate-300">{title}</span>}
          {actions}
        </div>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-800 pb-4">
      <h1 className="font-display text-[22px] font-semibold text-white">{title}</h1>
      {sub && <p className="text-[13px] text-slate-500">{sub}</p>}
    </div>
  );
}

export function AlertBanner({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-2 border-rose-500 bg-rose-500/5 px-3.5 py-2.5 text-[13px] text-rose-300">
      {children}
    </p>
  );
}

export function LoadingRow() {
  return <p className="px-6 py-10 text-center text-sm text-slate-500">로딩 중...</p>;
}

const INPUT_BASE =
  'border border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-600 outline-none transition-colors focus:border-brand-500';

/** 기본 크기 입력 필드 (관리자 콘솔 폼) */
export const inputClass = `${INPUT_BASE} px-3 py-2 text-[13px]`;

/** 터치 타겟이 큰 입력 필드 (모바일 체크인 화면) */
export const inputClassLg = `${INPUT_BASE} px-3.5 py-3.5 text-base`;

const BTN_BASE =
  'inline-flex items-center justify-center gap-1.5 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40';
const BTN_SIZE = { md: 'px-3.5 py-2', sm: 'px-2.5 py-1.5 text-xs', lg: 'px-4 py-3.5 text-[15px] font-semibold' };
const BTN_VARIANT: Record<string, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-500',
  ok: 'bg-emerald-600 text-white hover:bg-emerald-500',
  crit: 'bg-rose-600 text-white hover:bg-rose-500',
  ghost: 'border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white',
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
