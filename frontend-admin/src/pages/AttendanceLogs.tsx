import { useEffect, useState } from 'react';
import { attendanceApi, AttendanceLog } from '../services/api';
import { format } from 'date-fns';

export default function AttendanceLogs() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await attendanceApi.getLogs(date);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [date]);

  const checkIns = logs.filter(l => l.type === 'CHECK_IN').length;
  const checkOuts = logs.filter(l => l.type === 'CHECK_OUT').length;

  return (
    <div className="page-body">
      <h1 className="page-title">출퇴근 통계</h1>
      <p className="page-sub">한국시간(KST) 기준 기록입니다.</p>

      <div className="stat-row">
        <div className="stat-tile">
          <span className="stat-label">전체 기록</span>
          <span className="stat-value">{logs.length}</span>
        </div>
        <div className="stat-tile ok">
          <span className="stat-label">출근</span>
          <span className="stat-value">{checkIns}</span>
        </div>
        <div className="stat-tile crit">
          <span className="stat-label">퇴근</span>
          <span className="stat-value">{checkOuts}</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="field" />
            <button onClick={load} className="btn btn-primary">조회</button>
          </div>
        </div>

        {loading ? (
          <p style={{ padding: 24, color: 'var(--text-muted)' }}>로딩 중...</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>직원</th><th>사번</th>
                  <th>구분</th><th>시간</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td>{l.workerName}</td>
                    <td className="mono-strong">{l.employeeNo}</td>
                    <td>
                      <span className={'status-pill ' + (l.type === 'CHECK_IN' ? 'ok' : 'crit')}>
                        {l.type === 'CHECK_IN' ? '출근' : '퇴근'}
                      </span>
                    </td>
                    <td className="mono">{new Date(l.checkedAt).toLocaleTimeString('ko-KR', { hour12: false })}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={4} className="empty-row">기록 없음</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
