import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Stethoscope, 
  Pill, 
  ShoppingCart, 
  Printer, 
  Eye, 
  X, 
  Trash2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { NavItemKey } from '../../components/layout/Sidebar';
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
    loadMedicinesForModal();
    setPatientName('');
    setPatientAge(30);
    setPatientPhone('');
    setDoctorName('');
    setDoctorContact('');
    setNotes('');
    setRxItems([]);
    setShowNewModal(true);
  };

  const handleAddItemToRx = () => {
    if (!selectedMedId) {
      toast.error('Please select a medicine');
      return;
    }
    const med = availableMedicines.find(m => m.id === Number(selectedMedId));
    if (!med) return;

    setRxItems([...rxItems, {
      medicine_id: med.id,
      medicine_name: med.name,
      dosage,
      frequency,
      duration_days: durationDays,
      quantity_prescribed: qtyPrescribed
    }]);

    setSelectedMedId('');
    toast.success(`Added ${med.name} to prescription`);
  };

  const handleRemoveRxItem = (index: number) => {
    setRxItems(rxItems.filter((_, i) => i !== index));
  };

  const handleCreatePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      toast.error('Patient Name is required');
      return;
    }
    if (!doctorName.trim()) {
      toast.error('Doctor Name is required');
      return;
    }
    if (rxItems.length === 0) {
      toast.error('Add at least one medicine item to the prescription');
      return;
    }

    try {
      const payload = rxItems.map(item => ({
        medicine_id: item.medicine_id,
        dosage: item.dosage,
        frequency: item.frequency,
        duration_days: item.duration_days,
        quantity_prescribed: item.quantity_prescribed
      }));

      await CreatePrescription(
        user?.id || 1,
        user?.username || 'admin',
        patientName,
        patientAge,
        patientPhone,
        doctorName,
        doctorContact,
        notes,
        payload
      );

      toast.success('Prescription created successfully!');
      setShowNewModal(false);
      fetchPrescriptions();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create prescription');
    }
  };

  const handleViewDetails = async (rxId: number) => {
    try {
      const rx = await GetPrescriptionDetails(rxId);
      setSelectedRx(rx);
      setShowDetailModal(true);
    } catch (err) {
      toast.error('Failed to load prescription details');
    }
  };

  const handleStatusChange = async (rxId: number, newStatus: string) => {
    try {
      await UpdatePrescriptionStatus(user?.id || 1, user?.username || 'admin', rxId, newStatus);
      toast.success(`Prescription marked as ${newStatus}`);
      fetchPrescriptions();
      if (selectedRx && selectedRx.id === rxId) {
        setSelectedRx({ ...selectedRx, status: newStatus } as any);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Dispensed':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: '#D1FAE5',
            color: '#065F46'
          }}>
            <CheckCircle size={14} /> Dispensed
          </span>
        );
      case 'Cancelled':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: '#FEE2E2',
            color: '#991B1B'
          }}>
            <XCircle size={14} /> Cancelled
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: '#FEF3C7',
            color: '#92400E'
          }}>
            <Clock size={14} /> Pending
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
            Prescriptions Management
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0' }}>
            Record doctor prescriptions, track patient dosages, and seamlessly fulfill orders in POS.
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          style={{
            backgroundColor: 'var(--color-emerald-teal)',
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <Plus size={18} /> New Prescription
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        border: '1px solid var(--color-slate-200)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'Pending', 'Dispensed', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: statusFilter === status ? 'var(--color-slate-blue)' : '#F3F4F6',
                color: statusFilter === status ? '#FFFFFF' : 'var(--color-slate-700)'
              }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search RX #, Patient, Doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 38px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #E5E7EB',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Prescriptions Table */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-slate-200)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
            Loading prescriptions database...
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
            No prescriptions found matching filter.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#4B5563' }}>RX NUMBER</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#4B5563' }}>PATIENT</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#4B5563' }}>DOCTOR</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#4B5563' }}>DATE</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#4B5563' }}>STATUS</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#4B5563', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrescriptions.map((rx) => (
                <tr key={rx.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 700, color: 'var(--color-slate-800)' }}>
                    {rx.prescription_number}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-slate-800)' }}>{rx.patient_name}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>Age: {rx.patient_age} | {rx.patient_phone || 'No Phone'}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-slate-800)' }}>Dr. {rx.doctor_name}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{rx.doctor_contact || 'Private Clinic'}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4B5563' }}>
                    {new Date(rx.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {getStatusBadge(rx.status)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => handleViewDetails(rx.id)}
                        style={{
                          backgroundColor: '#F3F4F6',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--color-slate-700)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Eye size={14} /> View
                      </button>

                      {rx.status === 'Pending' && (
                        <button
                          onClick={async () => {
                            const details = await GetPrescriptionDetails(rx.id);
                            handleDispenseToPOS(details);
                          }}
                          style={{
                            backgroundColor: 'var(--color-emerald-teal)',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <ShoppingCart size={14} /> Dispense POS
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Prescription Modal */}
      {showNewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                New Doctor Prescription
              </h3>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePrescriptionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Patient Info */}
              <div style={{ backgroundColor: '#F9FAFB', padding: '14px', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>Patient Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', marginTop: '4px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>Age</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', marginTop: '4px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>Phone Contact</label>
                  <input
                    type="text"
                    placeholder="07..."
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', marginTop: '4px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Doctor Info */}
              <div style={{ backgroundColor: '#F9FAFB', padding: '14px', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>Prescribing Doctor *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Sarah Jenkins"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', marginTop: '4px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>Clinic / Hospital Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. City Hospital"
                    value={doctorContact}
                    onChange={(e) => setDoctorContact(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', marginTop: '4px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Add Prescribed Medicines Section */}
              <div style={{ border: '1px solid #E5E7EB', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: 'var(--color-slate-800)' }}>
                  Add Prescribed Medicines
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>Medicine</label>
                    <select
                      value={selectedMedId}
                      onChange={(e) => setSelectedMedId(e.target.value ? Number(e.target.value) : '')}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px', marginTop: '2px' }}
                    >
                      <option value="">-- Select Medicine --</option>
                      {availableMedicines.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} (Stock: {m.current_stock})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>Dosage</label>
                    <input
                      type="text"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px', marginTop: '2px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>Frequency</label>
                    <input
                      type="text"
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px', marginTop: '2px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>Days</label>
                    <input
                      type="number"
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px', marginTop: '2px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>Total Qty</label>
                    <input
                      type="number"
                      value={qtyPrescribed}
                      onChange={(e) => setQtyPrescribed(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px', marginTop: '2px' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToRx}
                    style={{
                      backgroundColor: 'var(--color-slate-blue)',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Add
                  </button>
                </div>

                {/* Items List */}
                {rxItems.length > 0 && (
                  <div style={{ marginTop: '14px', borderTop: '1px solid #F3F4F6', paddingTop: '10px' }}>
                    {rxItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F9FAFB' }}>
                        <div style={{ fontSize: '13px' }}>
                          <strong>{item.medicine_name}</strong> - {item.dosage}, {item.frequency} ({item.duration_days} days) &rarr; Total Qty: <strong>{item.quantity_prescribed}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRxItem(idx)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>Special Instructions / Doctor Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Take after meals..."
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', marginTop: '4px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', background: '#FFF', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: 'var(--color-emerald-teal)', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription Detail Modal */}
      {showDetailModal && selectedRx && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '650px',
            padding: '24px',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                  Prescription Details #{selectedRx.prescription_number}
                </h3>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                  Issued on {new Date(selectedRx.created_at).toLocaleString()}
                </span>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Patient Info</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-slate-800)', marginTop: '4px' }}>{selectedRx.patient_name}</div>
                <div style={{ fontSize: '12px', color: '#4B5563' }}>Age: {selectedRx.patient_age} yrs | {selectedRx.patient_phone || 'N/A'}</div>
              </div>

              <div style={{ backgroundColor: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Doctor Info</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-slate-800)', marginTop: '4px' }}>Dr. {selectedRx.doctor_name}</div>
                <div style={{ fontSize: '12px', color: '#4B5563' }}>{selectedRx.doctor_contact || 'N/A'}</div>
              </div>
            </div>

            {/* Prescribed Items Table */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-slate-800)', marginBottom: '8px' }}>
                Prescribed Medication List
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F3F4F6' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Medicine</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Dosage</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Frequency</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRx.items?.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{item.medicine_name}</td>
                      <td style={{ padding: '8px' }}>{item.dosage}</td>
                      <td style={{ padding: '8px' }}>{item.frequency} ({item.duration_days} days)</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{item.quantity_prescribed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedRx.notes && (
              <div style={{ padding: '10px', backgroundColor: '#FEF3C7', borderRadius: '6px', fontSize: '12px', color: '#92400E', marginBottom: '16px' }}>
                <strong>Instructions:</strong> {selectedRx.notes}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedRx.status !== 'Dispensed' && (
                  <button
                    onClick={() => handleStatusChange(selectedRx.id, 'Dispensed')}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#10B981', color: '#FFF', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Mark Dispensed
                  </button>
                )}
                {selectedRx.status !== 'Cancelled' && (
                  <button
                    onClick={() => handleStatusChange(selectedRx.id, 'Cancelled')}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#EF4444', color: '#FFF', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel RX
                  </button>
                )}
              </div>

              {selectedRx.status === 'Pending' && (
                <button
                  onClick={() => handleDispenseToPOS(selectedRx)}
                  style={{
                    backgroundColor: 'var(--color-emerald-teal)',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ShoppingCart size={16} /> Load into POS & Checkout
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
