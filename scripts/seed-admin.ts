/**
 * Alta del usuario inicial.
 *
 * Las credenciales vienen del entorno: antes estaban escritas en este archivo y
 * quedaron en el historial de git, además de que el script pisaba la contraseña
 * del usuario existente en cada ejecución.
 *
 *   SEED_ADMIN_EMAIL=tu@correo.com SEED_ADMIN_PASSWORD='...' npx tsx scripts/seed-admin.ts
 *
 * Para reescribir la contraseña de un usuario que ya existe hay que pedirlo
 * explícitamente con SEED_ADMIN_FORCE=true.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 10;

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Usuario Administrador';
  const force = process.env.SEED_ADMIN_FORCE === 'true';

  if (!connectionString) fail('DATABASE_URL no está definida.');
  if (!email) fail('Define SEED_ADMIN_EMAIL.');
  if (!password) fail('Define SEED_ADMIN_PASSWORD.');
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(`SEED_ADMIN_PASSWORD debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  const client = postgres(connectionString, { prepare: false, max: 1 });
  const db = drizzle(client);

  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

    if (existing.length > 0) {
      if (!force) {
        console.log(`⚠️  ${email} ya existe. No se toca nada.`);
        console.log('   Para reescribir su contraseña: SEED_ADMIN_FORCE=true');
        return;
      }
      await db.update(users)
        .set({ passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS), name })
        .where(eq(users.email, email));
      console.log(`✅ Contraseña de ${email} actualizada.`);
      return;
    }

    await db.insert(users).values({
      email,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      name,
    });
    console.log(`✅ Usuario ${email} creado.`);
  } catch (error) {
    console.error('❌ Error al crear el usuario:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

seed();
