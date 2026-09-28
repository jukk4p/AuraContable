-- Migración sobre una base de datos que ya tiene datos.
--
--   psql "$DATABASE_URL" -f drizzle/004_receipts_invoice_number.sql
--
-- Es idempotente: se puede ejecutar más de una vez sin efectos adicionales.
-- Todo va dentro de una transacción, así que o entra completa o no entra nada.
--
-- Añade una copia (snapshot) del número de factura al recibo. Antes se leía
-- en caliente vía join con invoices; si la factura se borraba, el recibo ya
-- emitido perdía la línea "Correspondiente a la factura X" en el PDF y,
-- peor, el dashboard empezaba a contarlo como ingreso suelto (duplicando lo
-- que la factura ya había aportado antes de borrarse). Al guardar el número
-- en el propio recibo, sobrevive al borrado de la factura igual que ya
-- sobreviven client_name/client_tax_id.

BEGIN;

ALTER TABLE receipts ADD COLUMN IF NOT EXISTS invoice_number varchar(100);

-- Backfill de los recibos ya creados que siguen enlazados a una factura viva.
UPDATE receipts
SET invoice_number = invoices.invoice_number
FROM invoices
WHERE receipts.invoice_id = invoices.id
  AND receipts.invoice_number IS NULL;

COMMIT;
