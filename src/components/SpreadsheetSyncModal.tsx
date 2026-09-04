import React, { useState, useEffect } from 'react';
import { TicketRecord } from '../types';
import { 
  DEFAULT_SHEET_CSV_TEMPLATE, 
  parseCSVToTickets, 
  exportTicketsToCSV, 
  exportMatching7ColCSV,
  fetchGoogleSheetCSV,
  sendUpdateToGoogleSheet,
  GOOGLE_APPS_SCRIPT_CODE
} from '../utils/spreadsheet';
import { saveSyncSettings, subscribeToSyncSettings } from '../firebase';
import { 
  FileSpreadsheet, 
  X, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Cloud, 
  Clock, 
  Sparkles,
  Send,
  Code,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';

interface SpreadsheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: TicketRecord[];
  onImportTickets: (tickets: TicketRecord[]) => void;
}

export const SpreadsheetSyncModal: React.FC<SpreadsheetSyncModalProps> = ({
  isOpen,
  onClose,
  tickets,
  onImportTickets,
}) => {
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    return localStorage.getItem('blood_donation_sheet_url') || 'https://rocketdayo.github.io/donation/';
  });
  const [writeWebhookUrl, setWriteWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('blood_donation_write_webhook_url') || '';
  });
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [syncInterval, setSyncInterval] = useState<number>(60);
  const [loading, setLoading] = useState(false);
  const [testingWrite, setTestingWrite] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied7Col, setCopied7Col] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedGas, setCopiedGas] = useState(false);
  const [showGasGuide, setShowGasGuide] = useState(false);
  const [csvInput, setCsvInput] = useState<string>('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  useEffect(() => {
    const unsub = subscribeToSyncSettings((settings) => {
      if (settings) {
        if (settings.sheetUrl) setSheetUrl(settings.sheetUrl);
        if (settings.writeWebhookUrl !== undefined) setWriteWebhookUrl(settings.writeWebhookUrl);
        setAutoSync(settings.autoSync ?? true);
        if (settings.intervalSec) setSyncInterval(settings.intervalSec);
        if (settings.lastSyncedAt) setLastSyncTime(settings.lastSyncedAt);
      }
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  // Fetch read data from Google Sheet
  const handleFetchFromSheet = async () => {
    if (!sheetUrl.trim()) {
      setStatusMsg({ type: 'error', text: 'Google スプレッドシートのURLまたはCSVリンクを入力してください。' });
      return;
    }
    setLoading(true);
    setStatusMsg(null);
    try {
      localStorage.setItem('blood_donation_sheet_url', sheetUrl.trim());
      const newTickets = await fetchGoogleSheetCSV(sheetUrl.trim());
      if (newTickets.length === 0) {
        throw new Error('スプレッドシートから有効な受診者データが見つかりませんでした。');
      }
      onImportTickets(newTickets);
      
      const nowStr = new Date().toLocaleTimeString('ja-JP');
      setLastSyncTime(nowStr);

      await saveSyncSettings({
        sheetUrl: sheetUrl.trim(),
        writeWebhookUrl: writeWebhookUrl.trim(),
        autoSync,
        intervalSec: syncInterval,
        lastSyncedAt: nowStr,
        lastSyncCount: newTickets.length
      });

      setStatusMsg({ 
        type: 'success', 
        text: `スプレッドシートから ${newTickets.length} 名の予約データを取得し、全端末（クラウド）へ同期しました。` 
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '取得に失敗しました';
      setStatusMsg({ 
        type: 'error', 
        text: `${msg} (※Google スプレッドシートの「ファイル」→「共有」→「ウェブに公開」でCSV形式として公開されているかご確認ください)` 
      });
    } finally {
      setLoading(false);
    }
  };

  // Save Webhook URL for writing to Column F & G
  const handleSaveWebhook = async () => {
    localStorage.setItem('blood_donation_write_webhook_url', writeWebhookUrl.trim());
    try {
      await saveSyncSettings({
        sheetUrl: sheetUrl.trim(),
        writeWebhookUrl: writeWebhookUrl.trim(),
        autoSync,
        intervalSec: syncInterval,
        lastSyncedAt: lastSyncTime
      });
      setStatusMsg({
        type: 'success',
        text: 'スプレッドシート自動書き込み用 Webhook URL を保存しました。以降、進行状況やくじ結果が自動送信されます。'
      });
    } catch (e) {
      console.warn('Failed to save webhook settings:', e);
      setStatusMsg({ type: 'error', text: '設定の保存に失敗しました。' });
    }
  };

  // Test sending to Google Apps Script Webhook
  const handleTestWrite = async () => {
    if (!writeWebhookUrl.trim()) {
      setStatusMsg({ type: 'error', text: '書き込み用 Webhook URL を入力してください。' });
      return;
    }
    setTestingWrite(true);
    setStatusMsg(null);
    try {
      const firstTicket = tickets[0] || { ticketNumber: 1, name: 'テスト受診者', queueStatus: 'waiting' };
      const success = await sendUpdateToGoogleSheet(writeWebhookUrl.trim(), {
        ticketNumber: firstTicket.ticketNumber,
        name: firstTicket.name,
        status: '呼出中 (テスト送信)',
        lotteryResult: 'テスト済',
        attendance: '欠席'
      });

      if (success) {
        setStatusMsg({
          type: 'success',
          text: `テスト送信を実行しました！スプレッドシートの「番号 ${firstTicket.ticketNumber}」の行（F列・G列）が更新されたかご確認ください。`
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: 'Webhookへの送信に失敗しました。URLが正しいか、GASが「全員（Anyone）」に公開されているかご確認ください。'
        });
      }
    } finally {
      setTestingWrite(false);
    }
  };

  const handleSaveAutoSyncSettings = async (newAuto: boolean, newInterval: number) => {
    setAutoSync(newAuto);
    setSyncInterval(newInterval);
    try {
      await saveSyncSettings({
        sheetUrl: sheetUrl.trim(),
        writeWebhookUrl: writeWebhookUrl.trim(),
        autoSync,
        intervalSec: newInterval,
        lastSyncedAt: lastSyncTime
      });
    } catch (e) {
      console.warn('Failed to save sync settings to Firestore:', e);
    }
  };

  // 7-column CSV (matching sheet: 番号, 時間, メアド, 名前, 属性, 状態, くじ引き結果)
  const handleDownload7ColCSV = () => {
    const csvContent = exportMatching7ColCSV(tickets);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `献血受付整理券_スプレッドシート7列形式_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy7ColCSV = () => {
    const csvContent = exportMatching7ColCSV(tickets);
    navigator.clipboard.writeText(csvContent);
    setCopied7Col(true);
    setTimeout(() => setCopied7Col(false), 3000);
  };

  // Full detailed CSV (11 columns)
  const handleDownloadFullCSV = () => {
    const csvContent = exportTicketsToCSV(tickets);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `献血受付整理券_詳細11列記録_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyGasCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedGas(true);
    setTimeout(() => setCopiedGas(false), 3000);
  };

  const handlePasteImport = () => {
    if (!csvInput.trim()) return;
    try {
      const parsed = parseCSVToTickets(csvInput.trim());
      if (parsed.length === 0) {
        throw new Error('解析できるデータ行がありませんでした。');
      }
      onImportTickets(parsed);
      setStatusMsg({ type: 'success', text: `貼り付けられたCSVから ${parsed.length} 名のデータを取り込み、クラウドへ共有しました。` });
      setCsvInput('');
      setShowPasteArea(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '解析に失敗しました';
      setStatusMsg({ type: 'error', text: msg });
    }
  };

  const handleLoadTemplate = () => {
    setCsvInput(DEFAULT_SHEET_CSV_TEMPLATE);
    setShowPasteArea(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                スプレッドシート連携＆F列・G列自動書き込み設定
              </h3>
              <p className="text-xs text-slate-500">
                進行状況（待機・呼出・問診・採血・完了）やくじ結果をスプレッドシートへ連動します
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className={`mt-4 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2 ${
            statusMsg.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
            <span className="leading-relaxed">{statusMsg.text}</span>
          </div>
        )}

        {/* SECTION 1: Automatic Write into Column F & G (GAS Webhook) */}
        <div className="mt-4 p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-indigo-700" />
              【本命策】F列（状態）＆ G列（くじ結果）への自動リアルタイム書き込み
            </h4>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-bold border border-indigo-200">
              Google Apps Script連携
            </span>
          </div>

          <p className="text-[11px] text-indigo-900/90 leading-relaxed">
            ※Googleスプレッドシートのセキュリティ仕様上、通常の閲覧URLは<strong>読み取り専用</strong>です。
            下記の<strong>短いスクリプト（GAS）</strong>をスプレッドシートに貼り付けて「ウェブアプリ」としてデプロイすると、アプリでの操作と同時に<strong>F列（進行状況）とG列（くじ引き結果）がリアルタイムで自動記入</strong>されます！
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={writeWebhookUrl}
              onChange={(e) => setWriteWebhookUrl(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-white border border-indigo-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveWebhook}
                className="px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                保存
              </button>
              <button
                onClick={handleTestWrite}
                disabled={testingWrite}
                className="px-3.5 py-2 rounded-xl bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-900 text-xs font-bold transition flex items-center gap-1"
              >
                {testingWrite ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                書き込みテスト
              </button>
            </div>
          </div>

          {/* Toggle GAS Instructions & Code */}
          <div className="pt-2 border-t border-indigo-200/60">
            <button
              onClick={() => setShowGasGuide(!showGasGuide)}
              className="w-full flex items-center justify-between text-xs font-bold text-indigo-900 hover:text-indigo-950 transition py-1"
            >
              <span className="flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-indigo-600" />
                約2分で完了！Google Apps Script の導入手順とコピペ用コード
              </span>
              {showGasGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showGasGuide && (
              <div className="mt-2.5 p-3.5 bg-white rounded-xl border border-indigo-200 space-y-3 text-xs text-slate-700">
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-800 leading-relaxed font-medium">
                  <li>スプレッドシート上部メニューの<strong>「拡張機能」→「Apps Script」</strong>を開きます。</li>
                  <li>元からあるコードを全選択して削除し、下のコードを貼り付けて<strong>保存（フロッピーアイコン）</strong>します。</li>
                  <li>右上の青い<strong>「デプロイ」→「新しいデプロイ」</strong>をクリックします。</li>
                  <li>左側の歯車アイコンから<strong>「ウェブアプリ」</strong>を選択します。</li>
                  <li>
                    設定項目：
                    <ul className="list-disc list-inside pl-3 pt-0.5 text-slate-600">
                      <li>次のユーザーとして実行: <strong>「自分」</strong></li>
                      <li>アクセスできるユーザー: <strong>「全員 (Anyone)」</strong></li>
                    </ul>
                  </li>
                  <li>「デプロイ」を押し、発行された<strong>「ウェブアプリのURL」</strong>をコピーして上の入力欄に貼り付けます。</li>
                </ol>

                <div className="relative mt-2">
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[10px] font-mono overflow-x-auto max-h-48 border border-slate-700">
                    {GOOGLE_APPS_SCRIPT_CODE}
                  </pre>
                  <button
                    onClick={handleCopyGasCode}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                  >
                    {copiedGas ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    {copiedGas ? 'コピーしました！' : 'コードをコピー'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Read Live Sheet URL */}
        <div className="mt-4 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
              スプレッドシート予約データ取得（読み込み）
            </h4>
            {lastSyncTime && (
              <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-600" />
                最終取得: {lastSyncTime}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="例: https://docs.google.com/spreadsheets/d/... または CSV公開URL"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-white border border-emerald-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-mono"
            />
            <button
              onClick={handleFetchFromSheet}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs flex-shrink-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  取得中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  最新データを今すぐ取得
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[11px] text-slate-500 font-medium">プリセット:</span>
            <button
              type="button"
              onClick={() => setSheetUrl('https://rocketdayo.github.io/donation/')}
              className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 text-[11px] font-medium transition flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              rocketdayo.github.io/donation/
            </button>
          </div>

          {/* Auto Periodic Sync Controls */}
          <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => handleSaveAutoSyncSettings(e.target.checked, syncInterval)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-bold text-emerald-950">定期的な自動取得（バックグラウンド更新）</span>
            </label>

            <div className="flex items-center gap-1.5 text-[11px] text-emerald-900">
              <span>取得間隔:</span>
              <select
                value={syncInterval}
                onChange={(e) => handleSaveAutoSyncSettings(autoSync, Number(e.target.value))}
                className="px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-semibold"
              >
                <option value={30}>30秒ごと</option>
                <option value={60}>1分ごと (推奨)</option>
                <option value={300}>5分ごと</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: Countermeasure (対抗策) - 1-Click Export & Copy */}
        <div className="mt-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              【対抗策】GASを設定しない場合の1クリック手動更新＆エクスポート
            </h4>
            <span className="text-[10px] bg-amber-200/70 text-amber-900 font-bold px-2 py-0.5 rounded-md">
              設定不要・即実行可能
            </span>
          </div>
          <p className="text-[11px] text-amber-900/90 leading-relaxed">
            GASの設定を行わない場合でも、現在の状態（F列）とくじ引き結果（G列）が入力されたデータを1クリックでコピーできます。スプレッドシートのA1セルを選択して貼り付け（Ctrl+V / Cmd+V）するだけで即時反映できます。
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleCopy7ColCSV}
              className="px-3.5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              {copied7Col ? <CheckCheck className="w-3.5 h-3.5 text-amber-200" /> : <Copy className="w-3.5 h-3.5" />}
              {copied7Col ? 'コピー完了！シートのA1に貼り付けてください' : 'スプレッドシート用7列をコピー (A~G列)'}
            </button>

            <button
              onClick={handleDownload7ColCSV}
              className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              7列CSVをダウンロード
            </button>

            <button
              onClick={handleDownloadFullCSV}
              className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              詳細11列CSV
            </button>
          </div>
        </div>

        {/* SECTION 4: Direct CSV Paste Area */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowPasteArea(!showPasteArea)}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              {showPasteArea ? '貼り付け取込エリアを閉じる' : 'CSVテキストを直接貼り付けて取込 (手動インポート)'}
            </button>
            <button
              onClick={handleLoadTemplate}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              テンプレートを読込
            </button>
          </div>

          {showPasteArea && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <textarea
                rows={4}
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder={`番号,時間,メアド,名前,属性\n1,9:30,s25583@stu.seikyo.ed.jp,黒田悠人,生徒\n2,9:40,s25719@stu.seikyo.ed.jp,平松宗一郎,生徒`}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-400"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  ※F列が空欄の場合は「待機中（欠席）」として安全に取り込まれます
                </span>
                <button
                  onClick={handlePasteImport}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  データを全端末へ反映
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Cloud className="w-3.5 h-3.5 text-blue-500" />
            <span>全端末クラウドリアルタイム同期中</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
