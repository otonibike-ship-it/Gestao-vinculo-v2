'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, ShoppingCart, Repeat } from 'lucide-react'
import { vinculoService, VinculoData } from '@/services/vinculo'
import { VinculoModal } from '@/components/vinculo-modal'
import { trocaPedidoService, TrocaPedidoData } from '@/services/troca-pedido'
import { TrocaPedidoModal } from '@/components/troca-pedido-modal'
import Link from 'next/link'

const statusTrocaLabels: Record<string, string> = {
  aberto: 'Reprovado',
  aguardando_comercial: 'Aguard. Comercial',
  aguardando_faturamento: 'Aguard. Faturamento',
  aguardando_financeiro: 'Aguard. Financeiro',
  aguardando_ti: 'Aguard. TI',
  fechado: 'Concluído',
}

const statusTrocaColors: Record<string, string> = {
  aberto: 'bg-brand-khaki/20 text-brand-umber',
  aguardando_comercial: 'bg-brand-olive/20 text-brand-forest',
  aguardando_faturamento: 'bg-brand-teal/25 text-brand-pine',
  aguardando_financeiro: 'bg-brand-pine/15 text-brand-pine',
  aguardando_ti: 'bg-brand-forest/10 text-brand-forest',
  fechado: 'bg-brand-lime/25 text-brand-forest',
}

const statusLabels: Record<string, string> = {
  aberto: 'Reprovado',
  validacao_comercial: 'Aguard. Comercial',
  validacao_financeiro: 'Aguard. Financeiro',
  tarefa_ti: 'Aguard. TI',
  fechado: 'Vinculado',
}

const statusColors: Record<string, string> = {
  aberto: 'bg-brand-khaki/20 text-brand-umber',
  validacao_comercial: 'bg-brand-olive/20 text-brand-forest',
  validacao_financeiro: 'bg-brand-pine/15 text-brand-pine',
  tarefa_ti: 'bg-brand-forest/10 text-brand-forest',
  fechado: 'bg-brand-lime/25 text-brand-forest',
}

export default function ComercialPage() {
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<VinculoData | null>(null)
  const [selecionadoTroca, setSelecionadoTroca] = useState<TrocaPedidoData | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['vinculos'],
    queryFn: () => vinculoService.listar(),
  })

  const { data: trocas, isLoading: isLoadingTrocas } = useQuery({
    queryKey: ['trocas-pedido'],
    queryFn: () => trocaPedidoService.listar(),
  })

  const filtrados = data?.filter((v) => {
    if (!busca) return true
    const termo = busca.toLowerCase()
    return (
      v.numero_pedido.toLowerCase().includes(termo) ||
      v.nome_cliente.toLowerCase().includes(termo) ||
      v.franquia_nome.toLowerCase().includes(termo)
    )
  })

  const trocasFiltradas = trocas?.filter((t) => {
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
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-xs flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar pedido, cliente, franquia..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 focus:border-brand-teal transition-all"
          />
        </div>
        <div className="flex gap-2">
          <Link
            href="/comercial/novo"
            className="flex items-center justify-center gap-2 w-32 text-center leading-tight bg-brand-pine hover:bg-brand-forest text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} className="shrink-0" />
            <span>Pedido de<br />Vínculo</span>
          </Link>
          <Link
            href="/comercial/nova-troca"
            className="flex items-center justify-center gap-2 w-32 text-center leading-tight bg-white hover:bg-brand-mist text-brand-pine border border-brand-pine/30 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Repeat size={16} className="shrink-0" />
            <span>Troca de<br />Pedido</span>
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-sm text-slate-400">
          Carregando...
        </div>
      )}

      {filtrados && filtrados.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <ShoppingCart size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhum pedido encontrado</p>
        </div>
      )}

      {filtrados && filtrados.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="max-h-[280px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-100 bg-brand-mist">
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">N. Pedido</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Franquia</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Valor</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Data</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => setSelecionado(v)}
                    className="hover:bg-brand-mist/60 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3 font-medium text-slate-800">{v.numero_pedido}</td>
                    <td className="px-5 py-3 text-slate-600">{v.franquia_nome}</td>
                    <td className="px-5 py-3 text-slate-600">{v.nome_cliente}</td>
                    <td className="px-5 py-3 text-slate-600">
                      R$ {Number(v.valor_pedido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {v.data_pedido ? new Date(v.data_pedido + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[v.status] || 'bg-slate-100 text-slate-600'}`}>
                        {statusLabels[v.status] || v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 border-t border-slate-100 bg-brand-mist">
            <p className="text-xs text-slate-400">{filtrados.length} registro(s)</p>
          </div>
        </div>
      )}

      {/* Justificativa visivel na tabela quando status=aberto e tem justificativa */}
      {filtrados && filtrados.some(v => v.justificativa_reprovacao) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Pedidos com Justificativa de Reprovacao</p>
          <div className="space-y-2">
            {filtrados.filter(v => v.justificativa_reprovacao).map(v => (
              <div key={v.id} className="flex items-start gap-3 bg-brand-khaki/10 border border-brand-khaki/30 rounded-lg px-4 py-3">
                <span className="text-xs font-medium text-brand-umber shrink-0">{v.numero_pedido}</span>
                <p className="text-sm text-brand-umber">{v.justificativa_reprovacao}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trocas de Pedido */}
      <div className="pt-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Trocas de Pedido</p>

        {isLoadingTrocas && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-sm text-slate-400">
            Carregando...
          </div>
        )}

        {trocasFiltradas && trocasFiltradas.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <p className="text-sm text-slate-500">Nenhuma troca de pedido encontrada</p>
          </div>
        )}

        {trocasFiltradas && trocasFiltradas.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="max-h-[280px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-100 bg-brand-mist">
                    <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">N. Pedido a Cancelar</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Franquia</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Vendedor</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Novo Pedido</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {trocasFiltradas.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelecionadoTroca(t)}
                      className="hover:bg-brand-mist/60 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 font-medium text-slate-800">{t.numero_pedido_cancelar}</td>
                      <td className="px-5 py-3 text-slate-600">{t.franquia_nome}</td>
                      <td className="px-5 py-3 text-slate-600">{t.nome_vendedor}</td>
                      <td className="px-5 py-3 text-slate-600">{t.numero_novo_pedido}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusTrocaColors[t.status] || 'bg-slate-100 text-slate-600'}`}>
                          {statusTrocaLabels[t.status] || t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-2.5 border-t border-slate-100 bg-brand-mist">
              <p className="text-xs text-slate-400">{trocasFiltradas.length} registro(s)</p>
            </div>
          </div>
        )}
      </div>

      {selecionado && (
        <VinculoModal
          vinculo={selecionado}
          onClose={() => setSelecionado(null)}
          modo="comercial"
        />
      )}

      {selecionadoTroca && (
        <TrocaPedidoModal
          troca={selecionadoTroca}
          onClose={() => setSelecionadoTroca(null)}
          modo="comercial"
        />
      )}
    </div>
  )
}
