import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { deviceApi, attendanceApi } from '../services/api';
import { getOrCreateDeviceId } from '../services/deviceId';

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

const deviceId = getOrCreateDeviceId();

export default function CheckIn() {
  const [isMobile] = useState(isLikelyMobile);
  const [stage, setStage] = useState<Stage>('loading');
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [employeeNo, setEmployeeNo] = useState('');
  const [name, setName] = useState('');
  const [mode, setModeState] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const setMode = (m: 'CHECK_IN' | 'CHECK_OUT') => {
    modeRef.current = m;
    setModeState(m);
  };
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>();
  // startScan()의 tick 루프는 카메라를 열 때의 클로저에 고정되므로,
  // mode를 직접 참조하면 이후 출근/퇴근 버튼을 바꿔도 처음 값으로 굳어버림 -> ref로 항상 최신값을 읽음
  const modeRef = useRef<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');

  const refreshStatus = useCallback(async () => {
    const res = await deviceApi.getStatus(deviceId);
    setWorkerName(res.workerName);
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

  const startScan = useCallback(async () => {
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

  const handleScanned = async (token: string) => {
    const activeMode = modeRef.current;
    try {
      if (activeMode === 'CHECK_IN') await attendanceApi.checkIn(deviceId, token);
      else await attendanceApi.checkOut(deviceId, token);
      setMessage(activeMode === 'CHECK_IN' ? '출근 처리되었습니다.' : '퇴근 처리되었습니다.');
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'QR 처리에 실패했습니다. 다시 시도해주세요.');
      setMessage('');
    } finally {
      setStage('ready');
    }
  };

  useEffect(() => () => stopScan(), [stopScan]);

  const Brand = () => <div className="brand"><span className="dot" /> 출퇴근 체크인</div>;

  if (!isMobile) {
    return (
      <Shell>
        <Brand />
        <h2>모바일 기기에서만 접속할 수 있습니다</h2>
        <p className="sub">본인 휴대폰으로 QR을 스캔해 접속해주세요.</p>
      </Shell>
    );
  }

  if (stage === 'loading') {
    return (
      <Shell>
        <Brand />
        <p className="sub">확인 중...</p>
      </Shell>
    );
  }

  if (stage === 'not_registered' || stage === 'registering') {
    return (
      <Shell>
        <Brand />
        <h2>기기 등록</h2>
        <p className="sub">최초 1회 이름과 사번을 입력하면 관리자 승인 후 사용할 수 있습니다.</p>
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          <input
            className="field"
            placeholder="이름"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <input
            className="field"
            placeholder="사번 (예: S06098)"
            value={employeeNo}
            onChange={e => setEmployeeNo(e.target.value.toUpperCase())}
            maxLength={6}
          />
          {error && <p className="alert-banner">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={stage === 'registering'}>
            {stage === 'registering' ? '등록 중...' : '등록 요청'}
          </button>
        </form>
      </Shell>
    );
  }

  if (stage === 'pending') {
    return (
      <Shell>
        <Brand />
        <span className="status-pill warn" style={{ fontSize: 13, padding: '5px 14px' }}>승인 대기 중</span>
        <p className="sub">관리자 승인 후 자동으로 사용할 수 있습니다.</p>
      </Shell>
    );
  }

  if (stage === 'revoked') {
    return (
      <Shell>
        <Brand />
        <span className="status-pill crit" style={{ fontSize: 13, padding: '5px 14px' }}>사용 권한 회수됨</span>
        <p className="sub">관리자에게 문의해주세요.</p>
      </Shell>
    );
  }

  // ready or scanning
  return (
    <Shell>
      <Brand />
      {workerName && <h2>{workerName}님</h2>}

      {stage === 'ready' && (
        <>
          <div className="mode-toggle">
            {(['CHECK_IN', 'CHECK_OUT'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={mode === m ? 'active' : ''}
              >
                {m === 'CHECK_IN' ? '출근' : '퇴근'}
              </button>
            ))}
          </div>

          {message && <span className="status-pill ok" style={{ fontSize: 13, padding: '5px 14px' }}>{message}</span>}
          {error && <p className="alert-banner">{error}</p>}

          <button onClick={startScan} className="btn btn-primary">
            {mode === 'CHECK_IN' ? '출근 QR 스캔' : '퇴근 QR 스캔'}
          </button>
        </>
      )}

      <video ref={videoRef} playsInline muted className="scan-video" style={{ display: stage === 'scanning' ? 'block' : 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {stage === 'scanning' && (
        <button onClick={() => { stopScan(); setStage('ready'); }} className="btn btn-ghost" style={{ width: '100%' }}>
          취소
        </button>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root mobile-shell">
      <div className="mobile-card">{children}</div>
    </div>
  );
}
