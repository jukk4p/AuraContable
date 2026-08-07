/**
 * Etiqueta compacta para el eje de importes de un gráfico.
 *
 * El formateador anterior era `${value / 1000}k` sin condición, así que con las
 * magnitudes habituales de una pyme el eje mostraba "0.15k" o "0.45k" en lugar
 * de 150 € o 450 €. Solo se abrevia cuando abreviar aporta algo.
 */
export function formatAxisAmount(value: number, currencySymbol = "€"): string {
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return `${trimZeros(value / 1_000_000)}M ${currencySymbol}`;
  }
  if (abs >= 1_000) {
    return `${trimZeros(value / 1_000)}k ${currencySymbol}`;
  }
  return `${Math.round(value)} ${currencySymbol}`;
}

/** 1.50 → "1,5"; 2.00 → "2". Coma decimal, como en es-ES. */
function trimZeros(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "").replace(".", ",");
}
