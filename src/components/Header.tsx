import React, { useState } from 'react';
import { 
  HeartHandshake, 
  Users, 
  Clock, 
  FileSpreadsheet, 
  Volume2, 
  VolumeX, 
  ShieldCheck,
  User,
  ClipboardCheck,
  Gift,
  RefreshCw
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { AdminTabType } from '../types';
import donationLogo from '../assets/images/donation_app_icon_1788338521568.jpg';

interface HeaderProps {
  isAdminMode: boolean;
  setIsAdminMode: (admin: boolean) => void;
  adminTab: AdminTabType;
  setAdminTab: (tab: AdminTabType) => void;
  onOpenSpreadsheet: () => void;
  onOpenGuidelines: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  notificationPermission: NotificationPermission;
  onReqNotifications: () => void;
  waitingCount: number;
  callingCount: number;
  completedCount: number;
  isFirebaseConnected?: boolean;
  ticketCount?: number;
  isOnline?: boolean;
  lastSyncedAt?: Date | null;
  isResyncing?: boolean;
  onManualResync?: () => Promise<void>;
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
  isFirebaseConnected,
  ticketCount = 0,
  isOnline = true,
  lastSyncedAt,
  isResyncing = false,
  onManualResync,
}) => {
  const [logoError, setLogoError] = useState(false);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setEnabled(next);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            {!logoError ? (
              <img 
                src={donationLogo} 
                alt="献血ロゴ" 
                onError={() => setLogoError(true)}
                className="w-9 h-9 rounded-xl object-cover object-center border border-slate-200 bg-white shadow-xs flex-shrink-0" 
              />
            ) : (
              <div className="w-9 h-9 rounded-xl border border-rose-200 bg-rose-50 flex items-center justify-center shadow-xs flex-shrink-0">
                <HeartHandshake className="w-5 h-5 text-rose-600" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 truncate">
                  献血整理券＆受付管理システム
                  {isAdminMode && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      管理者画面
                    </span>
                  )}
                </h1>
                
                {/* Network connection & sync badge */}
                <div className="flex items-center gap-1.5">
                  {!isOnline ? (
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                      title="電波不通・オフライン（ローカルキャッシュ利用中）"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span>オフライン</span>
                    </span>
                  ) : (
                    <span 
                      className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200"
                      title={lastSyncedAt ? `最終同期: ${lastSyncedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}` : 'リアルタイム同期中'}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>リアルタイム同期中</span>
                    </span>
                  )}

                  {onManualResync && (
                    <button
                      type="button"
                      onClick={onManualResync}
                      disabled={isResyncing}
                      className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition disabled:opacity-40 cursor-pointer"
                      title="最新データを再同期"
                    >
                      <RefreshCw className={`w-3 h-3 ${isResyncing ? 'animate-spin text-rose-700' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
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
                  title={soundEnabled ? '呼出チャイム音: ON' : '呼出チャイム音: OFF'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                </button>

                {/* Spreadsheet Sync & Export Button */}
                <button
                  onClick={onOpenSpreadsheet}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-xs"
                  title="スプレッドシートから名簿を初期読み込み、または結果をエクスポートします"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>名簿読込・結果出力</span>
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

              <button
                onClick={() => setAdminTab('lottery')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  adminTab === 'lottery'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Gift className="w-4 h-4" />
                くじ引き・受付名簿
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
