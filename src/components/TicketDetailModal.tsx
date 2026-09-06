import React, { useState } from 'react';
import { 
  X, 
  Send, 
  CheckCircle, 
  Droplet, 
  HeartHandshake, 
  Bell, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  PauseCircle, 
  RotateCcw,
  Check
} from 'lucide-react';
import { TicketRecord, QueueStatus, ParentalConsentStatus, SafetyChecklist } from '../types';
import { NotificationManager } from '../utils/notifications';

interface TicketDetailModalProps {
  ticket: TicketRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTicket?: (id: string, partial: Partial<TicketRecord>) => void;
  waitingPosition?: number;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onUpdateTicket,
  waitingPosition = 0
}) => {
  const [notifSent, setNotifSent] = useState(false);
  const [checklistSaved, setChecklistSaved] = useState(false);

  if (!isOpen || !ticket) return null;

  const handleTestPushNotification = async () => {
    await NotificationManager.requestPermission();
    await NotificationManager.sendLocalNotification(
      '献血受付：お呼出テスト',
      `${ticket.name} 様、呼出テスト通知です。食堂前の献血バスまでお越しください。`,
      `call-${ticket.ticketNumber}`
    );
    setNotifSent(true);
    setTimeout(() => setNotifSent(false), 4000);
  };

  const handleStatusChange = (status: QueueStatus) => {
    if (!onUpdateTicket) return;
    const updates: Partial<TicketRecord> = { queueStatus: status };
    if (status === 'called') {
      updates.calledAt = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      updates.calledTimestamp = Date.now();
      updates.callCount = (ticket.callCount || 0) + 1;
    }
    onUpdateTicket(ticket.id, updates);
  };

  const handleConsentChange = (status: ParentalConsentStatus) => {
    if (!onUpdateTicket) return;
    onUpdateTicket(ticket.id, { parentalConsentStatus: status });
  };

  const handleToggleCheckItem = (key: keyof Omit<SafetyChecklist, 'confirmedAt'>) => {
    if (!onUpdateTicket) return;
    const current = ticket.safetyChecklist || {
      mealTaken: false,
      sleepAdequate: false,
      weightQualified: false,
      medicationCleared: false,
      waterHydrated: false
    };
    const updated: SafetyChecklist = {
      ...current,
      [key]: !current[key]
    };
    const allDone = Boolean(
      updated.mealTaken &&
      updated.sleepAdequate &&
      updated.weightQualified &&
      updated.medicationCleared &&
      updated.waterHydrated
    );
    if (allDone) {
      updated.confirmedAt = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }
    onUpdateTicket(ticket.id, { safetyChecklist: updated });
    setChecklistSaved(true);
    setTimeout(() => setChecklistSaved(false), 3000);
  };

  const handleConfirmAllSafety = () => {
    if (!onUpdateTicket) return;
    const timeStr = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const fullChecklist: SafetyChecklist = {
      mealTaken: true,
      sleepAdequate: true,
      weightQualified: true,
      medicationCleared: true,
      waterHydrated: true,
      confirmedAt: timeStr
    };
    onUpdateTicket(ticket.id, { safetyChecklist: fullChecklist });
    setChecklistSaved(true);
    setTimeout(() => setChecklistSaved(false), 3000);
  };

  const isSafetyConfirmed = Boolean(ticket.safetyChecklist?.confirmedAt);
  const checklist = ticket.safetyChecklist;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
              <HeartHandshake className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">献血整理券 詳細</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-rose-800 text-white p-6 shadow-md relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-semibold text-rose-200 tracking-wider uppercase">
                Blood Donation Ticket
              </span>
              <div className="text-4xl font-black font-mono tracking-tight text-white mt-1">
                #{ticket.ticketNumber}
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              ticket.queueStatus === 'called' 
                ? 'bg-amber-400 text-slate-800' 
                : ticket.queueStatus === 'on_hold'
                ? 'bg-amber-500 text-white'
                : ticket.queueStatus === 'done' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-rose-900/80 text-rose-100 border border-rose-700'
            }`}>
              {ticket.queueStatus === 'called' ? '呼出中' : ticket.queueStatus === 'on_hold' ? '保留・不在' : ticket.queueStatus === 'done' ? '完了' : '待機中'}
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-rose-700/60">
            <div className="flex items-center gap-2">
              <h4 className="text-2xl font-bold tracking-tight">{ticket.name} 様</h4>
              {ticket.attribute && (
                <span className="px-2 py-0.5 rounded-md bg-rose-900/80 border border-rose-700 text-rose-100 text-xs font-semibold">
                  {ticket.attribute}
                </span>
              )}
            </div>
            {ticket.kana && <p className="text-xs text-rose-200">{ticket.kana}</p>}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 p-3 rounded-xl bg-rose-900/60 text-xs">
            <div>
              <span className="text-rose-200 text-[10px]">予約時間帯</span>
              <div className="font-bold text-white">{ticket.timeSlot}</div>
            </div>
            <div>
              <span className="text-rose-200 text-[10px]">進行状況</span>
              <div className="font-bold text-amber-200">
                {ticket.queueStatus === 'called' ? '呼出中' : ticket.queueStatus === 'on_hold' ? '保留・一時不在' : ticket.queueStatus === 'done' ? '完了' : `あと約 ${waitingPosition} 番目`}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h5 className="text-xs font-bold text-slate-800">安全確認・同意書ステータス</h5>
            </div>
            {isSafetyConfirmed ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                確認済 ({ticket.safetyChecklist?.confirmedAt})
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-700" />
                未確認
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs bg-white p-3 rounded-xl border border-slate-200">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleToggleCheckItem('mealTaken')}
                className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition cursor-pointer ${
                  checklist?.mealTaken
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${checklist?.mealTaken ? 'text-emerald-700' : 'text-slate-300'}`} />
                <span>食事摂取 (2h以内)</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleCheckItem('sleepAdequate')}
                className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition cursor-pointer ${
                  checklist?.sleepAdequate
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${checklist?.sleepAdequate ? 'text-emerald-700' : 'text-slate-300'}`} />
                <span>睡眠十分 (4h以上)</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleCheckItem('weightQualified')}
                className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition cursor-pointer ${
                  checklist?.weightQualified
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${checklist?.weightQualified ? 'text-emerald-700' : 'text-slate-300'}`} />
                <span>体重基準適合</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleCheckItem('medicationCleared')}
                className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition cursor-pointer ${
                  checklist?.medicationCleared
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${checklist?.medicationCleared ? 'text-emerald-700' : 'text-slate-300'}`} />
                <span>服薬・歯科クリア</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleToggleCheckItem('waterHydrated')}
              className={`w-full p-2 rounded-lg border text-left flex items-center gap-1.5 transition cursor-pointer ${
                checklist?.waterHydrated
                  ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Check className={`w-3.5 h-3.5 ${checklist?.waterHydrated ? 'text-teal-700' : 'text-slate-300'}`} />
              <span>事前水分補給（コップ1〜2杯の水分摂取）</span>
            </button>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                各項目をタップして確認切替
              </span>
              <button
                type="button"
                onClick={handleConfirmAllSafety}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                全項目を確認完了として保存
              </button>
            </div>
          </div>

          {checklistSaved && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>安全確認チェックを保存しました</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              保護者同意書:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleConsentChange('submitted')}
                className={`px-2 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
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
                className={`px-2 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  ticket.parentalConsentStatus === 'unconfirmed' || !ticket.parentalConsentStatus
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                未提出
              </button>
              <button
                type="button"
                onClick={() => handleConsentChange('not_required')}
                className={`px-2 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  ticket.parentalConsentStatus === 'not_required'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                不要
              </button>
            </div>
          </div>

          {onUpdateTicket && (
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">ステータス変更:</span>
              <div className="flex items-center gap-1.5">
                {ticket.queueStatus !== 'on_hold' ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('on_hold')}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    保留・不在
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('called')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    呼出再開
                  </button>
                )}
                {ticket.queueStatus !== 'waiting' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('waiting')}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    待機中に戻す
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-slate-600" />
                呼出プッシュ通知
              </h5>
              <p className="text-[11px] text-slate-500">この端末へ呼出通知をテスト送信</p>
            </div>
            <button
              type="button"
              onClick={handleTestPushNotification}
              className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold transition flex items-center gap-1 shadow-xs cursor-pointer"
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

        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
          <div className="font-bold flex items-center gap-1 text-slate-800">
            <Droplet className="w-3.5 h-3.5 text-rose-600" />
            献血前のご案内
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            問診前には十分な水分補給（コップ1〜2杯）をお願いいたします。お呼び出しがありましたら、食堂前の献血バスまでお越しください。
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
