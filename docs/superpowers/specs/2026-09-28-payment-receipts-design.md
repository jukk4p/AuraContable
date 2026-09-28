# Recibos de cobro — diseño

**Fecha:** 2026-09-28
**Estado:** Aprobado por el usuario, pendiente de plan de implementación.

## Contexto y motivación

El usuario necesita poder entregar a un cliente un justificante de que ha
cobrado un trabajo — "he cobrado 450€ de esta factura" o, para un trabajo
suelto sin factura formal, "he cobrado 200€ por este encargo". Hoy no existe
ningún documento de este tipo: las facturas son el único PDF que genera la
app, y están pensadas como documento fiscal (con IVA, items, numeración
fiscal), no como comprobante de cobro.

El caso concreto que lo dispara: una factura de 450€ por una web, ya marcada
como pagada, para la que el usuario necesita un recibo que acredite ese
cobro — sin que ese recibo duplique el ingreso que la factura ya representa
en los informes.

Este documento ya se anticipó como "siguiente paso natural" al cerrar el
diseño de pagos parciales de facturas
(`docs/superpowers/specs/2026-09-27-partial-invoice-payments-design.md`,
sección "Fuera de alcance"), pero se definió entonces que necesitaría su
propio brainstorming — es este.

## Decisiones ya tomadas con el usuario

- El recibo puede ir **enlazado a una factura existente** o ser **suelto**
  (sin factura, para trabajos no facturados formalmente). Ambos casos
  conviven en la misma tabla y pantalla.
- Aunque el recibo esté enlazado a una factura, **el importe se introduce a
  mano y no depende de `invoice_payments`** — no tiene por qué coincidir con
  ningún abono ya registrado en el sistema. Es una decisión deliberada: el
  recibo es un documento independiente, no una vista de los pagos ya
  registrados.
- El recibo puede **vincularse opcionalmente a un cliente ya dado de alta**
  (`clients`), pero no es obligatorio — sirve también para clientes sueltos
  que no están en el sistema.
- Llevan **numeración propia** (`REC-{año}-NNN`), independiente de la de
  facturas.
- Un recibo **suelto** (sin factura) cuenta como ingreso en el dashboard
  ("Cobrado"/flujo de caja). Un recibo **enlazado a una factura** no suma
  aparte — ese ingreso ya lo representa la factura, y sumarlo dos veces
  sería un duplicado.
- Los recibos sueltos **no** llevan desglose de IVA/retención ni entran en
  el cálculo fiscal trimestral (`/dashboard/reports`) — solo afectan a la
  cifra de caja del dashboard. Esa pantalla de informes sigue calculando
  devengo e IVA exclusivamente a partir de facturas.
- Solo hay alta y borrado de recibos, no edición (mismo criterio ya usado en
  `invoice_payments`).
- Se puede crear un recibo desde tres sitios: una pantalla dedicada
  "Recibos", el detalle de una factura (precargado), y la ficha de un
  cliente (precargado).

## 1. Base de datos

Tabla nueva `receipts` en `src/db/schema.ts`, siguiendo el mismo estilo que
`invoicePayments`:

```ts
export const receipts = pgTable('receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientTaxId: varchar('client_tax_id', { length: 100 }),
  receiptNumber: varchar('receipt_number', { length: 50 }).notNull(),
  concept: text('concept').notNull(),
  amount: integer('amount').notNull(), // céntimos
  receivedAt: timestamp('received_at').notNull(),
  method: varchar('method', { length: 50 }), // 'Transferencia' | 'Efectivo' | 'Otro'
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('receipts_user_id_idx').on(table.userId),
  invoiceIdx: index('receipts_invoice_id_idx').on(table.invoiceId),
  clientIdx: index('receipts_client_id_idx').on(table.clientId),
}));

export const receiptsRelations = relations(receipts, ({ one }) => ({
  invoice: one(invoices, { fields: [receipts.invoiceId], references: [invoices.id] }),
  client: one(clients, { fields: [receipts.clientId], references: [clients.id] }),
}));
```

`invoiceId` y `clientId` usan `onDelete: 'set null'` (no `'cascade'` como en
el resto del esquema): un recibo es un comprobante ya entregado a un
cliente, y borrar la factura o el cliente de origen no debe hacerlo
desaparecer — solo pierde el enlace. Por eso también se guardan
`clientName`/`clientTaxId` como copia: el recibo no cambia si luego editas
o borras ese cliente.

`clientName` es obligatorio (siempre hay que saber a nombre de quién se
emite); `clientTaxId` es opcional, igual que en `clients`.

Migración `drizzle/003_receipts.sql`, mismo patrón idempotente que
`002_invoice_payments.sql` (`BEGIN`/`COMMIT`, `CREATE TABLE IF NOT EXISTS`,
aplicada a mano con `psql "$DATABASE_URL" -f drizzle/003_receipts.sql`, no
generada con `drizzle-kit`).

## 2. Tipos

Nuevo tipo en `src/lib/types.ts`:

```ts
export type Receipt = {
  id: string;
  userId: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null; // denormalizado al leer, para mostrar en listado/PDF sin join extra
  clientId?: string | null;
  clientName: string;
  clientTaxId?: string | null;
  receiptNumber: string;
  concept: string;
  amount: number; // euros
  receivedAt: Date;
  method?: 'Transferencia' | 'Efectivo' | 'Otro' | null;
  note?: string | null;
  createdAt: Date;
};
```

## 3. Acciones de servidor

Archivo nuevo `src/actions/receipts.ts`, mismo patrón que
`invoice-payments.ts` (`"use server"`, `requireUserId()`, `ActionResult`,
`toActionError`, `revalidatePath`):

- `createReceipt(data: unknown): Promise<ActionResult<{ id: string }>>`
  - Valida con zod: `receiptNumber: string.min(1)`, `clientName: string.min(1)`,
    `clientTaxId: string.optional()`, `concept: string.min(1)`,
    `amount: number.positive()`, `receivedAt: coerce.date()`,
    `method: enum(['Transferencia','Efectivo','Otro']).optional()`,
    `note: string.optional()`, `invoiceId: string.optional()`,
    `clientId: string.optional()`.
  - Si viene `invoiceId`, comprueba que la factura pertenece al usuario
    (`and(eq(invoices.id, invoiceId), eq(invoices.userId, userId))`) antes
    de insertar — igual que si viene `clientId`, comprobar que el cliente
    es del usuario. Si cualquiera de las dos no pertenece, error, no se
    guarda con un enlace ajeno.
  - Inserta y devuelve el `id`.
  - `revalidatePath('/dashboard/receipts')`, y si hay `invoiceId`,
    también `/dashboard/invoices/${invoiceId}`.

- `deleteReceipt(receiptId: string): Promise<ActionResult>`
  - Comprueba propiedad (`eq(receipts.userId, userId)`), borra.
  - `revalidatePath('/dashboard/receipts')`.

- `getReceipts(): Promise<Receipt[]>`
  - `db.query.receipts.findMany({ where: eq(receipts.userId, userId), with: { invoice: true }, orderBy: [desc(receipts.createdAt)] })`,
    mapeado a céntimos→euros. Se usa tanto para la pantalla "Recibos" como
    para filtrar en memoria por `clientId` en la ficha de cliente y para
    calcular el ingreso suelto en el dashboard — mismo patrón que ya usa
    `client-list.tsx` con `getInvoices()` (agrupar en el cliente, no pedir
    una acción por cliente).

No hace falta `getReceiptById` ni `updateReceipt`: no hay pantalla de
detalle ni edición, solo listado + alta + borrado + descarga de PDF
(la descarga usa el objeto que ya está en memoria tras `getReceipts()`).

## 4. UI

### Numeración

Igual que `invoiceNumber` en `src/app/dashboard/invoices/new/page.tsx`: se
calcula en el cliente a partir de los recibos ya cargados
(`REC-${año}-${siguiente número correlativo del año}`), se precarga en el
formulario como valor por defecto y queda editable a mano.

### Formulario compartido (`src/components/receipt-form-dialog.tsx`)

`Dialog` reutilizable en los tres puntos de entrada, con props:

```ts
interface ReceiptFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipts: Receipt[]; // para calcular el siguiente número
  clients: Client[];   // para el desplegable de cliente
  defaultValues?: {
    invoiceId?: string;
    clientId?: string;
    clientName?: string;
    clientTaxId?: string;
    concept?: string;
    amount?: number;
  };
  onCreated: () => Promise<void>;
}
```

Campos: desplegable opcional "Cliente" (lista de `clients`; al elegir uno
autorrellena `clientName`/`clientTaxId`, editables después), `clientName`
(texto, obligatorio), `clientTaxId` (texto, opcional), `concept` (texto,
obligatorio), `amount` (número), fecha (`Popover`+`Calendar`, mismo patrón
que el resto del formulario de factura/pagos), método (`Select`), nota
(`Textarea` opcional), `receiptNumber` (input con el siguiente número
precargado). Al guardar llama a `createReceipt` y luego `onCreated()`.

### Pantalla "Recibos" (`src/app/dashboard/receipts/page.tsx` + `receipt-list.tsx`)

Mismo patrón que `invoice-list.tsx`/`expense-list.tsx`: tabla con
buscador (por cliente/concepto), tarjeta de total del periodo, botón
"Nuevo recibo" que abre `ReceiptFormDialog` sin `defaultValues`. Cada fila:
fecha, cliente, concepto, importe, referencia a factura si tiene
(`invoiceNumber`, como link a `/dashboard/invoices/${invoiceId}`), botón
descargar PDF, botón borrar (con `AlertDialog` de confirmación).

Entrada nueva en el menú (`src/app/dashboard/layout.tsx`, grupo
"Principal", junto a "Gastos"): `{ href: "/dashboard/receipts", icon: ReceiptText, label: "Recibos" }`.
Se usa el icono `ReceiptText` (no `Receipt`, que ya está en uso para
"Gastos") para que no se confundan visualmente en el menú.

### Detalle de factura (`src/app/dashboard/invoices/[id]/page.tsx`)

Botón "Generar recibo" junto a los botones existentes (descargar PDF,
etc.), que abre `ReceiptFormDialog` con:
`defaultValues = { invoiceId: invoice.id, clientId: invoice.clientId, clientName: invoice.client.name, clientTaxId: invoice.client.taxId, concept: `Factura ${invoice.invoiceNumber}`, amount: invoice.total }`.

### Ficha de cliente (`src/app/dashboard/clients/[id]/edit/page.tsx`)

Esta es la única pantalla de "detalle" de cliente que existe hoy (no hay
una vista de solo lectura separada de la de edición). Se añade una tarjeta
"Recibos" debajo del formulario: lista los recibos de `getReceipts()`
filtrados por `clientId === client.id` (fecha, concepto, importe, link de
descarga), y un botón "Nuevo recibo" que abre `ReceiptFormDialog` con
`defaultValues = { clientId: client.id, clientName: client.name, clientTaxId: client.taxId }`.

## 5. PDF del recibo

Función nueva `generateReceiptPdf(receipt: Receipt, company: CompanyProfile | null, l10n, outputType)`
en `src/lib/pdf-generator.ts`, reutilizando el mismo sistema de colores y
cabecera que `generateInvoicePdf` pero en un layout de una sola tarjeta (sin
tabla de items, no hace falta `autoTable`):

- Cabecera con nombre/logo de la empresa (`company`), como en factura.
- Nº de recibo y fecha (`receivedAt`).
- Bloque "RECIBÍ DE": `clientName` + `clientTaxId` si existe.
- `concept` en texto.
- Importe en grande (`formatCurrency(receipt.amount)`).
- Método de pago si existe.
- Si `invoiceId`/`invoiceNumber` está presente: línea
  "Correspondiente a la factura {invoiceNumber}".
- Nota si existe.
- Nombre de archivo de descarga: `${receipt.receiptNumber}.pdf`.

## 6. Impacto en cifras (dashboard)

`src/app/dashboard/page.tsx`:
- Se añade `getReceipts()` a la carga inicial (junto a `getInvoices`,
  `getClients`, `getExpenses`).
- `stats.income`/`stats.cashFlow`: se suman los recibos con
  `invoiceId == null` (los sueltos) a `totalIncome`, además de
  `invoice.amountPaid` como ya se hacía.
- `chartData`: los recibos sueltos se reparten en el bucket mensual de
  `ingresos` por `receivedAt`, igual que las facturas se reparten por
  `amountPaid`.

**No se toca:**
- `/dashboard/reports` (`report-pdf-generator.ts`, `reports/page.tsx`): el
  informe fiscal sigue calculándose solo con facturas — mezclar recibos sin
  IVA rompería el cálculo de devengo/impuestos, y ya se decidió que los
  recibos sueltos quedan fuera de lo fiscal.
- `/dashboard/invoices` (tarjetas "Cobrado"/"Pendiente"): ya son correctas
  solo con facturas; un recibo enlazado a una factura no debe sumar aparte
  porque duplicaría un ingreso ya contado ahí.

## 7. Traducciones

Namespace nuevo `receipts` en los 5 locales
(`src/lib/i18n/locales/{es,en,ca,fr,it}.json`):

- `receipts.title` ("Recibos"), `receipts.addButton` ("Nuevo recibo")
- `receipts.client`, `.clientOptional`, `.concept`, `.amount`, `.date`,
  `.method`, `.note`, `.receiptNumber`
- `receipts.methodTransfer`, `.methodCash`, `.methodOther` (se pueden
  reutilizar las mismas claves que `invoices.payments.method*` si el texto
  coincide, a decidir en la implementación)
- `receipts.emptyState`, `.deleteConfirmTitle`, `.deleteConfirmDescription`
- `receipts.linkedToInvoice` ("Correspondiente a la factura {number}")
- `receipts.generateFromInvoiceButton` ("Generar recibo")

## Fuera de alcance

- Enlace público para que el cliente descargue su propio recibo (como
  existe para facturas en `/invoice/[id]`). El recibo se descarga y se
  envía a mano por el usuario.
- Edición de un recibo ya creado (solo alta y borrado, mismo criterio que
  `invoice_payments`).
- Vincular el recibo a un `invoice_payments` concreto o generarlo
  automáticamente al registrar un pago parcial — se decidió explícitamente
  que el importe del recibo es libre e independiente del ledger de pagos.
- Numeración fiscal encadenada/verificable (como exige una factura); los
  recibos no son documento fiscal en esta feature.
