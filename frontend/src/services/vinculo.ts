import api from '@/lib/api'

export interface VinculoData {
  id: number
  numero_pedido: string
  franquia_id: number
  franquia_nome: string
  nome_cliente: string
  cpf: string | null
  valor_pedido: number
  data_pedido: string
  motivo: string | null
  necessario_validacao: boolean
  quantidade_cupons: number | null
  cupons: { valor: number }[] | null
  status: 'aberto' | 'validacao_comercial' | 'validacao_financeiro' | 'tarefa_ti' | 'fechado'
  anexos: string[]
  justificativa_reprovacao: string | null
  destino_reprovacao: string | null
  criado_em: string
  atualizado_em: string
}

export interface VinculoCreatePayload {
  numero_pedido: string
  franquia_id: number
  nome_cliente: string
  cpf?: string
  valor_pedido: number
  data_pedido: string
  motivo?: string
  necessario_validacao: boolean
  quantidade_cupons?: number
  cupons?: { valor: number }[]
  anexos?: string[]
}

export const vinculoService = {
  async listar(status?: string, franquia_id?: number) {
    const params: Record<string, string | number> = {}
    if (status) params.status = status
    if (franquia_id) params.franquia_id = franquia_id
    const { data } = await api.get('/vinculos', { params })
    return data as VinculoData[]
  },

  async obter(id: number) {
    const { data } = await api.get(`/vinculos/${id}`)
    return data as VinculoData
  },

  async criar(payload: VinculoCreatePayload) {
    const { data } = await api.post('/vinculos', payload)
    return data as VinculoData
  },

  async aprovar(id: number, anexos: string[] = [], necessario_financeiro?: boolean) {
    const { data } = await api.put(`/vinculos/${id}/aprovar`, { anexos, necessario_financeiro })
    return data as VinculoData
  },

  async reprovar(id: number, justificativa: string, destino: string = 'franquia') {
    const { data } = await api.put(`/vinculos/${id}/reprovar`, { justificativa, destino })
    return data as VinculoData
  },

  async reenviar(id: number, payload: Omit<VinculoCreatePayload, 'numero_pedido'>) {
    const { data } = await api.put(`/vinculos/${id}/reenviar`, payload)
    return data as VinculoData
  },

  async deletar(id: number) {
    await api.delete(`/vinculos/${id}`)
  },
}

const CLOUDINARY_CLOUD_NAME = 'dbzpohsfm'
const CLOUDINARY_UPLOAD_PRESET = 'gestao-vinculo'

export const uploadService = {
  async upload(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    formData.append('folder', 'gestao-vinculo')

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
      { method: 'POST', body: formData }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `Cloudinary error ${res.status}`)
    }

    const data = await res.json()
    return { filename: data.public_id as string, url: data.secure_url as string }
  },
}
