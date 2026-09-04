import React from 'react';
import { Lock, Shield, ArrowRight, RefreshCw } from 'lucide-react';

interface FooterProps {
  isAdminMode: boolean;
  onOpenAdminAuth: () => void;
  onExitAdminMode: () => void;
  isFirebaseConnected: boolean;
  onResetData: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  isAdminMode,
  onOpenAdminAuth,
  onExitAdminMode,
  isFirebaseConnected,
  onResetData,
}) => {
  return (
    <footer className="w-full bg-white border-t border-slate-200/90 mt-16 text-slate-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {/* Top line with system info & status */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-slate-600">
            <span className="font-semibold text-slate-700">献血整理券＆受付管理システム</span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className={`w-2 h-2 rounded-full ${isFirebaseConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
              {isFirebaseConnected ? 'クラウド同期接続中' : 'ローカル稼働中'}
            </span>
          </div>

          {/* Bottom Admin Switch (Only place where admin mode toggle is placed for users) */}
          <div className="flex items-center gap-2">
            {isAdminMode ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onResetData}
                  className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition text-[11px]"
                  title="予約データをすべて消去"
                >
                  データ全消去
                </button>
                <button
                  onClick={onExitAdminMode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>受診者画面へ戻る</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAdminAuth}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 border border-slate-200/80 transition cursor-pointer"
                title="運営関係者専用画面への移行"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>管理者画面</span>
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 pt-4 text-center">
          <p className="text-[11px] text-slate-400 tracking-wide font-normal">
            2026 Seikyo Gakuen High School Culture Festival. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
