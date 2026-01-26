/**
 * Currency formatting utilities
 */

/**
 * Formats a number as currency with currency code prefix
 * @param value - The numeric value to format
 * @param currency - The currency code (e.g., 'USD', 'CRC', 'MXN')
 * @returns Formatted string with currency code (e.g., "USD 1,234.56")
 */
export const formatCurrencyInput = (value: number | string, currency: string): string => {
  if (value === '' || value === null || value === undefined) return '';
  
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : value;
  
  if (isNaN(numValue) || numValue === 0) return '';
  
  // Format number with commas and 2 decimal places
  const formatted = numValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return `${currency} ${formatted}`;
};

/**
 * Formats a number string with thousand separators while typing
 * @param numericString - The numeric string (e.g., "1234.56")
 * @returns Formatted string with thousand separators (e.g., "1,234.56")
 */
export const formatNumberWithSeparators = (numericString: string): string => {
  if (!numericString || numericString === '0') return '';
  
  // Split by decimal point
  const parts = numericString.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add thousand separators to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Combine with decimal part if exists
  if (decimalPart !== undefined) {
    return `${formattedInteger}.${decimalPart}`;
  }
  
  return formattedInteger;
};

/**
 * Parses a formatted currency string back to a number
 * @param formattedValue - The formatted string (e.g., "USD 1,234.56")
 * @returns The numeric value
 */
export const parseCurrencyInput = (formattedValue: string): number => {
  if (!formattedValue) return 0;
  
  // Remove currency code and commas, keep only numbers and decimal point
  const cleaned = formattedValue.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Handles currency input change, allowing continuous typing
 * @param inputValue - The raw input value from the user
 * @param currency - The currency code
 * @returns The numeric value to store
 */
export const handleCurrencyInput = (inputValue: string, currency: string): number => {
  // Remove currency code prefix if present, and all non-numeric characters except decimal point
  const cleaned = inputValue.replace(new RegExp(`^${currency}\\s*`, 'i'), '').replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formats currency for display while allowing editing
 * @param numericValue - The numeric value stored
 * @param displayValue - The current display value (what user is typing)
 * @param currency - The currency code
 * @returns The formatted string to display
 */
export const formatCurrencyForDisplay = (numericValue: number, displayValue: string, currency: string): string => {
  // If display value is empty or just currency code, return empty
  if (!displayValue || displayValue.trim() === '' || displayValue.trim() === currency) return '';
  
  // If display value doesn't start with currency, add it
  if (!displayValue.startsWith(currency)) {
    const cleaned = displayValue.replace(/[^\d.-]/g, '');
    if (cleaned === '' || cleaned === '0' || cleaned === '0.') return '';
    // Don't format while typing, just show currency prefix
    return `${currency} ${cleaned}`;
  }
  
  return displayValue;
};

/**
 * Gets the currency code for a given field type
 * @param fieldId - The field identifier (e.g., 'localFee', 'dollarFee', 'totalLocal', 'totalDollars')
 * @param localCurrency - The local currency code
 * @returns The currency code to use
 */
export const getCurrencyForField = (fieldId: string, localCurrency: string): string => {
  const dollarFields = ['dollarFee', 'totalDollars', 'feeToUpdateDollars', 'amountDollars'];
  // Also check if fieldId contains 'dollar' or 'Dollar'
  if (dollarFields.includes(fieldId) || fieldId.toLowerCase().includes('dollar')) {
    return 'USD';
  }
  return localCurrency;
};
