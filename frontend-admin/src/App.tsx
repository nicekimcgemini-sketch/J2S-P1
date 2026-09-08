import { BrowserRouter, Routes, Route, Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
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

function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    authApi.logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={navStyle}>
        <h2 style={{ color: '#fff', marginBottom: 24, fontSize: 16 }}>관리자</h2>
        <Link style={linkStyle} to="/admin/devices">기기 관리</Link>
        <Link style={linkStyle} to="/admin/ip-whitelist">허용 IP 관리</Link>
        <Link style={linkStyle} to="/admin/logs">출퇴근 통계</Link>
        <button onClick={handleLogout} style={logoutStyle}>로그아웃</button>
      </nav>
      <main style={{ flex: 1, background: '#f5f5f5' }}>
        <Outlet />
      </main>
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

const navStyle: React.CSSProperties = {
  width: 200, background: '#001529', padding: '24px 16px',
  display: 'flex', flexDirection: 'column', gap: 8,
};
const linkStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
  padding: '10px 12px', borderRadius: 6, fontSize: 14,
};
const logoutStyle: React.CSSProperties = {
  marginTop: 'auto', color: 'rgba(255,255,255,0.7)', background: 'transparent',
  border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '10px 12px',
  fontSize: 14, cursor: 'pointer',
};
