import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const ok = await authApi.login(username, password);
    setLoading(false);
    if (ok) {
      navigate('/admin/devices', { replace: true });
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div style={styles.container}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={{ marginBottom: 24 }}>관리자 로그인</h2>
        <input
          style={styles.input}
          placeholder="아이디"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
        />
        <input
          style={styles.input}
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.button} disabled={loading}>
          {loading ? '확인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#f0f2f5',
  },
  card: {
    display: 'flex', flexDirection: 'column', gap: 12,
    background: '#fff', padding: 32, borderRadius: 12,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)', width: 320,
  },
  input: {
    padding: '10px 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14,
  },
  button: {
    marginTop: 8, padding: '10px 0', fontSize: 15, fontWeight: 600,
    background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
  },
  error: { color: '#ff4d4f', fontSize: 13, margin: 0 },
};
