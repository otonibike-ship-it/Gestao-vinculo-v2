'use client'

interface MoneyInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  id?: string
}

export function MoneyInput({ value, onChange, className = '', placeholder = '0,00', id }: MoneyInputProps) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">R$</span>
      <input
        id={id}
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${className} pl-10`}
      />
    </div>
  )
}
