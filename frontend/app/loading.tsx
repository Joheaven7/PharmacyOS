import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin" />
        <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-brand-400 animate-pulse" />
      </div>
      <div className="text-sm font-medium text-slate-400">Loading PharmacyOS...</div>
    </div>
  );
}
