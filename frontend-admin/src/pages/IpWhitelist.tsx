import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ipWhitelistApi, IpWhitelistEntry } from '../services/api';
import { Button, LoadingRow, Panel, PageHeader, StatRow, StatTile, inputClass } from '../components/dashboard';

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
    <div className="flex flex-1 flex-col gap-5 p-7">
      <PageHeader title="허용 IP 관리" sub="QR 코드 생성이 허용되는 현장 PC의 IP를 관리합니다." />

      <StatRow>
        <StatTile label="허용된 IP" value={entries.length} tone="ok" />
      </StatRow>

      <Panel title="IP 등록" padded>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
          <input
            className={`${inputClass} w-52`}
            placeholder="IP 주소 (예: 203.0.113.10)"
            value={ipAddress}
            onChange={e => setIpAddress(e.target.value)}
          />
          <input
            className={`${inputClass} w-60`}
            placeholder="설명 (예: 1공장 출입구 PC)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <Button type="submit"><Plus className="h-3.5 w-3.5" /> 추가</Button>
        </form>
      </Panel>

      <Panel title="등록된 IP 목록">
        {loading ? (
          <LoadingRow />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-800 bg-black/20 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="whitespace-nowrap px-3.5 py-2.5">IP 주소</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">설명</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">등록일</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">작업</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/40">
                    <td className="px-3.5 py-2.5 font-mono text-[12.5px] text-slate-200">{entry.ipAddress}</td>
                    <td className="px-3.5 py-2.5 text-slate-300">{entry.description}</td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs text-slate-500">
                      {new Date(entry.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Button variant="crit" size="sm" onClick={() => handleRemove(entry.id)}>
                        <Trash2 className="h-3.5 w-3.5" /> 삭제
                      </Button>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">등록된 IP 없음</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
