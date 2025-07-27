"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, Banknote, Users, FileWarning, CheckCircle2 } from "lucide-react";
import { mockDashboardData, mockInvoices } from "@/lib/data";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import InvoiceStatusBadge from "@/components/invoice-status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocale } from "@/lib/i18n/locale-provider";

export default function DashboardPage() {
    const { t, formatCurrency } = useLocale();
    const recentInvoices = mockInvoices.slice(0, 5);

    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalRevenue')}</CardTitle>
              <Banknote className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(mockDashboardData.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">{mockDashboardData.revenueChange}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{t('dashboard.paidInvoices')}</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockDashboardData.paidInvoices}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard.totalPaidInvoices')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{t('dashboard.pendingInvoices')}</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockDashboardData.pendingInvoices}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard.awaitingPayment')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{t('dashboard.overdueInvoices')}</CardTitle>
              <FileWarning className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockDashboardData.overdueInvoices}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard.paymentOverdue')}</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('dashboard.recentInvoices')}</CardTitle>
                <Link href="/dashboard/invoices">
                    <Button variant="outline" size="sm">
                        {t('common.viewAll')}
                        <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('invoices.client')}</TableHead>
                            <TableHead className="hidden md:table-cell">{t('invoices.invoiceNumber')}</TableHead>
                            <TableHead>{t('invoices.amount')}</TableHead>
                            <TableHead>{t('invoices.status')}</TableHead>
                            <TableHead className="hidden md:table-cell">{t('invoices.dueDate')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentInvoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="hidden h-9 w-9 sm:flex">
                                            <AvatarImage src={invoice.client.avatarUrl} alt="Avatar" data-ai-hint="person avatar" />
                                            <AvatarFallback>{invoice.client.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="font-medium">{invoice.client.name}</div>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{invoice.invoiceNumber}</TableCell>
                                <TableCell>{formatCurrency(invoice.total)}</TableCell>
                                <TableCell>
                                    <InvoiceStatusBadge status={invoice.status} />
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{invoice.dueDate}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    );
}
