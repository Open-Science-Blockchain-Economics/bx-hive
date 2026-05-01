import type { ExperimentTemplate } from '../types'

export const trustExperimentTemplate: ExperimentTemplate = {
  id: 'trust-game',
  name: 'Trust Game',
  label: 'Trust Game',
  description:
    'A two-player experiment where Player 1 (Investor) sends money to Player 2 (Trustee). The amount is multiplied, and the Trustee decides how much to return.',
  playerCount: 2,
  parameterSchema: [
    {
      name: 'E1',
      type: 'number',
      label: 'Investor Endowment (E1)',
      description: 'Initial amount given to the Investor',
      default: 100,
      min: 1,
    },
    {
      name: 'E2',
      type: 'number',
      label: 'Trustee Endowment (E2)',
      description: 'Initial amount given to the Trustee',
      default: 0,
      min: 0,
    },
    {
      name: 'm',
      type: 'number',
      label: 'Multiplier (m)',
      description: 'Factor by which the invested amount is multiplied',
      default: 3,
      min: 1,
      max: 10,
    },
    {
      name: 'UNIT',
      type: 'number',
      label: 'Step Size (UNIT)',
      description: 'Increment step for investment/return decisions',
      default: 1,
      min: 1,
    },
  ],
}

export const experimentTemplates: ExperimentTemplate[] = [trustExperimentTemplate]

export function getTemplateById(id: string): ExperimentTemplate | undefined {
  return experimentTemplates.find((t) => t.id === id)
}
