import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, X } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('パスワードを入力してください');
      return;
    }

    const validPasswords = ['donation2025', 'blood2025', 'admin', 'pass', '1234'];
    const matched = validPasswords.includes(password.trim().toLowerCase());

    if (matched) {
      setError(null);
      setPassword('');
      onSuccess();
    } else {
      setError('パスワードが正しくありません');
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          aria-label="閉じる"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1.5 pt-2">
          <div className="inline-flex p-3 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200/80 mb-1">
            <Lock className="w-5 h-5 text-rose-700" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            管理者画面の認証
          </h3>
          <p className="text-xs text-slate-500">
            運営担当者用パスワードを入力してください
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              パスワード
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="パスワードを入力"
                autoFocus
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-700/10 focus:border-rose-700 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              認証して移行
            </button>
          </div>
        </form>

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          ※ パスワードは運営スタッフ・文化祭担当者のみに共有されています。
        </p>
      </div>
    </div>
  );
};
