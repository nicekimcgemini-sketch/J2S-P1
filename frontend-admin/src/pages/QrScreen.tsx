import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Activity, QrCode, RefreshCw, Smartphone } from 'lucide-react';
import { qrApi } from '../services/api';

const QR_REFRESH_INTERVAL = 55_000; // 55초마다 자동 갱신 (만료 5초 전)
const CHECKIN_URL = `${window.location.origin}/checkin`;

export default function QrScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(60);
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

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
              <QRCodeSVG value={token} size={280} level="H" />
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

      {showSetup ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Smartphone className="h-3.5 w-3.5" />
            최초 1회, 본인 휴대폰 카메라로 스캔하세요
          </p>
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={CHECKIN_URL} size={110} level="M" />
          </div>
          <p className="text-[13px] font-semibold text-slate-300">모바일 체크인 페이지 열기</p>
          <button
            onClick={() => setShowSetup(false)}
            className="mt-1 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-300"
          >
            닫기
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSetup(true)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-300"
        >
          <QrCode className="h-3.5 w-3.5" />
          최초 이용자이신가요? 등록 QR 보기
        </button>
      )}
    </div>
  );
}
