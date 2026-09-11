import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { LogIn, LogOut, X } from 'lucide-react';
import { deviceApi, attendanceApi } from '../services/api';
import { getOrCreateDeviceId } from '../services/deviceId';
import { AlertBanner, Button, StatusPill, inputClassLg } from '../components/dashboard';

type Stage = 'loading' | 'not_registered' | 'registering' | 'pending' | 'revoked' | 'ready' | 'scanning';

const EMPLOYEE_NO_PATTERN = /^S\d{5}$/;
const EMPLOYEE_NO_HINT = '사번 형식이 올바르지 않습니다. 대문자 S와 숫자 5자리, 총 6자리로 입력해주세요. (예: S06098)';

// 완벽한 차단은 불가능(개발자도구 모바일 모드는 UA/터치/포인터를 전부 그대로 흉내 냄).
// 여러 신호를 같이 요구해서 일반 PC 브라우저 접속만 걸러내는 수준의 문턱.
function isLikelyMobile(): boolean {
  const uaMatch = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const hasTouch = navigator.maxTouchPoints > 0;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return uaMatch && hasTouch && coarsePointer;
}

// 페이지 내 카메라로 QR을 재스캔하면 jsQR이 QR에 인코딩된 전체 URL(.../checkin?t=<토큰>)을
// 그대로 돌려준다. URL이면 t 파라미터만 뽑아 쓰고, 아니면(과거 QR 등) 원문을 토큰으로 그대로 쓴다.
function extractQrToken(raw: string): string {
  try {
    const url = new URL(raw);
    const t = url.searchParams.get('t');
    if (t) return t;
  } catch {
    // 절대 URL이 아니면(예: URL 파라미터에서 이미 추출된 순수 토큰) 그대로 사용
  }
  return raw;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

const deviceId = getOrCreateDeviceId();

export default function CheckIn() {
  const [isMobile] = useState(isLikelyMobile);
  const [stage, setStage] = useState<Stage>('loading');
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkInAt, setCheckInAt] = useState<string | null>(null);
  const [checkOutAt, setCheckOutAt] = useState<string | null>(null);
  const [employeeNo, setEmployeeNo] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // 현장 QR을 스마트폰 카메라로 찍어 들어온 경우 ?t= 로 토큰이 딸려온다.
  // 이 토큰이 있으면 페이지 안에서 다시 카메라를 열 필요 없이 버튼만 누르면 바로 처리된다.
  const [urlToken, setUrlToken] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('t'),
  );
  // 최초 마운트 시 1회만 실행 — 새로고침해도 토큰이 주소창에 남아 재사용/노출되지 않도록 정리 (메모리에는 유지)
  useEffect(() => {
    if (urlToken) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>();
  // startScan()의 tick 루프는 카메라를 열 때의 클로저에 고정되므로,
  // 어떤 버튼으로 스캔을 시작했는지 ref로 따로 들고 있어야 나중에 값이 안 굳는다
  const modeRef = useRef<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');

  const refreshStatus = useCallback(async () => {
    const res = await deviceApi.getStatus(deviceId);
    setWorkerName(res.workerName);
    setCheckedInToday(res.checkedInToday);
    setCheckInAt(res.checkInAt);
    setCheckOutAt(res.checkOutAt);
    if (res.status === 'NOT_REGISTERED') setStage('not_registered');
    else if (res.status === 'PENDING') setStage('pending');
    else if (res.status === 'REVOKED') setStage('revoked');
    else if (res.status === 'APPROVED') setStage('ready');
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    refreshStatus();
  }, [isMobile, refreshStatus]);

  // 승인 대기 중이면 5초마다 자동 재확인
  useEffect(() => {
    if (stage !== 'pending') return;
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [stage, refreshStatus]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = employeeNo.trim().toUpperCase();
    const trimmedName = name.trim();
    if (!trimmed || !trimmedName) return;
    if (!EMPLOYEE_NO_PATTERN.test(trimmed)) {
      setError(EMPLOYEE_NO_HINT);
      return;
    }
    setStage('registering');
    setError('');
    try {
      await deviceApi.register(deviceId, trimmed, trimmedName, navigator.userAgent, /iphone|ipad/i.test(navigator.userAgent) ? 'IOS' : 'ANDROID');
      await refreshStatus();
    } catch (err: any) {
      setError(err?.response?.data?.message || '등록 실패. 입력값을 확인해주세요.');
      setStage('not_registered');
    }
  };

  const stopScan = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startScan = useCallback(async (mode: 'CHECK_IN' | 'CHECK_OUT') => {
    modeRef.current = mode;
    setError('');
    setMessage('');
    setStage('scanning');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;

      const tick = () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            stopScan();
            handleScanned(code.data);
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError('카메라를 사용할 수 없습니다. 카메라 권한을 확인해주세요.');
      setStage('ready');
    }
  }, [stopScan]);

  const handleScanned = async (raw: string) => {
    const activeMode = modeRef.current;
    const token = extractQrToken(raw);
    try {
      if (activeMode === 'CHECK_IN') {
        await attendanceApi.checkIn(deviceId, token);
      } else {
        await attendanceApi.checkOut(deviceId, token);
      }
      await refreshStatus(); // 당일 출퇴근 시각을 최신 상태로 반영
      setMessage(activeMode === 'CHECK_IN' ? '출근 처리되었습니다.' : '퇴근 처리되었습니다.');
      setError('');
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message;
      // QR은 한 번 쓰면 즉시 폐기된다 — 방금 다른 동작(출근 등)에 쓴 QR을 화면이 안 바뀐 채로
      // 다시 스캔하면 이 메시지가 뜬다. 원인을 바로 알 수 있게 안내를 덧붙인다.
      const hint = serverMessage === '유효하지 않은 QR 코드입니다.'
        ? ' 방금 사용한 QR은 다시 쓸 수 없어요. 화면의 QR이 새로 바뀔 때까지(최대 1분) 기다렸다가 다시 스캔해주세요.'
        : '';
      setError((serverMessage || 'QR 처리에 실패했습니다. 다시 시도해주세요.') + hint);
      setMessage('');
    } finally {
      setStage('ready');
    }
  };

  useEffect(() => () => stopScan(), [stopScan]);

  // 출근/퇴근 버튼 클릭 시: URL로 넘어온 토큰이 있으면 바로 처리, 없으면(북마크 등으로
  // 토큰 없이 들어온 경우) 기존처럼 페이지 안 카메라로 QR을 다시 스캔한다.
  const runCheck = (mode: 'CHECK_IN' | 'CHECK_OUT') => {
    if (urlToken) {
      const token = urlToken;
      setUrlToken(null); // 1회성으로 소모 — 재시도는 항상 새 QR을 다시 찍게 한다
      modeRef.current = mode;
      setError('');
      setMessage('');
      handleScanned(token);
    } else {
      startScan(mode);
    }
  };

  const Brand = () => (
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      출퇴근 체크인
    </div>
  );

  if (!isMobile) {
    return (
      <Shell>
        <Brand />
        <h2 className="text-lg font-semibold text-white">모바일 기기에서만 접속할 수 있습니다</h2>
        <p className="text-[13px] leading-relaxed text-slate-400">본인 휴대폰으로 QR을 스캔해 접속해주세요.</p>
      </Shell>
    );
  }

  if (stage === 'loading') {
    return (
      <Shell>
        <Brand />
        <p className="text-[13px] text-slate-400">확인 중...</p>
      </Shell>
    );
  }

  if (stage === 'not_registered' || stage === 'registering') {
    return (
      <Shell>
        <Brand />
        <h2 className="text-lg font-semibold text-white">기기 등록</h2>
        <p className="text-[13px] leading-relaxed text-slate-400">최초 1회 이름과 사번을 입력하면 관리자 승인 후 사용할 수 있습니다.</p>
        <form onSubmit={handleRegister} className="flex w-full flex-col gap-3">
          <input
            className={`${inputClassLg} w-full`}
            placeholder="이름"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <input
            className={`${inputClassLg} w-full`}
            placeholder="사번 (예: S06098)"
            value={employeeNo}
            onChange={e => setEmployeeNo(e.target.value.toUpperCase())}
            maxLength={6}
          />
          {error && <AlertBanner>{error}</AlertBanner>}
          <Button type="submit" size="lg" disabled={stage === 'registering'} className="w-full">
            {stage === 'registering' ? '등록 중...' : '등록 요청'}
          </Button>
        </form>
      </Shell>
    );
  }

  if (stage === 'pending') {
    return (
      <Shell>
        <Brand />
        <StatusPill tone="warn">승인 대기 중</StatusPill>
        <p className="text-[13px] leading-relaxed text-slate-400">관리자 승인 후 자동으로 사용할 수 있습니다.</p>
      </Shell>
    );
  }

  if (stage === 'revoked') {
    return (
      <Shell>
        <Brand />
        <StatusPill tone="crit">사용 권한 회수됨</StatusPill>
        <p className="text-[13px] leading-relaxed text-slate-400">관리자에게 문의해주세요.</p>
      </Shell>
    );
  }

  // ready or scanning
  return (
    <Shell>
      <Brand />
      {workerName && <h2 className="text-lg font-semibold text-white">{workerName}님</h2>}

      {stage === 'ready' && (
        <>
          {message && <StatusPill tone="ok">{message}</StatusPill>}
          {error && <AlertBanner>{error}</AlertBanner>}
          {urlToken && !message && !error && (
            <p className="text-[13px] leading-relaxed text-slate-400">QR 인식 완료. 아래에서 선택하세요.</p>
          )}

          {(checkInAt || checkOutAt) && (
            <div className="flex w-full flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              {checkInAt && (
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500">출근</span>
                  <span className="font-mono tabular text-sm font-semibold text-emerald-400">{formatTime(checkInAt)}</span>
                </div>
              )}
              {checkOutAt && (
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500">퇴근</span>
                  <span className="font-mono tabular text-sm font-semibold text-rose-400">{formatTime(checkOutAt)}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex w-full flex-col gap-2.5">
            {!checkedInToday ? (
              <Button variant="ok" size="lg" onClick={() => runCheck('CHECK_IN')} className="w-full">
                <LogIn className="h-4 w-4" /> {urlToken ? '출근 처리' : '출근 QR 스캔'}
              </Button>
            ) : !checkOutAt ? (
              <Button variant="crit" size="lg" onClick={() => runCheck('CHECK_OUT')} className="w-full">
                <LogOut className="h-4 w-4" /> {urlToken ? '퇴근 처리' : '퇴근 QR 스캔'}
              </Button>
            ) : (
              <StatusPill tone="ok">오늘 퇴근 처리가 완료됐어요</StatusPill>
            )}
          </div>
        </>
      )}

      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full max-w-[280px] rounded-xl ${stage === 'scanning' ? 'block' : 'hidden'}`}
      />
      <canvas ref={canvasRef} className="hidden" />
      {stage === 'scanning' && (
        <Button variant="ghost" size="lg" onClick={() => { stopScan(); setStage('ready'); }} className="w-full">
          <X className="h-4 w-4" /> 취소
        </Button>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 bg-[radial-gradient(circle_at_30%_20%,#1e1b4b,#020617_55%)] px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-3.5 rounded-2xl border border-white/10 bg-slate-900/80 p-7 text-center shadow-2xl shadow-black/50 backdrop-blur">
        {children}
      </div>
    </div>
  );
}
