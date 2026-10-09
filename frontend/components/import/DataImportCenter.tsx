'use client';

import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ArrowRight,
  Database,
  RefreshCw,
  Sparkles,
  FileCode2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface PreviewRow {
  rowNumber: number;
  data: {
    name: string;
    category?: string;
    barcode?: string;
    sku?: string;
    unit?: string;
    batchNumber?: string;
    expiryDate?: string;
    quantity?: string | number;
    purchasePrice?: string | number;
    sellingPrice?: string | number;
  };
  status: 'VALID' | 'INVALID' | 'WARNING';
  errors: string[];
  warnings: string[];
}

interface PreviewSummary {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  warningCount: number;
  canImport: boolean;
}

const SAMPLE_CSV = `Product Name,Category,Barcode,SKU,Unit,Batch Number,Expiry Date,Quantity,Purchase Price,Selling Price
Paracetamol Extra 500mg,Analgesics,8901234567890,PAR-500,BOX,LOT-2026-A,2027-12-31,100,2.50,5.00
Amoxicillin Trihydrate 250mg,Antibiotics,8909876543210,AMX-250,BOX,LOT-2026-B,2028-06-30,50,4.00,8.50
Ibuprofen Gel 400mg,Anti-Inflammatory,,IBU-400,TUBE,LOT-2026-C,2027-11-15,30,3.00,6.00`;

export const DataImportCenter: React.FC = () => {
  const [csvInput, setCsvInput] = useState('');
  const [summary, setSummary] = useState<PreviewSummary | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importCompleted, setImportCompleted] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    medicinesCreated: number;
    categoriesCreated: number;
    batchesCreated: number;
    movementsCreated: number;
  } | null>(null);

  const handleDownloadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pharmacy-products-import-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvInput(text || '');
    };
    reader.readAsText(file);
  };

  const handlePreviewImport = async () => {
    if (!csvInput.trim()) return;

    setIsProcessing(true);
    setImportCompleted(false);
    setExecutionResult(null);

    try {
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: csvInput }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Validation preview failed');

      setSummary(json.data.summary);
      setPreviewRows(json.data.previewRows);
    } catch (err: any) {
      alert(err.message || 'Failed to parse CSV data');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!summary || !summary.canImport) return;

    setIsProcessing(true);
    try {
      const rowsToImport = previewRows.map((r) => r.data);

      const res = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rowsToImport }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Execution failed');

      setExecutionResult(json.data);
      setImportCompleted(true);
    } catch (err: any) {
      alert(err.message || 'Failed to execute data import');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-brand-950/40 to-slate-900 p-6 lg:p-8 border border-brand-500/20 shadow-glow">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" className="bg-emerald-950/80 text-emerald-400 border-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Bulk CSV Migration Engine
              </Badge>
              <Badge variant="outline" className="text-slate-400 border-slate-700">
                Part 12 — Production Onboarding
              </Badge>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              Pharmacy Product & Inventory Data Import
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Bulk import existing medicine catalogs, barcodes, initial batches, and cost prices into PharmacyOS with atomic transaction rollback.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={handleDownloadSampleCSV}
              className="text-slate-200 border-slate-700 hover:bg-slate-800"
            >
              <Download className="w-4 h-4 mr-1.5 text-brand-400" /> Download CSV Template
            </Button>
          </div>
        </div>
      </div>

      {/* CSV Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-brand-400" /> Step 1: Upload or Paste CSV Payload
            </span>
          </CardTitle>
          <CardDescription>
            Select a `.csv` file from your device or paste raw CSV lines into the editor below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-900/90 rounded-2xl border border-dashed border-slate-700 hover:border-brand-500 transition-colors">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-brand-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Upload CSV File</h4>
                <p className="text-[11px] text-slate-400">Supports standard UTF-8 CSV exports from Excel, legacy POS, or ERP</p>
              </div>
            </div>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Raw CSV String Content Editor:</label>
            <textarea
              rows={6}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              placeholder="Paste your CSV content here..."
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="md"
              onClick={handlePreviewImport}
              disabled={!csvInput.trim() || isProcessing}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isProcessing ? 'animate-spin' : ''}`} />
              Validate & Preview Import
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Summary & Preview Table */}
      {summary && (
        <Card className="border-brand-500/20">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-emerald-400" /> Step 2: Data Import Preview & Validation
              </span>
              <div className="flex items-center gap-2">
                <Badge variant={summary.canImport ? 'success' : 'danger'}>
                  {summary.canImport ? 'Ready to Import' : 'Validation Errors Found'}
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>Review validation results before writing data to database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* KPI Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Total Rows</span>
                <div className="text-xl font-bold font-mono text-slate-100">{summary.totalRows}</div>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-emerald-400">Valid Rows</span>
                <div className="text-xl font-bold font-mono text-emerald-400">{summary.validCount}</div>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-amber-400">Warnings</span>
                <div className="text-xl font-bold font-mono text-amber-400">{summary.warningCount}</div>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-rose-400">Invalid Errors</span>
                <div className="text-xl font-bold font-mono text-rose-400">{summary.invalidCount}</div>
              </div>
            </div>

            {/* Completion Success Callout */}
            {importCompleted && executionResult && (
              <div className="p-4 bg-emerald-950/80 border border-emerald-700 rounded-2xl flex items-center justify-between text-xs text-emerald-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-emerald-100">Database Migration Executed Successfully!</h4>
                    <p>
                      Created {executionResult.medicinesCreated} Medicines, {executionResult.categoriesCreated} Categories,{' '}
                      {executionResult.batchesCreated} Batches, and {executionResult.movementsCreated} Stock Movements.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Rows Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-2.5">Row #</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Product Name</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Barcode / SKU</th>
                    <th className="p-2.5">Batch #</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Selling Price</th>
                    <th className="p-2.5">Validation Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {previewRows.map((row) => (
                    <tr key={row.rowNumber} className="hover:bg-slate-850/60 transition-colors">
                      <td className="p-2.5 font-bold text-slate-400">#{row.rowNumber}</td>
                      <td className="p-2.5 font-sans">
                        {row.status === 'VALID' && (
                          <Badge variant="success" className="text-[10px]">
                            VALID
                          </Badge>
                        )}
                        {row.status === 'WARNING' && (
                          <Badge variant="warning" className="text-[10px]">
                            WARNING
                          </Badge>
                        )}
                        {row.status === 'INVALID' && (
                          <Badge variant="danger" className="text-[10px]">
                            INVALID
                          </Badge>
                        )}
                      </td>
                      <td className="p-2.5 font-sans font-semibold text-slate-100">{row.data.name}</td>
                      <td className="p-2.5 font-sans text-slate-400">{row.data.category || '—'}</td>
                      <td className="p-2.5 text-slate-400">{row.data.barcode || row.data.sku || '—'}</td>
                      <td className="p-2.5 font-sans text-brand-400">{row.data.batchNumber || '—'}</td>
                      <td className="p-2.5 text-right text-slate-200">{row.data.quantity || '0'}</td>
                      <td className="p-2.5 text-right text-emerald-400">{row.data.sellingPrice || '0.00'}</td>
                      <td className="p-2.5 font-sans">
                        {row.errors.length > 0 && (
                          <span className="text-rose-400 flex items-center gap-1 text-[10px]">
                            <XCircle className="w-3 h-3 shrink-0" /> {row.errors.join('; ')}
                          </span>
                        )}
                        {row.warnings.length > 0 && (
                          <span className="text-amber-400 flex items-center gap-1 text-[10px]">
                            <AlertTriangle className="w-3 h-3 shrink-0" /> {row.warnings.join('; ')}
                          </span>
                        )}
                        {row.errors.length === 0 && row.warnings.length === 0 && (
                          <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 shrink-0" /> Clean
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Execute Button Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                {summary.canImport
                  ? 'All rows passed validation constraints. Ready to commit to database.'
                  : 'Please fix validation errors in your CSV file before proceeding.'}
              </span>
              <Button
                variant="primary"
                size="md"
                onClick={handleExecuteImport}
                disabled={!summary.canImport || isProcessing || importCompleted}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                <Database className="w-4 h-4 mr-1.5" />
                {isProcessing ? 'Executing Import...' : importCompleted ? 'Import Executed' : 'Confirm Atomic Import'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
