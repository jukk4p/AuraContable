"use client";

import { useEffect, useState } from 'react';
import { Plus, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { Receipt, CompanyProfile } from '@/lib/types';
import { getReceipts, deleteReceipt } from '@/actions/receipts';
import { getCompanyProfile } from '@/actions/company';
import { generateReceiptPdf } from '@/lib/pdf-generator';
import { useLocale } from '@/lib/i18n/locale-provider';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import ReceiptFormDialog from '@/components/receipt-form-dialog';

interface ClientReceiptsCardProps {
  clientId: string;
  clientName: string;
  clientTaxId?: string | null;
}

export default function ClientReceiptsCard({ clientId, clientName, clientTaxId }: ClientReceiptsCardProps) {
  const { t, formatCurrency, locale } = useLocale();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allReceipts, company] = await Promise.all([getReceipts(), getCompanyProfile()]);
      setReceipts(allReceipts);
      setCompanyProfile(company);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientReceipts = receipts.filter((r) => r.clientId === clientId);

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
    await generateReceiptPdf(receipt, companyProfile, { t, formatCurrency, locale });
  };

  return (
    <Card className="glass-card border border-border/40 shadow-2xl rounded-[2rem] overflow-hidden p-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 mb-4">
        <CardTitle className="text-lg">{t('receipts.title')}</CardTitle>
        <Button size="sm" variant="outline" type="button" onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> {t('receipts.addButton')}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : clientReceipts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('receipts.emptyState')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('receipts.receiptNumber')}</TableHead>
                <TableHead>{t('receipts.date')}</TableHead>
                <TableHead>{t('receipts.concept')}</TableHead>
                <TableHead className="text-right">{t('receipts.amount')}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>{receipt.receiptNumber}</TableCell>
                  <TableCell>{format(new Date(receipt.receivedAt), "PPP", { locale: es })}</TableCell>
                  <TableCell className="text-muted-foreground">{receipt.concept}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(receipt.amount)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" type="button" onClick={() => handleDownload(receipt)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" type="button">
                            <Trash2 className="h-4 w-4 text-destructive" />
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <ReceiptFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        receipts={receipts}
        clients={[{ id: clientId, name: clientName, taxId: clientTaxId }]}
        defaultValues={{ clientId, clientName, clientTaxId }}
        onCreated={fetchData}
      />
    </Card>
  );
}
