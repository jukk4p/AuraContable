"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Trash2, Download, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from "next-auth/react";
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { useLocale } from '@/lib/i18n/locale-provider';
import { getReceipts, deleteReceipt } from '@/actions/receipts';
import { getClients } from '@/actions/clients';
import { getCompanyProfile } from '@/actions/company';
import { generateReceiptPdf } from '@/lib/pdf-generator';
import { toast } from '@/hooks/use-toast';
import type { Receipt, Client, CompanyProfile } from '@/lib/types';
import ReceiptFormDialog, { type ClientOption } from '@/components/receipt-form-dialog';

function StatCard({ title, value }: { title: string; value: string }) {
    return (
        <Card className="p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2 bg-card">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-semibold tracking-tight">{value}</h3>
        </Card>
    );
}

export default function ReceiptsPage() {
    const { t, formatCurrency, locale } = useLocale();
    const { data: session, status } = useSession();
    const user = session?.user;

    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dbLoading, setDbLoading] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const userId = user?.id;

    const fetchData = async () => {
        if (!userId) return;
        setDbLoading(true);
        setDbError(null);
        try {
            const [receiptsData, clientsData, company] = await Promise.all([
                getReceipts(),
                getClients(),
                getCompanyProfile(),
            ]);
            setReceipts(receiptsData);
            setClients(clientsData);
            setCompanyProfile(company);
        } catch (e) {
            console.error("Error cargando los recibos:", e);
            setDbError("No se pudieron cargar los recibos. Revisa tu conexión e inténtalo de nuevo.");
        } finally {
            setDbLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchData();
        } else if (status !== 'loading') {
            setDbLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, status]);

    const clientOptions: ClientOption[] = useMemo(
        () => clients.map((c) => ({ id: c.id, name: c.name, taxId: c.taxId })),
        [clients]
    );

    const filteredReceipts = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return receipts.filter((r) =>
            r.clientName.toLowerCase().includes(q) ||
            r.concept.toLowerCase().includes(q) ||
            r.receiptNumber.toLowerCase().includes(q)
        );
    }, [receipts, searchTerm]);

    const totalAmount = useMemo(() => receipts.reduce((sum, r) => sum + r.amount, 0), [receipts]);

    const handleDelete = async (id: string) => {
        const result = await deleteReceipt(id);
        if (result.success) {
            setReceipts((prev) => prev.filter((r) => r.id !== id));
            toast({ title: "Recibo Eliminado", description: "El recibo ha sido eliminado." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleDownload = async (receipt: Receipt) => {
        setDownloadingId(receipt.id);
        try {
            await generateReceiptPdf(receipt, companyProfile, { t, formatCurrency, locale });
        } catch (error) {
            console.error("Error downloading receipt PDF:", error);
            toast({ title: "Error", description: "Hubo un problema al generar el PDF.", variant: "destructive" });
        } finally {
            setDownloadingId(null);
        }
    };

    if (status === 'loading') return <div className="p-10 text-center text-sm text-muted-foreground">Cargando...</div>;

    if (!user) {
        return (
            <Alert variant="destructive" className="rounded-md border-danger text-danger">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-medium text-xs">Acceso Denegado</AlertTitle>
                <AlertDescription className="text-sm">Debes iniciar sesión para ver esta página.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">{t('receipts.title')}</h2>
                    <p className="text-sm text-muted-foreground">Genera justificantes de cobro para tus clientes.</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                    <Plus className="mr-2 h-4 w-4" /> {t('receipts.addButton')}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard title="Total Recibos" value={formatCurrency(totalAmount)} />
                <StatCard title="Nº Recibos" value={receipts.length.toString()} />
            </div>

            <Card className="rounded-xl border border-border shadow-sm p-4 bg-card">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('receipts.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 pl-9 rounded-md text-sm"
                    />
                </div>
            </Card>

            {dbError && (
                <Alert variant="destructive" className="rounded-md border-danger text-danger">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-medium text-xs">Error</AlertTitle>
                    <AlertDescription className="text-sm">{dbError}</AlertDescription>
                </Alert>
            )}

            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
                            <tr>
                                <th className="px-4 py-3 font-medium">{t('receipts.receiptNumber')}</th>
                                <th className="px-4 py-3 font-medium">{t('receipts.client')}</th>
                                <th className="px-4 py-3 font-medium">{t('receipts.concept')}</th>
                                <th className="px-4 py-3 font-medium">{t('receipts.date')}</th>
                                <th className="px-4 py-3 font-medium text-right">{t('receipts.amount')}</th>
                                <th className="px-4 py-3 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {dbLoading ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">Cargando recibos...</td></tr>
                            ) : filteredReceipts.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">{t('receipts.emptyState')}</td></tr>
                            ) : (
                                filteredReceipts.map((receipt) => (
                                    <tr key={receipt.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-4 py-3 font-medium text-foreground">{receipt.receiptNumber}</td>
                                        <td className="px-4 py-3">{receipt.clientName}</td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[240px]" title={receipt.concept}>
                                            {receipt.concept}
                                            {receipt.invoiceId && receipt.invoiceNumber && (
                                                <Link href={`/dashboard/invoices/${receipt.invoiceId}`} className="ml-2 inline-flex items-center gap-1 text-primary hover:underline">
                                                    <LinkIcon className="h-3 w-3" /> {receipt.invoiceNumber}
                                                </Link>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs">
                                            {format(new Date(receipt.receivedAt), 'dd MMM yyyy', { locale: es })}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-foreground">
                                            {formatCurrency(receipt.amount)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" disabled={downloadingId === receipt.id} onClick={() => handleDownload(receipt)}>
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t('receipts.deleteConfirmTitle')}</AlertDialogTitle>
                                                            <AlertDialogDescription>{t('receipts.deleteConfirmDescription')}</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(receipt.id)}>Continuar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ReceiptFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                receipts={receipts}
                clients={clientOptions}
                onCreated={fetchData}
            />
        </div>
    );
}
