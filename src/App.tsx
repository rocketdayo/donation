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
import { fetchGoogleSheetCSV } from './utils/spreadsheet';

// Components
import { Header } from './components/Header';
import { MyTicketView } from './components/MyTicketView';
import { LiveQueueBoard } from './components/LiveQueueBoard';
import { TimeSlotGrid } from './components/TimeSlotGrid';
import { SpreadsheetSyncModal } from './components/SpreadsheetSyncModal';
import { TicketDetailModal } from './components/TicketDetailModal';
import { DonationGuidelinesModal } from './components/DonationGuidelinesModal';

export const App: React.FC = () => {
  // State
  const [tickets, setTickets] = useState<TicketRecord[]>(() => loadTicketsFromStorage());
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<AdminTabType>('queue');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
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

  // Initialize and subscribe to Firestore
  useEffect(() => {
    testConnection().then((ok) => {
      setIsFirebaseConnected(ok);
    });

    const unsubscribe = subscribeToTickets(
      (firestoreTickets) => {
        // Automatically migrate legacy sample records in Firestore to user's real initial sheet data
        const isLegacySample = firestoreTickets.length === 0 || firestoreTickets.some(t => t.id === 'TK-001' || t.name === '佐藤 健一');
        if (isLegacySample) {
          syncAllTicketsToFirestore(INITIAL_TICKETS);
          return;
        }
        setTickets(firestoreTickets);
        saveTicketsToStorage(firestoreTickets);
        setIsFirebaseConnected(true);
      },
      (err) => {
        console.warn('Firestore subscription offline, using cached tickets:', err);
      }
    );

    const unsubSettings = subscribeToSyncSettings((settings) => {
      if (settings) {
        setSyncSettings(settings);
      }
    });

    return () => {
      unsubscribe();
      unsubSettings();
    };
  }, []);

  // Background Periodic Spreadsheet Fetch & Firestore Sync
  useEffect(() => {
    if (!syncSettings || !syncSettings.sheetUrl || syncSettings.autoSync === false) return;

    const runAutoFetch = async () => {
      try {
        const fetched = await fetchGoogleSheetCSV(syncSettings.sheetUrl);
        if (fetched && fetched.length > 0) {
          setTickets((currentTickets) => {
            // Keep queue status and attendance progress from active state
            const statusMap = new Map<string, {
              attendance: TicketRecord['attendance'];
              queueStatus: TicketRecord['queueStatus'];
              calledAt?: string;
              completedAt?: string;
            }>();

            currentTickets.forEach(c => {
              statusMap.set(c.id, {
                attendance: c.attendance,
                queueStatus: c.queueStatus,
                calledAt: c.calledAt,
                completedAt: c.completedAt
              });
            });

            const merged: TicketRecord[] = fetched.map(item => {
              const liveStatus = statusMap.get(item.id);
              if (liveStatus) {
                return {
                  ...item,
                  attendance: liveStatus.attendance,
                  queueStatus: liveStatus.queueStatus,
                  calledAt: liveStatus.calledAt,
                  completedAt: liveStatus.completedAt
                };
              }
              return item;
            });

            // Save merged tickets to Firestore so all connected devices update
            syncAllTicketsToFirestore(merged).catch(e => console.warn('Auto sync firestore write notice:', e));
            saveTicketsToStorage(merged);
            return merged;
          });
        }
      } catch (err) {
        console.warn('Periodic sheet sync error:', err);
      }
    };

    // Initial fetch once mounted
    runAutoFetch();

    const intervalMs = Math.max(15, (syncSettings.intervalSec || 60)) * 1000;
    const intervalTimer = setInterval(runAutoFetch, intervalMs);

    return () => clearInterval(intervalTimer);
  }, [syncSettings?.sheetUrl, syncSettings?.autoSync, syncSettings?.intervalSec]);

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

  // Update single ticket record (sync to Firestore + optimistic local update)
  const handleUpdateTicket = async (id: string, partial: Partial<TicketRecord>) => {
    // Optimistic local update
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, ...partial };
      }
      return t;
    }));

    // Update in Firestore
    try {
      await updateFirestoreTicket(id, partial);
    } catch (err) {
      console.error('Failed to update ticket in Firestore:', err);
    }
  };

  // Import tickets from spreadsheet / CSV
  const handleImportTickets = async (newTickets: TicketRecord[]) => {
    setTickets(newTickets);
    saveTicketsToStorage(newTickets);
    try {
      await syncAllTicketsToFirestore(newTickets);
    } catch (err) {
      console.error('Failed to sync imported tickets to Firestore:', err);
    }
  };

  // Reset to initial sample data
  const handleResetData = async () => {
    if (window.confirm('データを初期予約データにリセットしますか？')) {
      setTickets(SAMPLE_TICKETS);
      saveTicketsToStorage(SAMPLE_TICKETS);
      sounds.playClick();
      try {
        await syncAllTicketsToFirestore(SAMPLE_TICKETS);
      } catch (err) {
        console.error('Failed to reset Firestore tickets:', err);
      }
    }
  };

  // Counts
  const waitingCount = tickets.filter(t => t.queueStatus === 'waiting' && t.attendance !== 'absent').length;
  const callingCount = tickets.filter(t => t.queueStatus === 'called').length;
  const completedCount = tickets.filter(t => t.queueStatus === 'done').length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-slate-800 selection:text-white pb-12">
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
      />

      {/* Main Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        {!isAdminMode ? (
          // USER VIEW: My Ticket Only (Clean, calm, high quality)
          <MyTicketView
            tickets={tickets}
            notificationPermission={notificationPermission}
            onReqNotifications={handleRequestNotification}
            onSwitchToAdmin={() => setIsAdminMode(true)}
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
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 mt-12 pt-4 border-t border-slate-200 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="font-semibold">献血整理券＆受付管理システム</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <span className={`w-2 h-2 rounded-full ${isFirebaseConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            {isFirebaseConnected ? 'クラウド同期中 (Firestore)' : 'オフライン/ローカル'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetData}
            className="text-slate-400 hover:text-slate-700 transition underline text-[11px]"
          >
            初期データにリセット
          </button>
          <span>•</span>
          <button
            onClick={() => setIsAdminMode(!isAdminMode)}
            className="text-slate-600 hover:text-slate-900 font-medium transition text-[11px]"
          >
            {isAdminMode ? '受診者画面に戻る' : '管理者画面へ切替'}
          </button>
        </div>
      </footer>

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
    </div>
  );
};

export default App;
