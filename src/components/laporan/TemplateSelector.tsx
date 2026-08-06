'use client';

import React from 'react';
import { ACTIVITY_TEMPLATES, ActivityTemplate } from '@/constants/templates';
import { Sparkles, Layers } from 'lucide-react';

interface TemplateSelectorProps {
  onSelect: (template: ActivityTemplate) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect }) => {
  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-sky-600" />
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Gunakan Template Kegiatan BPS (Opsional)
        </h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {ACTIVITY_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => onSelect(tmpl)}
            className="px-3 py-1.5 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-300 rounded-xl text-xs font-medium transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-sky-500" />
            <span>{tmpl.nama}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
