import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Activity, RefreshCw, ShieldAlert, WifiOff } from 'lucide-react';
import { qrApi } from '../services/api';
import { AutumnLeaves } from '../components/decor';

const QR_STATUS_POLL_INTERVAL = 2_000; // 2초마다 현재 QR이 아직 살아있는지 확인
const NETWORK_RETRY_INTERVAL = 10_000; // 서버에 연결되지 않으면 10초마다 자동 재시도

/** QR 을 띄울 수 없는 이유. forbidden = 허용 IP 가 아닌 PC(백엔드 IpWhitelistFilter 403) */
type QrError = { kind: 'forbidden'; ip: string | null } | { kind: 'network' };

function toQrError(err: any): QrError {
  if (err?.response?.status === 403) {
    return { kind: 'forbidden', ip: err.response.data?.ip ?? null };
  }
  return { kind: 'network' };
}

const STEPS = [
  { title: '카메라로 QR 비추기', body: '스마트폰 카메라 앱을 켜고 위 QR을 비추세요' },
  { title: '링크 누르기', body: '화면에 뜨는 링크를 눌러 인터넷 브라우저로 여세요' },
  { title: '버튼 누르고 완료', body: '처음이면 이름·사번 입력 후 승인을 기다려주세요. 이미 승인됐다면 출근/퇴근 버튼만 누르면 바로 처리돼요' },
];

// 체크인 페이지 주소에 토큰을 실어 보낸다 — 등록 여부와 상관없이
// 폰 기본 카메라로 이 QR 하나만 찍으면 된다 (별도의 "등록용 QR"이 없다).
// 등록 안 된 기기는 /checkin 쪽에서 토큰을 무시하고 등록 화면을 보여준다.
function buildCheckinUrl(token: string): string {
  return `${window.location.origin}/checkin?t=${encodeURIComponent(token)}`;
}

export default function QrScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<QrError | null>(null);

  const fetchQr = useCallback(async () => {
    setLoading(true);
    try {
      const data = await qrApi.generate();
      setToken(data.token);
      setExpiresAt(data.expiresAt);
      setRemaining(data.expiresInSeconds);
      setError(null);
    } catch (err) {
      setToken(null);   // 오류 중에는 이전 QR 을 계속 띄우지 않는다
      setError(toQrError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // 최초 1회 발급
  useEffect(() => { fetchQr(); }, [fetchQr]);

  // 누군가 방금 이 QR로 출퇴근을 처리했는지(또는 만료됐는지) 짧은 주기로 확인하고,
  // 더 이상 유효하지 않으면 다음 사람을 위해 곧바로 새 QR을 받아온다.
  useEffect(() => {
    if (!token) return;
    const currentToken = token;
    const poll = setInterval(async () => {
      try {
        const { active } = await qrApi.status(currentToken);
        if (!active) fetchQr();
      } catch (err) {
        // 사용 중에 허용 IP 에서 빠졌으면 곧바로 오류 화면으로, 일시적인 네트워크 오류는 다음 폴링에서 다시 시도
        const qrError = toQrError(err);
        if (qrError.kind === 'forbidden') {
          setToken(null);
          setError(qrError);
        }
      }
    }, QR_STATUS_POLL_INTERVAL);
    return () => clearInterval(poll);
  }, [token, fetchQr]);

  // 서버 연결 실패는 자동으로 다시 시도한다 (허용 IP 문제는 관리자 조치가 필요해 버튼으로만 재확인)
  useEffect(() => {
    if (error?.kind !== 'network') return;
    const retry = setInterval(fetchQr, NETWORK_RETRY_INTERVAL);
    return () => clearInterval(retry);
  }, [error, fetchQr]);

  // 남은 시간 카운트다운
  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => setRemaining(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [token]);

  const low = remaining < 15;

  if (error) {
    const forbidden = error.kind === 'forbidden';
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-slate-100 px-4 py-10">
        <AutumnLeaves />
        <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
          <Activity className="h-4 w-4 text-brand-600" strokeWidth={2} />
          출퇴근 QR 코드
        </div>

        <div className="flex w-full max-w-lg flex-col items-center gap-5 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm shadow-slate-900/5">
          <span className={`flex h-16 w-16 items-center justify-center rounded-full ${forbidden ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
            {forbidden ? <ShieldAlert className="h-8 w-8" /> : <WifiOff className="h-8 w-8" />}
          </span>

          <div className="flex flex-col gap-2">
            <h1 className="font-display text-2xl font-bold text-slate-900">
              {forbidden ? 'QR을 표시할 수 없는 PC입니다' : '서버에 연결할 수 없습니다'}
            </h1>
            <p className="text-[14px] leading-relaxed text-slate-500">
              {forbidden
                ? '출퇴근 QR은 관리자가 등록한 현장 PC(허용 IP)에서만 표시됩니다.'
                : '인터넷 연결을 확인해주세요. 10초마다 자동으로 다시 연결을 시도합니다.'}
            </p>
          </div>

          {forbidden && (
            <>
              <div className="flex w-full flex-col items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <span className="text-[12px] font-semibold text-slate-500">이 PC의 IP 주소</span>
                <span className="font-mono text-2xl font-bold tracking-wide text-slate-900 tabular">{error.ip ?? '확인 불가'}</span>
              </div>
              <ol className="flex w-full flex-col gap-2 text-left">
                {[
                  '현장 PC가 맞다면 관리자에게 위 IP 주소를 알려주세요',
                  '관리자는 관리자 화면 › 설정 › 허용 IP 관리에서 이 IP를 등록합니다',
                  '등록이 끝나면 아래 "다시 확인"을 누르세요',
                ].map((step, i) => (
                  <li key={step} className="flex gap-3 text-[13.5px] leading-snug text-slate-600">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-100 text-[12px] font-bold text-brand-700">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="text-[12px] text-slate-400">출퇴근 체크는 휴대폰으로 현장 PC 화면의 QR을 스캔해서 진행합니다.</p>
            </>
          )}

          <button
            onClick={fetchQr}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '확인 중...' : '다시 확인'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-slate-100 px-4 py-10">
      <AutumnLeaves
        leaves={[
          { top: '-4%', right: '-3%', size: 190, rotate: 14, color: 'text-brand-300', opacity: 0.5 },
          { top: '10%', left: '6%', size: 54, rotate: -20, color: 'text-amber-300', opacity: 0.55 },
          { bottom: '-5%', left: '-4%', size: 170, rotate: -12, color: 'text-brand-400', opacity: 0.45 },
          { bottom: '16%', right: '8%', size: 50, rotate: 28, color: 'text-rose-300', opacity: 0.5 },
        ]}
      />
      <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
        <Activity className="h-4 w-4 text-brand-600" strokeWidth={2} />
        출퇴근 QR 코드
      </div>

      <div className="flex flex-col items-center gap-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-900/5">
        {token ? (
          <>
            <div className="rounded-2xl border border-slate-100 bg-white p-5">
              <QRCodeSVG value={buildCheckinUrl(token)} size={280} level="H" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm text-slate-500">
                유효 시간{' '}
                <strong className={`font-mono text-base tabular ${low ? 'text-rose-600' : 'text-slate-900'}`}>
                  {remaining}초
                </strong>
              </p>
              <p className="font-mono text-xs text-slate-400">
                만료: {expiresAt ? new Date(expiresAt).toLocaleTimeString('ko-KR', { hour12: false }) : '-'}
              </p>
            </div>
          </>
        ) : (
          <div className="flex h-[330px] w-[280px] items-center justify-center text-sm text-slate-400">
            QR 코드 로딩 중...
          </div>
        )}

        <button
          onClick={fetchQr}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '갱신 중...' : '새로고침'}
        </button>
      </div>

      <div className="flex w-full max-w-xl flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <span className="font-display text-base font-bold text-slate-900">이용 방법</span>

        <ol className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-100 text-[13px] font-bold text-brand-700">
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-[13.5px] font-semibold text-slate-900">{step.title}</p>
                <p className="text-[13px] leading-relaxed text-slate-500">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="border-t border-slate-100 pt-3 text-[11.5px] text-slate-400">
          QR은 한 번 쓰이면 곧바로(최대 2초 내) 새로 바뀝니다. 항상 화면에 떠 있는 QR을 다시 찍어주세요.
        </p>
      </div>
    </div>
  );
}
