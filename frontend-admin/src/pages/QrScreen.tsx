import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { qrApi } from '../services/api';

const QR_REFRESH_INTERVAL = 55_000; // 55초마다 자동 갱신 (만료 5초 전)
const APP_DOWNLOAD_URL = import.meta.env.VITE_APP_DOWNLOAD_URL as string | undefined;

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

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>출퇴근 QR 코드</h1>

      {token ? (
        <>
          <div style={styles.qrWrapper}>
            <QRCodeSVG value={token} size={300} level="H" />
          </div>
          <p style={styles.timer}>
            유효 시간: <strong style={{ color: remaining < 15 ? 'red' : 'inherit' }}>{remaining}초</strong>
          </p>
          <p style={styles.expiry}>만료: {expiresAt ? new Date(expiresAt).toLocaleTimeString() : '-'}</p>
        </>
      ) : (
        <p>QR 코드 로딩 중...</p>
      )}

      <button
        style={{ ...styles.button, opacity: loading ? 0.6 : 1 }}
        onClick={fetchQr}
        disabled={loading}
      >
        {loading ? '갱신 중...' : '새로고침'}
      </button>

      <a
        href={APP_DOWNLOAD_URL || undefined}
        onClick={(e) => {
          if (!APP_DOWNLOAD_URL) {
            e.preventDefault();
            alert('앱 다운로드는 아직 준비 중입니다.');
          }
        }}
        style={{ ...styles.downloadButton, opacity: APP_DOWNLOAD_URL ? 1 : 0.6 }}
      >
        출퇴근 앱 다운로드
      </a>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '100vh', background: '#f0f2f5', gap: 16,
  },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
  qrWrapper: {
    background: '#fff', padding: 24, borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
  },
  timer: { fontSize: 20, marginTop: 16 },
  expiry: { fontSize: 13, color: '#888' },
  button: {
    marginTop: 16, padding: '12px 32px', fontSize: 16, fontWeight: 600,
    background: '#1677ff', color: '#fff', border: 'none', borderRadius: 8,
    cursor: 'pointer',
  },
  downloadButton: {
    marginTop: 8, padding: '10px 28px', fontSize: 14, fontWeight: 600,
    background: '#fff', color: '#1677ff', border: '1px solid #1677ff', borderRadius: 8,
    cursor: 'pointer', textDecoration: 'none',
  },
};
