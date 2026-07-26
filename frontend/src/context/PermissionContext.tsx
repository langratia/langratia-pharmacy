import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { HasPermission } from '../../wailsjs/go/main/App';

interface PermissionContextType {
  can: (permission: string) => boolean;
  hasPermission: (permission: string) => Promise<boolean>;
  permissions: Set<string>;
  isLoading: boolean;
}

const PermissionContext = createContext<PermissionContextType>({
  can: () => false,
  hasPermission: async () => false,
  permissions: new Set(),
  isLoading: true,
});

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions(new Set());
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const adminPerms = [
      'view_dashboard', 'create_sale', 'edit_sale', 'void_sale', 'refund_sale',
      'apply_discount', 'view_inventory', 'edit_inventory', 'stock_receiving',
      'view_reports', 'export_data', 'print_receipt', 'manage_users',
      'manage_suppliers', 'manage_prescriptions', 'dispense_prescription',
      'approve_transactions', 'view_audit_logs', 'access_settings',
    ];

    if (user.role === 'admin') {
      setPermissions(new Set(adminPerms));
      setIsLoading(false);
      return;
    }

    const cashierPerms = [
      'create_sale', 'view_inventory', 'print_receipt',
      'manage_prescriptions', 'dispense_prescription',
    ];
    setPermissions(new Set(cashierPerms));
    setIsLoading(false);
  }, [user]);

  const hasPermission = async (permission: string): Promise<boolean> => {
    if (!user) return false;
    try {
      return await HasPermission(user.id, permission);
    } catch {
      return false;
    }
  };

  const can = (permission: string): boolean => {
    return permissions.has(permission);
  };

  return (
    <PermissionContext.Provider value={{ can, hasPermission, permissions, isLoading }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionContext);
