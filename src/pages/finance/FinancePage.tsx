import { useEffect, useState } from 'react'
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
    <ContentCanvas className="space-y-8 pt-2">
      <header className="space-y-5">
        <div>
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Finance
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Invoices, payments, and expenses.
          </p>
        </div>

        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as FinanceTab)}
        />
      </header>

      <div>
        {activeTab === 'purchase-invoices' && <PurchaseInvoicesPage />}
        {activeTab === 'sales-invoices' && <SalesInvoicesPage />}
        {activeTab === 'payments' && <SupplierPaymentsPage />}
        {activeTab === 'receipts' && <CustomerReceiptsPage />}
        {activeTab === 'expenses' && <ExpensesPage />}
      </div>
    </ContentCanvas>
  )
}
