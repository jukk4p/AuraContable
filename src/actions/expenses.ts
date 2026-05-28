"use server";

import { db } from "@/db/config";
import { expenses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Expense } from "@/lib/types";

export async function getExpenses(userId: string): Promise<any[]> {
  if (!userId) return [];
  const results = await db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(desc(expenses.date));
  return results.map(row => ({
    id: row.id,
    userId: row.userId,
    date: row.date,
    amount: row.amount / 100, // back to euros
    category: row.category,
    provider: row.provider,
    description: row.description || undefined,
    receiptUrl: row.receiptUrl || undefined,
    quantity: row.quantity,
    createdAt: row.createdAt,
  }));
}

export async function addExpense(expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<any> {
  const newExpense = await db.insert(expenses).values({
    userId: expenseData.userId,
    date: expenseData.date,
    amount: Math.round(expenseData.amount * 100),
    category: expenseData.category,
    provider: expenseData.provider,
    description: expenseData.description,
    receiptUrl: expenseData.receiptUrl,
    quantity: expenseData.quantity || 1,
  }).returning();
  
  const row = newExpense[0];
  return {
    id: row.id,
    userId: row.userId,
    date: row.date,
    amount: row.amount / 100,
    category: row.category,
    provider: row.provider,
    description: row.description || undefined,
    receiptUrl: row.receiptUrl || undefined,
    quantity: row.quantity,
  };
}

export async function updateExpense(expenseId: string, expenseData: Partial<Omit<Expense, 'id' | 'userId'>>): Promise<void> {
  let updateObj: any = {};
  if (expenseData.amount !== undefined) updateObj.amount = Math.round(expenseData.amount * 100);
  if (expenseData.date !== undefined) updateObj.date = expenseData.date;
  if (expenseData.category !== undefined) updateObj.category = expenseData.category;
  if (expenseData.provider !== undefined) updateObj.provider = expenseData.provider;
  if (expenseData.description !== undefined) updateObj.description = expenseData.description;
  if (expenseData.hasOwnProperty('receiptUrl')) updateObj.receiptUrl = expenseData.receiptUrl;
  if (expenseData.quantity !== undefined) updateObj.quantity = expenseData.quantity;

  await db.update(expenses).set(updateObj).where(eq(expenses.id, expenseId));
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, expenseId));
}
