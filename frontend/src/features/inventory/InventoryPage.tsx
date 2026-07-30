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
  Boxes,
  Pill,
  X,
  CheckCircle2
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

  // Add / Edit Medicine Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [modalFormData, setModalFormData] = useState(INITIAL_FORM);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

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
    setIsEditModalOpen(true);
  };

  const handleCreateNewRecord = () => {
    if (!canEdit) return;
    setModalFormData(INITIAL_FORM);
    setModalError(null);
    setIsAddModalOpen(true);
  };

  const handleAddMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!modalFormData.name.trim()) {
      setModalError('Medicine Name is required.');
      return;
    }

    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp) {
        const payload: Medicine = {
          id: 0,
          ...modalFormData,
          current_stock: modalFormData.current_stock || 0,
          is_archived: false,
          created_at: new Date().toISOString()
        };
        await wailsApp.AddMedicine(payload, user?.id || 1, user?.username || 'admin');
        setIsAddModalOpen(false);
        setSuccessMessage(`"${modalFormData.name}" has been successfully added to inventory!`);
        setShowSuccessModal(true);
        fetchMedicines();
      }
    } catch (err: any) {
      setModalError(err?.message || 'Failed to add medicine record');
    }
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !selectedMedicine) return;
    if (!formData.name.trim()) {
      setInspectorError('Medicine Name is required.');
      return;
    }

    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp) {
        const payload: Medicine = {
          ...selectedMedicine,
          ...formData,
          current_stock: formData.current_stock ?? selectedMedicine.current_stock
        };
        await wailsApp.UpdateMedicine(payload, user?.id || 1, user?.username || 'admin');
        setIsEditModalOpen(false);
        setSuccessMessage(`Updated "${formData.name}" successfully!`);
        setShowSuccessModal(true);
      }
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
        setIsEditModalOpen(false);
        setSuccessMessage(med.is_archived ? `Restored "${med.name}"` : `Archived "${med.name}"`);
        setShowSuccessModal(true);
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
      width: '26%',
      accessor: (med) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            {med.medicine_form || 'Drug'}
          </span>
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
      width: '22%',
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
      width: '16%',
      accessor: (med) => (
        <span
          style={{
            padding: '2px 8px',
            background: 'rgba(18,108,255,0.08)',
            border: '1px solid rgba(18,108,255,0.2)',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--muted)'
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
        <span className="tabular-nums" style={{ color: 'var(--muted-dark)', fontSize: '12px' }}>
          {formatCurrency(med.buying_price)}
        </span>
      )
    }] : []),
    {
      key: 'selling_price',
      header: 'Sell (UGX)',
      width: '12%',
      align: 'right' as const,
      accessor: (med) => (
        <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--blue)', fontSize: '12px' }}>
          {formatCurrency(med.selling_price)}
        </span>
      )
    },
    {
      key: 'current_stock',
      header: 'Stock',
      width: '12%',
      align: 'center' as const,
      accessor: (med) => {
        const isOut = med.current_stock <= 0;
        const isLow = med.current_stock > 0 && med.current_stock <= med.reorder_level;

        return (
          <span className="tabular-nums" style={{ fontWeight: 700, color: isOut ? 'var(--red)' : isLow ? 'var(--yellow)' : 'var(--green)' }}>
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

  // Master Content View
  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', minHeight: 0, width: '100%', overflow: 'hidden' }}>
      <input type="file" ref={fileInputRef} accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
          Inventory
          {stockFilter !== 'all' && (
            <span style={{ fontSize: '11px', padding: '3px 10px', background: 'rgba(18,108,255,0.12)', color: 'var(--blue)', border: '1px solid rgba(18,108,255,0.25)', borderRadius: '20px', fontWeight: 700 }}>
              {stockFilter.replace('_', ' ')}
            </span>
          )}
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search medicine, generic, brand…"
          width="240px"
          showShortcut={false}
        />

        <select
          value={stockFilter}
          onChange={(e) => { setStockFilter(e.target.value); if (onFilterChange) onFilterChange(e.target.value); }}
          style={{ height: '38px', fontSize: '13px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset' }}
        >
          <option value="all">All Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
          <option value="expiring">Expiring</option>
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ height: '38px', fontSize: '13px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset' }}
        >
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        {canEdit && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} style={{ cursor: 'pointer' }} />
            Show Archived
          </label>
        )}

        {canEdit && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button onClick={() => fileInputRef.current?.click()} disabled={csvLoading} className="btn" style={{ gap: '6px' }}>
              <Upload size={14} />
              {csvLoading ? 'Importing…' : 'Import CSV'}
            </button>
            <button onClick={handleCreateNewRecord} className="btn btn-primary" style={{ gap: '6px' }}>
              <Plus size={14} /> Add Medicine
            </button>
          </div>
        )}
      </div>

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
        style={{ flex: 1 }}
      />

      {/* Bottom Summary Strip */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '8px', padding: '0 14px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Boxes size={13} style={{ color: 'var(--blue)' }} />
            <strong style={{ color: 'var(--ink)' }}>{filteredMedicines.length}</strong> / {medicines.length} SKUs
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: lowStockCount > 0 ? 'var(--yellow)' : 'var(--muted)' }}>
            <AlertTriangle size={13} />
            <strong>{lowStockCount}</strong> low stock
          </span>
        </div>
        {canEdit && (
          <span>Valuation: <strong className="tabular-nums" style={{ color: 'var(--blue)' }}>UGX {formatCurrency(totalStockValuation)}</strong></span>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      {primaryContent}

      {/* ── MODAL: Add New Medicine ──────────────────────────────── */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--r2)',
              width: '640px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: 'var(--shadow-dropdown)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Add New Medicine</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="btn" style={{ padding: '4px 8px', minHeight: 'unset' }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Enter full details to add a new product SKU to the pharmacy database.</p>

            {modalError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 56, 96, 0.1)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddMedicineSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Medicine Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin Trihydrate 500mg"
                  value={modalFormData.name}
                  onChange={(e) => setModalFormData({ ...modalFormData, name: e.target.value })}
                  style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Generic Composition</label>
                  <input
                    type="text"
                    placeholder="e.g. Amoxicillin"
                    value={modalFormData.generic_name}
                    onChange={(e) => setModalFormData({ ...modalFormData, generic_name: e.target.value })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Amoxil"
                    value={modalFormData.brand_name}
                    onChange={(e) => setModalFormData({ ...modalFormData, brand_name: e.target.value })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Category</label>
                  <select
                    value={modalFormData.category}
                    onChange={(e) => setModalFormData({ ...modalFormData, category: e.target.value })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  >
                    {categories.filter(c => c !== 'All').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Form</label>
                  <select
                    value={modalFormData.medicine_form}
                    onChange={(e) => setModalFormData({ ...modalFormData, medicine_form: e.target.value })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  >
                    {medicineForms.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Dosage / Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg"
                    value={modalFormData.dosage_strength}
                    onChange={(e) => setModalFormData({ ...modalFormData, dosage_strength: e.target.value })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Buying Price (UGX)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={modalFormData.buying_price}
                    onChange={(e) => setModalFormData({ ...modalFormData, buying_price: sanitizePriceInput(e.target.value) })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Selling Price (UGX) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={modalFormData.selling_price}
                    onChange={(e) => setModalFormData({ ...modalFormData, selling_price: sanitizePriceInput(e.target.value) })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--blue)', fontWeight: 700, boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Initial Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={modalFormData.current_stock || 0}
                    onChange={(e) => setModalFormData({ ...modalFormData, current_stock: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', fontWeight: 700, boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    value={modalFormData.reorder_level}
                    onChange={(e) => setModalFormData({ ...modalFormData, reorder_level: parseInt(e.target.value) || 10 })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Pack Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 10x10"
                    value={modalFormData.pack_size}
                    onChange={(e) => setModalFormData({ ...modalFormData, pack_size: e.target.value })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                <input
                  type="checkbox"
                  id="modal_rx"
                  checked={modalFormData.requires_prescription}
                  onChange={(e) => setModalFormData({ ...modalFormData, requires_prescription: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="modal_rx" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}>
                  Requires Doctor's Prescription (Rx)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
                  <Save size={14} />
                  <span>Save Medicine SKU</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit / Inspect Medicine ─────────────────────── */}
      {isEditModalOpen && selectedMedicine && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--r2)',
              width: '640px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: 'var(--shadow-dropdown)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(18,108,255,0.12)', border: '1px solid rgba(18,108,255,0.25)', borderRadius: '8px', color: 'var(--blue)' }}>
                  <Pill size={16} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                  Edit {selectedMedicine.name}
                </h2>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="btn" style={{ padding: '4px 8px', minHeight: 'unset' }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Modify SKU specifications, pricing, or stock thresholds.</p>

            {inspectorError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 56, 96, 0.1)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: '13px', marginBottom: '14px' }}>
                {inspectorError}
              </div>
            )}

            <form onSubmit={handleSaveMedicine} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Medicine Name *</label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Generic Composition</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.generic_name}
                    onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Brand Name</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Category</label>
                  <select
                    disabled={!canEdit}
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  >
                    {categories.filter(c => c !== 'All').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Form</label>
                  <select
                    disabled={!canEdit}
                    value={formData.medicine_form}
                    onChange={(e) => setFormData({ ...formData, medicine_form: e.target.value })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  >
                    {medicineForms.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Dosage / Strength</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.dosage_strength}
                    onChange={(e) => setFormData({ ...formData, dosage_strength: e.target.value })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Buying Price (UGX)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!canEdit}
                    value={formData.buying_price}
                    onChange={(e) => setFormData({ ...formData, buying_price: sanitizePriceInput(e.target.value) })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Selling Price (UGX) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    disabled={!canEdit}
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: sanitizePriceInput(e.target.value) })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--blue)', fontWeight: 700, boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Current Stock</label>
                  <input
                    type="number"
                    min="0"
                    disabled={!canEdit}
                    value={formData.current_stock || 0}
                    onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', fontWeight: 700, boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    disabled={!canEdit}
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 10 })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Pack Size</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.pack_size}
                    onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
                {canEdit && selectedMedicine && (
                  <button
                    type="button"
                    onClick={() => handleToggleArchive(selectedMedicine)}
                    className={selectedMedicine.is_archived ? 'btn' : 'btn btn-danger'}
                    style={{ gap: '6px' }}
                  >
                    {selectedMedicine.is_archived ? <RotateCcw size={14} /> : <Archive size={14} />}
                    <span>{selectedMedicine.is_archived ? 'Restore SKU' : 'Archive SKU'}</span>
                  </button>
                )}
                <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn">Close</button>
                  {canEdit && (
                    <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
                      <Save size={14} />
                      <span>Update Medicine</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Action Success Confirmation Alert ────────────── */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--r2)',
              width: '420px',
              padding: '28px',
              boxShadow: 'var(--shadow-dropdown)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px'
            }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(20, 240, 109, 0.12)', border: '1px solid rgba(20, 240, 109, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Action Successful</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
              {successMessage}
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', height: '40px', marginTop: '8px' }}
            >
              Done / Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
