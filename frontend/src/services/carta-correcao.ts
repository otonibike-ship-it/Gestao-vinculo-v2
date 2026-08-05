import api from '@/lib/api'

export interface CartaCorrecaoData {
  id: number
  franquia_id: number
  franquia_nome: string
  numero_nota_fiscal: string
  numero_pedido: string
  nome_cliente_pedido: string
  campo_correcao: string
  motivo_divergencia: string
  info_numero_serie_ticket: string | null
  nome_correto_cliente: string | null
  sobrenome_correto_cliente: string | null
  complemento_dados_adicionais: string | null
  status: 'aberto' | 'aguardando_comercial' | 'aguardando_faturamento' | 'aguardando_financeiro' | 'aguardando_ti' | 'fechado'
  anexos: string[]
  observacao_comercial: string | null
  justificativa_reprovacao: string | null
  destino_reprovacao: string | null
  criado_em: string
  atualizado_em: string
}

export interface CartaCorrecaoCreatePayload {
  franquia_id: number
  numero_nota_fiscal: string
  numero_pedido: string
  nome_cliente_pedido: string
  campo_correcao: string
  motivo_divergencia: string
  info_numero_serie_ticket?: string
  nome_correto_cliente?: string
  sobrenome_correto_cliente?: string
  complemento_dados_adicionais?: string
  anexos?: string[]
}

export const cartaCorrecaoService = {
  async listar(status?: string, franquia_id?: number) {
    const params: Record<string, string | number> = {}
    if (status) params.status = status
    if (franquia_id) params.franquia_id = franquia_id
    const { data } = await api.get('/cartas-correcao', { params })
    return data as CartaCorrecaoData[]
  },

  async obter(id: number) {
    const { data } = await api.get(`/cartas-correcao/${id}`)
    return data as CartaCorrecaoData
  },

  async criar(payload: CartaCorrecaoCreatePayload) {
    const { data } = await api.post('/cartas-correcao', payload)
    return data as CartaCorrecaoData
  },

  async aprovar(id: number, opts: { observacao?: string; anexos?: string[] } = {}) {
    const { data } = await api.put(`/cartas-correcao/${id}/aprovar`, opts)
    return data as CartaCorrecaoData
  },

  async reprovar(id: number, justificativa: string) {
    const { data } = await api.put(`/cartas-correcao/${id}/reprovar`, { justificativa })
    return data as CartaCorrecaoData
  },

  async reenviar(id: number, payload: CartaCorrecaoCreatePayload) {
    const { data } = await api.put(`/cartas-correcao/${id}/reenviar`, payload)
    return data as CartaCorrecaoData
  },

  async deletar(id: number) {
    await api.delete(`/cartas-correcao/${id}`)
  },
}
