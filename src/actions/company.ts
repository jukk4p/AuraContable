"use server";

import { db } from "@/db/config";
import { companyProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// --- Types & Schemas ---

export type ActionResult<T = any> = 
  | { success: true; data: T }
  | { success: false; error: string };

const CompanyProfileSchema = z.object({
  userId: z.string().uuid(),
  companyName: z.string().min(1, "El nombre de la empresa es requerido"),
  taxId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().email("Email inválido").or(z.literal("")).optional().nullable(),
  phone: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  currency: z.enum(['EUR', 'USD', 'GBP']).optional().nullable().default('EUR' as any),
  language: z.string().optional().nullable(),
  fiscalData: z.string().optional().nullable(),
  defaultTerms: z.string().optional().nullable(),
  defaultTaxes: z.array(z.any()).optional().nullable(),
  templates: z.any().optional().nullable(),
  notifications: z.any().optional().nullable(),
  theme: z.enum(['light', 'dark', 'system']).optional().nullable(),
  // Stripe
  stripeEnabled: z.boolean().optional().nullable(),
  stripePublishableKey: z.string().optional().nullable(),
  stripeSecretKey: z.string().optional().nullable(),
  stripeWebhookSecret: z.string().optional().nullable(),
  // PayPal
  paypalEnabled: z.boolean().optional().nullable(),
  paypalClientId: z.string().optional().nullable(),
  paypalSecret: z.string().optional().nullable(),
  paypalSandbox: z.boolean().optional().nullable(),
});

// --- Actions ---

export async function getCompanyProfile(userId: string): Promise<any | null> {
  if (!userId) return null;
  const results = await db.select().from(companyProfiles).where(eq(companyProfiles.userId, userId));
  const profile = results[0];
  if (!profile) return null;

  return {
    ...profile,
    name: profile.companyName,
    billingEmail: profile.email,
  };
}

export async function saveCompanyProfile(profileData: any): Promise<ActionResult> {
  try {
    // Normalize data (mapping name/billingEmail if present from frontend)
    const normalizedData = {
      ...profileData,
      companyName: profileData.name || profileData.companyName,
      email: profileData.billingEmail || profileData.email,
    };

    const validated = CompanyProfileSchema.parse(normalizedData);
    const existing = await db.select().from(companyProfiles).where(eq(companyProfiles.userId, validated.userId));
    
    if (existing.length > 0) {
      await db.update(companyProfiles).set(validated).where(eq(companyProfiles.userId, validated.userId));
    } else {
      await db.insert(companyProfiles).values(validated);
    }

    revalidatePath("/dashboard/settings");
    return { success: true, data: null };
  } catch (error) {
    console.error("Error saving company profile:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Error interno al guardar el perfil de empresa." };
  }
}
