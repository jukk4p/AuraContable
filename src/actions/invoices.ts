"use server";

import { db } from "@/db/config";
import { invoices, invoiceItems, clients, invoiceTaxes, companyProfiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createNotification } from "./notifications";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// --- Types & Schemas ---

export type ActionResult<T = any> = 
  | { success: true; data: T }
  | { success: false; error: string };

const InvoiceItemSchema = z.object({
  description: z.string().min(1, "La descripción es requerida"),
  quantity: z.number().min(1),
  price: z.number().min(0),
});

const InvoiceTaxSchema = z.object({
  name: z.string().min(1),
  percentage: z.number().min(0).max(100),
});

const InvoiceSchema = z.object({
  userId: z.string().uuid(),
  clientId: z.string().uuid(),
  invoiceNumber: z.string().min(1),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  status: z.enum(['Paid', 'Pending', 'Overdue', 'Draft'] as const),
  subtotal: z.number(),
  total: z.number(),
  notes: z.string().optional(),
  items: z.array(InvoiceItemSchema).min(1, "Debe haber al menos un ítem"),
  taxes: z.array(InvoiceTaxSchema).optional(),
});

// --- Actions ---

export async function getInvoices(userId: string): Promise<any[]> {
  if (!userId) return [];
  
  const results = await db.query.invoices.findMany({
    where: eq(invoices.userId, userId),
    with: {
      client: true,
      items: true,
      taxes: true,
    },
    orderBy: [desc(invoices.createdAt)],
  });
  
  return results.map(row => ({
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
    taxes: row.taxes.map(t => ({
        id: t.id,
        name: t.name,
        percentage: t.percentage,
    })),
    createdAt: row.createdAt,
    client: {
        name: row.client.name,
        email: row.client.email,
        address: row.client.address || undefined,
        taxId: row.client.taxId || undefined,
    },
    items: row.items.map(i => ({
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        price: i.price / 100,
    })),
  }));
}

export async function getInvoiceById(invoiceId: string): Promise<any | null> {
    if (!invoiceId) return null;
    const row = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
        with: {
            client: true,
            items: true,
            taxes: true,
        }
    });

    if (!row) return null;

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
        taxes: row.taxes.map(t => ({
            id: t.id,
            name: t.name,
            percentage: t.percentage,
        })),
        createdAt: row.createdAt,
        client: {
            name: row.client.name,
            email: row.client.email,
            address: row.client.address || undefined,
            taxId: row.client.taxId || undefined,
        },
        items: row.items.map(i => ({
            id: i.id,
            description: i.description,
            quantity: i.quantity,
            price: i.price / 100,
        })),
    };
}

export async function addInvoice(invoiceData: any): Promise<ActionResult> {
  try {
    const validated = InvoiceSchema.parse(invoiceData);

    const insertInvoice = await db.insert(invoices).values({
      userId: validated.userId,
      clientId: validated.clientId,
      invoiceNumber: validated.invoiceNumber,
      issueDate: validated.issueDate,
      dueDate: validated.dueDate,
      status: validated.status as any,
      subtotal: Math.round(validated.subtotal * 100),
      total: Math.round(validated.total * 100),
      notes: validated.notes,
    }).returning();
    
    const newInvoice = insertInvoice[0];

    if (validated.items && validated.items.length > 0) {
        const itemsToInsert = validated.items.map((item: any) => ({
            invoiceId: newInvoice.id,
            description: item.description,
            quantity: item.quantity,
            price: Math.round(item.price * 100),
            total: Math.round((item.price * item.quantity) * 100),
        }));
        await db.insert(invoiceItems).values(itemsToInsert);
    }

    if (validated.taxes && validated.taxes.length > 0) {
        const taxesToInsert = validated.taxes.map((tax: any) => ({
            invoiceId: newInvoice.id,
            name: tax.name,
            percentage: tax.percentage,
        }));
        await db.insert(invoiceTaxes).values(taxesToInsert);
    }

    await createNotification({
        userId: validated.userId,
        title: "Nueva Factura",
        body: `Se ha creado la factura ${newInvoice.invoiceNumber}.`,
        href: `/dashboard/invoices/${newInvoice.id}`,
    });

    revalidatePath("/dashboard/invoices");
    return { success: true, data: newInvoice };
  } catch (error) {
    console.error("Error adding invoice:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Error interno al crear la factura." };
  }
}

export async function updateInvoice(invoiceId: string, invoiceData: any): Promise<ActionResult> {
  try {
    const validated = InvoiceSchema.parse(invoiceData);

    await db.update(invoices).set({
      clientId: validated.clientId,
      status: validated.status as any,
      invoiceNumber: validated.invoiceNumber,
      issueDate: validated.issueDate,
      dueDate: validated.dueDate,
      subtotal: Math.round(validated.subtotal * 100),
      total: Math.round(validated.total * 100),
      notes: validated.notes,
    }).where(eq(invoices.id, invoiceId));
    
    if (validated.items) {
        await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
        const itemsToInsert = validated.items.map((item: any) => ({
            invoiceId: invoiceId,
            description: item.description,
            quantity: item.quantity,
            price: Math.round(item.price * 100),
            total: Math.round((item.price * item.quantity) * 100),
        }));
        await db.insert(invoiceItems).values(itemsToInsert);
    }

    if (validated.taxes) {
        await db.delete(invoiceTaxes).where(eq(invoiceTaxes.invoiceId, invoiceId));
        const taxesToInsert = validated.taxes.map((tax: any) => ({
            invoiceId: invoiceId,
            name: tax.name,
            percentage: tax.percentage,
        }));
        await db.insert(invoiceTaxes).values(taxesToInsert);
    }

    const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
    });

    if (invoice) {
        await createNotification({
            userId: invoice.userId,
            title: "Factura Actualizada",
            body: `La factura ${invoice.invoiceNumber} ha sido actualizada.`,
            href: `/dashboard/invoices/${invoiceId}`,
        });
    }

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    return { success: true, data: invoice };
  } catch (error) {
    console.error("Error updating invoice:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Error interno al actualizar la factura." };
  }
}

export async function deleteInvoice(invoiceId: string): Promise<ActionResult> {
  try {
    await db.delete(invoices).where(eq(invoices.id, invoiceId));
    revalidatePath("/dashboard/invoices");
    return { success: true, data: null };
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return { success: false, error: "No se pudo eliminar la factura." };
  }
}

export async function getPublicInvoiceById(invoiceId: string): Promise<any | null> {
    if (!invoiceId) return null;
    
    const row = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
        with: {
            client: true,
            items: true,
            taxes: true,
        }
    });

    if (!row) return null;

    const companyResults = await db.query.companyProfiles.findFirst({
        where: eq(companyProfiles.userId, row.userId),
    });

    if (!companyResults) return null;

    return {
        invoice: {
            id: row.id,
            invoiceNumber: row.invoiceNumber,
            issueDate: row.issueDate,
            dueDate: row.dueDate,
            status: row.status,
            subtotal: row.subtotal / 100,
            total: row.total / 100,
            notes: row.notes || undefined,
            taxes: row.taxes.map(t => ({
                id: t.id,
                name: t.name,
                percentage: t.percentage,
            })),
            client: {
                name: row.client.name,
                email: row.client.email,
                address: row.client.address || undefined,
                taxId: row.client.taxId || undefined,
            },
            items: row.items.map(i => ({
                id: i.id,
                description: i.description,
                quantity: i.quantity,
                price: i.price / 100,
            })),
        },
        company: {
            name: companyResults.companyName,
            email: companyResults.email,
            address: companyResults.address,
            taxId: companyResults.taxId,
            logoUrl: companyResults.logoUrl,
            currency: companyResults.currency,
            iban: companyResults.iban,
            stripeEnabled: companyResults.stripeEnabled,
            stripePublishableKey: companyResults.stripePublishableKey,
            paypalEnabled: companyResults.paypalEnabled,
            paypalClientId: companyResults.paypalClientId,
            paypalSandbox: companyResults.paypalSandbox,
        }
    };
}
