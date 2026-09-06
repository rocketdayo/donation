import { TicketRecord, AttendanceStatus, QueueStatus } from '../types';

export const DEFAULT_SHEET_CSV_TEMPLATE = `番号,時間,メアド,名前,属性,状態,くじ引き結果`;

export function normalizeTimeSlot(rawSlot: string): { slot: string; originalNote?: string } {
  if (!rawSlot) return { slot: '09:30' };
  const clean = rawSlot.trim();

  const timeMatch = clean.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);

    const slotMinutes = minutes < 30 ? '00' : '30';
    const slotHours = String(hours).padStart(2, '0');
    const slot = `${slotHours}:${slotMinutes}`;

    let originalNote: string | undefined;
    if (minutes !== 0 && minutes !== 30) {
      originalNote = `予約希望時刻: ${clean}`;
    }

    return { slot, originalNote };
  }

  return { slot: clean };
}

export function parseCSVToTickets(csvText: string): TicketRecord[] {
  if (!csvText) return [];
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const lines = cleanText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const tickets: TicketRecord[] = [];
  const today = new Date().toISOString().split('T')[0];

  const firstLine = lines[0] || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? '\t' : ',';

  const headerLine = lines[0].toLowerCase();
  const headers = parseCSVLine(headerLine, delimiter);

  let numIdx = headers.findIndex(h => h.includes('番号') || h.includes('number') || h.includes('no') || h.includes('id'));
  let nameIdx = headers.findIndex(h => h.includes('名前') || h.includes('氏名') || h.includes('name') || h.includes('受診者') || h.includes('生徒'));
  let emailIdx = headers.findIndex(h => h.includes('メアド') || h.includes('メール') || h.includes('email') || h.includes('mail') || h.includes('アドレス'));
  let slotIdx = headers.findIndex(h => h.includes('時間') || h.includes('スロット') || h.includes('slot') || h.includes('予約') || h.includes('time'));
  let attrIdx = headers.findIndex(h => h.includes('属性') || h.includes('区分') || h.includes('所属') || h.includes('役職') || h.includes('role') || h.includes('attribute') || h.includes('type'));
  let attendIdx = headers.findIndex(h => h.includes('状態') || h.includes('状況') || h.includes('出席') || h.includes('出欠') || h.includes('進行') || h.includes('進捗') || h.includes('ステータス') || h.includes('status') || h.includes('state') || h.includes('attend') || h.includes('progress'));
  let lotteryIdx = headers.findIndex(h => h.includes('くじ') || h.includes('賞') || h.includes('lottery') || h.includes('raffle'));
  let notesIdx = headers.findIndex(h => h.includes('備考') || h.includes('メモ') || h.includes('note'));

  if (attendIdx === -1 && headers.length >= 6) {
    attendIdx = 5;
  }
  if (lotteryIdx === -1 && headers.length >= 7) {
    lotteryIdx = 6;
  }

  if (headers.length >= 5 && numIdx === -1 && slotIdx === -1 && emailIdx === -1) {
    numIdx = 0;
    slotIdx = 1;
    emailIdx = 2;
    nameIdx = 3;
    attrIdx = 4;
    if (headers.length >= 6 && attendIdx === -1) attendIdx = 5;
    if (headers.length >= 7 && lotteryIdx === -1) lotteryIdx = 6;
  } else if (headers.length === 4 && slotIdx === -1 && emailIdx === -1 && nameIdx === -1) {
    slotIdx = 0;
    emailIdx = 1;
    nameIdx = 2;
    attrIdx = 3;
  }

  const usedNumbers = new Set<number>();
  let nextFallbackNumber = 1;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line, delimiter);
    if (cols.length < 2) continue;

    let parsedRawNum: number | null = null;
    if (numIdx >= 0 && cols[numIdx]) {
      const p = parseInt(cols[numIdx].replace(/[#\s]/g, ''), 10);
      if (!isNaN(p) && p > 0) {
        parsedRawNum = p;
      }
    } else if (cols[0] && /^\d+$/.test(cols[0].trim())) {
      const p = parseInt(cols[0].trim(), 10);
      if (!isNaN(p) && p > 0) {
        parsedRawNum = p;
      }
    }

    let finalNum: number;
    if (parsedRawNum !== null && !usedNumbers.has(parsedRawNum)) {
      finalNum = parsedRawNum;
    } else {
      while (usedNumbers.has(nextFallbackNumber)) {
        nextFallbackNumber++;
      }
      finalNum = nextFallbackNumber;
      nextFallbackNumber++;
    }
    usedNumbers.add(finalNum);

    const name = (nameIdx >= 0 && cols[nameIdx]) ? cols[nameIdx].trim() : `受診者${finalNum}`;
    const email = (emailIdx >= 0 && cols[emailIdx]) ? cols[emailIdx].trim() : '';
    
    const rawSlot = (slotIdx >= 0 && cols[slotIdx]) ? cols[slotIdx].trim() : '09:30';
    const { slot: timeSlot, originalNote } = normalizeTimeSlot(rawSlot);

    const attribute = (attrIdx >= 0 && cols[attrIdx]) ? cols[attrIdx].trim() : undefined;
    
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
    } else if (cleanAttendance.includes('呼出') || cleanAttendance.includes('呼び出し') || cleanAttendance.includes('called')) {
      attendance = 'absent';
      queueStatus = 'called';
    } else if (cleanAttendance.includes('問診') || cleanAttendance.includes('検査') || cleanAttendance.includes('interview')) {
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
      attendance = 'absent';
      queueStatus = 'waiting';
    }

    tickets.push({
      id: `TK-${finalNum}`,
      ticketNumber: finalNum,
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

export function parseCSVLine(text: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
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
    called: '呼び出し中',
    interview: '問診検査中',
    donating: '採血中',
    resting: '休憩中',
    done: '完了',
    absent: '欠席'
  };

  const rows = tickets.map(t => {
    const isCompleted = t.queueStatus === 'done' || t.attendance === 'completed';
    const attendanceExport = isCompleted ? '完了' : '欠席';

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

export function exportMatching7ColCSV(tickets: TicketRecord[]): string {
  const headers = ['番号', '時間', 'メアド', '名前', '属性', '状態', 'くじ引き結果'];

  const queueLabel: Record<string, string> = {
    waiting: '待機中',
    called: '呼び出し中',
    interview: '問診検査中',
    donating: '採血中',
    resting: '休憩中',
    done: '完了',
    absent: '欠席'
  };

  const rows = tickets.map(t => {
    const isDone = t.queueStatus === 'done' || t.attendance === 'completed';
    const statusText = isDone ? '完了' : (queueLabel[t.queueStatus] || '待機中');

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
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
    return true;
  } catch {
    return false;
  }
}

export const GOOGLE_APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var values = sheet.getDataRange().getValues();

    var targetRow = -1;
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]).trim() == String(data.ticketNumber).trim()) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow > 0) {
      if (data.status) {
        sheet.getRange(targetRow, 6).setValue(data.status);
      }
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

export async function fetchGoogleSheetCSV(sheetUrl: string): Promise<TicketRecord[]> {
  let csvUrl = sheetUrl.trim();

  if (csvUrl.includes('/spreadsheets/d/e/')) {
    if (!csvUrl.includes('output=csv')) {
      if (csvUrl.includes('/pubhtml')) {
        csvUrl = csvUrl.replace(/\/pubhtml.*$/, '/pub?output=csv');
      } else if (csvUrl.includes('/pub')) {
        csvUrl = csvUrl.replace(/\/pub.*$/, '/pub?output=csv');
      } else {
        csvUrl += (csvUrl.includes('?') ? '&' : '?') + 'output=csv';
      }
    }
  } else if (csvUrl.includes('/spreadsheets/d/')) {
    const match = csvUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1] && match[1] !== 'e') {
      const sheetId = match[1];
      const gidMatch = csvUrl.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    }
  }

  const cacheBuster = `_t=${Date.now()}`;
  csvUrl += (csvUrl.includes('?') ? '&' : '?') + cacheBuster;

  let text = '';
  try {
    const response = await fetch(csvUrl, { 
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });
    if (response.ok) {
      text = await response.text();
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}&${cacheBuster}`;
      const proxyRes = await fetch(proxyUrl, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      if (proxyRes.ok) {
        text = await proxyRes.text();
      } else {
        throw new Error('CORS fallback failed');
      }
    } catch {
      throw new Error(`スプレッドシートURL「${sheetUrl}」からデータを取得できませんでした。URLまたは公開設定をご確認いただくか、セルをコピーして「直接貼り付け」でお試しください。`);
    }
  }

  const lowerText = text.trim().toLowerCase();
  if (lowerText.startsWith('<!doctype') || lowerText.startsWith('<html') || (lowerText.includes('<head>') && lowerText.includes('<body>'))) {
    throw new Error('指定されたURLからウェブページ(HTML)が返されました。Google スプレッドシートの「ファイル」→「共有」→「ウェブに公開」で「カンマ区切り値(.csv)」を選んで公開したURLを指定するか、セルをコピーして下記「直接貼り付け」に貼り付けてください。');
  }

  const tickets = parseCSVToTickets(text);
  if (tickets.length === 0) {
    throw new Error('取得したURLに有効な受診者データ行が見つかりませんでした。');
  }
  return tickets;
}
