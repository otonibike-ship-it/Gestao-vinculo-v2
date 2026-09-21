import axios from 'axios'
import { authService } from '@/services/auth'

const api = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL || '') + '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Injeta o token usando cache em memória (não lê localStorage a cada requisição)
api.interceptors.request.use((config) => {
  const token = authService.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Sessão expirada (401) volta para o login — exceto quando o 401 é a própria resposta de
// uma chamada de autenticação (senha errada no login), senão a página recarrega e a
// mensagem de erro some em ~1s.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const urlDaChamada: string = error.config?.url || ''
    const chamadaDeAuth = urlDaChamada.startsWith('/auth/')
    if (error.response?.status === 401 && typeof window !== 'undefined' && !chamadaDeAuth) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
