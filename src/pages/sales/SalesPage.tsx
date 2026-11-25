import { useState } from 'react'
import { SalesOrdersPage } from './SalesOrdersPage'

export type SalesTab = 'orders'

export function SalesPage() {
  const [activeTab, setActiveTab] = useState<SalesTab>('orders')

  return (
    <div className="space-y-4">
      {/* 1. Header matching Screenshot 1 */}
      <div className="border-b border-border pb-3.5">
        <div>
          <h1 className="text-[26px] leading-[28px] font-semibold tracking-tight text-foreground">
            Sales
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage customer orders and fulfillment.
          </p>
        </div>

        {/* Tab Navigation matching Screenshot 1 */}
        <div className="mt-4 flex items-center gap-6 border-b border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`pb-2.5 text-xs font-semibold transition-colors cursor-pointer relative ${
              activeTab === 'orders'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Sales Orders</span>
            {activeTab === 'orders' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#107048] rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Content */}
      <div>{activeTab === 'orders' && <SalesOrdersPage />}</div>
    </div>
  )
}
