import React, { useState } from 'react';
import { 
  TicketRecord, 
  QueueStatus 
} from '../types';
import { 
  Volume2, 
  Megaphone, 
  Clock, 
  CheckCircle2, 
  Stethoscope, 
  Syringe, 
  Coffee, 
  UserCheck, 
  ChevronRight, 
  Send, 
  Sparkles,
  ArrowRight,
  RotateCcw,
  Undo2,
  X
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { VoiceAnnouncer } from '../utils/speech';
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

  // Filter tickets by slot if selected
  const filteredTickets = selectedSlot === 'all' 
    ? tickets 
    : tickets.filter(t => t.timeSlot === selectedSlot);

  // Group by stage
  const callingList = filteredTickets.filter(t => t.queueStatus === 'called');
  const waitingList = filteredTickets.filter(t => t.queueStatus === 'waiting');
  const interviewList = filteredTickets.filter(t => t.queueStatus === 'interview');
  const donatingList = filteredTickets.filter(t => t.queueStatus === 'donating');
  const restingList = filteredTickets.filter(t => t.queueStatus === 'resting');
  const doneList = filteredTickets.filter(t => t.queueStatus === 'done');

  // Estimate wait time (approx 5 mins per person)
  const estimatedWaitMinutes = Math.max(0, waitingList.length * 5);

  // Unique time slots for filter
  const timeSlots = Array.from(new Set(tickets.map(t => t.timeSlot))).sort();

  // Call a specific ticket (updates Firestore timestamp to trigger recipient device notifications & sound)
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
    VoiceAnnouncer.announceCall(ticket.ticketNumber, ticket.name);

    NotificationManager.sendPushNotification(
      ticket.id,
      ticket.email,
      ticket.name,
      `【献血呼出】整理券番号 #${ticket.ticketNumber} の番です`,
      `${ticket.name}様、食堂前の献血バスへお越しください。`
    );

    setRecentNotification(`整理券 #${ticket.ticketNumber} ${ticket.name} 様へ呼出通知を送信しました（${nextCallCount}回目）`);
    setTimeout(() => setRecentNotification(null), 5000);
  };

  // Call all currently called tickets at once
  const handleRebroadcastAllCalling = () => {
    if (callingList.length === 0) return;
    const timeStr = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const now = Date.now();

    callingList.forEach(ticket => {
      onUpdateTicket(ticket.id, {
        calledTimestamp: now,
        calledAt: timeStr,
        callCount: (ticket.callCount || 0) + 1
      });
    });

    sounds.unlock();
    sounds.playCallingChime();
    VoiceAnnouncer.speak(`現在お呼出中の方、食堂前の献血バスへお越しください。`);

    setRecentNotification(`お呼出中の受診者全員（${callingList.length}名）へ一括呼出通知を送信しました`);
    setTimeout(() => setRecentNotification(null), 5000);
  };

  // Call the next person in waiting line
  const handleCallNext = () => {
    if (waitingList.length === 0) {
      return;
    }
    const nextTicket = waitingList[0];
    handleCallTicket(nextTicket);
  };

  // Track last action for immediate 1-click Undo
  const [lastAction, setLastAction] = useState<{
    ticket: TicketRecord;
    previousState: Partial<TicketRecord>;
    newStatusLabel: string;
    timerId?: NodeJS.Timeout;
  } | null>(null);

  // Status labels for friendly user feedback
  const statusLabels: Record<QueueStatus, string> = {
    waiting: '待機中',
    called: '呼出中',
    interview: '問診中',
    donating: '採血中',
    resting: '休憩中',
    done: '完了',
    absent: '不在/保留'
  };

  // Change stage quick handler with Undo history
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
    } else {
      updates.attendance = 'absent';
    }
    onUpdateTicket(ticket.id, updates);

    // Clear previous timer if exists
    if (lastAction?.timerId) {
      clearTimeout(lastAction.timerId);
    }

    // Set Undo bar for 8 seconds
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

  // 1-Click Undo handler
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
      {/* Toast Notification */}
      {recentNotification && (
        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-md flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-slate-300" />
            <span>{recentNotification}</span>
          </div>
          <span className="text-[10px] text-slate-400">通知送信完了</span>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              進行管理ボード
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              受診者の呼出・問診・採血・休憩・完了ステータスを一括管理します
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Slot Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="slot-filter-select" className="text-slate-500 font-medium">時間帯:</label>
              <select
                id="slot-filter-select"
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="bg-transparent text-slate-900 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="all">全時間帯 ({tickets.length}名)</option>
                {timeSlots.map(slot => (
                  <option key={slot} value={slot}>
                    {slot} ({tickets.filter(t => t.timeSlot === slot).length}名)
                  </option>
                ))}
              </select>
            </div>

            {/* Estimated Wait */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600">
              <span className="text-slate-400">予想待機:</span>
              <span className="font-bold text-slate-900">約 {estimatedWaitMinutes} 分</span>
            </div>

            {/* Call Next Button */}
            <button
              id="call-next-hero-btn"
              onClick={handleCallNext}
              disabled={waitingList.length === 0}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition ${
                waitingList.length > 0
                  ? 'bg-rose-900 hover:bg-rose-950 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>次の人を呼出 ({waitingList.length}名待機)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Currently Calling Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-amber-600" />
              現在お呼出中 ({callingList.length}名)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {callingList.length > 0 && (
              <button
                onClick={handleRebroadcastAllCalling}
                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95"
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
                    <span className="font-mono font-black text-slate-900 text-base">
                      #{ticket.ticketNumber}
                    </span>
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
                      <h4 className="text-sm font-bold text-slate-900">{ticket.name}</h4>
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
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCallTicket(ticket)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center gap-1 shadow-xs active:scale-95"
                    title="スマホへ呼出通知・チャイム・音声を送信"
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>通知再送</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStageTransition(ticket, 'waiting')}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition"
                    >
                      保留
                    </button>
                    <button
                      onClick={() => handleStageTransition(ticket, 'interview')}
                      className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
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

      {/* 4 Column Stages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stage 1: 待機列 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">① 待機中</h3>
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
              waitingList.map((ticket, idx) => (
                <div 
                  key={ticket.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-bold text-xs text-slate-900">#{ticket.ticketNumber}</span>
                      <span className="text-[10px] text-slate-400">{ticket.timeSlot}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-800">{ticket.name}</div>
                  </div>

                  <button
                    onClick={() => handleCallTicket(ticket)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-900 hover:bg-rose-950 text-white text-[11px] font-bold shadow-xs active:scale-95 transition flex items-center gap-1"
                  >
                    <Megaphone className="w-3 h-3" />
                    呼出
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stage 2: 問診・検査 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">② 問診・検査中</h3>
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
                    <div className="font-bold text-xs text-slate-900">#{ticket.ticketNumber} {ticket.name}</div>
                    <div className="text-[10px] text-slate-500">{ticket.donationType || '400mL'}</div>
                  </div>

                  <button
                    onClick={() => handleStageTransition(ticket, 'donating')}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-[11px] font-bold shadow-xs transition flex items-center gap-1"
                  >
                    <Syringe className="w-3 h-3" />
                    採血へ
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stage 3: 採血中 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">③ 採血中</h3>
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
                    <div className="font-bold text-xs text-slate-900">#{ticket.ticketNumber} {ticket.name}</div>
                    <div className="text-[10px] text-slate-500">{ticket.bloodType ? `${ticket.bloodType}型` : ''} ({ticket.donationType || '400mL'})</div>
                  </div>

                  <button
                    onClick={() => handleStageTransition(ticket, 'resting')}
                    className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold shadow-xs transition flex items-center gap-1"
                  >
                    <Coffee className="w-3 h-3" />
                    休憩へ
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stage 4: 休憩・完了 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">④ 休憩 & 完了</h3>
              <p className="text-[10px] text-slate-400">水分補給・終了</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {restingList.length + doneList.length}名
            </span>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
            {/* Resting list */}
            {restingList.map((ticket) => (
              <div 
                key={ticket.id}
                className="p-3 rounded-xl border border-teal-200 bg-teal-50/40 transition flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900">#{ticket.ticketNumber} {ticket.name}</div>
                  <div className="text-[10px] text-teal-800 font-medium">水分補給中</div>
                </div>

                <button
                  onClick={() => handleStageTransition(ticket, 'done')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold shadow-xs transition flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  完了
                </button>
              </div>
            ))}

            {/* Done list */}
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
                    onClick={() => handleStageTransition(ticket, 'waiting')}
                    className="px-2 py-1 rounded-md text-[10px] text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 transition flex items-center gap-1 cursor-pointer shadow-2xs"
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

      {/* Floating Undo Bar for Accidental Status Changes */}
      {lastAction && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700/80 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium">
              #{lastAction.ticket.ticketNumber} {lastAction.ticket.name} 様を「{lastAction.newStatusLabel}」に変更しました
            </span>
          </div>

          <button
            onClick={handleUndo}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
            title="直前の変更を取り消して元の状態に戻します"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>元に戻す</span>
          </button>

          <button
            onClick={() => setLastAction(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
