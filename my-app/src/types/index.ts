export interface PaymentCommitment {
  id: string;
  debtId: string;
  date: string; // Fecha acordada (ISO string)
  amountLocal: number;
  amountDollars: number;
  status: 'pending' | 'completed' | 'overdue';
  paymentType?: 'partial' | 'full' | 'settlement'; // partial: pago parcial, full: pago total, settlement: negociación/perdón
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface CallRecord {
  id: string;
  debtId: string;
  date: string;
  notes: string;
  commitmentsCreated?: string[]; // IDs de compromisos creados en esta llamada
  createdAt: string;
}

export interface Debt {
  id: string;
  name: string;
  type: 'prestamo' | 'tarjeta';
  localCurrency: string;
  localFee: number;
  dollarFee: number;
  totalLocal: number;
  totalDollars: number;
  feeToUpdate: number;
  feeToUpdateDollars: number;
  inOrder: boolean;
  currentPlan: string;
  bankName: string;
  bankPhone?: string;
  hasCallTask: boolean;
  callCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  // Nuevos campos opcionales
  lastCallDate?: string;
  paymentDay?: number; // Día del mes (1-31)
  cutDay?: number; // Día de corte (solo para tarjetas de crédito, 1-31)
  interestRate?: number; // Tasa de interés que está pagando la deuda (%)
  commitments?: PaymentCommitment[];
  callHistory?: CallRecord[];
  closedAt?: string; // ISO date when debt was paid off (total reached 0)
  paidForMonth?: string; // YYYY-MM del mes en que se marcó el pago realizado
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string; // Profile picture URL (e.g. from Google)
}

export type SubscriptionPlan = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface Subscription {
  plan: SubscriptionPlan;
  status?: SubscriptionStatus;
  endsAt?: string; // ISO date
  /** For display: e.g. "monthly", "yearly" */
  interval?: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  amountLocal: number;
  amountDollars: number;
  localCurrency: string;
  category?: string;
  paymentDay?: number; // Día del mes (1-31)
  /** Month this expense was last marked "up to date" (YYYY-MM) */
  paidForMonth?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  name: string;
  type: 'property' | 'vehicle' | 'investment' | 'savings' | 'other';
  valueLocal: number;
  valueDollars: number;
  monthlyIncomeLocal?: number;
  monthlyIncomeUSD?: number;
  localCurrency: string;
  purchaseDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: string;
  name: string;
  amountLocal: number;
  amountDollars: number;
  localCurrency: string;
  type: 'salary' | 'freelance' | 'investment' | 'rental' | 'other';
  frequency: 'monthly' | 'weekly' | 'biweekly' | 'yearly' | 'one-time';
  paymentDay?: number; // Día del mes (1-31)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Prospect {
  id: string;
  name: string;
  propertyValueUSD: number;
  loanAmountUSD: number;
  interestRate: number;       // % anual
  loanTermYears: number;
  renovationCostUSD: number;
  monthlyExpensesUSD: number; // impuestos, seguro, mantenimiento, HOA
  monthlyRentUSD: number;
  vacancyRatePct: number;      // % vacancia (default 5)
  appreciationRatePct: number; // % anual
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationMeta {
  reminderType: 'payment_reminder' | 'overdue_commitment' | 'call_reminder' | 'fixed_expense_overdue';
  debtId?: string;
  commitmentId?: string;
  paymentDate?: string;
  expenseId?: string;
  expenseName?: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  createdAt: string;
  read: boolean;
  meta?: NotificationMeta;
}
