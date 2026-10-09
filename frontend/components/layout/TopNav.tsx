'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Search, Activity, User, Shield, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { fetchHealthStatus, HealthResponse } from '@/lib/apiClient';
import { useAuth } from '@/lib/authContext';
import { Badge } from '../ui/Badge';

export const TopNav: React.FC = () => {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [alertCount, setAlertCount] = useState<number>(0);

  useEffect(() => {
    fetchHealthStatus().then(setHealth);

    const fetchAlertSummary = async () => {
      try {
        const res = await fetch('/api/alerts/summary');
        if (res.ok) {
          const json = await res.json();
          setAlertCount(json.data.summary.totalUnresolved);
        }
      } catch {
        // Non-blocking
      }
    };

    fetchAlertSummary();
    const interval = setInterval(fetchAlertSummary, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = () => {
    if (!health) {
      return (
        <Badge variant="outline" className="animate-pulse text-[10px]">
          <Activity className="w-3 h-3 animate-spin" /> Checking API...
        </Badge>
      );
    }

    if (health.status === 'ok') {
      return (
        <Badge variant="success" className="text-[10px]">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Connected
        </Badge>
      );
    }

    return (
      <Badge variant="danger" className="text-[10px]">
        <AlertCircle className="w-3 h-3 text-rose-400" /> API Degraded
      </Badge>
    );
  };

  const getPrimaryRole = () => {
    if (!user?.roles || user.roles.length === 0) return 'STAFF';
    return user.roles[0];
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80">
      {/* Search Input Placeholder */}
      <div className="flex items-center gap-3 w-80 lg:w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search catalog, SKU, barcode (USB Scanner ready)..."
            disabled
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-800/60 border border-slate-700/60 rounded-xl text-slate-300 placeholder:text-slate-500 focus:outline-none cursor-not-allowed opacity-70"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Health Status Indicator */}
        {getStatusBadge()}

        {/* Notifications Icon with Real Alert Count */}
        <Link
          href="/alerts"
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Alert Notifications"
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-slate-900 animate-pulse">
              {alertCount}
            </span>
          )}
        </Link>

        {/* User Profile & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-brand-400 font-bold text-xs">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="flex flex-col text-xs hidden sm:flex">
            <span className="font-semibold text-slate-200 truncate max-w-[140px]">
              {user?.fullName || 'User'}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-brand-400">
              <Shield className="w-3 h-3 text-brand-400" />
              <span>{user?.organizationName || 'Pharmacy'}</span>
              <span className="text-slate-500">•</span>
              <span className="font-bold text-slate-300">{getPrimaryRole()}</span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors ml-1"
            title="Log Out Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
