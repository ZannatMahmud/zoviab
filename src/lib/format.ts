export function formatBDT(amount: number): string {
  return `\u09F3${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export const DELIVERY_FEE = 80;
export const FREE_DELIVERY_THRESHOLD = 3000;
