export function formatPrice(value: string | number): string {
  const n = Number(value);
  if (isNaN(n)) return '0,00';
  return n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
