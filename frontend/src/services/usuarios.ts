import api from '@/lib/api'

export interface UsuarioData {
  id: number
  nome: string
  email: string
  perfil: string
  franquia_id: number | null
  ativo: boolean
}

export interface UsuarioCreatePayload {
  nome: string
  email: string
  senha: string
  perfil: string
  franquia_id?: number | null
}

export interface UsuarioUpdatePayload {
  nome?: string
  email?: string
  senha?: string
  perfil?: string
  franquia_id?: number | null
}

export const usuarioService = {
  async listar() {
    const { data } = await api.get('/usuarios')
    return data as UsuarioData[]
  },

  async criar(payload: UsuarioCreatePayload) {
    const { data } = await api.post('/usuarios', payload)
    return data as UsuarioData
  },

  async atualizar(id: number, payload: UsuarioUpdatePayload) {
    const { data } = await api.put(`/usuarios/${id}`, payload)
    return data as UsuarioData
  },

  async deletar(id: number) {
    await api.delete(`/usuarios/${id}`)
  },
}
