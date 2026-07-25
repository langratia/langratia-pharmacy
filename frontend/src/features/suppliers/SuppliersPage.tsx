import React, { useState, useEffect } from 'react';
import { Plus, Users, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Supplier } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Panel } from '../../components/ui/Panel';
import { SearchBar } from '../../components/ui/SearchBar';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { SplitPane } from '../../components/ui/SplitPane';

export const SuppliersPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isNewSupplier, setIsNewSupplier] = useState(false);

  const [formData, setFormData] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp && typeof wailsApp.ListSuppliers === 'function') {
        const data = await wailsApp.ListSuppliers();
        setSuppliers(data || []);
        if (data && data.length > 0 && !selectedSupplier && !isNewSupplier) {
          handleSelectSupplier(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSelectSupplier = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setIsNewSupplier(false);
    setError(null);
    setFormData({
      name: sup.name,
      contact_person: sup.contact_person,
      phone: sup.phone,
      email: sup.email,
      address: sup.address
    });
  };

  const handleOpenAdd = () => {
    if (!isAdmin) return;
    setSelectedSupplier(null);
    setIsNewSupplier(true);
    setError(null);
    setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!formData.name.trim()) {
      setError('Supplier Name is required');
      return;
    }

    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp) {
        if (selectedSupplier && !isNewSupplier) {
          await wailsApp.UpdateSupplier({ ...selectedSupplier, ...formData }, user?.id || 1, user?.username || 'admin');
          toast.success('Supplier record updated');
        } else {
          await wailsApp.AddSupplier({ id: 0, ...formData, created_at: new Date().toISOString() }, user?.id || 1, user?.username || 'admin');
          toast.success('New supplier created');
        }
      }
      setIsNewSupplier(false);
      fetchSuppliers();
    } catch (err: any) {
      setError(err?.message || 'Failed to save supplier');
    }
  };

  const filteredSuppliers = suppliers.filter(s => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.contact_person.toLowerCase().includes(q);
  });

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier Name',
      width: '35%',
      accessor: (sup) => (
        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{sup.name}</span>
      )
    },
    {
      key: 'contact_person',
      header: 'Contact Representative',
      width: '30%',
      accessor: (sup) => (
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{sup.contact_person || '-'}</span>
      )
    },
    {
      key: 'phone',
      header: 'Telephone',
      width: '35%',
      accessor: (sup) => (
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{sup.phone || '-'}</span>
      )
    }
  ];

  // Primary Workspace Pane
  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', padding: '0', backgroundColor: 'var(--color-bg-base)' }}>
      {/* 1-Line Compact Application Command Toolbar */}
      <Panel noPadding style={{ padding: '0 16px', height: '44px', minHeight: '44px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', height: '100%' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            Supplier Registry
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search supplier or contact..." width="240px" showShortcut={false} />
            {isAdmin && (
              <button onClick={handleOpenAdd} className="desktop-btn-primary" style={{ height: '28px', fontSize: '12px', gap: '6px', padding: '0 14px', borderRadius: '0px' }}>
                <Plus size={14} />
                <span>Add Supplier</span>
              </button>
            )}
          </div>
        </div>
      </Panel>

      <DataGrid
        columns={columns}
        data={filteredSuppliers}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No suppliers registered."
        selectedKey={selectedSupplier ? selectedSupplier.id : null}
        onRowClick={(sup) => handleSelectSupplier(sup)}
        compactRows={true}
        zebraStriping={true}
        maxHeight="calc(100vh - 165px)"
        style={{ flex: 1 }}
      />
    </div>
  );

  // Inspector Docked Pane
  const inspectorContent = (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
      {error && <div style={{ color: 'var(--color-danger-text)', fontSize: '12px' }}>{error}</div>}

      {(!selectedSupplier && !isNewSupplier) ? (
        <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
          <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          Select a supplier to view details and edit contact directory.
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '8px' }}>
            {isNewSupplier ? 'NEW SUPPLIER ENTRY' : selectedSupplier?.name}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Supplier Company Name *</label>
            <input type="text" required disabled={!isAdmin} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Contact Person</label>
            <input type="text" disabled={!isAdmin} value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Telephone</label>
              <input type="text" disabled={!isAdmin} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Email</label>
              <input type="email" disabled={!isAdmin} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Physical Office Address</label>
            <textarea rows={3} disabled={!isAdmin} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} style={{ width: '100%', padding: '6px 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>

          {isAdmin && (
            <button type="submit" className="desktop-btn-primary" style={{ height: '32px', fontSize: '13px', marginTop: '8px', gap: '6px', borderRadius: '0px' }}>
              <Save size={14} />
              <span>{isNewSupplier ? 'Save Supplier' : 'Update Record'}</span>
            </button>
          )}
        </form>
      )}
    </div>
  );

  return (
    <SplitPane
      primaryPane={primaryContent}
      inspectorPane={inspectorContent}
      inspectorTitle={isNewSupplier ? 'ADD NEW SUPPLIER' : 'SUPPLIER INSPECTOR'}
      inspectorWidth="340px"
    />
  );
};
