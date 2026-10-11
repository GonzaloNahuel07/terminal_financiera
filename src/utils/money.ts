import type { AmountPesos } from '../types';

/**
 * Utilidades financieras para pesos argentinos (ARS).
 * Regla: Enteros directos sin decimales (ej. 15400 = $15.400).
 */

export const ARS_LOCALE = 'es-AR';

/**
 * Formatea un monto entero en formato de moneda argentina.
 * Ejemplo: 15400 -> "$ 15.400"
 */
export function formatPesos(amount: AmountPesos): string {
  const safeInt = Math.round(Number(amount) || 0);
  return new Intl.NumberFormat(ARS_LOCALE, {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(safeInt);
}

/**
 * Valida y normaliza que un monto sea un entero no negativo.
 */
export function validateIntegerAmount(amount: unknown): AmountPesos {
  const num = Number(amount);
  if (isNaN(num)) {
    throw new Error('El importe debe ser un número válido.');
  }
  const integerVal = Math.round(num);
  if (integerVal < 0) {
    throw new Error('El importe no puede ser negativo.');
  }
  return integerVal;
}

/**
 * Suma segura de montos en pesos enteros.
 */
export function sumPesos(...amounts: (AmountPesos | undefined | null)[]): AmountPesos {
  return amounts.reduce<number>((acc, curr) => acc + (Math.round(curr || 0)), 0);
}

/**
 * Resta segura que asegura un piso mínimo de 0 si se requiere.
 */
export function subtractPesos(a: AmountPesos, b: AmountPesos, allowNegative = true): AmountPesos {
  const diff = Math.round(a) - Math.round(b);
  return allowNegative ? diff : Math.max(0, diff);
}
