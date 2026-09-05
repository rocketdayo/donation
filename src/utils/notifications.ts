/**
 * Web Notifications & Push Notification Manager
 */
import { NotificationLog, TicketRecord } from '../types';
import { sounds } from './audio';
import { VoiceAnnouncer } from './speech';

export class NotificationManager {
  private static STORAGE_KEY = 'blood_donation_notifications';

  /**
   * Request Notification Permission from Browser / PWA
   */
  public static async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications not supported in this environment');
      return 'denied';
    }
    try {
      // Unlock audio context on user gesture
      sounds.unlock();

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await this.sendLocalNotification(
          '【献血整理券】通知が有効化されました',
          'お呼び出しの際にスマホの通知欄へお知らせが届きます。'
        );
      }
      return permission;
    } catch (err) {
      console.warn('Notification permission request error:', err);
      return 'denied';
    }
  }

  public static getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Send local browser / PWA notification
   */
  public static async sendLocalNotification(title: string, body: string, tag?: string): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    // Trigger vibration on mobile if supported
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([300, 150, 300, 150, 500]);
      } catch {
        // Ignore vibration errors
      }
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    try {
      const iconUrl = '/donation_icon.jpg';
      const notifOptions: NotificationOptions = {
        body,
        icon: iconUrl,
        badge: iconUrl,
        tag: tag || 'blood-notif-' + Date.now(),
        renotify: true,
        requireInteraction: true,
        vibrate: [400, 200, 400, 200, 800],
        data: {
          url: typeof window !== 'undefined' ? window.location.href : '/',
          timestamp: Date.now()
        }
      } as NotificationOptions;

      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(title, notifOptions);
            return;
          }
        } catch {
          // Fall back to standard Notification
        }
      }

      new Notification(title, {
        body,
        icon: iconUrl,
        tag: notifOptions.tag,
        requireInteraction: true
      });
    } catch (err) {
      console.warn('Local notification error:', err);
    }
  }

  /**
   * Broadcast / Trigger full calling notification (Audio Chime + Voice Announcement + Vibration + Phone Notification Bar)
   */
  public static async sendCallNotification(ticket: TicketRecord): Promise<NotificationLog> {
    const title = `【献血呼出】整理券番号 #${ticket.ticketNumber} の番です！`;
    const body = `${ticket.name}様、食堂前の献血バスへお越しください。`;
    const tag = `call-${ticket.id}-${ticket.calledTimestamp || Date.now()}`;

    // 1. Play Calling Chime
    try {
      sounds.playCallingChime();
    } catch (e) {
      console.warn('Calling chime error:', e);
    }

    // 2. Voice Announcement
    try {
      VoiceAnnouncer.announceCall(ticket.ticketNumber, ticket.name);
    } catch (e) {
      console.warn('Voice announcement error:', e);
    }

    // 3. Mobile Device Vibration
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([400, 200, 400, 200, 800, 200, 800]);
      } catch {
        // Ignore
      }
    }

    // 4. Send System Notification (Notification Bar / Lock Screen)
    await this.sendLocalNotification(title, body, tag);

    const log: NotificationLog = {
      id: 'NOTIF-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      ticketId: ticket.id,
      recipientEmail: ticket.email,
      recipientName: ticket.name,
      title,
      body,
      sentAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: Notification.permission === 'granted' ? 'delivered' : 'simulated'
    };

    this.saveNotificationLog(log);
    return log;
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

    await this.sendLocalNotification(title, body, `push-${ticketId}-${Date.now()}`);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      log.status = 'delivered';
    }

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

