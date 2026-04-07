/**
 * @fileoverview This file defines the core data structures and types used throughout the application,
 * mapping directly to the collections and documents stored in Cloud Firestore.
 */

import type { Locale } from "./i18n/locales";

/**
 * Represents the status of an invoice.
 */
export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue';

/**
 * Represents a user's company profile and settings.
 * Maps to the "companyProfiles" collection, where the document ID is the user's UID.
 */
export type CompanyProfile = {
  userId: string; // Foreign key to the user in Firebase Auth.
  name: string;
  taxId?: string;
  address?: string;
  billingEmail?: string;
  iban?: string;
  logoUrl?: string; // URL to the company logo in Cloud Storage.
  currency?: 'EUR' | 'USD' | 'GBP';
  fiscalData?: string;
  language?: Locale;

  // Default invoice settings
  defaultTerms?: string;
  defaultTaxes?: InvoiceTax[];

  // Email template settings
  templates?: {
    newInvoice: { subject: string; body: string };
    reminder: { subject: string; body: string };
  };

  // Notification preferences
  notifications?: NotificationPreferences;

  // Appearance preferences
  theme?: 'light' | 'dark' | 'system';

  // Stripe Integration
  stripeEnabled?: boolean;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;

  // PayPal Integration
  paypalEnabled?: boolean;
  paypalClientId?: string;
  paypalSecret?: string;
  paypalSandbox?: boolean;
};

export type NotificationPreferences = {
    invoicePaid: { email: boolean; app: boolean };
    invoiceOverdue: { email: boolean; app: boolean };
}

/**
 * Represents a single client of a user.
 * Maps to the "clients" collection.
 */
export type Client = {
  id: string; // Firestore document ID.
  userId: string; // The UID of the user who owns this client.
  name: string;
  email: string;
  taxId?: string;
  address?: string;
  country?: string;
  avatarUrl?: string;
  phone?: string;
  notes?: string;
  createdAt: Date;
};

/**
 * Represents a single line item within an invoice.
 * This is stored as an object within the `items` array of an Invoice document.
 */
export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  price: number;
};

/**
 * Represents a tax applied to an invoice.
 * This is stored as an object within the `taxes` array of an Invoice document.
 */
export type InvoiceTax = {
  id: string;
  name: string;
  percentage: number;
};

/**
 * Represents a single invoice.
 * Maps to the "invoices" collection.
 */
export type Invoice = {
  id: string; // Firestore document ID.
  userId: string; // The UID of the user who owns this invoice.
  clientId: string; // Foreign key to the "clients" collection.
  client: Client; // Denormalized client data for display.
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  taxes: InvoiceTax[];
  subtotal: number;
  total: number;
  notes?: string;
  terms?: string;
  
  // Payment Integration
  paymentMethod?: 'Stripe' | 'PayPal' | 'Manual';
  paymentId?: string;
  paymentStatus?: string;
  
  createdAt: Date;
};

/**
 * Represents a single expense record.
 * Maps to the "expenses" collection.
 */
export type Expense = {
  id: string; // Firestore document ID.
  userId: string; // The UID of the user who owns this expense.
  date: Date;
  category: string;
  provider: string;
  description: string;
  amount: number;
  tax: number;
  facturaVinculadaId?: string;
  justificanteURL?: string;
  editable?: boolean;
};

/**
 * Represents a system notification for a user.
 * Maps to the "notifications" collection.
 */
export type AppNotification = {
  id: string; // Firestore document ID.
  userId: string; // The UID of the user this notification is for.
  title: string;
  body: string;
  href: string; // Link to the relevant page (e.g., invoice details).
  isRead: boolean;
  createdAt: Date;
  type?: 'invoice' | 'expense' | 'system'; // Optional: for categorization
  channel?: 'email' | 'app';
  reference?: string; // Optional: ID of the related document (e.g., invoice ID)
};

/**
 * Represents a user profile stored in the "users" collection.
 * This is separate from CompanyProfile to hold user-specific, non-company data.
 */
export type UserProfile = {
  id: string;
  uid: string;
  displayName?: string;
  email: string;
  photoURL?: string;
  createdAt: Date;
};

/**
 * Represents a product or service that can be quickly added to an invoice.
 * Maps to the "products" collection.
 */
export type Product = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  price: number;
  tax?: InvoiceTax;
  unit?: string; // e.g., 'hour', 'item'
  active: boolean;
};

/**
 * Represents a generated report.
 * Maps to the "reports" collection.
 */
export type Report = {
  id: string;
  userId: string;
  type: 'invoicing' | 'expenses' | 'profit_loss';
  period: {
    from: Date;
    to: Date;
  };
  filters: Record<string, any>;
  summary: Record<string, any>; // JSON blob with key metrics
  generatedAt: Date;
  fileURL?: string; // Link to PDF/CSV in Cloud Storage
};

/**
 * Represents a record of a data import or export operation.
 * Maps to the "imports" or "exports" collections.
 */
export type ImportExportRecord = {
  id: string;
  userId: string;
  type: 'import' | 'export';
  dataType: 'clients' | 'invoices' | 'expenses';
  date: Date;
  status: 'success' | 'failed' | 'in_progress';
  fileURL?: string;
  details?: string; // e.g., number of records processed, error message
};


export type ReportData = {
    totalAmount: number;
    totalPaid: number;
    totalTaxes: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
    totalCount: number;
    monthlyData: { month: string, total: number, paid: number, pending: number, overdue: number }[];
};

/**
 * Represents dashboard data.
 * This is a client-side type and is not stored in Firestore.
 */
export interface DashboardData {
    totalRevenue: number;
    revenueChange: string;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
}
