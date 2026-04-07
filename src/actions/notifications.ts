"use server";

import { db } from "@/db/config";
import { notifications } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getNotifications(userId: string) {
    try {
        const userNotifications = await db.query.notifications.findMany({
            where: eq(notifications.userId, userId),
            orderBy: [desc(notifications.createdAt)],
            limit: 20,
        });
        return userNotifications;
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
}

export async function markNotificationAsRead(notificationId: string) {
    try {
        await db.update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.id, notificationId));
        revalidatePath('/dashboard');
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
}

export async function createNotification(notificationData: { userId: string, title: string, body: string, href: string }) {
    try {
        await db.insert(notifications).values(notificationData);
        revalidatePath('/dashboard');
    } catch (error) {
        console.error("Error creating notification:", error);
    }
}
