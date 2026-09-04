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
              lotteryResult?: string;
            }>();

            currentTickets.forEach(c => {
              statusMap.set(c.id, {
                attendance: c.attendance,
                queueStatus: c.queueStatus,
                calledAt: c.calledAt,
                completedAt: c.completedAt,
                lotteryResult: c.lotteryResult
              });
            });

            const merged: TicketRecord[] = fetched.map(item => {
              const liveStatus = statusMap.get(item.id);
              if (liveStatus) {
                const isSheetDone = item.queueStatus === 'done' || item.attendance === 'completed';
                return {
                  ...item,
                  // スプレッドシート側で明示的に完了とされた場合は完了、そうでなければ現場の進行状況を維持
                  attendance: isSheetDone ? 'completed' : liveStatus.attendance,
                  queueStatus: isSheetDone ? 'done' : liveStatus.queueStatus,
                  calledAt: liveStatus.calledAt || item.calledAt,
                  completedAt: isSheetDone ? (liveStatus.completedAt || item.completedAt || new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })) : liveStatus.completedAt,
                  lotteryResult: item.lotteryResult || liveStatus.lotteryResult || ''
                };
              }
              // 新たに追加された受診者：F列未記入なら「待機中（欠席＝未完了）」として追加される
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
      const liveMap = new Map<string, TicketRecord>(currentTickets.map(t => [t.id, t]));
      const merged = newTickets.map(item => {
        const existing = liveMap.get(item.id);
        if (existing) {
          const isSheetDone = item.queueStatus === 'done' || item.attendance === 'completed';
          return {
            ...item,
            attendance: isSheetDone ? 'completed' : existing.attendance,
            queueStatus: isSheetDone ? 'done' : existing.queueStatus,
            calledAt: existing.calledAt || item.calledAt,
            completedAt: isSheetDone ? (existing.completedAt || item.completedAt) : existing.completedAt,
            lotteryResult: item.lotteryResult || existing.lotteryResult || '',
          };
        }
        // 新規受診者はF列の指定に従う（未記入なら待機中・欠席）
        return item;
      });

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
