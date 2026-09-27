"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";

import type { Invoice } from "@/lib/types";
import { addInvoicePayment, deleteInvoicePayment } from "@/actions/invoice-payments";
import { useLocale } from "@/lib/i18n/locale-provider";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface InvoicePaymentsCardProps {
  invoice: Invoice;
  onChanged: () => Promise<void>;
}

type Method = 'Transferencia' | 'Efectivo' | 'Otro';

const METHODS: { value: Method; labelKey: string }[] = [
  { value: 'Transferencia', labelKey: 'invoices.payments.methodTransfer' },
  { value: 'Efectivo', labelKey: 'invoices.payments.methodCash' },
  { value: 'Otro', labelKey: 'invoices.payments.methodOther' },
];

export default function InvoicePaymentsCard({ invoice, onChanged }: InvoicePaymentsCardProps) {
  const { t, formatCurrency } = useLocale();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState<Date | undefined>(new Date());
  const [method, setMethod] = useState<Method | undefined>(undefined);
  const [note, setNote] = useState("");

  const resetForm = () => {
    setAmount("");
    setPaidAt(new Date());
    setMethod(undefined);
    setNote("");
  };

  const handleAddPayment = async () => {
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (!paidAt || !parsedAmount || parsedAmount <= 0) {
      toast({ title: "Error", description: "Introduce un importe y una fecha válidos.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await addInvoicePayment(invoice.id, {
        amount: parsedAmount,
        paidAt,
        method,
        note: note || undefined,
      });
      if (result.success) {
        toast({ title: "Pago Registrado", description: "El pago se ha añadido a la factura." });
        setIsAddOpen(false);
        resetForm();
        await onChanged();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo registrar el pago.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    setDeletingId(paymentId);
    try {
      const result = await deleteInvoicePayment(paymentId);
      if (result.success) {
        toast({ title: "Pago Eliminado", description: "El pago se ha eliminado de la factura." });
        await onChanged();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar el pago.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">{t('invoices.payments.title')}</CardTitle>
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" /> {t('invoices.payments.addButton')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('invoices.payments.addButton')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('invoices.payments.amount')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Máximo ${formatCurrency(invoice.amountDue)}`}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('invoices.payments.date')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !paidAt && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paidAt ? format(paidAt, "PPP", { locale: es }) : <span>{t('newInvoice.pickDate')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={paidAt} onSelect={setPaidAt} initialFocus locale={es} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{t('invoices.payments.method')}</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('invoices.payments.method')} />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{t(m.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('invoices.payments.note')}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('invoices.payments.notePlaceholder')} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddPayment} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('invoices.payments.addButton')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {(invoice.amountPaid > 0 || invoice.status === 'PartiallyPaid') && (
          <div className="flex justify-between text-sm font-medium">
            <span>{t('invoices.payments.amountPaid')}: {formatCurrency(invoice.amountPaid)}</span>
            <span>{t('invoices.payments.amountDue')}: {formatCurrency(invoice.amountDue)}</span>
          </div>
        )}

        {invoice.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('invoices.payments.emptyState')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('invoices.payments.date')}</TableHead>
                <TableHead>{t('invoices.payments.method')}</TableHead>
                <TableHead>{t('invoices.payments.note')}</TableHead>
                <TableHead className="text-right">{t('invoices.payments.amount')}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{format(new Date(payment.paidAt), "PPP", { locale: es })}</TableCell>
                  <TableCell>
                    {payment.method ? t(METHODS.find((m) => m.value === payment.method)?.labelKey ?? '') : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{payment.note || '—'}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={deletingId === payment.id}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('invoices.payments.deleteConfirmTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>{t('invoices.payments.deleteConfirmDescription')}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletePayment(payment.id)}>Continuar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
