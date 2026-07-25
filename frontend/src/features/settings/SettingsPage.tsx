import React, { useState, useEffect } from 'react';
import { Download, Shield, Users, Database, UserPlus, Network, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { ListUsers, CreateUser, ExportDatabase, ListAuditLogs, ResetAndSeedDatabase, UpdateDatabaseConfig, AutoDiscoverServer, EnableMainServerMode, ChangePassword, AdminResetPassword } from '../../../wailsjs/go/main/App';
import { models, services } from '../../../wailsjs/go/models';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { Panel } from '../../components/ui/Panel';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { SplitPane } from '../../components/ui/SplitPane';
import { ReAuthDialog } from '../../components/ui/ReAuthDialog';
import lanGuide from '../../assets/lan_setup_guide.png';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'backups' | 'audit' | 'network'>('users');
  
  // Users state
  const [users, setUsers] = useState<models.User[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'cashier', full_name: '' });
  
  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<models.AuditLog[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);

  // Network State
  const [isScanning, setIsScanning] = useState(false);
  const [isEnablingHost, setIsEnablingHost] = useState(false);

  // Performance View State
  const [selectedUserPerf, setSelectedUserPerf] = useState<services.CashierPerformance | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  // Re-auth state
  const [reauthAction, setReauthAction] = useState<(() => void) | null>(null);
  const [isReauthOpen, setIsReauthOpen] = useState(false);
  const [reauthTitle, setReauthTitle] = useState('');

  // Self password change state
  const [showChangePw, setShowChangePw] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPw, setIsChangingPw] = useState(false);

  // Admin reset password state
  const [resetTargetUserId, setResetTargetUserId] = useState<number | null>(null);
  const [resetTargetUsername, setResetTargetUsername] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPwInput, setShowResetPwInput] = useState(false);
  const [isResettingPw, setIsResettingPw] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const data = await ListUsers(user!.id);
      setUsers(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load users');
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const data = await ListAuditLogs(100, user!.id);
      setAuditLogs(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
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
      await CreateUser(newUser.username, newUser.password, newUser.role, newUser.full_name, user!.id);
      toast.success('User created successfully');
      setNewUser({ username: '', password: '', role: 'cashier', full_name: '' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const doExportDB = async () => {
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

  const handleExportDB = () => {
    requireReauth(doExportDB, 'Confirm identity to export database');
  };

  const doResetSeedDB = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      setIsLoading(true);
      await ResetAndSeedDatabase(user!.id);
      toast.success('Database reset & seeded with demo data');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSeedDB = () => {
    if (!user || user.role !== 'admin') return;
    if (!window.confirm('WARNING: Reset & Seed Database will wipe all existing data and create demo records. Continue?')) return;
    requireReauth(doResetSeedDB, 'Confirm identity to reset database');
  };

  const handleDeactivateUser = async (uId: number, username: string) => {
    if (user?.role !== 'admin') {
      toast.error('Only administrators can deactivate users');
      return;
    }
    if (username === user.username) {
      toast.error('You cannot deactivate your own active session');
      return;
    }
    if (!window.confirm(`Deactivate user operator "${username}"?`)) return;

    try {
      setIsLoading(true);
      const wailsApp = (window as any)?.go?.main?.App;
      if (!wailsApp?.DeactivateUser) {
        toast.error('Deactivation is unavailable in this build.');
        return;
      }
      await wailsApp.DeactivateUser(uId, user!.id);
      toast.success(`Operator ${username} deactivated`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Deactivation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPerformance = async (uId: number, username: string) => {
    setIsLoading(true);
    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (!wailsApp?.GetCashierPerformance) {
        toast.error('Performance view is unavailable in this build.');
        return;
      }
      const perf = await wailsApp.GetCashierPerformance(uId);
      setSelectedUserPerf(perf);
      setSelectedUserName(username);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load performance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoDetect = async () => {
    setIsScanning(true);
    const loadingToast = toast.loading('Scanning local network for Main Server...');
    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (!wailsApp?.AutoDiscoverServer) {
        toast.error('Auto-discovery is unavailable in this build.', { id: loadingToast, duration: 4000 });
        return;
      }
      const path = await wailsApp.AutoDiscoverServer();
      toast.success(`Server found at ${path}! Please restart the application.`, { id: loadingToast, duration: 6000 });
    } catch (err: any) {
      toast.error(err.message || 'No server found on the network. Is the Main Server running?', { id: loadingToast, duration: 6000 });
    } finally {
      setIsScanning(false);
    }
  };

  const handleEnableHost = async () => {
    setIsEnablingHost(true);
    const loadingToast = toast.loading('Configuring Windows for Main Server mode...');
    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (!wailsApp?.EnableMainServerMode) {
        toast.error('Server mode is unavailable on this platform.', { id: loadingToast, duration: 4000 });
        return;
      }
      await wailsApp.EnableMainServerMode(user!.id);
      toast.success('Main Server mode enabled! This PC is now visible to other Cashier PCs.', { id: loadingToast, duration: 6000 });
    } catch (err: any) {
      toast.error(err.message || 'Failed to enable Main Server mode.', { id: loadingToast });
    } finally {
      setIsEnablingHost(false);
    }
  };

  const requireReauth = (action: () => void, title: string) => {
    setReauthAction(() => action);
    setReauthTitle(title);
    setIsReauthOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsChangingPw(true);
    try {
      await ChangePassword(user.id, oldPassword, newPassword);
      toast.success('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setShowChangePw(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleAdminResetPassword = async () => {
    if (!user || resetTargetUserId === null) return;
    setIsResettingPw(true);
    try {
      await AdminResetPassword(user.id, resetTargetUserId, resetNewPassword);
      toast.success(`Password reset for ${resetTargetUsername}`);
      setResetTargetUserId(null);
      setResetTargetUsername('');
      setResetNewPassword('');
      setShowResetPwInput(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setIsResettingPw(false);
    }
  };

  const userColumns: Column<models.User>[] = [
    {
      key: 'username',
      header: 'Username',
      width: '25%',
      accessor: (u) => <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.username}</span>
    },
    {
      key: 'full_name',
      header: 'Full Name',
      width: '30%',
      accessor: (u) => <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{u.full_name || '-'}</span>
    },
    {
      key: 'role',
      header: 'Role Privilege',
      width: '25%',
      accessor: (u) => {
        let bg = 'var(--color-bg-panel)';
        let border = 'var(--color-border-default)';
        let color = 'var(--color-text-secondary)';

        if (u.role === 'admin') {
          bg = 'var(--color-accent-subtle)';
          border = 'var(--color-accent-base)';
          color = 'var(--color-accent-base)';
        }

        return (
          <span style={{
            fontSize: '10px',
            padding: '2px 8px',
            backgroundColor: bg,
            border: `1px solid ${border}`,
            borderRadius: '0px',
            fontWeight: 700,
            color: color,
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            {u.role}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Row Actions',
      width: '20%',
      align: 'right' as const,
      accessor: (u) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => handleViewPerformance(u.id, u.username)}
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              backgroundColor: 'var(--color-bg-panel)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
              borderRadius: '0px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Performance
          </button>
          <button
            type="button"
            onClick={() => requireReauth(
              () => {
                setResetTargetUserId(u.id);
                setResetTargetUsername(u.username);
                setShowResetPwInput(true);
              },
              'Confirm identity to reset password'
            )}
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              backgroundColor: 'var(--color-bg-panel)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
              borderRadius: '0px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reset PW
          </button>
          <button
            type="button"
            onClick={() => handleDeactivateUser(u.id, u.username)}
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger-text)',
              borderRadius: '0px',
              fontWeight: 600,
              cursor: u.username === user?.username ? 'not-allowed' : 'pointer',
              opacity: u.username === user?.username ? 0.5 : 1
            }}
            disabled={u.username === user?.username}
          >
            Deactivate
          </button>
        </div>
      )
    }
  ];

  const auditColumns: Column<models.AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      width: '25%',
      accessor: (log) => <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</span>
    },
    {
      key: 'username',
      header: 'Operator',
      width: '20%',
      accessor: (log) => <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{log.username}</span>
    },
    {
      key: 'action',
      header: 'System Action',
      width: '25%',
      accessor: (log) => <span style={{ fontWeight: 600, color: 'var(--color-text-accent)' }}>{log.action}</span>
    },
    {
      key: 'details',
      header: 'Audit Trail Details',
      width: '30%',
      accessor: (log) => <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{log.details}</span>
    }
  ];

  // Category Sidebar Pane
  const primaryContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', padding: '0', backgroundColor: 'var(--color-bg-base)' }}>
      {/* 1-Line Compact Application Command Toolbar */}
      <Panel noPadding style={{ padding: '0 16px', height: '44px', minHeight: '44px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', height: '100%' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            System Administration & Control
          </div>
        </div>
      </Panel>

      <div style={{ display: 'flex', gap: '12px', flex: 1, overflow: 'hidden' }}>
        {/* Navigation Categories Pane */}
        <Panel noPadding style={{ width: '220px', height: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px' }}>
            <button
              onClick={() => setActiveTab('users')}
              style={{
                height: '36px',
                fontSize: '12px',
                fontWeight: 600,
                justifyContent: 'flex-start',
                gap: '8px',
                padding: '0 12px',
                borderRadius: '0px',
                backgroundColor: activeTab === 'users' ? 'var(--color-accent-subtle)' : 'transparent',
                border: activeTab === 'users' ? '1px solid var(--color-accent-base)' : '1px solid transparent',
                color: activeTab === 'users' ? 'var(--color-accent-base)' : 'var(--color-text-secondary)'
              }}
            >
              <Users size={14} /> User Accounts
            </button>
            <button
              onClick={() => setActiveTab('backups')}
              style={{
                height: '36px',
                fontSize: '12px',
                fontWeight: 600,
                justifyContent: 'flex-start',
                gap: '8px',
                padding: '0 12px',
                borderRadius: '0px',
                backgroundColor: activeTab === 'backups' ? 'var(--color-accent-subtle)' : 'transparent',
                border: activeTab === 'backups' ? '1px solid var(--color-accent-base)' : '1px solid transparent',
                color: activeTab === 'backups' ? 'var(--color-accent-base)' : 'var(--color-text-secondary)'
              }}
            >
              <Database size={14} /> DB & Maintenance
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              style={{
                height: '36px',
                fontSize: '12px',
                fontWeight: 600,
                justifyContent: 'flex-start',
                gap: '8px',
                padding: '0 12px',
                borderRadius: '0px',
                backgroundColor: activeTab === 'audit' ? 'var(--color-accent-subtle)' : 'transparent',
                border: activeTab === 'audit' ? '1px solid var(--color-accent-base)' : '1px solid transparent',
                color: activeTab === 'audit' ? 'var(--color-accent-base)' : 'var(--color-text-secondary)'
              }}
            >
              <Shield size={14} /> Audit Trail Logs
            </button>
            <button
              onClick={() => setActiveTab('network')}
              style={{
                height: '36px',
                fontSize: '12px',
                fontWeight: 600,
                justifyContent: 'flex-start',
                gap: '8px',
                padding: '0 12px',
                borderRadius: '0px',
                backgroundColor: activeTab === 'network' ? 'var(--color-accent-subtle)' : 'transparent',
                border: activeTab === 'network' ? '1px solid var(--color-accent-base)' : '1px solid transparent',
                color: activeTab === 'network' ? 'var(--color-accent-base)' : 'var(--color-text-secondary)'
              }}
            >
              <Network size={14} /> Network Setup
            </button>
          </div>
        </Panel>

        {/* Content Pane View */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {activeTab === 'users' && (
            <React.Fragment>
              {showResetPwInput && resetTargetUserId !== null && (
                <Panel noPadding style={{ padding: '10px 16px', marginBottom: '8px', backgroundColor: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--color-warning-text)' }}>
                    <span style={{ fontWeight: 700 }}>Reset password for <strong>{resetTargetUsername}</strong>:</span>
                    <input
                      type="password"
                      value={resetNewPassword}
                      onChange={e => setResetNewPassword(e.target.value)}
                      placeholder="New password (min 4 chars)"
                      minLength={4}
                      required
                      style={{ flex: 1, height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-warning-border)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)' }}
                    />
                    <button onClick={handleAdminResetPassword} disabled={isResettingPw || resetNewPassword.length < 4} className="desktop-btn-primary" style={{ height: '28px', fontSize: '11px' }}>
                      {isResettingPw ? 'Resetting...' : 'Apply Reset'}
                    </button>
                    <button onClick={() => { setShowResetPwInput(false); setResetNewPassword(''); }} className="desktop-btn" style={{ height: '28px', fontSize: '11px' }}>
                      Cancel
                    </button>
                  </div>
                </Panel>
              )}
            <SplitPane
              primaryPane={
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
              }
              isInspectorOpen={!!selectedUserPerf}
              inspectorTitle={`Performance: ${selectedUserName}`}
              onToggleInspector={() => setSelectedUserPerf(null)}
              inspectorWidth="380px"
              inspectorPane={
                selectedUserPerf ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                    
                    {/* Today */}
                    <div style={{ padding: '12px', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-base)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--color-text-primary)' }}>Today's Sales</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Transactions</span>
                        <span style={{ fontWeight: 600 }}>{selectedUserPerf.today.total_sales}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Items Sold</span>
                        <span style={{ fontWeight: 600 }}>{selectedUserPerf.today.items_sold}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Revenue</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-accent-base)' }}>UGX {formatCurrency(selectedUserPerf.today.total_revenue)}</span>
                      </div>
                    </div>

                    {/* This Week */}
                    <div style={{ padding: '12px', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-base)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--color-text-primary)' }}>Last 7 Days</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Transactions</span>
                        <span style={{ fontWeight: 600 }}>{selectedUserPerf.this_week.total_sales}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Items Sold</span>
                        <span style={{ fontWeight: 600 }}>{selectedUserPerf.this_week.items_sold}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Revenue</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>UGX {formatCurrency(selectedUserPerf.this_week.total_revenue)}</span>
                      </div>
                    </div>

                    {/* This Month */}
                    <div style={{ padding: '12px', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-base)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--color-text-primary)' }}>This Calendar Month</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Transactions</span>
                        <span style={{ fontWeight: 600 }}>{selectedUserPerf.this_month.total_sales}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Items Sold</span>
                        <span style={{ fontWeight: 600 }}>{selectedUserPerf.this_month.items_sold}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Revenue</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>UGX {formatCurrency(selectedUserPerf.this_month.total_revenue)}</span>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div />
                )
              }
            />
            </React.Fragment>
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

          {activeTab === 'network' && (
            <Panel title="LAN NETWORK SETUP" style={{ height: '100%', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', padding: '24px' }}>
                <div style={{ maxWidth: '600px', width: '100%' }}>
                  <img src={lanGuide} alt="LAN Setup Guide" style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--color-border-default)' }} />
                </div>
                
                <div style={{ display: 'flex', gap: '20px', width: '100%', maxWidth: '600px', flexDirection: 'row' }}>
                  {/* Host Panel */}
                  <div style={{ flex: 1, padding: '20px', border: '1px solid var(--color-border-default)', borderRadius: '0px', backgroundColor: 'var(--color-bg-base)', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Database size={16} style={{ color: 'var(--color-accent-base)' }} /> Is this the Main Server?
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--color-text-secondary)', flex: 1 }}>
                      If this is the main computer that holds all the data, click below to make it visible to other Cashier PCs on your network.
                    </p>
                    <button 
                      onClick={handleEnableHost} 
                      disabled={isEnablingHost}
                      className="desktop-btn-primary" 
                      style={{ height: '36px', borderRadius: '0px', backgroundColor: 'var(--color-bg-panel)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-default)' }}
                    >
                      {isEnablingHost ? 'Configuring...' : 'Enable Main Server Mode'}
                    </button>
                  </div>

                  {/* Client Panel */}
                  <div style={{ flex: 1, padding: '20px', border: '1px solid var(--color-border-default)', borderRadius: '0px', backgroundColor: 'var(--color-bg-base)', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} style={{ color: 'var(--color-warning-text)' }} /> Is this a Cashier PC?
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--color-text-secondary)', flex: 1 }}>
                      If you are setting up a Cashier terminal, make sure the Main Server is running, then click Auto-Detect to automatically connect to it.
                    </p>
                    <button 
                      onClick={handleAutoDetect} 
                      disabled={isScanning}
                      className="desktop-btn-primary" 
                      style={{ height: '36px', borderRadius: '0px' }}
                    >
                      {isScanning ? 'Scanning Network...' : 'Auto-Detect & Connect'}
                    </button>
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {activeTab === 'backups' && (
            <Panel title="DATABASE BACKUP & SYSTEM RECOVERY" style={{ height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: 'var(--color-text-primary)' }}>
                <div style={{ padding: '12px', border: '1px solid var(--color-border-default)', borderRadius: '0px', backgroundColor: 'var(--color-bg-base)' }}>
                  <strong>Export Database Snapshot:</strong> Creates a full standalone SQLite backup of sales, inventory, and users.
                  <div style={{ marginTop: '8px' }}>
                    <button onClick={handleExportDB} disabled={isLoading} className="desktop-btn-primary" style={{ height: '28px', gap: '6px', borderRadius: '0px', opacity: isLoading ? 0.6 : 1 }}>
                      <Download size={14} /> {isLoading ? 'Exporting...' : 'Export SQLite Backup (.db)'}
                    </button>
                  </div>
                </div>

                {user?.role === 'admin' && (
                  <div style={{ padding: '12px', border: '1px solid var(--color-danger-border)', borderRadius: '0px', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger-text)' }}>
                    <strong>System Reset & Demo Data Seeding:</strong> Wipes existing database tables and reinstates demo dataset.
                    <div style={{ marginTop: '8px' }}>
                      <button
                        onClick={handleResetSeedDB}
                        style={{
                          height: '28px',
                          backgroundColor: 'var(--color-danger-text)',
                          color: 'var(--color-text-inverse)',
                          border: 'none',
                          fontWeight: 600,
                          gap: '6px',
                          borderRadius: '0px',
                          cursor: 'pointer',
                          padding: '0 12px'
                        }}
                      >
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
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
      {activeTab === 'users' ? (
        <React.Fragment>
        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-default)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserPlus size={16} style={{ color: 'var(--color-accent-base)' }} /> CREATE OPERATOR ACCOUNT
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Full Name *</label>
            <input type="text" required value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Username *</label>
            <input type="text" required value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Password *</label>
            <input type="password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Role Privilege</label>
            <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}>
              <option value="cashier">Cashier</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <button type="submit" className="desktop-btn-primary" style={{ height: '32px', fontSize: '13px', marginTop: '8px', gap: '6px', borderRadius: '0px' }}>
            <UserPlus size={14} />
            <span>Create User Account</span>
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--color-border-default)', margin: '16px 0' }} />

        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <Key size={16} style={{ color: 'var(--color-accent-base)' }} /> CHANGE YOUR PASSWORD
        </div>

        {!showChangePw ? (
          <button onClick={() => { requireReauth(() => setShowChangePw(true), 'Confirm identity to change password'); }} className="desktop-btn" style={{ height: '32px', fontSize: '12px', width: '100%', gap: '6px' }}>
            <Key size={14} /> Change Password
          </button>
        ) : (
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Current Password</label>
              <input type="password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>New Password</label>
              <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={4} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={isChangingPw} className="desktop-btn-primary" style={{ height: '32px', fontSize: '12px', flex: 1, gap: '6px' }}>
                {isChangingPw ? 'Saving...' : 'Update Password'}
              </button>
              <button type="button" onClick={() => { setShowChangePw(false); setOldPassword(''); setNewPassword(''); }} className="desktop-btn" style={{ height: '32px', fontSize: '12px' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
        </React.Fragment>
      ) : (
        <div style={{ padding: '20px 10px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
          Select user accounts to manage access credentials.
        </div>
      )}
    </div>
  );

  return (
    <React.Fragment>
      <SplitPane
        primaryPane={primaryContent}
        inspectorPane={inspectorContent}
        inspectorTitle="ADMIN INSPECTOR"
        inspectorWidth="320px"
      />
      <ReAuthDialog
        isOpen={isReauthOpen}
        userId={user!.id}
        title={reauthTitle}
        onVerified={() => {
          setIsReauthOpen(false);
          reauthAction?.();
        }}
        onCancel={() => {
          setIsReauthOpen(false);
          setReauthAction(null);
        }}
      />
    </React.Fragment>
  );
};
