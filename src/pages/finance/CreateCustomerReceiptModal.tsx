import { useCallback } from 'react'
import { financeService } from '../../services/financeService'
import { SettlementFormModal } from './SettlementFormModal'
import type { CustomerReceipt } from '../../types/finance'

export interface CreateCustomerReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  receiptToEdit?: CustomerReceipt | null
  preselectedInvoiceId?: number | null
}

export function CreateCustomerReceiptModal({
  receiptToEdit,
  ...props
}: CreateCustomerReceiptModalProps) {
  const getEligibleInvoices = useCallback(async () => {
    const list = await financeService.getEligibleSalesInvoices()
    return list.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      partyName: inv.customerName,
      totalAmount: inv.totalAmount,
      settledAmount: inv.receivedAmount,
      outstandingAmount: inv.outstandingAmount,
    }))
  }, [])

  const getInvoiceById = useCallback(async (invoiceId: number) => {
    const inv = await financeService.getSalesInvoiceForReceipt(invoiceId)
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      partyName: inv.customerName,
      totalAmount: inv.totalAmount,
      settledAmount: inv.receivedAmount,
      outstandingAmount: inv.outstandingAmount,
    }
  }, [])

  return (
    <SettlementFormModal
      {...props}
      recordToEdit={
        receiptToEdit
          ? {
              id: receiptToEdit.id,
              number: receiptToEdit.receiptNumber,
              date: receiptToEdit.receiptDate,
              invoiceId: receiptToEdit.salesInvoiceId,
              invoiceNumber: receiptToEdit.invoiceNumber,
              partyName: receiptToEdit.customerName,
              invoiceTotal: receiptToEdit.invoiceTotal,
              previouslySettled: receiptToEdit.previouslyReceived,
              outstandingAmount: receiptToEdit.outstandingAmount,
              amount: receiptToEdit.amount,
              paymentMethod: receiptToEdit.paymentMethod,
              paymentReference: receiptToEdit.paymentReference,
              notes: receiptToEdit.notes,
            }
          : null
      }
      createTitle="Record customer receipt"
      editTitlePrefix="Edit receipt"
      subtitle="Apply an incoming collection against a posted customer invoice."
      numberLabel="Receipt number"
      dateLabel="Receipt date *"
      invoiceLabel="Sales invoice *"
      partyLabel="Customer"
      amountLabel="Receipt amount *"
      previouslySettledLabel="Previously received"
      outstandingLabel="Outstanding receivable"
      remainingLabel="Remaining receivable"
      submitLabel="Post receipt"
      missingInvoiceError="Please select a sales invoice."
      exceedBalanceError="Receipt amount cannot exceed the outstanding receivable."
      defaultPrefix="REC-..."
      getNextNumber={financeService.getNextReceiptNumber}
      getEligibleInvoices={getEligibleInvoices}
      getInvoiceById={getInvoiceById}
      createRecord={async (p) => {
        const res = await financeService.createCustomerReceipt({
          receiptNumber: p.number,
          receiptDate: p.date,
          salesInvoiceId: p.invoiceId,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          paymentReference: p.paymentReference,
          notes: p.notes,
          status: p.status,
        })
        return { number: res.receiptNumber }
      }}
      updateRecord={(id, p) =>
        financeService.updateCustomerReceipt(id, {
          receiptDate: p.date,
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
