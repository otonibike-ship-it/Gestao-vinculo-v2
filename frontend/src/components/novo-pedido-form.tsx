'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Upload, X, AlertTriangle } from 'lucide-react'
import { vinculoService, uploadService } from '@/services/vinculo'
import { authService } from '@/services/auth'
import { MotivoSelect } from '@/components/motivo-select'
import api from '@/lib/api'

interface Props {
  voltarPara: string
}

export default function NovoPedidoForm({ voltarPara }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [perfil, setPerfil] = useState<string>('comercial')
  const [franquiaIdUsuario, setFranquiaIdUsuario] = useState<number | null>(null)

  // Campos básicos
  const [numeroPedido, setNumeroPedido] = useState('')
  const [franquiaId, setFranquiaId] = useState<number>(0)
  const [nomeCliente, setNomeCliente] = useState('')
  const [cpf, setCpf] = useState('')
  const [motivo, setMotivo] = useState('')
  const [valorPedido, setValorPedido] = useState('')
  const [dataPedido, setDataPedido] = useState('')
  const [arquivos, setArquivos] = useState<File[]>([])

  // Cupons
  const [quantidadeCupons, setQuantidadeCupons] = useState<number>(0)
  const [valoresCupons, setValoresCupons] = useState<string[]>([])

  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Lê localStorage apenas no cliente (não existe no servidor)
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

  // Atualiza array de valores quando muda quantidade
  useEffect(() => {
    setValoresCupons(prev => {
      const arr = [...prev]
      arr.length = quantidadeCupons
      for (let i = 0; i < quantidadeCupons; i++) {
        if (!arr[i]) arr[i] = ''
      }
      return arr
    })
  }, [quantidadeCupons])

  const somaCupons = valoresCupons.reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
  const valorTotal = parseFloat(valorPedido) || 0
  const cuponsValidos = quantidadeCupons === 0 || Math.abs(somaCupons - valorTotal) < 0.01

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!numeroPedido.trim()) { setErro('Número do pedido é obrigatório'); return }
    if (!franquiaId) { setErro('Selecione a franquia'); return }
    if (!nomeCliente.trim()) { setErro('Nome do cliente é obrigatório'); return }
    if (!cpf.trim() || cpf.replace(/\D/g, '').length !== 11) { setErro('CPF inválido'); return }
    if (!valorPedido || parseFloat(valorPedido) <= 0) { setErro('Valor do pedido inválido'); return }
    if (!dataPedido) { setErro('Data do pedido é obrigatória'); return }
    if (arquivos.length === 0) { setErro('Anexe pelo menos um arquivo'); return }

    if (quantidadeCupons > 0) {
      if (valoresCupons.some(v => !v || parseFloat(v) <= 0)) {
        setErro('Preencha o valor de todos os comprovantes de pagamento'); return
      }
      if (!cuponsValidos) {
        setErro(`Soma dos comprovantes (R$ ${somaCupons.toFixed(2)}) é diferente do valor do pedido (R$ ${valorTotal.toFixed(2)})`); return
      }
    }

    setEnviando(true)
    try {
      // Upload em paralelo — mais rápido que sequencial
      const resultados = await Promise.all(arquivos.map(arq => uploadService.upload(arq)))
      const anexoUrls = resultados.map(r => r.url)

      const cuponsList = quantidadeCupons > 0
        ? valoresCupons.map(v => ({ valor: parseFloat(v) }))
        : undefined

      await vinculoService.criar({
        numero_pedido: numeroPedido.trim(),
        franquia_id: franquiaId,
        nome_cliente: nomeCliente.trim(),
        cpf: cpf.trim(),
        valor_pedido: parseFloat(valorPedido),
        data_pedido: dataPedido,
        motivo: motivo || undefined,
        necessario_validacao: false, // comercial decide no momento da aprovação
        quantidade_cupons: quantidadeCupons > 0 ? quantidadeCupons : undefined,
        cupons: cuponsList,
        anexos: anexoUrls,
      })

      queryClient.invalidateQueries({ queryKey: ['vinculos'] })
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
        setErro(detail || `Erro ${status} ao criar pedido`)
      }
    } finally {
      setEnviando(false)
    }
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
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
          <h3 className="text-base font-semibold text-slate-800">Novo Pedido de Vínculo</h3>
          <p className="text-xs text-slate-400 mt-1">Preencha os dados do pedido</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Número do Pedido */}
            <div>
              <label className={labelClass}>N. do Pedido</label>
              <input
                value={numeroPedido}
                onChange={e => setNumeroPedido(e.target.value)}
                className={inputClass}
                placeholder="PED-001"
              />
            </div>

            {/* Franquia — só mostra select para não-franquia */}
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
          </div>

          {/* Nome do Cliente + CPF */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nome do Cliente</label>
              <input
                value={nomeCliente}
                onChange={e => setNomeCliente(e.target.value)}
                className={inputClass}
                placeholder="Nome completo do cliente"
              />
            </div>
            <div>
              <label className={labelClass}>CPF</label>
              <input
                value={cpf}
                onChange={e => setCpf(formatCpf(e.target.value))}
                className={inputClass}
                placeholder="000.000.000-00"
                maxLength={14}
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className={labelClass}>Motivo</label>
            <MotivoSelect value={motivo} onChange={setMotivo} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Valor */}
            <div>
              <label className={labelClass}>Valor do Pedido (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorPedido}
                onChange={e => setValorPedido(e.target.value)}
                className={inputClass}
                placeholder="0,00"
              />
            </div>

            {/* Data */}
            <div>
              <label className={labelClass}>Data do Pedido</label>
              <input
                type="date"
                value={dataPedido}
                onChange={e => setDataPedido(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* ── CUPONS ─────────────────────────────────────── */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50">
            <div>
              <label className={labelClass}>Quantos comprovantes de pagamento serão anexados?</label>
              <select
                value={quantidadeCupons}
                onChange={e => setQuantidadeCupons(Number(e.target.value))}
                className={inputClass + ' bg-white'}
              >
                <option value={0}>Nenhum comprovante de pagamento</option>
                {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} comprovante{n > 1 ? 's' : ''} de pagamento</option>
                ))}
              </select>
            </div>

            {quantidadeCupons > 0 && (
              <div className="space-y-2">
                {valoresCupons.map((v, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-20 shrink-0">
                      {i + 1}º comprovante:
                    </span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v}
                        onChange={e => {
                          const next = [...valoresCupons]
                          next[i] = e.target.value
                          setValoresCupons(next)
                        }}
                        className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                ))}

                {/* Totalizador */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                  !valorTotal ? 'bg-slate-100 text-slate-500' :
                  cuponsValidos ? 'bg-green-50 text-green-700 border border-green-200' :
                  'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <span>Soma dos comprovantes:</span>
                  <span>R$ {somaCupons.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                {valorTotal > 0 && !cuponsValidos && (
                  <div className="flex items-center gap-2 text-xs text-red-600">
                    <AlertTriangle size={13} />
                    A soma dos comprovantes deve ser igual ao valor do pedido (R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                  </div>
                )}
              </div>
            )}
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
                arquivos.length === 0 ? 'border-slate-300 hover:border-slate-400' : 'border-green-300 hover:border-green-400'
              }`}
            >
              <Upload size={16} className={arquivos.length === 0 ? 'text-slate-400' : 'text-green-500'} />
              <span className={`text-sm ${arquivos.length === 0 ? 'text-slate-400' : 'text-green-600 font-medium'}`}>
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
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                    <Upload size={13} className="text-green-500 shrink-0" />
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
              disabled={
                enviando ||
                !numeroPedido.trim() ||
                !franquiaId ||
                !nomeCliente.trim() ||
                cpf.replace(/\D/g, '').length !== 11 ||
                !valorPedido || parseFloat(valorPedido) <= 0 ||
                !dataPedido ||
                arquivos.length === 0 ||
                (quantidadeCupons > 0 && !cuponsValidos)
              }
              className="flex-1 py-3 px-4 rounded-xl text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 transition-colors disabled:opacity-50"
            >
              {enviando ? 'Enviando...' : 'Criar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
