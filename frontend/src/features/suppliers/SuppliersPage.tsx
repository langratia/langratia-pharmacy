import React, { useState, useEffect } from 'react';
import { Plus, Edit, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Supplier } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Panel } from '../../components/ui/Panel';
import { DesktopButton } from '../../components/ui/DesktopButton';
import { SearchBar } from '../../components/ui/SearchBar';
import { DataGrid, Column } from '../../components/ui/DataGrid';

export const SuppliersPage: React.FC = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });
  const [error, setError] = useState<string | null>(null);
  const [selectedSupId, setSelectedSupId] = useState<number | null>(null);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp && typeof wailsApp.ListSuppliers === 'function') {
        const data = await wailsApp.ListSuppliers();
        setSuppliers(data || []);
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

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormData({ name: sup.name, contact_person: sup.contact_person, phone: sup.phone, email: sup.email, address: sup.address });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Supplier Name is required');
      return;
    }

    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp) {
        if (editingSupplier) {
          await wailsApp.UpdateSupplier({ id: editingSupplier.id, ...formData, created_at: editingSupplier.created_at }, user?.id || 1, user?.username || 'admin');
          toast.success('Supplier updated');
        } else {
          await wailsApp.AddSupplier({ id: 0, ...formData, created_at: new Date().toISOString() }, user?.id || 1, user?.username || 'admin');
          toast.success('Supplier created');
        }
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      setError(err?.message || 'Failed to save supplier');
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_person.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Company / Distributor',
      accessor: (s) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>{s.name}</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>Contact: {s.contact_person || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Phone Number',
      accessor: (s) => <span style={{ color: '#374151' }}>{s.phone || '-'}</span>
    },
    {
      key: 'email',
      header: 'Email Address',
      accessor: (s) => <span style={{ color: '#374151' }}>{s.email || '-'}</span>
    },
    {
      key: 'address',
      header: 'Physical Address',
      accessor: (s) => <span style={{ color: '#6B7280' }}>{s.address || '-'}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      accessor: (s) => (
        <DesktopButton
          variant="secondary"
          size="sm"
          icon={<Edit size={13} />}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEdit(s);
          }}
        >
          Edit
        </DesktopButton>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader
        title="Supplier Directory"
        subtitle="Pharmaceutical distributors, contact persons, and procurement partners."
        actions={
          <DesktopButton
            variant="primary"
            size="md"
            icon={<Plus size={15} />}
            onClick={handleOpenAdd}
          >
            Add Supplier
          </DesktopButton>
        }
      />

      <Panel noPadding style={{ padding: '8px 12px' }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Filter by company or contact person..."
          width="320px"
          showShortcut={false}
        />
      </Panel>

      <DataGrid
        columns={columns}
        data={filteredSuppliers}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyMessage="No supplier records found."
        selectedKey={selectedSupId}
        onRowClick={(s) => setSelectedSupId(s.id)}
        compactRows={true}
        zebraStriping={true}
        maxHeight="calc(100vh - 230px)"
      />

      {isModalOpen && (
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
              maxWidth: '500px',
              padding: '20px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                {editingSupplier ? 'Edit Supplier Record' : 'Add New Supplier'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {error && <div style={{ padding: '8px 12px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '6px', fontSize: '12px', marginBottom: '14px' }}>{error}</div>}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Physical Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
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
                  Save Supplier
                </DesktopButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
