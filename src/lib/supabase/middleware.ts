import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 사용자 정보(User)를 가져와서 세션을 갱신합니다.
  // 이 호출은 세션 쿠키를 새로고침합니다.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 로그인하지 않은 사용자가 보호된 페이지(/dashboard 등)에 접근하려고 하면 로그인 페이지로 보냅니다.
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // 보호된 경로 패턴을 정의하세요 (예: /admin, /profile, /apply)
    const protectedPaths = ['/admin', '/profile', '/apply']
    const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

    if (isProtected) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
