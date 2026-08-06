'use client';

import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  isDangerous = false,
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="flex flex-col items-center text-center space-y-4">
        <div
          className={`p-3 rounded-full ${
            isDangerous ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <p className="text-slate-600 text-sm">{message}</p>
        </div>
        <div className="flex items-center gap-3 w-full pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-sm transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 px-4 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-sky-600 hover:bg-sky-700'
            }`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
