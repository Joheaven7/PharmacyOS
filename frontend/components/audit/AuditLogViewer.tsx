'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  User,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Terminal,
  Activity,
  Eye,
  CheckCircle2,
  XCircle,
  KeyRound,
  FileCode2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    username: string;
    email: string;
  } | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAuditLogs = useCallback(
    async (pageToFetch = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', pageToFetch.toString());
        params.append('limit', '20');

        if (actionFilter) params.append('action', actionFilter);
        if (entityFilter) params.append('entity', entityFilter);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const res = await fetch(`/api/audit-logs?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setLogs(json.data.logs);
          setPagination(json.data.pagination);
        }
      } catch {
        // Non-blocking catch
      } finally {
        setIsLoading(false);
      }
    },
    [actionFilter, entityFilter, startDate, endDate]
  );

  useEffect(() => {
    fetchAuditLogs(1);
  }, [fetchAuditLogs]);

  const getBadgeForAction = (action: string) => {
    if (action.includes('REGISTER') || action.includes('LOGIN_SUCCESS')) {
      return (
        <Badge variant="success" className="bg-emerald-950/80 text-emerald-400 border-emerald-800">
          <KeyRound className="w-3 h-3 mr-1" /> {action}
        </Badge>
      );
    }
    if (action.includes('FAILED') || action.includes('DELETE') || action.includes('CANCEL')) {
      return (
        <Badge variant="danger" className="bg-rose-950/80 text-rose-400 border-rose-800">
          <XCircle className="w-3 h-3 mr-1" /> {action}
        </Badge>
      );
    }
    if (action.includes('SALE') || action.includes('PURCHASE')) {
      return (
        <Badge variant="info" className="bg-cyan-950/80 text-cyan-400 border-cyan-800">
          <Activity className="w-3 h-3 mr-1" /> {action}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-brand-400 border-brand-800">
        <Terminal className="w-3 h-3 mr-1" /> {action}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 lg:p-8 border border-slate-800 shadow-glow">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" className="bg-emerald-950/80 text-emerald-400 border-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" /> Tenant Isolated Security Trail
              </Badge>
              <Badge variant="outline" className="text-slate-400 border-slate-700">
                Immutable Event Log
              </Badge>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              System Audit Trail & Security Center
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Real-time audit log viewer capturing security logins, inventory mutations, sale transactions, and administrative changes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchAuditLogs(pagination.page)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Logs
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
        <div className="flex items-center gap-2 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter Action (e.g. LOGIN, SALE)"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-transparent text-slate-200 focus:outline-none w-44"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter Entity (e.g. Sale, User)"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-transparent text-slate-200 focus:outline-none w-40"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-slate-200 focus:outline-none"
          />
          <span className="text-slate-600">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-100 flex items-center justify-between">
            <span>Audit Trail Entries</span>
            <span className="text-xs font-mono font-normal text-slate-400">
              Total {pagination.total} Records
            </span>
          </CardTitle>
          <CardDescription>Immutable chronological security and transaction audit record</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No audit log records match the selected query criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-2.5">Date & Time</th>
                    <th className="p-2.5">User</th>
                    <th className="p-2.5">Action</th>
                    <th className="p-2.5">Entity</th>
                    <th className="p-2.5">IP Address</th>
                    <th className="p-2.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="p-2.5 text-slate-400">
                        {new Date(log.createdAt).toLocaleString('en-US', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>
                      <td className="p-2.5 font-sans">
                        {log.user ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-200">{log.user.fullName}</span>
                            <span className="text-[10px] text-slate-400">{log.user.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">System / Anonymous</span>
                        )}
                      </td>
                      <td className="p-2.5 font-sans">{getBadgeForAction(log.action)}</td>
                      <td className="p-2.5 text-slate-300">{log.entity}</td>
                      <td className="p-2.5 text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-sans font-semibold transition-colors flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3 h-3 text-brand-400" /> Inspect Payload
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800 text-xs">
              <span className="text-slate-400">
                Page <span className="font-bold text-slate-200">{pagination.page}</span> of{' '}
                <span className="font-bold text-slate-200">{pagination.totalPages}</span>
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1 || isLoading}
                  onClick={() => fetchAuditLogs(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  onClick={() => fetchAuditLogs(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payload Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-slate-100 text-base">Audit Log Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-850 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Action</span>
                  <span className="font-bold text-brand-300">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Entity</span>
                  <span className="font-bold text-slate-200">{selectedLog.entity}</span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-500 block text-[10px] uppercase">User</span>
                  <span className="text-slate-200">
                    {selectedLog.user ? selectedLog.user.fullName : 'System'}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-500 block text-[10px] uppercase">Timestamp</span>
                  <span className="text-slate-200">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold mb-1">Metadata Payload JSON:</span>
                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>

              {selectedLog.userAgent && (
                <div>
                  <span className="text-slate-400 block font-semibold mb-1">User Agent:</span>
                  <p className="p-2 bg-slate-850 rounded-xl border border-slate-800 text-[10px] text-slate-400 font-mono break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
                Close Viewer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
