/**
 * Google Spreadsheet Integration & CSV Utilities
 */
import { TicketRecord, AttendanceStatus, QueueStatus } from '../types';

export const DEFAULT_SHEET_CSV_TEMPLATE = `番号,時間,メアド,名前,属性,出欠,くじ引き結果
1,9:30,s25583@stu.seikyo.ed.jp,黒田悠人,生徒,欠席,
2,9:40,s25719@stu.seikyo.ed.jp,平松宗一郎,生徒,欠席,
3,9:45,s25800@stu.seikyo.ed.jp,清教大和,生徒,出席,四等`;

/**
 * 30-minute time slot normalizer:
 * e.g., 9:40 -> 09:30, 9:50 -> 09:30, 9:10 -> 09:00, 9:20 -> 09:00
 */
export function normalizeTimeSlot(rawSlot: string): { slot: string; originalNote?: string } {
  if (!rawSlot) return { slot: '09:00' };
  const clean = rawSlot.trim();

  // Match HH:mm or H:mm
  const timeMatch = clean.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);

    // 30-minute rounding rule: <30 => 00, >=30 => 30
    const slotMinutes = minutes < 30 ? '00' : '30';
    const slotHours = String(hours).padStart(2, '0');
    const slot = `${slotHours}:${slotMinutes}`;

    // Note original minute if it was non-standard
    let originalNote: string | undefined;
    if (minutes !== 0 && minutes !== 30) {
      originalNote = `予約希望時刻: ${clean}`;
    }

    return { slot, originalNote };
  }

  return { slot: clean };
}

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
  let attendIdx = headers.findIndex(h => h.includes('出席') || h.includes('出欠') || h.includes('進行') || h.includes('進捗') || h.includes('状況') || h.includes('status') || h.includes('attend') || h.includes('progress'));
  let lotteryIdx = headers.findIndex(h => h.includes('くじ') || h.includes('賞') || h.includes('lottery') || h.includes('raffle'));
  let notesIdx = headers.findIndex(h => h.includes('備考') || h.includes('メモ') || h.includes('note'));

  // Positional fallback for 5-column format: [番号, 時間, メアド, 名前, 属性]
  if (headers.length >= 5 && numIdx === -1 && slotIdx === -1 && emailIdx === -1) {
    numIdx = 0;
    slotIdx = 1;
    emailIdx = 2;
    nameIdx = 3;
    attrIdx = 4;
    if (headers.length >= 6 && attendIdx === -1) attendIdx = 5;
    if (headers.length >= 7 && lotteryIdx === -1) lotteryIdx = 6;
  } else if (headers.length === 4 && slotIdx === -1 && emailIdx === -1 && nameIdx === -1) {
    // 4-column format: [時間, メアド, 名前, 属性]
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

    // Determine ticket number (1-digit / natural integer from leftmost column or row index)
    let rawNum = i;
    if (numIdx >= 0 && cols[numIdx]) {
      const parsedNum = parseInt(cols[numIdx].replace(/[#\s]/g, ''), 10);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        rawNum = parsedNum;
      }
    } else if (cols[0] && /^\d+$/.test(cols[0].trim())) {
      const parsedNum = parseInt(cols[0].trim(), 10);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        rawNum = parsedNum;
      }
    }

    const name = (nameIdx >= 0 && cols[nameIdx]) ? cols[nameIdx].trim() : `受診者${rawNum}`;
    const email = (emailIdx >= 0 && cols[emailIdx]) ? cols[emailIdx].trim() : '';
    
    // Time slot normalization (9:40 -> 09:30, 9:50 -> 09:30)
    const rawSlot = (slotIdx >= 0 && cols[slotIdx]) ? cols[slotIdx].trim() : '09:00';
    const { slot: timeSlot, originalNote } = normalizeTimeSlot(rawSlot);

    const attribute = (attrIdx >= 0 && cols[attrIdx]) ? cols[attrIdx].trim() : undefined;
    
    // Column F: 出欠・進行状況 (空欄または未指定の場合は空文字。自動で完了にしない)
    const rawAttendance = (attendIdx >= 0 && cols[attendIdx]) ? cols[attendIdx].trim() : '';
    const lotteryResult = (lotteryIdx >= 0 && cols[lotteryIdx]) ? cols[lotteryIdx].trim() : undefined;
    const parsedNotes = (notesIdx >= 0 && cols[notesIdx]) ? cols[notesIdx].trim() : '';
    const combinedNotes = [originalNote, parsedNotes].filter(Boolean).join(' / ');

    let attendance: AttendanceStatus = 'absent';
    let queueStatus: QueueStatus = 'waiting';

    const cleanAttendance = rawAttendance.toLowerCase();
    if (
      cleanAttendance.includes('完了') || 
      cleanAttendance.includes('done') || 
      cleanAttendance.includes('済') || 
      cleanAttendance.includes('終了') || 
      cleanAttendance.includes('出席')
    ) {
      attendance = 'completed';
      queueStatus = 'done';
    } else if (cleanAttendance.includes('呼出') || cleanAttendance.includes('called')) {
      attendance = 'absent';
      queueStatus = 'called';
    } else if (cleanAttendance.includes('問診') || cleanAttendance.includes('interview')) {
      attendance = 'absent';
      queueStatus = 'interview';
    } else if (cleanAttendance.includes('採血') || cleanAttendance.includes('献血') || cleanAttendance.includes('donating')) {
      attendance = 'absent';
      queueStatus = 'donating';
    } else if (cleanAttendance.includes('休憩') || cleanAttendance.includes('resting')) {
      attendance = 'absent';
      queueStatus = 'resting';
    } else if (cleanAttendance.includes('キャンセル') || cleanAttendance.includes('cancel')) {
      attendance = 'absent';
      queueStatus = 'absent';
    } else {
      // F列が空欄、未入力、または「未受付」「待機」「欠席」「予約」などの場合：
      // まだ完了してない人として「待機中（欠席）」にする
      attendance = 'absent';
      queueStatus = 'waiting';
    }

    tickets.push({
      id: `TK-${rawNum}`,
      ticketNumber: rawNum,
      name,
      email,
      timeSlot,
      attribute,
      scheduledDate: today,
      attendance,
      queueStatus,
      lotteryResult: lotteryResult || '',
      arrivedAt: rawSlot,
      notes: combinedNotes,
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
  const headers = ['番号', '時間', 'メアド', '名前', '属性', '出席状況', 'くじ引き結果', '進行状況', '呼出時刻', '受付時刻', '備考'];

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

  const rows = tickets.map(t => {
    const isCompleted = t.queueStatus === 'done' || t.attendance === 'completed';
    const attendanceExport = isCompleted ? '出席' : '欠席';

    return [
      t.ticketNumber,
      `"${t.timeSlot.replace(/"/g, '""')}"`,
      `"${t.email.replace(/"/g, '""')}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${(t.attribute || '').replace(/"/g, '""')}"`,
      attendanceExport,
      `"${(t.lotteryResult || '').replace(/"/g, '""')}"`,
      queueLabel[t.queueStatus] || t.queueStatus,
      t.calledAt || '',
      t.arrivedAt || '',
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ];
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

/**
 * 7列のスプレッドシート（A:番号, B:時間, C:メアド, D:名前, E:属性, F:状態, G:くじ引き結果）と完全一致するCSVを生成
 */
export function exportMatching7ColCSV(tickets: TicketRecord[]): string {
  const headers = ['番号', '時間', 'メアド', '名前', '属性', '状態', 'くじ引き結果'];

  const queueLabel: Record<string, string> = {
    waiting: '待機中',
    called: '呼出中',
    interview: '問診中',
    donating: '採血中',
    resting: '休憩中',
    done: '完了',
    absent: '欠席'
  };

  const rows = tickets.map(t => {
    const isDone = t.queueStatus === 'done' || t.attendance === 'completed';
    // F列: 完了した人は「出席」または「完了」、進行中の人はそのステージ（呼出中、問診中等）
    const statusText = isDone ? '出席' : (queueLabel[t.queueStatus] || '欠席');

    return [
      t.ticketNumber,
      `"${t.timeSlot.replace(/"/g, '""')}"`,
      `"${t.email.replace(/"/g, '""')}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${(t.attribute || '').replace(/"/g, '""')}"`,
      `"${statusText}"`,
      `"${(t.lotteryResult || '').replace(/"/g, '""')}"`
    ];
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

/**
 * Google Apps Script (GAS) Webhook 経由でスプレッドシートの F列・G列 を直接更新
 */
export async function sendUpdateToGoogleSheet(
  webhookUrl: string,
  payload: {
    ticketNumber: number;
    name?: string;
    status: string;
    lotteryResult?: string;
    attendance?: string;
  }
): Promise<boolean> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) return false;

  try {
    // text/plain を使用してブラウザのプリフライト(OPTIONS)を回避
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
    return true;
  } catch (err) {
    console.warn('Failed to send status update to Google Sheet webhook:', err);
    return false;
  }
}

/**
 * GoogleスプレッドシートにコピペするだけのGoogle Apps Script (GAS) コード
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * 献血アプリ → Googleスプレッドシート F列(状態)・G列(くじ結果) 自動更新スクリプト
 *
 * 【導入手順 (2分で完了)】
 * 1. スプレッドシートのメニュー「拡張機能」>「Apps Script」を開きます。
 * 2. 入力欄のコードをすべて削除し、このコードを貼り付けて保存します。
 * 3. 右上の「デプロイ」>「新しいデプロイ」を開きます。
 * 4. 種類の選択(歯車アイコン)で「ウェブアプリ」を選択します。
 * 5. 設定：
 *    - 次のユーザーとして実行: 「自分」
 *    - アクセスできるユーザー: 「全員 (Anyone)」
 * 6. 「デプロイ」を押し、発行された「ウェブアプリのURL」をアプリに貼り付けます。
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var values = sheet.getDataRange().getValues();

    // A列の「番号」と一致する行を検索 (1行目は見出し)
    var targetRow = -1;
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]).trim() == String(data.ticketNumber).trim()) {
        targetRow = i + 1; // 1-indexed
        break;
      }
    }

    if (targetRow > 0) {
      // F列 (列番号6) に現在の状態を記述
      if (data.status) {
        sheet.getRange(targetRow, 6).setValue(data.status);
      }
      // G列 (列番号7) にくじ引き結果を記述
      if (data.lotteryResult !== undefined && data.lotteryResult !== null && data.lotteryResult !== '') {
        sheet.getRange(targetRow, 7).setValue(data.lotteryResult);
      }
      SpreadsheetApp.flush();
    }

    return ContentService.createTextOutput(JSON.stringify({
      result: 'success',
      row: targetRow,
      ticketNumber: data.ticketNumber,
      status: data.status
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      result: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

/**
 * Fetch spreadsheet CSV with support for Google Sheets, GitHub raw/pages, and CORS proxies
 */
export async function fetchGoogleSheetCSV(sheetUrl: string): Promise<TicketRecord[]> {
  let csvUrl = sheetUrl.trim();

  // Convert Google Spreadsheet view URL to CSV export link
  if (csvUrl.includes('/spreadsheets/d/')) {
    const match = csvUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      const sheetId = match[1];
      const gidMatch = csvUrl.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    }
  }

  let text = '';
  try {
    const response = await fetch(csvUrl, { cache: 'no-store' });
    if (response.ok) {
      text = await response.text();
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch {
    // If direct fetch has CORS restriction or failed, try CORS proxy fallback
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`;
      const proxyRes = await fetch(proxyUrl);
      if (proxyRes.ok) {
        text = await proxyRes.text();
      } else {
        throw new Error('CORS fallback failed');
      }
    } catch {
      throw new Error(`スプレッドシートURL「${sheetUrl}」からデータを取得できませんでした。URLまたは公開設定をご確認ください。`);
    }
  }

  // Parse CSV text
  const tickets = parseCSVToTickets(text);
  if (tickets.length === 0) {
    throw new Error('取得したURLに有効なCSV受診者データが含まれていませんでした。');
  }
  return tickets;
}

