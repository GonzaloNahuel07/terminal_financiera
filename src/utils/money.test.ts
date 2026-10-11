import { describe, it, expect } from 'vitest';
import { formatPesos, validateIntegerAmount, sumPesos, subtractPesos } from './money';

describe('Utilidades de Pesos Argentinos (ARS)', () => {
  it('formatea correctamente números enteros sin decimales', () => {
    const formatted = formatPesos(15400);
    // En es-AR puede tener espacio indivisible \u00a0 o espacio normal: $ 15.400 o $15.400
    expect(formatted).toMatch(/\$\s?15\.400/);
  });

  it('valida montos enteros y rechaza negativos', () => {
    expect(validateIntegerAmount(5000)).toBe(5000);
    expect(validateIntegerAmount('12500')).toBe(12500);
    expect(validateIntegerAmount(10.8)).toBe(11); // Redondeo a entero si viniera float accidental
    expect(() => validateIntegerAmount(-500)).toThrow('El importe no puede ser negativo.');
    expect(() => validateIntegerAmount('invalido')).toThrow('El importe debe ser un número válido.');
  });

  it('suma montos en enteros con precisión absoluta', () => {
    const total = sumPesos(10000, 25000, 4500);
    expect(total).toBe(39500);
  });

  it('resta montos y opcionalmente previene números negativos para saldo libre', () => {
    expect(subtractPesos(10000, 4000)).toBe(6000);
    expect(subtractPesos(10000, 15000, false)).toBe(0); // allowNegative = false
    expect(subtractPesos(10000, 15000, true)).toBe(-5000); // allowNegative = true
  });
});
