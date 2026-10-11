import { describe, it, expect } from 'vitest';
import type {
  Account,
  Transaction,
  Debt,
  RecurringObligation,
  SavingsGoal,
  VirtualReserve,
  WeeklyPlan
} from '../types';
import {
  calculateAccountBalance,
  calculateTotalRealBalance,
  calculateTotalActiveReserves,
  calculateFreeBalance,
  allocateVirtualReserve,
  changeReserveStatus,
  createInternalTransferTransaction
} from './calculator';
import {
  evaluateDebtStatus,
  applyDebtPayment,
  prioritizeObligations,
  getDaysUntilDue
} from './debts';
import { analyzeWeeklyPlan } from './weeklyPlan';

describe('Motor de Cálculo Financiero y Reglas de Negocio (ARS)', () => {
  const userId = 'user-test-123';

  // 1. Registrar un ingreso
  it('1. Registro de ingreso: incrementa el saldo de la cuenta y el saldo real consolidado', () => {
    const cuentaMP: Account = {
      id: 'acc-mp',
      userId,
      name: 'Mercado Pago',
      type: 'wallet',
      currency: 'ARS',
      initialBalance: 0,
      currentBalance: 0,
      isActive: true,
      isDeleted: false,
      createdAt: '2026-10-11T00:00:00Z',
      updatedAt: '2026-10-11T00:00:00Z'
    };

    const txIngreso: Transaction = {
      id: 'tx-ingreso-1',
      userId,
      clientMutationId: 'mut-1',
      type: 'income',
      amount: 100000, // $100.000 ARS
      date: '2026-10-11',
      accountId: 'acc-mp',
      category: 'Cobro Trabajo',
      description: 'Honorarios freelance',
      isDeleted: false,
      createdAt: '2026-10-11T10:00:00Z',
      updatedAt: '2026-10-11T10:00:00Z'
    };

    const saldoCuenta = calculateAccountBalance(cuentaMP, [txIngreso]);
    const saldoTotal = calculateTotalRealBalance([cuentaMP], [txIngreso]);

    expect(saldoCuenta).toBe(100000);
    expect(saldoTotal).toBe(100000);
  });

  // 2. Registrar un gasto
  it('2. Registro de gasto: descuenta el saldo de la cuenta correspondiente', () => {
    const cuentaEfectivo: Account = {
      id: 'acc-cash',
      userId,
      name: 'Efectivo',
      type: 'cash',
      currency: 'ARS',
      initialBalance: 50000,
      currentBalance: 50000,
      isActive: true,
      isDeleted: false,
      createdAt: '2026-10-11T00:00:00Z',
      updatedAt: '2026-10-11T00:00:00Z'
    };

    const txGasto: Transaction = {
      id: 'tx-gasto-1',
      userId,
      clientMutationId: 'mut-2',
      type: 'expense',
      amount: 15000, // $15.000 ARS
      date: '2026-10-11',
      accountId: 'acc-cash',
      category: 'Supermercado',
      description: 'Compras del día',
      isDeleted: false,
      createdAt: '2026-10-11T12:00:00Z',
      updatedAt: '2026-10-11T12:00:00Z'
    };

    const saldoCuenta = calculateAccountBalance(cuentaEfectivo, [txGasto]);
    expect(saldoCuenta).toBe(35000);
  });

  // 3. Transferencia interna entre cuentas
  it('3. Transferencia interna: mantiene estrictamente neutro el saldo real total (delta S_real = 0)', () => {
    const cuentaOrigen: Account = {
      id: 'acc-banco',
      userId,
      name: 'Banco Galicia',
      type: 'bank',
      currency: 'ARS',
      initialBalance: 80000,
      currentBalance: 80000,
      isActive: true,
      isDeleted: false,
      createdAt: '2026-10-11T00:00:00Z',
      updatedAt: '2026-10-11T00:00:00Z'
    };

    const cuentaDestino: Account = {
      id: 'acc-efectivo',
      userId,
      name: 'Efectivo',
      type: 'cash',
      currency: 'ARS',
      initialBalance: 20000,
      currentBalance: 20000,
      isActive: true,
      isDeleted: false,
      createdAt: '2026-10-11T00:00:00Z',
      updatedAt: '2026-10-11T00:00:00Z'
    };

    const saldoTotalPrevio = calculateTotalRealBalance([cuentaOrigen, cuentaDestino], []);
    expect(saldoTotalPrevio).toBe(100000);

    // Transferir $30.000 de Banco a Efectivo
    const txTransferencia = createInternalTransferTransaction({
      userId,
      sourceAccountId: 'acc-banco',
      destinationAccountId: 'acc-efectivo',
      amount: 30000,
      date: '2026-10-11',
      description: 'Extracción cajero automático'
    });

    const transactions = [txTransferencia];
    const saldoOrigenPosterior = calculateAccountBalance(cuentaOrigen, transactions);
    const saldoDestinoPosterior = calculateAccountBalance(cuentaDestino, transactions);
    const saldoTotalPosterior = calculateTotalRealBalance([cuentaOrigen, cuentaDestino], transactions);

    expect(saldoOrigenPosterior).toBe(50000);
    expect(saldoDestinoPosterior).toBe(50000);
    expect(saldoTotalPosterior).toBe(100000); // delta S_real = 0
  });

  // 4. Confirmar un pago y reducir correctamente la deuda
  it('4. Confirmación de pago de deuda: reduce el saldo remanente y actualiza estado a parcial y pagado', () => {
    const deudaOriginal: Debt = {
      id: 'debt-visa',
      userId,
      name: 'Tarjeta Visa',
      creditor: 'Banco',
      totalAmount: 120000,
      remainingAmount: 120000,
      dueDate: '2026-10-25',
      consequenceType: 'punitive_interest',
      status: 'pending',
      isDeleted: false,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    };

    // Verificación de cálculo de días hasta vencimiento y evaluación de estado
    expect(getDaysUntilDue('2026-10-25', '2026-10-11')).toBe(14);
    expect(evaluateDebtStatus(deudaOriginal, '2026-10-11')).toBe('pending');
    expect(evaluateDebtStatus({ ...deudaOriginal, dueDate: '2026-10-01' }, '2026-10-11')).toBe('overdue');

    // Pago parcial de $50.000
    const pagoParcial = applyDebtPayment(deudaOriginal, 50000, '2026-10-11');
    expect(pagoParcial.actualPaid).toBe(50000);
    expect(pagoParcial.updatedDebt.remainingAmount).toBe(70000);
    expect(pagoParcial.updatedDebt.status).toBe('partial');

    // Pago restante de $70.000
    const pagoFinal = applyDebtPayment(pagoParcial.updatedDebt, 70000, '2026-10-11');
    expect(pagoFinal.actualPaid).toBe(70000);
    expect(pagoFinal.updatedDebt.remainingAmount).toBe(0);
    expect(pagoFinal.updatedDebt.status).toBe('paid');

    // Si intenta pagar más de lo que debe, solo descuenta hasta el saldo remanente
    const deudaChica: Debt = {
      ...deudaOriginal,
      remainingAmount: 10000
    };
    const pagoExcedente = applyDebtPayment(deudaChica, 25000, '2026-10-11');
    expect(pagoExcedente.actualPaid).toBe(10000);
    expect(pagoExcedente.updatedDebt.remainingAmount).toBe(0);
    expect(pagoExcedente.updatedDebt.status).toBe('paid');
  });

  // 5. Evitar reservar más dinero del disponible
  it('5. Invariante de reserva: prohíbe sobre-reservar más dinero del saldo libre disponible', () => {
    const totalRealBalance = 100000; // $100.000 ARS reales

    // Ya hay una reserva activa de $40.000
    const reservaExistente: VirtualReserve = {
      id: 'res-alquiler',
      userId,
      targetType: 'recurring_obligation',
      targetId: 'rec-alquiler',
      targetName: 'Alquiler',
      amountReserved: 40000,
      status: 'active',
      createdAt: '2026-10-10T00:00:00Z',
      updatedAt: '2026-10-10T00:00:00Z'
    };

    const saldoLibreActual = calculateFreeBalance(
      totalRealBalance,
      calculateTotalActiveReserves([reservaExistente])
    );
    expect(saldoLibreActual).toBe(60000);

    // Intento de reservar $75.000 cuando solo hay $60.000 libres
    const intentoExcesivo = allocateVirtualReserve(
      userId,
      'debt',
      'debt-prestamo',
      'Préstamo Personal',
      75000,
      [reservaExistente],
      totalRealBalance
    );

    expect(intentoExcesivo.success).toBe(false);
    expect(intentoExcesivo.allocatedAmount).toBe(0);
    expect(intentoExcesivo.reason).toContain('No hay saldo libre suficiente');

    // Intento válido de reservar $50.000 (dentro de los $60.000 disponibles)
    const intentoValido = allocateVirtualReserve(
      userId,
      'debt',
      'debt-prestamo',
      'Préstamo Personal',
      50000,
      [reservaExistente],
      totalRealBalance
    );

    expect(intentoValido.success).toBe(true);
    expect(intentoValido.allocatedAmount).toBe(50000);
    expect(intentoValido.freeBalanceAfter).toBe(10000); // 100.000 - 40.000 - 50.000
  });

  // 6. Evitar reservas duplicadas para la misma obligación
  it('6. Reservas duplicadas: actualizar una obligación ya reservada no duplica el compromiso', () => {
    const totalRealBalance = 100000;
    const reservaExistente: VirtualReserve = {
      id: 'res-luz',
      userId,
      targetType: 'recurring_obligation',
      targetId: 'rec-luz',
      targetName: 'Factura Luz',
      amountReserved: 15000,
      status: 'active',
      createdAt: '2026-10-10T00:00:00Z',
      updatedAt: '2026-10-10T00:00:00Z'
    };

    // Si se reasigna la reserva para Factura Luz a $20.000 (aumenta $5.000)
    const resultado = allocateVirtualReserve(
      userId,
      'recurring_obligation',
      'rec-luz',
      'Factura Luz',
      20000,
      [reservaExistente],
      totalRealBalance
    );

    expect(resultado.success).toBe(true);
    expect(resultado.allocatedAmount).toBe(20000);
    // Saldo libre después debe ser 100.000 - 20.000 = 80.000 (no 100.000 - 15.000 - 20.000)
    expect(resultado.freeBalanceAfter).toBe(80000);
  });

  // 7. Liberar o aplicar reserva al pagar la obligación
  it('7. Ciclo de reserva: al confirmar el pago la reserva se desafecta y no compromete saldo libre', () => {
    const reserva: VirtualReserve = {
      id: 'res-alquiler',
      userId,
      targetType: 'recurring_obligation',
      targetId: 'rec-alquiler',
      targetName: 'Alquiler',
      amountReserved: 40000,
      status: 'active',
      createdAt: '2026-10-10T00:00:00Z',
      updatedAt: '2026-10-10T00:00:00Z'
    };

    const reservaAplicada = changeReserveStatus(reserva, 'applied');
    expect(reservaAplicada.status).toBe('applied');

    // Ya no cuenta como activa
    const totalActivas = calculateTotalActiveReserves([reservaAplicada]);
    expect(totalActivas).toBe(0);
  });

  // 8. Detección y priorización inteligente de obligaciones
  it('8. Priorización del Asistente: ubica en orden de urgencia por consecuencia y proximidad de vencimiento', () => {
    const fechaHoy = '2026-10-11';

    const deudaLeveLejana: Debt = {
      id: 'd1',
      userId,
      name: 'Préstamo amigo sin interés',
      creditor: 'Amigo',
      totalAmount: 30000,
      remainingAmount: 30000,
      dueDate: '2026-10-31', // en 20 días
      consequenceType: 'none',
      status: 'pending',
      isDeleted: false,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    };

    const deudaCorteProximo: Debt = {
      id: 'd2',
      userId,
      name: 'Factura de Electricidad',
      creditor: 'Edenor',
      totalAmount: 18000,
      remainingAmount: 18000,
      dueDate: '2026-10-13', // en 2 días
      consequenceType: 'critical_cut',
      status: 'pending',
      isDeleted: false,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    };

    const deudaVencidaConInteres: Debt = {
      id: 'd3',
      userId,
      name: 'Tarjeta de Crédito',
      creditor: 'Banco',
      totalAmount: 45000,
      remainingAmount: 45000,
      dueDate: '2026-10-09', // vencida hace 2 días
      consequenceType: 'punitive_interest',
      status: 'overdue',
      isDeleted: false,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    };

    const priorizadas = prioritizeObligations({
      debts: [deudaLeveLejana, deudaCorteProximo, deudaVencidaConInteres],
      recurring: [],
      savingsGoals: [],
      currentDate: fechaHoy
    });

    // La deuda vencida con interés punitorio debe ser la primera (más urgente)
    expect(priorizadas[0].id).toBe('d3');
    expect(priorizadas[0].priorityLevel).toBe('urgente');
    expect(priorizadas[0].explanation).toContain('VENCIDA');

    // La segunda debe ser la factura con riesgo de corte que vence en 2 días
    expect(priorizadas[1].id).toBe('d2');
    expect(priorizadas[1].priorityLevel).toBe('urgente');
    expect(priorizadas[1].explanation).toContain('corte');

    // La última debe ser el préstamo blando que vence en 20 días
    expect(priorizadas[2].id).toBe('d1');
    expect(priorizadas[2].priorityLevel).toBe('baja');
  });

  // 9. Recalcular el plan ante ingresos insuficientes
  it('9. Plan semanal con déficit: identifica faltante y sugiere postergar gastos no esenciales sin contar dinero futuro', () => {
    const plan: WeeklyPlan = {
      id: 'plan-w1',
      userId,
      weekStartDate: '2026-10-11',
      weekEndDate: '2026-10-17',
      expectedIncome: 150000, // Esperaba $150.000
      actualIncome: 0,
      totalObligations: 85000,
      status: 'active',
      createdAt: '2026-10-11T00:00:00Z',
      updatedAt: '2026-10-11T00:00:00Z'
    };

    // Obligaciones de la semana
    const luz: RecurringObligation = {
      id: 'rec-1',
      userId,
      name: 'Electricidad',
      expectedAmount: 20000,
      frequency: 'monthly',
      dueDay: 13,
      priority: 1, // vital
      isActive: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: ''
    };

    const comida: RecurringObligation = {
      id: 'rec-2',
      userId,
      name: 'Alimentos básicos',
      expectedAmount: 45000,
      frequency: 'weekly',
      dueDay: 15,
      priority: 1, // vital
      isActive: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: ''
    };

    const gimnasio: RecurringObligation = {
      id: 'rec-3',
      userId,
      name: 'Cuota Gimnasio',
      expectedAmount: 20000,
      frequency: 'monthly',
      dueDay: 16,
      priority: 4, // no esencial / ocio
      isActive: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: ''
    };

    // Caso: En la mitad de la semana solo se cobraron $50.000 reales
    const analisis = analyzeWeeklyPlan({
      plan,
      actualCollectedIncome: 50000,
      obligationsForWeek: [luz, comida, gimnasio]
    });

    expect(analisis.isDeficit).toBe(true);
    expect(analisis.incomeDifference).toBe(-100000); // 50.000 - 150.000
    expect(analisis.totalObligationsDue).toBe(85000); // 20k + 45k + 20k
    expect(analisis.uncoveredObligationsAmount).toBe(35000); // 85k - 50k

    // Debe sugerir postergar el gimnasio (prioridad 4)
    expect(analisis.postponableExpenses.length).toBeGreaterThan(0);
    expect(analisis.postponableExpenses[0].name).toBe('Cuota Gimnasio');
    expect(analisis.postponableExpenses[0].reason).toContain('prescindible');
  });

  // 10. Progreso de objetivos de ahorro y fondo de emergencia
  it('10. Objetivos y Fondo de Emergencia: prioriza contingencia si la cobertura es insuficiente', () => {
    const metaEmergencia: SavingsGoal = {
      id: 'goal-emergency',
      userId,
      name: 'Fondo de Emergencia',
      targetAmount: 200000,
      currentAmount: 30000, // 15% acumulado
      isEmergencyFund: true,
      priority: 1,
      status: 'in_progress',
      isDeleted: false,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z'
    };

    const priorizadas = prioritizeObligations({
      debts: [],
      recurring: [],
      savingsGoals: [metaEmergencia],
      currentDate: '2026-10-11'
    });

    expect(priorizadas.length).toBe(1);
    expect(priorizadas[0].type).toBe('emergency_fund');
    expect(priorizadas[0].priorityLevel).toBe('alta');
    expect(priorizadas[0].explanation).toContain('15%');
  });
});
