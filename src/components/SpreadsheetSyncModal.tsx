import React, { useState, useEffect } from 'react';
import { TicketRecord } from '../types';
import { 
  parseCSVToTickets, 
  exportTicketsToCSV, 
  exportMatching7ColCSV,
  fetchGoogleSheetCSV 
} from '../utils/spreadsheet';
import { saveSyncSettings, subscribeToSyncSettings } from '../firebase';
import { 
  FileSpreadsheet, 
  X, 
  Download, 
  Upload, 
  Copy, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Cloud, 
  Clock, 
  Sparkles,
  ShieldCheck,
  CheckCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck
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
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied7Col, setCopied7Col] = useState(false);
  const [csvInput, setCsvInput] = useState<string>('');
  const [showPasteArea, setShowPasteArea] = useState(true);

  // Auto-fill clipboard or direct paste
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setCsvInput(text.trim());
        const parsed = parseCSVToTickets(text.trim());
        if (parsed.length > 0) {
          onImportTickets(parsed);
          setStatusMsg({ 
            type: 'success', 
            text: `クリップボードから ${parsed.length} 名（${parsed.map(p => p.name).join('、')}）を取り込みました！` 
          });
          setCsvInput('');
          return;
        }
      }
    } catch {
      // Fallback: user can paste manually into textarea
    }
    setShowPasteArea(true);
  };
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  useEffect(() => {
    const unsub = subscribeToSyncSettings((settings) => {
      if (settings) {
        if (settings.sheetUrl) setSheetUrl(settings.sheetUrl);
        if (settings.lastSyncedAt) setLastSyncTime(settings.lastSyncedAt);
      }
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  // Fetch read data from Google Sheet (Initial loading)
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
        autoSync: false,
        lastSyncedAt: nowStr,
        lastSyncCount: newTickets.length
      });

      setStatusMsg({ 
        type: 'success', 
        text: `スプレッドシートから ${newTickets.length} 名の予約データを読み込みました！以降の呼び出し・進行状況・くじ引き結果はアプリとクラウド上で安全に管理されます。` 
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
    setTimeout(() => setCopied7Col(false), 3500);
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

  const handlePasteImport = () => {
    if (!csvInput.trim()) return;
    try {
      const parsed = parseCSVToTickets(csvInput.trim());
      if (parsed.length === 0) {
        throw new Error('解析できるデータ行がありませんでした。');
      }
      onImportTickets(parsed);
      setStatusMsg({ type: 'success', text: `貼り付けられたデータから ${parsed.length} 名を取り込みました。` });
      setCsvInput('');
      setShowPasteArea(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '解析に失敗しました';
      setStatusMsg({ type: 'error', text: msg });
    }
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
                スプレッドシート名簿読込・結果出力
              </h3>
              <p className="text-xs text-slate-500">
                名簿の初期読み込みと、終了後の実施結果（出欠・状態・くじ結果）書き出し
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

        {/* Operation Policy Notice */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>安心・高速な単方向データ連携</span>
          </div>
          <p className="leading-relaxed text-[11px] text-slate-600">
            スプレッドシートは「予約者名簿の最初の読み込み」のみに使用します。読み込み後の呼出・進行状況（問診検査中・採血中等）やくじ引き結果はアプリ内部とクラウドで即座に同期され、スプレッドシート側への自動送信は行われません。受付終了後や記録が必要な時は、STEP 2からワンクリックで結果をコピーして貼り付けられます。
          </p>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-start gap-2 ${
            statusMsg.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
            <span className="leading-relaxed">{statusMsg.text}</span>
          </div>
        )}

        {/* STEP 1: Import initial attendee roster */}
        <div className="mt-4 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <ArrowDownToLine className="w-4 h-4 text-emerald-700" />
              【STEP 1】名簿データの読み込み（初期インポート）
            </h4>
            {lastSyncTime && (
              <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-600" />
                最終読込: {lastSyncTime}
              </span>
            )}
          </div>

          <p className="text-[11px] text-emerald-900/90 leading-relaxed">
            Google スプレッドシートのウェブ公開CSVのURL、または公開ページURLを指定して名簿を読み込みます。
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/... または CSV公開URL"
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
                  読込中...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  名簿を読み込む
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

          {/* Direct CSV / Spreadsheet Paste option */}
          <div className="pt-2 border-t border-emerald-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                スプレッドシートのセルをコピーして直接貼り付ける場合
              </span>
              <button
                onClick={handlePasteFromClipboard}
                type="button"
                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-white hover:bg-emerald-100/80 border border-emerald-300 rounded-lg transition flex items-center gap-1 shadow-2xs"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                クリップボードから貼付
              </button>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              スプレッドシート上の行（A列:番号、B列:時間、C列:メアド、D列:名前、E列:属性）をドラッグ選択してコピー（Ctrl+C / ⌘+C）し、下の枠に貼り付けてください（タブ区切り・カンマ区切りどちらも自動認識します）。
            </p>

            <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-2">
              <textarea
                rows={4}
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder={"スプレッドシートのセルをコピーしてここに貼り付け（Ctrl+V）\n例:\n1\t9:30\ts25583@stu.seikyo.ed.jp\t黒田悠人\t生徒\n2\t9:50\ts25719@stu.seikyo.ed.jp\t平松宗一郎\t生徒\n3\t10:00\ts99999@stu.seikyo.ed.jp\tデモ太郎\t生徒"}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500 whitespace-pre"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  ※見出し行（番号・時間・名前など）の有無に関わらず読み込めます
                </span>
                <button
                  onClick={handlePasteImport}
                  className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  貼り付けデータを反映
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2: Export results to Sheet */}
        <div className="mt-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <ArrowUpFromLine className="w-4 h-4 text-amber-700" />
              【STEP 2】実施結果の書き出し・スプレッドシートへの貼り付け
            </h4>
            <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-md">
              A〜G列 完全対応
            </span>
          </div>

          <p className="text-[11px] text-amber-900/90 leading-relaxed">
            受付終了時や集計時に、現在の最新状態（F列：待機中／呼び出し中／問診検査中／採血中／完了）と、くじ引き結果（G列）が入ったデータを1クリックでコピーできます。スプレッドシートのA1セルを選んで貼り付け（Ctrl+V / Cmd+V）するだけで即反映されます。
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleCopy7ColCSV}
              className="px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 active:scale-95 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
            >
              {copied7Col ? <CheckCheck className="w-4 h-4 text-amber-200" /> : <Copy className="w-4 h-4" />}
              {copied7Col ? 'コピー完了！シートのA1セルに貼り付けてください' : 'スプレッドシート用7列をコピー (A~G列)'}
            </button>

            <button
              onClick={handleDownload7ColCSV}
              className="px-3.5 py-2.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              7列CSVを保存
            </button>

            <button
              onClick={handleDownloadFullCSV}
              className="px-3 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center gap-1.5"
              title="呼出時刻や完了時刻を含む全項目CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              詳細記録CSV (11列)
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Cloud className="w-3.5 h-3.5 text-blue-500" />
            <span>クラウド同期稼働中（受診者スマホ・全スタッフ端末へ即時反映）</span>
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
