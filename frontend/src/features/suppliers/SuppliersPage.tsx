import React, { useState, useEffect, useRef } from 'react';
import { Plus, Users, Save, Archive, RotateCcw } from 'lucide-react';
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isNewSupplier, setIsNewSupplier] = useState(false);

  const [formData, setFormData] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp && typeof wailsApp.ListSuppliers === 'function') {
        const data = await wailsApp.ListSuppliers(includeArchived);
        setSuppliers(data || []);
        if (data && data.length > 0 && !selectedSupplier && !isNewSupplier && suppliers.length === 0) {
          handleSelectSupplier(data[0]);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load suppliers';
      console.error(err);
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [includeArchived]);

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
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const handleCancel = () => {
    setIsNewSupplier(false);
    setSelectedSupplier(null);
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

    setSaveLoading(true);
    setError(null);
    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp) {
        if (selectedSupplier && !isNewSupplier) {
          await wailsApp.UpdateSupplier({ ...selectedSupplier, ...formData }, user?.id || 1, user?.username || 'admin');
          toast.success('Supplier record updated');
        } else {
          await wailsApp.AddSupplier({ ...formData }, user?.id || 1, user?.username || 'admin');
          toast.success('New supplier created');
        }
      }
      setIsNewSupplier(false);
      await fetchSuppliers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save supplier';
      setError(msg);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleArchive = async (sup: Supplier) => {
    if (!isAdmin) return;
    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp && typeof wailsApp.ArchiveSupplier === 'function') {
        await wailsApp.ArchiveSupplier(sup.id, !sup.is_archived, user?.id || 1, user?.username || 'admin');
        toast.success(sup.is_archived ? 'Supplier restored' : 'Supplier archived');
        setSelectedSupplier(null);
        fetchSuppliers();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to archive supplier';
      toast.error(msg);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isNewSupplier || selectedSupplier)) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewSupplier, selectedSupplier]);

  const filteredSuppliers = suppliers.filter(s => {
    if (!includeArchived && s.is_archived) return false;
    const q = debouncedSearch.toLowerCase();
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
      header: 'Contact Person',
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
      <Panel noPadding style={{ padding: '0 16px', height: '44px', minHeight: '44px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', height: '100%' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            Supplier Registry
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search supplier or contact..." width="240px" showShortcut={false} />
            {isAdmin && (
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
            {isAdmin && (
              <button onClick={handleOpenAdd} className="desktop-btn-primary" style={{ height: '28px', fontSize: '12px', gap: '6px', padding: '0 14px', borderRadius: '0px' }}>
                <Plus size={14} />
                <span>Add Supplier</span>
              </button>
            )}
          </div>
        </div>
      </Panel>

      {fetchError && (
        <div style={{ margin: '0 16px', padding: '8px 12px', fontSize: '12px', color: 'var(--color-danger-text)', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{fetchError}</span>
          <button onClick={fetchSuppliers} style={{ fontSize: '11px', cursor: 'pointer', background: 'none', border: '1px solid var(--color-danger-border)', padding: '2px 8px', borderRadius: '0px', color: 'var(--color-danger-text)' }}>
            Retry
          </button>
        </div>
      )}

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
            <input ref={nameInputRef} type="text" required disabled={!isAdmin} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {selectedSupplier && !isNewSupplier && (
                  <button
                    type="button"
                    onClick={() => handleToggleArchive(selectedSupplier)}
                    style={{ height: '32px', padding: '0 12px', fontSize: '12px', borderRadius: '0px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid', borderColor: selectedSupplier.is_archived ? 'var(--color-info-border)' : 'var(--color-danger-border)', color: selectedSupplier.is_archived ? 'var(--color-info-text)' : 'var(--color-danger-text)', backgroundColor: 'transparent', cursor: 'pointer' }}
                  >
                    {selectedSupplier.is_archived ? <RotateCcw size={14} /> : <Archive size={14} />}
                    <span>{selectedSupplier.is_archived ? 'Restore' : 'Archive'}</span>
                  </button>
                )}
                {(isNewSupplier || selectedSupplier) && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    style={{ height: '32px', padding: '0 12px', fontSize: '12px', borderRadius: '0px', border: '1px solid var(--color-border-default)', color: 'var(--color-text-secondary)', backgroundColor: 'transparent', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={saveLoading}
                className="desktop-btn-primary"
                style={{ height: '32px', fontSize: '13px', gap: '6px', borderRadius: '0px', opacity: saveLoading ? 0.6 : 1 }}
              >
                <Save size={14} />
                <span>{saveLoading ? 'Saving...' : (isNewSupplier ? 'Save Supplier' : 'Update Record')}</span>
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
      inspectorTitle={isNewSupplier ? 'ADD NEW SUPPLIER' : 'SUPPLIER INSPECTOR'}
      inspectorWidth="340px"
    />
  );
};
