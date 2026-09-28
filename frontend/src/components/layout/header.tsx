'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { authService } from '@/services/auth'
import { useEffect, useState } from 'react'
import { useMobileNav } from '@/components/layout/mobile-nav-context'

const titulos: Record<string, string> = {
  '/comercial': 'Comercial',
  '/comercial/novo': 'Novo Pedido',
  '/financeiro': 'Financeiro',
  '/ti': 'TI',
  '/empresas': 'Franquias',
  '/admin': 'Administracao',
  '/franquia': 'Meus Pedidos',
  '/franquia/novo': 'Novo Pedido de Vínculo',
  '/atendimentos-concluidos': 'Atendimentos Concluídos',
}

export function Header() {
  const pathname = usePathname()
  const titulo = titulos[pathname] ?? 'Gestao de Vinculos'
  const [inicial, setInicial] = useState('U')
  const { abrir } = useMobileNav()

  useEffect(() => {
    setInicial(authService.getNome().charAt(0).toUpperCase())
  }, [])

  return (
    <header className="bg-white border-b border-brand-teal/20 px-4 md:px-6 py-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={abrir}
          className="md:hidden text-brand-forest -ml-1 p-1 shrink-0"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        <h2 className="text-lg font-semibold text-brand-forest truncate">{titulo}</h2>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-brand-pine/10 flex items-center justify-center text-xs font-semibold text-brand-pine">
          {inicial}
        </div>
      </div>
    </header>
  )
}
