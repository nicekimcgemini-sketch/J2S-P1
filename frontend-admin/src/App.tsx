import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import QrScreen from './pages/QrScreen';
import DeviceManagement from './pages/DeviceManagement';
import AttendanceLogs from './pages/AttendanceLogs';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <nav style={navStyle}>
          <h2 style={{ color: '#fff', marginBottom: 24, fontSize: 16 }}>출퇴근 관리</h2>
          <Link style={linkStyle} to="/qr">QR 화면 (현장 PC)</Link>
          <Link style={linkStyle} to="/devices">기기 관리</Link>
          <Link style={linkStyle} to="/logs">출퇴근 기록</Link>
        </nav>
        <main style={{ flex: 1, background: '#f5f5f5' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/devices" replace />} />
            <Route path="/qr" element={<QrScreen />} />
            <Route path="/devices" element={<DeviceManagement />} />
            <Route path="/logs" element={<AttendanceLogs />} />
          </Routes>
        </main>
      </div>
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
