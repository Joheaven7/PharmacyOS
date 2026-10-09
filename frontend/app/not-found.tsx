import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-brand-400">
        <FileQuestion className="w-8 h-8" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-2xl font-bold text-slate-100">Page Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested page or resource could not be found. It may be part of an upcoming PharmacyOS module.
        </p>
      </div>
      <Link href="/">
        <Button variant="primary">
          <Home className="w-4 h-4 mr-2" /> Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
