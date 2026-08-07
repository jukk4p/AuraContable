import { z } from "zod";
import { UnauthorizedError } from "./session";

/**
 * Resultado uniforme de un Server Action.
 *
 * Estaba declarado por triplicado (clients, company, invoices); vive aquí para
 * que la UI trate igual todos los errores.
 */
export type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string; unauthorized?: true };

/**
 * Convierte una excepción en un error de acción presentable.
 *
 * Los detalles internos se quedan en el log del servidor: al cliente solo le
 * llega el mensaje de validación de Zod, que sí es suyo, o un texto genérico.
 */
export function toActionError(
  error: unknown,
  fallback: string,
  context: string,
): { success: false; error: string; unauthorized?: true } {
  if (error instanceof UnauthorizedError) {
    return { success: false, error: error.message, unauthorized: true };
  }
  if (error instanceof z.ZodError) {
    return { success: false, error: error.errors[0].message };
  }
  console.error(`[${context}]`, error);
  return { success: false, error: fallback };
}
