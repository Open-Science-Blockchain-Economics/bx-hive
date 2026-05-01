import { useEffect, useState, type FormEvent } from 'react'

import { Btn } from '@/components/ds/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ds/dialog'
import { Field } from '@/components/ds/field'
import { Input } from '@/components/ds/input'
import { Rule } from '@/components/ds/separator'
import { type NetworkConfig, useNetworkConfig } from '../providers/NetworkProvider'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type Section = 'algod' | 'indexer' | 'kmd'

export default function NetworkSettingsModal({ isOpen, onClose }: Props) {
  const { networkConfig, updateNetworkConfig, resetToDefaults, getDefaults } = useNetworkConfig()
  const [form, setForm] = useState<NetworkConfig>(networkConfig)

  useEffect(() => {
    if (isOpen) {
      setForm(networkConfig)
    }
  }, [isOpen, networkConfig])

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    updateNetworkConfig(form)
    onClose()
  }

  const handleReset = () => {
    resetToDefaults()
    setForm(getDefaults())
  }

  const updateField = <S extends Section>(section: S, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Network settings</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <Rule label="Algod" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Server" htmlFor="algod-server" required>
              <Input
                id="algod-server"
                type="text"
                value={form.algod.server}
                onChange={(e) => updateField('algod', 'server', e.target.value)}
                required
              />
            </Field>
            <Field label="Port" htmlFor="algod-port">
              <Input
                id="algod-port"
                mono
                type="number"
                value={form.algod.port ?? ''}
                onChange={(e) => updateField('algod', 'port', e.target.value)}
                min={0}
                max={65535}
              />
            </Field>
            <Field label="Token" htmlFor="algod-token">
              <Input
                id="algod-token"
                mono
                type="password"
                value={form.algod.token}
                onChange={(e) => updateField('algod', 'token', e.target.value)}
              />
            </Field>
          </div>

          <Rule label="Indexer" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Server" htmlFor="indexer-server" required>
              <Input
                id="indexer-server"
                type="text"
                value={form.indexer.server}
                onChange={(e) => updateField('indexer', 'server', e.target.value)}
                required
              />
            </Field>
            <Field label="Port" htmlFor="indexer-port">
              <Input
                id="indexer-port"
                mono
                type="number"
                value={form.indexer.port ?? ''}
                onChange={(e) => updateField('indexer', 'port', e.target.value)}
                min={0}
                max={65535}
              />
            </Field>
            <Field label="Token" htmlFor="indexer-token">
              <Input
                id="indexer-token"
                mono
                type="password"
                value={form.indexer.token}
                onChange={(e) => updateField('indexer', 'token', e.target.value)}
              />
            </Field>
          </div>

          <Rule label="KMD" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Server" htmlFor="kmd-server" required>
              <Input
                id="kmd-server"
                type="text"
                value={form.kmd.server}
                onChange={(e) => updateField('kmd', 'server', e.target.value)}
                required
              />
            </Field>
            <Field label="Port" htmlFor="kmd-port">
              <Input
                id="kmd-port"
                mono
                type="number"
                value={form.kmd.port ?? ''}
                onChange={(e) => updateField('kmd', 'port', e.target.value)}
                min={0}
                max={65535}
              />
            </Field>
            <Field label="Token" htmlFor="kmd-token">
              <Input
                id="kmd-token"
                mono
                type="password"
                value={form.kmd.token}
                onChange={(e) => updateField('kmd', 'token', e.target.value)}
              />
            </Field>
            <Field label="Wallet" htmlFor="kmd-wallet">
              <Input id="kmd-wallet" type="text" value={form.kmd.wallet} onChange={(e) => updateField('kmd', 'wallet', e.target.value)} />
            </Field>
            <Field label="Password" htmlFor="kmd-password">
              <Input
                id="kmd-password"
                type="password"
                value={form.kmd.password}
                onChange={(e) => updateField('kmd', 'password', e.target.value)}
              />
            </Field>
          </div>

          <DialogFooter className="sm:justify-between sm:flex-row-reverse mt-2">
            <div className="flex items-center gap-2 sm:flex-row-reverse">
              <Btn type="submit" variant="primary" size="sm">
                Save
              </Btn>
              <Btn type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Btn>
            </div>
            <Btn type="button" variant="ghost" size="sm" onClick={handleReset}>
              Reset defaults
            </Btn>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
