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
  commitments?: PaymentCommitment[];
  callHistory?: CallRecord[];
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  amountLocal: number;
  amountDollars: number;
  localCurrency: string;
  category?: string;
  dueDate?: string; // Día del mes (1-31)
  paymentDate?: string; // Fecha completa de pago (ISO string)
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
  nextPaymentDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
