'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Receipt } from 'lucide-react'
import { trocaPedidoService, TrocaPedidoData } from '@/services/troca-pedido'
import { TrocaPedidoModal } from '@/components/troca-pedido-modal'

export default function FaturamentoPage() {
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<TrocaPedidoData | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['trocas-pedido', 'aguardando_faturamento'],
    queryFn: () => trocaPedidoService.listar('aguardando_faturamento'),
  })

  const filtrados = data?.filter((t) => {
    if (!busca) return true
    const termo = busca.toLowerCase()
    return (
      t.numero_pedido_cancelar.toLowerCase().includes(termo) ||
      t.nome_vendedor.toLowerCase().includes(termo) ||
      t.franquia_nome.toLowerCase().includes(termo)
    )
  })

  return (
    <div className="space-y-4">
      <div className="bg-brand-teal/15 border border-brand-teal/30 rounded-xl px-5 py-3">
        <p className="text-sm text-brand-pine">
          Trocas de pedido aguardando sua análise. Clique em uma solicitação para aprovar ou reprovar.
        </p>
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar troca..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 focus:border-brand-teal transition-all"
        />
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-sm text-slate-400">
          Carregando...
        </div>
      )}

      {filtrados && filtrados.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Receipt size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhuma troca de pedido pendente</p>
        </div>
      )}

      {filtrados && filtrados.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="max-h-[280px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-100 bg-brand-mist">
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">N. Pedido a Cancelar</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Franquia</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Vendedor</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Novo Pedido</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Anexos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelecionado(t)}
                    className="hover:bg-brand-teal/10 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3 font-medium text-slate-800">{t.numero_pedido_cancelar}</td>
                    <td className="px-5 py-3 text-slate-600">{t.franquia_nome}</td>
                    <td className="px-5 py-3 text-slate-600">{t.nome_vendedor}</td>
                    <td className="px-5 py-3 text-slate-600">{t.numero_novo_pedido}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {t.anexos?.length || 0} arquivo(s)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 border-t border-slate-100 bg-brand-mist">
            <p className="text-xs text-slate-400">{filtrados.length} troca(s) pendente(s)</p>
          </div>
        </div>
      )}

      {selecionado && (
        <TrocaPedidoModal
          troca={selecionado}
          onClose={() => setSelecionado(null)}
          modo="faturamento"
        />
      )}
    </div>
  )
}
