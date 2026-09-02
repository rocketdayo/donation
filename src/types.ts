/**
 * 献血整理券＆受付進行管理システム Types
 */

export type QueueStatus = 
  | 'waiting'      // 待機中
  | 'called'       // お呼出中 (受付・問診へ)
  | 'interview'    // 問診・事前検査中
  | 'donating'     // 採血中
  | 'resting'      // 休憩中
  | 'done'         // 完了
  | 'absent';      // 不在・キャンセル

export type AttendanceStatus = 'unattended' | 'present' | 'absent' | 'completed';

export type AdminTabType = 'queue' | 'slots';

export interface TicketRecord {
  id: string;              // e.g. "TK-001"
  ticketNumber: number;    // e.g. 1
  name: string;            // 氏名 (e.g. "佐藤 健一")
  kana?: string;           // フリガナ
  email: string;           // メールアドレス
  timeSlot: string;        // 予約時間帯 (e.g. "09:30 - 10:00")
  scheduledDate: string;   // 予定日
  attendance: AttendanceStatus;
  queueStatus: QueueStatus;
  attribute?: string;      // 属性 (e.g. "生徒", "教員", "保護者", "一般")
  bloodType?: string;      // 血液型 (任意)
  donationType?: string;   // 200mL / 400mL / 成分献血
  firstTimeDonor?: boolean;
  registeredAt?: string;
  arrivedAt?: string;      // 受付時刻
  calledAt?: string;       // 呼出時刻
  completedAt?: string;    // 完了時刻
  notes?: string;          // 備考
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
