"use server";

import { db } from "@/db/config";
import { notifications } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";

export async function getNotifications() {
    try {
        const userId = await requireUserId();
        return await db.query.notifications.findMany({
            where: eq(notifications.userId, userId),
            orderBy: [desc(notifications.createdAt)],
            limit: 20,
        });
    } catch (error) {
        console.error("[getNotifications]", error);
        return [];
    }
}

export async function markNotificationAsRead(notificationId: string) {
    try {
        const userId = await requireUserId();
        await db.update(notifications)
            .set({ isRead: true })
            .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
        revalidatePath('/dashboard');
    } catch (error) {
        console.error("[markNotificationAsRead]", error);
    }
}

/**
 * Uso interno: la invocan otras acciones que ya han validado la sesión, y el
 * webhook de Stripe, cuyo userId sale de la firma verificada del evento.
 *
 * No es un punto de entrada para el cliente: no expone nada y su `userId` nunca
 * procede de la petición del navegador.
 */
export async function createNotification(notificationData: { userId: string, title: string, body: string, href: string }) {
    try {
        await db.insert(notifications).values(notificationData);
        revalidatePath('/dashboard');
    } catch (error) {
        console.error("[createNotification]", error);
    }
}
