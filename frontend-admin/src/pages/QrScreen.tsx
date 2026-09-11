import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Activity, RefreshCw } from 'lucide-react';
import { qrApi } from '../services/api';

// 이용 방법 카드용 그림 아이콘. 텍스트보다 눈에 먼저 들어오도록 손으로 그린 일러스트.
function ScanIllustration() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="h-10 w-10">
      <rect x="18" y="6" width="28" height="46" rx="5" stroke="currentColor" strokeWidth="2.5" />
      <line x1="26" y1="46" x2="38" y2="46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="25" y="16" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="28" y="19" width="3" height="3" fill="currentColor" />
      <rect x="33" y="19" width="3" height="3" fill="currentColor" />
      <rect x="28" y="24" width="3" height="3" fill="currentColor" />
      <path d="M8 14V9a3 3 0 0 1 3-3h5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M56 14V9a3 3 0 0 0-3-3h-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8 44v5a3 3 0 0 0 3 3h5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M56 44v5a3 3 0 0 1-3 3h-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function OpenLinkIllustration() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="h-10 w-10">
      <rect x="8" y="14" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <line x1="8" y1="24" x2="56" y2="24" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="15" cy="19" r="1.6" fill="currentColor" />
      <circle cx="21" cy="19" r="1.6" fill="currentColor" />
      <circle cx="27" cy="19" r="1.6" fill="currentColor" />
      <path d="M24 38l7-7M31 31h-6v6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="46" cy="42" r="3" fill="currentColor" />
      <circle cx="46" cy="42" r="7" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <circle cx="46" cy="42" r="11" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
    </svg>
  );
}

function DoneIllustration() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="h-10 w-10">
      <rect x="18" y="6" width="28" height="46" rx="5" stroke="currentColor" strokeWidth="2.5" />
      <line x1="26" y1="46" x2="38" y2="46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="27" r="10" stroke="currentColor" strokeWidth="2.5" />
      <path d="M27 27l3.5 3.5L38 23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 16l1.5 3L15 20.5 11.5 22 10 25l-1.5-3L5 20.5 8.5 19z" fill="currentColor" opacity="0.85" />
      <circle cx="54" cy="40" r="2" fill="currentColor" opacity="0.8" />
      <circle cx="50" cy="14" r="1.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

const QR_STATUS_POLL_INTERVAL = 2_000; // 2초마다 현재 QR이 아직 살아있는지 확인

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

  const fetchQr = useCallback(async () => {
    setLoading(true);
    try {
      const data = await qrApi.generate();
      setToken(data.token);
      setExpiresAt(data.expiresAt);
      setRemaining(data.expiresInSeconds);
    } catch {
      alert('QR 생성 실패. 이 PC가 허용된 IP인지 확인하세요.');
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
      } catch {
        // 네트워크 오류는 다음 폴링에서 다시 시도
      }
    }, QR_STATUS_POLL_INTERVAL);
    return () => clearInterval(poll);
  }, [token, fetchQr]);

  // 남은 시간 카운트다운
  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => setRemaining(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [token]);

  const low = remaining < 15;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 bg-[radial-gradient(circle_at_50%_15%,#3c1408,#0c0a09_55%)] px-4 py-10">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-slate-400">
        <Activity className="h-4 w-4 text-brand-400" strokeWidth={2.25} />
        출퇴근 QR 코드
      </div>

      <div className="flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/50 backdrop-blur">
        {token ? (
          <>
            <div className="rounded-2xl bg-white p-5">
              <QRCodeSVG value={buildCheckinUrl(token)} size={280} level="H" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm text-slate-400">
                유효 시간{' '}
                <strong className={`font-mono text-base tabular ${low ? 'text-rose-400' : 'text-white'}`}>
                  {remaining}초
                </strong>
              </p>
              <p className="font-mono text-xs text-slate-500">
                만료: {expiresAt ? new Date(expiresAt).toLocaleTimeString('ko-KR', { hour12: false }) : '-'}
              </p>
            </div>
          </>
        ) : (
          <div className="flex h-[330px] w-[280px] items-center justify-center text-sm text-slate-500">
            QR 코드 로딩 중...
          </div>
        )}

        <button
          onClick={fetchQr}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '갱신 중...' : '새로고침'}
        </button>
      </div>

      <div className="flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <span className="text-center text-sm font-bold text-slate-200">📱 이렇게 사용하세요</span>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-800/50 p-5 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 text-brand-300">
              <ScanIllustration />
            </span>
            <p className="text-sm font-semibold text-white">① 카메라로 QR 비추기</p>
            <p className="text-[13px] leading-relaxed text-slate-400">
              스마트폰 <strong className="font-semibold text-slate-200">카메라 앱</strong>을 켜고 위 QR을 비추세요
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-800/50 p-5 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 text-brand-300">
              <OpenLinkIllustration />
            </span>
            <p className="text-sm font-semibold text-white">② 링크 누르기</p>
            <p className="text-[13px] leading-relaxed text-slate-400">
              화면에 뜨는 링크를 눌러 <strong className="font-semibold text-slate-200">인터넷 브라우저</strong>로 여세요
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-800/50 p-5 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
              <DoneIllustration />
            </span>
            <p className="text-sm font-semibold text-white">③ 버튼 누르고 완료</p>
            <p className="text-[13px] leading-relaxed text-slate-400">
              처음이면 이름·사번 입력 후 승인을 기다려주세요. 이미 승인됐다면{' '}
              <strong className="font-semibold text-slate-200">출근/퇴근 버튼</strong>만 누르면 바로 처리돼요
            </p>
          </div>
        </div>

        <p className="border-t border-white/5 pt-3 text-center text-[11.5px] text-slate-500">
          QR은 한 번 쓰이면 곧바로(최대 2초 내) 새로 바뀝니다. 항상 화면에 떠 있는 QR을 다시 찍어주세요.
        </p>
      </div>
    </div>
  );
}
