import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'

export function LoginPage() {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Please provide both email and password.')
      return
    }

    try {
      await login({ email: email.trim(), password })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Authentication failed. Please verify your credentials.')
      }
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-surface-subtle dark:bg-background flex flex-col justify-between p-6 md:p-8">
      {/* Brand Header */}
      <header className="flex items-center">
        <div className="flex items-center gap-2 select-none">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-deep text-brand-foreground text-xs font-bold">
            <svg
              className="h-3 w-3 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            plaan
          </span>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="flex-1 flex flex-col justify-center items-center py-10">
        <div className="w-full max-w-[400px] mx-auto rounded-md border border-border bg-card p-6 sm:p-8 shadow-xs">
          {/* Titles */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight text-foreground">
              Welcome to Plaan
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Log in to your workspace to get started.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <Alert variant="destructive" className="mb-2">
                {error}
              </Alert>
            )}

            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              rightElement={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              }
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full h-12 text-sm font-medium rounded-md"
                isLoading={isLoading}
              >
                Log in
              </Button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-center text-xs text-muted-foreground pb-2">
        <span>Plaan Manufacturing &amp; Operations</span>
      </footer>
    </div>
  )
}
