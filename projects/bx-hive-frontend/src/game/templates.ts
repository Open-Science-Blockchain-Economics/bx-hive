import type { GameTemplate } from '../types'

export const trustGameTemplate: GameTemplate = {
  id: 'trust-game',
  name: 'Trust Game',
  description:
    'A two-player game where Player 1 (Investor) sends money to Player 2 (Trustee). The amount is multiplied, and the Trustee decides how much to return.',
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

export const minesweeperTemplate: GameTemplate = {
  id: 'minesweeper',
  name: 'Minesweeper',
  description: 'A single-player game where you clear a grid without hitting mines.',
  playerCount: 1,
  parameterSchema: [
    {
      name: 'gridSize',
      type: 'number',
      label: 'Grid Size',
      description: 'Size of the grid (gridSize x gridSize)',
      default: 8,
      min: 5,
      max: 20,
    },
    {
      name: 'mineCount',
      type: 'number',
      label: 'Mine Count',
      description: 'Number of mines hidden in the grid',
      default: 10,
      min: 1,
      max: 50,
    },
  ],
}

export const gameTemplates: GameTemplate[] = [trustGameTemplate, minesweeperTemplate]

export function getTemplateById(id: string): GameTemplate | undefined {
  return gameTemplates.find((t) => t.id === id)
}