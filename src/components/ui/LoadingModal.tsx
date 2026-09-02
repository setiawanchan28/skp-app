'use client';

import React from 'react';
import { Loader2, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

interface LoadingModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  subMessage?: string;
  type?: 'ai' | 'submit' | 'pdf';
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  isOpen,
  title = 'Memproses Data...',
  message = 'Mohon tunggu sejenak, sistem sedang bekerja...',
  subMessage,
  type = 'ai',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center space-y-5 transform transition-all scale-100">
        
        {/* Animated Glowing Icon Circle */}
        <div className="relative flex items-center justify-center w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-sky-500/20 dark:bg-sky-400/20 animate-ping opacity-75" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-sky-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-sky-500/30">
            {type === 'ai' ? (
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            ) : type === 'pdf' ? (
              <FileText className="w-8 h-8 text-white animate-bounce" />
            ) : (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            )}
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
            {message}
          </p>
          {subMessage && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 dark:bg-sky-950/60 rounded-full text-xs text-sky-600 dark:text-sky-400 font-semibold border border-sky-200 dark:border-sky-800 animate-pulse mt-2">
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              <span>{subMessage}</span>
            </div>
          )}
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-500 animate-pulse w-full h-full" />
        </div>
      </div>
    </div>
  );
};
