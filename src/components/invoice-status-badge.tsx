"use client";
import { Badge } from "@/components/ui/badge"
import { useLocale } from "@/lib/i18n/locale-provider";
import type { InvoiceStatus } from "@/lib/types"

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
}

export default function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const { t } = useLocale();

  const getStatusText = () => {
    switch (status) {
      case 'Paid': return t('invoices.statusPaid');
      case 'Pending': return t('invoices.statusPending');
      case 'Overdue': return t('invoices.statusOverdue');
      default: return status;
    }
  }

  const getStyles = () => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-500/10 text-emerald-500 border-none';
      case 'Pending':
        return 'bg-amber-500/10 text-amber-500 border-none';
      case 'Overdue':
        return 'bg-destructive/10 text-destructive border-none';
      default:
        return 'bg-muted text-muted-foreground border-none';
    }
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest leading-none transition-all duration-300", 
        getStyles()
      )}
    >
      {getStatusText()}
    </Badge>
  );
}

import { cn } from "@/lib/utils";
