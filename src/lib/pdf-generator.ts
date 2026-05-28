

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

    // Premium Color System
    const brandDark = '#0F172A';   // Slate-900 (Main dark accents)
    const accentCyan = '#06B6D4';  // Cyan-500 (Brand pop)
    const textDark = '#1E293B';    // Slate-800 (Primary text)
    const textMuted = '#64748B';   // Slate-500 (Subtle labels)
    const cardBg = '#F8FAFC';      // Slate-50 (Card fills)
    const lineLight = '#E2E8F0';   // Slate-200 (Dividers)

    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    // --- 1. Top Header Banner (Full Width Dark Band) ---
    doc.setFillColor('#000000');
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Title inside banner
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#FFFFFF');
    doc.text(t('invoices.invoice').toUpperCase(), 20, 26);

    // Company Logo inside banner (Right side)
    if (company?.logoUrl && company.logoUrl.startsWith('data:image')) {
        try {
            // Background fill or direct logo drawing
            doc.addImage(company.logoUrl, 'PNG', pageWidth - 65, 13, 45, 16, undefined, 'FAST');
        } catch(e) {
            console.error("Error adding logo to PDF:", e);
        }
    }

    // --- 2. Invoice Details Grid (Clean Row below Banner) ---
    const metaY = 52;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textMuted);
    doc.text(t('invoices.invoiceNumberShort').toUpperCase(), 20, metaY);
    doc.text(t('invoices.issueDate').toUpperCase(), 80, metaY);
    doc.text(t('invoices.dueDate').toUpperCase(), 140, metaY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandDark);
    doc.text(invoice.invoiceNumber, 20, metaY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textDark);
    doc.text(format(new Date(invoice.issueDate), 'dd MMM yyyy', { locale: dateLocale }), 80, metaY + 6);
    doc.text(format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: dateLocale }), 140, metaY + 6);

    // Divider line below metadata
    doc.setLineWidth(0.4);
    doc.setDrawColor(lineLight);
    doc.line(20, 64, pageWidth - 20, 64);

    // --- 3. Emisor & Receptor Columns (with Cyan Accent Indicators) ---
    const infoStartY = 73;
    
    // Issuer Column (De)
    doc.setFillColor(accentCyan);
    doc.rect(20, infoStartY - 4, 2.5, 5, 'F'); // Little cyan block
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandDark);
    doc.setFontSize(9);
    doc.text('EMISOR', 25, infoStartY);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    let companyInfoY = infoStartY + 6;
    if (company?.name) { doc.text(company.name, 20, companyInfoY); companyInfoY += 5; }
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark);
    if (company?.taxId) { doc.text(`CIF/NIF: ${company.taxId}`, 20, companyInfoY); companyInfoY += 4.5; }
    if (company?.address) {
        const addrLines = doc.splitTextToSize(company.address, (pageWidth / 2) - 25);
        doc.text(addrLines, 20, companyInfoY);
        companyInfoY += (addrLines.length * 4.5);
    }
    if (company?.billingEmail) { doc.text(company.billingEmail, 20, companyInfoY); }

    // Receptor Column (Para)
    const clientStartX = pageWidth / 2 + 10;
    doc.setFillColor(brandDark);
    doc.rect(clientStartX, infoStartY - 4, 2.5, 5, 'F'); // Little dark block
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandDark);
    doc.setFontSize(9);
    doc.text('RECEPTOR', clientStartX + 5, infoStartY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    let clientInfoY = infoStartY + 6;
    if (invoice.client.name) { doc.text(invoice.client.name, clientStartX, clientInfoY); clientInfoY += 5; }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark);
    if (invoice.client.taxId) { doc.text(`CIF/NIF: ${invoice.client.taxId}`, clientStartX, clientInfoY); clientInfoY += 4.5; }
    if (invoice.client.address) {
        const addrLines = doc.splitTextToSize(invoice.client.address, (pageWidth / 2) - 25);
        doc.text(addrLines, clientStartX, clientInfoY);
        clientInfoY += (addrLines.length * 4.5);
    }
    if (invoice.client.email) { doc.text(invoice.client.email, clientStartX, clientInfoY); }

    // --- 4. Items Table ---
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

    autoTable(doc, {
        startY: Math.max(companyInfoY, clientInfoY) + 12,
        head: [tableHeaders],
        body: tableData,
        theme: 'striped',
        headStyles: { 
            fillColor: brandDark,
            textColor: '#FFFFFF',
            fontStyle: 'bold',
            fontSize: 8,
        },
        styles: {
            cellPadding: 4,
            fontSize: 8.5,
            textColor: textDark,
            lineColor: '#F8FAFC',
        },
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' }
        },
        alternateRowStyles: {
            fillColor: '#F8FAFC',
        },
        didDrawPage: (data) => {
            // Clean Footer
            const footerY = pageHeight - 35;
            doc.setLineWidth(0.2);
            doc.setDrawColor(lineLight);
            doc.line(20, footerY, pageWidth - 20, footerY);

            let currentY = footerY + 8;
            doc.setFontSize(8);
            doc.setTextColor(textMuted);

            if (company?.iban) {
                doc.setFont('helvetica', 'bold');
                doc.text('DETALLES DE PAGO', 20, currentY);
                doc.setFont('helvetica', 'normal');
                doc.text(`IBAN: ${company.iban}`, 20, currentY + 4.5);
            }
             
            if (invoice.terms) {
                const termsText = doc.splitTextToSize(invoice.terms, pageWidth - 130);
                doc.setFont('helvetica', 'bold');
                doc.text(`${t('settings.invoicing.defaultTerms').toUpperCase()}`, 110, currentY);
                doc.setFont('helvetica', 'normal');
                doc.text(termsText, 110, currentY + 4.5);
            }
             
            if (invoice.notes) {
                const notesY = footerY - 14;
                const notesText = doc.splitTextToSize(invoice.notes, pageWidth - 40);
                doc.setFont('helvetica', 'bold');
                doc.text(`${t('newInvoice.notes').toUpperCase()}`, 20, notesY);
                doc.setFont('helvetica', 'normal');
                doc.text(notesText, 20, notesY + 4.5);
            }
        }
    });

    // --- 5. Totals Card ---
    const finalY = (doc as any).lastAutoTable.finalY;
    const totalBoxWidth = 80;
    const totalBoxHeight = 24 + ((invoice.taxes || []).length * 6);
    const totalX = pageWidth - totalBoxWidth - 20;
    
    // Total Card Background
    doc.setFillColor(cardBg);
    doc.roundedRect(totalX, finalY + 8, totalBoxWidth, totalBoxHeight, 2, 2, 'F');
    
    let currentY = finalY + 14;
    doc.setFontSize(8.5);
    doc.setTextColor(textDark);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`${t('newInvoice.subtotal')}:`, totalX + 6, currentY);
    doc.text(formatCurrency(invoice.subtotal), pageWidth - 26, currentY, { align: 'right' });
    currentY += 6;

    (invoice.taxes || []).forEach(tax => {
        const taxAmount = invoice.subtotal * (tax.percentage / 100);
        doc.text(`${tax.name} (${tax.percentage}%):`, totalX + 6, currentY);
        doc.text(formatCurrency(taxAmount), pageWidth - 26, currentY, { align: 'right' });
        currentY += 6;
    });

    // Thin accent divider
    doc.setLineWidth(0.2);
    doc.setDrawColor(lineLight);
    doc.line(totalX + 6, currentY - 1, pageWidth - 26, currentY - 1);
    
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandDark);
    doc.text(`TOTAL:`, totalX + 6, currentY + 4);
    doc.text(formatCurrency(invoice.total), pageWidth - 26, currentY + 4, { align: 'right' });

    if (outputType === 'blob') {
        return doc.output('blob');
    } else {
        doc.save(`${invoice.invoiceNumber}.pdf`);
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
            zip.file(`${invoice.invoiceNumber}.pdf`, pdfBlob);
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
