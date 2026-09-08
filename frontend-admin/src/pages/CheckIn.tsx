import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { deviceApi, attendanceApi } from '../services/api';
import { getOrCreateDeviceId } from '../services/deviceId';

type Stage = 'loading' | 'not_registered' | 'registering' | 'pending' | 'revoked' | 'ready' | 'scanning';

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
    if (!employeeNo.trim()) return;
    setStage('registering');
    setError('');
    try {
      await deviceApi.register(deviceId, employeeNo.trim(), navigator.userAgent, /iphone|ipad/i.test(navigator.userAgent) ? 'IOS' : 'ANDROID');
      await refreshStatus();
    } catch (err: any) {
      setError(err?.response?.data?.message || '등록 실패. 사번을 확인해주세요.');
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

  if (!isMobile) {
    return (
      <Centered>
        <h2>모바일 기기에서만 접속할 수 있습니다</h2>
        <p style={{ color: '#888' }}>본인 휴대폰으로 QR을 스캔해 접속해주세요.</p>
      </Centered>
    );
  }

  if (stage === 'loading') {
    return <Centered>확인 중...</Centered>;
  }

  if (stage === 'not_registered' || stage === 'registering') {
    return (
      <Centered>
        <h2 style={{ marginBottom: 16 }}>기기 등록</h2>
        <p style={{ color: '#888', marginBottom: 20, textAlign: 'center' }}>
          최초 1회 사번을 입력하면 관리자 승인 후 사용할 수 있습니다.
        </p>
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 260 }}>
          <input
            placeholder="사번"
            value={employeeNo}
            onChange={e => setEmployeeNo(e.target.value)}
            style={inputStyle}
            autoFocus
          />
          {error && <p style={{ color: '#ff4d4f', fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={stage === 'registering'} style={buttonStyle}>
            {stage === 'registering' ? '등록 중...' : '등록 요청'}
          </button>
        </form>
      </Centered>
    );
  }

  if (stage === 'pending') {
    return (
      <Centered>
        <h2>승인 대기 중</h2>
        <p style={{ color: '#888' }}>관리자 승인 후 자동으로 사용할 수 있습니다.</p>
      </Centered>
    );
  }

  if (stage === 'revoked') {
    return (
      <Centered>
        <h2 style={{ color: '#ff4d4f' }}>사용 권한이 회수되었습니다</h2>
        <p style={{ color: '#888' }}>관리자에게 문의해주세요.</p>
      </Centered>
    );
  }

  // ready or scanning
  return (
    <Centered>
      {workerName && <p style={{ color: '#888', marginBottom: 4 }}>{workerName}님</p>}

      {stage === 'ready' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['CHECK_IN', 'CHECK_OUT'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{ ...modeButtonStyle, background: mode === m ? '#1677ff' : '#fff', color: mode === m ? '#fff' : '#333' }}
              >
                {m === 'CHECK_IN' ? '출근' : '퇴근'}
              </button>
            ))}
          </div>

          {message && <p style={{ color: '#52c41a', fontWeight: 600 }}>{message}</p>}
          {error && <p style={{ color: '#ff4d4f' }}>{error}</p>}

          <button onClick={startScan} style={buttonStyle}>
            {mode === 'CHECK_IN' ? '출근 QR 스캔' : '퇴근 QR 스캔'}
          </button>
        </>
      )}

      <video ref={videoRef} playsInline muted style={{ display: stage === 'scanning' ? 'block' : 'none', width: 280, borderRadius: 12, marginTop: 16 }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {stage === 'scanning' && (
        <button onClick={() => { stopScan(); setStage('ready'); }} style={{ ...buttonStyle, marginTop: 12, background: '#888' }}>
          취소
        </button>
      )}
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#f0f2f5', padding: 24, textAlign: 'center',
    }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 16,
};
const buttonStyle: React.CSSProperties = {
  padding: '12px 32px', fontSize: 16, fontWeight: 600,
  background: '#1677ff', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
};
const modeButtonStyle: React.CSSProperties = {
  padding: '8px 24px', fontSize: 14, fontWeight: 600, border: '1px solid #d9d9d9', borderRadius: 8, cursor: 'pointer',
};
