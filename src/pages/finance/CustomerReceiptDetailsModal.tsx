import { financeService } from '../../services/financeService'
import { SettlementDetailsDrawer } from './SettlementDetailsDrawer'
import type { CustomerReceipt } from '../../types/finance'

export interface CustomerReceiptDetailsModalProps {
  isOpen: boolean
  receipt: CustomerReceipt | null
  onClose: () => void
  onEdit?: (receipt: CustomerReceipt) => void
  onDeleted?: () => void
  onPosted?: (receipt: CustomerReceipt) => void
}

export function CustomerReceiptDetailsModal({
  isOpen,
  receipt,
  onClose,
  onEdit,
  onDeleted,
  onPosted,
}: CustomerReceiptDetailsModalProps) {
  return (
    <SettlementDetailsDrawer
      isOpen={isOpen}
      record={
        receipt
          ? {
              id: receipt.id,
              number: receipt.receiptNumber,
              date: receipt.receiptDate,
              invoiceNumber: receipt.invoiceNumber,
              partyName: receipt.customerName,
              paymentMethod: receipt.paymentMethod,
              paymentReference: receipt.paymentReference,
              invoiceTotal: receipt.invoiceTotal,
              amount: receipt.amount,
              outstandingAmount: receipt.outstandingAmount,
              notes: receipt.notes,
              status: receipt.status,
            }
          : null
      }
      dateLabel="Receipt date"
      invoiceLabel="Sales invoice"
      amountLabel="Receipt amount"
      outstandingLabel="Outstanding receivable"
      postButtonLabel="Post receipt"
      deleteConfirmTitle="Delete draft receipt?"
      deleteConfirmDescription="This draft customer receipt will be permanently deleted."
      onClose={onClose}
      onEdit={() => {
        if (receipt) onEdit?.(receipt)
      }}
      onPost={async (id) => {
        const updated = await financeService.postCustomerReceipt(id)
        onPosted?.(updated)
      }}
      onDelete={async (id) => {
        await financeService.deleteCustomerReceipt(id)
        onDeleted?.()
      }}
    />
  )
}
