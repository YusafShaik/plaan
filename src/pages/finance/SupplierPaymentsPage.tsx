import { CreateSupplierPaymentModal } from './CreateSupplierPaymentModal'
import { SupplierPaymentDetailsModal } from './SupplierPaymentDetailsModal'
import { SettlementListPage } from './SettlementListPage'
import { financeService } from '../../services/financeService'
import type { SupplierPayment } from '../../types/finance'

export function SupplierPaymentsPage(props: {
  initialInvoiceId?: number | null
  onConsumedInitialInvoice?: () => void
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
} = {}) {
  return (
    <SettlementListPage<SupplierPayment>
      {...props}
      searchPlaceholder="Search payments..."
      numberHeader="Payment no."
      partyHeader="Supplier"
      itemLabel="payments"
      emptyTitle="No payments found"
      emptyDescription="Record a payment against a posted purchase invoice."
      deleteTitle="Delete draft payment?"
      deleteDescription="This draft supplier payment will be permanently deleted."
      postVerb="Post payment"
      fetchList={financeService.getSupplierPayments}
      postItem={financeService.postSupplierPayment}
      deleteItem={financeService.deleteSupplierPayment}
      toRow={(p) => ({
        id: p.id,
        number: p.paymentNumber,
        date: p.paymentDate,
        invoiceNumber: p.invoiceNumber,
        partyName: p.supplierName,
        paymentMethod: p.paymentMethod,
        amount: p.amount,
        status: p.status,
      })}
      renderModals={({
        isCreateOpen,
        closeCreate,
        itemToEdit,
        preselectedInvoiceId,
        selectedItem,
        isDetailsOpen,
        closeDetails,
        openEditFromDetails,
        reload,
      }) => (
        <>
          <CreateSupplierPaymentModal
            isOpen={isCreateOpen}
            onClose={closeCreate}
            onSuccess={reload}
            paymentToEdit={itemToEdit}
            preselectedInvoiceId={preselectedInvoiceId}
          />
          <SupplierPaymentDetailsModal
            isOpen={isDetailsOpen}
            payment={selectedItem}
            onClose={closeDetails}
            onEdit={openEditFromDetails}
            onDeleted={reload}
            onPosted={reload}
          />
        </>
      )}
    />
  )
}
