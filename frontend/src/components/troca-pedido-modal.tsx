'use client'

import { useState, useEffect } from 'react'
import { X, Check, XCircle, Upload, FileText, Image as ImageIcon, Pencil, Send, AlertTriangle } from 'lucide-react'
import { TrocaPedidoData, trocaPedidoService } from '@/services/troca-pedido'
import { uploadService } from '@/services/vinculo'
import { TrocaMotivoSelect } from '@/components/troca-motivo-select'
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
  fechado: 'Concluído',
}

const statusColors: Record<string, string> = {
  aberto: 'bg-blue-100 text-blue-700',
  aguardando_comercial: 'bg-orange-100 text-orange-700',
  aguardando_faturamento: 'bg-teal-100 text-teal-700',
  aguardando_financeiro: 'bg-amber-100 text-amber-700',
  aguardando_ti: 'bg-purple-100 text-purple-700',
  fechado: 'bg-green-100 text-green-700',
}

const STATUS_PORTAL_OPCOES = [
  { value: 'processando_pagamento', label: 'Processando pagamento' },
  { value: 'em_separacao', label: 'Em Separação' },
  { value: 'faturado', label: 'Faturado' },
]

const DESTINOS = [
  { value: 'faturamento', label: 'Faturamento' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'ti', label: 'TI' },
] as const

export function TrocaPedidoModal({ troca, onClose, modo }: TrocaPedidoModalProps) {
  const queryClient = useQueryClient()
  const [justificativa, setJustificativa] = useState('')
  const [mostrarReprovar, setMostrarReprovar] = useState(false)
  const [arquivosAprovacao, setArquivosAprovacao] = useState<File[]>([])
  const [enviando, setEnviando] = useState(false)
  const [destino, setDestino] = useState<'faturamento' | 'financeiro' | 'ti'>('faturamento')
  const [observacao, setObservacao] = useState('')

  // Estado de edicao
  const [editando, setEditando] = useState(false)
  const [formFranquiaId, setFormFranquiaId] = useState(troca.franquia_id)
  const [formMotivo, setFormMotivo] = useState(troca.motivo)
  const [formNomeVendedor, setFormNomeVendedor] = useState(troca.nome_vendedor)
  const [formNumeroPedidoCancelar, setFormNumeroPedidoCancelar] = useState(troca.numero_pedido_cancelar)
  const [formDataPedidoCancelar, setFormDataPedidoCancelar] = useState(troca.data_pedido_cancelar)
  const [formCodigoProdutoCancelar, setFormCodigoProdutoCancelar] = useState(troca.codigo_produto_cancelar)
  const [formDescricaoPedidoCancelar, setFormDescricaoPedidoCancelar] = useState(troca.descricao_pedido_cancelar)
  const [formNumeroNovoPedido, setFormNumeroNovoPedido] = useState(troca.numero_novo_pedido)
  const [formCodigoProdutoNovo, setFormCodigoProdutoNovo] = useState(troca.codigo_produto_novo)
  const [formDescricaoNovoPedido, setFormDescricaoNovoPedido] = useState(troca.descricao_novo_pedido)
  const [formStatusPortal, setFormStatusPortal] = useState(troca.status_portal)
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
        return trocaPedidoService.aprovar(troca.id, { destino, observacao: observacao || undefined })
      }
      const resultados = await Promise.all(arquivosAprovacao.map(arq => uploadService.upload(arq)))
      const anexoUrls = resultados.map(r => r.url)
      return trocaPedidoService.aprovar(troca.id, { anexos: anexoUrls })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trocas-pedido'] })
      onClose()
    },
  })

  const reprovarMutation = useMutation({
    mutationFn: () => trocaPedidoService.reprovar(troca.id, justificativa),
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
        nome_vendedor: formNomeVendedor,
        numero_pedido_cancelar: formNumeroPedidoCancelar,
        data_pedido_cancelar: formDataPedidoCancelar,
        codigo_produto_cancelar: formCodigoProdutoCancelar,
        descricao_pedido_cancelar: formDescricaoPedidoCancelar,
        numero_novo_pedido: formNumeroNovoPedido,
        codigo_produto_novo: formCodigoProdutoNovo,
        descricao_novo_pedido: formDescricaoNovoPedido,
        status_portal: formStatusPortal,
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
    if (!justificativa.trim()) return
    setEnviando(true)
    try { await reprovarMutation.mutateAsync() } finally { setEnviando(false) }
  }

  const handleReenviar = async () => {
    if (!formNomeVendedor.trim() || !formNumeroPedidoCancelar.trim() || !formDataPedidoCancelar || !formStatusPortal) return
    setEnviando(true)
    try { await reenviarMutation.mutateAsync() } finally { setEnviando(false) }
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
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
              {editando && <span className="text-sm font-normal text-amber-600 ml-2">— Editando</span>}
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
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-red-600 mb-1">Motivo da Reprovacao</p>
              <p className="text-sm text-red-700">{troca.justificativa_reprovacao}</p>
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
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-600 bg-green-50 rounded-lg px-3 py-2">
                        <span className="text-xs text-green-600 font-medium">NOVO</span>
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

              {/* Anexos */}
              {troca.anexos && troca.anexos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Anexos</p>
                  <div className="space-y-2">
                    {troca.anexos.map((anexo, i) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(anexo)
                      return (
                        <a key={i} href={anexo} target="_blank" rel="noopener noreferrer"
                          className="block border border-slate-200 rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                          {isImage ? (
                            <div className="relative">
                              <img src={anexo} alt={`Anexo ${i + 1}`} className="w-full max-h-48 object-contain bg-slate-50" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-full shadow transition-opacity">
                                  Abrir em nova aba
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors">
                              <FileText size={16} />
                              {anexo.split('/').pop()}
                            </div>
                          )}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Destino — só comercial */}
              {podeAprovarReprovar && modo === 'comercial' && !mostrarReprovar && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 space-y-3">
                  <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Enviar para</p>
                  <div className="flex gap-2">
                    {DESTINOS.map(d => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDestino(d.value)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                          destino === d.value
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'text-slate-600 border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Motivo ou informação (opcional)..."
                    className="w-full border border-amber-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all resize-none bg-white"
                    rows={2}
                  />
                </div>
              )}

              {/* Upload de anexos ao aprovar — faturamento/financeiro/ti */}
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
                          <ImageIcon size={14} className="text-green-500 shrink-0" />
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

              {/* Reprovar form — sempre volta pra franquia */}
              {podeAprovarReprovar && mostrarReprovar && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Justificativa (volta para a Franquia)</p>
                  <textarea
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    placeholder="Descreva o motivo da reprovacao..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 transition-all resize-none"
                    rows={3}
                  />
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
                disabled={enviando || !formNomeVendedor.trim() || !formNumeroPedidoCancelar.trim() || !formDataPedidoCancelar || !formStatusPortal}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-green-500 hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
              className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
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
