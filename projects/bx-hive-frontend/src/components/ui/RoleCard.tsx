import { ArrowRight, Compass, FlaskConical, User } from 'lucide-react'

import PillBtn from './PillBtn'

interface RoleCardProps {
  title: string
  body: string
  icon: 'about' | 'exp' | 'part'
  cta: string
  to?: string
}

export default function RoleCard({ title, body, icon, cta, to }: RoleCardProps) {
  const Icon = icon === 'about' ? Compass : icon === 'exp' ? FlaskConical : User
  return (
    <div className="bg-card border border-border rounded-2xl p-8 flex flex-col gap-3">
      <div className="size-9 rounded-sm bg-primary text-primary-foreground grid place-items-center mb-2">
        <Icon className="size-4.5" strokeWidth={1.6} />
      </div>
      <div className="font-ui text-2xl font-medium tracking-[-0.012em] mt-1">
        <span className="font-display italic font-normal">{title}</span>
      </div>
      <p className="font-ui text-[15px] leading-[1.5] text-ink-2 m-0">{body}</p>
      <div className="mt-2">
        <PillBtn size="sm" kind="ghost" className="-ml-4" to={to}>
          {cta} <ArrowRight className="size-3.5" />
        </PillBtn>
      </div>
    </div>
  )
}
