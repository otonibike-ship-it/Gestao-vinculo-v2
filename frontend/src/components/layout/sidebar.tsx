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
} from 'lucide-react'
import { authService, Perfil } from '@/services/auth'
import { useEffect, useState } from 'react'

const allNavItems = [
  { href: '/comercial', label: 'Comercial', icon: ShoppingCart, perfis: ['comercial', 'admin'] },
  { href: '/faturamento', label: 'Faturamento', icon: Receipt, perfis: ['faturamento', 'admin'] },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign, perfis: ['financeiro', 'admin'] },
  { href: '/ti', label: 'TI', icon: Monitor, perfis: ['ti', 'admin'] },
  { href: '/franquia', label: 'Meus Pedidos', icon: Store, perfis: ['franquia'] },
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

  useEffect(() => {
    setPerfil(authService.getPerfil())
    setNome(authService.getNome())
  }, [])

  const navItems = allNavItems.filter(item => item.perfis.includes(perfil))

  return (
    <aside className="w-60 bg-slate-900 flex flex-col h-full shrink-0">
      <div className="px-5 py-5 border-b border-slate-700/50">
        <h1 className="text-base font-bold text-white tracking-tight">Gestao de Vinculos</h1>
        <p className="text-[11px] text-slate-500 mt-0.5">SenseBike</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const ativo = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                ativo
                  ? 'bg-slate-700/60 text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon size={18} strokeWidth={ativo ? 2 : 1.5} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
            {nome.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-300 truncate">{nome}</p>
            <p className="text-[10px] text-slate-600 truncate">{perfilLabels[perfil]}</p>
          </div>
        </div>
        <button
          onClick={() => authService.logout()}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-slate-500 hover:bg-slate-800 hover:text-red-400 transition-all"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}
