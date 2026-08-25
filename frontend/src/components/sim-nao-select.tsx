'use client'

interface SimNaoSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function SimNaoSelect({ value, onChange, className = '' }: SimNaoSelectProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">Selecione...</option>
      <option value="sim">Sim</option>
      <option value="nao">Não</option>
    </select>
  )
}
