import api from '@/lib/api'

export interface SolicitacaoEstornoData {
  id: number
  franquia_id: number
  franquia_nome: string
  motivo: string
  vendedor: string
  numero_pedido: string
  data_pedido: string
  nome_cliente: string
  cpf: string
  data_pagamento: string
  valor_pedido_portal: number
  valor_total_pago: number
  valor_devolver: number
  status: 'aberto' | 'aguardando_comercial' | 'aguardando_faturamento' | 'aguardando_financeiro' | 'aguardando_ti' | 'fechado'
  anexos: string[]
  observacao_comercial: string | null
  justificativa_reprovacao: string | null
  destino_reprovacao: string | null
  criado_em: string
  atualizado_em: string
}

export interface SolicitacaoEstornoCreatePayload {
  franquia_id: number
  motivo: string
  vendedor: string
  numero_pedido: string
  data_pedido: string
  nome_cliente: string
  cpf: string
  data_pagamento: string
  valor_pedido_portal: number
  valor_total_pago: number
  valor_devolver: number
  anexos?: string[]
}

export const solicitacaoEstornoService = {
  async listar(status?: string, franquia_id?: number) {
    const params: Record<string, string | number> = {}
    if (status) params.status = status
    if (franquia_id) params.franquia_id = franquia_id
    const { data } = await api.get('/solicitacoes-estorno', { params })
    return data as SolicitacaoEstornoData[]
  },

  async obter(id: number) {
    const { data } = await api.get(`/solicitacoes-estorno/${id}`)
    return data as SolicitacaoEstornoData
  },

  async criar(payload: SolicitacaoEstornoCreatePayload) {
    const { data } = await api.post('/solicitacoes-estorno', payload)
    return data as SolicitacaoEstornoData
  },

  async aprovar(id: number, opts: { destino?: string; observacao?: string; anexos?: string[] } = {}) {
    const { data } = await api.put(`/solicitacoes-estorno/${id}/aprovar`, opts)
    return data as SolicitacaoEstornoData
  },

  async reprovar(id: number, justificativa: string) {
    const { data } = await api.put(`/solicitacoes-estorno/${id}/reprovar`, { justificativa })
    return data as SolicitacaoEstornoData
  },

  async reenviar(id: number, payload: SolicitacaoEstornoCreatePayload) {
    const { data } = await api.put(`/solicitacoes-estorno/${id}/reenviar`, payload)
    return data as SolicitacaoEstornoData
  },

  async deletar(id: number) {
    await api.delete(`/solicitacoes-estorno/${id}`)
  },
}
