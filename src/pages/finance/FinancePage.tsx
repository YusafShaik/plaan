import { useEffect, useState } from 'react'
import { Plus, Settings2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { ContentCanvas } from '../../components/layout/ContentCanvas'
import { PurchaseInvoicesPage } from './PurchaseInvoicesPage'
import { SalesInvoicesPage } from './SalesInvoicesPage'
import { SupplierPaymentsPage } from './SupplierPaymentsPage'
import { CustomerReceiptsPage } from './CustomerReceiptsPage'
import { ExpensesPage } from './ExpensesPage'

export type FinanceTab =
  | 'purchase-invoices'
  | 'sales-invoices'
  | 'payments'
  | 'receipts'
  | 'expenses'

const TABS = [
  { id: 'purchase-invoices', label: 'Purchase invoices' },
  { id: 'sales-invoices', label: 'Sales invoices' },
  { id: 'payments', label: 'Payments' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'expenses', label: 'Expenses' },
]

const FINANCE_SECTIONS = new Set<FinanceTab>([
  'purchase-invoices',
  'sales-invoices',
  'payments',
  'receipts',
  'expenses',
])

export interface FinancePageProps {
  initialSection?: string | null
  onInitialSectionConsumed?: () => void
}

export function FinancePage({
  initialSection = null,
  onInitialSectionConsumed,
}: FinancePageProps = {}) {
  const [activeTab, setActiveTab] = useState<FinanceTab>('purchase-invoices')
  const [isPurchaseInvOpen, setIsPurchaseInvOpen] = useState(false)
  const [isSalesInvOpen, setIsSalesInvOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false)

  useEffect(() => {
    if (!initialSection || !FINANCE_SECTIONS.has(initialSection as FinanceTab)) return
    Promise.resolve().then(() => {
      setActiveTab(initialSection as FinanceTab)
      onInitialSectionConsumed?.()
    })
  }, [initialSection, onInitialSectionConsumed])

  return (
    <ContentCanvas className="space-y-6 pt-2">
      <header className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Finance
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
              Invoices, payments, and expenses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'expenses' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsManageCategoriesOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
                Manage categories
              </Button>
            )}
            {activeTab === 'purchase-invoices' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPurchaseInvOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New invoice
              </Button>
            )}
            {activeTab === 'sales-invoices' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsSalesInvOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New invoice
              </Button>
            )}
            {activeTab === 'payments' && (
              <Button variant="primary" size="sm" onClick={() => setIsPaymentOpen(true)}>
                <Plus className="h-4 w-4" />
                Record payment
              </Button>
            )}
            {activeTab === 'receipts' && (
              <Button variant="primary" size="sm" onClick={() => setIsReceiptOpen(true)}>
                <Plus className="h-4 w-4" />
                Record receipt
              </Button>
            )}
            {activeTab === 'expenses' && (
              <Button variant="primary" size="sm" onClick={() => setIsExpenseOpen(true)}>
                <Plus className="h-4 w-4" />
                New expense
              </Button>
            )}
          </div>
        </div>

        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as FinanceTab)}
        />
      </header>

      <div>
        {activeTab === 'purchase-invoices' && (
          <PurchaseInvoicesPage
            isModalOpen={isPurchaseInvOpen}
            setIsModalOpen={setIsPurchaseInvOpen}
          />
        )}
        {activeTab === 'sales-invoices' && (
          <SalesInvoicesPage
            isModalOpen={isSalesInvOpen}
            setIsModalOpen={setIsSalesInvOpen}
          />
        )}
        {activeTab === 'payments' && (
          <SupplierPaymentsPage
            isModalOpen={isPaymentOpen}
            setIsModalOpen={setIsPaymentOpen}
          />
        )}
        {activeTab === 'receipts' && (
          <CustomerReceiptsPage
            isModalOpen={isReceiptOpen}
            setIsModalOpen={setIsReceiptOpen}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesPage
            isModalOpen={isExpenseOpen}
            setIsModalOpen={setIsExpenseOpen}
            isManageOpen={isManageCategoriesOpen}
            setIsManageOpen={setIsManageCategoriesOpen}
          />
        )}
      </div>
    </ContentCanvas>
  )
}
