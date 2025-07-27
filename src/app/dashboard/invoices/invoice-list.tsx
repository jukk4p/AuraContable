"use client"

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockInvoices } from '@/lib/data';
import type { Invoice, InvoiceStatus } from '@/lib/types';
import InvoiceStatusBadge from '@/components/invoice-status-badge';
import { useLocale } from '@/lib/i18n/locale-provider';

export default function InvoiceList() {
    const { t, formatCurrency } = useLocale();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Invoice | 'client.name'; direction: 'ascending' | 'descending' } | null>(null);

    const filteredInvoices = useMemo(() => {
        let invoices = [...mockInvoices];
        if (statusFilter !== 'All') {
            invoices = invoices.filter(invoice => invoice.status === statusFilter);
        }
        if (searchTerm) {
            invoices = invoices.filter(invoice =>
                invoice.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return invoices;
    }, [searchTerm, statusFilter]);

    const sortedInvoices = useMemo(() => {
        let sortableInvoices = [...filteredInvoices];
        if (sortConfig !== null) {
            sortableInvoices.sort((a, b) => {
                const key = sortConfig.key;
                let aValue: any;
                let bValue: any;

                if (key === 'client.name') {
                    aValue = a.client.name;
                    bValue = b.client.name;
                } else {
                    aValue = a[key as keyof Invoice];
                    bValue = b[key as keyof Invoice];
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableInvoices;
    }, [filteredInvoices, sortConfig]);

    const requestSort = (key: keyof Invoice | 'client.name') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Invoice | 'client.name') => {
        if (!sortConfig || sortConfig.key !== key) {
          return <ArrowUpDown className="ml-2 h-4 w-4" />;
        }
        if (sortConfig.direction === 'ascending') {
          return <ArrowUpDown className="ml-2 h-4 w-4" />; // Could use ArrowUp instead
        }
        return <ArrowUpDown className="ml-2 h-4 w-4" />; // Could use ArrowDown instead
      };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <CardTitle>{t('invoices.allInvoices')}</CardTitle>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder={t('invoices.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-64"
                        />
                        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as InvoiceStatus | 'All')}>
                            <TabsList>
                                <TabsTrigger value="All">{t('common.all')}</TabsTrigger>
                                <TabsTrigger value="Paid">{t('invoices.statusPaid')}</TabsTrigger>
                                <TabsTrigger value="Pending">{t('invoices.statusPending')}</TabsTrigger>
                                <TabsTrigger value="Overdue">{t('invoices.statusOverdue')}</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('client.name')}>
                                    {t('invoices.client')} {getSortIcon('client.name')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('invoiceNumber')}>
                                    {t('invoices.invoiceNumberShort')} {getSortIcon('invoiceNumber')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('total')}>
                                    {t('invoices.amount')} {getSortIcon('total')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('status')}>
                                    {t('invoices.status')} {getSortIcon('status')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('dueDate')}>
                                    {t('invoices.dueDate')} {getSortIcon('dueDate')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <span className="sr-only">{t('common.actions')}</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedInvoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="hidden h-9 w-9 sm:flex">
                                            <AvatarImage src={invoice.client.avatarUrl} alt="Avatar" data-ai-hint="person avatar" />
                                            <AvatarFallback>{invoice.client.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="font-medium">{invoice.client.name}</div>
                                    </div>
                                </TableCell>
                                <TableCell>{invoice.invoiceNumber}</TableCell>
                                <TableCell>{formatCurrency(invoice.total)}</TableCell>
                                <TableCell>
                                    <InvoiceStatusBadge status={invoice.status} />
                                </TableCell>
                                <TableCell>{invoice.dueDate}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">{t('common.menu')}</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                                            <DropdownMenuItem asChild><Link href={`/dashboard/invoices/${invoice.id}`}>{t('common.viewDetails')}</Link></DropdownMenuItem>
                                            <DropdownMenuItem>{t('invoices.markAsPaid')}</DropdownMenuItem>
                                            <DropdownMenuItem>{t('invoices.downloadPdf')}</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">{t('invoices.deleteInvoice')}</DropdownMenuItem>
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
