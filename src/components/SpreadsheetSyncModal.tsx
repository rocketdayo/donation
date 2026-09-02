import React, { useState } from 'react';
import { TicketRecord } from '../types';
import { 
  DEFAULT_SHEET_CSV_TEMPLATE, 
  parseCSVToTickets, 
  exportTicketsToCSV, 
  fetchGoogleSheetCSV 
} from '../utils/spreadsheet';
import { sounds } from '../utils/audio';
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
  CheckCircle2
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
    return localStorage.getItem('blood_donation_sheet_url') || '';
  });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [csvInput, setCsvInput] = useState<string>('');
  const [showPasteArea, setShowPasteArea] = useState(false);

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
      sounds.playCallingChime();
      setStatusMsg({ type: 'success', text: `スプレッドシートから ${newTickets.length} 名の予約データを正常に取り込みました。` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '取得に失敗しました';
      setStatusMsg({ type: 'error', text: `${msg} (※Google スプレッドシートの「ファイル」→「共有」→「ウェブに公開」でCSV形式として公開されているか確認してください)` });
    } finally {
      setLoading(false);
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
    sounds.playClick();
  };

  const handleCopyCSV = () => {
    const csvContent = exportTicketsToCSV(tickets);
    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    sounds.playClick();
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
      sounds.playCallingChime();
      setStatusMsg({ type: 'success', text: `貼り付けられたCSVから ${parsed.length} 名のデータを取り込みました。` });
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
    sounds.playClick();
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
                Google スプレッドシート連携＆CSV入出力
              </h3>
              <p className="text-xs text-slate-500">
                メールアドレス・氏名・予約時間帯・進行ステータスを同期します
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

        {/* Section 1: Live Google Sheet URL Link */}
        <div className="mt-5 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
          <h4 className="text-xs font-bold text-emerald-950 mb-2 flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
            スプレッドシート公開URLから直接インポート
          </h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="例: https://docs.google.com/spreadsheets/d/.../pub?output=csv または共有URL"
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
                  シートから最新取得
                </>
              )}
            </button>
          </div>
          <div className="mt-2 text-[11px] text-emerald-900/80 leading-relaxed">
            スプレッドシートの「ファイル」➔「共有」➔「ウェブに公開」で「カンマ区切り形式 (.csv)」を選択して取得したリンクを指定してください。
          </div>
        </div>

        {/* Section 2: Export Data */}
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

        {/* Section 3: Direct Paste or File Import */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowPasteArea(!showPasteArea)}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              {showPasteArea ? '貼り付けエリアを閉じる' : 'CSVテキストを直接貼り付けて取込'}
            </button>
            <button
              onClick={handleLoadTemplate}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              サンプルテンプレートを読込
            </button>
          </div>

          {showPasteArea && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <textarea
                rows={5}
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder={`整理券番号,氏名,メールアドレス,予約時間帯,出席状況,備考\n1,佐藤 健一,kenichi@example.com,09:00 - 09:30,出席,`}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-400"
              />
              <button
                onClick={handlePasteImport}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                データをシステムへ反映
              </button>
            </div>
          )}
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
