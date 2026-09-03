import React from 'react';
import { 
  HeartHandshake, 
  Users, 
  Clock, 
  FileSpreadsheet, 
  Volume2, 
  VolumeX, 
  ShieldCheck,
  User,
  ClipboardCheck
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { VoiceAnnouncer } from '../utils/speech';

interface HeaderProps {
  isAdminMode: boolean;
  setIsAdminMode: (admin: boolean) => void;
  adminTab: 'queue' | 'slots';
  setAdminTab: (tab: 'queue' | 'slots') => void;
  onOpenSpreadsheet: () => void;
  onOpenGuidelines: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  notificationPermission: NotificationPermission;
  onReqNotifications: () => void;
  waitingCount: number;
  callingCount: number;
  completedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isAdminMode,
  setIsAdminMode,
  adminTab,
  setAdminTab,
  onOpenSpreadsheet,
  onOpenGuidelines,
  soundEnabled,
  setSoundEnabled,
  notificationPermission,
  onReqNotifications,
  waitingCount,
  callingCount,
  completedCount,
}) => {
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setEnabled(next);
    VoiceAnnouncer.setEnabled(next);
    if (next) sounds.playClick();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <img 
              src="/donation_icon.jpg" 
              alt="献血ロゴ" 
              className="w-9 h-9 rounded-xl object-contain object-center border border-slate-200 bg-white p-0.5 shadow-xs flex-shrink-0" 
              referrerPolicy="no-referrer" 
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 truncate">
                献血整理券＆受付管理システム
                {isAdminMode && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    管理者画面
                  </span>
                )}
              </h1>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Guidelines & Requirements Button */}
            <button
              onClick={onOpenGuidelines}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition cursor-pointer"
              title="参加基準・準備・注意事項を確認"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>参加基準・注意</span>
            </button>

            {isAdminMode ? (
              <>
                {/* Admin Status summary */}
                <div className="hidden lg:flex items-center gap-2 mr-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                    呼出中: {callingCount}名
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                    待機中: {waitingCount}名
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                    完了: {completedCount}名
                  </span>
                </div>

                {/* Sound Toggle */}
                <button
                  onClick={toggleSound}
                  className={`p-2 rounded-lg text-xs border transition ${
                    soundEnabled
                      ? 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
                  title={soundEnabled ? '音声案内: ON' : '音声案内: OFF'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                </button>

                {/* Spreadsheet Sync Button */}
                <button
                  onClick={onOpenSpreadsheet}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>スプレッドシート連携</span>
                </button>

                {/* Switch to User view */}
                <button
                  onClick={() => setIsAdminMode(false)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
                  title="受診者用の整理券画面へ切り替え"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">受診者画面へ</span>
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Tab Navigation for Admin */}
        {isAdminMode && (
          <div className="flex items-center border-t border-slate-100 mt-2.5 pt-2">
            <nav className="flex items-center gap-2">
              <button
                onClick={() => setAdminTab('queue')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  adminTab === 'queue'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                進行管理ボード
              </button>

              <button
                onClick={() => setAdminTab('slots')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  adminTab === 'slots'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4" />
                時間帯別予約状況
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
