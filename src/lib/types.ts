export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue';

export type Client = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
};

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  price: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  client: Client;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  notes: string;
};

export type DashboardData = {
    totalRevenue: number;
    revenueChange: string;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
}
