import api from '@/lib/api'

export interface TrocaPedidoData {
  id: number
  franquia_id: number
  franquia_nome: string
  motivo: string
  motivo_detalhado: string | null
  nome_vendedor: string
  numero_pedido_cancelar: string
  data_pedido_cancelar: string
  codigo_produto_cancelar: string
  descricao_pedido_cancelar: string
  numero_novo_pedido: string
  codigo_produto_novo: string
  descricao_novo_pedido: string
  status_portal: string
  nome_cliente: string | null
  cpf: string | null
  valor_novo_pedido: number | null
  valor_pago_cliente: number | null
  status: 'aberto' | 'aguardando_comercial' | 'aguardando_faturamento' | 'aguardando_financeiro' | 'aguardando_ti' | 'fechado'
  anexos: string[]
  observacao_comercial: string | null
  observacao_faturamento: string | null
  justificativa_reprovacao: string | null
  destino_reprovacao: string | null
  historico_observacoes: { area: string; texto: string; tipo: 'aprovacao' | 'reprovacao'; data: string }[]
  criado_em: string
  atualizado_em: string
}

export interface TrocaPedidoCreatePayload {
  franquia_id: number
  motivo: string
  motivo_detalhado: string
  nome_vendedor: string
  numero_pedido_cancelar: string
  data_pedido_cancelar: string
  codigo_produto_cancelar: string
  descricao_pedido_cancelar: string
  numero_novo_pedido: string
  codigo_produto_novo: string
  descricao_novo_pedido: string
  status_portal: string
  nome_cliente: string
  cpf: string
  valor_novo_pedido: number
  valor_pago_cliente: number
  anexos?: string[]
}

export const trocaPedidoService = {
  async listar(status?: string, franquia_id?: number) {
    const params: Record<string, string | number> = {}
    if (status) params.status = status
    if (franquia_id) params.franquia_id = franquia_id
    const { data } = await api.get('/trocas-pedido', { params })
    return data as TrocaPedidoData[]
  },

  async obter(id: number) {
    const { data } = await api.get(`/trocas-pedido/${id}`)
    return data as TrocaPedidoData
  },

  async criar(payload: TrocaPedidoCreatePayload) {
    const { data } = await api.post('/trocas-pedido', payload)
    return data as TrocaPedidoData
  },

  async aprovar(id: number, opts: { observacao?: string; anexos?: string[]; destino?: string } = {}) {
    const { data } = await api.put(`/trocas-pedido/${id}/aprovar`, opts)
    return data as TrocaPedidoData
  },

  async reprovar(id: number, justificativa?: string, destino?: string) {
    const { data } = await api.put(`/trocas-pedido/${id}/reprovar`, { justificativa, destino })
    return data as TrocaPedidoData
  },

  async reenviar(id: number, payload: TrocaPedidoCreatePayload) {
    const { data } = await api.put(`/trocas-pedido/${id}/reenviar`, payload)
    return data as TrocaPedidoData
  },

  async deletar(id: number) {
    await api.delete(`/trocas-pedido/${id}`)
  },
}
