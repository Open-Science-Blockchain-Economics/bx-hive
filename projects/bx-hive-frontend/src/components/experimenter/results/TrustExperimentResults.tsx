import { Chip } from '@/components/ds/badge'
import { Rule } from '@/components/ds/separator'
import type { Experiment, TrustExperimentState, User } from '../../../types'

interface TrustExperimentResultsProps {
  experiment: Experiment
  users: User[]
}

const statusToTone: Record<string, 'pos' | 'warn' | 'neutral'> = {
  completed: 'pos',
  playing: 'warn',
}

export default function TrustExperimentResults({ experiment, users }: TrustExperimentResultsProps) {
  function getUserName(userId: string): string {
    return users.find((u) => u.id === userId)?.name || 'Unknown'
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <Rule />
      <h4 className="t-h2">Match Details</h4>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left t-micro px-3 py-2">Investor</th>
              <th className="text-left t-micro px-3 py-2">Trustee</th>
              <th className="text-left t-micro px-3 py-2">Status</th>
              <th className="text-right t-micro px-3 py-2">Invested</th>
              <th className="text-right t-micro px-3 py-2">Returned</th>
              <th className="text-right t-micro px-3 py-2">Inv. Payout</th>
              <th className="text-right t-micro px-3 py-2">Tru. Payout</th>
            </tr>
          </thead>
          <tbody>
            {experiment.matches.map((match) => {
              const state = match.state as TrustExperimentState | undefined
              const tone = statusToTone[match.status] ?? 'neutral'
              const label =
                state?.phase === 'investor_decision'
                  ? 'Waiting: Investor'
                  : state?.phase === 'trustee_decision'
                    ? 'Waiting: Trustee'
                    : match.status

              return (
                <tr key={match.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2">{getUserName(match.player1Id)}</td>
                  <td className="px-3 py-2">{match.player2Id ? getUserName(match.player2Id) : '—'}</td>
                  <td className="px-3 py-2">
                    <Chip tone={tone}>{label}</Chip>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{state?.investorDecision ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">{state?.trusteeDecision ?? '—'}</td>
                  <td className={`px-3 py-2 text-right font-mono ${state?.investorPayout !== undefined ? 'text-pos font-medium' : ''}`}>
                    {state?.investorPayout ?? '—'}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono ${state?.trusteePayout !== undefined ? 'text-pos font-medium' : ''}`}>
                    {state?.trusteePayout ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
