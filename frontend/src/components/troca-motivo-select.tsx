'use client'

const MOTIVOS_TROCA = [
  'Pedido incluído no portal com a COR divergente do que foi entregue ao cliente',
  'Pedido incluído no portal com o tamanho divergente do que foi entregue ao cliente',
  'Cupom incorreto inserido no pedido',
  'Cliente optou por trocar por outra bike',
  'Atendimento de garantia S2 TECH CENTER',
  'Dados incorretos do cliente ao inserir o pedido',
]

interface TrocaMotivoSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TrocaMotivoSelect({ value, onChange, className = '' }: TrocaMotivoSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all bg-white ${className}`}
    >
      <option value="">Selecione o motivo...</option>
      {MOTIVOS_TROCA.map((opcao) => (
        <option key={opcao} value={opcao}>
          {opcao}
        </option>
      ))}
    </select>
  )
}

export { MOTIVOS_TROCA }
