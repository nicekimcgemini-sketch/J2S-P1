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
    <div className="admin-root login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand"><span className="dot" /> 출퇴근 모니터링</div>
        <h2>관리자 로그인</h2>
        <input
          className="field"
          placeholder="아이디"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
        />
        <input
          className="field"
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <p className="alert-banner">{error}</p>}
        <button className="btn btn-primary" style={{ marginTop: 8, padding: '10px 0', fontSize: 14 }} disabled={loading}>
          {loading ? '확인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
}
