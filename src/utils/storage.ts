/**
 * Local Storage persistence & Initial dataset
 */
import { TicketRecord } from '../types';

export const TIME_SLOTS = [
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
    return Array.isArray(parsed) ? parsed : [];
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

