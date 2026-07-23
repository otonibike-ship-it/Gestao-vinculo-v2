'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Search, Plus, X, Pencil, Trash2, Upload, Download, CheckCircle, AlertTriangle } from 'lucide-react'
import api from '@/lib/api'

interface FranquiaData {
  id: number
  razao_social: string
  cnpj: string
  email: string | null
  nome_fantasia: string | null
  criado_em: string
}

interface ImportResult {
  criados: number
  ignorados: number
  erros: number
  detalhes_erros: { linha: number; cnpj?: string; motivo: string }[]
  cnpjs_ignorados: string[]
}

export default function EmpresasPage() {
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<FranquiaData | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importando, setImportando] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [formNome, setFormNome] = useState('')
  const [formCnpj, setFormCnpj] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [erro, setErro] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const res = await api.get('/empresas')
      return res.data as FranquiaData[]
    },
  })

  const criarMutation = useMutation({
    mutationFn: (payload: { razao_social: string; cnpj: string; email?: string }) =>
      api.post('/empresas', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      resetForm()
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
      const status = e?.response?.status
      setErro(detail || (status ? `Erro ${status}` : 'Erro ao salvar'))
    },
  })

  const atualizarMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number; razao_social: string; nome_fantasia: string; cnpj: string; email?: string }) =>
      api.put(`/empresas/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      resetForm()
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
      const httpStatus = e?.response?.status
      setErro(detail || (httpStatus ? `Erro ${httpStatus}: ${e.message}` : `Erro de rede: ${e.message}`))
    },
  })

  const deletarMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/empresas/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['empresas'] }),
  })

  const resetForm = () => {
    setShowForm(false)
    setEditando(null)
    setFormNome('')
    setFormCnpj('')
    setFormEmail('')
    setErro('')
  }

  const abrirEdicao = (f: FranquiaData) => {
    setEditando(f)
    setFormNome(f.nome_fantasia || f.razao_social)
    setFormCnpj(f.cnpj)
    setFormEmail(f.email || '')
    setErro('')
    setShowForm(true)
  }

  const handleSubmit = () => {
    setErro('')
    if (!formNome.trim()) { setErro('Nome é obrigatório'); return }
    if (!formCnpj.trim()) { setErro('CNPJ é obrigatório'); return }

    const payload = {
      razao_social: formNome.trim(),
      nome_fantasia: formNome.trim(),
      cnpj: formCnpj.trim(),
      email: formEmail.trim() || undefined,
    }

    if (editando) {
      atualizarMutation.mutate({ id: editando.id, ...payload })
    } else {
      criarMutation.mutate(payload)
    }
  }

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14)
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }

  const handleImportarCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImportando(true)
    setImportResult(null)
    try {
      const form = new FormData()
      form.append('arquivo', file)
      const { data: result } = await api.post('/empresas/importar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportResult(result as ImportResult)
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      setImportResult({ criados: 0, ignorados: 0, erros: 1, detalhes_erros: [{ linha: 0, motivo: detail || 'Erro ao processar arquivo' }], cnpjs_ignorados: [] })
    } finally {
      setImportando(false)
    }
  }

  const baixarModelo = () => {
    const conteudo = 'nome,cnpj,email,telefone\nSenseBike Exemplo,00.000.000/0001-00,contato@franquia.com.br,(11) 99999-0000'
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo_franquias.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtrados = data?.filter((f) => {
    if (!busca) return true
    const t = busca.toLowerCase()
    return (
      (f.nome_fantasia || f.razao_social).toLowerCase().includes(t) ||
      f.cnpj.includes(t) ||
      f.email?.toLowerCase().includes(t)
    )
  })

  const salvando = criarMutation.isPending || atualizarMutation.isPending

  return (
    <div className="space-y-4">
      {/* Barra de ações */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-xs flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar franquia..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={baixarModelo}
            className="flex items-center gap-2 text-slate-600 border border-slate-200 hover:bg-slate-50 text-sm font-medium px-3 py-2.5 rounded-lg transition-colors"
            title="Baixar modelo CSV"
          >
            <Download size={16} />
            Modelo CSV
          </button>
          <button
            onClick={() => csvInputRef.current?.click()}
            disabled={importando}
            className="flex items-center gap-2 text-slate-700 border border-slate-300 hover:bg-slate-50 text-sm font-medium px-3 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Upload size={16} />
            {importando ? 'Importando...' : 'Importar CSV'}
          </button>
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportarCsv} />
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Nova Franquia
          </button>
        </div>
      </div>

      {/* Resultado da importação */}
      {importResult && (
        <div className={`rounded-xl border px-5 py-4 ${importResult.erros > 0 && importResult.criados === 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {importResult.criados > 0 || importResult.ignorados > 0
                ? <CheckCircle size={18} className="text-green-600 shrink-0" />
                : <AlertTriangle size={18} className="text-red-500 shrink-0" />
              }
              <div>
                <p className="text-sm font-semibold text-slate-800">Resultado da importação</p>
                <p className="text-sm text-slate-600 mt-0.5">
                  <span className="text-green-700 font-medium">{importResult.criados} criada(s)</span>
                  {importResult.ignorados > 0 && <span className="text-slate-500"> · {importResult.ignorados} ignorada(s) (CNPJ já existe)</span>}
                  {importResult.erros > 0 && <span className="text-red-600"> · {importResult.erros} erro(s)</span>}
                </p>
                {importResult.detalhes_erros.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {importResult.detalhes_erros.map((e, i) => (
                      <li key={i} className="text-xs text-red-600">
                        {e.linha > 0 ? `Linha ${e.linha}: ` : ''}{e.motivo}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <button onClick={() => setImportResult(null)} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Formulário inline */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-700">
              {editando ? 'Editar Franquia' : 'Nova Franquia'}
            </p>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Nome <span className="text-red-400">*</span>
              </label>
              <input
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Nome da franquia"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                CNPJ <span className="text-red-400">*</span>
              </label>
              <input
                value={formCnpj}
                onChange={(e) => setFormCnpj(formatCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="contato@franquia.com.br"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
              />
            </div>
          </div>

          {erro && <p className="text-red-500 text-xs mt-3">{erro}</p>}

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={salvando}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </div>
      )}

      {/* Estado de carregamento */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-sm text-slate-400">
          Carregando...
        </div>
      )}

      {/* Lista vazia */}
      {!isLoading && filtrados && filtrados.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Building2 size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhuma franquia encontrada</p>
        </div>
      )}

      {/* Tabela */}
      {filtrados && filtrados.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Nome</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">CNPJ</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">E-mail</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Cadastro</th>
                <th className="text-right px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-xs font-bold text-amber-600 shrink-0">
                        {(f.nome_fantasia || f.razao_social).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800">{f.nome_fantasia || f.razao_social}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500 font-mono text-xs">{f.cnpj}</td>
                  <td className="px-5 py-3 text-slate-500">{f.email || '—'}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    {f.criado_em ? new Date(f.criado_em).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => abrirEdicao(f)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir a franquia "${f.nome_fantasia || f.razao_social}"?`))
                            deletarMutation.mutate(f.id)
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">{filtrados.length} franquia(s)</p>
          </div>
        </div>
      )}
    </div>
  )
}
