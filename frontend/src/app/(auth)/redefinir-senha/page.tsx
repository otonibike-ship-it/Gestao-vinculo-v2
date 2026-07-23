'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react'
import api from '@/lib/api'

function RedefinirSenhaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!token) setErro('Link inválido. Solicite um novo link de redefinição.')
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (novaSenha.length < 6) { setErro('A senha deve ter no mínimo 6 caracteres'); return }
    if (novaSenha !== confirmar) { setErro('As senhas não conferem'); return }

    setSalvando(true)
    try {
      await api.post('/auth/redefinir-senha', { token, nova_senha: novaSenha })
      setSucesso(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      setErro(detail || 'Não foi possível redefinir a senha. O link pode ter expirado.')
    } finally {
      setSalvando(false)
    }
  }

  if (sucesso) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle size={28} className="text-green-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Senha redefinida!</h2>
        <p className="text-sm text-slate-500">
          Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes.
        </p>
        <Link href="/login" className="inline-block text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors">
          Ir para o login agora →
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Nova senha</h1>
        <p className="text-sm text-slate-400 mt-1">Escolha uma senha segura para sua conta.</p>
      </div>

      {!token ? (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Link inválido</p>
            <p className="text-sm text-red-600 mt-0.5">
              Este link não é válido.{' '}
              <Link href="/esqueci-senha" className="underline">Solicite um novo link.</Link>
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Nova senha
            </label>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                className="w-full pr-11 pl-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400 transition-all"
                placeholder="Mínimo 6 caracteres"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Confirmar nova senha
            </label>
            <input
              type={mostrarSenha ? 'text' : 'password'}
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400 transition-all"
              placeholder="Repita a senha"
            />
          </div>

          {confirmar && novaSenha !== confirmar && (
            <p className="text-xs text-red-500">As senhas não conferem</p>
          )}

          {erro && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={salvando || novaSenha.length < 6 || novaSenha !== confirmar}
            className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold py-3.5 px-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-lg shadow-slate-300/30 disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </form>
      )}
    </>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10">
          <Suspense fallback={<div className="text-center text-sm text-slate-400">Carregando...</div>}>
            <RedefinirSenhaForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
