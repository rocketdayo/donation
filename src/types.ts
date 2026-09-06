export type QueueStatus = 
  | 'waiting'
  | 'called'
  | 'on_hold'
  | 'interview'
  | 'donating'
  | 'resting'
  | 'done'
  | 'absent';

export type AttendanceStatus = 'unattended' | 'present' | 'absent' | 'completed';

export type ParentalConsentStatus = 'not_required' | 'submitted' | 'unconfirmed';

export interface SafetyChecklist {
  mealTaken?: boolean;
  sleepAdequate?: boolean;
  weightQualified?: boolean;
  medicationCleared?: boolean;
  waterHydrated?: boolean;
  confirmedAt?: string;
}

export type LotteryResultType = 
  | ''
  | '未抽選'
  | '一等'
  | '二等'
  | '三等'
  | '四等'
  | '参加賞'
  | 'はずれ';

export type AdminTabType = 'queue' | 'slots' | 'lottery';

export interface TicketRecord {
  id: string;
  ticketNumber: number;
  name: string;
  kana?: string;
  email: string;
  timeSlot: string;
  scheduledDate: string;
  attendance: AttendanceStatus;
  queueStatus: QueueStatus;
  attribute?: string;
  lotteryResult?: string;
  bloodType?: string;
  donationType?: string;
  firstTimeDonor?: boolean;
  registeredAt?: string;
  arrivedAt?: string;
  calledAt?: string;
  calledTimestamp?: number;
  callCount?: number;
  completedAt?: string;
  notes?: string;
  parentalConsentStatus?: ParentalConsentStatus;
  safetyChecklist?: SafetyChecklist;
}

export interface TimeSlotStat {
  slot: string;
  total: number;
  waiting: number;
  inProgress: number;
  completed: number;
  absent: number;
  tickets: TicketRecord[];
}

export interface NotificationLog {
  id: string;
  ticketId: string;
  recipientEmail: string;
  recipientName: string;
  title: string;
  body: string;
  sentAt: string;
  status: 'simulated' | 'delivered' | 'failed';
}

export interface AdminAuthConfig {
  salt: string;
  hash: string;
  updatedAt: string;
}
