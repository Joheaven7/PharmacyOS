import type { Metadata } from 'next';
import './globals.css';
import { Shell } from '@/components/layout/Shell';

export const metadata: Metadata = {
  title: 'PharmacyOS — Pharmacy Management & POS Platform',
  description: 'Production-oriented multi-tenant pharmacy inventory, sales, FEFO expiry tracking, and analytics platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-brand-500 selection:text-white">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
