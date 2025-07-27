
"use client"

import React, { useState, useMemo } from 'react';
import { MoreHorizontal, PlusCircle, ArrowUpDown, CalendarIcon } from 'lucide-react';
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
import { cn } from '@/lib/utils';


// Mock data for expenses - replace with real data from Firestore
const mockExpenses = [
  { id: 'exp-1', date: '2024-07-15', category: 'Software', provider: 'Adobe', description: 'Creative Cloud Subscription', amount: 59.99, tax: 12.60 },
  { id: 'exp-2', date: '2024-07-12', category: 'Office Supplies', provider: 'Amazon', description: 'Printer Paper', amount: 25.50, tax: 5.36 },
  { id: 'exp-3', date: '2024-07-10', category: 'Travel', provider: 'Uber', description: 'Trip to client meeting', amount: 35.00, tax: 7.35 },
  { id: 'exp-4', date: '2024-06-28', category: 'Marketing', provider: 'Google Ads', description: 'Ad Campaign', amount: 250.00, tax: 52.50 },
];

const expenseCategories = ['Software', 'Marketing', 'Office Supplies', 'Travel', 'Utilities', 'Other'];

export default function ExpensesPage() {
    const { t, formatCurrency } = useLocale();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredExpenses = useMemo(() => {
        return mockExpenses.filter(expense =>
            expense.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

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
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    {t('expenses.newExpense')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>{t('expenses.addNewExpense')}</DialogTitle>
                                    <DialogDescription>{t('expenses.addNewExpenseDescription')}</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="date">{t('expenses.date')}</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn("w-full justify-start text-left font-normal")}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {format(new Date(), "PPP")}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="category">{t('expenses.category')}</Label>
                                         <Select>
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
                                        <Input id="provider" placeholder="e.g. Amazon, Google" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">{t('expenses.description')}</Label>
                                        <Textarea id="description" placeholder={t('expenses.descriptionPlaceholder')} />
                                    </div>
                                     <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="amount">{t('expenses.amount')}</Label>
                                            <Input id="amount" type="number" placeholder="0.00" />
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="tax">{t('expenses.tax')}</Label>
                                            <Input id="tax" type="number" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="attachment">{t('expenses.attachment')}</Label>
                                        <Input id="attachment" type="file" />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit">{t('common.save')}</Button>
                                </DialogFooter>
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
                                <TableCell>{expense.date}</TableCell>
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
                                            <DropdownMenuItem>{t('common.edit')}</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">{t('common.delete')}</DropdownMenuItem>
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
