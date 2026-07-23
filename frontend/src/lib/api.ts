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

// Redireciona para login em 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
