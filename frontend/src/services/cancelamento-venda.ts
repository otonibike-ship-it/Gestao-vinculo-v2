import api from '@/lib/api'

export interface CancelamentoVendaData {
  id: number
  franquia_id: number
  franquia_nome: string
  motivo: string | null
  vendedor: string | null
  numero_pedido_cancelar: string | null
  data_pedido_cancelar: string | null
  status_portal: string | null
  numero_nota_fiscal: string | null
  data_emissao_nota_fiscal: string | null
  bike_na_loja: boolean | null
  sinais_uso: boolean | null
  anexos_evidencias_uso: string[]
  codigo_produto: string | null
  descricao_modelo: string | null
  nome_cliente: string | null
  cpf: string | null
  valor_total_pago_cliente: number | null
  valor_total_pedido: number | null
  valor_cancelar: number | null
  forma_pagamento: string | null
  pago_mais_um_cartao: boolean | null
  anexos_portal_comprovante: string[]
  status: 'aberto' | 'aguardando_comercial' | 'aguardando_faturamento' | 'aguardando_financeiro' | 'aguardando_ti' | 'fechado'
  observacao_comercial: string | null
  justificativa_reprovacao: string | null
  destino_reprovacao: string | null
  historico_observacoes: { area: string; texto: string; tipo: 'aprovacao' | 'reprovacao'; data: string }[]
  criado_em: string
  atualizado_em: string
}

export interface CancelamentoVendaCreatePayload {
  franquia_id: number
  motivo?: string | null
  vendedor?: string | null
  numero_pedido_cancelar?: string | null
  data_pedido_cancelar?: string | null
  status_portal?: string | null
  numero_nota_fiscal?: string | null
  data_emissao_nota_fiscal?: string | null
  bike_na_loja?: boolean | null
  sinais_uso?: boolean | null
  anexos_evidencias_uso?: string[]
  codigo_produto?: string | null
  descricao_modelo?: string | null
  nome_cliente?: string | null
  cpf?: string | null
  valor_total_pago_cliente?: number | null
  valor_total_pedido?: number | null
  valor_cancelar?: number | null
  forma_pagamento?: string | null
  pago_mais_um_cartao?: boolean | null
  anexos_portal_comprovante?: string[]
}

export const cancelamentoVendaService = {
  async listar(status?: string, franquia_id?: number) {
    const params: Record<string, string | number> = {}
    if (status) params.status = status
    if (franquia_id) params.franquia_id = franquia_id
    const { data } = await api.get('/cancelamentos-venda', { params })
    return data as CancelamentoVendaData[]
  },

  async obter(id: number) {
    const { data } = await api.get(`/cancelamentos-venda/${id}`)
    return data as CancelamentoVendaData
  },

  async criar(payload: CancelamentoVendaCreatePayload) {
    const { data } = await api.post('/cancelamentos-venda', payload)
    return data as CancelamentoVendaData
  },

  async aprovar(id: number, opts: { observacao?: string; anexos?: string[]; destino?: string } = {}) {
    const { data } = await api.put(`/cancelamentos-venda/${id}/aprovar`, opts)
    return data as CancelamentoVendaData
  },

  async reprovar(id: number, justificativa: string, destino?: string) {
    const { data } = await api.put(`/cancelamentos-venda/${id}/reprovar`, { justificativa, destino })
    return data as CancelamentoVendaData
  },

  async reenviar(id: number, payload: CancelamentoVendaCreatePayload) {
    const { data } = await api.put(`/cancelamentos-venda/${id}/reenviar`, payload)
    return data as CancelamentoVendaData
  },

  async deletar(id: number) {
    await api.delete(`/cancelamentos-venda/${id}`)
  },
}
