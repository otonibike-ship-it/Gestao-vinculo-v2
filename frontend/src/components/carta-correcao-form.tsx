'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Upload, X, AlertTriangle } from 'lucide-react'
import { cartaCorrecaoService } from '@/services/carta-correcao'
import { uploadService } from '@/services/vinculo'
import { authService } from '@/services/auth'
import { CampoCorrecaoSelect, MotivoDivergenciaSelect } from '@/components/carta-correcao-selects'
import api from '@/lib/api'

interface Props {
  voltarPara: string
}

export default function CartaCorrecaoForm({ voltarPara }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [perfil, setPerfil] = useState<string>('comercial')
  const [franquiaIdUsuario, setFranquiaIdUsuario] = useState<number | null>(null)

  const [franquiaId, setFranquiaId] = useState<number>(0)
  const [numeroNotaFiscal, setNumeroNotaFiscal] = useState('')
  const [numeroPedido, setNumeroPedido] = useState('')
  const [nomeClientePedido, setNomeClientePedido] = useState('')
  const [campoCorrecao, setCampoCorrecao] = useState('')
  const [motivoDivergencia, setMotivoDivergencia] = useState('')
  const [infoNumeroSerieTicket, setInfoNumeroSerieTicket] = useState('')
  const [nomeCorretoCliente, setNomeCorretoCliente] = useState('')
  const [sobrenomeCorretoCliente, setSobrenomeCorretoCliente] = useState('')
  const [complementoDadosAdicionais, setComplementoDadosAdicionais] = useState('')
  const [arquivos, setArquivos] = useState<File[]>([])

  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const p = authService.getPerfil()
    const id = authService.getFranquiaId()
    setPerfil(p)
    setFranquiaIdUsuario(id)
    if (id) setFranquiaId(id)
  }, [])

  const { data: empresas } = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const res = await api.get('/empresas')
      return res.data as { id: number; razao_social: string; nome_fantasia: string | null }[]
    },
    enabled: true,
  })

  const camposObrigatoriosPreenchidos =
    !!franquiaId &&
    !!numeroNotaFiscal.trim() &&
    !!numeroPedido.trim() &&
    !!nomeClientePedido.trim() &&
    !!campoCorrecao &&
    !!motivoDivergencia

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!franquiaId) { setErro('Selecione a franquia'); return }
    if (!numeroNotaFiscal.trim()) { setErro('Número da nota fiscal é obrigatório'); return }
    if (!numeroPedido.trim()) { setErro('Número do pedido é obrigatório'); return }
    if (!nomeClientePedido.trim()) { setErro('Nome do cliente é obrigatório'); return }
    if (!campoCorrecao) { setErro('Selecione qual campo precisa da correção'); return }
    if (!motivoDivergencia) { setErro('Selecione o motivo da divergência'); return }

    setEnviando(true)
    try {
      const resultados = await Promise.all(arquivos.map(arq => uploadService.upload(arq)))
      const anexoUrls = resultados.map(r => r.url)

      await cartaCorrecaoService.criar({
        franquia_id: franquiaId,
        numero_nota_fiscal: numeroNotaFiscal.trim(),
        numero_pedido: numeroPedido.trim(),
        nome_cliente_pedido: nomeClientePedido.trim(),
        campo_correcao: campoCorrecao,
        motivo_divergencia: motivoDivergencia,
        info_numero_serie_ticket: infoNumeroSerieTicket.trim() || undefined,
        nome_correto_cliente: nomeCorretoCliente.trim() || undefined,
        sobrenome_correto_cliente: sobrenomeCorretoCliente.trim() || undefined,
        complemento_dados_adicionais: complementoDadosAdicionais.trim() || undefined,
        anexos: anexoUrls,
      })

      queryClient.invalidateQueries({ queryKey: ['cartas-correcao'] })
      router.push(voltarPara)
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      const status = e?.response?.status
      if (status === 422) {
        setErro('Dados inválidos. Verifique os campos e tente novamente.')
      } else if (status === 504 || status === 502) {
        setErro('Servidor sem resposta (504). Tente novamente em alguns instantes.')
      } else if (!status) {
        setErro('Erro de conexão. Verifique sua internet e tente novamente.')
      } else {
        setErro(detail || `Erro ${status} ao criar carta de correção`)
      }
    } finally {
      setEnviando(false)
    }
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 transition-all"
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2"

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={() => router.push(voltarPara)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">Carta de Correção</h3>
          <p className="text-xs text-slate-400 mt-1">Preencha os dados da solicitação</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {perfil !== 'franquia' ? (
            <div>
              <label className={labelClass}>Franquia</label>
              <select
                value={franquiaId}
                onChange={e => setFranquiaId(Number(e.target.value))}
                className={inputClass + ' bg-white'}
              >
                <option value={0}>Selecione...</option>
                {empresas?.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nome_fantasia || e.razao_social}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className={labelClass}>Franquia</label>
              <p className="px-4 py-3 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
                {empresas?.find(e => e.id === franquiaIdUsuario)?.nome_fantasia ?? 'Sua franquia'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Número da Nota Fiscal</label>
              <input value={numeroNotaFiscal} onChange={e => setNumeroNotaFiscal(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Número do Pedido</label>
              <input value={numeroPedido} onChange={e => setNumeroPedido(e.target.value)} className={inputClass} placeholder="PED-001" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Nome completo do cliente (exatamente como consta no pedido)</label>
            <input value={nomeClientePedido} onChange={e => setNomeClientePedido(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Selecione qual o campo precisa da correção</label>
            <CampoCorrecaoSelect value={campoCorrecao} onChange={setCampoCorrecao} />
          </div>

          <div>
            <label className={labelClass}>Motivo da divergência</label>
            <MotivoDivergenciaSelect value={motivoDivergencia} onChange={setMotivoDivergencia} />
          </div>

          <div>
            <label className={labelClass}>
              Informe abaixo o número de série correto e, em caso de garantia, o ticket da S2 Tech Center
            </label>
            <p className="text-[11px] text-slate-400 mb-1.5">Ex.: Nº de série XXXXXXXXXX – Ticket: XXXXX (preencha se aplicável)</p>
            <textarea
              value={infoNumeroSerieTicket}
              onChange={e => setInfoNumeroSerieTicket(e.target.value)}
              className={inputClass + ' resize-none'}
              rows={2}
            />
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Preencha conforme o campo selecionado acima (opcional)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome correto do cliente</label>
                <input value={nomeCorretoCliente} onChange={e => setNomeCorretoCliente(e.target.value)} className={inputClass + ' bg-white'} />
              </div>
              <div>
                <label className={labelClass}>Sobrenome correto do cliente</label>
                <input value={sobrenomeCorretoCliente} onChange={e => setSobrenomeCorretoCliente(e.target.value)} className={inputClass + ' bg-white'} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Complemento para Dados Adicionais da NF</label>
              <input value={complementoDadosAdicionais} onChange={e => setComplementoDadosAdicionais(e.target.value)} className={inputClass + ' bg-white'} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Anexos <span className="text-slate-400 normal-case font-normal">(opcional)</span></label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                arquivos.length === 0 ? 'border-slate-300 hover:border-slate-400' : 'border-brand-olive/50 hover:border-brand-olive'
              }`}
            >
              <Upload size={16} className={arquivos.length === 0 ? 'text-slate-400' : 'text-brand-pine'} />
              <span className={`text-sm ${arquivos.length === 0 ? 'text-slate-400' : 'text-brand-pine font-medium'}`}>
                {arquivos.length === 0
                  ? 'Selecionar arquivos...'
                  : `${arquivos.length} arquivo${arquivos.length > 1 ? 's' : ''} selecionado${arquivos.length > 1 ? 's' : ''} — clique para adicionar mais`}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files
                if (files && files.length > 0) {
                  const lista = Array.from(files)
                  setArquivos(prev => [...prev, ...lista])
                }
                e.target.value = ''
              }}
            />
            {arquivos.length > 0 && (
              <div className="mt-2 space-y-1">
                {arquivos.map((arq, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-600 bg-brand-olive/10 border border-brand-olive/20 rounded-lg px-3 py-2">
                    <Upload size={13} className="text-brand-pine shrink-0" />
                    <span className="flex-1 truncate">{arq.name}</span>
                    <span className="text-xs text-slate-400 shrink-0">{(arq.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => setArquivos(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} />
              {erro}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push(voltarPara)}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || !camposObrigatoriosPreenchidos}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-medium text-white bg-brand-pine hover:bg-brand-forest transition-colors disabled:opacity-50"
            >
              {enviando ? 'Enviando...' : 'Criar Solicitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
