import { useState, useEffect, type FormEvent } from 'react'
import { X, Plus } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { financeService } from '../../services/financeService'
import type { ExpenseCategory } from '../../types/finance'

export interface ManageExpenseCategoriesModalProps {
  isOpen: boolean
  onClose: () => void
  onChanged?: () => void
}

export function ManageExpenseCategoriesModal({
  isOpen,
  onClose,
  onChanged,
}: ManageExpenseCategoriesModalProps) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [newName, setNewName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setIsLoading(true)
    setError(null)
    financeService
      .getExpenseCategories(true)
      .then(setCategories)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load categories')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    if (!isOpen) return
    setNewName('')
    load()
  }, [isOpen])

  const handleCreate = async (e?: FormEvent) => {
    e?.preventDefault()
    const name = newName.trim()
    if (!name) {
      setError('Category name is required.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await financeService.createExpenseCategory(name)
      setNewName('')
      load()
      onChanged?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (category: ExpenseCategory) => {
    setError(null)
    try {
      await financeService.updateExpenseCategory(category.id, {
        name: category.name,
        active: !category.active,
      })
      load()
      onChanged?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update category')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[440px] max-h-[88vh] overflow-y-auto p-5 sm:p-6"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between border-b border-border/80 pb-3">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Expenses
            </p>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Manage Categories</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        <form onSubmit={handleCreate} className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="New category"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Machinery Lease"
              disabled={isSaving}
            />
          </div>
          <Button type="submit" variant="primary" disabled={isSaving}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </form>

        <div className="rounded-md border border-border/80 divide-y divide-border/60 max-h-[320px] overflow-y-auto">
          {isLoading && categories.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground text-center">Loading…</p>
          ) : categories.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground text-center">No categories yet.</p>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">{cat.name}</span>
                  {cat.active ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="neutral">Inactive</Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleActive(cat)}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer shrink-0"
                >
                  {cat.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end border-t border-border/80 pt-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
