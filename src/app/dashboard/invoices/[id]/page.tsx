
"use client"

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Download, Edit, Trash2, CheckCircle, Clock, AlertCircle as AlertCircleIcon, Send } from 'lucide-react';
import Link from 'next/link';

import type { Invoice, CompanyProfile } from '@/lib/types';
import { auth } from '@/lib/firebase/config';
import { getInvoiceById, getCompanyProfile, updateInvoice, deleteInvoice } from '@/lib/firebase/firestore';
import { useLocale } from '@/lib/i18n/locale-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import InvoiceStatusBadge from '@/components/invoice-status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { generateInvoicePdf } from '@/lib/pdf-generator';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


export default function InvoiceDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { t, formatCurrency, locale } = useLocale();
    const [user] = useAuthState(auth);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const invoiceId = params.id as string;
    const localeMap = { es: es };

    useEffect(() => {
        if (user && invoiceId) {
            const fetchInvoiceData = async () => {
                setIsLoading(true);
                try {
                    const [invoiceData, companyData] = await Promise.all([
                        getInvoiceById(invoiceId),
                        getCompanyProfile(user.uid)
                    ]);

                    if (invoiceData && invoiceData.userId === user.uid) {
                        setInvoice(invoiceData);
                    } else {
                        toast({ title: "Error", description: "Factura no encontrada o sin acceso.", variant: "destructive" });
                        setInvoice(null);
                    }
                    setCompanyProfile(companyData);
                } catch (error) {
                    console.error("Error fetching invoice details:", error);
                    toast({ title: "Error", description: "No se pudieron cargar los detalles de la factura.", variant: "destructive" });
                } finally {
                    setIsLoading(false);
                }
            };
            fetchInvoiceData();
        } else if (!user) {
            setIsLoading(false)
        }
    }, [user, invoiceId]);

    const handleDownloadPdf = async () => {
        if (!invoice) return;
        setIsDownloading(true);
        try {
            await generateInvoicePdf(invoice, companyProfile, { t, formatCurrency });
        } catch (error) {
            console.error("Error downloading PDF:", error);
            toast({ title: "Error", description: "Hubo un problema al generar el PDF.", variant: "destructive" });
        } finally {
            setIsDownloading(false);
        }
    };
    
    const handleMarkAsPaid = async () => {
        if (!invoice) return;
        setIsUpdating(true);
        try {
            await updateInvoice(invoice.id, { status: 'Paid' });
            setInvoice({ ...invoice, status: 'Paid' });
            toast({ title: "Factura Actualizada", description: "La factura ha sido marcada como pagada." });
        } catch (error) {
             console.error("Error updating invoice status:", error);
            toast({ title: "Error", description: "No se pudo actualizar el estado de la factura.", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    }

    const handleDelete = async () => {
        if (!invoice) return;
        setIsDeleting(true);
        try {
            await deleteInvoice(invoice.id);
            toast({ title: "Factura Eliminada", description: "La factura ha sido eliminada correctamente." });
            router.push('/dashboard/invoices');
        } catch (error) {
            console.error("Error deleting invoice:", error);
            toast({ title: "Error", description: "Hubo un problema al eliminar la factura.", variant: "destructive" });
            setIsDeleting(false);
        }
    }
    
    const handleSendEmail = async () => {
        if (!invoice || !companyProfile) return;
        setIsSending(true);

        // TODO: Replace with actual email sending logic via a serverless function.
        // For now, we simulate the action and show a success message.
        console.log("Simulating sending email for invoice:", invoice.invoiceNumber);
        console.log("Using template:", companyProfile.templates?.newInvoice);
        
        // Simulate a delay for the email sending process
        await new Promise(resolve => setTimeout(resolve, 1500));

        toast({
            title: "Correo Enviado (Simulación)",
            description: `La factura ${invoice.invoiceNumber} ha sido enviada a ${invoice.client.email}.`,
        });

        setIsSending(false);
    }

    if (isLoading) {
        return <InvoiceDetailsSkeleton />;
    }

    if (!invoice) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <CardDescription>La factura que buscas no existe o no tienes permiso para verla.</CardDescription>
                    </Alert>
                    <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                    </Button>
                </CardContent>
            </Card>
        );
    }
    
    const isActionDisabled = isDownloading || isDeleting || isUpdating || isSending;
    
    return (
        <div className="max-w-4xl mx-auto space-y-6">
             <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-semibold">{t('nav.invoiceDetails')}</h1>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="text-2xl font-bold mb-1">{invoice.invoiceNumber}</CardTitle>
                        <InvoiceStatusBadge status={invoice.status} />
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={isActionDisabled} onClick={handleSendEmail}>
                            <Send className="mr-2 h-4 w-4"/> {isSending ? "Enviando..." : "Enviar por Email"}
                        </Button>
                        <Button variant="outline" size="sm" disabled={isActionDisabled} onClick={handleDownloadPdf}>
                            <Download className="mr-2 h-4 w-4"/> {isDownloading ? "Generando..." : "PDF"}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                           <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4"/> {t('common.edit')}
                           </Link>
                        </Button>
                         <Button variant="outline" size="sm" disabled={isActionDisabled || invoice.status === 'Paid'} onClick={handleMarkAsPaid}>
                            <CheckCircle className="mr-2 h-4 w-4"/> {t('invoices.markAsPaid')}
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={isActionDisabled}>
                                    <Trash2 className="mr-2 h-4 w-4"/> {isDeleting ? "Eliminando..." : t('common.delete')}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente la factura
                                    de nuestros servidores.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Separator className="my-4" />

                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                             <h3 className="font-semibold text-muted-foreground mb-2">De:</h3>
                             <p className="font-bold">{companyProfile?.name}</p>
                             <p>{companyProfile?.address}</p>
                             <p>{companyProfile?.taxId}</p>
                             <p>{companyProfile?.billingEmail}</p>
                        </div>
                        <div className="text-right">
                             <h3 className="font-semibold text-muted-foreground mb-2">Para:</h3>
                             <p className="font-bold">{invoice.client.name}</p>
                             <p>{invoice.client.address}</p>
                             <p>{invoice.client.taxId}</p>
                             <p>{invoice.client.email}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground mb-8">
                        <div className="space-y-1">
                            <p className="font-semibold">{t('invoices.issueDate')}</p>
                            <p className="text-foreground">{format(invoice.issueDate, 'PPP', { locale: localeMap[locale as keyof typeof localeMap] || undefined })}</p>
                        </div>
                         <div className="space-y-1">
                            <p className="font-semibold">{t('invoices.dueDate')}</p>
                            <p className="text-foreground">{format(invoice.dueDate, 'PPP', { locale: localeMap[locale as keyof typeof localeMap] || undefined })}</p>
                        </div>
                         <div className="space-y-1">
                            <p className="font-semibold">Importe Total</p>
                            <p className="text-foreground font-bold text-lg">{formatCurrency(invoice.total)}</p>
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('newInvoice.itemDescription')}</TableHead>
                                <TableHead className="text-center">{t('newInvoice.itemQuantity')}</TableHead>
                                <TableHead className="text-right">{t('newInvoice.itemPrice')}</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoice.items.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.description}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.price * item.quantity)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    
                    <Separator className="my-6" />

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                           {invoice.notes && (
                                <div>
                                    <h4 className="font-semibold mb-1">{t('newInvoice.notes')}</h4>
                                    <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                                </div>
                           )}
                           {invoice.terms && (
                                <div>
                                    <h4 className="font-semibold mb-1">{t('settings.invoicing.defaultTerms')}</h4>
                                    <p className="text-sm text-muted-foreground">{invoice.terms}</p>
                                </div>
                           )}
                           {companyProfile?.iban && (
                               <div>
                                    <h4 className="font-semibold mb-1">Detalles de Pago</h4>
                                    <p className="text-sm text-muted-foreground">IBAN: {companyProfile.iban}</p>
                               </div>
                           )}
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('newInvoice.subtotal')}</span>
                                <span>{formatCurrency(invoice.subtotal)}</span>
                            </div>
                            {(invoice.taxes || []).map(tax => (
                                <div key={tax.id} className="flex justify-between">
                                    <span className="text-muted-foreground">{tax.name} ({tax.percentage}%)</span>
                                    <span>{formatCurrency(invoice.subtotal * (tax.percentage / 100))}</span>
                                </div>
                            ))}
                            <Separator className="my-2"/>
                            <div className="flex justify-between font-bold text-base">
                                <span>Total</span>
                                <span>{formatCurrency(invoice.total)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


function InvoiceDetailsSkeleton() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-7 w-48" />
            </div>

            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <Skeleton className="h-8 w-40 mb-2" />
                        <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-36" />
                        <Skeleton className="h-9 w-24" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Separator className="my-4" />
                     <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <Skeleton className="h-5 w-16 mb-2" />
                            <Skeleton className="h-4 w-48 mb-1" />
                            <Skeleton className="h-4 w-64 mb-1" />
                            <Skeleton className="h-4 w-40 mb-1" />
                        </div>
                         <div className="text-right">
                             <Skeleton className="h-5 w-16 mb-2 ml-auto" />
                             <Skeleton className="h-4 w-48 mb-1 ml-auto" />
                             <Skeleton className="h-4 w-40 mb-1 ml-auto" />
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-20 mx-auto" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-24 ml-auto" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-24 ml-auto" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[1, 2].map(i => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <Separator className="my-6" />

                     <div className="grid grid-cols-2 gap-8">
                         <div>
                            <Skeleton className="h-5 w-24 mb-2" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3 mt-1" />
                        </div>
                        <div className="space-y-2">
                             <div className="flex justify-between">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-5 w-24" />
                            </div>
                            <div className="flex justify-between">
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-5 w-20" />
                            </div>
                            <Separator className="my-2"/>
                             <div className="flex justify-between">
                                <Skeleton className="h-6 w-16" />
                                <Skeleton className="h-6 w-28" />
                            </div>
                        </div>
                     </div>

                </CardContent>
            </Card>
        </div>
    )
}
