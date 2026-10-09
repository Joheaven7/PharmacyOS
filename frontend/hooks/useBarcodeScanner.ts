'use client';

import { useEffect, useRef } from 'react';

interface UseBarcodeScannerProps {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxKeyIntervalMs?: number;
}

export const useBarcodeScanner = ({
  onScan,
  minChars = 4,
  maxKeyIntervalMs = 50,
}: UseBarcodeScannerProps) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes inside standard text inputs unless specifically focused on barcode search
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // If input has data-barcode-capture attribute, allow capture
        if (!target.getAttribute('data-barcode-capture')) {
          return;
        }
      }

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minChars) {
          onScan(bufferRef.current);
        }
        bufferRef.current = '';
        return;
      }

      if (e.key.length === 1) {
        if (elapsed > maxKeyIntervalMs && bufferRef.current.length > 0) {
          bufferRef.current = ''; // Reset buffer if typing was slow (manual typing)
        }
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan, minChars, maxKeyIntervalMs]);
};
