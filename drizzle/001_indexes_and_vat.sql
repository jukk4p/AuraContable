-- Migración sobre una base de datos que ya tiene datos.
--
--   psql "$DATABASE_URL" -f drizzle/001_indexes_and_vat.sql
--
-- Es idempotente: se puede ejecutar más de una vez sin efectos adicionales.
-- Todo va dentro de una transacción, así que o entra completa o no entra nada.

BEGIN;

-- 1. Comprobación previa: el índice único de más abajo falla si ya existe algún
--    número de factura repetido dentro de una misma cuenta. Mejor abortar aquí
--    con un mensaje claro que con un error de constraint.
DO $$
DECLARE
  duplicados text;
BEGIN
  SELECT string_agg(format('usuario %s → %s (x%s)', user_id, invoice_number, n), ', ')
    INTO duplicados
    FROM (
      SELECT user_id, invoice_number, COUNT(*) AS n
        FROM invoices
       GROUP BY user_id, invoice_number
      HAVING COUNT(*) > 1
    ) d;

  IF duplicados IS NOT NULL THEN
    RAISE EXCEPTION
      'Hay números de factura repetidos, renuméralos antes de migrar: %', duplicados;
  END IF;
END $$;

-- 2. Índices sobre las columnas por las que filtra cada consulta. No existía
--    ninguno, así que cada listado recorría la tabla entera.
CREATE INDEX IF NOT EXISTS clients_user_id_idx        ON clients (user_id);
CREATE INDEX IF NOT EXISTS invoices_user_id_idx       ON invoices (user_id);
CREATE INDEX IF NOT EXISTS invoices_client_id_idx     ON invoices (client_id);
CREATE INDEX IF NOT EXISTS invoice_items_invoice_id_idx ON invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS invoice_taxes_invoice_id_idx ON invoice_taxes (invoice_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx  ON notifications (user_id);
CREATE INDEX IF NOT EXISTS expenses_user_id_idx       ON expenses (user_id);

-- 3. Una serie de facturación no puede repetir número dentro de la misma cuenta.
CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_number_unq
  ON invoices (user_id, invoice_number);

-- 4. Un perfil de empresa por usuario: el código ya lo daba por hecho.
CREATE UNIQUE INDEX IF NOT EXISTS company_profiles_user_id_unq
  ON company_profiles (user_id);

-- 5. Los porcentajes eran enteros, así que no admitían un 21,5 % ni un 4,5 %.
--    La conversión conserva los valores actuales.
ALTER TABLE invoice_taxes
  ALTER COLUMN percentage TYPE numeric(5, 2) USING percentage::numeric(5, 2);

-- 6. IVA soportado por gasto. Sin este dato el Modelo 303 solo podía estimar la
--    cuota deducible aplicando un 21 % a ciegas. Los gastos ya registrados se
--    quedan con el 21 %, que es lo que la app venía suponiendo para todos.
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS vat_rate numeric(5, 2) NOT NULL DEFAULT 21;

COMMIT;
