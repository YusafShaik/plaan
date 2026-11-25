import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { Plus, Sparkles, Hash, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Select } from '../../components/ui/Select'
import { Alert } from '../../components/ui/Alert'
import { masterDataService } from '../../services/masterDataService'
import type { ItemType, CreateItemPayload, ItemPrefix } from '../../types/masterData'

export interface CreateItemModalProps {
  isOpen: boolean
  onClose: () => void
  itemTypes: ItemType[]
  onSubmit: (payload: CreateItemPayload) => Promise<void>
}

const COMMON_UOM_OPTIONS = [
  { value: 'kg', label: 'kg — Kilogram' },
  { value: 'Nos', label: 'Nos — Numbers' },
  { value: 'L', label: 'L — Liter' },
  { value: 'm', label: 'm — Meter' },
  { value: 'pcs', label: 'pcs — Pieces' },
  { value: 'box', label: 'box — Box' },
  { value: 'roll', label: 'roll — Roll' },
]

function formatPrefixCode(prefix: ItemPrefix, num: number) {
  const pad = String(num).padStart(prefix.paddingDigits || 3, '0')
  return `${prefix.prefix}${pad}`
}

export function CreateItemModal({
  isOpen,
  onClose,
  itemTypes,
  onSubmit,
}: CreateItemModalProps) {
  const [prefixes, setPrefixes] = useState<ItemPrefix[]>([])
  const [selectedPrefixId, setSelectedPrefixId] = useState<string>('')
  const [isNewPrefixMode, setIsNewPrefixMode] = useState(false)
  const [newPrefixString, setNewPrefixString] = useState('ITM-')
  const [newPrefixInitialNumber, setNewPrefixInitialNumber] = useState(0)
  const [isManualCodeEdit, setIsManualCodeEdit] = useState(false)
  const [manualItemCode, setManualItemCode] = useState('')
  const [name, setName] = useState('')
  const [selectedTypeId, setSelectedTypeId] = useState<string>('')
  const [isCreatingNewType, setIsCreatingNewType] = useState(false)
  const [newItemTypeName, setNewItemTypeName] = useState('')
  const [unitOfMeasure, setUnitOfMeasure] = useState('kg')
  const [customUom, setCustomUom] = useState('')
  const [isCustomUom, setIsCustomUom] = useState(false)
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load prefixes when modal opens
  useEffect(() => {
    if (isOpen) {
      masterDataService
        .getItemPrefixes()
        .then((data) => {
          setPrefixes(data)
          if (data.length > 0) {
            setSelectedPrefixId(String(data[0].id))
            setIsNewPrefixMode(false)
          } else {
            setIsNewPrefixMode(true)
          }
        })
        .catch((err) => console.error('Failed to load item prefixes', err))
    }
  }, [isOpen])

  const activePrefix = prefixes.find((p) => String(p.id) === selectedPrefixId)

  // Pure computed item code without cascading effect renders
  const computedItemCode = useMemo(() => {
    if (isManualCodeEdit) {
      return manualItemCode
    }
    if (isNewPrefixMode) {
      const cleanPrefix = newPrefixString.trim().toUpperCase() || 'ITM-'
      const num = newPrefixInitialNumber + 1
      const pad = String(num).padStart(3, '0')
      return `${cleanPrefix}${pad}`
    }
    return activePrefix ? activePrefix.nextCode : ''
  }, [isManualCodeEdit, manualItemCode, isNewPrefixMode, newPrefixString, newPrefixInitialNumber, activePrefix])

  const typeOptions = itemTypes.map((t) => ({
    value: String(t.id),
    label: t.name,
  }))

  const prefixOptions = prefixes.map((p) => ({
    value: String(p.id),
    label: `${p.prefix} (Next: ${p.nextCode})`,
  }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const finalCode = computedItemCode.trim().toUpperCase()

    if (!finalCode || !name.trim()) {
      setError('Item code and Item name are required.')
      return
    }

    if (!isCreatingNewType && !selectedTypeId) {
      setError('Please select an item type or create a new one.')
      return
    }

    if (isCreatingNewType && !newItemTypeName.trim()) {
      setError('Please enter a name for the new item type.')
      return
    }

    const finalUom = isCustomUom ? customUom.trim() : unitOfMeasure
    if (!finalUom) {
      setError('Unit of measure is required.')
      return
    }

    setIsLoading(true)
    try {
      const payload: CreateItemPayload = {
        itemCode: finalCode,
        name: name.trim(),
        unitOfMeasure: finalUom,
        description: description.trim() || undefined,
        active,
      }

      if (isNewPrefixMode) {
        payload.newPrefix = newPrefixString.trim().toUpperCase()
      } else if (selectedPrefixId) {
        payload.prefixId = Number(selectedPrefixId)
      }

      if (isCreatingNewType) {
        payload.newItemTypeName = newItemTypeName.trim()
      } else {
        payload.itemTypeId = Number(selectedTypeId)
      }

      await onSubmit(payload)

      // Reset
      setName('')
      setSelectedTypeId('')
      setNewItemTypeName('')
      setIsCreatingNewType(false)
      setDescription('')
      setActive(true)
      setIsManualCodeEdit(false)
      setManualItemCode('')
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create item.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[580px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Add New Item
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Define a new item in your organization&apos;s item master.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Item Code Prefix & Sequence Section */}
        <div className="rounded-[10px] border border-border bg-secondary/30 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="itemPrefix" required className="mb-0 text-xs font-semibold">
                Item Code & Prefix Sequence
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsNewPrefixMode(!isNewPrefixMode)
                  if (!isNewPrefixMode) {
                    setNewPrefixString('ITM-')
                    setNewPrefixInitialNumber(0)
                  }
                }}
                className="text-xs font-medium text-foreground hover:underline cursor-pointer flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>{isNewPrefixMode ? 'Select existing prefix' : 'Add new prefix'}</span>
              </button>

              <span className="text-border">|</span>

              <button
                type="button"
                onClick={() => setIsManualCodeEdit(!isManualCodeEdit)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isManualCodeEdit ? 'Auto-generate' : 'Custom edit'}
              </button>
            </div>
          </div>

          {/* Existing Prefix Selection vs New Prefix Input */}
          {isNewPrefixMode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <Label htmlFor="newPrefixInput" className="text-xs">
                  New Prefix (e.g. RAW-, FG-, COMP-)
                </Label>
                <Input
                  id="newPrefixInput"
                  placeholder="e.g. RAW-"
                  value={newPrefixString}
                  onChange={(e) => setNewPrefixString(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="newPrefixStart" className="text-xs">
                  Starting Number (Last Used)
                </Label>
                <Input
                  id="newPrefixStart"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newPrefixInitialNumber}
                  onChange={(e) => setNewPrefixInitialNumber(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={isLoading}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Select
                options={prefixOptions}
                value={selectedPrefixId}
                onChange={setSelectedPrefixId}
                placeholder={prefixes.length === 0 ? 'No prefixes — click Add new prefix' : 'Select code prefix...'}
                disabled={isLoading || prefixes.length === 0}
              />

              {activePrefix && (
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pt-0.5">
                  <span>
                    Last number added:{' '}
                    <span className="font-semibold text-foreground">{activePrefix.lastNumber}</span>{' '}
                    ({activePrefix.lastNumber > 0 ? formatPrefixCode(activePrefix, activePrefix.lastNumber) : 'None yet'})
                  </span>
                  <span className="text-accent font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Next: {activePrefix.nextCode}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Generated or Manually Edited Item Code */}
          <div className="pt-1 border-t border-border/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-medium">
                Final Item Code to be assigned:
              </span>
              {isManualCodeEdit && (
                <span className="text-[11px] text-muted-foreground italic">Manual override active</span>
              )}
            </div>
            <Input
              id="itemCode"
              placeholder="e.g. ITM-005"
              value={computedItemCode}
              onChange={(e) => {
                setManualItemCode(e.target.value.toUpperCase())
                setIsManualCodeEdit(true)
              }}
              disabled={isLoading || (!isManualCodeEdit && !isNewPrefixMode && prefixes.length > 0)}
              className="font-mono text-sm font-semibold tracking-wider bg-secondary"
            />
          </div>
        </div>

        {/* Item Name */}
        <div>
          <Label htmlFor="name" required>
            Item Name
          </Label>
          <Input
            id="name"
            placeholder="e.g. Wood, Screws, Paint, Packaging Box"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Item Type selection with inline creation */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="itemType" required className="mb-0">
              Item Type
            </Label>
            <button
              type="button"
              onClick={() => {
                setIsCreatingNewType(!isCreatingNewType)
                setSelectedTypeId('')
              }}
              className="text-xs font-medium text-foreground hover:underline cursor-pointer flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              <span>{isCreatingNewType ? 'Select existing type' : 'Add new type'}</span>
            </button>
          </div>

          {isCreatingNewType ? (
            <Input
              id="newItemTypeName"
              placeholder="Enter new type (e.g. Raw Material, Component)"
              value={newItemTypeName}
              onChange={(e) => setNewItemTypeName(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          ) : (
            <Select
              options={typeOptions}
              value={selectedTypeId}
              onChange={setSelectedTypeId}
              placeholder={itemTypes.length === 0 ? 'No types yet — click "Add new type"' : 'Select item type...'}
              disabled={isLoading || itemTypes.length === 0}
            />
          )}
        </div>

        {/* Unit of Measure */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="uom" required className="mb-0">
              Unit of Measure
            </Label>
            <button
              type="button"
              onClick={() => setIsCustomUom(!isCustomUom)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {isCustomUom ? 'Choose standard unit' : 'Custom unit'}
            </button>
          </div>

          {isCustomUom ? (
            <Input
              id="customUom"
              placeholder="e.g. bundle, drum, sheet"
              value={customUom}
              onChange={(e) => setCustomUom(e.target.value)}
              disabled={isLoading}
            />
          ) : (
            <Select
              options={COMMON_UOM_OPTIONS}
              value={unitOfMeasure}
              onChange={setUnitOfMeasure}
              disabled={isLoading}
            />
          )}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">
            Description <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <Input
            id="description"
            placeholder="Additional material specs or notes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 pt-1">
          <input
            id="itemActive"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded-[4px] border border-input accent-accent cursor-pointer"
          />
          <label htmlFor="itemActive" className="text-sm font-medium text-foreground cursor-pointer">
            Active in operations
          </label>
        </div>

        {/* Actions */}
        <div className="mt-6 pt-4 flex items-center justify-end gap-3 border-t border-border/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="border border-border/80 bg-white dark:bg-transparent text-foreground hover:bg-secondary rounded-[10px] px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="bg-[#171717] dark:bg-white text-white dark:text-black hover:opacity-90 rounded-[10px] px-5 py-2 text-sm font-medium shadow-sm"
          >
            Save Item
          </Button>
        </div>
      </form>
    </Modal>
  )
}
