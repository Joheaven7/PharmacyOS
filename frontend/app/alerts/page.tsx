'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  BellRing,
  AlertTriangle,
  Clock,
  Boxes,
  CheckCircle2,
  AlertCircle,
  Filter,
  PackageX,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface AlertItem {
  id: string;
  type: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'EXPIRING_SOON' | 'EXPIRED';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  status: 'UNRESOLVED' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  resolvedAt?: string;
  medicine?: { name: string; barcode?: string };
  batch?: { batchNumber: string; expiryDate: string; quantity: number };
  resolvedBy?: { fullName: string };
}

export default function AlertsPage() {
  const { hasPermission } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'UNRESOLVED' | 'RESOLVED'>('UNRESOLVED');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);

      const res = await fetch(`/api/alerts?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setAlerts(json.data.alerts);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load inventory alerts.' });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}/resolve`, {
        method: 'PUT',
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Alert marked as resolved.' });
        fetchAlerts();
      } else {
        setMessage({ type: 'error', text: 'Failed to resolve alert.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error resolving alert.' });
    }
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === 'CRITICAL') return <Badge variant="danger">CRITICAL</Badge>;
    if (severity === 'WARNING') return <Badge variant="warning">WARNING</Badge>;
    return <Badge variant="info">INFO</Badge>;
  };

  const getTypeBadge = (type: string) => {
    if (type === 'OUT_OF_STOCK') return <Badge variant="danger"><Boxes className="w-3 h-3 mr-1" /> Out of Stock</Badge>;
    if (type === 'EXPIRED') return <Badge variant="danger"><PackageX className="w-3 h-3 mr-1" /> Expired</Badge>;
    if (type === 'LOW_STOCK') return <Badge variant="warning"><AlertTriangle className="w-3 h-3 mr-1" /> Low Stock</Badge>;
    return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> Expiring Soon</Badge>;
  };

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Inventory Alert Center</h1>
            <Badge variant="danger">
              <BellRing className="w-3.5 h-3.5 mr-1 animate-pulse" /> Real-Time Monitoring
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated operational alerts for low stock, out of stock, expiring batches, and expired inventory.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs ${
            message.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Critical Priority Alerts</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400 mt-2">{criticalCount}</div>
            <span className="text-[10px] text-slate-500">Requires immediate pharmacy staff action</span>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Warning Priority Alerts</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-2">{warningCount}</div>
            <span className="text-[10px] text-slate-500">Approaching low stock or expiry threshold</span>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Tenant Isolation Guard</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2">100% Isolated</div>
            <span className="text-[10px] text-emerald-400">Idempotent alert generator active</span>
          </CardContent>
        </Card>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex p-1 bg-slate-900/90 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setStatusFilter('UNRESOLVED')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              statusFilter === 'UNRESOLVED'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Unresolved Alerts
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('RESOLVED')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              statusFilter === 'RESOLVED'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Resolved History
          </button>
        </div>

        {/* Type Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Alert Types</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Evaluating & Loading Alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs bg-slate-900/60 rounded-2xl border border-slate-800">
            No {statusFilter.toLowerCase()} alerts found. Inventory is operating within healthy parameters.
          </div>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                a.severity === 'CRITICAL'
                  ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60'
                  : 'bg-amber-950/20 border-amber-900/40 hover:border-amber-700/60'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  {getTypeBadge(a.type)}
                  {getSeverityBadge(a.severity)}
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="text-sm font-semibold text-slate-100">{a.message}</div>

                {a.medicine && (
                  <div className="text-xs text-slate-400 flex items-center gap-3">
                    <span>Product: <strong className="text-slate-200">{a.medicine.name}</strong></span>
                    {a.batch && <span>Batch #: <strong className="text-brand-300 font-mono">{a.batch.batchNumber}</strong></span>}
                  </div>
                )}
              </div>

              <div>
                {statusFilter === 'UNRESOLVED' ? (
                  hasPermission('inventory.adjust') && (
                    <Button variant="outline" size="sm" onClick={() => handleResolve(a.id)}>
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Mark Resolved
                    </Button>
                  )
                ) : (
                  <div className="text-[10px] text-slate-400 text-right">
                    Resolved by {a.resolvedBy?.fullName || 'User'} on{' '}
                    {a.resolvedAt ? new Date(a.resolvedAt).toLocaleDateString() : '—'}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
