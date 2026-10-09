'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Building2, Save, CheckCircle, AlertCircle, ShieldCheck, DollarSign, Globe, Sliders, FileText } from 'lucide-react';

interface OrganizationData {
  id: string;
  name: string;
  legalName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  currency: string;
  timezone: string;
  settings: {
    lowStockThreshold: number;
    expiryWarningDays: number;
    criticalExpiryDays: number;
    receiptHeader: string;
    receiptFooter: string;
  };
}

export default function SettingsPage() {
  const { user, hasRole } = useAuth();
  const [orgData, setOrgData] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC');

  // Business settings states
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [expiryWarningDays, setExpiryWarningDays] = useState(30);
  const [criticalExpiryDays, setCriticalExpiryDays] = useState(7);
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');

  useEffect(() => {
    const fetchOrgProfile = async () => {
      try {
        const res = await fetch('/api/organization/profile');
        if (res.ok) {
          const json = await res.json();
          const org = json.data.organization as OrganizationData;
          setOrgData(org);
          setName(org.name || '');
          setLegalName(org.legalName || '');
          setPhone(org.phone || '');
          setEmail(org.email || '');
          setAddress(org.address || '');
          setCity(org.city || '');
          setCountry(org.country || '');
          setCurrency(org.currency || 'USD');
          setTimezone(org.timezone || 'UTC');

          if (org.settings) {
            setLowStockThreshold(org.settings.lowStockThreshold ?? 10);
            setExpiryWarningDays(org.settings.expiryWarningDays ?? 30);
            setCriticalExpiryDays(org.settings.criticalExpiryDays ?? 7);
            setReceiptHeader(org.settings.receiptHeader || '');
            setReceiptFooter(org.settings.receiptFooter || '');
          }
        }
      } catch {
        setMessage({ type: 'error', text: 'Failed to load organization settings.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrgProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSaving(true);

    try {
      const payload = {
        name,
        legalName,
        phone,
        email,
        address,
        city,
        country,
        currency,
        timezone,
        settings: {
          lowStockThreshold: Number(lowStockThreshold),
          expiryWarningDays: Number(expiryWarningDays),
          criticalExpiryDays: Number(criticalExpiryDays),
          receiptHeader,
          receiptFooter,
        },
      };

      const res = await fetch('/api/organization/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to update settings.' });
      } else {
        setMessage({ type: 'success', text: 'Pharmacy profile & business settings updated successfully.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Network error.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isEditable = hasRole('OWNER', 'MANAGER');

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading Pharmacy Settings...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Pharmacy Organization Settings</h1>
            <Badge variant="success">
              <ShieldCheck className="w-3.5 h-3.5" /> Tenant Isolated
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage pharmacy profile, operational warning thresholds, currency, and receipt headers.
          </p>
        </div>

        {isEditable && (
          <Button variant="primary" size="md" type="submit" disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving Changes...' : 'Save Settings'}
          </Button>
        )}
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs ${
            message.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid: Profile & Operational Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pharmacy Profile Card */}
        <Card hoverEffect={false}>
          <CardHeader>
            <CardTitle>
              <Building2 className="w-5 h-5 text-brand-400" /> Pharmacy Business Profile
            </CardTitle>
            <CardDescription>Legal business identification and location details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Pharmacy Display Name</label>
              <input
                type="text"
                required
                disabled={!isEditable}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Legal Business Name</label>
              <input
                type="text"
                disabled={!isEditable}
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Phone</label>
                <input
                  type="text"
                  disabled={!isEditable}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Email</label>
                <input
                  type="email"
                  disabled={!isEditable}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Street Address</label>
              <input
                type="text"
                disabled={!isEditable}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">City</label>
                <input
                  type="text"
                  disabled={!isEditable}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Country</label>
                <input
                  type="text"
                  disabled={!isEditable}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-60"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Settings & Thresholds */}
        <Card hoverEffect={false}>
          <CardHeader>
            <CardTitle>
              <Sliders className="w-5 h-5 text-cyan-400" /> Operational & Expiry Settings
            </CardTitle>
            <CardDescription>Configure warning limits, currency, and receipt headers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Default Currency
                </label>
                <input
                  type="text"
                  disabled={!isEditable}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="USD, ETB, EUR"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-brand-400" /> Timezone
                </label>
                <input
                  type="text"
                  disabled={!isEditable}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="UTC, Africa/Addis_Ababa"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">Low Stock Min</label>
                <input
                  type="number"
                  disabled={!isEditable}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">Expiry Warning (Days)</label>
                <input
                  type="number"
                  disabled={!isEditable}
                  value={expiryWarningDays}
                  onChange={(e) => setExpiryWarningDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">Critical Expiry (Days)</label>
                <input
                  type="number"
                  disabled={!isEditable}
                  value={criticalExpiryDays}
                  onChange={(e) => setCriticalExpiryDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-400" /> POS Receipt Header Note
              </label>
              <textarea
                rows={2}
                disabled={!isEditable}
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-400" /> POS Receipt Footer Note
              </label>
              <textarea
                rows={2}
                disabled={!isEditable}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
