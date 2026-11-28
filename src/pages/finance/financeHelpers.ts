import type { BadgeProps } from '../../components/ui/Badge'
import type { InvoicePaymentStatus, PaymentMethod } from '../../types/finance'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank transfer',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
}

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
]

export const POST_STATUS_FILTERS: { value: '' | 'DRAFT' | 'POSTED'; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'POSTED', label: 'Posted' },
]

export function getPaymentStatusMeta(status?: InvoicePaymentStatus): {
  variant: NonNullable<BadgeProps['variant']>
  label: string
} {
  if (status === 'PAID') return { variant: 'success', label: 'Paid' }
  if (status === 'PARTIALLY_PAID') return { variant: 'warning', label: 'Partially paid' }
  return { variant: 'neutral', label: 'Unpaid' }
}
