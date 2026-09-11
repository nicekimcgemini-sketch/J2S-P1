import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Activity, RefreshCw } from 'lucide-react';
import { qrApi } from '../services/api';

const QR_STATUS_POLL_INTERVAL = 2_000; // 2초마다 현재 QR이 아직 살아있는지 확인

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-950 px-4 py-10">
      <div className="flex items-center gap-2 text-[13px] font-medium text-slate-400">
        <Activity className="h-4 w-4 text-brand-400" strokeWidth={2} />
        출퇴근 QR 코드
      </div>

      <div className="flex flex-col items-center gap-5 border border-slate-800 border-t-2 border-t-brand-500 bg-slate-900 p-8">
        {token ? (
          <>
            <div className="bg-white p-5">
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
          className="inline-flex items-center gap-2 bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '갱신 중...' : '새로고침'}
        </button>
      </div>

      <div className="flex w-full max-w-xl flex-col gap-5 border-t border-slate-800 pt-6">
        <span className="font-display text-base font-semibold text-slate-200">이용 방법</span>

        <ol className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="font-display w-6 flex-none text-lg font-semibold leading-tight text-brand-400">
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-[13.5px] font-semibold text-white">{step.title}</p>
                <p className="text-[13px] leading-relaxed text-slate-400">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="border-t border-slate-800 pt-3 text-[11.5px] text-slate-500">
          QR은 한 번 쓰이면 곧바로(최대 2초 내) 새로 바뀝니다. 항상 화면에 떠 있는 QR을 다시 찍어주세요.
        </p>
      </div>
    </div>
  );
}
