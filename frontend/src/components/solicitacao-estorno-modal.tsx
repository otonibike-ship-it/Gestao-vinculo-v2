'use client'

import { useState } from 'react'
import { X, Check, XCircle, Upload, FileText, Image as ImageIcon, Pencil, Send, AlertTriangle } from 'lucide-react'
import { SolicitacaoEstornoData, solicitacaoEstornoService } from '@/services/solicitacao-estorno'
import { uploadService } from '@/services/vinculo'
import { AnexosGrid } from '@/components/anexos-grid'
import { FluxoStepper } from '@/components/fluxo-stepper'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface SolicitacaoEstornoModalProps {
  estorno: SolicitacaoEstornoData
  onClose: () => void
  modo: 'comercial' | 'faturamento' | 'financeiro' | 'ti' | 'franquia' | 'visualizar'
}

const statusLabels: Record<string, string> = {
  aberto: 'Novo Pedido',
  aguardando_comercial: 'Aguard. Comercial',
  aguardando_faturamento: 'Aguard. Faturamento',
  aguardando_financeiro: 'Aguard. Financeiro',
  aguardando_ti: 'Aguard. TI',
  fechado: 'Estorno Realizado',
}

const statusColors: Record<string, string> = {
  aberto: 'bg-brand-khaki/20 text-brand-umber',
  aguardando_comercial: 'bg-brand-olive/20 text-brand-forest',
  aguardando_faturamento: 'bg-brand-teal/25 text-brand-pine',
  aguardando_financeiro: 'bg-brand-pine/15 text-brand-pine',
  aguardando_ti: 'bg-brand-forest/10 text-brand-forest',
  fechado: 'bg-brand-lime/25 text-brand-forest',
}

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

export function SolicitacaoEstornoModal({ estorno, onClose, modo }: SolicitacaoEstornoModalProps) {
  const queryClient = useQueryClient()
  const [justificativa, setJustificativa] = useState('')
  const [mostrarReprovar, setMostrarReprovar] = useState(false)
  const [arquivosAprovacao, setArquivosAprovacao] = useState<File[]>([])
  const [enviando, setEnviando] = useState(false)
  const [destinoReprovacao, setDestinoReprovacao] = useState<'comercial' | 'franquia'>('comercial')
  const [observacao, setObservacao] = useState('')

  const [editando, setEditando] = useState(false)
  const [formFranquiaId, setFormFranquiaId] = useState(estorno.franquia_id)
  const [formMotivo, setFormMotivo] = useState(estorno.motivo)
  const [formVendedor, setFormVendedor] = useState(estorno.vendedor)
  const [formNumeroPedido, setFormNumeroPedido] = useState(estorno.numero_pedido || '')
  const [formDataPedido, setFormDataPedido] = useState(estorno.data_pedido)
  const [formNomeCliente, setFormNomeCliente] = useState(estorno.nome_cliente)
  const [formCpf, setFormCpf] = useState(estorno.cpf)
  const [formDataPagamento, setFormDataPagamento] = useState(estorno.data_pagamento)
  const [formValorPedidoPortal, setFormValorPedidoPortal] = useState(estorno.valor_pedido_portal != null ? String(estorno.valor_pedido_portal) : '')
  const [formValorTotalPago, setFormValorTotalPago] = useState(String(estorno.valor_total_pago))
  const [formValorDevolver, setFormValorDevolver] = useState(String(estorno.valor_devolver))
  const [formAnexos, setFormAnexos] = useState<string[]>(estorno.anexos || [])
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
    estorno.status === 'aberto' &&
    !!estorno.justificativa_reprovacao

  const podeAprovarReprovar =
    (modo === 'comercial' && estorno.status === 'aguardando_comercial') ||
    (modo === 'faturamento' && estorno.status === 'aguardando_faturamento') ||
    (modo === 'financeiro' && estorno.status === 'aguardando_financeiro') ||
    (modo === 'ti' && estorno.status === 'aguardando_ti')

  const aprovarMutation = useMutation({
    mutationFn: async () => {
      if (modo === 'comercial') {
        return solicitacaoEstornoService.aprovar(estorno.id, { observacao: observacao || undefined })
      }
      const resultados = await Promise.all(arquivosAprovacao.map(arq => uploadService.upload(arq)))
      const anexoUrls = resultados.map(r => r.url)
      return solicitacaoEstornoService.aprovar(estorno.id, { anexos: anexoUrls })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-estorno'] })
      onClose()
    },
  })

  const reprovarMutation = useMutation({
    mutationFn: () => solicitacaoEstornoService.reprovar(
      estorno.id,
      justificativa,
      modo === 'comercial' ? undefined : destinoReprovacao
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-estorno'] })
      onClose()
    },
  })

  const reenviarMutation = useMutation({
    mutationFn: async () => {
      const resultados = await Promise.all(novosArquivos.map(arq => uploadService.upload(arq)))
      const todosAnexos = [...formAnexos, ...resultados.map(r => r.url)]
      return solicitacaoEstornoService.reenviar(estorno.id, {
        franquia_id: formFranquiaId,
        motivo: formMotivo,
        vendedor: formVendedor,
        numero_pedido: formNumeroPedido.trim() || undefined,
        data_pedido: formDataPedido,
        nome_cliente: formNomeCliente,
        cpf: formCpf,
        data_pagamento: formDataPagamento,
        valor_pedido_portal: formValorPedidoPortal ? parseFloat(formValorPedidoPortal) : undefined,
        valor_total_pago: parseFloat(formValorTotalPago),
        valor_devolver: parseFloat(formValorDevolver),
        anexos: todosAnexos,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-estorno'] })
      onClose()
    },
  })

  const handleAprovar = async () => {
    setEnviando(true)
    try { await aprovarMutation.mutateAsync() } finally { setEnviando(false) }
  }

  const handleReprovar = async () => {
    if (!justificativa.trim()) return
    setEnviando(true)
    try { await reprovarMutation.mutateAsync() } finally { setEnviando(false) }
  }

  const handleReenviar = async () => {
    if (formCpf.replace(/\D/g, '').length !== 11 || !formDataPedido || !formDataPagamento) return
    setEnviando(true)
    try { await reenviarMutation.mutateAsync() } finally { setEnviando(false) }
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 transition-all"
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Estorno {estorno.numero_pedido || 'Sinal/Garantia'}
              {editando && <span className="text-sm font-normal text-brand-umber ml-2">— Editando</span>}
            </h3>
            <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[estorno.status] || 'bg-slate-100 text-slate-600'}`}>
              {statusLabels[estorno.status] || estorno.status}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {estorno.justificativa_reprovacao && (
            <div className="bg-brand-khaki/10 border border-brand-khaki/30 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-brand-umber mb-1">Motivo da Reprovacao</p>
              <p className="text-sm text-brand-umber">{estorno.justificativa_reprovacao}</p>
            </div>
          )}

          {editando ? (
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
                <textarea value={formMotivo} onChange={(e) => setFormMotivo(e.target.value)} className={inputClass + ' resize-none'} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Vendedor</label>
                  <input value={formVendedor} onChange={(e) => setFormVendedor(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>N. do Pedido</label>
                  <input value={formNumeroPedido} onChange={(e) => setFormNumeroPedido(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Data do Pedido</label>
                  <input type="date" value={formDataPedido} onChange={(e) => setFormDataPedido(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Data do Pagamento</label>
                  <input type="date" value={formDataPagamento} onChange={(e) => setFormDataPagamento(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Nome do Cliente</label>
                <input value={formNomeCliente} onChange={(e) => setFormNomeCliente(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>CPF</label>
                <input value={formCpf} onChange={(e) => setFormCpf(formatCpf(e.target.value))} className={inputClass} maxLength={14} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Valor Pedido Portal</label>
                  <input type="number" step="0.01" value={formValorPedidoPortal} onChange={(e) => setFormValorPedidoPortal(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Valor Total Pago</label>
                  <input type="number" step="0.01" value={formValorTotalPago} onChange={(e) => setFormValorTotalPago(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Valor a Devolver</label>
                  <input type="number" step="0.01" value={formValorDevolver} onChange={(e) => setFormValorDevolver(e.target.value)} className={inputClass} />
                </div>
              </div>

              {formAnexos.length > 0 && (
                <div>
                  <p className={labelClass}>Anexos atuais</p>
                  <div className="space-y-1">
                    {formAnexos.map((anexo, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                        <FileText size={14} className="text-slate-400" />
                        <span className="flex-1 text-sm text-slate-600 truncate">{anexo.split('/').pop()}</span>
                        <button type="button" onClick={() => setFormAnexos(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
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
            <>
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Franquia" valor={estorno.franquia_nome} />
                <Campo label="Vendedor" valor={estorno.vendedor} />
              </div>
              <Campo label="Motivo do pagamento a mais" valor={estorno.motivo} />

              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <Campo label="N. do Pedido" valor={estorno.numero_pedido || 'Sinal/Garantia (sem pedido)'} />
                  <Campo label="Data do Pedido" valor={estorno.data_pedido ? new Date(estorno.data_pedido + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} />
                  <Campo label="Data do Pagamento" valor={estorno.data_pagamento ? new Date(estorno.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-3">
                <Campo label="Cliente" valor={estorno.nome_cliente} />
                <Campo label="CPF" valor={estorno.cpf} />
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Valores</p>
                <div className="grid grid-cols-1 gap-2">
                  <Campo label="Valor do Pedido no Portal" valor={estorno.valor_pedido_portal != null ? `R$ ${Number(estorno.valor_pedido_portal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} />
                  <Campo label="Valor total pago" valor={`R$ ${Number(estorno.valor_total_pago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <Campo label="Valor a devolver" valor={`R$ ${Number(estorno.valor_devolver).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                </div>
              </div>

              {estorno.observacao_comercial && (
                <Campo label="Observação do Comercial" valor={estorno.observacao_comercial} />
              )}

              <AnexosGrid anexos={estorno.anexos} />

              {/* Histórico do Fluxo */}
              {(() => {
                const steps = [
                  { key: 'franquia', label: 'Franquia' },
                  { key: 'comercial', label: 'Comercial' },
                  { key: 'financeiro', label: 'Financeiro' },
                  { key: 'concluido', label: 'Estorno Realizado' },
                ]
                const currentKeyMap: Record<string, string> = {
                  aberto: 'franquia',
                  aguardando_comercial: 'comercial',
                  aguardando_financeiro: 'financeiro',
                  fechado: 'concluido',
                }
                const currentIdx = steps.findIndex(s => s.key === (currentKeyMap[estorno.status] ?? 'franquia'))
                return <FluxoStepper steps={steps} currentIndex={currentIdx} isFechado={estorno.status === 'fechado'} />
              })()}

              {podeAprovarReprovar && modo === 'comercial' && !mostrarReprovar && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Observação (opcional)</p>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Informação para o Financeiro (opcional)..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 transition-all resize-none"
                    rows={2}
                  />
                </div>
              )}

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
                      Justificativa (obrigatória) {modo === 'comercial' ? '— volta para a Franquia' : ''}
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
                disabled={enviando || formCpf.replace(/\D/g, '').length !== 11 || !formDataPedido || !formDataPagamento}
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
                    disabled={!justificativa.trim() || enviando}
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
