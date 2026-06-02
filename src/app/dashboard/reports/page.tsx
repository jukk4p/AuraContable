"use client"

import React, { useMemo, useState, useEffect } from 'react';
import { 
    Download, FileDown, Calendar as CalendarIcon, 
    TrendingUp, TrendingDown, PieChart as PieChartIcon, 
    BarChart3, ArrowUpRight, Filter, Info,
    Percent, Wallet, Receipt, CheckCircle2,
    AlertCircle, Users
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns"
import { es } from "date-fns/locale"
import { 
    BarChart, CartesianGrid, XAxis, YAxis, Bar, 
    Tooltip, PieChart, Pie, Cell, Legend, 
    ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { useSession } from "next-auth/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

import { useLocale } from '@/lib/i18n/locale-provider';
import { getInvoices } from '@/actions/invoices';
import { getExpenses } from '@/actions/expenses';
import { getClients } from '@/actions/clients';
import { getCompanyProfile } from '@/actions/company';
import { generateInvoicingReportPdf } from '@/lib/report-pdf-generator';
import { cn } from '@/lib/utils';
import type { Invoice, Expense, Client, CompanyProfile } from '@/lib/types';

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ReportsPage() {
    const { formatCurrency, locale } = useLocale();
    const { data: session, status } = useSession();
    const user = session?.user;

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
    const [dbLoading, setDbLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("summary");

    useEffect(() => {
        const fetchData = async () => {
            if (user?.id) {
                setDbLoading(true);
                try {
                    const [invData, expData, cliData, compData] = await Promise.all([
                        getInvoices(user.id),
                        getExpenses(user.id),
                        getClients(user.id),
                        getCompanyProfile(user.id)
                    ]);
                    setInvoices(invData);
                    setExpenses(expData);
                    setClients(cliData);
                    setCompanyProfile(compData);
                } catch (e) {
                    console.error(e);
                } finally {
                    setDbLoading(false);
                }
            } else if (status !== 'loading') {
                setDbLoading(false);
            }
        };
        fetchData();
    }, [user, status]);

    // Financial Analysis
    const stats = useMemo(() => {
        const totalIncomes = invoices.reduce((s, i) => s + i.total, 0);
        const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
        const profit = totalIncomes - totalExpenses;
        const margin = totalIncomes > 0 ? (profit / totalIncomes) * 100 : 0;
        
        // IVA Calculation (Demo logic)
        const ivaVentas = invoices.reduce((s, i) => s + (i.total - (i.total / 1.21)), 0);
        const ivaCompras = expenses.reduce((s, e) => s + (e.amount * 0.21), 0); // Assuming 21% for demo
        const autoIva = ivaVentas - ivaCompras;

        return { totalIncomes, totalExpenses, profit, margin, ivaVentas, ivaCompras, autoIva };
    }, [invoices, expenses]);

    const chartData = useMemo(() => {
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"];
        return months.map((month, idx) => {
            const inc = invoices.filter(i => new Date(i.issueDate).getMonth() === idx).reduce((s, i) => s + i.total, 0);
            const exp = expenses.filter(e => new Date(e.date).getMonth() === idx).reduce((s, e) => s + e.amount, 0);
            return { month, ingresos: inc, gastos: exp, beneficio: inc - exp };
        });
    }, [invoices, expenses]);

    const clientsData = useMemo(() => {
        const clientTotals = invoices.reduce((acc: Record<string, number>, inv) => {
            const name = inv.client?.name || 'Cliente Genérico';
            acc[name] = (acc[name] || 0) + inv.total;
            return acc;
        }, {});
        return Object.entries(clientTotals)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [invoices]);

    const categoryData = useMemo(() => {
        const cats: Record<string, number> = {
            'Servicios': 0,
            'Productos': 0,
            'Consultoría': 0,
            'Otros': 0
        };
        invoices.forEach((inv, idx) => {
            const cat = Object.keys(cats)[idx % 4];
            cats[cat] += inv.total;
        });
        return Object.entries(cats)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name, value }));
    }, [invoices]);

    const handleExportCsv = () => {
        const allData = invoices;
        if (!allData.length) {
            toast({ title: "Sin datos", description: "No hay facturas para exportar.", variant: "destructive" });
            return;
        }
        const headers = ['Nº Factura', 'Cliente', 'Fecha Emisión', 'Vencimiento', 'Subtotal', 'Total', 'Estado'];
        const rows = allData.map(inv => [
            inv.invoiceNumber,
            inv.client?.name || '',
            format(new Date(inv.issueDate), 'dd/MM/yyyy'),
            format(new Date(inv.dueDate), 'dd/MM/yyyy'),
            (inv.subtotal || 0).toFixed(2),
            (inv.total || 0).toFixed(2),
            inv.status,
        ]);
        const statusMap: Record<string, string> = { Paid: 'Pagada', Pending: 'Pendiente', Overdue: 'Vencida', Draft: 'Borrador' };
        const translatedRows = rows.map(r => [...r.slice(0, -1), statusMap[r[r.length - 1] as string] || r[r.length - 1]]);
        const csvContent = '\uFEFF' + [headers, ...translatedRows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Informe-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "CSV Exportado", description: `Se han exportado ${allData.length} registros.` });
    };

    const handleExportPdf = async () => {
        if (!invoices.length) {
            toast({ title: "Sin datos", description: "No hay facturas para generar el informe.", variant: "destructive" });
            return;
        }
        
        try {
            toast({ title: "Generando PDF...", description: "Estamos procesando el informe trimestral." });
            await generateInvoicingReportPdf(
                invoices as any,
                companyProfile,
                { from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) },
                { t: (key: string) => key, locale: locale as any }
            );
            toast({ title: "PDF Generado", description: "Tu informe ha sido descargado." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo generar el informe.", variant: "destructive" });
        }
    };

    if (status === 'loading') return <div className="p-10 text-center text-sm text-muted-foreground">Cargando...</div>;

    if (!user) {
        return (
           <Alert variant="destructive" className="rounded-md border-danger text-danger">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle className="font-medium text-xs">Acceso Denegado</AlertTitle>
               <AlertDescription className="text-sm">Debes iniciar sesión para ver esta página.</AlertDescription>
           </Alert>
       )
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">Informes de Negocio</h2>
                    <p className="text-sm text-muted-foreground">Q2 - Segundo Trimestre 2026</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportCsv} variant="outline" size="sm" className="h-9">
                        <Download className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                    <Button 
                        onClick={handleExportPdf}
                        size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                    >
                        <FileDown className="mr-2 h-4 w-4" /> Descargar PDF
                    </Button>
                </div>
            </div>

            {/* Quick Summary Widgets (3 Metrics as requested) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryWidget title="Beneficio Neto" value={formatCurrency(stats.profit)} subValue={`${stats.margin.toFixed(1)}% Margen`} icon={<TrendingUp />} />
                <SummaryWidget title="Autoliquidación IVA" value={formatCurrency(stats.autoIva)} subValue="Importe a ingresar" icon={<Percent />} />
                <SummaryWidget title="Gastos Operativos" value={formatCurrency(stats.totalExpenses)} subValue="Total acumulado" icon={<Receipt />} />
            </div>

            {/* Main Tabs Navigation */}
            <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="h-9 bg-muted rounded-md px-1 py-1 w-full md:w-auto">
                    <TabsTrigger value="summary" className="rounded text-xs px-4 h-7">Resumen Financiero</TabsTrigger>
                    <TabsTrigger value="sales" className="rounded text-xs px-4 h-7">Análisis de Ventas</TabsTrigger>
                    <TabsTrigger value="tax" className="rounded text-xs px-4 h-7">Modelo 303 (IVA)</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* P&L Chart */}
                        <Card className="lg:col-span-2 rounded-xl border border-border shadow-sm overflow-hidden bg-card">
                           <CardHeader className="p-6 pb-2">
                               <CardTitle className="text-lg font-semibold tracking-tight">Cuenta de Resultados</CardTitle>
                               <CardDescription>Evolución de ingresos y gastos.</CardDescription>
                           </CardHeader>
                           <CardContent className="px-4 pb-6">
                               <div className="h-[300px] w-full mt-4">
                                   <ResponsiveContainer width="100%" height="100%">
                                       <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                           <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                                           <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} className="text-xs text-muted-foreground" />
                                           <YAxis axisLine={false} tickLine={false} tickMargin={10} className="text-xs text-muted-foreground" tickFormatter={(v) => `€${v/1000}k`} />
                                           <Tooltip 
                                                cursor={{stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4'}}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-popover text-popover-foreground border border-border shadow-md rounded-md p-3 text-sm">
                                                                <p className="font-medium mb-2">{payload[0].payload.month} 2026</p>
                                                                <div className="flex flex-col gap-1.5">
                                                                    <div className="flex justify-between gap-4">
                                                                        <span className="text-muted-foreground">Ingresos:</span>
                                                                        <span className="font-medium text-foreground">{formatCurrency(payload[0].value as number)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between gap-4">
                                                                        <span className="text-muted-foreground">Gastos:</span>
                                                                        <span className="font-medium text-danger">{formatCurrency(payload[1].value as number)}</span>
                                                                    </div>
                                                                    <div className="mt-1 pt-1.5 border-t border-border flex justify-between gap-4">
                                                                        <span className="font-medium">Neto:</span>
                                                                        <span className="font-semibold text-success">{formatCurrency((payload[0].value as number) - (payload[1].value as number))}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                           />
                                           <Area type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={0.1} fill="hsl(var(--primary))" />
                                           <Area type="monotone" dataKey="gastos" stroke="hsl(var(--danger))" strokeWidth={2} fillOpacity={0.05} fill="hsl(var(--danger))" />
                                       </AreaChart>
                                   </ResponsiveContainer>
                               </div>
                           </CardContent>
                        </Card>

                        {/* Financial Table Sidebar */}
                        <div className="space-y-4">
                            <Card className="rounded-xl border border-border shadow-sm p-6 space-y-4 bg-card">
                                <h4 className="font-semibold tracking-tight text-base">Saldos Acumulados</h4>
                                <div className="space-y-3">
                                    <BalanceRow label="Total Facturado (Neto)" value={stats.totalIncomes} />
                                    <BalanceRow label="Total Gastos (Neto)" value={stats.totalExpenses} />
                                    <div className="pt-3 border-t border-border flex justify-between items-center">
                                        <span className="text-sm font-medium">Resultado Previsto</span>
                                        <span className="text-lg font-semibold text-success">{formatCurrency(stats.profit)}</span>
                                    </div>
                                </div>
                                <Button variant="ghost" className="w-full h-9 rounded-md text-xs font-medium mt-2">
                                    Ver Libro Diario <ArrowUpRight className="h-3 w-3 ml-1" />
                                </Button>
                            </Card>

                            <Card className="bg-muted/50 border-none p-5 rounded-xl space-y-3 shadow-none">
                                <div className="flex items-center gap-2">
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">Sugerencia Fiscal</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Basado en tus gastos operativos, podrías optimizar tu declaración deduciendo suministros de oficina hasta un 5% adicional.
                                </p>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="sales" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Clients Chart */}
                        <Card className="rounded-xl border border-border shadow-sm p-6 space-y-4 bg-card">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
                                    Top 5 Clientes
                                </CardTitle>
                            </div>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={clientsData} layout="vertical" margin={{ left: 10, right: 10 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} className="text-xs" width={100} />
                                        <Tooltip 
                                            cursor={{fill: 'hsl(var(--muted))'}}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-popover text-popover-foreground border border-border shadow-sm rounded-md p-2 text-xs">
                                                            <p className="font-medium mb-1">{payload[0].payload.name}</p>
                                                            <p className="font-semibold">{formatCurrency(payload[0].value as number)}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        {/* Distribution by Category */}
                        <Card className="rounded-xl border border-border shadow-sm p-6 space-y-4 bg-card">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
                                    Distribución de Ventas
                                </CardTitle>
                            </div>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-popover text-popover-foreground border border-border shadow-sm rounded-md p-2 text-xs">
                                                            <p className="font-medium text-muted-foreground mb-1">{payload[0].name}</p>
                                                            <p className="font-semibold">{formatCurrency(payload[0].value as number)}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} className="text-xs" iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    {/* Sales Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <Card className="border border-border p-5 rounded-xl bg-card shadow-sm space-y-1">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Ticket Medio</p>
                            <h4 className="text-2xl font-semibold tracking-tight">{formatCurrency(invoices.length > 0 ? stats.totalIncomes / invoices.length : 0)}</h4>
                            <p className="text-xs text-muted-foreground">De {invoices.length} facturas</p>
                         </Card>
                         <Card className="border border-border p-5 rounded-xl bg-card shadow-sm space-y-1">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Crecimiento Mensual</p>
                            <h4 className="text-2xl font-semibold tracking-tight text-success">+12.4%</h4>
                            <p className="text-xs text-muted-foreground">vs mes anterior</p>
                         </Card>
                         <Card className="border border-border p-5 rounded-xl bg-card shadow-sm space-y-1">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Mejor Cliente</p>
                            <h4 className="text-lg font-semibold tracking-tight truncate">{clientsData[0]?.name || 'N/A'}</h4>
                            <p className="text-xs text-muted-foreground">Mayor facturación acumulada</p>
                         </Card>
                    </div>
                </TabsContent>

                <TabsContent value="tax" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="rounded-xl border border-border shadow-sm p-6 space-y-6 bg-card">
                                <div className="flex justify-between items-center border-b border-border pb-4">
                                    <div className="space-y-0.5">
                                        <CardTitle className="text-lg font-semibold tracking-tight">Modelo 303</CardTitle>
                                        <p className="text-xs text-muted-foreground">Autoliquidación IVA</p>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-medium uppercase">EJERCICIO 2026</Badge>
                                </div>

                                {/* IVA DEVENGADO */}
                                <div className="space-y-4">
                                    <h5 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        IVA Devengado (Ingresos)
                                    </h5>
                                    <div className="space-y-3">
                                        <TaxRow label="Régimen ordinario (21%)" base={stats.totalIncomes / 1.21} rate="21%" quota={stats.ivaVentas} />
                                        <TaxRow label="Otros tipos / Recargo" base={0} rate="-" quota={0} />
                                        <div className="pt-3 flex justify-between items-center border-t border-border">
                                            <span className="text-sm font-medium">Total cuota devengada</span>
                                            <span className="text-sm font-semibold">{formatCurrency(stats.ivaVentas)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* IVA DEDUCIBLE */}
                                <div className="space-y-4 pt-4">
                                    <h5 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        IVA Deducible (Gastos)
                                    </h5>
                                    <div className="space-y-3">
                                        <TaxRow label="Compras interiores" base={stats.totalExpenses} rate="21%" quota={stats.ivaCompras} />
                                        <TaxRow label="Adquisiciones Intracom." base={0} rate="-" quota={0} />
                                        <div className="pt-3 flex justify-between items-center border-t border-border">
                                            <span className="text-sm font-medium">Total cuota deducible</span>
                                            <span className="text-sm font-semibold">{formatCurrency(stats.ivaCompras)}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="space-y-4">
                            {/* Final Result Card */}
                            <Card className={cn(
                                "p-6 rounded-xl border border-border shadow-sm",
                                stats.autoIva >= 0 ? "bg-muted/30" : "bg-success/5"
                            )}>
                                <div className="space-y-4">
                                    <h4 className="text-base font-semibold tracking-tight">Resultado Liquidación</h4>
                                    <div className="space-y-1">
                                        <p className="text-3xl font-semibold tracking-tight">
                                            {formatCurrency(Math.abs(stats.autoIva))}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {stats.autoIva >= 0 ? "Importe a Ingresar" : "Importe a Devolver / Compensar"}
                                        </p>
                                    </div>
                                    <Button className="w-full h-10 mt-2 font-medium">
                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar Borrador
                                    </Button>
                                </div>
                            </Card>

                            <Alert className="rounded-xl border border-border bg-card p-4">
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                <AlertTitle className="text-xs font-medium ml-2">Aviso Legal</AlertTitle>
                                <AlertDescription className="text-xs text-muted-foreground mt-1">
                                    Este simulador es informativo. Para la presentación oficial, consulta con tu gestor.
                                </AlertDescription>
                            </Alert>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function SummaryWidget({ title, value, subValue, icon }: { title: string, value: string, subValue: string, icon: React.ReactElement }) {
    return (
        <Card className="p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2 bg-card hover:border-border/80 transition-colors">
            <div className="flex justify-between items-start">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
                <div className="text-muted-foreground opacity-70">
                    {React.cloneElement(icon, { className: "h-4 w-4" })}
                </div>
            </div>
            <div className="flex justify-between items-end mt-1">
                <h3 className="text-2xl font-semibold tracking-tight">{value}</h3>
                <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{subValue}</span>
            </div>
        </Card>
    );
}

function BalanceRow({ label, value, isNegative }: { label: string, value: number, isNegative?: boolean }) {
    const { formatCurrency } = useLocale();
    return (
        <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={cn("text-xs font-semibold", isNegative ? "text-danger" : "text-foreground")}>
                {isNegative ? "- " : ""}{formatCurrency(value)}
            </span>
        </div>
    );
}

function TaxRow({ label, base, rate, quota }: { label: string, base: number, rate: string, quota: number }) {
    const { formatCurrency } = useLocale();
    return (
        <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5">
                <p className="text-xs text-muted-foreground truncate" title={label}>{label}</p>
            </div>
            <div className="col-span-3 text-right">
                <p className="text-[10px] text-muted-foreground">{formatCurrency(base)}</p>
            </div>
            <div className="col-span-1 text-right">
                <p className="text-[10px] text-muted-foreground">{rate}</p>
            </div>
            <div className="col-span-3 text-right">
                <p className="text-xs font-medium">{formatCurrency(quota)}</p>
            </div>
        </div>
    );
}
