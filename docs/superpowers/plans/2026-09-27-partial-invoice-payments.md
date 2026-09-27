# Pagos Parciales de Facturas — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir registrar abonos parciales contra una factura (fecha, importe, método, nota), que la factura refleje automáticamente cuánto se ha cobrado y cuánto queda pendiente, y que ese saldo se vea tanto en el panel del usuario como en la página pública que ve su cliente.

**Architecture:** Tabla nueva `invoice_payments` (uno-a-muchos con `invoices`), un módulo de acciones de servidor dedicado (`src/actions/invoice-payments.ts`) que valida y recalcula el estado de la factura tras cada alta/borrado, y una tarjeta de UI nueva (`InvoicePaymentsCard`) que se cuelga del detalle de factura ya existente. El resto de pantallas (listado, dashboard, informes, página pública) se ajustan para sumar los importes reales cobrados en vez de asumir todo-o-nada.

**Tech Stack:** Next.js 15 (App Router, Server Actions), Drizzle ORM + PostgreSQL, Zod, react-hook-form, Tailwind + Radix (shadcn/ui).

**Spec:** `docs/superpowers/specs/2026-09-27-partial-invoice-payments-design.md`

## Global Constraints

- Importes en céntimos (`integer`) en base de datos y en las acciones de servidor; en euros (`number`) en los tipos de UI (`Invoice`, `InvoicePayment`) — igual que el resto del código existente (`mapInvoice` en `src/actions/invoices.ts`).
- `PartiallyPaid` nunca es seleccionable a mano en los desplegables de estado — solo lo pone el propio sistema al recalcular tras un alta/borrado de pago.
- Un pago no puede superar el importe pendiente (`amountDue`) actual de la factura — se rechaza con un `ActionResult` de error, nunca se deja la factura en negativo.
- Solo hay alta y borrado de pagos, no edición (decisión ya tomada con el usuario).
- Los botones de Stripe/PayPal en la página pública (`/invoice/[id]`) se ocultan en cuanto `invoice.status === 'PartiallyPaid'`, porque esas pasarelas cobran/verifican el importe **total** de la factura sin descontar lo ya pagado.
- Las migraciones de este proyecto son SQL escrito a mano en `drizzle/`, aplicado con `psql "$DATABASE_URL" -f drizzle/NNN_nombre.sql`, no `drizzle-kit generate` (ver `drizzle/001_indexes_and_vat.sql`, que sigue el mismo patrón idempotente envuelto en `BEGIN;`/`COMMIT;`).
- **Este proyecto no tiene ningún framework de tests configurado** (no hay `jest`/`vitest`, no existe `playwright.config.ts` pese a tener `@playwright/test` como devDependency, y `package.json` no define ningún script `test`). Siguiendo la convención real del propio repositorio, este plan no introduce uno nuevo solo para esta feature. Cada tarea sustituye el ciclo estándar "test que falla → implementación → test que pasa" por: cambio de código → `npm run typecheck` → verificación manual guiada (arrancando `npm run dev` y siguiendo los pasos concretos que da la tarea). Esto es una desviación consciente de la plantilla por defecto de `writing-plans`, documentada aquí, no una omisión.
- Aplicar la migración SQL contra una base de datos real es una acción con estado compartido y difícil de revertir: **ninguna tarea la ejecuta automáticamente**. Se deja como paso manual explícito, con `DATABASE_URL` a mano, antes de poder verificar manualmente las tareas de UI (Tarea 6 en adelante).

## Review Focus

- Registrar un pago cuyo importe supera el pendiente actual debe rechazarse con un mensaje claro, no dejar la factura con saldo negativo. (Tarea 3)
- Borrar el único pago de una factura `PartiallyPaid` debe devolverla a `Pending`; borrar un pago de una factura que estaba `Overdue`/`Draft`/`Paid` a mano no debe tocar su estado. (Tarea 3)
- Una factura marcada "Pagada" a mano sin ningún pago registrado en la tabla debe mostrar Pagado = total y Pendiente = 0€, no arrastrar un pendiente fantasma calculado solo de la tabla de pagos. (Tarea 4)
- Un usuario no puede añadir ni borrar pagos de una factura que no es suya — comprobación de propiedad tanto en el alta (`invoices.userId`) como en el borrado (vía join a la factura). (Tarea 3)
- En la página pública, los botones de Stripe/PayPal deben desaparecer en cuanto hay un pago parcial registrado, para no permitir que el cliente pague el importe total completo por pasarela encima de lo ya abonado a mano. (Tarea 8)

---

## Task 1: Esquema de base de datos — tabla `invoice_payments` y migración

**Files:**
- Modify: `src/db/schema.ts:95-105` (entre `invoiceTaxes` y `notifications`), `src/db/schema.ts:156-167` (`invoicesRelations`), `src/db/schema.ts:176-182` (después de `invoiceItemsRelations`)
- Create: `drizzle/002_invoice_payments.sql`

**Interfaces:**
- Produces: tabla Drizzle `invoicePayments` con columnas `id, invoiceId, amount (cents), paidAt, method, note, createdAt`; relación `invoicesRelations.payments: many(invoicePayments)`; relación `invoicePaymentsRelations.invoice: one(invoices)`. Estos nombres los consume la Tarea 3 (`db.query.invoicePayments`, `db.query.invoices.findMany({ with: { payments: true } })`).

- [ ] **Step 1: Añadir la tabla `invoicePayments` en `src/db/schema.ts`**

Insertar justo después del cierre de `invoiceTaxes` (línea 104) y antes de `export const notifications` (línea 106):

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
```

- [ ] **Step 2: Añadir la relación en `invoicesRelations` (línea 156-167)**

```ts
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  items: many(invoiceItems),
  taxes: many(invoiceTaxes),
  payments: many(invoicePayments),
}));
```

- [ ] **Step 3: Añadir `invoicePaymentsRelations`, después de `invoiceItemsRelations` (línea 176-181), antes de `notificationsRelations`**

```ts
export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoicePayments.invoiceId],
    references: [invoices.id],
  }),
}));
```

- [ ] **Step 4: Crear la migración `drizzle/002_invoice_payments.sql`**

```sql
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
```

- [ ] **Step 5: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores nuevos relacionados con `src/db/schema.ts`.

- [ ] **Step 6: Aplicar la migración manualmente**

Esto lo ejecuta una persona con `DATABASE_URL` a mano, no el agente que implementa el plan:

```bash
psql "$DATABASE_URL" -f drizzle/002_invoice_payments.sql
```

Sin este paso, las tareas 3 en adelante compilan pero no se pueden probar manualmente contra una base de datos real.

- [ ] **Step 7: Commit**

```bash
git add src/db/schema.ts drizzle/002_invoice_payments.sql
git commit -m "feat(db): añade tabla invoice_payments para abonos parciales"
```

---

## Task 2: Tipos — `InvoiceStatus`, `InvoicePayment`, campos calculados en `Invoice`

**Files:**
- Modify: `src/lib/types.ts:12` (`InvoiceStatus`), `src/lib/types.ts:105-137` (nuevo tipo + `Invoice`)

**Interfaces:**
- Consumes: nada nuevo (solo tipos).
- Produces: `InvoiceStatus` incluye `'PartiallyPaid'`; `InvoicePayment = { id, amount, paidAt, method?, note? }`; `Invoice` gana `payments: InvoicePayment[]`, `amountPaid: number`, `amountDue: number`. Estos nombres los consumen las Tareas 3-9.

- [ ] **Step 1: Ampliar `InvoiceStatus` (línea 12)**

```ts
export type InvoiceStatus = 'Paid' | 'PartiallyPaid' | 'Pending' | 'Overdue' | 'Draft';
```

- [ ] **Step 2: Añadir `InvoicePayment`, justo después de `InvoiceTax` (línea 105-109), antes del comentario `/** Represents a single invoice. */`**

```ts
/**
 * Un abono registrado a mano contra una factura. Solo hay alta y borrado —
 * no edición — así que no lleva `updatedAt`.
 */
export type InvoicePayment = {
  id: string;
  amount: number;
  paidAt: Date;
  method?: 'Transferencia' | 'Efectivo' | 'Otro' | null;
  note?: string | null;
};
```

- [ ] **Step 3: Ampliar `Invoice` (línea 115-137) con `payments`, `amountPaid`, `amountDue`**

```ts
export type Invoice = {
  id: string;
  userId: string;
  clientId: string;
  client: InvoiceClient;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  taxes: InvoiceTax[];
  payments: InvoicePayment[];
  subtotal: number;
  total: number;
  /** Suma real de `payments`, salvo que `status === 'Paid'`, en cuyo caso vale `total`. */
  amountPaid: number;
  /** `max(total - amountPaid, 0)`. */
  amountDue: number;
  notes?: string;
  terms?: string;

  // Payment Integration
  paymentMethod?: 'Stripe' | 'PayPal' | 'Manual';
  paymentId?: string;
  paymentStatus?: string;

  createdAt: Date;
};
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run typecheck`
Expected: aparecerán errores en los consumidores de `Invoice`/`InvoiceStatus` que aún no rellenan `payments`/`amountPaid`/`amountDue` (se resuelven en la Tarea 4) o que no manejan `PartiallyPaid` en un `switch` exhaustivo — anótalos, se resuelven en las tareas siguientes. No hace falta que compile limpio todavía.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): añade InvoicePayment y el estado PartiallyPaid"
```

---

## Task 3: Acciones de servidor — `addInvoicePayment` y `deleteInvoicePayment`

**Files:**
- Create: `src/actions/invoice-payments.ts`

**Interfaces:**
- Consumes: `db` de `@/db/config`; `invoices`, `invoicePayments` de `@/db/schema`; `requireUserId` de `@/lib/session`; `ActionResult`, `toActionError` de `@/lib/action-result`; `createNotification` de `./notifications`.
- Produces: `addInvoicePayment(invoiceId: string, data: unknown): Promise<ActionResult<{ id: string }>>`, `deleteInvoicePayment(paymentId: string): Promise<ActionResult>`. La Tarea 6 (UI) llama a estas dos funciones tal cual.

- [ ] **Step 1: Escribir `src/actions/invoice-payments.ts`**

```ts
"use server";

import { db } from "@/db/config";
import { invoices, invoicePayments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { type ActionResult, toActionError } from "@/lib/action-result";
import { createNotification } from "./notifications";

const InvoicePaymentSchema = z.object({
  amount: z.number().positive("El importe debe ser mayor que 0"),
  paidAt: z.coerce.date(),
  method: z.enum(['Transferencia', 'Efectivo', 'Otro']).optional(),
  note: z.string().optional(),
});

/** Suma en céntimos de los pagos ya registrados para una factura. */
async function getAmountPaid(executor: typeof db, invoiceId: string): Promise<number> {
  const rows = await executor
    .select({ amount: invoicePayments.amount })
    .from(invoicePayments)
    .where(eq(invoicePayments.invoiceId, invoiceId));
  return rows.reduce((sum, r) => sum + r.amount, 0);
}

/**
 * Recalcula el estado de una factura a partir de la suma real de sus pagos.
 *
 * Nunca hace retroceder un estado puesto a mano (Overdue/Draft/Paid manual):
 * solo gestiona las transiciones que el propio sistema generó
 * (Pending <-> PartiallyPaid <-> Paid). Así borrar un pago suelto en una
 * factura marcada Overdue no la devuelve a Pending por sorpresa.
 */
async function recomputeInvoiceStatus(tx: typeof db, invoiceId: string): Promise<void> {
  const invoice = await tx.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!invoice) return;

  // 'Paid' es una afirmación deliberada (botón manual, o el saldo ya llegó a
  // 0€ antes). Nunca se deshace solo porque alguien añade o borra un abono
  // suelto después — si no, registrar un pago parcial sobre una factura ya
  // marcada Paid a mano la haría "retroceder" a PartiallyPaid.
  if (invoice.status === 'Paid') return;

  const amountPaid = await getAmountPaid(tx, invoiceId);
  const amountDue = Math.max(invoice.total - amountPaid, 0);

  let nextStatus = invoice.status;
  if (amountDue <= 0) {
    nextStatus = 'Paid';
  } else if (amountPaid > 0) {
    nextStatus = 'PartiallyPaid';
  } else if (invoice.status === 'PartiallyPaid') {
    nextStatus = 'Pending';
  }

  if (nextStatus !== invoice.status) {
    await tx.update(invoices).set({ status: nextStatus }).where(eq(invoices.id, invoiceId));
  }
}

export async function addInvoicePayment(
  invoiceId: string,
  data: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const v = InvoicePaymentSchema.parse(data);

    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)),
    });
    if (!invoice) return { success: false, error: "Factura no encontrada." };

    const amountPaidSoFar = await getAmountPaid(db, invoiceId);
    const amountDue = Math.max(invoice.total - amountPaidSoFar, 0);
    const amountCents = Math.round(v.amount * 100);

    if (amountCents > amountDue) {
      return {
        success: false,
        error: `El importe supera el pendiente (${(amountDue / 100).toFixed(2)}€).`,
      };
    }

    const created = await db.transaction(async (tx) => {
      const inserted = await tx.insert(invoicePayments).values({
        invoiceId,
        amount: amountCents,
        paidAt: v.paidAt,
        method: v.method,
        note: v.note,
      }).returning();

      await recomputeInvoiceStatus(tx as unknown as typeof db, invoiceId);

      return inserted[0];
    });

    await createNotification({
      userId,
      title: "Pago Registrado",
      body: `Se ha registrado un abono de ${(amountCents / 100).toFixed(2)}€ en la factura ${invoice.invoiceNumber}.`,
      href: `/dashboard/invoices/${invoiceId}`,
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return toActionError(error, "No se pudo registrar el pago.", "addInvoicePayment");
  }
}

export async function deleteInvoicePayment(paymentId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    const row = await db.query.invoicePayments.findFirst({
      where: eq(invoicePayments.id, paymentId),
      with: { invoice: true },
    });
    if (!row || row.invoice.userId !== userId) {
      return { success: false, error: "Pago no encontrado." };
    }

    const invoiceId = row.invoiceId;

    await db.transaction(async (tx) => {
      await tx.delete(invoicePayments).where(eq(invoicePayments.id, paymentId));
      await recomputeInvoiceStatus(tx as unknown as typeof db, invoiceId);
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    return { success: true, data: null };
  } catch (error) {
    return toActionError(error, "No se pudo eliminar el pago.", "deleteInvoicePayment");
  }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: `src/actions/invoice-payments.ts` compila sin errores. (El `as unknown as typeof db` en `recomputeInvoiceStatus` es deliberado: el tipo exacto del callback de `db.transaction` no está exportado por Drizzle en este proyecto, y el resto del código de `src/actions/invoices.ts` tampoco lo tipa explícitamente — se mantiene la misma laxitud que `mapInvoice(row: any)`.)

- [ ] **Step 3: Verificación manual (requiere migración aplicada — Tarea 1, Step 6)**

Sin UI todavía, se prueba con una llamada puntual desde una ruta de servidor ya existente o la consola de `psql`. Como mínimo, comprobar contra una factura real de prueba (crea una desde el dashboard si no tienes ninguna, con total 360€):

1. Anota el `id` de una factura `Pending` con total 360,00€ (columna `id` en `invoices`).
2. Desde una terminal Node (`npx tsx` o similar) o temporalmente desde una página de servidor, llama `addInvoicePayment(invoiceId, { amount: 180, paidAt: new Date(), method: 'Transferencia' })` y comprueba en la base de datos: `invoices.status` pasa a `PartiallyPaid`, y hay una fila nueva en `invoice_payments`.
3. Repite con `amount: 200` sobre la misma factura (superaría el pendiente de 180€) y comprueba que devuelve `{ success: false, error: "El importe supera el pendiente (180.00€)." }` sin insertar nada.
4. Llama `addInvoicePayment(invoiceId, { amount: 180, paidAt: new Date() })` (el resto pendiente exacto) y comprueba que `invoices.status` pasa a `Paid`.
5. Borra ese último pago con `deleteInvoicePayment(paymentId)` y comprueba que `invoices.status` vuelve a `PartiallyPaid` (no a `Pending`, porque `amountPaid` sigue siendo 180€ > 0).
6. Borra el primer pago también y comprueba que `invoices.status` vuelve a `Pending`.
7. Con una factura distinta ya marcada `Paid` a mano (usa `updateInvoiceStatus` o el botón "Marcar como pagada") y sin ningún pago registrado, llama `addInvoicePayment(invoiceId, { amount: 50, paidAt: new Date() })`: debe insertarse el pago, pero `invoices.status` debe seguir en `Paid` (no retroceder a `PartiallyPaid`).
8. Comprobación de propiedad (por lectura de código, no hace falta montar una segunda cuenta): confirma que `addInvoicePayment` filtra la factura por `and(eq(invoices.id, invoiceId), eq(invoices.userId, userId))` antes de aceptar el pago, y que `deleteInvoicePayment` compara `row.invoice.userId !== userId` antes de borrar — ambas rutas devuelven `{ success: false, error: "... no encontrad[a|o]." }` en vez de tocar nada si la factura/pago no pertenece al usuario autenticado.

Esta verificación queda cómoda y visual una vez montada la Tarea 6 (UI); si prefieres, puedes posponerla hasta entonces y hacerla ahí directamente.

- [ ] **Step 4: Commit**

```bash
git add src/actions/invoice-payments.ts
git commit -m "feat(invoices): añade addInvoicePayment y deleteInvoicePayment"
```

---

## Task 4: Exponer pagos e importes calculados desde `src/actions/invoices.ts`

**Files:**
- Modify: `src/actions/invoices.ts:70-97` (`mapInvoice`), `src/actions/invoices.ts:113-131` (`getInvoices`, `getInvoiceById`), `src/actions/invoices.ts:336-381` (`getPublicInvoiceById`)

**Interfaces:**
- Consumes: `InvoicePayment`, `Invoice` de `@/lib/types` (Tarea 2).
- Produces: `mapInvoice(row)` devuelve además `payments`, `amountPaid`, `amountDue`; `getPublicInvoiceById` expone `amountPaid`/`amountDue` (sin el detalle de cada pago) dentro de `invoice`. La Tarea 6, 7, 8 y 9 consumen estos campos.

- [ ] **Step 1: Ampliar `mapInvoice` (línea 70-97)**

```ts
function mapInvoice(row: any) {
  const rawAmountPaid = (row.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
  const amountPaid = row.status === 'Paid' ? row.total : rawAmountPaid;
  const amountDue = Math.max(row.total - amountPaid, 0);

  return {
    id: row.id,
    userId: row.userId,
    clientId: row.clientId,
    invoiceNumber: row.invoiceNumber,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    status: row.status,
    subtotal: row.subtotal / 100,
    total: row.total / 100,
    amountPaid: amountPaid / 100,
    amountDue: amountDue / 100,
    notes: row.notes || undefined,
    taxes: row.taxes.map((t: any) => ({ id: t.id, name: t.name, percentage: Number(t.percentage) })),
    payments: (row.payments || [])
      .map((p: any) => ({
        id: p.id,
        amount: p.amount / 100,
        paidAt: p.paidAt,
        method: p.method || undefined,
        note: p.note || undefined,
      }))
      .sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()),
    createdAt: row.createdAt,
    client: {
      name: row.client.name,
      email: row.client.email,
      address: row.client.address || undefined,
      taxId: row.client.taxId || undefined,
    },
    items: row.items.map((i: any) => ({
      id: i.id,
      description: i.description,
      quantity: i.quantity,
      price: i.price / 100,
    })),
  };
}
```

- [ ] **Step 2: Pedir `payments` en `getInvoices` y `getInvoiceById` (línea 113-131)**

```ts
export async function getInvoices() {
  const userId = await requireUserId();
  const results = await db.query.invoices.findMany({
    where: eq(invoices.userId, userId),
    with: { client: true, items: true, taxes: true, payments: true },
    orderBy: [desc(invoices.createdAt)],
  });
  return results.map(mapInvoice);
}

export async function getInvoiceById(invoiceId: string) {
  if (!invoiceId) return null;
  const userId = await requireUserId();
  const row = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)),
    with: { client: true, items: true, taxes: true, payments: true },
  });
  return row ? mapInvoice(row) : null;
}
```

- [ ] **Step 3: Exponer `amountPaid`/`amountDue` (no el detalle de pagos) en `getPublicInvoiceById` (línea 336-381)**

Cambiar el `with` de la consulta (línea ~341) para incluir `payments: true`, y añadir los dos campos calculados al objeto `invoice` que se devuelve (dentro del bloque `return { invoice: {...}, company: {...} }`):

```ts
export async function getPublicInvoiceById(invoiceId: string) {
  if (!invoiceId) return null;

  const row = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: { client: true, items: true, taxes: true, payments: true },
  });
  if (!row) return null;

  const company = await db.query.companyProfiles.findFirst({
    where: eq(companyProfiles.userId, row.userId),
  });
  if (!company) return null;

  const mapped = mapInvoice(row);

  return {
    invoice: {
      id: mapped.id,
      invoiceNumber: mapped.invoiceNumber,
      issueDate: mapped.issueDate,
      dueDate: mapped.dueDate,
      status: mapped.status,
      subtotal: mapped.subtotal,
      total: mapped.total,
      amountPaid: mapped.amountPaid,
      amountDue: mapped.amountDue,
      notes: mapped.notes,
      taxes: mapped.taxes,
      client: mapped.client,
      items: mapped.items,
    },
    company: {
      name: company.companyName,
      email: company.email,
      address: company.address,
      taxId: company.taxId,
      logoUrl: company.logoUrl,
      currency: company.currency,
      iban: company.iban,
      stripeEnabled: company.stripeEnabled,
      stripePublishableKey: company.stripePublishableKey,
      paypalEnabled: company.paypalEnabled,
      paypalClientId: company.paypalClientId,
      paypalSandbox: company.paypalSandbox,
    },
  };
}
```

Nota: deliberadamente **no** se añade `mapped.payments` aquí — el cliente ve el saldo, no el historial línea a línea de cada abono (decisión del diseño, sección 3 de la spec).

- [ ] **Step 4: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores en `src/actions/invoices.ts`.

- [ ] **Step 5: Verificación manual (requiere migración aplicada)**

1. `npm run dev`, entra en `/dashboard/invoices/<id>` de una factura sin pagos: no debe romperse nada (payments = `[]`, amountPaid = 0, amountDue = total).
2. Marca esa factura como "Pagada" con el botón existente (sin registrar ningún pago) y recarga: confirma que `amountDue` sería 0€ si lo inspeccionas (esto se verá visualmente en la Tarea 6; de momento basta con que no haya errores en consola).

- [ ] **Step 6: Commit**

```bash
git add src/actions/invoices.ts
git commit -m "feat(invoices): expone payments, amountPaid y amountDue en las consultas de factura"
```

---

## Task 5: Badge de estado y traducciones

**Files:**
- Modify: `src/components/invoice-status-badge.tsx:13-33`, `src/lib/i18n/locales/es.json:51-68`, `src/lib/i18n/locales/en.json`, `src/lib/i18n/locales/ca.json`, `src/lib/i18n/locales/fr.json`, `src/lib/i18n/locales/it.json`

**Interfaces:**
- Consumes: claves `invoices.statusPartiallyPaid` y el bloque `invoices.payments.*` vía `t()` de `useLocale()`.
- Produces: `InvoiceStatusBadge` renderiza `PartiallyPaid` con texto y color propios. Las claves `invoices.payments.*` las consume la Tarea 6.

- [ ] **Step 1: Añadir el caso `PartiallyPaid` en `src/components/invoice-status-badge.tsx` (línea 13-33)**

```tsx
export default function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const { t } = useLocale();

  const getStatusText = () => {
    switch (status) {
      case 'Paid': return t('invoices.statusPaid');
      case 'PartiallyPaid': return t('invoices.statusPartiallyPaid');
      case 'Pending': return t('invoices.statusPending');
      case 'Overdue': return t('invoices.statusOverdue');
      default: return status;
    }
  }

  const getStyles = () => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-500/10 text-emerald-500 border-none';
      case 'PartiallyPaid':
        return 'bg-sky-500/10 text-sky-500 border-none';
      case 'Pending':
        return 'bg-amber-500/10 text-amber-500 border-none';
      case 'Overdue':
        return 'bg-destructive/10 text-destructive border-none';
      default:
        return 'bg-muted text-muted-foreground border-none';
    }
  }
```

(El resto del archivo no cambia.)

- [ ] **Step 2: Añadir claves en `src/lib/i18n/locales/es.json`, dentro de `"invoices"` (línea 51-68)**

```json
    "invoices": {
        "allInvoices": "Todas las Facturas",
        "searchPlaceholder": "Buscar por cliente o nº de factura",
        "client": "Cliente",
        "invoiceNumber": "Número de Factura",
        "invoiceNumberShort": "Nº Factura",
        "amount": "Importe",
        "status": "Estado",
        "dueDate": "Vencimiento",
        "issueDate": "Fecha de Emisión",
        "markAsPaid": "Marcar como Pagada",
        "downloadPdf": "Descargar PDF",
        "deleteInvoice": "Eliminar Factura",
        "statusPaid": "Pagada",
        "statusPartiallyPaid": "Parcialmente Pagada",
        "statusPending": "Pendiente",
        "statusOverdue": "Vencida",
        "invoice": "Factura",
        "payments": {
            "title": "Pagos",
            "addButton": "Añadir pago",
            "amount": "Importe",
            "date": "Fecha",
            "method": "Método",
            "methodTransfer": "Transferencia",
            "methodCash": "Efectivo",
            "methodOther": "Otro",
            "note": "Nota",
            "notePlaceholder": "Nota opcional",
            "amountPaid": "Pagado",
            "amountDue": "Pendiente",
            "emptyState": "Todavía no se ha registrado ningún pago.",
            "deleteConfirmTitle": "¿Eliminar este pago?",
            "deleteConfirmDescription": "Esta acción no se puede deshacer. El saldo pendiente de la factura se recalculará.",
            "gatewayDisabledNotice": "Este pago se está gestionando por transferencia directa. Contacta con nosotros si tienes cualquier duda."
        }
    },
```

- [ ] **Step 3: Repetir la misma clave y estructura en `en.json`, `ca.json`, `fr.json`, `it.json`**

Mismos nombres de clave, texto traducido a cada idioma. Ejemplo para `en.json` (junto a `"statusOverdue": "Overdue"` en la línea 66 de ese archivo):

```json
        "statusPaid": "Paid",
        "statusPartiallyPaid": "Partially Paid",
        "statusPending": "Pending",
        "statusOverdue": "Overdue",
        "invoice": "Invoice",
        "payments": {
            "title": "Payments",
            "addButton": "Add payment",
            "amount": "Amount",
            "date": "Date",
            "method": "Method",
            "methodTransfer": "Bank transfer",
            "methodCash": "Cash",
            "methodOther": "Other",
            "note": "Note",
            "notePlaceholder": "Optional note",
            "amountPaid": "Paid",
            "amountDue": "Due",
            "emptyState": "No payments registered yet.",
            "deleteConfirmTitle": "Delete this payment?",
            "deleteConfirmDescription": "This action cannot be undone. The invoice balance will be recalculated.",
            "gatewayDisabledNotice": "This invoice is being paid by direct transfer. Contact us if you have any questions."
        }
```

Repite el mismo patrón (mismas claves, texto traducido) en `ca.json`, `fr.json` e `it.json`, respetando el idioma de cada uno.

- [ ] **Step 4: Verificar tipos y JSON válido**

Run: `npm run typecheck`
Run: `node -e "['es','en','ca','fr','it'].forEach(l => JSON.parse(require('fs').readFileSync('src/lib/i18n/locales/'+l+'.json','utf8')))"`
Expected: sin errores en ninguno de los dos comandos (el segundo confirma que los 5 JSON siguen siendo válidos tras editarlos a mano).

- [ ] **Step 5: Commit**

```bash
git add src/components/invoice-status-badge.tsx src/lib/i18n/locales/*.json
git commit -m "feat(i18n): añade textos y color para el estado PartiallyPaid"
```

---

## Task 6: Tarjeta de pagos en el detalle de factura

**Files:**
- Create: `src/components/invoice-payments-card.tsx`
- Modify: `src/app/dashboard/invoices/[id]/page.tsx:5` (import), `src/app/dashboard/invoices/[id]/page.tsx:47-75` (extraer `fetchInvoiceData`), `src/app/dashboard/invoices/[id]/page.tsx:359` (montar la tarjeta)

**Interfaces:**
- Consumes: `addInvoicePayment`, `deleteInvoicePayment` de `@/actions/invoice-payments` (Tarea 3); `Invoice` de `@/lib/types` (Tarea 2); claves `invoices.payments.*` (Tarea 5).
- Produces: componente `InvoicePaymentsCard({ invoice, onChanged }: { invoice: Invoice; onChanged: () => Promise<void> })`.

- [ ] **Step 1: Crear `src/components/invoice-payments-card.tsx`**

```tsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";

import type { Invoice } from "@/lib/types";
import { addInvoicePayment, deleteInvoicePayment } from "@/actions/invoice-payments";
import { useLocale } from "@/lib/i18n/locale-provider";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface InvoicePaymentsCardProps {
  invoice: Invoice;
  onChanged: () => Promise<void>;
}

type Method = 'Transferencia' | 'Efectivo' | 'Otro';

const METHODS: { value: Method; labelKey: string }[] = [
  { value: 'Transferencia', labelKey: 'invoices.payments.methodTransfer' },
  { value: 'Efectivo', labelKey: 'invoices.payments.methodCash' },
  { value: 'Otro', labelKey: 'invoices.payments.methodOther' },
];

export default function InvoicePaymentsCard({ invoice, onChanged }: InvoicePaymentsCardProps) {
  const { t, formatCurrency } = useLocale();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState<Date | undefined>(new Date());
  const [method, setMethod] = useState<Method | undefined>(undefined);
  const [note, setNote] = useState("");

  const resetForm = () => {
    setAmount("");
    setPaidAt(new Date());
    setMethod(undefined);
    setNote("");
  };

  const handleAddPayment = async () => {
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (!paidAt || !parsedAmount || parsedAmount <= 0) {
      toast({ title: "Error", description: "Introduce un importe y una fecha válidos.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await addInvoicePayment(invoice.id, {
        amount: parsedAmount,
        paidAt,
        method,
        note: note || undefined,
      });
      if (result.success) {
        toast({ title: "Pago Registrado", description: "El pago se ha añadido a la factura." });
        setIsAddOpen(false);
        resetForm();
        await onChanged();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo registrar el pago.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    setDeletingId(paymentId);
    try {
      const result = await deleteInvoicePayment(paymentId);
      if (result.success) {
        toast({ title: "Pago Eliminado", description: "El pago se ha eliminado de la factura." });
        await onChanged();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar el pago.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">{t('invoices.payments.title')}</CardTitle>
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" /> {t('invoices.payments.addButton')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('invoices.payments.addButton')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('invoices.payments.amount')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Máximo ${formatCurrency(invoice.amountDue)}`}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('invoices.payments.date')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !paidAt && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paidAt ? format(paidAt, "PPP", { locale: es }) : <span>{t('newInvoice.pickDate')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={paidAt} onSelect={setPaidAt} initialFocus locale={es} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{t('invoices.payments.method')}</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('invoices.payments.method')} />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{t(m.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('invoices.payments.note')}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('invoices.payments.notePlaceholder')} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddPayment} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('invoices.payments.addButton')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {(invoice.amountPaid > 0 || invoice.status === 'PartiallyPaid') && (
          <div className="flex justify-between text-sm font-medium">
            <span>{t('invoices.payments.amountPaid')}: {formatCurrency(invoice.amountPaid)}</span>
            <span>{t('invoices.payments.amountDue')}: {formatCurrency(invoice.amountDue)}</span>
          </div>
        )}

        {invoice.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('invoices.payments.emptyState')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('invoices.payments.date')}</TableHead>
                <TableHead>{t('invoices.payments.method')}</TableHead>
                <TableHead>{t('invoices.payments.note')}</TableHead>
                <TableHead className="text-right">{t('invoices.payments.amount')}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{format(new Date(payment.paidAt), "PPP", { locale: es })}</TableCell>
                  <TableCell>
                    {payment.method ? t(METHODS.find((m) => m.value === payment.method)?.labelKey ?? '') : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{payment.note || '—'}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={deletingId === payment.id}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('invoices.payments.deleteConfirmTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>{t('invoices.payments.deleteConfirmDescription')}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletePayment(payment.id)}>Continuar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Extraer `fetchInvoiceData` a `useCallback` en `src/app/dashboard/invoices/[id]/page.tsx` (línea 5, 47-75)**

Cambiar el import de React (línea 5):

```tsx
import { useCallback, useEffect, useState } from 'react';
```

Y sustituir el bloque `useEffect` (línea 47-75) por:

```tsx
    const fetchInvoiceData = useCallback(async () => {
        if (!user || !invoiceId) return;
        setIsLoading(true);
        try {
            const [invoiceData, companyData] = await Promise.all([
                getInvoiceById(invoiceId),
                getCompanyProfile()
            ]);

            if (invoiceData && invoiceData.userId === user.id) {
                setInvoice(invoiceData);
            } else {
                toast({ title: "Error", description: "Factura no encontrada o sin acceso.", variant: "destructive" });
                setInvoice(null);
            }
            setCompanyProfile(companyData);
        } catch (error) {
            console.error("Error fetching invoice details:", error);
            toast({ title: "Error", description: "No se pudieron cargar los detalles de la factura.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user, invoiceId]);

    useEffect(() => {
        if (user && invoiceId) {
            fetchInvoiceData();
        } else if (!user) {
            setIsLoading(false);
        }
    }, [user, invoiceId, fetchInvoiceData]);
```

- [ ] **Step 3: Montar la tarjeta en la página, tras la `Card` existente (línea 359, antes del `</div>` de línea 360)**

Añadir el import junto a los demás (cerca de la línea 20):

```tsx
import InvoicePaymentsCard from '@/components/invoice-payments-card';
```

Y en el JSX, justo después de `</Card>` (línea 359):

```tsx
            </Card>

            <InvoicePaymentsCard invoice={invoice} onChanged={fetchInvoiceData} />
        </div>
    );
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 5: Verificación manual (requiere migración aplicada — Tarea 1, Step 6)**

1. `npm run dev`, entra en el detalle de una factura de prueba de 360,00€ en estado `Pending`.
2. Pulsa "Añadir pago", introduce 180,00€, una fecha, método "Transferencia" y guarda. Comprueba: aparece en la tabla, el badge de la factura cambia a "Parcialmente Pagada", y se ve "Pagado: 180,00€ · Pendiente: 180,00€".
3. Intenta añadir otro pago de 200€ (supera el pendiente de 180€): debe rechazarse con el toast de error y no debe aparecer en la tabla.
4. Añade un segundo pago de exactamente 180,00€: el badge pasa a "Pagada" y la fila de "Pagado/Pendiente" desaparece (porque ya no hay pendiente).
5. Borra el último pago añadido (botón de papelera + confirmación): el badge vuelve a "Parcialmente Pagada".
6. Borra el pago restante: el badge vuelve a "Pendiente".
7. Recarga la página (F5) en cada paso relevante y confirma que el estado persiste (no es solo un cambio de estado local).
8. En una factura distinta, pulsa "Marcar como pagada" (botón que ya existía) **sin** añadir ningún pago en la tarjeta nueva: confirma que la tarjeta de Pagos no muestra la fila "Pagado/Pendiente" con un pendiente fantasma (no debe decir "Pendiente: 360,00€"), y que la tabla de pagos se queda vacía con el mensaje de "Todavía no se ha registrado ningún pago" — el estado `Paid` no depende de que haya pagos en la tabla.

- [ ] **Step 6: Commit**

```bash
git add src/components/invoice-payments-card.tsx src/app/dashboard/invoices/\[id\]/page.tsx
git commit -m "feat(invoices): añade la tarjeta de pagos al detalle de factura"
```

---

## Task 7: Ajustar "Cobrado"/"Pendiente" en el listado de facturas

**Files:**
- Modify: `src/app/dashboard/invoices/invoice-list.tsx:101-106`

**Interfaces:**
- Consumes: `invoice.amountPaid`, `invoice.amountDue` (Tarea 4).

- [ ] **Step 1: Reemplazar el cálculo de `stats` (línea 101-106)**

```tsx
    const stats = useMemo(() => {
        const total = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const cobrado = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
        const pendiente = invoices
            .filter(inv => inv.status === 'Pending' || inv.status === 'Overdue' || inv.status === 'PartiallyPaid')
            .reduce((sum, inv) => sum + (inv.amountDue ?? inv.total ?? 0), 0);
        return { total, cobrado, pendiente };
    }, [invoices]);
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

1. `npm run dev`, entra en `/dashboard/invoices`.
2. Con la factura de prueba de la Tarea 6 en `PartiallyPaid` (180€ pagados de 360€), comprueba que la tarjeta "Cobrado" incluye esos 180€ (no solo las facturas 100% `Paid`), y que "Pendiente" refleja los 180€ que faltan de esa factura (no los 360€ completos).

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/invoices/invoice-list.tsx
git commit -m "fix(invoices): el listado suma los cobros reales, incluidos los parciales"
```

---

## Task 8: Página pública — saldo pendiente y ocultar pasarelas en pago parcial

**Files:**
- Modify: `src/app/invoice/[id]/page.tsx:88-89` (estado), `src/app/invoice/[id]/page.tsx:220-278` (bloque de totales y botones de pago)

**Interfaces:**
- Consumes: `invoice.amountPaid`, `invoice.amountDue`, `invoice.status === 'PartiallyPaid'` (Tarea 4); clave `invoices.payments.gatewayDisabledNotice` (Tarea 5).

- [ ] **Step 1: Ajustar las variables derivadas (línea 88-89)**

```tsx
    const { invoice, company } = data;
    const isPaid = invoice.status === "Paid" || isSuccess;
    const isPartiallyPaid = invoice.status === "PartiallyPaid" && !isPaid;
```

- [ ] **Step 2: Añadir la fila de saldo y ocultar los botones de pasarela cuando hay pago parcial (línea 220-278)**

Reemplazar el bloque que va desde el total (línea 231) hasta el cierre del bloque de botones (línea 278):

```tsx
                        <div className="flex justify-between items-center py-6 mt-2 border-t border-border/50">
                            <span className="text-lg font-black tracking-tight text-primary">TOTAL FACTURA</span>
                            <span className="text-3xl font-headline font-black">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: company.currency || 'EUR' }).format(invoice.total)}
                            </span>
                        </div>

                        {isPartiallyPaid && (
                            <div className="flex justify-between items-center py-2 text-sm font-medium">
                                <span>Pagado: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: company.currency || 'EUR' }).format(invoice.amountPaid)}</span>
                                <span>Pendiente: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: company.currency || 'EUR' }).format(invoice.amountDue)}</span>
                            </div>
                        )}

                        {!isPaid && isPartiallyPaid && (
                            <p className="text-xs text-muted-foreground pt-4">
                                {t('invoices.payments.gatewayDisabledNotice')}
                            </p>
                        )}

                        {!isPaid && !isPartiallyPaid && (
                            <div className="space-y-4 pt-6">
                                {company.stripeEnabled && (
                                    <Button 
                                        onClick={handleStripePay} 
                                        disabled={paying} 
                                        className="w-full h-14 text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all bg-[#635BFF] hover:bg-[#5a52e5] text-white gap-3 border-none"
                                    >
                                        {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                                        Pagar con Tarjeta
                                    </Button>
                                )}
                                
                                {company.paypalEnabled && (
                                    <PayPalScriptProvider options={{ clientId: company.paypalClientId || "", currency: company.currency || "EUR" }}>
                                        <PayPalButtons 
                                            style={{ layout: "vertical", shape: "pill", label: "pay" }}
                                            createOrder={(data, actions) => {
                                                return actions.order.create({
                                                    intent: "CAPTURE" as any,
                                                    purchase_units: [{
                                                        amount: {
                                                            currency_code: company.currency || "EUR",
                                                            value: invoice.total.toString(),
                                                        },
                                                        invoice_id: invoice.invoiceNumber,
                                                    }],
                                                });
                                            }}
                                            onApprove={async (data, actions) => {
                                                if (actions.order) {
                                                    const order = await actions.order.capture();
                                                    if (order.id) await capturePayPalOrder(order.id, id);
                                                    window.location.reload();
                                                }
                                            }}
                                        />
                                    </PayPalScriptProvider>
                                )}
                            </div>
                        )}
```

Este componente no usaba `useLocale` hasta ahora — añadir el import y el hook junto al resto de hooks del componente (cerca de la línea 18):

```tsx
import { useLocale } from "@/lib/i18n/locale-provider";
```

```tsx
    const { t } = useLocale();
```

- [ ] **Step 3: Reflejar `PartiallyPaid` en el badge de estado (línea 139-144)**

```tsx
                         <Badge 
                            variant={isPaid ? "default" : (invoice.status === "Overdue" ? "destructive" : "secondary")}
                            className={`px-4 py-1.5 text-sm font-bold uppercase tracking-widest ${isPaid ? 'bg-emerald-500 hover:bg-emerald-600' : ''} ${isPartiallyPaid ? 'bg-sky-500! text-white hover:bg-sky-600!' : ''}`}
                        >
                            {isPaid ? "PAGADA" : (isPartiallyPaid ? "PAGO PARCIAL" : (invoice.status === "Overdue" ? "VENCIDA" : "PENDIENTE"))}
                        </Badge>
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 5: Verificación manual**

1. Copia el enlace público de la factura de prueba (botón "Enlace" en el detalle de factura) mientras está en `Pending` sin pagos: confirma que los botones de Stripe/PayPal (si están configurados en el perfil de empresa) se ven con normalidad.
2. Registra un pago parcial desde el dashboard (Tarea 6) y recarga el enlace público: confirma que el badge pasa a "PAGO PARCIAL", aparece la fila "Pagado/Pendiente", y los botones de Stripe/PayPal **ya no se muestran** — en su lugar sale el aviso de transferencia directa.
3. Completa el pago (segundo abono que cubra el resto) desde el dashboard, recarga el enlace público: badge "PAGADA", sin fila de saldo ni aviso.

- [ ] **Step 6: Commit**

```bash
git add src/app/invoice/\[id\]/page.tsx
git commit -m "feat(invoice-public): muestra el saldo pendiente y oculta las pasarelas en pago parcial"
```

---

## Task 9: Fiscalidad, dashboard e informes

**Files:**
- Modify: `src/lib/fiscal.ts:33` (`TAXABLE_STATUSES`), `src/lib/fiscal.ts:126-157` (`getPaymentScore`)
- Modify: `src/app/dashboard/page.tsx:76-92` (`stats`)
- Modify: `src/lib/report-pdf-generator.ts:20-44` (`calculateReportData`)
- Modify: `src/app/dashboard/reports/page.tsx:203` (`statusMap` del CSV)

**Interfaces:**
- Consumes: `invoice.amountPaid`, `invoice.amountDue`, `InvoiceStatus` incluyendo `'PartiallyPaid'` (Tareas 2 y 4).

- [ ] **Step 1: `TAXABLE_STATUSES` en `src/lib/fiscal.ts` (línea 33)**

```ts
const TAXABLE_STATUSES = new Set(["Paid", "PartiallyPaid", "Pending", "Overdue"]);
```

- [ ] **Step 2: `getPaymentScore` en `src/lib/fiscal.ts` (línea 126-157) — añadir el contador `partiallyPaid`**

```ts
export function getPaymentScore(
  clientInvoices: { status: string }[],
): PaymentScore {
  const issued = clientInvoices.filter((i) => i.status !== 'Draft');
  if (issued.length === 0) {
    return { label: 'Sin historial', variant: 'muted', detail: 'Todavía no tiene facturas emitidas.' };
  }

  const overdue = issued.filter((i) => i.status === 'Overdue').length;
  const pending = issued.filter((i) => i.status === 'Pending').length;
  const partiallyPaid = issued.filter((i) => i.status === 'PartiallyPaid').length;
  const paid = issued.filter((i) => i.status === 'Paid').length;

  if (overdue > 0) {
    return {
      label: 'Riesgo',
      variant: 'warning',
      detail: `${overdue} de ${issued.length} facturas vencidas sin cobrar.`,
    };
  }
  if (pending > 0 || partiallyPaid > 0) {
    return {
      label: 'Al corriente',
      variant: 'primary',
      detail: partiallyPaid > 0
        ? `${paid} pagadas, ${partiallyPaid} con abono parcial y ${pending} pendientes, ninguna vencida.`
        : `${paid} pagadas y ${pending} pendientes, ninguna vencida.`,
    };
  }
  return {
    label: 'Excelente',
    variant: 'success',
    detail: `Las ${paid} facturas emitidas están cobradas.`,
  };
}
```

- [ ] **Step 3: `stats` del dashboard, `src/app/dashboard/page.tsx` (línea 76-92)**

```tsx
    const stats = useMemo(() => {
        const pending = invoices.filter(i => i.status === 'Pending' || i.status === 'PartiallyPaid');
        const overdue = invoices.filter(i => i.status === 'Overdue');

        const totalIncome = invoices.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const cashFlow = totalIncome - totalExpenses;

        return {
            income: totalIncome,
            expenses: totalExpenses,
            cashFlow,
            pendingCount: pending.length,
            overdueCount: overdue.length,
        };
    }, [invoices, expenses]);
```

(`chartData`, línea 94-110, se deja sin tocar: reparte el ingreso mensual por `issueDate` de facturas 100% `Paid`. Repartir además los abonos parciales por su propia fecha de pago dentro del gráfico queda fuera de alcance de esta feature — ver spec, sección "Fuera de alcance".)

- [ ] **Step 4: Tres ediciones puntuales en `calculateReportData`, `src/lib/report-pdf-generator.ts` (línea 20-44)**

Edición 1 — línea 22, "Total Cobrado" debe sumar lo realmente pagado, incluidos los abonos parciales:

```ts
    const totalPaid = data.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
```

(sustituye a `const totalPaid = data.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.total, 0);`)

Edición 2 — línea 29, `pendingCount` agrupa `PartiallyPaid` junto a `Pending`:

```ts
    const pendingCount = data.filter(inv => inv.status === 'Pending' || inv.status === 'PartiallyPaid').length;
```

(sustituye a `const pendingCount = data.filter(inv => inv.status === 'Pending').length;`)

Edición 3 — dentro del `reduce` de `monthlyData` (línea 38-40), reparte el mes de una factura `PartiallyPaid` entre cobrado y pendiente:

```ts
        if (inv.status === 'Paid') acc[month].paid += inv.total;
        if (inv.status === 'PartiallyPaid') {
            acc[month].paid += inv.amountPaid;
            acc[month].pending += inv.amountDue;
        }
        if (inv.status === 'Pending') acc[month].pending += inv.total;
        if (inv.status === 'Overdue') acc[month].overdue += inv.total;
```

(sustituye a las tres líneas `if (inv.status === 'Paid') ...` / `if (inv.status === 'Pending') ...` / `if (inv.status === 'Overdue') ...` ya existentes, insertando el bloque `PartiallyPaid` entre la primera y la segunda.)

El resto de la función (`paidCount`, `overdueCount`, el cierre del `return`, etc.) no cambia.

- [ ] **Step 5: `statusMap` del CSV en `src/app/dashboard/reports/page.tsx` (línea 203)**

```tsx
        const statusMap: Record<string, string> = { Paid: 'Pagada', PartiallyPaid: 'Parcialmente Pagada', Pending: 'Pendiente', Overdue: 'Vencida', Draft: 'Borrador' };
```

- [ ] **Step 6: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 7: Verificación manual**

1. `npm run dev`, entra en `/dashboard` con la factura de prueba en `PartiallyPaid` (180€ de 360€): comprueba que la cifra de ingresos/cashflow del dashboard incluye esos 180€.
2. Entra en `/dashboard/reports`, genera el informe del periodo que incluya esa factura: "Total Cobrado" debe incluir los 180€, y la fila del mes correspondiente debe repartir 180€ como cobrado y 180€ como pendiente (no 360€ enteros en una sola columna).
3. Exporta el CSV desde `/dashboard/reports`: la columna "Estado" de esa factura debe decir "Parcialmente Pagada", no "PartiallyPaid" en crudo.
4. Entra en la ficha de un cliente con esa factura parcial y ninguna vencida: el indicador de comportamiento de pago debe decir "Al corriente" (no "Excelente" mientras quede saldo, ni "Riesgo" si no hay ninguna vencida).

- [ ] **Step 8: Commit**

```bash
git add src/lib/fiscal.ts src/app/dashboard/page.tsx src/lib/report-pdf-generator.ts src/app/dashboard/reports/page.tsx
git commit -m "fix(fiscal): incorpora PartiallyPaid a devengo, contadores e informes"
```

---

## Task 10: Formulario de editar factura — mostrar `PartiallyPaid` sin romper la validación

**Files:**
- Modify: `src/actions/invoices.ts:36` (`InvoiceSchema.status`)
- Modify: `src/app/dashboard/invoices/new/page.tsx:43` (`invoiceFormSchema.status`), `src/app/dashboard/invoices/new/page.tsx:318-339` (`<Select>` de estado)

**Interfaces:**
- Consumes: `InvoiceStatus` (Tarea 2).

- [ ] **Step 1: Ampliar el enum del servidor, `src/actions/invoices.ts` (línea 36)**

```ts
  status: z.enum(['Paid', 'PartiallyPaid', 'Pending', 'Overdue', 'Draft'] as const),
```

Esto evita que `updateInvoice` rechace la edición de una factura ya `PartiallyPaid` cuando el usuario cambia otro campo (p. ej. una nota) sin tocar el estado.

- [ ] **Step 2: Ampliar el enum del formulario, `src/app/dashboard/invoices/new/page.tsx` (línea 43)**

```tsx
    status: z.enum(["Pending", "Paid", "Overdue", "PartiallyPaid"]),
```

- [ ] **Step 3: Mostrar `PartiallyPaid` como opción deshabilitada en el `<Select>` de estado (línea 318-339)**

```tsx
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('invoices.status')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('newInvoice.selectStatus')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Pending">{t('invoices.statusPending')}</SelectItem>
                                                <SelectItem value="Paid">{t('invoices.statusPaid')}</SelectItem>
                                                <SelectItem value="Overdue">{t('invoices.statusOverdue')}</SelectItem>
                                                {field.value === "PartiallyPaid" && (
                                                    <SelectItem value="PartiallyPaid" disabled>
                                                        {t('invoices.statusPartiallyPaid')} (automático)
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
```

La opción `PartiallyPaid` solo se renderiza (y deshabilitada) cuando la factura que se edita ya está en ese estado — así nunca aparece como algo elegible al crear una factura nueva o editar una que no lo es.

- [ ] **Step 4: Verificar tipos**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 5: Verificación manual**

1. Con la factura de prueba en `PartiallyPaid`, entra en "Editar factura": el desplegable de estado debe mostrar "Parcialmente Pagada (automático)" seleccionado y sin poder elegir otra cosa a mano salvo cambiándolo explícitamente a Pendiente/Pagada/Vencida.
2. Cambia solo el campo de notas y guarda sin tocar el estado: la factura debe seguir en `PartiallyPaid` después de guardar (comprobar en el badge del detalle).
3. Entra en "Crear factura nueva": el desplegable de estado nunca debe ofrecer "Parcialmente Pagada" como opción.

- [ ] **Step 6: Commit**

```bash
git add src/actions/invoices.ts src/app/dashboard/invoices/new/page.tsx
git commit -m "fix(invoices): el formulario de edición respeta el estado PartiallyPaid sin poder elegirlo a mano"
```

---

## Verificación final de rama

- [ ] `npm run typecheck` y `npm run lint` limpios en la rama completa.
- [ ] Repasar la lista de "Review Focus" de arriba una vez más, de principio a fin, sobre la app corriendo con `npm run dev`.
- [ ] Confirmar que `drizzle/002_invoice_payments.sql` está aplicado en cualquier base de datos contra la que se vaya a hacer una demo o desplegar.
