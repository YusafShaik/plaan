import { useState, useEffect, type FormEvent } from 'react'
import { Sparkles, X, Check } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'
import { masterDataService } from '../../services/masterDataService'
import type { CreateWarehousePayload } from '../../types/masterData'

export interface CreateWarehouseModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: CreateWarehousePayload) => Promise<void>
}

export function CreateWarehouseModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateWarehouseModalProps) {
  const [warehouseCode, setWarehouseCode] = useState('WH-...')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch next available warehouse code whenever modal opens
  useEffect(() => {
    let isMounted = true
    if (isOpen) {
      masterDataService
        .getNextWarehouseCode()
        .then((res) => {
          if (isMounted && res?.nextCode) {
            setWarehouseCode(res.nextCode)
          }
        })
        .catch((err) => {
          console.error('Failed to get next warehouse code', err)
        })
    }
    return () => {
      isMounted = false
    }
  }, [isOpen])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Warehouse name is required.')
      return
    }

    setIsLoading(true)
    try {
      const payload: CreateWarehousePayload = {
        warehouseCode: warehouseCode.trim().toUpperCase(),
        name: name.trim(),
        address: address.trim() || undefined,
        description: description.trim() || undefined,
        active,
      }

      await onSubmit(payload)

      // Reset
      setName('')
      setAddress('')
      setDescription('')
      setActive(true)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create warehouse.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Add Warehouse
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Register a storage facility or depot in master directory.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="my-4 border-t border-border" />

      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Field 1: Warehouse Code (Required, auto-generated with hardcoded WH- prefix) */}
        <Input
          label="Warehouse code *"
          placeholder="e.g. WH-001"
          value={warehouseCode}
          onChange={(e) => setWarehouseCode(e.target.value.toUpperCase())}
          disabled={isLoading}
          className="font-mono font-semibold"
          rightElement={
            <span className="text-[11px] font-sans font-medium text-accent flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Auto
            </span>
          }
          hint="Unique within the organization. Can be auto-generated."
        />

        {/* Field 2: Warehouse Name (Required) */}
        <Input
          label="Warehouse name *"
          placeholder="e.g. Main Warehouse"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          autoFocus
        />

        {/* Field 3: Address / Location (Optional) */}
        <Input
          label="Address / Location"
          placeholder="Enter warehouse location"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={isLoading}
        />

        {/* Field 4: Description (Optional) */}
        <Input
          label="Description"
          placeholder="Optional description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
        />

        {/* Field 5: Status (Default Active) */}
        <div className="pt-1">
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Status
          </label>
          <button
            type="button"
            onClick={() => setActive(!active)}
            className="flex items-center gap-2.5 rounded-[10px] border border-border/80 bg-secondary px-3.5 py-2.5 text-sm text-foreground cursor-pointer hover:border-border transition-colors w-full"
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
                active ? 'bg-emerald-500 text-white' : 'border border-muted-foreground/40 bg-transparent'
              }`}
            >
              {active && <Check className="h-3 w-3 stroke-[3]" />}
            </div>
            <span className="text-sm font-medium">{active ? 'Active' : 'Inactive'}</span>
          </button>
        </div>

        {/* Footer Actions matching reference */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-border/80 bg-white text-foreground hover:bg-secondary font-medium px-4 py-2 rounded-[10px] text-sm cursor-pointer shadow-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            className="bg-[#171717] hover:bg-[#262626] text-white font-medium px-5 py-2 rounded-[10px] text-sm cursor-pointer shadow-xs"
          >
            Save warehouse
          </Button>
        </div>
      </form>
    </Modal>
  )
}
