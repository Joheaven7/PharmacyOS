'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Pill,
  Boxes,
  ShoppingCart,
  Truck,
  RotateCcw,
  BellRing,
  BarChart3,
  FileText,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/Badge';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  partModule: string;
  status: 'active' | 'upcoming';
}

const navItems: NavItem[] = [
  { name: 'Dashboard & Analytics', href: '/', icon: LayoutDashboard, partModule: 'Part 10', status: 'active' },
  { name: 'Pharmacy Settings', href: '/settings', icon: Settings, partModule: 'Part 3', status: 'active' },
  { name: 'Medicines Catalog', href: '/medicines', icon: Pill, partModule: 'Part 4', status: 'active' },
  { name: 'Batch Inventory', href: '/inventory', icon: Boxes, partModule: 'Part 5', status: 'active' },
  { name: 'Purchasing', href: '/purchasing', icon: Truck, partModule: 'Part 6', status: 'active' },
  { name: 'Point of Sale (POS)', href: '/pos', icon: ShoppingCart, partModule: 'Part 7', status: 'active' },
  { name: 'Sales History', href: '/sales', icon: FileText, partModule: 'Part 7', status: 'active' },
  { name: 'Returns & Adjustments', href: '/returns', icon: RotateCcw, partModule: 'Part 8', status: 'active' },
  { name: 'Expiry & Alerts', href: '/alerts', icon: BellRing, partModule: 'Part 9', status: 'active' },
  { name: 'Executive Reports', href: '/reports', icon: BarChart3, partModule: 'Part 11', status: 'active' },
  { name: 'System Audit Logs', href: '/audit', icon: ShieldCheck, partModule: 'Part 11', status: 'active' },
  { name: 'CSV Data Migration', href: '/import', icon: UploadCloud, partModule: 'Part 12', status: 'active' },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-slate-900/90 backdrop-blur-xl border-r border-slate-800/80 transition-all duration-300 z-30 select-none',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-200 animate-pulse" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-brand-300">
                PharmacyOS
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-400">
                Enterprise Core
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {!collapsed && (
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Core Modules
          </div>
        )}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-gradient-to-r from-brand-600/90 to-brand-700 text-white shadow-glow'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70',
                item.status === 'upcoming' && 'opacity-60 cursor-not-allowed hover:opacity-100'
              )}
              onClick={(e) => {
                if (item.status === 'upcoming') {
                  e.preventDefault();
                }
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-transform group-hover:scale-110',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-400'
                  )}
                />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </div>
              {!collapsed && item.status === 'upcoming' && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-700 text-slate-500">
                  {item.partModule}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>

      {/* Tenant Context Footprint */}
      <div className="p-3 border-t border-slate-800/80">
        <div
          className={cn(
            'flex items-center gap-3 p-2.5 rounded-xl bg-slate-850 border border-slate-800 text-xs text-slate-400',
            collapsed && 'justify-center p-2'
          )}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-slate-200 truncate">Multi-Tenant Engine</span>
              <span className="text-[10px] text-emerald-400">Isolated Row Binding</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
