
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { MoreHorizontal, PlusCircle, CalendarIcon } from 'lucide-react';
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

interface Expense {
    id: string;
    date: Date;
    category: string;
    provider: string;
    description: string;
    amount: number;
    tax: number;
}

// Mock data for expenses - replace with real data from Firestore
const initialExpenses: Expense[] = [
  { id: 'exp-1', date: new Date('2024-07-15'), category: 'Software', provider: 'Adobe', description: 'Creative Cloud Subscription', amount: 59.99, tax: 12.60 },
  { id: 'exp-2', date: new Date('2024-07-12'), category: 'Office Supplies', provider: 'Amazon', description: 'Printer Paper', amount: 25.50, tax: 5.36 },
  { id: 'exp-3', date: new Date('2024-07-10'), category: 'Travel', provider: 'Uber', description: 'Trip to client meeting', amount: 35.00, tax: 7.35 },
  { id: 'exp-4', date: new Date('2024-06-28'), category: 'Marketing', provider: 'Google Ads', description: 'Ad Campaign', amount: 250.00, tax: 52.50 },
];

const expenseCategories = ['Software', 'Marketing', 'Office Supplies', 'Travel', 'Utilities', 'Other'];

function ExpenseForm({ expense, onSave, onCancel }: { expense?: Expense | null, onSave: (expense: Omit<Expense, 'id'> & { id?: string }) => void, onCancel: () => void }) {
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

    return (
        <form onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle>{expense ? t('common.edit') + ' ' + t('nav.expenses') : t('expenses.addNewExpense')}</DialogTitle>
                <DialogDescription>{expense ? t('expenses.addNewExpenseDescription') : t('expenses.addNewExpenseDescription')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="date">{t('expenses.date')}</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
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
                     <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('expenses.selectCategory')} />
                        </SelectTrigger>
                        <SelectContent>
                            {expenseCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="provider">{t('expenses.provider')}</Label>
                    <Input id="provider" value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g. Amazon, Google" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">{t('expenses.description')}</Label>
                    <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('expenses.descriptionPlaceholder')} required />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">{t('expenses.amount')}</Label>
                        <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="tax">{t('expenses.tax')}</Label>
                        <Input id="tax" type="number" value={tax} onChange={e => setTax(e.target.value)} placeholder="0.00" required />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="attachment">{t('expenses.attachment')}</Label>
                    <Input id="attachment" type="file" />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
                <Button type="submit">{t('common.save')}</Button>
            </DialogFooter>
        </form>
    )
}

export default function ExpensesPage() {
    const { t, formatCurrency, locale } = useLocale();
    const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    const localeMap = { es: es };

    const filteredExpenses = useMemo(() => {
        return expenses.filter(expense =>
            expense.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, expenses]);

    const handleSaveExpense = (expenseData: Omit<Expense, 'id'> & { id?: string }) => {
        if (expenseData.id) {
            setExpenses(expenses.map(e => e.id === expenseData.id ? { ...e, ...expenseData } as Expense : e));
        } else {
            const newExpense: Expense = {
                id: `exp-${Date.now()}`,
                ...expenseData,
            } as Expense;
            setExpenses([...expenses, newExpense]);
        }
        setIsFormOpen(false);
        setEditingExpense(null);
    };

    const handleDeleteExpense = (expenseId: string) => {
        setExpenses(expenses.filter(e => e.id !== expenseId));
    };

    const handleOpenForm = (expense: Expense | null = null) => {
        setEditingExpense(expense);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingExpense(null);
    };

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
                        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenForm()}>
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    {t('expenses.newExpense')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={handleCloseForm}>
                                <ExpenseForm expense={editingExpense} onSave={handleSaveExpense} onCancel={handleCloseForm} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
        </Card>
    );
}

    