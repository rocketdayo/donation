import React, { useState, useMemo } from 'react';
import { TicketRecord } from '../types';
import { 
  Search, 
  Clock, 
  Bell, 
  BellRing, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Mail, 
  ChevronRight,
  Send,
  Sparkles,
  QrCode
} from 'lucide-react';
import { NotificationManager } from '../utils/notifications';
import { sounds } from '../utils/audio';

interface MyTicketViewProps {
  tickets: TicketRecord[];
  notificationPermission: NotificationPermission;
  onReqNotifications: () => void;
  onSwitchToAdmin?: () => void;
}

export const MyTicketView: React.FC<MyTicketViewProps> = ({
  tickets,
  notificationPermission,
  onReqNotifications,
  onSwitchToAdmin
}) => {
  // Email search or ticket selector
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string>(() => {
    // Default to the first active or called ticket, or ticket #5
    const called = tickets.find(t => t.queueStatus === 'called');
    if (called) return called.id;
    return tickets[4]?.id || tickets[0]?.id || '';
  });
  const [notifSent, setNotifSent] = useState(false);

  // Filter or match by email input
  const matchedTicketsByEmail = useMemo(() => {
    const query = searchEmail.trim().toLowerCase();
    if (!query) return [];
    return tickets.filter(t => t.email.toLowerCase().includes(query) || t.name.toLowerCase().includes(query));
  }, [tickets, searchEmail]);

  // Current active ticket
  const currentTicket = useMemo(() => {
    if (matchedTicketsByEmail.length > 0) {
      return matchedTicketsByEmail[0];
    }
    return tickets.find(t => t.id === selectedTicketId) || tickets[0];
  }, [tickets, selectedTicketId, matchedTicketsByEmail]);

  // Currently called tickets
  const currentlyCalled = tickets.filter(t => t.queueStatus === 'called');
  
  // Waiting queue calculation
  const waitingTickets = tickets.filter(t => t.queueStatus === 'waiting' && t.attendance !== 'absent');
  const myQueuePosition = currentTicket && currentTicket.queueStatus === 'waiting'
    ? waitingTickets.findIndex(t => t.id === currentTicket.id) + 1
    : 0;

  // Status visual mapping
  const getStatusDisplay = (ticket: TicketRecord) => {
    switch (ticket.queueStatus) {
      case 'called':
        return {
          title: 'お呼出中です',
          description: '献血受付・問診カウンターへお進みください',
          badge: '呼出中',
          bgClass: 'bg-amber-500 text-slate-950',
          borderClass: 'border-amber-400',
          cardBg: 'bg-amber-50/50'
        };
      case 'interview':
        return {
          title: '問診・検査中',
          description: '医師による問診およびヘモグロビン検査を行っています',
          badge: '問診中',
          bgClass: 'bg-blue-600 text-white',
          borderClass: 'border-blue-400',
          cardBg: 'bg-blue-50/40'
        };
      case 'donating':
        return {
          title: '採血中',
          description: '献血バスまたはベッドにて採血を行っています',
          badge: '採血中',
          bgClass: 'bg-rose-700 text-white',
          borderClass: 'border-rose-400',
          cardBg: 'bg-rose-50/40'
        };
      case 'resting':
        return {
          title: '休憩・水分補給中',
          description: '採血後の体調安定のため、十分な水分補給とご休憩をお願いします',
          badge: '休憩中',
          bgClass: 'bg-teal-600 text-white',
          borderClass: 'border-teal-400',
          cardBg: 'bg-teal-50/40'
        };
      case 'done':
        return {
          title: '本日の献血完了',
          description: '温かいご協力ありがとうございました',
          badge: '完了',
          bgClass: 'bg-slate-800 text-white',
          borderClass: 'border-slate-300',
          cardBg: 'bg-slate-50'
        };
      case 'absent':
        return {
          title: '欠席・キャンセル',
          description: '受付はキャンセルされました',
          badge: '欠席',
          bgClass: 'bg-slate-400 text-white',
          borderClass: 'border-slate-200',
          cardBg: 'bg-slate-50'
        };
      default: // waiting
        return {
          title: myQueuePosition > 0 ? `順番待ち中（あと約 ${myQueuePosition} 番目）` : '待機中',
          description: 'お呼び出しまで待機ロビーにてお待ちください',
          badge: '待機中',
          bgClass: 'bg-slate-700 text-white',
          borderClass: 'border-slate-200',
          cardBg: 'bg-slate-50/70'
        };
    }
  };

  const statusInfo = currentTicket ? getStatusDisplay(currentTicket) : null;

  const handleTestPush = async () => {
    if (!currentTicket) return;
    sounds.playCallingChime();
    await NotificationManager.sendPushNotification(
      currentTicket.id,
      currentTicket.email,
      currentTicket.name,
      `【献血呼出】整理券番号 #${currentTicket.ticketNumber} の番です`,
      `${currentTicket.name}様、献血受付カウンターへお越しください。`
    );
    setNotifSent(true);
    setTimeout(() => setNotifSent(false), 4000);
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 px-1 py-2">
      {/* Search / Email Match Input */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          登録メールアドレスまたはお名前で整理券を照会:
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="例: email@example.com または 氏名"
            className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900 transition"
          />
        </div>

        {/* Quick select dropdown if not searching */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500">整理券一覧から選択:</span>
          <select
            value={currentTicket?.id || ''}
            onChange={(e) => {
              setSelectedTicketId(e.target.value);
              setSearchEmail('');
              sounds.playClick();
            }}
            className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-hidden cursor-pointer max-w-[240px] truncate"
          >
            {tickets.map(t => (
              <option key={t.id} value={t.id}>
                #{String(t.ticketNumber).padStart(2, '0')} {t.name} ({t.timeSlot})
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentTicket && statusInfo && (
        <>
          {/* Main Elegantly Designed Ticket Card */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            {/* Upper Premium Header */}
            <div className="bg-slate-900 text-white p-6 relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                    Blood Donation Ticket
                  </span>
                  <div className="text-xs text-slate-300 mt-0.5">
                    献血整理券
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-xs ${statusInfo.bgClass}`}>
                  {statusInfo.badge}
                </span>
              </div>

              {/* Huge Clean Ticket Number */}
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-slate-400 text-sm font-medium">整理券番号</span>
                <span className="text-5xl sm:text-6xl font-black tracking-tight font-mono text-white">
                  #{String(currentTicket.ticketNumber).padStart(3, '0')}
                </span>
              </div>
            </div>

            {/* Middle Attendee Info */}
            <div className="p-6 space-y-4">
              {/* Name & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-xs text-slate-400 font-medium">お名前</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {currentTicket.name} <span className="text-xs font-normal text-slate-500">様</span>
                  </div>
                  {currentTicket.kana && (
                    <div className="text-[11px] text-slate-400">{currentTicket.kana}</div>
                  )}
                </div>

                <div>
                  <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    ご予約時間帯
                  </div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">
                    {currentTicket.timeSlot}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {currentTicket.scheduledDate}
                  </div>
                </div>
              </div>

              {/* Progress & Current Call Status Box */}
              <div className={`p-4 rounded-2xl border ${statusInfo.cardBg} ${statusInfo.borderClass} space-y-2`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-700" />
                    現在の進行状況
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    {statusInfo.title}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {statusInfo.description}
                </p>

                {/* Live Call Reference */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500">現在のお呼出番号:</span>
                  <span className="font-bold text-slate-900">
                    {currentlyCalled.length > 0 
                      ? currentlyCalled.map(c => `#${c.ticketNumber}`).join(', ')
                      : '現在呼出なし'}
                  </span>
                </div>

                {currentTicket.queueStatus === 'waiting' && myQueuePosition > 0 && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">あなたの前の待機人数:</span>
                    <span className="font-bold text-slate-900">あと {myQueuePosition - 1} 名</span>
                  </div>
                )}
              </div>

              {/* Optional Donation Type if configured */}
              {(currentTicket.bloodType || currentTicket.donationType) && (
                <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                  {currentTicket.bloodType && (
                    <span>血液型: <strong>{currentTicket.bloodType}型</strong></span>
                  )}
                  {currentTicket.donationType && (
                    <span>区分: <strong>{currentTicket.donationType}</strong></span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notification Permission Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    呼出通知（プッシュ通知）
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    順番が来ると画面や端末に通知が届きます
                  </p>
                </div>
              </div>

              {notificationPermission !== 'granted' ? (
                <button
                  onClick={onReqNotifications}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-1 shadow-xs flex-shrink-0"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  通知を有効化
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1 flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  通知有効
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">端末へのテスト通知:</span>
              <button
                onClick={handleTestPush}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition flex items-center gap-1"
              >
                <Send className="w-3 h-3 text-slate-600" />
                テスト通知
              </button>
            </div>

            {notifSent && (
              <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                通知を送信しました
              </p>
            )}
          </div>

          {/* Pre-donation advice */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-800">
              献血ご協力にあたって
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              問診前には十分な水分補給（コップ1〜2杯）をお願いいたします。受付にてお呼び出しがありましたら、カウンターまでお越しください。
            </p>
          </div>
        </>
      )}
    </div>
  );
};
