import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2,
  ShoppingCart,
  FileText,
  User,
  Stethoscope,
  Filter,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { NavItemKey } from '../../components/layout/Sidebar';
import { SectionHeader } from '../../components/ui/SectionHeader';
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
  const [selectedRx, setSelectedRx] = useState<models.Prescription | null>(null);

  // New Prescription Inspector Modal
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

  const fetchPrescriptions = async () => {
    setIsLoading(true);
    try {
      const data = await ListPrescriptions(statusFilter === 'All' ? '' : statusFilter, 50);
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
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [statusFilter]);

  const handleSelectRx = async (rxId: number) => {
    try {
      const details = await GetPrescriptionDetails(rxId);
      if (details) {
        setSelectedRx(details);
      }
    } catch (err) {
      console.error('Failed to load prescription details', err);
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
      toast.success('Prescription recorded!');
      setShowNewModal(false);
      fetchPrescriptions();
    } catch (err: any) {
      toast.error('Failed to create prescription: ' + (err.message || err));
    }
  };

  const handleStatusChange = async (rxId: number, newStatus: string) => {
    try {
      await UpdatePrescriptionStatus(rxId, newStatus, user?.id || 1, user?.username || 'admin');
      toast.success(`Prescription updated to ${newStatus}`);
      fetchPrescriptions();
      if (selectedRx && selectedRx.id === rxId) {
        setSelectedRx((prev) => prev ? ({ ...prev, status: newStatus } as any) : null);
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDispenseToPOS = (rx: models.Prescription) => {
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

    toast.success(`RX ${rx.prescription_number} transferred to POS!`);
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
      width: '25%',
      accessor: (rx) => (
        <span style={{ fontWeight: 600, color: '#0F172A' }}>
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
          <span style={{ fontWeight: 600, color: '#0F172A' }}>{rx.patient_name}</span>
          <span style={{ fontSize: '10px', color: '#64748B', marginLeft: '4px' }}>({rx.patient_age}y)</span>
        </div>
      )
    },
    {
      key: 'doctor_name',
      header: 'Prescribing Doctor',
      width: '25%',
      accessor: (rx) => (
        <span style={{ fontSize: '11px', color: '#334155' }}>
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
        <StatusBadge status={rx.status === 'Pending' ? 'pending' : rx.status === 'Dispensed' ? 'completed' : 'cancelled'} />
      )
    }
  ];

  // Primary Workspace Content
  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', height: '100%' }}>
      <SectionHeader
        title="Prescription Processing Workspace"
        subtitle="Manage doctor prescriptions, verify medications, and transfer to checkout"
        actions={
          <button
            onClick={handleOpenNewModal}
            className="desktop-btn-primary"
            style={{ height: '24px', fontSize: '11px', gap: '4px' }}
          >
            <Plus size={12} />
            <span>New Prescription</span>
          </button>
        }
      />

      {/* Filter Toolbar */}
      <Panel noPadding style={{ padding: '6px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search RX number, patient, or doctor..."
            width="320px"
            showShortcut={false}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={12} style={{ color: '#64748B' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ height: '26px', fontSize: '11px' }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Dispensed">Dispensed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Panel>

      {/* Prescriptions DataGrid */}
      <DataGrid
        columns={columns}
        data={filteredPrescriptions}
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

  // Inspector Docked Panel Content
  const inspectorContent = (
    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', boxSizing: 'border-box' }}>
      {!selectedRx ? (
        <div style={{ padding: '40px 10px', textAlign: 'center', color: '#94A3B8', fontSize: '11px' }}>
          <FileText size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          Select a prescription to inspect details and dispense.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #CBD5E1', paddingBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
              RX #{selectedRx.prescription_number}
            </span>
            <StatusBadge status={selectedRx.status === 'Pending' ? 'pending' : selectedRx.status === 'Dispensed' ? 'completed' : 'cancelled'} />
          </div>

          <div style={{ padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '2px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0F172A', fontWeight: 600 }}>
              <User size={13} color="#0F8A6A" /> {selectedRx.patient_name} ({selectedRx.patient_age} yrs)
            </div>
            <div style={{ color: '#64748B', fontSize: '10px' }}>
              Phone: {selectedRx.patient_phone || 'N/A'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', marginTop: '2px' }}>
              <Stethoscope size={13} color="#0284C7" /> Dr. {selectedRx.doctor_name}
            </div>
          </div>

          <div style={{ fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
            PRESCRIBED MEDICATIONS ({selectedRx.items?.length || 0})
          </div>

          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #CBD5E1', borderRadius: '2px', backgroundColor: '#FFFFFF', padding: '4px' }}>
            {selectedRx.items?.map((item) => (
              <div key={item.id} style={{ padding: '6px', borderBottom: '1px solid #F1F5F9', fontSize: '11px' }}>
                <div style={{ fontWeight: 600, color: '#0F172A' }}>{item.medicine_name}</div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>
                  Dosage: {item.dosage} | Qty: <strong>{item.quantity_prescribed}</strong>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => handleStatusChange(selectedRx.id, 'Pending')}
                style={{ flex: 1, height: '24px', fontSize: '10px' }}
              >
                Mark Pending
              </button>
              <button
                onClick={() => handleStatusChange(selectedRx.id, 'Dispensed')}
                style={{ flex: 1, height: '24px', fontSize: '10px', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}
              >
                Mark Dispensed
              </button>
            </div>

            <button
              onClick={() => handleDispenseToPOS(selectedRx)}
              className="desktop-btn-primary"
              style={{ height: '30px', fontSize: '11px', width: '100%', gap: '6px' }}
            >
              <ShoppingCart size={13} />
              <span>Transfer & Dispense in POS Workstation</span>
            </button>
          </div>
        </div>
      )}

      {/* Create New Prescription Dialog */}
      {showNewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '2px', width: '480px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '10px', borderBottom: '1px solid #CBD5E1', paddingBottom: '6px' }}>
              CREATE NEW DOCTOR PRESCRIPTION
            </div>

            <form onSubmit={handleCreatePrescriptionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input placeholder="Patient Name *" required value={patientName} onChange={e => setPatientName(e.target.value)} />
                <input placeholder="Patient Phone" value={patientPhone} onChange={e => setPatientPhone(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input placeholder="Doctor Name *" required value={doctorName} onChange={e => setDoctorName(e.target.value)} />
                <input placeholder="Doctor Contact" value={doctorContact} onChange={e => setDoctorContact(e.target.value)} />
              </div>

              <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: '6px', fontSize: '11px', fontWeight: 700 }}>ADD PRESCRIPTION LINE ITEM</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '6px' }}>
                <select value={selectedMedId} onChange={e => setSelectedMedId(Number(e.target.value))}>
                  <option value="">Select Medicine...</option>
                  {availableMedicines.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <input type="number" placeholder="Qty" value={qtyPrescribed} onChange={e => setQtyPrescribed(parseInt(e.target.value) || 1)} />
                <button type="button" onClick={handleAddItemToRx} className="desktop-btn-secondary" style={{ height: '28px' }}>Add</button>
              </div>

              <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #E2E8F0', padding: '4px' }}>
                {rxItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 4px' }}>
                    <span>{item.medicine_name} (x{item.quantity_prescribed})</span>
                    <button type="button" onClick={() => setRxItems(prev => prev.filter((_, i) => i !== idx))} style={{ border: 'none', color: '#EF4444' }}><Trash2 size={10} /></button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowNewModal(false)} className="desktop-btn-secondary">Cancel</button>
                <button type="submit" className="desktop-btn-primary">Save Prescription</button>
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
