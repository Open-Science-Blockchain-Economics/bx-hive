import type { ExperimentTemplate } from '../../types'

interface TemplateSelectorProps {
  templates: ExperimentTemplate[]
  selectedTemplateId: string
  onSelect: (id: string) => void
}

export default function TemplateSelector({ templates, selectedTemplateId, onSelect }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates.map((template) => (
        <div
          key={template.id}
          className={`card bg-base-100 border-2 transition-all ${
            template.disabled
              ? 'opacity-40 cursor-not-allowed border-base-300'
              : selectedTemplateId === template.id
                ? 'cursor-pointer border-primary shadow-lg'
                : 'cursor-pointer border-base-300 hover:border-base-400'
          }`}
          onClick={() => !template.disabled && onSelect(template.id)}
        >
          <div className="card-body">
            <div className="flex justify-between items-start">
              <h4 className="card-title text-lg">{template.name}</h4>
              <div className="flex gap-1">
                {template.disabled && <span className="badge badge-ghost badge-sm">coming soon</span>}
                <span className="badge badge-neutral badge-sm">{template.playerCount}-player</span>
              </div>
            </div>
            <p className="text-sm text-base-content/70">{template.description}</p>
            {selectedTemplateId === template.id && (
              <div className="flex gap-2 mt-2">
                <span className="badge badge-primary">Selected</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
