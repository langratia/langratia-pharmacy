import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PermissionProvider } from './context/PermissionContext';
import { ThemeProvider } from './context/ThemeContext';
import { PharmacyProvider } from './context/PharmacyContext';
import { LoginPage } from './features/auth/LoginPage';
import { MainLayout } from './components/layout/MainLayout';
import { NavItemKey } from './components/layout/Sidebar';
import { CommandPalette } from './components/ui/CommandPalette';
import { IdleTimer } from './components/ui/IdleTimer';
import { loadCurrency } from './utils/currency';

import { DashboardPage } from './features/dashboard/DashboardPage';
import { POSPage } from './features/pos/POSPage';
import { InventoryPage } from './features/inventory/InventoryPage';
import { PurchasesPage } from './features/purchases/PurchasesPage';
import { SuppliersPage } from './features/suppliers/SuppliersPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { PrescriptionsPage } from './features/prescriptions/PrescriptionsPage';

const SESSION_IDLE_TIMEOUT_MINUTES = 15;

const MainApp: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<NavItemKey>('dashboard');
  const [inventoryFilter, setInventoryFilter] = useState<string>('all');
  const [posCartItems, setPosCartItems] = useState<any[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => { loadCurrency(); }, []);

  // Set default view based on user role
  useEffect(() => {
    if (user?.role === 'cashier') {
      setActiveView('pos');
    } else {
      setActiveView('dashboard');
    }
  }, [user]);

  const handleSelectView = (view: NavItemKey, filter?: string) => {
    if (filter) setInventoryFilter(filter);
    setActiveView(view);
  };

  // Global Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!user) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardPage onSelectView={handleSelectView} />;
      case 'pos':
        return (
          <POSPage
            externalCartItems={posCartItems}
            onClearExternalCart={() => setPosCartItems([])}
          />
        );
      case 'prescriptions':
        return (
          <PrescriptionsPage
            onSelectView={(v) => handleSelectView(v)}
            onLoadPrescriptionToPOS={(items) => setPosCartItems(items)}
          />
        );
      case 'inventory':
        return <InventoryPage initialFilter={inventoryFilter} onFilterChange={setInventoryFilter} />;
      case 'purchases':
        return <PurchasesPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onSelectView={handleSelectView} />;
    }
  };

  return (
    <>
      <MainLayout activeView={activeView} onSelectView={(v) => handleSelectView(v)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ height: '100%' }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </MainLayout>

      <IdleTimer timeoutMinutes={SESSION_IDLE_TIMEOUT_MINUTES} onTimeout={logout} />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectView={(view) => {
          setActiveView(view);
          setIsCommandPaletteOpen(false);
        }}
      />
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <PharmacyProvider>
        <AuthProvider>
          <PermissionProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'var(--surface-soft)',
                  color: 'var(--ink)',
                  borderRadius: 'var(--r)',
                  border: '1px solid var(--line-strong)',
                  fontSize: '13px',
                  fontWeight: 500,
                  boxShadow: 'var(--shadow)',
                },
                success: {
                  iconTheme: {
                    primary: 'var(--green)',
                    secondary: 'rgba(20, 240, 109, 0.12)',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'var(--red)',
                    secondary: 'rgba(255, 56, 96, 0.12)',
                  },
                },
              }}
            />
            <MainApp />
          </PermissionProvider>
        </AuthProvider>
      </PharmacyProvider>
    </ThemeProvider>
  );
}

export default App;
