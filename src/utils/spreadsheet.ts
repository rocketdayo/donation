/**
 * Google Spreadsheet Integration & CSV Utilities
 */
import { TicketRecord, AttendanceStatus, QueueStatus } from '../types';

export const DEFAULT_SHEET_CSV_TEMPLATE = `時間,メアド,名前,属性
8:30,s25583@stu.seikyo.ed.jp,黒田悠人,生徒`;

export function parseCSVToTickets(csvText: string): TicketRecord[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const tickets: TicketRecord[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Header inspection
  const headerLine = lines[0].toLowerCase();
  const headers = parseCSVLine(headerLine);

  let numIdx = headers.findIndex(h => h.includes('番号') || h.includes('number') || h.includes('no') || h.includes('id'));
  let nameIdx = headers.findIndex(h => h.includes('名前') || h.includes('氏名') || h.includes('name') || h.includes('受診者') || h.includes('生徒'));
  let emailIdx = headers.findIndex(h => h.includes('メアド') || h.includes('メール') || h.includes('email') || h.includes('mail') || h.includes('アドレス'));
  let slotIdx = headers.findIndex(h => h.includes('時間') || h.includes('スロット') || h.includes('slot') || h.includes('予約') || h.includes('time'));
  let attrIdx = headers.findIndex(h => h.includes('属性') || h.includes('区分') || h.includes('所属') || h.includes('役職') || h.includes('role') || h.includes('attribute') || h.includes('type'));
  let attendIdx = headers.findIndex(h => h.includes('出席') || h.includes('状況') || h.includes('status') || h.includes('attend'));
  let notesIdx = headers.findIndex(h => h.includes('備考') || h.includes('メモ') || h.includes('note'));

  // Positional fallback for 4-column format: [時間, メアド, 名前, 属性]
  if (headers.length === 4 && slotIdx === -1 && emailIdx === -1 && nameIdx === -1) {
    slotIdx = 0;
    emailIdx = 1;
    nameIdx = 2;
    attrIdx = 3;
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols.length < 2) continue;

    // Determine sequential number if no explicit ticket number column
    let rawNum = i;
    if (numIdx >= 0 && cols[numIdx]) {
      const parsedNum = parseInt(cols[numIdx], 10);
      if (!isNaN(parsedNum)) {
        rawNum = parsedNum;
      }
    }

    const name = (nameIdx >= 0 && cols[nameIdx]) ? cols[nameIdx].trim() : `受診者${rawNum}`;
    const email = (emailIdx >= 0 && cols[emailIdx]) ? cols[emailIdx].trim() : '';
    
    // Time slot normalization (e.g., "8:30" -> "08:30" or "08:30 - 09:00")
    let rawSlot = (slotIdx >= 0 && cols[slotIdx]) ? cols[slotIdx].trim() : '08:30';
    if (/^\d{1,2}:\d{2}$/.test(rawSlot)) {
      const [h, m] = rawSlot.split(':');
      const startH = h.padStart(2, '0');
      rawSlot = `${startH}:${m}`;
    }
    const timeSlot = rawSlot;

    const attribute = (attrIdx >= 0 && cols[attrIdx]) ? cols[attrIdx].trim() : undefined;
    const rawAttendance = (attendIdx >= 0 && cols[attendIdx]) ? cols[attendIdx].trim() : '未受付';
    const notes = (notesIdx >= 0 && cols[notesIdx]) ? cols[notesIdx].trim() : '';

    let attendance: AttendanceStatus = 'unattended';
    let queueStatus: QueueStatus = 'waiting';

    if (rawAttendance.includes('出席') || rawAttendance.toLowerCase().includes('present')) {
      attendance = 'present';
      queueStatus = 'waiting';
    } else if (rawAttendance.includes('欠席') || rawAttendance.toLowerCase().includes('absent')) {
      attendance = 'absent';
      queueStatus = 'absent';
    } else if (rawAttendance.includes('完了') || rawAttendance.toLowerCase().includes('done')) {
      attendance = 'completed';
      queueStatus = 'done';
    }

    tickets.push({
      id: `TK-${String(rawNum).padStart(3, '0')}`,
      ticketNumber: rawNum,
      name,
      email,
      timeSlot,
      attribute,
      scheduledDate: today,
      attendance,
      queueStatus,
      notes,
    });
  }

  return tickets;
}

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur.replace(/^"|"$/g, '').trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.replace(/^"|"$/g, '').trim());
  return result;
}

export function exportTicketsToCSV(tickets: TicketRecord[]): string {
  const headers = ['整理券番号', '氏名', 'メールアドレス', '予約時間帯', '属性', '出席状況', '進行状況', '呼出時刻', '受付時刻', '備考'];

  const attendanceLabel: Record<AttendanceStatus, string> = {
    unattended: '未受付',
    present: '出席',
    absent: '欠席',
    completed: '完了'
  };

  const queueLabel: Record<string, string> = {
    waiting: '待機中',
    called: '呼出中',
    interview: '問診中',
    donating: '採血中',
    resting: '休憩中',
    done: '完了',
    absent: '欠席'
  };

  const rows = tickets.map(t => [
    t.ticketNumber,
    `"${t.name.replace(/"/g, '""')}"`,
    `"${t.email.replace(/"/g, '""')}"`,
    `"${t.timeSlot.replace(/"/g, '""')}"`,
    `"${(t.attribute || '').replace(/"/g, '""')}"`,
    attendanceLabel[t.attendance] || t.attendance,
    queueLabel[t.queueStatus] || t.queueStatus,
    t.calledAt || '',
    t.arrivedAt || '',
    `"${(t.notes || '').replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

export async function fetchGoogleSheetCSV(sheetUrl: string): Promise<TicketRecord[]> {
  let csvUrl = sheetUrl.trim();
  if (csvUrl.includes('/spreadsheets/d/')) {
    const match = csvUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      const sheetId = match[1];
      const gidMatch = csvUrl.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    }
  }

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Google スプレッドシートの取得に失敗しました (HTTP ${response.status})`);
  }
  const text = await response.text();
  return parseCSVToTickets(text);
}

