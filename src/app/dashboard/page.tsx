"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from 'next/link';
import { 
    FileText, Users, Receipt, CheckCircle2,
    TrendingUp, TrendingDown, Wallet, FileWarning,
    Calendar, AlertTriangle, AlertCircle
} from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useLocale } from "@/lib/i18n/locale-provider";
import { getInvoices } from "@/actions/invoices";
import { getExpenses } from "@/actions/expenses";
import { getClients } from "@/actions/clients";
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';

const DashboardChart = dynamic(() => import('@/components/dashboard/dashboard-chart'), { 
    ssr: false,
    loading: () => <div className="h-[300px] w-full flex items-center justify-center bg-muted/20 rounded-md animate-pulse">Cargando gráfico...</div>
});

export default function DashboardPage() {
    const { formatCurrency } = useLocale();
    const { data: session, status } = useSession();
    const user = session?.user;

    const [invoices, setInvoices] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [dbLoading, setDbLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (user?.id) {
                setDbLoading(true);
                try {
                    const [invData, cliData, expData] = await Promise.all([
                        getInvoices(user.id),
                        getClients(user.id),
                        getExpenses(user.id)
                    ]);
                    setInvoices(invData);
                    setClients(cliData);
                    setExpenses(expData);
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

    const stats = useMemo(() => {
        const paid = invoices.filter(i => i.status === 'Paid');
        const pending = invoices.filter(i => i.status === 'Pending');
        const overdue = invoices.filter(i => i.status === 'Overdue');

        const totalIncome = paid.reduce((sum, i) => sum + (i.total || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const cashFlow = totalIncome - totalExpenses;

        return {
            income: totalIncome,
            expenses: totalExpenses,
            cashFlow,
            pendingCount: pending.length,
            overdueCount: overdue.length,
        };
    }, [invoices, expenses]);

    const chartData = useMemo(() => {
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"];
        return months.map((month, idx) => {
            const income = invoices
                .filter(i => i.status === 'Paid' && new Date(i.issueDate).getMonth() === idx)
                .reduce((s, i) => s + i.total, 0);
            const exp = expenses
                .filter(e => new Date(e.date).getMonth() === idx)
                .reduce((s, e) => s + e.amount, 0);

            return {
                name: month,
                ingresos: Math.round(income),
                gastos: Math.round(exp)
            };
        });
    }, [invoices, expenses]);

    const topClients = useMemo(() => {
        return clients
            .map(c => ({
                ...c,
                total: invoices.filter(i => i.clientId === c.id).reduce((s, i) => s + (i.total || 0), 0)
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [clients, invoices]);

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

    const needsAlert = stats.cashFlow < 0 || stats.overdueCount > 0;

    return (
      <div className="space-y-6">
        {needsAlert && (
            <Alert className="bg-danger/10 border-danger/20 text-danger rounded-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4" />
                    <div>
                        <AlertTitle className="font-medium text-sm">Atención requerida</AlertTitle>
                        <AlertDescription className="text-xs">
                            {stats.cashFlow < 0 ? "Tu cash flow actual es negativo. " : ""}
                            {stats.overdueCount > 0 ? `Tienes ${stats.overdueCount} facturas vencidas pendientes de cobro.` : ""}
                        </AlertDescription>
                    </div>
                </div>
                <Link href="/dashboard/invoices">
                    <Button variant="outline" size="sm" className="h-8 text-xs border-danger/20 text-danger hover:bg-danger hover:text-white">Ver facturas</Button>
                </Link>
            </Alert>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard 
                title="Ingresos Cobrados" 
                value={formatCurrency(stats.income)} 
                badge="Al día" 
                badgeVariant="success"
                context="Total cobrado en cuenta"
                icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} 
            />
            <KPICard 
                title="Gastos Acumulados" 
                value={formatCurrency(stats.expenses)} 
                badge="Mensual" 
                badgeVariant="secondary"
                context="Suministros y servicios"
                icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />} 
            />
            <KPICard 
                title="Cash Flow Neto" 
                value={formatCurrency(stats.cashFlow)} 
                badge="Real" 
                badgeVariant={stats.cashFlow >= 0 ? "success" : "danger"}
                context="Liquidez actual"
                icon={<Wallet className="h-4 w-4 text-muted-foreground" />} 
            />
            <KPICard 
                title="Facturas Pendientes" 
                value={stats.pendingCount.toString()} 
                badge={stats.overdueCount > 0 ? `${stats.overdueCount} vencidas` : "0 vencidas"} 
                badgeVariant={stats.overdueCount > 0 ? "danger" : "secondary"}
                context="A la espera de cobro"
                icon={<FileWarning className="h-4 w-4 text-muted-foreground" />} 
            />
        </div>

        {/* Acciones Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-10 w-full justify-start gap-2 font-medium text-sm bg-card hover:bg-muted" asChild>
                <Link href="/dashboard/invoices/new"><FileText className="h-4 w-4" /> Nueva factura</Link>
            </Button>
            <Button variant="outline" className="h-10 w-full justify-start gap-2 font-medium text-sm bg-card hover:bg-muted" asChild>
                <Link href="/dashboard/clients/new"><Users className="h-4 w-4" /> Nuevo cliente</Link>
            </Button>
            <Button variant="outline" className="h-10 w-full justify-start gap-2 font-medium text-sm bg-card hover:bg-muted" asChild>
                <Link href="/dashboard/expenses/new"><Receipt className="h-4 w-4" /> Registrar gasto</Link>
            </Button>
            <Button variant="outline" className="h-10 w-full justify-start gap-2 font-medium text-sm text-success border-success/30 hover:bg-success/5 hover:text-success bg-card" asChild>
                <Link href="/dashboard/invoices"><CheckCircle2 className="h-4 w-4" /> Marcar cobrada</Link>
            </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
                {/* Gráfico Trimestral */}
                <Card className="rounded-xl border border-border shadow-sm bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-medium">Evolución Trimestral</CardTitle>
                            <CardDescription className="text-xs">Ingresos vs Gastos en el periodo actual</CardDescription>
                        </div>
                        <Tabs defaultValue="q1" className="w-auto">
                            <TabsList className="h-8">
                                <TabsTrigger value="q1" className="text-[10px] px-3 h-6">Q1</TabsTrigger>
                                <TabsTrigger value="q2" className="text-[10px] px-3 h-6">Q2</TabsTrigger>
                                <TabsTrigger value="año" className="text-[10px] px-3 h-6">Año</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardHeader>
                    <CardContent>
                        <DashboardChart data={chartData} config={{
                            ingresos: { label: "Ingresos", color: "hsl(var(--primary))" },
                            gastos: { label: "Gastos", color: "hsl(var(--danger))" },
                        }} />
                    </CardContent>
                </Card>

                {/* Top Clientes */}
                <Card className="rounded-xl border border-border shadow-sm bg-card">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base font-medium">Top Clientes</CardTitle>
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground" asChild><Link href="/dashboard/clients">Ver todos</Link></Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {!dbLoading && topClients.length > 0 ? topClients.map((client) => (
                                <div key={client.id} className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-md transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 rounded-md">
                                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium rounded-md">{client.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{client.name}</span>
                                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">{client.email}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-right">
                                        <span className="text-sm font-medium">{formatCurrency(client.total)}</span>
                                        <Badge variant="secondary" className="bg-success/10 text-success text-[10px] uppercase font-medium border-transparent shadow-none px-1.5 h-4 flex items-center">Activo</Badge>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-4 text-center text-xs text-muted-foreground">Sin datos de clientes</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                {/* Agenda Fiscal */}
                <Card className="rounded-xl border border-border shadow-sm bg-card">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            Agenda Fiscal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-3">
                            <div className="mt-0.5"><AlertCircle className="h-4 w-4 text-danger" /></div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">Modelo 303 IVA</p>
                                <p className="text-xs text-muted-foreground">Presentación trimestral del IVA</p>
                                <p className="text-xs font-medium text-danger">En 5 días (20 Jul)</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="mt-0.5"><AlertCircle className="h-4 w-4 text-warning" /></div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">Retenciones IRPF</p>
                                <p className="text-xs text-muted-foreground">Modelo 130 pago fraccionado</p>
                                <p className="text-xs font-medium text-warning">En 5 días (20 Jul)</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="mt-0.5"><AlertCircle className="h-4 w-4 text-primary" /></div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">Avisos pendientes</p>
                                <p className="text-xs text-muted-foreground">3 facturas sin NIF de cliente</p>
                                <p className="text-xs font-medium text-primary cursor-pointer hover:underline">Revisar ahora</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    );
}

function KPICard({ title, value, badge, badgeVariant, context, icon }: { 
    title: string, value: string, badge: string, 
    badgeVariant: 'success' | 'danger' | 'warning' | 'secondary', 
    context: string, icon: React.ReactElement 
}) {
    return (
        <Card className="rounded-xl border border-border shadow-sm p-4 flex flex-col gap-3 bg-card hover:border-border/80 transition-colors">
            <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">{title}</span>
                {icon}
            </div>
            <div className="flex items-end gap-2">
                <h3 className="text-[22px] font-medium leading-none tracking-tight">{value}</h3>
                <Badge variant="secondary" className={cn(
                    "text-[10px] uppercase font-medium px-1.5 py-0 border-transparent shadow-none h-4 flex items-center",
                    badgeVariant === 'success' && "bg-success/10 text-success",
                    badgeVariant === 'danger' && "bg-danger/10 text-danger",
                    badgeVariant === 'warning' && "bg-warning/10 text-warning",
                )}>
                    {badge}
                </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">{context}</p>
        </Card>
    );
}