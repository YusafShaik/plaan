import { useEffect, useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { AppLayout } from './components/layout/AppLayout'
import { PlatformSidebar } from './components/layout/PlatformSidebar'
import { ContentCanvas } from './components/layout/ContentCanvas'
import { OrganizationsPage } from './pages/platform/OrganizationsPage'
import { FeedbackHost } from './components/ui/FeedbackHost'
import { Button } from './components/ui/Button'
import { useThemeMode } from './hooks/useThemeMode'

function PlatformSettingsView() {
  const { user } = useAuth()
  const { isDark, toggle } = useThemeMode()
  return (
    <ContentCanvas className="space-y-6 pt-2">
      <div>
        <h1 className="text-[26px] leading-8 font-semibold tracking-tight text-foreground">
          Platform Settings
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Global operator preferences.
        </p>
      </div>
      <div className="rounded-md border border-border bg-card p-5 max-w-lg space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Operator</span>
          <span className="font-medium text-foreground">{user?.email || '—'}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">Appearance</p>
            <p className="text-xs text-muted-foreground">
              Currently using {isDark ? 'Dark' : 'Light'} mode
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={toggle}>
            Switch to {isDark ? 'Light' : 'Dark'}
          </Button>
        </div>
      </div>
    </ContentCanvas>
  )
}

function PlatformLayout() {
  const [activeTab, setActiveTab] = useState<string>('organizations')

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <PlatformSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-card/40">
        <section className="flex-1 px-8 py-8 w-full">
          {activeTab === 'organizations' ? (
            <OrganizationsPage />
          ) : (
            <PlatformSettingsView />
          )}
        </section>
      </main>
    </div>
  )
}

function MainContent() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated || !user) {
    return <LoginPage />
  }

  if (user.role === 'ROLE_PLATFORM_ADMIN') {
    return <PlatformLayout />
  }

  return <AppLayout />
}

export default function App() {
  useEffect(() => {
    const saved = localStorage.getItem('plaan_theme')
    if (saved === 'dark') {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <AuthProvider>
      <MainContent />
      <FeedbackHost />
    </AuthProvider>
  )
}
