"use server";

import { db } from "@/db/config";
import { companyProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { type ActionResult, toActionError } from "@/lib/action-result";
import type { CompanyProfile, InvoiceTax } from "@/lib/types";

// --- Types & Schemas ---

const CompanyProfileSchema = z.object({
  companyName: z.string().min(1, "El nombre de la empresa es requerido"),
  taxId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().email("Email inválido").or(z.literal("")).optional().nullable(),
  phone: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  currency: z.enum(['EUR', 'USD', 'GBP']).optional().nullable(),
  language: z.string().optional().nullable(),
  fiscalData: z.string().optional().nullable(),
  defaultTerms: z.string().optional().nullable(),
  defaultTaxes: z.array(z.any()).optional().nullable(),
  templates: z.any().optional().nullable(),
  notifications: z.any().optional().nullable(),
  theme: z.enum(['light', 'dark', 'system']).optional().nullable(),
  stripeEnabled: z.boolean().optional().nullable(),
  stripePublishableKey: z.string().optional().nullable(),
  stripeSecretKey: z.string().optional().nullable(),
  stripeWebhookSecret: z.string().optional().nullable(),
  paypalEnabled: z.boolean().optional().nullable(),
  paypalClientId: z.string().optional().nullable(),
  paypalSecret: z.string().optional().nullable(),
  paypalSandbox: z.boolean().optional().nullable(),
});

/**
 * Campos que jamás deben salir del servidor.
 *
 * El perfil se leía haciendo spread de la fila entera, así que las claves
 * secretas de Stripe y PayPal acababan serializadas en el HTML que recibe el
 * navegador. En su lugar se exponen indicadores de si están configuradas.
 */
const SECRET_FIELDS = ["stripeSecretKey", "stripeWebhookSecret", "paypalSecret"] as const;

export type SafeCompanyProfile = Omit<
  typeof companyProfiles.$inferSelect,
  (typeof SECRET_FIELDS)[number] | "defaultTaxes" | "templates" | "notifications"
> & {
  name: string;
  billingEmail: string | null;
  // Las columnas jsonb llegan como `unknown`; se concretan aquí para que la UI
  // no tenga que castear en cada uso.
  defaultTaxes: InvoiceTax[] | null;
  templates: CompanyProfile["templates"];
  notifications: CompanyProfile["notifications"];
  hasStripeSecretKey: boolean;
  hasStripeWebhookSecret: boolean;
  hasPaypalSecret: boolean;
};

// --- Actions ---

export async function getCompanyProfile(): Promise<SafeCompanyProfile | null> {
  const userId = await requireUserId();
  const results = await db
    .select()
    .from(companyProfiles)
    .where(eq(companyProfiles.userId, userId));
  const profile = results[0];
  if (!profile) return null;

  const { stripeSecretKey, stripeWebhookSecret, paypalSecret, ...safe } = profile;

  return {
    ...safe,
    name: profile.companyName,
    billingEmail: profile.email,
    defaultTaxes: (profile.defaultTaxes as InvoiceTax[] | null) ?? null,
    templates: profile.templates as CompanyProfile["templates"],
    notifications: profile.notifications as CompanyProfile["notifications"],
    hasStripeSecretKey: Boolean(stripeSecretKey),
    hasStripeWebhookSecret: Boolean(stripeWebhookSecret),
    hasPaypalSecret: Boolean(paypalSecret),
  };
}

export async function saveCompanyProfile(profileData: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    const raw = (profileData ?? {}) as Record<string, unknown>;
    const normalized = {
      ...raw,
      companyName: raw.name ?? raw.companyName,
      email: raw.billingEmail ?? raw.email,
    };
    // Los indicadores que envía el cliente no son campos del perfil.
    delete (normalized as any).hasStripeSecretKey;
    delete (normalized as any).hasStripeWebhookSecret;
    delete (normalized as any).hasPaypalSecret;
    delete (normalized as any).id;
    delete (normalized as any).userId;
    delete (normalized as any).createdAt;

    const validated = CompanyProfileSchema.parse(normalized);

    // Un secreto vacío significa "no lo toques": el formulario nunca recibe el
    // valor actual, así que no puede reenviarlo.
    const patch: Record<string, unknown> = { ...validated };
    for (const field of SECRET_FIELDS) {
      if (!patch[field]) delete patch[field];
    }

    const existing = await db
      .select({ id: companyProfiles.id })
      .from(companyProfiles)
      .where(eq(companyProfiles.userId, userId));

    if (existing.length > 0) {
      await db.update(companyProfiles).set(patch).where(eq(companyProfiles.userId, userId));
    } else {
      await db.insert(companyProfiles).values({ ...patch, userId } as typeof companyProfiles.$inferInsert);
    }

    revalidatePath("/dashboard/settings");
    return { success: true, data: null };
  } catch (error) {
    return toActionError(error, "Error interno al guardar el perfil de empresa.", "saveCompanyProfile");
  }
}
