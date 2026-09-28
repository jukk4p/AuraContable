"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type { Invoice, Receipt } from "@/lib/types";
import { linkReceiptToInvoice } from "@/actions/receipts";
import { buildInvoiceConcept } from "@/lib/receipt-utils";
import { useLocale } from "@/lib/i18n/locale-provider";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NO_INVOICE = "__none__";

interface LinkReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: Receipt | null;
  invoices: Invoice[];
  onLinked: () => Promise<void>;
}

export default function LinkReceiptDialog({ open, onOpenChange, receipt, invoices, onLinked }: LinkReceiptDialogProps) {
  const { t, formatCurrency } = useLocale();
  const [invoiceId, setInvoiceId] = useState<string>(NO_INVOICE);
  const [concept, setConcept] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !receipt) return;
    setInvoiceId(receipt.invoiceId || NO_INVOICE);
    setConcept(receipt.concept);
  }, [open, receipt]);

  // Solo facturas del mismo cliente que el recibo, para no vincular por
  // error a la factura de otro cliente. Si el recibo no tiene cliente
  // asociado (nombre libre), se permite elegir cualquier factura.
  const availableInvoices = useMemo(() => {
    if (!receipt) return [];
    return receipt.clientId
      ? invoices.filter((inv) => inv.clientId === receipt.clientId)
      : invoices;
  }, [receipt, invoices]);

  const selectedInvoice = availableInvoices.find((inv) => inv.id === invoiceId);
  const isLinked = invoiceId !== NO_INVOICE;

  useEffect(() => {
    // Al elegir una factura, el concepto pasa a mostrar su detalle (líneas)
    // en vez del texto manual: es lo que representa el cobro de verdad.
    if (selectedInvoice) setConcept(buildInvoiceConcept(selectedInvoice));
  }, [selectedInvoice]);

  if (!receipt) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await linkReceiptToInvoice(
        receipt.id,
        isLinked ? invoiceId : null,
        concept,
      );
      if (result.success) {
        toast({ title: t('receipts.linkSuccessTitle'), description: t('receipts.linkSuccessDescription') });
        onOpenChange(false);
        await onLinked();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo vincular el recibo.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('receipts.linkDialogTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('receipts.linkSelectLabel')}</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_INVOICE}>{t('receipts.linkNoInvoice')}</SelectItem>
                {availableInvoices.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {formatCurrency(inv.total)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableInvoices.length === 0 && (
              <p className="text-xs text-muted-foreground">{t('receipts.linkEmptyState')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('receipts.concept')}</Label>
            <Textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              disabled={isLinked}
              className={isLinked ? "text-muted-foreground" : undefined}
            />
            {isLinked && (
              <p className="text-xs text-muted-foreground">{t('receipts.linkConceptAutoHint')}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('receipts.linkSave')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
