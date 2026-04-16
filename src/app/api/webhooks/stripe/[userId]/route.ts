import { db } from "@/db/config";
import { invoices, companyProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createNotification } from "@/actions/notifications";

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") as string;
    const { userId } = await params;

    const company = await db.query.companyProfiles.findFirst({
        where: eq(companyProfiles.userId, userId),
    });

    if (!company || !company.stripeSecretKey || !company.stripeWebhookSecret) {
        return new NextResponse("Webhook secret or Stripe key not found", { status: 400 });
    }

    const stripe = new Stripe(company.stripeSecretKey, {
        apiVersion: "2025-02-24-preview" as any,
    });

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, company.stripeWebhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.invoiceId;

        if (invoiceId) {
            await db.update(invoices).set({
                status: "Paid",
                paymentMethod: "Stripe",
                paymentId: session.id,
                paymentStatus: "Paid",
            }).where(eq(invoices.id, invoiceId));

            const invoice = await db.query.invoices.findFirst({
                where: eq(invoices.id, invoiceId),
            });

            if (invoice) {
                await createNotification({
                    userId: invoice.userId,
                    title: "Pago Recibido (Stripe)",
                    body: `Se ha recibido el pago de la factura ${invoice.invoiceNumber} vía Stripe.`,
                    href: `/dashboard/invoices/${invoiceId}`,
                });
            }
        }
    }

    return new NextResponse(null, { status: 200 });
}
