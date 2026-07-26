let currencySymbol = 'UGX';

let loadPromise: Promise<void> | null = null;

export function loadCurrency(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const wailsApp = (window as any)?.go?.main?.App;
      if (wailsApp?.GetCurrencySymbol) {
        const sym = await wailsApp.GetCurrencySymbol();
        if (sym) currencySymbol = sym;
      }
    } catch {
      // keep default UGX
    }
  })();
  return loadPromise;
}

export function getCurrencySymbol(): string {
  return currencySymbol;
}

export function setCurrencySymbol(sym: string): void {
  currencySymbol = sym;
}
