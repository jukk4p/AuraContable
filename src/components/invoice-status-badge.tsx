import { Badge } from "@/components/ui/badge"
import type { InvoiceStatus } from "@/lib/types"

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
}

export default function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const getVariant = (): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'Pagada':
        return 'default'; // Using a custom success-like style
      case 'Pendiente':
        return 'secondary';
      case 'Vencida':
        return 'destructive';
      default:
        return 'secondary';
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'Paid':
        return 'Pagada';
      case 'Pending':
        return 'Pendiente';
      case 'Overdue':
        return 'Vencida';
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
