-- Migración sobre una base de datos que ya tiene datos.
--
--   psql "$DATABASE_URL" -f drizzle/003_receipts.sql
--
-- Es idempotente: se puede ejecutar más de una vez sin efectos adicionales.
-- Todo va dentro de una transacción, así que o entra completa o no entra nada.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name varchar(255) NOT NULL,
  client_tax_id varchar(100),
  receipt_number varchar(50) NOT NULL,
  concept text NOT NULL,
  amount integer NOT NULL,
  received_at timestamp NOT NULL,
  method varchar(50),
  note text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS receipts_user_id_idx ON receipts (user_id);
CREATE INDEX IF NOT EXISTS receipts_invoice_id_idx ON receipts (invoice_id);
CREATE INDEX IF NOT EXISTS receipts_client_id_idx ON receipts (client_id);

COMMIT;
