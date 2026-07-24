import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Edit, 
  Archive, 
  RotateCcw, 
  Upload, 
  X,
  Filter,
  Layers
} from 'lucide-react';
import { Medicine } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Panel } from '../../components/ui/Panel';
import { DesktopButton } from '../../components/ui/DesktopButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchBar } from '../../components/ui/SearchBar';
import { DataGrid, Column } from '../../components/ui/DataGrid';
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
  const [selectedMedId, setSelectedMedId] = useState<number | null>(null);

  // CSV file ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [modalError, setModalError] = useState<string | null>(null);

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

  const handleOpenAddModal = () => {
    if (!isAdmin) return;
    setEditingMedicine(null);
    setFormData(INITIAL_FORM);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (med: Medicine) => {
    if (!isAdmin) return;
    setEditingMedicine(med);
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
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!formData.name.trim()) {
      setModalError('Medicine Name is required.');
      return;
    }

    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp) {
        if (editingMedicine) {
          const payload: Medicine = {
            ...editingMedicine,
            ...formData,
            current_stock: editingMedicine.current_stock
          };
          await wailsApp.UpdateMedicine(payload, user?.id || 1, user?.username || 'admin');
          toast.success('Medicine record updated');
        } else {
          const payload: Medicine = {
            id: 0,
            ...formData,
            current_stock: formData.current_stock || 0,
            is_archived: false,
            created_at: new Date().toISOString()
          };
          await wailsApp.AddMedicine(payload, user?.id || 1, user?.username || 'admin');
          toast.success('New medicine created');
        }
      }
      setIsModalOpen(false);
      fetchMedicines();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save medicine');
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
      } else {
        setMedicines(prev => prev.map(m => m.id === med.id ? { ...m, is_archived: !m.is_archived } : m));
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

        if (importedMeds.length === 0) {
          toast.error('No valid medicine records found in CSV.');
          return;
        }

        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.BulkImportMedicines === 'function') {
          const count = await wailsApp.BulkImportMedicines(importedMeds, user?.id || 1, user?.username || 'admin');
          toast.success(`Successfully imported ${count} medicines from CSV!`);
          fetchMedicines();
        } else {
          toast.success(`Imported ${importedMeds.length} medicines.`);
          setMedicines(prev => [...prev, ...importedMeds]);
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
      accessor: (med) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>{med.name}</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>Pack: {med.pack_size || '-'}</div>
        </div>
      )
    },
    {
      key: 'generic_name',
      header: 'Generic / Brand',
      accessor: (med) => (
        <div>
          <div style={{ color: '#374151' }}>{med.generic_name || '-'}</div>
          {med.brand_name && <div style={{ fontSize: '11px', color: '#6B7280' }}>Brand: {med.brand_name}</div>}
        </div>
      )
    },
    {
      key: 'category',
      header: 'Category',
      accessor: (med) => (
        <span
          style={{
            padding: '2px 8px',
            backgroundColor: '#F3F4F6',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 500,
            color: '#374151'
          }}
        >
          {med.category}
        </span>
      )
    },
    {
      key: 'dosage_strength',
      header: 'Form / Dosage',
      accessor: (med) => (
        <div>
          <div style={{ color: '#111827' }}>{med.dosage_strength || '-'}</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>{med.medicine_form}</div>
        </div>
      )
    },
    ...(isAdmin ? [{
      key: 'buying_price',
      header: 'Buying Price',
      accessor: (med: Medicine) => (
        <span style={{ color: '#6B7280' }}>
          UGX {med.buying_price.toLocaleString()}
        </span>
      )
    }] : []),
    {
      key: 'selling_price',
      header: 'Selling Price',
      accessor: (med) => (
        <span style={{ fontWeight: 600, color: '#0F8A6A' }}>
          UGX {med.selling_price.toLocaleString()}
        </span>
      )
    },
    {
      key: 'current_stock',
      header: 'Stock Level',
      accessor: (med) => {
        const isOut = med.current_stock <= 0;
        const isLow = med.current_stock > 0 && med.current_stock <= med.reorder_level;

        return (
          <div>
            <span style={{ fontWeight: 600, color: isOut ? '#EF4444' : isLow ? '#F59E0B' : '#10B981' }}>
              {med.current_stock}
            </span>
            <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '6px' }}>
              (Min: {med.reorder_level})
            </span>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (med) => {
        const isOut = med.current_stock <= 0;
        const isLow = med.current_stock > 0 && med.current_stock <= med.reorder_level;

        let statusType = 'in_stock';
        if (med.is_archived) statusType = 'archived';
        else if (isOut) statusType = 'out_of_stock';
        else if (isLow) statusType = 'low_stock';

        return <StatusBadge status={statusType} />;
      }
    },
    ...(isAdmin ? [{
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      accessor: (med: Medicine) => (
        <div style={{ display: 'inline-flex', gap: '6px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditModal(med);
            }}
            title="Edit Record"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              cursor: 'pointer'
            }}
          >
            <Edit size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleArchive(med);
            }}
            title={med.is_archived ? 'Restore Record' : 'Archive Record'}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: med.is_archived ? '#E0F2FE' : '#FEE2E2',
              color: med.is_archived ? '#0284C7' : '#EF4444',
              cursor: 'pointer'
            }}
          >
            {med.is_archived ? <RotateCcw size={14} /> : <Archive size={14} />}
          </button>
        </div>
      )
    }] : [])
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleCSVImport}
        style={{ display: 'none' }}
      />

      {/* Desktop Section Header */}
      <SectionHeader
        title="Medicine Inventory"
        subtitle={
          isAdmin
            ? 'Pharmaceutical master registry, stock levels, pricing, and reorder alerts.'
            : 'Search medicine prices, available stock, categories, and dosage forms.'
        }
        actions={
          isAdmin ? (
            <>
              <DesktopButton
                variant="outline"
                size="md"
                icon={<Upload size={15} color="#0F8A6A" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Import CSV
              </DesktopButton>
              <DesktopButton
                variant="primary"
                size="md"
                icon={<Plus size={15} />}
                onClick={handleOpenAddModal}
              >
                Add Medicine
              </DesktopButton>
            </>
          ) : undefined
        }
      />

      {/* Quick Search & Desktop Filter Toolbar Panel */}
      <Panel noPadding style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Filter by medicine, generic, or brand..."
              width="320px"
              showShortcut={false}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} style={{ color: '#6B7280' }} />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  outline: 'none'
                }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isAdmin && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                style={{ accentColor: '#0F8A6A', width: '15px', height: '15px' }}
              />
              <span>Include Archived Items</span>
            </label>
          )}
        </div>
      </Panel>

      {/* Desktop DataGrid */}
      <DataGrid
        columns={columns}
        data={medicines}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No medicines matching search filter criteria."
        selectedKey={selectedMedId}
        onRowClick={(row) => setSelectedMedId(row.id)}
        compactRows={true}
        zebraStriping={true}
        maxHeight="calc(100vh - 230px)"
      />

      {/* Add / Edit Medicine Desktop Dialog Modal */}
      {isModalOpen && isAdmin && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '88vh',
              overflowY: 'auto',
              border: '1px solid #E5E7EB',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F9FAFB'
              }}
            >
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                {editingMedicine ? 'Edit Medicine Record' : 'Add New Medicine'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '18px' }}>
              {modalError && (
                <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '12px', marginBottom: '14px' }}>
                  {modalError}
                </div>
              )}

              <form onSubmit={handleSaveMedicine} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxicillin Capsules"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Generic Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Amoxicillin Trihydrate"
                    value={formData.generic_name}
                    onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Brand Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Amoxil"
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  >
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Medicine Form
                  </label>
                  <select
                    value={formData.medicine_form}
                    onChange={(e) => setFormData({ ...formData, medicine_form: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  >
                    {medicineForms.map(form => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Dosage / Strength
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg"
                    value={formData.dosage_strength}
                    onChange={(e) => setFormData({ ...formData, dosage_strength: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Pack Size
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10x10"
                    value={formData.pack_size}
                    onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Buying Price (UGX)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.buying_price}
                    onChange={(e) => setFormData({ ...formData, buying_price: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Selling Price (UGX)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {!editingMedicine && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Initial Stock Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.current_stock || 0}
                      onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Reorder Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 10 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rene Industries, GSK"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <DesktopButton
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </DesktopButton>
                  <DesktopButton
                    type="submit"
                    variant="primary"
                  >
                    {editingMedicine ? 'Update Record' : 'Save Medicine'}
                  </DesktopButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
