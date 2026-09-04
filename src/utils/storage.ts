/**
 * Local Storage persistence & Initial dataset
 */
import { TicketRecord } from '../types';

export const TIME_SLOTS = [
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00'
];

export const INITIAL_TICKETS: TicketRecord[] = [];

const STORAGE_KEY = 'blood_donation_tickets_v4';

export function loadTickets(): TicketRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: TicketRecord[] = JSON.parse(raw);
    // 過去のサンプル受診者データ（黒田悠人・平松宗一郎など）を自動排除
    const filtered = parsed.filter(t => !['黒田悠人', '平松宗一郎', '清教大和', '佐藤 健一'].includes(t.name));
    if (filtered.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
}

export function saveTickets(tickets: TicketRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch (err) {
    console.error('Failed to save tickets:', err);
  }
}

export const SAMPLE_TICKETS = INITIAL_TICKETS;
export const loadTicketsFromStorage = loadTickets;
export const saveTicketsToStorage = saveTickets;

