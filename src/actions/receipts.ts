"use server";

import { db } from "@/db/config";
import { receipts, invoices, clients } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { type ActionResult, toActionError } from "@/lib/action-result";
import type { Receipt } from "@/lib/types";

const ReceiptSchema = z.object({
  receiptNumber: z.string().min(1, "El número de recibo es obligatorio"),
  clientId: z.string().uuid().optional(),
  clientName: z.string().min(1, "El nombre del cliente es obligatorio"),
  clientTaxId: z.string().optional(),
  concept: z.string().min(1, "El concepto es obligatorio"),
  amount: z.number().positive("El importe debe ser mayor que 0"),
  receivedAt: z.coerce.date(),
  method: z.enum(['Transferencia', 'Efectivo', 'Otro']).optional(),
  note: z.string().optional(),
  invoiceId: z.string().uuid().optional(),
});

function mapReceipt(row: any): Receipt {
  return {
    id: row.id,
    userId: row.userId,
    invoiceId: row.invoiceId || null,
    invoiceNumber: row.invoice?.invoiceNumber || null,
    clientId: row.clientId || null,
    clientName: row.clientName,
    clientTaxId: row.clientTaxId || undefined,
    receiptNumber: row.receiptNumber,
    concept: row.concept,
    amount: row.amount / 100,
    receivedAt: row.receivedAt,
    method: row.method || undefined,
    note: row.note || undefined,
    createdAt: row.createdAt,
  };
}

export async function createReceipt(data: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const v = ReceiptSchema.parse(data);

    if (v.invoiceId) {
      const owned = await db.query.invoices.findFirst({
        where: and(eq(invoices.id, v.invoiceId), eq(invoices.userId, userId)),
      });
      if (!owned) return { success: false, error: "Factura no encontrada." };
    }

    if (v.clientId) {
      const owned = await db.query.clients.findFirst({
        where: and(eq(clients.id, v.clientId), eq(clients.userId, userId)),
      });
      if (!owned) return { success: false, error: "Cliente no encontrado." };
    }

    const inserted = await db.insert(receipts).values({
      userId,
      invoiceId: v.invoiceId,
      clientId: v.clientId,
      clientName: v.clientName,
      clientTaxId: v.clientTaxId,
      receiptNumber: v.receiptNumber,
      concept: v.concept,
      amount: Math.round(v.amount * 100),
      receivedAt: v.receivedAt,
      method: v.method,
      note: v.note,
    }).returning();

    revalidatePath("/dashboard/receipts");
    revalidatePath("/dashboard");
    if (v.invoiceId) revalidatePath(`/dashboard/invoices/${v.invoiceId}`);

    return { success: true, data: { id: inserted[0].id } };
  } catch (error) {
    return toActionError(error, "No se pudo crear el recibo.", "createReceipt");
  }
}

export async function deleteReceipt(receiptId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    const row = await db.query.receipts.findFirst({ where: eq(receipts.id, receiptId) });
    if (!row || row.userId !== userId) {
      return { success: false, error: "Recibo no encontrado." };
    }

    await db.delete(receipts).where(eq(receipts.id, receiptId));

    revalidatePath("/dashboard/receipts");
    revalidatePath("/dashboard");
    if (row.invoiceId) revalidatePath(`/dashboard/invoices/${row.invoiceId}`);

    return { success: true, data: null };
  } catch (error) {
    return toActionError(error, "No se pudo eliminar el recibo.", "deleteReceipt");
  }
}

export async function getReceipts(): Promise<Receipt[]> {
  const userId = await requireUserId();
  const rows = await db.query.receipts.findMany({
    where: eq(receipts.userId, userId),
    with: { invoice: true },
    orderBy: [desc(receipts.createdAt)],
  });
  return rows.map(mapReceipt);
}
