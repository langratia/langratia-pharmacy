import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, 
  Trash2,
  ShoppingCart,
  FileText,
  User,
  Stethoscope,
  CheckCircle2
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
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

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
      setSuccessMessage(`Prescription for ${patientName} has been recorded successfully!`);
      setShowSuccessModal(true);
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
        quantity: item.quantity_prescribed,
        prescription_id: rx.id
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
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
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
          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{rx.patient_name}</span>
          <span style={{ fontSize: '10px', color: 'var(--muted)', marginLeft: '4px' }}>({rx.patient_age}y)</span>
        </div>
      )
    },
    {
      key: 'doctor_name',
      header: 'Prescribing Doctor',
      width: '25%',
      accessor: (rx) => (
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Prescriptions</div>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search RX, patient, doctor…"
          width="240px"
          showShortcut={false}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ height: '38px', fontSize: '13px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset' }}
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Dispensed">Dispensed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <button onClick={handleOpenNewModal} className="btn btn-primary" style={{ marginLeft: 'auto', gap: '6px' }}>
          <Plus size={14} /> New Prescription
        </button>
      </div>

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
        style={{ flex: 1 }}
      />
    </div>
  );

  const inspectorContent = (
    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      {!selectedRx ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <FileText size={40} style={{ opacity: 0.25 }} />
          <div style={{ fontSize: '14px' }}>Select a prescription to inspect</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
              RX #{selectedRx.prescription_number}
            </span>
            <StatusBadge status={mapRxStatus(selectedRx.status)} />
          </div>

          <div style={{ padding: '14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink)', fontWeight: 600 }}>
              <User size={14} style={{ color: 'var(--blue)' }} /> {selectedRx.patient_name} ({selectedRx.patient_age} yrs)
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
              Phone: {selectedRx.patient_phone || 'N/A'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', marginTop: '2px' }}>
              <Stethoscope size={14} style={{ color: 'var(--cyan)' }} /> Dr. {selectedRx.doctor_name}
            </div>
          </div>

          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Medications ({selectedRx.items?.length || 0})
          </div>

          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: '8px', background: 'var(--surface)', padding: '4px' }}>
            {selectedRx.items?.map((item) => (
              <div key={item.id} style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: '13px' }}>
                <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '3px' }}>{item.medicine_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {item.dosage} · {item.frequency} · {item.duration_days}d · Qty: <strong style={{ color: 'var(--ink)' }}>{item.quantity_prescribed}</strong>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {selectedRx.status !== 'Pending' && (
                <button onClick={() => handleStatusChange(selectedRx.id, 'Pending')} className="btn" style={{ flex: 1 }}>Mark Pending</button>
              )}
              {selectedRx.status !== 'Dispensed' && (
                <button
                  onClick={() => handleStatusChange(selectedRx.id, 'Dispensed')}
                  style={{ flex: 1, height: '40px', fontSize: '13px', borderRadius: 'var(--r)', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', color: 'var(--green)', fontWeight: 600, cursor: 'pointer', minHeight: 'unset', transition: 'all 0.15s ease' }}
                >
                  Mark Dispensed
                </button>
              )}
              {selectedRx.status !== 'Cancelled' && (
                <button onClick={() => handleStatusChange(selectedRx.id, 'Cancelled')} className="btn btn-danger" style={{ flex: 1 }}>Cancel</button>
              )}
            </div>
            {selectedRx.status !== 'Dispensed' && selectedRx.status !== 'Cancelled' && (
              <button onClick={() => handleDispenseToPOS(selectedRx)} className="btn btn-primary" style={{ width: '100%', gap: '8px', height: '46px', fontSize: '14px' }}>
                <ShoppingCart size={16} />
                Transfer & Dispense in POS
              </button>
            )}
          </div>
        </div>
      )}

      {showNewModal && (
        <div className="modal-overlay" onClick={handleCloseNewModal}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface-soft)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r2)', width: '540px', padding: '28px', boxShadow: 'var(--shadow-dropdown)', animation: 'popupEnter 0.2s cubic-bezier(0.16,1,0.3,1) forwards' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px', letterSpacing: '-0.2px' }}>New Prescription</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>Fill in patient and doctor details, then add medication line items.</p>

            <form onSubmit={handleCreatePrescriptionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input placeholder="Patient Name *" required value={patientName} onChange={e => setPatientName(e.target.value)} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
                <input type="number" placeholder="Age *" value={patientAge} onChange={e => setPatientAge(parseInt(e.target.value, 10) || 0)} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input placeholder="Patient Phone" value={patientPhone} onChange={e => setPatientPhone(e.target.value)} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
                <input placeholder="Doctor Name *" required value={doctorName} onChange={e => setDoctorName(e.target.value)} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input placeholder="Doctor Contact" value={doctorContact} onChange={e => setDoctorContact(e.target.value)} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
                <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', resize: 'none', outline: 'none', fontSize: '13px' }} />
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '14px', fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>Add Medication Line Item</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select value={selectedMedId} onChange={e => setSelectedMedId(Number(e.target.value))} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }}>
                  <option value="">Select Medicine…</option>
                  {availableMedicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input type="number" placeholder="Quantity" value={qtyPrescribed} onChange={e => setQtyPrescribed(parseInt(e.target.value, 10) || 0)} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <input placeholder="Dosage (e.g. 1 tablet)" value={dosage} onChange={e => setDosage(e.target.value)} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
                <input placeholder="Frequency (e.g. 3x daily)" value={frequency} onChange={e => setFrequency(e.target.value)} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
                <input type="number" placeholder="Days" value={durationDays} onChange={e => setDurationDays(parseInt(e.target.value, 10) || 1)} style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--ink)', outline: 'none', minHeight: 'unset', fontSize: '13px' }} />
              </div>
              <button type="button" onClick={handleAddItemToRx} className="btn" style={{ gap: '6px' }}><Plus size={14} /> Add Line Item</button>

              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--line)', padding: '8px', borderRadius: '8px', background: 'var(--surface)' }}>
                {rxItems.map((item, idx) => (
                  <div key={`${item.medicine_id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 4px', borderBottom: '1px solid var(--line)', color: 'var(--ink)' }}>
                    <span>{item.medicine_name} — {item.dosage} {item.frequency} {item.duration_days}d ×{item.quantity_prescribed}</span>
                    <button type="button" onClick={() => setRxItems(prev => prev.filter((_, i) => i !== idx))} style={{ border: 'none', color: 'var(--red)', background: 'transparent', cursor: 'pointer', minHeight: 'unset', padding: '0' }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
                <button type="button" onClick={handleCloseNewModal} className="btn" disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ gap: '6px' }}>
                  {isSubmitting ? 'Saving…' : 'Save Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <SplitPane
        primaryPane={primaryContent}
        inspectorPane={inspectorContent}
        inspectorTitle="Prescription Inspector"
        inspectorWidth="340px"
      />

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
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Prescription Saved</h3>
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
    </>
  );
};
