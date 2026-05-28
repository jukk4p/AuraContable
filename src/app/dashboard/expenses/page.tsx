"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
    MoreHorizontal, Plus, Search,
    Calendar as CalendarIcon, FileDown,
    Receipt, Trash2, Edit, View, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useLocale } from '@/lib/i18n/locale-provider';
import { getExpenses, deleteExpense } from '@/actions/expenses';
import { toast } from '@/hooks/use-toast';

export default function ExpensesPage() {
    const { formatCurrency } = useLocale();
    const { data: session, status } = useSession();
    const user = session?.user;
    const router = useRouter();
    
    const [expenses, setExpenses] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<'All' | string>('All');
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

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black font-headline tracking-tighter capitalize">Gestión de Gastos</h2>
                    <p className="text-muted-foreground font-medium italic">Controla tus compras, suministros y gastos operativos.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleExportCsv} variant="outline" className="h-12 rounded-2xl px-6 font-bold border-2 border-dashed border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-solid hover:text-primary transition-all active:scale-95 shadow-sm group/export">
                        <FileDown className="mr-2 h-4 w-4 transition-transform group-hover/export:-translate-y-0.5" /> Exportar
                    </Button>
                    
                    <Button 
                        onClick={() => router.push('/dashboard/expenses/new')}
                        className="h-12 rounded-2xl px-6 font-black shadow-xl shadow-destructive/20 bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <Plus className="mr-2 h-5 w-5 stroke-[2.5]" />
                        Nuevo Gasto
                    </Button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Gasto Acumulado" value={formatCurrency(expenses.reduce((s, e) => s + ((e.amount || 0) * (e.quantity || 1)), 0))} trend="Total Bruto" />
                <StatCard title="Categoría Principal" value={expenses.length > 0 ? (expenses[0].category) : "N/A"} trend="Reciente" />
                <StatCard title="Nº Registros" value={expenses.length.toString()} trend="Últimos 30 días" />
            </div>

            {/* Filters */}
            <Card className="glass-card border-none shadow-xl shadow-black/5 p-2 rounded-[2rem]">
                <CardContent className="p-2 flex flex-col lg:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-destructive transition-colors" />
                        <Input 
                            placeholder="Buscar por proveedor o descripción..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-14 pl-14 rounded-2xl bg-muted/30 border-none group-focus-within:ring-2 ring-destructive/10 transition-all font-bold text-lg"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Expenses Grid/Table */}
            <div className="grid gap-4">
                <AnimatePresence>
                    {dbLoading ? (
                         <div className="p-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
                    ) : (
                        filteredExpenses.map((expense, idx) => (
                            <motion.div 
                                key={expense.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => router.push(`/dashboard/expenses/${expense.id}/edit`)}
                                className="group relative bg-white dark:bg-slate-900 border border-border/40 hover:border-destructive/40 rounded-[2rem] p-6 shadow-xl shadow-black/[0.02] hover:shadow-destructive/5 transition-all cursor-pointer"
                            >
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center group-hover:bg-destructive/10 transition-colors shadow-inner">
                                            <Receipt className="h-7 w-7 text-muted-foreground group-hover:text-destructive transition-colors" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-black font-headline tracking-tighter group-hover:text-destructive transition-colors">{expense.provider}</h3>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="bg-muted/40 text-[10px] font-black uppercase tracking-widest border-none px-3 py-1 rounded-lg">
                                                    {expense.category}
                                                </Badge>
                                                <span className="text-muted-foreground font-medium text-xs italic">
                                                    {format(new Date(expense.date), 'dd MMM yyyy', { locale: es })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between md:justify-end gap-10 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Importe Total</p>
                                            <p className="text-2xl font-black tracking-tighter text-destructive">
                                                {formatCurrency((expense.amount || 0) * (expense.quantity || 1))}
                                            </p>
                                            {(expense.quantity && expense.quantity > 1) && (
                                                <p className="text-[10px] font-medium text-muted-foreground">
                                                    {expense.quantity} x {formatCurrency(expense.amount)}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-destructive/10 group/dots transition-all">
                                                        <MoreHorizontal className="h-5 w-5 text-muted-foreground group-hover/dots:text-destructive transition-colors" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="glass rounded-2xl border-white/10 shadow-2xl p-1 w-48 font-bold">
                                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest px-3 py-2 opacity-50">Acciones de Gasto</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => router.push(`/dashboard/expenses/${expense.id}/edit`)} className="rounded-xl p-3 gap-3 text-xs focus:bg-primary/5 cursor-pointer">
                                                        <Edit className="h-4 w-4" /> Editar Gasto
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => {
                                                            if (expense.receiptUrl) {
                                                                const url = expense.receiptUrl;
                                                                if (url.startsWith('data:')) {
                                                                    try {
                                                                        const parts = url.split(',');
                                                                        const mime = parts[0].match(/:(.*?);/)?.[1] || '';
                                                                        const bstr = atob(parts[1]);
                                                                        let n = bstr.length;
                                                                        const u8arr = new Uint8Array(n);
                                                                        while (n--) {
                                                                            u8arr[n] = bstr.charCodeAt(n);
                                                                        }
                                                                        const file = new Blob([u8arr], { type: mime });
                                                                        const fileURL = URL.createObjectURL(file);
                                                                        window.open(fileURL, '_blank');
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                        window.open(url, '_blank');
                                                                    }
                                                                } else {
                                                                    window.open(url, '_blank');
                                                                }
                                                            } else {
                                                                toast({ title: "Sin justificante", description: "Este gasto no tiene un recibo o ticket asociado.", variant: "destructive" });
                                                            }
                                                        }} 
                                                        className="rounded-xl p-3 gap-3 text-xs focus:bg-primary/5 cursor-pointer"
                                                    >
                                                        <View className="h-4 w-4" /> Ver Recibo
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-border/50" />
                                                    <DropdownMenuItem onClick={() => handleDeleteExpense(expense.id)} className="rounded-xl p-3 gap-3 text-xs text-destructive focus:bg-destructive/5 cursor-pointer">
                                                        <Trash2 className="h-4 w-4" /> Eliminar Registro
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                                 {expense.description && (() => {
                                     let displayDescription = expense.description;
                                     try {
                                         const parsed = JSON.parse(expense.description);
                                         if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.items)) {
                                             displayDescription = parsed.items.map((it: any) => `${it.description} (x${it.quantity})`).join(', ');
                                         } else if (Array.isArray(parsed)) {
                                             displayDescription = parsed.map((it: any) => `${it.description} (x${it.quantity})`).join(', ');
                                         }
                                     } catch (e) {
                                         // Keep original plain text
                                     }
                                     return (
                                         <div className="mt-4 pt-4 border-t border-dashed border-border/40">
                                             <p className="text-xs text-muted-foreground italic font-medium">"{displayDescription}"</p>
                                         </div>
                                     );
                                 })()}
                            </motion.div>
                        ))
                     )}
                </AnimatePresence>
            </div>
            
            {!dbLoading && filteredExpenses.length === 0 && (
                <div className="text-center py-20 bg-muted/20 rounded-[3rem] border-2 border-dashed border-muted">
                    <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No hay gastos registrados todavía</p>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, trend }: { title: string, value: string, trend: string }) {
    return (
        <Card className="glass-card border-none shadow-xl shadow-black/5 p-6 rounded-[2rem] space-y-2 group hover:shadow-destructive/5 transition-all">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 group-hover:text-destructive transition-colors">{title}</p>
            <div className="flex justify-between items-end">
                <h3 className="text-3xl font-black font-headline tracking-tighter">{value}</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-destructive bg-destructive/10 px-3 py-1 rounded-full">{trend}</span>
            </div>
        </Card>
    );
}