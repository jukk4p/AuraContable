"use client";
import { Badge } from "@/components/ui/badge"
import { useLocale } from "@/lib/i18n/locale-provider";
import type { InvoiceStatus } from "@/lib/types"

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
}

export default function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const { t } = useLocale();
  const getVariant = (): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'Paid':
        return 'default'; // Using a custom success-like style
      case 'Pending':
        return 'secondary';
      case 'Overdue':
        return 'destructive';
      default:
        return 'secondary';
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'Paid':
        return t('invoices.statusPaid');
      case 'Pending':
        return t('invoices.statusPending');
      case 'Overdue':
        return t('invoices.statusOverdue');
      default:
        return status;
    }
  }

  const getClassName = () => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800';
      default:
        return '';
    }
  }

  return (
    <Badge variant={getVariant()} className={getClassName()}>
      {getStatusText()}
    </Badge>
  );
}
