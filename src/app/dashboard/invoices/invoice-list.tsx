
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { MoreHorizontal, ArrowUpDown, View, Edit, Trash2, Download, CheckCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Invoice, InvoiceStatus } from '@/lib/types';
import InvoiceStatusBadge from '@/components/invoice-status-badge';
import { useLocale } from '@/lib/i18n/locale-provider';
import { auth } from '@/lib/firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getInvoices, deleteInvoice, getInvoiceById, getCompanyProfile, updateInvoice, addNotification } from '@/lib/firebase/firestore';
import { format } from 'date-fns';
import { es, fr, it, enUS } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, MailWarning } from "lucide-react";
import { generateInvoicePdf } from '@/lib/pdf-generator';


export default function InvoiceList() {
    const { t, formatCurrency, locale } = useLocale();
    const [user, authLoading, authError] = useAuthState(auth);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [dbLoading, setDbLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Invoice | 'client.name'; direction: 'ascending' | 'descending' } | null>(null);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const localeMap = { es, fr, it, en: enUS, ca: es };

    useEffect(() => {
        const fetchInvoices = async () => {
            if (user && user.emailVerified) {
                setDbLoading(true);
                try {
                    const userInvoices = await getInvoices(user.uid);
                    setInvoices(userInvoices);
                } catch (e: any) {
                    console.error("Error fetching invoices:", e);
                    toast({ title: "Error", description: "Hubo un problema al cargar las facturas.", variant: "destructive" });
                } finally {
                    setDbLoading(false);
                }
            } else if (!authLoading) {
                setDbLoading(false);
            }
        };
        fetchInvoices();
    }, [user, authLoading]);

    const filteredInvoices = useMemo(() => {
        let filtered = [...invoices];
        if (statusFilter !== 'All') {
            filtered = filtered.filter(invoice => invoice.status === statusFilter);
        }
        if (searchTerm) {
            filtered = filtered.filter(invoice =>
                invoice.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return filtered;
    }, [searchTerm, statusFilter, invoices]);

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
                } else if (key === 'issueDate' || key === 'dueDate') {
                    aValue = new Date(a[key] as any);
                }
                else {
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

    const handleDeleteInvoice = async (id: string) => {
        try {
            await deleteInvoice(id);
            setInvoices(invoices.filter(invoice => invoice.id !== id));
            toast({ title: t('invoices.deleteInvoice'), description: "La factura ha sido eliminada." });
        } catch (error) {
            console.error("Error deleting invoice:", error);
            toast({ title: "Error", description: "Hubo un problema al eliminar la factura.", variant: "destructive" });
        }
    }
    
    const handleMarkAsPaid = async (invoice: Invoice) => {
        if (!user) return;
        setIsUpdating(invoice.id);
        try {
            await updateInvoice(invoice.id, { status: 'Paid' });
            setInvoices(invoices.map(inv => inv.id === invoice.id ? { ...inv, status: 'Paid' } : inv));
            
            await addNotification({
                userId: user.uid,
                title: "Pago Recibido",
                body: `La factura ${invoice.invoiceNumber} ha sido pagada.`,
                href: `/dashboard/invoices/${invoice.id}`,
                isRead: false,
            });

            toast({ title: "Factura Actualizada", description: "La factura ha sido marcada como pagada." });
        } catch (error) {
             console.error("Error updating invoice status:", error);
            toast({ title: "Error", description: "No se pudo actualizar el estado de la factura.", variant: "destructive" });
        } finally {
            setIsUpdating(null);
        }
    }

    const handleDownloadPdf = async (invoiceId: string) => {
        if (!user) return;
        setIsDownloading(invoiceId);
        try {
            const invoice = await getInvoiceById(invoiceId);
            const companyProfile = await getCompanyProfile(user.uid);
            
            if (!invoice) {
                throw new Error("Invoice not found");
            }

            await generateInvoicePdf(invoice, companyProfile, { t, formatCurrency, locale });

        } catch (error) {
            console.error("Error downloading PDF:", error);
            toast({ title: "Error", description: "Hubo un problema al generar el PDF.", variant: "destructive" });
        } finally {
            setIsDownloading(null);
        }
    }

    const getSortIcon = (key: keyof Invoice | 'client.name') => {
        if (!sortConfig || sortConfig.key !== key) {
          return <ArrowUpDown className="ml-2 h-4 w-4" />;
        }
        if (sortConfig.direction === 'ascending') {
          return <ArrowUpDown className="ml-2 h-4 w-4" />; 
        }
        return <ArrowUpDown className="ml-2 h-4 w-4" />; 
      };

    if (authLoading) {
        return <p>Cargando...</p>;
    }
    
    if (authError) {
        return <p>Error de autenticación: {authError.message}</p>
    }

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
                {dbLoading && <p>Cargando facturas...</p>}
                {!dbLoading && (
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
                                    <TableCell>{format(invoice.dueDate, 'PPP', { locale: localeMap[locale as keyof typeof localeMap] || undefined })}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isDownloading === invoice.id || isUpdating === invoice.id}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">{t('common.menu')}</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/invoices/${invoice.id}`}>
                                                        <View className="mr-2 h-4 w-4"/>{t('common.viewDetails')}
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
                                                        <Edit className="mr-2 h-4 w-4"/>{t('common.edit')}
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)} disabled={invoice.status === 'Paid' || isUpdating === invoice.id}>
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    {isUpdating === invoice.id ? "Actualizando..." : t('invoices.markAsPaid')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem disabled>
                                                    <Send className="mr-2 h-4 w-4"/> Enviar por Email
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDownloadPdf(invoice.id)} disabled={isDownloading === invoice.id}>
                                                    <Download className="mr-2 h-4 w-4"/>
                                                    {isDownloading === invoice.id ? "Descargando..." : t('invoices.downloadPdf')}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleDeleteInvoice(invoice.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                    <Trash2 className="mr-2 h-4 w-4"/>
                                                    {t('invoices.deleteInvoice')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                {!dbLoading && sortedInvoices.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">No tienes facturas todavía.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
