'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error Captured:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-rose-400">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-xl font-bold text-slate-100">Something went wrong!</h2>
        <p className="text-xs text-slate-400 font-mono bg-slate-900/80 p-3 rounded-xl border border-slate-800 overflow-x-auto text-left">
          {error.message || 'An unexpected error occurred in the application.'}
        </p>
      </div>
      <Button variant="primary" onClick={reset}>
        <RefreshCw className="w-4 h-4 mr-2" /> Try Again
      </Button>
    </div>
  );
}
