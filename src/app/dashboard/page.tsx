"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from 'next/link';
import { motion } from "framer-motion";
import { 
    ArrowUpRight, Banknote, Users, FileWarning, 
    CheckCircle2, Plus, TrendingUp, TrendingDown, 
    FileText, Wallet, Receipt, Info, ChevronRight,
    Search, BarChart3, AlertCircle
} from "lucide-react";
import { format, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { type ChartConfig } from "@/components/ui/chart";

import { useLocale } from "@/lib/i18n/locale-provider";
import { getInvoices } from "@/actions/invoices";
import { getExpenses } from "@/actions/expenses";
import { getClients } from "@/actions/clients";
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';

// Dynamic import for the Chart component to optimize bundle size and avoid SSR issues
const DashboardChart = dynamic(() => import('@/components/dashboard/dashboard-chart'), { 
    ssr: false,
    loading: () => <div className="h-[350px] w-full flex items-center justify-center bg-muted/5 rounded-2xl animate-pulse"><BarChart3 className="h-8 w-8 text-primary opacity-20 animate-bounce" /></div>
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

    // Financial calculations
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
            paidCount: paid.length
        };
    }, [invoices, expenses]);

    // Monthly Trends Data
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

    const chartConfig = {
        ingresos: { label: "Ingresos", color: "hsl(var(--primary))" },
        gastos: { label: "Gastos", color: "hsl(var(--destructive))" },
    } satisfies ChartConfig;

    // Top Clients
    const topClients = useMemo(() => {
        return clients
            .map(c => ({
                ...c,
                total: invoices.filter(i => i.clientId === c.id).reduce((s, i) => s + (i.total || 0), 0)
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [clients, invoices]);

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
      <div className="space-y-12 pb-20 selection:bg-primary/20 animate-in fade-in duration-700">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-1">
                <h2 className="text-4xl font-black font-headline tracking-tighter">Resumen General</h2>
                <p className="text-muted-foreground font-medium italic">Monitoriza el estado real de tu negocio en tiempo real.</p>
            </div>
            <div className="flex items-center gap-3">
                <Link href="/dashboard/reports">
                    <Button variant="outline" className="h-12 rounded-2xl px-6 font-bold border-2 hover:bg-muted/50 transition-all active:scale-95 shadow-sm">
                        Informes Detallados
                    </Button>
                </Link>
                <Link href="/dashboard/invoices/new">
                    <Button className="h-12 rounded-2xl px-6 font-black shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95">
                        <Plus className="mr-2 h-5 w-5 stroke-[3]" />
                        Nueva Factura
                    </Button>
                </Link>
            </div>
        </div>

        {/* KPI Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <KPICard 
                title="Ingresos" 
                value={formatCurrency(stats.income)} 
                trend="Cobrado" 
                icon={<TrendingUp />} 
                variant="primary" 
                description="Total facturado pagado"
            />
            <KPICard 
                title="Gastos" 
                value={formatCurrency(stats.expenses)} 
                trend="Suministros" 
                icon={<TrendingDown />} 
                variant="destructive" 
                description="Suministros y servicios"
            />
            <KPICard 
                title="Cash Flow" 
                value={formatCurrency(stats.cashFlow)} 
                trend="Neto" 
                icon={<Wallet />} 
                variant="emerald" 
                description="Flujo de caja neto"
            />
            <KPICard 
                title="Facturas Pendientes" 
                value={stats.pendingCount.toString()} 
                trend={stats.overdueCount > 0 ? `${stats.overdueCount} vencidas` : "Al día"} 
                icon={<FileWarning />} 
                variant="amber" 
                description="Pendientes de cobro"
            />
        </div>

        <div className="grid gap-8 lg:grid-cols-3 items-start">
            {/* Main Trend Chart */}
            <Card className="lg:col-span-2 glass-card border-none shadow-2xl shadow-black/5 overflow-hidden group">
                <CardHeader className="flex flex-row items-center justify-between pb-8">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black font-headline tracking-tight">Evolución Trimestral</CardTitle>
                        <CardDescription className="font-medium">Comparativa de ingresos vs gastos 2026.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-2">
                    <DashboardChart data={chartData} config={chartConfig} />
                </CardContent>
            </Card>

            {/* Top Clients Ranking */}
            <Card className="glass-card border-none shadow-2xl shadow-black/5 overflow-hidden">
                <CardHeader className="pb-6">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-black font-headline tracking-tight">Top Clientes</CardTitle>
                            <CardDescription className="font-medium italic">Por volumen de facturación</CardDescription>
                        </div>
                        <Users className="h-5 w-5 text-primary opacity-20" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="space-y-4">
                        {!dbLoading && topClients.length > 0 ? topClients.map((client, idx) => (
                            <motion.div 
                                key={client.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="relative flex items-center justify-between p-4 bg-muted/20 rounded-2xl group overflow-hidden transition-all hover:bg-muted/40 cursor-pointer"
                            >
                                <div className="absolute left-0 top-0 h-full w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-11 w-11 ring-2 ring-background shadow-md">
                                        <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">{client.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-black group-hover:text-primary transition-colors">{client.name}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 truncate max-w-[120px]">{client.email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black">{formatCurrency(client.total)}</p>
                                    <p className="text-[10px] font-bold text-emerald-500 flex items-center justify-end gap-1">
                                        <TrendingUp className="h-2 w-2" /> Activo
                                    </p>
                                </div>
                            </motion.div>
                        )) : (
                            <div className="p-10 text-center opacity-30 italic text-xs font-bold">Sin datos de clientes</div>
                        )}
                   </div>
                   <Link href="/dashboard/clients" className="block">
                        <Button variant="ghost" className="w-full h-12 rounded-xl font-black text-xs uppercase tracking-[0.2em] gap-2 hover:bg-primary/5 hover:text-primary">
                            Ver todos los clientes
                            <ArrowUpRight className="h-4 w-4" />
                        </Button>
                   </Link>
                </CardContent>
            </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickAction icon={<Receipt />} label="Nuevo Gasto" href="/dashboard/expenses" variant="destructive" />
            <QuickAction icon={<Users />} label="Gestionar Clientes" href="/dashboard/clients" variant="primary" />
            <QuickAction icon={<BarChart3 />} label="Ver Informes" href="/dashboard/reports" variant="emerald" />
            <QuickAction icon={<FileText />} label="Nueva Factura" href="/dashboard/invoices/new" variant="primary" />
        </div>
      </div>
    );
}

function KPICard({ title, value, trend, icon, variant, description }: { 
    title: string, value: string, trend: string, icon: React.ReactElement, 
    variant: 'primary' | 'destructive' | 'emerald' | 'amber' | 'muted',
    description?: string
}) {
    const variants = {
        primary: "text-primary shadow-primary/20 bg-primary/5",
        destructive: "text-destructive shadow-destructive/20 bg-destructive/5",
        emerald: "text-emerald-500 shadow-emerald-500/20 bg-emerald-500/5",
        amber: "text-amber-500 shadow-amber-500/20 bg-amber-500/5",
        muted: "text-muted-foreground shadow-muted/20 bg-muted/5",
    };

    return (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            <Card className="glass-card group border-none overflow-hidden h-[190px] p-6 flex flex-col justify-between shadow-2xl relative">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                    {React.cloneElement(icon, { size: 120, strokeWidth: 1 })}
                </div>
                
                <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 leading-tight">{title}</p>
                        <h3 className="text-3xl font-black font-headline tracking-tighter leading-none mt-1">{value}</h3>
                    </div>
                    <div className={cn("p-3 rounded-2xl transition-all duration-500 group-hover:rotate-12", variants[variant])}>
                        {React.cloneElement(icon, { className: "w-5 h-5 stroke-[2.5]" })}
                    </div>
                </div>
                
                <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", 
                            variant === 'primary' || variant === 'emerald' ? "bg-emerald-500/10 text-emerald-500" : 
                            variant === 'destructive' ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                        )}>
                            {trend}
                        </div>
                    </div>
                    {description && <p className="text-[11px] font-bold text-muted-foreground italic line-clamp-1 opacity-70">{description}</p>}
                </div>
            </Card>
        </motion.div>
    );
}

function QuickAction({ icon, label, href, variant }: { icon: React.ReactElement, label: string, href: string, variant: string }) {
    return (
        <Link href={href}>
            <motion.div
                whileHover={{ y: -5, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
            >
                <Button 
                    variant="ghost" 
                    className="w-full h-32 rounded-[2rem] flex flex-col gap-4 items-center justify-center bg-muted/20 hover:bg-primary/5 hover:text-primary transition-all border-2 border-transparent hover:border-primary/10 shadow-sm hover:shadow-xl group"
                >
                    <div className={cn("p-4 rounded-2xl bg-white shadow-lg transition-transform duration-500 group-hover:rotate-6", 
                        variant === 'primary' ? 'text-primary' : variant === 'destructive' ? 'text-destructive' : variant === 'emerald' ? 'text-emerald-500' : 'text-muted-foreground'
                    )}>
                        {React.cloneElement(icon, { className: "w-7 h-7 stroke-[2]" })}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 group-hover:opacity-100 transition-opacity">{label}</span>
                </Button>
            </motion.div>
        </Link>
    );
}