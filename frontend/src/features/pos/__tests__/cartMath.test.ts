import { describe, it, expect } from 'vitest';

describe('POS Cart Math Calculations', () => {
  const mockItem = {
    medicine: {
      id: 1,
      name: 'Paracetamol',
      selling_price: 5.0,
      current_stock: 100,
    },
    quantity: 2,
    selectedUnit: undefined,
  };

  const mockItemWithUnit = {
    medicine: {
      id: 2,
      name: 'Amoxicillin',
      selling_price: 15.0,
      current_stock: 50,
      units: [{ id: '1', unit_name: 'Box', conversion_factor: 10, price: 140.0 }],
    },
    quantity: 1,
    selectedUnit: { id: '1', unit_name: 'Box', conversion_factor: 10, price: 140.0 },
  };

  it('calculates gross total correctly with standard pricing', () => {
    const cart = [mockItem];
    const grossTotal = cart.reduce((sum, item) => sum + (item.medicine.selling_price * item.quantity), 0);
    expect(grossTotal).toBe(10.0);
  });

  it('calculates gross total correctly with custom unit pricing', () => {
    const cart = [mockItemWithUnit];
    const grossTotal = cart.reduce((sum, item) => sum + ((item.selectedUnit?.price || item.medicine.selling_price) * item.quantity), 0);
    expect(grossTotal).toBe(140.0);
  });

  it('applies fixed discount correctly', () => {
    const grossTotal = 150.0;
    const discountAmount = 20.0;
    const discountType = 'fixed';
    
    let calculatedDiscount = 0;
    if (discountAmount > 0) {
      calculatedDiscount = discountType === 'percent' ? grossTotal * (discountAmount / 100) : discountAmount;
      if (calculatedDiscount > grossTotal) calculatedDiscount = grossTotal;
    }
    const netTotal = Math.max(0, grossTotal - calculatedDiscount);
    
    expect(calculatedDiscount).toBe(20.0);
    expect(netTotal).toBe(130.0);
  });

  it('applies percentage discount correctly', () => {
    const grossTotal = 200.0;
    const discountAmount = 15.0; // 15%
    const discountType = 'percent';
    
    let calculatedDiscount = 0;
    if (discountAmount > 0) {
      calculatedDiscount = discountType === 'percent' ? grossTotal * (discountAmount / 100) : discountAmount;
      if (calculatedDiscount > grossTotal) calculatedDiscount = grossTotal;
    }
    const netTotal = Math.max(0, grossTotal - calculatedDiscount);
    
    expect(calculatedDiscount).toBe(30.0); // 15% of 200 is 30
    expect(netTotal).toBe(170.0);
  });

  it('prevents discount from exceeding gross total', () => {
    const grossTotal = 50.0;
    const discountAmount = 100.0;
    const discountType = 'fixed';
    
    let calculatedDiscount = 0;
    if (discountAmount > 0) {
      calculatedDiscount = discountType === 'percent' ? grossTotal * (discountAmount / 100) : discountAmount;
      if (calculatedDiscount > grossTotal) calculatedDiscount = grossTotal;
    }
    const netTotal = Math.max(0, grossTotal - calculatedDiscount);
    
    expect(calculatedDiscount).toBe(50.0);
    expect(netTotal).toBe(0);
  });

  it('calculates change correctly', () => {
    const netTotal = 170.0;
    const tendered = 200.0;
    const change = Math.max(0, tendered - netTotal);
    
    expect(change).toBe(30.0);
  });

  it('returns 0 change if tendered amount is less than net total', () => {
    const netTotal = 170.0;
    const tendered = 150.0;
    const change = Math.max(0, tendered - netTotal);
    
    expect(change).toBe(0);
  });
});
