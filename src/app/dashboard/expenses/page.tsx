"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
    MoreHorizontal, Plus, Search,
    FileDown, Receipt, Trash2, Edit, View, AlertCircle, RefreshCw, Calculator,
    FileText, Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from 'next/link';

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

import { useLocale } from '@/lib/i18n/locale-provider';
import { getExpenses, deleteExpense } from '@/actions/expenses';
import { toast } from '@/hooks/use-toast';
import { getReceiptMeta } from '@/lib/receipt-utils';

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

export default function ExpensesPage() {
    const { formatCurrency } = useLocale();
    const { data: session, status } = useSession();
    const user = session?.user;
    const router = useRouter();
    
    const [expenses, setExpenses] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('All');
    const [dbLoading, setDbLoading] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);

    useEffect(() => {
        const fetchExpenses = async () => {
            if (user?.id) {
                setDbLoading(true);
                try {
                    const data = await getExpenses(user.id);
                    setExpenses(data);
                } catch (e) {
                    console.error(e);
                    setDbError("No se pudieron cargar los gastos.");
                } finally {
                    setDbLoading(false);
                }
            } else if (status !== 'loading') {
                setDbLoading(false);
            }
        };
        fetchExpenses();
    }, [user, status]);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(expenses.map(e => e.category).filter(Boolean))) as string[];
        return ['All', ...cats.slice(0, 4)];
    }, [expenses]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(expense => {
            const matchesSearch = 
                expense.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
                expense.description?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'All' || expense.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, categoryFilter, expenses]);

    const handleDeleteExpense = async (id: string) => {
        try {
            await deleteExpense(id);
            setExpenses(expenses.filter(e => e.id !== id));
            toast({ title: "Gasto Eliminado", description: "El registro ha sido borrado." });
        } catch (e) {
            toast({ title: "Error", description: "No se pudo eliminar el gasto.", variant: "destructive" });
        }
    };

    const handleExportCsv = () => {
        if (!filteredExpenses.length) {
            toast({ title: "Sin datos", description: "No hay gastos para exportar.", variant: "destructive" });
            return;
        }
        const headers = ['Proveedor', 'Categoría', 'Fecha', 'Importe', 'Descripción'];
        const rows = filteredExpenses.map(e => [
            e.provider,
            e.category,
            format(new Date(e.date), 'dd/MM/yyyy'),
            (e.amount || 0).toFixed(2),
            e.description || '',
        ]);
        const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Gastos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "CSV Exportado", description: `Se han exportado ${filteredExpenses.length} gastos.` });
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
                    <h2 className="text-2xl font-semibold tracking-tight">Gestión de Gastos</h2>
                    <p className="text-sm text-muted-foreground">Controla tus compras, suministros y gastos operativos.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportCsv} variant="outline" size="sm" className="h-9">
                        <FileDown className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                    
                    <Button 
                        onClick={() => router.push('/dashboard/expenses/new')}
                        size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Gasto
                    </Button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Gasto Acumulado" value={formatCurrency(expenses.reduce((s, e) => s + ((e.amount || 0) * (e.quantity || 1)), 0))} trend="Total Bruto" />
                <StatCard title="Categoría Principal" value={expenses.length > 0 ? (expenses[0].category) : "N/A"} trend="Reciente" />
                <StatCard title="Nº Registros" value={expenses.length.toString()} trend="Últimos 30 días" />
            </div>

            {/* Filters Row */}
            <Card className="rounded-xl border border-border shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-card">
                <div className="relative flex-1 w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar proveedor o concepto..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 pl-9 rounded-md text-sm transition-all"
                    />
                </div>
                {categories.length > 1 && (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="h-9">
                            <TabsList className="h-full rounded-md px-1 py-1 bg-muted">
                                {categories.map(cat => (
                                    <TabsTrigger key={cat} value={cat} className="rounded text-xs px-3 h-7 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                        {cat === 'All' ? 'Todas' : cat}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>
                )}
            </Card>

            {dbError && (
                <Alert variant="destructive" className="rounded-md border-danger text-danger">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-medium text-xs">Error</AlertTitle>
                    <AlertDescription className="text-sm">{dbError}</AlertDescription>
                </Alert>
            )}

            {/* Expenses Table */}
            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
                            <tr>
                                <th className="px-4 py-3 font-medium">Proveedor</th>
                                <th className="px-4 py-3 font-medium">Concepto</th>
                                <th className="px-4 py-3 font-medium">Categoría</th>
                                <th className="px-4 py-3 font-medium">Fecha</th>
                                <th className="px-4 py-3 font-medium text-center">Deducible</th>
                                <th className="px-4 py-3 font-medium text-right">Importe</th>
                                <th className="px-4 py-3 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {dbLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">Cargando gastos...</td>
                                </tr>
                            ) : filteredExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">No se encontraron gastos.</td>
                                </tr>
                            ) : (
                                filteredExpenses.map((expense) => {
                                    // Mock % deducible & Recurrencia for UI purposes based on category/provider to be deterministic
                                    const isRecurring = expense.provider.toLowerCase().includes('suscripcion') || expense.provider.toLowerCase().includes('software');
                                    const deductibility = expense.category === 'Transporte' ? '50%' : expense.category === 'Comidas' ? '0%' : '100%';
                                    const receiptMeta = getReceiptMeta(expense.receiptUrl);
                                    const hasReceipt = !!receiptMeta;

                                    return (
                                    <tr key={expense.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-4 py-3 font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                                {expense.provider}
                                                {isRecurring && <span title="Gasto recurrente"><RefreshCw className="h-3 w-3 text-primary opacity-70" /></span>}
                                                {hasReceipt && (
                                                    <button
                                                        type="button"
                                                        onClick={() => window.open(expense.receiptUrl, '_blank')}
                                                        title={`Ver factura${receiptMeta?.kind === 'image' ? ' (imagen)' : receiptMeta?.kind === 'pdf' ? ' (PDF)' : ''}`}
                                                        aria-label="Ver factura adjunta"
                                                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/30 transition-colors"
                                                    >
                                                        {receiptMeta?.kind === 'image' ? (
                                                            <ImageIcon className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <FileText className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[200px]" title={(() => {
                                            try {
                                                const parsed = JSON.parse(expense.description);
                                                if (parsed && Array.isArray(parsed.items)) {
                                                    return parsed.items.map((item: any) => item.description).join(', ');
                                                }
                                            } catch (e) {}
                                            return expense.description || 'Sin concepto';
                                        })()}>
                                            {(() => {
                                                try {
                                                    const parsed = JSON.parse(expense.description);
                                                    if (parsed && Array.isArray(parsed.items)) {
                                                        return parsed.items.map((item: any) => item.description).join(', ');
                                                    }
                                                } catch (e) {}
                                                return expense.description || 'Sin concepto';
                                            })()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className="text-[10px] uppercase font-medium border-border/50 rounded-md">
                                                {expense.category}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs">
                                            {format(new Date(expense.date), 'dd MMM yyyy', { locale: es })}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge variant="secondary" className="bg-primary/5 text-primary text-[10px] font-medium border-transparent shadow-none px-1.5 flex items-center justify-center gap-1 w-fit mx-auto">
                                                <Calculator className="h-3 w-3" /> {deductibility}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-foreground">
                                            {formatCurrency((expense.amount || 0) * (expense.quantity || 1))}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => router.push(`/dashboard/expenses/${expense.id}/edit`)}>
                                                    <View className="h-4 w-4" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40 rounded-md p-1">
                                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/expenses/${expense.id}/edit`)} className="text-xs cursor-pointer rounded-sm">
                                                            <Edit className="h-4 w-4 mr-2" /> Editar
                                                        </DropdownMenuItem>
                                                        {expense.receiptUrl && (
                                                            <DropdownMenuItem onClick={() => window.open(expense.receiptUrl, '_blank')} className="text-xs cursor-pointer rounded-sm">
                                                                <View className="h-4 w-4 mr-2" /> Ver Recibo
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator className="bg-border/50 mx-1" />
                                                        <DropdownMenuItem onClick={() => handleDeleteExpense(expense.id)} className="text-xs text-danger focus:bg-danger/10 focus:text-danger cursor-pointer rounded-sm">
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