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
    <div style={{ padding: 24 }}>
      <h2>허용 IP 관리</h2>
      <p style={{ color: '#888', fontSize: 13, marginTop: -8 }}>
        QR 코드 생성이 허용되는 현장 PC의 IP를 관리합니다.
      </p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, margin: '20px 0' }}>
        <input
          placeholder="IP 주소 (예: 203.0.113.10)"
          value={ipAddress}
          onChange={e => setIpAddress(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d9d9d9', width: 200 }}
        />
        <input
          placeholder="설명 (예: 1공장 출입구 PC)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d9d9d9', width: 240 }}
        />
        <button type="submit" style={{ padding: '6px 18px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          추가
        </button>
      </form>

      {loading ? <p>로딩 중...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead style={{ background: '#fafafa' }}>
            <tr>
              <th style={th}>IP 주소</th><th style={th}>설명</th><th style={th}>등록일</th><th style={th}>작업</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={td}>{entry.ipAddress}</td>
                <td style={td}>{entry.description}</td>
                <td style={td}>{new Date(entry.createdAt).toLocaleDateString()}</td>
                <td style={td}>
                  <button
                    onClick={() => handleRemove(entry.id)}
                    style={{ padding: '4px 12px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>등록된 IP 없음</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontWeight: 600 };
const td: React.CSSProperties = { padding: '10px 12px' };
