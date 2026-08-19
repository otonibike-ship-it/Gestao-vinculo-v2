'use client'

interface DestinoOption {
  value: string
  label: string
}

interface DestinoPickerProps {
  options: DestinoOption[]
  value: string
  onChange: (value: string) => void
  label?: string
}

export function DestinoPicker({ options, value, onChange, label = 'Enviar para' }: DestinoPickerProps) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
              value === o.value
                ? 'bg-brand-pine text-white border-brand-pine'
                : 'text-slate-600 border-slate-200 bg-white hover:bg-brand-mist'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
