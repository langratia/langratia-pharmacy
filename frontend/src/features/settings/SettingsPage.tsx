import React, { useState, useEffect } from 'react';
import { Download, Shield, Users, Database, UserPlus, Network, Key, Edit3, Lock, Unlock, LogOut, RefreshCw, Activity, CheckSquare, Building2, BarChart2, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  ListUsers, CreateUser, ExportDatabase, ListAuditLogs, ResetAndSeedDatabase, ClearSampleData,
  AutoDiscoverServer, EnableMainServerMode, ChangePassword, AdminResetPassword, GetUser, UpdateUserInfo,
  ReactivateUser, LockUser, UnlockUser, ForceLogout, GetLoginHistory, GetUserActivity, GetRolePermissions,
  SetRolePermissions, GetAllPermissionDefs, DeactivateUser, GetCashierPerformance,
  GetNetworkStatus, UpdateDatabaseConfig, GetDBConnectionStatus, GetWorkstationName
} from '../../../wailsjs/go/main/App';
import { models, services } from '../../../wailsjs/go/models';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { formatCurrency } from '../../utils/formatters';
import { Panel } from '../../components/ui/Panel';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { SplitPane } from '../../components/ui/SplitPane';
import { ReAuthDialog } from '../../components/ui/ReAuthDialog';
import { PharmacySetupTab } from './PharmacySetupTab';

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--ink)',
  background: 'none',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  textAlign: 'left',
  minHeight: 'unset'
};

const UserActionsMenu: React.FC<{
  u: models.User;
  currentUser: any;
  onEdit: (u: models.User) => void;
  onActivity: (id: number) => void;
  onStats: (id: number, username: string) => void;
  onResetPw: (u: models.User) => void;
  onDeactivate: (id: number, username: string) => void;
  onReactivate: (id: number, username: string) => void;
}> = ({ u, currentUser, onEdit, onActivity, onStats, onResetPw, onDeactivate, onReactivate }) => {
  const [open, setOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => onEdit(u)}
          className="btn"
          style={{ height: '30px', padding: '0 10px', fontSize: '12px', gap: '4px', minHeight: 'unset' }}
        >
          <Edit3 size={13} /> Edit
        </button>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="btn"
          style={{ height: '30px', padding: '0 8px', fontSize: '13px', minHeight: 'unset', fontWeight: 700 }}
          title="More Actions"
        >
          •••
        </button>
      </div>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '34px',
          width: '185px',
          background: 'var(--surface)',
          border: '1px solid var(--line-strong)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          padding: '4px'
        }}>
          <button
            type="button"
            onClick={() => { setOpen(false); onStats(u.id, u.username); }}
            style={menuItemStyle}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-soft)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <BarChart2 size={14} style={{ color: 'var(--blue)' }} /> View Sales Stats
          </button>

          <button
            type="button"
            onClick={() => { setOpen(false); onActivity(u.id); }}
            style={menuItemStyle}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-soft)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Activity size={14} style={{ color: '#06b6d4' }} /> Activity Logs
          </button>

          <button
            type="button"
            onClick={() => { setOpen(false); onResetPw(u); }}
            style={menuItemStyle}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-soft)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Key size={14} style={{ color: '#eab308' }} /> Reset Password
          </button>

          <div style={{ height: '1px', background: 'var(--line)', margin: '4px 0' }} />

          {!u.active ? (
            <button
              type="button"
              onClick={() => { setOpen(false); onReactivate(u.id, u.username); }}
              style={{ ...menuItemStyle, color: 'var(--green)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <RefreshCw size={14} /> Reactivate User
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setOpen(false); onDeactivate(u.id, u.username); }}
              disabled={u.username === currentUser?.username}
              style={{ ...menuItemStyle, color: 'var(--red)', opacity: u.username === currentUser?.username ? 0.4 : 1 }}
              onMouseEnter={e => { if (u.username !== currentUser?.username) e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Trash2 size={14} /> Deactivate User
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<'users' | 'backups' | 'audit' | 'network' | 'permissions' | 'pharmacy'>('users');
  
  // Users state
  const [users, setUsers] = useState<models.User[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'cashier', full_name: '', phone: '', email: '', branch: '' });
  
  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<models.AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Network State
  const [isScanning, setIsScanning] = useState(false);
  const [isEnablingHost, setIsEnablingHost] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [manualPath, setManualPath] = useState('');
  const [isSavingPath, setIsSavingPath] = useState(false);
  const [computerName, setComputerName] = useState('unknown');

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

  const fetchNetworkStatus = async () => {
    try {
      const [status, name] = await Promise.all([
        GetDBConnectionStatus(),
        GetWorkstationName()
      ]);
      setDbStatus(status);
      setManualPath(status.configured_path);
      setComputerName(name);
    } catch (err: any) {
      toast.error('Failed to load network status');
    }
  };

  const handleSaveDatabasePath = async () => {
    if (!manualPath.trim()) {
      toast.error('Database path cannot be empty');
      return;
    }
    setIsSavingPath(true);
    const loadingToast = toast.loading('Applying database path configuration...');
    try {
      await UpdateDatabaseConfig(manualPath.trim());
      toast.success('Database configuration updated! Please restart the application to apply.', { id: loadingToast, duration: 6000 });
      fetchNetworkStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update database path', { id: loadingToast });
    } finally {
      setIsSavingPath(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'permissions') {
      fetchPermissions();
    } else if (activeTab === 'network') {
      fetchNetworkStatus();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    if (!user) return;
    try {
      const data = await ListUsers(user.id);
      setUsers(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load users');
    }
  };

  const fetchAuditLogs = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await ListAuditLogs(100, user.id);
      setAuditLogs(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const requireReauth = (action: () => void, title: string) => {
    setReauthAction(() => action);
    setReauthTitle(title);
    setIsReauthOpen(true);
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

  const handleExportDB = () => {
    requireReauth(async () => {
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
    }, 'Confirm identity to export database');
  };

  const handleResetSeedDB = () => {
    if (!user || user.role !== 'admin') return;
    if (!window.confirm('WARNING: Reset & Seed Database will wipe all existing data and create demo records. Continue?')) return;
    requireReauth(async () => {
      try {
        setIsLoading(true);
        await ResetAndSeedDatabase(user.id);
        toast.success('Database reset & seeded with demo data');
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || 'Reset failed');
      } finally {
        setIsLoading(false);
      }
    }, 'Confirm identity to reset database');
  };

  const handleClearSampleData = () => {
    if (!user || user.role !== 'admin') return;
    if (!window.confirm('WARNING: Permanently delete all sample medicines, sales, and prescriptions? Continue?')) return;
    requireReauth(async () => {
      try {
        setIsLoading(true);
        await ClearSampleData(user.id);
        toast.success('Sample data cleared successfully!');
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || 'Wipe failed');
      } finally {
        setIsLoading(false);
      }
    }, 'Confirm identity to clear sample data');
  };

  const handleDeactivateUser = async (uId: number, username: string) => {
    if (user?.role !== 'admin') return toast.error('Admin permission required');
    if (username === user.username) return toast.error('Cannot deactivate your own active session');
    if (!window.confirm(`Deactivate user "${username}"?`)) return;

    try {
      setIsLoading(true);
      await DeactivateUser(uId, user.id);
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
      const perf = await GetCashierPerformance(uId);
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
      const path = await AutoDiscoverServer();
      toast.success(`Server found at ${path}! Please restart the application.`, { id: loadingToast, duration: 6000 });
    } catch (err: any) {
      toast.error(err.message || 'No server found on the network. Is the Main Server running?', { id: loadingToast, duration: 6000 });
    } finally {
      setIsScanning(false);
    }
  };

  const handleEnableHost = async () => {
    if (!user) return;
    setIsEnablingHost(true);
    const loadingToast = toast.loading('Configuring Main Server mode...');
    try {
      await EnableMainServerMode(user.id);
      toast.success('Main Server mode enabled! Visible to Cashier PCs.', { id: loadingToast, duration: 6000 });
    } catch (err: any) {
      toast.error(err.message || 'Failed to enable Main Server mode.', { id: loadingToast });
    } finally {
      setIsEnablingHost(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsChangingPw(true);
    try {
      await ChangePassword(user.id, oldPassword, newPassword);
      toast.success('Password changed successfully');
      setOldPassword(''); setNewPassword(''); setShowChangePw(false);
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
      setResetTargetUserId(null); setResetTargetUsername(''); setResetNewPassword(''); setShowResetPwInput(false);
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
      toast.success('Permissions saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save permissions');
    } finally {
      setIsSavingPerms(false);
    }
  };

  const handleViewUserDetail = async (uId: number) => {
    if (!user) return;
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
    }
  };

  const actionBtnStyle: React.CSSProperties = {
    padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--line)',
    background: 'var(--surface-soft)', color: 'var(--ink)', fontSize: '11px',
    fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px',
    minHeight: 'unset', height: 'auto', transform: 'none', boxShadow: 'none',
  };

  const userColumns: Column<models.User>[] = [
    {
      key: 'id', header: 'ID', width: '5%',
      accessor: (u) => <span style={{ fontSize: '11px', color: 'var(--muted)' }}>#{u.id}</span>
    },
    {
      key: 'username', header: 'Username', width: '15%',
      accessor: (u) => <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{u.username}</span>
    },
    {
      key: 'full_name', header: 'Name', width: '15%',
      accessor: (u) => <span style={{ fontSize: '12px', color: 'var(--ink)' }}>{u.full_name || '—'}</span>
    },
    {
      key: 'role', header: 'Role', width: '10%',
      accessor: (u) => (
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase',
          background: u.role === 'admin' ? 'rgba(18,108,255,0.12)' : 'var(--surface-soft)',
          color: u.role === 'admin' ? 'var(--blue)' : 'var(--muted)',
          border: `1px solid ${u.role === 'admin' ? 'rgba(18,108,255,0.3)' : 'var(--line)'}`,
        }}>
          {u.role}
        </span>
      )
    },
    {
      key: 'status', header: 'Status', width: '10%',
      accessor: (u) => {
        const isLocked = u.locked_until && new Date(u.locked_until) > new Date();
        const color = !u.active ? 'var(--red)' : isLocked ? 'var(--yellow)' : 'var(--green)';
        const label = !u.active ? 'Inactive' : isLocked ? 'Locked' : 'Active';
        return <span style={{ fontSize: '11px', fontWeight: 700, color }}>● {label}</span>;
      }
    },
    {
      key: 'last_login', header: 'Last Login', width: '15%',
      accessor: (u) => <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}</span>
    },
    {
      key: 'actions', header: 'Actions', width: '25%', align: 'right' as const,
      accessor: (u) => (
        <UserActionsMenu
          u={u}
          currentUser={user}
          onEdit={handleEditUser}
          onActivity={handleViewUserDetail}
          onStats={handleViewPerformance}
          onResetPw={(target) => requireReauth(() => { setResetTargetUserId(target.id); setResetTargetUsername(target.username); setShowResetPwInput(true); }, 'Confirm identity to reset password')}
          onDeactivate={handleDeactivateUser}
          onReactivate={handleReactivateUser}
        />
      )
    }
  ];

  const auditColumns: Column<models.AuditLog>[] = [
    {
      key: 'timestamp', header: 'Timestamp', width: '22%',
      accessor: (log) => <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(log.timestamp).toLocaleString()}</span>
    },
    {
      key: 'username', header: 'Operator', width: '18%',
      accessor: (log) => <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{log.username}</span>
    },
    {
      key: 'action', header: 'System Action', width: '25%',
      accessor: (log) => <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{log.action}</span>
    },
    {
      key: 'details', header: 'Details', width: '35%',
      accessor: (log) => <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{log.details}</span>
    }
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '34px', padding: '0 10px', borderRadius: 'var(--r)',
    border: '1px solid var(--line)', backgroundColor: 'var(--surface-soft)',
    color: 'var(--ink)', boxSizing: 'border-box', fontSize: '13px', outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)',
    marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  const navTabBtn = (tabKey: typeof activeTab, label: string, icon: React.ReactNode) => {
    const isActive = activeTab === tabKey;
    return (
      <button
        onClick={() => setActiveTab(tabKey)}
        style={{
          height: '38px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center',
          gap: '10px', padding: '0 14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s ease',
          background: isActive ? 'var(--surface)' : 'transparent',
          border: isActive ? '1px solid var(--blue)' : '1px solid transparent',
          color: isActive ? 'var(--blue)' : 'var(--muted)',
          boxShadow: isActive ? 'var(--shadow)' : 'none',
          minHeight: 'unset', transform: 'none',
        }}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* Navigation Categories Header Strip — STICKY PINNED TOP */}
      <div style={{ display: 'flex', gap: '8px', padding: '4px', background: 'var(--surface-soft)', borderRadius: 'var(--r2)', border: '1px solid var(--line)', flexShrink: 0 }}>
        {navTabBtn('users', 'User Accounts', <Users size={15} />)}
        {can('export_data') && navTabBtn('backups', 'DB & Backups', <Database size={15} />)}
        {can('view_audit_logs') && navTabBtn('audit', 'Audit Logs', <Shield size={15} />)}
        {navTabBtn('network', 'Network Setup', <Network size={15} />)}
        {can('manage_users') && navTabBtn('permissions', 'Permissions', <CheckSquare size={15} />)}
        {can('manage_settings') && navTabBtn('pharmacy', 'Pharmacy Setup', <Building2 size={15} />)}
      </div>

      {/* Main Content Area — SCROLLABLE BODY */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: '4px' }}>

        {/* ── TAB: USERS ── */}
        {activeTab === 'users' && (
          <div style={{ flex: 1, display: 'flex', gap: '16px', minHeight: 0, overflow: 'hidden' }}>
            
            {/* User List DataGrid */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: '10px' }}>
              {showResetPwInput && resetTargetUserId !== null && (
                <div style={{ padding: '10px 16px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, color: 'var(--yellow)' }}>Reset password for <strong>{resetTargetUsername}</strong>:</span>
                  <input
                    type="password"
                    value={resetNewPassword}
                    onChange={e => setResetNewPassword(e.target.value)}
                    placeholder="New password (min 4 chars)"
                    style={{ ...inputStyle, height: '30px', flex: 1 }}
                  />
                  <button onClick={handleAdminResetPassword} disabled={isResettingPw || resetNewPassword.length < 4} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }}>Apply</button>
                  <button onClick={() => { setShowResetPwInput(false); setResetNewPassword(''); }} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>Cancel</button>
                </div>
              )}

              <Panel noPadding style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <DataGrid
                  columns={userColumns}
                  data={users}
                  keyExtractor={(u) => u.id}
                  isLoading={isLoading}
                  compactRows={true}
                  zebraStriping={true}
                  style={{ flex: 1, height: '100%' }}
                />
              </Panel>
            </div>

            {/* Right Inspector Drawer / Create User form */}
            <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', padding: '16px', overflowY: 'auto', boxShadow: 'var(--shadow)', flexShrink: 0 }}>
              
              {/* Performance Stats view */}
              {selectedUserPerf ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>Sales: {selectedUserName}</h4>
                    <button onClick={() => setSelectedUserPerf(null)} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>Close</button>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--surface-soft)', borderRadius: 'var(--r)', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '6px' }}>TODAY</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--blue)' }}>UGX {formatCurrency(selectedUserPerf.today.total_revenue)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{selectedUserPerf.today.total_sales} transactions · {selectedUserPerf.today.items_sold} items</div>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--surface-soft)', borderRadius: 'var(--r)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '6px' }}>THIS MONTH</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--green)' }}>UGX {formatCurrency(selectedUserPerf.this_month.total_revenue)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{selectedUserPerf.this_month.total_sales} transactions</div>
                  </div>
                </div>
              ) : detailUser ? (
                /* Detail User view */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>User: {detailUser.username}</h4>
                    <button onClick={() => setDetailUser(null)} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>Close</button>
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', background: 'var(--surface-soft)', borderRadius: 'var(--r)' }}>
                    <div><span style={{ color: 'var(--muted)' }}>Role:</span> <strong>{detailUser.role}</strong></div>
                    <div><span style={{ color: 'var(--muted)' }}>Full Name:</span> <strong>{detailUser.full_name || '—'}</strong></div>
                    <div><span style={{ color: 'var(--muted)' }}>Branch:</span> <strong>{detailUser.branch || '—'}</strong></div>
                    <div><span style={{ color: 'var(--muted)' }}>Last Login:</span> <strong>{detailUser.last_login_at ? new Date(detailUser.last_login_at).toLocaleString() : 'Never'}</strong></div>
                  </div>
                </div>
              ) : (
                /* Create User form */
                <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', borderBottom: '1px solid var(--line)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserPlus size={15} style={{ color: 'var(--blue)' }} /> Create User Account
                  </div>
                  <div>
                    <label style={labelStyle}>Full Name *</label>
                    <input type="text" required value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Username *</label>
                    <input type="text" required value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Password *</label>
                    <input type="password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Branch</label>
                    <input type="text" value={newUser.branch} onChange={e => setNewUser({ ...newUser, branch: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Role Privilege</label>
                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={inputStyle}>
                      <option value="cashier">Cashier</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', marginTop: '4px' }}>
                    Create Account
                  </button>
                </form>
              )}



              {/* Password change block */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', marginTop: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={14} style={{ color: 'var(--blue)' }} /> Change Your Password
                </div>
                {!showChangePw ? (
                  <button onClick={() => requireReauth(() => setShowChangePw(true), 'Confirm identity to change password')} className="btn btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '12px' }}>
                    Change Password
                  </button>
                ) : (
                  <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input type="password" placeholder="Current Password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)} style={inputStyle} />
                    <input type="password" placeholder="New Password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={4} style={inputStyle} />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="submit" disabled={isChangingPw} className="btn btn-primary" style={{ flex: 1, padding: '6px', fontSize: '12px' }}>Update</button>
                      <button type="button" onClick={() => setShowChangePw(false)} className="btn btn-secondary" style={{ padding: '6px', fontSize: '12px' }}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ── TAB: AUDIT LOGS ── */}
        {activeTab === 'audit' && (
          <Panel noPadding style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <DataGrid
              columns={auditColumns}
              data={auditLogs}
              keyExtractor={(log) => log.id}
              isLoading={isLoading}
              compactRows={true}
              zebraStriping={true}
              style={{ flex: 1, height: '100%' }}
            />
          </Panel>
        )}

        {/* ── TAB: NETWORK SETUP ── */}
        {activeTab === 'network' && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <Panel title="LAN NETWORK SETUP & CONDUIT FEEDBACK">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
                
                {/* 1. Real-time Connection Status Dashboard */}
                <div style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid var(--line-strong)',
                  background: 'var(--surface-soft)',
                  boxShadow: 'var(--shadow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Current System Conduit Status
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
                      {dbStatus ? dbStatus.friendly_message : 'Checking Connection Status...'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>Active Database Connection Path:</span>
                      <code style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--line)', fontSize: '11px', wordBreak: 'break-all' }}>
                        {dbStatus ? dbStatus.active_path : '—'}
                      </code>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: !dbStatus ? 'rgba(100, 116, 139, 0.1)' : dbStatus.is_host ? 'rgba(59, 130, 246, 0.1)' : dbStatus.is_connected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: !dbStatus ? 'var(--muted)' : dbStatus.is_host ? 'var(--blue)' : dbStatus.is_connected ? 'var(--green)' : 'var(--red)',
                    fontSize: '20px',
                    fontWeight: 800
                  }}>
                    {!dbStatus ? '●' : dbStatus.is_host ? '🔵' : dbStatus.is_connected ? '🟢' : '🔴'}
                  </div>
                </div>

                {/* 2. Device Hostname Identifier card */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px'
                }}>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>This PC's Network Hostname:</span>{' '}
                    <strong style={{ color: 'var(--ink)', fontSize: '13px', fontFamily: 'monospace' }}>{computerName}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    Use this name to configure other terminals on the LAN.
                  </div>
                </div>

                {/* 3. Operational Mode Setup Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '20px', border: '1px solid var(--line)', borderRadius: 'var(--r2)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Database size={16} style={{ color: 'var(--blue)' }} /> 1. Main Server PC Mode
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, flex: 1 }}>
                      Enable Main Server mode to share this computer's database directory over the local network (LAN) for other Cashier PC Terminals.
                    </p>
                    <button onClick={handleEnableHost} disabled={isEnablingHost} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '12px' }}>
                      {isEnablingHost ? 'Configuring Server...' : 'Enable Server Mode'}
                    </button>
                  </div>

                  <div style={{ padding: '20px', border: '1px solid var(--line)', borderRadius: 'var(--r2)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} style={{ color: 'var(--yellow)' }} /> 2. Cashier Terminal Mode
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, flex: 1 }}>
                      Scan the local network (LAN) to automatically detect and connect this terminal with the active Main Server.
                    </p>
                    <button onClick={handleAutoDetect} disabled={isScanning} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
                      {isScanning ? 'Scanning Network...' : 'Auto-Detect Server'}
                    </button>
                  </div>
                </div>

                {/* 4. Manual Configuration Panel */}
                <div style={{
                  padding: '20px',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r2)',
                  background: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Edit3 size={16} style={{ color: 'var(--blue)' }} /> Manual Database Path Override
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                    In case automatic discovery fails, enter the network database UNC share path manually (e.g. <code>\\MAIN-PC-NAME\LangratiaData$\pharmacy.db</code>).
                  </p>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="e.g. \\DESKTOP-HOST-NAME\LangratiaData$\pharmacy.db"
                      value={manualPath}
                      onChange={(e) => setManualPath(e.target.value)}
                      style={inputStyle}
                    />
                    <button
                      onClick={handleSaveDatabasePath}
                      disabled={isSavingPath}
                      className="btn btn-primary"
                      style={{ padding: '0 16px', fontSize: '12px', whiteSpace: 'nowrap', minHeight: 'unset', height: '34px' }}
                    >
                      {isSavingPath ? 'Saving...' : 'Apply Path'}
                    </button>
                  </div>
                </div>

              </div>
            </Panel>
          </div>
        )}

        {/* ── TAB: PERMISSIONS ── */}
        {activeTab === 'permissions' && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <Panel title="ROLE PERMISSIONS">
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>Configure feature permissions per user role</span>
                  <button onClick={handleSavePermissions} disabled={isSavingPerms} className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }}>
                    {isSavingPerms ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)' }}>
                      <th style={{ textAlign: 'left', padding: '10px', color: 'var(--ink)' }}>Permission</th>
                      <th style={{ textAlign: 'center', padding: '10px', color: 'var(--blue)', width: '90px' }}>Admin</th>
                      <th style={{ textAlign: 'center', padding: '10px', color: 'var(--muted)', width: '90px' }}>Cashier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permDefs.map(pd => (
                      <tr key={pd.key} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{pd.label}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{pd.description}</div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>
                          <input type="checkbox" checked={adminPerms.has(pd.key)} onChange={() => handleTogglePerm('admin', pd.key)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>
                          <input type="checkbox" checked={cashierPerms.has(pd.key)} onChange={() => handleTogglePerm('cashier', pd.key)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        {/* ── TAB: PHARMACY SETUP ── */}
        {activeTab === 'pharmacy' && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <PharmacySetupTab />
          </div>
        )}

        {/* ── TAB: DB BACKUPS & MAINTENANCE ── */}
        {activeTab === 'backups' && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <Panel title="DATABASE BACKUP & RECOVERY">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', fontSize: '13px' }}>
                <div style={{ padding: '16px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <strong style={{ color: 'var(--ink)' }}>Export Database Snapshot (.db)</strong>
                  <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Creates a full standalone backup copy of all sales, medicines, batches, and user records.</span>
                  <div>
                    <button onClick={handleExportDB} disabled={isLoading} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12px', gap: '6px', marginTop: '6px' }}>
                      <Download size={14} /> <span>{isLoading ? 'Exporting...' : 'Export SQLite Backup'}</span>
                    </button>
                  </div>
                </div>

                {user?.role === 'admin' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ padding: '16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--r2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <strong style={{ color: 'var(--red)' }}>Clear All Sample Data (Start Clean)</strong>
                      <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Deletes all sample medicines, batches, sales, and prescriptions while preserving your user account.</span>
                      <div>
                        <button onClick={handleClearSampleData} className="btn btn-danger" style={{ padding: '8px 16px', fontSize: '12px', marginTop: '6px' }}>
                          Clear Sample Data
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: '16px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <strong style={{ color: 'var(--ink)' }}>Reset & Seed Demo Database</strong>
                      <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Reinstates demo dataset (~100 sample medicines) for testing and evaluation.</span>
                      <div>
                        <button onClick={handleResetSeedDB} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12px', marginTop: '6px' }}>
                          Reset & Seed Demo Database
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}

      </div>

      {/* ── MODAL: Edit User Details ──────────────────────────── */}
      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--r2)',
              width: '480px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: 'var(--shadow-dropdown)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(18,108,255,0.12)', border: '1px solid rgba(18,108,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
                  <Users size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                    Edit User: {editTarget.username}
                  </h2>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Update staff account details & access privileges</div>
                </div>
              </div>
              <button type="button" onClick={() => setEditTarget(null)} className="btn" style={{ padding: '4px 8px', minHeight: 'unset' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                  style={{ ...inputStyle, height: '38px' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Role Privilege</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  style={{ ...inputStyle, height: '38px' }}
                >
                  <option value="cashier">Cashier</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +256 700 000000"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    style={{ ...inputStyle, height: '38px' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Branch Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Branch"
                    value={editForm.branch}
                    onChange={e => setEditForm({ ...editForm, branch: e.target.value })}
                    style={{ ...inputStyle, height: '38px' }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. staff@pharmacy.com"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  style={{ ...inputStyle, height: '38px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setEditTarget(null)} className="btn">Cancel</button>
                <button type="submit" disabled={isEditing} className="btn btn-primary" style={{ gap: '6px' }}>
                  <Save size={14} />
                  <span>{isEditing ? 'Saving…' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ReAuth Dialog Modal */}
      <ReAuthDialog
        isOpen={isReauthOpen}
        userId={user?.id || 1}
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
    </div>
  );
};
