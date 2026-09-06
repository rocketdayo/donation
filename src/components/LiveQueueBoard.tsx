import React, { useState } from 'react';
import { 
  TicketRecord, 
  QueueStatus 
} from '../types';
import { 
  Megaphone, 
  Clock, 
  CheckCircle2, 
  Stethoscope, 
  Syringe, 
  Coffee, 
  Send, 
  RotateCcw, 
  Undo2, 
  X, 
  PauseCircle, 
  FileText, 
  AlertCircle 
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { NotificationManager } from '../utils/notifications';

interface LiveQueueBoardProps {
  tickets: TicketRecord[];
  onUpdateTicket: (id: string, partial: Partial<TicketRecord>) => void;
  onOpenTicketDetail?: (ticket: TicketRecord) => void;
}

export const LiveQueueBoard: React.FC<LiveQueueBoardProps> = ({
  tickets,
  onUpdateTicket,
  onOpenTicketDetail,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<string>('all');
  const [recentNotification, setRecentNotification] = useState<string | null>(null);

  const filteredTickets = selectedSlot === 'all' 
    ? tickets 
    : tickets.filter(t => t.timeSlot === selectedSlot);

  const callingList = filteredTickets.filter(t => t.queueStatus === 'called');
  const waitingList = filteredTickets.filter(t => t.queueStatus === 'waiting');
  const onHoldList = filteredTickets.filter(t => t.queueStatus === 'on_hold' || t.queueStatus === 'absent');
  const interviewList = filteredTickets.filter(t => t.queueStatus === 'interview');
  const donatingList = filteredTickets.filter(t => t.queueStatus === 'donating');
  const restingList = filteredTickets.filter(t => t.queueStatus === 'resting');
  const doneList = filteredTickets.filter(t => t.queueStatus === 'done');

  const estimatedWaitMinutes = Math.max(0, waitingList.length * 5);

  const timeSlots = Array.from(new Set(tickets.map(t => t.timeSlot))).sort();

  const handleCallTicket = (ticket: TicketRecord) => {
    const timeStr = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const currentCallCount = ticket.callCount || 0;
    const nextCallCount = currentCallCount + 1;

    onUpdateTicket(ticket.id, {
      queueStatus: 'called',
      calledAt: timeStr,
      calledTimestamp: Date.now(),
      callCount: nextCallCount,
      attendance: ticket.attendance === 'unattended' ? 'present' : ticket.attendance,
      arrivedAt: ticket.arrivedAt || timeStr
    });

    sounds.unlock();
    sounds.playCallingChime();

    NotificationManager.sendPushNotification(
      ticket.id,
      ticket.email,
      ticket.name,
      `献血バスへのお呼出（整理券 ${ticket.ticketNumber}番）`,
      `${ticket.name} 様、受付の順番になりました。食堂前の献血バスへお越しください。`
    );

    setRecentNotification(`整理券 #${ticket.ticketNumber} ${ticket.name} 様へ呼出通知を送信しました（${nextCallCount}回目）`);
    setTimeout(() => setRecentNotification(null), 5000);
  };

  const handleRebroadcastAllCalling = () => {
    if (callingList.length === 0) return;
    const timeStr = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const now = Date.now();

    callingList.forEach(ticket => {
      const nextCallCount = (ticket.callCount || 1) + 1;
      onUpdateTicket(ticket.id, {
        calledAt: timeStr,
        calledTimestamp: now,
        callCount: nextCallCount
      });

      NotificationManager.sendPushNotification(
        ticket.id,
        ticket.email,
        ticket.name,
        `【再通知】献血バスへのお呼出（整理券 ${ticket.ticketNumber}番）`,
        `${ticket.name} 様、受付の順番になっております。食堂前の献血バスまでお越しください。`
      );
    });

    sounds.unlock();
    sounds.playCallingChime();

    setRecentNotification(`現在呼出中の受診者全員（${callingList.length}名）へ一括再呼出を送信しました`);
    setTimeout(() => setRecentNotification(null), 5000);
  };

  const handleCallNext = () => {
    if (waitingList.length === 0) return;
    const nextTicket = waitingList[0];
    handleCallTicket(nextTicket);
  };

  const [lastAction, setLastAction] = useState<{
    ticket: TicketRecord;
    previousState: Partial<TicketRecord>;
    newStatusLabel: string;
    timerId: NodeJS.Timeout | null;
  } | null>(null);

  const statusLabels: Record<QueueStatus, string> = {
    waiting: '待機中',
    called: 'お呼出中',
    on_hold: '一時保留',
    interview: '問診・検査',
    donating: '採血中',
    resting: '休憩中',
    done: '本日の献血完了',
    absent: '不在・キャンセル'
  };

  const handleStageTransition = (ticket: TicketRecord, nextStatus: QueueStatus) => {
    const previousState: Partial<TicketRecord> = {
      queueStatus: ticket.queueStatus,
      attendance: ticket.attendance,
      completedAt: ticket.completedAt,
      calledAt: ticket.calledAt
    };

    const updates: Partial<TicketRecord> = { queueStatus: nextStatus };
    if (nextStatus === 'done') {
      updates.attendance = 'completed';
      updates.completedAt = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } else if (nextStatus === 'absent') {
      updates.attendance = 'absent';
    }
    onUpdateTicket(ticket.id, updates);

    if (lastAction?.timerId) {
      clearTimeout(lastAction.timerId);
    }

    const timerId = setTimeout(() => {
      setLastAction(null);
    }, 8000);

    setLastAction({
      ticket,
      previousState,
      newStatusLabel: statusLabels[nextStatus] || nextStatus,
      timerId
    });
  };

  const handleUndo = () => {
    if (!lastAction) return;
    if (lastAction.timerId) clearTimeout(lastAction.timerId);
    onUpdateTicket(lastAction.ticket.id, lastAction.previousState);
    setRecentNotification(`整理券 #${lastAction.ticket.ticketNumber} ${lastAction.ticket.name} 様のステータス変更を取り消しました`);
    setTimeout(() => setRecentNotification(null), 4000);
    setLastAction(null);
  };

  return (
    <div className="space-y-6">
      {recentNotification && (
        <div className="p-3 bg-rose-800 text-white rounded-xl shadow-md flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-rose-200" />
            <span>{recentNotification}</span>
          </div>
          <span className="text-[10px] text-rose-200">通知送信完了</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              進行管理ボード
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              受診者の呼出・問診・採血・休憩・完了ステータスを一括管理します
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="slot-filter-select" className="text-slate-500 font-medium">時間帯:</label>
              <select
                id="slot-filter-select"
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="all">全時間帯 ({tickets.length}名)</option>
                {timeSlots.map(slot => (
                  <option key={slot} value={slot}>
                    {slot} ({tickets.filter(t => t.timeSlot === slot).length}名)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600">
              <span className="text-slate-400">予想待機:</span>
              <span className="font-bold text-slate-800">約 {estimatedWaitMinutes} 分</span>
            </div>

            <button
              id="call-next-hero-btn"
              type="button"
              onClick={handleCallNext}
              disabled={waitingList.length === 0}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition ${
                waitingList.length > 0
                  ? 'bg-rose-700 hover:bg-rose-800 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>次の人を呼出 ({waitingList.length}名待機)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-amber-600" />
              現在お呼出中 ({callingList.length}名)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {callingList.length > 0 && (
              <button
                type="button"
                onClick={handleRebroadcastAllCalling}
                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                title="現在呼出中の全員のスマートフォンへ一括で通知を再送します"
              >
                <Megaphone className="w-3 h-3 text-amber-700" />
                <span>全員に一括再通知</span>
              </button>
            )}
            <span className="text-[11px] font-medium text-slate-500">
              食堂前の献血バスにて対応
            </span>
          </div>
        </div>

        {callingList.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            現在、お呼出中の方はいません。「次の人を呼出」ボタンまたは待機列の「呼出」から呼び出せます。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {callingList.map((ticket) => (
              <div 
                key={ticket.id}
                className="bg-slate-50 border border-amber-300 rounded-xl p-4 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onOpenTicketDetail && onOpenTicketDetail(ticket)}
                      className="font-mono font-black text-slate-800 text-base hover:text-rose-700 transition cursor-pointer"
                    >
                      #{ticket.ticketNumber}
                    </button>
                    <div className="flex items-center gap-1.5">
                      {ticket.callCount && ticket.callCount > 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          呼出 {ticket.callCount}回
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-slate-500">{ticket.timeSlot}</span>
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenTicketDetail && onOpenTicketDetail(ticket)}
                        className="text-sm font-bold text-slate-800 hover:text-rose-700 text-left transition cursor-pointer"
                      >
                        {ticket.name}
                      </button>
                      {ticket.attribute && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                          {ticket.attribute}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{ticket.email}</p>
                    {ticket.calledAt && (
                      <p className="text-[10px] text-amber-700 font-medium mt-1">
                        呼出時刻: {ticket.calledAt}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mt-2">
                      {ticket.safetyChecklist?.confirmedAt ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          安全チェック済
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
                          問診前要チェック
                        </span>
                      )}

                      {ticket.parentalConsentStatus === 'submitted' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-emerald-600" />
                          同意書受領済
                        </span>
                      )}
                      {ticket.parentalConsentStatus === 'unconfirmed' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-700" />
                          同意書要確認
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleCallTicket(ticket)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
                    title="スマホへ呼出通知・チャイムを送信"
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>通知再送</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStageTransition(ticket, 'on_hold')}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                      title="応答がないため一旦保留にし、次の受診者を呼べるようにします"
                    >
                      <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>保留(不在)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStageTransition(ticket, 'interview')}
                      className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      問診へ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-3 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <PauseCircle className="w-4 h-4 text-amber-600" />
              不在・保留（スキップ管理）
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              onHoldList.length > 0 ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-600'
            }`}>
              {onHoldList.length}名
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            呼出に応答がなかった方を一時保留中。到着時にワンクリックで即座に再呼出できます
          </span>
        </div>

        {onHoldList.length === 0 ? (
          <div className="text-center py-5 text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            現在、保留・不在の受診者はいません（お呼出に応答がない方を「保留(不在)」に設定するとここに集約されます）
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {onHoldList.map(ticket => (
              <div
                key={ticket.id}
                className="bg-amber-50/40 border border-amber-200 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onOpenTicketDetail && onOpenTicketDetail(ticket)}
                      className="font-mono font-black text-slate-800 text-sm hover:text-rose-700 transition cursor-pointer"
                    >
                      #{ticket.ticketNumber}
                    </button>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {ticket.queueStatus === 'absent' ? '欠席/見送り' : '一時保留中'}
                      </span>
                      {ticket.callCount && ticket.callCount > 0 && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          呼出 {ticket.callCount}回
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onOpenTicketDetail && onOpenTicketDetail(ticket)}
                      className="text-xs font-bold text-slate-800 hover:text-rose-700 text-left transition cursor-pointer"
                    >
                      {ticket.name}
                    </button>
                    <span className="text-[10px] text-slate-500">{ticket.timeSlot}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {ticket.safetyChecklist?.confirmedAt ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        ✓ 安全チェック済
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        安全未確認
                      </span>
                    )}
                    {ticket.parentalConsentStatus === 'submitted' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        ✓ 同意書受領
                      </span>
                    )}
                    {ticket.parentalConsentStatus === 'unconfirmed' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        ⚠️ 同意書要確認
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCallTicket(ticket)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
                    title="到着時に即座に再呼出・通知します"
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>即座に再呼出</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStageTransition(ticket, 'waiting')}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs transition cursor-pointer"
                      title="待機列に戻します"
                    >
                      待機列へ
                    </button>
                    {ticket.queueStatus !== 'absent' && (
                      <button
                        type="button"
                        onClick={() => handleStageTransition(ticket, 'absent')}
                        className="px-2 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs transition cursor-pointer"
                        title="本日の受診を見送り・欠席にします"
                      >
                        欠席
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm">① 待機中</h3>
              <p className="text-[10px] text-slate-400">受付待ちの受診者</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {waitingList.length}名
            </span>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
            {waitingList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">待機中の受診者はいません</div>
            ) : (
              waitingList.map((ticket) => (
                <div 
                  key={ticket.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-bold text-xs text-slate-800">#{ticket.ticketNumber}</span>
                      <span className="text-[10px] text-slate-400">{ticket.timeSlot}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-800">{ticket.name}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCallTicket(ticket)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-bold shadow-xs active:scale-95 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Megaphone className="w-3 h-3" />
                    呼出
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm">② 問診・検査中</h3>
              <p className="text-[10px] text-slate-400">医師問診・事前検査</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              {interviewList.length}名
            </span>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
            {interviewList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">問診中の方はいません</div>
            ) : (
              interviewList.map((ticket) => (
                <div 
                  key={ticket.id}
                  className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 transition flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-800">#{ticket.ticketNumber} {ticket.name}</div>
                    <div className="text-[10px] text-slate-500">{ticket.donationType || '400mL'}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStageTransition(ticket, 'donating')}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Syringe className="w-3 h-3" />
                    採血へ
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm">③ 採血中</h3>
              <p className="text-[10px] text-slate-400">ベッド・献血バス</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
              {donatingList.length}名
            </span>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
            {donatingList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">採血中の方はいません</div>
            ) : (
              donatingList.map((ticket) => (
                <div 
                  key={ticket.id}
                  className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 transition flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-800">#{ticket.ticketNumber} {ticket.name}</div>
                    <div className="text-[10px] text-slate-500">{ticket.bloodType ? `${ticket.bloodType}型` : ''} ({ticket.donationType || '400mL'})</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStageTransition(ticket, 'resting')}
                    className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Coffee className="w-3 h-3" />
                    休憩へ
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm">④ 休憩 & 完了</h3>
              <p className="text-[10px] text-slate-400">水分補給・終了</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {restingList.length + doneList.length}名
            </span>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
            {restingList.map((ticket) => (
              <div 
                key={ticket.id}
                className="p-3 rounded-xl border border-teal-200 bg-teal-50/40 transition flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-slate-800">#{ticket.ticketNumber} {ticket.name}</div>
                  <div className="text-[10px] text-teal-800 font-medium">水分補給中</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleStageTransition(ticket, 'done')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  完了
                </button>
              </div>
            ))}

            {doneList.map((ticket) => (
              <div 
                key={ticket.id}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="font-medium truncate">#{ticket.ticketNumber} {ticket.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-slate-400">{ticket.completedAt || '完了'}</span>
                  <button
                    type="button"
                    onClick={() => handleStageTransition(ticket, 'waiting')}
                    className="px-2 py-1 rounded-md text-[10px] text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="誤って完了にした場合、待機中に戻せます"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>待機中に戻す</span>
                  </button>
                </div>
              </div>
            ))}

            {restingList.length === 0 && doneList.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">完了した受診者はいません</div>
            )}
          </div>
        </div>
      </div>

      {lastAction && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium">
              #{lastAction.ticket.ticketNumber} {lastAction.ticket.name} 様を「{lastAction.newStatusLabel}」に変更しました
            </span>
          </div>

          <button
            type="button"
            onClick={handleUndo}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
            title="直前の変更を取り消して元の状態に戻します"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>元に戻す</span>
          </button>

          <button
            type="button"
            onClick={() => setLastAction(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition cursor-pointer"
            title="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
