import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Activity, RefreshCw, Smartphone } from 'lucide-react';
import { qrApi } from '../services/api';

const QR_REFRESH_INTERVAL = 55_000; // 55초마다 자동 갱신 (만료 5초 전)

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

  // 최초 로드 및 자동 갱신
  useEffect(() => {
    fetchQr();
    const interval = setInterval(fetchQr, QR_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchQr]);

  // 남은 시간 카운트다운
  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => setRemaining(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [token]);

  const low = remaining < 15;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 bg-[radial-gradient(circle_at_50%_15%,#1e1b4b,#020617_55%)] px-4 py-10">
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

      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Smartphone className="h-3.5 w-3.5" />
        스마트폰 카메라로 QR을 찍으면 접속됩니다. (최초 이용 시 자동으로 등록 화면으로 연결)
      </p>
    </div>
  );
}
