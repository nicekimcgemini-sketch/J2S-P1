import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, Clock, LogOut, ShieldCheck, Smartphone } from 'lucide-react';
import QrScreen from './pages/QrScreen';
import CheckIn from './pages/CheckIn';
import DeviceManagement from './pages/DeviceManagement';
import AttendanceLogs from './pages/AttendanceLogs';
import IpWhitelist from './pages/IpWhitelist';
import Login from './pages/Login';
import { authApi } from './services/api';

function RequireAdmin() {
  if (!authApi.isLoggedIn()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <AdminLayout />;
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  );
}

function Clock24() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="flex items-center gap-1.5 font-mono tabular text-xs text-slate-500">
      <Clock className="h-3.5 w-3.5" strokeWidth={2} />
      {now.toLocaleString('ko-KR', { hour12: false })}
    </span>
  );
}

const navItems = [
  { to: '/admin/devices', label: '기기 관리', icon: Smartphone, section: '모니터링' },
  { to: '/admin/logs', label: '출퇴근 통계', icon: BarChart3, section: '모니터링' },
  { to: '/admin/ip-whitelist', label: '허용 IP 관리', icon: ShieldCheck, section: '설정' },
] as const;

function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    authApi.logout();
    navigate('/admin/login', { replace: true });
  };

  let lastSection = '';

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <nav className="flex w-60 flex-none flex-col border-r border-slate-800 bg-slate-950 p-4">
        <div className="mb-6 flex items-center gap-2 border-b border-slate-800 px-2 pb-4">
          <Activity className="h-4.5 w-4.5 text-brand-400" strokeWidth={2} />
          <span className="font-display text-[15px] font-semibold text-white">출퇴근 모니터링</span>
        </div>

        {navItems.map(item => {
          const showSection = item.section !== lastSection;
          lastSection = item.section;
          const Icon = item.icon;
          return (
            <div key={item.to}>
              {showSection && (
                <div className="px-3 pb-1.5 pt-3.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-600">
                  {item.section}
                </div>
              )}
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2.5 border-l-2 px-3 py-2 text-[13.5px] font-medium transition-colors',
                    isActive
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-transparent text-slate-400 hover:text-white',
                  ].join(' ')
                }
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {item.label}
              </NavLink>
            </div>
          );
        })}

        <div className="flex-1" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 border border-slate-800 px-3 py-2 text-left text-[13.5px] font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          로그아웃
        </button>
      </nav>

      <div className="flex min-h-screen flex-1 flex-col bg-slate-950">
        <header className="flex h-[52px] flex-none items-center justify-between border-b border-slate-800 px-6">
          <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <LiveDot />
            J2S-P1 · Attendance Ops Console
          </span>
          <Clock24 />
        </header>
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/qr" replace />} />
        <Route path="/qr" element={<QrScreen />} />
        <Route path="/checkin" element={<CheckIn />} />

        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<RequireAdmin />}>
          <Route index element={<Navigate to="/admin/devices" replace />} />
          <Route path="devices" element={<DeviceManagement />} />
          <Route path="ip-whitelist" element={<IpWhitelist />} />
          <Route path="logs" element={<AttendanceLogs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
