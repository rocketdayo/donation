import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Moon, 
  Utensils, 
  UserCheck, 
  Scale, 
  FileText, 
  Activity, 
  Heart, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';

interface DonationGuidelinesProps {
  defaultExpanded?: boolean;
  showTitle?: boolean;
  className?: string;
}

export const DonationGuidelines: React.FC<DonationGuidelinesProps> = ({
  defaultExpanded = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs ${className}`}>
      {/* Calm White Card Header */}
      <div className="p-5 border-b border-slate-100 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold tracking-wide border border-slate-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>2026年度 文化祭 献血</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              参加基準・準備・注意事項
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>日時: 文化祭当日</span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>場所: 食堂前（献血バス）</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 transition flex items-center gap-1.5 text-xs font-semibold flex-shrink-0 cursor-pointer"
            aria-label={isExpanded ? '詳細を折りたたむ' : '詳細を展開する'}
          >
            <span>{isExpanded ? '折りたたむ' : '詳細を見る'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Expandable Body with Calm White/Neutral Styling */}
      {isExpanded && (
        <div className="p-5 space-y-5 bg-white">
          {/* 1. 参加基準・準備 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <ClipboardCheck className="w-4 h-4 text-slate-600" />
              <h4 className="font-bold text-slate-800 text-xs tracking-wide">
                参加基準・事前準備
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 年齢 */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white border border-slate-200/90 text-slate-700 flex-shrink-0 shadow-2xs">
                  <UserCheck className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">年齢基準</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    16歳以上
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ※15歳以下の方は献血できません
                  </p>
                </div>
              </div>

              {/* 体重 */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white border border-slate-200/90 text-slate-700 flex-shrink-0 shadow-2xs">
                  <Scale className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">体重基準</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    男性 45kg以上 / 女性 40kg以上
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    安全のため基準体重が必要です
                  </p>
                </div>
              </div>

              {/* 睡眠 */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white border border-slate-200/90 text-slate-700 flex-shrink-0 shadow-2xs">
                  <Moon className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">前日の睡眠</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    5時間以上
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    体調を整えるため十分な睡眠をおとりください
                  </p>
                </div>
              </div>

              {/* 食事 */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white border border-slate-200/90 text-slate-700 flex-shrink-0 shadow-2xs">
                  <Utensils className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">当日の食事</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    朝食・昼食を必ず摂取
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    空腹時の献血は避けてください
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. 注意事項 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h4 className="font-bold text-slate-800 text-xs tracking-wide">
                重要注意事項
              </h4>
            </div>

            <div className="space-y-2.5">
              {/* 保護者承諾書 */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/90 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 flex-shrink-0 shadow-2xs">
                  <FileText className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>保護者承諾書が必要</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-800 text-[10px] font-semibold">必須</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    生徒・未成年の方は事前に保護者の方の承諾書をご用意の上、受付時にお持ちください。
                  </p>
                </div>
              </div>

              {/* 運動部の部活動参加不可 */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/90 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 flex-shrink-0 shadow-2xs">
                  <Activity className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>運動部の方は献血後、部活動に参加できません</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">注意</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    献血当日は激しい運動を避ける必要があります。運動部所属の方は当日の部活動（練習・試合等）への参加ができません。
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. メッセージ (申込方法は削除し、落ち着いたメッセージ欄のみ) */}
          <div className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/70 text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
            <Heart className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <span>
              あなたの行動が、誰かの命を支えます。献血は、今できる身近な社会貢献です。特別な準備や知識は必要ありません。少しの時間で、多くの人の助けになります。
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
