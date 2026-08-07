/**
 * @fileoverview Cálculos fiscales y de periodo derivados de la fecha real.
 *
 * Antes cada pantalla llevaba su propia "demo logic": el trimestre y los meses
 * del gráfico estaban escritos a mano y el IVA se estimaba con un 21% fijo,
 * ignorando los impuestos que el usuario define en cada factura. Todo eso vive
 * aquí ahora y sale de los datos reales.
 */

import {
  startOfQuarter,
  endOfQuarter,
  getQuarter,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  isWithinInterval,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import type { Invoice, InvoiceTax } from "./types";

/**
 * Tipo de IVA que se asigna a un gasto cuando no se indica otro.
 *
 * Cada gasto guarda su propio `vatRate`; este valor solo cubre el alta sin dato
 * explícito y los registros anteriores a que existiera la columna.
 */
export const DEFAULT_VAT_RATE = 21;

/** Facturas en borrador no devengan IVA: aún no se han emitido. */
const TAXABLE_STATUSES = new Set(["Paid", "Pending", "Overdue"]);

const VAT_NAME = /iva|vat/i;
const RETENTION_NAME = /irpf|retenc/i;

const QUARTER_NAMES = ["Primer", "Segundo", "Tercer", "Cuarto"];

export type FiscalPeriod = {
  quarter: number;
  year: number;
  start: Date;
  end: Date;
  /** Etiqueta lista para pintar, p.ej. "Q3 · Tercer Trimestre 2026". */
  label: string;
};

/** Trimestre natural al que pertenece `ref`. */
export function getFiscalPeriod(ref: Date = new Date()): FiscalPeriod {
  const quarter = getQuarter(ref);
  const year = ref.getFullYear();
  return {
    quarter,
    year,
    start: startOfQuarter(ref),
    end: endOfQuarter(ref),
    label: `Q${quarter} · ${QUARTER_NAMES[quarter - 1]} Trimestre ${year}`,
  };
}

/**
 * Próximo vencimiento de autoliquidación trimestral.
 *
 * En España el plazo va del 1 al 20 del mes siguiente al cierre del trimestre
 * (20 abr / 20 jul / 20 oct / 20 ene). Si el del trimestre en curso ya pasó,
 * devuelve el siguiente.
 */
export function getNextFilingDeadline(ref: Date = new Date()): { date: Date; daysLeft: number } {
  let deadline = new Date(endOfQuarter(ref).getFullYear(), endOfQuarter(ref).getMonth() + 1, 20);
  if (deadline < ref) {
    deadline = new Date(endOfQuarter(addMonths(ref, 3)).getFullYear(), endOfQuarter(addMonths(ref, 3)).getMonth() + 1, 20);
  }
  const daysLeft = Math.ceil((deadline.getTime() - ref.getTime()) / 86_400_000);
  return { date: deadline, daysLeft };
}

export type MonthBucket = {
  /** Etiqueta corta del mes ("ene", "feb", …). */
  label: string;
  year: number;
  month: number;
};

/**
 * Los últimos `count` meses terminando en el de `ref`.
 *
 * Incluye el año en cada bucket: agrupar solo por `getMonth()` mezclaba en la
 * misma columna facturas de ejercicios distintos.
 */
export function getMonthBuckets(ref: Date = new Date(), count = 6): MonthBucket[] {
  return Array.from({ length: count }, (_, i) => {
    const d = startOfMonth(subMonths(ref, count - 1 - i));
    return {
      label: format(d, "LLL", { locale: es }),
      year: d.getFullYear(),
      month: d.getMonth(),
    };
  });
}

/** True si `date` cae dentro del mes del bucket (comparando también el año). */
export function isInBucket(date: Date | string, bucket: MonthBucket): boolean {
  const d = new Date(date);
  return d.getFullYear() === bucket.year && d.getMonth() === bucket.month;
}

/** True si `date` cae dentro del periodo. */
export function isInPeriod(date: Date | string, period: FiscalPeriod): boolean {
  return isWithinInterval(new Date(date), { start: period.start, end: period.end });
}

/** Desglose de una cuota por tipo impositivo, como lo pide el Modelo 303. */
export type TaxBreakdownRow = {
  /** Tipo aplicado en porcentaje (21, 10, 4…). */
  rate: number;
  /** Base imponible acumulada a ese tipo. */
  base: number;
  /** Cuota resultante. */
  quota: number;
};

export type VatSummary = {
  period: FiscalPeriod;
  /** Base imponible de las facturas emitidas en el periodo. */
  salesBase: number;
  /** IVA repercutido, calculado desde los impuestos reales de cada factura. */
  vatCharged: number;
  vatChargedRows: TaxBreakdownRow[];
  /** Retenciones de IRPF aplicadas en factura (informativo, no va al 303). */
  retentions: number;
  /** Otros tributos en factura que no son ni IVA ni retención. */
  otherTaxes: number;
  /** Base de los gastos del periodo (importe sin IVA). */
  purchaseBase: number;
  /** IVA soportado, extraído con el tipo guardado en cada gasto. */
  vatDeductible: number;
  /** Desglose del IVA soportado por tipo. */
  vatDeductibleRows: TaxBreakdownRow[];
  /** Resultado de la liquidación: positivo a ingresar, negativo a devolver. */
  vatDue: number;
};

function classify(tax: InvoiceTax): "vat" | "retention" | "other" {
  if (VAT_NAME.test(tax.name)) return "vat";
  if (RETENTION_NAME.test(tax.name) || tax.percentage < 0) return "retention";
  return "other";
}

/**
 * Liquidación de IVA del periodo a partir de los datos reales.
 *
 * El IVA repercutido sale de la tabla `invoiceTaxes` de cada factura, no de un
 * tipo fijo. Los impuestos se clasifican por nombre porque el modelo de datos
 * guarda tributos genéricos: lo que no es IVA se separa en retenciones y otros
 * para que nada quede fuera del desglose sin avisar.
 */
export function computeVatSummary(
  invoices: Invoice[],
  expenses: { date: Date | string; amount: number; vatRate?: number }[],
  period: FiscalPeriod = getFiscalPeriod(),
): VatSummary {
  const issued = invoices.filter(
    (i) => TAXABLE_STATUSES.has(i.status as string) && isInPeriod(i.issueDate, period),
  );

  const rates = new Map<number, TaxBreakdownRow>();
  let salesBase = 0;
  let vatCharged = 0;
  let retentions = 0;
  let otherTaxes = 0;

  for (const invoice of issued) {
    const base = invoice.subtotal ?? 0;
    salesBase += base;

    for (const tax of invoice.taxes ?? []) {
      const quota = base * (tax.percentage / 100);
      switch (classify(tax)) {
        case "vat": {
          vatCharged += quota;
          const row = rates.get(tax.percentage) ?? { rate: tax.percentage, base: 0, quota: 0 };
          row.base += base;
          row.quota += quota;
          rates.set(tax.percentage, row);
          break;
        }
        case "retention":
          retentions += quota;
          break;
        default:
          otherTaxes += quota;
      }
    }
  }

  // El importe registrado de un gasto es el bruto del recibo; la cuota se
  // extrae con el tipo que lleva cada gasto, no con uno fijo para todos.
  const purchaseRates = new Map<number, TaxBreakdownRow>();
  let purchaseBase = 0;
  let vatDeductible = 0;

  for (const expense of expenses.filter((e) => isInPeriod(e.date, period))) {
    const rate = expense.vatRate ?? DEFAULT_VAT_RATE;
    const gross = expense.amount || 0;
    const base = gross / (1 + rate / 100);
    const quota = gross - base;

    purchaseBase += base;
    vatDeductible += quota;

    const row = purchaseRates.get(rate) ?? { rate, base: 0, quota: 0 };
    row.base += base;
    row.quota += quota;
    purchaseRates.set(rate, row);
  }

  return {
    period,
    salesBase,
    vatCharged,
    vatChargedRows: [...rates.values()].sort((a, b) => b.rate - a.rate),
    retentions,
    otherTaxes,
    purchaseBase,
    vatDeductible,
    vatDeductibleRows: [...purchaseRates.values()].sort((a, b) => b.rate - a.rate),
    vatDue: vatCharged - vatDeductible,
  };
}
