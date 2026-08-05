'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Store, AlertCircle, Repeat, Link2, FileEdit, RotateCcw, Ban } from 'lucide-react'
import { vinculoService, VinculoData } from '@/services/vinculo'
import { authService } from '@/services/auth'
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
import Link from 'next/link'

const statusTriagemLabels: Record<string, string> = {
  aberto: 'Novo Pedido',
  aguardando_comercial: 'Aguard. Comercial',
  aguardando_faturamento: 'Aguard. Faturamento',
  aguardando_financeiro: 'Aguard. Financeiro',
  aguardando_ti: 'Aguard. TI',
  fechado: 'Concluído',
}

const statusTriagemColors: Record<string, string> = {
  aberto: 'bg-brand-khaki/20 text-brand-umber',
  aguardando_comercial: 'bg-brand-olive/20 text-brand-forest',
  aguardando_faturamento: 'bg-brand-teal/25 text-brand-pine',
  aguardando_financeiro: 'bg-brand-pine/15 text-brand-pine',
  aguardando_ti: 'bg-brand-forest/10 text-brand-forest',
  fechado: 'bg-brand-lime/25 text-brand-forest',
}

const statusLabels: Record<string, string> = {
  aberto: 'Novo Pedido',
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

export default function FranquiaPage() {
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<VinculoData | null>(null)
  const [selecionadoTroca, setSelecionadoTroca] = useState<TrocaPedidoData | null>(null)
  const [selecionadoLink, setSelecionadoLink] = useState<LinkPagamentoData | null>(null)
  const [selecionadoCarta, setSelecionadoCarta] = useState<CartaCorrecaoData | null>(null)
  const [selecionadoEstorno, setSelecionadoEstorno] = useState<SolicitacaoEstornoData | null>(null)
  const [selecionadoCancelamento, setSelecionadoCancelamento] = useState<CancelamentoVendaData | null>(null)
  const [franquiaId, setFranquiaId] = useState<number | null>(null)

  useEffect(() => {
    setFranquiaId(authService.getFranquiaId())
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['vinculos', 'franquia', franquiaId],
    queryFn: () => vinculoService.listar(undefined, franquiaId!),
    enabled: franquiaId !== null,
  })

  const { data: trocas, isLoading: isLoadingTrocas } = useQuery({
    queryKey: ['trocas-pedido', 'franquia', franquiaId],
    queryFn: () => trocaPedidoService.listar(undefined, franquiaId!),
    enabled: franquiaId !== null,
  })

  const { data: links, isLoading: isLoadingLinks } = useQuery({
    queryKey: ['links-pagamento', 'franquia', franquiaId],
    queryFn: () => linkPagamentoService.listar(undefined, franquiaId!),
    enabled: franquiaId !== null,
  })

  const { data: cartas, isLoading: isLoadingCartas } = useQuery({
    queryKey: ['cartas-correcao', 'franquia', franquiaId],
    queryFn: () => cartaCorrecaoService.listar(undefined, franquiaId!),
    enabled: franquiaId !== null,
  })

  const { data: estornos, isLoading: isLoadingEstornos } = useQuery({
    queryKey: ['solicitacoes-estorno', 'franquia', franquiaId],
    queryFn: () => solicitacaoEstornoService.listar(undefined, franquiaId!),
    enabled: franquiaId !== null,
  })

  const { data: cancelamentos, isLoading: isLoadingCancelamentos } = useQuery({
    queryKey: ['cancelamentos-venda', 'franquia', franquiaId],
    queryFn: () => cancelamentoVendaService.listar(undefined, franquiaId!),
    enabled: franquiaId !== null,
  })

  const filtrados = data?.filter((v) => {
    if (!busca) return true
    const t = busca.toLowerCase()
    return v.numero_pedido.toLowerCase().includes(t) || v.nome_cliente.toLowerCase().includes(t)
  })
  const ativos = filtrados?.filter(v => v.status !== 'aberto') ?? []
  const reprovados = filtrados?.filter(v => v.status === 'aberto') ?? []

  const trocasFiltradas = trocas?.filter((t) => {
    if (!busca) return true
    const termo = busca.toLowerCase()
    return t.numero_pedido_cancelar.toLowerCase().includes(termo) || t.nome_vendedor.toLowerCase().includes(termo)
  })
  const trocasAtivas = trocasFiltradas?.filter(t => t.status !== 'aberto') ?? []
  const trocasReprovadas = trocasFiltradas?.filter(t => t.status === 'aberto') ?? []

  const linksFiltrados = links?.filter((l) => {
    if (!busca) return true
    const t = busca.toLowerCase()
    return l.numero_pedido.toLowerCase().includes(t) || l.nome_cliente.toLowerCase().includes(t)
  })
  const linksAtivos = linksFiltrados?.filter(l => l.status !== 'aberto') ?? []
  const linksReprovados = linksFiltrados?.filter(l => l.status === 'aberto') ?? []

  const cartasFiltradas = cartas?.filter((c) => {
    if (!busca) return true
    const t = busca.toLowerCase()
    return c.numero_pedido.toLowerCase().includes(t) || c.nome_cliente_pedido.toLowerCase().includes(t)
  })
  const cartasAtivas = cartasFiltradas?.filter(c => c.status !== 'aberto') ?? []
  const cartasReprovadas = cartasFiltradas?.filter(c => c.status === 'aberto') ?? []

  const estornosFiltrados = estornos?.filter((e) => {
    if (!busca) return true
    const t = busca.toLowerCase()
    return (e.numero_pedido || '').toLowerCase().includes(t) || e.nome_cliente.toLowerCase().includes(t)
  })
  const estornosAtivos = estornosFiltrados?.filter(e => e.status !== 'aberto') ?? []
  const estornosReprovados = estornosFiltrados?.filter(e => e.status === 'aberto') ?? []

  const cancelamentosFiltrados = cancelamentos?.filter((c) => {
    if (!busca) return true
    const t = busca.toLowerCase()
    return c.numero_pedido_cancelar.toLowerCase().includes(t) || c.nome_cliente.toLowerCase().includes(t)
  })
  const cancelamentosAtivos = cancelamentosFiltrados?.filter(c => c.status !== 'aberto') ?? []
  const cancelamentosReprovados = cancelamentosFiltrados?.filter(c => c.status === 'aberto') ?? []

  const TabelaVinculos = ({ vinculos, vazio }: { vinculos: VinculoData[]; vazio: string }) => (
    vinculos.length === 0 ? (
      <div className="px-5 py-8 text-center">
        <p className="text-sm text-slate-400">{vazio}</p>
      </div>
    ) : (
      <>
        <div className="max-h-[260px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-100 bg-white">
                <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">N. Pedido</th>
                <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Cliente</th>
                <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Valor</th>
                <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Data</th>
                <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {vinculos.map((v) => (
                <tr key={v.id} onClick={() => setSelecionado(v)} className="hover:bg-brand-mist/60 transition-colors cursor-pointer">
                  <td className="px-5 py-3 font-medium text-slate-800">{v.numero_pedido}</td>
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
          <p className="text-xs text-slate-400">{vinculos.length} pedido(s)</p>
        </div>
      </>
    )
  )

  // Seção genérica reutilizável pros formulários de triagem (Troca/Link/Carta/Estorno/Cancelamento)
  const SecaoTriagem = <T extends { id: number; status: string }>({
    titulo, icon: Icon, ativos: itens, reprovados: itensReprovados, isLoading: carregando, onSelect, renderRow, vazio,
  }: {
    titulo: string
    icon: any
    ativos: T[]
    reprovados: T[]
    isLoading: boolean
    onSelect: (item: T) => void
    renderRow: (item: T) => React.ReactNode
    vazio: string
  }) => (
    <>
      {!carregando && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-brand-mist flex items-center gap-2">
            <Icon size={16} className="text-brand-pine" />
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{titulo}</p>
          </div>
          {itens.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-400">{vazio}</p>
            </div>
          ) : (
            <>
              <div className="max-h-[260px] overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-50">
                    {itens.map((item) => (
                      <tr key={item.id} onClick={() => onSelect(item)} className="hover:bg-brand-mist/60 transition-colors cursor-pointer">
                        {renderRow(item)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-2.5 border-t border-slate-100 bg-brand-mist">
                <p className="text-xs text-slate-400">{itens.length} registro(s)</p>
              </div>
            </>
          )}
        </div>
      )}

      {itensReprovados.length > 0 && (
        <div className="bg-white rounded-xl border border-brand-khaki/30 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-brand-khaki/30 bg-brand-khaki/10 flex items-center gap-2">
            <AlertCircle size={16} className="text-brand-umber" />
            <p className="text-xs font-semibold text-brand-umber uppercase tracking-wider">{titulo} Reprovados — Ação Necessária</p>
          </div>
          <div className="max-h-[260px] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-brand-khaki/10">
                {itensReprovados.map((item) => (
                  <tr key={item.id} onClick={() => onSelect(item)} className="hover:bg-brand-khaki/10 transition-colors cursor-pointer">
                    {renderRow(item)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 border-t border-brand-khaki/20 bg-brand-khaki/10">
            <p className="text-xs text-brand-umber">{itensReprovados.length} registro(s) aguardando revisão</p>
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className="space-y-5">
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar pedido..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/franquia/novo" className="flex items-center justify-center gap-2 w-32 text-center leading-tight bg-brand-pine hover:bg-brand-forest text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Plus size={16} className="shrink-0" />
            <span>Pedido de<br />Vínculo</span>
          </Link>
          <Link href="/franquia/nova-troca" className="flex items-center justify-center gap-2 w-32 text-center leading-tight bg-white hover:bg-brand-mist text-brand-pine border border-brand-pine/30 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Repeat size={16} className="shrink-0" />
            <span>Troca de<br />Pedido</span>
          </Link>
          <Link href="/franquia/novo-link" className="flex items-center justify-center gap-2 w-32 text-center leading-tight bg-white hover:bg-brand-mist text-brand-pine border border-brand-pine/30 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Link2 size={16} className="shrink-0" />
            <span>Link de<br />Pagamento</span>
          </Link>
          <Link href="/franquia/nova-carta" className="flex items-center justify-center gap-2 w-32 text-center leading-tight bg-white hover:bg-brand-mist text-brand-pine border border-brand-pine/30 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <FileEdit size={16} className="shrink-0" />
            <span>Carta de<br />Correção</span>
          </Link>
          <Link href="/franquia/novo-estorno" className="flex items-center justify-center gap-2 w-32 text-center leading-tight bg-white hover:bg-brand-mist text-brand-pine border border-brand-pine/30 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <RotateCcw size={16} className="shrink-0" />
            <span>Solicitação<br />de Estorno</span>
          </Link>
          <Link href="/franquia/novo-cancelamento" className="flex items-center justify-center gap-2 w-32 text-center leading-tight bg-white hover:bg-brand-mist text-brand-pine border border-brand-pine/30 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Ban size={16} className="shrink-0" />
            <span>Cancelamento<br />de Venda</span>
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-sm text-slate-400">
          Carregando...
        </div>
      )}

      {!franquiaId && (
        <div className="bg-brand-khaki/10 border border-brand-khaki/30 rounded-xl px-5 py-4 text-brand-umber text-sm">
          Sua conta não está vinculada a uma franquia. Contate o administrador.
        </div>
      )}

      {/* Pedidos de Vínculo ativos */}
      {!isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-brand-mist flex items-center gap-2">
            <Store size={16} className="text-brand-pine" />
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Meus Pedidos</p>
          </div>
          <TabelaVinculos vinculos={ativos} vazio="Nenhum pedido em andamento" />
        </div>
      )}

      {/* Pedidos de Vínculo reprovados */}
      {reprovados.length > 0 && (
        <div className="bg-white rounded-xl border border-brand-khaki/30 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-brand-khaki/30 bg-brand-khaki/10 flex items-center gap-2">
            <AlertCircle size={16} className="text-brand-umber" />
            <p className="text-xs font-semibold text-brand-umber uppercase tracking-wider">Pedidos Reprovados — Ação Necessária</p>
          </div>
          <div className="max-h-[260px] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-brand-khaki/10">
                {reprovados.map((v) => (
                  <tr key={v.id} onClick={() => setSelecionado(v)} className="hover:bg-brand-khaki/10 transition-colors cursor-pointer">
                    <td className="px-5 py-3 font-medium text-slate-800">{v.numero_pedido}</td>
                    <td className="px-5 py-3 text-slate-600">{v.nome_cliente}</td>
                    <td className="px-5 py-3 text-slate-600">
                      R$ {Number(v.valor_pedido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {v.data_pedido ? new Date(v.data_pedido + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand-khaki/20 text-brand-umber">Novo Pedido</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 border-t border-brand-khaki/20 bg-brand-khaki/10">
            <p className="text-xs text-brand-umber">{reprovados.length} pedido(s) aguardando revisão — clique para editar e reenviar</p>
          </div>
        </div>
      )}

      {/* Trocas de Pedido */}
      <SecaoTriagem
        titulo="Minhas Trocas de Pedido"
        icon={Repeat}
        ativos={trocasAtivas}
        reprovados={trocasReprovadas}
        isLoading={isLoadingTrocas}
        onSelect={setSelecionadoTroca}
        vazio="Nenhuma troca de pedido em andamento"
        renderRow={(t) => (
          <>
            <td className="px-5 py-3 font-medium text-slate-800">{t.numero_pedido_cancelar}</td>
            <td className="px-5 py-3 text-slate-600">{t.nome_vendedor}</td>
            <td className="px-5 py-3 text-slate-600">{t.numero_novo_pedido}</td>
            <td className="px-5 py-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusTriagemColors[t.status] || 'bg-slate-100 text-slate-600'}`}>
                {statusTriagemLabels[t.status] || t.status}
              </span>
            </td>
          </>
        )}
      />

      {/* Links de Pagamento */}
      <SecaoTriagem
        titulo="Meus Links de Pagamento"
        icon={Link2}
        ativos={linksAtivos}
        reprovados={linksReprovados}
        isLoading={isLoadingLinks}
        onSelect={setSelecionadoLink}
        vazio="Nenhum link de pagamento em andamento"
        renderRow={(l) => (
          <>
            <td className="px-5 py-3 font-medium text-slate-800">{l.numero_pedido}</td>
            <td className="px-5 py-3 text-slate-600">{l.nome_cliente}</td>
            <td className="px-5 py-3 text-slate-600">
              R$ {Number(l.valor_link).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </td>
            <td className="px-5 py-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusTriagemColors[l.status] || 'bg-slate-100 text-slate-600'}`}>
                {statusTriagemLabels[l.status] || l.status}
              </span>
            </td>
          </>
        )}
      />

      {/* Cartas de Correção */}
      <SecaoTriagem
        titulo="Minhas Cartas de Correção"
        icon={FileEdit}
        ativos={cartasAtivas}
        reprovados={cartasReprovadas}
        isLoading={isLoadingCartas}
        onSelect={setSelecionadoCarta}
        vazio="Nenhuma carta de correção em andamento"
        renderRow={(c) => (
          <>
            <td className="px-5 py-3 font-medium text-slate-800">{c.numero_pedido}</td>
            <td className="px-5 py-3 text-slate-600">{c.nome_cliente_pedido}</td>
            <td className="px-5 py-3 text-slate-600">{c.numero_nota_fiscal}</td>
            <td className="px-5 py-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusTriagemColors[c.status] || 'bg-slate-100 text-slate-600'}`}>
                {statusTriagemLabels[c.status] || c.status}
              </span>
            </td>
          </>
        )}
      />

      {/* Solicitações de Estorno */}
      <SecaoTriagem
        titulo="Minhas Solicitações de Estorno"
        icon={RotateCcw}
        ativos={estornosAtivos}
        reprovados={estornosReprovados}
        isLoading={isLoadingEstornos}
        onSelect={setSelecionadoEstorno}
        vazio="Nenhuma solicitação de estorno em andamento"
        renderRow={(e) => (
          <>
            <td className="px-5 py-3 font-medium text-slate-800">{e.numero_pedido || '—'}</td>
            <td className="px-5 py-3 text-slate-600">{e.nome_cliente}</td>
            <td className="px-5 py-3 text-slate-600">
              R$ {Number(e.valor_devolver).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </td>
            <td className="px-5 py-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusTriagemColors[e.status] || 'bg-slate-100 text-slate-600'}`}>
                {statusTriagemLabels[e.status] || e.status}
              </span>
            </td>
          </>
        )}
      />

      {/* Cancelamentos de Venda */}
      <SecaoTriagem
        titulo="Meus Cancelamentos de Venda"
        icon={Ban}
        ativos={cancelamentosAtivos}
        reprovados={cancelamentosReprovados}
        isLoading={isLoadingCancelamentos}
        onSelect={setSelecionadoCancelamento}
        vazio="Nenhum cancelamento de venda em andamento"
        renderRow={(c) => (
          <>
            <td className="px-5 py-3 font-medium text-slate-800">{c.numero_pedido_cancelar}</td>
            <td className="px-5 py-3 text-slate-600">{c.nome_cliente}</td>
            <td className="px-5 py-3 text-slate-600">
              R$ {Number(c.valor_cancelar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </td>
            <td className="px-5 py-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusTriagemColors[c.status] || 'bg-slate-100 text-slate-600'}`}>
                {statusTriagemLabels[c.status] || c.status}
              </span>
            </td>
          </>
        )}
      />

      {selecionado && <VinculoModal vinculo={selecionado} onClose={() => setSelecionado(null)} modo="franquia" />}
      {selecionadoTroca && <TrocaPedidoModal troca={selecionadoTroca} onClose={() => setSelecionadoTroca(null)} modo="franquia" />}
      {selecionadoLink && <LinkPagamentoModal link={selecionadoLink} onClose={() => setSelecionadoLink(null)} modo="franquia" />}
      {selecionadoCarta && <CartaCorrecaoModal carta={selecionadoCarta} onClose={() => setSelecionadoCarta(null)} modo="franquia" />}
      {selecionadoEstorno && <SolicitacaoEstornoModal estorno={selecionadoEstorno} onClose={() => setSelecionadoEstorno(null)} modo="franquia" />}
      {selecionadoCancelamento && <CancelamentoVendaModal cancelamento={selecionadoCancelamento} onClose={() => setSelecionadoCancelamento(null)} modo="franquia" />}
    </div>
  )
}
