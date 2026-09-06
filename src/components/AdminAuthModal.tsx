import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, X, Loader2, RotateCcw, CheckCircle2 } from 'lucide-react';
import { loginAdminWithFirebaseAuth, resetAdminPasswordWithNewAccount } from '../firebase';

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
  const [isResetMode, setIsResetMode] = useState(false);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('パスワードを入力してください');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setSuccess(null);

    try {
      await loginAdminWithFirebaseAuth(password.trim());
      setPassword('');
      setError(null);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'パスワードが正しくないか、認証に失敗しました。');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError('新しいパスワードは6文字以上で入力してください');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('パスワード（確認用）が一致しません');
      return;
    }

    setIsVerifying(true);
    try {
      await resetAdminPasswordWithNewAccount(newPassword.trim());
      setSuccess('パスワードを新しく設定し、管理者としてログインしました。');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsResetMode(false);
        onSuccess();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'パスワードの再設定に失敗しました。');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
    setIsResetMode(false);
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
            {isResetMode ? <RotateCcw className="w-5 h-5 text-rose-700" /> : <Lock className="w-5 h-5 text-rose-700" />}
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {isResetMode ? '管理者パスワードの再設定' : '管理者画面の認証'}
          </h3>
          <p className="text-xs text-slate-500">
            {isResetMode 
              ? 'お好みの新しいパスワード（6文字以上）を設定してログインします'
              : 'Firebase Authentication によるセキュア認証'}
          </p>
        </div>

        {!isResetMode ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                管理者パスワード
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  disabled={isVerifying}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="パスワードを入力"
                  autoFocus
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-700/10 focus:border-rose-700 transition disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div>{error}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setIsResetMode(true);
                    }}
                    className="mt-1.5 text-rose-700 font-bold underline hover:text-rose-900 text-[11px] block cursor-pointer"
                  >
                    パスワードをお忘れ・変更したい場合はこちら（再設定）
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={isVerifying}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isVerifying || !password.trim()}
                className="flex-1 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    照合中...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    認証してログイン
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setIsResetMode(true);
                }}
                className="text-xs text-slate-500 hover:text-rose-700 transition font-medium cursor-pointer"
              >
                パスワードをお忘れの場合（再設定）
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                新しい管理者パスワード（6文字以上）
              </label>
              <div className="relative">
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  value={newPassword}
                  disabled={isVerifying}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="新しいパスワード（例: admin1234）"
                  autoFocus
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-700/10 focus:border-rose-700 transition disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                新しいパスワード（確認用）
              </label>
              <input
                type={showResetPassword ? 'text' : 'password'}
                value={confirmPassword}
                disabled={isVerifying}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="新しいパスワードを再入力"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-700/10 focus:border-rose-700 transition disabled:bg-slate-50"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setIsResetMode(false);
                }}
                disabled={isVerifying}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
              >
                戻る
              </button>
              <button
                type="submit"
                disabled={isVerifying || !newPassword || !confirmPassword}
                className="flex-1 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    設定中...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    設定してログイン
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          ※ Firebase Authentication により保護されています。
        </p>
      </div>
    </div>
  );
};
