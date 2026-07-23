'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/services/auth'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (!authService.isLoggedIn()) {
      router.replace('/login')
    } else {
      router.replace(authService.getRedirectPath())
    }
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Carregando...</p>
      </div>
    </div>
  )
}
