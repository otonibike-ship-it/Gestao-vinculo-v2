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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('access_token')?.value

  // Rotas públicas — se já logado, redireciona pro dashboard
  if (PUBLIC_PATHS.includes(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL('/comercial', request.url))
    }
    return NextResponse.next()
  }

  // Rotas protegidas — sem token, manda pro login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
