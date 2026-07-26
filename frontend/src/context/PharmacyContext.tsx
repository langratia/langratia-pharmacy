import React, { createContext, useContext, useState, useEffect } from 'react';
import { GetPharmacyConfig } from '../../wailsjs/go/main/App';
import { models } from '../../wailsjs/go/models';

interface PharmacyContextType {
  config: models.PharmacyConfig | null;
  pharmacyName: string;
  logoUrl: string;
  refreshConfig: () => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_CONFIG: models.PharmacyConfig = {
  pharmacy_name: 'Pharmacy POS',
  logo: '',
  address: '',
  phone: '',
  email: '',
  license_number: '',
  registration_number: '',
  tax_number: '',
  operating_hours: '',
  currency: 'UGX',
  date_format: 'DD/MM/YYYY',
  time_format: 'HH:mm',
  default_tax: 0,
  default_discount: 0,
  low_stock_threshold: 10,
  expiry_warning_days: 60,
  receipt_format: '',
  invoice_format: '',
  return_rules: '',
  numbering_formats: ''
};

const PharmacyContext = createContext<PharmacyContextType>({
  config: DEFAULT_CONFIG,
  pharmacyName: 'Pharmacy POS',
  logoUrl: '',
  refreshConfig: async () => {},
  isLoading: true,
});

export const PharmacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<models.PharmacyConfig | null>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      let data: models.PharmacyConfig | null = null;
      try {
        data = await GetPharmacyConfig(1);
      } catch {
        const wailsApp = (window as any)?.go?.main?.App;
        if (wailsApp && typeof wailsApp.GetPharmacyConfig === 'function') {
          data = await wailsApp.GetPharmacyConfig(1);
        }
      }
      if (data && data.pharmacy_name) {
        setConfig(data);
      }
    } catch {
      // Use fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const pharmacyName = config?.pharmacy_name?.trim() || 'Pharmacy POS';
  const logoUrl = config?.logo || '';

  return (
    <PharmacyContext.Provider value={{ config, pharmacyName, logoUrl, refreshConfig: fetchConfig, isLoading }}>
      {children}
    </PharmacyContext.Provider>
  );
};

export const usePharmacy = () => useContext(PharmacyContext);
