import React from 'react';
import { Loader2, Heart } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  onSkip?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'データを読み込んでいます...',
  subMessage = 'クラウドから最新の整理券・受付状況を取得中',
  onSkip,
}) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shadow-xs">
          <Heart className="w-8 h-8 text-rose-600 animate-pulse" />
        </div>
        <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white border border-slate-200 shadow-xs">
          <Loader2 className="w-4 h-4 text-slate-700 animate-spin" />
        </div>
      </div>

      <h3 className="text-base font-bold text-slate-900 tracking-tight">
        {message}
      </h3>
      <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
        {subMessage}
      </p>

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="mt-6 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition shadow-2xs cursor-pointer"
        >
          そのまま開く
        </button>
      )}
    </div>
  );
};
