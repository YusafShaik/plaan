import { useCallback } from 'react'
import { financeService } from '../../services/financeService'
import { SettlementFormModal } from './SettlementFormModal'
import type { SupplierPayment } from '../../types/finance'

export interface CreateSupplierPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  paymentToEdit?: SupplierPayment | null
  preselectedInvoiceId?: number | null
}

export function CreateSupplierPaymentModal({
  paymentToEdit,
  ...props
}: CreateSupplierPaymentModalProps) {
  const getEligibleInvoices = useCallback(async () => {
    const list = await financeService.getEligiblePurchaseInvoices()
    return list.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      partyName: inv.supplierName,
      totalAmount: inv.totalAmount,
      settledAmount: inv.paidAmount,
      outstandingAmount: inv.outstandingAmount,
    }))
  }, [])

  const getInvoiceById = useCallback(async (invoiceId: number) => {
    const inv = await financeService.getPurchaseInvoiceForPayment(invoiceId)
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      partyName: inv.supplierName,
      totalAmount: inv.totalAmount,
      settledAmount: inv.paidAmount,
      outstandingAmount: inv.outstandingAmount,
    }
  }, [])

  return (
    <SettlementFormModal
      {...props}
      recordToEdit={
        paymentToEdit
          ? {
              id: paymentToEdit.id,
              number: paymentToEdit.paymentNumber,
              date: paymentToEdit.paymentDate,
              invoiceId: paymentToEdit.purchaseInvoiceId,
              invoiceNumber: paymentToEdit.invoiceNumber,
              partyName: paymentToEdit.supplierName,
              invoiceTotal: paymentToEdit.invoiceTotal,
              previouslySettled: paymentToEdit.previouslyPaid,
              outstandingAmount: paymentToEdit.outstandingAmount,
              amount: paymentToEdit.amount,
              paymentMethod: paymentToEdit.paymentMethod,
              paymentReference: paymentToEdit.paymentReference,
              notes: paymentToEdit.notes,
            }
          : null
      }
      createTitle="Record supplier payment"
      editTitlePrefix="Edit payment"
      subtitle="Apply an outbound payment against a posted supplier invoice."
      numberLabel="Payment number"
      dateLabel="Payment date *"
      invoiceLabel="Purchase invoice *"
      partyLabel="Supplier"
      amountLabel="Payment amount *"
      previouslySettledLabel="Previously paid"
      outstandingLabel="Outstanding balance"
      remainingLabel="Remaining payable"
      submitLabel="Post payment"
      missingInvoiceError="Please select a purchase invoice."
      exceedBalanceError="Payment amount cannot exceed the outstanding balance."
      defaultPrefix="PAY-..."
      getNextNumber={financeService.getNextPaymentNumber}
      getEligibleInvoices={getEligibleInvoices}
      getInvoiceById={getInvoiceById}
      createRecord={async (p) => {
        const res = await financeService.createSupplierPayment({
          paymentNumber: p.number,
          paymentDate: p.date,
          purchaseInvoiceId: p.invoiceId,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          paymentReference: p.paymentReference,
          notes: p.notes,
          status: p.status,
        })
        return { number: res.paymentNumber }
      }}
      updateRecord={(id, p) =>
        financeService.updateSupplierPayment(id, {
          paymentDate: p.date,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          paymentReference: p.paymentReference,
          notes: p.notes,
          status: p.status,
        })
      }
    />
  )
}
