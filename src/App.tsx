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

export const App: React.FC = () => {
  // State
  const [tickets, setTickets] = useState<TicketRecord[]>(() => loadTicketsFromStorage());
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState<boolean>(false);
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
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
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
        // 過去のサンプル受診者データ（黒田悠人、平松宗一郎、清教大和など）を自動排除
        const legacyNames = ['黒田悠人', '平松宗一郎', '清教大和', '佐藤 健一'];
        const hasLegacy = firestoreTickets.some(t => legacyNames.includes(t.name) || ['TK-1', 'TK-2', 'TK-3', 'TK-001'].includes(t.id));
        if (hasLegacy) {
          const cleaned = firestoreTickets.filter(t => !legacyNames.includes(t.name) && !['TK-1', 'TK-2', 'TK-3', 'TK-001'].includes(t.id));
          syncAllTicketsToFirestore(cleaned);
          setTickets(cleaned);
          saveTicketsToStorage(cleaned);
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

  // Helper: Merge spreadsheet data with live state, restoring any explicit statuses from spreadsheet
  const mergeSheetTicketsWithExisting = (
    fetched: TicketRecord[],
    current: TicketRecord[]
  ): TicketRecord[] => {
    const currentMap = new Map<string, TicketRecord>(current.map(t => [t.id, t]));

    return fetched.map(item => {
      const existing = currentMap.get(item.id);
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

  // Background Periodic Spreadsheet Fetch & Firestore Sync
  useEffect(() => {
    if (!syncSettings || !syncSettings.sheetUrl || syncSettings.autoSync === false) return;

    const runAutoFetch = async () => {
      try {
        const fetched = await fetchGoogleSheetCSV(syncSettings.sheetUrl);
        if (fetched && fetched.length > 0) {
          setTickets((currentTickets) => {
            const merged = mergeSheetTicketsWithExisting(fetched, currentTickets);

            // Save merged & restored tickets to Firestore so all connected devices stay repaired
            syncAllTicketsToFirestore(merged).catch(e => console.warn('Auto sync firestore write notice:', e));
            saveTicketsToStorage(merged);
            return merged;
          });
        }
      } catch (err) {
        console.warn('Periodic sheet sync error:', err);
      }
    };

    // Initial fetch once mounted (restores data immediately on page load / reload)
    runAutoFetch();

    const intervalMs = Math.max(15, (syncSettings.intervalSec || 60)) * 1000;
    const intervalTimer = setInterval(runAutoFetch, intervalMs);

    return () => clearInterval(intervalTimer);
  }, [syncSettings?.sheetUrl, syncSettings?.autoSync, syncSettings?.intervalSec]);

  // Manual Quick Refresh from Google Sheet (Repairs live data immediately)
  const handleRefreshSheet = async () => {
    if (!syncSettings?.sheetUrl) return;
    setIsSyncingSheet(true);
    try {
      const fetched = await fetchGoogleSheetCSV(syncSettings.sheetUrl);
      if (fetched && fetched.length > 0) {
        setTickets(currentTickets => {
          const merged = mergeSheetTicketsWithExisting(fetched, currentTickets);
          syncAllTicketsToFirestore(merged).catch(e => console.warn('Refresh firestore write notice:', e));
          saveTicketsToStorage(merged);
          return merged;
        });
      }
    } catch (err) {
      console.warn('Manual sheet refresh error:', err);
    } finally {
      setIsSyncingSheet(false);
    }
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

  // Update single ticket record (sync to Firestore + optimistic local update)
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

    // Update in Firestore
    try {
      await updateFirestoreTicket(id, partial);
    } catch (err) {
      console.error('Failed to update ticket in Firestore:', err);
    }

    // Google Apps Script Webhook 経由でスプレッドシート F列・G列 に自動書き込み
    if (syncSettings?.writeWebhookUrl) {
      const targetTicket = tickets.find(t => t.id === id);
      if (targetTicket) {
        const merged = { ...targetTicket, ...partial };
        const isDone = merged.queueStatus === 'done' || merged.attendance === 'completed';
        const queueLabel: Record<string, string> = {
          waiting: '待機中',
          called: '呼び出し中',
          interview: '問診検査中',
          donating: '採血中',
          resting: '休憩中',
          done: '完了',
          absent: '欠席'
        };
        const statusText = isDone ? '完了' : (queueLabel[merged.queueStatus] || '待機中');

        sendUpdateToGoogleSheet(syncSettings.writeWebhookUrl, {
          ticketNumber: merged.ticketNumber,
          name: merged.name,
          status: statusText,
          lotteryResult: merged.lotteryResult || '',
          attendance: isDone ? '完了' : '欠席'
        }).catch(err => console.warn('Failed to send status update to Google Sheet:', err));
      }
    }
  };

  // Import tickets from spreadsheet / CSV
  const handleImportTickets = async (newTickets: TicketRecord[]) => {
    setTickets(currentTickets => {
      const merged = mergeSheetTicketsWithExisting(newTickets, currentTickets);
      saveTicketsToStorage(merged);
      syncAllTicketsToFirestore(merged).catch(err => console.error('Failed to sync imported tickets to Firestore:', err));
      return merged;
    });
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
        onRefreshSheet={handleRefreshSheet}
        isSyncingSheet={isSyncingSheet}
      />

      {/* Main Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        {!isAdminMode ? (
          // USER VIEW: My Ticket Only (Clean, calm, high quality)
          <MyTicketView
            tickets={tickets}
            notificationPermission={notificationPermission}
            onReqNotifications={handleRequestNotification}
            onSwitchToAdmin={() => setIsAdminAuthOpen(true)}
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
