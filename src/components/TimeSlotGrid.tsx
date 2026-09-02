import React from 'react';
import { TicketRecord } from '../types';
import { TIME_SLOTS } from '../utils/storage';
import { normalizeTimeSlot } from '../utils/spreadsheet';
import { Clock } from 'lucide-react';

interface TimeSlotGridProps {
  tickets: TicketRecord[];
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  tickets,
}) => {
  const SLOT_CAPACITY = 8;

  // Extract all unique slots from tickets or default TIME_SLOTS (normalized to 30-min windows)
  const allUniqueSlots = Array.from(
    new Set([
      ...tickets.map(t => normalizeTimeSlot(t.timeSlot).slot).filter(Boolean),
      ...TIME_SLOTS
    ])
  ).sort((a, b) => a.localeCompare(b));

  const slotStats = allUniqueSlots.map(slot => {
    const slotTickets = tickets.filter(t => normalizeTimeSlot(t.timeSlot).slot === slot);
    const reserved = slotTickets.length;
    const present = slotTickets.filter(t => t.attendance === 'present').length;
    const completed = slotTickets.filter(t => t.attendance === 'completed').length;
    const absent = slotTickets.filter(t => t.attendance === 'absent').length;
    const unattended = slotTickets.filter(t => t.attendance === 'unattended').length;
    const available = Math.max(0, SLOT_CAPACITY - (reserved - absent));

    return {
      slot,
      tickets: slotTickets,
      reserved,
      present,
      completed,
      absent,
      unattended,
      available,
      percentage: Math.min(100, Math.round(((reserved - absent) / SLOT_CAPACITY) * 100))
    };
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              時間帯別 予約状況一覧
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              各30分枠ごとの予約者数、出席・進行状況および空き枠を確認できます
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> 空き枠あり
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> 残りわずか
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> 満員
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Time Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slotStats.map((item) => {
          const isFull = item.available === 0;
          const isCrowded = item.available <= 2 && !isFull;

          return (
            <div
              key={item.slot}
              className={`bg-white border rounded-2xl p-4 shadow-xs flex flex-col justify-between ${
                isFull
                  ? 'border-slate-300'
                  : isCrowded
                  ? 'border-amber-200'
                  : 'border-slate-200'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="font-bold text-sm text-slate-900">{item.slot}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isFull
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : isCrowded
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {isFull ? '満員' : `空き ${item.available}枠`}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">予約 ({item.reserved}/{SLOT_CAPACITY}名)</span>
                    <span className="font-bold text-slate-800">{item.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${Math.min(100, (item.completed / SLOT_CAPACITY) * 100)}%` }}
                      className="bg-slate-800 h-full"
                      title={`完了: ${item.completed}名`}
                    />
                    <div
                      style={{ width: `${Math.min(100, (item.present / SLOT_CAPACITY) * 100)}%` }}
                      className="bg-blue-600 h-full"
                      title={`進行中: ${item.present}名`}
                    />
                    <div
                      style={{ width: `${Math.min(100, (item.unattended / SLOT_CAPACITY) * 100)}%` }}
                      className="bg-amber-400 h-full"
                      title={`未受付: ${item.unattended}名`}
                    />
                    <div
                      style={{ width: `${Math.min(100, (item.absent / SLOT_CAPACITY) * 100)}%` }}
                      className="bg-rose-400 h-full"
                      title={`欠席: ${item.absent}名`}
                    />
                  </div>
                </div>

                {/* Breakdown Badges */}
                <div className="grid grid-cols-4 gap-1.5 mt-3 text-center text-[11px]">
                  <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
                    <div className="text-[10px] text-slate-500">完了</div>
                    <div className="font-bold">{item.completed}</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
                    <div className="text-[10px] text-blue-600">対応中</div>
                    <div className="font-bold">{item.present}</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                    <div className="text-[10px] text-amber-600">未受付</div>
                    <div className="font-bold">{item.unattended}</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
                    <div className="text-[10px] text-rose-600">欠席</div>
                    <div className="font-bold">{item.absent}</div>
                  </div>
                </div>

                {/* Attendee Name Tags */}
                {item.tickets.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {item.tickets.map(t => (
                      <span 
                        key={t.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                          t.attendance === 'completed'
                            ? 'bg-slate-100 text-slate-700'
                            : t.attendance === 'present'
                            ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200'
                            : t.attendance === 'absent'
                            ? 'bg-rose-50 text-rose-700 line-through'
                            : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}
                      >
                        #{t.ticketNumber} {t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Info */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>予約合計: {item.tickets.length}名</span>
                <span>定員: {SLOT_CAPACITY}名</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
