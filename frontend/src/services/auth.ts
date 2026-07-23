import api from '@/lib/api'

export type Perfil = 'comercial' | 'financeiro' | 'ti' | 'admin' | 'franquia' | 'faturamento'

const REDIRECT_MAP: Record<Perfil, string> = {
  comercial: '/comercial',
  financeiro: '/financeiro',
  ti: '/ti',
  admin: '/comercial',
  franquia: '/franquia',
  faturamento: '/faturamento',
}

// Cache em memória — evita ler localStorage em cada requisição
let _tokenCache: string | null = null

export const authService = {
  async login(email: string, senha: string) {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', senha)

    const { data } = await api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    _tokenCache = data.access_token
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('perfil', data.perfil)
    localStorage.setItem('nome', data.nome)
    if (data.franquia_id) {
      localStorage.setItem('franquia_id', String(data.franquia_id))
    } else {
      localStorage.removeItem('franquia_id')
    }

    // Salva cookie para o middleware do Next.js validar no servidor
    document.cookie = `access_token=${data.access_token}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`

    return data
  },

  logout() {
    _tokenCache = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('perfil')
    localStorage.removeItem('nome')
    localStorage.removeItem('franquia_id')
    // Remove cookie
    document.cookie = 'access_token=; path=/; max-age=0'
    window.location.href = '/login'
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null
    if (_tokenCache) return _tokenCache
    _tokenCache = localStorage.getItem('access_token')
    return _tokenCache
  },

  isLoggedIn() {
    if (typeof window === 'undefined') return false
    return !!this.getToken()
  },

  getPerfil(): Perfil {
    if (typeof window === 'undefined') return 'comercial'
    return (localStorage.getItem('perfil') as Perfil) || 'comercial'
  },

  getNome(): string {
    if (typeof window === 'undefined') return 'Usuário'
    return localStorage.getItem('nome') || 'Usuário'
  },

  getFranquiaId(): number | null {
    if (typeof window === 'undefined') return null
    const id = localStorage.getItem('franquia_id')
    return id ? Number(id) : null
  },

  getRedirectPath(): string {
    const perfil = this.getPerfil()
    return REDIRECT_MAP[perfil] || '/comercial'
  },
}
