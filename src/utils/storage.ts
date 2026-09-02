/**
 * Local Storage persistence & Initial dataset
 */
import { TicketRecord } from '../types';

export const TIME_SLOTS = [
  '09:00 - 09:30',
  '09:30 - 10:00',
  '10:00 - 10:30',
  '10:30 - 11:00',
  '11:00 - 11:30',
  '11:30 - 12:00',
  '13:00 - 13:30',
  '13:30 - 14:00',
  '14:00 - 14:30',
  '14:30 - 15:00',
  '15:00 - 15:30',
  '15:30 - 16:00'
];

export const INITIAL_TICKETS: TicketRecord[] = [
  {
    id: 'TK-001',
    ticketNumber: 1,
    name: '佐藤 健一',
    kana: 'サトウ ケンイチ',
    email: 'kenichi.sato@example.com',
    timeSlot: '09:00 - 09:30',
    scheduledDate: '2026-09-02',
    attendance: 'completed',
    queueStatus: 'done',
    bloodType: 'A',
    donationType: '400mL',
    arrivedAt: '09:02',
    completedAt: '09:28',
    notes: '採血完了'
  },
  {
    id: 'TK-002',
    ticketNumber: 2,
    name: '高橋 涼介',
    kana: 'タカハシ リョウスケ',
    email: 'ryosuke.takahashi@example.com',
    timeSlot: '09:00 - 09:30',
    scheduledDate: '2026-09-02',
    attendance: 'present',
    queueStatus: 'resting',
    bloodType: 'O',
    donationType: '400mL',
    arrivedAt: '09:05',
    notes: '休憩中'
  },
  {
    id: 'TK-003',
    ticketNumber: 3,
    name: '伊藤 陽菜',
    kana: 'イトウ ハルナ',
    email: 'haruna.ito@example.com',
    timeSlot: '09:00 - 09:30',
    scheduledDate: '2026-09-02',
    attendance: 'present',
    queueStatus: 'donating',
    bloodType: 'B',
    donationType: '200mL',
    arrivedAt: '09:08',
    notes: '採血ベッド案内中'
  },
  {
    id: 'TK-004',
    ticketNumber: 4,
    name: '渡辺 浩二',
    kana: 'ワタナベ コウジ',
    email: 'koji.watanabe@example.com',
    timeSlot: '09:00 - 09:30',
    scheduledDate: '2026-09-02',
    attendance: 'present',
    queueStatus: 'interview',
    bloodType: 'O',
    donationType: '400mL',
    arrivedAt: '09:12',
    notes: '問診室1番へ案内'
  },
  {
    id: 'TK-005',
    ticketNumber: 5,
    name: '中村 蓮',
    kana: 'ナカムラ レン',
    email: 'rocket3141592653589@gmail.com',
    timeSlot: '09:30 - 10:00',
    scheduledDate: '2026-09-02',
    attendance: 'present',
    queueStatus: 'called',
    bloodType: 'AB',
    donationType: '400mL',
    calledAt: '09:32',
    arrivedAt: '09:30',
    notes: '受付呼出中'
  },
  {
    id: 'TK-006',
    ticketNumber: 6,
    name: '小林 美咲',
    kana: 'コバヤシ ミサキ',
    email: 'misaki.kobayashi@example.com',
    timeSlot: '09:30 - 10:00',
    scheduledDate: '2026-09-02',
    attendance: 'present',
    queueStatus: 'waiting',
    bloodType: 'A',
    donationType: '400mL',
    arrivedAt: '09:28'
  },
  {
    id: 'TK-007',
    ticketNumber: 7,
    name: '松本 健二',
    kana: 'マツモト ケンジ',
    email: 'kenji.matsumoto@example.com',
    timeSlot: '09:30 - 10:00',
    scheduledDate: '2026-09-02',
    attendance: 'unattended',
    queueStatus: 'waiting',
    bloodType: 'B',
    donationType: '400mL'
  },
  {
    id: 'TK-008',
    ticketNumber: 8,
    name: '加藤 結衣',
    kana: 'カトウ ユイ',
    email: 'yui.kato@example.com',
    timeSlot: '09:30 - 10:00',
    scheduledDate: '2026-09-02',
    attendance: 'absent',
    queueStatus: 'absent',
    bloodType: 'O',
    notes: '欠席連絡あり'
  },
  {
    id: 'TK-009',
    ticketNumber: 9,
    name: '井上 拓海',
    kana: 'イノウエ タクミ',
    email: 'takumi.inoue@example.com',
    timeSlot: '10:00 - 10:30',
    scheduledDate: '2026-09-02',
    attendance: 'unattended',
    queueStatus: 'waiting'
  },
  {
    id: 'TK-010',
    ticketNumber: 10,
    name: '木村 恵美子',
    kana: 'キムラ エミコ',
    email: 'emiko.kimura@example.com',
    timeSlot: '10:00 - 10:30',
    scheduledDate: '2026-09-02',
    attendance: 'unattended',
    queueStatus: 'waiting'
  },
  {
    id: 'TK-011',
    ticketNumber: 11,
    name: '山本 翔太',
    kana: 'ヤマモト ショウタ',
    email: 'shota.yamamoto@example.com',
    timeSlot: '10:00 - 10:30',
    scheduledDate: '2026-09-02',
    attendance: 'unattended',
    queueStatus: 'waiting'
  },
  {
    id: 'TK-012',
    ticketNumber: 12,
    name: '森田 千佳',
    kana: 'モリタ チカ',
    email: 'chika.morita@example.com',
    timeSlot: '10:00 - 10:30',
    scheduledDate: '2026-09-02',
    attendance: 'unattended',
    queueStatus: 'waiting'
  }
];

const STORAGE_KEY = 'blood_donation_tickets_clean_v2';

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

