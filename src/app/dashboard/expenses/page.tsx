"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { 
    MoreHorizontal, Plus, Search, Filter, 
    Calendar as CalendarIcon, FileDown,
    Receipt, ShoppingCart, Smartphone, 
    CreditCard, Trash2, Edit, View,
    ArrowUpRight, AlertCircle, PlusCircle,
    X, Camera
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { useLocale } from '@/lib/i18n/locale-provider';
import { getExpenses, addExpense, updateExpense, deleteExpense } from '@/actions/expenses';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Expense } from '@/lib/types';

const expenseFormSchema = z.object({
    provider: z.string().min(1, "El proveedor es obligatorio"),
    amount: z.coerce.number().min(0.01, "El importe debe ser mayor a 0"),
    quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1"),
    category: z.string().min(1, "La categoría es obligatoria"),
    customCategory: z.string().optional(),
    date: z.date({required_error: "La fecha es obligatoria"}),
    description: z.string().optional(),
    receiptUrl: z.string().optional(),
}).refine(data => data.category !== 'Otros' || (data.customCategory && data.customCategory.trim().length > 0), {
    message: "Debes ingresar una categoría personalizada",
    path: ["customCategory"]
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const STANDARD_CATEGORIES = ['Suministros', 'Software', 'Marketing', 'Viajes'];
const localeMap = {
    es: es,
};

function ExpenseForm({ expense, onSave, onCancel, isSaving }: { expense?: any | null, onSave: (data: any) => void, onCancel: () => void, isSaving: boolean }) {
    const { t, locale: currentLocale } = useLocale();
    
    const initialCategory = expense?.category ? (STANDARD_CATEGORIES.includes(expense.category) ? expense.category : 'Otros') : 'Suministros';
    const initialCustomCategory = expense?.category && !STANDARD_CATEGORIES.includes(expense.category) ? expense.category : '';

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseFormSchema),
        defaultValues: {
            provider: expense?.provider || '',
            amount: expense?.amount || '',
            quantity: expense?.quantity || 1,
            category: initialCategory,
            customCategory: initialCustomCategory,
            date: expense?.date ? new Date(expense.date) : new Date(),
            description: expense?.description || '',
            receiptUrl: expense?.receiptUrl || '',
        }
    });

    const watchedCategory = form.watch("category");
    const watchedReceiptUrl = form.watch("receiptUrl");

    const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024) {
                toast({ 
                    title: "Imagen demasiado grande", 
                    description: "Por favor selecciona un archivo de menos de 1MB.", 
                    variant: "destructive" 
                });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                form.setValue('receiptUrl', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = (data: ExpenseFormValues) => {
        onSave({ 
            id: expense?.id, 
            amount: data.amount, 
            category: data.category === 'Otros' ? data.customCategory : data.category, 
            provider: data.provider, 
            description: data.description, 
            date: data.date,
            receiptUrl: data.receiptUrl,
            quantity: data.quantity
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <DialogHeader className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-destructive/10 text-destructive animate-pulse">
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

                <div className="grid gap-5 py-2">
                    <FormField
                        control={form.control}
                        name="provider"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                                    <ShoppingCart className="h-3.5 w-3.5 text-destructive" /> Proveedor
                                </FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder="Amazon, Movistar..." 
                                        disabled={isSaving} 
                                        className="h-12 rounded-2xl bg-white dark:bg-slate-900 border-2 border-destructive/5 focus:border-destructive/20 focus:bg-white transition-all shadow-sm font-semibold text-base px-5 focus:ring-4 focus:ring-destructive/5" 
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="ml-1 text-xs font-semibold text-destructive animate-in fade-in-50" />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem className="space-y-2 col-span-2">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                                        <CreditCard className="h-3.5 w-3.5 text-destructive" /> Importe (Base Imponible)
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                placeholder="0.00" 
                                                disabled={isSaving} 
                                                className="h-12 rounded-2xl bg-white dark:bg-slate-900 border-2 border-destructive/5 focus:border-destructive/20 focus:bg-white transition-all shadow-sm font-semibold text-base px-5 focus:ring-4 focus:ring-destructive/5 w-full" 
                                                {...field}
                                            />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">€</span>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="ml-1 text-xs font-semibold text-destructive" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                                <FormItem className="space-y-2 col-span-1">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                                        <PlusCircle className="h-3.5 w-3.5 text-destructive" /> Cantidad
                                    </FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="number" 
                                            min="1"
                                            disabled={isSaving} 
                                            className="h-12 rounded-2xl bg-white dark:bg-slate-900 border-2 border-destructive/5 focus:border-destructive/20 focus:bg-white transition-all shadow-sm font-semibold text-base px-5 focus:ring-4 focus:ring-destructive/5 text-center" 
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage className="ml-1 text-xs font-semibold text-destructive" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                                        <PlusCircle className="h-3.5 w-3.5 text-destructive" /> Categoría
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-12 rounded-2xl bg-white dark:bg-slate-900 border-2 border-destructive/5 focus:border-destructive/20 focus:bg-white focus:ring-4 focus:ring-destructive/5 transition-all text-sm font-semibold px-5">
                                                <SelectValue placeholder="Selecciona una categoría" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="glass border-white/10 rounded-2xl p-1 font-semibold text-sm">
                                            <SelectItem value="Suministros" className="rounded-xl p-3 focus:bg-destructive/5 cursor-pointer">Suministros</SelectItem>
                                            <SelectItem value="Software" className="rounded-xl p-3 focus:bg-destructive/5 cursor-pointer">Software</SelectItem>
                                            <SelectItem value="Marketing" className="rounded-xl p-3 focus:bg-destructive/5 cursor-pointer">Marketing</SelectItem>
                                            <SelectItem value="Viajes" className="rounded-xl p-3 focus:bg-destructive/5 cursor-pointer">Viajes</SelectItem>
                                            <SelectItem value="Otros" className="rounded-xl p-3 focus:bg-destructive/5 cursor-pointer">Otros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="ml-1 text-xs font-semibold text-destructive" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="space-y-2 flex flex-col justify-end">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                                        <CalendarIcon className="h-3.5 w-3.5 text-destructive" /> Fecha de Operación
                                    </FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "h-12 w-full rounded-2xl border-2 border-destructive/5 bg-white dark:bg-slate-900 px-5 text-left font-semibold text-sm focus:border-destructive/20 focus:ring-4 focus:ring-destructive/5 transition-all hover:bg-white",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP", { locale: localeMap[currentLocale as keyof typeof localeMap] || es })
                                                    ) : (
                                                        <span>Selecciona una fecha</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 rounded-2xl border-white/10 shadow-2xl glass" align="start">
                                            <Calendar 
                                                mode="single" 
                                                selected={field.value} 
                                                onSelect={field.onChange} 
                                                initialFocus 
                                                locale={localeMap[currentLocale as keyof typeof localeMap] || es} 
                                                className="rounded-2xl"
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage className="ml-1 text-xs font-semibold text-destructive" />
                                </FormItem>
                            )}
                        />
                    </div>

                    {watchedCategory === 'Otros' && (
                        <FormField
                            control={form.control}
                            name="customCategory"
                            render={({ field }) => (
                                <FormItem className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                                        <PlusCircle className="h-3.5 w-3.5 text-destructive" /> Categoría Personalizada
                                    </FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="Escribe el nombre de la categoría..." 
                                            disabled={isSaving} 
                                            className="h-12 rounded-2xl bg-white dark:bg-slate-900 border-2 border-destructive/5 focus:border-destructive/20 focus:bg-white transition-all shadow-sm font-semibold text-base px-5 focus:ring-4 focus:ring-destructive/5" 
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage className="ml-1 text-xs font-semibold text-destructive" />
                                </FormItem>
                            )}
                        />
                    )}

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                                    <Smartphone className="h-3.5 w-3.5 text-destructive" /> Descripción Adicional
                                </FormLabel>
                                <FormControl>
                                    <Textarea 
                                        placeholder="Compra de servidores, suscripción mensual..." 
                                        disabled={isSaving} 
                                        className="min-h-[90px] rounded-2xl bg-white dark:bg-slate-900 border-2 border-destructive/5 focus:border-destructive/20 focus:bg-white transition-all shadow-sm font-semibold text-base p-5 resize-none focus:ring-4 focus:ring-destructive/5" 
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="ml-1 text-xs font-semibold text-destructive" />
                            </FormItem>
                        )}
                    />

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                            <Receipt className="h-3.5 w-3.5 text-destructive" /> Justificante / Recibo (Opcional)
                        </Label>
                        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl border-2 border-dashed border-destructive/25 bg-muted/10 transition-colors hover:border-destructive/40">
                            <div className="h-20 w-28 rounded-xl border border-border bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden relative shadow-inner">
                                {watchedReceiptUrl ? (
                                    <img src={watchedReceiptUrl} alt="Justificante" className="h-full w-full object-contain p-2" />
                                ) : (
                                    <div className="text-center p-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-55">
                                        Sin Archivo
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 text-center sm:text-left space-y-2">
                                <input 
                                    type="file" 
                                    id="expense-receipt-input" 
                                    accept="image/*" 
                                    onChange={handleReceiptChange}
                                    className="hidden" 
                                />
                                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => document.getElementById('expense-receipt-input')?.click()}
                                        className="h-9 rounded-xl font-bold text-xs border-destructive/20 text-destructive hover:bg-destructive/5 transition-all"
                                    >
                                        <Camera className="mr-1.5 h-3.5 w-3.5" /> {watchedReceiptUrl ? "Cambiar Ticket" : "Subir Ticket / Factura"}
                                    </Button>
                                    {watchedReceiptUrl && (
                                        <Button 
                                            type="button" 
                                            variant="destructive" 
                                            size="sm"
                                            onClick={() => form.setValue('receiptUrl', '')}
                                            className="h-9 rounded-xl font-bold text-xs px-3 transition-all"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                                <p className="text-[10px] text-muted-foreground italic font-medium">Sube una imagen de tu recibo para justificar el gasto. Tamaño máx. 1MB.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-5 border-t border-destructive/5 gap-4 flex flex-col sm:flex-row">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={onCancel} 
                        disabled={isSaving} 
                        className="h-12 rounded-2xl font-black uppercase tracking-widest text-xs px-6 hover:bg-muted"
                    >
                        Cancelar
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={isSaving} 
                        className="h-12 rounded-2xl px-8 font-black shadow-xl shadow-destructive/20 bg-destructive hover:bg-destructive/90 text-white transition-all hover:scale-[1.02] active:scale-95"
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
        </Form>
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
                        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto glass rounded-[2.5rem] border-white/10 shadow-3xl p-8">
                            <ExpenseForm 
                                key={editingExpense?.id || 'new'}
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
                                                    <DropdownMenuItem onClick={() => { setEditingExpense(expense); setIsFormOpen(true); }} className="rounded-xl p-3 gap-3 text-xs focus:bg-primary/5 cursor-pointer">
                                                        <Edit className="h-4 w-4" /> Editar Gasto
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => {
                                                            if (expense.receiptUrl) {
                                                                const win = window.open();
                                                                if (win) {
                                                                    win.document.write(`<iframe src="${expense.receiptUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
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