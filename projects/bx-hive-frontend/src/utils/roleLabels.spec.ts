import { describe, expect, it } from 'vitest'

import { DEFAULT_ROLE_LABELS, resolveRoleLabels } from './roleLabels'

describe('resolveRoleLabels', () => {
  it('keeps the labels the experimenter chose', () => {
    expect(resolveRoleLabels({ investorLabel: 'Decision Maker 1', trusteeLabel: 'Decision Maker 2' })).toEqual({
      investorLabel: 'Decision Maker 1',
      trusteeLabel: 'Decision Maker 2',
    })
  })

  it('trims surrounding whitespace', () => {
    expect(resolveRoleLabels({ investorLabel: '  Sender  ', trusteeLabel: '  Responder  ' })).toEqual({
      investorLabel: 'Sender',
      trusteeLabel: 'Responder',
    })
  })

  it('falls back per label so one blank field cannot blank the other', () => {
    expect(resolveRoleLabels({ investorLabel: '   ', trusteeLabel: 'Responder' })).toEqual({
      investorLabel: 'Investor',
      trusteeLabel: 'Responder',
    })
  })

  it('falls back to both defaults when the source is absent', () => {
    expect(resolveRoleLabels(undefined)).toEqual(DEFAULT_ROLE_LABELS)
    expect(resolveRoleLabels(null)).toEqual(DEFAULT_ROLE_LABELS)
    expect(resolveRoleLabels({})).toEqual(DEFAULT_ROLE_LABELS)
  })
})
