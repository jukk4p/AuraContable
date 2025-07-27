
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

    const primaryColor = '#3399FF'; // HSL(210, 70%, 50%)
    const textColor = '#1E293B'; // approx. HSL(210, 25%, 15%)
    const mutedColor = '#64748B'; // approx. HSL(210, 20%, 40%)
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    // --- Header ---
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor);
    doc.text(t('nav.invoices').toUpperCase(), 20, 30);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedColor);
    doc.text(`${t('invoices.invoiceNumberShort')}: #${invoice.invoiceNumber}`, 20, 38);

    if (company?.logoUrl && company.logoUrl.startsWith('data:image')) {
        try {
            doc.addImage(company.logoUrl, 'PNG', pageWidth - 60, 20, 40, 15);
        } catch(e) {
            console.error("Error adding logo to PDF:", e);
        }
    }

    // --- Company & Client Info ---
    const infoStartY = 60;
    doc.setLineWidth(0.5);
    doc.setDrawColor(mutedColor);
    doc.line(20, infoStartY - 10, pageWidth - 20, infoStartY - 10);
    
    doc.setFontSize(10);
    
    // Company Info (From)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mutedColor);
    doc.text('De:', 20, infoStartY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    doc.text(company?.name || 'Your Company Name', 20, infoStartY + 6);
    doc.text(company?.address || 'Your Address', 20, infoStartY + 11);
    doc.text(company?.taxId || 'Your Tax ID', 20, infoStartY + 16);
    doc.text(company?.billingEmail || 'your-email@company.com', 20, infoStartY + 21);

    // Client Info (To)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mutedColor);
    doc.text('Para:', pageWidth / 2, infoStartY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    doc.text(invoice.client.name, pageWidth / 2, infoStartY + 6);
    doc.text(invoice.client.email, pageWidth / 2, infoStartY + 11);

    // Invoice Dates
    const datesY = infoStartY + 35;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mutedColor);
    doc.text(t('invoices.issueDate').toUpperCase(), 20, datesY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    doc.text(format(invoice.issueDate, 'PPP'), 20, datesY + 6);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mutedColor);
    doc.text(t('invoices.dueDate').toUpperCase(), pageWidth / 2, datesY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    doc.text(format(invoice.dueDate, 'PPP'), pageWidth / 2, datesY + 6);


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
        startY: datesY + 15,
        head: [tableHeaders],
        body: tableData,
        theme: 'striped',
        headStyles: { 
            fillColor: primaryColor,
            textColor: '#FFFFFF',
            fontStyle: 'bold'
        },
        styles: {
            cellPadding: 3,
            fontSize: 10,
            textColor: textColor,
        },
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' }
        },
        didDrawPage: (data) => {
            // Footer
            if (company?.iban || invoice.notes) {
                 const footerY = pageHeight - 35;
                 doc.setLineWidth(0.5);
                 doc.setDrawColor(mutedColor);
                 doc.line(20, footerY, pageWidth - 20, footerY);

                 let currentY = footerY + 10;
                 doc.setFontSize(9);
                 doc.setTextColor(mutedColor);

                 if(company?.iban) {
                     doc.setFont('helvetica', 'bold');
                     doc.text('Detalles de Pago:', 20, currentY);
                     doc.setFont('helvetica', 'normal');
                     doc.text(`IBAN: ${company.iban}`, 20, currentY + 5);
                     currentY += 15;
                 }
                  if (invoice.notes) {
                     doc.setFont('helvetica', 'bold');
                     doc.text(`${t('newInvoice.notes')}:`, 20, currentY);
                     doc.setFont('helvetica', 'normal');
                     doc.text(invoice.notes, 20, currentY + 5, { maxWidth: pageWidth - 40 });
                 }
            }
        }
    });

    // --- Totals ---
    const finalY = (doc as any).lastAutoTable.finalY;
    const totalX = pageWidth - 80;
    const totalValueX = pageWidth - 20;
    
    doc.setFontSize(12);
    doc.setTextColor(textColor);
    
    doc.text(`${t('newInvoice.subtotal')}:`, totalX, finalY + 15, { align: 'left'});
    doc.text(formatCurrency(invoice.subtotal), totalValueX, finalY + 15, { align: 'right' });
    
    // Example for tax and total, assuming you add them to the invoice object
    // doc.text(`IVA (21%):`, totalX, finalY + 22, { align: 'left'});
    // doc.text(formatCurrency(invoice.tax), totalValueX, finalY + 22, { align: 'right' });
    
    // doc.setFontSize(14);
    // doc.setFont('helvetica', 'bold');
    // doc.text(`TOTAL:`, totalX, finalY + 30, { align: 'left'});
    // doc.text(formatCurrency(invoice.total), totalValueX, finalY + 30, { align: 'right' });


    // --- Save PDF ---
    doc.save(`Factura-${invoice.invoiceNumber}.pdf`);
}
