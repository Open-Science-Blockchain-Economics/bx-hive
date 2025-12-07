// BRET (Bomb Risk Elicitation Task) game logic

import type { BRETState } from '../types'

/**
 * Initialize a new BRET game state with a randomly placed bomb
 * @param rows - Number of rows in the grid
 * @param cols - Number of columns in the grid
 * @returns Initial BRETState with random bomb location
 */
export function initializeBRETState(rows: number, cols: number): BRETState {
  const totalBoxes = rows * cols
  // Generate random bomb location (0 to totalBoxes-1)
  const bombLocation = Math.floor(Math.random() * totalBoxes)

  return {
    phase: 'decision',
    bombLocation,
  }
}

/**
 * Calculate whether the bomb was hit and the resulting payout
 * @param selectedBoxes - Array of box indices the player selected
 * @param bombLocation - Index of the bomb in the flattened grid
 * @param paymentPerBox - Amount earned per box (γ)
 * @returns Object with hitBomb flag and payout amount
 */
export function calculatePayout(
  selectedBoxes: number[],
  bombLocation: number,
  paymentPerBox: number,
): { hitBomb: boolean; payout: number } {
  // Check if bomb is in the selected boxes
  const hitBomb = selectedBoxes.includes(bombLocation)

  // If bomb was hit, payout is 0; otherwise, payout = boxes × payment
  const payout = hitBomb ? 0 : selectedBoxes.length * paymentPerBox

  return { hitBomb, payout }
}

/**
 * Process the player's decision and return the completed game state
 * @param state - Current BRET state
 * @param selectedBoxes - Array of box indices the player selected
 * @param paymentPerBox - Amount earned per box (γ)
 * @returns Updated BRETState with results
 */
export function processDecision(state: BRETState, selectedBoxes: number[], paymentPerBox: number): BRETState {
  if (!state.bombLocation && state.bombLocation !== 0) {
    throw new Error('Bomb location not initialized')
  }

  const { hitBomb, payout } = calculatePayout(selectedBoxes, state.bombLocation, paymentPerBox)

  return {
    ...state,
    phase: 'completed',
    boxesCollected: selectedBoxes.length,
    selectedBoxes,
    hitBomb,
    payout,
  }
}

/**
 * Validate that the number of boxes to collect is within valid range
 * @param boxesCollected - Number of boxes player wants to collect
 * @param rows - Number of rows in the grid
 * @param cols - Number of columns in the grid
 * @returns true if valid, false otherwise
 */
export function validateBoxesCollected(boxesCollected: number, rows: number, cols: number): boolean {
  const totalBoxes = rows * cols

  // Must be a positive integer
  if (!Number.isInteger(boxesCollected) || boxesCollected < 0) {
    return false
  }

  // Must collect at least 1 box and at most (totalBoxes - 1)
  // Can't collect 0 (no risk) or all boxes (guaranteed to hit bomb)
  if (boxesCollected < 1 || boxesCollected >= totalBoxes) {
    return false
  }

  return true
}
