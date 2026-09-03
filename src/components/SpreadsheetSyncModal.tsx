import React, { useState, useEffect } from 'react';
import { TicketRecord } from '../types';
import { 
  DEFAULT_SHEET_CSV_TEMPLATE, 
  parseCSVToTickets, 
  exportTicketsToCSV, 
  fetchGoogleSheetCSV 
} from '../utils/spreadsheet';
import { saveSyncSettings, subscribeToSyncSettings, SyncSettings } from '../firebase';
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
  Sparkles
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
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [syncInterval, setSyncInterval] = useState<number>(60);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [csvInput, setCsvInput] = useState<string>('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  useEffect(() => {
    const unsub = subscribeToSyncSettings((settings) => {
      if (settings) {
        if (settings.sheetUrl) setSheetUrl(settings.sheetUrl);
        setAutoSync(settings.autoSync ?? true);
        if (settings.intervalSec) setSyncInterval(settings.intervalSec);
        if (settings.lastSyncedAt) setLastSyncTime(settings.lastSyncedAt);
      }
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

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
        text: `${msg} (※Google スプレッドシートの「ファイル」→「共有」→「ウェブに公開」でCSV形式として公開されているか、または直接CSV貼り付けをお試しください)` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAutoSyncSettings = async (newAuto: boolean, newInterval: number) => {
    setAutoSync(newAuto);
    setSyncInterval(newInterval);
    try {
      await saveSyncSettings({
        sheetUrl: sheetUrl.trim(),
        autoSync: newAuto,
        intervalSec: newInterval,
        lastSyncedAt: lastSyncTime
      });
    } catch (e) {
      console.warn('Failed to save sync settings to Firestore:', e);
    }
  };

  const handleDownloadCSV = () => {
    const csvContent = exportTicketsToCSV(tickets);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `献血受付整理券_予約・進行一覧_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCSV = () => {
    const csvContent = exportTicketsToCSV(tickets);
    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
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
                スプレッドシート連携＆リアルタイム全端末同期
              </h3>
              <p className="text-xs text-slate-500">
                メールアドレス・番号・氏名・時間帯をクラウド経由で全スマホへ即時反映します
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

        {/* Multi-Device Cloud Notice */}
        <div className="mt-4 p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
          <Cloud className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            <strong>全スマホ自動連携:</strong> 取り込まれた予約データはFirestoreクラウドを通じて、参加者の各スマートフォンにリアルタイム配信されます。
          </span>
        </div>

        {/* Section 1: Live URL Link & Periodic Sync */}
        <div className="mt-4 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
              スプレッドシート / 公開URL連携
            </h4>
            {lastSyncTime && (
              <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-600" />
                最終同期: {lastSyncTime}
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
                  同期中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  最新データを今すぐ取得
                </>
              )}
            </button>
          </div>

          {/* Quick preset URLs */}
          <div className="flex items-center gap-2 pt-1">
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
              <span>同期間隔:</span>
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

        {/* Section 2: Direct Paste or File Import */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowPasteArea(!showPasteArea)}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              {showPasteArea ? '貼り付けエリアを閉じる' : 'CSVテキストを直接貼り付けて取込 (番号,時間,メアド,名前,属性)'}
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
                rows={5}
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder={`番号,時間,メアド,名前,属性\n1,9:30,s25583@stu.seikyo.ed.jp,黒田悠人,生徒\n2,9:40,s25719@stu.seikyo.ed.jp,平松宗一郎,生徒`}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-400"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  ※9:40や9:50は自動的に「09:30」枠へ割り振られます
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

        {/* Section 3: Export Data */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-slate-600" />
            現在の予約＆進行一覧のエクスポート ({tickets.length} 名)
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              CSVファイルをダウンロード
            </button>

            <button
              onClick={handleCopyCSV}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'クリップボードにコピー完了' : 'CSVテキストをコピー'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
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
