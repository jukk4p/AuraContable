
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, Banknote, Users, FileWarning, CheckCircle2, AlertCircle } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import InvoiceStatusBadge from "@/components/invoice-status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocale } from "@/lib/i18n/locale-provider";
import React, { useState, useEffect } from "react";
import { auth } from "@/lib/firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";
import { getInvoices } from "@/lib/firebase/firestore";
import type { Invoice } from "@/lib/types";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DashboardPage() {
    const { t, formatCurrency } = useLocale();
    const [user, authLoading, authError] = useAuthState(auth);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [dbLoading, setDbLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            if (user) {
                setDbLoading(true);
                try {
                    const userInvoices = await getInvoices(user.uid);
                    setInvoices(userInvoices);
                } catch (e: any) {
                    console.error("Error fetching invoices:", e);
                } finally {
                    setDbLoading(false);
                }
            } else if (!authLoading) {
                setDbLoading(false);
            }
        };
        fetchInvoices();
    }, [user, authLoading]);

    const dashboardData = React.useMemo(() => {
        const totalRevenue = invoices
            .filter(inv => inv.status === 'Paid')
            .reduce((sum, inv) => sum + inv.subtotal, 0);

        const paidInvoices = invoices.filter(inv => inv.status === 'Paid').length;
        const pendingInvoices = invoices.filter(inv => inv.status === 'Pending').length;
        const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue').length;

        return {
            totalRevenue,
            paidInvoices,
            pendingInvoices,
            overdueInvoices,
        };
    }, [invoices]);
    
    const recentInvoices = invoices
        .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
        .slice(0, 5);

    if (authLoading || dbLoading) {
        return <p>Cargando panel...</p>;
    }
    
    if (authError) {
        return <p>Error de autenticación: {authError.message}</p>
    }

    if (!user) {
         return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Acceso Denegado</AlertTitle>
                <AlertDescription>Debes iniciar sesión para ver esta página.</AlertDescription>
            </Alert>
        )
    }

    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalRevenue')}</CardTitle>
              <Banknote className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalRevenue)}</div>
              {/* <p className="text-xs text-muted-foreground">+15.2% from last month</p> */}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{t('dashboard.paidInvoices')}</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.paidInvoices}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard.totalPaidInvoices')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{t('dashboard.pendingInvoices')}</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.pendingInvoices}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard.awaitingPayment')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{t('dashboard.overdueInvoices')}</CardTitle>
              <FileWarning className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.overdueInvoices}</div>
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
                                <TableCell>{formatCurrency(invoice.subtotal)}</TableCell>
                                <TableCell>
                                    <InvoiceStatusBadge status={invoice.status} />
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{format(invoice.dueDate, 'PPP')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    );
}

    