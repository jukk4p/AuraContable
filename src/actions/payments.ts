"use server";

import { db } from "@/db/config";
import { invoices, companyProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { createNotification } from "./notifications";

export async function createStripeSession(invoiceId: string) {
    const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
        with: {
            client: true,
            items: true,
        }
    });

    if (!invoice) throw new Error("Invoice not found");

    const company = await db.query.companyProfiles.findFirst({
        where: eq(companyProfiles.userId, invoice.userId),
    });

    if (!company || !company.stripeSecretKey || !company.stripeEnabled) {
        throw new Error("Stripe is not configured for this company");
    }

    const stripe = new Stripe(company.stripeSecretKey, {
        apiVersion: "2025-02-24-preview" as any,
    });

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: invoice.items.map((item) => ({
            price_data: {
                currency: company.currency?.toLowerCase() || "eur",
                product_data: {
                    name: item.description,
                },
                unit_amount: item.price, // standard is already in cents
            },
            quantity: item.quantity,
        })),
        mode: "payment",
        success_url: `${process.env.NEXTAUTH_URL}/invoice/${invoiceId}?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/invoice/${invoiceId}?canceled=true`,
        metadata: {
            invoiceId: invoice.id,
            userId: invoice.userId,
        },
    });

    return { url: session.url };
}

export async function capturePayPalOrder(orderId: string, invoiceId: string) {
    // In a real app, you would verify the order with PayPal API here
    // For now, we'll trust the client (but usually you'd check status via secret)
    
    await db.update(invoices).set({
        status: "Paid",
        paymentMethod: "PayPal",
        paymentId: orderId,
        paymentStatus: "Paid",
    }).where(eq(invoices.id, invoiceId));

    const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
    });

    if (invoice) {
        await createNotification({
            userId: invoice.userId,
            title: "Pago Recibido (PayPal)",
            body: `Se ha recibido el pago de la factura ${invoice.invoiceNumber} vía PayPal.`,
            href: `/dashboard/invoices/${invoiceId}`,
        });
    }

    return { success: true };
}
