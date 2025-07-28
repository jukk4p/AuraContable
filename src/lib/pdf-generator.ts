

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import JSZip from 'jszip';
import type { Invoice, CompanyProfile } from './types';
import { format } from 'date-fns';
import { es, fr, it, enUS } from 'date-fns/locale';
import type { Locale } from './i18n/locales';

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => jsPDFWithAutoTable;
}

type Localization = {
    t: (key: string) => string;
    formatCurrency: (amount: number) => string;
    locale: Locale;
};

const localeMap = {
    es,
    fr,
    it,
    en: enUS,
    ca: es, // Use spanish locale for catalan as date-fns does not have 'ca'
}

export async function generateInvoicePdf(
    invoice: Invoice, 
    company: CompanyProfile | null,
    l10n: Localization,
    outputType: 'save' | 'blob' = 'save'
): Promise<Blob | void> {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const { t, formatCurrency, locale } = l10n;
    const dateLocale = localeMap[locale] || enUS;

    const primaryColor = '#3399FF'; // HSL(210, 70%, 50%)
    const textColor = '#1E293B'; // approx. HSL(210, 25%, 15%)
    const mutedColor = '#64748B'; // approx. HSL(210, 20%, 40%)
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    // --- Header ---
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text(t('invoices.invoice').toUpperCase(), 20, 30);

    if (company?.logoUrl && company.logoUrl.startsWith('data:image')) {
        try {
            doc.addImage(company.logoUrl, 'PNG', pageWidth - 60, 20, 40, 15, undefined, 'FAST');
        } catch(e) {
            console.error("Error adding logo to PDF:", e);
        }
    }

    // --- Invoice Details ---
    const detailsY = 50;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mutedColor);
    
    doc.text(`${t('invoices.invoiceNumberShort')}:`, 20, detailsY);
    doc.text(t('invoices.issueDate').toUpperCase(), 20, detailsY + 7);
    doc.text(t('invoices.dueDate').toUpperCase(), 20, detailsY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);

    doc.text(invoice.invoiceNumber, 60, detailsY);
    doc.text(format(invoice.issueDate, 'PPP', { locale: dateLocale }), 60, detailsY + 7);
    doc.text(format(invoice.dueDate, 'PPP', { locale: dateLocale }), 60, detailsY + 14);

    // --- Company & Client Info ---
    const infoStartY = detailsY + 30;
    let companyInfoY = infoStartY + 6;
    let clientInfoY = infoStartY + 6;
    
    // Company Info (From)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mutedColor);
    doc.text('De:', 20, infoStartY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    
    if (company?.name) doc.text(company.name, 20, companyInfoY);
    if (company?.address) { companyInfoY += 5; doc.text(company.address, 20, companyInfoY); }
    if (company?.taxId) { companyInfoY += 5; doc.text(company.taxId, 20, companyInfoY); }
    if (company?.billingEmail) { companyInfoY += 5; doc.text(company.billingEmail, 20, companyInfoY); }


    // Client Info (To)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mutedColor);
    doc.text('Para:', pageWidth / 2 + 20, infoStartY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);

    if (invoice.client.name) doc.text(invoice.client.name, pageWidth / 2 + 20, clientInfoY);
    if (invoice.client.address) { clientInfoY += 5; doc.text(invoice.client.address, pageWidth / 2 + 20, clientInfoY); }
    if (invoice.client.taxId) { clientInfoY += 5; doc.text(invoice.client.taxId, pageWidth / 2 + 20, clientInfoY); }
    if (invoice.client.email) { clientInfoY += 5; doc.text(invoice.client.email, pageWidth / 2 + 20, clientInfoY); }


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
        startY: Math.max(companyInfoY, clientInfoY) + 15,
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
            const footerY = pageHeight - 45;
             doc.setLineWidth(0.2);
             doc.setDrawColor(mutedColor);
             doc.line(20, footerY, pageWidth - 20, footerY);

             let currentY = footerY + 10;
             doc.setFontSize(9);
             doc.setTextColor(mutedColor);

             if (company?.iban) {
                 doc.setFont('helvetica', 'bold');
                 doc.text('Detalles de Pago:', 20, currentY);
                 doc.setFont('helvetica', 'normal');
                 doc.text(`IBAN: ${company.iban}`, 20, currentY + 5);
             }
             
             if (invoice.terms) {
                const termsText = doc.splitTextToSize(invoice.terms, pageWidth - 140);
                doc.setFont('helvetica', 'bold');
                doc.text(`${t('settings.invoicing.defaultTerms')}:`, 100, currentY);
                doc.setFont('helvetica', 'normal');
                doc.text(termsText, 100, currentY + 5);
             }
             
             if (invoice.notes) {
                const notesY = footerY - 15;
                const notesText = doc.splitTextToSize(invoice.notes, pageWidth - 40);
                doc.setFont('helvetica', 'bold');
                doc.text(`${t('newInvoice.notes')}:`, 20, notesY);
                doc.setFont('helvetica', 'normal');
                doc.text(notesText, 20, notesY + 5);
             }
        }
    });

    // --- Totals ---
    const finalY = (doc as any).lastAutoTable.finalY;
    const totalX = pageWidth - 80;
    const totalValueX = pageWidth - 20;
    let currentY = finalY + 10;
    
    doc.setFontSize(10);
    doc.setTextColor(textColor);
    
    doc.text(`${t('newInvoice.subtotal')}:`, totalX, currentY, { align: 'left'});
    doc.text(formatCurrency(invoice.subtotal), totalValueX, currentY, { align: 'right' });
    currentY += 7;

    (invoice.taxes || []).forEach(tax => {
        const taxAmount = invoice.subtotal * (tax.percentage / 100);
        doc.text(`${tax.name} (${tax.percentage}%):`, totalX, currentY, { align: 'left'});
        doc.text(formatCurrency(taxAmount), totalValueX, currentY, { align: 'right' });
        currentY += 7;
    });

    doc.setLineWidth(0.3);
    doc.setDrawColor(textColor);
    doc.line(totalX - 5, currentY, totalValueX, currentY);
    currentY += 7;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL:`, totalX, currentY, { align: 'left'});
    doc.text(formatCurrency(invoice.total), totalValueX, currentY, { align: 'right' });


    if (outputType === 'blob') {
        return doc.output('blob');
    } else {
        doc.save(`Factura-${invoice.invoiceNumber}.pdf`);
    }
}


export async function generateInvoicesZip(
    invoices: Invoice[],
    company: CompanyProfile | null,
    l10n: Localization
) {
    const zip = new JSZip();

    for (const invoice of invoices) {
        const pdfBlob = await generateInvoicePdf(invoice, company, l10n, 'blob');
        if (pdfBlob) {
            zip.file(`Factura-${invoice.invoiceNumber}.pdf`, pdfBlob);
        }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.setAttribute('download', `Facturas-${format(new Date(), 'yyyy-MM-dd')}.zip`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
