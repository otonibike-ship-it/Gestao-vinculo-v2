'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Upload, X, AlertTriangle } from 'lucide-react'
import { cancelamentoVendaService } from '@/services/cancelamento-venda'
import { uploadService } from '@/services/vinculo'
import { authService } from '@/services/auth'
import { MoneyInput } from '@/components/money-input'
import { SimNaoSelect } from '@/components/sim-nao-select'
import api from '@/lib/api'

interface Props {
  voltarPara: string
}

const STATUS_PORTAL_OPCOES = [
  { value: 'processando_pagamento', label: 'Processando Pagamento' },
  { value: 'em_separacao', label: 'Em Separação' },
  { value: 'faturado', label: 'Pedido Faturado' },
]

const FORMA_PAGAMENTO_OPCOES = [
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'pix', label: 'Pix' },
  { value: 'deposito', label: 'Depósito' },
]

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

export default function CancelamentoVendaForm({ voltarPara }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [perfil, setPerfil] = useState<string>('comercial')
  const [franquiaIdUsuario, setFranquiaIdUsuario] = useState<number | null>(null)

  const [franquiaId, setFranquiaId] = useState<number>(0)
  const [motivo, setMotivo] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [numeroPedidoCancelar, setNumeroPedidoCancelar] = useState('')
  const [dataPedidoCancelar, setDataPedidoCancelar] = useState('')
  const [statusPortal, setStatusPortal] = useState('')
  const [numeroNotaFiscal, setNumeroNotaFiscal] = useState('')
  const [dataEmissaoNotaFiscal, setDataEmissaoNotaFiscal] = useState('')
  const [bikeNaLoja, setBikeNaLoja] = useState('')
  const [sinaisUso, setSinaisUso] = useState('')
  const [arquivosEvidencias, setArquivosEvidencias] = useState<File[]>([])
  const [codigoProduto, setCodigoProduto] = useState('')
  const [descricaoModelo, setDescricaoModelo] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [cpf, setCpf] = useState('')
  const [valorTotalPagoCliente, setValorTotalPagoCliente] = useState('')
  const [valorTotalPedido, setValorTotalPedido] = useState('')
  const [valorCancelar, setValorCancelar] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [pagoMaisUmCartao, setPagoMaisUmCartao] = useState('')
  const [arquivosPortal, setArquivosPortal] = useState<File[]>([])

  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const fileInputEvidenciasRef = useRef<HTMLInputElement>(null)
  const fileInputPortalRef = useRef<HTMLInputElement>(null)

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

  const camposObrigatoriosPreenchidos = !!franquiaId && arquivosPortal.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!franquiaId) { setErro('Selecione a franquia'); return }
    if (arquivosPortal.length === 0) { setErro('Anexe as imagens do portal e o comprovante de pagamento'); return }

    setEnviando(true)
    try {
      const [resultadosEvidencias, resultadosPortal] = await Promise.all([
        Promise.all(arquivosEvidencias.map(arq => uploadService.upload(arq))),
        Promise.all(arquivosPortal.map(arq => uploadService.upload(arq))),
      ])

      await cancelamentoVendaService.criar({
        franquia_id: franquiaId,
        motivo: motivo.trim() || null,
        vendedor: vendedor.trim() || null,
        numero_pedido_cancelar: numeroPedidoCancelar.trim() || null,
        data_pedido_cancelar: dataPedidoCancelar || null,
        status_portal: statusPortal || null,
        numero_nota_fiscal: numeroNotaFiscal.trim() || null,
        data_emissao_nota_fiscal: dataEmissaoNotaFiscal || null,
        bike_na_loja: bikeNaLoja === '' ? null : bikeNaLoja === 'sim',
        sinais_uso: sinaisUso === '' ? null : sinaisUso === 'sim',
        anexos_evidencias_uso: resultadosEvidencias.map(r => r.url),
        codigo_produto: codigoProduto.trim() || null,
        descricao_modelo: descricaoModelo.trim() || null,
        nome_cliente: nomeCliente.trim() || null,
        cpf: cpf.trim() || null,
        valor_total_pago_cliente: valorTotalPagoCliente ? parseFloat(valorTotalPagoCliente) : null,
        valor_total_pedido: valorTotalPedido ? parseFloat(valorTotalPedido) : null,
        valor_cancelar: valorCancelar ? parseFloat(valorCancelar) : null,
        forma_pagamento: formaPagamento || null,
        pago_mais_um_cartao: pagoMaisUmCartao === '' ? null : pagoMaisUmCartao === 'sim',
        anexos_portal_comprovante: resultadosPortal.map(r => r.url),
      })

      queryClient.invalidateQueries({ queryKey: ['cancelamentos-venda'] })
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
        setErro(detail || `Erro ${status} ao criar cancelamento de venda`)
      }
    } finally {
      setEnviando(false)
    }
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 transition-all"
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2"

  const FileField = ({
    label, arquivos, setArquivos, inputRef, required,
  }: {
    label: string
    arquivos: File[]
    setArquivos: React.Dispatch<React.SetStateAction<File[]>>
    inputRef: React.RefObject<HTMLInputElement>
    required?: boolean
  }) => (
    <div>
      <label className={labelClass}>
        {label} {required && <span className="text-red-400 normal-case font-normal">(obrigatório)</span>}
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
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
        ref={inputRef}
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
  )

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
          <h3 className="text-base font-semibold text-slate-800">Cancelamento de Venda</h3>
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

          <div>
            <label className={labelClass}>Informe o motivo do cancelamento do pedido</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} className={inputClass + ' resize-none'} rows={3} />
          </div>

          <div>
            <label className={labelClass}>Nome do Vendedor</label>
            <input value={vendedor} onChange={e => setVendedor(e.target.value)} className={inputClass} />
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Pedido a cancelar</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Número do Pedido</label>
                <input value={numeroPedidoCancelar} onChange={e => setNumeroPedidoCancelar(e.target.value)} className={inputClass + ' bg-white'} placeholder="PED-001" />
              </div>
              <div>
                <label className={labelClass}>Data do Pedido</label>
                <input type="date" value={dataPedidoCancelar} onChange={e => setDataPedidoCancelar(e.target.value)} className={inputClass + ' bg-white'} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Status do Pedido no Portal</label>
              <select value={statusPortal} onChange={e => setStatusPortal(e.target.value)} className={inputClass + ' bg-white'}>
                <option value="">Selecione...</option>
                {STATUS_PORTAL_OPCOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Número da Nota Fiscal de Venda</label>
                <input value={numeroNotaFiscal} onChange={e => setNumeroNotaFiscal(e.target.value)} className={inputClass + ' bg-white'} />
              </div>
              <div>
                <label className={labelClass}>Data de Emissão da NF</label>
                <input type="date" value={dataEmissaoNotaFiscal} onChange={e => setDataEmissaoNotaFiscal(e.target.value)} className={inputClass + ' bg-white'} />
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado da bike</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Bike está fisicamente na loja?</label>
                <SimNaoSelect value={bikeNaLoja} onChange={setBikeNaLoja} className={inputClass + ' bg-white'} />
              </div>
              <div>
                <label className={labelClass}>Há sinais de uso na bike?</label>
                <SimNaoSelect value={sinaisUso} onChange={setSinaisUso} className={inputClass + ' bg-white'} />
              </div>
            </div>
            <FileField
              label="Envie fotos das evidências dos sinais de uso da Bike"
              arquivos={arquivosEvidencias}
              setArquivos={setArquivosEvidencias}
              inputRef={fileInputEvidenciasRef}
            />
            <div>
              <label className={labelClass}>Código do Produto (ID)</label>
              <input value={codigoProduto} onChange={e => setCodigoProduto(e.target.value)} className={inputClass + ' bg-white'} placeholder="SKU-000" />
            </div>
            <div>
              <label className={labelClass}>Descreva modelo da Bike/Cor/Tamanho</label>
              <textarea value={descricaoModelo} onChange={e => setDescricaoModelo(e.target.value)} className={inputClass + ' bg-white resize-none'} rows={2} />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Cliente e pagamento</p>
            <div>
              <label className={labelClass}>Nome completo do cliente</label>
              <textarea value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} className={inputClass + ' bg-white resize-none'} rows={2} />
            </div>
            <div>
              <label className={labelClass}>CPF do Cliente</label>
              <input
                value={cpf}
                onChange={e => setCpf(formatCpf(e.target.value))}
                className={inputClass + ' bg-white'}
                placeholder="000.000.000-00"
                maxLength={14}
                inputMode="numeric"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Valor Total Pago</label>
                <MoneyInput value={valorTotalPagoCliente} onChange={setValorTotalPagoCliente} className={inputClass + ' bg-white'} />
              </div>
              <div>
                <label className={labelClass}>Valor Total do Pedido</label>
                <MoneyInput value={valorTotalPedido} onChange={setValorTotalPedido} className={inputClass + ' bg-white'} />
              </div>
              <div>
                <label className={labelClass}>Valor a Cancelar</label>
                <MoneyInput value={valorCancelar} onChange={setValorCancelar} className={inputClass + ' bg-white'} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Forma de Pagamento</label>
                <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} className={inputClass + ' bg-white'}>
                  <option value="">Selecione...</option>
                  {FORMA_PAGAMENTO_OPCOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Foi pago em mais de um cartão?</label>
                <SimNaoSelect value={pagoMaisUmCartao} onChange={setPagoMaisUmCartao} className={inputClass + ' bg-white'} />
              </div>
            </div>
          </div>

          <FileField
            label="Anexar imagens do Portal e Comprovante de pagamento"
            arquivos={arquivosPortal}
            setArquivos={setArquivosPortal}
            inputRef={fileInputPortalRef}
            required
          />

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
