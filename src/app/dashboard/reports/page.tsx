
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Download, FileDown, Calendar as CalendarIcon, AlertCircle, MailWarning } from 'lucide-react';
import { DateRange } from "react-day-picker"
import { addDays, format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useLocale } from '@/lib/i18n/locale-provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase/config';
import { getInvoices, getExpenses } from '@/lib/firebase/firestore';
import type { Invoice, Expense, ReportData } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, Tooltip } from 'recharts';

export default function ReportsPage() {
    const { t } = useLocale();
    const [user, authLoading, authError] = useAuthState(auth);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [dbLoading, setDbLoading] = useState(true);

    const [date, setDate] = React.useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    })

    useEffect(() => {
        const fetchData = async () => {
            if (user && user.emailVerified) {
                setDbLoading(true);
                try {
                    const [userInvoices, userExpenses] = await Promise.all([
                        getInvoices(user.uid),
                        getExpenses(user.uid)
                    ]);
                    setInvoices(userInvoices);
                    setExpenses(userExpenses);
                } catch (e) {
                    console.error("Error fetching data for reports:", e);
                } finally {
                    setDbLoading(false);
                }
            } else if (!authLoading) {
                 setDbLoading(false);
            }
        };
        fetchData();
    }, [user, authLoading]);

    const filteredData = useMemo(() => {
        const from = date?.from;
        const to = date?.to;
        
        const filteredInvoices = from && to 
            ? invoices.filter(inv => inv.issueDate >= from && inv.issueDate <= to)
            : invoices;
        
        const filteredExpenses = from && to
            ? expenses.filter(exp => exp.date >= from && exp.date <= to)
            : expenses;

        return { invoices: filteredInvoices, expenses: filteredExpenses };
    }, [invoices, expenses, date]);


    if (authLoading) return <p>Cargando...</p>;
    if (authError) return <p>Error de autenticación: {authError.message}</p>;
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
        return <p>Generando informes...</p>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold font-headline">{t('nav.reports')}</h1>
                    <p className="text-muted-foreground">{t('reports.description')}</p>
                </div>
                 <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-[260px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                            date.to ? (
                                <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                            ) : (
                            <span>{t('newInvoice.pickDate')}</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="sm" onClick={() => setDate({from: startOfMonth(new Date()), to: endOfMonth(new Date())})}>Este Mes</Button>
                    <Button variant="outline" size="sm" onClick={() => setDate({from: startOfQuarter(new Date()), to: endOfQuarter(new Date())})}>Este Trimestre</Button>
                    <Button variant="outline" size="sm" onClick={() => setDate({from: startOfYear(new Date()), to: endOfYear(new Date())})}>Este Año</Button>
                 </div>
            </div>

            <Tabs defaultValue="invoicing">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="invoicing">{t('nav.invoices')}</TabsTrigger>
                        <TabsTrigger value="expenses">{t('nav.expenses')}</TabsTrigger>
                        <TabsTrigger value="summary">Resumen</TabsTrigger>
                    </TabsList>
                     <div className="flex items-center gap-2">
                        <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Exportar a PDF</Button>
                        <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Exportar a CSV</Button>
                    </div>
                </div>

                <TabsContent value="invoicing">
                    <InvoicingReport data={filteredData.invoices} />
                </TabsContent>
                <TabsContent value="expenses">
                    <p>Informes de gastos próximamente.</p>
                </TabsContent>
                <TabsContent value="summary">
                    <p>Resumen de Ingresos vs Gastos próximamente.</p>
                </TabsContent>

            </Tabs>
        </div>
    );
}

const chartConfig = {
  total: { label: "Total" },
  paid: { label: "Pagadas", color: "hsl(var(--chart-2))" },
  pending: { label: "Pendientes", color: "hsl(var(--chart-4))" },
  overdue: { label: "Vencidas", color: "hsl(var(--destructive))" },
} satisfies ChartConfig

function InvoicingReport({ data }: { data: Invoice[] }) {
    const { t, formatCurrency } = useLocale();

    const reportData: ReportData = useMemo(() => {
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
    }, [data]);
    
    return (
        <div className="space-y-6 mt-4">
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader><CardTitle>Total Facturado</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{formatCurrency(reportData.totalAmount)}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Total Cobrado</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{formatCurrency(reportData.totalPaid)}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Impuestos</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{formatCurrency(reportData.totalTaxes)}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Nº de Facturas</CardTitle></CardHeader>
                    <CardContent className="text-sm">
                        <p>Pagadas: {reportData.paidCount}</p>
                        <p>Pendientes: {reportData.pendingCount}</p>
                        <p>Vencidas: {reportData.overdueCount}</p>
                        <p className="font-bold mt-1">Total: {reportData.totalCount}</p>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Facturación Mensual</CardTitle>
                    <CardDescription>Evolución de la facturación en el periodo seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <BarChart data={reportData.monthlyData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis 
                                dataKey="month" 
                                tickFormatter={(value) => format(new Date(value), 'MMM yy')}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis 
                                tickFormatter={(value) => formatCurrency(value)}
                                tickLine={false}
                                axisLine={false}
                                width={80}
                            />
                            <Tooltip
                                cursor={false}
                                content={<ChartTooltipContent
                                    formatter={(value, name) => (
                                        <div className='flex flex-col'>
                                            <span className='font-bold'>{formatCurrency(value as number)}</span>
                                            <span className='text-xs text-muted-foreground'>{chartConfig[name as keyof typeof chartConfig]?.label}</span>
                                        </div>
                                    )}
                                />}
                            />
                            <Bar dataKey="paid" stackId="a" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]}/>
                            <Bar dataKey="pending" stackId="a" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]}/>
                            <Bar dataKey="overdue" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]}/>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    )
}

