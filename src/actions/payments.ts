"use server";

import { db } from "@/db/config";
import { invoices, companyProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { createNotification } from "./notifications";

const STRIPE_API_VERSION = "2025-02-24-preview" as any;

/** Base de la API de PayPal según el entorno configurado. */
function paypalApiBase(sandbox: boolean | null) {
    return sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

export async function createStripeSession(invoiceId: string) {
    const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
        with: { client: true, items: true },
    });

    if (!invoice) throw new Error("Invoice not found");

    const company = await db.query.companyProfiles.findFirst({
        where: eq(companyProfiles.userId, invoice.userId),
    });

    if (!company || !company.stripeSecretKey || !company.stripeEnabled) {
        throw new Error("Stripe is not configured for this company");
    }

    const stripe = new Stripe(company.stripeSecretKey, { apiVersion: STRIPE_API_VERSION });

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: invoice.items.map((item) => ({
            price_data: {
                currency: company.currency?.toLowerCase() || "eur",
                product_data: { name: item.description },
                unit_amount: item.price, // ya está en céntimos
            },
            quantity: item.quantity,
        })),
        mode: "payment",
        success_url: `${process.env.NEXTAUTH_URL}/invoice/${invoiceId}?success=true`,
        cancel_url: `${process.env.NEXTAUTH_URL}/invoice/${invoiceId}?canceled=true`,
        metadata: { invoiceId: invoice.id, userId: invoice.userId },
    });

    return { url: session.url };
}

/**
 * Confirma un pago de PayPal contra la API de PayPal antes de tocar la factura.
 *
 * Esta acción es pública (la llama la página de pago del cliente), así que su
 * argumento es entrada no fiable. Antes se creía al navegador y se marcaba la
 * factura como pagada sin comprobar nada: bastaba con invocarla con un id
 * cualquiera para saldar una factura sin pagarla.
 *
 * Se verifica que la orden existe, que está capturada y que el importe y la
 * moneda coinciden con los de la factura.
 */
export async function capturePayPalOrder(orderId: string, invoiceId: string) {
    if (!orderId || !invoiceId) {
        return { success: false, error: "Solicitud incompleta." };
    }

    const invoice = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
    if (!invoice) return { success: false, error: "Factura no encontrada." };

    if (invoice.status === "Paid") {
        return { success: true, alreadyPaid: true };
    }

    const company = await db.query.companyProfiles.findFirst({
        where: eq(companyProfiles.userId, invoice.userId),
    });

    if (!company?.paypalEnabled || !company.paypalClientId || !company.paypalSecret) {
        return { success: false, error: "PayPal no está configurado." };
    }

    const apiBase = paypalApiBase(company.paypalSandbox);
    const basicAuth = Buffer.from(`${company.paypalClientId}:${company.paypalSecret}`).toString("base64");

    try {
        const tokenRes = await fetch(`${apiBase}/v1/oauth2/token`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${basicAuth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
            cache: "no-store",
        });

        if (!tokenRes.ok) {
            console.error("[capturePayPalOrder] token", tokenRes.status, await tokenRes.text());
            return { success: false, error: "No se pudo verificar el pago con PayPal." };
        }

        const { access_token: accessToken } = await tokenRes.json();

        const orderRes = await fetch(`${apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
        });

        if (!orderRes.ok) {
            console.error("[capturePayPalOrder] order", orderRes.status, await orderRes.text());
            return { success: false, error: "No se ha encontrado la orden en PayPal." };
        }

        const order = await orderRes.json();

        if (order.status !== "COMPLETED") {
            return { success: false, error: `El pago no está completado (estado: ${order.status}).` };
        }

        // El importe tiene que cuadrar con la factura: una orden real de 1 € no
        // puede saldar una factura de 1.000 €.
        const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
        const paidAmount = Math.round(parseFloat(capture?.amount?.value ?? "0") * 100);
        const paidCurrency = (capture?.amount?.currency_code ?? "").toUpperCase();
        const expectedCurrency = (company.currency ?? "EUR").toUpperCase();

        if (paidAmount !== invoice.total || paidCurrency !== expectedCurrency) {
            console.error("[capturePayPalOrder] importe no coincide", {
                invoiceId, paidAmount, expected: invoice.total, paidCurrency, expectedCurrency,
            });
            return { success: false, error: "El importe pagado no coincide con la factura." };
        }

        await db.update(invoices).set({
            status: "Paid",
            paymentMethod: "PayPal",
            paymentId: capture?.id ?? orderId,
            paymentStatus: "Paid",
        }).where(eq(invoices.id, invoiceId));

        await createNotification({
            userId: invoice.userId,
            title: "Pago Recibido (PayPal)",
            body: `Se ha recibido el pago de la factura ${invoice.invoiceNumber} vía PayPal.`,
            href: `/dashboard/invoices/${invoiceId}`,
        });

        return { success: true };
    } catch (error) {
        console.error("[capturePayPalOrder]", error);
        return { success: false, error: "No se pudo verificar el pago con PayPal." };
    }
}
