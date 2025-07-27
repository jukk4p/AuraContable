
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Invoice, CompanyProfile } from './types';
import { format } from 'date-fns';

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => jsPDFWithAutoTable;
}

type Localization = {
    t: (key: string) => string;
    formatCurrency: (amount: number) => string;
};

export async function generateInvoicePdf(
    invoice: Invoice, 
    company: CompanyProfile | null,
    l10n: Localization
) {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const { t, formatCurrency } = l10n;
    
    // --- Header ---
    doc.setFontSize(20);
    doc.text(t('invoices.invoiceNumber').toUpperCase(), 20, 30);
    doc.setFontSize(14);
    doc.text(`#${invoice.invoiceNumber}`, 20, 38);

    // --- Company & Client Info ---
    doc.setFontSize(10);
    const companyX = 20;
    const clientX = 120;
    const startY = 55;

    // Company Info (Issuer)
    doc.setFont('helvetica', 'bold');
    doc.text(company?.name || 'Your Company Name', companyX, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(company?.address || 'Your Address', companyX, startY + 5);
    doc.text(company?.taxId || 'Your Tax ID', companyX, startY + 10);
    doc.text(company?.billingEmail || 'your-email@company.com', companyX, startY + 15);
    
    // Client Info (Recipient)
    doc.setFont('helvetica', 'bold');
    doc.text(t('invoices.client'), clientX, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.client.name, clientX, startY + 5);
    doc.text(invoice.client.email, clientX, startY + 10);

    // --- Invoice Details ---
    const detailsY = startY + 30;
    doc.setFont('helvetica', 'bold');
    doc.text(t('invoices.issueDate').toUpperCase(), companyX, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.text(format(invoice.issueDate, 'PPP'), companyX, detailsY + 5);
    
    doc.setFont('helvetica', 'bold');
    doc.text(t('invoices.dueDate').toUpperCase(), companyX + 60, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.text(format(invoice.dueDate, 'PPP'), companyX + 60, detailsY + 5);

    // --- Items Table ---
    const tableHeaders = [
        t('newInvoice.itemDescription').toUpperCase(),
        t('newInvoice.itemQuantity').toUpperCase(),
        t('newInvoice.itemPrice').toUpperCase(),
        'TOTAL'
    ];
    
    const tableData = invoice.items.map(item => [
        item.description,
        item.quantity,
        formatCurrency(item.price),
        formatCurrency(item.quantity * item.price)
    ]);

    doc.autoTable({
        startY: detailsY + 15,
        head: [tableHeaders],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] },
    });

    // --- Totals ---
    const finalY = (doc as any).lastAutoTable.finalY;
    const totalX = 140;
    doc.setFontSize(12);

    doc.text(`${t('newInvoice.subtotal')}:`, totalX, finalY + 10);
    doc.text(formatCurrency(invoice.subtotal), 190, finalY + 10, { align: 'right' });
    
    // You can add tax and total rows here if they are in your invoice object
    // For example:
    // doc.text(`Tax:`, totalX, finalY + 17);
    // doc.text(formatCurrency(invoice.tax), 190, finalY + 17, { align: 'right' });
    // doc.setFont('helvetica', 'bold');
    // doc.text(`Total:`, totalX, finalY + 24);
    // doc.text(formatCurrency(invoice.total), 190, finalY + 24, { align: 'right' });


    // --- Notes & Footer ---
    if (invoice.notes) {
        doc.setFontSize(10);
        doc.text(t('newInvoice.notes'), 20, finalY + 40);
        doc.text(invoice.notes, 20, finalY + 45, { maxWidth: 170 });
    }

    if (company?.iban) {
         doc.setFontSize(10);
         doc.text('Payment Details:', 20, doc.internal.pageSize.height - 30);
         doc.text(`IBAN: ${company.iban}`, 20, doc.internal.pageSize.height - 25);
    }

    // --- Save PDF ---
    doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
}
