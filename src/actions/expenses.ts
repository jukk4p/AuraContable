"use server";

import { db } from "@/db/config";
import { expenses } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { type ActionResult, toActionError } from "@/lib/action-result";
import { DEFAULT_VAT_RATE } from "@/lib/fiscal";

// --- Types & Schemas ---

const ExpenseSchema = z.object({
  date: z.coerce.date(),
  amount: z.number().nonnegative("El importe no puede ser negativo"),
  category: z.string().min(1, "La categoría es requerida"),
  provider: z.string().min(1, "El proveedor es requerido"),
  description: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  quantity: z.number().int().min(1).optional(),
  /** Tipo de IVA soportado, en porcentaje. Lo usa la liquidación del Modelo 303. */
  vatRate: z.number().min(0).max(100).optional(),
});

type ExpenseRow = typeof expenses.$inferSelect;

function toExpense(row: ExpenseRow) {
  return {
    id: row.id,
    userId: row.userId,
    date: row.date,
    amount: row.amount / 100, // los importes se guardan en céntimos
    category: row.category,
    provider: row.provider,
    description: row.description || undefined,
    receiptUrl: row.receiptUrl || undefined,
    quantity: row.quantity,
    // numeric llega como string desde el driver.
    vatRate: Number(row.vatRate),
    createdAt: row.createdAt,
  };
}

// --- Actions ---

export async function getExpenses() {
  const userId = await requireUserId();
  const results = await db
    .select()
    .from(expenses)
    .where(eq(expenses.userId, userId))
    .orderBy(desc(expenses.date));
  return results.map(toExpense);
}

export async function getExpenseById(expenseId: string) {
  const userId = await requireUserId();
  const results = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
    .limit(1);
  return results.length ? toExpense(results[0]) : null;
}

export async function addExpense(expenseData: unknown): Promise<ActionResult<ReturnType<typeof toExpense> | null>> {
  try {
    const userId = await requireUserId();
    const v = ExpenseSchema.parse(expenseData);

    const inserted = await db.insert(expenses).values({
      userId,
      date: v.date,
      amount: Math.round(v.amount * 100),
      category: v.category,
      provider: v.provider,
      description: v.description,
      receiptUrl: v.receiptUrl,
      quantity: v.quantity ?? 1,
      vatRate: String(v.vatRate ?? DEFAULT_VAT_RATE),
    }).returning();

    revalidatePath("/dashboard/expenses");
    revalidatePath("/dashboard/documents");
    return { success: true, data: toExpense(inserted[0]) };
  } catch (error) {
    return toActionError(error, "Error interno al crear el gasto.", "addExpense");
  }
}

export async function updateExpense(expenseId: string, expenseData: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const v = ExpenseSchema.partial().parse(expenseData);

    const patch: Partial<typeof expenses.$inferInsert> = {};
    if (v.date !== undefined) patch.date = v.date;
    if (v.amount !== undefined) patch.amount = Math.round(v.amount * 100);
    if (v.category !== undefined) patch.category = v.category;
    if (v.provider !== undefined) patch.provider = v.provider;
    if (v.description !== undefined) patch.description = v.description;
    if (v.receiptUrl !== undefined) patch.receiptUrl = v.receiptUrl;
    if (v.quantity !== undefined) patch.quantity = v.quantity;
    if (v.vatRate !== undefined) patch.vatRate = String(v.vatRate);

    if (Object.keys(patch).length === 0) {
      return { success: true, data: null };
    }

    const updated = await db
      .update(expenses)
      .set(patch)
      .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
      .returning({ id: expenses.id });

    if (updated.length === 0) {
      return { success: false, error: "Gasto no encontrado." };
    }

    revalidatePath("/dashboard/expenses");
    revalidatePath("/dashboard/documents");
    return { success: true, data: null };
  } catch (error) {
    return toActionError(error, "Error interno al actualizar el gasto.", "updateExpense");
  }
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const deleted = await db
      .delete(expenses)
      .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
      .returning({ id: expenses.id });

    if (deleted.length === 0) {
      return { success: false, error: "Gasto no encontrado." };
    }

    revalidatePath("/dashboard/expenses");
    revalidatePath("/dashboard/documents");
    return { success: true, data: null };
  } catch (error) {
    return toActionError(error, "No se pudo eliminar el gasto.", "deleteExpense");
  }
}
