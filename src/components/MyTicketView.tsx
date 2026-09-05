import React, { useState, useMemo, useEffect } from 'react';
import { TicketRecord } from '../types';
import { 
  Search, 
  Clock, 
  Bell, 
  BellRing, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Mail, 
  ChevronRight,
  Send,
  Sparkles,
  QrCode,
  Smartphone,
  Share,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Download,
  PlusSquare,
  Info,
  LogOut,
  ArrowRight,
  Check
} from 'lucide-react';
import { NotificationManager } from '../utils/notifications';
import { sounds } from '../utils/audio';
import { auth } from '../firebase';
import { DonationGuidelines } from './DonationGuidelines';
import { LoadingScreen } from './LoadingScreen';
import { findMatchingTicket, normalizeQueryString } from '../utils/studentIdMatcher';

interface MyTicketViewProps {
  tickets: TicketRecord[];
  notificationPermission: NotificationPermission;
  onReqNotifications: () => void;
  onSwitchToAdmin?: () => void;
  isLoading?: boolean;
}

const STORAGE_EMAIL_KEY = 'blood_donation_user_email';

export const MyTicketView: React.FC<MyTicketViewProps> = ({
  tickets,
  notificationPermission,
  onReqNotifications,
  onSwitchToAdmin,
  isLoading = false,
}) => {
  // Saved or verified user email
  const [userEmail, setUserEmail] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    // 1. Check URL query params
    const params = new URLSearchParams(window.location.search);
    const queryEmail = params.get('email') || params.get('mail');
    if (queryEmail) return queryEmail.trim().toLowerCase();
    
    // 2. Check localStorage
    const stored = localStorage.getItem(STORAGE_EMAIL_KEY);
    if (stored) return stored.trim().toLowerCase();

    // 3. Check Firebase Auth user if available
    if (auth.currentUser?.email) return auth.currentUser.email.trim().toLowerCase();

    return '';
  });

  // Input state for email verification form
  const [inputEmail, setInputEmail] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [notifSent, setNotifSent] = useState(false);
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  // Sync auth state if signed in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user?.email && !userEmail) {
        const email = user.email.trim().toLowerCase();
        setUserEmail(email);
        localStorage.setItem(STORAGE_EMAIL_KEY, email);
      }
    });
    return () => unsubscribe();
  }, [userEmail]);

  // PWA standalone and beforeinstallprompt detection
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowPwaGuide(prev => !prev);
    }
  };

  // Find ticket matching the verified user email or student ID
  const currentTicket = useMemo(() => {
    if (!userEmail) return null;
    return findMatchingTicket(userEmail, tickets).ticket;
  }, [tickets, userEmail]);

  // Track last alerted ticket call event to avoid infinite looping while alerting on every real call/re-call
  const lastAlertRef = React.useRef<{ id: string; status: string; timestamp: number }>({
    id: '',
    status: '',
    timestamp: 0
  });

  useEffect(() => {
    if (!currentTicket) return;

    const prev = lastAlertRef.current;
    const isSameTicket = prev.id === currentTicket.id;
    const isCalled = currentTicket.queueStatus === 'called';
    const hasNewTimestamp = Boolean(
      currentTicket.calledTimestamp && 
      currentTicket.calledTimestamp > prev.timestamp
    );
    const hasStatusTransition = isCalled && prev.status !== 'called';

    // When newly called or re-broadcasted from admin
    if (isCalled && (!isSameTicket || hasStatusTransition || hasNewTimestamp)) {
      lastAlertRef.current = {
        id: currentTicket.id,
        status: currentTicket.queueStatus,
        timestamp: currentTicket.calledTimestamp || Date.now()
      };

      // Trigger full call alerts: Sound Chime + Speech Announcement + Phone Vibration + System Notification Bar
      NotificationManager.sendCallNotification(currentTicket);
    } else {
      lastAlertRef.current = {
        id: currentTicket.id,
        status: currentTicket.queueStatus,
        timestamp: currentTicket.calledTimestamp || prev.timestamp
      };
    }
  }, [currentTicket?.id, currentTicket?.queueStatus, currentTicket?.calledTimestamp]);

  // Handle email lookup / verification submission with intelligent Student ID support
  const handleVerifyEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setVerifyError(null);
    const target = normalizeQueryString(inputEmail);
    if (!target) {
      setVerifyError('メールアドレスまたは学籍番号を入力してください');
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      const match = findMatchingTicket(target, tickets);
      if (match.ticket) {
        // Save the canonical email of matched ticket
        const canonicalEmail = match.ticket.email.trim().toLowerCase();
        setUserEmail(canonicalEmail);
        localStorage.setItem(STORAGE_EMAIL_KEY, canonicalEmail);
        setVerifyError(null);
      } else {
        setVerifyError(`「${inputEmail}」に一致する献血予約・整理券が見つかりませんでした。学籍番号（例: s25583）またはご登録のメールアドレスをご確認ください。`);
      }
      setIsVerifying(false);
    }, 250);
  };

  // Switch or clear email verification
  const handleResetEmail = () => {
    setUserEmail('');
    localStorage.removeItem(STORAGE_EMAIL_KEY);
    setInputEmail('');
    setVerifyError(null);
  };

  // Currently called tickets
  const currentlyCalled = tickets.filter(t => t.queueStatus === 'called');
  
  // Waiting queue calculation
  const waitingTickets = tickets.filter(t => t.queueStatus === 'waiting');
  const myQueuePosition = currentTicket && currentTicket.queueStatus === 'waiting'
    ? waitingTickets.findIndex(t => t.id === currentTicket.id) + 1
    : 0;

  // Status visual mapping
  const getStatusDisplay = (ticket: TicketRecord) => {
    switch (ticket.queueStatus) {
      case 'called':
        return {
          title: 'お呼出中です',
          description: '献血受付・問診カウンターへお進みください',
          badge: '呼出中',
          bgClass: 'bg-amber-500 text-slate-950',
          borderClass: 'border-amber-400',
          cardBg: 'bg-amber-50/50'
        };
      case 'interview':
        return {
          title: '問診・検査中',
          description: '医師による問診およびヘモグロビン検査を行っています',
          badge: '問診中',
          bgClass: 'bg-blue-600 text-white',
          borderClass: 'border-blue-400',
          cardBg: 'bg-blue-50/40'
        };
      case 'donating':
        return {
          title: '採血中',
          description: '献血バスまたはベッドにて採血を行っています',
          badge: '採血中',
          bgClass: 'bg-rose-700 text-white',
          borderClass: 'border-rose-400',
          cardBg: 'bg-rose-50/40'
        };
      case 'resting':
        return {
          title: '休憩・水分補給中',
          description: '採血後の体調安定のため、十分な水分補給とご休憩をお願いします',
          badge: '休憩中',
          bgClass: 'bg-teal-600 text-white',
          borderClass: 'border-teal-400',
          cardBg: 'bg-teal-50/40'
        };
      case 'done':
        return {
          title: '本日の献血完了',
          description: '温かいご協力ありがとうございました',
          badge: '完了',
          bgClass: 'bg-slate-800 text-white',
          borderClass: 'border-slate-300',
          cardBg: 'bg-slate-50'
        };
      case 'absent':
        return {
          title: '欠席・キャンセル',
          description: '受付はキャンセルされました',
          badge: '欠席',
          bgClass: 'bg-slate-400 text-white',
          borderClass: 'border-slate-200',
          cardBg: 'bg-slate-50'
        };
      default: // waiting
        return {
          title: myQueuePosition > 0 ? `順番待ち中（あと約 ${myQueuePosition} 番目）` : '待機中',
          description: 'お呼び出しまで待機ロビーにてお待ちください',
          badge: '待機中',
          bgClass: 'bg-slate-700 text-white',
          borderClass: 'border-slate-200',
          cardBg: 'bg-slate-50/70'
        };
    }
  };

  const statusInfo = currentTicket ? getStatusDisplay(currentTicket) : null;

  const handleTestPush = async () => {
    if (!currentTicket) return;
    sounds.unlock();
    await NotificationManager.sendCallNotification(currentTicket);
    setNotifSent(true);
    setTimeout(() => setNotifSent(false), 4000);
  };

  // If initial tickets or user's ticket is loading from cloud, display clear loading screen
  if (isLoading && (!currentTicket || tickets.length === 0)) {
    return (
      <div className="max-w-xl mx-auto space-y-5 px-1 py-2">
        <LoadingScreen
          message="整理券データを読み込んでいます..."
          subMessage="クラウドから最新の受付・整理券情報を取得中"
        />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 px-1 py-2">
      {/* 1. IF NO MATCHED TICKET: SHOW EMAIL VERIFICATION FORM (メアド照合欄) */}
      {!currentTicket ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="text-center space-y-1.5">
              <div className="inline-flex p-3 rounded-2xl bg-slate-100 text-slate-800 border border-slate-200 mb-1">
                <Mail className="w-6 h-6 text-slate-700" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                整理券の照会・表示
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                学籍番号（例: s25583）、または予約時のメールアドレスを入力してください。
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  学籍番号 または メールアドレス
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={inputEmail}
                    onChange={(e) => {
                      setInputEmail(e.target.value);
                      if (verifyError) setVerifyError(null);
                    }}
                    placeholder="例: s25583 またはメールアドレス"
                    className="w-full pl-9 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                  />
                </div>
              </div>

              {verifyError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{verifyError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <span>照合中...</span>
                ) : (
                  <>
                    <span>整理券を表示する</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Standalone Install Promotion Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-700 flex-shrink-0">
                <Smartphone className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  ホーム画面に追加してアプリ化
                </h4>
                <p className="text-[11px] text-slate-500">
                  アプリ化すると呼出通知を逃さず確認できます
                </p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              インストール
            </button>
          </div>

          {/* Guide Modal / Dropdown if toggled */}
          {showPwaGuide && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-slate-700" />
                  ホーム画面への追加手順（PWA）
                </h4>
                <button
                  onClick={() => setShowPwaGuide(false)}
                  className="text-xs text-slate-400 hover:text-slate-700"
                >
                  閉じる
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="font-bold text-slate-900 text-xs">
                    iPhone / iPad (Safari)
                  </div>
                  <ol className="space-y-1 text-[11px] text-slate-600 pl-4 list-decimal leading-relaxed">
                    <li>画面下部の「<strong>共有ボタン</strong>」（<Share className="w-3 h-3 inline" />）をタップ</li>
                    <li>「<strong>ホーム画面に追加</strong>」（<PlusSquare className="w-3 h-3 inline" />）を選択</li>
                    <li>右上の「<strong>追加</strong>」をタップ</li>
                  </ol>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="font-bold text-slate-900 text-xs">
                    Android (Chrome)
                  </div>
                  <ol className="space-y-1 text-[11px] text-slate-600 pl-4 list-decimal leading-relaxed">
                    <li>画面右上の「<strong>メニュー（︙）</strong>」をタップ</li>
                    <li>「<strong>アプリをインストール</strong>」または「<strong>ホーム画面に追加</strong>」を選択</li>
                    <li>「<strong>インストール</strong>」をタップ</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Donation Eligibility & Guidelines (Poster Information) */}
          <DonationGuidelines defaultExpanded={true} />
        </div>
      ) : (
        /* 2. MATCHED TICKET: DISPLAY USER'S PERSONAL TICKET ONLY */
        <>
          {/* Active Email Bar with Option to Change */}
          <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-xs flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-slate-500 flex-shrink-0">照合中:</span>
              <span className="font-semibold text-slate-800 truncate">
                {currentTicket.email}
              </span>
            </div>
            <button
              onClick={handleResetEmail}
              className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-medium transition flex items-center gap-1 flex-shrink-0"
              title="別のアドレスで照合する"
            >
              <LogOut className="w-3 h-3" />
              <span>別のアドレスで照合</span>
            </button>
          </div>

          {/* Main Elegantly Designed Ticket Card */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            {/* Upper Premium Header */}
            <div className="bg-slate-900 text-white p-6 relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                    Blood Donation Ticket
                  </span>
                  <div className="text-xs text-slate-300 mt-0.5">
                    献血整理券
                  </div>
                </div>

                {/* Status Badge */}
                {statusInfo && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-xs ${statusInfo.bgClass}`}>
                    {statusInfo.badge}
                  </span>
                )}
              </div>

              {/* Huge Clean Ticket Number */}
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-slate-400 text-sm font-medium">整理券番号</span>
                <span className="text-5xl sm:text-6xl font-black tracking-tight font-mono text-white">
                  #{currentTicket.ticketNumber}
                </span>
              </div>
            </div>

            {/* Middle Attendee Info */}
            <div className="p-6 space-y-4">
              {/* Name & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-xs text-slate-400 font-medium">お名前</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                    <span>{currentTicket.name}</span>
                    <span className="text-xs font-normal text-slate-500">様</span>
                    {currentTicket.attribute && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                        {currentTicket.attribute}
                      </span>
                    )}
                  </div>
                  {currentTicket.kana && (
                    <div className="text-[11px] text-slate-400">{currentTicket.kana}</div>
                  )}
                </div>

                <div>
                  <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    ご予約時間帯
                  </div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">
                    {currentTicket.timeSlot}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {currentTicket.scheduledDate}
                  </div>
                </div>
              </div>

              {/* Progress & Current Call Status Box */}
              {statusInfo && (
                <div className={`p-4 rounded-2xl border ${statusInfo.cardBg} ${statusInfo.borderClass} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-700" />
                      現在の進行状況
                    </div>
                    <span className="text-xs font-semibold text-slate-600">
                      {statusInfo.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {statusInfo.description}
                  </p>

                  {/* Live Call Reference */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500">現在のお呼出番号:</span>
                    <span className="font-bold text-slate-900">
                      {currentlyCalled.length > 0 
                        ? currentlyCalled.map(c => `#${c.ticketNumber}`).join(', ')
                        : '現在呼出なし'}
                    </span>
                  </div>

                  {currentTicket.queueStatus === 'waiting' && myQueuePosition > 0 && (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">あなたの前の待機人数:</span>
                      <span className="font-bold text-slate-900">あと {myQueuePosition - 1} 名</span>
                    </div>
                  )}
                </div>
              )}

              {/* Optional Donation Type if configured */}
              {(currentTicket.bloodType || currentTicket.donationType) && (
                <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                  {currentTicket.bloodType && (
                    <span>血液型: <strong>{currentTicket.bloodType}型</strong></span>
                  )}
                  {currentTicket.donationType && (
                    <span>区分: <strong>{currentTicket.donationType}</strong></span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notification Permission & PWA Installation Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            {/* Header / Push Notification Status */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 flex-shrink-0">
                  <Bell className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    呼出通知（プッシュ通知）
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    順番が来るとスマホ画面や通知音でお知らせします
                  </p>
                </div>
              </div>

              {notificationPermission !== 'granted' ? (
                <button
                  onClick={onReqNotifications}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs flex-shrink-0"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  通知を許可
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1 flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  通知有効
                </span>
              )}
            </div>

            {/* Test Notification Row */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500">呼出音・通知のテスト:</span>
              <button
                onClick={handleTestPush}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-slate-600" />
                テスト通知
              </button>
            </div>

            {notifSent && (
              <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" />
                テスト通知を送信しました。端末をご確認ください。
              </p>
            )}

            {/* PWA / Add to Home Screen Section */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      <Smartphone className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>ホーム画面に追加（アプリ化・PWA）</span>
                        {isStandalone && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            導入済み
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        アプリ化するとブラウザを閉じても通知を受信しやすくなります
                      </p>
                    </div>
                  </div>

                  {/* PROMINENT INSTALL BUTTON */}
                  <button
                    onClick={handleInstallClick}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs flex-shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>インストール</span>
                  </button>
                </div>

                {/* Step-by-Step PWA Installation Guide (Collapsible or Prompted) */}
                {showPwaGuide && (
                  <div className="pt-3 border-t border-slate-200/70 space-y-3 text-xs text-slate-600">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* iOS / Safari Guide */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-2">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                          <span className="w-2 h-2 rounded-full bg-slate-900" />
                          iPhone / iPad (Safari)
                        </div>
                        <ol className="space-y-1.5 text-[11px] text-slate-600 pl-4 list-decimal leading-relaxed">
                          <li>
                            画面下部の「<strong>共有ボタン</strong>」（四角から上矢印 <Share className="w-3 h-3 inline text-slate-600" />）をタップ
                          </li>
                          <li>
                            メニューから「<strong>ホーム画面に追加</strong>」（<PlusSquare className="w-3 h-3 inline text-slate-600" />）を選択
                          </li>
                          <li>
                            右上の「<strong>追加</strong>」をタップ
                          </li>
                        </ol>
                      </div>

                      {/* Android / Chrome Guide */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-2">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          Android (Chrome)
                        </div>
                        <ol className="space-y-1.5 text-[11px] text-slate-600 pl-4 list-decimal leading-relaxed">
                          <li>
                            画面右上の「<strong>メニュー（︙）</strong>」をタップ
                          </li>
                          <li>
                            「<strong>アプリをインストール</strong>」または「<strong>ホーム画面に追加</strong>」を選択
                          </li>
                          <li>
                            画面の指示に従い「<strong>インストール</strong>」をタップ
                          </li>
                        </ol>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
                      <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                      <span>
                        ホーム画面のアプリアイコンから開くことで、待機中もフルスクリーンで整理券を確認でき、呼出通知を確実に受け取れます。
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Donation Guidelines & Requirements (Poster Information) */}
          <DonationGuidelines defaultExpanded={false} />

          {/* Pre-donation advice */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              献血ご協力にあたってのお願い
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              問診前には十分な水分補給（コップ1〜2杯）をお願いいたします。受付にてお呼び出しがありましたら、食堂前の献血受付カウンターまでお越しください。
            </p>
          </div>
        </>
      )}
    </div>
  );
};
