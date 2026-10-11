/**
 * Tipos principales del sistema financiero
 * Representación monetaria: Enteros directos en pesos argentinos (ARS).
 * Ejemplo: 15400 representa $15.400 ARS.
 */

export type AmountPesos = number;

export type AccountType = 'cash' | 'bank' | 'wallet';

export interface Account {
  id: string; // UUID
  userId: string;
  name: string; // Ej: "Efectivo", "Banco Galicia", "Mercado Pago"
  type: AccountType;
  currency: 'ARS';
  initialBalance: AmountPesos;
  currentBalance: AmountPesos;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer' | 'debt_payment' | 'adjustment';

export interface Transaction {
  id: string; // UUID
  userId: string;
  clientMutationId: string; // Idempotencia offline
  type: TransactionType;
  amount: AmountPesos; // Entero positivo
  date: string; // YYYY-MM-DD
  accountId: string; // Cuenta origen
  destinationAccountId?: string; // Solo para transferencias
  category: string;
  debtId?: string; // Vinculación con deuda si corresponde
  recurringId?: string; // Vinculación con gasto recurrente
  description: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DebtConsequence = 'critical_cut' | 'punitive_interest' | 'legal' | 'mild' | 'none';
export type DebtStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export interface Debt {
  id: string;
  userId: string;
  name: string;
  creditor: string;
  totalAmount: AmountPesos;
  remainingAmount: AmountPesos;
  minimumPayment?: AmountPesos;
  dueDate: string; // YYYY-MM-DD
  interestRateKnown?: string; // Documentación informativa sin invenciones
  consequenceType: DebtConsequence;
  status: DebtStatus;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface RecurringObligation {
  id: string;
  userId: string;
  name: string; // Ej: "Alquiler", "Internet", "Gimnasio"
  expectedAmount: AmountPesos;
  frequency: RecurringFrequency;
  dueDay: number; // 1-31
  priority: 1 | 2 | 3 | 4 | 5; // 1 = Máxima prioridad
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReserveTargetType = 'debt' | 'recurring_obligation' | 'savings_goal';
export type ReserveStatus = 'active' | 'applied' | 'released';

export interface VirtualReserve {
  id: string;
  userId: string;
  targetType: ReserveTargetType;
  targetId: string;
  targetName: string;
  amountReserved: AmountPesos;
  status: ReserveStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: AmountPesos;
  currentAmount: AmountPesos;
  targetDate?: string;
  isEmergencyFund: boolean;
  priority: 1 | 2 | 3 | 4 | 5;
  status: 'in_progress' | 'completed';
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPlan {
  id: string;
  userId: string;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
  expectedIncome: AmountPesos;
  actualIncome: AmountPesos;
  totalObligations: AmountPesos;
  notes?: string;
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface SyncOutboxItem {
  id: string;
  mutationId: string; // UUID único de la mutación
  entityName: 'accounts' | 'transactions' | 'debts' | 'recurring_obligations' | 'virtual_reserves' | 'savings_goals' | 'weekly_plans';
  action: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'failed';
  errorMessage?: string;
}
