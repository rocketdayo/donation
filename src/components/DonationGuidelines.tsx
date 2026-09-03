import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  CheckCircle2, 
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
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface DonationGuidelinesProps {
  defaultExpanded?: boolean;
  showTitle?: boolean;
  className?: string;
}

export const DonationGuidelines: React.FC<DonationGuidelinesProps> = ({
  defaultExpanded = true,
  showTitle = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs ${className}`}>
      {/* Card Header / Banner */}
      <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide backdrop-blur-xs">
              <Sparkles className="w-3 h-3" />
              <span>2026年度 文化祭 献血</span>
            </div>
            <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              参加基準・事前準備・注意事項
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-rose-100 pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <strong>日時:</strong> 文化祭当日
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <strong>場所:</strong> 食堂前（献血バス）
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1 text-xs font-semibold flex-shrink-0 cursor-pointer"
            aria-label={isExpanded ? '詳細を閉じる' : '詳細を開く'}
          >
            <span className="hidden sm:inline">{isExpanded ? '閉じる' : '確認する'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="p-5 space-y-6">
          {/* 1. 参加基準・準備 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">
                参加基準・準備
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 年齢 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white border border-slate-200 text-rose-600 flex-shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">年齢基準</div>
                  <div className="text-sm font-black text-rose-600 mt-0.5">
                    16歳以上
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ※15歳以下の方は献血できません
                  </p>
                </div>
              </div>

              {/* 体重 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white border border-slate-200 text-rose-600 flex-shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">体重基準</div>
                  <div className="text-sm font-black text-rose-600 mt-0.5">
                    男性 45kg以上 / 女性 40kg以上
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    基準を満たしている必要があります
                  </p>
                </div>
              </div>

              {/* 睡眠 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white border border-slate-200 text-indigo-600 flex-shrink-0">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">睡眠時間</div>
                  <div className="text-sm font-black text-slate-800 mt-0.5">
                    前日 5時間以上
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    体調管理のため十分な睡眠をとってください
                  </p>
                </div>
              </div>

              {/* 食事 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white border border-slate-200 text-amber-600 flex-shrink-0">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">当日の食事</div>
                  <div className="text-sm font-black text-slate-800 mt-0.5">
                    朝食・昼食を必ず摂取
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    空腹状態での献血はご遠慮ください
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. 注意事項 (赤枠強調) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-rose-100">
              <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-rose-900 text-sm">
                重要注意事項
              </h4>
            </div>

            <div className="space-y-2.5">
              {/* 保護者承諾書 */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-white border border-rose-200 text-rose-600 flex-shrink-0 shadow-2xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                    <span>保護者承諾書が必要</span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-200 text-rose-900 text-[10px] font-bold">必須</span>
                  </div>
                  <p className="text-xs text-rose-900/90 mt-1 leading-relaxed">
                    生徒・未成年の方は事前に保護者の方の承諾書をご用意の上、受付時にお持ちください。
                  </p>
                </div>
              </div>

              {/* 運動部の部活動参加不可 */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-white border border-rose-200 text-rose-600 flex-shrink-0 shadow-2xs">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                    <span>運動部の方は献血後、部活動に参加できません</span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-200 text-rose-900 text-[10px] font-bold">注意</span>
                  </div>
                  <p className="text-xs text-rose-900/90 mt-1 leading-relaxed">
                    献血当日は激しい運動を避ける必要があります。運動部所属の方は、献血当日の部活動（練習・試合等）への参加ができません。日程をご確認ください。
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. 申込方法 & メッセージ */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">申込方法:</span>
              <span className="font-semibold text-slate-600">Google Forms（Classroomに投稿予定）</span>
            </div>
            <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2">
              <Heart className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>
                あなたの行動が、誰かの命を支えます。献血は、今できる身近な社会貢献です。特別な準備や知識は必要ありません。少しの時間で、多くの人の助けになります。
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
