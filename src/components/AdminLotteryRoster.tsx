import React, { useState, useMemo } from 'react';
import { 
  Gift, 
  Search, 
  ChevronDown, 
  FileSpreadsheet
} from 'lucide-react';
import { TicketRecord } from '../types';

interface AdminLotteryRosterProps {
  tickets: TicketRecord[];
  onUpdateLotteryResult: (ticketId: string, result: string) => void;
  onUpdateTicket?: (ticketId: string, updates: Partial<TicketRecord>) => void;
  onOpenSpreadsheet?: () => void;
}

const LOTTERY_OPTIONS = [
  { label: '未抽選', value: '' },
  { label: '一等', value: '一等' },
  { label: '二等', value: '二等' },
  { label: '三等', value: '三等' },
  { label: '四等', value: '四等' },
  { label: '参加賞', value: '参加賞' },
  { label: 'はずれ', value: 'はずれ' }
];

export const AdminLotteryRoster: React.FC<AdminLotteryRosterProps> = ({
  tickets,
  onUpdateLotteryResult,
  onUpdateTicket,
  onOpenSpreadsheet
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [lotteryFilter, setLotteryFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const filteredTickets = useMemo(() => {
    return tickets
      .slice()
      .sort((a, b) => a.ticketNumber - b.ticketNumber)
      .filter((t) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchNum = String(t.ticketNumber).includes(q);
          const matchName = t.name.toLowerCase().includes(q);
          const matchAttr = (t.attribute || '').toLowerCase().includes(q);
          const matchEmail = t.email.toLowerCase().includes(q);
          if (!matchNum && !matchName && !matchAttr && !matchEmail) {
            return false;
          }
        }

        if (lotteryFilter === 'pending') {
          return !t.lotteryResult || t.lotteryResult === '未抽選';
        }
        if (lotteryFilter === 'completed') {
          return Boolean(t.lotteryResult && t.lotteryResult !== '未抽選');
        }

        return true;
      });
  }, [tickets, searchQuery, lotteryFilter]);

  const isTicketCompleted = (t: TicketRecord) => {
    return t.queueStatus === 'done' || t.attendance === 'completed';
  };

  const stats = useMemo(() => {
    const total = tickets.length;
    const completedCount = tickets.filter(isTicketCompleted).length;
    const pendingCount = total - completedCount;
    const lotteryDoneCount = tickets.filter(t => t.lotteryResult && t.lotteryResult !== '未抽選').length;

    const countByPrize: Record<string, number> = {
      '一等': 0,
      '二等': 0,
      '三等': 0,
      '四等': 0,
      '参加賞': 0,
      'はずれ': 0,
    };

    tickets.forEach(t => {
      if (t.lotteryResult && countByPrize[t.lotteryResult] !== undefined) {
        countByPrize[t.lotteryResult]++;
      }
    });

    return {
      total,
      completedCount,
      pendingCount,
      lotteryDoneCount,
      countByPrize
    };
  }, [tickets]);

  const handleToggleAttendance = (ticket: TicketRecord) => {
    if (!onUpdateTicket) return;
    const completed = isTicketCompleted(ticket);
    if (completed) {
      onUpdateTicket(ticket.id, {
        attendance: 'absent',
        queueStatus: 'waiting'
      });
    } else {
      onUpdateTicket(ticket.id, {
        attendance: 'completed',
        queueStatus: 'done',
        completedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      });
    }
  };

  const renderAttendanceBadge = (ticket: TicketRecord) => {
    const completed = isTicketCompleted(ticket);
    return (
      <button
        type="button"
        onClick={() => handleToggleAttendance(ticket)}
        className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border shadow-2xs transition select-none cursor-pointer hover:opacity-85 ${
          completed
            ? 'bg-[#fed7d7] text-[#c53030] border-rose-300/80 hover:bg-[#feb2b2]'
            : 'bg-slate-100 text-slate-600 border-slate-300/80 hover:bg-slate-200'
        }`}
        title="クリックで出席（完了）と欠席（待機中）を切り替えます"
      >
        {completed ? '出席' : '欠席'}
      </button>
    );
  };

  const getLotterySelectStyle = (result?: string) => {
    switch (result) {
      case '四等':
        return 'bg-[#e9d8fd] text-[#553c9a] border-[#b794f4] hover:bg-[#d6bcfa]';
      case '一等':
        return 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200';
      case '二等':
        return 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200';
      case '三等':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200';
      case '参加賞':
        return 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200';
      case 'はずれ':
        return 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200';
      default:
        return 'bg-white text-slate-400 border-dashed border-slate-300 hover:border-slate-400 hover:text-slate-600';
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                <Gift className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                くじ引き・受診者名簿
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Googleスプレッドシート連携データです。出欠は献血が完了した人が<span className="font-bold text-[#c53030]">「出席」</span>、未完了の人が<span className="font-bold text-slate-700">「欠席」</span>と表示されます。<span className="font-semibold text-slate-800">くじ引き結果のみ操作可能</span>です。
            </p>
          </div>

          {onOpenSpreadsheet && (
            <button
              type="button"
              onClick={onOpenSpreadsheet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition self-start sm:self-center cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>シート連携を開く</span>
            </button>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium">
            受診登録: <span className="font-bold text-slate-800">{stats.total}名</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium">
            出席（完了）: <span className="font-bold text-rose-900">{stats.completedCount}名</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-medium">
            欠席（未完了）: <span className="font-bold text-slate-800">{stats.pendingCount}名</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 font-medium">
            くじ引き済: <span className="font-bold text-purple-950">{stats.lotteryDoneCount}名</span> / {stats.total}名
          </div>

          <div className="hidden lg:flex items-center gap-1.5 ml-auto text-[11px] text-slate-600">
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
              一等: {stats.countByPrize['一等']}
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              二等: {stats.countByPrize['二等']}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
              三等: {stats.countByPrize['三等']}
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-medium">
              四等: {stats.countByPrize['四等']}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
              参加賞: {stats.countByPrize['参加賞']}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="番号、名前、属性（生徒/教員など）で検索..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 text-xs hidden sm:inline flex-shrink-0">絞り込み:</span>
          <button
            type="button"
            onClick={() => setLotteryFilter('all')}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              lotteryFilter === 'all'
                ? 'bg-rose-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            全員
          </button>
          <button
            type="button"
            onClick={() => setLotteryFilter('pending')}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              lotteryFilter === 'pending'
                ? 'bg-rose-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            未抽選のみ
          </button>
          <button
            type="button"
            onClick={() => setLotteryFilter('completed')}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              lotteryFilter === 'completed'
                ? 'bg-rose-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            抽選完了のみ
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-xs text-slate-700 font-bold tracking-tight">
                <th className="py-3 px-4 w-16 text-center border-r border-slate-200/80">番号</th>
                <th className="py-3 px-4 w-24 border-r border-slate-200/80">時間</th>
                <th className="py-3 px-4 min-w-[140px] border-r border-slate-200/80">名前</th>
                <th className="py-3 px-4 w-24 border-r border-slate-200/80">属性</th>
                <th className="py-3 px-4 w-28 text-center border-r border-slate-200/80">出欠</th>
                <th className="py-3 px-4 min-w-[160px]">くじ引きの結果</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs sm:text-sm">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    該当する受診者データがありません
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => {
                  const displayTime = ticket.arrivedAt || ticket.timeSlot;
                  const currentResult = ticket.lotteryResult || '';

                  return (
                    <tr 
                      key={ticket.id} 
                      className="hover:bg-slate-50/75 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-bold text-slate-800 border-r border-slate-200/80 tabular-nums">
                        {ticket.ticketNumber}
                      </td>

                      <td className="py-3 px-4 text-slate-800 font-medium border-r border-slate-200/80 tabular-nums whitespace-nowrap">
                        {displayTime}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800 border-r border-slate-200/80 whitespace-nowrap">
                        {ticket.name}
                      </td>

                      <td className="py-3 px-4 text-slate-700 border-r border-slate-200/80 whitespace-nowrap">
                        {ticket.attribute || '生徒'}
                      </td>

                      <td className="py-2.5 px-4 text-center border-r border-slate-200/80 whitespace-nowrap">
                        {renderAttendanceBadge(ticket)}
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="relative inline-block">
                          <select
                            value={currentResult}
                            onChange={(e) => onUpdateLotteryResult(ticket.id, e.target.value)}
                            className={`appearance-none cursor-pointer pl-3.5 pr-7 py-1 rounded-full text-xs font-bold border transition shadow-2xs focus:outline-none focus:ring-2 focus:ring-rose-400/50 ${getLotterySelectStyle(currentResult)}`}
                            title="くじ引き結果を選択してください"
                          >
                            {LOTTERY_OPTIONS.map((opt) => (
                              <option 
                                key={opt.value} 
                                value={opt.value}
                                className="bg-white text-slate-800 font-medium py-1"
                              >
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-current opacity-80" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
