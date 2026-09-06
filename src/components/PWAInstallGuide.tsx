import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [, setJustInstalled] = useState(false);

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        PWA インストール済
      </span>
    );
  }

  if (isInstallable) {
    return (
      <button
        id="pwa-install-btn"
        type="button"
        onClick={async () => {
          const ok = await install();
          if (ok) setJustInstalled(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition cursor-pointer"
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span>アプリをインストール (PWA)</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          id="pwa-ios-install-btn"
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>iOSホーム画面に追加</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-rose-600" />
                  iPhone / iPad への追加手順
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px]">1</span>
                  <p>Safariの画面下部にある<strong>共有アイコン (四角から矢印)</strong> をタップします。</p>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px]">2</span>
                  <p>メニューをスクロールし、<strong>「ホーム画面に追加」</strong>を選択します。</p>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px]">3</span>
                  <p>右上の<strong>「追加」</strong>をタップすると、アプリとして起動しプッシュ通知を受信できます。</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      id="pwa-generic-guide-btn"
      type="button"
      onClick={() => setShowIOSGuide(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
      title="PWAとしてホーム画面にインストール"
    >
      <Download className="w-3.5 h-3.5 text-rose-600" />
      <span>PWA設定</span>
    </button>
  );
};
