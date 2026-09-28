"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";

import type { Receipt } from "@/lib/types";
import { createReceipt, updateReceipt } from "@/actions/receipts";
import { useLocale } from "@/lib/i18n/locale-provider";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ClientOption = { id: string; name: string; taxId?: string | null };

type Method = 'Transferencia' | 'Efectivo' | 'Otro';

const METHODS: { value: Method; labelKey: string }[] = [
  { value: 'Transferencia', labelKey: 'invoices.payments.methodTransfer' },
  { value: 'Efectivo', labelKey: 'invoices.payments.methodCash' },
  { value: 'Otro', labelKey: 'invoices.payments.methodOther' },
];

const NO_CLIENT = '__none__';

interface ReceiptFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipts: Receipt[];
  clients: ClientOption[];
  defaultValues?: {
    invoiceId?: string;
    invoiceStatus?: string;
    clientId?: string;
    clientName?: string;
    clientTaxId?: string | null;
    concept?: string;
    amount?: number;
  };
  /** Si se pasa, el diálogo edita este recibo en vez de crear uno nuevo. */
  receiptToEdit?: Receipt | null;
  onCreated: () => Promise<void>;
}

function nextReceiptNumber(existing: Receipt[]): string {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;
  const thisYear = existing.filter((r) => r.receiptNumber.startsWith(prefix));
  let next = 1;
  if (thisYear.length > 0) {
    const numbers = thisYear
      .map((r) => parseInt(r.receiptNumber.split('-').pop() || '0', 10))
      .filter((n) => !Number.isNaN(n));
    if (numbers.length > 0) next = Math.max(...numbers) + 1;
  }
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export default function ReceiptFormDialog({ open, onOpenChange, receipts, clients, defaultValues, receiptToEdit, onCreated }: ReceiptFormDialogProps) {
  const { t, formatCurrency } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!receiptToEdit;

  const [receiptNumber, setReceiptNumber] = useState("");
  const [clientId, setClientId] = useState<string>(NO_CLIENT);
  const [clientName, setClientName] = useState("");
  const [clientTaxId, setClientTaxId] = useState("");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [receivedAt, setReceivedAt] = useState<Date | undefined>(new Date());
  const [method, setMethod] = useState<Method | undefined>(undefined);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    if (receiptToEdit) {
      setReceiptNumber(receiptToEdit.receiptNumber);
      setClientId(receiptToEdit.clientId ?? NO_CLIENT);
      setClientName(receiptToEdit.clientName);
      setClientTaxId(receiptToEdit.clientTaxId ?? "");
      setConcept(receiptToEdit.concept);
      setAmount(String(receiptToEdit.amount));
      setReceivedAt(new Date(receiptToEdit.receivedAt));
      setMethod(receiptToEdit.method ?? undefined);
      setNote(receiptToEdit.note ?? "");
      return;
    }
    setReceiptNumber(nextReceiptNumber(receipts));
    setClientId(defaultValues?.clientId ?? NO_CLIENT);
    setClientName(defaultValues?.clientName ?? "");
    setClientTaxId(defaultValues?.clientTaxId ?? "");
    setConcept(defaultValues?.concept ?? "");
    setAmount(defaultValues?.amount ? String(defaultValues.amount) : "");
    setReceivedAt(new Date());
    setMethod(undefined);
    setNote("");
    // Solo al abrir: no se quiere resetear el formulario mientras el usuario escribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, receiptToEdit]);

  const handleClientChange = (value: string) => {
    setClientId(value);
    if (value !== NO_CLIENT) {
      const picked = clients.find((c) => c.id === value);
      if (picked) {
        setClientName(picked.name);
        setClientTaxId(picked.taxId || "");
      }
    }
  };

  const handleClientNameChange = (value: string) => {
    setClientName(value);
    // Si el usuario reescribe el nombre a mano, el recibo deja de estar
    // vinculado al cliente elegido en el desplegable: si no, quedaría
    // enlazado a un cliente cuyo nombre ya no coincide con lo que se ve.
    if (clientId !== NO_CLIENT) setClientId(NO_CLIENT);
  };

  const isDuplicateNumber = receiptNumber.trim().length > 0 &&
    receipts.some((r) => r.receiptNumber === receiptNumber.trim() && r.id !== receiptToEdit?.id);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (!receiptNumber.trim() || !clientName.trim() || !concept.trim() || !receivedAt || !parsedAmount || parsedAmount <= 0) {
      toast({ title: "Error", description: "Rellena número, cliente, concepto e importe.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        receiptNumber: receiptNumber.trim(),
        clientId: clientId !== NO_CLIENT ? clientId : undefined,
        clientName: clientName.trim(),
        clientTaxId: clientTaxId.trim() || undefined,
        concept: concept.trim(),
        amount: parsedAmount,
        receivedAt,
        method,
        note: note || undefined,
      };
      const result = isEditing
        ? await updateReceipt(receiptToEdit!.id, payload)
        : await createReceipt({ ...payload, invoiceId: defaultValues?.invoiceId });
      if (result.success) {
        toast(
          isEditing
            ? { title: t('receipts.editSuccessTitle'), description: t('receipts.editSuccessDescription') }
            : { title: "Recibo Creado", description: `Se ha generado el recibo ${receiptNumber}.` },
        );
        onOpenChange(false);
        await onCreated();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo guardar el recibo.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? t('receipts.editDialogTitle') : t('receipts.addButton')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label>{t('receipts.receiptNumber')}</Label>
            <Input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
            {isDuplicateNumber && (
              <p className="text-xs text-amber-500">{t('receipts.duplicateNumberWarning')}</p>
            )}
          </div>
          {defaultValues?.invoiceStatus && defaultValues.invoiceStatus !== 'Paid' && (
            <p className="text-xs text-muted-foreground rounded-md bg-muted/50 p-2">
              {t('receipts.unpaidInvoiceHint')}
            </p>
          )}
          {clients.length > 0 && (
            <div className="space-y-2">
              <Label>{t('receipts.clientOptional')}</Label>
              <Select value={clientId} onValueChange={handleClientChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CLIENT}>—</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>{t('receipts.client')}</Label>
            <Input value={clientName} onChange={(e) => handleClientNameChange(e.target.value)} placeholder="Nombre del cliente" />
          </div>
          <div className="space-y-2">
            <Label>CIF/NIF</Label>
            <Input value={clientTaxId} onChange={(e) => setClientTaxId(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-2">
            <Label>{t('receipts.concept')}</Label>
            <Textarea value={concept} onChange={(e) => setConcept(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('receipts.amount')}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('receipts.date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !receivedAt && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {receivedAt ? format(receivedAt, "PPP", { locale: es }) : <span>{t('newInvoice.pickDate')}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={receivedAt} onSelect={setReceivedAt} initialFocus locale={es} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>{t('receipts.method')}</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
              <SelectTrigger>
                <SelectValue placeholder={t('receipts.method')} />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{t(m.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('receipts.note')}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('invoices.payments.notePlaceholder')} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEditing ? t('receipts.editSaveButton') : t('receipts.addButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
