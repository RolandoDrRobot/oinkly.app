import { PaymentCommitment, CallRecord } from '../types';
import { storage } from './storage';

const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Si contiene comas, comillas o saltos de línea, envolver en comillas y escapar comillas
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

export const exportAllDataToCSV = (): void => {
  const debts = storage.getDebts();
  const user = storage.getUser();
  const exportDate = new Date().toISOString();

  // Recolectar todos los compromisos y llamadas
  const allCommitments: Array<PaymentCommitment & { debtName: string }> = [];
  const allCalls: Array<CallRecord & { debtName: string }> = [];

  debts.forEach(debt => {
    if (debt.commitments) {
      debt.commitments.forEach(commitment => {
        allCommitments.push({
          ...commitment,
          debtName: debt.name
        });
      });
    }
    if (debt.callHistory) {
      debt.callHistory.forEach(call => {
        allCalls.push({
          ...call,
          debtName: debt.name
        });
      });
    }
  });

  // Construir el CSV
  const csvLines: string[] = [];

  // Header del documento
  csvLines.push('DEBT APPLICATION - DATA EXPORT');
  csvLines.push(`Export Date: ${formatDate(exportDate)}`);
  csvLines.push(`User: ${user?.name || 'N/A'} (${user?.email || 'N/A'})`);
  csvLines.push('');
  csvLines.push('='.repeat(100));
  csvLines.push('');

  // SECCIÓN 1: RESUMEN
  csvLines.push('SUMMARY');
  csvLines.push('='.repeat(100));
  csvLines.push(`Total Debts,${debts.length}`);
  csvLines.push(`Total Commitments,${allCommitments.length}`);
  csvLines.push(`Total Calls,${allCalls.length}`);
  csvLines.push(`Completed Commitments,${allCommitments.filter(c => c.status === 'completed').length}`);
  csvLines.push(`Pending Commitments,${allCommitments.filter(c => c.status === 'pending').length}`);
  csvLines.push(`Overdue Commitments,${allCommitments.filter(c => c.status === 'overdue').length}`);
  csvLines.push('');
  csvLines.push('='.repeat(100));
  csvLines.push('');

  // SECCIÓN 2: DEUDS
  csvLines.push('DEBTS');
  csvLines.push('='.repeat(100));
  csvLines.push([
    'ID',
    'Name',
    'Type',
    'Bank Name',
    'Bank Phone',
    'Local Currency',
    'Monthly Payment (Local)',
    'Monthly Payment (USD)',
    'Total Debt (Local)',
    'Total Debt (USD)',
    'Amount to Update (Local)',
    'Amount to Update (USD)',
    'In Order',
    'Current Plan',
    'Has Call Task',
    'Call Completed',
    'Last Call Date',
    'Created At',
    'Updated At'
  ].join(','));
  
  debts.forEach(debt => {
    csvLines.push([
      escapeCSV(debt.id),
      escapeCSV(debt.name),
      escapeCSV(debt.type === 'prestamo' ? 'Loan' : 'Credit Card'),
      escapeCSV(debt.bankName),
      escapeCSV(debt.bankPhone || ''),
      escapeCSV(debt.localCurrency),
      escapeCSV(debt.localFee),
      escapeCSV(debt.dollarFee),
      escapeCSV(debt.totalLocal),
      escapeCSV(debt.totalDollars),
      escapeCSV(debt.feeToUpdate),
      escapeCSV(debt.feeToUpdateDollars),
      escapeCSV(debt.inOrder ? 'Yes' : 'No'),
      escapeCSV(debt.currentPlan),
      escapeCSV(debt.hasCallTask ? 'Yes' : 'No'),
      escapeCSV(debt.callCompleted ? 'Yes' : 'No'),
      escapeCSV(formatDate(debt.lastCallDate)),
      escapeCSV(formatDate(debt.createdAt)),
      escapeCSV(formatDate(debt.updatedAt))
    ].join(','));
  });
  
  csvLines.push('');
  csvLines.push('='.repeat(100));
  csvLines.push('');

  // SECCIÓN 3: PAYMENT COMMITMENTS
  csvLines.push('PAYMENT COMMITMENTS');
  csvLines.push('='.repeat(100));
  csvLines.push([
    'ID',
    'Debt ID',
    'Debt Name',
    'Date',
    'Amount (Local)',
    'Amount (USD)',
    'Status',
    'Notes',
    'Created At',
    'Updated At',
    'Completed At'
  ].join(','));
  
  allCommitments.forEach(commitment => {
    csvLines.push([
      escapeCSV(commitment.id),
      escapeCSV(commitment.debtId),
      escapeCSV(commitment.debtName),
      escapeCSV(formatDate(commitment.date)),
      escapeCSV(commitment.amountLocal),
      escapeCSV(commitment.amountDollars),
      escapeCSV(commitment.status),
      escapeCSV(commitment.notes || ''),
      escapeCSV(formatDate(commitment.createdAt)),
      escapeCSV(formatDate(commitment.updatedAt)),
      escapeCSV(formatDate(commitment.completedAt))
    ].join(','));
  });
  
  csvLines.push('');
  csvLines.push('='.repeat(100));
  csvLines.push('');

  // SECCIÓN 4: CALL HISTORY
  csvLines.push('CALL HISTORY');
  csvLines.push('='.repeat(100));
  csvLines.push([
    'ID',
    'Debt ID',
    'Debt Name',
    'Date',
    'Notes',
    'Commitments Created',
    'Created At'
  ].join(','));
  
  allCalls.forEach(call => {
    csvLines.push([
      escapeCSV(call.id),
      escapeCSV(call.debtId),
      escapeCSV(call.debtName),
      escapeCSV(formatDate(call.date)),
      escapeCSV(call.notes),
      escapeCSV(call.commitmentsCreated?.join('; ') || ''),
      escapeCSV(formatDate(call.createdAt))
    ].join(','));
  });

  // Convertir a string y descargar
  const csvContent = csvLines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `debt-export-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};
