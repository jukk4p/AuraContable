
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, Banknote, Users, FileWarning, CheckCircle2, AlertCircle, MailWarning } from "lucide-react";
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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";


export default function DashboardPage() {
    const { t, formatCurrency } = useLocale();
    const [user, authLoading, authError] = useAuthState(auth);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [dbLoading, setDbLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            if (user && user.emailVerified) {
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

    const { dashboardData, chartData } = React.useMemo(() => {
        const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
        const pendingInvoices = invoices.filter(inv => inv.status === 'Pending');
        const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue');
        
        const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);

        const dashboardData = {
            totalRevenue,
            paidInvoices: paidInvoices.length,
            pendingInvoices: pendingInvoices.length,
            overdueInvoices: overdueInvoices.length,
        };

        const chartData = [
            { status: t('invoices.statusPaid'), count: paidInvoices.length, fill: "hsl(var(--chart-2))" },
            { status: t('invoices.statusPending'), count: pendingInvoices.length, fill: "hsl(var(--chart-4))" },
            { status: t('invoices.statusOverdue'), count: overdueInvoices.length, fill: "hsl(var(--destructive))" },
        ];

        return { dashboardData, chartData };
    }, [invoices, t]);
    
     const chartConfig = {
        count: {
            label: "Facturas",
        },
        [t('invoices.statusPaid')]: {
            label: t('invoices.statusPaid'),
            color: "hsl(var(--chart-2))",
        },
        [t('invoices.statusPending')]: {
            label: t('invoices.statusPending'),
            color: "hsl(var(--chart-4))",
        },
        [t('invoices.statusOverdue')]: {
            label: t('invoices.statusOverdue'),
            color: "hsl(var(--destructive))",
        },
    } satisfies ChartConfig

    const recentInvoices = invoices
        .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
        .slice(0, 5);

    if (authLoading) {
        return <p>Cargando...</p>;
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

    if (!user.emailVerified) {
        return (
            <Alert variant="destructive">
                <MailWarning className="h-4 w-4" />
                <AlertTitle>Verifica tu correo electrónico</AlertTitle>
                <AlertDescription>
                    Hemos enviado un correo de verificación a tu dirección. Por favor, revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta y poder continuar.
                </AlertDescription>
            </Alert>
        )
    }

    if (dbLoading) {
        return <p>Cargando panel...</p>;
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
        
         <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
                 <CardHeader>
                    <CardTitle>Resumen de Facturas</CardTitle>
                    <CardDescription>Un conteo rápido del estado de tus facturas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                         <BarChart accessibilityLayer data={chartData} margin={{ top: 20 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="status"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                            />
                             <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                allowDecimals={false}
                             />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Bar dataKey="count" radius={8}>
                                {chartData.map((entry) => (
                                    <Bar key={entry.status} dataKey="count" fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card className="col-span-1">
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
                                <TableHead>{t('invoices.status')}</TableHead>
                                <TableHead className="text-right">{t('invoices.amount')}</TableHead>
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
                                    <TableCell>
                                        <InvoiceStatusBadge status={invoice.status} />
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    );

    