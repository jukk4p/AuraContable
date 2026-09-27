-- Migración sobre una base de datos que ya tiene datos.
--
--   psql "$DATABASE_URL" -f drizzle/002_invoice_payments.sql
--
-- Es idempotente: se puede ejecutar más de una vez sin efectos adicionales.
-- Todo va dentro de una transacción, así que o entra completa o no entra nada.

BEGIN;

-- gen_random_uuid() es nativo desde PostgreSQL 13, pero se asegura por si acaso
-- (igual que el resto de tablas uuid del proyecto).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  paid_at timestamp NOT NULL,
  method varchar(50),
  note text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_payments_invoice_id_idx
  ON invoice_payments (invoice_id);

COMMIT;
