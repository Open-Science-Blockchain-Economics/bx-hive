import { useEffect, useRef, useState, type FormEventHandler } from 'react'

import { Btn } from '@/components/ds/button'
import { Field } from '@/components/ds/field'
import { Input } from '@/components/ds/input'
import { cn } from '@/lib/utils'

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: () => void
          appearance?: 'always' | 'execute' | 'interaction-only'
          size?: 'normal' | 'compact' | 'flexible'
          theme?: 'light' | 'dark' | 'auto'
        },
      ) => string
      reset: (id?: string) => void
    }
  }
}

const loadTurnstile = (): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (document.querySelector(`script[src="${TURNSTILE_SCRIPT}"]`)) {
    return new Promise((res) => {
      const check = () => (window.turnstile ? res() : setTimeout(check, 50))
      check()
    })
  }
  return new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = TURNSTILE_SCRIPT
    s.async = true
    s.defer = true
    s.onload = () => res()
    s.onerror = () => rej(new Error('Failed to load Turnstile'))
    document.head.appendChild(s)
  })
}

type Role = 'researcher' | 'participant' | 'partner' | 'press'
type SubmitState = 'idle' | 'sending' | 'sent' | 'error'

const ROLES: { id: Role; label: string }[] = [
  { id: 'researcher', label: 'Researcher' },
  { id: 'participant', label: 'Participant' },
  { id: 'partner', label: 'Partner' },
  { id: 'press', label: 'Press' },
]

const labelCls = 'font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground'

export default function ContactForm() {
  const [role, setRole] = useState<Role>('researcher')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [hp, setHp] = useState('')
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | undefined>(undefined)

  const sitekey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY

  useEffect(() => {
    let cancelled = false
    loadTurnstile().then(() => {
      if (cancelled || !turnstileRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey,
        callback: (t) => setToken(t),
        'error-callback': () => setToken(''),
        appearance: 'interaction-only',
        size: 'compact',
      })
    })
    return () => {
      cancelled = true
    }
  }, [sitekey])

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, fullName, email, affiliation, subject, message, hp, turnstileToken: token }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Server returned ${res.status}`)
      }
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
        setToken('')
      }
    }
  }

  if (status === 'sent') {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 md:p-10 text-center">
        <span className="inline-block font-mono text-[11px] uppercase tracking-[0.16em] text-primary border border-primary rounded-pill px-3 py-1">
          · message sent ·
        </span>
        <h2 className="mt-6 mb-2 font-ui font-medium text-2xl tracking-[-0.012em]">
          Thanks, <span className="font-display italic font-normal">{fullName || 'friend'}</span>.
        </h2>
        <p className="font-ui text-[15px] leading-[1.55] text-ink-2 max-w-md mx-auto">
          Your message is on its way. We read every message and will route you to the right person.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 md:p-9 flex flex-col gap-6">
      <div>
        <div className={labelCls}>Send a message</div>
        <h2 className="mt-2 font-display italic font-normal text-2xl md:text-[28px] tracking-[-0.012em]">Start a conversation.</h2>
      </div>

      {/* I am a — role pill toggle */}
      <div className="flex flex-col gap-2.5">
        <span className={labelCls}>I am a</span>
        <div className="flex flex-wrap gap-2">
          {ROLES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={role === id}
              onClick={() => setRole(id)}
              className={cn(
                'rounded-pill border px-3.5 py-1.5 text-[13px] font-medium tracking-[-0.005em] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                role === id ? 'border-primary bg-accent text-primary' : 'border-border bg-background text-ink-2 hover:bg-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label={<span className={labelCls}>Full name</span>} required htmlFor="contact-name">
          <Input
            id="contact-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Dr. Mira Karras"
            autoComplete="name"
            required
            maxLength={120}
          />
        </Field>
        <Field label={<span className={labelCls}>Email</span>} required htmlFor="contact-email">
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@institution.edu"
            autoComplete="email"
            required
          />
        </Field>
      </div>

      <Field label={<span className={labelCls}>Affiliation</span>} hint="optional" htmlFor="contact-affiliation">
        <Input
          id="contact-affiliation"
          value={affiliation}
          onChange={(e) => setAffiliation(e.target.value)}
          placeholder="Behavioral Lab · ETH Zürich"
          autoComplete="organization"
          maxLength={160}
        />
      </Field>

      <Field label={<span className={labelCls}>Subject</span>} required htmlFor="contact-subject">
        <Input
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Replicating the Trust Game with 240 participants"
          required
          maxLength={200}
        />
      </Field>

      <Field label={<span className={labelCls}>Message</span>} required htmlFor="contact-message">
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your study, your timeline, and how we can help."
          required
          maxLength={5000}
          rows={6}
          className={cn(
            'w-full min-w-0 rounded-sm border border-input bg-card px-2.5 py-2 text-[13px] text-foreground font-ui transition-colors outline-none resize-y',
            'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground',
            'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
          )}
        />
      </Field>

      {/* Honeypot — visually hidden, off tab order; bots fill it, humans don't. */}
      <div aria-hidden="true" className="sr-only">
        <label>
          Leave this empty
          <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
        </label>
      </div>

      <div ref={turnstileRef} className="max-w-full overflow-hidden empty:hidden"></div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        {status === 'error' ? (
          <span className="font-mono text-[11px] text-neg">{errorMsg || 'Something went wrong. Try again?'}</span>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">We read every message</span>
        )}
        <Btn type="submit" variant="primary" size="lg" disabled={status === 'sending' || !token}>
          {status === 'sending' ? 'Sending…' : 'Send message →'}
        </Btn>
      </div>
    </form>
  )
}
