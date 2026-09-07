import { useEffect, useState } from 'react';
import { attendanceApi, AttendanceLog } from '../services/api';
import { format } from 'date-fns';

export default function AttendanceLogs() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await attendanceApi.getLogs(date, companyId ? Number(companyId) : undefined);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [date]);

  const checkIns = logs.filter(l => l.type === 'CHECK_IN').length;
  const checkOuts = logs.filter(l => l.type === 'CHECK_OUT').length;

  return (
    <div style={{ padding: 24 }}>
      <h2>출퇴근 기록</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d9d9d9' }} />
        <input placeholder="협력사 ID (선택)" value={companyId} onChange={e => setCompanyId(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d9d9d9', width: 140 }} />
        <button onClick={load} style={{ padding: '6px 18px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          조회
        </button>

        <span style={{ marginLeft: 'auto', fontSize: 14, color: '#555' }}>
          출근 <strong>{checkIns}</strong>건 / 퇴근 <strong>{checkOuts}</strong>건
        </span>
      </div>

      {loading ? <p>로딩 중...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead style={{ background: '#fafafa' }}>
            <tr>
              <th style={th}>작업자</th><th style={th}>사번</th><th style={th}>협력사</th>
              <th style={th}>구분</th><th style={th}>시간</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={td}>{l.workerName}</td>
                <td style={td}>{l.employeeNo}</td>
                <td style={td}>{l.companyName}</td>
                <td style={td}>
                  <span style={{
                    color: l.type === 'CHECK_IN' ? '#1677ff' : '#ff4d4f',
                    fontWeight: 600,
                  }}>
                    {l.type === 'CHECK_IN' ? '출근' : '퇴근'}
                  </span>
                </td>
                <td style={td}>{new Date(l.checkedAt).toLocaleTimeString()}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>기록 없음</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontWeight: 600 };
const td: React.CSSProperties = { padding: '10px 12px' };
