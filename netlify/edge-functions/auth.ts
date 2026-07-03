// Netlify-native edge function that replicates proxy.ts auth logic.
// Runs before Next.js for every request (except excluded paths below).
import type { Config, Context } from "@netlify/edge-functions"

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/auth',
  '/welcome',
  '/forgot-password',
]

// Supabase project ref extracted from NEXT_PUBLIC_SUPABASE_URL
const PROJECT_REF = (() => {
  const url = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') ?? ''
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/)
  return match?.[1] ?? ''
})()

export default async function auth(request: Request, context: Context) {
  const url = new URL(request.url)
  const { pathname } = url

  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return context.next()
  }

  const session = getSession(request)

  if (!session) {
    const dest = pathname === '/' ? '/welcome' : '/login'
    return Response.redirect(new URL(dest, url), 302)
  }

  const consentCompleted = session.userMeta?.consent_completed === true

  if (!consentCompleted && pathname !== '/consent') {
    return Response.redirect(new URL('/consent', url), 302)
  }
  if (consentCompleted && pathname === '/consent') {
    return Response.redirect(new URL('/', url), 302)
  }

  return context.next()
}

// ---------------------------------------------------------------------------
// Cookie / JWT helpers
// ---------------------------------------------------------------------------

function getSession(request: Request) {
  const cookies = parseCookies(request.headers.get('cookie') ?? '')

  // @supabase/ssr cookie names
  const base = `sb-${PROJECT_REF}-auth-token`

  // Try direct value first, then chunked (.0, .1, …)
  let raw = cookies[base]
  if (!raw) {
    let chunks = ''
    for (let i = 0; ; i++) {
      const c = cookies[`${base}.${i}`]
      if (!c) break
      chunks += c
    }
    raw = chunks
  }
  if (!raw) return null

  return parseToken(raw)
}

function parseToken(raw: string) {
  try {
    const json = JSON.parse(atob(addBase64Padding(raw)))
    const accessToken = json?.access_token
    if (typeof accessToken !== 'string') return null

    const parts = accessToken.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(atob(addBase64Padding(parts[1])))

    if (typeof payload?.exp === 'number' && payload.exp * 1000 < Date.now()) {
      return null // expired
    }

    return { userMeta: payload?.user_metadata ?? {} }
  } catch {
    return null
  }
}

function addBase64Padding(s: string) {
  // base64url → base64
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4 !== 0) s += '='
  return s
}

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(';').flatMap(part => {
      const idx = part.indexOf('=')
      if (idx < 0) return []
      const k = part.slice(0, idx).trim()
      const v = part.slice(idx + 1).trim()
      try { return [[k, decodeURIComponent(v)]] } catch { return [[k, v]] }
    })
  )
}

export const config: Config = {
  path: "/*",
  excludedPath: [
    "/api/*",
    "/_next/static/*",
    "/_next/image/*",
    "/_next/data/*",
    "/favicon.ico",
    "/*.png",
    "/*.ico",
    "/*.svg",
  ],
}
