"use server";

import { db } from "@/db/config";
import { invoices, invoicePayments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { type ActionResult, toActionError } from "@/lib/action-result";
import { createNotification } from "./notifications";

const InvoicePaymentSchema = z.object({
  amount: z.number().positive("El importe debe ser mayor que 0"),
  paidAt: z.coerce.date(),
  method: z.enum(['Transferencia', 'Efectivo', 'Otro']).optional(),
  note: z.string().optional(),
});

/** Suma en céntimos de los pagos ya registrados para una factura. */
async function getAmountPaid(executor: typeof db, invoiceId: string): Promise<number> {
  const rows = await executor
    .select({ amount: invoicePayments.amount })
    .from(invoicePayments)
    .where(eq(invoicePayments.invoiceId, invoiceId));
  return rows.reduce((sum, r) => sum + r.amount, 0);
}

/**
 * Recalcula el estado de una factura a partir de la suma real de sus pagos.
 *
 * Nunca hace retroceder un estado puesto a mano (Overdue/Draft/Paid manual):
 * solo gestiona las transiciones que el propio sistema generó
 * (Pending <-> PartiallyPaid <-> Paid). Así borrar un pago suelto en una
 * factura marcada Overdue no la devuelve a Pending por sorpresa.
 */
async function recomputeInvoiceStatus(tx: typeof db, invoiceId: string): Promise<void> {
  const invoice = await tx.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!invoice) return;

  // 'Paid' es una afirmación deliberada (botón manual, o el saldo ya llegó a
  // 0€ antes). Nunca se deshace solo porque alguien añade o borra un abono
  // suelto después — si no, registrar un pago parcial sobre una factura ya
  // marcada Paid a mano la haría "retroceder" a PartiallyPaid.
  if (invoice.status === 'Paid') return;

  const amountPaid = await getAmountPaid(tx, invoiceId);
  const amountDue = Math.max(invoice.total - amountPaid, 0);

  let nextStatus = invoice.status;
  if (amountDue <= 0) {
    nextStatus = 'Paid';
  } else if (amountPaid > 0) {
    nextStatus = 'PartiallyPaid';
  } else if (invoice.status === 'PartiallyPaid') {
    nextStatus = 'Pending';
  }

  if (nextStatus !== invoice.status) {
    await tx.update(invoices).set({ status: nextStatus }).where(eq(invoices.id, invoiceId));
  }
}

export async function addInvoicePayment(
  invoiceId: string,
  data: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const v = InvoicePaymentSchema.parse(data);

    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)),
    });
    if (!invoice) return { success: false, error: "Factura no encontrada." };

    const amountPaidSoFar = await getAmountPaid(db, invoiceId);
    const amountDue = Math.max(invoice.total - amountPaidSoFar, 0);
    const amountCents = Math.round(v.amount * 100);

    if (amountCents > amountDue) {
      return {
        success: false,
        error: `El importe supera el pendiente (${(amountDue / 100).toFixed(2)}€).`,
      };
    }

    const created = await db.transaction(async (tx) => {
      const inserted = await tx.insert(invoicePayments).values({
        invoiceId,
        amount: amountCents,
        paidAt: v.paidAt,
        method: v.method,
        note: v.note,
      }).returning();

      await recomputeInvoiceStatus(tx as unknown as typeof db, invoiceId);

      return inserted[0];
    });

    await createNotification({
      userId,
      title: "Pago Registrado",
      body: `Se ha registrado un abono de ${(amountCents / 100).toFixed(2)}€ en la factura ${invoice.invoiceNumber}.`,
      href: `/dashboard/invoices/${invoiceId}`,
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return toActionError(error, "No se pudo registrar el pago.", "addInvoicePayment");
  }
}

export async function deleteInvoicePayment(paymentId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    const row = await db.query.invoicePayments.findFirst({
      where: eq(invoicePayments.id, paymentId),
      with: { invoice: true },
    });
    if (!row || row.invoice.userId !== userId) {
      return { success: false, error: "Pago no encontrado." };
    }

    const invoiceId = row.invoiceId;

    await db.transaction(async (tx) => {
      await tx.delete(invoicePayments).where(eq(invoicePayments.id, paymentId));
      await recomputeInvoiceStatus(tx as unknown as typeof db, invoiceId);
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    return { success: true, data: null };
  } catch (error) {
    return toActionError(error, "No se pudo eliminar el pago.", "deleteInvoicePayment");
  }
}
