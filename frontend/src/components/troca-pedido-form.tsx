'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Upload, X, AlertTriangle } from 'lucide-react'
import { trocaPedidoService } from '@/services/troca-pedido'
import { uploadService } from '@/services/vinculo'
import { authService } from '@/services/auth'
import { TrocaMotivoSelect } from '@/components/troca-motivo-select'
import api from '@/lib/api'

interface Props {
  voltarPara: string
}

const STATUS_PORTAL_OPCOES = [
  { value: 'processando_pagamento', label: 'Processando pagamento' },
  { value: 'em_separacao', label: 'Em Separação' },
  { value: 'faturado', label: 'Faturado' },
]

export default function TrocaPedidoForm({ voltarPara }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [perfil, setPerfil] = useState<string>('comercial')
  const [franquiaIdUsuario, setFranquiaIdUsuario] = useState<number | null>(null)

  const [franquiaId, setFranquiaId] = useState<number>(0)
  const [motivo, setMotivo] = useState('')
  const [nomeVendedor, setNomeVendedor] = useState('')
  const [numeroPedidoCancelar, setNumeroPedidoCancelar] = useState('')
  const [dataPedidoCancelar, setDataPedidoCancelar] = useState('')
  const [codigoProdutoCancelar, setCodigoProdutoCancelar] = useState('')
  const [descricaoPedidoCancelar, setDescricaoPedidoCancelar] = useState('')
  const [numeroNovoPedido, setNumeroNovoPedido] = useState('')
  const [codigoProdutoNovo, setCodigoProdutoNovo] = useState('')
  const [descricaoNovoPedido, setDescricaoNovoPedido] = useState('')
  const [statusPortal, setStatusPortal] = useState('')
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
    !!motivo &&
    !!nomeVendedor.trim() &&
    !!numeroPedidoCancelar.trim() &&
    !!dataPedidoCancelar &&
    !!codigoProdutoCancelar.trim() &&
    !!descricaoPedidoCancelar.trim() &&
    !!numeroNovoPedido.trim() &&
    !!codigoProdutoNovo.trim() &&
    !!descricaoNovoPedido.trim() &&
    !!statusPortal &&
    arquivos.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!franquiaId) { setErro('Selecione a franquia'); return }
    if (!motivo) { setErro('Selecione o motivo'); return }
    if (!nomeVendedor.trim()) { setErro('Nome do vendedor é obrigatório'); return }
    if (!numeroPedidoCancelar.trim()) { setErro('Número do pedido a cancelar é obrigatório'); return }
    if (!dataPedidoCancelar) { setErro('Data do pedido a cancelar é obrigatória'); return }
    if (!codigoProdutoCancelar.trim()) { setErro('Código do produto a cancelar é obrigatório'); return }
    if (!descricaoPedidoCancelar.trim()) { setErro('Descreva o modelo/cor/tamanho do pedido a cancelar'); return }
    if (!numeroNovoPedido.trim()) { setErro('Número do novo pedido é obrigatório'); return }
    if (!codigoProdutoNovo.trim()) { setErro('Código do produto do novo pedido é obrigatório'); return }
    if (!descricaoNovoPedido.trim()) { setErro('Descreva o modelo/cor/tamanho do novo pedido'); return }
    if (!statusPortal) { setErro('Selecione o status do pedido no portal'); return }
    if (arquivos.length === 0) { setErro('Anexe pelo menos um arquivo'); return }

    setEnviando(true)
    try {
      const resultados = await Promise.all(arquivos.map(arq => uploadService.upload(arq)))
      const anexoUrls = resultados.map(r => r.url)

      await trocaPedidoService.criar({
        franquia_id: franquiaId,
        motivo,
        nome_vendedor: nomeVendedor.trim(),
        numero_pedido_cancelar: numeroPedidoCancelar.trim(),
        data_pedido_cancelar: dataPedidoCancelar,
        codigo_produto_cancelar: codigoProdutoCancelar.trim(),
        descricao_pedido_cancelar: descricaoPedidoCancelar.trim(),
        numero_novo_pedido: numeroNovoPedido.trim(),
        codigo_produto_novo: codigoProdutoNovo.trim(),
        descricao_novo_pedido: descricaoNovoPedido.trim(),
        status_portal: statusPortal,
        anexos: anexoUrls,
      })

      queryClient.invalidateQueries({ queryKey: ['trocas-pedido'] })
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
        setErro(detail || `Erro ${status} ao criar troca de pedido`)
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
          <h3 className="text-base font-semibold text-slate-800">Troca de Pedido</h3>
          <p className="text-xs text-slate-400 mt-1">Preencha os dados da troca</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Franquia */}
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

          {/* Motivo */}
          <div>
            <label className={labelClass}>Informe o motivo da troca para um novo pedido</label>
            <TrocaMotivoSelect value={motivo} onChange={setMotivo} />
          </div>

          {/* Nome do vendedor */}
          <div>
            <label className={labelClass}>Nome do Vendedor</label>
            <input
              value={nomeVendedor}
              onChange={e => setNomeVendedor(e.target.value)}
              className={inputClass}
              placeholder="Nome completo do vendedor"
            />
          </div>

          {/* Pedido a cancelar */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Pedido a cancelar</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>N. do Pedido</label>
                <input
                  value={numeroPedidoCancelar}
                  onChange={e => setNumeroPedidoCancelar(e.target.value)}
                  className={inputClass + ' bg-white'}
                  placeholder="PED-001"
                />
              </div>
              <div>
                <label className={labelClass}>Data do Pedido</label>
                <input
                  type="date"
                  value={dataPedidoCancelar}
                  onChange={e => setDataPedidoCancelar(e.target.value)}
                  className={inputClass + ' bg-white'}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Código do Produto (ID)</label>
              <input
                value={codigoProdutoCancelar}
                onChange={e => setCodigoProdutoCancelar(e.target.value)}
                className={inputClass + ' bg-white'}
                placeholder="SKU-000"
              />
            </div>
            <div>
              <label className={labelClass}>Descreva modelo da Bike/Cor/Tamanho</label>
              <textarea
                value={descricaoPedidoCancelar}
                onChange={e => setDescricaoPedidoCancelar(e.target.value)}
                className={inputClass + ' bg-white resize-none'}
                rows={3}
              />
            </div>
          </div>

          {/* Novo pedido */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Novo pedido</p>
            <div>
              <label className={labelClass}>N. do Novo Pedido</label>
              <input
                value={numeroNovoPedido}
                onChange={e => setNumeroNovoPedido(e.target.value)}
                className={inputClass + ' bg-white'}
                placeholder="PED-002"
              />
            </div>
            <div>
              <label className={labelClass}>Código do Produto (ID) da Bike no novo Pedido</label>
              <input
                value={codigoProdutoNovo}
                onChange={e => setCodigoProdutoNovo(e.target.value)}
                className={inputClass + ' bg-white'}
                placeholder="SKU-000"
              />
            </div>
            <div>
              <label className={labelClass}>Descreva modelo da Bike/Cor/Tamanho</label>
              <textarea
                value={descricaoNovoPedido}
                onChange={e => setDescricaoNovoPedido(e.target.value)}
                className={inputClass + ' bg-white resize-none'}
                rows={3}
              />
            </div>
          </div>

          {/* Status do Pedido no portal */}
          <div>
            <label className={labelClass}>Status do Pedido no portal</label>
            <select
              value={statusPortal}
              onChange={e => setStatusPortal(e.target.value)}
              className={inputClass + ' bg-white'}
            >
              <option value="">Selecione...</option>
              {STATUS_PORTAL_OPCOES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Anexos obrigatório */}
          <div>
            <label className={labelClass}>
              Anexos <span className="text-red-400 normal-case font-normal">(obrigatório)</span>
            </label>
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
