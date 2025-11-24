import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Verificar sessão do usuário
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthPage = req.nextUrl.pathname === '/login';
  const isRootPage = req.nextUrl.pathname === '/';

  // Se está autenticado
  if (session) {
    // Se tenta acessar login, redirecionar para raiz
    if (isAuthPage) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    // Permitir acesso a qualquer outra página
    return res;
  }

  // Se NÃO está autenticado
  if (!session) {
    // Se tenta acessar página protegida (não é login nem raiz), redirecionar para login
    if (!isAuthPage && !isRootPage) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    // Permitir acesso a login e raiz
    return res;
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
};
