'use client'

import { useState, useEffect } from 'react'
import { X, Check, XCircle, Upload, FileText, Image as ImageIcon, Pencil, Send, AlertTriangle } from 'lucide-react'
import { VinculoData, vinculoService, uploadService } from '@/services/vinculo'
import { MotivoSelect } from '@/components/motivo-select'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface VinculoModalProps {
  vinculo: VinculoData
  onClose: () => void
  modo: 'financeiro' | 'ti' | 'comercial' | 'franquia' | 'visualizar'
}

const statusLabels: Record<string, string> = {
  aberto: 'Novo Pedido',
  validacao_comercial: 'Aguard. Comercial',
  validacao_financeiro: 'Aguard. Financeiro',
  tarefa_ti: 'Aguard. TI',
  fechado: 'Vinculado',
}

const statusColors: Record<string, string> = {
  aberto: 'bg-blue-100 text-blue-700',
  validacao_comercial: 'bg-orange-100 text-orange-700',
  validacao_financeiro: 'bg-amber-100 text-amber-700',
  tarefa_ti: 'bg-purple-100 text-purple-700',
  fechado: 'bg-green-100 text-green-700',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export function VinculoModal({ vinculo, onClose, modo }: VinculoModalProps) {
  const queryClient = useQueryClient()
  const [justificativa, setJustificativa] = useState('')
  const [mostrarReprovar, setMostrarReprovar] = useState(false)
  const [arquivosAprovacao, setArquivosAprovacao] = useState<File[]>([])
  const [enviando, setEnviando] = useState(false)
  const [destinoReprovacao, setDestinoReprovacao] = useState('franquia')
  const [necessarioFinanceiro, setNecessarioFinanceiro] = useState(vinculo.necessario_validacao)

  // Estado de edicao
  const [editando, setEditando] = useState(false)
  const [formFranquiaId, setFormFranquiaId] = useState(vinculo.franquia_id)
  const [formCliente, setFormCliente] = useState(vinculo.nome_cliente)
  const [formCpf, setFormCpf] = useState(vinculo.cpf || '')
  const [formValor, setFormValor] = useState(String(vinculo.valor_pedido))
  const [formData, setFormData] = useState(vinculo.data_pedido)
  const [formMotivo, setFormMotivo] = useState(vinculo.motivo || '')
  const [formValidacao, setFormValidacao] = useState(vinculo.necessario_validacao)
  const [formAnexos, setFormAnexos] = useState<string[]>(vinculo.anexos || [])
  const [novosArquivos, setNovosArquivos] = useState<File[]>([])
  const [formQuantidadeCupons, setFormQuantidadeCupons] = useState<number>(vinculo.quantidade_cupons ?? 0)
  const [formValoresCupons, setFormValoresCupons] = useState<string[]>(
    vinculo.cupons?.map(c => String(c.valor)) ?? []
  )

  useEffect(() => {
    setFormValoresCupons(prev => {
      const arr = [...prev]
      arr.length = formQuantidadeCupons
      for (let i = 0; i < formQuantidadeCupons; i++) {
        if (!arr[i]) arr[i] = ''
      }
      return arr
    })
  }, [formQuantidadeCupons])

  const somaCupons = formValoresCupons.reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
  const valorTotalForm = parseFloat(formValor) || 0
  const cuponsValidos = formQuantidadeCupons === 0 || Math.abs(somaCupons - valorTotalForm) < 0.01

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
    vinculo.status === 'aberto' &&
    !!vinculo.justificativa_reprovacao

  const podeAprovarReprovar =
    (modo === 'comercial' && vinculo.status === 'validacao_comercial') ||
    (modo === 'financeiro' && vinculo.status === 'validacao_financeiro') ||
    (modo === 'ti' && vinculo.status === 'tarefa_ti')

  const aprovarMutation = useMutation({
    mutationFn: async () => {
      const resultados = await Promise.all(arquivosAprovacao.map(arq => uploadService.upload(arq)))
      const anexoUrls = resultados.map(r => r.url)
      if (modo === 'comercial') {
        return vinculoService.aprovar(vinculo.id, [], necessarioFinanceiro)
      }
      return vinculoService.aprovar(vinculo.id, anexoUrls)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vinculos'] })
      onClose()
    },
  })

  const reprovarMutation = useMutation({
    mutationFn: () => vinculoService.reprovar(vinculo.id, justificativa, destinoReprovacao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vinculos'] })
      onClose()
    },
  })

  const reenviarMutation = useMutation({
    mutationFn: async () => {
      const resultados = await Promise.all(novosArquivos.map(arq => uploadService.upload(arq)))
      const todosAnexos = [...formAnexos, ...resultados.map(r => r.url)]
      return vinculoService.reenviar(vinculo.id, {
        franquia_id: formFranquiaId,
        nome_cliente: formCliente,
        cpf: formCpf || undefined,
        valor_pedido: Number(formValor),
        data_pedido: formData,
        motivo: formMotivo || undefined,
        necessario_validacao: formValidacao,
        quantidade_cupons: formQuantidadeCupons > 0 ? formQuantidadeCupons : undefined,
        cupons: formQuantidadeCupons > 0
          ? formValoresCupons.map(v => ({ valor: parseFloat(v) }))
          : undefined,
        anexos: todosAnexos,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vinculos'] })
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
    if (!formCliente.trim() || !formValor || !formData || !cuponsValidos) return
    setEnviando(true)
    try { await reenviarMutation.mutateAsync() } finally { setEnviando(false) }
  }

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
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
              Pedido {vinculo.numero_pedido}
              {editando && <span className="text-sm font-normal text-amber-600 ml-2">— Editando</span>}
            </h3>
            <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[vinculo.status] || 'bg-slate-100 text-slate-600'}`}>
              {statusLabels[vinculo.status] || vinculo.status}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Justificativa de reprovacao */}
          {vinculo.justificativa_reprovacao && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-red-600 mb-1">Motivo da Reprovacao</p>
              <p className="text-sm text-red-700">{vinculo.justificativa_reprovacao}</p>
            </div>
          )}

          {editando ? (
            /* ===== MODO EDICAO ===== */
            <div className="space-y-4">
              {/* Franquia — só mostra select para comercial */}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nome do Cliente</label>
                  <input
                    value={formCliente}
                    onChange={(e) => setFormCliente(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>CPF</label>
                  <input
                    value={formCpf}
                    onChange={(e) => setFormCpf(formatCpf(e.target.value))}
                    className={inputClass}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Motivo</label>
                <MotivoSelect value={formMotivo} onChange={setFormMotivo} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formValor}
                    onChange={(e) => setFormValor(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Data do Pedido</label>
                  <input
                    type="date"
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Cupons */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                <div>
                  <label className={labelClass}>Quantos comprovantes de pagamento serão anexados?</label>
                  <select
                    value={formQuantidadeCupons}
                    onChange={(e) => setFormQuantidadeCupons(Number(e.target.value))}
                    className={inputClass + ' bg-white'}
                  >
                    <option value={0}>Nenhum comprovante de pagamento</option>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n} comprovante{n > 1 ? 's' : ''} de pagamento</option>
                    ))}
                  </select>
                </div>
                {formQuantidadeCupons > 0 && (
                  <div className="space-y-2">
                    {formValoresCupons.map((v, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-20 shrink-0">{i + 1}º comprovante:</span>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={v}
                            onChange={e => {
                              const next = [...formValoresCupons]
                              next[i] = e.target.value
                              setFormValoresCupons(next)
                            }}
                            className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                    ))}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                      !valorTotalForm ? 'bg-slate-100 text-slate-500' :
                      cuponsValidos ? 'bg-green-50 text-green-700 border border-green-200' :
                      'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      <span>Soma dos comprovantes:</span>
                      <span>R$ {somaCupons.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {valorTotalForm > 0 && !cuponsValidos && (
                      <div className="flex items-center gap-2 text-xs text-red-600">
                        <AlertTriangle size={13} />
                        A soma deve ser igual ao valor do pedido (R$ {valorTotalForm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Validacao — só para comercial */}
              {modo !== 'franquia' && (
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                  <input
                    type="checkbox"
                    id="edit-validacao"
                    checked={formValidacao}
                    onChange={(e) => setFormValidacao(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-300"
                  />
                  <label htmlFor="edit-validacao" className="text-sm text-slate-700">
                    Necessario validacao do Financeiro
                  </label>
                </div>
              )}

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
                <Campo label="Franquia" valor={vinculo.franquia_nome} />
                <Campo label="Cliente" valor={vinculo.nome_cliente} />
                <Campo label="CPF" valor={vinculo.cpf || '—'} />
                <Campo label="Valor" valor={`R$ ${Number(vinculo.valor_pedido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                <Campo label="Data do Pedido" valor={vinculo.data_pedido ? new Date(vinculo.data_pedido + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} />
                {vinculo.motivo && <Campo label="Motivo" valor={vinculo.motivo} />}
                <Campo label="Valid. Financeiro" valor={vinculo.necessario_validacao ? 'Sim' : 'Nao'} />
              </div>

              {/* Cupons */}
              {vinculo.quantidade_cupons && vinculo.quantidade_cupons > 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Comprovantes de pagamento ({vinculo.quantidade_cupons})
                  </p>
                  <div className="space-y-1">
                    {vinculo.cupons?.map((c, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-500">{i + 1}º comprovante</span>
                        <span className="text-slate-700 font-medium">
                          R$ {Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold text-slate-800 border-t border-slate-200 pt-1 mt-1">
                      <span>Total</span>
                      <span>R$ {Number(vinculo.valor_pedido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Anexos */}
              {vinculo.anexos && vinculo.anexos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Anexos</p>
                  <div className="space-y-2">
                    {vinculo.anexos.map((anexo, i) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(anexo)
                      const url = `${API_URL}${anexo}`
                      return (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="block border border-slate-200 rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                          {isImage ? (
                            <div className="relative">
                              <img src={url} alt={`Anexo ${i + 1}`} className="w-full max-h-48 object-contain bg-slate-50" />
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

              {/* Toggle necessario_financeiro — só para comercial */}
              {podeAprovarReprovar && modo === 'comercial' && !mostrarReprovar && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="necessario-financeiro"
                      checked={necessarioFinanceiro}
                      onChange={(e) => setNecessarioFinanceiro(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-300"
                    />
                    <label htmlFor="necessario-financeiro" className="text-sm text-amber-800 font-medium">
                      Enviar para validação do Financeiro antes do TI
                    </label>
                  </div>
                  <p className="text-xs text-amber-600 mt-1 ml-7">
                    {necessarioFinanceiro ? 'Irá para Financeiro → TI' : 'Irá direto para TI'}
                  </p>
                </div>
              )}

              {/* Upload de anexos ao aprovar — só financeiro */}
              {podeAprovarReprovar && modo === 'financeiro' && !mostrarReprovar && (
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

              {/* Reprovar form */}
              {podeAprovarReprovar && mostrarReprovar && (
                <div className="space-y-3">
                  {/* Destino — financeiro pode escolher Comercial | Franquia */}
                  {modo === 'financeiro' && (
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
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {d === 'comercial' ? 'Comercial' : 'Franquia'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Destino — TI pode escolher Comercial | Franquia | Financeiro */}
                  {modo === 'ti' && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Enviar para</p>
                      <div className="flex gap-2">
                        {(['comercial', 'financeiro', 'franquia'] as const).map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDestinoReprovacao(d)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                              destinoReprovacao === d
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {d === 'comercial' ? 'Comercial' : d === 'financeiro' ? 'Financeiro' : 'Franquia'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Justificativa</p>
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
                disabled={enviando || !formCliente.trim() || !formValor || !formData || !cuponsValidos}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={16} />
                {enviando ? 'Reenviando...' : 'Reenviar Pedido'}
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
