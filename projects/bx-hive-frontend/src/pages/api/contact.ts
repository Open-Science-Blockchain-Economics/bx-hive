import type { APIRoute } from 'astro'

export const prerender = false

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA'
const RESEND_API_URL = 'https://api.resend.com/emails'

const FROM_ADDRESS = 'bxHive <noreply@bxhive.org>'
const TO_ADDRESS = 'admin@bxhive.org'

const ROLES = ['researcher', 'participant', 'partner', 'press'] as const
type Role = (typeof ROLES)[number]

type ContactPayload = {
  role?: unknown
  fullName?: unknown
  email?: unknown
  affiliation?: unknown
  subject?: unknown
  message?: unknown
  hp?: unknown
  turnstileToken?: unknown
}

type WorkerEnv = {
  TURNSTILE_SECRET_KEY?: string
  RESEND_API_KEY?: string
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const isString = (v: unknown): v is string => typeof v === 'string'
const isRole = (v: unknown): v is Role => isString(v) && (ROLES as readonly string[]).includes(v)

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: ContactPayload
  try {
    body = (await request.json()) as ContactPayload
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' })
  }

  // Honeypot — bots fill the hidden field; respond as if successful.
  if (isString(body.hp) && body.hp.trim().length > 0) {
    return json(200, { ok: true })
  }

  const role = isRole(body.role) ? body.role : ''
  const fullName = isString(body.fullName) ? body.fullName.trim() : ''
  const email = isString(body.email) ? body.email.trim() : ''
  const affiliation = isString(body.affiliation) ? body.affiliation.trim() : ''
  const subject = isString(body.subject) ? body.subject.trim() : ''
  const message = isString(body.message) ? body.message.trim() : ''
  const turnstileToken = isString(body.turnstileToken) ? body.turnstileToken : ''

  if (!role) return json(400, { ok: false, error: 'Please choose who you are.' })
  if (!fullName) return json(400, { ok: false, error: 'Name is required.' })
  if (!email) return json(400, { ok: false, error: 'Email is required.' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { ok: false, error: 'Email looks invalid.' })
  }
  if (!subject) return json(400, { ok: false, error: 'Subject is required.' })
  if (!message) return json(400, { ok: false, error: 'Message is required.' })
  if (message.length > 5000) {
    return json(400, { ok: false, error: 'Message is too long (max 5000 chars).' })
  }
  if (!turnstileToken) {
    return json(400, { ok: false, error: 'Captcha token missing.' })
  }

  // Cloudflare bindings come from `cloudflare:workers` in v13. Dynamic import
  // so `astro dev` (no adapter) doesn't try to resolve the virtual module.
  const env: WorkerEnv | undefined = import.meta.env.DEV
    ? undefined
    : ((await import(/* @vite-ignore */ 'cloudflare:workers')).env as WorkerEnv)
  const secret = env?.TURNSTILE_SECRET_KEY || TURNSTILE_TEST_SECRET

  // Verify Turnstile.
  const verifyForm = new FormData()
  verifyForm.append('secret', secret)
  verifyForm.append('response', turnstileToken)
  if (clientAddress) verifyForm.append('remoteip', clientAddress)

  let verifyOk = false
  try {
    const verifyRes = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: verifyForm })
    const verifyData = (await verifyRes.json()) as { success?: boolean }
    verifyOk = verifyData.success === true
  } catch {
    return json(500, { ok: false, error: 'Captcha verification failed.' })
  }
  if (!verifyOk) {
    return json(403, { ok: false, error: 'Captcha rejected. Please try again.' })
  }

  // Dev mode (no Resend key) — return success after Turnstile verification.
  // Real delivery only happens once deployed to the Worker with a key set.
  const resendKey = env?.RESEND_API_KEY
  if (!resendKey) {
    if (import.meta.env.DEV) return json(200, { ok: true, dev: true })
    return json(500, { ok: false, error: 'Email transport not configured.' })
  }

  const subjectLine = `[bxHive contact · ${role}] ${subject}`
  const text = [`Role: ${role}`, `Name: ${fullName}`, `Email: ${email}`, affiliation ? `Affiliation: ${affiliation}` : null, '', message]
    .filter((line) => line !== null)
    .join('\n')

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [TO_ADDRESS],
        reply_to: email,
        subject: subjectLine,
        text,
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return json(502, { ok: false, error: `Failed to send (${res.status}). ${detail}`.trim() })
    }
  } catch (err) {
    return json(502, { ok: false, error: err instanceof Error ? err.message : 'Failed to send email.' })
  }

  return json(200, { ok: true })
}
