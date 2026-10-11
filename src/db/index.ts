import Dexie, { type Table } from 'dexie';
import type {
  Account,
  Transaction,
  Debt,
  RecurringObligation,
  VirtualReserve,
  SavingsGoal,
  WeeklyPlan,
  SyncOutboxItem
} from '../types';

export class FinanceDatabase extends Dexie {
  accounts!: Table<Account, string>;
  transactions!: Table<Transaction, string>;
  debts!: Table<Debt, string>;
  recurringObligations!: Table<RecurringObligation, string>;
  virtualReserves!: Table<VirtualReserve, string>;
  savingsGoals!: Table<SavingsGoal, string>;
  weeklyPlans!: Table<WeeklyPlan, string>;
  syncOutbox!: Table<SyncOutboxItem, string>;

  constructor() {
    super('FinancePwaDB');
    this.version(1).stores({
      accounts: 'id, userId, type, isActive, isDeleted, updatedAt',
      transactions: 'id, userId, clientMutationId, date, accountId, type, isDeleted, updatedAt',
      debts: 'id, userId, dueDate, status, consequenceType, isDeleted, updatedAt',
      recurringObligations: 'id, userId, dueDay, priority, isActive, isDeleted, updatedAt',
      virtualReserves: 'id, userId, targetId, status, updatedAt',
      savingsGoals: 'id, userId, isEmergencyFund, status, isDeleted, updatedAt',
      weeklyPlans: 'id, userId, weekStartDate, status, updatedAt',
      syncOutbox: 'id, mutationId, entityName, syncStatus, createdAt'
    });
  }
}

export const db = new FinanceDatabase();
