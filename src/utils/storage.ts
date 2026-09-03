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

export const INITIAL_TICKETS: TicketRecord[] = [
  {
    id: 'TK-1',
    ticketNumber: 1,
    name: '黒田悠人',
    email: 's25583@stu.seikyo.ed.jp',
    timeSlot: '09:30',
    attribute: '生徒',
    scheduledDate: '2026-09-02',
    attendance: 'present',
    queueStatus: 'waiting',
    arrivedAt: '09:30',
    lotteryResult: '',
    notes: ''
  },
  {
    id: 'TK-2',
    ticketNumber: 2,
    name: '平松宗一郎',
    email: 's25719@stu.seikyo.ed.jp',
    timeSlot: '09:30',
    attribute: '生徒',
    scheduledDate: '2026-09-02',
    attendance: 'present',
    queueStatus: 'waiting',
    arrivedAt: '09:40',
    lotteryResult: '',
    notes: '元の予約時刻: 9:40'
  },
  {
    id: 'TK-3',
    ticketNumber: 3,
    name: '清教大和',
    email: 's25800@stu.seikyo.ed.jp',
    timeSlot: '09:30',
    attribute: '生徒',
    scheduledDate: '2026-09-02',
    attendance: 'present',
    queueStatus: 'waiting',
    arrivedAt: '09:45',
    lotteryResult: '四等',
    notes: ''
  }
];

const STORAGE_KEY = 'blood_donation_tickets_v3';

export function loadTickets(): TicketRecord[] {
  if (typeof window === 'undefined') return INITIAL_TICKETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TICKETS));
      return INITIAL_TICKETS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_TICKETS;
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

