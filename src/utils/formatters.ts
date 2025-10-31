// /workspaces/lactokeeper/src/utils/formatters.ts

/**
 * Formatea un número a una cadena con un número fijo de decimales y separadores de miles.
 * @param value El número a formatear.
 * @param decimals El número de decimales (por defecto 0).
 * @returns Un string formateado. Ej: 1,234
 */
export const formatNumber = (value: number | undefined | null, decimals = 0): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Formatea un número como un string de moneda.
 * @param value El número a formatear.
 * @param currencySymbol El símbolo de la moneda (por defecto '$').
 * @param decimals El número de decimales (por defecto 2).
 * @returns Un string de moneda formateado. Ej: $1,234.56
 */
export const formatCurrency = (value: number | undefined | null, currencySymbol = '$', decimals = 2): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return `${currencySymbol}0.00`;
  }
  
  // Intl.NumberFormat es la forma moderna de formatear monedas
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD', // El 'USD' es un placeholder, el símbolo lo sobreescribe
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // Reemplaza el símbolo '$' por defecto con el símbolo personalizado
  return formatter.format(value).replace('$', currencySymbol);
};