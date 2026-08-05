'use client'

import { useState } from 'react'
import { X, Check, XCircle, Upload, FileText, Image as ImageIcon, Pencil, Send, AlertTriangle } from 'lucide-react'
import { CartaCorrecaoData, cartaCorrecaoService } from '@/services/carta-correcao'
import { uploadService } from '@/services/vinculo'
import { CampoCorrecaoSelect, MotivoDivergenciaSelect, CAMPO_CORRECAO_OPCOES } from '@/components/carta-correcao-selects'
import { AnexosGrid } from '@/components/anexos-grid'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface CartaCorrecaoModalProps {
  carta: CartaCorrecaoData
  onClose: () => void
  modo: 'comercial' | 'faturamento' | 'financeiro' | 'ti' | 'franquia' | 'visualizar'
}

const statusLabels: Record<string, string> = {
  aberto: 'Novo Pedido',
  aguardando_comercial: 'Aguard. Comercial',
  aguardando_faturamento: 'Aguard. Faturamento',
  aguardando_financeiro: 'Aguard. Financeiro',
  aguardando_ti: 'Aguard. TI',
  fechado: 'Carta Gerada',
}

const statusColors: Record<string, string> = {
  aberto: 'bg-brand-khaki/20 text-brand-umber',
  aguardando_comercial: 'bg-brand-olive/20 text-brand-forest',
  aguardando_faturamento: 'bg-brand-teal/25 text-brand-pine',
  aguardando_financeiro: 'bg-brand-pine/15 text-brand-pine',
  aguardando_ti: 'bg-brand-forest/10 text-brand-forest',
  fechado: 'bg-brand-lime/25 text-brand-forest',
}

export function CartaCorrecaoModal({ carta, onClose, modo }: CartaCorrecaoModalProps) {
  const queryClient = useQueryClient()
  const [justificativa, setJustificativa] = useState('')
  const [mostrarReprovar, setMostrarReprovar] = useState(false)
  const [arquivosAprovacao, setArquivosAprovacao] = useState<File[]>([])
  const [enviando, setEnviando] = useState(false)
  const [observacao, setObservacao] = useState('')

  const [editando, setEditando] = useState(false)
  const [formFranquiaId, setFormFranquiaId] = useState(carta.franquia_id)
  const [formNumeroNotaFiscal, setFormNumeroNotaFiscal] = useState(carta.numero_nota_fiscal)
  const [formNumeroPedido, setFormNumeroPedido] = useState(carta.numero_pedido)
  const [formNomeClientePedido, setFormNomeClientePedido] = useState(carta.nome_cliente_pedido)
  const [formCampoCorrecao, setFormCampoCorrecao] = useState(carta.campo_correcao)
  const [formMotivoDivergencia, setFormMotivoDivergencia] = useState(carta.motivo_divergencia)
  const [formInfoNumeroSerie, setFormInfoNumeroSerie] = useState(carta.info_numero_serie_ticket || '')
  const [formNomeCorreto, setFormNomeCorreto] = useState(carta.nome_correto_cliente || '')
  const [formSobrenomeCorreto, setFormSobrenomeCorreto] = useState(carta.sobrenome_correto_cliente || '')
  const [formComplemento, setFormComplemento] = useState(carta.complemento_dados_adicionais || '')
  const [formAnexos, setFormAnexos] = useState<string[]>(carta.anexos || [])
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
    carta.status === 'aberto' &&
    !!carta.justificativa_reprovacao

  const podeAprovarReprovar =
    (modo === 'comercial' && carta.status === 'aguardando_comercial') ||
    (modo === 'faturamento' && carta.status === 'aguardando_faturamento') ||
    (modo === 'financeiro' && carta.status === 'aguardando_financeiro') ||
    (modo === 'ti' && carta.status === 'aguardando_ti')

  const aprovarMutation = useMutation({
    mutationFn: async () => {
      if (modo === 'comercial') {
        return cartaCorrecaoService.aprovar(carta.id, { observacao: observacao || undefined })
      }
      const resultados = await Promise.all(arquivosAprovacao.map(arq => uploadService.upload(arq)))
      const anexoUrls = resultados.map(r => r.url)
      return cartaCorrecaoService.aprovar(carta.id, { anexos: anexoUrls })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartas-correcao'] })
      onClose()
    },
  })

  const reprovarMutation = useMutation({
    mutationFn: () => cartaCorrecaoService.reprovar(carta.id, justificativa),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartas-correcao'] })
      onClose()
    },
  })

  const reenviarMutation = useMutation({
    mutationFn: async () => {
      const resultados = await Promise.all(novosArquivos.map(arq => uploadService.upload(arq)))
      const todosAnexos = [...formAnexos, ...resultados.map(r => r.url)]
      return cartaCorrecaoService.reenviar(carta.id, {
        franquia_id: formFranquiaId,
        numero_nota_fiscal: formNumeroNotaFiscal,
        numero_pedido: formNumeroPedido,
        nome_cliente_pedido: formNomeClientePedido,
        campo_correcao: formCampoCorrecao,
        motivo_divergencia: formMotivoDivergencia,
        info_numero_serie_ticket: formInfoNumeroSerie || undefined,
        nome_correto_cliente: formNomeCorreto || undefined,
        sobrenome_correto_cliente: formSobrenomeCorreto || undefined,
        complemento_dados_adicionais: formComplemento || undefined,
        anexos: todosAnexos,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartas-correcao'] })
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
    if (!formNumeroPedido.trim() || !formNumeroNotaFiscal.trim() || !formCampoCorrecao || !formMotivoDivergencia) return
    setEnviando(true)
    try { await reenviarMutation.mutateAsync() } finally { setEnviando(false) }
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 transition-all"
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2"
  const campoCorrecaoLabel = CAMPO_CORRECAO_OPCOES.find(o => o.value === carta.campo_correcao)?.label || carta.campo_correcao

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Carta {carta.numero_pedido}
              {editando && <span className="text-sm font-normal text-brand-umber ml-2">— Editando</span>}
            </h3>
            <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[carta.status] || 'bg-slate-100 text-slate-600'}`}>
              {statusLabels[carta.status] || carta.status}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {carta.justificativa_reprovacao && (
            <div className="bg-brand-khaki/10 border border-brand-khaki/30 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-brand-umber mb-1">Motivo da Reprovacao</p>
              <p className="text-sm text-brand-umber">{carta.justificativa_reprovacao}</p>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>N. Nota Fiscal</label>
                  <input value={formNumeroNotaFiscal} onChange={(e) => setFormNumeroNotaFiscal(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>N. do Pedido</label>
                  <input value={formNumeroPedido} onChange={(e) => setFormNumeroPedido(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Nome do Cliente no Pedido</label>
                <input value={formNomeClientePedido} onChange={(e) => setFormNomeClientePedido(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Campo que precisa da correção</label>
                <CampoCorrecaoSelect value={formCampoCorrecao} onChange={setFormCampoCorrecao} />
              </div>
              <div>
                <label className={labelClass}>Motivo da divergência</label>
                <MotivoDivergenciaSelect value={formMotivoDivergencia} onChange={setFormMotivoDivergencia} />
              </div>
              <div>
                <label className={labelClass}>Número de série / ticket</label>
                <textarea value={formInfoNumeroSerie} onChange={(e) => setFormInfoNumeroSerie(e.target.value)} className={inputClass + ' resize-none'} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nome correto</label>
                  <input value={formNomeCorreto} onChange={(e) => setFormNomeCorreto(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Sobrenome correto</label>
                  <input value={formSobrenomeCorreto} onChange={(e) => setFormSobrenomeCorreto(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Complemento Dados Adicionais</label>
                <input value={formComplemento} onChange={(e) => setFormComplemento(e.target.value)} className={inputClass} />
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
                <Campo label="Franquia" valor={carta.franquia_nome} />
                <Campo label="N. Nota Fiscal" valor={carta.numero_nota_fiscal} />
                <Campo label="N. do Pedido" valor={carta.numero_pedido} />
                <Campo label="Cliente no Pedido" valor={carta.nome_cliente_pedido} />
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-3">
                <Campo label="Campo com correção" valor={campoCorrecaoLabel} />
                <Campo label="Motivo da divergência" valor={carta.motivo_divergencia} />
                {carta.info_numero_serie_ticket && <Campo label="Número de série / ticket" valor={carta.info_numero_serie_ticket} />}
              </div>

              {(carta.nome_correto_cliente || carta.sobrenome_correto_cliente || carta.complemento_dados_adicionais) && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-3">
                  {carta.nome_correto_cliente && <Campo label="Nome correto do cliente" valor={carta.nome_correto_cliente} />}
                  {carta.sobrenome_correto_cliente && <Campo label="Sobrenome correto do cliente" valor={carta.sobrenome_correto_cliente} />}
                  {carta.complemento_dados_adicionais && <Campo label="Complemento Dados Adicionais" valor={carta.complemento_dados_adicionais} />}
                </div>
              )}

              {carta.observacao_comercial && (
                <Campo label="Observação do Comercial" valor={carta.observacao_comercial} />
              )}

              <AnexosGrid anexos={carta.anexos} />

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
                disabled={enviando || !formNumeroPedido.trim() || !formNumeroNotaFiscal.trim() || !formCampoCorrecao || !formMotivoDivergencia}
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
