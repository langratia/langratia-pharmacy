import React, { useState, useEffect } from 'react';
import { Download, Upload, Shield, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ListUsers, CreateUser, ExportDatabase, RestoreDatabase, ListAuditLogs, ResetAndSeedDatabase } from '../../../wailsjs/go/main/App';
import { models } from '../../../wailsjs/go/models';
import { useAuth } from '../../context/AuthContext';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Panel } from '../../components/ui/Panel';
import { DesktopButton } from '../../components/ui/DesktopButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataGrid, Column } from '../../components/ui/DataGrid';

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
      toast.error(err.message || 'Failed to export database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreDB = async () => {
    if (!user) return;
    const confirmRestore = window.confirm("WARNING: This will overwrite current database and restart app. Proceed?");
    if (!confirmRestore) return;

    try {
      setIsLoading(true);
      const sourcePath = prompt("Enter exact path to backup .db file:");
      if (!sourcePath) {
        setIsLoading(false);
        return;
      }
      
      await RestoreDatabase(sourcePath, user.id, user.username);
      toast.success('Database restored successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to restore database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedDatabase = async () => {
    const confirmSeed = window.confirm("CRITICAL WARNING: This will WIPE ALL EXISTING DATA and replace with test records. Proceed?");
    if (!confirmSeed) return;

    try {
      setIsLoading(true);
      await ResetAndSeedDatabase();
      toast.success('Database successfully reset and seeded!');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed database');
    } finally {
      setIsLoading(false);
    }
  };

  const userColumns: Column<models.User>[] = [
    {
      key: 'full_name',
      header: 'Full Name',
      accessor: (u) => <span style={{ fontWeight: 600, color: '#111827' }}>{u.full_name}</span>
    },
    {
      key: 'username',
      header: 'Username',
      accessor: (u) => <span style={{ color: '#6B7280' }}>@{u.username}</span>
    },
    {
      key: 'role',
      header: 'Role',
      accessor: (u) => (
        <StatusBadge
          status={u.role === 'admin' ? 'active' : 'pending'}
          label={u.role.toUpperCase()}
        />
      )
    },
    {
      key: 'created_at',
      header: 'Created Date',
      accessor: (u) => <span style={{ color: '#6B7280' }}>{new Date(u.created_at).toLocaleDateString()}</span>
    }
  ];

  const auditColumns: Column<models.AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      accessor: (log) => <span style={{ color: '#6B7280' }}>{new Date(log.timestamp).toLocaleString()}</span>
    },
    {
      key: 'username',
      header: 'User',
      accessor: (log) => <span style={{ fontWeight: 600, color: '#111827' }}>@{log.username}</span>
    },
    {
      key: 'action',
      header: 'Action',
      accessor: (log) => (
        <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F3F4F6', fontSize: '11px', fontWeight: 600 }}>
          {log.action}
        </span>
      )
    },
    {
      key: 'details',
      header: 'Details',
      accessor: (log) => <span style={{ color: '#6B7280' }}>{log.details}</span>
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader
        title="Settings & Administration"
        subtitle="User account management, security roles, system database backups, and audit logs."
      />

      <Panel noPadding style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { key: 'users', label: 'User Accounts' },
            { key: 'backups', label: 'Database & Backups' },
            { key: 'audit', label: 'Audit Log' }
          ].map((tab) => (
            <DesktopButton
              key={tab.key}
              variant={activeTab === tab.key ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </DesktopButton>
          ))}
        </div>
      </Panel>

      <Panel noPadding style={{ padding: '16px' }}>
        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
            <DataGrid
              columns={userColumns}
              data={users}
              keyExtractor={(u) => u.id}
              isLoading={isLoading}
              emptyMessage="No users registered in system."
              compactRows={true}
              zebraStriping={true}
              maxHeight="calc(100vh - 280px)"
            />

            {user?.role === 'admin' && (
              <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                  <Shield size={16} /> Create User Account
                </span>
                <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Full Name</label>
                    <input 
                      type="text" required value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Username</label>
                    <input 
                      type="text" required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Password</label>
                    <input 
                      type="password" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>System Role</label>
                    <select 
                      value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '12px', boxSizing: 'border-box' }}
                    >
                      <option value="cashier">Cashier</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <DesktopButton
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={isLoading}
                    style={{ marginTop: '4px' }}
                  >
                    {isLoading ? 'Creating...' : 'Create Account'}
                  </DesktopButton>
                </form>
              </div>
            )}
          </div>
        )}

        {/* BACKUPS TAB */}
        {activeTab === 'backups' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '560px' }}>
            <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Download size={20} color="#0F8A6A" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#111827' }}>Export Database Backup</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6B7280' }}>Create local file snapshot of SQLite database.</p>
                </div>
              </div>
              <DesktopButton variant="outline" size="sm" onClick={handleExportDB} disabled={isLoading}>
                Export Now
              </DesktopButton>
            </div>

            <div style={{ padding: '16px', border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Upload size={20} color="#EF4444" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#991B1B' }}>Restore Database</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#B91C1C' }}>Overwrite current database with backup file.</p>
                </div>
              </div>
              <DesktopButton variant="danger" size="sm" onClick={handleRestoreDB} disabled={isLoading}>
                Restore Backup
              </DesktopButton>
            </div>

            <div style={{ padding: '16px', border: '1px solid #FDE68A', backgroundColor: '#FFFBEB', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <AlertTriangle size={20} color="#F59E0B" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#92400E' }}>Factory Reset & Seed Test Data</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#B45309' }}>Wipes DB and populates 100 realistic records.</p>
                </div>
              </div>
              <DesktopButton variant="secondary" size="sm" onClick={handleSeedDatabase} disabled={isLoading}>
                Reset & Seed
              </DesktopButton>
            </div>
          </div>
        )}

        {/* AUDIT TAB */}
        {activeTab === 'audit' && (
          <DataGrid
            columns={auditColumns}
            data={auditLogs}
            keyExtractor={(log) => log.id}
            isLoading={isLoading}
            emptyMessage="No audit logs available."
            compactRows={true}
            zebraStriping={true}
            maxHeight="calc(100vh - 280px)"
          />
        )}
      </Panel>
    </div>
  );
};
