'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authService } from '@/services/auth'

const loginSchema = z.object({
  email: z.string().email('E-mail invalido'),
  senha: z.string().min(6, 'Minimo 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

const dashboards = [
  { perfil: 'Comercial', cor: 'bg-brand-pine/10 text-brand-pine border-brand-pine/20' },
  { perfil: 'Faturamento', cor: 'bg-brand-teal/15 text-brand-forest border-brand-teal/30' },
  { perfil: 'Financeiro', cor: 'bg-brand-khaki/15 text-brand-umber border-brand-khaki/30' },
  { perfil: 'TI', cor: 'bg-brand-olive/15 text-brand-forest border-brand-olive/30' },
]

export default function LoginPage() {
  const router = useRouter()
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setCarregando(true)
    setErro('')
    try {
      await authService.login(data.email, data.senha)
      router.push(authService.getRedirectPath())
    } catch {
      setErro('E-mail ou senha invalidos.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-forest via-brand-forest to-black">
      {/* Logo SenseBike */}
      <div className="mb-6 w-full max-w-md px-4">
        <img src="/logo.png" alt="SenseBike" className="w-full h-auto" />
      </div>

      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10">
          {/* Titulo */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Gestao de Vinculos
            </h1>
            <p className="text-sm text-slate-400 mt-1">SenseBike</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* E-mail */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                E-mail
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 focus:border-brand-teal transition-all"
                placeholder="seu.email@sensebike.com.br"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Senha
              </label>
              <input
                type="password"
                {...register('senha')}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 focus:border-brand-teal transition-all"
                placeholder="Digite sua senha"
              />
              {errors.senha && <p className="text-red-500 text-xs mt-1.5">{errors.senha.message}</p>}
            </div>

            {/* Esqueci a senha */}
            <div className="text-right -mt-2">
              <Link href="/esqueci-senha" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                Esqueci minha senha
              </Link>
            </div>

            {/* Erro */}
            {erro && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl text-center">
                {erro}
              </div>
            )}

            {/* Botao */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-gradient-to-r from-brand-pine to-brand-forest hover:from-brand-forest hover:to-brand-forest text-white font-semibold py-3.5 px-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-lg shadow-brand-pine/30 disabled:opacity-60"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Dashboards disponiveis */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center mb-3">Dashboards</p>
            <div className="grid grid-cols-2 gap-2">
              {dashboards.map((d) => (
                <div
                  key={d.perfil}
                  className={`px-3 py-2 rounded-lg border text-center ${d.cor}`}
                >
                  <p className="text-xs font-semibold">{d.perfil}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
