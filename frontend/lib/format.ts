export function formatPrice(value: string | number): string {
  const n = Number(value);
  if (isNaN(n)) return '0';
  return n.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
