import React, { useState, useEffect, useRef } from 'react';
import { 
  Pill, 
  Search, 
  Plus, 
  Edit, 
  Archive, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Filter,
  X,
  Upload
} from 'lucide-react';
import { Medicine } from '../../types';
import { useAuth } from '../../context/AuthContext';

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
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp && typeof wailsApp.ListMedicines === 'function') {
        const data: Medicine[] = await wailsApp.ListMedicines(search, category === 'All' ? '' : category, includeArchived && isAdmin);
        setMedicines(data || []);
      } else {
        // Mock data for preview
        const mockData: Medicine[] = [
          {
            id: 1,
            name: 'Amoxicillin',
            generic_name: 'Amoxicillin Trihydrate',
            brand_name: 'Amoxil',
            category: 'Antibiotics',
            dosage_strength: '500mg',
            medicine_form: 'Capsule',
            pack_size: '10x10',
            buying_price: 15000,
            selling_price: 25000,
            current_stock: 45,
            reorder_level: 20,
            manufacturer: 'GSK',
            description: 'Broad-spectrum antibiotic',
            is_archived: false,
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            name: 'Paracetamol',
            generic_name: 'Acetaminophen',
            brand_name: 'Panadol',
            category: 'Analgesics',
            dosage_strength: '500mg',
            medicine_form: 'Tablet',
            pack_size: '100s',
            buying_price: 4000,
            selling_price: 8000,
            current_stock: 8,
            reorder_level: 15,
            manufacturer: 'GlaxoSmithKline',
            description: 'Analgesic and antipyretic',
            is_archived: false,
            created_at: new Date().toISOString()
          }
        ];
        const filtered = mockData.filter(m => {
          if (!includeArchived && m.is_archived) return false;
          if (category !== 'All' && m.category !== category) return false;
          if (search) {
            const query = search.toLowerCase();
            return m.name.toLowerCase().includes(query) ||
              m.generic_name.toLowerCase().includes(query) ||
              m.brand_name.toLowerCase().includes(query);
          }
          return true;
        });
        setMedicines(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch medicines', err);
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
        } else {
          const payload: Medicine = {
            id: 0,
            ...formData,
            current_stock: formData.current_stock || 0,
            is_archived: false,
            created_at: new Date().toISOString()
          };
          await wailsApp.AddMedicine(payload, user?.id || 1, user?.username || 'admin');
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
          alert('CSV file is empty or missing data rows.');
          return;
        }

        // Simple CSV parser
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const importedMeds: Medicine[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"(.*)"$/, '$1'));
          if (cols.length === 0 || !cols[0]) continue;

          // Helper to get column value by potential header names
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
          alert('No valid medicine records found in CSV.');
          return;
        }

        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.BulkImportMedicines === 'function') {
          const count = await wailsApp.BulkImportMedicines(importedMeds, user?.id || 1, user?.username || 'admin');
          alert(`Successfully imported ${count} medicines from CSV!`);
          fetchMedicines();
        } else {
          alert(`Simulated import of ${importedMeds.length} medicines in browser preview.`);
          setMedicines(prev => [...prev, ...importedMeds]);
        }
      } catch (err: any) {
        alert('Failed to parse and import CSV: ' + (err.message || err));
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleCSVImport}
        style={{ display: 'none' }}
      />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-charcoal-navy)', marginBottom: '4px' }}>
            Medicine Inventory
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            {isAdmin 
              ? 'Manage pharmaceutical products, stock thresholds, pricing, and master registry.' 
              : 'Search medicine prices, stock levels, categories, and dosage forms.'}
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                backgroundColor: '#ffffff',
                color: 'var(--color-charcoal-navy)',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                border: '1px solid var(--color-border-subtle)',
                cursor: 'pointer'
              }}
            >
              <Upload size={18} />
              <span>Import CSV</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: 'var(--color-primary-teal)',
                color: '#ffffff',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(26, 157, 139, 0.25)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Plus size={18} />
              <span>Add New Medicine</span>
            </button>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div style={{
        backgroundColor: 'var(--color-surface-white)',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid var(--color-border-subtle)',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '300px' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Medicine Name, Generic, or Brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 42px',
                borderRadius: '8px',
                border: '1px solid var(--color-border-subtle)',
                fontSize: '14px',
                backgroundColor: '#F8FAFC',
                outline: 'none'
              }}
            />
          </div>

          {/* Category Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--color-text-muted)" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--color-border-subtle)',
                fontSize: '14px',
                backgroundColor: '#F8FAFC',
                outline: 'none'
              }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Include Archived Checkbox (Admin Only) */}
        {isAdmin && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-charcoal-navy)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              style={{ accentColor: 'var(--color-primary-teal)', width: '16px', height: '16px' }}
            />
            <span>Include Archived Medicines</span>
          </label>
        )}
      </div>

      {/* Medicine Table */}
      <div style={{
        backgroundColor: 'var(--color-surface-white)',
        borderRadius: '12px',
        border: '1px solid var(--color-border-subtle)',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '14px 16px' }}>Medicine Name</th>
              <th style={{ padding: '14px 16px' }}>Generic / Brand</th>
              <th style={{ padding: '14px 16px' }}>Category</th>
              <th style={{ padding: '14px 16px' }}>Strength / Form</th>
              {isAdmin && <th style={{ padding: '14px 16px' }}>Buying Price</th>}
              <th style={{ padding: '14px 16px' }}>Selling Price</th>
              <th style={{ padding: '14px 16px' }}>Current Stock</th>
              <th style={{ padding: '14px 16px' }}>Status</th>
              {isAdmin && <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {medicines.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 7} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No medicines found.
                </td>
              </tr>
            ) : (
              medicines.map((med) => {
                const isOut = med.current_stock <= 0;
                const isLow = med.current_stock > 0 && med.current_stock <= med.reorder_level;

                return (
                  <tr key={med.id} style={{ borderBottom: '1px solid var(--color-border-subtle)', opacity: med.is_archived ? 0.6 : 1 }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-charcoal-navy)' }}>{med.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Pack: {med.pack_size}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div>{med.generic_name || '-'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{med.brand_name ? `Brand: ${med.brand_name}` : ''}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: '#F1F5F9', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>
                        {med.category}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div>{med.dosage_strength}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{med.medicine_form}</div>
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '16px', color: 'var(--color-text-muted)' }}>
                        UGX {med.buying_price.toLocaleString()}
                      </td>
                    )}
                    <td style={{ padding: '16px', fontWeight: 600, color: 'var(--color-primary-teal)' }}>
                      UGX {med.selling_price.toLocaleString()}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600, color: isOut ? '#DC2626' : isLow ? '#D97706' : '#16A34A' }}>
                        {med.current_stock}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Reorder: {med.reorder_level}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {med.is_archived ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#F1F5F9', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
                          Archived
                        </span>
                      ) : isOut ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '12px', fontWeight: 600 }}>
                          <AlertTriangle size={12} /> Out of Stock
                        </span>
                      ) : isLow ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '12px', fontWeight: 600 }}>
                          <AlertTriangle size={12} /> Low Stock
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#D1FAE5', color: '#059669', fontSize: '12px', fontWeight: 600 }}>
                          <CheckCircle2 size={12} /> In Stock
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenEditModal(med)}
                            title="Edit Medicine"
                            style={{ padding: '6px', borderRadius: '6px', backgroundColor: '#F1F5F9', color: 'var(--color-charcoal-navy)', cursor: 'pointer' }}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleArchive(med)}
                            title={med.is_archived ? "Restore Medicine" : "Archive Medicine"}
                            style={{ padding: '6px', borderRadius: '6px', backgroundColor: med.is_archived ? '#E0F2FE' : '#FEE2E2', color: med.is_archived ? '#0284C7' : '#DC2626', cursor: 'pointer' }}
                          >
                            {med.is_archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog for Add / Edit Medicine */}
      {isModalOpen && isAdmin && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-charcoal-navy)' }}>
                {editingMedicine ? 'Edit Medicine Record' : 'Add New Medicine'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--color-text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '13px', marginBottom: '16px' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveMedicine} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Medicine Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin Capsules"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Generic Name</label>
                <input
                  type="text"
                  placeholder="e.g. Amoxicillin Trihydrate"
                  value={formData.generic_name}
                  onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g. Amoxil"
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}
                >
                  {categories.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Medicine Form</label>
                <select
                  value={formData.medicine_form}
                  onChange={(e) => setFormData({ ...formData, medicine_form: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}
                >
                  {medicineForms.map(form => (
                    <option key={form} value={form}>{form}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Dosage / Strength</label>
                <input
                  type="text"
                  placeholder="e.g. 500mg, 250mg/5ml"
                  value={formData.dosage_strength}
                  onChange={(e) => setFormData({ ...formData, dosage_strength: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Pack Size</label>
                <input
                  type="text"
                  placeholder="e.g. 10x10, 100s, 100ml"
                  value={formData.pack_size}
                  onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Buying Price (UGX)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.buying_price}
                  onChange={(e) => setFormData({ ...formData, buying_price: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Selling Price (UGX)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}
                />
              </div>

              {!editingMedicine && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Initial Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.current_stock || 0}
                    onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Reorder Threshold</label>
                <input
                  type="number"
                  min="0"
                  value={formData.reorder_level}
                  onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 10 })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Manufacturer</label>
                <input
                  type="text"
                  placeholder="e.g. Rene Industries, GSK"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)', backgroundColor: '#ffffff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-primary-teal)', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {editingMedicine ? 'Update Record' : 'Save Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
