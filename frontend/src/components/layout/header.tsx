'use client'

import { usePathname } from 'next/navigation'
import { authService } from '@/services/auth'
import { useEffect, useState } from 'react'

const titulos: Record<string, string> = {
  '/comercial': 'Comercial',
  '/comercial/novo': 'Novo Pedido',
  '/financeiro': 'Financeiro',
  '/ti': 'TI',
  '/empresas': 'Franquias',
  '/admin': 'Administracao',
  '/franquia': 'Meus Pedidos',
  '/franquia/novo': 'Novo Pedido de Vínculo',
}

export function Header() {
  const pathname = usePathname()
  const titulo = titulos[pathname] ?? 'Gestao de Vinculos'
  const [inicial, setInicial] = useState('U')

  useEffect(() => {
    setInicial(authService.getNome().charAt(0).toUpperCase())
  }, [])

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
      <h2 className="text-lg font-semibold text-slate-800">{titulo}</h2>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
          {inicial}
        </div>
      </div>
    </header>
  )
}
