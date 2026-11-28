import { useState, useEffect, type FormEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { financeService } from '../../services/financeService'
import { toast } from '../../lib/feedback'
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
        setError(err instanceof Error ? err.message : 'Failed to load categories.')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    if (!isOpen) return
    Promise.resolve().then(() => {
      setNewName('')
      load()
    })
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
      toast.success(`Category "${name}" added`)
      setNewName('')
      load()
      onChanged?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create category.')
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
      toast.success(
        category.active
          ? `Category "${category.name}" deactivated`
          : `Category "${category.name}" activated`
      )
      load()
      onChanged?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update category.')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[460px] max-h-[88vh] overflow-y-auto p-5 sm:p-6"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between border-b border-border/80 pb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Manage categories
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add or deactivate operating expense categories.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              label="New category"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Machinery lease"
              disabled={isSaving}
            />
          </div>
          <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </form>

        <div className="rounded-md border border-border/80 divide-y divide-border/60 max-h-[320px] overflow-y-auto">
          {isLoading && categories.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground text-center">Loading...</p>
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleToggleActive(cat)}
                >
                  {cat.active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end border-t border-border/80 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
