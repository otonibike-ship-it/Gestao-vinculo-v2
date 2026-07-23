'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Mail, Send, Save, Eye, EyeOff, CheckCircle, AlertTriangle, Globe } from 'lucide-react'
import api from '@/lib/api'

const TEMPLATES = [
  { chave: 'tpl_novo_pedido', label: 'Novo pedido criado (→ Comercial)', vars: '{numero_pedido}, {nome_cliente}, {franquia_nome}' },
  { chave: 'tpl_aprovado_financeiro', label: 'Aprovado pelo Comercial → Financeiro', vars: '{numero_pedido}, {nome_cliente}, {franquia_nome}' },
  { chave: 'tpl_aprovado_ti', label: 'Aprovado → TI', vars: '{numero_pedido}, {nome_cliente}, {franquia_nome}' },
  { chave: 'tpl_reprovado', label: 'Pedido reprovado (Comercial ou Franquia)', vars: '{numero_pedido}, {motivo}' },
  { chave: 'tpl_vinculado', label: 'Pedido vinculado (→ Franquia)', vars: '{numero_pedido}, {nome_cliente}' },
  { chave: 'tpl_reset_senha', label: 'Esqueci minha senha (link enviado ao usuário)', vars: '{nome}, {link}' },
  { chave: 'tpl_novo_pedido_troca', label: 'Nova troca de pedido criada (→ Comercial)', vars: '{numero_pedido_cancelar}, {nome_vendedor}, {franquia_nome}' },
  { chave: 'tpl_triagem_troca', label: 'Troca de pedido roteada (→ Faturamento/Financeiro/TI)', vars: '{numero_pedido_cancelar}, {nome_vendedor}, {franquia_nome}' },
  { chave: 'tpl_concluido_troca', label: 'Troca de pedido concluída (→ Franquia)', vars: '{numero_pedido_cancelar}, {nome_vendedor}' },
]

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient()
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [emailTeste, setEmailTeste] = useState('')
  const [testeStatus, setTesteStatus] = useState<'idle' | 'ok' | 'erro'>('idle')
  const [testeMensagem, setTesteMensagem] = useState('')
  const [salvou, setSalvou] = useState(false)

  const { data: cfg, isLoading } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: async () => {
      const res = await api.get('/configuracoes')
      return res.data as Record<string, string>
    },
  })

  const [form, setForm] = useState<Record<string, string>>({})

  const valores = { ...cfg, ...form }
  const set = (chave: string, valor: string) => setForm(prev => ({ ...prev, [chave]: valor }))

  const salvarMutation = useMutation({
    mutationFn: async () => {
      await api.put('/configuracoes', { valores: form })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes'] })
      setForm({})
      setSalvou(true)
      setTimeout(() => setSalvou(false), 3000)
    },
  })

  const handleTestar = async () => {
    if (!emailTeste.trim()) return
    setTesteStatus('idle')
    try {
      const res = await api.post('/configuracoes/testar-email', { destinatario: emailTeste })
      setTesteStatus('ok')
      setTesteMensagem(res.data.mensagem)
    } catch (e: any) {
      setTesteStatus('erro')
      setTesteMensagem(e?.response?.data?.detail || 'Falha ao enviar')
    }
  }

  const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-teal/60 transition-all"
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
  const sectionClass = "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"

  if (isLoading) return <div className="text-sm text-slate-400 p-8">Carregando...</div>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings size={20} className="text-slate-600" />
        <div>
          <h2 className="text-base font-semibold text-slate-800">Configurações</h2>
          <p className="text-xs text-slate-400">Sistema, SMTP e templates de notificação por e-mail</p>
        </div>
      </div>

      {/* Sistema */}
      <div className={sectionClass}>
        <div className="px-5 py-3.5 border-b border-slate-100 bg-brand-mist flex items-center gap-2">
          <Globe size={15} className="text-slate-500" />
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Sistema</p>
        </div>
        <div className="px-5 py-5">
          <div>
            <label className={labelClass}>URL do sistema</label>
            <p className="text-[11px] text-slate-400 mb-1.5">
              Usada nos links enviados por e-mail (ex: link de redefinição de senha). Sem barra no final.
            </p>
            <input
              className={inputClass}
              placeholder="https://gestao.sensebike.com.br"
              value={valores.app_url || ''}
              onChange={e => set('app_url', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* SMTP */}
      <div className={sectionClass}>
        <div className="px-5 py-3.5 border-b border-slate-100 bg-brand-mist flex items-center gap-2">
          <Mail size={15} className="text-slate-500" />
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Configuração Gmail (SMTP)</p>
        </div>
        <div className="px-5 py-5 grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Host SMTP</label>
            <input className={inputClass} value={valores.smtp_host || ''} onChange={e => set('smtp_host', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Porta</label>
            <input className={inputClass} value={valores.smtp_port || ''} onChange={e => set('smtp_port', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Usuário (Gmail)</label>
            <input className={inputClass} value={valores.smtp_user || ''} onChange={e => set('smtp_user', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Senha de App</label>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                className={inputClass + ' pr-10'}
                value={valores.smtp_password || ''}
                onChange={e => set('smtp_password', e.target.value)}
              />
              <button type="button" onClick={() => setMostrarSenha(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Testar email */}
          <div className="col-span-2">
            <label className={labelClass}>Testar envio</label>
            <div className="flex gap-2">
              <input
                className={inputClass}
                placeholder="email@destino.com.br"
                value={emailTeste}
                onChange={e => setEmailTeste(e.target.value)}
              />
              <button
                type="button"
                onClick={handleTestar}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-pine hover:bg-brand-forest text-white text-sm font-medium rounded-lg transition-colors shrink-0"
              >
                <Send size={14} />
                Testar
              </button>
            </div>
            {testeStatus === 'ok' && (
              <p className="mt-2 text-xs text-brand-pine flex items-center gap-1"><CheckCircle size={13} />{testeMensagem}</p>
            )}
            {testeStatus === 'erro' && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={13} />{testeMensagem}</p>
            )}
          </div>
        </div>
      </div>

      {/* Destinatários */}
      <div className={sectionClass}>
        <div className="px-5 py-3.5 border-b border-slate-100 bg-brand-mist flex items-center gap-2">
          <Mail size={15} className="text-slate-500" />
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Destinatários</p>
        </div>
        <div className="px-5 py-5 grid grid-cols-1 gap-4">
          {[
            { chave: 'email_comercial', label: 'Email Comercial' },
            { chave: 'email_faturamento', label: 'Email Faturamento' },
            { chave: 'email_financeiro', label: 'Email Financeiro' },
            { chave: 'email_ti', label: 'Email TI' },
          ].map(({ chave, label }) => (
            <div key={chave}>
              <label className={labelClass}>{label}</label>
              <input
                type="email"
                className={inputClass}
                value={valores[chave] || ''}
                onChange={e => set(chave, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Templates */}
      <div className={sectionClass}>
        <div className="px-5 py-3.5 border-b border-slate-100 bg-brand-mist flex items-center gap-2">
          <Mail size={15} className="text-slate-500" />
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Templates de Email</p>
        </div>
        <div className="px-5 py-5 space-y-5">
          {TEMPLATES.map(({ chave, label, vars }) => (
            <div key={chave}>
              <label className={labelClass}>{label}</label>
              <p className="text-[11px] text-slate-400 mb-1.5">Variáveis disponíveis: <code className="bg-slate-100 px-1 rounded">{vars}</code></p>
              <textarea
                rows={2}
                className={inputClass + ' resize-none'}
                value={valores[chave] || ''}
                onChange={e => set(chave, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Salvar */}
      <div className="flex justify-end gap-3">
        {salvou && (
          <span className="flex items-center gap-1.5 text-sm text-brand-pine">
            <CheckCircle size={15} /> Configurações salvas
          </span>
        )}
        <button
          onClick={() => salvarMutation.mutate()}
          disabled={salvarMutation.isPending || Object.keys(form).length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-pine hover:bg-brand-forest text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Save size={15} />
          {salvarMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}
