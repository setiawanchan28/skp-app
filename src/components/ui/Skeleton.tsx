'use client';

import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`} />;
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-48" />
    </div>
  );
};
