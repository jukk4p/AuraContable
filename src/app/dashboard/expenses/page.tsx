
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { MoreHorizontal, PlusCircle, CalendarIcon, AlertCircle, MailWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/lib/i18n/locale-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Expense } from '@/lib/types';
import { auth } from '@/lib/firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getExpenses, addExpense, updateExpense, deleteExpense } from '@/lib/firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const expenseCategoryKeys = ['software', 'marketing', 'office_supplies', 'travel', 'utilities', 'other'];

function ExpenseForm({ expense, onSave, onCancel, isSaving }: { expense?: Expense | null, onSave: (expense: Omit<Expense, 'id' | 'userId'> & { id?: string }) => void, onCancel: () => void, isSaving: boolean }) {
    const { t, locale } = useLocale();
    const [date, setDate] = useState<Date | undefined>(expense?.date || new Date());
    const [category, setCategory] = useState(expense?.category || '');
    const [provider, setProvider] = useState(expense?.provider || '');
    const [description, setDescription] = useState(expense?.description || '');
    const [amount, setAmount] = useState(expense?.amount || '');
    const [tax, setTax] = useState(expense?.tax || '');

    const localeMap = { es: es };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !category || !provider || !description || amount === '' || tax === '') return;
        onSave({
            id: expense?.id,
            date,
            category,
            provider,
            description,
            amount: Number(amount),
            tax: Number(tax)
        });
    };
    
    const expenseCategories = expenseCategoryKeys.map(key => ({
        key: key,
        value: t(`expenses.categories.${key}`)
    }));

    return (
        <form onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle>{expense ? t('common.edit') + ' ' + t('nav.expenses') : t('expenses.addNewExpense')}</DialogTitle>
                <DialogDescription>{t('expenses.addNewExpenseDescription')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="date">{t('expenses.date')}</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                                disabled={isSaving}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP", { locale: localeMap[locale as keyof typeof localeMap] || undefined }) : <span>{t('newInvoice.pickDate')}</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category">{t('expenses.category')}</Label>
                     <Select value={category} onValueChange={setCategory} disabled={isSaving}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('expenses.selectCategory')} />
                        </SelectTrigger>
                        <SelectContent>
                            {expenseCategories.map(cat => <SelectItem key={cat.key} value={cat.value}>{cat.value}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="provider">{t('expenses.provider')}</Label>
                    <Input id="provider" value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g. Amazon, Google" required disabled={isSaving}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">{t('expenses.description')}</Label>
                    <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('expenses.descriptionPlaceholder')} required disabled={isSaving}/>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">{t('expenses.amount')}</Label>
                        <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required disabled={isSaving}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="tax">{t('expenses.tax')}</Label>
                        <Input id="tax" type="number" value={tax} onChange={e => setTax(e.target.value)} placeholder="0.00" required disabled={isSaving}/>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="attachment">{t('expenses.attachment')}</Label>
                    <Input id="attachment" type="file" disabled={isSaving}/>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>{t('common.cancel')}</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? t('common.save') + "..." : t('common.save')}</Button>
            </DialogFooter>
        </form>
    )
}

export default function ExpensesPage() {
    const { t, formatCurrency, locale } = useLocale();
    const [user, authLoading, authError] = useAuthState(auth);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [dbLoading, setDbLoading] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const localeMap = { es: es };

    useEffect(() => {
        const fetchExpenses = async () => {
            if (user && user.emailVerified) {
                setDbLoading(true);
                setDbError(null);
                try {
                    const userExpenses = await getExpenses(user.uid);
                    setExpenses(userExpenses);
                } catch (e: any) {
                    console.error("Error fetching expenses: ", e);
                    setDbError("Ha ocurrido un error al cargar los gastos.");
                } finally {
                    setDbLoading(false);
                }
            } else if (!authLoading) {
                setDbLoading(false);
            }
        };
        fetchExpenses();
    }, [user, authLoading]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(expense =>
            expense.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, expenses]);

    const handleSaveExpense = async (expenseData: Omit<Expense, 'id' | 'userId'> & { id?: string }) => {
        if (!user || !user.emailVerified) {
            toast({ title: "Error", description: "Debes iniciar sesión y verificar tu correo para realizar esta acción.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            if (expenseData.id) {
                const { id, ...updatedData } = expenseData;
                await updateExpense(id, updatedData as Omit<Expense, 'id' | 'userId'>);
                setExpenses(expenses.map(e => e.id === expenseData.id ? { ...e, ...updatedData } as Expense : e));
                toast({ title: "Gasto Actualizado", description: "El gasto ha sido actualizado." });
            } else {
                const { id, ...newExpenseData } = expenseData;
                const expenseToAdd = {
                    ...newExpenseData,
                     userId: user.uid,
                };
                const newExpense = await addExpense(expenseToAdd);
                setExpenses([...expenses, newExpense]);
                toast({ title: "Gasto Añadido", description: "El nuevo gasto ha sido añadido." });
            }
            handleCloseForm();
        } catch (error) {
            console.error("Error saving expense: ", error);
            toast({ title: "Error", description: "Hubo un problema al guardar el gasto.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteExpense = async (expenseId: string) => {
        try {
            await deleteExpense(expenseId);
            setExpenses(expenses.filter(e => e.id !== expenseId));
            toast({ title: "Gasto Eliminado", description: "El gasto ha sido eliminado." });
        } catch (error) {
            console.error("Error deleting expense: ", error);
            toast({ title: "Error", description: "Hubo un problema al eliminar el gasto.", variant: "destructive" });
        }
    };

    const handleOpenForm = (expense: Expense | null = null) => {
        setEditingExpense(expense);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingExpense(null);
    };
    
    if (authLoading) return <p>Cargando...</p>;
    if (authError) return <p>Error de autenticación: {authError.message}</p>;
    if (!user) {
        return (
           <Alert variant="destructive">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Acceso Denegado</AlertTitle>
               <AlertDescription>Debes iniciar sesión para ver esta página.</AlertDescription>
           </Alert>
       )
    }
    if (!user.emailVerified) {
       return (
           <Alert variant="destructive">
               <MailWarning className="h-4 w-4" />
               <AlertTitle>Verifica tu correo electrónico</AlertTitle>
               <AlertDescription>
                   Hemos enviado un correo de verificación a tu dirección. Por favor, revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta y poder continuar.
               </AlertDescription>
           </Alert>
       )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <CardTitle>{t('nav.expenses')}</CardTitle>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder={t('expenses.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-64"
                        />
                        <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if(!isOpen) handleCloseForm(); else setIsFormOpen(true); }}>
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenForm()} disabled={isSaving || authLoading}>
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    {t('expenses.newExpense')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { if(isFormOpen) e.preventDefault()}} onEscapeKeyDown={handleCloseForm}>
                                <ExpenseForm expense={editingExpense} onSave={handleSaveExpense} onCancel={handleCloseForm} isSaving={isSaving} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {dbLoading && <p>Cargando gastos...</p>}
                {dbError && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error de Conexión</AlertTitle>
                        <AlertDescription>{dbError}</AlertDescription>
                    </Alert>
                )}
                {!dbLoading && !dbError && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('expenses.date')}</TableHead>
                                <TableHead>{t('expenses.category')}</TableHead>
                                <TableHead>{t('expenses.provider')}</TableHead>
                                <TableHead>{t('expenses.amount')}</TableHead>
                                <TableHead>
                                    <span className="sr-only">{t('common.actions')}</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredExpenses.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell>{format(expense.date, 'PPP', { locale: localeMap[locale as keyof typeof localeMap] || undefined })}</TableCell>
                                    <TableCell>{expense.category}</TableCell>
                                    <TableCell className="font-medium">{expense.provider}</TableCell>
                                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">{t('common.toggleMenu')}</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleOpenForm(expense)}>{t('common.edit')}</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDeleteExpense(expense.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">{t('common.delete')}</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                 {!dbError && !dbLoading && filteredExpenses.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">No tienes gastos registrados.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

    
