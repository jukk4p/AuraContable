"use server";

import { db } from "@/db/config";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Client } from "@/lib/types";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// --- Types & Schemas ---

export type ActionResult<T = any> = 
  | { success: true; data: T }
  | { success: false; error: string };

const ClientSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// --- Actions ---

export async function getClients(userId: string): Promise<Client[]> {
  if (!userId) return [];
  const results = await db.select().from(clients).where(eq(clients.userId, userId));
  return results.map(row => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    email: row.email,
    address: row.address || undefined,
    country: row.country || undefined,
    taxId: row.taxId || undefined,
    phone: row.phone || undefined,
    notes: row.notes || undefined,
    createdAt: row.createdAt,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function addClient(clientData: any): Promise<ActionResult<Client>> {
  try {
    const validated = ClientSchema.parse(clientData);
    const newClientDoc = await db.insert(clients).values({
      userId: validated.userId,
      name: validated.name,
      email: validated.email,
      address: validated.address,
      country: validated.country,
      taxId: validated.taxId,
      phone: validated.phone,
      notes: validated.notes,
    }).returning();
    
    const row = newClientDoc[0];
    const client: Client = {
      id: row.id,
      userId: row.userId,
      name: row.name,
      email: row.email,
      address: row.address || undefined,
      country: row.country || undefined,
      taxId: row.taxId || undefined,
      phone: row.phone || undefined,
      notes: row.notes || undefined,
      createdAt: row.createdAt,
    };

    revalidatePath("/dashboard/clients");
    return { success: true, data: client };
  } catch (error) {
    console.error("Error adding client:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Error interno al crear el cliente." };
  }
}

export async function updateClient(clientId: string, clientData: any): Promise<ActionResult> {
  try {
    const validated = ClientSchema.partial().parse(clientData);
    await db.update(clients).set({
      name: validated.name,
      email: validated.email,
      address: validated.address,
      country: validated.country,
      taxId: validated.taxId,
      phone: validated.phone,
      notes: validated.notes,
    }).where(eq(clients.id, clientId));

    revalidatePath("/dashboard/clients");
    return { success: true, data: null };
  } catch (error) {
    console.error("Error updating client:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Error interno al actualizar el cliente." };
  }
}

export async function deleteClient(clientId: string): Promise<ActionResult> {
  try {
    await db.delete(clients).where(eq(clients.id, clientId));
    revalidatePath("/dashboard/clients");
    return { success: true, data: null };
  } catch (error) {
    console.error("Error deleting client:", error);
    return { success: false, error: "No se pudo eliminar el cliente." };
  }
}
