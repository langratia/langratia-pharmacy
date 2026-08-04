import React, { useState, useEffect, Suspense, lazy } from 'react';
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
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Loader } from 'lucide-react';

// Lazy load feature modules for performance
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then(module => ({ default: module.DashboardPage })));
const POSPage = lazy(() => import('./features/pos/POSPage').then(module => ({ default: module.POSPage })));
const InventoryPage = lazy(() => import('./features/inventory/InventoryPage').then(module => ({ default: module.InventoryPage })));
const PurchasesPage = lazy(() => import('./features/purchases/PurchasesPage').then(module => ({ default: module.PurchasesPage })));
const SuppliersPage = lazy(() => import('./features/suppliers/SuppliersPage').then(module => ({ default: module.SuppliersPage })));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then(module => ({ default: module.ReportsPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const PrescriptionsPage = lazy(() => import('./features/prescriptions/PrescriptionsPage').then(module => ({ default: module.PrescriptionsPage })));

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
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <Suspense fallback={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', color: 'var(--muted)' }}>
                <Loader size={24} className="animate-spin" />
              </div>
            }>
              {renderContent()}
            </Suspense>
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
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  borderRadius: '12px',
                  border: '1px solid var(--line)',
                  fontSize: '13px',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow)',
                },
                success: {
                  iconTheme: {
                    primary: '#2ECC71',
                    secondary: 'rgba(46, 204, 113, 0.15)',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: 'rgba(239, 68, 68, 0.15)',
                  },
                },
              }}
            />
            <ErrorBoundary>
              <MainApp />
            </ErrorBoundary>
          </PermissionProvider>
        </AuthProvider>
      </PharmacyProvider>
    </ThemeProvider>
  );
}

export default App;
