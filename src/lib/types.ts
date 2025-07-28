/**
 * @fileoverview This file defines the core data structures and types used throughout the application,
 * mapping directly to the collections and documents stored in Cloud Firestore.
 */

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
  client: Omit<Client, 'id' | 'userId'>; // Denormalized client data for display.
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
  href: string;
  isRead: boolean;
  createdAt: Date;
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
