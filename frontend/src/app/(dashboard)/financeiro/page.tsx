'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, DollarSign, Repeat, Link2, FileEdit, RotateCcw, Ban } from 'lucide-react'
import { vinculoService, VinculoData } from '@/services/vinculo'
import { VinculoModal } from '@/components/vinculo-modal'
import { trocaPedidoService, TrocaPedidoData } from '@/services/troca-pedido'
import { TrocaPedidoModal } from '@/components/troca-pedido-modal'
import { linkPagamentoService, LinkPagamentoData } from '@/services/link-pagamento'
import { LinkPagamentoModal } from '@/components/link-pagamento-modal'
import { cartaCorrecaoService, CartaCorrecaoData } from '@/services/carta-correcao'
import { CartaCorrecaoModal } from '@/components/carta-correcao-modal'
import { solicitacaoEstornoService, SolicitacaoEstornoData } from '@/services/solicitacao-estorno'
import { SolicitacaoEstornoModal } from '@/components/solicitacao-estorno-modal'
import { cancelamentoVendaService, CancelamentoVendaData } from '@/services/cancelamento-venda'
import { CancelamentoVendaModal } from '@/components/cancelamento-venda-modal'

export default function FinanceiroPage() {
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<VinculoData | null>(null)
  const [selecionadoTroca, setSelecionadoTroca] = useState<TrocaPedidoData | null>(null)
  const [selecionadoLink, setSelecionadoLink] = useState<LinkPagamentoData | null>(null)
  const [selecionadoCarta, setSelecionadoCarta] = useState<CartaCorrecaoData | null>(null)
  const [selecionadoEstorno, setSelecionadoEstorno] = useState<SolicitacaoEstornoData | null>(null)
  const [selecionadoCancelamento, setSelecionadoCancelamento] = useState<CancelamentoVendaData | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['vinculos', 'validacao_financeiro'],
    queryFn: () => vinculoService.listar('validacao_financeiro'),
  })

  const { data: trocas, isLoading: isLoadingTrocas } = useQuery({
    queryKey: ['trocas-pedido', 'aguardando_financeiro'],
    queryFn: () => trocaPedidoService.listar('aguardando_financeiro'),
  })

  const { data: links, isLoading: isLoadingLinks } = useQuery({
    queryKey: ['links-pagamento', 'aguardando_financeiro'],
    queryFn: () => linkPagamentoService.listar('aguardando_financeiro'),
  })

  const { data: cartas, isLoading: isLoadingCartas } = useQuery({
    queryKey: ['cartas-correcao', 'aguardando_financeiro'],
    queryFn: () => cartaCorrecaoService.listar('aguardando_financeiro'),
  })

  const { data: estornos, isLoading: isLoadingEstornos } = useQuery({
    queryKey: ['solicitacoes-estorno', 'aguardando_financeiro'],
    queryFn: () => solicitacaoEstornoService.listar('aguardando_financeiro'),
  })

  const { data: cancelamentos, isLoading: isLoadingCancelamentos } = useQuery({
    queryKey: ['cancelamentos-venda', 'aguardando_financeiro'],
    queryFn: () => cancelamentoVendaService.listar('aguardando_financeiro'),
  })

  const filtrados = data?.filter((v) => {
    if (!busca) return true
    const t = busca.toLowerCase()
    return v.numero_pedido.toLowerCase().includes(t) || v.nome_cliente.toLowerCase().includes(t) || v.franquia_nome.toLowerCase().includes(t)
  })
  const trocasFiltradas = trocas?.filter((t) => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return t.numero_pedido_cancelar.toLowerCase().includes(q) || t.nome_vendedor.toLowerCase().includes(q) || t.franquia_nome.toLowerCase().includes(q)
  })
  const linksFiltrados = links?.filter((l) => {
    if (!busca) return true
    const t = busca.toLowerCase()
    return l.numero_pedido.toLowerCase().includes(t) || l.nome_cliente.toLowerCase().includes(t) || l.franquia_nome.toLowerCase().includes(t)
  })
  const cartasFiltradas = cartas?.filter((c) => {
    if (!busca) return true
    const t = busca.toLowerCase()
    return c.numero_pedido.toLowerCase().includes(t) || c.nome_cliente_pedido.toLowerCase().includes(t) || c.franquia_nome.toLowerCase().includes(t)
  })
  const estornosFiltrados = estornos?.filter((e) => {
    if (!busca) return true
    const t = busca.toLowerCase()
    return e.numero_pedido.toLowerCase().includes(t) || e.nome_cliente.toLowerCase().includes(t) || e.franquia_nome.toLowerCase().includes(t)
  })
  const cancelamentosFiltrados = cancelamentos?.filter((c) => {
    if (!busca) return true
    const t = busca.toLowerCase()
    return c.numero_pedido_cancelar.toLowerCase().includes(t) || c.nome_cliente.toLowerCase().includes(t) || c.franquia_nome.toLowerCase().includes(t)
  })

  const Secao = <T extends { id: number }>({
    titulo, icon: Icon, itens, isLoading: carregando, onSelect, colunas, renderRow, vazio,
  }: {
    titulo: string
    icon: any
    itens: T[] | undefined
    isLoading: boolean
    onSelect: (item: T) => void
    colunas: string[]
    renderRow: (item: T) => React.ReactNode
    vazio: string
  }) => (
    <div className="pt-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{titulo}</p>
      {carregando && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-sm text-slate-400">Carregando...</div>
      )}
      {itens && itens.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <Icon size={20} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">{vazio}</p>
        </div>
      )}
      {itens && itens.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="max-h-[280px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-100 bg-brand-mist">
                  {colunas.map((c) => (
                    <th key={c} className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {itens.map((item) => (
                  <tr key={item.id} onClick={() => onSelect(item)} className="hover:bg-brand-khaki/10 transition-colors cursor-pointer">
                    {renderRow(item)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 border-t border-slate-100 bg-brand-mist">
            <p className="text-xs text-slate-400">{itens.length} registro(s) pendente(s)</p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="bg-brand-khaki/10 border border-brand-khaki/30 rounded-xl px-5 py-3">
        <p className="text-sm text-brand-umber">
          Solicitações aguardando sua validação financeira. Clique em um item para aprovar ou reprovar.
        </p>
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 focus:border-brand-teal transition-all"
        />
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-sm text-slate-400">Carregando...</div>
      )}
      {filtrados && filtrados.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <DollarSign size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhum pedido pendente de validacao</p>
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
                  <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Anexos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.map((v) => (
                  <tr key={v.id} onClick={() => setSelecionado(v)} className="hover:bg-brand-khaki/10 transition-colors cursor-pointer">
                    <td className="px-5 py-3 font-medium text-slate-800">{v.numero_pedido}</td>
                    <td className="px-5 py-3 text-slate-600">{v.franquia_nome}</td>
                    <td className="px-5 py-3 text-slate-600">{v.nome_cliente}</td>
                    <td className="px-5 py-3 text-slate-600">
                      R$ {Number(v.valor_pedido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {v.data_pedido ? new Date(v.data_pedido + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{v.anexos?.length || 0} arquivo(s)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 border-t border-slate-100 bg-brand-mist">
            <p className="text-xs text-slate-400">{filtrados.length} pedido(s) pendente(s)</p>
          </div>
        </div>
      )}

      <Secao
        titulo="Trocas de Pedido"
        icon={Repeat}
        itens={trocasFiltradas}
        isLoading={isLoadingTrocas}
        onSelect={setSelecionadoTroca}
        vazio="Nenhuma troca de pedido pendente"
        colunas={['N. Pedido a Cancelar', 'Franquia', 'Vendedor', 'Novo Pedido', 'Anexos']}
        renderRow={(t) => (
          <>
            <td className="px-5 py-3 font-medium text-slate-800">{t.numero_pedido_cancelar}</td>
            <td className="px-5 py-3 text-slate-600">{t.franquia_nome}</td>
            <td className="px-5 py-3 text-slate-600">{t.nome_vendedor}</td>
            <td className="px-5 py-3 text-slate-600">{t.numero_novo_pedido}</td>
            <td className="px-5 py-3 text-slate-400 text-xs">{t.anexos?.length || 0} arquivo(s)</td>
          </>
        )}
      />

      <Secao
        titulo="Links de Pagamento"
        icon={Link2}
        itens={linksFiltrados}
        isLoading={isLoadingLinks}
        onSelect={setSelecionadoLink}
        vazio="Nenhum link de pagamento pendente"
        colunas={['N. Pedido', 'Franquia', 'Cliente', 'Valor do Link', 'Anexos']}
        renderRow={(l) => (
          <>
            <td className="px-5 py-3 font-medium text-slate-800">{l.numero_pedido}</td>
            <td className="px-5 py-3 text-slate-600">{l.franquia_nome}</td>
            <td className="px-5 py-3 text-slate-600">{l.nome_cliente}</td>
            <td className="px-5 py-3 text-slate-600">R$ {Number(l.valor_link).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td className="px-5 py-3 text-slate-400 text-xs">{l.anexos?.length || 0} arquivo(s)</td>
          </>
        )}
      />

      <Secao
        titulo="Cartas de Correção"
        icon={FileEdit}
        itens={cartasFiltradas}
        isLoading={isLoadingCartas}
        onSelect={setSelecionadoCarta}
        vazio="Nenhuma carta de correção pendente"
        colunas={['N. Pedido', 'Franquia', 'Cliente', 'N. Nota Fiscal', 'Anexos']}
        renderRow={(c) => (
          <>
            <td className="px-5 py-3 font-medium text-slate-800">{c.numero_pedido}</td>
            <td className="px-5 py-3 text-slate-600">{c.franquia_nome}</td>
            <td className="px-5 py-3 text-slate-600">{c.nome_cliente_pedido}</td>
            <td className="px-5 py-3 text-slate-600">{c.numero_nota_fiscal}</td>
            <td className="px-5 py-3 text-slate-400 text-xs">{c.anexos?.length || 0} arquivo(s)</td>
          </>
        )}
      />

      <Secao
        titulo="Solicitações de Estorno"
        icon={RotateCcw}
        itens={estornosFiltrados}
        isLoading={isLoadingEstornos}
        onSelect={setSelecionadoEstorno}
        vazio="Nenhuma solicitação de estorno pendente"
        colunas={['N. Pedido', 'Franquia', 'Cliente', 'Valor a Devolver', 'Anexos']}
        renderRow={(e) => (
          <>
            <td className="px-5 py-3 font-medium text-slate-800">{e.numero_pedido}</td>
            <td className="px-5 py-3 text-slate-600">{e.franquia_nome}</td>
            <td className="px-5 py-3 text-slate-600">{e.nome_cliente}</td>
            <td className="px-5 py-3 text-slate-600">R$ {Number(e.valor_devolver).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td className="px-5 py-3 text-slate-400 text-xs">{e.anexos?.length || 0} arquivo(s)</td>
          </>
        )}
      />

      <Secao
        titulo="Cancelamentos de Venda"
        icon={Ban}
        itens={cancelamentosFiltrados}
        isLoading={isLoadingCancelamentos}
        onSelect={setSelecionadoCancelamento}
        vazio="Nenhum cancelamento de venda pendente"
        colunas={['N. Pedido', 'Franquia', 'Cliente', 'Valor a Cancelar']}
        renderRow={(c) => (
          <>
            <td className="px-5 py-3 font-medium text-slate-800">{c.numero_pedido_cancelar}</td>
            <td className="px-5 py-3 text-slate-600">{c.franquia_nome}</td>
            <td className="px-5 py-3 text-slate-600">{c.nome_cliente}</td>
            <td className="px-5 py-3 text-slate-600">R$ {Number(c.valor_cancelar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          </>
        )}
      />

      {selecionado && <VinculoModal vinculo={selecionado} onClose={() => setSelecionado(null)} modo="financeiro" />}
      {selecionadoTroca && <TrocaPedidoModal troca={selecionadoTroca} onClose={() => setSelecionadoTroca(null)} modo="financeiro" />}
      {selecionadoLink && <LinkPagamentoModal link={selecionadoLink} onClose={() => setSelecionadoLink(null)} modo="financeiro" />}
      {selecionadoCarta && <CartaCorrecaoModal carta={selecionadoCarta} onClose={() => setSelecionadoCarta(null)} modo="financeiro" />}
      {selecionadoEstorno && <SolicitacaoEstornoModal estorno={selecionadoEstorno} onClose={() => setSelecionadoEstorno(null)} modo="financeiro" />}
      {selecionadoCancelamento && <CancelamentoVendaModal cancelamento={selecionadoCancelamento} onClose={() => setSelecionadoCancelamento(null)} modo="financeiro" />}
    </div>
  )
}
