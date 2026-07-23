'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Monitor, Store, Repeat } from 'lucide-react'
import { vinculoService, VinculoData } from '@/services/vinculo'
import { VinculoModal } from '@/components/vinculo-modal'
import { trocaPedidoService, TrocaPedidoData } from '@/services/troca-pedido'
import { TrocaPedidoModal } from '@/components/troca-pedido-modal'
import api from '@/lib/api'

interface Franquia {
  id: number
  razao_social: string
  nome_fantasia: string | null
  cnpj: string | null
  email: string | null
}

export default function TIPage() {
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<VinculoData | null>(null)
  const [selecionadoTroca, setSelecionadoTroca] = useState<TrocaPedidoData | null>(null)
  const [buscaFranquia, setBuscaFranquia] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['vinculos', 'tarefa_ti'],
    queryFn: () => vinculoService.listar('tarefa_ti'),
  })

  const { data: trocas, isLoading: isLoadingTrocas } = useQuery({
    queryKey: ['trocas-pedido', 'aguardando_ti'],
    queryFn: () => trocaPedidoService.listar('aguardando_ti'),
  })

  const { data: franquias, isLoading: loadingFranquias } = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const res = await api.get('/empresas')
      return res.data as Franquia[]
    },
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

  const franquiasFiltradas = franquias?.filter((f) => {
    if (!buscaFranquia) return true
    const t = buscaFranquia.toLowerCase()
    return (
      (f.nome_fantasia || f.razao_social).toLowerCase().includes(t) ||
      (f.cnpj || '').includes(t) ||
      (f.email || '').toLowerCase().includes(t)
    )
  })

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-100 rounded-xl px-5 py-3">
        <p className="text-sm text-purple-700">
          Pedidos aguardando execucao de TI. Clique em um pedido para aprovar ou reprovar.
        </p>
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar pedido..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
        />
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-sm text-slate-400">
          Carregando...
        </div>
      )}

      {filtrados && filtrados.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Monitor size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhuma tarefa de TI pendente</p>
        </div>
      )}

      {filtrados && filtrados.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">N. Pedido</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Franquia</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Cliente</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Valor</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Data</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Validacao</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Anexos</th>
              </tr>
            </thead>
          </table>
          <div className="max-h-[230px] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-50">
                {filtrados.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => setSelecionado(v)}
                    className="hover:bg-purple-50/50 transition-colors cursor-pointer"
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
                      <span className={`text-xs font-medium ${v.necessario_validacao ? 'text-amber-600' : 'text-slate-400'}`}>
                        {v.necessario_validacao ? 'Sim' : 'Nao'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {v.anexos?.length || 0} arquivo(s)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">{filtrados.length} tarefa(s) pendente(s)</p>
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
            <Repeat size={20} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhuma troca de pedido pendente</p>
          </div>
        )}

        {trocasFiltradas && trocasFiltradas.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">N. Pedido a Cancelar</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Franquia</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Vendedor</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Novo Pedido</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Anexos</th>
                </tr>
              </thead>
            </table>
            <div className="max-h-[230px] overflow-y-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-50">
                  {trocasFiltradas.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelecionadoTroca(t)}
                      className="hover:bg-purple-50/50 transition-colors cursor-pointer"
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
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-400">{trocasFiltradas.length} troca(s) pendente(s)</p>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Franquias */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Store size={16} className="text-slate-500" />
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Franquias Cadastradas</p>
          </div>
          <div className="relative max-w-xs flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar franquia..."
              value={buscaFranquia}
              onChange={(e) => setBuscaFranquia(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
            />
          </div>
        </div>

        {loadingFranquias ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Carregando...</div>
        ) : franquiasFiltradas && franquiasFiltradas.length > 0 ? (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Nome</th>
                  <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">CNPJ</th>
                  <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">E-mail</th>
                </tr>
              </thead>
            </table>
            <div className="max-h-[200px] overflow-y-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-50">
                  {franquiasFiltradas.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {f.nome_fantasia || f.razao_social}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs font-mono">
                        {f.cnpj || '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {f.email || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-400">{franquiasFiltradas.length} franquia(s)</p>
            </div>
          </>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400">Nenhuma franquia cadastrada</p>
          </div>
        )}
      </div>

      {selecionado && (
        <VinculoModal
          vinculo={selecionado}
          onClose={() => setSelecionado(null)}
          modo="ti"
        />
      )}

      {selecionadoTroca && (
        <TrocaPedidoModal
          troca={selecionadoTroca}
          onClose={() => setSelecionadoTroca(null)}
          modo="ti"
        />
      )}
    </div>
  )
}
