"use server";

import { db } from "@/db/config";
import { invoices, invoiceItems, clients, invoiceTaxes, companyProfiles, notifications } from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { createNotification } from "./notifications";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { type ActionResult, toActionError } from "@/lib/action-result";

// --- Types & Schemas ---

const InvoiceItemSchema = z.object({
  description: z.string().min(1, "La descripción es requerida"),
  quantity: z.number().min(1),
  price: z.number().min(0),
});

const InvoiceTaxSchema = z.object({
  name: z.string().min(1),
  percentage: z.number().min(-100).max(100),
});

/**
 * Los totales NO se aceptan del cliente: se derivan de las líneas y los
 * impuestos. Antes llegaban como número desde el formulario y se guardaban tal
 * cual, así que una factura podía quedar con un importe que no cuadraba con su
 * propio desglose.
 */
const InvoiceSchema = z.object({
  clientId: z.string().uuid(),
  invoiceNumber: z.string().min(1),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  status: z.enum(['Paid', 'Pending', 'Overdue', 'Draft'] as const),
  notes: z.string().optional(),
  items: z.array(InvoiceItemSchema).min(1, "Debe haber al menos un ítem"),
  taxes: z.array(InvoiceTaxSchema).optional(),
});

type ValidatedInvoice = z.infer<typeof InvoiceSchema>;

/** Los estados se guardan en inglés; el texto que lee el usuario no. */
const STATUS_LABELS: Record<string, string> = {
  Paid: 'Pagada',
  Pending: 'Pendiente',
  Overdue: 'Vencida',
  Draft: 'Borrador',
};

/** Importes en céntimos, calculados en el servidor a partir de las líneas. */
function computeTotals(v: ValidatedInvoice) {
  const items = v.items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    price: Math.round(item.price * 100),
    total: Math.round(item.price * item.quantity * 100),
  }));

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const taxTotal = (v.taxes ?? []).reduce(
    (sum, t) => sum + Math.round(subtotal * (t.percentage / 100)),
    0,
  );

  return { items, subtotal, total: subtotal + taxTotal };
}

function mapInvoice(row: any) {
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
    notes: row.notes || undefined,
    taxes: row.taxes.map((t: any) => ({ id: t.id, name: t.name, percentage: Number(t.percentage) })),
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

/** Comprueba que el cliente facturado pertenece a quien emite la factura. */
async function assertOwnsClient(clientId: string, userId: string) {
  const owned = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .limit(1);
  if (owned.length === 0) throw new z.ZodError([{
    code: "custom", path: ["clientId"], message: "El cliente seleccionado no existe.",
  }]);
}

// --- Actions ---

export async function getInvoices() {
  const userId = await requireUserId();
  const results = await db.query.invoices.findMany({
    where: eq(invoices.userId, userId),
    with: { client: true, items: true, taxes: true },
    orderBy: [desc(invoices.createdAt)],
  });
  return results.map(mapInvoice);
}

export async function getInvoiceById(invoiceId: string) {
  if (!invoiceId) return null;
  const userId = await requireUserId();
  const row = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)),
    with: { client: true, items: true, taxes: true },
  });
  return row ? mapInvoice(row) : null;
}

export async function addInvoice(invoiceData: unknown): Promise<ActionResult<{ id: string } | null>> {
  try {
    const userId = await requireUserId();
    const v = InvoiceSchema.parse(invoiceData);
    await assertOwnsClient(v.clientId, userId);

    const { items, subtotal, total } = computeTotals(v);

    // Una factura y sus líneas son una unidad: si falla la inserción de los
    // ítems, la cabecera no debe quedarse suelta y sin desglose.
    const created = await db.transaction(async (tx) => {
      const inserted = await tx.insert(invoices).values({
        userId,
        clientId: v.clientId,
        invoiceNumber: v.invoiceNumber,
        issueDate: v.issueDate,
        dueDate: v.dueDate,
        status: v.status,
        subtotal,
        total,
        notes: v.notes,
      }).returning();

      const invoice = inserted[0];

      await tx.insert(invoiceItems).values(items.map((i) => ({ ...i, invoiceId: invoice.id })));

      if (v.taxes?.length) {
        await tx.insert(invoiceTaxes).values(
          v.taxes.map((t) => ({ invoiceId: invoice.id, name: t.name, percentage: String(t.percentage) })),
        );
      }

      return invoice;
    });

    await createNotification({
      userId,
      title: "Nueva Factura",
      body: `Se ha creado la factura ${created.invoiceNumber}.`,
      href: `/dashboard/invoices/${created.id}`,
    });

    revalidatePath("/dashboard/invoices");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return toActionError(error, "Error interno al crear la factura.", "addInvoice");
  }
}

export async function updateInvoice(invoiceId: string, invoiceData: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const v = InvoiceSchema.parse(invoiceData);
    await assertOwnsClient(v.clientId, userId);

    const { items, subtotal, total } = computeTotals(v);

    const updated = await db.transaction(async (tx) => {
      const rows = await tx.update(invoices).set({
        clientId: v.clientId,
        status: v.status,
        invoiceNumber: v.invoiceNumber,
        issueDate: v.issueDate,
        dueDate: v.dueDate,
        subtotal,
        total,
        notes: v.notes,
      })
        .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
        .returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber });

      if (rows.length === 0) return null;

      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
      await tx.insert(invoiceItems).values(items.map((i) => ({ ...i, invoiceId })));

      await tx.delete(invoiceTaxes).where(eq(invoiceTaxes.invoiceId, invoiceId));
      if (v.taxes?.length) {
        await tx.insert(invoiceTaxes).values(
          v.taxes.map((t) => ({ invoiceId, name: t.name, percentage: String(t.percentage) })),
        );
      }

      return rows[0];
    });

    if (!updated) return { success: false, error: "Factura no encontrada." };

    await createNotification({
      userId,
      title: "Factura Actualizada",
      body: `La factura ${updated.invoiceNumber} ha sido actualizada.`,
      href: `/dashboard/invoices/${invoiceId}`,
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    return { success: true, data: null };
  } catch (error) {
    return toActionError(error, "Error interno al actualizar la factura.", "updateInvoice");
  }
}

export async function deleteInvoice(invoiceId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    const deleted = await db.transaction(async (tx) => {
      const rows = await tx
        .delete(invoices)
        .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
        .returning({ id: invoices.id });

      if (rows.length === 0) return null;

      // Sus notificaciones apuntan a una factura que ya no existe: si se dejan,
      // la campana ofrece enlaces que no llevan a ninguna parte.
      await tx.delete(notifications).where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.href, `/dashboard/invoices/${invoiceId}`),
        ),
      );

      return rows[0];
    });

    if (!deleted) return { success: false, error: "Factura no encontrada." };

    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard");
    return { success: true, data: null };
  } catch (error) {
    return toActionError(error, "No se pudo eliminar la factura.", "deleteInvoice");
  }
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft',
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const updated = await db
      .update(invoices)
      .set({ status })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
      .returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber });

    if (updated.length === 0) return { success: false, error: "Factura no encontrada." };

    await createNotification({
      userId,
      title: "Estado de Factura Actualizado",
      body: `La factura ${updated[0].invoiceNumber} ahora está ${STATUS_LABELS[status] ?? status}.`,
      href: `/dashboard/invoices/${invoiceId}`,
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    return { success: true, data: null };
  } catch (error) {
    return toActionError(error, "No se pudo actualizar el estado de la factura.", "updateInvoiceStatus");
  }
}

export async function bulkUpdateInvoiceStatus(
  invoiceIds: string[],
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft',
): Promise<ActionResult> {
  if (!invoiceIds?.length) return { success: true, data: null };
  try {
    const userId = await requireUserId();
    const updated = await db
      .update(invoices)
      .set({ status })
      .where(and(inArray(invoices.id, invoiceIds), eq(invoices.userId, userId)))
      .returning({ id: invoices.id });

    if (updated.length > 0) {
      await createNotification({
        userId,
        title: "Facturas Actualizadas",
        body: `${updated.length} facturas han pasado a ${STATUS_LABELS[status] ?? status}.`,
        href: `/dashboard/invoices`,
      });
    }

    revalidatePath("/dashboard/invoices");
    return { success: true, data: null };
  } catch (error) {
    return toActionError(error, "No se pudieron actualizar las facturas.", "bulkUpdateInvoiceStatus");
  }
}

/**
 * Vista pública de una factura, para el enlace de pago que recibe el cliente.
 *
 * No lleva sesión a propósito: la protege lo imprevisible del UUID. Devuelve
 * solo lo que hay que enseñar para pagar — nunca las claves secretas de la
 * pasarela, únicamente las publicables.
 */
export async function getPublicInvoiceById(invoiceId: string) {
  if (!invoiceId) return null;

  const row = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: { client: true, items: true, taxes: true },
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
