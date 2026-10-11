import type {
  Account,
  Transaction,
  VirtualReserve,
  AmountPesos,
  ReserveTargetType
} from '../types';
import { sumPesos, subtractPesos, validateIntegerAmount } from '../utils/money';

/**
 * Resultado de verificación y asignación de reservas.
 */
export interface ReserveAllocationResult {
  success: boolean;
  allocatedAmount: AmountPesos;
  freeBalanceAfter: AmountPesos;
  reason?: string;
  reserve?: VirtualReserve;
}

/**
 * Calcula el saldo de una cuenta individual a partir de su saldo inicial
 * y de todas sus transacciones no eliminadas.
 */
export function calculateAccountBalance(
  account: Account,
  transactions: Transaction[]
): AmountPesos {
  const accountTransactions = transactions.filter(
    (tx) => !tx.isDeleted && (tx.accountId === account.id || tx.destinationAccountId === account.id)
  );

  let balance = account.initialBalance;

  for (const tx of accountTransactions) {
    if (tx.type === 'income') {
      if (tx.accountId === account.id) {
        balance += tx.amount;
      }
    } else if (tx.type === 'expense' || tx.type === 'debt_payment') {
      if (tx.accountId === account.id) {
        balance -= tx.amount;
      }
    } else if (tx.type === 'transfer') {
      if (tx.accountId === account.id) {
        // Cuenta de origen: egreso
        balance -= tx.amount;
      }
      if (tx.destinationAccountId === account.id) {
        // Cuenta de destino: ingreso
        balance += tx.amount;
      }
    } else if (tx.type === 'adjustment') {
      // Ajuste de saldo directo
      if (tx.accountId === account.id) {
        balance = tx.amount;
      }
    }
  }

  return Math.round(balance);
}

/**
 * Calcula el Saldo Real Total consolidado sumando los saldos de todas las cuentas activas.
 * S_real = SUM(Saldo(c))
 */
export function calculateTotalRealBalance(
  accounts: Account[],
  transactions: Transaction[]
): AmountPesos {
  const activeAccounts = accounts.filter((acc) => acc.isActive && !acc.isDeleted);
  const total = activeAccounts.reduce((acc, account) => {
    return acc + calculateAccountBalance(account, transactions);
  }, 0);

  return Math.round(total);
}

/**
 * Calcula el total de dinero actualmente comprometido en reservas virtuales activas.
 * R_total = SUM(MontoReservado(r))
 */
export function calculateTotalActiveReserves(reserves: VirtualReserve[]): AmountPesos {
  const activeReserves = reserves.filter((r) => r.status === 'active');
  return sumPesos(...activeReserves.map((r) => r.amountReserved));
}

/**
 * Calcula el Saldo Libre para Gastar.
 * S_libre = MAX(0, S_real - R_total)
 */
export function calculateFreeBalance(
  totalRealBalance: AmountPesos,
  totalActiveReserves: AmountPesos
): AmountPesos {
  return subtractPesos(totalRealBalance, totalActiveReserves, false);
}

/**
 * Valida si se puede asignar una reserva sin violar la invariante:
 * R_total + nuevoMonto <= S_real.
 */
export function canAllocateReserve(
  totalRealBalance: AmountPesos,
  currentReserves: VirtualReserve[],
  requestedAmount: AmountPesos,
  existingReserveForTargetId?: string
): { allowed: boolean; maxAssignable: AmountPesos; currentFreeBalance: AmountPesos } {
  // Si ya existía una reserva activa para ese mismo objetivo, se descuenta para permitir ajuste
  const otherReserves = currentReserves.filter(
    (r) => r.status === 'active' && r.targetId !== existingReserveForTargetId
  );
  const currentActiveTotal = calculateTotalActiveReserves(otherReserves);
  const currentFreeBalance = calculateFreeBalance(totalRealBalance, currentActiveTotal);
  const validatedRequest = validateIntegerAmount(requestedAmount);

  return {
    allowed: validatedRequest <= currentFreeBalance,
    maxAssignable: currentFreeBalance,
    currentFreeBalance
  };
}

/**
 * Asigna o actualiza una reserva virtual respetando el saldo libre disponible
 * y evitando reservas duplicadas del mismo dinero.
 */
export function allocateVirtualReserve(
  userId: string,
  targetType: ReserveTargetType,
  targetId: string,
  targetName: string,
  requestedAmount: AmountPesos,
  existingReserves: VirtualReserve[],
  totalRealBalance: AmountPesos
): ReserveAllocationResult {
  const validatedAmount = validateIntegerAmount(requestedAmount);
  if (validatedAmount <= 0) {
    return {
      success: false,
      allocatedAmount: 0,
      freeBalanceAfter: calculateFreeBalance(
        totalRealBalance,
        calculateTotalActiveReserves(existingReserves)
      ),
      reason: 'El monto a reservar debe ser mayor a 0 pesos.'
    };
  }

  // Verificar si ya existe una reserva activa para este mismo targetId
  const existingIndex = existingReserves.findIndex(
    (r) => r.status === 'active' && r.targetId === targetId
  );

  const existingReserve = existingIndex >= 0 ? existingReserves[existingIndex] : undefined;
  const check = canAllocateReserve(
    totalRealBalance,
    existingReserves,
    validatedAmount,
    existingReserve?.targetId
  );

  if (!check.allowed) {
    return {
      success: false,
      allocatedAmount: 0,
      freeBalanceAfter: check.currentFreeBalance,
      reason: `No hay saldo libre suficiente. Solicitado: $${validatedAmount}, Disponible libre: $${check.maxAssignable}.`
    };
  }

  const now = new Date().toISOString();
  const reserve: VirtualReserve = {
    id: existingReserve ? existingReserve.id : crypto.randomUUID(),
    userId,
    targetType,
    targetId,
    targetName,
    amountReserved: validatedAmount,
    status: 'active',
    createdAt: existingReserve ? existingReserve.createdAt : now,
    updatedAt: now
  };

  const newTotalReserves = existingReserve
    ? calculateTotalActiveReserves(
        existingReserves.map((r) => (r.id === reserve.id ? reserve : r))
      )
    : calculateTotalActiveReserves([...existingReserves, reserve]);

  return {
    success: true,
    allocatedAmount: validatedAmount,
    freeBalanceAfter: calculateFreeBalance(totalRealBalance, newTotalReserves),
    reserve
  };
}

/**
 * Libera o aplica una reserva virtual existente.
 * - 'applied': Cuando la obligación fue pagada efectivamente con dinero de la cuenta.
 * - 'released': Cuando se cancela la reserva y el dinero vuelve a saldo libre.
 */
export function changeReserveStatus(
  reserve: VirtualReserve,
  newStatus: 'applied' | 'released'
): VirtualReserve {
  return {
    ...reserve,
    status: newStatus,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Ejecuta una transferencia interna entre dos cuentas.
 * Invariante: La suma total del dinero (S_real) se mantiene estrictamente constante (delta S_real = 0).
 * No se contabiliza como ingreso ni como gasto.
 */
export function createInternalTransferTransaction(params: {
  userId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: AmountPesos;
  date: string;
  description?: string;
  clientMutationId?: string;
}): Transaction {
  const {
    userId,
    sourceAccountId,
    destinationAccountId,
    amount,
    date,
    description = 'Transferencia interna',
    clientMutationId = crypto.randomUUID()
  } = params;

  if (sourceAccountId === destinationAccountId) {
    throw new Error('La cuenta de origen y destino no pueden ser la misma.');
  }

  const validatedAmount = validateIntegerAmount(amount);
  if (validatedAmount <= 0) {
    throw new Error('El importe de la transferencia debe ser mayor a 0 pesos.');
  }

  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    userId,
    clientMutationId,
    type: 'transfer',
    amount: validatedAmount,
    date,
    accountId: sourceAccountId,
    destinationAccountId,
    category: 'Transferencia Interna',
    description,
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  };
}
