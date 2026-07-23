'use client'

import { useRouter } from 'next/navigation'
import NovoPedidoForm from '@/components/novo-pedido-form'

export default function FranquiaNovoPedidoPage() {
  const router = useRouter()
  return <NovoPedidoForm voltarPara="/franquia" />
}
