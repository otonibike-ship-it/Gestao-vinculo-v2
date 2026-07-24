'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Upload, X, AlertTriangle } from 'lucide-react'
import { linkPagamentoService } from '@/services/link-pagamento'
import { uploadService } from '@/services/vinculo'
import { authService } from '@/services/auth'
import api from '@/lib/api'

interface Props {
  voltarPara: string
}

const PARCELAS_OPCOES = Array.from({ length: 18 }, (_, i) => i + 1)

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

const formatTelefone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export default function LinkPagamentoForm({ voltarPara }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [perfil, setPerfil] = useState<string>('comercial')
  const [franquiaIdUsuario, setFranquiaIdUsuario] = useState<number | null>(null)

  const [franquiaId, setFranquiaId] = useState<number>(0)
  const [motivo, setMotivo] = useState('')
  const [numeroPedido, setNumeroPedido] = useState('')
  const [dataPedido, setDataPedido] = useState('')
  const [valorPedido, setValorPedido] = useState('')
  const [valorLink, setValorLink] = useState('')
  const [quantidadeParcelas, setQuantidadeParcelas] = useState<number>(1)
  const [codigoProduto, setCodigoProduto] = useState('')
  const [modelo, setModelo] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [endereco, setEndereco] = useState('')
  const [telefone, setTelefone] = useState('')
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
    !!motivo.trim() &&
    !!numeroPedido.trim() &&
    !!dataPedido &&
    !!valorPedido && parseFloat(valorPedido) > 0 &&
    !!valorLink && parseFloat(valorLink) > 0 &&
    !!codigoProduto.trim() &&
    !!modelo.trim() &&
    !!vendedor.trim() &&
    !!nomeCliente.trim() &&
    cpf.replace(/\D/g, '').length === 11 &&
    !!email.trim() &&
    !!endereco.trim() &&
    telefone.replace(/\D/g, '').length >= 10 &&
    arquivos.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!franquiaId) { setErro('Selecione a franquia'); return }
    if (!motivo.trim()) { setErro('Descreva o motivo da solicitação'); return }
    if (!numeroPedido.trim()) { setErro('Número do pedido é obrigatório'); return }
    if (!dataPedido) { setErro('Data do pedido é obrigatória'); return }
    if (!valorPedido || parseFloat(valorPedido) <= 0) { setErro('Valor do pedido inválido'); return }
    if (!valorLink || parseFloat(valorLink) <= 0) { setErro('Valor do link inválido'); return }
    if (!codigoProduto.trim()) { setErro('Código de ID da bicicleta é obrigatório'); return }
    if (!modelo.trim()) { setErro('Modelo é obrigatório'); return }
    if (!vendedor.trim()) { setErro('Vendedor é obrigatório'); return }
    if (!nomeCliente.trim()) { setErro('Nome do cliente é obrigatório'); return }
    if (cpf.replace(/\D/g, '').length !== 11) { setErro('CPF inválido'); return }
    if (!email.trim()) { setErro('E-mail é obrigatório'); return }
    if (!endereco.trim()) { setErro('Endereço é obrigatório'); return }
    if (telefone.replace(/\D/g, '').length < 10) { setErro('Telefone inválido'); return }
    if (arquivos.length === 0) { setErro('Anexe uma foto legível do documento de identificação do solicitante'); return }

    setEnviando(true)
    try {
      const resultados = await Promise.all(arquivos.map(arq => uploadService.upload(arq)))
      const anexoUrls = resultados.map(r => r.url)

      await linkPagamentoService.criar({
        franquia_id: franquiaId,
        motivo: motivo.trim(),
        numero_pedido: numeroPedido.trim(),
        data_pedido: dataPedido,
        valor_pedido: parseFloat(valorPedido),
        valor_link: parseFloat(valorLink),
        quantidade_parcelas: quantidadeParcelas,
        codigo_produto: codigoProduto.trim(),
        modelo: modelo.trim(),
        vendedor: vendedor.trim(),
        nome_cliente: nomeCliente.trim(),
        cpf: cpf.trim(),
        email: email.trim(),
        endereco: endereco.trim(),
        telefone: telefone.trim(),
        anexos: anexoUrls,
      })

      queryClient.invalidateQueries({ queryKey: ['links-pagamento'] })
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
        setErro(detail || `Erro ${status} ao criar link de pagamento`)
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
          <h3 className="text-base font-semibold text-slate-800">Link de Pagamento</h3>
          <p className="text-xs text-slate-400 mt-1">Preencha os dados da solicitação</p>
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
            <label className={labelClass}>Informe de forma detalhada o motivo da solicitação de um link de pagamento</label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              className={inputClass + ' resize-none'}
              rows={3}
            />
          </div>

          {/* Pedido */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Número do Pedido</label>
                <input
                  value={numeroPedido}
                  onChange={e => setNumeroPedido(e.target.value)}
                  className={inputClass + ' bg-white'}
                  placeholder="PED-001"
                />
              </div>
              <div>
                <label className={labelClass}>Data do Pedido</label>
                <input
                  type="date"
                  value={dataPedido}
                  onChange={e => setDataPedido(e.target.value)}
                  className={inputClass + ' bg-white'}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Valor do Pedido (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorPedido}
                  onChange={e => setValorPedido(e.target.value)}
                  className={inputClass + ' bg-white'}
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className={labelClass}>Valor do Link (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorLink}
                  onChange={e => setValorLink(e.target.value)}
                  className={inputClass + ' bg-white'}
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className={labelClass}>Quantidade</label>
                <select
                  value={quantidadeParcelas}
                  onChange={e => setQuantidadeParcelas(Number(e.target.value))}
                  className={inputClass + ' bg-white'}
                >
                  {PARCELAS_OPCOES.map(n => (
                    <option key={n} value={n}>{n}x</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bicicleta */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50">
            <div>
              <label className={labelClass}>Código de ID da Bicicleta</label>
              <input
                value={codigoProduto}
                onChange={e => setCodigoProduto(e.target.value)}
                className={inputClass + ' bg-white'}
                placeholder="SKU-000"
              />
            </div>
            <div>
              <label className={labelClass}>Modelo</label>
              <textarea
                value={modelo}
                onChange={e => setModelo(e.target.value)}
                className={inputClass + ' bg-white resize-none'}
                rows={2}
              />
            </div>
          </div>

          {/* Vendedor */}
          <div>
            <label className={labelClass}>Vendedor</label>
            <input
              value={vendedor}
              onChange={e => setVendedor(e.target.value)}
              className={inputClass}
              placeholder="Nome do vendedor"
            />
          </div>

          {/* Cliente */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Dados do Cliente</p>
            <div>
              <label className={labelClass}>Nome do Cliente</label>
              <textarea
                value={nomeCliente}
                onChange={e => setNomeCliente(e.target.value)}
                className={inputClass + ' bg-white resize-none'}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>CPF</label>
                <input
                  value={cpf}
                  onChange={e => setCpf(formatCpf(e.target.value))}
                  className={inputClass + ' bg-white'}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className={labelClass}>Telefone</label>
                <input
                  value={telefone}
                  onChange={e => setTelefone(formatTelefone(e.target.value))}
                  className={inputClass + ' bg-white'}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  inputMode="numeric"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass + ' bg-white'}
                placeholder="cliente@email.com"
              />
            </div>
            <div>
              <label className={labelClass}>Endereço</label>
              <textarea
                value={endereco}
                onChange={e => setEndereco(e.target.value)}
                className={inputClass + ' bg-white resize-none'}
                rows={2}
              />
            </div>
          </div>

          {/* Anexo obrigatório */}
          <div>
            <label className={labelClass}>
              Envie uma foto legível do documento de identificação do solicitante <span className="text-red-400 normal-case font-normal">(obrigatório)</span>
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
                  ? 'Selecionar arquivo...'
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
