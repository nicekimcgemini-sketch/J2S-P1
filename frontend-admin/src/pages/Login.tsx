import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogIn } from 'lucide-react';
import { authApi } from '../services/api';
import { AlertBanner, Button, inputClass } from '../components/dashboard';

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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 bg-[radial-gradient(circle_at_30%_20%,#1e1b4b,#020617_55%)] px-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-3.5 rounded-2xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/50 backdrop-blur"
      >
        <div className="mb-1 flex items-center gap-2 text-[15px] font-bold text-white">
          <Activity className="h-5 w-5 text-brand-400" strokeWidth={2.25} />
          출퇴근 모니터링
        </div>
        <h2 className="mb-1 text-lg font-semibold text-white">관리자 로그인</h2>

        <input
          className={inputClass}
          placeholder="아이디"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
        />
        <input
          className={inputClass}
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {error && <AlertBanner>{error}</AlertBanner>}

        <Button type="submit" size="lg" disabled={loading} className="mt-1.5 w-full">
          <LogIn className="h-4 w-4" />
          {loading ? '확인 중...' : '로그인'}
        </Button>
      </form>
    </div>
  );
}
