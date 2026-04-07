"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { 
    MoreHorizontal, Plus, Search, Filter, 
    Calendar as CalendarIcon, FileDown,
    Receipt, ShoppingCart, Smartphone, 
    CreditCard, Trash2, Edit, View,
    ArrowUpRight, AlertCircle, PlusCircle,
    X
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
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useLocale } from '@/lib/i18n/locale-provider';
import { getExpenses, addExpense, updateExpense, deleteExpense } from '@/actions/expenses';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Expense } from '@/lib/types';

function ExpenseForm({ expense, onSave, onCancel, isSaving }: { expense?: any | null, onSave: (data: any) => void, onCancel: () => void, isSaving: boolean }) {
    const { t } = useLocale();
    const [amount, setAmount] = useState(expense?.amount?.toString() || '');
    const [category, setCategory] = useState(expense?.category || 'General');
    const [provider, setProvider] = useState(expense?.provider || '');
    const [description, setDescription] = useState(expense?.description || '');
    const [date, setDate] = useState(expense?.date ? format(new Date(expense.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ 
            id: expense?.id, 
            amount: parseFloat(amount), 
            category, 
            provider, 
            description, 
            date: new Date(date) 
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <DialogHeader className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-destructive/10 text-destructive">
                        {expense ? <Edit className="h-6 w-6 stroke-[2.5]" /> : <Receipt className="h-6 w-6 stroke-[2.5]" />}
                    </div>
                    <div>
                        <DialogTitle className="text-3xl font-black font-headline tracking-tighter">
                            {expense ? "Editar Gasto" : "Registrar Nuevo Gasto"}
                        </DialogTitle>
                        <DialogDescription className="font-medium italic opacity-70">
                            Introduce los detalles de tu compra o suministro para deducir el gasto.
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <div className="grid gap-8 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <Label htmlFor="provider" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                            <ShoppingCart className="h-3 w-3 text-destructive" /> Proveedor
                        </Label>
                        <Input 
                            id="provider" 
                            value={provider} 
                            onChange={(e) => setProvider(e.target.value)} 
                            placeholder="Amazon, Movistar..." 
                            required 
                            disabled={isSaving} 
                            className="h-14 rounded-2xl bg-white dark:bg-slate-900 border-2 border-destructive/5 focus:border-destructive/20 focus:bg-white transition-all shadow-sm font-bold text-lg px-6" 
                        />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                            <CreditCard className="h-3 w-3 text-destructive" /> Importe (Base Imponible)
                        </Label>
                        <div className="relative">
                            <Input 
                                id="amount" 
                                type="number" 
                                step="0.01" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)} 
                                placeholder="0.00" 
                                required 
                                disabled={isSaving} 
                                className="h-14 rounded-2xl bg-white dark:bg-slate-900 border-2 border-destructive/5 focus:border-destructive/20 focus:bg-white transition-all shadow-sm font-bold text-lg px-6" 
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">€</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                            <PlusCircle className="h-3 w-3 text-destructive" /> Categoría
                        </Label>
                        <div className="relative">
                            <select 
                                id="category" 
                                value={category} 
                                onChange={(e) => setCategory(e.target.value)} 
                                className="flex h-14 w-full rounded-2xl bg-white dark:bg-slate-900 border-2 border-destructive/5 px-6 py-2 text-sm font-bold shadow-sm focus:outline-none focus:border-destructive/20 transition-all appearance-none cursor-pointer"
                            >
                                <option value="Suministros">Suministros</option>
                                <option value="Software">Software</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Viajes">Viajes</option>
                                <option value="Otros">Otros</option>
                            </select>
                            <MoreHorizontal className="absolute right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="date" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                            <CalendarIcon className="h-3 w-3 text-destructive" /> Fecha de Operación
                        </Label>
                        <Input 
                            id="date" 
                            type="date" 
                            value={date} 
                            onChange={(e) => setDate(e.target.value)} 
                            required 
                            disabled={isSaving} 
                            className="h-14 rounded-2xl bg-white dark:bg-slate-900 border-2 border-destructive/5 focus:border-destructive/20 focus:bg-white transition-all shadow-sm font-bold text-lg px-6" 
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                        <Smartphone className="h-3 w-3 text-destructive" /> Descripción Adicional
                    </Label>
                    <Textarea 
                        id="description" 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        placeholder="Compra de servidores, suscripción mensual..." 
                        disabled={isSaving} 
                        className="min-h-[120px] rounded-[1.5rem] bg-white dark:bg-slate-900 border-2 border-destructive/5 focus:border-destructive/20 focus:bg-white transition-all shadow-sm font-medium p-6 resize-none" 
                    />
                </div>
            </div>

            <DialogFooter className="pt-6 border-t border-destructive/5 gap-4 flex flex-col sm:flex-row">
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={onCancel} 
                    disabled={isSaving} 
                    className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs px-8 hover:bg-muted"
                >
                    Cancelar
                </Button>
                <Button 
                    type="submit" 
                    disabled={isSaving} 
                    className="h-14 rounded-2xl px-10 font-black shadow-2xl shadow-destructive/20 bg-destructive hover:bg-destructive/90 text-white transition-all hover:scale-[1.02] active:scale-95"
                >
                    {isSaving ? (
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                            Guardando...
                        </div>
                    ) : (expense ? "Sincronizar Gasto" : "Registrar Gasto")}
                </Button>
            </DialogFooter>
        </form>
    );
}

export default function ExpensesPage() {
    const { t, formatCurrency } = useLocale();
    const { data: session, status } = useSession();
    const user = session?.user;
    
    const [expenses, setExpenses] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<'All' | string>('All');
    const [dbLoading, setDbLoading] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);

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

    const categories = Array.from(new Set(expenses.map(e => e.category)));

    const handleSaveExpense = async (data: any) => {
        if (!user?.id) return;
        setIsSaving(true);
        try {
            if (data.id) {
                await updateExpense(data.id, data);
                setExpenses(expenses.map(e => e.id === data.id ? { ...e, ...data } : e));
                toast({ title: "Gasto Actualizado", description: "Los cambios han sido guardados correctamente." });
            } else {
                const newExpense = await addExpense({ ...data, userId: user.id });
                setExpenses([newExpense, ...expenses]);
                toast({ title: "Gasto Registrado", description: "El nuevo gasto ha sido añadido a tu contabilidad." });
            }
            setIsFormOpen(false);
            setEditingExpense(null);
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Hubo un problema al guardar el gasto.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

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
                    
                    <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if(!open) setEditingExpense(null); }}>
                        <DialogTrigger asChild>
                            <Button className="h-12 rounded-2xl px-6 font-black shadow-xl shadow-destructive/20 bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all hover:scale-[1.02] active:scale-95">
                                <Plus className="mr-2 h-5 w-5 stroke-[2.5]" />
                                Nuevo Gasto
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl glass rounded-[2.5rem] border-white/10 shadow-3xl p-8">
                            <ExpenseForm 
                                expense={editingExpense} 
                                onSave={handleSaveExpense} 
                                onCancel={() => setIsFormOpen(false)} 
                                isSaving={isSaving} 
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Gasto Acumulado" value={formatCurrency(expenses.reduce((s, e) => s + (e.amount || 0), 0))} trend="Total Bruto" />
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
                                onClick={() => { setEditingExpense(expense); setIsFormOpen(true); }}
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
                                            <p className="text-2xl font-black tracking-tighter text-destructive">{formatCurrency(expense.amount)}</p>
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
                                                    <DropdownMenuItem onClick={() => { setEditingExpense(expense); setIsFormOpen(true); }} className="rounded-xl p-3 gap-3 text-xs focus:bg-primary/5 cursor-pointer">
                                                        <Edit className="h-4 w-4" /> Editar Gasto
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="rounded-xl p-3 gap-3 text-xs focus:bg-primary/5 cursor-pointer">
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
                                {expense.description && (
                                    <div className="mt-4 pt-4 border-t border-dashed border-border/40">
                                        <p className="text-xs text-muted-foreground italic font-medium">"{expense.description}"</p>
                                    </div>
                                )}
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