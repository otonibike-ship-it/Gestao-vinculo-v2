import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/esqueci-senha', '/redefinir-senha']

const PERFIL_HOME: Record<string, string> = {
  comercial: '/comercial',
  financeiro: '/financeiro',
  ti: '/ti',
  admin: '/comercial',
  franquia: '/franquia',
  faturamento: '/faturamento',
}

// Usuário de franquia só circula por estas áreas (a API também barra; isto evita telas erradas)
const FRANQUIA_PERMITIDO = ['/franquia', '/atendimentos-concluidos']

function dentroDe(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(base + '/')
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('access_token')?.value
  const perfil = request.cookies.get('perfil')?.value

  // Rotas públicas — se já logado, redireciona pro dashboard
  if (PUBLIC_PATHS.includes(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL((perfil && PERFIL_HOME[perfil]) || '/', request.url))
    }
    return NextResponse.next()
  }

  // Rotas protegidas — sem token, manda pro login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (perfil === 'franquia' && pathname !== '/' && !FRANQUIA_PERMITIDO.some(b => dentroDe(pathname, b))) {
    return NextResponse.redirect(new URL(PERFIL_HOME.franquia, request.url))
  }
  if (perfil && perfil !== 'admin' && (dentroDe(pathname, '/admin') || dentroDe(pathname, '/configuracoes'))) {
    return NextResponse.redirect(new URL(PERFIL_HOME[perfil] || '/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)'],
}
