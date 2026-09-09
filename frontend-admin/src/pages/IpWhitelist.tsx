import { useEffect, useState } from 'react';
import { ipWhitelistApi, IpWhitelistEntry } from '../services/api';

export default function IpWhitelist() {
  const [entries, setEntries] = useState<IpWhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ipAddress, setIpAddress] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    setLoading(true);
    setEntries(await ipWhitelistApi.getAll());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress.trim()) return;
    await ipWhitelistApi.add(ipAddress.trim(), description.trim());
    setIpAddress('');
    setDescription('');
    await load();
  };

  const handleRemove = async (id: number) => {
    await ipWhitelistApi.remove(id);
    await load();
  };

  return (
    <div className="page-body">
      <h1 className="page-title">허용 IP 관리</h1>
      <p className="page-sub">QR 코드 생성이 허용되는 현장 PC의 IP를 관리합니다.</p>

      <div className="stat-row" style={{ gridTemplateColumns: 'minmax(140px,220px)' }}>
        <div className="stat-tile ok">
          <span className="stat-label">허용된 IP</span>
          <span className="stat-value">{entries.length}</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">IP 등록</span>
        </div>
        <div className="panel-body">
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="field"
              placeholder="IP 주소 (예: 203.0.113.10)"
              value={ipAddress}
              onChange={e => setIpAddress(e.target.value)}
              style={{ width: 200 }}
            />
            <input
              className="field"
              placeholder="설명 (예: 1공장 출입구 PC)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ width: 240 }}
            />
            <button type="submit" className="btn btn-primary">추가</button>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">등록된 IP 목록</span>
        </div>
        {loading ? (
          <p style={{ padding: 24, color: 'var(--text-muted)' }}>로딩 중...</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>IP 주소</th><th>설명</th><th>등록일</th><th>작업</th></tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id}>
                    <td className="mono-strong">{entry.ipAddress}</td>
                    <td>{entry.description}</td>
                    <td className="mono">{new Date(entry.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td>
                      <button onClick={() => handleRemove(entry.id)} className="btn btn-crit btn-sm">삭제</button>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={4} className="empty-row">등록된 IP 없음</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
