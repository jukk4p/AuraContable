# Pagos parciales de facturas — diseño

**Fecha:** 2026-09-27
**Estado:** Aprobado por el usuario, pendiente de plan de implementación.

## Contexto y motivación

Un usuario factura un servicio (p. ej. mantenimiento web, 360€) y el cliente
lo paga en varios abonos a lo largo del tiempo (p. ej. cada 6 meses una
parte) en vez de de una sola vez. Hoy el modelo de facturas es todo-o-nada:
`status` solo admite `Draft | Pending | Overdue | Paid`, y los cobros por
Stripe/PayPal exigen que el importe capturado coincida exactamente con el
total de la factura. No existe ningún sitio donde anotar "he cobrado 180€ de
esta factura de 360€".

Este documento define cómo se registran esos abonos parciales, cómo afectan
al estado de la factura y qué cambia en la UI (panel del usuario y página
pública que ve el cliente).

## Decisiones ya tomadas con el usuario

- Los pagos parciales se registran **a mano** (fecha, importe, método,
  nota opcional). No pasan por Stripe/PayPal — esas pasarelas siguen
  cobrando el importe total exacto, sin cambios en su lógica de captura.
- Se añade un estado nuevo, `PartiallyPaid`, visible en el badge y en los
  filtros de la lista de facturas.
- Los abonos se pueden **borrar** (no editar) si se registraron por error.
- El cliente ve el saldo pendiente en la página pública de la factura
  (`/invoice/[id]`).

## 1. Base de datos

Tabla nueva `invoice_payments` (Drizzle, en `src/db/schema.ts`, siguiendo el
mismo estilo que `invoiceItems`/`invoiceTaxes`):

```ts
export const invoicePayments = pgTable('invoice_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(), // céntimos, igual que el resto de importes
  paidAt: timestamp('paid_at').notNull(),
  method: varchar('method', { length: 50 }), // 'Transferencia' | 'Efectivo' | 'Otro'
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  invoiceIdx: index('invoice_payments_invoice_id_idx').on(table.invoiceId),
}));

export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoicePayments.invoiceId],
    references: [invoices.id],
  }),
}));
```

Y en `invoicesRelations`: añadir `payments: many(invoicePayments)`.

Migración `drizzle/002_invoice_payments.sql`, con el mismo estilo que
`001_indexes_and_vat.sql`: envuelta en `BEGIN;`/`COMMIT;`, usando
`CREATE TABLE IF NOT EXISTS` y `CREATE INDEX IF NOT EXISTS` para ser
idempotente, y con un comentario arriba indicando que se aplica a mano con
`psql "$DATABASE_URL" -f drizzle/002_invoice_payments.sql`. No se usa
`drizzle-kit generate`, porque este proyecto no lo usa para migraciones
(ver `001_indexes_and_vat.sql`, escrito a mano).

## 2. Estado de la factura

`InvoiceStatus` (`src/lib/types.ts`) pasa a ser:
`'Paid' | 'PartiallyPaid' | 'Pending' | 'Overdue' | 'Draft'`.

`PartiallyPaid` **no** es seleccionable a mano en el desplegable de estado
del formulario de nueva/editar factura (`src/app/dashboard/invoices/new/page.tsx`,
`invoiceFormSchema.status` y el `<Select>` de estado) — solo lo puede poner
el propio sistema, a partir de los pagos registrados. El resto de estados
(`Pending`/`Paid`/`Overdue`/`Draft`) se siguen pudiendo elegir a mano como
hasta ahora.

Regla de cálculo, aplicada dentro de `addInvoicePayment` y
`deleteInvoicePayment` después de cada cambio, calculada siempre sobre la
suma real de `invoice_payments` (el "ledger"):

```
amountPaid = Σ invoice_payments.amount para esa factura
amountDue  = max(invoice.total - amountPaid, 0)

si amountDue <= 0                                   → status = 'Paid'
si no, si amountPaid > 0                             → status = 'PartiallyPaid'
si no (amountPaid == 0) y el status actual es
  'PartiallyPaid' (lo puso el propio sistema)        → status = 'Pending'
si no (amountPaid == 0) y el status actual es
  otra cosa (Pending/Overdue/Draft/Paid puesto a mano) → se deja como está
```

La tercera y cuarta línea existen para que borrar un pago nunca "retroceda"
por sorpresa un estado que el usuario puso a mano (p. ej. borrar un abono
suelto en una factura marcada `Overdue` no debe devolverla a `Pending`), y
solo revierte el estado que el propio sistema generó automáticamente.

Si el usuario pulsa "Marcar como pagada" (botón que ya existe hoy en el
detalle de factura) sin haber registrado ningún abono, la factura se trata
como 100% cobrada igualmente — no se exige que cuadre con la tabla de
pagos. Para el cálculo de `amountPaid`/`amountDue` que se muestra en la UI:
si `invoice.status === 'Paid'`, `amountPaid = invoice.total` y
`amountDue = 0`, independientemente de lo que sume la tabla de pagos.

### Validación al registrar un pago

`addInvoicePayment` rechaza (`ActionResult` con `success: false`):
- `amount <= 0`
- `amount > amountDue actual` (evita dejar la factura en negativo por un
  importe mal introducido)
- factura no encontrada / no pertenece al usuario

## 3. Acciones de servidor

Archivo nuevo `src/actions/invoice-payments.ts` (separado de
`src/actions/invoices.ts` para no mezclar la gestión de la cabecera de
factura con el histórico de cobros), siguiendo el mismo patrón que el resto
de `src/actions/*.ts`: `"use server"`, `requireUserId()`, `ActionResult`,
`toActionError`, `revalidatePath`.

- `addInvoicePayment(invoiceId: string, data: unknown): Promise<ActionResult<{ id: string }>>`
  - Valida con un `InvoicePaymentSchema` (zod): `amount: number positivo`,
    `paidAt: coerce.date()`, `method: enum(['Transferencia','Efectivo','Otro']).optional()`,
    `note: string.optional()`.
  - Verifica propiedad de la factura (`and(eq(invoices.id, invoiceId), eq(invoices.userId, userId))`).
  - Inserta el pago, recalcula `amountPaid`/`amountDue` y actualiza
    `invoices.status` según la regla de arriba, todo dentro de una
    transacción (mismo patrón que `addInvoice`).
  - `revalidatePath` de `/dashboard/invoices` y `/dashboard/invoices/${invoiceId}`.
  - Notificación opcional vía `createNotification` ("Se ha registrado un
    abono de X€ en la factura Y"), igual que hace `updateInvoiceStatus`.

- `deleteInvoicePayment(paymentId: string): Promise<ActionResult>`
  - Localiza el pago y su factura mediante join, comprueba propiedad,
    borra, recalcula estado igual que arriba.
  - `revalidatePath` de las mismas rutas.

Cambios en `src/actions/invoices.ts`:
- `mapInvoice` incluye `payments` (fecha, importe, método, nota, id) y los
  campos calculados `amountPaid`/`amountDue`.
- `getInvoices` / `getInvoiceById` piden `with: { ..., payments: true }`.
- `getPublicInvoiceById` (usada por la página pública) también expone
  `amountPaid`/`amountDue` dentro de `invoice`, pero **no** expone el
  detalle línea a línea de cada abono (fecha/método/nota) — al cliente le
  basta con el saldo, no con el histórico interno.

## 4. UI

### Detalle de factura (`src/app/dashboard/invoices/[id]/page.tsx`)

Nueva tarjeta "Pagos", debajo de la tabla de conceptos y antes del resumen
de totales (o como sección aparte tras el `CardContent` actual):
- Fila de resumen: "Pagado: 180,00€ · Pendiente: 180,00€" (solo se muestra
  si `amountPaid > 0` o si el estado es `PartiallyPaid`; una factura sin
  ningún abono no necesita esta fila).
- Tabla de abonos: fecha, importe, método, nota, botón de borrar (con
  `AlertDialog` de confirmación, igual patrón que el borrado de factura).
- Botón "Añadir pago" que abre un `Dialog` con formulario: importe, fecha
  (con el mismo `Popover`+`Calendar` que ya se usa para `issueDate`/`dueDate`
  en el formulario de factura), método (`Select`), nota (`Textarea`
  opcional). Al guardar, refresca `invoice` en el estado local con el
  resultado de `getInvoiceById` (mismo patrón que el resto de handlers de
  esta página).

`InvoiceStatusBadge` (`src/components/invoice-status-badge.tsx`) gana un
caso para `PartiallyPaid`: texto `t('invoices.statusPartiallyPaid')`
("Parcialmente Pagada"), color distintivo (p. ej. azul/ámbar, no verde
—verde queda reservado para `Paid`— ni rojo).

### Listado de facturas (`src/app/dashboard/invoices/invoice-list.tsx`)

- El filtro de estado (`Tabs`) puede quedarse con las 4 pestañas actuales
  (`Todas/Pagadas/Pendientes/Vencidas`); las facturas `PartiallyPaid`
  aparecen en "Todas" y se identifican por el badge. No se añade una
  pestaña nueva — el histórico de pagos ya se ve al entrar en el detalle.
- `stats.cobrado` deja de ser "suma de `total` de las facturas en estado
  `Paid`" y pasa a ser "suma de `amountPaid` de **todas** las facturas"
  (incluye lo cobrado de las que están `PartiallyPaid`, y para las `Paid`
  sigue siendo `total` porque `amountPaid` ya vale `total` en ese caso —
  ver regla de cálculo arriba). `stats.pendiente` pasa a sumar `amountDue`
  de las facturas `Pending`/`Overdue`/`PartiallyPaid` en vez de `total`.

### Página pública (`src/app/invoice/[id]/page.tsx`)

- Se añade una fila "Pagado: X€ / Pendiente: Y€" cuando `amountPaid > 0` y
  la factura no está `Paid` del todo, junto al bloque de totales.
- El badge de estado gana el caso `PartiallyPaid` (texto "PAGO PARCIAL").
- Los botones de Stripe/PayPal (`company.stripeEnabled`/`paypalEnabled`)
  se ocultan cuando `invoice.status === 'PartiallyPaid'`, porque
  `createStripeSession`/`capturePayPalOrder` cobran/verifican el **total**
  de la factura sin descontar lo ya pagado — dejar los botones visibles
  llevaría a un cobro duplicado. En su lugar se muestra un aviso: "Quedan
  X€ pendientes. Contacta con [nombre de la empresa] para completar el
  pago." Esto es una limitación conocida que se documenta aquí, no un bug:
  integrar cobro parcial por pasarela queda fuera de este alcance (ver
  pregunta 1 respondida por el usuario).

## 5. Traducciones

Claves nuevas en los 5 locales (`src/lib/i18n/locales/{es,en,ca,fr,it}.json`),
junto a las claves `invoices.status*` existentes:

- `invoices.statusPartiallyPaid`
- `invoices.payments.title` ("Pagos")
- `invoices.payments.addButton` ("Añadir pago")
- `invoices.payments.amount`, `.date`, `.method`, `.note`
- `invoices.payments.methodTransfer`, `.methodCash`, `.methodOther`
- `invoices.payments.amountPaid`, `.amountDue`
- `invoices.payments.deleteConfirmTitle`, `.deleteConfirmDescription`
- `invoices.payments.emptyState` (factura sin abonos aún)
- Texto del aviso en la página pública cuando se ocultan los botones de pago

## 6. Fiscalidad e informes

- `src/lib/fiscal.ts`: `TAXABLE_STATUSES` pasa a
  `new Set(["Paid", "PartiallyPaid", "Pending", "Overdue"])` — una factura
  parcialmente cobrada sigue devengada fiscalmente en la fecha de emisión,
  igual que una `Pending` (España factura en base a devengo, no de caja).
  El desglose de `paid`/`pending`/`overdue` por cliente (línea ~134-136)
  añade un cuarto contador `partiallyPaid`.
- `src/app/dashboard/page.tsx`: el cubo `paid`/`pending`/`overdue` de
  facturas agrupa `PartiallyPaid` junto a `pending` para no perderlas de
  los contadores existentes (mismo criterio que en los filtros del
  listado).
- `src/lib/report-pdf-generator.ts` y `src/app/dashboard/reports/page.tsx`:
  el `statusMap` de textos añade `PartiallyPaid: 'Parcialmente Pagada'`.

## Fuera de alcance

- Cobro parcial real a través de Stripe/PayPal (el cliente paga una parte
  desde el enlace público vía pasarela). Con los pagos manuales cubrimos
  el caso descrito por el usuario (transferencias/efectivo cada cierto
  tiempo); automatizarlo con pasarela es una ampliación futura.
- Edición de un pago ya registrado (solo alta y borrado).
- Recordatorios automáticos de "te queda un abono pendiente".
- **Recibos de pago en PDF** (uno por abono, o por factura totalmente
  cobrada). El usuario lo ha pedido como siguiente paso natural una vez
  exista la tabla `invoice_payments` de este documento — se generaría de
  forma parecida a `generateInvoicePdf` (`src/lib/pdf-generator.ts`), pero
  para un pago individual. Queda como una segunda iteración, con su propio
  brainstorming, para no acoplar el diseño de recibos a una tabla que aún
  no existe en producción.
