import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { MainLayout } from './components/layout/MainLayout';
import { NavItemKey } from './components/layout/Sidebar';
import { CommandPalette } from './components/ui/CommandPalette';

import { DashboardPage } from './features/dashboard/DashboardPage';
import { POSPage } from './features/pos/POSPage';
import { InventoryPage } from './features/inventory/InventoryPage';
import { PurchasesPage } from './features/purchases/PurchasesPage';
import { SuppliersPage } from './features/suppliers/SuppliersPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { PrescriptionsPage } from './features/prescriptions/PrescriptionsPage';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<NavItemKey>('dashboard');
  const [posCartItems, setPosCartItems] = useState<any[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Ctrl+K / ⌘K keyboard shortcut listener
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
        return <DashboardPage />;
      case 'pos':
        return <POSPage externalCartItems={posCartItems} onClearExternalCart={() => setPosCartItems([])} />;
      case 'prescriptions':
        return (
          <PrescriptionsPage 
            onSelectView={setActiveView} 
            onLoadPrescriptionToPOS={(items) => setPosCartItems(items)} 
          />
        );
      case 'inventory':
        return <InventoryPage />;
      case 'purchases':
        return <PurchasesPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      <MainLayout activeView={activeView} onSelectView={setActiveView}>
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
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1F2937',
            color: '#FFFFFF',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          },
          success: {
            iconTheme: {
              primary: '#0F8A6A',
              secondary: '#FFFFFF'
            }
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FFFFFF'
            }
          }
        }}
      />
      <MainApp />
    </AuthProvider>
  );
}

export default App;
