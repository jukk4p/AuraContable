"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
    Banknote, CheckCircle2, Users, FileWarning, 
    ArrowUpRight, FileText, ArrowLeft, Info,
    LayoutDashboard, UserCircle, PieChart, Settings,
    Plus, Search, Filter, MoreVertical, Download, 
    Mail, Briefcase, Calendar, CreditCard, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
    Bar, BarChart, CartesianGrid, XAxis, YAxis, 
    ResponsiveContainer, Line, LineChart, Tooltip
} from 'recharts';
import { 
    ChartContainer, ChartTooltip, ChartTooltipContent 
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

// Types
type Section = 'dashboard' | 'invoices' | 'clients' | 'reports' | 'settings';

// Mock Data
const MOCK_INVOICES = [
    { id: '1', invoiceNumber: 'INV-2026-001', client: { name: 'Juan Alberto' }, total: 1250.50, status: 'Paid', issueDate: '2026-03-20', dueDate: '2026-04-20' },
    { id: '2', invoiceNumber: 'INV-2026-002', client: { name: 'Empresa Creativa' }, total: 450.00, status: 'Pending', issueDate: '2026-03-22', dueDate: '2026-04-22' },
    { id: '3', invoiceNumber: 'INV-2026-003', client: { name: 'Sofía Martínez' }, total: 890.75, status: 'Overdue', issueDate: '2026-03-10', dueDate: '2026-03-24' },
    { id: '4', invoiceNumber: 'INV-2026-004', client: { name: 'Tech Solutions' }, total: 2100.00, status: 'Paid', issueDate: '2026-03-15', dueDate: '2026-04-15' },
    { id: '5', invoiceNumber: 'INV-2026-005', client: { name: 'Pedro Picapiedra' }, total: 300.25, status: 'Pending', issueDate: '2026-03-24', dueDate: '2026-04-24' },
    { id: '6', invoiceNumber: 'INV-2026-006', client: { name: 'Diseños Modernos' }, total: 1575.00, status: 'Paid', issueDate: '2026-03-18', dueDate: '2026-04-18' },
];

const MOCK_CLIENTS = [
    { id: '1', name: 'Juan Alberto', email: 'juan@demo.com', status: 'Active', totalBilled: 12500.00 },
    { id: '2', name: 'Empresa Creativa', email: 'contacto@creativa.es', status: 'Active', totalBilled: 4500.50 },
    { id: '3', name: 'Sofía Martínez', email: 'sofia.mtz@gmail.com', status: 'Active', totalBilled: 8900.00 },
    { id: '4', name: 'Tech Solutions', email: 'billing@techsol.com', status: 'Inactive', totalBilled: 21000.00 },
];

const MOCK_CHART_HISTORY = [
    { month: 'Ene', income: 4500, expense: 1200 },
    { month: 'Feb', income: 5200, expense: 1800 },
    { month: 'Mar', income: 4800, expense: 1500 },
    { month: 'Abr', income: 6100, expense: 2100 },
    { month: 'May', income: 5900, expense: 1900 },
    { month: 'Jun', income: 7200, expense: 2500 },
];

export default function DemoPage() {
    const [activeSection, setActiveSection] = useState<Section>('dashboard');

    return (
        <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#09090b] flex selection:bg-primary/20">
            {/* Simple Sidebar */}
            <aside className="w-72 bg-slate-950 text-slate-400 flex flex-col h-screen sticky top-0 z-[70] border-r border-white/5">
                <div className="p-8 h-20 flex items-center border-b border-white/5">
                    <Link href="/dashboard" className="flex items-center gap-3 group/logo">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/30 group-hover/logo:scale-110 transition-transform duration-500">
                            <div className="text-lg font-black tracking-tighter">A</div>
                        </div>
                        <span className="text-xl font-black font-headline tracking-tighter text-white transition-all duration-300">
                            Aura<span className="text-primary group-hover/logo:text-primary/70 transition-colors italic">Contable</span>
                        </span>
                    </Link>
                </div>
                
                <nav className="flex-1 p-6 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-4 px-3">Principal</p>
                    <SidebarItem active={activeSection === 'dashboard'} icon={<LayoutDashboard />} label="Panel Control" onClick={() => setActiveSection('dashboard')} />
                    <SidebarItem active={activeSection === 'invoices'} icon={<FileText />} label="Facturas" onClick={() => setActiveSection('invoices')} />
                    <SidebarItem active={activeSection === 'clients'} icon={<Users />} label="Clientes" onClick={() => setActiveSection('clients')} />
                    <SidebarItem active={activeSection === 'reports'} icon={<PieChart />} label="Informes" onClick={() => setActiveSection('reports')} />
                    
                    <div className="pt-8 px-3">
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-4">Sistema</p>
                    </div>
                    <SidebarItem active={activeSection === 'settings'} icon={<Settings />} label="Ajustes" onClick={() => setActiveSection('settings')} />
                </nav>

                <div className="p-6 border-t border-border/50">
                    <div className="bg-primary/5 rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-bold text-primary text-center">Modo Demo Activo</p>
                        <Button asChild size="sm" className="w-full rounded-xl font-bold bg-primary text-white shadow-xl shadow-primary/20">
                            <Link href="/login">Registrarse</Link>
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen relative">
                 {/* Top Bar */}
                <header className="h-20 bg-background/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-[60] px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[9px] font-black tracking-widest px-3 py-1 bg-primary/5">Interactive Demo</Badge>
                        <h2 className="font-headline font-bold text-lg text-foreground capitalize">{activeSection === 'dashboard' ? 'Panel de Control' : activeSection}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 px-2 py-1 bg-muted/20 hover:bg-primary/5 hover:text-primary rounded-2xl transition-all cursor-pointer">
                            <Avatar className="h-9 w-9 border-2 border-primary/20 p-0.5">
                                <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">JD</AvatarFallback>
                            </Avatar>
                            <div className="hidden md:flex flex-col items-start gap-0">
                                <span className="text-sm font-black leading-none">John Doe</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Demo User</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8 md:p-12 max-w-7xl mx-auto w-full">
                    <AnimatePresence mode="wait">
                        {activeSection === 'dashboard' && <DashboardSection />}
                        {activeSection === 'invoices' && <InvoicesSection />}
                        {activeSection === 'clients' && <ClientsSection />}
                        {activeSection === 'reports' && <ReportsSection />}
                        {activeSection === 'settings' && <SettingsSection />}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

// Sidebar Component
function SidebarItem({ active, icon, label, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm tracking-tight",
                active 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "hover:bg-primary/5 hover:text-primary"
            )}
        >
            {React.cloneElement(icon, { className: cn("w-5 h-5", active ? "stroke-[2.5]" : "stroke-[2]") })}
            {label}
        </button>
    )
}

// Section Components
function DashboardSection() {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-10"
        >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <DashboardMetric title="Ingresos Anuales" value="45.280,00 €" icon={<Banknote />} color="primary" trend="+12.5%" />
                <DashboardMetric title="Gastos Totales" value="12.450,50 €" icon={<CreditCard />} color="rose" trend="+2.4%" />
                <DashboardMetric title="Clientes Activos" value="24" icon={<Users />} color="emerald" trend="+3" />
                <DashboardMetric title="Pendientes" value="8" icon={<FileWarning />} color="amber" trend="-2" />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 glass-card border-none shadow-2xl shadow-black/5 overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="font-headline font-bold text-xl tracking-tight">Evolución de Ingresos</CardTitle>
                            <CardDescription>Comparativa visual de ingresos y gastos mensuales.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase">Ingresos</Badge>
                            <Badge className="bg-destructive/10 text-destructive border-none text-[10px] font-black uppercase">Gastos</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[350px] pr-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={MOCK_CHART_HISTORY}>
                                <defs>
                                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} className="text-[10px] font-bold text-muted-foreground/50 uppercase" />
                                <YAxis axisLine={false} tickLine={false} tickMargin={10} className="text-[10px] font-bold text-muted-foreground/50" />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', background: 'rgba(255,255,255,0.9)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Line type="monotone" dataKey="income" stroke="hsl(var(--primary))" strokeWidth={5} dot={{ r: 0 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" strokeWidth={5} dot={{ r: 0 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="glass-card border-none shadow-2xl shadow-black/5">
                     <CardHeader>
                        <CardTitle className="font-headline font-bold text-xl tracking-tight">Facturas Recientes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {MOCK_INVOICES.slice(0, 4).map(inv => (
                            <div key={inv.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl hover:bg-muted/40 transition-colors">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{inv.client.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-bold">{inv.client.name}</p>
                                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/50">{inv.invoiceNumber}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black">{inv.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                                    <Badge variant="outline" className={cn(
                                        "text-[8px] px-2 py-0 border-none uppercase font-black",
                                        inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                    )}>{inv.status}</Badge>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    )
}

function InvoicesSection() {
    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <h2 className="text-3xl font-headline font-black tracking-tighter">Facturación</h2>
                    <p className="text-muted-foreground font-medium">Gestionar, crear y descargar todas tus facturas.</p>
                </div>
                <Button className="rounded-full px-6 font-bold shadow-xl shadow-primary/20 gap-2">
                    <Plus className="h-5 w-5" /> Nueva Factura
                </Button>
            </div>

            <Card className="glass-card border-none shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border/10 pb-6">
                    <div className="relative w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar por cliente o número..." className="pl-12 rounded-xl bg-muted/30 border-none h-12" />
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" className="rounded-xl font-bold text-xs uppercase tracking-widest gap-2">
                            <Filter className="h-4 w-4" /> Filtros
                        </Button>
                        <Button variant="outline" className="rounded-xl font-bold text-xs uppercase tracking-widest gap-2">
                            <Download className="h-4 w-4" /> Exportar
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-border/10 bg-muted/5">
                                <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest">Factura</TableHead>
                                <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest">Cliente</TableHead>
                                <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest">Fecha</TableHead>
                                <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-right">Total</TableHead>
                                <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-center">Estado</TableHead>
                                <TableHead className="py-6 text-right px-8"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {MOCK_INVOICES.map(inv => (
                                <TableRow key={inv.id} className="hover:bg-muted/20 border-b border-border/5 group transition-colors">
                                    <TableCell className="py-6 px-8 font-mono font-bold text-primary">{inv.invoiceNumber}</TableCell>
                                    <TableCell className="py-6 font-bold">{inv.client.name}</TableCell>
                                    <TableCell className="py-6 text-sm text-muted-foreground font-medium">{inv.issueDate}</TableCell>
                                    <TableCell className="py-6 text-right font-black">{inv.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                                    <TableCell className="py-6 text-center">
                                         <Badge className={cn(
                                            "rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest uppercase border-none",
                                            inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 
                                            inv.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 
                                            'bg-destructive/10 text-destructive'
                                        )}>{inv.status}</Badge>
                                    </TableCell>
                                    <TableCell className="py-6 pr-8 text-right">
                                        <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </motion.div>
    )
}

function ClientsSection() {
    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="space-y-8">
            <div className="flex justify-between items-center">
                 <div className="space-y-2">
                    <h2 className="text-3xl font-headline font-black tracking-tighter">Directorio de Clientes</h2>
                    <p className="text-muted-foreground font-medium">Gestiona tu cartera de clientes y su historial de facturación.</p>
                </div>
                 <Button className="rounded-full px-6 font-bold shadow-xl shadow-primary/20 gap-2">
                    <Plus className="h-5 w-5" /> Nuevo Cliente
                </Button>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                {MOCK_CLIENTS.map(client => (
                    <Card key={client.id} className="glass-card hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group border-none">
                        <CardContent className="p-8 text-center space-y-6">
                            <Avatar className="h-24 w-24 mx-auto ring-4 ring-primary/10 group-hover:ring-primary/30 transition-all">
                                <AvatarFallback className="text-2xl font-black bg-primary/5 text-primary">{client.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold font-headline">{client.name}</h3>
                                <p className="text-sm text-muted-foreground font-medium">{client.email}</p>
                            </div>
                            <div className="pt-6 border-t border-border/10 flex justify-between items-center">
                                <div className="text-left">
                                     <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/50">Facturado</p>
                                     <p className="font-bold text-lg">{client.totalBilled.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                                </div>
                                <Badge className={cn(
                                    "rounded-full px-3 py-1 text-[8px] font-black uppercase border-none",
                                    client.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                                )}>{client.status === 'Active' ? 'ACTIVO' : 'INACTIVO'}</Badge>
                            </div>
                            <Button variant="outline" className="w-full rounded-xl font-bold uppercase tracking-widest text-[10px] h-11 hover:bg-primary hover:text-white transition-all">Ver Historial</Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </motion.div>
    )
}

function ReportsSection() {
    return (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="space-y-8">
             <div className="space-y-2">
                <h2 className="text-3xl font-headline font-black tracking-tighter">Informes y Analítica</h2>
                <p className="text-muted-foreground font-medium">Análisis detallado de la salud financiera de tu empresa.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <Card className="glass-card border-none shadow-2xl p-8 space-y-6">
                    <h4 className="font-headline font-black uppercase text-xs tracking-widest text-muted-foreground">Distribución Gastos</h4>
                    <div className="h-[200px] flex items-center justify-center">
                         <div className="relative h-40 w-40 rounded-full border-[12px] border-primary/10 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-[12px] border-primary border-t-transparent -rotate-45" />
                            <div className="text-center">
                                <p className="text-2xl font-black">68%</p>
                                <p className="text-[8px] font-bold uppercase text-muted-foreground">Personal</p>
                            </div>
                         </div>
                    </div>
                    <div className="space-y-3">
                        <ReportLegend color="bg-primary" label="Personal" value="4.200€" />
                        <ReportLegend color="bg-rose-400" label="Suministros" value="1.500€" />
                        <ReportLegend color="bg-amber-400" label="Marketing" value="1.200€" />
                    </div>
                </Card>

                <Card className="md:col-span-2 glass-card border-none shadow-2xl p-8 space-y-6">
                     <h4 className="font-headline font-black uppercase text-xs tracking-widest text-muted-foreground">Ingresos vs Gastos</h4>
                     <ChartContainer config={{}} className="h-[350px] w-full">
                        <BarChart data={MOCK_CHART_HISTORY}>
                            <CartesianGrid vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} />
                            <YAxis axisLine={false} tickLine={false} tickMargin={10} />
                            <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                     </ChartContainer>
                </Card>
            </div>
        </motion.div>
    )
}

function SettingsSection() {
    return (
        <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="space-y-12">
            <div className="space-y-2">
                <h2 className="text-3xl font-headline font-black tracking-tighter">Ajustes</h2>
                <p className="text-muted-foreground font-medium">Configura tu perfil de usuario y de empresa.</p>
            </div>

            <div className="max-w-3xl space-y-12">
                {/* Profile Section */}
                <div className="space-y-6">
                    <h4 className="font-headline font-black uppercase text-sm tracking-widest text-primary flex items-center gap-4">
                        <UserCircle className="h-5 w-5" /> Perfil de Usuario
                        <div className="h-px flex-1 bg-primary/20" />
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-8 bg-muted/20 p-8 rounded-3xl border border-border/50">
                        <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nombre Completo</label>
                             <Input defaultValue="John Doe" className="rounded-xl h-12 bg-white/50 border-none shadow-sm" />
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Email</label>
                             <Input defaultValue="john.doe@aura.com" className="rounded-xl h-12 bg-white/50 border-none shadow-sm" />
                        </div>
                    </div>
                </div>

                {/* Company Section */}
                <div className="space-y-6">
                    <h4 className="font-headline font-black uppercase text-sm tracking-widest text-primary flex items-center gap-4">
                        <Briefcase className="h-5 w-5" /> Datos de Empresa
                         <div className="h-px flex-1 bg-primary/20" />
                    </h4>
                    <div className="space-y-8 bg-muted/20 p-8 rounded-3xl border border-border/50">
                        <div className="flex items-center gap-8">
                            <div className="h-24 w-24 bg-primary rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-primary/20">
                                JD
                            </div>
                            <div className="space-y-2">
                                <Button className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-10 px-6">Cambiar Logo</Button>
                                <p className="text-xs text-muted-foreground">Formato PNG o SVG. Recomendado 400x400px.</p>
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nombre Comercial</label>
                                <Input defaultValue="John Doe Freelance" className="rounded-xl h-12 bg-white/50 border-none shadow-sm" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">NIF / CIF</label>
                                <Input defaultValue="B12345678" className="rounded-xl h-12 bg-white/50 border-none shadow-sm" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                     <Button variant="ghost" className="rounded-xl font-bold uppercase tracking-widest text-xs h-14 px-8">Cancelar</Button>
                     <Button className="rounded-xl font-bold uppercase tracking-widest text-xs h-14 px-8 shadow-xl shadow-primary-foreground/20">Guardar Cambios</Button>
                </div>
            </div>
        </motion.div>
    )
}

// Helper Components
function DashboardMetric({ title, value, icon, color, trend, subtitle }: any) {
    const variants: any = {
        primary: "bg-primary/10 text-primary border-primary/20 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]",
        rose: "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:shadow-[0_0_30px_-10px_rgba(244,63,94,0.3)]",
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]",
        amber: "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.3)]",
    }
    
    return (
        <Card className={cn("glass-card border-2 border-transparent transition-all duration-500 group overflow-hidden relative", variants[color])}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-white">
                <CardTitle className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em]">{title}</CardTitle>
                <div className="p-2 rounded-xl bg-white/10 group-hover:scale-110 transition-transform">
                    {React.cloneElement(icon, { className: "w-5 h-5 stroke-[2.5]" })}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-black font-headline tracking-tighter">{value}</div>
                    {trend && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-white/10">{trend}</span>
                    )}
                </div>
                {subtitle && <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{subtitle}</p>}
            </CardContent>
        </Card>
    )
}

function ReportLegend({ color, label, value }: any) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={cn("h-3 w-3 rounded-full", color)} />
                <span className="text-xs font-bold text-muted-foreground capitalize">{label}</span>
            </div>
            <span className="text-xs font-black">{value}</span>
        </div>
    )
}
