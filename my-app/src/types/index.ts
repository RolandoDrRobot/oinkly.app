export interface PaymentCommitment {
  id: string;
  debtId: string;
  date: string; // Fecha acordada (ISO string)
  amountLocal: number;
  amountDollars: number;
  status: 'pending' | 'completed' | 'overdue';
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
