/**
 * Web Notifications & Push Notification Simulator
 */
import { NotificationLog } from '../types';

export class NotificationManager {
  private static STORAGE_KEY = 'blood_donation_notifications';

  public static async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  }

  public static getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  public static async sendLocalNotification(title: string, body: string): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
        } as NotificationOptions);
      } else {
        new Notification(title, { body, icon: '/icon.svg' });
      }
    } catch (err) {
      console.warn('Local notification error:', err);
    }
  }

  public static async sendPushNotification(
    ticketId: string,
    recipientEmail: string,
    recipientName: string,
    title: string,
    body: string
  ): Promise<NotificationLog> {
    const log: NotificationLog = {
      id: 'NOTIF-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      ticketId,
      recipientEmail,
      recipientName,
      title,
      body,
      sentAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: 'simulated'
    };

    // If browser notifications are granted, show native notification or service worker notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(title, {
            body,
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag: ticketId,
            vibrate: [200, 100, 200],
          } as NotificationOptions);
          log.status = 'delivered';
        } else {
          new Notification(title, {
            body,
            icon: '/icon.svg',
          });
          log.status = 'delivered';
        }
      } catch (err) {
        console.warn('Native notification display skipped:', err);
      }
    }

    // Save notification history to localStorage
    this.saveNotificationLog(log);
    return log;
  }

  public static getNotificationLogs(): NotificationLog[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static saveNotificationLog(log: NotificationLog) {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getNotificationLogs();
      const updated = [log, ...current].slice(0, 50); // keep recent 50
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }

  public static clearLogs() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
