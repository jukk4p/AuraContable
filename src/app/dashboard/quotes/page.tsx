"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { 
    MoreHorizontal, View, Edit, Trash2, 
    Download, Plus, Search,
    FileDown, AlertCircle, FileSignature, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from "next-auth/react";

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n/locale-provider';

function StatCard({ title, value, trend }: { title: string, value: string, trend: string }) {
    return (
        <Card className="p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2 bg-card hover:border-border/80 transition-colors">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <div className="flex justify-between items-end">
                <h3 className="text-2xl font-semibold tracking-tight">{value}</h3>
                <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{trend}</span>
            </div>
        </Card>
    );
}

export default function QuotesPage() {
    const { formatCurrency } = useLocale();
    const { data: session, status } = useSession();
    const user = session?.user;
    
    const [quotes, setQuotes] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const filteredQuotes = quotes.filter(quote => {
        const matchesSearch = 
            quote.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || quote.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleConvertToInvoice = (id: string) => {
        toast({ title: "Convertido a Factura", description: "El presupuesto ha sido convertido a factura (Demo)." });
    };

    const handleDelete = (id: string) => {
        setQuotes(quotes.filter(q => q.id !== id));
        toast({ title: "Presupuesto Eliminado", description: "El documento ha sido eliminado." });
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
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">Presupuestos</h2>
                    <p className="text-sm text-muted-foreground">Envía propuestas a tus clientes y conviértelas en facturas.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9">
                        <FileDown className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                    <Button size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Presupuesto
                    </Button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Aprobado" value={formatCurrency(quotes.filter(q => q.status === 'Accepted').reduce((a,b)=>a+b.total,0))} trend="Confirmado" />
                <StatCard title="Pendiente de Respuesta" value={formatCurrency(quotes.filter(q => q.status === 'Pending').reduce((a,b)=>a+b.total,0))} trend="Enviado" />
                <StatCard title="Tasa de Conversión" value="0%" trend="Aceptados vs Emitidos" />
            </div>

            {/* Filters */}
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
                    <Tabs value={statusFilter} onValueChange={setStatusFilter} className="h-9">
                        <TabsList className="h-full rounded-md px-1 py-1 bg-muted">
                            <TabsTrigger value="All" className="rounded text-xs px-3 h-7">Todos</TabsTrigger>
                            <TabsTrigger value="Accepted" className="rounded text-xs px-3 h-7">Aceptados</TabsTrigger>
                            <TabsTrigger value="Pending" className="rounded text-xs px-3 h-7">Pendientes</TabsTrigger>
                            <TabsTrigger value="Rejected" className="rounded text-xs px-3 h-7">Rechazados</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </Card>

            {/* Quotes Table */}
            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
                            <tr>
                                <th className="px-4 py-3 font-medium">Presupuesto</th>
                                <th className="px-4 py-3 font-medium">Cliente</th>
                                <th className="px-4 py-3 font-medium">Emisión</th>
                                <th className="px-4 py-3 font-medium">Validez</th>
                                <th className="px-4 py-3 font-medium text-right">Importe</th>
                                <th className="px-4 py-3 font-medium text-center">Estado</th>
                                <th className="px-4 py-3 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredQuotes.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">No se encontraron presupuestos.</td>
                                </tr>
                            ) : (
                                filteredQuotes.map((quote) => {
                                    let badgeClass = "bg-muted text-muted-foreground";
                                    let badgeLabel = "Pendiente";
                                    if (quote.status === 'Accepted') {
                                        badgeClass = "bg-success/10 text-success";
                                        badgeLabel = "Aceptado";
                                    } else if (quote.status === 'Rejected') {
                                        badgeClass = "bg-danger/10 text-danger";
                                        badgeLabel = "Rechazado";
                                    }

                                    return (
                                    <tr key={quote.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-4 py-3 font-medium text-foreground">
                                            {quote.quoteNumber}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground">{quote.client.name}</span>
                                                <span className="text-xs text-muted-foreground">{quote.client.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs">
                                            {format(new Date(quote.issueDate), 'dd MMM yyyy', { locale: es })}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs">
                                            {format(new Date(quote.validUntil), 'dd MMM yyyy', { locale: es })}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-foreground">
                                            {formatCurrency(quote.total)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge variant="secondary" className={`text-[10px] uppercase font-medium px-2 py-0.5 border-transparent shadow-none ${badgeClass}`}>
                                                {badgeLabel}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {quote.status === 'Accepted' && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => handleConvertToInvoice(quote.id)} title="Convertir a Factura">
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                    <View className="h-4 w-4" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 rounded-md p-1">
                                                        <DropdownMenuItem className="text-xs cursor-pointer rounded-sm">
                                                            <Edit className="h-4 w-4 mr-2" /> Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs cursor-pointer rounded-sm">
                                                            <Download className="h-4 w-4 mr-2" /> Descargar PDF
                                                        </DropdownMenuItem>
                                                        {quote.status !== 'Accepted' && (
                                                            <DropdownMenuItem onClick={() => handleConvertToInvoice(quote.id)} className="text-xs cursor-pointer rounded-sm text-primary focus:text-primary focus:bg-primary/5">
                                                                <ArrowRight className="h-4 w-4 mr-2" /> Convertir a Factura
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator className="bg-border/50 mx-1" />
                                                        <DropdownMenuItem onClick={() => handleDelete(quote.id)} className="text-xs text-danger focus:bg-danger/10 focus:text-danger cursor-pointer rounded-sm">
                                                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
