import React, { useState } from 'react';
import { TicketRecord } from '../types';
import { 
  X, 
  Clock, 
  CheckCircle, 
  Bell, 
  HeartHandshake, 
  Droplet,
  Send
} from 'lucide-react';
import { NotificationManager } from '../utils/notifications';
import { sounds } from '../utils/audio';

interface TicketDetailModalProps {
  ticket: TicketRecord | null;
  isOpen: boolean;
  onClose: () => void;
  waitingPosition?: number;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  isOpen,
  onClose,
  waitingPosition = 1,
}) => {
  const [notifSent, setNotifSent] = useState(false);

  if (!isOpen || !ticket) return null;

  const handleTestPushNotification = async () => {
    sounds.playCallingChime();
    await NotificationManager.sendPushNotification(
      ticket.id,
      ticket.email,
      ticket.name,
      `【献血整理券】#${ticket.ticketNumber} まもなく受付です`,
      `${ticket.name}様、ご予約時間(${ticket.timeSlot})になりました。受付カウンターへお越しください。`
    );
    setNotifSent(true);
    setTimeout(() => setNotifSent(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <HeartHandshake className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">献血整理券 詳細</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Digital Ticket Card */}
        <div className="mt-4 rounded-2xl bg-slate-900 text-white p-6 shadow-md relative overflow-hidden">
          {/* Top Ticket Details */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                Blood Donation Ticket
              </span>
              <div className="text-4xl font-black font-mono tracking-tight text-white mt-1">
                #{String(ticket.ticketNumber).padStart(3, '0')}
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
              {ticket.queueStatus === 'called' ? '呼出中' : ticket.queueStatus === 'done' ? '完了' : '待機中'}
            </span>
          </div>

          {/* Attendee Name */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <h4 className="text-2xl font-bold tracking-tight">{ticket.name} 様</h4>
              {ticket.attribute && (
                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
                  {ticket.attribute}
                </span>
              )}
            </div>
            {ticket.kana && <p className="text-xs text-slate-400">{ticket.kana}</p>}
          </div>

          {/* Time Slot & Status */}
          <div className="mt-4 grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400 text-[10px]">予約時間帯</span>
              <div className="font-bold text-slate-100">{ticket.timeSlot}</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">進行状況</span>
              <div className="font-bold text-amber-300">
                {ticket.queueStatus === 'called' ? '呼出中' : ticket.queueStatus === 'done' ? '完了' : `あと約 ${waitingPosition} 番目`}
              </div>
            </div>
          </div>
        </div>

        {/* Push Notification Test Action */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-slate-600" />
                呼出プッシュ通知
              </h5>
              <p className="text-[11px] text-slate-500">この端末へ呼出通知をテスト送信</p>
            </div>
            <button
              onClick={handleTestPushNotification}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-1 shadow-xs"
            >
              <Send className="w-3 h-3" />
              送信
            </button>
          </div>
          {notifSent && (
            <p className="text-[11px] text-emerald-700 font-semibold mt-2 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              通知を送信しました
            </p>
          )}
        </div>

        {/* Health Checklist */}
        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
          <div className="font-bold flex items-center gap-1 text-slate-900">
            <Droplet className="w-3.5 h-3.5 text-rose-600" />
            献血前のご案内
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            問診前には十分な水分補給（コップ1〜2杯）をお願いいたします。
          </p>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
