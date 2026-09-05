import React, { useState, useEffect } from 'react';
import { 
  TicketRecord, 
  AdminTabType 
} from './types';
import { 
  loadTicketsFromStorage, 
  saveTicketsToStorage, 
  SAMPLE_TICKETS,
  INITIAL_TICKETS
} from './utils/storage';
import { sounds } from './utils/audio';
import { NotificationManager } from './utils/notifications';
import { 
  testConnection, 
  subscribeToTickets, 
  updateFirestoreTicket, 
  syncAllTicketsToFirestore,
  subscribeToSyncSettings,
  saveSyncSettings,
  SyncSettings
} from './firebase';
import { fetchGoogleSheetCSV, sendUpdateToGoogleSheet } from './utils/spreadsheet';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useNetworkSync } from './hooks/useNetworkSync';

// Components
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
import { LoadingScreen } from './components/LoadingScreen';

export const App: React.FC = () => {
  // State
  const [tickets, setTickets] = useState<TicketRecord[]>(() => loadTicketsFromStorage());
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<AdminTabType>('queue');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Modals state
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<TicketRecord | null>(null);
  const [syncSettings, setSyncSettings] = useState<SyncSettings | null>(() => {
    const localUrl = localStorage.getItem('blood_donation_sheet_url') || 'https://rocketdayo.github.io/donation/';
    return { sheetUrl: localUrl, autoSync: true, intervalSec: 60 };
  });

  // Real-time network sync hook with offline resilience & manual resync
  const networkSync = useNetworkSync((updatedTickets) => {
    setTickets(updatedTickets);
  });

  // Initialize and subscribe to Firestore
  useEffect(() => {
    // Safety timer: fallback from loading screen after 1.5s if offline/cached
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

    return () => {
      clearTimeout(timer);
      unsubscribe();
      unsubSettings();
    };
  }, [networkSync]);

  // Helper: Merge spreadsheet data with live state, restoring any explicit statuses from spreadsheet
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
      // Find existing record by ID or by email to prevent numbering shift issues
      const existing = currentMap.get(item.id) || (item.email ? emailMap.get(item.email.trim().toLowerCase()) : undefined);
      if (!existing) {
        return item;
      }

      // スプレッドシート側で状態が指定されている場合（問診検査中、呼び出し中、採血中、休憩中、完了など）は、
      // スプレッドシートを正本として優先反映・修復する
      let finalQueueStatus = item.queueStatus;
      let finalAttendance = item.attendance;

      if (item.queueStatus === 'waiting' && item.attendance === 'absent') {
        // スプレッドシート側が待機中の場合: アプリ側ですでに進行中のステータス（呼び出し中など）があれば維持
        if (existing.queueStatus !== 'waiting') {
          finalQueueStatus = existing.queueStatus;
          finalAttendance = existing.attendance;
        }
      } else {
        // スプレッドシートに明示的にステータス（問診検査中、採血中、呼び出し中、休憩中、完了等）が記録されている場合
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

  // Audio Context unlock on initial user gesture (crucial for mobile audio/speech)
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

  // Request Notification Permission
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

  // Update single ticket record (sync to Firestore + optimistic local update, internal app/cloud authoritative)
  const handleUpdateTicket = async (id: string, partial: Partial<TicketRecord>) => {
    // Optimistic local update
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

    // Update in Firestore (all connected staff and participant screens update in real time)
    try {
      await updateFirestoreTicket(id, partial);
    } catch (err) {
      console.error('Failed to update ticket in Firestore:', err);
    }
  };

  // Import tickets from spreadsheet / CSV
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

  // Reset / Clear all tickets
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

  // Counts
  const waitingCount = tickets.filter(t => t.queueStatus === 'waiting').length;
  const callingCount = tickets.filter(t => t.queueStatus === 'called').length;
  const completedCount = tickets.filter(t => t.queueStatus === 'done').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-800 selection:text-white pb-12">
      {/* Top Header */}
      <Header
        isAdminMode={isAdminMode}
        setIsAdminMode={setIsAdminMode}
        adminTab={adminTab}
        setAdminTab={setAdminTab}
        onOpenSpreadsheet={() => setIsSpreadsheetOpen(true)}
        onOpenGuidelines={() => setIsGuidelinesOpen(true)}
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

      {/* Main Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        {/* Network Sync Message Toast / Alert */}
        {networkSync.syncMessage && (
          <div className="mb-4 p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs shadow-lg animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{networkSync.syncMessage}</span>
            </div>
            {networkSync.lastSyncedAt && (
              <span className="text-[10px] text-slate-400">
                最終更新: {networkSync.lastSyncedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}

        {/* Offline Safety Notice */}
        {!networkSync.isOnline && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
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
          // USER VIEW: My Ticket Only (Clean, calm, high quality)
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
          // ADMIN VIEW: Progress Board & Time Slots
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

      {/* Footer (includes copyright and the only entry point for admin mode) */}
      <Footer
        isAdminMode={isAdminMode}
        onOpenAdminAuth={() => setIsAdminAuthOpen(true)}
        onExitAdminMode={() => setIsAdminMode(false)}
        isFirebaseConnected={isFirebaseConnected}
        onResetData={handleResetData}
      />

      {/* Modals */}
      {/* 1. Spreadsheet Sync Modal */}
      <SpreadsheetSyncModal
        isOpen={isSpreadsheetOpen}
        onClose={() => setIsSpreadsheetOpen(false)}
        tickets={tickets}
        onImportTickets={handleImportTickets}
      />

      {/* 2. Ticket Detail Modal */}
      <TicketDetailModal
        ticket={detailTicket}
        isOpen={Boolean(detailTicket)}
        onClose={() => setDetailTicket(null)}
        onUpdateTicket={handleUpdateTicket}
      />

      {/* 3. Donation Guidelines & Rules Modal */}
      <DonationGuidelinesModal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
      />

      {/* 4. Admin Password Authentication Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthOpen}
        onClose={() => setIsAdminAuthOpen(false)}
        onSuccess={() => {
          setIsAdminAuthOpen(false);
          setIsAdminMode(true);
        }}
      />
    </div>
  );
};

export default App;
