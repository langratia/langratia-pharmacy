/**
 * Formats monetary amounts consistently using Intl.NumberFormat.
 * Capped at 0-2 decimal places (minimumFractionDigits: 0, maximumFractionDigits: 2).
 * Formats whole numbers cleanly without trailing decimal zeroes (e.g. 5,000)
 * while properly rounding floats (e.g. 12,493.016 -> 12,493.02).
 */
export const formatCurrency = (
  val: number | string | null | undefined,
  includeSymbol: boolean = false
): string => {
  if (val === null || val === undefined || val === '') {
    return includeSymbol ? 'UGX 0' : '0';
  }
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) {
    return includeSymbol ? 'UGX 0' : '0';
  }

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);

  return includeSymbol ? `UGX ${formatted}` : formatted;
};

/**
 * Helper to format standard integers with comma separators.
 */
export const formatNumber = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'number' ? val : parseInt(String(val), 10);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Sanitizes numeric price inputs to ensure 0-2 decimal places without raw float noise (e.g. 25848.1420337778 -> 25848.14).
 * Powered by formatCurrency under the hood.
 */
export const sanitizePriceInput = (val: number | string | null | undefined): number => {
  if (val === null || val === undefined || val === '') return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return 0;
  // Parse formatted string back to float to enforce exact 0-2 decimal precision from formatCurrency
  const formattedStr = formatCurrency(num, false).replace(/,/g, '');
  return parseFloat(formattedStr) || 0;
};

