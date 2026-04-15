import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not defined in .env file");
}

async function seed() {
  if (!connectionString) return;
  
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  console.log("🌱 Seeding Admin User...");
  
  const ADMIN_EMAIL = 'admin@auracontable.com';
  const ADMIN_PASS = 'Aura.2026!';
  const ADMIN_NAME = 'Usuario Administrador';

  try {
    const hashedPassword = await bcrypt.hash(ADMIN_PASS, 10);

    // Using raw SQL or mapping directly to check existence
    const existing = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL));
    
    if (existing.length > 0) {
      console.log("⚠️ User already exists. Updating password...");
      await db.update(users)
        .set({ passwordHash: hashedPassword, name: ADMIN_NAME })
        .where(eq(users.email, ADMIN_EMAIL));
    } else {
      console.log("✨ Creating new admin user...");
      await db.insert(users).values({
        email: ADMIN_EMAIL,
        passwordHash: hashedPassword,
        name: ADMIN_NAME,
      });
    }

    console.log("✅ Admin user seeded successfully!");
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${ADMIN_PASS}`);
    
  } catch (error) {
    console.error("❌ Error seeding admin user:", error);
  } finally {
    await client.end();
  }
}

seed();
