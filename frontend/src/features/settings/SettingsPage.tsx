import React, { useState, useEffect } from 'react';
import { Download, Upload, Shield, Users, Database, FileSpreadsheet, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { ListUsers, CreateUser, ExportDatabase, RestoreDatabase, ListAuditLogs, ResetAndSeedDatabase } from '../../../wailsjs/go/main/App';
import { models } from '../../../wailsjs/go/models';
import { useAuth } from '../../context/AuthContext';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Panel } from '../../components/ui/Panel';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { SplitPane } from '../../components/ui/SplitPane';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'backups' | 'audit'>('users');
  
  // Users state
  const [users, setUsers] = useState<models.User[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'cashier', full_name: '' });
  
  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<models.AuditLog[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const data = await ListUsers();
      setUsers(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load users');
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const data = await ListAuditLogs(100);
      setAuditLogs(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load audit logs');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      toast.error('Only administrators can create users');
      return;
    }
    
    try {
      setIsLoading(true);
      await CreateUser(newUser.username, newUser.password, newUser.role, newUser.full_name);
      toast.success('User created successfully');
      setNewUser({ username: '', password: '', role: 'cashier', full_name: '' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportDB = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const destPath = `backup_${new Date().getTime()}.db`;
      await ExportDatabase(destPath, user.id, user.username);
      toast.success(`Database exported to ${destPath}`);
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSeedDB = async () => {
    if (!user || user.role !== 'admin') return;
    if (!window.confirm('WARNING: Reset & Seed Database will wipe all existing data and create demo records. Continue?')) {
      return;
    }
    try {
      setIsLoading(true);
      await ResetAndSeedDatabase();
      toast.success('Database reset & seeded with demo data');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const userColumns: Column<models.User>[] = [
    {
      key: 'username',
      header: 'Username',
      width: '30%',
      accessor: (u) => <span style={{ fontWeight: 600, color: '#0F172A' }}>{u.username}</span>
    },
    {
      key: 'full_name',
      header: 'Full Name',
      width: '40%',
      accessor: (u) => <span style={{ fontSize: '11px', color: '#334155' }}>{u.full_name || '-'}</span>
    },
    {
      key: 'role',
      header: 'Role Privilege',
      width: '30%',
      accessor: (u) => (
        <span style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: u.role === 'admin' ? '#FEF3C7' : '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '2px', fontWeight: 700, color: u.role === 'admin' ? '#B45309' : '#334155', textTransform: 'uppercase' }}>
          {u.role}
        </span>
      )
    }
  ];

  const auditColumns: Column<models.AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      width: '25%',
      accessor: (log) => <span style={{ fontSize: '10px', color: '#64748B' }}>{new Date(log.timestamp).toLocaleString()}</span>
    },
    {
      key: 'username',
      header: 'Operator',
      width: '20%',
      accessor: (log) => <span style={{ fontWeight: 600, color: '#0F172A' }}>{log.username}</span>
    },
    {
      key: 'action',
      header: 'System Action',
      width: '25%',
      accessor: (log) => <span style={{ fontWeight: 600, color: '#0F8A6A' }}>{log.action}</span>
    },
    {
      key: 'details',
      header: 'Audit Trail Details',
      width: '30%',
      accessor: (log) => <span style={{ fontSize: '10px', color: '#334155' }}>{log.details}</span>
    }
  ];

  // Category Sidebar Pane
  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', height: '100%' }}>
      {/* 1-Line Compact Application Command Toolbar */}
      <Panel noPadding style={{ padding: '4px 8px', height: '34px', minHeight: '34px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', height: '100%' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            System Administration & Control
          </div>
        </div>
      </Panel>

      <div style={{ display: 'flex', gap: '4px', flex: 1, overflow: 'hidden' }}>
        {/* Navigation Categories Pane */}
        <Panel noPadding style={{ width: '200px', height: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px' }}>
            <button
              onClick={() => setActiveTab('users')}
              style={{
                height: '28px',
                fontSize: '11px',
                fontWeight: 600,
                justifyContent: 'flex-start',
                gap: '4px',
                backgroundColor: activeTab === 'users' ? '#ECFDF5' : 'transparent',
                borderColor: activeTab === 'users' ? '#0F8A6A' : 'transparent',
                color: activeTab === 'users' ? '#065F46' : '#334155'
              }}
            >
              <Users size={14} /> User Accounts
            </button>
            <button
              onClick={() => setActiveTab('backups')}
              style={{
                height: '28px',
                fontSize: '11px',
                fontWeight: 600,
                justifyContent: 'flex-start',
                gap: '4px',
                backgroundColor: activeTab === 'backups' ? '#ECFDF5' : 'transparent',
                borderColor: activeTab === 'backups' ? '#0F8A6A' : 'transparent',
                color: activeTab === 'backups' ? '#065F46' : '#334155'
              }}
            >
              <Database size={14} /> DB & Maintenance
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              style={{
                height: '28px',
                fontSize: '11px',
                fontWeight: 600,
                justifyContent: 'flex-start',
                gap: '4px',
                backgroundColor: activeTab === 'audit' ? '#ECFDF5' : 'transparent',
                borderColor: activeTab === 'audit' ? '#0F8A6A' : 'transparent',
                color: activeTab === 'audit' ? '#065F46' : '#334155'
              }}
            >
              <Shield size={14} /> Audit Trail Logs
            </button>
          </div>
        </Panel>

        {/* Content Pane View */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {activeTab === 'users' && (
            <DataGrid
              columns={userColumns}
              data={users}
              keyExtractor={(u) => u.id}
              isLoading={isLoading}
              compactRows={true}
              zebraStriping={true}
              maxHeight="calc(100vh - 130px)"
              style={{ flex: 1 }}
            />
          )}

          {activeTab === 'audit' && (
            <DataGrid
              columns={auditColumns}
              data={auditLogs}
              keyExtractor={(log) => log.id}
              isLoading={isLoading}
              compactRows={true}
              zebraStriping={true}
              maxHeight="calc(100vh - 130px)"
              style={{ flex: 1 }}
            />
          )}

          {activeTab === 'backups' && (
            <Panel title="DATABASE BACKUP & SYSTEM RECOVERY" style={{ height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '11px', color: '#334155' }}>
                <div style={{ padding: '4px', border: '1px solid #CBD5E1', borderRadius: '2px', backgroundColor: '#F8FAFC' }}>
                  <strong>Export Database Snapshot:</strong> Creates a full standalone SQLite backup of sales, inventory, and users.
                  <div style={{ marginTop: '6px' }}>
                    <button onClick={handleExportDB} className="desktop-btn-primary" style={{ height: '26px', gap: '4px' }}>
                      <Download size={12} /> Export SQLite Backup (.db)
                    </button>
                  </div>
                </div>

                {user?.role === 'admin' && (
                  <div style={{ padding: '4px', border: '1px solid #FCA5A5', borderRadius: '2px', backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                    <strong>System Reset & Demo Data Seeding:</strong> Wipes existing database tables and reinstates demo dataset.
                    <div style={{ marginTop: '6px' }}>
                      <button onClick={handleResetSeedDB} style={{ height: '26px', backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', fontWeight: 600, gap: '4px' }}>
                        Reset & Seed Demo Database
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );

  // Inspector Docked Pane
  const inspectorContent = (
    <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '4px', height: '100%', boxSizing: 'border-box' }}>
      {activeTab === 'users' ? (
        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', borderBottom: '1px solid #CBD5E1', paddingBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <UserPlus size={14} color="#0F8A6A" /> CREATE OPERATOR ACCOUNT
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#334155', marginBottom: '2px', textTransform: 'uppercase' }}>Full Name *</label>
            <input type="text" required value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} style={{ width: '100%' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#334155', marginBottom: '2px', textTransform: 'uppercase' }}>Username *</label>
            <input type="text" required value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} style={{ width: '100%' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#334155', marginBottom: '2px', textTransform: 'uppercase' }}>Password *</label>
            <input type="password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={{ width: '100%' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#334155', marginBottom: '2px', textTransform: 'uppercase' }}>Role Privilege</label>
            <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={{ width: '100%' }}>
              <option value="cashier">Cashier</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <button type="submit" className="desktop-btn-primary" style={{ height: '28px', fontSize: '11px', marginTop: '10px', gap: '4px' }}>
            <UserPlus size={12} />
            <span>Create User Account</span>
          </button>
        </form>
      ) : (
        <div style={{ padding: '20px 10px', color: '#64748B', fontSize: '11px' }}>
          Select user accounts to manage access credentials.
        </div>
      )}
    </div>
  );

  return (
    <SplitPane
      primaryPane={primaryContent}
      inspectorPane={inspectorContent}
      inspectorTitle="ADMIN INSPECTOR"
      inspectorWidth="320px"
    />
  );
};
