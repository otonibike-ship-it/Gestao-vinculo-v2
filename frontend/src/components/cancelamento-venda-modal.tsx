'use client'

import { useState } from 'react'
import { X, Check, XCircle, Upload, Image as ImageIcon, Pencil, Send, AlertTriangle } from 'lucide-react'
import { CancelamentoVendaData, cancelamentoVendaService } from '@/services/cancelamento-venda'
import { uploadService } from '@/services/vinculo'
import { AnexosGrid } from '@/components/anexos-grid'
import { FluxoStepper } from '@/components/fluxo-stepper'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface CancelamentoVendaModalProps {
  cancelamento: CancelamentoVendaData
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

const STATUS_PORTAL_LABELS: Record<string, string> = {
  processando_pagamento: 'Processando Pagamento',
  em_separacao: 'Em Separação',
  faturado: 'Pedido Faturado',
}

const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  debito: 'Débito',
  credito: 'Crédito',
  pix: 'Pix',
  deposito: 'Depósito',
}

export function CancelamentoVendaModal({ cancelamento, onClose, modo }: CancelamentoVendaModalProps) {
  const queryClient = useQueryClient()
  const [justificativa, setJustificativa] = useState('')
  const [mostrarReprovar, setMostrarReprovar] = useState(false)
  const [arquivosAprovacao, setArquivosAprovacao] = useState<File[]>([])
  const [enviando, setEnviando] = useState(false)
  const [destinoReprovacao, setDestinoReprovacao] = useState<'comercial' | 'franquia'>('comercial')
  const [observacao, setObservacao] = useState('')

  const podeEditar =
    (modo === 'comercial' || modo === 'franquia') &&
    cancelamento.status === 'aberto' &&
    !!cancelamento.justificativa_reprovacao

  const podeAprovarReprovar =
    (modo === 'comercial' && cancelamento.status === 'aguardando_comercial') ||
    (modo === 'faturamento' && cancelamento.status === 'aguardando_faturamento') ||
    (modo === 'financeiro' && cancelamento.status === 'aguardando_financeiro') ||
    (modo === 'ti' && cancelamento.status === 'aguardando_ti')

  const aprovarMutation = useMutation({
    mutationFn: async () => {
      if (modo === 'comercial') {
        return cancelamentoVendaService.aprovar(cancelamento.id, { observacao: observacao || undefined })
      }
      const resultados = await Promise.all(arquivosAprovacao.map(arq => uploadService.upload(arq)))
      const anexoUrls = resultados.map(r => r.url)
      return cancelamentoVendaService.aprovar(cancelamento.id, { anexos: anexoUrls })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cancelamentos-venda'] })
      onClose()
    },
  })

  const reprovarMutation = useMutation({
    mutationFn: () => cancelamentoVendaService.reprovar(
      cancelamento.id,
      justificativa,
      modo === 'comercial' ? undefined : destinoReprovacao
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cancelamentos-venda'] })
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Cancelamento {cancelamento.numero_pedido_cancelar}
            </h3>
            <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[cancelamento.status] || 'bg-slate-100 text-slate-600'}`}>
              {statusLabels[cancelamento.status] || cancelamento.status}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {cancelamento.justificativa_reprovacao && (
            <div className="bg-brand-khaki/10 border border-brand-khaki/30 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-brand-umber mb-1">Motivo da Reprovacao</p>
              <p className="text-sm text-brand-umber">{cancelamento.justificativa_reprovacao}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Franquia" valor={cancelamento.franquia_nome} />
            <Campo label="Vendedor" valor={cancelamento.vendedor} />
          </div>
          <Campo label="Motivo do cancelamento" valor={cancelamento.motivo} />

          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pedido a cancelar</p>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="N. do Pedido" valor={cancelamento.numero_pedido_cancelar} />
              <Campo label="Data" valor={cancelamento.data_pedido_cancelar ? new Date(cancelamento.data_pedido_cancelar + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} />
              <Campo label="Status no Portal" valor={STATUS_PORTAL_LABELS[cancelamento.status_portal] || cancelamento.status_portal} />
              <Campo label="N. Nota Fiscal" valor={cancelamento.numero_nota_fiscal} />
              <Campo label="Emissão da NF" valor={cancelamento.data_emissao_nota_fiscal ? new Date(cancelamento.data_emissao_nota_fiscal + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bike</p>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Está na loja?" valor={cancelamento.bike_na_loja ? 'Sim' : 'Não'} />
              <Campo label="Sinais de uso?" valor={cancelamento.sinais_uso ? 'Sim' : 'Não'} />
              <Campo label="Código Produto" valor={cancelamento.codigo_produto} />
            </div>
            <Campo label="Modelo/Cor/Tamanho" valor={cancelamento.descricao_modelo} />
          </div>
          <AnexosGrid titulo="Evidências de sinais de uso" anexos={cancelamento.anexos_evidencias_uso} />

          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente e pagamento</p>
            <Campo label="Cliente" valor={cancelamento.nome_cliente} />
            <Campo label="CPF" valor={cancelamento.cpf} />
            <div className="grid grid-cols-1 gap-2">
              <Campo label="Valor Total Pago" valor={`R$ ${Number(cancelamento.valor_total_pago_cliente).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
              <Campo label="Valor Total do Pedido" valor={`R$ ${Number(cancelamento.valor_total_pedido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
              <Campo label="Valor a Cancelar" valor={`R$ ${Number(cancelamento.valor_cancelar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Forma de Pagamento" valor={FORMA_PAGAMENTO_LABELS[cancelamento.forma_pagamento] || cancelamento.forma_pagamento} />
              <Campo label="Pago em +1 cartão?" valor={cancelamento.pago_mais_um_cartao ? 'Sim' : 'Não'} />
            </div>
          </div>
          <AnexosGrid titulo="Imagens do Portal e Comprovante" anexos={cancelamento.anexos_portal_comprovante} />

          {/* Histórico do Fluxo */}
          {(() => {
            const steps = [
              { key: 'franquia', label: 'Franquia' },
              { key: 'comercial', label: 'Comercial' },
              { key: 'faturamento', label: 'Faturamento' },
              { key: 'financeiro', label: 'Financeiro' },
              { key: 'concluido', label: 'Estorno Realizado' },
            ]
            const currentKeyMap: Record<string, string> = {
              aberto: 'franquia',
              aguardando_comercial: 'comercial',
              aguardando_faturamento: 'faturamento',
              aguardando_financeiro: 'financeiro',
              fechado: 'concluido',
            }
            const currentIdx = steps.findIndex(s => s.key === (currentKeyMap[cancelamento.status] ?? 'franquia'))
            return <FluxoStepper steps={steps} currentIndex={currentIdx} isFechado={cancelamento.status === 'fechado'} />
          })()}

          {cancelamento.observacao_comercial && (
            <Campo label="Observação do Comercial" valor={cancelamento.observacao_comercial} />
          )}

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

          {podeEditar && (
            <div className="bg-brand-khaki/10 border border-brand-khaki/30 rounded-xl px-4 py-3">
              <p className="text-sm text-brand-umber">
                Esta solicitação foi reprovada. Crie uma nova solicitação de Cancelamento de Venda com os dados corrigidos.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100">
          {podeAprovarReprovar ? (
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
