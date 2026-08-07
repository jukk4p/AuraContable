"use client"

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
    MoreHorizontal, View, Edit, Trash2, 
    Download, Plus, Search, Calendar as CalendarIcon,
    FileText, Mail, FileDown, AlertCircle,
    ChevronDown, ChevronUp, LayoutGrid, Layers, ArrowUpDown, Filter,
    CheckCircle2, DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from "next-auth/react";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useLocale } from '@/lib/i18n/locale-provider';
import { getInvoices, deleteInvoice, updateInvoiceStatus, bulkUpdateInvoiceStatus } from '@/actions/invoices';
import { getCompanyProfile } from '@/actions/company';
import { generateInvoicePdf } from '@/lib/pdf-generator';
import type { InvoiceStatus, CompanyProfile } from '@/lib/types';
import InvoiceStatusBadge from '@/components/invoice-status-badge';

function StatCard({ title, value, trend, icon }: { title: string, value: string, trend: string, icon?: React.ReactNode }) {
    return (
        <Card className="p-4 rounded-xl border border-border shadow-sm flex flex-col gap-3 bg-card hover:border-border/80 transition-colors">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
                {icon}
            </div>
            <div className="flex justify-between items-end">
                <h3 className="text-2xl font-semibold tracking-tight">{value}</h3>
                <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{trend}</span>
            </div>
        </Card>
    );
}

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
    const [sortBy, setSortBy] = useState<'name' | 'issueDate' | 'dueDate'>('issueDate');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [isStacked, setIsStacked] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

    const toggleClient = (clientName: string) => {
        setExpandedClients(prev => ({
            ...prev,
            [clientName]: !prev[clientName]
        }));
    };

    const userId = user?.id;

    useEffect(() => {
        const fetchData = async () => {
            if (userId) {
                setDbLoading(true);
                setDbError(null);
                try {
                    const [invoicesData, companyData] = await Promise.all([
                        getInvoices(),
                        getCompanyProfile()
                    ]);
                    setInvoices(invoicesData);
                    setCompanyProfile(companyData);
                } catch (e) {
                    console.error("Error cargando las facturas:", e);
                    setDbError("No se pudieron cargar las facturas. Revisa tu conexión e inténtalo de nuevo.");
                } finally {
                    setDbLoading(false);
                }
            } else if (status !== 'loading') {
                setDbLoading(false);
            }
        };
        fetchData();
    }, [userId, status]);

    const stats = useMemo(() => {
        const total = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const cobrado = invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
        const pendiente = invoices.filter(inv => inv.status === 'Pending' || inv.status === 'Overdue').reduce((sum, inv) => sum + (inv.total || 0), 0);
        return { total, cobrado, pendiente };
    }, [invoices]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(invoice => {
            const matchesSearch = 
                invoice.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            if (sortBy === 'name') {
                const nameA = a.client.name.toLowerCase();
                const nameB = b.client.name.toLowerCase();
                return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            }
            if (sortBy === 'issueDate') {
                const dateA = new Date(a.issueDate).getTime();
                const dateB = new Date(b.issueDate).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            }
            if (sortBy === 'dueDate') {
                const dateA = new Date(a.dueDate).getTime();
                const dateB = new Date(b.dueDate).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            }
            return 0;
        });
    }, [searchTerm, statusFilter, invoices, sortBy, sortOrder]);

    const groupedInvoices = useMemo(() => {
        const groups: Record<string, { client: any, invoices: any[], total: number }> = {};
        filteredInvoices.forEach(inv => {
            const clientKey = inv.client.name;
            if (!groups[clientKey]) {
                groups[clientKey] = {
                    client: inv.client,
                    invoices: [],
                    total: 0
                };
            }
            groups[clientKey].invoices.push(inv);
            groups[clientKey].total += inv.total || 0;
        });
        return Object.values(groups);
    }, [filteredInvoices]);


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

    const handleStatusUpdate = async (id: string, newStatus: 'Paid' | 'Pending') => {
        try {
            toast({ title: "Actualizando estado...", description: "Por favor espera." });
            const result = await updateInvoiceStatus(id, newStatus);
            if (result.success) {
                setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv));
                toast({ title: "Estado Actualizado", description: `La factura ha sido marcada como ${newStatus === 'Paid' ? 'Pagada' : 'Pendiente'}.` });
            } else {
                toast({ title: "Error", description: result.error || "No se pudo actualizar el estado.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Ocurrió un error al actualizar el estado.", variant: "destructive" });
        }
    };

    const handleBulkStatusUpdate = async (newStatus: 'Paid' | 'Pending') => {
        if (selectedIds.length === 0) return;
        try {
            toast({ title: "Actualizando facturas...", description: `Cambiando ${selectedIds.length} facturas a ${newStatus === 'Paid' ? 'Pagadas' : 'Pendientes'}.` });
            const result = await bulkUpdateInvoiceStatus(selectedIds, newStatus);
            if (result.success) {
                setInvoices(invoices.map(inv => selectedIds.includes(inv.id) ? { ...inv, status: newStatus } : inv));
                setSelectedIds([]);
                toast({ title: "Facturas Actualizadas", description: "El estado ha sido actualizado correctamente." });
            } else {
                toast({ title: "Error", description: result.error || "No se pudieron actualizar las facturas.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Ocurrió un error al realizar la actualización masiva.", variant: "destructive" });
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
            {dbError && (
                <Alert variant="destructive" className="rounded-md border-danger text-danger">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-medium text-xs">No se pudieron cargar las facturas</AlertTitle>
                    <AlertDescription className="text-sm">{dbError}</AlertDescription>
                </Alert>
            )}

            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">Facturas</h2>
                    <p className="text-sm text-muted-foreground">Gestiona tus facturas y cobros emitidos.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9">
                        <FileDown className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                    <Button size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-medium" asChild>
                        <Link href="/dashboard/invoices/new">
                            <Plus className="mr-2 h-4 w-4" /> Nueva Factura
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Facturado" value={formatCurrency(stats.total)} trend="Histórico" icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Cobrado" value={formatCurrency(stats.cobrado)} trend="Ingresos confirmados" icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Pendiente" value={formatCurrency(stats.pendiente)} trend="A la espera de cobro" icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />} />
            </div>

            {/* Filters Rack */}
            <Card className="rounded-xl border border-border shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-card">
                <div className="relative flex-1 w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar por cliente o número..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 pl-9 rounded-md text-sm transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="h-9">
                        <TabsList className="h-full rounded-md px-1 py-1 bg-muted">
                            <TabsTrigger value="All" className="rounded text-xs px-3 h-7">Todas</TabsTrigger>
                            <TabsTrigger value="Paid" className="rounded text-xs px-3 h-7">Pagadas</TabsTrigger>
                            <TabsTrigger value="Pending" className="rounded text-xs px-3 h-7">Pendientes</TabsTrigger>
                            <TabsTrigger value="Overdue" className="rounded text-xs px-3 h-7 text-danger data-[state=active]:bg-danger/10 data-[state=active]:text-danger">Vencidas</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 rounded-md text-muted-foreground font-normal">
                                <ArrowUpDown className="h-4 w-4 mr-2" /> Ordenar
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-md p-1">
                            <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} className="text-xs cursor-pointer rounded-sm">Cliente</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSortBy('issueDate'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} className="text-xs cursor-pointer rounded-sm">Fecha de emisión</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSortBy('dueDate'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} className="text-xs cursor-pointer rounded-sm">Vencimiento</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>


                </div>
            </Card>

            {/* Batch Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent font-medium rounded-md px-2 py-0.5">
                            {selectedIds.length} seleccionadas
                        </Badge>
                        <p className="text-xs text-muted-foreground">Cambiar estado de facturas seleccionadas:</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            size="sm" 
                            className="bg-emerald-600 text-white hover:bg-emerald-700 h-8 rounded-md text-xs font-medium"
                            onClick={() => handleBulkStatusUpdate('Paid')}
                        >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Marcar como Pagadas
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline"
                            className="border-amber-500/30 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 h-8 rounded-md text-xs font-medium"
                            onClick={() => handleBulkStatusUpdate('Pending')}
                        >
                            <AlertCircle className="mr-1.5 h-3.5 w-3.5" /> Marcar como Pendientes
                        </Button>
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-xs font-medium"
                            onClick={() => setSelectedIds([])}
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {/* Invoices Table */}
            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
                            <tr>
                                <th className="w-10 px-4 py-3">
                                    <input 
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
                                        checked={filteredInvoices.length > 0 && selectedIds.length === filteredInvoices.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedIds(filteredInvoices.map(inv => inv.id));
                                            } else {
                                                setSelectedIds([]);
                                            }
                                        }}
                                    />
                                </th>
                                <th className="px-4 py-3 font-medium">Factura</th>
                                <th className="px-4 py-3 font-medium">Cliente</th>
                                <th className="px-4 py-3 font-medium">Emisión</th>
                                <th className="px-4 py-3 font-medium">Vencimiento</th>
                                <th className="px-4 py-3 font-medium text-right">Importe</th>
                                <th className="px-4 py-3 font-medium text-center">Estado</th>
                                <th className="px-4 py-3 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {dbLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">Cargando facturas...</td>
                                </tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">No se encontraron facturas.</td>
                                </tr>
                            ) : isStacked ? (
                                groupedInvoices.map((group) => {
                                    const hasMultiple = group.invoices.length > 1;
                                    const isExpanded = !!expandedClients[group.client.name];
                                    
                                    if (!hasMultiple) {
                                        const invoice = group.invoices[0];
                                        return (
                                            <tr key={invoice.id} className="hover:bg-muted/30 transition-colors group">
                                                <td className="w-10 px-4 py-3">
                                                    <input 
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
                                                        checked={selectedIds.includes(invoice.id)}
                                                        onChange={() => {
                                                            setSelectedIds(prev => 
                                                                prev.includes(invoice.id) 
                                                                    ? prev.filter(id => id !== invoice.id) 
                                                                    : [...prev, invoice.id]
                                                            );
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {invoice.invoiceNumber}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground">{invoice.client.name}</span>
                                                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">{invoice.client.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground text-xs">
                                                    {format(new Date(invoice.issueDate), 'dd MMM yyyy', { locale: es })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-muted-foreground text-xs">{format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: es })}</span>
                                                        {invoice.status === 'Overdue' && (
                                                            <span className="text-[10px] text-danger font-medium flex items-center gap-1 mt-0.5">
                                                                <AlertCircle className="h-3 w-3" /> Vencida
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-foreground">
                                                    {formatCurrency(invoice.total)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <InvoiceStatusBadge status={invoice.status} />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                                                            <Link href={`/dashboard/invoices/${invoice.id}`}><View className="h-4 w-4" /></Link>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleDownloadPdf(invoice)}>
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48 rounded-md p-1">
                                                                {invoice.status !== 'Paid' ? (
                                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(invoice.id, 'Paid')} className="text-xs text-success focus:bg-success/10 focus:text-success cursor-pointer rounded-sm">
                                                                        <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como Pagada
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(invoice.id, 'Pending')} className="text-xs text-warning focus:bg-warning/10 focus:text-warning cursor-pointer rounded-sm">
                                                                        <AlertCircle className="h-4 w-4 mr-2" /> Marcar como Pendiente
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem asChild className="text-xs cursor-pointer rounded-sm">
                                                                    <Link href={`/dashboard/invoices/${invoice.id}/edit`}><Edit className="h-4 w-4 mr-2" /> Editar</Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleDelete(invoice.id)} className="text-xs text-danger focus:bg-danger/10 focus:text-danger cursor-pointer rounded-sm">
                                                                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                    
                                    return (
                                        <React.Fragment key={group.client.name}>
                                            <tr 
                                                className="bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer group/row"
                                                onClick={() => toggleClient(group.client.name)}
                                            >
                                                <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
                                                        checked={group.invoices.every(inv => selectedIds.includes(inv.id))}
                                                        onChange={(e) => {
                                                            const invoiceIds = group.invoices.map(inv => inv.id);
                                                            if (e.target.checked) {
                                                                setSelectedIds(prev => Array.from(new Set([...prev, ...invoiceIds])));
                                                            } else {
                                                                setSelectedIds(prev => prev.filter(id => !invoiceIds.includes(id)));
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 font-medium text-muted-foreground text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        <Layers className="h-3.5 w-3.5" />
                                                        <span>{group.invoices.length} facturas</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {group.client.name}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground text-xs">
                                                    -
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground text-xs">
                                                    -
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-foreground">
                                                    {formatCurrency(group.total)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge variant="secondary" className="text-[10px] uppercase font-medium px-2 py-0.5 border-transparent shadow-none bg-muted text-muted-foreground">
                                                        Agrupadas
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase tracking-wider font-semibold">
                                                        {isExpanded ? 'Contraer' : 'Expandir'}
                                                    </Button>
                                                </td>
                                            </tr>
                                            {isExpanded && group.invoices.map((invoice) => (
                                                <tr key={invoice.id} className="bg-card hover:bg-muted/10 transition-colors group border-l-2 border-primary/40">
                                                    <td className="w-10 px-4 py-3 pl-6">
                                                        <input 
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
                                                            checked={selectedIds.includes(invoice.id)}
                                                            onChange={() => {
                                                                setSelectedIds(prev => 
                                                                    prev.includes(invoice.id) 
                                                                        ? prev.filter(id => id !== invoice.id) 
                                                                        : [...prev, invoice.id]
                                                                );
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 pl-4 font-medium text-foreground text-xs">
                                                        {invoice.invoiceNumber}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-foreground text-xs">{invoice.client.name}</span>
                                                            <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{invoice.client.email}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground text-xs">
                                                        {format(new Date(invoice.issueDate), 'dd MMM yyyy', { locale: es })}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-muted-foreground text-xs">{format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: es })}</span>
                                                            {invoice.status === 'Overdue' && (
                                                                <span className="text-[10px] text-danger font-medium flex items-center gap-1 mt-0.5">
                                                                    <AlertCircle className="h-3 w-3" /> Vencida
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-foreground text-xs">
                                                        {formatCurrency(invoice.total)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <InvoiceStatusBadge status={invoice.status} />
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                                                                <Link href={`/dashboard/invoices/${invoice.id}`}><View className="h-4 w-4" /></Link>
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleDownloadPdf(invoice)}>
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48 rounded-md p-1">
                                                                    {invoice.status !== 'Paid' ? (
                                                                        <DropdownMenuItem onClick={() => handleStatusUpdate(invoice.id, 'Paid')} className="text-xs text-success focus:bg-success/10 focus:text-success cursor-pointer rounded-sm">
                                                                            <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como Pagada
                                                                        </DropdownMenuItem>
                                                                    ) : (
                                                                        <DropdownMenuItem onClick={() => handleStatusUpdate(invoice.id, 'Pending')} className="text-xs text-warning focus:bg-warning/10 focus:text-warning cursor-pointer rounded-sm">
                                                                            <AlertCircle className="h-4 w-4 mr-2" /> Marcar como Pendiente
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem asChild className="text-xs cursor-pointer rounded-sm">
                                                                        <Link href={`/dashboard/invoices/${invoice.id}/edit`}><Edit className="h-4 w-4 mr-2" /> Editar</Link>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleDelete(invoice.id)} className="text-xs text-danger focus:bg-danger/10 focus:text-danger cursor-pointer rounded-sm">
                                                                        <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="w-10 px-4 py-3">
                                            <input 
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
                                                checked={selectedIds.includes(invoice.id)}
                                                onChange={() => {
                                                    setSelectedIds(prev => 
                                                        prev.includes(invoice.id) 
                                                            ? prev.filter(id => id !== invoice.id) 
                                                            : [...prev, invoice.id]
                                                    );
                                                }}
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-medium text-foreground">
                                            {invoice.invoiceNumber}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground">{invoice.client.name}</span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[150px]">{invoice.client.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs">
                                            {format(new Date(invoice.issueDate), 'dd MMM yyyy', { locale: es })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground text-xs">{format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: es })}</span>
                                                {invoice.status === 'Overdue' && (
                                                    <span className="text-[10px] text-danger font-medium flex items-center gap-1 mt-0.5">
                                                        <AlertCircle className="h-3 w-3" /> Vencida
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-foreground">
                                            {formatCurrency(invoice.total)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <InvoiceStatusBadge status={invoice.status} />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                                                    <Link href={`/dashboard/invoices/${invoice.id}`}><View className="h-4 w-4" /></Link>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleDownloadPdf(invoice)}>
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 rounded-md p-1">
                                                        {invoice.status !== 'Paid' ? (
                                                            <DropdownMenuItem onClick={() => handleStatusUpdate(invoice.id, 'Paid')} className="text-xs text-success focus:bg-success/10 focus:text-success cursor-pointer rounded-sm">
                                                                <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como Pagada
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleStatusUpdate(invoice.id, 'Pending')} className="text-xs text-warning focus:bg-warning/10 focus:text-warning cursor-pointer rounded-sm">
                                                                <AlertCircle className="h-4 w-4 mr-2" /> Marcar como Pendiente
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem asChild className="text-xs cursor-pointer rounded-sm">
                                                            <Link href={`/dashboard/invoices/${invoice.id}/edit`}><Edit className="h-4 w-4 mr-2" /> Editar</Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDelete(invoice.id)} className="text-xs text-danger focus:bg-danger/10 focus:text-danger cursor-pointer rounded-sm">
                                                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
