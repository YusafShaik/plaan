import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { NativeSelect } from '../../components/ui/NativeSelect'
import { Alert } from '../../components/ui/Alert'
import type { CreateOrganizationPayload } from '../../types/platform'

export interface CreateOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: CreateOrganizationPayload) => Promise<void>
}

const COUNTRIES = [
  'India',
  'United States',
  'Germany',
  'United Kingdom',
  'Japan',
  'Singapore',
  'United Arab Emirates',
  'Canada',
  'Australia',
]

const CURRENCIES = [
  'INR — Indian Rupee',
  'USD — US Dollar',
  'EUR — Euro',
  'GBP — British Pound',
  'JPY — Japanese Yen',
  'AED — UAE Dirham',
  'SGD — Singapore Dollar',
]

const TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Asia/Singapore',
]

export function CreateOrganizationModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateOrganizationModalProps) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('India')
  const [baseCurrency, setBaseCurrency] = useState('INR — Indian Rupee')
  const [timeZone, setTimeZone] = useState('Asia/Kolkata')
  const [adminFullName, setAdminFullName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !adminFullName.trim() || !adminEmail.trim()) {
      setError('Please fill in all mandatory fields.')
      return
    }

    setIsLoading(true)
    try {
      await onSubmit({
        organizationName: name.trim(),
        country,
        baseCurrency,
        timeZone,
        adminFullName: adminFullName.trim(),
        adminEmail: adminEmail.trim(),
      })
      // Reset form on success
      setName('')
      setAdminFullName('')
      setAdminEmail('')
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to create organization. Please verify your input.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-card-foreground">
          Create Organization
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a new customer workspace.
        </p>
      </div>

      <div className="my-4 border-t border-border" />

      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="orgName"
          label="Organization name *"
          placeholder="e.g. Acme Manufacturing Pvt. Ltd."
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
        />

        <NativeSelect
          id="country"
          label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={isLoading}
          required
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          id="currency"
          label="Base currency"
          value={baseCurrency}
          onChange={(e) => setBaseCurrency(e.target.value)}
          disabled={isLoading}
          required
        >
          {CURRENCIES.map((cur) => (
            <option key={cur} value={cur}>
              {cur}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          id="timezone"
          label="Time zone"
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
          disabled={isLoading}
          required
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </NativeSelect>

        <div className="my-4 border-t border-border" />

        <div>
          <h3 className="text-sm font-semibold text-card-foreground">
            Organization administrator
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Initial administrator account details.
          </p>
        </div>

        <Input
          id="adminName"
          label="Full name *"
          placeholder="e.g. Ravi Kumar"
          value={adminFullName}
          onChange={(e) => setAdminFullName(e.target.value)}
          disabled={isLoading}
        />

        <div>
          <Input
            id="adminEmail"
            label="Work email *"
            type="email"
            placeholder="admin@example.com"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Initial password will be set to <code className="font-mono text-foreground">12345678</code>.
          </p>
        </div>

        <div className="mt-6 pt-3 flex items-center justify-end gap-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="bg-brand-deep text-brand-foreground hover:opacity-90"
          >
            Create Organization
          </Button>
        </div>
      </form>
    </Modal>
  )
}
