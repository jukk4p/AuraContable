/**
 * Aplica un archivo .sql suelto contra DATABASE_URL.
 *
 * Existe porque las migraciones de este proyecto se escriben a mano (no hay
 * historial de drizzle-kit) y no siempre hay un psql a mano.
 *
 *   npx tsx scripts/run-migration.ts drizzle/001_indexes_and_vat.sql
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: npx tsx scripts/run-migration.ts <archivo.sql>');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL no está definida.');
    process.exit(1);
  }

  const sqlPath = path.resolve(file);
  if (!fs.existsSync(sqlPath)) {
    console.error(`No existe el archivo: ${sqlPath}`);
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false, max: 1 });

  try {
    console.log(`▶ Aplicando ${path.basename(sqlPath)}...`);
    await sql.unsafe(fs.readFileSync(sqlPath, 'utf8'));
    console.log('✅ Migración aplicada.');
  } catch (error: any) {
    console.error('❌ La migración ha fallado y se ha revertido:');
    console.error(`   ${error.message}`);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
