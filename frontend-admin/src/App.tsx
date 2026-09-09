import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
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

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="clock">{now.toLocaleString('ko-KR', { hour12: false })}</span>;
}

function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    authApi.logout();
    navigate('/admin/login', { replace: true });
  };

  const navClass = ({ isActive }: { isActive: boolean }) => 'nav-link' + (isActive ? ' active' : '');

  return (
    <div className="admin-root app-shell">
      <nav className="app-sidebar">
        <div className="brand"><span className="dot" /> 출퇴근 모니터링</div>
        <span className="nav-section-label">모니터링</span>
        <NavLink className={navClass} to="/admin/devices">기기 관리</NavLink>
        <NavLink className={navClass} to="/admin/logs">출퇴근 통계</NavLink>
        <span className="nav-section-label">설정</span>
        <NavLink className={navClass} to="/admin/ip-whitelist">허용 IP 관리</NavLink>
        <div className="nav-spacer" />
        <button onClick={handleLogout} className="nav-link logout">로그아웃</button>
      </nav>
      <div className="app-main">
        <div className="app-topbar">
          <span>J2S-P1 · Attendance Ops Console</span>
          <Clock />
        </div>
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
