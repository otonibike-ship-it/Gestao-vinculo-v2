'use client'

export const CAMPO_CORRECAO_OPCOES = [
  { value: 'numero_serie', label: 'Número de Série do Quadro da Bike' },
  { value: 'nome_cliente', label: 'Nome do Cliente' },
  { value: 'sobrenome_cliente', label: 'Sobrenome do Cliente' },
  { value: 'complemento_dados_adicionais', label: 'Complemento em Dados Adicionais' },
]

export const MOTIVOS_DIVERGENCIA = [
  'Foi inserido o N° de série errado no portal ao incluir o pedido de venda',
  'O N° de série da bike entregue ao cliente não foi informado no pedido, por isso o CD considerou o N° de série da reposição',
  'O N° de série destacado na NF pelo time do CD diverge do número informado pela franquia',
  'O CD informou um número de série incorreto para uma bike do seu próprio estoque',
  'Atendimento de garantia com troca do quadro realizada pela S2 Tech Center',
  'N° de série não saiu na Nota Fiscal',
]

interface SelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

const baseClass = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 focus:border-brand-teal transition-all bg-white"

export function CampoCorrecaoSelect({ value, onChange, className = '' }: SelectProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${baseClass} ${className}`}>
      <option value="">Selecione o campo...</option>
      {CAMPO_CORRECAO_OPCOES.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export function MotivoDivergenciaSelect({ value, onChange, className = '' }: SelectProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${baseClass} ${className}`}>
      <option value="">Selecione o motivo...</option>
      {MOTIVOS_DIVERGENCIA.map((m) => (
        <option key={m} value={m}>{m}</option>
      ))}
    </select>
  )
}
