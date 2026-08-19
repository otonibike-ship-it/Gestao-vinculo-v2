'use client'

import { MessageSquare } from 'lucide-react'

export interface ObservacaoEntry {
  area: string
  texto: string
  tipo: 'aprovacao' | 'reprovacao'
  data: string
}

export const AREA_LABELS: Record<string, string> = {
  franquia: 'Franquia',
  comercial: 'Comercial',
  faturamento: 'Faturamento',
  financeiro: 'Financeiro',
  ti: 'TI',
}

interface HistoricoObservacoesProps {
  historico: ObservacaoEntry[] | null | undefined
}

export function HistoricoObservacoes({ historico }: HistoricoObservacoesProps) {
  if (!historico || historico.length === 0) return null

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <MessageSquare size={13} />
        Histórico de Observações
      </p>
      <div className="space-y-2">
        {historico.map((entry, i) => (
          <div
            key={i}
            className={`rounded-xl px-4 py-3 border ${
              entry.tipo === 'reprovacao'
                ? 'bg-brand-khaki/10 border-brand-khaki/30'
                : 'bg-slate-50 border-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-semibold ${entry.tipo === 'reprovacao' ? 'text-brand-umber' : 'text-brand-pine'}`}>
                {AREA_LABELS[entry.area] || entry.area}
              </span>
              <span className="text-[10px] text-slate-400">
                {new Date(entry.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{entry.texto}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
