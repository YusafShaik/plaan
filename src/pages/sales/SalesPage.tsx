import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ContentCanvas } from '../../components/layout/ContentCanvas'
import { SalesOrdersPage } from './SalesOrdersPage'

export function SalesPage() {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)

  return (
    <ContentCanvas className="space-y-6 pt-2">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Sales
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Customer orders and fulfillment.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsOrderModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New sales order
        </Button>
      </header>

      <SalesOrdersPage
        isModalOpen={isOrderModalOpen}
        setIsModalOpen={setIsOrderModalOpen}
      />
    </ContentCanvas>
  )
}
