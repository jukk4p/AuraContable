"use client";

import React, { useEffect, useMemo } from 'react';
import { 
    Calendar as CalendarIcon, ShoppingCart, 
    CreditCard, Trash2, Camera, Receipt, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { useLocale } from '@/lib/i18n/locale-provider';
import { addExpense, updateExpense } from '@/actions/expenses';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const expenseFormSchema = z.object({
    provider: z.string().min(1, "El proveedor es obligatorio"),
    amount: z.coerce.number().min(0.01, "El importe debe ser mayor a 0"),
    quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1"),
    category: z.string().min(1, "La categoría es obligatoria"),
    customCategory: z.string().optional(),
    date: z.date({required_error: "La fecha es obligatoria"}),
    description: z.string().min(1, "La descripción o concepto es obligatoria"),
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

interface ExpenseFormProps {
    expense?: any | null;
    userId: string;
}

export default function ExpenseForm({ expense, userId }: ExpenseFormProps) {
    const { t, formatCurrency, locale: currentLocale } = useLocale();
    const router = useRouter();
    const isEditing = !!expense;

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
    const watchedAmount = form.watch("amount");
    const watchedQuantity = form.watch("quantity");
    const watchedReceiptUrl = form.watch("receiptUrl");

    const totalCalculated = useMemo(() => {
        const amt = parseFloat(String(watchedAmount)) || 0;
        const qty = parseInt(String(watchedQuantity)) || 1;
        return amt * qty;
    }, [watchedAmount, watchedQuantity]);

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

    const onSubmit = async (data: ExpenseFormValues) => {
        try {
            const payload = {
                amount: data.amount,
                category: data.category === 'Otros' ? (data.customCategory || 'Otros') : data.category,
                provider: data.provider,
                description: data.description || '',
                date: data.date,
                receiptUrl: data.receiptUrl,
                quantity: data.quantity,
                userId
            };

            if (isEditing) {
                await updateExpense(expense.id, payload);
                toast({ title: "Gasto Actualizado", description: "Los cambios han sido guardados correctamente." });
            } else {
                await addExpense(payload);
                toast({ title: "Gasto Registrado", description: "El nuevo gasto ha sido añadido a tu contabilidad." });
            }
            router.push('/dashboard/expenses');
            router.refresh();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Hubo un problema al guardar el gasto.", variant: "destructive" });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-5xl mx-auto">
                <div className="flex items-center gap-4">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.back()}
                        className="rounded-xl border hover:bg-muted"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-black font-headline tracking-tighter">
                            {isEditing ? "Editar Gasto" : "Crear Nuevo Gasto"}
                        </h2>
                        <p className="text-muted-foreground text-sm font-medium italic">
                            Introduce los detalles de tu compra o suministro para deducir el gasto.
                        </p>
                    </div>
                </div>

                <Card className="glass-card border-none shadow-2xl rounded-[2.5rem] p-4 sm:p-8">
                    <CardHeader className="pb-6 border-b border-border/50">
                        <CardTitle className="text-lg font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-destructive" /> Información General
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-8">
                        {/* Top Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField
                                control={form.control}
                                name="provider"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                                            Proveedor
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="Amazon, Movistar..." 
                                                className="h-12 rounded-2xl bg-muted/20 border-2 border-transparent focus:border-destructive/20 focus:bg-white transition-all shadow-sm font-semibold px-5" 
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="ml-1 text-xs font-semibold text-destructive" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                                            Categoría
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-2 border-transparent focus:border-destructive/20 focus:bg-white focus:ring-4 focus:ring-destructive/5 transition-all text-sm font-semibold px-5">
                                                    <SelectValue placeholder="Selecciona categoría" />
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
                                            Fecha de Operación
                                        </FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "h-12 w-full rounded-2xl border-2 border-transparent bg-muted/20 px-5 text-left font-semibold text-sm focus:border-destructive/20 focus:ring-4 focus:ring-destructive/5 transition-all hover:bg-white",
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
                                            Categoría Personalizada
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="Escribe el nombre de la categoría..." 
                                                className="h-12 rounded-2xl bg-muted/20 border-2 border-transparent focus:border-destructive/20 focus:bg-white transition-all shadow-sm font-semibold px-5" 
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="ml-1 text-xs font-semibold text-destructive" />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Conceptos Table Section */}
                        <div className="space-y-4 pt-4">
                            <Label className="text-lg font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                Conceptos
                            </Label>
                            
                            {/* Header row */}
                            <div className="hidden md:grid grid-cols-[1fr_120px_160px_160px] gap-4 items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">
                                <span>Concepto / Descripción</span>
                                <span className="text-center">Cant.</span>
                                <span className="text-right">Precio Unit.</span>
                                <span className="text-right">Total</span>
                            </div>

                            {/* Inputs row */}
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_160px_160px] gap-4 items-start bg-muted/5 p-4 rounded-3xl border border-border/50">
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground">Concepto / Descripción</span>
                                            <FormControl>
                                                <Input 
                                                    placeholder="Descripción del gasto..." 
                                                    className="h-12 rounded-2xl bg-white dark:bg-slate-900 border-2 border-border/40 focus:border-destructive/20 focus:bg-white transition-all font-semibold" 
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-xs text-destructive" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="quantity"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cant.</span>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    min="1"
                                                    className="h-12 rounded-2xl bg-white dark:bg-slate-900 border-2 border-border/40 focus:border-destructive/20 focus:bg-white transition-all font-semibold text-center" 
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-xs text-destructive" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground">Precio Unit.</span>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input 
                                                        type="number" 
                                                        step="0.01" 
                                                        placeholder="0.00" 
                                                        className="h-12 rounded-2xl bg-white dark:bg-slate-900 border-2 border-border/40 focus:border-destructive/20 focus:bg-white transition-all font-semibold text-right pr-8" 
                                                        {...field}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">€</span>
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-xs text-destructive" />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-1 text-right">
                                    <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Total</span>
                                    <div className="h-12 flex items-center justify-end font-black text-xl text-destructive px-2">
                                        {formatCurrency(totalCalculated)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Grid for Receipt and Totals summary */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-6">
                            {/* Left: Justificante */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                    Justificante / Recibo (Opcional)
                                </Label>
                                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-[2rem] border-2 border-dashed border-destructive/20 bg-muted/10 transition-colors hover:border-destructive/40">
                                    <div className="h-24 w-32 rounded-2xl border border-border bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden relative shadow-inner">
                                        {watchedReceiptUrl ? (
                                            <img src={watchedReceiptUrl} alt="Justificante" className="h-full w-full object-contain p-2" />
                                        ) : (
                                            <div className="text-center p-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-55">
                                                Sin Archivo
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-center sm:text-left space-y-3">
                                        <input 
                                            type="file" 
                                            id="expense-receipt-input-full" 
                                            accept="image/*" 
                                            onChange={handleReceiptChange}
                                            className="hidden" 
                                        />
                                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => document.getElementById('expense-receipt-input-full')?.click()}
                                                className="h-10 rounded-xl font-bold text-xs border-destructive/20 text-destructive hover:bg-destructive/5 transition-all"
                                            >
                                                <Camera className="mr-1.5 h-4 w-4" /> {watchedReceiptUrl ? "Cambiar Ticket" : "Subir Ticket / Factura"}
                                            </Button>
                                            {watchedReceiptUrl && (
                                                <Button 
                                                    type="button" 
                                                    variant="destructive" 
                                                    size="sm"
                                                    onClick={() => form.setValue('receiptUrl', '')}
                                                    className="h-10 rounded-xl font-bold text-xs px-3 transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic font-medium">Sube una imagen de tu recibo para justificar el gasto. Tamaño máx. 1MB.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Totals summary card */}
                            <div className="flex flex-col justify-end">
                                <div className="space-y-4 p-6 rounded-3xl border bg-muted/5 border-border/50">
                                    <div className="flex justify-between items-center text-sm font-semibold">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>{formatCurrency(totalCalculated)}</span>
                                    </div>
                                    <hr className="border-border/40" />
                                    <div className="flex justify-between items-center text-xl font-black text-destructive">
                                        <span>Total Gasto</span>
                                        <span>{formatCurrency(totalCalculated)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="justify-end gap-3 pt-8 border-t border-border/50">
                        <Button 
                            variant="outline" 
                            type="button" 
                            onClick={() => router.back()}
                            className="h-12 rounded-2xl font-bold px-6 hover:bg-muted"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit"
                            className="h-12 rounded-2xl px-8 font-black shadow-xl shadow-destructive/20 bg-destructive hover:bg-destructive/90 text-white transition-all hover:scale-[1.02] active:scale-95"
                        >
                            {isEditing ? "Guardar Cambios" : "Guardar Gasto"}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
