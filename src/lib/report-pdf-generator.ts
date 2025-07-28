
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Invoice, CompanyProfile, ReportData } from './types';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Locale } from './i18n/locales';

interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => jsPDFWithAutoTable;
}

type Localization = {
    t: (key: string) => string;
    locale: Locale;
};

// A simplified function to calculate report data, as we cannot share complex logic
// between the server and the client without a proper state management library.
function calculateReportData(data: Invoice[], t: (key: string) => string): ReportData {
     const totalAmount = data.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = data.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.total, 0);
    const totalTaxes = data.reduce((sum, inv) => {
        const invoiceTaxes = (inv.taxes || []).reduce((taxSum, tax) => taxSum + (inv.subtotal * (tax.percentage / 100)), 0);
        return sum + invoiceTaxes;
    }, 0);
    
    const paidCount = data.filter(inv => inv.status === 'Paid').length;
    const pendingCount = data.filter(inv => inv.status === 'Pending').length;
    const overdueCount = data.filter(inv => inv.status === 'Overdue').length;

    const monthlyData = data.reduce((acc, inv) => {
        const month = format(inv.issueDate, 'yyyy-MM');
        if (!acc[month]) {
            acc[month] = { month, total: 0, paid: 0, pending: 0, overdue: 0 };
        }
        acc[month].total += inv.total;
        if (inv.status === 'Paid') acc[month].paid += inv.total;
        if (inv.status === 'Pending') acc[month].pending += inv.total;
        if (inv.status === 'Overdue') acc[month].overdue += inv.total;

        return acc;
    }, {} as Record<string, { month: string, total: number, paid: number, pending: number, overdue: number }>);


    return {
        totalAmount,
        totalPaid,
        totalTaxes,
        paidCount,
        pendingCount,
        overdueCount,
        totalCount: data.length,
        monthlyData: Object.values(monthlyData).sort((a,b) => a.month.localeCompare(b.month))
    }
}


export async function generateInvoicingReportPdf(
    invoices: Invoice[],
    company: CompanyProfile | null,
    dateRange: DateRange,
    l10n: Localization
) {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const { t, locale } = l10n;
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: company?.currency || 'EUR',
        }).format(amount);
    }
    
    const reportData = calculateReportData(invoices, t);

    const primaryColor = '#3399FF';
    const textColor = '#1E293B';
    const mutedColor = '#64748B';
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    let currentY = 30;

    // --- Header ---
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text("Informe de Facturación", 20, currentY);
    currentY += 10;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    if(company?.name) doc.text(company.name, 20, currentY);

    const dateRangeText = `Del ${format(dateRange.from!, 'dd/MM/yyyy')} al ${format(dateRange.to!, 'dd/MM/yyyy')}`;
    doc.text(dateRangeText, pageWidth - 20, currentY, { align: 'right' });
    currentY += 15;
    
    // --- Summary ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text("Resumen General", 20, currentY);
    currentY += 10;

    const summaryBody = [
        ['Total Facturado', formatCurrency(reportData.totalAmount)],
        ['Total Cobrado', formatCurrency(reportData.totalPaid)],
        ['Impuestos Totales', formatCurrency(reportData.totalTaxes)],
        ['Nº de Facturas', `${reportData.totalCount} (Pagadas: ${reportData.paidCount}, Pendientes: ${reportData.pendingCount}, Vencidas: ${reportData.overdueCount})`],
    ];

    doc.autoTable({
        startY: currentY,
        body: summaryBody,
        theme: 'grid',
        styles: {
            cellPadding: 3,
            fontSize: 10,
            textColor: textColor,
        },
        columnStyles: {
             0: { fontStyle: 'bold' },
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;


    // --- Monthly Breakdown ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text("Desglose Mensual", 20, currentY);
    
    const tableHeaders = ["Mes", "Total Facturado", "Total Cobrado", "Pendiente/Vencido"];
    
    const tableData = reportData.monthlyData.map(item => [
        format(new Date(item.month), 'MMMM yyyy'),
        formatCurrency(item.total),
        formatCurrency(item.paid),
        formatCurrency(item.pending + item.overdue),
    ]);

    doc.autoTable({
        startY: currentY + 5,
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
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
        },
    });

    doc.save(`Informe-Facturacion-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

    
