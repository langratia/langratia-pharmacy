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
import { Medicine } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Panel } from '../../components/ui/Panel';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchBar } from '../../components/ui/SearchBar';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { SplitPane } from '../../components/ui/SplitPane';
import { ListMedicines } from '../../../wailsjs/go/main/App';

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
  description: ''
};

export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Inspector & Form State
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [isEditingMode, setIsEditingMode] = useState<boolean>(false);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [inspectorError, setInspectorError] = useState<string | null>(null);

  // CSV file ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['All', 'General', 'Antibiotics', 'Analgesics', 'Antimalarials', 'Cardiovascular', 'Vitamins & Supplements', 'Respiratory', 'Dermatology'];
  const medicineForms = ['Tablet', 'Capsule', 'Syrup / Suspension', 'Injection', 'Ointment / Cream', 'Drops', 'Inhaler', 'Powder'];

  const fetchMedicines = async () => {
    setIsLoading(true);
    try {
      let data: Medicine[] = [];
      try {
        data = await ListMedicines(search, category === 'All' ? '' : category, includeArchived && isAdmin);
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.ListMedicines === 'function') {
          data = await wailsApp.ListMedicines(search, category === 'All' ? '' : category, includeArchived && isAdmin);
        }
      }
      setMedicines(data || []);

      // Auto select first medicine if none selected
      if (data && data.length > 0 && !selectedMedicine && !isNewRecord) {
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
  }, [search, category, includeArchived]);

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
      buying_price: med.buying_price,
      selling_price: med.selling_price,
      current_stock: med.current_stock,
      reorder_level: med.reorder_level,
      manufacturer: med.manufacturer,
      description: med.description
    });
  };

  const handleCreateNewRecord = () => {
    if (!isAdmin) return;
    setSelectedMedicine(null);
    setIsNewRecord(true);
    setIsEditingMode(true);
    setInspectorError(null);
    setFormData(INITIAL_FORM);
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
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
    if (!isAdmin) return;
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
    if (!file || !isAdmin) return;

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
            category: getVal(['category']) || 'General',
            dosage_strength: getVal(['dosage_strength', 'strength', 'dosage']),
            medicine_form: getVal(['medicine_form', 'form']) || 'Tablet',
            pack_size: getVal(['pack_size', 'pack']) || '10x10',
            buying_price: parseFloat(getVal(['buying_price', 'cost_price', 'buying'])) || 0,
            selling_price: parseFloat(getVal(['selling_price', 'price', 'selling'])) || 0,
            current_stock: parseInt(getVal(['current_stock', 'stock', 'quantity', 'qty'])) || 0,
            reorder_level: parseInt(getVal(['reorder_level', 'reorder', 'min_stock'])) || 10,
            manufacturer: getVal(['manufacturer', 'company']),
            description: getVal(['description', 'notes']),
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
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span style={{ fontWeight: 600, color: '#0F172A' }}>{med.name}</span>
          <span style={{ fontSize: '10px', color: '#64748B', marginLeft: '6px' }}>({med.pack_size || '-'})</span>
        </div>
      )
    },
    {
      key: 'generic_name',
      header: 'Generic / Brand',
      width: '24%',
      accessor: (med) => (
        <div style={{ fontSize: '11px' }}>
          <span style={{ color: '#334155' }}>{med.generic_name || '-'}</span>
          {med.brand_name && <span style={{ color: '#64748B', marginLeft: '4px' }}>[{med.brand_name}]</span>}
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
            backgroundColor: '#F1F5F9',
            border: '1px solid #CBD5E1',
            borderRadius: '2px',
            fontSize: '10px',
            fontWeight: 600,
            color: '#334155'
          }}
        >
          {med.category}
        </span>
      )
    },
    ...(isAdmin ? [{
      key: 'buying_price',
      header: 'Buy (UGX)',
      width: '12%',
      align: 'right' as const,
      accessor: (med: Medicine) => (
        <span style={{ color: '#64748B', fontSize: '11px' }}>
          {med.buying_price.toLocaleString()}
        </span>
      )
    }] : []),
    {
      key: 'selling_price',
      header: 'Sell (UGX)',
      width: '13%',
      align: 'right' as const,
      accessor: (med) => (
        <span style={{ fontWeight: 700, color: '#0F8A6A', fontSize: '11px' }}>
          {med.selling_price.toLocaleString()}
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
          <span style={{ fontWeight: 700, color: isOut ? '#EF4444' : isLow ? '#D97706' : '#10B981' }}>
            {med.current_stock}
          </span>
        );
      }
    }
  ];

  // Calculate Metrics Summary
  const lowStockCount = medicines.filter(m => m.current_stock <= m.reorder_level && !m.is_archived).length;
  const totalStockValuation = medicines.reduce((acc, m) => acc + (m.current_stock * m.buying_price), 0);

  // Master Primary Pane Content
  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', padding: '24px', backgroundColor: 'var(--color-desktop-bg)' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleCSVImport}
        style={{ display: 'none' }}
      />

      {/* 1-Line Compact Application Command Toolbar */}
      <Panel noPadding style={{ padding: '0 24px', height: '64px', minHeight: '64px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', height: '100%' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            Inventory Management
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, justifyContent: 'flex-end' }}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search medicine, generic, brand..."
              width="240px"
              showShortcut={false}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ height: '40px', fontSize: '14px', padding: '0 16px', borderRadius: '20px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', outline: 'none' }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {isAdmin && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="desktop-btn-secondary"
                  style={{ height: '40px', fontSize: '14px', gap: '8px', padding: '0 20px', borderRadius: '20px' }}
                >
                  <Upload size={16} />
                  <span>Import CSV</span>
                </button>
                <button
                  onClick={handleCreateNewRecord}
                  className="desktop-btn-primary"
                  style={{ height: '40px', fontSize: '14px', gap: '8px', padding: '0 20px', borderRadius: '20px' }}
                >
                  <Plus size={16} />
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
        data={medicines}
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
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          fontSize: '11px',
          color: '#334155'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Boxes size={12} color="#0F8A6A" /> Total SKUs: <strong>{medicines.length}</strong>
          </span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: lowStockCount > 0 ? '#D97706' : '#334155' }}>
            <AlertTriangle size={12} /> Low Stock Warnings: <strong>{lowStockCount}</strong>
          </span>
        </div>
        {isAdmin && (
          <div>
            Inventory Valuation: <strong style={{ color: '#0F8A6A' }}>UGX {totalStockValuation.toLocaleString()}</strong>
          </div>
        )}
      </div>
    </div>
  );

  // Inspector Docked Panel Content
  const inspectorContent = (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', boxSizing: 'border-box' }}>
      {inspectorError && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '14px' }}>
          {inspectorError}
        </div>
      )}

      {(!selectedMedicine && !isNewRecord) ? (
        <div style={{ padding: '40px 10px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
          <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          Select a medicine from the data grid to inspect details and edit stock records.
        </div>
      ) : (
        <form onSubmit={handleSaveMedicine} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #CBD5E1', paddingBottom: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              {isNewRecord ? 'NEW MEDICINE ENTRY' : selectedMedicine?.name}
            </span>
            {selectedMedicine && (
              <StatusBadge status={selectedMedicine.is_archived ? 'archived' : selectedMedicine.current_stock <= 0 ? 'out_of_stock' : selectedMedicine.current_stock <= selectedMedicine.reorder_level ? 'low_stock' : 'in_stock'} />
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
              Medicine Name *
            </label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              placeholder="e.g. Amoxicillin Trihydrate"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
                Generic Composition
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                placeholder="e.g. Amoxicillin"
                value={formData.generic_name}
                onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
                Brand Name
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                placeholder="e.g. Amoxil"
                value={formData.brand_name}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
                Category
              </label>
              <select
                disabled={!isAdmin}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              >
                {categories.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
                Form
              </label>
              <select
                disabled={!isAdmin}
                value={formData.medicine_form}
                onChange={(e) => setFormData({ ...formData, medicine_form: e.target.value })}
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              >
                {medicineForms.map(form => (
                  <option key={form} value={form}>{form}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
                Dosage / Strength
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                placeholder="e.g. 500mg"
                value={formData.dosage_strength}
                onChange={(e) => setFormData({ ...formData, dosage_strength: e.target.value })}
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
                Pack Specification
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                placeholder="e.g. 10x10"
                value={formData.pack_size}
                onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
                Buy Price (UGX)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                min="0"
                value={formData.buying_price}
                onChange={(e) => setFormData({ ...formData, buying_price: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
                Sell Price (UGX)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                min="0"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box', fontWeight: 700, color: '#0F8A6A' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
                Current Stock Qty
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                min="0"
                value={formData.current_stock || 0}
                onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box', fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
                Reorder Threshold
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                min="0"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 10 })}
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
              Manufacturer
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              placeholder="e.g. Rene Industries"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
            />
          </div>

          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
              {selectedMedicine && (
                <button
                  type="button"
                  onClick={() => handleToggleArchive(selectedMedicine)}
                  style={{ height: '48px', padding: '0 16px', fontSize: '14px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid', borderColor: selectedMedicine.is_archived ? '#0284C7' : '#EF4444', color: selectedMedicine.is_archived ? '#0284C7' : '#EF4444', backgroundColor: 'transparent', cursor: 'pointer' }}
                >
                  {selectedMedicine.is_archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                  <span>{selectedMedicine.is_archived ? 'Restore' : 'Archive'}</span>
                </button>
              )}
              <button
                type="submit"
                className="desktop-btn-primary"
                style={{ height: '48px', fontSize: '14px', marginLeft: 'auto', gap: '8px', borderRadius: '24px', padding: '0 24px' }}
              >
                <Save size={16} />
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
