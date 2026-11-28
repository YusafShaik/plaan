import { financeService } from '../../services/financeService'
import { SettlementDetailsDrawer } from './SettlementDetailsDrawer'
import type { SupplierPayment } from '../../types/finance'

export interface SupplierPaymentDetailsModalProps {
  isOpen: boolean
  payment: SupplierPayment | null
  onClose: () => void
  onEdit?: (payment: SupplierPayment) => void
  onDeleted?: () => void
  onPosted?: (payment: SupplierPayment) => void
}

export function SupplierPaymentDetailsModal({
  isOpen,
  payment,
  onClose,
  onEdit,
  onDeleted,
  onPosted,
}: SupplierPaymentDetailsModalProps) {
  return (
    <SettlementDetailsDrawer
      isOpen={isOpen}
      record={
        payment
          ? {
              id: payment.id,
              number: payment.paymentNumber,
              date: payment.paymentDate,
              invoiceNumber: payment.invoiceNumber,
              partyName: payment.supplierName,
              paymentMethod: payment.paymentMethod,
              paymentReference: payment.paymentReference,
              invoiceTotal: payment.invoiceTotal,
              amount: payment.amount,
              outstandingAmount: payment.outstandingAmount,
              notes: payment.notes,
              status: payment.status,
            }
          : null
      }
      dateLabel="Payment date"
      invoiceLabel="Purchase invoice"
      amountLabel="Payment amount"
      outstandingLabel="Invoice outstanding"
      postButtonLabel="Post payment"
      deleteConfirmTitle="Delete draft payment?"
      deleteConfirmDescription="This draft supplier payment will be permanently deleted."
      onClose={onClose}
      onEdit={() => {
        if (payment) onEdit?.(payment)
      }}
      onPost={async (id) => {
        const updated = await financeService.postSupplierPayment(id)
        onPosted?.(updated)
      }}
      onDelete={async (id) => {
        await financeService.deleteSupplierPayment(id)
        onDeleted?.()
      }}
    />
  )
}
