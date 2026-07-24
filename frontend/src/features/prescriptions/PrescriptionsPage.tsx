import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Eye, 
  X, 
  Trash2,
  ShoppingCart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { NavItemKey } from '../../components/layout/Sidebar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Panel } from '../../components/ui/Panel';
import { DesktopButton } from '../../components/ui/DesktopButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchBar } from '../../components/ui/SearchBar';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { 
  ListPrescriptions, 
  CreatePrescription, 
  GetPrescriptionDetails, 
  UpdatePrescriptionStatus, 
  ListMedicines 
} from '../../../wailsjs/go/main/App';
import { models } from '../../../wailsjs/go/models';

interface PrescriptionsPageProps {
  onSelectView: (view: NavItemKey) => void;
  onLoadPrescriptionToPOS?: (items: { medicine: models.Medicine; quantity: number }[]) => void;
}

interface NewRxItem {
  medicine_id: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  quantity_prescribed: number;
}

export const PrescriptionsPage: React.FC<PrescriptionsPageProps> = ({ onSelectView, onLoadPrescriptionToPOS }) => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<models.Prescription[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRxId, setSelectedRxId] = useState<number | null>(null);

  // New Prescription Modal
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [availableMedicines, setAvailableMedicines] = useState<models.Medicine[]>([]);
  const [patientName, setPatientName] = useState<string>('');
  const [patientAge, setPatientAge] = useState<number>(30);
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [doctorName, setDoctorName] = useState<string>('');
  const [doctorContact, setDoctorContact] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [rxItems, setRxItems] = useState<NewRxItem[]>([]);

  // Item Form State inside Modal
  const [selectedMedId, setSelectedMedId] = useState<number | ''>('');
  const [dosage, setDosage] = useState<string>('1 tablet');
  const [frequency, setFrequency] = useState<string>('3 times daily');
  const [durationDays, setDurationDays] = useState<number>(5);
  const [qtyPrescribed, setQtyPrescribed] = useState<number>(15);

  // Detail Modal State
  const [selectedRx, setSelectedRx] = useState<models.Prescription | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  const fetchPrescriptions = async () => {
    setIsLoading(true);
    try {
      const data = await ListPrescriptions(statusFilter === 'All' ? '' : statusFilter, 50);
      setPrescriptions(data || []);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
      toast.error('Failed to load prescriptions list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [statusFilter]);

  const loadMedicinesForModal = async () => {
    try {
      const res = await ListMedicines('', '', false);
      if (res) {
        setAvailableMedicines(res.filter((m: any) => !m.is_archived));
      }
    } catch (err) {
      console.error('Failed to load medicines:', err);
    }
  };

  const handleOpenNewModal = () => {
    setPatientName('');
    setPatientAge(30);
    setPatientPhone('');
    setDoctorName('');
    setDoctorContact('');
    setNotes('');
    setRxItems([]);
    loadMedicinesForModal();
    setShowNewModal(true);
  };

  const handleAddItemToRx = () => {
    if (!selectedMedId) {
      toast.error('Select a medicine to add');
      return;
    }
    const med = availableMedicines.find(m => m.id === selectedMedId);
    if (!med) return;

    setRxItems(prev => [
      ...prev,
      {
        medicine_id: med.id,
        medicine_name: med.name,
        dosage,
        frequency,
        duration_days: durationDays,
        quantity_prescribed: qtyPrescribed
      }
    ]);
    setSelectedMedId('');
    toast.success(`Added ${med.name} to prescription`);
  };

  const handleRemoveRxItem = (index: number) => {
    setRxItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !doctorName.trim()) {
      toast.error('Patient Name and Doctor Name are required');
      return;
    }
    if (rxItems.length === 0) {
      toast.error('Add at least one medicine item to the prescription');
      return;
    }

    try {
      const itemsPayload = rxItems.map(item => ({
        medicine_id: item.medicine_id,
        dosage: item.dosage,
        frequency: item.frequency,
        duration_days: item.duration_days,
        quantity_prescribed: item.quantity_prescribed
      }));

      await CreatePrescription(
        0,
        patientName,
        patientPhone,
        patientAge,
        doctorName,
        doctorContact,
        notes,
        user?.username || 'admin',
        itemsPayload as any
      );
      toast.success('Prescription created successfully!');
      setShowNewModal(false);
      fetchPrescriptions();
    } catch (err: any) {
      toast.error('Failed to create prescription: ' + (err.message || err));
    }
  };

  const handleViewDetails = async (rxId: number) => {
    try {
      const details = await GetPrescriptionDetails(rxId);
      if (details) {
        setSelectedRx(details);
        setShowDetailModal(true);
      }
    } catch (err) {
      toast.error('Failed to load prescription details');
    }
  };

  const handleStatusChange = async (rxId: number, newStatus: string) => {
    try {
      await UpdatePrescriptionStatus(rxId, newStatus, user?.id || 1, user?.username || 'admin');
      toast.success(`Prescription marked as ${newStatus}`);
      fetchPrescriptions();
      if (selectedRx && selectedRx.id === rxId) {
        setSelectedRx((prev) => prev ? ({ ...prev, status: newStatus } as any) : null);
      }
    } catch (err) {
      toast.error('Failed to update prescription status');
    }
  };

  const handleDispenseToPOS = async (rx: models.Prescription) => {
    if (!rx.items || rx.items.length === 0) {
      toast.error('Prescription has no items');
      return;
    }

    if (onLoadPrescriptionToPOS) {
      const itemsToLoad = rx.items.map(item => ({
        medicine: {
          id: item.medicine_id,
          name: item.medicine_name || 'Medicine',
          selling_price: item.medicine_price || 0,
          current_stock: item.current_stock || 100,
        } as models.Medicine,
        quantity: item.quantity_prescribed
      }));
      onLoadPrescriptionToPOS(itemsToLoad);
    }

    toast.success(`Prescription ${rx.prescription_number} items transferred to POS!`);
    setShowDetailModal(false);
    onSelectView('pos');
  };

  const filteredPrescriptions = prescriptions.filter(rx => {
    const q = searchQuery.toLowerCase();
    return (
      rx.prescription_number.toLowerCase().includes(q) ||
      rx.patient_name.toLowerCase().includes(q) ||
      rx.doctor_name.toLowerCase().includes(q)
    );
  });

  const columns: Column<models.Prescription>[] = [
    {
      key: 'prescription_number',
      header: 'RX Number',
      accessor: (rx) => (
        <span style={{ fontWeight: 600, color: '#111827' }}>
          {rx.prescription_number}
        </span>
      )
    },
    {
      key: 'patient_name',
      header: 'Patient Info',
      accessor: (rx) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>{rx.patient_name}</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>
            Age: {rx.patient_age} | {rx.patient_phone || 'No Contact'}
          </div>
        </div>
      )
    },
    {
      key: 'doctor_name',
      header: 'Prescribing Doctor',
      accessor: (rx) => (
        <div>
          <div style={{ color: '#111827' }}>Dr. {rx.doctor_name}</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>{rx.doctor_contact || 'Private Clinic'}</div>
        </div>
      )
    },
    {
      key: 'created_at',
      header: 'Date Issued',
      accessor: (rx) => (
        <span style={{ color: '#6B7280' }}>
          {new Date(rx.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (rx) => {
        let statusType = 'pending';
        if (rx.status === 'Dispensed') statusType = 'paid';
        else if (rx.status === 'Cancelled') statusType = 'archived';

        return <StatusBadge status={statusType} label={rx.status} />;
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      accessor: (rx) => (
        <div style={{ display: 'inline-flex', gap: '6px' }}>
          <DesktopButton
            variant="secondary"
            size="sm"
            icon={<Eye size={13} />}
            onClick={() => handleViewDetails(rx.id)}
          >
            View
          </DesktopButton>

          {rx.status === 'Pending' && (
            <DesktopButton
              variant="primary"
              size="sm"
              icon={<ShoppingCart size={13} />}
              onClick={async () => {
                const details = await GetPrescriptionDetails(rx.id);
                handleDispenseToPOS(details);
              }}
            >
              Fulfill POS
            </DesktopButton>
          )}
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader
        title="Prescriptions"
        subtitle="Doctor orders, dosage instructions, and direct checkout fulfillment."
        actions={
          <DesktopButton
            variant="primary"
            size="md"
            icon={<Plus size={15} />}
            onClick={handleOpenNewModal}
          >
            New Prescription
          </DesktopButton>
        }
      />

      {/* Filter and Search Bar Toolbar */}
      <Panel noPadding style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['All', 'Pending', 'Dispensed', 'Cancelled'].map((status) => (
              <DesktopButton
                key={status}
                variant={statusFilter === status ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </DesktopButton>
            ))}
          </div>

          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search RX #, patient, or doctor..."
            width="280px"
            showShortcut={false}
          />
        </div>
      </Panel>

      {/* DataGrid */}
      <DataGrid
        columns={columns}
        data={filteredPrescriptions}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No prescriptions matching current filter."
        selectedKey={selectedRxId}
        onRowClick={(row) => setSelectedRxId(row.id)}
        compactRows={true}
        zebraStriping={true}
        maxHeight="calc(100vh - 230px)"
      />

      {/* New Prescription Modal */}
      {showNewModal && (
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
              maxWidth: '660px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #E5E7EB',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
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
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                New Doctor Prescription
              </h3>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '18px' }}>
              <form onSubmit={handleCreatePrescriptionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Patient Info */}
                <div style={{ backgroundColor: '#F9FAFB', padding: '12px', borderRadius: '6px', border: '1px solid #E5E7EB', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>Patient Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #D1D5DB', marginTop: '2px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>Age</label>
                    <input
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(Number(e.target.value))}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #D1D5DB', marginTop: '2px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>Phone</label>
                    <input
                      type="text"
                      placeholder="07..."
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #D1D5DB', marginTop: '2px', fontSize: '12px' }}
                    />
                  </div>
                </div>

                {/* Doctor Info */}
                <div style={{ backgroundColor: '#F9FAFB', padding: '12px', borderRadius: '6px', border: '1px solid #E5E7EB', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>Doctor Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Sarah Jenkins"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #D1D5DB', marginTop: '2px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>Clinic Contact</label>
                    <input
                      type="text"
                      placeholder="e.g. City Hospital"
                      value={doctorContact}
                      onChange={(e) => setDoctorContact(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #D1D5DB', marginTop: '2px', fontSize: '12px' }}
                    />
                  </div>
                </div>

                {/* Prescribed Items Section */}
                <div style={{ border: '1px solid #E5E7EB', padding: '12px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827', display: 'block', marginBottom: '8px' }}>
                    Prescribed Medication List
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '6px', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280' }}>Medicine</label>
                      <select
                        value={selectedMedId}
                        onChange={(e) => setSelectedMedId(e.target.value ? Number(e.target.value) : '')}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                      >
                        <option value="">-- Select --</option>
                        {availableMedicines.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.current_stock})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280' }}>Dosage</label>
                      <input
                        type="text"
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280' }}>Frequency</label>
                      <input
                        type="text"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280' }}>Days</label>
                      <input
                        type="number"
                        value={durationDays}
                        onChange={(e) => setDurationDays(Number(e.target.value))}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280' }}>Total Qty</label>
                      <input
                        type="number"
                        value={qtyPrescribed}
                        onChange={(e) => setQtyPrescribed(Number(e.target.value))}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                      />
                    </div>

                    <DesktopButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddItemToRx}
                    >
                      Add
                    </DesktopButton>
                  </div>

                  {rxItems.length > 0 && (
                    <div style={{ marginTop: '10px', borderTop: '1px solid #F3F4F6', paddingTop: '8px' }}>
                      {rxItems.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '12px' }}>
                          <span>
                            <strong>{item.medicine_name}</strong> - {item.dosage}, {item.frequency} ({item.duration_days}d) &rarr; Qty: {item.quantity_prescribed}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRxItem(idx)}
                            style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>Special Instructions / Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Take after meals..."
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #D1D5DB', marginTop: '2px', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <DesktopButton
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewModal(false)}
                  >
                    Cancel
                  </DesktopButton>
                  <DesktopButton
                    type="submit"
                    variant="primary"
                  >
                    Save Prescription
                  </DesktopButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Detail Modal */}
      {showDetailModal && selectedRx && (
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
              maxWidth: '600px',
              padding: '20px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                  Prescription Details #{selectedRx.prescription_number}
                </h3>
                <span style={{ fontSize: '11px', color: '#6B7280' }}>
                  Issued on {new Date(selectedRx.created_at).toLocaleString()}
                </span>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div style={{ backgroundColor: '#F9FAFB', padding: '10px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Patient Info</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginTop: '2px' }}>{selectedRx.patient_name}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Age: {selectedRx.patient_age} | {selectedRx.patient_phone || 'N/A'}</div>
              </div>

              <div style={{ backgroundColor: '#F9FAFB', padding: '10px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Doctor Info</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginTop: '2px' }}>Dr. {selectedRx.doctor_name}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>{selectedRx.doctor_contact || 'N/A'}</div>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827', display: 'block', marginBottom: '6px' }}>
                Medication List
              </span>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Medicine</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Dosage</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Frequency</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRx.items?.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{item.medicine_name}</td>
                      <td style={{ padding: '6px 8px' }}>{item.dosage}</td>
                      <td style={{ padding: '6px 8px' }}>{item.frequency} ({item.duration_days}d)</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>{item.quantity_prescribed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedRx.notes && (
              <div style={{ padding: '8px 10px', backgroundColor: '#FFFBEB', borderRadius: '6px', border: '1px solid #FDE68A', fontSize: '11px', color: '#92400E', marginBottom: '14px' }}>
                <strong>Instructions:</strong> {selectedRx.notes}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {selectedRx.status !== 'Dispensed' && (
                  <DesktopButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedRx.id, 'Dispensed')}
                  >
                    Mark Dispensed
                  </DesktopButton>
                )}
                {selectedRx.status !== 'Cancelled' && (
                  <DesktopButton
                    variant="danger"
                    size="sm"
                    onClick={() => handleStatusChange(selectedRx.id, 'Cancelled')}
                  >
                    Cancel RX
                  </DesktopButton>
                )}
              </div>

              {selectedRx.status === 'Pending' && (
                <DesktopButton
                  variant="primary"
                  size="md"
                  icon={<ShoppingCart size={14} />}
                  onClick={() => handleDispenseToPOS(selectedRx)}
                >
                  Fulfill in POS
                </DesktopButton>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
