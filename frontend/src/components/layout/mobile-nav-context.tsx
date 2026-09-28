'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface MobileNavContextValue {
  aberto: boolean
  abrir: () => void
  fechar: () => void
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null)

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  return (
    <MobileNavContext.Provider value={{ aberto, abrir: () => setAberto(true), fechar: () => setAberto(false) }}>
      {children}
    </MobileNavContext.Provider>
  )
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext)
  if (!ctx) throw new Error('useMobileNav precisa estar dentro de MobileNavProvider')
  return ctx
}
