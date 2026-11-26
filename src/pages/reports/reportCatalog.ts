import type { LucideIcon } from 'lucide-react'
import {
  ClipboardCheck,
  Factory,
  Package,
  ShoppingCart,
  Truck,
  Wallet,
  Wrench,
} from 'lucide-react'

export type ReportCategoryId =
  | 'procurement'
  | 'inventory'
  | 'manufacturing'
  | 'quality'
  | 'sales-dispatch'
  | 'finance'
  | 'maintenance'

export interface ReportDefinition {
  id: string
  name: string
  description: string
  categoryId: ReportCategoryId
  /** When false, report opens in Coming Soon state. */
  available: boolean
}

export interface ReportCategory {
  id: ReportCategoryId
  label: string
  icon: LucideIcon
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'manufacturing', label: 'Manufacturing', icon: Factory },
  { id: 'quality', label: 'Quality', icon: ClipboardCheck },
  { id: 'sales-dispatch', label: 'Sales & Dispatch', icon: Truck },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
]

export const REPORTS: ReportDefinition[] = [
  {
    id: 'purchase-summary',
    name: 'Purchase Summary',
    description: 'Purchase order volume, value and receipt status over a period.',
    categoryId: 'procurement',
    available: true,
  },
  {
    id: 'pending-purchase-orders',
    name: 'Pending Purchase Orders',
    description: 'Open and partially received purchase orders awaiting goods.',
    categoryId: 'procurement',
    available: true,
  },
  {
    id: 'stock-summary',
    name: 'Stock Summary',
    description: 'On-hand stock by item and warehouse.',
    categoryId: 'inventory',
    available: true,
  },
  {
    id: 'stock-movements',
    name: 'Stock Movements',
    description: 'Track incoming and outgoing inventory transactions.',
    categoryId: 'inventory',
    available: true,
  },
  {
    id: 'production-summary',
    name: 'Production Summary',
    description: 'Track planned versus produced quantities across production orders.',
    categoryId: 'manufacturing',
    available: true,
  },
  {
    id: 'material-consumption',
    name: 'Material Consumption',
    description: 'Track required, issued, consumed and returned materials across production orders.',
    categoryId: 'manufacturing',
    available: true,
  },
  {
    id: 'inspection-summary',
    name: 'Inspection Summary',
    description: 'Track incoming and finished goods inspection outcomes and quality performance.',
    categoryId: 'quality',
    available: true,
  },
  {
    id: 'rejection-report',
    name: 'Rejection Report',
    description: 'Identify rejected materials and finished goods with sources and remarks.',
    categoryId: 'quality',
    available: true,
  },
  {
    id: 'sales-summary',
    name: 'Sales Summary',
    description: 'Sales order volume and value over a period.',
    categoryId: 'sales-dispatch',
    available: false,
  },
  {
    id: 'pending-dispatches',
    name: 'Pending Dispatches',
    description:
      'Customer order lines still awaiting dispatch, with stock readiness and delivery urgency.',
    categoryId: 'sales-dispatch',
    available: true,
  },
  {
    id: 'supplier-outstanding',
    name: 'Supplier Outstanding',
    description: 'Unpaid and partially paid purchase invoices.',
    categoryId: 'finance',
    available: true,
  },
  {
    id: 'customer-outstanding',
    name: 'Customer Outstanding',
    description: 'Unpaid and partially paid sales invoices.',
    categoryId: 'finance',
    available: true,
  },
  {
    id: 'expense-report',
    name: 'Expense Report',
    description: 'Recorded expenses by category and period.',
    categoryId: 'finance',
    available: true,
  },
  {
    id: 'maintenance-history',
    name: 'Maintenance History',
    description: 'Completed maintenance work across equipment.',
    categoryId: 'maintenance',
    available: true,
  },
  {
    id: 'due-overdue-maintenance',
    name: 'Due & Overdue Maintenance',
    description: 'Active maintenance plans that are due or overdue.',
    categoryId: 'maintenance',
    available: true,
  },
  {
    id: 'equipment-downtime',
    name: 'Equipment Downtime',
    description: 'Breakdown downtime recorded from maintenance work orders.',
    categoryId: 'maintenance',
    available: true,
  },
]

export function getReportById(id: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.id === id)
}

export function getCategoryById(id: ReportCategoryId): ReportCategory | undefined {
  return REPORT_CATEGORIES.find((c) => c.id === id)
}

export function getReportsByCategory(categoryId: ReportCategoryId): ReportDefinition[] {
  return REPORTS.filter((r) => r.categoryId === categoryId)
}
