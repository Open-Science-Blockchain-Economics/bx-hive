import { Chip } from '@/components/ds/badge'
import { cn } from '@/lib/utils'
import type { ExperimentTemplate } from '../../types'

interface TemplateSelectorProps {
  templates: ExperimentTemplate[]
  selectedTemplateId: string
  onSelect: (id: string) => void
}

export default function TemplateSelector({ templates, selectedTemplateId, onSelect }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {templates.map((template) => {
        const isSelected = selectedTemplateId === template.id
        const isDisabled = !!template.disabled
        return (
          <button
            key={template.id}
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && onSelect(template.id)}
            className={cn(
              'text-left p-5 rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isDisabled
                ? 'opacity-40 cursor-not-allowed border-border bg-card'
                : isSelected
                  ? 'cursor-pointer border-primary bg-accent'
                  : 'cursor-pointer border-border bg-card hover:border-rule-2',
            )}
          >
            <div className="flex justify-between items-start gap-3 mb-2">
              <h4 className="t-h2">{template.name}</h4>
              <div className="flex gap-1.5 shrink-0">
                {isDisabled && <Chip>coming soon</Chip>}
                <Chip>{template.playerCount}-player</Chip>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{template.description}</p>
            {isSelected && (
              <div className="mt-3">
                <Chip tone="accent">Selected</Chip>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
