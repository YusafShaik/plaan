import { CreateCustomerReceiptModal } from './CreateCustomerReceiptModal'
import { CustomerReceiptDetailsModal } from './CustomerReceiptDetailsModal'
import { SettlementListPage } from './SettlementListPage'
import { financeService } from '../../services/financeService'
import type { CustomerReceipt } from '../../types/finance'

export function CustomerReceiptsPage(props: {
  initialInvoiceId?: number | null
  onConsumedInitialInvoice?: () => void
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
} = {}) {
  return (
    <SettlementListPage<CustomerReceipt>
      {...props}
      searchPlaceholder="Search receipts..."
      numberHeader="Receipt no."
      partyHeader="Customer"
      itemLabel="receipts"
      emptyTitle="No receipts found"
      emptyDescription="Record a receipt against a posted sales invoice."
      deleteTitle="Delete draft receipt?"
      deleteDescription="This draft customer receipt will be permanently deleted."
      postVerb="Post receipt"
      fetchList={financeService.getCustomerReceipts}
      postItem={financeService.postCustomerReceipt}
      deleteItem={financeService.deleteCustomerReceipt}
      toRow={(r) => ({
        id: r.id,
        number: r.receiptNumber,
        date: r.receiptDate,
        invoiceNumber: r.invoiceNumber,
        partyName: r.customerName,
        paymentMethod: r.paymentMethod,
        amount: r.amount,
        status: r.status,
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
          <CreateCustomerReceiptModal
            isOpen={isCreateOpen}
            onClose={closeCreate}
            onSuccess={reload}
            receiptToEdit={itemToEdit}
            preselectedInvoiceId={preselectedInvoiceId}
          />
          <CustomerReceiptDetailsModal
            isOpen={isDetailsOpen}
            receipt={selectedItem}
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
