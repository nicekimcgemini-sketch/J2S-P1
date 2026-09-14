import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Holiday, holidayApi } from '../services/api';
import { AlertBanner, Button, LoadingRow, PageHeader, Panel, inputClass } from '../components/dashboard';

export default function Holidays() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const load = async (targetYear = year) => {
    setLoading(true);
    try {
      setHolidays(await holidayApi.getAll(targetYear));
    } catch (err: any) {
      setError(err?.response?.data?.message || '조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(year); }, [year]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !name.trim()) return;
    setWorking(true);
    setError('');
    try {
      await holidayApi.add(date, name.trim());
      setDate('');
      setName('');
      const addedYear = parseISO(date).getFullYear();
      if (addedYear !== year) {
        setYear(addedYear);   // 등록한 날짜의 연도로 이동 (useEffect 가 다시 조회)
      } else {
        await load();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || '등록에 실패했습니다.');
    } finally {
      setWorking(false);
    }
  };

  const handleRemove = async (holiday: Holiday) => {
    setWorking(true);
    setError('');
    try {
      await holidayApi.remove(holiday.id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || '삭제에 실패했습니다.');
    } finally {
      setWorking(false);
    }
  };

  const weekdayCount = holidays.filter(h => {
    const d = parseISO(h.date).getDay();
    return d !== 0 && d !== 6;
  }).length;

  return (
    <div className="flex flex-1 flex-col gap-5 p-7">
      <PageHeader
        title="공휴일 관리"
        sub={`${year}년 휴일 ${holidays.length}일 (평일 ${weekdayCount}일) — 등록한 날은 근태 요약·출퇴근 통계에서 결근·지각·조퇴·야근으로 판정하지 않습니다.`}
      />

      {error && <AlertBanner>{error}</AlertBanner>}

      <Panel title="휴일 등록" padded>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
          <input type="date" className={inputClass} value={date} onChange={e => setDate(e.target.value)} />
          <input
            className={`${inputClass} w-60`}
            placeholder="이름 (예: 추석, 창립기념일)"
            maxLength={50}
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <Button type="submit" disabled={working || !date || !name.trim()}>
            <Plus className="h-3.5 w-3.5" /> 추가
          </Button>
        </form>
        <p className="mt-2.5 text-xs text-slate-500">
          법정 공휴일뿐 아니라 대체공휴일, 선거일, 회사 휴무일도 같은 방식으로 등록합니다. 토·일요일은 등록하지 않아도 휴일로 봅니다.
        </p>
      </Panel>

      <Panel
        title="등록된 휴일"
        actions={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setYear(y => y - 1)} title="이전 해">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="w-16 text-center text-[13px] font-bold tabular text-slate-700">{year}년</span>
            <Button variant="ghost" size="sm" onClick={() => setYear(y => y + 1)} title="다음 해">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      >
        {loading ? (
          <LoadingRow />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="whitespace-nowrap px-3.5 py-2.5">날짜</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5">이름</th>
                  <th className="w-16 whitespace-nowrap px-3.5 py-2.5 text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map(h => (
                  <tr key={h.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs text-slate-600">
                      {format(parseISO(h.date), 'yyyy-MM-dd (EEE)', { locale: ko })}
                    </td>
                    <td className="px-3.5 py-2.5 font-medium text-slate-800">{h.name}</td>
                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        type="button"
                        title="삭제"
                        disabled={working}
                        onClick={() => handleRemove(h)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {holidays.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-500">{year}년에 등록된 휴일 없음</td>
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
