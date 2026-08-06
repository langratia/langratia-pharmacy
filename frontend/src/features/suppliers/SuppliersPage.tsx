import React, { useState, useEffect, useRef } from 'react';
import { Plus, Users, Save, Archive, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Supplier } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { Panel } from '../../components/ui/Panel';
import { SearchBar } from '../../components/ui/SearchBar';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { SplitPane } from '../../components/ui/SplitPane';
import { capitalizeWords } from '../../utils/formatters';

export const SuppliersPage: React.FC = () => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canManage = can('manage_suppliers');

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
    if (!canManage) return;
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
    if (!canManage) return;
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
    if (!canManage) return;
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
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{sup.name}</span>
      )
    },
    {
      key: 'contact_person',
      header: 'Contact Person',
      width: '30%',
      accessor: (sup) => (
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{sup.contact_person || '-'}</span>
      )
    },
    {
      key: 'phone',
      header: 'Telephone',
      width: '35%',
      accessor: (sup) => (
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{sup.phone || '-'}</span>
      )
    }
  ];

  // Primary Workspace Pane
  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Suppliers</div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search supplier or contact…" width="240px" showShortcut={false} />
        {canManage && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} style={{ cursor: 'pointer' }} />
            Show Archived
          </label>
        )}
        {canManage && (
          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ marginLeft: 'auto', gap: '6px' }}>
            <Plus size={14} /> Add Supplier
          </button>
        )}
      </div>

      {fetchError && (
        <div style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--red)', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{fetchError}</span>
          <button onClick={fetchSuppliers} className="btn" style={{ fontSize: '12px' }}>Retry</button>
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
        style={{ flex: 1 }}
      />
    </div>
  );

  // Inspector Docked Pane
  const inspectorContent = (
    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      {error && <div style={{ color: 'var(--red)', fontSize: '13px', padding: '8px 12px', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: '8px' }}>{error}</div>}

      {(!selectedSupplier && !isNewSupplier) ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Users size={40} style={{ opacity: 0.25 }} />
          <div style={{ fontSize: '14px' }}>Select a supplier to view details</div>
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', borderBottom: '1px solid var(--line)', paddingBottom: '10px', margin: 0 }}>
            {isNewSupplier ? 'New Supplier' : selectedSupplier?.name}
          </h3>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>Supplier Company Name *</label>
            <input ref={nameInputRef} type="text" required disabled={!canManage} value={formData.name} onChange={e => setFormData({ ...formData, name: capitalizeWords(e.target.value) })}             style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>Contact Person</label>
            <input type="text" disabled={!canManage} value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: capitalizeWords(e.target.value) })}             style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>Telephone</label>
              <input type="text" disabled={!canManage} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}             style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>Email</label>
              <input type="email" disabled={!canManage} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}             style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>Physical Office Address</label>
            <textarea rows={3} disabled={!canManage} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}             style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' }} />
          </div>

          {canManage && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {selectedSupplier && !isNewSupplier && (
            <button
                    type="button"
                    onClick={() => handleToggleArchive(selectedSupplier)}
                    className={selectedSupplier.is_archived ? 'btn' : 'btn btn-danger'}
                    style={{ gap: '6px' }}
                  >
                    {selectedSupplier.is_archived ? <RotateCcw size={14} /> : <Archive size={14} />}
                    <span>{selectedSupplier.is_archived ? 'Restore' : 'Archive'}</span>
                  </button>
                )}
                {(isNewSupplier || selectedSupplier) && (
                  <button type="button" onClick={handleCancel} className="btn" style={{ gap: '6px' }}>Cancel</button>
                )}
              </div>
              <button type="submit" disabled={saveLoading} className="btn btn-primary" style={{ gap: '6px', opacity: saveLoading ? 0.6 : 1 }}>
                <Save size={14} />
                <span>{saveLoading ? 'Saving…' : (isNewSupplier ? 'Save Supplier' : 'Update')}</span>
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
      inspectorTitle={isNewSupplier ? 'Add Supplier' : 'Supplier Inspector'}
      inspectorWidth="340px"
    />
  );
};
