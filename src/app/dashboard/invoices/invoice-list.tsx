"use client"

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
    MoreHorizontal, View, Edit, Trash2, 
    Download, CheckCircle, Send, Plus, 
    Search, Filter, Calendar as CalendarIcon,
    ChevronDown, FileText, Mail, FileDown
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useLocale } from '@/lib/i18n/locale-provider';
import { getInvoices, deleteInvoice } from '@/actions/invoices';
import { getCompanyProfile } from '@/actions/company';
import { generateInvoicePdf } from '@/lib/pdf-generator';
import type { Invoice, InvoiceStatus, CompanyProfile } from '@/lib/types';
import InvoiceStatusBadge from '@/components/invoice-status-badge';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export default function InvoiceList() {
    const { t, formatCurrency, locale } = useLocale();
    const { data: session, status } = useSession();
    const user = session?.user;
    
    const [invoices, setInvoices] = useState<any[]>([]);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');
    const [dbLoading, setDbLoading] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (user?.id) {
                setDbLoading(true);
                try {
                    const [invoicesData, companyData] = await Promise.all([
                        getInvoices(user.id),
                        getCompanyProfile(user.id)
                    ]);
                    setInvoices(invoicesData);
                    setCompanyProfile(companyData);
                } catch (e) {
                    console.error(e);
                    setDbError("No se pudieron cargar las facturas.");
                } finally {
                    setDbLoading(false);
                }
            } else if (status !== 'loading') {
                setDbLoading(false);
            }
        };
        fetchData();
    }, [user, status]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(invoice => {
            const matchesSearch = 
                invoice.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [searchTerm, statusFilter, invoices]);

    const handleDownloadPdf = async (invoice: any) => {
        try {
            toast({ title: "Generando PDF...", description: "Estamos preparando tu factura para descargar." });
            await generateInvoicePdf(
                invoice, 
                companyProfile, 
                { t, formatCurrency, locale: locale as any }
            );
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteInvoice(id);
            setInvoices(invoices.filter(inv => inv.id !== id));
            toast({ title: "Factura Eliminada", description: "La factura ha sido eliminada correctamente." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar la factura.", variant: "destructive" });
        }
    };

    const handleExportCsv = () => {
        if (!filteredInvoices.length) {
            toast({ title: "Sin datos", description: "No hay facturas para exportar.", variant: "destructive" });
            return;
        }
        const headers = ['Nº Factura', 'Cliente', 'Email Cliente', 'Fecha Emisión', 'Fecha Vencimiento', 'Subtotal', 'Total', 'Estado'];
        const rows = filteredInvoices.map(inv => [
            inv.invoiceNumber,
            inv.client.name,
            inv.client.email || '',
            format(new Date(inv.issueDate), 'dd/MM/yyyy'),
            format(new Date(inv.dueDate), 'dd/MM/yyyy'),
            inv.subtotal?.toFixed(2) ?? '0.00',
            inv.total?.toFixed(2) ?? '0.00',
            inv.status,
        ]);
        const statusMap: Record<string, string> = { Paid: 'Pagada', Pending: 'Pendiente', Overdue: 'Vencida', Draft: 'Borrador' };
        const translatedRows = rows.map(r => [...r.slice(0, -1), statusMap[r[r.length - 1] as string] || r[r.length - 1]]);
        const csvContent = '\uFEFF' + [headers, ...translatedRows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Facturas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "CSV Exportado", description: `Se han exportado ${filteredInvoices.length} facturas.` });
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
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black font-headline tracking-tighter capitalize">Listado de Facturas</h2>
                    <p className="text-muted-foreground font-medium italic">Gestiona tus ventas y cobros del trimestre de forma profesional.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleExportCsv} variant="outline" className="h-12 rounded-2xl px-6 font-bold border-2 border-dashed border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-solid hover:text-primary transition-all active:scale-95 shadow-sm group/export">
                        <FileDown className="mr-2 h-4 w-4 transition-transform group-hover/export:-translate-y-0.5" /> Exportar CSV
                    </Button>
                    <Link href="/dashboard/invoices/new">
                        <Button className="h-12 rounded-2xl px-6 font-black shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95">
                            <Plus className="mr-2 h-5 w-5 stroke-[2.5]" />
                            Crear Factura
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters Rack */}
            <Card className="glass-card border-none shadow-xl shadow-black/5 p-2 rounded-[2rem]">
                <CardContent className="p-2 flex flex-col lg:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder="Buscar por cliente o número de factura..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-14 pl-14 rounded-2xl bg-muted/30 border-none group-focus-within:ring-2 ring-primary/10 transition-all font-bold text-lg"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 h-12 scrollbar-hide">
                        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="h-10">
                            <TabsList className="bg-muted/40 p-1 rounded-xl h-full font-bold">
                                <TabsTrigger value="All" className="rounded-lg text-xs px-4">Todas</TabsTrigger>
                                <TabsTrigger value="Paid" className="rounded-lg text-xs px-4 text-emerald-500 data-[state=active]:bg-emerald-500/10">Pagadas</TabsTrigger>
                                <TabsTrigger value="Pending" className="rounded-lg text-xs px-4 text-amber-500 data-[state=active]:bg-amber-500/10">Pendientes</TabsTrigger>
                                <TabsTrigger value="Overdue" className="rounded-lg text-xs px-4 text-destructive data-[state=active]:bg-destructive/10">Vencidas</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardContent>
            </Card>

            {/* Invoices List */}
            <div className="grid gap-4">
                <AnimatePresence>
                    {dbLoading ? (
                        <div className="p-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
                    ) : (
                        filteredInvoices.map((invoice, idx) => (
                            <motion.div 
                                key={invoice.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                whileHover={{ y: -4, scale: 1.005 }}
                                className="group relative glass-card p-6 shadow-xl shadow-black/[0.02] hover:shadow-primary/10 transition-all cursor-pointer overflow-hidden rounded-[2.5rem]"
                            >
                                <div className="absolute top-0 left-0 w-2 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                {/* Full-card click overlay */}
                                <Link href={`/dashboard/invoices/${invoice.id}`} className="absolute inset-0 z-0" />

                                <div className="relative z-[1] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pointer-events-none">
                                    <div className="flex items-center gap-5">
                                        <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-inner group-hover:rotate-3 duration-500">
                                            <FileText className="h-7 w-7 text-primary/60 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-black font-headline tracking-tighter group-hover:text-primary transition-colors">{invoice.client.name}</h3>
                                                <Badge variant="outline" className="font-mono text-[10px] py-0.5 px-2 border-primary/20 text-primary bg-primary/5 uppercase font-black rounded-lg">#{invoice.invoiceNumber.split('-').pop()}</Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-muted-foreground font-medium text-xs italic opacity-70">
                                                <span className="flex items-center gap-1.5"><CalendarIcon className="h-3 w-3" /> {format(new Date(invoice.issueDate), 'dd MMM yyyy', { locale: es })}</span>
                                                <span className="h-1 w-1 rounded-full bg-border" />
                                                <span className="flex items-center gap-1.5 text-destructive/70"><AlertCircle className="h-3 w-3" /> {format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: es })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between md:justify-end gap-10 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Total Factura</p>
                                            <p className="text-2xl font-black tracking-tighter text-gradient">{formatCurrency(invoice.total)}</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 pointer-events-auto">
                                            <InvoiceStatusBadge status={invoice.status} />
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-primary/10 group/dots transition-all">
                                                        <MoreHorizontal className="h-5 w-5 text-muted-foreground group-hover/dots:text-primary transition-colors" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="glass rounded-3xl border-white/10 shadow-2xl p-1 w-64 font-bold animate-in fade-in zoom-in-95 duration-200">
                                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest px-4 py-3 opacity-50 flex items-center justify-between">
                                                        <span>Gestión de Factura</span>
                                                        <FileText className="h-3 w-3" />
                                                    </DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleDownloadPdf(invoice)} className="rounded-2xl p-3.5 gap-3 text-sm focus:bg-primary/5 cursor-pointer">
                                                        <div className="p-2 bg-muted/30 rounded-lg group-hover:bg-primary/20"><Download className="h-4 w-4" /></div> Descargar PDF
                                                    </DropdownMenuItem>
                                                    <Link href={`/dashboard/invoices/${invoice.id}`}>
                                                        <DropdownMenuItem className="rounded-2xl p-3.5 gap-3 text-sm focus:bg-primary/5 cursor-pointer">
                                                            <div className="p-2 bg-muted/30 rounded-lg"><View className="h-4 w-4" /></div> Ver Detalles
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <Link href={`/dashboard/invoices/edit/${invoice.id}`}>
                                                        <DropdownMenuItem className="rounded-2xl p-3.5 gap-3 text-sm focus:bg-primary/5 cursor-pointer">
                                                            <div className="p-2 bg-muted/30 rounded-lg"><Edit className="h-4 w-4" /></div> Editar Factura
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <DropdownMenuItem className="rounded-2xl p-3.5 gap-3 text-sm focus:bg-primary/5 cursor-pointer">
                                                        <div className="p-2 bg-muted/30 rounded-lg"><Mail className="h-4 w-4" /></div> Enviar por Email
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-border/50 mx-2" />
                                                    <DropdownMenuItem onClick={() => handleDelete(invoice.id)} className="rounded-2xl p-3.5 gap-3 text-sm text-destructive focus:bg-destructive/5 cursor-pointer">
                                                        <div className="p-2 bg-destructive/10 rounded-lg"><Trash2 className="h-4 w-4" /></div> Eliminar Factura
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
            
            {!dbLoading && filteredInvoices.length === 0 && (
                <div className="text-center py-20 bg-muted/20 rounded-[3rem] border-2 border-dashed border-muted">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No hay facturas emitidas todavía</p>
                    <Link href="/dashboard/invoices/new" className="mt-4 inline-block">
                        <Button variant="link" className="font-bold text-primary">Crea tu primera factura ahora</Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
