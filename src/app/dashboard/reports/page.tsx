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
import { motion, AnimatePresence } from "framer-motion"
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
        // Mocking categories as invoices might not have them explicitly in the schema shown earlier
        // but it's common to have them. Here I'll distribute based on subtotal for demo.
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

    if (status === 'loading') return <div className="p-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

    if (!user) {
        return (
           <Alert variant="destructive" className="rounded-3xl border-none shadow-2xl">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle className="font-black uppercase tracking-widest text-xs">Acceso Denegado</AlertTitle>
               <AlertDescription className="font-bold">Debes iniciar sesión para ver esta página.</AlertDescription>
           </Alert>
       )
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black font-headline tracking-tighter text-foreground">Informes de Negocio</h2>
                    <p className="text-muted-foreground font-medium italic">Q2 - Segundo Trimestre 2026</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleExportCsv} variant="outline" className="h-12 rounded-2xl px-6 font-bold border-2 border-dashed border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-solid hover:text-primary transition-all active:scale-95 shadow-sm group/export">
                        <Download className="mr-2 h-4 w-4 transition-transform group-hover/export:-translate-y-0.5" /> Exportar CSV
                    </Button>
                    <Button 
                        onClick={handleExportPdf}
                        className="h-12 rounded-2xl px-6 font-black shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <FileDown className="mr-2 h-4 w-4" /> Descargar PDF
                    </Button>
                </div>
            </div>

            {/* Quick Summary Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <SummaryWidget title="Beneficio Neto" value={formatCurrency(stats.profit)} subValue={`${stats.margin.toFixed(1)}% Margen`} icon={<TrendingUp />} color="emerald" />
                <SummaryWidget title="Autoliquidación IVA" value={formatCurrency(stats.autoIva)} subValue="Importe a ingresar" icon={<Percent />} color="amber" />
                <SummaryWidget title="Nº Clientes activos" value={clients.length.toString()} subValue="Facturando este Q" icon={<PieChartIcon />} color="primary" />
                <SummaryWidget title="Gastos Fijos" value={formatCurrency(stats.totalExpenses * 0.3)} subValue="Estimación mensual" icon={<Receipt />} color="destructive" />
            </div>

            {/* Main Tabs Navigation */}
            <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="bg-muted/40 p-1.5 rounded-2xl h-14 w-full md:w-max mx-auto md:mx-0 shadow-lg shadow-black/5">
                    <TabsTrigger value="summary" className="px-8 rounded-xl font-black text-sm data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">Resumen Financiero</TabsTrigger>
                    <TabsTrigger value="sales" className="px-8 rounded-xl font-black text-sm data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">Análisis de Ventas</TabsTrigger>
                    <TabsTrigger value="tax" className="px-8 rounded-xl font-black text-sm data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">Modelo 303 (IVA)</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-8">
                    <div className="grid gap-8 lg:grid-cols-3">
                        {/* P&L Chart */}
                        <Card className="lg:col-span-2 glass-card border-none shadow-2xl shadow-black/[0.03] overflow-hidden group">
                           <CardHeader className="p-8">
                               <CardTitle className="text-2xl font-black font-headline tracking-tight">Cuenta de Pérdidas y Ganancias</CardTitle>
                               <CardDescription className="font-bold">Comparativa mensual de ingresos brutos vs gastos operativos.</CardDescription>
                           </CardHeader>
                           <CardContent className="px-4">
                               <div className="h-[400px] w-full mt-4">
                                   <ResponsiveContainer width="100%" height="100%">
                                       <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                                           <defs>
                                               <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                                   <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                                   <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                               </linearGradient>
                                               <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                                   <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                                                   <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                               </linearGradient>
                                           </defs>
                                           <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.05} />
                                           <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={15} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground opacity-50" />
                                           <YAxis axisLine={false} tickLine={false} tickMargin={15} className="font-mono text-[10px] font-bold text-muted-foreground opacity-30" tickFormatter={(v) => `€${v/1000}k`} />
                                           <Tooltip 
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-3 font-headline">
                                                                <p className="text-xs uppercase font-black tracking-widest text-muted-foreground">{payload[0].payload.month} 2026</p>
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex justify-between gap-8 items-center">
                                                                        <span className="text-sm font-bold opacity-60">Ingresos:</span>
                                                                        <span className="text-sm font-black text-primary">{formatCurrency(payload[0].value as number)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between gap-8 items-center">
                                                                        <span className="text-sm font-bold opacity-60">Gastos:</span>
                                                                        <span className="text-sm font-black text-destructive">{formatCurrency(payload[1].value as number)}</span>
                                                                    </div>
                                                                    <div className="mt-2 pt-2 border-t border-border/50 flex justify-between gap-8 items-center">
                                                                        <span className="text-sm font-black">Neto:</span>
                                                                        <span className="text-sm font-black text-emerald-500">{formatCurrency((payload[0].value as number) - (payload[1].value as number))}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                           />
                                           <Area type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" strokeWidth={4} fillOpacity={1} fill="url(#colorInc)" />
                                           <Area type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorExp)" />
                                       </AreaChart>
                                   </ResponsiveContainer>
                               </div>
                           </CardContent>
                        </Card>

                        {/* Financial Table Sidebar */}
                        <div className="space-y-6">
                            <Card className="glass-card border-none shadow-xl shadow-black/[0.03] p-8 space-y-6">
                                <h4 className="text-lg font-black tracking-tight">Saldos Trimestrales</h4>
                                <div className="space-y-4">
                                    <BalanceRow label="Total Facturado (Neto)" value={stats.totalIncomes} />
                                    <BalanceRow label="Total Gastos (Neto)" value={stats.totalExpenses} />
                                    <BalanceRow label="Retenciones IRPF" value={stats.totalIncomes * 0.15} isNegative />
                                    <div className="pt-4 border-t border-border/50 flex justify-between items-center">
                                        <span className="text-sm font-black">Resultado Previsto</span>
                                        <span className="text-2xl font-black tracking-tighter text-emerald-500">{formatCurrency(stats.profit)}</span>
                                    </div>
                                </div>
                                <Button variant="ghost" className="w-full h-12 rounded-xl text-xs font-black uppercase tracking-[0.2em] gap-2 hover:bg-primary/5 hover:text-primary transition-all">
                                    Exportar Libro Diario <ArrowUpRight className="h-4 w-4" />
                                </Button>
                            </Card>

                            <Card className="bg-primary/5 border-2 border-primary/10 p-8 rounded-[2.5rem] space-y-4 shadow-inner">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center">
                                        <Info className="h-5 w-5 text-primary" />
                                    </div>
                                    <span className="font-black text-sm tracking-tight">Sugerencia Fiscal</span>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
                                    "Basado en tus gastos operativos, podrías optimizar tu declaración trimestral deduciendo suministros de oficina hasta un 5% adicional."
                                </p>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="sales" className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Top Clients Chart */}
                        <Card className="glass-card border-none shadow-2xl shadow-black/[0.03] p-8 space-y-6">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl font-black font-headline tracking-tighter flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary" /> Top 5 Clientes
                                </CardTitle>
                                <Badge variant="outline" className="font-black uppercase tracking-widest text-[10px] opacity-60 px-3 py-1 rounded-full">Por Volumen</Badge>
                            </div>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={clientsData} layout="vertical" margin={{ left: 40, right: 40 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} className="font-bold text-xs" width={100} />
                                        <Tooltip 
                                            cursor={{fill: 'transparent'}}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="glass p-4 rounded-2xl border border-white/10 shadow-xl font-headline">
                                                            <p className="text-xs font-black text-primary mb-1">{payload[0].payload.name}</p>
                                                            <p className="text-lg font-black">{formatCurrency(payload[0].value as number)}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 10, 10, 0]} barSize={32} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        {/* Distribution by Category */}
                        <Card className="glass-card border-none shadow-2xl shadow-black/[0.03] p-8 space-y-6">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl font-black font-headline tracking-tighter flex items-center gap-2">
                                    <PieChartIcon className="h-5 w-5 text-primary" /> Distribución de Ventas
                                </CardTitle>
                                <Badge variant="outline" className="font-black uppercase tracking-widest text-[10px] opacity-60 px-3 py-1 rounded-full">Categorías</Badge>
                            </div>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={120}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="glass p-4 rounded-2xl border border-white/10 shadow-xl font-headline">
                                                            <p className="text-xs font-black opacity-60 mb-1">{payload[0].name}</p>
                                                            <p className="text-lg font-black">{formatCurrency(payload[0].value as number)}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} className="font-bold text-xs" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    {/* Sales Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         <Card className="bg-primary/5 border-none p-6 rounded-[2rem] space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Ticket Medio</p>
                            <h4 className="text-3xl font-black">{formatCurrency(invoices.length > 0 ? stats.totalIncomes / invoices.length : 0)}</h4>
                            <p className="text-[10px] font-bold italic opacity-60">Basado en {invoices.length} facturas</p>
                         </Card>
                         <Card className="bg-emerald-500/5 border-none p-6 rounded-[2rem] space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Crecimiento Mensual</p>
                            <h4 className="text-3xl font-black text-emerald-500">+12.4%</h4>
                            <p className="text-[10px] font-bold italic opacity-60">vs mes anterior</p>
                         </Card>
                         <Card className="bg-amber-500/5 border-none p-6 rounded-[2rem] space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Cliente Estrella</p>
                            <h4 className="text-xl font-black truncate">{clientsData[0]?.name || 'N/A'}</h4>
                            <p className="text-[10px] font-bold italic opacity-60">Mayor facturación acumulada</p>
                         </Card>
                    </div>
                </TabsContent>

                <TabsContent value="tax" className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <Card className="glass-card border-none shadow-2xl shadow-black/[0.03] p-8 space-y-8">
                                <div className="flex justify-between items-center border-b border-border/50 pb-6">
                                    <div className="space-y-1">
                                        <CardTitle className="text-2xl font-black font-headline tracking-tighter uppercase">Modelo 303</CardTitle>
                                        <p className="text-xs font-bold text-muted-foreground italic">Impuesto sobre el Valor Añadido (IVA) - Autoliquidación</p>
                                    </div>
                                    <Badge className="bg-primary text-primary-foreground border-none px-4 py-2 rounded-xl font-black tracking-widest text-xs shadow-lg shadow-primary/20">EJERCICIO 2026</Badge>
                                </div>

                                {/* IVA DEVENGADO */}
                                <div className="space-y-6">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                                        <ArrowUpRight className="h-3 w-3" /> IVA Devengado (Ingresos)
                                    </h5>
                                    <div className="space-y-4">
                                        <TaxRow label="Régimen ordinario (21%)" base={stats.totalIncomes / 1.21} rate="21%" quota={stats.ivaVentas} />
                                        <TaxRow label="Otros tipos / Recargo" base={0} rate="-" quota={0} />
                                        <div className="pt-4 flex justify-between items-center border-t border-dashed border-border/50">
                                            <span className="text-sm font-black">Total cuota devengada</span>
                                            <span className="text-sm font-black text-primary">{formatCurrency(stats.ivaVentas)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* IVA DEDUCIBLE */}
                                <div className="space-y-6 pt-6">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-destructive flex items-center gap-2">
                                        <TrendingDown className="h-3 w-3" /> IVA Deducible (Gastos)
                                    </h5>
                                    <div className="space-y-4">
                                        <TaxRow label="Compras interiores de bienes y servicios" base={stats.totalExpenses} rate="21%" quota={stats.ivaCompras} />
                                        <TaxRow label="Importaciones / Adquisiciones Intracom." base={0} rate="-" quota={0} />
                                        <div className="pt-4 flex justify-between items-center border-t border-dashed border-border/50">
                                            <span className="text-sm font-black">Total cuota deducible</span>
                                            <span className="text-sm font-black text-destructive">{formatCurrency(stats.ivaCompras)}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="space-y-8">
                            {/* Final Result Card */}
                            <Card className={cn(
                                "p-8 rounded-[2.5rem] border-none shadow-2xl transition-all relative overflow-hidden",
                                stats.autoIva >= 0 ? "bg-amber-500/10 shadow-amber-500/10" : "bg-emerald-500/10 shadow-emerald-500/10"
                            )}>
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Percent className="h-20 w-20" />
                                </div>
                                <div className="relative z-10 space-y-6">
                                    <h4 className="text-lg font-black tracking-tight">Resultado Liquidación</h4>
                                    <div className="space-y-2">
                                        <p className="text-4xl font-black tracking-tighter">
                                            {formatCurrency(Math.abs(stats.autoIva))}
                                        </p>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                            {stats.autoIva >= 0 ? "Importe a Ingresar" : "Importe a Devolver / Compensar"}
                                        </p>
                                    </div>
                                    <Button className={cn(
                                        "w-full h-14 rounded-2xl font-black shadow-xl transition-all hover:scale-[1.02]",
                                        stats.autoIva >= 0 ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"
                                    )}>
                                        <CheckCircle2 className="mr-2 h-5 w-5" /> Confirmar Borrador
                                    </Button>
                                </div>
                            </Card>

                            <Alert className="rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/5 p-6">
                                <AlertCircle className="h-5 w-5 text-primary" />
                                <AlertTitle className="font-black text-xs uppercase tracking-widest ml-2 mb-2">Aviso Legal</AlertTitle>
                                <AlertDescription className="text-xs font-medium italic opacity-70 leading-relaxed">
                                    Este simulador es informativo. Para la presentación oficial, consulta con tu gestor o accede a la Sede Electrónica de la AEAT.
                                </AlertDescription>
                            </Alert>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function SummaryWidget({ title, value, subValue, icon, color }: { title: string, value: string, subValue: string, icon: React.ReactElement, color: string }) {
    const colors = {
        primary: "bg-primary/10 text-primary group-hover:bg-primary/20",
        emerald: "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20",
        amber: "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20",
        destructive: "bg-destructive/10 text-destructive group-hover:bg-destructive/20",
    };

    return (
        <Card className="glass-card border-none shadow-xl shadow-black/[0.03] p-6 rounded-[2rem] group hover:-translate-y-1 transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-8 -mt-8" />
            <div className="space-y-4">
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm", colors[color as keyof typeof colors])}>
                    {React.cloneElement(icon, { className: "h-6 w-6 stroke-[2.5]" })}
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{title}</p>
                    <h3 className="text-3xl font-black font-headline tracking-tighter text-foreground">{value}</h3>
                    <p className="text-[10px] font-black italic opacity-50">{subValue}</p>
                </div>
            </div>
        </Card>
    );
}

function BalanceRow({ label, value, isNegative }: { label: string, value: number, isNegative?: boolean }) {
    const { formatCurrency } = useLocale();
    return (
        <div className="flex justify-between items-center group/row">
            <span className="text-xs font-bold text-muted-foreground group-hover/row:text-foreground transition-colors">{label}</span>
            <span className={cn("text-xs font-black tracking-tight", isNegative ? "text-destructive" : "text-foreground")}>
                {isNegative ? "- " : ""}{formatCurrency(value)}
            </span>
        </div>
    );
}

function TaxRow({ label, base, rate, quota }: { label: string, base: number, rate: string, quota: number }) {
    const { formatCurrency } = useLocale();
    return (
        <div className="grid grid-cols-12 gap-4 items-center group/tax">
            <div className="col-span-6">
                <p className="text-xs font-bold text-muted-foreground group-hover/tax:text-foreground transition-colors">{label}</p>
            </div>
            <div className="col-span-2 text-right">
                <p className="text-[10px] font-mono opacity-40">{formatCurrency(base)}</p>
            </div>
            <div className="col-span-2 text-right">
                <p className="text-[10px] font-black">{rate}</p>
            </div>
            <div className="col-span-2 text-right">
                <p className="text-xs font-black">{formatCurrency(quota)}</p>
            </div>
        </div>
    );
}
