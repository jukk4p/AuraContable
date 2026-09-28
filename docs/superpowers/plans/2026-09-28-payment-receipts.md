# Recibos de Cobro — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir generar un recibo en PDF que acredite "he cobrado X€", opcionalmente enlazado a una factura o a un cliente ya dados de alta, sin que ese recibo duplique un ingreso que una factura ya cuenta.

**Architecture:** Tabla nueva `receipts`, independiente de `invoice_payments`, con `invoiceId`/`clientId` opcionales (`onDelete: 'set null'`) y una copia de `clientName`/`clientTaxId` para que el documento sobreviva a borrados. Un módulo de acciones de servidor (`src/actions/receipts.ts`), un generador de PDF (`generateReceiptPdf`), un formulario compartido (`ReceiptFormDialog`) montado en tres sitios (pantalla "Recibos" nueva, detalle de factura, ficha de cliente), y una integración puntual en el dashboard para que los recibos sueltos sumen en "Cobrado" sin tocar los informes fiscales.

**Tech Stack:** Next.js 15 (App Router, Server Actions), Drizzle ORM + PostgreSQL, Zod, jsPDF, Tailwind + Radix (shadcn/ui).

**Spec:** `docs/superpowers/specs/2026-09-28-payment-receipts-design.md`

## Global Constraints

- Importes en céntimos (`integer`) en base de datos y en las acciones de servidor; en euros (`number`) en los tipos de UI — igual que el resto del código existente (`mapInvoice`/`mapReceipt`).
- El importe de un recibo se introduce a mano y **no depende de `invoice_payments`** — puede no coincidir con ningún abono ya registrado, aunque el recibo esté enlazado a una factura (decisión ya tomada con el usuario).
- Solo hay alta y borrado de recibos, no edición.
- `invoiceId` y `clientId` en `receipts` usan `onDelete: 'set null'` (no `'cascade'`): borrar la factura o el cliente de origen no debe borrar el recibo ya entregado, solo desvincularlo. `clientName`/`clientTaxId` se copian al crear el recibo para que el documento no cambie si el cliente se edita o se borra después.
- Un recibo con `invoiceId` **no** suma aparte en el dashboard (ese ingreso ya lo cuenta la factura); un recibo sin `invoiceId` sí suma en "Cobrado"/flujo de caja. Ninguno de los dos toca `/dashboard/reports` (el informe fiscal sigue siendo solo de facturas).
- **Este proyecto no tiene ningún framework de tests configurado** (mismo hecho ya documentado en `docs/superpowers/plans/2026-09-27-partial-invoice-payments.md`). Cada tarea sustituye el ciclo estándar de test por: cambio de código → `npm run typecheck` → verificación manual guiada arrancando `npm run dev`.
- La migración SQL de la Tarea 1 **no se aplica automáticamente** — es un paso manual explícito con `DATABASE_URL` a mano, igual que `drizzle/002_invoice_payments.sql`.

## Review Focus

- Crear un recibo con importe 0 o negativo debe rechazarse con un mensaje claro, no guardarse. (Tarea 3)
- Crear un recibo con un `invoiceId` o `clientId` que no pertenece al usuario autenticado debe rechazarse, no vincularse en silencio a datos ajenos. (Tarea 3)
- Borrar la factura o el cliente enlazados a un recibo ya creado no debe borrar el recibo — debe quedar con `invoiceId`/`clientId` a `null` pero conservando `clientName`/`clientTaxId` y siendo descargable igual. (Tarea 1 y Tarea 7, verificación manual)
- Un recibo enlazado a una factura no debe sumar en el dashboard aparte del importe que ya cuenta la factura; solo los recibos sueltos (`invoiceId` nulo) deben sumar en "Cobrado"/flujo de caja. (Tarea 10)
- Descargar el PDF de un recibo sin cliente vinculado (solo `clientName` de texto libre, `clientId` nulo) debe generar el documento igual de bien que uno con cliente vinculado. (Tarea 5 y Tarea 7, verificación manual)

---

## Task 1: Esquema de base de datos — tabla `receipts` y migración

**Files:**
- Modify: `src/db/schema.ts:116-117` (entre `invoicePayments` y `notifications`), `src/db/schema.ts:196-201` (después de `invoicePaymentsRelations`)
- Create: `drizzle/003_receipts.sql`

**Interfaces:**
- Produces: tabla Drizzle `receipts` con columnas `id, userId, invoiceId, clientId, clientName, clientTaxId, receiptNumber, concept, amount, receivedAt, method, note, createdAt`; relación `receiptsRelations.invoice: one(invoices)` y `receiptsRelations.client: one(clients)`. Estos nombres los consume la Tarea 3 (`db.query.receipts`, `db.query.receipts.findMany({ with: { invoice: true } })`).

- [ ] **Step 1: Añadir la tabla `receipts` en `src/db/schema.ts`**

Insertar justo después del cierre de `invoicePayments` (línea 116) y antes de `export const notifications` (línea 118):

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
```

- [ ] **Step 2: Añadir `receiptsRelations`, después de `invoicePaymentsRelations` (línea 196-201), antes de `notificationsRelations`**

```ts
export const receiptsRelations = relations(receipts, ({ one }) => ({
  invoice: one(invoices, {
    fields: [receipts.invoiceId],
    references: [invoices.id],
  }),
  client: one(clients, {
    fields: [receipts.clientId],
    references: [clients.id],
  }),
}));
```

- [ ] **Step 3: Crear la migración `drizzle/003_receipts.sql`**

```sql
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
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores nuevos relacionados con `src/db/schema.ts`.

- [ ] **Step 5: Aplicar la migración manualmente**

Esto lo ejecuta una persona con `DATABASE_URL` a mano, no el agente que implementa el plan:

```bash
psql "$DATABASE_URL" -f drizzle/003_receipts.sql
```

Sin este paso, las tareas 3 en adelante compilan pero no se pueden probar manualmente contra una base de datos real.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts drizzle/003_receipts.sql
git commit -m "feat(db): añade tabla receipts para recibos de cobro"
```

---

## Task 2: Tipo `Receipt`

**Files:**
- Modify: `src/lib/types.ts:121-122` (justo antes de `Invoice`)

**Interfaces:**
- Produces: `Receipt = { id, userId, invoiceId?, invoiceNumber?, clientId?, clientName, clientTaxId?, receiptNumber, concept, amount, receivedAt, method?, note?, createdAt }`. Este tipo lo consumen las Tareas 3, 5, 6, 7, 8, 9 y 10.

- [ ] **Step 1: Añadir `Receipt` en `src/lib/types.ts`, después de `InvoicePayment` (línea 115-121) y antes del comentario de `Invoice` (línea 123)**

```ts
/**
 * Un recibo de cobro, opcionalmente enlazado a una factura y/o a un cliente
 * ya dados de alta. El importe es independiente de `invoice_payments`: se
 * introduce a mano y no tiene por qué coincidir con ningún abono ya
 * registrado. Solo hay alta y borrado — no edición.
 */
export type Receipt = {
  id: string;
  userId: string;
  invoiceId?: string | null;
  /** Denormalizado al leer (join con `invoices`), no se guarda en `receipts`. */
  invoiceNumber?: string | null;
  clientId?: string | null;
  /** Copia del nombre del cliente en el momento de crear el recibo. */
  clientName: string;
  clientTaxId?: string | null;
  receiptNumber: string;
  concept: string;
  amount: number;
  receivedAt: Date;
  method?: 'Transferencia' | 'Efectivo' | 'Otro' | null;
  note?: string | null;
  createdAt: Date;
};
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores (el tipo aún no se usa en ningún sitio).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): añade el tipo Receipt"
```

---

## Task 3: Acciones de servidor — `createReceipt`, `deleteReceipt`, `getReceipts`

**Files:**
- Create: `src/actions/receipts.ts`

**Interfaces:**
- Consumes: `db` de `@/db/config`; `receipts`, `invoices`, `clients` de `@/db/schema`; `requireUserId` de `@/lib/session`; `ActionResult`, `toActionError` de `@/lib/action-result`; `Receipt` de `@/lib/types`.
- Produces: `createReceipt(data: unknown): Promise<ActionResult<{ id: string }>>`, `deleteReceipt(receiptId: string): Promise<ActionResult>`, `getReceipts(): Promise<Receipt[]>`. Las Tareas 6, 7, 8 y 9 (UI) llaman a estas tres funciones tal cual.

- [ ] **Step 1: Escribir `src/actions/receipts.ts`**

```ts
"use server";

import { db } from "@/db/config";
import { receipts, invoices, clients } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { type ActionResult, toActionError } from "@/lib/action-result";
import type { Receipt } from "@/lib/types";

const ReceiptSchema = z.object({
  receiptNumber: z.string().min(1, "El número de recibo es obligatorio"),
  clientId: z.string().uuid().optional(),
  clientName: z.string().min(1, "El nombre del cliente es obligatorio"),
  clientTaxId: z.string().optional(),
  concept: z.string().min(1, "El concepto es obligatorio"),
  amount: z.number().positive("El importe debe ser mayor que 0"),
  receivedAt: z.coerce.date(),
  method: z.enum(['Transferencia', 'Efectivo', 'Otro']).optional(),
  note: z.string().optional(),
  invoiceId: z.string().uuid().optional(),
});

function mapReceipt(row: any): Receipt {
  return {
    id: row.id,
    userId: row.userId,
    invoiceId: row.invoiceId || null,
    invoiceNumber: row.invoice?.invoiceNumber || null,
    clientId: row.clientId || null,
    clientName: row.clientName,
    clientTaxId: row.clientTaxId || undefined,
    receiptNumber: row.receiptNumber,
    concept: row.concept,
    amount: row.amount / 100,
    receivedAt: row.receivedAt,
    method: row.method || undefined,
    note: row.note || undefined,
    createdAt: row.createdAt,
  };
}

export async function createReceipt(data: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const v = ReceiptSchema.parse(data);

    if (v.invoiceId) {
      const owned = await db.query.invoices.findFirst({
        where: and(eq(invoices.id, v.invoiceId), eq(invoices.userId, userId)),
      });
      if (!owned) return { success: false, error: "Factura no encontrada." };
    }

    if (v.clientId) {
      const owned = await db.query.clients.findFirst({
        where: and(eq(clients.id, v.clientId), eq(clients.userId, userId)),
      });
      if (!owned) return { success: false, error: "Cliente no encontrado." };
    }

    const inserted = await db.insert(receipts).values({
      userId,
      invoiceId: v.invoiceId,
      clientId: v.clientId,
      clientName: v.clientName,
      clientTaxId: v.clientTaxId,
      receiptNumber: v.receiptNumber,
      concept: v.concept,
      amount: Math.round(v.amount * 100),
      receivedAt: v.receivedAt,
      method: v.method,
      note: v.note,
    }).returning();

    revalidatePath("/dashboard/receipts");
    revalidatePath("/dashboard");
    if (v.invoiceId) revalidatePath(`/dashboard/invoices/${v.invoiceId}`);

    return { success: true, data: { id: inserted[0].id } };
  } catch (error) {
    return toActionError(error, "No se pudo crear el recibo.", "createReceipt");
  }
}

export async function deleteReceipt(receiptId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    const row = await db.query.receipts.findFirst({ where: eq(receipts.id, receiptId) });
    if (!row || row.userId !== userId) {
      return { success: false, error: "Recibo no encontrado." };
    }

    await db.delete(receipts).where(eq(receipts.id, receiptId));

    revalidatePath("/dashboard/receipts");
    revalidatePath("/dashboard");
    if (row.invoiceId) revalidatePath(`/dashboard/invoices/${row.invoiceId}`);

    return { success: true, data: null };
  } catch (error) {
    return toActionError(error, "No se pudo eliminar el recibo.", "deleteReceipt");
  }
}

export async function getReceipts(): Promise<Receipt[]> {
  const userId = await requireUserId();
  const rows = await db.query.receipts.findMany({
    where: eq(receipts.userId, userId),
    with: { invoice: true },
    orderBy: [desc(receipts.createdAt)],
  });
  return rows.map(mapReceipt);
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: `src/actions/receipts.ts` compila sin errores.

- [ ] **Step 3: Verificación manual (requiere migración aplicada — Tarea 1, Step 5)**

Sin UI todavía, se prueba con una llamada puntual (misma técnica que en la Tarea 3 del plan de pagos parciales: `npx tsx` o temporalmente desde una página de servidor):

1. Llama `createReceipt({ receiptNumber: 'REC-2026-001', clientName: 'Cliente de prueba', concept: 'Trabajo suelto', amount: 200, receivedAt: new Date() })` (sin `invoiceId` ni `clientId`): comprueba que se inserta una fila en `receipts` con `invoice_id` y `client_id` a `NULL`.
2. Llama `createReceipt({ ...mismo, amount: -5 })`: debe devolver `{ success: false, error: "El importe debe ser mayor que 0" }` sin insertar nada.
3. Llama `createReceipt({ ..., invoiceId: '<uuid al azar que no existe>' })`: debe devolver `{ success: false, error: "Factura no encontrada." }`.
4. Llama `createReceipt({ ..., clientId: '<uuid al azar que no existe>' })`: debe devolver `{ success: false, error: "Cliente no encontrado." }`, sin insertar nada.
5. Llama `createReceipt({ ..., invoiceId: '<id de una factura real tuya>', clientId: '<id de un cliente real tuyo>' })`: comprueba que se inserta con `invoice_id` y `client_id` rellenos.
6. Llama `getReceipts()`: comprueba que devuelve los recibos creados, con `invoiceNumber` relleno solo en el que tiene `invoiceId`.
7. Llama `deleteReceipt('<id de un recibo>')` y repite `getReceipts()`: comprueba que ya no aparece.
8. Borra manualmente (`psql` o el propio dashboard) la factura usada en el paso 5: comprueba que el recibo asociado sigue existiendo en `receipts` con `invoice_id = NULL` (por el `onDelete: 'set null'` de la Tarea 1), no que desaparece.
9. Borra manualmente el cliente usado en el paso 5: comprueba igual que el recibo sigue existiendo, ahora con `client_id = NULL`, y que `clientName`/`clientTaxId` (la copia) siguen intactos.

- [ ] **Step 4: Commit**

```bash
git add src/actions/receipts.ts
git commit -m "feat(receipts): añade createReceipt, deleteReceipt y getReceipts"
```

---

## Task 4: Traducciones

**Files:**
- Modify: `src/lib/i18n/locales/es.json:18-30` (`nav`), `:142-143` (entre `expenses` y `reports`)
- Modify: `src/lib/i18n/locales/en.json`, `ca.json`, `fr.json`, `it.json` (mismas líneas)

**Interfaces:**
- Produces: claves `nav.receipts`, `receipts.*`, consumidas por las Tareas 6, 7, 8 y 9.

- [ ] **Step 1: Añadir `"receipts": "Recibos"` en `nav` de `src/lib/i18n/locales/es.json` (línea 24, junto a `"expenses"`)**

```json
        "expenses": "Gastos",
        "receipts": "Recibos",
```

- [ ] **Step 2: Añadir el bloque `"receipts"` en `src/lib/i18n/locales/es.json`, entre el cierre de `"expenses"` (línea 142) y `"reports"` (línea 143)**

```json
    "receipts": {
        "title": "Recibos",
        "searchPlaceholder": "Buscar por cliente, concepto o número",
        "addButton": "Nuevo Recibo",
        "receiptNumber": "Número de Recibo",
        "client": "Cliente",
        "clientOptional": "Cliente (opcional, elige uno ya dado de alta)",
        "concept": "Concepto",
        "amount": "Importe",
        "date": "Fecha",
        "method": "Método",
        "note": "Nota",
        "emptyState": "Todavía no se ha creado ningún recibo.",
        "deleteConfirmTitle": "¿Eliminar este recibo?",
        "deleteConfirmDescription": "Esta acción no se puede deshacer.",
        "linkedToInvoice": "Correspondiente a la factura {number}",
        "generateFromInvoiceButton": "Generar recibo"
    },
```

- [ ] **Step 3: Repetir el mismo patrón en `en.json`, `ca.json`, `fr.json`, `it.json`**

Mismas claves, mismas dos posiciones (`nav.receipts` junto a `nav.expenses`; bloque `receipts` entre `expenses` y `reports`), texto traducido a cada idioma. Ejemplo para `en.json`:

```json
        "expenses": "Expenses",
        "receipts": "Receipts",
```

```json
    "receipts": {
        "title": "Receipts",
        "searchPlaceholder": "Search by client, concept or number",
        "addButton": "New Receipt",
        "receiptNumber": "Receipt Number",
        "client": "Client",
        "clientOptional": "Client (optional, pick an existing one)",
        "concept": "Concept",
        "amount": "Amount",
        "date": "Date",
        "method": "Method",
        "note": "Note",
        "emptyState": "No receipts created yet.",
        "deleteConfirmTitle": "Delete this receipt?",
        "deleteConfirmDescription": "This action cannot be undone.",
        "linkedToInvoice": "Corresponding to invoice {number}",
        "generateFromInvoiceButton": "Generate receipt"
    },
```

Repite el mismo patrón (mismas claves, texto traducido) en `ca.json`, `fr.json` e `it.json`, respetando el idioma de cada uno. El desplegable de método reutiliza las claves ya existentes `invoices.payments.methodTransfer`/`.methodCash`/`.methodOther` — no hace falta duplicarlas.

- [ ] **Step 4: Verificar tipos y JSON válido**

Run: `npm run typecheck`
Run: `node -e "['es','en','ca','fr','it'].forEach(l => JSON.parse(require('fs').readFileSync('src/lib/i18n/locales/'+l+'.json','utf8')))"`
Expected: sin errores en ninguno de los dos comandos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/locales/*.json
git commit -m "feat(i18n): añade textos para la sección de recibos"
```

---

## Task 5: Generador de PDF del recibo

**Files:**
- Modify: `src/lib/pdf-generator.ts:1-9` (imports), añadir función nueva al final del archivo

**Interfaces:**
- Consumes: `Receipt`, `CompanyProfile` de `./types` (ya usado en este archivo); tipo `Localization` ya definido en `pdf-generator.ts`.
- Produces: `generateReceiptPdf(receipt: Receipt, company: CompanyProfile | null, l10n: Localization, outputType?: 'save' | 'blob'): Promise<Blob | void>`. Las Tareas 7, 8 y 9 (UI) llaman a esta función tal cual.

- [ ] **Step 1: Ampliar el import de tipos en `src/lib/pdf-generator.ts` (línea 6)**

```ts
import type { Invoice, CompanyProfile, Receipt } from './types';
```

- [ ] **Step 2: Añadir `generateReceiptPdf` al final de `src/lib/pdf-generator.ts`, después de `generateInvoicesZip`**

```ts
export async function generateReceiptPdf(
    receipt: Receipt,
    company: CompanyProfile | null,
    l10n: Localization,
    outputType: 'save' | 'blob' = 'save'
): Promise<Blob | void> {
    const doc = new jsPDF();
    const { t, formatCurrency, locale } = l10n;
    const dateLocale = localeMap[locale] || enUS;

    const brandDark = '#0F172A';
    const accentCyan = '#06B6D4';
    const textDark = '#1E293B';
    const textMuted = '#64748B';
    const cardBg = '#F8FAFC';
    const lineLight = '#E2E8F0';

    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    // --- Cabecera ---
    doc.setFillColor('#000000');
    doc.rect(0, 0, pageWidth, 42, 'F');

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#FFFFFF');
    doc.text('RECIBO', 20, 26);

    if (company?.logoUrl && company.logoUrl.startsWith('data:image')) {
        try {
            doc.addImage(company.logoUrl, 'PNG', pageWidth - 65, 13, 45, 16, undefined, 'FAST');
        } catch (e) {
            console.error("Error adding logo to PDF:", e);
        }
    }

    // --- Nº de recibo y fecha ---
    const metaY = 52;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textMuted);
    doc.text('Nº RECIBO', 20, metaY);
    doc.text('FECHA', 80, metaY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandDark);
    doc.text(receipt.receiptNumber, 20, metaY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textDark);
    doc.text(format(new Date(receipt.receivedAt), 'dd MMM yyyy', { locale: dateLocale }), 80, metaY + 6);

    doc.setLineWidth(0.4);
    doc.setDrawColor(lineLight);
    doc.line(20, 64, pageWidth - 20, 64);

    // --- Emisor / Recibí de ---
    const infoStartY = 73;

    doc.setFillColor(accentCyan);
    doc.rect(20, infoStartY - 4, 2.5, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandDark);
    doc.setFontSize(9);
    doc.text('EMISOR', 25, infoStartY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    let companyInfoY = infoStartY + 6;
    if (company?.name) { doc.text(company.name, 20, companyInfoY); companyInfoY += 5; }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark);
    if (company?.taxId) { doc.text(`CIF/NIF: ${company.taxId}`, 20, companyInfoY); companyInfoY += 4.5; }
    if (company?.address) {
        const addrLines = doc.splitTextToSize(company.address, (pageWidth / 2) - 25);
        doc.text(addrLines, 20, companyInfoY);
        companyInfoY += (addrLines.length * 4.5);
    }

    const clientStartX = pageWidth / 2 + 10;
    doc.setFillColor(brandDark);
    doc.rect(clientStartX, infoStartY - 4, 2.5, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandDark);
    doc.setFontSize(9);
    doc.text('RECIBÍ DE', clientStartX + 5, infoStartY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    let clientInfoY = infoStartY + 6;
    doc.text(receipt.clientName, clientStartX, clientInfoY);
    clientInfoY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark);
    if (receipt.clientTaxId) { doc.text(`CIF/NIF: ${receipt.clientTaxId}`, clientStartX, clientInfoY); clientInfoY += 4.5; }

    // --- Concepto ---
    const conceptY = Math.max(companyInfoY, clientInfoY) + 14;
    doc.setFillColor(cardBg);
    doc.roundedRect(20, conceptY - 6, pageWidth - 40, 26, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(textMuted);
    doc.text('CONCEPTO', 26, conceptY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(textDark);
    const conceptLines = doc.splitTextToSize(receipt.concept, pageWidth - 60);
    doc.text(conceptLines, 26, conceptY + 6);

    // --- Importe ---
    const amountY = conceptY + 40;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(textMuted);
    doc.text('IMPORTE RECIBIDO', 20, amountY);
    doc.setFontSize(24);
    doc.setTextColor(brandDark);
    doc.text(formatCurrency(receipt.amount), 20, amountY + 12);

    let detailY = amountY + 24;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark);
    if (receipt.method) {
        doc.text(`Método de pago: ${receipt.method}`, 20, detailY);
        detailY += 5;
    }
    if (receipt.invoiceNumber) {
        doc.text(`Correspondiente a la factura ${receipt.invoiceNumber}`, 20, detailY);
        detailY += 5;
    }
    if (receipt.note) {
        const noteLines = doc.splitTextToSize(receipt.note, pageWidth - 40);
        doc.text(noteLines, 20, detailY);
    }

    if (outputType === 'blob') {
        return doc.output('blob');
    } else {
        doc.save(`${receipt.receiptNumber}.pdf`);
    }
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores en `src/lib/pdf-generator.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pdf-generator.ts
git commit -m "feat(receipts): añade el generador de PDF del recibo"
```

---

## Task 6: Formulario compartido `ReceiptFormDialog`

**Files:**
- Create: `src/components/receipt-form-dialog.tsx`

**Interfaces:**
- Consumes: `createReceipt` de `@/actions/receipts` (Tarea 3); `Receipt` de `@/lib/types` (Tarea 2); claves `receipts.*` e `invoices.payments.method*` (Tarea 4).
- Produces: componente `ReceiptFormDialog` y tipo exportado `ClientOption = { id: string; name: string; taxId?: string | null }`, con props `{ open, onOpenChange, receipts: Receipt[], clients: ClientOption[], defaultValues?: {...}, onCreated: () => Promise<void> }`. Las Tareas 7, 8 y 9 montan este componente tal cual.

- [ ] **Step 1: Crear `src/components/receipt-form-dialog.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";

import type { Receipt } from "@/lib/types";
import { createReceipt } from "@/actions/receipts";
import { useLocale } from "@/lib/i18n/locale-provider";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ClientOption = { id: string; name: string; taxId?: string | null };

type Method = 'Transferencia' | 'Efectivo' | 'Otro';

const METHODS: { value: Method; labelKey: string }[] = [
  { value: 'Transferencia', labelKey: 'invoices.payments.methodTransfer' },
  { value: 'Efectivo', labelKey: 'invoices.payments.methodCash' },
  { value: 'Otro', labelKey: 'invoices.payments.methodOther' },
];

const NO_CLIENT = '__none__';

interface ReceiptFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipts: Receipt[];
  clients: ClientOption[];
  defaultValues?: {
    invoiceId?: string;
    clientId?: string;
    clientName?: string;
    clientTaxId?: string | null;
    concept?: string;
    amount?: number;
  };
  onCreated: () => Promise<void>;
}

function nextReceiptNumber(existing: Receipt[]): string {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;
  const thisYear = existing.filter((r) => r.receiptNumber.startsWith(prefix));
  let next = 1;
  if (thisYear.length > 0) {
    const numbers = thisYear.map((r) => parseInt(r.receiptNumber.split('-').pop() || '0', 10));
    next = Math.max(...numbers) + 1;
  }
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export default function ReceiptFormDialog({ open, onOpenChange, receipts, clients, defaultValues, onCreated }: ReceiptFormDialogProps) {
  const { t, formatCurrency } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [receiptNumber, setReceiptNumber] = useState("");
  const [clientId, setClientId] = useState<string>(NO_CLIENT);
  const [clientName, setClientName] = useState("");
  const [clientTaxId, setClientTaxId] = useState("");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [receivedAt, setReceivedAt] = useState<Date | undefined>(new Date());
  const [method, setMethod] = useState<Method | undefined>(undefined);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setReceiptNumber(nextReceiptNumber(receipts));
    setClientId(defaultValues?.clientId ?? NO_CLIENT);
    setClientName(defaultValues?.clientName ?? "");
    setClientTaxId(defaultValues?.clientTaxId ?? "");
    setConcept(defaultValues?.concept ?? "");
    setAmount(defaultValues?.amount ? String(defaultValues.amount) : "");
    setReceivedAt(new Date());
    setMethod(undefined);
    setNote("");
    // Solo al abrir: no se quiere resetear el formulario mientras el usuario escribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClientChange = (value: string) => {
    setClientId(value);
    if (value !== NO_CLIENT) {
      const picked = clients.find((c) => c.id === value);
      if (picked) {
        setClientName(picked.name);
        setClientTaxId(picked.taxId || "");
      }
    }
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (!receiptNumber.trim() || !clientName.trim() || !concept.trim() || !receivedAt || !parsedAmount || parsedAmount <= 0) {
      toast({ title: "Error", description: "Rellena número, cliente, concepto e importe.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createReceipt({
        receiptNumber: receiptNumber.trim(),
        clientId: clientId !== NO_CLIENT ? clientId : undefined,
        clientName: clientName.trim(),
        clientTaxId: clientTaxId.trim() || undefined,
        concept: concept.trim(),
        amount: parsedAmount,
        receivedAt,
        method,
        note: note || undefined,
        invoiceId: defaultValues?.invoiceId,
      });
      if (result.success) {
        toast({ title: "Recibo Creado", description: `Se ha generado el recibo ${receiptNumber}.` });
        onOpenChange(false);
        await onCreated();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo crear el recibo.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('receipts.addButton')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label>{t('receipts.receiptNumber')}</Label>
            <Input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
          </div>
          {clients.length > 0 && (
            <div className="space-y-2">
              <Label>{t('receipts.clientOptional')}</Label>
              <Select value={clientId} onValueChange={handleClientChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CLIENT}>—</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>{t('receipts.client')}</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre del cliente" />
          </div>
          <div className="space-y-2">
            <Label>CIF/NIF</Label>
            <Input value={clientTaxId} onChange={(e) => setClientTaxId(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-2">
            <Label>{t('receipts.concept')}</Label>
            <Textarea value={concept} onChange={(e) => setConcept(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('receipts.amount')}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('receipts.date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !receivedAt && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {receivedAt ? format(receivedAt, "PPP", { locale: es }) : <span>{t('newInvoice.pickDate')}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={receivedAt} onSelect={setReceivedAt} initialFocus locale={es} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>{t('receipts.method')}</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
              <SelectTrigger>
                <SelectValue placeholder={t('receipts.method')} />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{t(m.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('receipts.note')}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('invoices.payments.notePlaceholder')} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('receipts.addButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores (el componente aún no se monta en ninguna página).

- [ ] **Step 3: Commit**

```bash
git add src/components/receipt-form-dialog.tsx
git commit -m "feat(receipts): añade el formulario compartido ReceiptFormDialog"
```

---

## Task 7: Pantalla "Recibos" y entrada de menú

**Files:**
- Create: `src/app/dashboard/receipts/page.tsx`
- Modify: `src/app/dashboard/layout.tsx:4-9` (import de iconos), `:166-167` (grupo de navegación)

**Interfaces:**
- Consumes: `getReceipts`, `deleteReceipt` de `@/actions/receipts` (Tarea 3); `getClients` de `@/actions/clients`; `getCompanyProfile` de `@/actions/company`; `generateReceiptPdf` de `@/lib/pdf-generator` (Tarea 5); `ReceiptFormDialog`, `ClientOption` de `@/components/receipt-form-dialog` (Tarea 6).

- [ ] **Step 1: Añadir el icono `ReceiptEuro` al import de `lucide-react` en `src/app/dashboard/layout.tsx` (línea 4-9)**

```tsx
import { 
    FileText, LayoutDashboard, Settings, Users, PanelLeft, 
    Search, Plus, Receipt, ReceiptEuro, BarChart3, Bell, 
    User, HelpCircle, LogOut, Sun, Moon,
    Globe, CreditCard, ShieldCheck, Folder, FileSignature
} from "lucide-react"
```

- [ ] **Step 2: Añadir la entrada de menú en `src/app/dashboard/layout.tsx`, grupo "Principal" (línea 166-167), junto a "Gastos"**

```tsx
              { href: "/dashboard/expenses", icon: Receipt, label: "Gastos" },
              { href: "/dashboard/receipts", icon: ReceiptEuro, label: "Recibos" },
              { href: "/dashboard/documents", icon: Folder, label: "Documentos" },
```

Se usa `ReceiptEuro`, no `Receipt` (ya en uso para "Gastos"), para que los dos iconos no se confundan visualmente en el menú.

- [ ] **Step 3: Crear `src/app/dashboard/receipts/page.tsx`**

```tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Trash2, Download, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from "next-auth/react";
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { useLocale } from '@/lib/i18n/locale-provider';
import { getReceipts, deleteReceipt } from '@/actions/receipts';
import { getClients } from '@/actions/clients';
import { getCompanyProfile } from '@/actions/company';
import { generateReceiptPdf } from '@/lib/pdf-generator';
import { toast } from '@/hooks/use-toast';
import type { Receipt, Client, CompanyProfile } from '@/lib/types';
import ReceiptFormDialog, { type ClientOption } from '@/components/receipt-form-dialog';

function StatCard({ title, value }: { title: string; value: string }) {
    return (
        <Card className="p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2 bg-card">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-semibold tracking-tight">{value}</h3>
        </Card>
    );
}

export default function ReceiptsPage() {
    const { t, formatCurrency, locale } = useLocale();
    const { data: session, status } = useSession();
    const user = session?.user;

    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dbLoading, setDbLoading] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const userId = user?.id;

    const fetchData = async () => {
        if (!userId) return;
        setDbLoading(true);
        setDbError(null);
        try {
            const [receiptsData, clientsData, company] = await Promise.all([
                getReceipts(),
                getClients(),
                getCompanyProfile(),
            ]);
            setReceipts(receiptsData);
            setClients(clientsData);
            setCompanyProfile(company);
        } catch (e) {
            console.error("Error cargando los recibos:", e);
            setDbError("No se pudieron cargar los recibos. Revisa tu conexión e inténtalo de nuevo.");
        } finally {
            setDbLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchData();
        } else if (status !== 'loading') {
            setDbLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, status]);

    const clientOptions: ClientOption[] = useMemo(
        () => clients.map((c) => ({ id: c.id, name: c.name, taxId: c.taxId })),
        [clients]
    );

    const filteredReceipts = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return receipts.filter((r) =>
            r.clientName.toLowerCase().includes(q) ||
            r.concept.toLowerCase().includes(q) ||
            r.receiptNumber.toLowerCase().includes(q)
        );
    }, [receipts, searchTerm]);

    const totalAmount = useMemo(() => receipts.reduce((sum, r) => sum + r.amount, 0), [receipts]);

    const handleDelete = async (id: string) => {
        const result = await deleteReceipt(id);
        if (result.success) {
            setReceipts((prev) => prev.filter((r) => r.id !== id));
            toast({ title: "Recibo Eliminado", description: "El recibo ha sido eliminado." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleDownload = async (receipt: Receipt) => {
        setDownloadingId(receipt.id);
        try {
            await generateReceiptPdf(receipt, companyProfile, { t, formatCurrency, locale });
        } catch (error) {
            console.error("Error downloading receipt PDF:", error);
            toast({ title: "Error", description: "Hubo un problema al generar el PDF.", variant: "destructive" });
        } finally {
            setDownloadingId(null);
        }
    };

    if (status === 'loading') return <div className="p-10 text-center text-sm text-muted-foreground">Cargando...</div>;

    if (!user) {
        return (
            <Alert variant="destructive" className="rounded-md border-danger text-danger">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-medium text-xs">Acceso Denegado</AlertTitle>
                <AlertDescription className="text-sm">Debes iniciar sesión para ver esta página.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">{t('receipts.title')}</h2>
                    <p className="text-sm text-muted-foreground">Genera justificantes de cobro para tus clientes.</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                    <Plus className="mr-2 h-4 w-4" /> {t('receipts.addButton')}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard title="Total Recibos" value={formatCurrency(totalAmount)} />
                <StatCard title="Nº Recibos" value={receipts.length.toString()} />
            </div>

            <Card className="rounded-xl border border-border shadow-sm p-4 bg-card">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('receipts.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 pl-9 rounded-md text-sm"
                    />
                </div>
            </Card>

            {dbError && (
                <Alert variant="destructive" className="rounded-md border-danger text-danger">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-medium text-xs">Error</AlertTitle>
                    <AlertDescription className="text-sm">{dbError}</AlertDescription>
                </Alert>
            )}

            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
                            <tr>
                                <th className="px-4 py-3 font-medium">{t('receipts.receiptNumber')}</th>
                                <th className="px-4 py-3 font-medium">{t('receipts.client')}</th>
                                <th className="px-4 py-3 font-medium">{t('receipts.concept')}</th>
                                <th className="px-4 py-3 font-medium">{t('receipts.date')}</th>
                                <th className="px-4 py-3 font-medium text-right">{t('receipts.amount')}</th>
                                <th className="px-4 py-3 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {dbLoading ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">Cargando recibos...</td></tr>
                            ) : filteredReceipts.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">{t('receipts.emptyState')}</td></tr>
                            ) : (
                                filteredReceipts.map((receipt) => (
                                    <tr key={receipt.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-4 py-3 font-medium text-foreground">{receipt.receiptNumber}</td>
                                        <td className="px-4 py-3">{receipt.clientName}</td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[240px]" title={receipt.concept}>
                                            {receipt.concept}
                                            {receipt.invoiceId && receipt.invoiceNumber && (
                                                <Link href={`/dashboard/invoices/${receipt.invoiceId}`} className="ml-2 inline-flex items-center gap-1 text-primary hover:underline">
                                                    <LinkIcon className="h-3 w-3" /> {receipt.invoiceNumber}
                                                </Link>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs">
                                            {format(new Date(receipt.receivedAt), 'dd MMM yyyy', { locale: es })}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-foreground">
                                            {formatCurrency(receipt.amount)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" disabled={downloadingId === receipt.id} onClick={() => handleDownload(receipt)}>
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t('receipts.deleteConfirmTitle')}</AlertDialogTitle>
                                                            <AlertDialogDescription>{t('receipts.deleteConfirmDescription')}</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(receipt.id)}>Continuar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ReceiptFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                receipts={receipts}
                clients={clientOptions}
                onCreated={fetchData}
            />
        </div>
    );
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 5: Verificación manual (requiere migración aplicada — Tarea 1, Step 5)**

1. `npm run dev`, entra en `/dashboard`: comprueba que "Recibos" aparece en el menú lateral con un icono distinto al de "Gastos".
2. Entra en `/dashboard/receipts`. Pulsa "Nuevo Recibo": el número de recibo debe venir precargado como `REC-{año}-001` (o el siguiente correlativo si ya hay recibos).
3. Rellena cliente (texto libre, sin elegir ninguno del desplegable), concepto e importe, guarda: aparece en la tabla, con "Total Recibos" y "Nº Recibos" actualizados.
4. Pulsa "Nuevo Recibo" otra vez: el número precargado debe ser el siguiente correlativo.
5. Repite eligiendo un cliente del desplegable: comprueba que se autorrellenan nombre y CIF/NIF, y que siguen siendo editables.
6. Descarga el PDF de un recibo sin cliente vinculado (solo texto libre): debe generarse correctamente, con "RECIBÍ DE" mostrando el nombre tecleado.
7. Borra un recibo (botón de papelera + confirmación): desaparece de la tabla y de los totales.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/receipts/page.tsx src/app/dashboard/layout.tsx
git commit -m "feat(receipts): añade la pantalla Recibos y su entrada de menú"
```

---

## Task 8: Botón "Generar recibo" en el detalle de factura

**Files:**
- Modify: `src/app/dashboard/invoices/[id]/page.tsx:10` (import de iconos), `:13` (import de tipos), `:21` (nuevos imports), `:36-43` (estado), `:48-73` (`fetchInvoiceData`), `:242-244` (botones de acción), `:367` (montaje de diálogos)

**Interfaces:**
- Consumes: `getReceipts` de `@/actions/receipts` (Tarea 3); `ReceiptFormDialog`, `ClientOption` de `@/components/receipt-form-dialog` (Tarea 6); `Receipt` de `@/lib/types` (Tarea 2).

- [ ] **Step 1: Ampliar el import de iconos (línea 10)**

```tsx
import { ArrowLeft, Download, Edit, Trash2, CheckCircle, Clock, AlertCircle as AlertCircleIcon, Send, Link as LinkIcon, Share2, Eye, ReceiptEuro } from 'lucide-react';
```

- [ ] **Step 2: Ampliar el import de tipos (línea 13) y añadir los imports nuevos (tras la línea 21)**

```tsx
import type { Invoice, CompanyProfile, Receipt } from '@/lib/types';
```

```tsx
import { getReceipts } from '@/actions/receipts';
import ReceiptFormDialog, { type ClientOption } from '@/components/receipt-form-dialog';
```

- [ ] **Step 3: Añadir estado nuevo (línea 36-43, junto al resto de `useState`)**

```tsx
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
```

- [ ] **Step 4: Cargar los recibos en `fetchInvoiceData` (línea 48-73)**

```tsx
    const fetchInvoiceData = useCallback(async () => {
        if (!user || !invoiceId) return;
        setIsLoading(true);
        try {
            const [invoiceData, companyData, receiptsData] = await Promise.all([
                getInvoiceById(invoiceId),
                getCompanyProfile(),
                getReceipts(),
            ]);

            if (invoiceData && invoiceData.userId === user.id) {
                setInvoice(invoiceData);
            } else {
                toast({ title: "Error", description: "Factura no encontrada o sin acceso.", variant: "destructive" });
                setInvoice(null);
            }
            setCompanyProfile(companyData);
            setReceipts(receiptsData);
        } catch (error) {
            console.error("Error fetching invoice details:", error);
            toast({ title: "Error", description: "No se pudieron cargar los detalles de la factura.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
        // Solo el id: `user` (de useSession()) es un objeto nuevo en cada
        // render, así que usarlo como dependencia reejecutaba el efecto sin
        // parar. Ver src/lib/i18n/locale-provider.tsx para el mismo patrón.
    }, [user?.id, invoiceId]);
```

- [ ] **Step 5: Añadir el botón "Generar recibo" (línea 242-244, entre "Marcar como Pagada" y el botón de borrar)**

```tsx
                         <Button variant="outline" size="sm" disabled={isActionDisabled || invoice.status === 'Paid'} onClick={handleMarkAsPaid}>
                            <CheckCircle className="mr-2 h-4 w-4"/> {t('invoices.markAsPaid')}
                        </Button>
                        <Button variant="outline" size="sm" disabled={isActionDisabled} onClick={() => setIsReceiptDialogOpen(true)}>
                            <ReceiptEuro className="mr-2 h-4 w-4"/> {t('receipts.generateFromInvoiceButton')}
                        </Button>
```

- [ ] **Step 6: Montar el diálogo, después de `InvoicePaymentsCard` (línea 367)**

```tsx
            <InvoicePaymentsCard invoice={invoice} onChanged={fetchInvoiceData} />

            <ReceiptFormDialog
                open={isReceiptDialogOpen}
                onOpenChange={setIsReceiptDialogOpen}
                receipts={receipts}
                clients={[{ id: invoice.clientId, name: invoice.client.name, taxId: invoice.client.taxId }] as ClientOption[]}
                defaultValues={{
                    invoiceId: invoice.id,
                    clientId: invoice.clientId,
                    clientName: invoice.client.name,
                    clientTaxId: invoice.client.taxId,
                    concept: `Factura ${invoice.invoiceNumber}`,
                    amount: invoice.total,
                }}
                onCreated={fetchInvoiceData}
            />
        </div>
    );
}
```

- [ ] **Step 7: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 8: Verificación manual**

1. `npm run dev`, entra en el detalle de la factura de 450€ ya marcada como pagada (el caso concreto que disparó esta feature).
2. Pulsa "Generar recibo": el diálogo debe abrirse con cliente, concepto (`Factura {número}`) e importe (450,00€) precargados, y editables.
3. Guarda sin cambiar nada: descarga el PDF desde `/dashboard/receipts` y comprueba que dice "RECIBÍ DE {cliente}", concepto "Factura {número}", importe 450,00€, y la línea "Correspondiente a la factura {número}".
4. Entra de nuevo en el detalle de esa factura y pulsa "Generar recibo" otra vez: el número de recibo precargado debe ser el siguiente correlativo (no repetir el mismo).
5. Comprueba en `/dashboard` que el importe de este recibo (enlazado a factura) **no** se ha sumado aparte a "Cobrado" — la factura ya lo contaba.

- [ ] **Step 9: Commit**

```bash
git add src/app/dashboard/invoices/\[id\]/page.tsx
git commit -m "feat(invoices): añade el botón Generar recibo al detalle de factura"
```

---

## Task 9: Tarjeta de recibos en la ficha de cliente

**Files:**
- Create: `src/components/client-receipts-card.tsx`
- Modify: `src/app/dashboard/clients/client-form.tsx:16` (import de tipos), tras la línea 18 (nuevos imports), `:280-281` (montaje)

**Interfaces:**
- Consumes: `getReceipts`, `deleteReceipt` de `@/actions/receipts` (Tarea 3); `getCompanyProfile` de `@/actions/company`; `generateReceiptPdf` de `@/lib/pdf-generator` (Tarea 5); `ReceiptFormDialog` de `@/components/receipt-form-dialog` (Tarea 6).
- Produces: componente `ClientReceiptsCard({ clientId, clientName, clientTaxId }: { clientId: string; clientName: string; clientTaxId?: string | null })`.

- [ ] **Step 1: Crear `src/components/client-receipts-card.tsx`**

```tsx
"use client";

import { useEffect, useState } from 'react';
import { Plus, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { Receipt, CompanyProfile } from '@/lib/types';
import { getReceipts, deleteReceipt } from '@/actions/receipts';
import { getCompanyProfile } from '@/actions/company';
import { generateReceiptPdf } from '@/lib/pdf-generator';
import { useLocale } from '@/lib/i18n/locale-provider';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import ReceiptFormDialog from '@/components/receipt-form-dialog';

interface ClientReceiptsCardProps {
  clientId: string;
  clientName: string;
  clientTaxId?: string | null;
}

export default function ClientReceiptsCard({ clientId, clientName, clientTaxId }: ClientReceiptsCardProps) {
  const { t, formatCurrency, locale } = useLocale();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allReceipts, company] = await Promise.all([getReceipts(), getCompanyProfile()]);
      setReceipts(allReceipts);
      setCompanyProfile(company);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientReceipts = receipts.filter((r) => r.clientId === clientId);

  const handleDelete = async (id: string) => {
    const result = await deleteReceipt(id);
    if (result.success) {
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Recibo Eliminado", description: "El recibo ha sido eliminado." });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleDownload = async (receipt: Receipt) => {
    await generateReceiptPdf(receipt, companyProfile, { t, formatCurrency, locale });
  };

  return (
    <Card className="glass-card border border-border/40 shadow-2xl rounded-[2rem] overflow-hidden p-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 mb-4">
        <CardTitle className="text-lg">{t('receipts.title')}</CardTitle>
        <Button size="sm" variant="outline" type="button" onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> {t('receipts.addButton')}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : clientReceipts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('receipts.emptyState')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('receipts.receiptNumber')}</TableHead>
                <TableHead>{t('receipts.date')}</TableHead>
                <TableHead>{t('receipts.concept')}</TableHead>
                <TableHead className="text-right">{t('receipts.amount')}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>{receipt.receiptNumber}</TableCell>
                  <TableCell>{format(new Date(receipt.receivedAt), "PPP", { locale: es })}</TableCell>
                  <TableCell className="text-muted-foreground">{receipt.concept}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(receipt.amount)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" type="button" onClick={() => handleDownload(receipt)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" type="button">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('receipts.deleteConfirmTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>{t('receipts.deleteConfirmDescription')}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(receipt.id)}>Continuar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <ReceiptFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        receipts={receipts}
        clients={[{ id: clientId, name: clientName, taxId: clientTaxId }]}
        defaultValues={{ clientId, clientName, clientTaxId }}
        onCreated={fetchData}
      />
    </Card>
  );
}
```

`type="button"` en los botones de esta tarjeta es obligatorio: vive dentro del `<form>` de `ClientForm`, y sin él un click en "Nuevo Recibo" o en descargar/borrar dispararía el `submit` del formulario de cliente.

- [ ] **Step 2: Ampliar el import de tipos en `src/app/dashboard/clients/client-form.tsx` (línea 16) y añadir el import del componente nuevo (tras la línea 18)**

```tsx
import type { Client } from '@/lib/types';
```

```tsx
import ClientReceiptsCard from '@/components/client-receipts-card';
```

- [ ] **Step 3: Montar la tarjeta tras `</Form>`, antes del cierre del `<div>` (línea 280-281)**

```tsx
                </form>
            </Form>

            {isEditing && client && (
                <ClientReceiptsCard clientId={client.id} clientName={client.name} clientTaxId={client.taxId} />
            )}
        </div>
    );
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 5: Verificación manual**

1. `npm run dev`, entra en `/dashboard/clients/<id>/edit` de un cliente real.
2. Confirma que aparece la tarjeta "Recibos" debajo del formulario, con botón "Nuevo Recibo".
3. Crea un recibo desde ahí: cliente y CIF/NIF deben venir precargados con los de esta ficha y no ser editables por error (pero sí lo son si se desea).
4. Comprueba que el recibo aparece en la tabla de esta tarjeta y también en `/dashboard/receipts`.
5. Pulsa "Nuevo Recibo" y cancela sin guardar (cierra el diálogo): confirma que el formulario de datos del cliente (nombre, email, etc.) no se ha enviado ni alterado por el click.
6. Borra el recibo desde esta tarjeta: desaparece de aquí y de `/dashboard/receipts`.

- [ ] **Step 6: Commit**

```bash
git add src/components/client-receipts-card.tsx src/app/dashboard/clients/client-form.tsx
git commit -m "feat(clients): añade la tarjeta de recibos a la ficha de cliente"
```

---

## Task 10: Recibos sueltos en el dashboard

**Files:**
- Modify: `src/app/dashboard/page.tsx:22-24` (imports), `:39-41` (estado), `:49-74` (`fetchData`), `:76-91` (`stats`), `:93-109` (`chartData`)

**Interfaces:**
- Consumes: `getReceipts` de `@/actions/receipts` (Tarea 3).

- [ ] **Step 1: Añadir el import de `getReceipts` (línea 22-24)**

```tsx
import { getInvoices } from "@/actions/invoices";
import { getExpenses } from "@/actions/expenses";
import { getClients } from "@/actions/clients";
import { getReceipts } from "@/actions/receipts";
```

- [ ] **Step 2: Añadir estado para los recibos (línea 39-41)**

```tsx
    const [invoices, setInvoices] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [receipts, setReceipts] = useState<any[]>([]);
```

- [ ] **Step 3: Cargar los recibos en `fetchData` (línea 49-74)**

```tsx
    useEffect(() => {
        const fetchData = async () => {
            if (userId) {
                setDbLoading(true);
                setLoadError(null);
                try {
                    const [invData, cliData, expData, recData] = await Promise.all([
                        getInvoices(),
                        getClients(),
                        getExpenses(),
                        getReceipts()
                    ]);
                    setInvoices(invData);
                    setClients(cliData);
                    setExpenses(expData);
                    setReceipts(recData);
                } catch (e) {
                    console.error("Error cargando el panel:", e);
                    setLoadError("No se han podido cargar tus datos. Revisa tu conexión e inténtalo de nuevo.");
                } finally {
                    setDbLoading(false);
                }
            } else if (status !== 'loading') {
                setDbLoading(false);
            }
        };
        fetchData();
    }, [userId, status]);
```

- [ ] **Step 4: Sumar los recibos sueltos en `stats` (línea 76-91)**

```tsx
    const stats = useMemo(() => {
        const pending = invoices.filter(i => i.status === 'Pending' || i.status === 'PartiallyPaid');
        const overdue = invoices.filter(i => i.status === 'Overdue');

        // Un recibo enlazado a una factura (invoiceId) no suma aparte: ese
        // ingreso ya lo cuenta invoice.amountPaid. Solo los recibos sueltos
        // representan dinero cobrado que ninguna factura registra todavía.
        const standaloneReceipts = receipts.filter(r => !r.invoiceId);
        const receiptsIncome = standaloneReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);

        const totalIncome = invoices.reduce((sum, i) => sum + (i.amountPaid || 0), 0) + receiptsIncome;
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const cashFlow = totalIncome - totalExpenses;

        return {
            income: totalIncome,
            expenses: totalExpenses,
            cashFlow,
            pendingCount: pending.length,
            overdueCount: overdue.length,
        };
    }, [invoices, expenses, receipts]);
```

- [ ] **Step 5: Repartir los recibos sueltos en `chartData` (línea 93-109)**

```tsx
    const chartData = useMemo(() => {
        const buckets = getMonthBuckets(new Date(), chartMonths);
        return buckets.map(bucket => {
            const invoiceIncome = invoices
                .filter(i => isInBucket(i.issueDate, bucket))
                .reduce((s, i) => s + (i.amountPaid || 0), 0);
            const receiptIncome = receipts
                .filter(r => !r.invoiceId && isInBucket(r.receivedAt, bucket))
                .reduce((s, r) => s + (r.amount || 0), 0);
            const exp = expenses
                .filter(e => isInBucket(e.date, bucket))
                .reduce((s, e) => s + e.amount, 0);

            return {
                name: bucket.label,
                ingresos: Math.round(invoiceIncome + receiptIncome),
                gastos: Math.round(exp)
            };
        });
    }, [invoices, expenses, receipts, chartMonths]);
```

- [ ] **Step 6: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 7: Verificación manual**

1. `npm run dev`, anota el valor actual de "Ingresos Totales" y "Cash Flow" en `/dashboard`.
2. Crea un recibo suelto (sin factura) de 100€ desde `/dashboard/receipts`, con `receivedAt` de hoy.
3. Recarga `/dashboard`: "Ingresos Totales" y "Cash Flow" deben haber subido exactamente 100€, y el gráfico mensual del mes actual debe reflejar esos 100€ adicionales en "ingresos".
4. Crea otro recibo, esta vez desde el detalle de una factura ya pagada (enlazado, con `invoiceId`), por el mismo importe que la factura.
5. Recarga `/dashboard`: "Ingresos Totales" **no** debe haber cambiado por este segundo recibo — ya estaba contado por `invoice.amountPaid`.
6. Entra en `/dashboard/reports` y genera el informe del periodo que incluye estos recibos: el total no debe incluir el recibo suelto de 100€ (los informes fiscales siguen siendo solo de facturas, por diseño).

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(dashboard): suma los recibos sueltos en Cobrado y flujo de caja"
```

---

## Verificación final de rama

- [ ] `npm run typecheck` y `npm run lint` limpios en la rama completa.
- [ ] Repasar la lista de "Review Focus" de arriba una vez más, de principio a fin, sobre la app corriendo con `npm run dev`.
- [ ] Confirmar que `drizzle/003_receipts.sql` está aplicado en cualquier base de datos contra la que se vaya a hacer una demo o desplegar.
