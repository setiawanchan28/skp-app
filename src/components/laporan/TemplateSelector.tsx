'use client';

import React, { useState } from 'react';
import { ACTIVITY_TEMPLATES, ActivityTemplate } from '@/constants/templates';
import { Sparkles, Layers, Check } from 'lucide-react';

interface TemplateSelectorProps {
  onSelect: (template: ActivityTemplate) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect }) => {
  const [selectedId, setSelectedId] = useState<string>('');

  const handleApply = (id: string) => {
    setSelectedId(id);
    const tmpl = ACTIVITY_TEMPLATES.find((t) => t.id === id);
    if (tmpl) {
      onSelect(tmpl);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition-colors">
      <div className="flex items-center gap-2 shrink-0">
        <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
          Template Kegiatan BPS (Opsional)
        </span>
      </div>

      <div className="w-full sm:w-auto flex items-center gap-2">
        <select
          value={selectedId}
          onChange={(e) => handleApply(e.target.value)}
          className="w-full sm:w-64 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
        >
          <option value="">-- Pilih Template Otomatis --</option>
          {ACTIVITY_TEMPLATES.map((tmpl) => (
            <option key={tmpl.id} value={tmpl.id}>
              {tmpl.nama} ({tmpl.kategori})
            </option>
          ))}
        </select>

        {selectedId && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
            <Check className="w-3.5 h-3.5" />
            <span>Terpasang</span>
          </span>
        )}
      </div>
    </div>
  );
};
