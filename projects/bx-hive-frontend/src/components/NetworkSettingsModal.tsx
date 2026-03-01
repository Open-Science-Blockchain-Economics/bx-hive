import { useEffect, useState, type FormEvent } from 'react'
import { useNetworkConfig, type NetworkConfig } from '../hooks/useNetworkConfig'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function NetworkSettingsModal({ isOpen, onClose }: Props) {
  const { networkConfig, updateNetworkConfig, resetToDefaults, getDefaults } = useNetworkConfig()
  const [form, setForm] = useState<NetworkConfig>(networkConfig)

  // Sync form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(networkConfig)
    }
  }, [isOpen, networkConfig])

  if (!isOpen) return null

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    updateNetworkConfig(form)
    onClose()
  }

  const handleReset = () => {
    resetToDefaults()
    setForm(getDefaults())
  }

  const updateField = <S extends 'algod' | 'indexer' | 'kmd'>(
    section: S,
    field: string,
    value: string | number,
  ) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }))
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Network Settings</h3>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Algod */}
          <fieldset className="mt-2 grid gap-3">
            <legend className="text-primary mb-2 font-bold">Algod</legend>
            <label className="form-control w-full">
              <div className="label"><span className="label-text">Server</span></div>
              <input
                type="text"
                className="input input-bordered w-full input-sm"
                value={form.algod.server}
                onChange={(e) => updateField('algod', 'server', e.target.value)}
                required
              />
            </label>
            <label className="form-control w-full">
              <div className="label"><span className="label-text">Port</span></div>
              <input
                type="number"
                className="input input-bordered w-full input-sm"
                value={form.algod.port}
                onChange={(e) => updateField('algod', 'port', e.target.value)}
                min={0}
                max={65535}
                required
              />
            </label>
            <label className="form-control w-full">
              <div className="label"><span className="label-text">Token</span></div>
              <input
                type="password"
                className="input input-bordered w-full input-sm"
                value={form.algod.token}
                onChange={(e) => updateField('algod', 'token', e.target.value)}
              />
            </label>
          </fieldset>

          {/* Indexer */}
          <fieldset className="mt-2 grid gap-3">
            <legend className="text-primary mb-2 font-bold">Indexer</legend>
            <label className="form-control w-full">
              <div className="label"><span className="label-text">Server</span></div>
              <input
                type="text"
                className="input input-bordered w-full input-sm"
                value={form.indexer.server}
                onChange={(e) => updateField('indexer', 'server', e.target.value)}
                required
              />
            </label>
            <label className="form-control w-full">
              <div className="label"><span className="label-text">Port</span></div>
              <input
                type="number"
                className="input input-bordered w-full input-sm"
                value={form.indexer.port}
                onChange={(e) => updateField('indexer', 'port', e.target.value)}
                min={0}
                max={65535}
                required
              />
            </label>
            <label className="form-control w-full">
              <div className="label"><span className="label-text">Token</span></div>
              <input
                type="password"
                className="input input-bordered w-full input-sm"
                value={form.indexer.token}
                onChange={(e) => updateField('indexer', 'token', e.target.value)}
              />
            </label>
          </fieldset>

          {/* KMD */}
          <fieldset className="mt-2 grid gap-3">
            <legend className="text-primary mb-2 font-bold">KMD</legend>
            <label className="form-control w-full">
              <div className="label"><span className="label-text">Server</span></div>
              <input
                type="text"
                className="input input-bordered w-full input-sm"
                value={form.kmd.server}
                onChange={(e) => updateField('kmd', 'server', e.target.value)}
                required
              />
            </label>
            <label className="form-control w-full">
              <div className="label"><span className="label-text">Port</span></div>
              <input
                type="number"
                className="input input-bordered w-full input-sm"
                value={form.kmd.port}
                onChange={(e) => updateField('kmd', 'port', e.target.value)}
                min={0}
                max={65535}
                required
              />
            </label>
            <label className="form-control w-full">
              <div className="label"><span className="label-text">Token</span></div>
              <input
                type="password"
                className="input input-bordered w-full input-sm"
                value={form.kmd.token}
                onChange={(e) => updateField('kmd', 'token', e.target.value)}
              />
            </label>
            <label className="form-control w-full">
              <div className="label"><span className="label-text">Wallet</span></div>
              <input
                type="text"
                className="input input-bordered w-full input-sm"
                value={form.kmd.wallet}
                onChange={(e) => updateField('kmd', 'wallet', e.target.value)}
              />
            </label>
            <label className="form-control w-full">
              <div className="label"><span className="label-text">Password</span></div>
              <input
                type="password"
                className="input input-bordered w-full input-sm"
                value={form.kmd.password}
                onChange={(e) => updateField('kmd', 'password', e.target.value)}
              />
            </label>
          </fieldset>

          <div className="modal-action">
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleReset}>
              Reset Defaults
            </button>
            <div className="flex-1" />
            <button type="button" className="btn btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Save
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  )
}