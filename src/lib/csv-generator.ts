
import type { Invoice, Client } from './types';
import { format } from 'date-fns';

function escapeCsvCell(cell: any): string {
    if (cell === null || cell === undefined) {
        return '';
    }
    const cellStr = String(cell);
    // If the cell contains a comma, a quote, or a newline, wrap it in double quotes.
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        // Also, any double quotes inside the string must be escaped by another double quote.
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
}

export async function generateInvoicingReportCsv(invoices: Invoice[]) {
    const headers = [
        'NumeroFactura',
        'Cliente',
        'FechaEmision',
        'FechaVencimiento',
        'Estado',
        'Subtotal',
        'Impuestos',
        'Total',
    ];

    const rows = invoices.map(invoice => {
        const totalTaxes = (invoice.taxes || []).reduce((sum, tax) => {
             return sum + (invoice.subtotal * (tax.percentage / 100));
        }, 0);

        return [
            invoice.invoiceNumber,
            invoice.client.name,
            format(invoice.issueDate, 'yyyy-MM-dd'),
            format(invoice.dueDate, 'yyyy-MM-dd'),
            invoice.status,
            invoice.subtotal,
            totalTaxes,
            invoice.total
        ].map(escapeCsvCell).join(',');
    });

    const csvContent = [
        headers.join(','),
        ...rows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
        URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `Informe-Facturacion-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export async function generateClientsCsv(clients: Client[]) {
    const headers = [
        'Nombre',
        'Email',
        'NIF',
        'Direccion',
        'Pais',
        'Telefono',
        'Notas',
    ];

    const rows = clients.map(client => {
        return [
            client.name,
            client.email,
            client.taxId,
            client.address,
            client.country,
            client.phone,
            client.notes,
        ].map(escapeCsvCell).join(',');
    });

    const csvContent = [
        headers.join(','),
        ...rows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
        URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `Clientes-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

    