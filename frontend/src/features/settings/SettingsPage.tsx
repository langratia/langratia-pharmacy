import React, { useState, useEffect } from 'react';
import { Download, Shield, Users, Database, UserPlus, Network, Key, Edit3, Lock, Unlock, LogOut, RefreshCw, Activity, CheckSquare, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ListUsers, CreateUser, ExportDatabase, ListAuditLogs, ResetAndSeedDatabase, UpdateDatabaseConfig, AutoDiscoverServer, EnableMainServerMode, ChangePassword, AdminResetPassword, GetUser, UpdateUserInfo, ReactivateUser, LockUser, UnlockUser, ForceLogout, GetLoginHistory, GetUserActivity, GetRolePermissions, SetRolePermissions, GetAllPermissionDefs } from '../../../wailsjs/go/main/App';
import { models, services } from '../../../wailsjs/go/models';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { formatCurrency } from '../../utils/formatters';
import { Panel } from '../../components/ui/Panel';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { SplitPane } from '../../components/ui/SplitPane';
import { ReAuthDialog } from '../../components/ui/ReAuthDialog';
import { PharmacySetupTab } from './PharmacySetupTab';
import lanGuide from '../../assets/lan_setup_guide.png';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<'users' | 'backups' | 'audit' | 'network' | 'permissions' | 'pharmacy'>('users');
  
  // Users state
  const [users, setUsers] = useState<models.User[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'cashier', full_name: '', phone: '', email: '', branch: '' });
  
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

  // Edit user state
  const [editTarget, setEditTarget] = useState<models.User | null>(null);
  const [editForm, setEditForm] = useState({ role: 'cashier', full_name: '', phone: '', email: '', branch: '' });
  const [isEditing, setIsEditing] = useState(false);

  // Permissions state
  const [permDefs, setPermDefs] = useState<{ key: string; label: string; description: string }[]>([]);
  const [cashierPerms, setCashierPerms] = useState<Set<string>>(new Set());
  const [adminPerms, setAdminPerms] = useState<Set<string>>(new Set());
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  // User detail viewer state
  const [detailUser, setDetailUser] = useState<models.User | null>(null);
  const [loginHistory, setLoginHistory] = useState<models.LoginHistory[]>([]);
  const [userActivity, setUserActivity] = useState<models.AuditLog[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'permissions') {
      fetchPermissions();
    } else if (activeTab === 'pharmacy') {
      // Pharmacy setup tab uses its own internal data fetching
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
      await CreateUser(newUser.username, newUser.password, newUser.role, newUser.full_name, newUser.phone, newUser.email, newUser.branch, user!.id);
      toast.success('User created successfully');
      setNewUser({ username: '', password: '', role: 'cashier', full_name: '', phone: '', email: '', branch: '' });
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

  const handleEditUser = (u: models.User) => {
    setEditTarget(u);
    setEditForm({ role: u.role, full_name: u.full_name, phone: u.phone || '', email: u.email || '', branch: u.branch || '' });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !user) return;
    setIsEditing(true);
    try {
      await UpdateUserInfo(editTarget.id, editForm.role, editForm.full_name, editForm.phone, editForm.email, editForm.branch, user.id);
      toast.success(`User ${editTarget.username} updated`);
      setEditTarget(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user');
    } finally {
      setIsEditing(false);
    }
  };

  const handleReactivateUser = async (uId: number, username: string) => {
    if (!user) return;
    if (!window.confirm(`Reactivate user "${username}"?`)) return;
    try {
      await ReactivateUser(uId, user.id);
      toast.success(`User ${username} reactivated`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reactivate user');
    }
  };

  const handleLockUser = async (uId: number, username: string) => {
    if (!user) return;
    if (!window.confirm(`Lock user account "${username}"?`)) return;
    try {
      await LockUser(uId, user.id);
      toast.success(`User ${username} locked`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to lock user');
    }
  };

  const handleUnlockUser = async (uId: number, username: string) => {
    if (!user) return;
    try {
      await UnlockUser(user.id, uId);
      toast.success(`User ${username} unlocked`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlock user');
    }
  };

  const handleForceLogout = async (uId: number, username: string) => {
    if (!user) return;
    if (!window.confirm(`Force logout user "${username}"?`)) return;
    try {
      await ForceLogout(uId, user.id);
      toast.success(`User ${username} force-logged out`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to force logout');
    }
  };

  const fetchPermissions = async () => {
    try {
      const defs = await GetAllPermissionDefs();
      setPermDefs(defs || []);
      const [cashier, admin] = await Promise.all([
        GetRolePermissions('cashier'),
        GetRolePermissions('admin'),
      ]);
      setCashierPerms(new Set(cashier || []));
      setAdminPerms(new Set(admin || []));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load permissions');
    }
  };

  const handleTogglePerm = (role: 'admin' | 'cashier', perm: string) => {
    if (role === 'admin') {
      const next = new Set(adminPerms);
      if (next.has(perm)) next.delete(perm); else next.add(perm);
      setAdminPerms(next);
    } else {
      const next = new Set(cashierPerms);
      if (next.has(perm)) next.delete(perm); else next.add(perm);
      setCashierPerms(next);
    }
  };

  const handleSavePermissions = async () => {
    if (!user) return;
    setIsSavingPerms(true);
    try {
      await Promise.all([
        SetRolePermissions('admin', Array.from(adminPerms), user.id),
        SetRolePermissions('cashier', Array.from(cashierPerms), user.id),
      ]);
      toast.success('Permissions saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save permissions');
    } finally {
      setIsSavingPerms(false);
    }
  };

  const handleViewUserDetail = async (uId: number) => {
    if (!user) return;
    setIsLoadingDetail(true);
    try {
      const [u, history, activity] = await Promise.all([
        GetUser(uId, user.id),
        GetLoginHistory(uId, user.id),
        GetUserActivity(uId, 50, user.id),
      ]);
      setDetailUser(u);
      setLoginHistory(history || []);
      setUserActivity(activity || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load user details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const userColumns: Column<models.User>[] = [
    {
      key: 'id',
      header: 'ID',
      width: '5%',
      accessor: (u) => <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{u.id}</span>
    },
    {
      key: 'username',
      header: 'Username',
      width: '12%',
      accessor: (u) => <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.username}</span>
    },
    {
      key: 'full_name',
      header: 'Name',
      width: '14%',
      accessor: (u) => <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{u.full_name || '-'}</span>
    },
    {
      key: 'role',
      header: 'Role',
      width: '7%',
      accessor: (u) => {
        let bg = 'var(--color-bg-panel)';
        let border = 'var(--color-border-default)';
        let color = 'var(--color-text-secondary)';
        if (u.role === 'admin') { bg = 'var(--color-accent-subtle)'; border = 'var(--color-accent-base)'; color = 'var(--color-accent-base)'; }
        return <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: bg, border: `1px solid ${border}`, fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{u.role}</span>;
      }
    },
    {
      key: 'branch',
      header: 'Branch',
      width: '8%',
      accessor: (u) => <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{u.branch || '-'}</span>
    },
    {
      key: 'status',
      header: 'Status',
      width: '8%',
      accessor: (u) => {
        const isLocked = u.locked_until && new Date(u.locked_until) > new Date();
        const color = !u.active ? 'var(--color-danger-text)' : isLocked ? 'var(--color-warning-text)' : 'var(--color-success-text)';
        const label = !u.active ? 'Inactive' : isLocked ? 'Locked' : 'Active';
        return <span style={{ fontSize: '10px', color, fontWeight: 700 }}>{label}</span>;
      }
    },
    {
      key: 'last_login',
      header: 'Last Login',
      width: '12%',
      accessor: (u) => <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '-'}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '34%',
      align: 'right' as const,
      accessor: (u) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => handleEditUser(u)} style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 600 }}>
            <Edit3 size={11} />
          </button>
          <button type="button" onClick={() => handleViewUserDetail(u.id)} style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 600 }}>
            <Activity size={11} />
          </button>
          <button type="button" onClick={() => handleViewPerformance(u.id, u.username)} style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 600 }}>
            Sales
          </button>
          <button type="button" onClick={() => requireReauth(() => { setResetTargetUserId(u.id); setResetTargetUsername(u.username); setShowResetPwInput(true); }, 'Confirm identity to reset password')} style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 600 }}>
            <Key size={11} />
          </button>
          {!u.active ? (
            <button type="button" onClick={() => handleReactivateUser(u.id, u.username)} style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', color: 'var(--color-success-text)', cursor: 'pointer', fontWeight: 600 }}>
              <RefreshCw size={11} />
            </button>
          ) : (
            <button type="button" onClick={() => handleDeactivateUser(u.id, u.username)} disabled={u.username === user?.username} style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger-text)', cursor: u.username === user?.username ? 'not-allowed' : 'pointer', opacity: u.username === user?.username ? 0.5 : 1, fontWeight: 600 }}>
              Deac
            </button>
          )}
          {u.active && u.locked_until && new Date(u.locked_until) > new Date() ? (
            <button type="button" onClick={() => handleUnlockUser(u.id, u.username)} style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', color: 'var(--color-warning-text)', cursor: 'pointer', fontWeight: 600 }}>
              <Unlock size={11} />
            </button>
          ) : u.active ? (
            <button type="button" onClick={() => handleLockUser(u.id, u.username)} style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 600 }}>
              <Lock size={11} />
            </button>
          ) : null}
          {u.active && u.username !== user?.username && (
            <button type="button" onClick={() => handleForceLogout(u.id, u.username)} style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 600 }}>
              <LogOut size={11} />
            </button>
          )}
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
            {can('export_data') && (
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
            )}
            {can('view_audit_logs') && (
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
            )}
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
            {can('manage_users') && (
              <button
                onClick={() => setActiveTab('permissions')}
                style={{
                  height: '36px',
                  fontSize: '12px',
                  fontWeight: 600,
                  justifyContent: 'flex-start',
                  gap: '8px',
                  padding: '0 12px',
                  borderRadius: '0px',
                  backgroundColor: activeTab === 'permissions' ? 'var(--color-accent-subtle)' : 'transparent',
                  border: activeTab === 'permissions' ? '1px solid var(--color-accent-base)' : '1px solid transparent',
                  color: activeTab === 'permissions' ? 'var(--color-accent-base)' : 'var(--color-text-secondary)'
                }}
              >
                <CheckSquare size={14} /> Permissions
              </button>
            )}
            {can('manage_settings') && (
              <button
                onClick={() => setActiveTab('pharmacy')}
                style={{
                  height: '36px',
                  fontSize: '12px',
                  fontWeight: 600,
                  justifyContent: 'flex-start',
                  gap: '8px',
                  padding: '0 12px',
                  borderRadius: '0px',
                  backgroundColor: activeTab === 'pharmacy' ? 'var(--color-accent-subtle)' : 'transparent',
                  border: activeTab === 'pharmacy' ? '1px solid var(--color-accent-base)' : '1px solid transparent',
                  color: activeTab === 'pharmacy' ? 'var(--color-accent-base)' : 'var(--color-text-secondary)'
                }}
              >
                <Building2 size={14} /> Pharmacy Setup
              </button>
            )}
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
              isInspectorOpen={!!selectedUserPerf || !!detailUser}
              inspectorTitle={
                selectedUserPerf ? `Performance: ${selectedUserName}` :
                detailUser ? `Detail: ${detailUser.username}` : ''
              }
              onToggleInspector={() => { setSelectedUserPerf(null); setDetailUser(null); }}
              inspectorWidth="380px"
              inspectorPane={
                selectedUserPerf ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
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
                        <span style={{ fontWeight: 700 }}>UGX {formatCurrency(selectedUserPerf.this_week.total_revenue)}</span>
                      </div>
                    </div>
                    <div style={{ padding: '12px', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-base)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--color-text-primary)' }}>This Month</h4>
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
                        <span style={{ fontWeight: 700 }}>UGX {formatCurrency(selectedUserPerf.this_month.total_revenue)}</span>
                      </div>
                    </div>
                  </div>
                ) : detailUser ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', height: '100%', overflow: 'auto' }}>
                    <div style={{ padding: '12px', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-base)' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--color-text-primary)' }}>Account Info</h4>
                      <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><span style={{ color: 'var(--color-text-muted)' }}>ID:</span> <span style={{ fontWeight: 600, marginLeft: '8px' }}>{detailUser.id}</span></div>
                        <div><span style={{ color: 'var(--color-text-muted)' }}>Username:</span> <span style={{ fontWeight: 600, marginLeft: '8px' }}>{detailUser.username}</span></div>
                        <div><span style={{ color: 'var(--color-text-muted)' }}>Role:</span> <span style={{ fontWeight: 600, marginLeft: '8px' }}>{detailUser.role}</span></div>
                        <div><span style={{ color: 'var(--color-text-muted)' }}>Status:</span> <span style={{ fontWeight: 600, marginLeft: '8px', color: detailUser.active ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>{detailUser.active ? 'Active' : 'Inactive'}</span></div>
                        {detailUser.locked_until && new Date(detailUser.locked_until) > new Date() && <div><span style={{ color: 'var(--color-text-muted)' }}>Locked until:</span> <span style={{ fontWeight: 600, marginLeft: '8px', color: 'var(--color-warning-text)' }}>{new Date(detailUser.locked_until).toLocaleString()}</span></div>}
                        <div><span style={{ color: 'var(--color-text-muted)' }}>Created:</span> <span style={{ marginLeft: '8px' }}>{new Date(detailUser.created_at).toLocaleDateString()}</span></div>
                        <div><span style={{ color: 'var(--color-text-muted)' }}>Last Login:</span> <span style={{ marginLeft: '8px' }}>{detailUser.last_login_at ? new Date(detailUser.last_login_at).toLocaleString() : 'Never'}</span></div>
                        <div><span style={{ color: 'var(--color-text-muted)' }}>Last Workstation:</span> <span style={{ marginLeft: '8px' }}>{detailUser.last_workstation || '-'}</span></div>
                        <div><span style={{ color: 'var(--color-text-muted)' }}>Branch:</span> <span style={{ marginLeft: '8px' }}>{detailUser.branch || '-'}</span></div>
                      </div>
                    </div>

                    <div style={{ padding: '12px', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-base)' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--color-text-primary)' }}>Login History</h4>
                      {loginHistory.length === 0 ? <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>No login history</div> : (
                        <div style={{ fontSize: '10px', maxHeight: '180px', overflow: 'auto' }}>
                          {loginHistory.map(h => (
                            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--color-border-default)' }}>
                              <span>
                                {h.action === 'login' ? '🔓' : h.action === 'logout' ? '🔒' : '⚠️'} {h.action}
                              </span>
                              <span style={{ color: 'var(--color-text-muted)' }}>{new Date(h.created_at).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '12px', border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-base)' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--color-text-primary)' }}>User Activity</h4>
                      {userActivity.length === 0 ? <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>No activity recorded</div> : (
                        <div style={{ fontSize: '10px', maxHeight: '200px', overflow: 'auto' }}>
                          {userActivity.map(a => (
                            <div key={a.id} style={{ padding: '3px 0', borderBottom: '1px solid var(--color-border-default)' }}>
                              <div><span style={{ fontWeight: 600 }}>{a.action}</span></div>
                              <div style={{ color: 'var(--color-text-muted)' }}>{a.details} — {new Date(a.timestamp).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      )}
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

          {activeTab === 'permissions' && (
            <Panel title="ROLE PERMISSIONS" style={{ height: '100%', overflow: 'auto' }}>
              <div style={{ padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--color-text-primary)' }}>
                  Configure which features each role can access
                </div>
                {isSavingPerms && <div style={{ fontSize: '11px', color: 'var(--color-accent-base)', marginBottom: '8px' }}>Saving...</div>}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                      <th style={{ textAlign: 'left', padding: '8px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Permission</th>
                      <th style={{ textAlign: 'center', padding: '8px', fontWeight: 700, color: 'var(--color-accent-base)', width: '80px' }}>Admin</th>
                      <th style={{ textAlign: 'center', padding: '8px', fontWeight: 700, color: 'var(--color-text-secondary)', width: '80px' }}>Cashier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permDefs.map(pd => (
                      <tr key={pd.key} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{pd.label}</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{pd.description}</div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px' }}>
                          <input type="checkbox" checked={adminPerms.has(pd.key)} onChange={() => handleTogglePerm('admin', pd.key)} style={{ cursor: 'pointer' }} />
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px' }}>
                          <input type="checkbox" checked={cashierPerms.has(pd.key)} onChange={() => handleTogglePerm('cashier', pd.key)} style={{ cursor: 'pointer' }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={handleSavePermissions} disabled={isSavingPerms} className="desktop-btn-primary" style={{ height: '32px', fontSize: '12px' }}>
                    {isSavingPerms ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {activeTab === 'pharmacy' && (
            <Panel title="PHARMACY SETUP" style={{ height: '100%', overflow: 'hidden' }}>
              <div style={{ padding: '16px', height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                <PharmacySetupTab />
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
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Phone</label>
            <input type="text" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Email</label>
            <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Branch</label>
            <input type="text" value={newUser.branch} onChange={e => setNewUser({ ...newUser, branch: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
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

        {editTarget && (
          <>
            <div style={{ borderTop: '1px solid var(--color-border-default)', margin: '16px 0' }} />
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit3 size={16} style={{ color: 'var(--color-accent-base)' }} /> EDIT USER: {editTarget.username}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Full Name *</label>
                <input type="text" required value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Phone</label>
                <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Branch</label>
                <input type="text" value={editForm.branch} onChange={e => setEditForm({ ...editForm, branch: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Role</label>
                <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} style={{ width: '100%', height: '28px', padding: '0 8px', borderRadius: '0px', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}>
                  <option value="cashier">Cashier</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" disabled={isEditing} className="desktop-btn-primary" style={{ height: '32px', fontSize: '12px', flex: 1 }}>{isEditing ? 'Saving...' : 'Save Changes'}</button>
                <button type="button" onClick={() => setEditTarget(null)} className="desktop-btn" style={{ height: '32px', fontSize: '12px' }}>Cancel</button>
              </div>
            </form>
          </>
        )}

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
