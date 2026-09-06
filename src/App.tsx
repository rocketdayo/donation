import React, { useState, useEffect } from 'react';
import { 
  TicketRecord, 
  AdminTabType 
} from './types';
import { 
  loadTicketsFromStorage, 
  saveTicketsToStorage
} from './utils/storage';
import { sounds } from './utils/audio';
import { NotificationManager } from './utils/notifications';
import { 
  testConnection, 
  subscribeToTickets, 
  updateFirestoreTicket, 
  syncAllTicketsToFirestore,
  subscribeToSyncSettings,
  subscribeAuthSession,
  logoutAdmin,
  SyncSettings
} from './firebase';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useNetworkSync } from './hooks/useNetworkSync';

import { Header } from './components/Header';
import { MyTicketView } from './components/MyTicketView';
import { LiveQueueBoard } from './components/LiveQueueBoard';
import { TimeSlotGrid } from './components/TimeSlotGrid';
import { AdminLotteryRoster } from './components/AdminLotteryRoster';
import { SpreadsheetSyncModal } from './components/SpreadsheetSyncModal';
import { TicketDetailModal } from './components/TicketDetailModal';
import { DonationGuidelinesModal } from './components/DonationGuidelinesModal';
import { Footer } from './components/Footer';
import { AdminAuthModal } from './components/AdminAuthModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { LoadingScreen } from './components/LoadingScreen';

export const App: React.FC = () => {
  const [tickets, setTickets] = useState<TicketRecord[]>(() => loadTicketsFromStorage());
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<AdminTabType>('queue');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<TicketRecord | null>(null);
  const [, setSyncSettings] = useState<SyncSettings | null>(() => {
    const localUrl = localStorage.getItem('blood_donation_sheet_url') || 'https://rocketdayo.github.io/donation/';
    return { sheetUrl: localUrl, autoSync: true, intervalSec: 60 };
  });

  const networkSync = useNetworkSync((updatedTickets) => {
    setTickets(updatedTickets);
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1500);

    testConnection().then((ok) => {
      setIsFirebaseConnected(ok);
    });

    const unsubscribe = subscribeToTickets(
      (firestoreTickets) => {
        setTickets(firestoreTickets);
        saveTicketsToStorage(firestoreTickets);
        setIsFirebaseConnected(true);
        setIsInitialLoading(false);
        networkSync.recordSyncTimestamp();
      },
      (err) => {
        console.warn('Firestore subscription offline, using cached tickets:', err);
        setIsInitialLoading(false);
      }
    );

    const unsubSettings = subscribeToSyncSettings((settings) => {
      if (settings) {
        setSyncSettings(settings);
      }
    });

    const unsubAuth = subscribeAuthSession((user) => {
      if (!user) {
        setIsAdminMode(false);
      } else {
        setIsAdminMode(true);
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
      unsubSettings();
      unsubAuth();
    };
  }, [networkSync]);

  const mergeSheetTicketsWithExisting = (
    fetched: TicketRecord[],
    current: TicketRecord[]
  ): TicketRecord[] => {
    const currentMap = new Map<string, TicketRecord>(current.map(t => [t.id, t]));
    const emailMap = new Map<string, TicketRecord>();
    current.forEach(t => {
      if (t.email && t.email.trim()) {
        emailMap.set(t.email.trim().toLowerCase(), t);
      }
    });

    return fetched.map(item => {
      const existing = currentMap.get(item.id) || (item.email ? emailMap.get(item.email.trim().toLowerCase()) : undefined);
      if (!existing) {
        return item;
      }

      let finalQueueStatus = item.queueStatus;
      let finalAttendance = item.attendance;

      if (item.queueStatus === 'waiting' && item.attendance === 'absent') {
        if (existing.queueStatus !== 'waiting') {
          finalQueueStatus = existing.queueStatus;
          finalAttendance = existing.attendance;
        }
      } else {
        finalQueueStatus = item.queueStatus;
        finalAttendance = item.attendance;
      }

      const isDone = finalQueueStatus === 'done' || finalAttendance === 'completed';

      return {
        ...item,
        queueStatus: finalQueueStatus,
        attendance: finalAttendance,
        calledAt: existing.calledAt || item.calledAt,
        completedAt: isDone 
          ? (existing.completedAt || item.completedAt || new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })) 
          : existing.completedAt,
        lotteryResult: item.lotteryResult || existing.lotteryResult || '',
        notes: item.notes || existing.notes || ''
      };
    });
  };

  useEffect(() => {
    const handleGesture = () => {
      sounds.unlock();
    };
    window.addEventListener('click', handleGesture, { passive: true });
    window.addEventListener('touchstart', handleGesture, { passive: true });
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, []);

  const handleRequestNotification = async () => {
    sounds.unlock();
    const perm = await NotificationManager.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      sounds.playCallingChime();
      await NotificationManager.sendLocalNotification(
        '献血整理券の通知設定が完了しました',
        'お呼出時にこちらの端末へお知らせが届きます。',
        'donation-setup-notification'
      );
    }
  };

  const handleUpdateTicket = async (id: string, partial: Partial<TicketRecord>) => {
    setTickets(prev => {
      const next = prev.map(t => {
        if (t.id === id) {
          return { ...t, ...partial };
        }
        return t;
      });
      saveTicketsToStorage(next);
      return next;
    });

    try {
      await updateFirestoreTicket(id, partial);
    } catch (err) {
      console.error('Failed to update ticket in Firestore:', err);
    }
  };

  const handleImportTickets = async (newTickets: TicketRecord[]) => {
    const merged = mergeSheetTicketsWithExisting(newTickets, tickets);
    setTickets(merged);
    saveTicketsToStorage(merged);
    try {
      await syncAllTicketsToFirestore(merged);
    } catch (err) {
      console.error('Failed to sync imported tickets to Firestore:', err);
    }
  };

  const handleResetData = async () => {
    if (window.confirm('受診者データをすべて消去しますか？')) {
      setTickets([]);
      saveTicketsToStorage([]);
      try {
        await syncAllTicketsToFirestore([]);
      } catch (err) {
        console.error('Failed to clear Firestore tickets:', err);
      }
    }
  };

  const handleExitAdminMode = async () => {
    await logoutAdmin();
    setIsAdminMode(false);
  };

  const waitingCount = tickets.filter(t => t.queueStatus === 'waiting').length;
  const callingCount = tickets.filter(t => t.queueStatus === 'called').length;
  const completedCount = tickets.filter(t => t.queueStatus === 'done').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-rose-100 selection:text-rose-800 pb-12">
      <Header
        isAdminMode={isAdminMode}
        setIsAdminMode={(mode) => {
          if (!mode) {
            handleExitAdminMode();
          } else {
            setIsAdminMode(true);
          }
        }}
        adminTab={adminTab}
        setAdminTab={setAdminTab}
        onOpenSpreadsheet={() => setIsSpreadsheetOpen(true)}
        onOpenGuidelines={() => setIsGuidelinesOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        notificationPermission={notificationPermission}
        onReqNotifications={handleRequestNotification}
        waitingCount={waitingCount}
        callingCount={callingCount}
        completedCount={completedCount}
        isFirebaseConnected={isFirebaseConnected}
        ticketCount={tickets.length}
        isOnline={networkSync.isOnline}
        lastSyncedAt={networkSync.lastSyncedAt}
        isResyncing={networkSync.isResyncing}
        onManualResync={networkSync.manualResync}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        {networkSync.syncMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs shadow-xs animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span className="font-bold text-emerald-800">{networkSync.syncMessage}</span>
            </div>
            {networkSync.lastSyncedAt && (
              <span className="text-[11px] text-emerald-700 font-medium">
                最終更新: {networkSync.lastSyncedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}

        {!networkSync.isOnline && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <WifiOff className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <div>
                <div className="font-bold">電波不良・オフラインで動作しています</div>
                <div className="text-[11px] text-amber-800">
                  操作内容は端末内に安全に保持され、電波回復時に自動でクラウドへ同期されます。
                  {networkSync.lastSyncedAt && `（最終同期: ${networkSync.lastSyncedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}）`}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => networkSync.manualResync()}
              disabled={networkSync.isResyncing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50 flex-shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${networkSync.isResyncing ? 'animate-spin' : ''}`} />
              <span>{networkSync.isResyncing ? '再同期中' : '再同期を試みる'}</span>
            </button>
          </div>
        )}

        {isInitialLoading && tickets.length === 0 ? (
          <LoadingScreen onSkip={() => setIsInitialLoading(false)} />
        ) : !isAdminMode ? (
          <MyTicketView
            tickets={tickets}
            notificationPermission={notificationPermission}
            onReqNotifications={handleRequestNotification}
            onSwitchToAdmin={() => setIsAdminAuthOpen(true)}
            isLoading={isInitialLoading}
            onUpdateTicket={handleUpdateTicket}
            isOnline={networkSync.isOnline}
            lastSyncedAt={networkSync.lastSyncedAt}
            isResyncing={networkSync.isResyncing}
            onManualResync={networkSync.manualResync}
          />
        ) : (
          <>
            {adminTab === 'queue' && (
              <LiveQueueBoard
                tickets={tickets}
                onUpdateTicket={handleUpdateTicket}
                onOpenTicketDetail={(t) => setDetailTicket(t)}
              />
            )}

            {adminTab === 'slots' && (
              <TimeSlotGrid
                tickets={tickets}
              />
            )}

            {adminTab === 'lottery' && (
              <AdminLotteryRoster
                tickets={tickets}
                onUpdateLotteryResult={(ticketId, result) => handleUpdateTicket(ticketId, { lotteryResult: result })}
                onUpdateTicket={handleUpdateTicket}
                onOpenSpreadsheet={() => setIsSpreadsheetOpen(true)}
              />
            )}
          </>
        )}
      </main>

      <Footer
        isAdminMode={isAdminMode}
        onOpenAdminAuth={() => setIsAdminAuthOpen(true)}
        onExitAdminMode={handleExitAdminMode}
        isFirebaseConnected={isFirebaseConnected}
        onResetData={handleResetData}
      />

      <SpreadsheetSyncModal
        isOpen={isSpreadsheetOpen}
        onClose={() => setIsSpreadsheetOpen(false)}
        tickets={tickets}
        onImportTickets={handleImportTickets}
      />

      <TicketDetailModal
        ticket={detailTicket}
        isOpen={Boolean(detailTicket)}
        onClose={() => setDetailTicket(null)}
        onUpdateTicket={handleUpdateTicket}
      />

      <DonationGuidelinesModal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
      />

      <AdminAuthModal
        isOpen={isAdminAuthOpen}
        onClose={() => setIsAdminAuthOpen(false)}
        onSuccess={() => {
          setIsAdminAuthOpen(false);
          setIsAdminMode(true);
        }}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

export default App;
