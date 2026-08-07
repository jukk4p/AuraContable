import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Fallar aquí, al arrancar, en vez de en la primera consulta con un error
  // opaco de conexión.
  throw new Error('DATABASE_URL no está definida.');
}

/**
 * Pool acotado y con timeouts explícitos.
 *
 * Sin `max` el driver abre hasta 10 conexiones por instancia, y con el hot
 * reload de desarrollo se acumulan pools por cada recarga del módulo; contra un
 * Postgres serverless eso agota el límite de conexiones y las peticiones
 * empiezan a fallar. El cliente se cachea en `globalThis` por el mismo motivo.
 */
const createClient = () =>
  postgres(connectionString, {
    prepare: false, // no soportado en modo de pool "Transaction"
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 10,
  });

const globalForDb = globalThis as unknown as {
  auraDbClient?: ReturnType<typeof createClient>;
};

export const client = globalForDb.auraDbClient ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.auraDbClient = client;
}

export const db = drizzle(client, { schema });
