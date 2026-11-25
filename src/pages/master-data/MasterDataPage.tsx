import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { UnderlineTabs } from '../../components/ui/Tabs'
import { ItemsPage } from './ItemsPage'
import { SuppliersPage } from './SuppliersPage'
import { WarehousesPage } from './WarehousesPage'
import { CustomersPage } from './CustomersPage'

export type MasterDataTab = 'items' | 'suppliers' | 'warehouses' | 'customers'

const TABS = [
  { id: 'items', label: 'Items' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'warehouses', label: 'Warehouses' },
  { id: 'customers', label: 'Customers' },
]

export function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<MasterDataTab>('items')
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-3">
          <div>
            <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
              Master Data
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage your organization&apos;s master records.
            </p>
          </div>

          {activeTab === 'items' && (
            <Button variant="primary" onClick={() => setIsItemModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          )}
          {activeTab === 'suppliers' && (
            <Button
              variant="primary"
              onClick={() => setIsSupplierModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add supplier
            </Button>
          )}
          {activeTab === 'warehouses' && (
            <Button
              variant="primary"
              onClick={() => setIsWarehouseModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add warehouse
            </Button>
          )}
          {activeTab === 'customers' && (
            <Button
              variant="primary"
              onClick={() => setIsCustomerModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add customer
            </Button>
          )}
        </div>

        <UnderlineTabs
          items={TABS}
          value={activeTab}
          onChange={(id) => setActiveTab(id as MasterDataTab)}
        />
      </div>

      <div>
        {activeTab === 'items' && (
          <ItemsPage
            isModalOpen={isItemModalOpen}
            setIsModalOpen={setIsItemModalOpen}
            showHeader={false}
          />
        )}
        {activeTab === 'suppliers' && (
          <SuppliersPage
            isModalOpen={isSupplierModalOpen}
            setIsModalOpen={setIsSupplierModalOpen}
            showHeader={false}
          />
        )}
        {activeTab === 'warehouses' && (
          <WarehousesPage
            isModalOpen={isWarehouseModalOpen}
            setIsModalOpen={setIsWarehouseModalOpen}
            showHeader={false}
          />
        )}
        {activeTab === 'customers' && (
          <CustomersPage
            isModalOpen={isCustomerModalOpen}
            setIsModalOpen={setIsCustomerModalOpen}
            showHeader={false}
          />
        )}
      </div>
    </div>
  )
}
