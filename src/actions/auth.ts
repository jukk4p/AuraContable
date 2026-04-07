"use server";

import { db } from "@/db/config";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function registerUser({ email, password, name }: any): Promise<{ error?: string, success?: boolean }> {
  try {
    if (!email || !password) {
      return { error: "Email y contraseña son obligatorios." };
    }

    // Check if user already exists
    const existingUsers = await db.select().from(users).where(eq(users.email, email));
    
    if (existingUsers.length > 0) {
      return { error: "Este correo electrónico ya está en uso." };
    }

    // Hash the password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save user in database
    await db.insert(users).values({
      email,
      passwordHash,
      name: name || email.split("@")[0],
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error al registrar usuario: ", error);
    return { error: "Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo." };
  }
}
