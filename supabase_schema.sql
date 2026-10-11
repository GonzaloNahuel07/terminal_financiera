-- ==============================================================================
-- SCHEMA SUPABASE: TERMINAL FINANCIERA PERSONAL (OFFLINE-FIRST + RLS)
-- ==============================================================================
-- Este script crea todas las tablas, índices y políticas de seguridad (RLS)
-- necesarias para sincronizar Dexie IndexedDB con Supabase PostgreSQL.
-- 
-- Instrucciones:
-- 1. Abrí tu proyecto en Supabase (https://supabase.com).
-- 2. Dirigite a "SQL Editor" en el menú lateral izquierdo.
-- 3. Hacé clic en "New query", pegá todo este script y presioná "Run".
-- ==============================================================================

-- 1. TABLA: accounts (Cuentas y Billeteras)
CREATE TABLE IF NOT EXISTS public.accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'wallet')),
  currency TEXT NOT NULL DEFAULT 'ARS',
  initial_balance BIGINT NOT NULL DEFAULT 0,
  current_balance BIGINT NOT NULL DEFAULT 0,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABLA: transactions (Movimientos y Transferencias)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_mutation_id TEXT,
  account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'debt_payment', 'adjustment')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  category TEXT,
  debt_id TEXT,
  recurring_id TEXT,
  description TEXT,
  date TEXT NOT NULL,
  destination_account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABLA: debts (Deudas y Pasivos)
CREATE TABLE IF NOT EXISTS public.debts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  creditor TEXT NOT NULL,
  total_amount BIGINT NOT NULL CHECK (total_amount > 0),
  remaining_amount BIGINT NOT NULL CHECK (remaining_amount >= 0),
  minimum_payment BIGINT,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  consequence_type TEXT NOT NULL CHECK (consequence_type IN ('critical_cut', 'punitive_interest', 'legal', 'mild', 'none')),
  interest_rate_known TEXT,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA: recurring_obligations (Gastos Fijos y Periódicos)
CREATE TABLE IF NOT EXISTS public.recurring_obligations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  expected_amount BIGINT NOT NULL CHECK (expected_amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'bimonthly', 'yearly')),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 5),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA: virtual_reserves (Centro de Reservas Virtuales)
CREATE TABLE IF NOT EXISTS public.virtual_reserves (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('debt', 'recurring_obligation', 'savings_goal')),
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  amount_reserved BIGINT NOT NULL CHECK (amount_reserved >= 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'applied', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABLA: savings_goals (Metas de Ahorro y Fondo de Emergencia)
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount BIGINT NOT NULL CHECK (target_amount > 0),
  current_amount BIGINT NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date TEXT,
  is_emergency_fund BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABLA: weekly_plans (Planificación y Cierre Semanal)
CREATE TABLE IF NOT EXISTS public.weekly_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_start_date TEXT NOT NULL,
  week_end_date TEXT NOT NULL,
  expected_income BIGINT NOT NULL DEFAULT 0,
  actual_income BIGINT NOT NULL DEFAULT 0,
  total_obligations BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- ÍNDICES DE RENDIMIENTO PARA SINCRONIZACIÓN RÁPIDA
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_accounts_user_updated ON public.accounts(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tx_user_date ON public.transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_tx_user_updated ON public.transactions(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_debts_user_status ON public.debts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_debts_user_updated ON public.debts(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_recurring_user_active ON public.recurring_obligations(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_reserves_user_status ON public.virtual_reserves(user_id, status);
CREATE INDEX IF NOT EXISTS idx_savings_user_status ON public.savings_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_plans_user_week ON public.weekly_plans(user_id, week_start_date);

-- ==============================================================================
-- SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Habilitamos RLS en todas las tablas
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_reserves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para clave anon o usuario autenticado
-- (Permite operar tanto de forma monousuario personal como con Supabase Auth)
CREATE POLICY "Permitir todo acceso a cuentas por user_id" ON public.accounts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo acceso a transacciones por user_id" ON public.transactions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo acceso a deudas por user_id" ON public.debts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo acceso a fijos por user_id" ON public.recurring_obligations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo acceso a reservas por user_id" ON public.virtual_reserves
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo acceso a metas de ahorro por user_id" ON public.savings_goals
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo acceso a planes semanales por user_id" ON public.weekly_plans
  FOR ALL USING (true) WITH CHECK (true);
