'use client'

import { MessageSquare } from 'lucide-react'

export interface ObservacaoEntry {
  area: string
  texto: string
  tipo: 'aprovacao' | 'reprovacao' | 'observacao'
  data: string
}

export const AREA_LABELS: Record<string, string> = {
  franquia: 'Franquia',
  comercial: 'Comercial',
  faturamento: 'Faturamento',
  financeiro: 'Financeiro',
  ti: 'TI',
}

// Mapeia todo valor de status (incluindo o enum antigo do Vinculo:
// validacao_comercial/validacao_financeiro/tarefa_ti) para a área que está com o pedido.
export const STATUS_TO_AREA: Record<string, string> = {
  aberto: 'franquia',
  comercial: 'comercial',
  aguardando_comercial: 'comercial',
  validacao_comercial: 'comercial',
  faturamento: 'faturamento',
  aguardando_faturamento: 'faturamento',
  financeiro: 'financeiro',
  aguardando_financeiro: 'financeiro',
  validacao_financeiro: 'financeiro',
  ti: 'ti',
  aguardando_ti: 'ti',
  tarefa_ti: 'ti',
}

export const REPROVADO_BADGE_CLASS = 'bg-brand-khaki/20 text-brand-umber'

// Quando o registro tem uma justificativa de reprovação pendente (voltou de alguma área),
// mostra "Reprovado - Aguardando {Área}" em vez do label normal de status — deixa claro
// nas listas que aquele item é uma devolução, não uma submissão nova.
export function statusLabelExibicao(status: string, justificativaReprovacao?: string | null): string | null {
  if (!justificativaReprovacao) return null
  const area = STATUS_TO_AREA[status]
  if (!area) return null
  return `Reprovado - Aguardando ${AREA_LABELS[area]}`
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
                : entry.tipo === 'observacao'
                ? 'bg-brand-teal/10 border-brand-teal/30'
                : 'bg-slate-50 border-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-semibold ${entry.tipo === 'reprovacao' ? 'text-brand-umber' : 'text-brand-pine'}`}>
                {entry.tipo === 'observacao' ? 'Observação' : (AREA_LABELS[entry.area] || entry.area)}
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
