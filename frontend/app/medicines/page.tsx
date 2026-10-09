'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import {
  Pill,
  Search,
  Plus,
  QrCode,
  Tag,
  Archive,
  Edit,
  CheckCircle,
  AlertCircle,
  X,
  Boxes,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  brandName?: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  barcode?: string;
  sku?: string;
  unit: string;
  active: boolean;
  categoryId?: string;
  category?: Category;
}

export default function MedicinesPage() {
  const { hasPermission } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formGenericName, setFormGenericName] = useState('');
  const [formBrandName, setFormBrandName] = useState('');
  const [formStrength, setFormStrength] = useState('');
  const [formDosageForm, setFormDosageForm] = useState('TABLET');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formUnit, setFormUnit] = useState('BOX');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category Form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const fetchMedicines = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedCategory) params.set('categoryId', selectedCategory);

      const res = await fetch(`/api/medicines?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setMedicines(json.data.medicines);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load medicines catalog.' });
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/medicines/categories');
      if (res.ok) {
        const json = await res.json();
        setCategories(json.data.categories);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchMedicines();
    fetchCategories();
  }, [fetchMedicines]);

  // USB Barcode Scanner Handler
  useBarcodeScanner({
    onScan: (scannedCode) => {
      if (showAddModal) {
        setFormBarcode(scannedCode);
        setMessage({ type: 'success', text: `Captured Barcode: ${scannedCode}` });
      } else {
        setSearch(scannedCode);
        setMessage({ type: 'success', text: `Scanned Barcode Search: ${scannedCode}` });
      }
    },
  });

  const openAddModal = (med?: Medicine) => {
    if (med) {
      setEditingMedicine(med);
      setFormName(med.name);
      setFormGenericName(med.genericName || '');
      setFormBrandName(med.brandName || '');
      setFormStrength(med.strength || '');
      setFormDosageForm(med.dosageForm || 'TABLET');
      setFormCategoryId(med.categoryId || '');
      setFormManufacturer(med.manufacturer || '');
      setFormBarcode(med.barcode || '');
      setFormSku(med.sku || '');
      setFormUnit(med.unit || 'BOX');
    } else {
      setEditingMedicine(null);
      setFormName('');
      setFormGenericName('');
      setFormBrandName('');
      setFormStrength('');
      setFormDosageForm('TABLET');
      setFormCategoryId('');
      setFormManufacturer('');
      setFormBarcode('');
      setFormSku('');
      setFormUnit('BOX');
    }
    setShowAddModal(true);
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        name: formName,
        genericName: formGenericName,
        brandName: formBrandName,
        strength: formStrength,
        dosageForm: formDosageForm,
        categoryId: formCategoryId || undefined,
        manufacturer: formManufacturer,
        barcode: formBarcode,
        sku: formSku,
        unit: formUnit,
      };

      const url = editingMedicine ? `/api/medicines/${editingMedicine.id}` : '/api/medicines';
      const method = editingMedicine ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to save medicine.' });
      } else {
        setMessage({
          type: 'success',
          text: `Medicine '${formName}' ${editingMedicine ? 'updated' : 'added'} successfully.`,
        });
        setShowAddModal(false);
        fetchMedicines();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Network error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/medicines/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName, description: catDesc }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to create category.' });
      } else {
        setMessage({ type: 'success', text: `Category '${catName}' created successfully.` });
        setCatName('');
        setCatDesc('');
        setShowCategoryModal(false);
        fetchCategories();
      }
    } catch {
      setMessage({ type: 'error', text: 'Error creating category.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive '${name}'?`)) return;

    try {
      const res = await fetch(`/api/medicines/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: `Medicine '${name}' archived.` });
        fetchMedicines();
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to archive medicine.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Master Medicine Catalog</h1>
            <Badge variant="info">
              <QrCode className="w-3.5 h-3.5 mr-1" /> USB Scanner Enabled
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Product specification catalog (Name, Strength, Dosage Form, Package Barcode, SKU).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasPermission('products.create') && (
            <>
              <Button variant="secondary" size="md" onClick={() => setShowCategoryModal(true)}>
                <Tag className="w-4 h-4 mr-2" /> Add Category
              </Button>
              <Button variant="primary" size="md" onClick={() => openAddModal()}>
                <Plus className="w-4 h-4 mr-2" /> Add Medicine
              </Button>
            </>
          )}
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
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Medicine Name, Brand, Generic, Barcode (12345...), or SKU..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-brand-500 w-full sm:w-48"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Medicines Table Card */}
      <Card hoverEffect={false} className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading Catalog...</div>
        ) : medicines.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Boxes className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-medium text-slate-300">No medicines found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your first medicine to the catalog or scan a USB barcode to quickly create a product entry.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Medicine / Product</th>
                  <th className="p-3.5">Strength / Form</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Barcode / SKU</th>
                  <th className="p-3.5">Unit</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {medicines.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="p-3.5 pl-5 font-semibold text-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-950/60 border border-brand-800/40 text-brand-400 shrink-0">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <div>{med.name}</div>
                          {med.genericName && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              Generic: {med.genericName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div>{med.strength || '—'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{med.dosageForm || 'TABLET'}</div>
                    </td>
                    <td className="p-3.5">
                      {med.category ? (
                        <Badge variant="outline" className="text-[10px]">
                          {med.category.name}
                        </Badge>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      {med.barcode ? (
                        <div className="flex items-center gap-1 text-emerald-400">
                          <QrCode className="w-3 h-3" /> {med.barcode}
                        </div>
                      ) : (
                        <span className="text-slate-500">No Barcode</span>
                      )}
                      {med.sku && <div className="text-[10px] text-slate-500">SKU: {med.sku}</div>}
                    </td>
                    <td className="p-3.5 font-mono">{med.unit}</td>
                    <td className="p-3.5">
                      <Badge variant={med.active ? 'success' : 'default'}>
                        {med.active ? 'Active' : 'Archived'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right pr-5">
                      <div className="flex items-center justify-end gap-2">
                        {hasPermission('products.edit') && (
                          <button
                            onClick={() => openAddModal(med)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Edit Medicine"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {hasPermission('products.archive') && med.active && (
                          <button
                            onClick={() => handleArchive(med.id, med.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            title="Archive Product"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Medicine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">
                {editingMedicine ? 'Edit Medicine' : 'Add New Medicine to Catalog'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Medicine Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Generic Name</label>
                  <input
                    type="text"
                    value={formGenericName}
                    onChange={(e) => setFormGenericName(e.target.value)}
                    placeholder="e.g. Acetaminophen"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Brand Name</label>
                  <input
                    type="text"
                    value={formBrandName}
                    onChange={(e) => setFormBrandName(e.target.value)}
                    placeholder="e.g. Panadol"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Strength</label>
                  <input
                    type="text"
                    value={formStrength}
                    onChange={(e) => setFormStrength(e.target.value)}
                    placeholder="e.g. 500mg"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Dosage Form</label>
                  <select
                    value={formDosageForm}
                    onChange={(e) => setFormDosageForm(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                  >
                    <option value="TABLET">TABLET</option>
                    <option value="CAPSULE">CAPSULE</option>
                    <option value="SYRUP">SYRUP</option>
                    <option value="INJECTION">INJECTION</option>
                    <option value="CREAM">CREAM</option>
                    <option value="DROPS">DROPS</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Unit</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="BOX, STRIP"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Category</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Manufacturer</label>
                  <input
                    type="text"
                    value={formManufacturer}
                    onChange={(e) => setFormManufacturer(e.target.value)}
                    placeholder="e.g. GSK, Novartis"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-emerald-400" /> Barcode (USB Scanner)
                  </label>
                  <input
                    type="text"
                    data-barcode-capture="true"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="Scan USB barcode..."
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">SKU / Code</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="Internal SKU"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingMedicine ? 'Update Medicine' : 'Add Medicine'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Add Medicine Category</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Antibiotics, Analgesics"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Category description..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
