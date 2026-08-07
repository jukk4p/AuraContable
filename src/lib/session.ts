import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/**
 * Error de autorización. Las acciones lo lanzan cuando no hay sesión; la UI lo
 * distingue de un fallo de red para poder mandar al usuario al login.
 */
export class UnauthorizedError extends Error {
  constructor(message = "Debes iniciar sesión para realizar esta acción.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Identidad del usuario que ejecuta la acción, resuelta en el servidor.
 *
 * Un Server Action es un endpoint HTTP público: cualquier cosa que llegue por
 * parámetro es entrada del cliente y no prueba nada. Antes el `userId` viajaba
 * como argumento desde `useSession()`, así que bastaba con cambiarlo en la
 * petición para leer o escribir los datos de otra cuenta. La sesión es la única
 * fuente admisible.
 */
export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();
  return userId;
}
