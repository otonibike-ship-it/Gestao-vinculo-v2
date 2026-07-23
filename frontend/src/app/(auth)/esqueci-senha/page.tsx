'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import api from '@/lib/api'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setErro('Informe seu e-mail'); return }
    setErro('')
    setEnviando(true)
    try {
      await api.post('/auth/esqueci-senha', { email: email.trim() })
      setEnviado(true)
    } catch {
      setErro('Não foi possível processar a solicitação. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10">
          {enviado ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={28} className="text-green-600" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-800">E-mail enviado!</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Se o endereço <span className="font-medium text-slate-700">{email}</span> estiver cadastrado,
                você receberá um link para redefinir sua senha em breve.
              </p>
              <p className="text-xs text-slate-400">Verifique também a caixa de spam.</p>
              <Link
                href="/login"
                className="inline-block mt-2 text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors"
              >
                ← Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-6">
                  <ArrowLeft size={14} />
                  Voltar para o login
                </Link>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Esqueci minha senha</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Informe seu e-mail e enviaremos um link para criar uma nova senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400 transition-all"
                      placeholder="seu.email@sensebike.com.br"
                      autoFocus
                    />
                  </div>
                </div>

                {erro && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl text-center">
                    {erro}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold py-3.5 px-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-lg shadow-slate-300/30 disabled:opacity-60"
                >
                  {enviando ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
