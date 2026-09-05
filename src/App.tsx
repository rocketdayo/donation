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
import { WifiOff } from 'lucide-react';

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

  // Network online/offline status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
  }, []);

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
        '【献血整理券】通知が有効化されました',
        'お呼び出し時に端末の通知欄へお知らせが届きます。'
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
      />

      {/* Main Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        {/* Offline Safety Notice */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>
                現在オフラインで動作しています。操作内容は端末内に安全に保持され、通信復旧時に自動でクラウドへ同期されます。
              </span>
            </div>
            <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
              オフライン保護中
            </span>
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
