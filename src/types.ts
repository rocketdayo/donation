/**
 * 献血整理券＆受付進行管理システム Types
 */

export type QueueStatus = 
  | 'waiting'      // 待機中
  | 'called'       // お呼出中 (受付・問診へ)
  | 'on_hold'      // 保留・一時不在（スキップ）
  | 'interview'    // 問診・事前検査中
  | 'donating'     // 採血中
  | 'resting'      // 休憩中
  | 'done'         // 完了
  | 'absent';      // 不在・キャンセル

export type AttendanceStatus = 'unattended' | 'present' | 'absent' | 'completed';

export type ParentalConsentStatus = 'not_required' | 'submitted' | 'unconfirmed';

export interface SafetyChecklist {
  mealTaken?: boolean;         // 直近の食事摂取（空腹防止）
  sleepAdequate?: boolean;     // 睡眠時間（4時間以上）
  weightQualified?: boolean;   // 体重基準（男子45/50kg以上、女子40kg以上）
  medicationCleared?: boolean; // 服薬・歯科治療等の問題なし
  waterHydrated?: boolean;     // 水分補給（コップ1〜2杯）
  confirmedAt?: string;        // セルフチェック確認日時
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
  lotteryResult?: string;  // くじ引き結果 (e.g. "四等", "一等", etc.)
  bloodType?: string;      // 血液型 (任意)
  donationType?: string;   // 200mL / 400mL / 成分献血
  firstTimeDonor?: boolean;
  registeredAt?: string;
  arrivedAt?: string;      // 受付時刻
  calledAt?: string;       // 呼出時刻
  calledTimestamp?: number;// 呼出タイムスタンプ (ミリ秒) - リアルタイム通知トリガー用
  callCount?: number;      // 呼出回数
  completedAt?: string;    // 完了時刻
  notes?: string;          // 備考
  parentalConsentStatus?: ParentalConsentStatus; // 保護者同意書 (生徒・未成年用: submitted / unconfirmed / not_required)
  safetyChecklist?: SafetyChecklist; // 事前安全セルフチェック
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
