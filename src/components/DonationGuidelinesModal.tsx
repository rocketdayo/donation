import React from 'react';
import { X, BookOpen } from 'lucide-react';
import { DonationGuidelines } from './DonationGuidelines';

interface DonationGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonationGuidelinesModal: React.FC<DonationGuidelinesModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
          aria-label="閉じる"
        >
          <X className="w-4 h-4" />
        </button>

        <DonationGuidelines defaultExpanded={true} className="border-none shadow-none rounded-none" />

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
