import { useState, useEffect, type FormEvent } from 'react'
import { Check, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { masterDataService } from '../../services/masterDataService'
import type { Customer, CreateCustomerPayload, UpdateCustomerPayload } from '../../types/masterData'

export interface CreateCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  customerToEdit?: Customer | null
}

export function CreateCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  customerToEdit,
}: CreateCustomerModalProps) {
  const [customerCode, setCustomerCode] = useState('CUS-...')
  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [taxId, setTaxId] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true)
  const [shippingAddress, setShippingAddress] = useState('')
  const [active, setActive] = useState(true)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = Boolean(customerToEdit)

  useEffect(() => {
    if (!isOpen) return

    Promise.resolve().then(() => {
      if (customerToEdit) {
        setCustomerCode(customerToEdit.customerCode)
        setName(customerToEdit.name)
        setContactPerson(customerToEdit.contactPerson || '')
        setPhone(customerToEdit.phone || '')
        setEmail(customerToEdit.email || '')
        setTaxId(customerToEdit.taxId || '')
        setBillingAddress(customerToEdit.billingAddress || '')
        const same =
          !customerToEdit.shippingAddress ||
          customerToEdit.shippingAddress === customerToEdit.billingAddress
        setShippingSameAsBilling(same)
        setShippingAddress(customerToEdit.shippingAddress || customerToEdit.billingAddress || '')
        setActive(customerToEdit.active)
        setError(null)
      } else {
        // New Customer mode
        setName('')
        setContactPerson('')
        setPhone('')
        setEmail('')
        setTaxId('')
        setBillingAddress('')
        setShippingSameAsBilling(true)
        setShippingAddress('')
        setActive(true)
        setError(null)

        masterDataService
          .getNextCustomerCode()
          .then((res) => {
            if (res?.nextCode) {
              setCustomerCode(res.nextCode)
            }
          })
          .catch((err) => {
            console.error('Failed to get next customer code', err)
            setCustomerCode('CUS-001')
          })
      }
    })
  }, [isOpen, customerToEdit])

  // Handle billing address changes with same-as-billing sync
  const handleBillingAddressChange = (val: string) => {
    setBillingAddress(val)
    if (shippingSameAsBilling) {
      setShippingAddress(val)
    }
  }

  const handleToggleShippingSame = () => {
    const nextVal = !shippingSameAsBilling
    setShippingSameAsBilling(nextVal)
    if (nextVal) {
      setShippingAddress(billingAddress)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Customer name is required.')
      return
    }

    if (email.trim()) {
      const emailRegex = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
      if (!emailRegex.test(email.trim())) {
        setError('Please enter a valid email address.')
        return
      }
    }

    setIsLoading(true)
    try {
      const finalShippingAddress = shippingSameAsBilling
        ? billingAddress.trim() || undefined
        : shippingAddress.trim() || undefined

      if (isEditing && customerToEdit) {
        const payload: UpdateCustomerPayload = {
          name: name.trim(),
          contactPerson: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          billingAddress: billingAddress.trim() || undefined,
          shippingAddress: finalShippingAddress,
          taxId: taxId.trim().toUpperCase() || undefined,
          active,
        }
        await masterDataService.updateCustomer(customerToEdit.id, payload)
      } else {
        const payload: CreateCustomerPayload = {
          customerCode: customerCode.trim().toUpperCase() || undefined,
          name: name.trim(),
          contactPerson: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          billingAddress: billingAddress.trim() || undefined,
          shippingAddress: finalShippingAddress,
          taxId: taxId.trim().toUpperCase() || undefined,
          active,
        }
        await masterDataService.createCustomer(payload)
      }

      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save customer.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[620px] max-h-[92vh] overflow-y-auto p-5 sm:p-7"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {isEditing ? 'Edit Customer' : 'Add Customer'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-3.5">
          <h3 className="text-sm font-semibold text-foreground">Basic information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Customer Code <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                placeholder="CUS-001"
                disabled={isEditing}
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs tabular-nums font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Customer Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ABC Furniture"
                required
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Contact Person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Full name"
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contact number"
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="Tax registration number"
                className="flex h-10 w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-xs text-foreground placeholder:text-muted-foreground uppercase tabular-nums focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border/80 pt-2" />

        {/* Address Information */}
        <div className="space-y-3.5">
          <h3 className="text-sm font-semibold text-foreground">Address information</h3>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Billing Address
            </label>
            <textarea
              rows={3}
              value={billingAddress}
              onChange={(e) => handleBillingAddressChange(e.target.value)}
              placeholder="Enter billing address"
              className="flex w-full rounded-md border border-border/80 bg-secondary/30 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground resize-none"
            />
          </div>

          {/* Same as billing address checkbox */}
          <div
            onClick={handleToggleShippingSame}
            className="flex items-center gap-2.5 cursor-pointer select-none py-1"
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-md transition-colors ${
                shippingSameAsBilling
                  ? 'bg-foreground text-background'
                  : 'border border-border/80 bg-secondary/30'
              }`}
            >
              {shippingSameAsBilling && <Check className="h-3 w-3 stroke-[3]" />}
            </div>
            <span className="text-xs font-medium text-foreground">
              Shipping address is same as billing address
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Shipping Address
            </label>
            <textarea
              rows={3}
              value={shippingSameAsBilling ? billingAddress : shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              disabled={shippingSameAsBilling}
              placeholder="Enter shipping address"
              className="flex w-full rounded-md border border-border/80 bg-secondary/30 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground resize-none disabled:opacity-60"
            />
          </div>
        </div>

        <div className="border-t border-border/80 pt-2" />

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

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isLoading}
            isLoading={isLoading}
          >
            {isEditing ? 'Save changes' : 'Save customer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
