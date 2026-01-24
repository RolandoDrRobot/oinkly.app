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
  inOrder: boolean;
  currentPlan: string;
  bankName: string;
  bankPhone?: string;
  hasCallTask: boolean;
  callCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}
