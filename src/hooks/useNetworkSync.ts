import { useState, useEffect, useCallback } from 'react';
import { fetchTicketsFromFirestore } from '../firebase';
import { TicketRecord } from '../types';
import { saveTicketsToStorage } from '../utils/storage';

export function useNetworkSync(
  onTicketsUpdated?: (tickets: TicketRecord[]) => void
) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [isResyncing, setIsResyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const manualResync = useCallback(async () => {
    setIsResyncing(true);
    try {
      const tickets = await fetchTicketsFromFirestore();
      if (tickets.length > 0) {
        if (onTicketsUpdated) onTicketsUpdated(tickets);
        saveTicketsToStorage(tickets);
      }
      setLastSyncedAt(new Date());
      setSyncMessage('最新データを同期しました');
      setTimeout(() => setSyncMessage(null), 3500);
    } catch (e) {
      console.warn('Manual resync failed (offline or network issue):', e);
      setSyncMessage('通信不安定のためキャッシュを利用中');
      setTimeout(() => setSyncMessage(null), 3500);
    } finally {
      setIsResyncing(false);
    }
  }, [onTicketsUpdated]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncMessage('オンラインに復帰しました。再同期中...');
      manualResync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncMessage('電波が切断されました（オフライン・ローカルキャッシュ利用中）');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [manualResync]);

  const recordSyncTimestamp = useCallback(() => {
    setLastSyncedAt(new Date());
  }, []);

  return {
    isOnline,
    lastSyncedAt,
    isResyncing,
    syncMessage,
    manualResync,
    recordSyncTimestamp
  };
}

export function formatRelativeTime(date: Date | null): string {
  if (!date) return '未同期';
  const now = Date.now();
  const diffSec = Math.floor((now - date.getTime()) / 1000);

  if (diffSec < 5) return 'たった今';
  if (diffSec < 60) return `${diffSec}秒前`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分前`;
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}
