'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingCart,
  DollarSign,
  Monitor,
  Building2,
  Shield,
  LogOut,
  Store,
  Settings,
  Receipt,
  CheckCircle2,
  X,
} from 'lucide-react'
import { authService, Perfil } from '@/services/auth'
import { useEffect, useState } from 'react'
import { useMobileNav } from '@/components/layout/mobile-nav-context'

const allNavItems = [
  { href: '/comercial', label: 'Comercial', icon: ShoppingCart, perfis: ['comercial', 'admin'] },
  { href: '/faturamento', label: 'Faturamento', icon: Receipt, perfis: ['faturamento', 'admin'] },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign, perfis: ['financeiro', 'admin'] },
  { href: '/ti', label: 'TI', icon: Monitor, perfis: ['ti', 'admin'] },
  { href: '/franquia', label: 'Meus Pedidos', icon: Store, perfis: ['franquia'] },
  { href: '/atendimentos-concluidos', label: 'Atendimentos Concluídos', icon: CheckCircle2, perfis: ['comercial', 'faturamento', 'financeiro', 'ti', 'admin', 'franquia'] },
  { href: '/empresas', label: 'Franquias', icon: Building2, perfis: ['comercial', 'financeiro', 'ti', 'admin'] },
  { href: '/admin', label: 'Admin', icon: Shield, perfis: ['admin'] },
  { href: '/configuracoes', label: 'Configurações', icon: Settings, perfis: ['admin'] },
]

const perfilLabels: Record<Perfil, string> = {
  comercial: 'Comercial',
  financeiro: 'Financeiro',
  ti: 'TI',
  admin: 'Administrador',
  franquia: 'Franquia',
  faturamento: 'Faturamento',
}

export function Sidebar() {
  const pathname = usePathname()
  const [perfil, setPerfil] = useState<Perfil>('comercial')
  const [nome, setNome] = useState('Usuário')
  const { aberto, fechar } = useMobileNav()

  useEffect(() => {
    setPerfil(authService.getPerfil())
    setNome(authService.getNome())
  }, [])

  // Fecha o menu ao trocar de rota (ex.: usuario tocou num link no mobile)
  useEffect(() => {
    fechar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const navItems = allNavItems.filter(item => item.perfis.includes(perfil))

  return (
    <>
      {/* Fundo escurecido atras do menu no mobile */}
      {aberto && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={fechar}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-brand-forest flex flex-col h-full shrink-0 transform transition-transform duration-200 ease-in-out md:static md:z-auto md:w-60 md:translate-x-0 ${
          aberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 border-b border-brand-pine/30 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Gestao de Vinculos</h1>
            <p className="text-[11px] text-brand-lime/80 mt-0.5">SenseBike</p>
          </div>
          <button
            onClick={fechar}
            className="md:hidden text-brand-mist/60 hover:text-white p-1 -mr-1"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const ativo = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all border-l-2 ${
                  ativo
                    ? 'bg-brand-pine/40 text-white font-medium border-brand-lime'
                    : 'text-brand-mist/60 border-transparent hover:bg-brand-pine/20 hover:text-brand-mist'
                }`}
              >
                <Icon size={18} strokeWidth={ativo ? 2 : 1.5} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-brand-pine/30">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-brand-pine/50 flex items-center justify-center text-xs font-semibold text-brand-lime">
              {nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-brand-mist/90 truncate">{nome}</p>
              <p className="text-[10px] text-brand-mist/40 truncate">{perfilLabels[perfil]}</p>
            </div>
          </div>
          <button
            onClick={() => authService.logout()}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-brand-mist/50 hover:bg-brand-pine/20 hover:text-red-400 transition-all"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
