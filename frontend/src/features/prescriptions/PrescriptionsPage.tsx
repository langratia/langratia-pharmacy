import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, 
  Trash2,
  ShoppingCart,
  FileText,
  User,
  Stethoscope,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { NavItemKey } from '../../components/layout/Sidebar';
import { Panel } from '../../components/ui/Panel';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchBar } from '../../components/ui/SearchBar';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { SplitPane } from '../../components/ui/SplitPane';
import { 
  ListPrescriptions, 
  CreatePrescription, 
  GetPrescriptionDetails, 
  UpdatePrescriptionStatus, 
  ListMedicines 
} from '../../../wailsjs/go/main/App';
import { models, services } from '../../../wailsjs/go/models';

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

const mapRxStatus = (status: string): string => {
  if (status === 'Pending') return 'pending';
  if (status === 'Dispensed') return 'completed';
  if (status === 'Cancelled') return 'cancelled';
  return 'pending';
};

export const PrescriptionsPage: React.FC<PrescriptionsPageProps> = ({ onSelectView, onLoadPrescriptionToPOS }) => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<models.Prescription[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRx, setSelectedRx] = useState<models.Prescription | null>(null);

  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [availableMedicines, setAvailableMedicines] = useState<models.Medicine[]>([]);
  const [patientName, setPatientName] = useState<string>('');
  const [patientAge, setPatientAge] = useState<number>(30);
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [doctorName, setDoctorName] = useState<string>('');
  const [doctorContact, setDoctorContact] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [rxItems, setRxItems] = useState<NewRxItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedMedId, setSelectedMedId] = useState<number | ''>('');
  const [dosage, setDosage] = useState<string>('1 tablet');
  const [frequency, setFrequency] = useState<string>('3 times daily');
  const [durationDays, setDurationDays] = useState<number>(5);
  const [qtyPrescribed, setQtyPrescribed] = useState<number>(15);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  const fetchPrescriptions = useCallback(async (status: string, search: string) => {
    setIsLoading(true);
    try {
      const data = await ListPrescriptions(status === 'All' ? '' : status, search, 50);
      setPrescriptions(data || []);
      if (data && data.length > 0 && !selectedRx) {
        handleSelectRx(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
      toast.error('Failed to load prescriptions list');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrescriptions(statusFilter, debouncedSearch);
  }, [statusFilter, debouncedSearch, fetchPrescriptions]);

  const handleSelectRx = async (rxId: number) => {
    try {
      const details = await GetPrescriptionDetails(rxId);
      if (details) {
        setSelectedRx(details);
      }
    } catch (err: any) {
      console.error('Failed to load prescription details', err);
      toast.error('Failed to load prescription details');
    }
  };

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

  const resetNewRxForm = () => {
    setPatientName('');
    setPatientAge(30);
    setPatientPhone('');
    setDoctorName('');
    setDoctorContact('');
    setNotes('');
    setRxItems([]);
    setSelectedMedId('');
    setDosage('1 tablet');
    setFrequency('3 times daily');
    setDurationDays(5);
    setQtyPrescribed(15);
    setIsSubmitting(false);
  };

  const handleOpenNewModal = () => {
    resetNewRxForm();
    loadMedicinesForModal();
    setShowNewModal(true);
  };

  const handleCloseNewModal = () => {
    resetNewRxForm();
    setShowNewModal(false);
  };

  const handleAddItemToRx = () => {
    if (!selectedMedId) {
      toast.error('Select a medicine to add');
      return;
    }
    if (!dosage.trim()) {
      toast.error('Dosage is required');
      return;
    }
    if (!frequency.trim()) {
      toast.error('Frequency is required');
      return;
    }
    if (durationDays <= 0) {
      toast.error('Duration must be positive');
      return;
    }
    if (qtyPrescribed <= 0) {
      toast.error('Quantity must be positive');
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
    setDosage('1 tablet');
    setFrequency('3 times daily');
    setDurationDays(5);
    setQtyPrescribed(15);
    toast.success(`Added ${med.name}`);
  };

  const handleCreatePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !doctorName.trim()) {
      toast.error('Patient Name and Doctor Name are required');
      return;
    }
    if (rxItems.length === 0) {
      toast.error('Add at least one medicine item');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = rxItems.map(item => {
        const input = new services.PrescriptionItemInput();
        input.medicine_id = item.medicine_id;
        input.dosage = item.dosage;
        input.frequency = item.frequency;
        input.duration_days = item.duration_days;
        input.quantity_prescribed = item.quantity_prescribed;
        return input;
      });

      await CreatePrescription(
        user?.id || 0,
        user?.username || 'admin',
        patientName,
        patientAge,
        patientPhone,
        doctorName,
        doctorContact,
        notes,
        itemsPayload
      );
      toast.success('Prescription recorded!');
      setShowNewModal(false);
      fetchPrescriptions(statusFilter, debouncedSearch);
    } catch (err: any) {
      toast.error('Failed to create prescription: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (rxId: number, newStatus: string) => {
    if (newStatus === 'Cancelled' && !window.confirm('Cancel this prescription? This cannot be undone.')) return;
    if (newStatus === 'Dispensed' && !window.confirm('Mark as dispensed? This cannot be undone.')) return;
    try {
      await UpdatePrescriptionStatus(user?.id || 1, user?.username || 'admin', rxId, newStatus);
      toast.success(`Prescription updated to ${newStatus}`);
      fetchPrescriptions(statusFilter, debouncedSearch);
      if (selectedRx && selectedRx.id === rxId) {
        setSelectedRx((prev) => prev ? ({ ...prev, status: newStatus } as any) : null);
      }
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  const handleDispenseToPOS = (rx: models.Prescription) => {
    if (!rx.items || rx.items.length === 0) {
      toast.error('Prescription has no items');
      return;
    }

    const insufficientStock = rx.items.filter(
      item => (item.current_stock ?? 0) < item.quantity_prescribed
    );
    if (insufficientStock.length > 0) {
      const names = insufficientStock.map(i => i.medicine_name).join(', ');
      toast.error(`Insufficient stock for: ${names}`);
      return;
    }

    if (onLoadPrescriptionToPOS) {
      const itemsToLoad = rx.items.map(item => ({
        medicine: {
          id: item.medicine_id,
          name: item.medicine_name || 'Medicine',
          selling_price: item.medicine_price || 0,
          current_stock: item.current_stock || 0,
        } as models.Medicine,
        quantity: item.quantity_prescribed
      }));
      onLoadPrescriptionToPOS(itemsToLoad);
    }

    toast.success(`RX ${rx.prescription_number} transferred to POS!`);
    onSelectView('pos');
  };

  const columns: Column<models.Prescription>[] = [
    {
      key: 'prescription_number',
      header: 'RX Number',
      width: '25%',
      accessor: (rx) => (
        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {rx.prescription_number}
        </span>
      )
    },
    {
      key: 'patient_name',
      header: 'Patient Info',
      width: '30%',
      accessor: (rx) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{rx.patient_name}</span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginLeft: '4px' }}>({rx.patient_age}y)</span>
        </div>
      )
    },
    {
      key: 'doctor_name',
      header: 'Prescribing Doctor',
      width: '25%',
      accessor: (rx) => (
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
          Dr. {rx.doctor_name}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: '20%',
      align: 'center' as const,
      accessor: (rx) => (
        <StatusBadge status={mapRxStatus(rx.status)} />
      )
    }
  ];

  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', padding: '0', backgroundColor: 'var(--color-bg-base)' }}>
      <Panel noPadding style={{ padding: '0 16px', height: '44px', minHeight: '44px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', height: '100%' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            Prescription Processing
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search RX number, patient, doctor..."
              width="240px"
              showShortcut={false}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ height: '28px', fontSize: '12px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', outline: 'none' }}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Dispensed">Dispensed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <button
              onClick={handleOpenNewModal}
              className="desktop-btn-primary"
              style={{ height: '28px', fontSize: '12px', gap: '6px', padding: '0 14px', borderRadius: '0px' }}
            >
              <Plus size={14} />
              <span>New Prescription</span>
            </button>
          </div>
        </div>
      </Panel>

      <DataGrid
        columns={columns}
        data={prescriptions}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No prescriptions matching filters."
        selectedKey={selectedRx ? selectedRx.id : null}
        onRowClick={(rx) => handleSelectRx(rx.id)}
        compactRows={true}
        zebraStriping={true}
        maxHeight="calc(100vh - 165px)"
        style={{ flex: 1 }}
      />
    </div>
  );

  const inspectorContent = (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
      {!selectedRx ? (
        <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11px' }}>
          <FileText size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          Select a prescription to inspect details and dispense.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              RX #{selectedRx.prescription_number}
            </span>
            <StatusBadge status={mapRxStatus(selectedRx.status)} />
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', borderRadius: '0px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
              <User size={14} style={{ color: 'var(--color-accent-base)' }} /> {selectedRx.patient_name} ({selectedRx.patient_age} yrs)
            </div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>
              Phone: {selectedRx.patient_phone || 'N/A'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              <Stethoscope size={14} style={{ color: 'var(--color-info-text)' }} /> Dr. {selectedRx.doctor_name}
            </div>
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>
            PRESCRIBED MEDICATIONS ({selectedRx.items?.length || 0})
          </div>

          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--color-border-default)', borderRadius: '0px', backgroundColor: 'var(--color-bg-panel)', padding: '4px' }}>
            {selectedRx.items?.map((item) => (
              <div key={item.id} style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border-subtle)', fontSize: '12px' }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '2px' }}>{item.medicine_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  {item.dosage} | {item.frequency} | {item.duration_days} day(s) | Qty: <strong>{item.quantity_prescribed}</strong>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {selectedRx.status !== 'Pending' && (
                <button
                  onClick={() => handleStatusChange(selectedRx.id, 'Pending')}
                  className="desktop-btn-secondary"
                  style={{ flex: 1, height: '32px', fontSize: '12px', borderRadius: '0px', fontWeight: 600 }}
                >
                  Mark Pending
                </button>
              )}
              {selectedRx.status !== 'Dispensed' && (
                <button
                  onClick={() => handleStatusChange(selectedRx.id, 'Dispensed')}
                  style={{
                    flex: 1,
                    height: '32px',
                    fontSize: '12px',
                    borderRadius: '0px',
                    backgroundColor: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success-border)',
                    color: 'var(--color-success-text)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Mark Dispensed
                </button>
              )}
              {selectedRx.status !== 'Cancelled' && (
                <button
                  onClick={() => handleStatusChange(selectedRx.id, 'Cancelled')}
                  className="desktop-btn-secondary"
                  style={{ flex: 1, height: '32px', fontSize: '12px', borderRadius: '0px', fontWeight: 600, color: 'var(--color-danger-text)' }}
                >
                  Cancel
                </button>
              )}
            </div>

            {selectedRx.status !== 'Dispensed' && selectedRx.status !== 'Cancelled' && (
              <button
                onClick={() => handleDispenseToPOS(selectedRx)}
                className="desktop-btn-primary"
                style={{ height: '36px', fontSize: '13px', width: '100%', gap: '6px', borderRadius: '0px' }}
              >
                <ShoppingCart size={16} />
                <span>Transfer & Dispense in POS</span>
              </button>
            )}
          </div>
        </div>
      )}

      {showNewModal && (
        <div className="modal-overlay" onClick={handleCloseNewModal}>
          <div className="animate-popup" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: '0px', width: '520px', padding: '20px', boxShadow: 'var(--shadow-dropdown)' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '8px' }}>
              CREATE NEW DOCTOR PRESCRIPTION
            </div>

            <form onSubmit={handleCreatePrescriptionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input placeholder="Patient Name *" required value={patientName} onChange={e => setPatientName(e.target.value)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
                <input type="number" placeholder="Age *" value={patientAge} onChange={e => setPatientAge(parseInt(e.target.value, 10) || 0)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input placeholder="Patient Phone" value={patientPhone} onChange={e => setPatientPhone(e.target.value)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
                <input placeholder="Doctor Name *" required value={doctorName} onChange={e => setDoctorName(e.target.value)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input placeholder="Doctor Contact" value={doctorContact} onChange={e => setDoctorContact(e.target.value)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
                <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ padding: '4px 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', resize: 'none' }} />
              </div>

              <div style={{ borderTop: '1px solid var(--color-border-default)', paddingTop: '12px', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>ADD PRESCRIPTION LINE ITEM</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <select value={selectedMedId} onChange={e => setSelectedMedId(Number(e.target.value))} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }}>
                  <option value="">Select Medicine...</option>
                  {availableMedicines.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <input type="number" placeholder="Quantity" value={qtyPrescribed} onChange={e => setQtyPrescribed(parseInt(e.target.value, 10) || 0)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <input placeholder="Dosage (e.g. 1 tablet)" value={dosage} onChange={e => setDosage(e.target.value)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
                <input placeholder="Frequency (e.g. 3x daily)" value={frequency} onChange={e => setFrequency(e.target.value)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
                <input type="number" placeholder="Duration (days)" value={durationDays} onChange={e => setDurationDays(parseInt(e.target.value, 10) || 1)} style={{ height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }} />
              </div>
              <button type="button" onClick={handleAddItemToRx} className="desktop-btn-secondary" style={{ height: '28px', fontSize: '12px', borderRadius: '0px' }}>Add Line Item</button>

              <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--color-border-default)', padding: '8px', borderRadius: '0px', backgroundColor: 'var(--color-bg-panel)' }}>
                {rxItems.map((item, idx) => (
                  <div key={`${item.medicine_id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px', borderBottom: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}>
                    <span>{item.medicine_name} — {item.dosage} {item.frequency} {item.duration_days}d x{item.quantity_prescribed}</span>
                    <button type="button" onClick={() => setRxItems(prev => prev.filter((_, i) => i !== idx))} style={{ border: 'none', color: 'var(--color-danger-text)', background: 'transparent', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" onClick={handleCloseNewModal} className="desktop-btn-secondary" style={{ height: '28px', padding: '0 14px', borderRadius: '0px' }} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="desktop-btn-primary" style={{ height: '28px', padding: '0 14px', borderRadius: '0px' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <SplitPane
      primaryPane={primaryContent}
      inspectorPane={inspectorContent}
      inspectorTitle="PRESCRIPTION INSPECTOR"
      inspectorWidth="340px"
    />
  );
};
