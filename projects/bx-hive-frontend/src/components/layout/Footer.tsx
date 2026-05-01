import { Wordmark } from '@/components/ds/wordmark'

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-background font-ui">
      <div className="flex items-center justify-between flex-wrap gap-3 px-7 py-6">
        <Wordmark size={14} />
        <div className="flex items-center gap-7 text-[12px] text-muted-foreground">
          <span className="t-micro">Open Science · Blockchain · Economics</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  )
}
