'use client'

import { useState, useEffect } from 'react'
import { X, Check, XCircle, Upload, FileText, Image as ImageIcon, Pencil, Send, AlertTriangle } from 'lucide-react'
import { TrocaPedidoData, trocaPedidoService } from '@/services/troca-pedido'
import { uploadService } from '@/services/vinculo'
import { TrocaMotivoSelect } from '@/components/troca-motivo-select'
import { AnexosGrid } from '@/components/anexos-grid'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface TrocaPedidoModalProps {
  troca: TrocaPedidoData
  onClose: () => void
  modo: 'comercial' | 'faturamento' | 'financeiro' | 'ti' | 'franquia' | 'visualizar'
}

const statusLabels: Record<string, string> = {
  aberto: 'Novo Pedido',
  aguardando_comercial: 'Aguard. Comercial',
  aguardando_faturamento: 'Aguard. Faturamento',
  aguardando_financeiro: 'Aguard. Financeiro',
  aguardando_ti: 'Aguard. TI',
  fechado: 'Finalizado',
}

const statusColors: Record<string, string> = {
  aberto: 'bg-brand-khaki/20 text-brand-umber',
  aguardando_comercial: 'bg-brand-olive/20 text-brand-forest',
  aguardando_faturamento: 'bg-brand-teal/25 text-brand-pine',
  aguardando_financeiro: 'bg-brand-pine/15 text-brand-pine',
  aguardando_ti: 'bg-brand-forest/10 text-brand-forest',
  fechado: 'bg-brand-lime/25 text-brand-forest',
}

const STATUS_PORTAL_OPCOES = [
  { value: 'processando_pagamento', label: 'Processando pagamento' },
  { value: 'em_separacao', label: 'Em Separação' },
  { value: 'faturado', label: 'Faturado' },
]

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

export function TrocaPedidoModal({ troca, onClose, modo }: TrocaPedidoModalProps) {
  const queryClient = useQueryClient()
  const [justificativa, setJustificativa] = useState('')
  const [mostrarReprovar, setMostrarReprovar] = useState(false)
  const [arquivosAprovacao, setArquivosAprovacao] = useState<File[]>([])
  const [enviando, setEnviando] = useState(false)
  const [destinoReprovacao, setDestinoReprovacao] = useState<'comercial' | 'franquia'>('comercial')
  const [observacao, setObservacao] = useState('')

  // Estado de edicao
  const [editando, setEditando] = useState(false)
  const [formFranquiaId, setFormFranquiaId] = useState(troca.franquia_id)
  const [formMotivo, setFormMotivo] = useState(troca.motivo)
  const [formMotivoDetalhado, setFormMotivoDetalhado] = useState(troca.motivo_detalhado || '')
  const [formNomeVendedor, setFormNomeVendedor] = useState(troca.nome_vendedor)
  const [formNumeroPedidoCancelar, setFormNumeroPedidoCancelar] = useState(troca.numero_pedido_cancelar)
  const [formDataPedidoCancelar, setFormDataPedidoCancelar] = useState(troca.data_pedido_cancelar)
  const [formCodigoProdutoCancelar, setFormCodigoProdutoCancelar] = useState(troca.codigo_produto_cancelar)
  const [formDescricaoPedidoCancelar, setFormDescricaoPedidoCancelar] = useState(troca.descricao_pedido_cancelar)
  const [formNumeroNovoPedido, setFormNumeroNovoPedido] = useState(troca.numero_novo_pedido)
  const [formCodigoProdutoNovo, setFormCodigoProdutoNovo] = useState(troca.codigo_produto_novo)
  const [formDescricaoNovoPedido, setFormDescricaoNovoPedido] = useState(troca.descricao_novo_pedido)
  const [formStatusPortal, setFormStatusPortal] = useState(troca.status_portal)
  const [formNomeCliente, setFormNomeCliente] = useState(troca.nome_cliente || '')
  const [formCpf, setFormCpf] = useState(troca.cpf || '')
  const [formValorNovoPedido, setFormValorNovoPedido] = useState(String(troca.valor_novo_pedido ?? ''))
  const [formValorPagoCliente, setFormValorPagoCliente] = useState(String(troca.valor_pago_cliente ?? ''))
  const [formAnexos, setFormAnexos] = useState<string[]>(troca.anexos || [])
  const [novosArquivos, setNovosArquivos] = useState<File[]>([])

  const { data: empresas } = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const res = await api.get('/empresas')
      return res.data
    },
    enabled: editando && modo !== 'franquia',
  })

  const podeEditar =
    (modo === 'comercial' || modo === 'franquia') &&
    troca.status === 'aberto' &&
    !!troca.justificativa_reprovacao

  const podeAprovarReprovar =
    (modo === 'comercial' && troca.status === 'aguardando_comercial') ||
    (modo === 'faturamento' && troca.status === 'aguardando_faturamento') ||
    (modo === 'financeiro' && troca.status === 'aguardando_financeiro') ||
    (modo === 'ti' && troca.status === 'aguardando_ti')

  const aprovarMutation = useMutation({
    mutationFn: async () => {
      if (modo === 'comercial') {
        return trocaPedidoService.aprovar(troca.id, { observacao: observacao || undefined })
      }
      const resultados = await Promise.all(arquivosAprovacao.map(arq => uploadService.upload(arq)))
      const anexoUrls = resultados.map(r => r.url)
      if (modo === 'faturamento') {
        return trocaPedidoService.aprovar(troca.id, { observacao: observacao || undefined, anexos: anexoUrls })
      }
      return trocaPedidoService.aprovar(troca.id, { anexos: anexoUrls })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trocas-pedido'] })
      onClose()
    },
  })

  const reprovarMutation = useMutation({
    mutationFn: () => trocaPedidoService.reprovar(
      troca.id,
      justificativa || undefined,
      modo === 'comercial' ? undefined : destinoReprovacao
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trocas-pedido'] })
      onClose()
    },
  })

  const reenviarMutation = useMutation({
    mutationFn: async () => {
      const resultados = await Promise.all(novosArquivos.map(arq => uploadService.upload(arq)))
      const todosAnexos = [...formAnexos, ...resultados.map(r => r.url)]
      return trocaPedidoService.reenviar(troca.id, {
        franquia_id: formFranquiaId,
        motivo: formMotivo,
        motivo_detalhado: formMotivoDetalhado,
        nome_vendedor: formNomeVendedor,
        numero_pedido_cancelar: formNumeroPedidoCancelar,
        data_pedido_cancelar: formDataPedidoCancelar,
        codigo_produto_cancelar: formCodigoProdutoCancelar,
        descricao_pedido_cancelar: formDescricaoPedidoCancelar,
        numero_novo_pedido: formNumeroNovoPedido,
        codigo_produto_novo: formCodigoProdutoNovo,
        descricao_novo_pedido: formDescricaoNovoPedido,
        status_portal: formStatusPortal,
        nome_cliente: formNomeCliente,
        cpf: formCpf,
        valor_novo_pedido: parseFloat(formValorNovoPedido),
        valor_pago_cliente: parseFloat(formValorPagoCliente),
        anexos: todosAnexos,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trocas-pedido'] })
      onClose()
    },
  })

  const handleAprovar = async () => {
    setEnviando(true)
    try { await aprovarMutation.mutateAsync() } finally { setEnviando(false) }
  }

  const handleReprovar = async () => {
    if (modo === 'comercial' && !justificativa.trim()) return
    setEnviando(true)
    try { await reprovarMutation.mutateAsync() } finally { setEnviando(false) }
  }

  const handleReenviar = async () => {
    if (
      !formNomeVendedor.trim() || !formNumeroPedidoCancelar.trim() || !formDataPedidoCancelar || !formStatusPortal ||
      !formMotivoDetalhado.trim() || !formNomeCliente.trim() || formCpf.replace(/\D/g, '').length !== 11 ||
      !formValorNovoPedido || !formValorPagoCliente
    ) return
    setEnviando(true)
    try { await reenviarMutation.mutateAsync() } finally { setEnviando(false) }
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 transition-all"
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Troca {troca.numero_pedido_cancelar}
              {editando && <span className="text-sm font-normal text-brand-umber ml-2">— Editando</span>}
            </h3>
            <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[troca.status] || 'bg-slate-100 text-slate-600'}`}>
              {statusLabels[troca.status] || troca.status}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Justificativa de reprovacao */}
          {troca.justificativa_reprovacao && (
            <div className="bg-brand-khaki/10 border border-brand-khaki/30 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-brand-umber mb-1">Motivo da Reprovacao</p>
              <p className="text-sm text-brand-umber">{troca.justificativa_reprovacao}</p>
            </div>
          )}

          {editando ? (
            /* ===== MODO EDICAO ===== */
            <div className="space-y-4">
              {modo !== 'franquia' && (
                <div>
                  <label className={labelClass}>Franquia</label>
                  <select
                    value={formFranquiaId}
                    onChange={(e) => setFormFranquiaId(Number(e.target.value))}
                    className={inputClass + ' bg-white'}
                  >
                    <option value="">Selecione...</option>
                    {empresas?.map((e: any) => (
                      <option key={e.id} value={e.id}>
                        {e.nome_fantasia || e.razao_social}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={labelClass}>Motivo</label>
                <TrocaMotivoSelect value={formMotivo} onChange={setFormMotivo} />
              </div>

              <div>
                <label className={labelClass}>Motivo detalhado</label>
                <textarea value={formMotivoDetalhado} onChange={(e) => setFormMotivoDetalhado(e.target.value)} className={inputClass + ' resize-none'} rows={4} />
              </div>

              <div>
                <label className={labelClass}>Nome do Vendedor</label>
                <input value={formNomeVendedor} onChange={(e) => setFormNomeVendedor(e.target.value)} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>N. do Pedido a Cancelar</label>
                  <input value={formNumeroPedidoCancelar} onChange={(e) => setFormNumeroPedidoCancelar(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Data do Pedido</label>
                  <input type="date" value={formDataPedidoCancelar} onChange={(e) => setFormDataPedidoCancelar(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Código do Produto (ID) a Cancelar</label>
                <input value={formCodigoProdutoCancelar} onChange={(e) => setFormCodigoProdutoCancelar(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Descrição do Pedido a Cancelar</label>
                <textarea value={formDescricaoPedidoCancelar} onChange={(e) => setFormDescricaoPedidoCancelar(e.target.value)} className={inputClass + ' resize-none'} rows={3} />
              </div>

              <div>
                <label className={labelClass}>N. do Novo Pedido</label>
                <input value={formNumeroNovoPedido} onChange={(e) => setFormNumeroNovoPedido(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Código do Produto (ID) do Novo Pedido</label>
                <input value={formCodigoProdutoNovo} onChange={(e) => setFormCodigoProdutoNovo(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Descrição do Novo Pedido</label>
                <textarea value={formDescricaoNovoPedido} onChange={(e) => setFormDescricaoNovoPedido(e.target.value)} className={inputClass + ' resize-none'} rows={3} />
              </div>

              <div>
                <label className={labelClass}>Status do Pedido no Portal</label>
                <select value={formStatusPortal} onChange={(e) => setFormStatusPortal(e.target.value)} className={inputClass + ' bg-white'}>
                  <option value="">Selecione...</option>
                  {STATUS_PORTAL_OPCOES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Nome completo do Cliente</label>
                <input value={formNomeCliente} onChange={(e) => setFormNomeCliente(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>CPF do Cliente</label>
                <input value={formCpf} onChange={(e) => setFormCpf(formatCpf(e.target.value))} className={inputClass} maxLength={14} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Valor do novo Pedido no portal</label>
                  <input type="number" step="0.01" value={formValorNovoPedido} onChange={(e) => setFormValorNovoPedido(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Valor pago pelo Cliente</label>
                  <input type="number" step="0.01" value={formValorPagoCliente} onChange={(e) => setFormValorPagoCliente(e.target.value)} className={inputClass} />
                </div>
              </div>

              {/* Anexos existentes */}
              {formAnexos.length > 0 && (
                <div>
                  <p className={labelClass}>Anexos atuais</p>
                  <div className="space-y-1">
                    {formAnexos.map((anexo, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                        <FileText size={14} className="text-slate-400" />
                        <span className="flex-1 text-sm text-slate-600 truncate">{anexo.split('/').pop()}</span>
                        <button
                          type="button"
                          onClick={() => setFormAnexos(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>Adicionar Anexos</label>
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors">
                  <Upload size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-400">Selecionar arquivos...</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      if (files.length > 0) setNovosArquivos(prev => [...prev, ...files])
                      e.target.value = ''
                    }}
                  />
                </label>
                {novosArquivos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {novosArquivos.map((arq, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-600 bg-brand-olive/10 rounded-lg px-3 py-2">
                        <span className="text-xs text-brand-pine font-medium">NOVO</span>
                        <span className="flex-1 truncate">{arq.name}</span>
                        <button type="button" onClick={() => setNovosArquivos(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ===== MODO VISUALIZACAO ===== */
            <>
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Franquia" valor={troca.franquia_nome} />
                <Campo label="Vendedor" valor={troca.nome_vendedor} />
                <Campo label="Motivo" valor={troca.motivo} />
                <Campo label="Status no Portal" valor={STATUS_PORTAL_OPCOES.find(o => o.value === troca.status_portal)?.label || troca.status_portal} />
              </div>

              {troca.motivo_detalhado && (
                <Campo label="Motivo detalhado" valor={troca.motivo_detalhado} />
              )}

              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</p>
                <div className="grid grid-cols-2 gap-4">
                  <Campo label="Nome" valor={troca.nome_cliente || '—'} />
                  <Campo label="CPF" valor={troca.cpf || '—'} />
                  <Campo label="Valor do novo Pedido" valor={troca.valor_novo_pedido != null ? `R$ ${Number(troca.valor_novo_pedido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} />
                  <Campo label="Valor pago pelo Cliente" valor={troca.valor_pago_cliente != null ? `R$ ${Number(troca.valor_pago_cliente).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pedido a cancelar</p>
                <div className="grid grid-cols-2 gap-4">
                  <Campo label="N. do Pedido" valor={troca.numero_pedido_cancelar} />
                  <Campo label="Data" valor={troca.data_pedido_cancelar ? new Date(troca.data_pedido_cancelar + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} />
                  <Campo label="Código Produto" valor={troca.codigo_produto_cancelar} />
                </div>
                <Campo label="Modelo/Cor/Tamanho" valor={troca.descricao_pedido_cancelar} />
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Novo pedido</p>
                <div className="grid grid-cols-2 gap-4">
                  <Campo label="N. do Novo Pedido" valor={troca.numero_novo_pedido} />
                  <Campo label="Código Produto" valor={troca.codigo_produto_novo} />
                </div>
                <Campo label="Modelo/Cor/Tamanho" valor={troca.descricao_novo_pedido} />
              </div>

              {troca.observacao_comercial && (
                <Campo label="Observação do Comercial" valor={troca.observacao_comercial} />
              )}

              {troca.observacao_faturamento && (
                <Campo label="Observação do Faturamento" valor={troca.observacao_faturamento} />
              )}

              {/* Anexos */}
              <AnexosGrid anexos={troca.anexos} />

              {/* Observação opcional — só comercial (segue fixo pro Faturamento) */}
              {podeAprovarReprovar && modo === 'comercial' && !mostrarReprovar && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Observação (opcional)</p>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Informação para o Faturamento (opcional)..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 transition-all resize-none"
                    rows={2}
                  />
                </div>
              )}

              {/* Observação opcional — só faturamento (usada tanto pra aprovar quanto reprovar) */}
              {podeAprovarReprovar && modo === 'faturamento' && !mostrarReprovar && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Observação (opcional)</p>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Informação sobre o cancelamento da nota fiscal (opcional)..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 transition-all resize-none"
                    rows={2}
                  />
                </div>
              )}

              {/* Upload de anexos ao aprovar — faturamento/ti */}
              {podeAprovarReprovar && modo !== 'comercial' && !mostrarReprovar && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Anexar documentos (opcional)</p>
                  <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors">
                    <Upload size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-400">Selecionar arquivos...</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        if (files.length > 0) setArquivosAprovacao(prev => [...prev, ...files])
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {arquivosAprovacao.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {arquivosAprovacao.map((arq, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                          <ImageIcon size={14} className="text-brand-pine shrink-0" />
                          <span className="flex-1 truncate">{arq.name}</span>
                          <button type="button" onClick={() => setArquivosAprovacao(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reprovar form — comercial sempre volta pra franquia; faturamento/ti escolhem destino */}
              {podeAprovarReprovar && mostrarReprovar && (
                <div className="space-y-3">
                  {modo !== 'comercial' && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Enviar para</p>
                      <div className="flex gap-2">
                        {(['comercial', 'franquia'] as const).map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDestinoReprovacao(d)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                              destinoReprovacao === d
                                ? 'bg-brand-pine text-white border-brand-pine'
                                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {d === 'comercial' ? 'Comercial' : 'Franquia'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                      Justificativa {modo === 'comercial' ? '(volta para a Franquia)' : '(opcional)'}
                    </p>
                    <textarea
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      placeholder="Descreva o motivo da reprovacao..."
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 transition-all resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100">
          {editando ? (
            <div className="flex gap-3">
              <button
                onClick={() => setEditando(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReenviar}
                disabled={
                  enviando || !formNomeVendedor.trim() || !formNumeroPedidoCancelar.trim() || !formDataPedidoCancelar || !formStatusPortal ||
                  !formMotivoDetalhado.trim() || !formNomeCliente.trim() || formCpf.replace(/\D/g, '').length !== 11 ||
                  !formValorNovoPedido || !formValorPagoCliente
                }
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-brand-pine hover:bg-brand-forest transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={16} />
                {enviando ? 'Reenviando...' : 'Reenviar Solicitação'}
              </button>
            </div>
          ) : podeAprovarReprovar ? (
            <div className="flex gap-3">
              {mostrarReprovar ? (
                <>
                  <button
                    onClick={() => setMostrarReprovar(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReprovar}
                    disabled={(modo === 'comercial' && !justificativa.trim()) || enviando}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} />
                    {enviando ? 'Reprovando...' : 'Confirmar Reprovacao'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setMostrarReprovar(true)}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} />
                    Reprovar
                  </button>
                  <button
                    onClick={handleAprovar}
                    disabled={enviando}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-brand-pine hover:bg-brand-forest transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    {enviando ? 'Aprovando...' : 'Aprovar'}
                  </button>
                </>
              )}
            </div>
          ) : podeEditar ? (
            <button
              onClick={() => setEditando(true)}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-brand-khaki hover:bg-brand-umber transition-colors flex items-center justify-center gap-2"
            >
              <Pencil size={16} />
              Editar e Reenviar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-slate-700 mt-0.5">{valor}</p>
    </div>
  )
}
