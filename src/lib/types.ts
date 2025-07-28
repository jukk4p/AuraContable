/**
 * @fileoverview This file defines the core data structures and types used throughout the application,
 * mapping directly to the collections and documents stored in Cloud Firestore.
 */

/**
 * Represents the status of an invoice.
 */
export type InvoiceStatus = 'paid' | 'pending' | 'overdue';

/**
 * Represents a user's company profile and settings.
 * Maps to the "companyProfiles" collection, where the document ID is the user's UID.
 */
export type CompanyProfile = {
  userId: string; // Foreign key to the user in Firebase Auth.
  name: string;
  taxId?: string;
  address?: string;
  country?: string;
  billingEmail?: string;
  iban?: string;
  logoUrl?: string; // URL to the company logo in Cloud Storage.
  currency: 'EUR' | 'USD' | 'GBP'; // Default currency for the user.
  language: 'en' | 'es' | 'fr' | 'it' | 'ca'; // Default language for the user.

  // Default invoice settings
  invoicePrefix?: string;
  invoiceStartNumber?: number;
  defaultTerms?: string;
  defaultNotes?: string;
  defaultTaxes?: InvoiceTax[]; // Default taxes to apply to new invoices.

  // Email template settings
  templates?: {
    newInvoice: { subject: string; body: string };
    reminder: { subject: string; body: string };
  };

  // Notification preferences
  notifications: {
    invoicePaid: { email: boolean; app: boolean };
    invoiceOverdue: { email: boolean; app: boolean };
  };
};

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
  phone?: string;
  notes?: string;
  createdAt: Date;
};

/**
 * Represents a single line item within an invoice.
 * This is stored as an object within the `items` array of an Invoice document.
 */
export type InvoiceItem = {
  productId?: string; // Optional reference to a product
  description: string;
  quantity: number;
  price: number;
  taxRate?: number; // Tax rate percentage for this specific item
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
  id:string; // Firestore document ID.
  userId: string; // The UID of the user who owns this invoice.
  clientId: string; // Foreign key to the "clients" collection.
  client: Omit<Client, 'id' | 'userId' | 'createdAt'>; // Denormalized client data for display.
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  taxes: InvoiceTax[];
  subtotal: number;
  total: number;
  currency: 'EUR' | 'USD' | 'GBP';
  notes?: string;
  terms?: string;
  pdfUrl?: string; // URL to the generated PDF in Cloud Storage.
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Represents a product or service that a user can bill for.
 * Maps to the "products" collection.
 */
export type Product = {
    id: string; // Firestore document ID.
    userId: string; // The UID of the user who owns this product.
    name: string;
    description?: string;
    price: number;
    taxRate?: number; // Default tax rate for this product
    unit?: string; // e.g., "hour", "item"
    isActive: boolean;
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
  provider?: string;
  description: string;
  amount: number;
  tax?: number;
  currency: 'EUR' | 'USD' | 'GBP';
  invoiceId?: string; // Optional link to an invoice.
  receiptUrl?: string; // URL to the uploaded receipt in Cloud Storage.
  createdAt: Date;
};


/**
 * Represents a system notification for a user.
 * Maps to the "notifications" collection.
 */
export type AppNotification = {
  id: string; // Firestore document ID.
  userId: string; // The UID of the user this notification is for.
  message: string;
  type: 'invoice_paid' | 'invoice_due' | 'invoice_overdue' | 'expense_reminder';
  channel: 'app' | 'email';
  isRead: boolean;
  reference: {
    collection: 'invoices' | 'expenses';
    documentId: string;
  };
  createdAt: Date;
};

/**
 * Represents a generated report.
 * Maps to the "reports" collection.
 */
export type Report = {
    id: string; // Firestore document ID.
    userId: string; // The UID of the user who owns this report.
    type: 'invoicing' | 'expenses' | 'profit_loss';
    period: {
        from: Date;
        to: Date;
    };
    filters: Record<string, any>; // e.g., { clientId: 'xyz', status: 'paid' }
    summary: Record<string, any>; // JSON object with the report's key metrics.
    fileUrl?: string; // URL to the generated PDF/CSV in Cloud Storage.
    generatedAt: Date;
};

/**
 * Represents a data import or export operation history.
 * Maps to the "data_operations" collection.
 */
export type DataOperation = {
    id: string; // Firestore document ID.
    userId: string; // The UID of the user who performed the operation.
    type: 'import' | 'export';
    target: 'clients' | 'invoices' | 'expenses';
    status: 'completed' | 'failed' | 'in_progress';
    fileUrl?: string; // URL of the file used/generated.
    details?: string; // e.g., "Imported 50 clients." or error message.
    createdAt: Date;
}
