import React, { useState, useEffect } from 'react';
import { Users, Database, FileText, Download, Upload, Shield, AlertTriangle } from 'lucide-react';
import { ListUsers, CreateUser, ExportDatabase, RestoreDatabase, ListAuditLogs, ResetAndSeedDatabase } from '../../../wailsjs/go/main/App';
import { models } from '../../../wailsjs/go/models';
import { useAuth } from '../../context/AuthContext';


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
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const fetchUsers = async () => {
    try {
      const data = await ListUsers();
      setUsers(data || []);
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to load users');
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const data = await ListAuditLogs(100);
      setAuditLogs(data || []);
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to load audit logs');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      showMessage('error', 'Only administrators can create users');
      return;
    }
    
    try {
      setIsLoading(true);
      await CreateUser(newUser.username, newUser.password, newUser.role, newUser.full_name);
      showMessage('success', 'User created successfully');
      setNewUser({ username: '', password: '', role: 'cashier', full_name: '' });
      fetchUsers();
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportDB = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      // Let the user pick a folder/file. Wails handles save dialogs in Go, but here we just pass a default path.
      // A full implementation might use runtime.SaveFileDialog
      const destPath = `backup_${new Date().getTime()}.db`;
      await ExportDatabase(destPath, user.id, user.username);
      showMessage('success', `Database exported successfully to ${destPath}`);
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to export database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreDB = async () => {
    if (!user) return;
    const confirmRestore = window.confirm("WARNING: This will overwrite the current database and restart the application. Are you sure?");
    if (!confirmRestore) return;

    try {
      setIsLoading(true);
      const sourcePath = prompt("Enter the exact path to the backup .db file:");
      if (!sourcePath) {
        setIsLoading(false);
        return;
      }
      
      await RestoreDatabase(sourcePath, user.id, user.username);
      showMessage('success', 'Database restored successfully! Please restart the application.');
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to restore database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedDatabase = async () => {
    const confirmSeed = window.confirm("CRITICAL WARNING: This will WIPE ALL EXISTING DATA and replace it with ~100 realistic testing records. This action cannot be undone. Are you absolutely sure you want to proceed?");
    if (!confirmSeed) return;

    try {
      setIsLoading(true);
      showMessage('success', 'Wiping database and seeding realistic test data... Please wait.');
      await ResetAndSeedDatabase();
      showMessage('success', 'Database successfully reset and seeded with realistic test data! Please refresh or navigate to other tabs to see the new data.');
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to seed database');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-charcoal-navy)', marginBottom: '4px' }}>
          Settings & Administration
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
          Manage system users, view audit logs, perform local backups, and restore data.
        </p>
      </div>

      {message.text && (
        <div style={{ 
          padding: '12px 16px', 
          marginBottom: '20px', 
          borderRadius: '8px', 
          backgroundColor: message.type === 'error' ? '#FEE2E2' : '#DCFCE7',
          color: message.type === 'error' ? '#B91C1C' : '#15803D',
          fontSize: '14px',
          fontWeight: 500
        }}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--color-border-subtle)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '14px',
            fontWeight: activeTab === 'users' ? 700 : 500,
            color: activeTab === 'users' ? 'var(--color-primary-teal)' : 'var(--color-text-muted)',
            borderBottom: activeTab === 'users' ? '3px solid var(--color-primary-teal)' : '3px solid transparent',
            transition: 'all 0.15s'
          }}
        >
          <Users size={18} /> Manage Users
        </button>
        <button
          onClick={() => setActiveTab('backups')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '14px',
            fontWeight: activeTab === 'backups' ? 700 : 500,
            color: activeTab === 'backups' ? 'var(--color-primary-teal)' : 'var(--color-text-muted)',
            borderBottom: activeTab === 'backups' ? '3px solid var(--color-primary-teal)' : '3px solid transparent',
            transition: 'all 0.15s'
          }}
        >
          <Database size={18} /> System Backups
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '14px',
            fontWeight: activeTab === 'audit' ? 700 : 500,
            color: activeTab === 'audit' ? 'var(--color-primary-teal)' : 'var(--color-text-muted)',
            borderBottom: activeTab === 'audit' ? '3px solid var(--color-primary-teal)' : '3px solid transparent',
            transition: 'all 0.15s'
          }}
        >
          <FileText size={18} /> Audit Logs
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--color-border-subtle)', padding: '24px' }}>
        
        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>System Users</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <th style={{ padding: '12px' }}>Full Name</th>
                    <th style={{ padding: '12px' }}>Username</th>
                    <th style={{ padding: '12px' }}>Role</th>
                    <th style={{ padding: '12px' }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '12px', fontWeight: 500 }}>{u.full_name}</td>
                      <td style={{ padding: '12px', color: 'var(--color-text-muted)' }}>@{u.username}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                          backgroundColor: u.role === 'admin' ? '#FEF2F2' : '#F0FDF4',
                          color: u.role === 'admin' ? '#991B1B' : '#166534'
                        }}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {user?.role === 'admin' && (
              <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} /> Create New User
                </h3>
                <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--color-text-muted)' }}>Full Name</label>
                    <input 
                      type="text" required value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border-subtle)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--color-text-muted)' }}>Username</label>
                    <input 
                      type="text" required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border-subtle)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--color-text-muted)' }}>Password</label>
                    <input 
                      type="password" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border-subtle)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--color-text-muted)' }}>Role</label>
                    <select 
                      value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border-subtle)' }}
                    >
                      <option value="cashier">Cashier</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <button 
                    type="submit" disabled={isLoading}
                    style={{ marginTop: '8px', padding: '10px', backgroundColor: 'var(--color-primary-teal)', color: '#fff', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer' }}
                  >
                    {isLoading ? 'Creating...' : 'Create User'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* BACKUPS TAB */}
        {activeTab === 'backups' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
            <div style={{ padding: '24px', border: '1px solid var(--color-border-subtle)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '10px', backgroundColor: '#E0F2FE', color: '#0369A1', borderRadius: '8px' }}>
                  <Download size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Export Database Backup</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Create a secure, local snapshot of your entire database.</p>
                </div>
              </div>
              <button 
                onClick={handleExportDB} disabled={isLoading}
                style={{ padding: '10px 20px', backgroundColor: '#fff', color: '#0369A1', border: '1px solid #0369A1', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Export Now
              </button>
            </div>

            <div style={{ padding: '24px', border: '1px solid #FECACA', backgroundColor: '#FEF2F2', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '10px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '8px' }}>
                  <Upload size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#991B1B' }}>Restore Database</h3>
                  <p style={{ fontSize: '13px', color: '#B91C1C' }}>Warning: This will overwrite current data. Only for disaster recovery.</p>
                </div>
              </div>
              <button 
                onClick={handleRestoreDB} disabled={isLoading}
                style={{ padding: '10px 20px', backgroundColor: '#DC2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Restore from Backup
              </button>
            </div>

            <div style={{ padding: '24px', border: '1px solid #FCD34D', backgroundColor: '#FFFBEB', borderRadius: '8px', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '10px', backgroundColor: '#FEF3C7', color: '#D97706', borderRadius: '8px' }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#B45309' }}>Factory Reset & Seed Test Data</h3>
                  <p style={{ fontSize: '13px', color: '#92400E' }}>Wipes existing DB and populates 100 realistic testing records (Medicines, Batches, Sales).</p>
                </div>
              </div>
              <button 
                onClick={handleSeedDatabase} disabled={isLoading}
                style={{ padding: '10px 20px', backgroundColor: '#D97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Reset & Seed Database
              </button>
            </div>
          </div>
        )}


        {/* AUDIT TAB */}
        {activeTab === 'audit' && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>System Audit Logs (Recent 100)</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <th style={{ padding: '12px' }}>Timestamp</th>
                    <th style={{ padding: '12px' }}>User</th>
                    <th style={{ padding: '12px' }}>Action</th>
                    <th style={{ padding: '12px' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 500 }}>@{log.username}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                          backgroundColor: '#F3F4F6', color: '#374151'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-text-muted)' }}>{log.details}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No audit logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
