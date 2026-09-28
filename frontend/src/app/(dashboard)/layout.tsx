import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNavProvider } from '@/components/layout/mobile-nav-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MobileNavProvider>
      <div className="flex h-screen bg-brand-mist">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </MobileNavProvider>
  )
}
