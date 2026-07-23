'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Trash2, Pencil, X, Users, ShoppingCart, Building2 } from 'lucide-react'
import { usuarioService, UsuarioData } from '@/services/usuarios'
import { vinculoService, VinculoData } from '@/services/vinculo'
import { VinculoModal } from '@/components/vinculo-modal'
import api from '@/lib/api'

interface EmpresaData {
  id: number
  razao_social: string
  nome_fantasia: string | null
  cnpj: string | null
  email: string | null
}

const perfilLabels: Record<string, string> = {
  comercial: 'Comercial',
  faturamento: 'Faturamento',
  financeiro: 'Financeiro',
  ti: 'TI',
  admin: 'Admin',
}

const perfilColors: Record<string, string> = {
  comercial: 'bg-blue-100 text-blue-700',
  faturamento: 'bg-teal-100 text-teal-700',
  financeiro: 'bg-amber-100 text-amber-700',
  ti: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  aberto: 'Reprovado',
  validacao_comercial: 'Aguard. Comercial',
  validacao_financeiro: 'Aguard. Financeiro',
  tarefa_ti: 'Aguard. TI',
  fechado: 'Vinculado',
}

const statusColors: Record<string, string> = {
  aberto: 'bg-red-100 text-red-700',
  validacao_comercial: 'bg-orange-100 text-orange-700',
  validacao_financeiro: 'bg-amber-100 text-amber-700',
  tarefa_ti: 'bg-purple-100 text-purple-700',
  fechado: 'bg-green-100 text-green-700',
}

const formatCnpj = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export default function AdminPage() {
  const queryClient = useQueryClient()

  // ── Usuarios ──────────────────────────────────────────────────────────
  const [buscaUser, setBuscaUser] = useState('')
  const [showFormUser, setShowFormUser] = useState(false)
  const [editUser, setEditUser] = useState<UsuarioData | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formSenha, setFormSenha] = useState('')
  const [formPerfil, setFormPerfil] = useState('comercial')
  const [erroUser, setErroUser] = useState('')

  // ── Franquias ─────────────────────────────────────────────────────────
  const [buscaFranq, setBuscaFranq] = useState('')
  const [showFormFranq, setShowFormFranq] = useState(false)
  const [editFranq, setEditFranq] = useState<EmpresaData | null>(null)
  const [editFranqUserId, setEditFranqUserId] = useState<number | null>(null)
  const [fNome, setFNome] = useState('')
  const [fCnpj, setFCnpj] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fSenha, setFSenha] = useState('')
  const [erroFranq, setErroFranq] = useState('')

  // ── Vinculos ──────────────────────────────────────────────────────────
  const [buscaVinc, setBuscaVinc] = useState('')
  const [selecionado, setSelecionado] = useState<VinculoData | null>(null)

  // ── Queries ───────────────────────────────────────────────────────────
  const { data: todosUsuarios, isLoading: loadingUsers } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuarioService.listar,
  })

  const { data: empresas, isLoading: loadingFranq } = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const res = await api.get('/empresas')
      return res.data as EmpresaData[]
    },
  })

  const { data: vinculos, isLoading: loadingVinc } = useQuery({
    queryKey: ['vinculos'],
    queryFn: () => vinculoService.listar(),
  })

  // Só usuários não-franquia na seção de Usuários
  const usuarios = todosUsuarios?.filter(u => u.perfil !== 'franquia')
  // Usuários franquia para cruzar com empresas
  const usuariosFranquia = todosUsuarios?.filter(u => u.perfil === 'franquia')

  // ── Mutations Usuários ─────────────────────────────────────────────────
  const criarUserMutation = useMutation({
    mutationFn: usuarioService.criar,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['usuarios'] }); resetFormUser() },
    onError: (e: any) => setErroUser(e?.response?.data?.detail || `Erro ${e?.response?.status || 'de rede'}`),
  })

  const atualizarUserMutation = useMutation({
    mutationFn: ({ id, ...payload }: any) => usuarioService.atualizar(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['usuarios'] }); resetFormUser() },
    onError: (e: any) => setErroUser(e?.response?.data?.detail || `Erro ${e?.response?.status || 'de rede'}`),
  })

  const deletarUserMutation = useMutation({
    mutationFn: usuarioService.deletar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  // ── Mutations Franquias ────────────────────────────────────────────────
  const criarFranqMutation = useMutation({
    mutationFn: async (payload: { nome: string; cnpj: string; email: string; senha: string }) => {
      // 1. Cria a empresa
      const { data: empresa } = await api.post('/empresas', {
        razao_social: payload.nome,
        nome_fantasia: payload.nome,
        cnpj: payload.cnpj,
        email: payload.email,
      })
      // 2. Cria o usuário de login vinculado à empresa
      await api.post('/usuarios', {
        nome: payload.nome,
        email: payload.email,
        senha: payload.senha,
        perfil: 'franquia',
        franquia_id: empresa.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      resetFormFranq()
    },
    onError: (e: any) => setErroFranq(e?.response?.data?.detail || `Erro ${e?.response?.status || 'de rede'}`),
  })

  const editarFranqMutation = useMutation({
    mutationFn: async (payload: { id: number; userId: number | null; nome: string; cnpj: string; email: string; senha: string }) => {
      // 1. Atualiza a empresa
      await api.put(`/empresas/${payload.id}`, {
        razao_social: payload.nome,
        nome_fantasia: payload.nome,
        cnpj: payload.cnpj,
        email: payload.email,
      })
      // 2. Atualiza ou cria o usuário vinculado
      if (payload.userId) {
        // Usuário já existe — atualiza
        const updatePayload: any = { email: payload.email, nome: payload.nome }
        if (payload.senha) updatePayload.senha = payload.senha
        await api.put(`/usuarios/${payload.userId}`, updatePayload)
      } else if (payload.senha) {
        // Franquia sem login — cria agora
        await api.post('/usuarios', {
          nome: payload.nome,
          email: payload.email,
          senha: payload.senha,
          perfil: 'franquia',
          franquia_id: payload.id,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      resetFormFranq()
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
      const status = e?.response?.status
      if (status === 504) {
        setErroFranq('Servidor sem resposta (504). Aguarde um momento e tente novamente.')
      } else {
        setErroFranq(detail || `Erro ${status || 'de rede'}: ${e.message || ''}`)
      }
    },
  })

  const deletarFranqMutation = useMutation({
    mutationFn: async (empresa: EmpresaData) => {
      // 1. Deleta o usuário vinculado (se existir)
      const usuarioVinculado = usuariosFranquia?.find(u => u.franquia_id === empresa.id)
      if (usuarioVinculado) {
        await api.delete(`/usuarios/${usuarioVinculado.id}`)
      }
      // 2. Deleta a empresa
      await api.delete(`/empresas/${empresa.id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
    onError: (e: any) => alert(e?.response?.data?.detail || 'Erro ao excluir franquia'),
  })

  const deletarVincMutation = useMutation({
    mutationFn: vinculoService.deletar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vinculos'] }),
  })

  // ── Reset forms ───────────────────────────────────────────────────────
  const resetFormUser = () => {
    setShowFormUser(false); setEditUser(null)
    setFormNome(''); setFormEmail(''); setFormSenha(''); setFormPerfil('comercial'); setErroUser('')
  }

  const resetFormFranq = () => {
    setShowFormFranq(false); setEditFranq(null); setEditFranqUserId(null)
    setFNome(''); setFCnpj(''); setFEmail(''); setFSenha(''); setErroFranq('')
  }

  const openEditUser = (u: UsuarioData) => {
    setEditUser(u); setFormNome(u.nome); setFormEmail(u.email)
    setFormSenha(''); setFormPerfil(u.perfil); setShowFormUser(true); setErroUser('')
  }

  const openEditFranq = (f: EmpresaData) => {
    setEditFranq(f)
    setFNome(f.nome_fantasia || f.razao_social)
    setFCnpj(f.cnpj || '')
    setFEmail(f.email || '')
    setFSenha('')
    // Armazena o ID do usuário vinculado para usar na mutation
    const userVinc = usuariosFranquia?.find(u => u.franquia_id === f.id)
    setEditFranqUserId(userVinc?.id ?? null)
    setShowFormFranq(true); setErroFranq('')
  }

  const handleSubmitUser = () => {
    setErroUser('')
    if (!formNome.trim() || !formEmail.trim()) { setErroUser('Nome e email são obrigatórios'); return }
    if (editUser) {
      const payload: any = { id: editUser.id, nome: formNome, email: formEmail, perfil: formPerfil }
      if (formSenha) payload.senha = formSenha
      atualizarUserMutation.mutate(payload)
    } else {
      if (!formSenha) { setErroUser('Senha é obrigatória'); return }
      criarUserMutation.mutate({ nome: formNome, email: formEmail, senha: formSenha, perfil: formPerfil })
    }
  }

  const handleSubmitFranq = () => {
    setErroFranq('')
    if (!fNome.trim()) { setErroFranq('Nome é obrigatório'); return }
    if (!fCnpj.trim()) { setErroFranq('CNPJ é obrigatório'); return }
    if (!fEmail.trim()) { setErroFranq('E-mail é obrigatório'); return }
    if (!editFranq && !fSenha.trim()) { setErroFranq('Senha é obrigatória'); return }

    if (editFranq) {
      editarFranqMutation.mutate({ id: editFranq.id, userId: editFranqUserId, nome: fNome.trim(), cnpj: fCnpj.trim(), email: fEmail.trim(), senha: fSenha })
    } else {
      criarFranqMutation.mutate({ nome: fNome.trim(), cnpj: fCnpj.trim(), email: fEmail.trim(), senha: fSenha })
    }
  }

  // ── Filtros ───────────────────────────────────────────────────────────
  const filteredUsers = usuarios?.filter(u => {
    if (!buscaUser) return true
    const t = buscaUser.toLowerCase()
    return u.nome.toLowerCase().includes(t) || u.email.toLowerCase().includes(t)
  })

  const filteredFranq = empresas?.filter(f => {
    if (!buscaFranq) return true
    const t = buscaFranq.toLowerCase()
    return (f.nome_fantasia || f.razao_social).toLowerCase().includes(t) ||
      (f.cnpj || '').includes(t) ||
      (f.email || '').toLowerCase().includes(t)
  })

  const filteredVinc = vinculos?.filter(v => {
    if (!buscaVinc) return true
    const t = buscaVinc.toLowerCase()
    return v.numero_pedido.toLowerCase().includes(t) || v.nome_cliente.toLowerCase().includes(t) || v.franquia_nome.toLowerCase().includes(t)
  })

  const inputCls = "border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 w-full"

  return (
    <div className="space-y-6">

      {/* ════════════════ USUARIOS ════════════════ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Usuários do Sistema</h3>
            <span className="text-xs text-slate-400">(Comercial, Financeiro, TI, Admin)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar..." value={buscaUser} onChange={(e) => setBuscaUser(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 w-48"
              />
            </div>
            <button onClick={() => { resetFormUser(); setShowFormUser(true) }}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={14} /> Novo
            </button>
          </div>
        </div>

        {showFormUser && (
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-600">{editUser ? 'Editar Usuário' : 'Novo Usuário'}</p>
              <button onClick={resetFormUser} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <input value={formNome} onChange={(e) => setFormNome(e.target.value)} placeholder="Nome" className={inputCls} />
              <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Email" className={inputCls} />
              <input type="password" value={formSenha} onChange={(e) => setFormSenha(e.target.value)}
                placeholder={editUser ? 'Nova senha (opcional)' : 'Senha'} className={inputCls} />
              <div className="flex gap-2">
                <select value={formPerfil} onChange={(e) => setFormPerfil(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
                  <option value="comercial">Comercial</option>
                  <option value="faturamento">Faturamento</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="ti">TI</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={handleSubmitUser}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium px-4 rounded-lg transition-colors">
                  {editUser ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </div>
            {erroUser && <p className="text-red-500 text-xs mt-2">{erroUser}</p>}
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Nome</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Email</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Perfil</th>
              <th className="text-right px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider w-24">Ações</th>
            </tr>
          </thead>
        </table>
        <div className="max-h-[200px] overflow-y-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-50">
              {loadingUsers && <tr><td colSpan={4} className="px-5 py-6 text-center text-xs text-slate-400">Carregando...</td></tr>}
              {filteredUsers?.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-2.5 font-medium text-slate-800">{u.nome}</td>
                  <td className="px-5 py-2.5 text-slate-600">{u.email}</td>
                  <td className="px-5 py-2.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${perfilColors[u.perfil] || 'bg-slate-100 text-slate-600'}`}>
                      {perfilLabels[u.perfil] || u.perfil}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEditUser(u)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { if (confirm(`Deletar "${u.nome}"?`)) deletarUserMutation.mutate(u.id) }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Deletar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers?.length === 0 && <tr><td colSpan={4} className="px-5 py-6 text-center text-xs text-slate-400">Nenhum usuário encontrado</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-400">{filteredUsers?.length || 0} usuário(s)</p>
        </div>
      </div>

      {/* ════════════════ FRANQUIAS ════════════════ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Franquias</h3>
            <span className="text-xs text-slate-400">(cadastro cria login automático)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar..." value={buscaFranq} onChange={(e) => setBuscaFranq(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 w-48"
              />
            </div>
            <button onClick={() => { resetFormFranq(); setShowFormFranq(true) }}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={14} /> Nova Franquia
            </button>
          </div>
        </div>

        {showFormFranq && (
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-600">{editFranq ? 'Editar Franquia' : 'Nova Franquia'}</p>
              <button onClick={resetFormFranq} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <input value={fNome} onChange={(e) => setFNome(e.target.value)} placeholder="Nome da franquia" className={inputCls} />
              <input value={fCnpj} onChange={(e) => setFCnpj(formatCnpj(e.target.value))} placeholder="00.000.000/0000-00" className={`${inputCls} font-mono`} />
              <input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="E-mail de acesso" className={inputCls} />
              <div className="flex gap-2">
                <input type="password" value={fSenha} onChange={(e) => setFSenha(e.target.value)}
                  placeholder={editFranq ? 'Nova senha (opcional)' : 'Senha de acesso'}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                <button onClick={handleSubmitFranq} disabled={criarFranqMutation.isPending || editarFranqMutation.isPending}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium px-4 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                  {criarFranqMutation.isPending || editarFranqMutation.isPending ? 'Salvando...' : editFranq ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </div>
            {erroFranq && <p className="text-red-500 text-xs mt-2">{erroFranq}</p>}
            {!editFranq && (
              <p className="text-xs text-slate-400 mt-2">
                Ao cadastrar, será criado automaticamente o login para a franquia com o e-mail e senha informados.
              </p>
            )}
            {editFranq && (
              <p className="text-xs text-slate-400 mt-2">
                {editFranqUserId
                  ? 'Deixe a senha em branco para não alterar. O e-mail de acesso também será atualizado.'
                  : 'Esta franquia não tem login cadastrado. Informe uma senha para criar o acesso agora.'}
              </p>
            )}
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Nome</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">CNPJ</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">E-mail / Login</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Acesso</th>
              <th className="text-right px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider w-24">Ações</th>
            </tr>
          </thead>
        </table>
        <div className="max-h-[220px] overflow-y-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-50">
              {loadingFranq && <tr><td colSpan={5} className="px-5 py-6 text-center text-xs text-slate-400">Carregando...</td></tr>}
              {filteredFranq?.map(f => {
                const userVinculado = usuariosFranquia?.find(u => u.franquia_id === f.id)
                return (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-2.5 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center text-xs font-bold text-green-700 shrink-0">
                          {(f.nome_fantasia || f.razao_social).charAt(0).toUpperCase()}
                        </div>
                        {f.nome_fantasia || f.razao_social}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-slate-500 text-xs font-mono">{f.cnpj || '—'}</td>
                    <td className="px-5 py-2.5 text-slate-600 text-xs">{f.email || '—'}</td>
                    <td className="px-5 py-2.5">
                      {userVinculado ? (
                        <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                          Login ativo
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                          Sem login
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditFranq(f)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir a franquia "${f.nome_fantasia || f.razao_social}" e seu acesso ao sistema?`))
                              deletarFranqMutation.mutate(f)
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredFranq?.length === 0 && <tr><td colSpan={5} className="px-5 py-6 text-center text-xs text-slate-400">Nenhuma franquia encontrada</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-400">{filteredFranq?.length || 0} franquia(s)</p>
        </div>
      </div>

      {/* ════════════════ VINCULOS ════════════════ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Vínculos</h3>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar pedido..." value={buscaVinc} onChange={(e) => setBuscaVinc(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 w-48"
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">N. Pedido</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Franquia</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Cliente</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Valor</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Status</th>
              <th className="text-right px-5 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider w-20">Ações</th>
            </tr>
          </thead>
        </table>
        <div className="max-h-[230px] overflow-y-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-50">
              {loadingVinc && <tr><td colSpan={6} className="px-5 py-6 text-center text-xs text-slate-400">Carregando...</td></tr>}
              {filteredVinc?.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-2.5 font-medium text-slate-800 cursor-pointer hover:text-blue-600" onClick={() => setSelecionado(v)}>
                    {v.numero_pedido}
                  </td>
                  <td className="px-5 py-2.5 text-slate-600">{v.franquia_nome}</td>
                  <td className="px-5 py-2.5 text-slate-600">{v.nome_cliente}</td>
                  <td className="px-5 py-2.5 text-slate-600">
                    R$ {Number(v.valor_pedido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[v.status] || 'bg-slate-100 text-slate-600'}`}>
                      {statusLabels[v.status] || v.status}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      onClick={() => { if (confirm(`Deletar pedido "${v.numero_pedido}"?`)) deletarVincMutation.mutate(v.id) }}
                      disabled={v.status === 'fechado'}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                      title={v.status === 'fechado' ? 'Pedidos vinculados não podem ser excluídos' : 'Deletar'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredVinc?.length === 0 && <tr><td colSpan={6} className="px-5 py-6 text-center text-xs text-slate-400">Nenhum vínculo encontrado</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-400">{filteredVinc?.length || 0} registro(s)</p>
        </div>
      </div>

      {selecionado && (
        <VinculoModal vinculo={selecionado} onClose={() => setSelecionado(null)} modo="visualizar" />
      )}
    </div>
  )
}
