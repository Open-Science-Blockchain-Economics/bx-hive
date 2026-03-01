import { useState } from 'react'

interface CopyButtonProps {
  text: string
}

export default function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm btn-square ml-1 text-base opacity-40 hover:opacity-100"
      onClick={handleCopy}
      title="Copy address"
    >
      {copied ? '\u2713' : '\u2398'}
    </button>
  )
}
