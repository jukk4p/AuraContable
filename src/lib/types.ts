
export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue';

export type Client = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  userId: string;
  address?: string;
  taxId?: string;
  country?: string;
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  price: number;
};

export type InvoiceTax = {
  id: string; // e.g., 'iva-21'
  name: string; // e.g., 'IVA'
  percentage: number; // e.g., 21
}

export type Invoice = {
  id: string;
  invoiceNumber: string;
  client: Client;
  clientId: string;
  items: InvoiceItem[];
  taxes: InvoiceTax[];
  subtotal: number;
  total: number;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  notes: string;
  terms: string;
  userId: string;
};

export type Expense = {
    id: string;
    date: Date;
    category: string;
    provider: string;
    description: string;
    amount: number;
    tax: number;
    userId: string;
}

export type DashboardData = {
    totalRevenue: number;
    revenueChange: string;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
}

export type CompanyProfile = {
    id?: string;
    userId: string;
    name: string;
    taxId: string;
    address: string;
    billingEmail: string;
    iban: string;
    fiscalData: string;
    logoUrl?: string;
    country?: string;
    terms?: string;
    defaultTaxes?: InvoiceTax[];
}
