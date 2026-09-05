import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, FileText, ChevronDown, ChevronUp, Droplets, Utensils, Moon, Scale, Pill } from 'lucide-react';
import { TicketRecord, SafetyChecklist, ParentalConsentStatus } from '../types';

interface SafetyChecklistCardProps {
  ticket: TicketRecord;
  onUpdateTicket: (id: string, partial: Partial<TicketRecord>) => void;
  isAdmin?: boolean;
}

export const SafetyChecklistCard: React.FC<SafetyChecklistCardProps> = ({
  ticket,
  onUpdateTicket,
  isAdmin = false
}) => {
  const [isOpen, setIsOpen] = useState(!ticket.safetyChecklist?.confirmedAt);
  const [checklist, setChecklist] = useState<SafetyChecklist>(
    ticket.safetyChecklist || {
      mealTaken: false,
      sleepAdequate: false,
      weightQualified: false,
      medicationCleared: false,
      waterHydrated: false
    }
  );
  const [isSaved, setIsSaved] = useState(false);

  const isComplete = Boolean(
    checklist.mealTaken &&
    checklist.sleepAdequate &&
    checklist.weightQualified &&
    checklist.medicationCleared &&
    checklist.waterHydrated
  );

  const isConfirmed = Boolean(ticket.safetyChecklist?.confirmedAt);

  const handleToggle = (key: keyof Omit<SafetyChecklist, 'confirmedAt'>) => {
    setChecklist(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    const timeStr = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const nextChecklist: SafetyChecklist = {
      ...checklist,
      confirmedAt: isComplete ? timeStr : undefined
    };
    onUpdateTicket(ticket.id, {
      safetyChecklist: nextChecklist
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    if (isComplete) {
      setIsOpen(false);
    }
  };

  const handleToggleConsent = (status: ParentalConsentStatus) => {
    onUpdateTicket(ticket.id, {
      parentalConsentStatus: status
    });
  };

  const isStudent = ticket.attribute === '生徒' || (!ticket.attribute && ticket.email.includes('@'));
  const consentStatus = ticket.parentalConsentStatus || (isStudent ? 'unconfirmed' : 'not_required');

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl flex-shrink-0 border ${
            isConfirmed 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">
                献血前の安全セルフチェック
              </h4>
              {isConfirmed ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  確認済
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  問診前要確認
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              安全な採血のため、問診前に5項目の事前確認をお願いします
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          aria-label="セルフチェック詳細を開閉"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Parental Consent Section (Student / Minor reminder) */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
            <span className="text-xs font-bold text-slate-800">
              保護者同意書（生徒・未成年者）
            </span>
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => handleToggleConsent('submitted')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
                  consentStatus === 'submitted'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                提出済
              </button>
              <button
                type="button"
                onClick={() => handleToggleConsent('unconfirmed')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
                  consentStatus === 'unconfirmed'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                未提出
              </button>
              <button
                type="button"
                onClick={() => handleToggleConsent('not_required')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
                  consentStatus === 'not_required'
                    ? 'bg-slate-600 text-white border-slate-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                不要
              </button>
            </div>
          ) : (
            <div>
              {consentStatus === 'submitted' && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  提出確認済
                </span>
              )}
              {consentStatus === 'unconfirmed' && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-700" />
                  未提出（受付で提示）
                </span>
              )}
              {consentStatus === 'not_required' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700">
                  同意書不要
                </span>
              )}
            </div>
          )}
        </div>

        {!isAdmin && consentStatus === 'unconfirmed' && (
          <p className="text-[11px] text-amber-900 leading-relaxed bg-amber-50/80 p-2 rounded-xl border border-amber-200/80">
            ※高校生等の生徒・未成年者の方は、保護者様の同意書（署名済用紙）を受付時に献血バススタッフへご提出ください。
          </p>
        )}
      </div>

      {/* Accordion Content: 5 Check Items */}
      {isOpen && (
        <div className="pt-2 space-y-3 border-t border-slate-100">
          <div className="space-y-2 text-xs">
            {/* 1. Meal */}
            <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-200/60 cursor-pointer transition">
              <input
                type="checkbox"
                checked={Boolean(checklist.mealTaken)}
                onChange={() => handleToggle('mealTaken')}
                className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-amber-600" />
                  <span>直近の食事摂取（空腹防止）</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  直近2時間以内に食事または軽食（パン・おにぎり等）を摂っている
                </p>
              </div>
            </label>

            {/* 2. Sleep */}
            <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-200/60 cursor-pointer transition">
              <input
                type="checkbox"
                checked={Boolean(checklist.sleepAdequate)}
                onChange={() => handleToggle('sleepAdequate')}
                className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>十分な睡眠時間</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  昨晩、4時間以上の睡眠をとっており極端な寝不足ではない
                </p>
              </div>
            </label>

            {/* 3. Weight */}
            <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-200/60 cursor-pointer transition">
              <input
                type="checkbox"
                checked={Boolean(checklist.weightQualified)}
                onChange={() => handleToggle('weightQualified')}
                className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-600" />
                  <span>体重基準の適合</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  200mL献血：男女共40kg以上 ／ 400mL献血：男性50kg以上・女性45kg以上
                </p>
              </div>
            </label>

            {/* 4. Medication */}
            <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-200/60 cursor-pointer transition">
              <input
                type="checkbox"
                checked={Boolean(checklist.medicationCleared)}
                onChange={() => handleToggle('medicationCleared')}
                className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-rose-600" />
                  <span>服薬・歯科治療等の確認</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  当日に抗生剤等の禁止薬を服用していない、3日以内の抜歯等がない
                </p>
              </div>
            </label>

            {/* 5. Hydration */}
            <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-200/60 cursor-pointer transition">
              <input
                type="checkbox"
                checked={Boolean(checklist.waterHydrated)}
                onChange={() => handleToggle('waterHydrated')}
                className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                  <span>事前の水分補給</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  問診・採血前にコップ1〜2杯程度の水分補給（お茶・スポーツドリンク等）を行った
                </p>
              </div>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              {isComplete ? '全5項目チェック完了' : '※該当する項目をすべてチェックしてください'}
            </span>
            <button
              type="button"
              onClick={handleSave}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                isComplete
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isComplete ? '確認完了として保存' : 'チェック内容を保存'}</span>
            </button>
          </div>

          {isSaved && (
            <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-xl border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              安全確認チェックを保存・同期しました
            </p>
          )}
        </div>
      )}
    </div>
  );
};
