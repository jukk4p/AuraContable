
export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue';

export type Client = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  userId: string;
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  price: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  client: Client;
  clientId: string;
  items: InvoiceItem[];
  subtotal: number;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  notes: string;
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
}
