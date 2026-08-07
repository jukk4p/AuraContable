"use server";

import { db } from "@/db/config";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

const BCRYPT_ROUNDS = 12;

const RegisterSchema = z.object({
  email: z.string().email("Introduce un correo electrónico válido."),
  password: z.string()
    .min(10, "La contraseña debe tener al menos 10 caracteres.")
    .max(200, "La contraseña es demasiado larga."),
  name: z.string().max(255).optional().nullable(),
});

export async function registerUser(input: unknown): Promise<{ error?: string, success?: boolean }> {
  try {
    const parsed = RegisterSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.errors[0].message };
    }

    const { password, name } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return { error: "Este correo electrónico ya está en uso." };
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await db.insert(users).values({
      email,
      passwordHash,
      name: name?.trim() || email.split("@")[0],
    });

    return { success: true };
  } catch (error: any) {
    // La unicidad de email la garantiza el índice de la tabla: si dos registros
    // simultáneos pasan la comprobación previa, aquí se resuelve el empate.
    if (error?.code === "23505") {
      return { error: "Este correo electrónico ya está en uso." };
    }
    console.error("[registerUser]", error);
    return { error: "Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo." };
  }
}
