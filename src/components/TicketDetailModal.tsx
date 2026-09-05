import React, { useState } from 'react';
import { TicketRecord, ParentalConsentStatus, QueueStatus } from '../types';
import { 
  X, 
  Clock, 
  CheckCircle, 
  Bell, 
  HeartHandshake, 
  Droplet,
  Send,
  ShieldCheck,
  FileText,
  PauseCircle,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { NotificationManager } from '../utils/notifications';
import { sounds } from '../utils/audio';

interface TicketDetailModalProps {
  ticket: TicketRecord | null;
  isOpen: boolean;
  onClose: () => void;
  waitingPosition?: number;
  onUpdateTicket?: (id: string, partial: Partial<TicketRecord>) => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  isOpen,
  onClose,
  waitingPosition = 1,
  onUpdateTicket
}) => {
  const [notifSent, setNotifSent] = useState(false);

  if (!isOpen || !ticket) return null;

  const handleTestPushNotification = async () => {
    sounds.unlock();
    await NotificationManager.sendCallNotification(ticket);
    setNotifSent(true);
    setTimeout(() => setNotifSent(false), 4000);
  };

  const handleConsentChange = (status: ParentalConsentStatus) => {
    if (onUpdateTicket) {
      onUpdateTicket(ticket.id, { parentalConsentStatus: status });
    }
  };

  const handleStatusChange = (status: QueueStatus) => {
    if (onUpdateTicket) {
      onUpdateTicket(ticket.id, { queueStatus: status });
    }
  };

  const isSafetyConfirmed = Boolean(ticket.safetyChecklist?.confirmedAt);
  const checklist = ticket.safetyChecklist;

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
                #{ticket.ticketNumber}
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              ticket.queueStatus === 'called' 
                ? 'bg-amber-500 text-slate-950' 
                : ticket.queueStatus === 'on_hold'
                ? 'bg-amber-600 text-white'
                : ticket.queueStatus === 'done' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}>
              {ticket.queueStatus === 'called' ? '呼出中' : ticket.queueStatus === 'on_hold' ? '保留・不在' : ticket.queueStatus === 'done' ? '完了' : '待機中'}
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
                {ticket.queueStatus === 'called' ? '呼出中' : ticket.queueStatus === 'on_hold' ? '保留・一時不在' : ticket.queueStatus === 'done' ? '完了' : `あと約 ${waitingPosition} 番目`}
              </div>
            </div>
          </div>
        </div>

        {/* Safety & Parental Consent Verification Section (Staff / Admin Check) */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h5 className="text-xs font-bold text-slate-900">安全確認・同意書ステータス</h5>
            </div>
            {isSafetyConfirmed ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                セルフチェック済 ({ticket.safetyChecklist?.confirmedAt})
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                未確認
              </span>
            )}
          </div>

          {/* Safety Checklist Items Grid */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5">
              <span className={checklist?.mealTaken ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                {checklist?.mealTaken ? '✓' : '○'} 食事摂取
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={checklist?.sleepAdequate ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                {checklist?.sleepAdequate ? '✓' : '○'} 睡眠十分
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={checklist?.weightQualified ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                {checklist?.weightQualified ? '✓' : '○'} 体重適合
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={checklist?.medicationCleared ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                {checklist?.medicationCleared ? '✓' : '○'} 服薬問題なし
              </span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <span className={checklist?.waterHydrated ? 'text-cyan-600 font-bold' : 'text-slate-400'}>
                {checklist?.waterHydrated ? '✓' : '○'} 水分補給済
              </span>
            </div>
          </div>

          {/* Parental Consent Buttons */}
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              保護者同意書:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleConsentChange('submitted')}
                className={`px-2 py-1 rounded-lg text-xs font-bold border transition ${
                  ticket.parentalConsentStatus === 'submitted'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                提出済
              </button>
              <button
                type="button"
                onClick={() => handleConsentChange('unconfirmed')}
                className={`px-2 py-1 rounded-lg text-xs font-bold border transition ${
                  ticket.parentalConsentStatus === 'unconfirmed' || !ticket.parentalConsentStatus
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                未提出
              </button>
              <button
                type="button"
                onClick={() => handleConsentChange('not_required')}
                className={`px-2 py-1 rounded-lg text-xs font-bold border transition ${
                  ticket.parentalConsentStatus === 'not_required'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                不要
              </button>
            </div>
          </div>

          {/* On-hold / Resume Actions */}
          {onUpdateTicket && (
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">ステータス変更:</span>
              <div className="flex items-center gap-1.5">
                {ticket.queueStatus !== 'on_hold' ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('on_hold')}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition flex items-center gap-1"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    保留・不在
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('called')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition flex items-center gap-1 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    呼出再開
                  </button>
                )}
                {ticket.queueStatus !== 'waiting' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('waiting')}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 transition flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    待機中に戻す
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Push Notification Test Action */}
        <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
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
            問診前には十分な水分補給（コップ1〜2杯）をお願いいたします。お呼び出しがありましたら、食堂前の献血バスまでお越しください。
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
