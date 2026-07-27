import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Archive, 
  RotateCcw, 
  Upload, 
  Filter,
  Save,
  Package,
  AlertTriangle,
  Boxes
} from 'lucide-react';
import { Medicine, Supplier } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { Panel } from '../../components/ui/Panel';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchBar } from '../../components/ui/SearchBar';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { SplitPane } from '../../components/ui/SplitPane';
import { ListMedicines, GetExpiringBatches } from '../../../wailsjs/go/main/App';

import { formatCurrency, sanitizePriceInput } from '../../utils/formatters';
import { getMedicineFormImage } from '../../utils/medicineForms';

interface InventoryPageProps {
  initialFilter?: string;
  onFilterChange?: (filter: string) => void;
}

const INITIAL_FORM: Omit<Medicine, 'id' | 'current_stock' | 'is_archived' | 'created_at'> & { current_stock?: number } = {
  name: '',
  generic_name: '',
  brand_name: '',
  category: 'General',
  dosage_strength: '',
  medicine_form: 'Tablet',
  pack_size: '10x10',
  buying_price: 0,
  selling_price: 0,
  current_stock: 0,
  reorder_level: 10,
  manufacturer: '',
  supplier_id: undefined,
  description: '',
  tax_rate: 0,
  requires_prescription: false,
  product_status: 'active'
};

export const InventoryPage: React.FC<InventoryPageProps> = ({ initialFilter, onFilterChange }) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canEdit = can('edit_inventory');

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<string>(initialFilter || 'all');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Inspector & Form State
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [isEditingMode, setIsEditingMode] = useState<boolean>(false);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [inspectorError, setInspectorError] = useState<string | null>(null);

  // Suppliers for dropdown
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // CSV file ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expiring batches data for filter
  const [expiringMedicineIds, setExpiringMedicineIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (stockFilter === 'expiring') {
      (async () => {
        try {
          const batches = await GetExpiringBatches(60);
          setExpiringMedicineIds(new Set(batches.map(b => b.medicine_id)));
        } catch {
          setExpiringMedicineIds(new Set());
        }
      })();
    }
  }, [stockFilter]);

  const categories = ['All', 'General', 'Antibiotics', 'Analgesics', 'Antimalarials', 'Cardiovascular', 'Vitamins & Supplements', 'Respiratory', 'Dermatology'];
  const medicineForms = ['Tablet', 'Capsule', 'Syrup / Suspension', 'Injection', 'Ointment / Cream', 'Drops', 'Inhaler', 'Powder'];

  const fetchMedicines = async () => {
    setIsLoading(true);
    try {
      let data: Medicine[] = [];
      try {
        data = await ListMedicines(search, category === 'All' ? '' : category, includeArchived && canEdit);
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.ListMedicines === 'function') {
          data = await wailsApp.ListMedicines(search, category === 'All' ? '' : category, includeArchived && canEdit);
        }
      }
      setMedicines(data || []);

      // Auto select first medicine only on initial load
      if (data && data.length > 0 && !selectedMedicine && !isNewRecord && medicines.length === 0) {
        handleSelectMedicine(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch medicines', err);
      toast.error('Failed to load medicines from backend database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [debouncedSearch, category, includeArchived]);

  useEffect(() => {
    (async () => {
      try {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.ListSuppliers === 'function') {
          const data = await wailsApp.ListSuppliers(false);
          setSuppliers(data || []);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const handleSelectMedicine = (med: Medicine) => {
    setSelectedMedicine(med);
    setIsNewRecord(false);
    setIsEditingMode(false);
    setInspectorError(null);
    setFormData({
      name: med.name,
      generic_name: med.generic_name,
      brand_name: med.brand_name,
      category: med.category,
      dosage_strength: med.dosage_strength,
      medicine_form: med.medicine_form,
      pack_size: med.pack_size,
      buying_price: sanitizePriceInput(med.buying_price),
      selling_price: sanitizePriceInput(med.selling_price),
      current_stock: med.current_stock,
      reorder_level: med.reorder_level,
      manufacturer: med.manufacturer,
      supplier_id: med.supplier_id,
      description: med.description,
      tax_rate: med.tax_rate,
      requires_prescription: med.requires_prescription,
      product_status: med.product_status
    });
  };

  const handleCreateNewRecord = () => {
    if (!canEdit) return;
    setSelectedMedicine(null);
    setIsNewRecord(true);
    setIsEditingMode(true);
    setInspectorError(null);
    setFormData(INITIAL_FORM);
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!formData.name.trim()) {
      setInspectorError('Medicine Name is required.');
      return;
    }

    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp) {
        if (selectedMedicine && !isNewRecord) {
          const payload: Medicine = {
            ...selectedMedicine,
            ...formData,
            current_stock: formData.current_stock ?? selectedMedicine.current_stock
          };
          await wailsApp.UpdateMedicine(payload, user?.id || 1, user?.username || 'admin');
          toast.success(`Updated ${formData.name}`);
        } else {
          const payload: Medicine = {
            id: 0,
            ...formData,
            current_stock: formData.current_stock || 0,
            is_archived: false,
            created_at: new Date().toISOString()
          };
          await wailsApp.AddMedicine(payload, user?.id || 1, user?.username || 'admin');
          toast.success(`Added ${formData.name}`);
        }
      }
      setIsEditingMode(false);
      setIsNewRecord(false);
      fetchMedicines();
    } catch (err: any) {
      setInspectorError(err?.message || 'Failed to save medicine record');
    }
  };

  const handleToggleArchive = async (med: Medicine) => {
    if (!canEdit) return;
    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp && typeof wailsApp.ArchiveMedicine === 'function') {
        await wailsApp.ArchiveMedicine(med.id, !med.is_archived, user?.id || 1, user?.username || 'admin');
        toast.success(med.is_archived ? 'Medicine restored' : 'Medicine archived');
        fetchMedicines();
      }
    } catch (err) {
      console.error('Failed to toggle archive', err);
    }
  };

  // CSV Bulk Import Handler
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canEdit) return;

    setCsvLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length <= 1) {
          toast.error('CSV file is empty or missing data rows.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const importedMeds: Medicine[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"(.*)"$/, '$1'));
          if (cols.length === 0 || !cols[0]) continue;

          const getVal = (possibleKeys: string[]) => {
            const idx = headers.findIndex(h => possibleKeys.includes(h));
            return idx !== -1 ? cols[idx] : '';
          };

          const name = getVal(['name', 'medicine', 'medicine_name', 'item']) || cols[0];
          if (!name) continue;

          importedMeds.push({
            id: 0,
            name: name,
            generic_name: getVal(['generic_name', 'generic', 'composition']),
            brand_name: getVal(['brand_name', 'brand']),
            barcode: getVal(['barcode', 'bar_code', 'ean']),
            category: getVal(['category']) || 'General',
            dosage_strength: getVal(['dosage_strength', 'strength', 'dosage']),
            medicine_form: getVal(['medicine_form', 'form']) || 'Tablet',
            pack_size: getVal(['pack_size', 'pack']) || '10x10',
            buying_price: parseFloat(getVal(['buying_price', 'cost_price', 'buying'])) || 0,
            selling_price: parseFloat(getVal(['selling_price', 'price', 'selling'])) || 0,
            current_stock: parseInt(getVal(['current_stock', 'stock', 'quantity', 'qty'])) || 0,
            reorder_level: parseInt(getVal(['reorder_level', 'reorder', 'min_stock'])) || 10,
            manufacturer: getVal(['manufacturer', 'company']),
            supplier_id: undefined,
            description: getVal(['description', 'notes']),
            tax_rate: parseFloat(getVal(['tax_rate', 'tax'])) || 0,
            requires_prescription: getVal(['requires_prescription', 'rx_required', 'prescription']).toLowerCase() === 'yes',
            product_status: getVal(['product_status', 'status']) || 'active',
            is_archived: false,
            created_at: new Date().toISOString()
          });
        }

        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.BulkImportMedicines === 'function') {
          const count = await wailsApp.BulkImportMedicines(importedMeds, user?.id || 1, user?.username || 'admin');
          toast.success(`Successfully imported ${count} medicines from CSV!`);
          fetchMedicines();
        }
      } catch (err: any) {
        toast.error('Failed to import CSV: ' + (err.message || err));
      } finally {
        setCsvLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  // Define Columns for DataGrid
  const columns: Column<Medicine>[] = [
    {
      key: 'name',
      header: 'Medicine Name',
      width: '28%',
      accessor: (med) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src={getMedicineFormImage(med.medicine_form)} 
            alt={med.medicine_form} 
            style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '4px', backgroundColor: '#fff', border: '1px solid var(--color-border-default)' }}
          />
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{med.name}</span>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>({med.pack_size || '-'})</span>
          </div>
        </div>
      )
    },
    {
      key: 'generic_name',
      header: 'Generic / Brand',
      width: '24%',
      accessor: (med) => (
        <div style={{ fontSize: '11px' }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>{med.generic_name || '-'}</span>
          {med.brand_name && <span style={{ color: 'var(--color-text-muted)', marginLeft: '4px' }}>[{med.brand_name}]</span>}
        </div>
      )
    },
    {
      key: 'category',
      header: 'Category',
      width: '15%',
      accessor: (med) => (
        <span
          style={{
            padding: '1px 6px',
            backgroundColor: 'var(--color-bg-base)',
            border: '1px solid var(--color-border-default)',
            borderRadius: '0px',
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--color-text-secondary)'
          }}
        >
          {med.category}
        </span>
      )
    },
    ...(canEdit ? [{
      key: 'buying_price',
      header: 'Buy (UGX)',
      width: '12%',
      align: 'right' as const,
      accessor: (med: Medicine) => (
        <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
          {formatCurrency(med.buying_price)}
        </span>
      )
    }] : []),
    {
      key: 'selling_price',
      header: 'Sell (UGX)',
      width: '13%',
      align: 'right' as const,
      accessor: (med) => (
        <span style={{ fontWeight: 700, color: 'var(--color-text-accent)', fontSize: '11px' }}>
          {formatCurrency(med.selling_price)}
        </span>
      )
    },
    {
      key: 'current_stock',
      header: 'Stock',
      width: '10%',
      align: 'center' as const,
      accessor: (med) => {
        const isOut = med.current_stock <= 0;
        const isLow = med.current_stock > 0 && med.current_stock <= med.reorder_level;

        return (
          <span style={{ fontWeight: 700, color: isOut ? 'var(--color-danger-text)' : isLow ? 'var(--color-warning-text)' : 'var(--color-success-text)' }}>
            {med.current_stock}
          </span>
        );
      }
    }
  ];

  // Stock filtering calculation
  const filteredMedicines = medicines.filter(med => {
    if (stockFilter === 'low_stock') {
      return med.current_stock > 0 && med.current_stock <= med.reorder_level;
    }
    if (stockFilter === 'out_of_stock') {
      return med.current_stock <= 0;
    }
    if (stockFilter === 'expiring') {
      return expiringMedicineIds.has(med.id);
    }
    return true;
  });

  // Calculate Metrics Summary
  const lowStockCount = medicines.filter(m => m.current_stock > 0 && m.current_stock <= m.reorder_level && !m.is_archived).length;
  const totalStockValuation = medicines.reduce((acc, m) => acc + (m.current_stock * m.buying_price), 0);

  // Master Primary Pane Content
  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', padding: '0', backgroundColor: 'var(--color-bg-base)' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleCSVImport}
        style={{ display: 'none' }}
      />

      {/* 1-Line Compact Application Command Toolbar */}
      <Panel noPadding style={{ padding: '0 16px', height: '44px', minHeight: '44px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', height: '100%' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Inventory Management</span>
            {stockFilter !== 'all' && (
              <span style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent-base)', border: '1px solid var(--color-accent-base)' }}>
                FILTER: {stockFilter.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end' }}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search medicine, generic, brand..."
              width="220px"
              showShortcut={false}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
              <select
                value={stockFilter}
                onChange={(e) => {
                  setStockFilter(e.target.value);
                  if (onFilterChange) onFilterChange(e.target.value);
                }}
                style={{ height: '28px', fontSize: '12px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', outline: 'none' }}
              >
                <option value="all">All Stock Statuses</option>
                <option value="low_stock">Low Stock Only</option>
                <option value="out_of_stock">Out of Stock Only</option>
                <option value="expiring">Expiring Batches</option>
              </select>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ height: '28px', fontSize: '12px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', outline: 'none' }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {canEdit && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                    style={{ margin: 0, width: '14px', height: '14px', cursor: 'pointer' }}
                  />
                  Archived
                </label>
              )}
            </div>

            {canEdit && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={csvLoading}
                  className="desktop-btn-secondary"
                  style={{ height: '28px', fontSize: '12px', gap: '6px', padding: '0 14px', borderRadius: '0px', opacity: csvLoading ? 0.6 : 1 }}
                >
                  <Upload size={14} />
                  <span>{csvLoading ? 'Importing...' : 'Import CSV'}</span>
                </button>
                <button
                  onClick={handleCreateNewRecord}
                  className="desktop-btn-primary"
                  style={{ height: '28px', fontSize: '12px', gap: '6px', padding: '0 14px', borderRadius: '0px' }}
                >
                  <Plus size={14} />
                  <span>Add Medicine</span>
                </button>
              </>
            )}
          </div>
        </div>
      </Panel>

      {/* Master DataGrid */}
      <DataGrid
        columns={columns}
        data={filteredMedicines}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No medicines matching search filter criteria."
        selectedKey={selectedMedicine ? selectedMedicine.id : null}
        onRowClick={(row) => handleSelectMedicine(row)}
        compactRows={true}
        zebraStriping={true}
        maxHeight="calc(100vh - 170px)"
        style={{ flex: 1 }}
      />

      {/* Bottom Summary Strip */}
      <div
        style={{
          height: '24px',
          backgroundColor: 'var(--color-bg-panel)',
          border: '1px solid var(--color-border-default)',
          borderRadius: '0px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          fontSize: '11px',
          color: 'var(--color-text-secondary)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Boxes size={12} style={{ color: 'var(--color-accent-base)' }} /> Showing SKUs: <strong>{filteredMedicines.length} / {medicines.length}</strong>
          </span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: lowStockCount > 0 ? 'var(--color-warning-text)' : 'var(--color-text-secondary)' }}>
            <AlertTriangle size={12} /> Low Stock Warnings: <strong>{lowStockCount}</strong>
          </span>
        </div>
        {canEdit && (
          <div>
            Inventory Valuation: <strong style={{ color: 'var(--color-text-accent)' }}>UGX {formatCurrency(totalStockValuation)}</strong>
          </div>
        )}
      </div>
    </div>
  );

  // Inspector Docked Panel Content
  const inspectorContent = (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
      {inspectorError && (
        <div style={{ padding: '8px 12px', borderRadius: '0px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger-text)', fontSize: '12px' }}>
          {inspectorError}
        </div>
      )}

      {(!selectedMedicine && !isNewRecord) ? (
        <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
          <Package size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          Select a medicine from the data grid to inspect details and edit stock records.
        </div>
      ) : (
        <form onSubmit={handleSaveMedicine} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {selectedMedicine && (
                <img 
                  src={getMedicineFormImage(selectedMedicine.medicine_form)} 
                  alt={selectedMedicine.medicine_form} 
                  style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px', backgroundColor: '#fff', border: '1px solid var(--color-border-default)' }}
                />
              )}
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {isNewRecord ? 'NEW MEDICINE ENTRY' : selectedMedicine?.name}
              </span>
            </div>
            {selectedMedicine && (
              <div style={{ display: 'flex', gap: '4px' }}>
                {selectedMedicine.product_status && selectedMedicine.product_status !== 'active' && (
                  <StatusBadge status={selectedMedicine.product_status as any} />
                )}
                <StatusBadge status={selectedMedicine.is_archived ? 'archived' : selectedMedicine.current_stock <= 0 ? 'out_of_stock' : selectedMedicine.current_stock <= selectedMedicine.reorder_level ? 'low_stock' : 'in_stock'} />
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
              Medicine Name *
            </label>
            <input
              type="text"
              required
              disabled={!canEdit}
              placeholder="e.g. Amoxicillin Trihydrate"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Generic Composition
              </label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="e.g. Amoxicillin"
                value={formData.generic_name}
                onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Brand Name
              </label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="e.g. Amoxil"
                value={formData.brand_name}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
              Category
            </label>
            <select
              disabled={!canEdit}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
            >
                {categories.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Form
              </label>
              <select
                disabled={!canEdit}
                value={formData.medicine_form}
                onChange={(e) => setFormData({ ...formData, medicine_form: e.target.value })}
                style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
              >
                {medicineForms.map(form => (
                  <option key={form} value={form}>{form}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Dosage / Strength
              </label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="e.g. 500mg"
                value={formData.dosage_strength}
                onChange={(e) => setFormData({ ...formData, dosage_strength: e.target.value })}
                style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Pack Specification
              </label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="e.g. 10x10"
                value={formData.pack_size}
                onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
                style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Tax Rate (%)
              </label>
              <input
                type="number"
                disabled={!canEdit}
                min="0"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Buy Price (UGX)
              </label>
              <input
                type="number"
                disabled={!canEdit}
                min="0"
                step="0.01"
                value={formData.buying_price}
                onChange={(e) => setFormData({ ...formData, buying_price: sanitizePriceInput(e.target.value) })}
                style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Sell Price (UGX)
              </label>
              <input
                type="number"
                disabled={!canEdit}
                min="0"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: sanitizePriceInput(e.target.value) })}
                style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-accent)', fontWeight: 700, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Product Status
              </label>
              <select
                disabled={!canEdit}
                value={formData.product_status}
                onChange={(e) => setFormData({ ...formData, product_status: e.target.value })}
                style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
              >
                <option value="active">Active</option>
                <option value="discontinued">Discontinued</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase', height: '28px' }}>
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={formData.requires_prescription}
                  onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.checked })}
                  style={{ margin: 0, width: '14px', height: '14px', cursor: canEdit ? 'pointer' : 'not-allowed' }}
                />
                Requires Prescription (Rx)
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Current Stock Qty
              </label>
              <input
                type="number"
                disabled={!canEdit}
                min="0"
                value={formData.current_stock || 0}
                onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', fontWeight: 700, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Reorder Threshold
              </label>
              <input
                type="number"
                disabled={!canEdit}
                min="0"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 10 })}
                style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Manufacturer
              </label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="e.g. Rene Industries"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Supplier
              </label>
              <select
                disabled={!canEdit}
                value={formData.supplier_id ?? ''}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value ? parseInt(e.target.value) : undefined })}
                style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
              >
                <option value="">-- No Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
              Description / Notes
            </label>
            <textarea
              rows={2}
              disabled={!canEdit}
              placeholder="Additional information about this medicine..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
            />
          </div>

          {canEdit && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {selectedMedicine && (
                  <button
                    type="button"
                    onClick={() => handleToggleArchive(selectedMedicine)}
                    style={{ height: '32px', padding: '0 12px', fontSize: '12px', borderRadius: '0px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid', borderColor: selectedMedicine.is_archived ? 'var(--color-info-border)' : 'var(--color-danger-border)', color: selectedMedicine.is_archived ? 'var(--color-info-text)' : 'var(--color-danger-text)', backgroundColor: 'transparent', cursor: 'pointer' }}
                  >
                    {selectedMedicine.is_archived ? <RotateCcw size={14} /> : <Archive size={14} />}
                    <span>{selectedMedicine.is_archived ? 'Restore' : 'Archive'}</span>
                  </button>
                )}
                {(isNewRecord || isEditingMode) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewRecord(false);
                      setIsEditingMode(false);
                      setSelectedMedicine(null);
                      setInspectorError(null);
                    }}
                    style={{ height: '32px', padding: '0 12px', fontSize: '12px', borderRadius: '0px', border: '1px solid var(--color-border-default)', color: 'var(--color-text-secondary)', backgroundColor: 'transparent', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="desktop-btn-primary"
                style={{ height: '32px', fontSize: '13px', marginLeft: 'auto', gap: '6px', borderRadius: '0px', padding: '0 16px' }}
              >
                <Save size={14} />
                <span>{isNewRecord ? 'Save Record' : 'Update Record'}</span>
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );

  return (
    <SplitPane
      primaryPane={primaryContent}
      inspectorPane={inspectorContent}
      inspectorTitle={isNewRecord ? 'ADD NEW MEDICINE' : 'MEDICINE INSPECTOR'}
      inspectorWidth="340px"
    />
  );
};
