import { useState, useEffect, type FormEvent } from 'react'
import { Sparkles, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Alert } from '../../components/ui/Alert'
import { masterDataService } from '../../services/masterDataService'
import type { CreateSupplierPayload } from '../../types/masterData'

export interface CreateSupplierModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: CreateSupplierPayload) => Promise<void>
}

export function CreateSupplierModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateSupplierModalProps) {
  const [supplierCode, setSupplierCode] = useState('SUP-...')
  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [taxId, setTaxId] = useState('')
  const [active, setActive] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch next available supplier code whenever modal opens
  useEffect(() => {
    let isMounted = true
    if (isOpen) {
      masterDataService
        .getNextSupplierCode()
        .then((res) => {
          if (isMounted && res?.nextCode) {
            setSupplierCode(res.nextCode)
          }
        })
        .catch((err) => {
          console.error('Failed to get next supplier code', err)
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
      setError('Supplier name is required.')
      return
    }

    setIsLoading(true)
    try {
      const payload: CreateSupplierPayload = {
        supplierCode: supplierCode.trim().toUpperCase(),
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        taxId: taxId.trim().toUpperCase() || undefined,
        active,
      }

      await onSubmit(payload)

      // Reset
      setName('')
      setContactPerson('')
      setPhone('')
      setEmail('')
      setAddress('')
      setTaxId('')
      setActive(true)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create supplier.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[540px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Add New Supplier
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Register a vendor or procurement supplier in master directory.
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
        {/* Field 1: Supplier Code (Auto-generated with hardcoded SUP- prefix, unique within org) */}
        <Input
          label="Supplier code *"
          placeholder="e.g. SUP-001"
          value={supplierCode}
          onChange={(e) => setSupplierCode(e.target.value.toUpperCase())}
          disabled={isLoading}
          className="font-mono font-medium"
          rightElement={
            <span className="text-[11px] font-sans font-medium text-brand-deep flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Auto
            </span>
          }
          hint="Unique within the organization. Can be auto-generated."
        />

        {/* Field 2: Supplier Name (Required) */}
        <Input
          label="Supplier Name *"
          placeholder="e.g. Sri Timber Traders"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          autoFocus
        />

        {/* Two-Column: Contact Person & Phone Number (Matching Expiration / CVC pattern) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Contact Person (Optional)"
            placeholder="e.g. Ramesh"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            disabled={isLoading}
          />
          <Input
            label="Phone Number (Optional)"
            type="tel"
            placeholder="e.g. +91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Two-Column: Email & GSTIN / Tax ID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Email Address (Optional)"
            type="email"
            placeholder="sales@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <Input
            label="GSTIN / Tax ID (Optional)"
            placeholder="e.g. 29ABCDE1234F1Z5"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value.toUpperCase())}
            disabled={isLoading}
          />
        </div>

        {/* Field 5: Business Address (Optional) */}
        <Input
          label="Business Address (Optional)"
          placeholder="e.g. Plot 12, Peenya Industrial Area, Bengaluru"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={isLoading}
        />

        <Select
          label="Status"
          value={active ? 'active' : 'inactive'}
          onChange={(v) => setActive(v === 'active')}
          disabled={isLoading}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />

        {/* Footer Actions (Matching Link by Stripe: Outlined Cancel + Solid Black Confirm) */}
        <div className="mt-6 pt-4 flex items-center justify-end gap-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="border border-border bg-card text-foreground hover:bg-secondary rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="bg-ink text-ink-foreground hover:opacity-90 rounded-md px-5 py-2 text-sm font-medium shadow-sm"
          >
            Save Supplier
          </Button>
        </div>
      </form>
    </Modal>
  )
}
