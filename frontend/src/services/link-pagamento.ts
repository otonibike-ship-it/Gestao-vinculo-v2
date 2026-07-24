import api from '@/lib/api'

export interface LinkPagamentoData {
  id: number
  franquia_id: number
  franquia_nome: string
  motivo: string
  numero_pedido: string
  data_pedido: string
  valor_pedido: number
  valor_link: number
  quantidade_parcelas: number
  codigo_produto: string
  modelo: string
  vendedor: string
  nome_cliente: string
  cpf: string
  email: string
  endereco: string
  telefone: string
  status: 'aberto' | 'aguardando_comercial' | 'aguardando_faturamento' | 'aguardando_financeiro' | 'aguardando_ti' | 'fechado'
  anexos: string[]
  observacao_comercial: string | null
  justificativa_reprovacao: string | null
  destino_reprovacao: string | null
  criado_em: string
  atualizado_em: string
}

export interface LinkPagamentoCreatePayload {
  franquia_id: number
  motivo: string
  numero_pedido: string
  data_pedido: string
  valor_pedido: number
  valor_link: number
  quantidade_parcelas: number
  codigo_produto: string
  modelo: string
  vendedor: string
  nome_cliente: string
  cpf: string
  email: string
  endereco: string
  telefone: string
  anexos?: string[]
}

export const linkPagamentoService = {
  async listar(status?: string, franquia_id?: number) {
    const params: Record<string, string | number> = {}
    if (status) params.status = status
    if (franquia_id) params.franquia_id = franquia_id
    const { data } = await api.get('/links-pagamento', { params })
    return data as LinkPagamentoData[]
  },

  async obter(id: number) {
    const { data } = await api.get(`/links-pagamento/${id}`)
    return data as LinkPagamentoData
  },

  async criar(payload: LinkPagamentoCreatePayload) {
    const { data } = await api.post('/links-pagamento', payload)
    return data as LinkPagamentoData
  },

  async aprovar(id: number, opts: { destino?: string; observacao?: string; anexos?: string[] } = {}) {
    const { data } = await api.put(`/links-pagamento/${id}/aprovar`, opts)
    return data as LinkPagamentoData
  },

  async reprovar(id: number, justificativa: string) {
    const { data } = await api.put(`/links-pagamento/${id}/reprovar`, { justificativa })
    return data as LinkPagamentoData
  },

  async reenviar(id: number, payload: LinkPagamentoCreatePayload) {
    const { data } = await api.put(`/links-pagamento/${id}/reenviar`, payload)
    return data as LinkPagamentoData
  },

  async deletar(id: number) {
    await api.delete(`/links-pagamento/${id}`)
  },
}
