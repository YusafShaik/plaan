import { useEffect, useState } from 'react'
import { UnderlineTabs } from '../../components/ui/Tabs'
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
  { id: 'purchase-invoices', label: 'Purchase Invoices' },
  { id: 'sales-invoices', label: 'Sales Invoices' },
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

  useEffect(() => {
    if (!initialSection || !FINANCE_SECTIONS.has(initialSection as FinanceTab)) return
    setActiveTab(initialSection as FinanceTab)
    onInitialSectionConsumed?.()
  }, [initialSection, onInitialSectionConsumed])

  return (
    <div className="space-y-6">
      <div>
        <div className="pb-3">
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Finance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage invoices, payments and expenses.
          </p>
        </div>

        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as FinanceTab)}
        />
      </div>

      <div>
        {activeTab === 'purchase-invoices' && <PurchaseInvoicesPage />}
        {activeTab === 'sales-invoices' && <SalesInvoicesPage />}
        {activeTab === 'payments' && <SupplierPaymentsPage />}
        {activeTab === 'receipts' && <CustomerReceiptsPage />}
        {activeTab === 'expenses' && <ExpensesPage />}
      </div>
    </div>
  )
}
