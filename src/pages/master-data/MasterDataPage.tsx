import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ItemsPage } from './ItemsPage'
import { SuppliersPage } from './SuppliersPage'
import { WarehousesPage } from './WarehousesPage'
import { CustomersPage } from './CustomersPage'

export type MasterDataTab = 'items' | 'suppliers' | 'warehouses' | 'customers'

export function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<MasterDataTab>('items')
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* 1. Master Data Header with Subtitle and Segmented Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3.5">
        <div>
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Master Data
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage your organization&apos;s master records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Control: Items | Suppliers | Warehouses | Customers */}
          <div className="flex items-center rounded-[8px] bg-secondary p-1 border border-border/80">
            <button
              type="button"
              onClick={() => setActiveTab('items')}
              className={`rounded-[6px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'items'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Items
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('suppliers')}
              className={`rounded-[6px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'suppliers'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Suppliers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('warehouses')}
              className={`rounded-[6px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'warehouses'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Warehouses
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`rounded-[6px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Customers
            </button>
          </div>

          {/* Primary CTA Action Button */}
          {activeTab === 'items' && (
            <Button
              onClick={() => setIsItemModalOpen(true)}
              className="gap-2 bg-[#171717] text-white hover:opacity-90 font-medium px-4 py-2 rounded-[10px] text-xs cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add item</span>
            </Button>
          )}
          {activeTab === 'suppliers' && (
            <Button
              onClick={() => setIsSupplierModalOpen(true)}
              className="gap-2 bg-[#171717] text-white hover:opacity-90 font-medium px-4 py-2 rounded-[10px] text-xs cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add supplier</span>
            </Button>
          )}
          {activeTab === 'warehouses' && (
            <Button
              onClick={() => setIsWarehouseModalOpen(true)}
              className="gap-2 bg-[#171717] text-white hover:opacity-90 font-medium px-4 py-2 rounded-[10px] text-xs cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add warehouse</span>
            </Button>
          )}
          {activeTab === 'customers' && (
            <Button
              onClick={() => setIsCustomerModalOpen(true)}
              className="gap-2 bg-[#107048] hover:bg-[#0d603e] text-white font-medium px-4 py-2 rounded-[10px] text-xs cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add Customer</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Main View */}
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
