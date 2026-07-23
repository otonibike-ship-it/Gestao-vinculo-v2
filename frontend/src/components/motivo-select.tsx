'use client'

const MOTIVOS = [
  {
    grupo: 'A. Pagamento realizado fora do pedido',
    opcoes: [
      'Pagamento feito direto na maquina (Cielo/LIO)',
      'Pagamento avulso (sem abrir pedido no portal)',
      'Pagamento manual por necessidade operacional',
    ],
  },
  {
    grupo: 'B. Problemas com a maquininha (Cielo / LIO / POS / Crediario)',
    opcoes: [
      'Maquina travou / nao ligou',
      'Falha de comunicacao / PIN PAD',
      'Nao puxou o pedido automaticamente',
      'PIX via QR code nao baixou no pedido',
    ],
  },
  {
    grupo: 'C. Problemas no sistema / portal',
    opcoes: [
      'Pedido nao apareceu no portal',
      'Sistema fora do ar / instabilidade',
      'Pedido ficou travado em "processando pagamento"',
      'Erro no portal (PPS, duplicidade, pedido sumiu)',
    ],
  },
  {
    grupo: 'D. Cupom / Desconto',
    opcoes: [
      'Cupom nao aplicado',
      'Cupom nao disponivel no momento da venda',
      'Valor divergente do portal x desconto do cupom',
      'Venda em Sense Day / campanhas com instabilidade',
    ],
  },
  {
    grupo: 'E. Estoque / Transferencia',
    opcoes: [
      'Bike nao constava no estoque digital',
      'Bike estava em outra loja / transferencia pendente',
      'Bike em transito',
      'Venda antes da conclusao da transferencia',
    ],
  },
  {
    grupo: 'F. Troca de pedido / modelo / cor / tamanho',
    opcoes: [
      'Erro no modelo ou cor',
      'Troca de tamanho apos pagamento',
      'Erro no cadastro (nome / dados / sku / cor)',
    ],
  },
  {
    grupo: 'G. Pagamento parcial / multiplas formas',
    opcoes: [
      'Entrada (sinal) + complemento posterior',
      'PIX + cartao de credito',
      'Diversos cartoes / pagamentos fracionados',
    ],
  },
  {
    grupo: 'H. Forma de pagamento alternativa',
    opcoes: [
      'Pagamento via TED',
      'Pagamento via deposito',
      'Pagamento em dinheiro',
      'Link de pagamento utilizado ao inves do pedido',
    ],
  },
  {
    grupo: 'I. Cancelamento e Refacao de pedido',
    opcoes: [
      'Pedido foi cancelado e refeita a cobranca',
      'Necessidade de gerar novo pedido apos pagamento',
    ],
  },
  {
    grupo: 'J. Cliente nao estava presencialmente / venda remota',
    opcoes: [
      'Cliente pagou a distancia',
      'Pagamento antecipado para garantir produto',
      'Venda por telefone / WhatsApp',
    ],
  },
]

interface MotivoSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function MotivoSelect({ value, onChange, className = '' }: MotivoSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all bg-white ${className}`}
    >
      <option value="">Selecione o motivo...</option>
      {MOTIVOS.map((cat) => (
        <optgroup key={cat.grupo} label={cat.grupo}>
          {cat.opcoes.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

export { MOTIVOS }
