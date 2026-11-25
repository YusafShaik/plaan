import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { AppLayout } from './components/layout/AppLayout'
import { PlatformSidebar } from './components/layout/PlatformSidebar'
import { OrganizationsPage } from './pages/platform/OrganizationsPage'

function PlatformLayout() {
  const [activeTab, setActiveTab] = useState<string>('organizations')

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Dedicated Platform Admin Sidebar */}
      <PlatformSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Platform Admin Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-card/40">
        <header className="border-b border-border bg-background/80 backdrop-blur-xs px-8 py-4.5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {activeTab === 'organizations'
                ? 'Tenant Directory'
                : activeTab === 'platform-security'
                ? 'Access & Roles'
                : 'Platform Settings'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Plaan Multi-Tenant SaaS Administration
            </p>
          </div>
        </header>

        <section className="flex-1 p-8">
          {activeTab === 'organizations' ? (
            <OrganizationsPage />
          ) : (
            <div className="rounded-md border border-border bg-card p-8 shadow-xs">
              <h2 className="text-lg font-semibold text-card-foreground">
                {activeTab} View
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Module ready for further configuration.
              </p>
            </div>
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

  // Role-based routing: Platform Admin vs Tenant Organization User
  if (user.role === 'ROLE_PLATFORM_ADMIN') {
    return <PlatformLayout />
  }

  return <AppLayout />
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  )
}
