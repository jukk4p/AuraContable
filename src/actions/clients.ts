"use server";

import { db } from "@/db/config";
import { clients } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { Client } from "@/lib/types";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { type ActionResult, toActionError } from "@/lib/action-result";

// --- Types & Schemas ---

const ClientSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function toClient(row: typeof clients.$inferSelect): Client {
  return {
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
}

// --- Actions ---

export async function getClients(): Promise<Client[]> {
  const userId = await requireUserId();
  const results = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, userId))
    .orderBy(asc(clients.name));
  return results.map(toClient);
}

export async function addClient(clientData: unknown): Promise<ActionResult<Client | null>> {
  try {
    const userId = await requireUserId();
    const validated = ClientSchema.parse(clientData);
    const inserted = await db.insert(clients).values({ ...validated, userId }).returning();

    revalidatePath("/dashboard/clients");
    return { success: true, data: toClient(inserted[0]) };
  } catch (error) {
    return toActionError(error, "Error interno al crear el cliente.", "addClient");
  }
}

export async function updateClient(clientId: string, clientData: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const validated = ClientSchema.partial().parse(clientData);

    // El filtro por userId es lo que impide editar el cliente de otra cuenta
    // pasando un id ajeno: sin él, el id bastaba para escribir donde fuera.
    const updated = await db
      .update(clients)
      .set(validated)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
      .returning({ id: clients.id });

    if (updated.length === 0) {
      return { success: false, error: "Cliente no encontrado." };
    }

    revalidatePath("/dashboard/clients");
    return { success: true, data: null };
  } catch (error) {
    return toActionError(error, "Error interno al actualizar el cliente.", "updateClient");
  }
}

export async function deleteClient(clientId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const deleted = await db
      .delete(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
      .returning({ id: clients.id });

    if (deleted.length === 0) {
      return { success: false, error: "Cliente no encontrado." };
    }

    revalidatePath("/dashboard/clients");
    return { success: true, data: null };
  } catch (error) {
    return toActionError(error, "No se pudo eliminar el cliente.", "deleteClient");
  }
}
