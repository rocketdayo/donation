/**
 * Google Spreadsheet Integration & CSV Utilities
 */
import { TicketRecord, AttendanceStatus, QueueStatus } from '../types';

export const DEFAULT_SHEET_CSV_TEMPLATE = `整理券番号,氏名,メールアドレス,予約時間帯,出席状況,備考
1,佐藤 健一,kenichi.sato@example.com,09:00 - 09:30,完了,採血完了
2,高橋 涼介,ryosuke.takahashi@example.com,09:00 - 09:30,出席,休憩中
3,伊藤 陽菜,haruna.ito@example.com,09:00 - 09:30,出席,採血中
4,渡辺 浩二,koji.watanabe@example.com,09:00 - 09:30,出席,問診室へ案内
5,中村 蓮,rocket3141592653589@gmail.com,09:30 - 10:00,出席,受付呼出中
6,小林 美咲,misaki.kobayashi@example.com,09:30 - 10:00,出席,待機中
7,松本 健二,kenji.matsumoto@example.com,09:30 - 10:00,未受付,
8,加藤 結衣,yui.kato@example.com,09:30 - 10:00,欠席,体調不良連絡あり
9,井上 拓海,takumi.inoue@example.com,10:00 - 10:30,未受付,
10,木村 恵美子,emiko.kimura@example.com,10:00 - 10:30,未受付,`;

export function parseCSVToTickets(csvText: string): TicketRecord[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const tickets: TicketRecord[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Header inspection
  const headerLine = lines[0].toLowerCase();
  const headers = parseCSVLine(headerLine);

  let numIdx = headers.findIndex(h => h.includes('番号') || h.includes('number') || h.includes('no') || h.includes('id'));
  let nameIdx = headers.findIndex(h => h.includes('氏名') || h.includes('名前') || h.includes('name'));
  let emailIdx = headers.findIndex(h => h.includes('メール') || h.includes('email') || h.includes('mail') || h.includes('アドレス'));
  let slotIdx = headers.findIndex(h => h.includes('時間') || h.includes('スロット') || h.includes('slot') || h.includes('予約'));
  let attendIdx = headers.findIndex(h => h.includes('出席') || h.includes('状況') || h.includes('status') || h.includes('attend'));
  let notesIdx = headers.findIndex(h => h.includes('備考') || h.includes('メモ') || h.includes('note'));

  // Fallbacks if header names are standard positional
  if (numIdx === -1) numIdx = 0;
  if (nameIdx === -1) nameIdx = 1;
  if (emailIdx === -1) emailIdx = 2;
  if (slotIdx === -1) slotIdx = 3;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols.length < 2) continue;

    const rawNum = parseInt(cols[numIdx] || '', 10) || i;
    const name = cols[nameIdx]?.trim() || `来場者${rawNum}`;
    const email = (emailIdx >= 0 && cols[emailIdx]) ? cols[emailIdx].trim() : '';
    const timeSlot = (slotIdx >= 0 && cols[slotIdx]) ? cols[slotIdx].trim() : '09:00 - 09:30';
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
  const headers = ['整理券番号', '氏名', 'メールアドレス', '予約時間帯', '出席状況', '進行状況', '呼出時刻', '受付時刻', '備考'];

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

