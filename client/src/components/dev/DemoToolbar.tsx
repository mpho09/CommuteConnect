import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical, X } from 'lucide-react'
import { useState } from 'react'
import { isMockApi, useApi } from '../../lib/api/apiContext'
import { saveMockConfig } from '../../lib/api/createApi'
import type { MockConfig } from '../../lib/api/mock/mockApi'
import { SAMPLE_PASSWORD } from '../../lib/api/mock/seed'
import { useSession } from '../../lib/session/session'
import { Field, Select } from '../ui/Field'

const LATENCY: Record<string, MockConfig['latencyMs']> = {
  none: 0,
  normal: [150, 500],
  slow: [1500, 3000],
}
const FAILURE: Record<string, number> = { off: 0, some: 0.25, all: 1 }

/**
 * Floating panel shown only when the mock API is active. Lets you act as a
 * SAMPLE persona and simulate slow or failing requests.
 */
export function DemoToolbar() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { user } = useSession()
  const [open, setOpen] = useState(false)
  // Bumped after config changes so the selects re-read it.
  const [, setVersion] = useState(0)

  if (!isMockApi(api)) return null
  const config = api.getConfig()
  const latencyKey =
    Object.entries(LATENCY).find(
      ([, v]) => JSON.stringify(v) === JSON.stringify(config.latencyMs),
    )?.[0] ?? 'normal'
  const failureKey = Object.entries(FAILURE).find(([, v]) => v === config.failureRate)?.[0] ?? 'off'

  function updateConfig(change: Partial<MockConfig>) {
    if (!isMockApi(api)) return
    api.setConfig(change)
    saveMockConfig(api.getConfig())
    setVersion((v) => v + 1)
  }

  function switchUser(userId: string) {
    if (!isMockApi(api)) return
    api.switchUser(userId || null)
    // Wipe everything cached for the previous persona and refetch what's on screen.
    void queryClient.resetQueries()
  }

  return (
    <div className="fixed bottom-space-md left-space-md z-50 print:hidden">
      {open ? (
        <section
          aria-label="Demo data controls"
          className="w-72 rounded-xl border border-accent bg-surface-container-lowest p-space-md shadow-overlay"
        >
          <div className="mb-space-sm flex items-center justify-between">
            <h2 className="flex items-center gap-space-xs text-title-md font-title-md">
              <FlaskConical aria-hidden className="size-4 text-warning" />
              Demo data
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close demo controls"
              className="-m-2 flex size-11 items-center justify-center rounded-lg hover:bg-surface-container"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
          <p className="mb-space-md text-body-sm text-on-surface-variant">
            Everything here is SAMPLE data and resets when you reload. Sample password:{' '}
            <code className="font-mono">{SAMPLE_PASSWORD}</code>
          </p>
          <div className="flex flex-col gap-space-md">
            <Field label="Act as">
              {(c) => (
                <Select {...c} value={user?.id ?? ''} onChange={(e) => switchUser(e.target.value)}>
                  <option value="">Guest (signed out)</option>
                  {api.personas.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.label}: {p.description}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Network speed">
              {(c) => (
                <Select
                  {...c}
                  value={latencyKey}
                  onChange={(e) => updateConfig({ latencyMs: LATENCY[e.target.value] })}
                >
                  <option value="none">Instant</option>
                  <option value="normal">Normal (0.15–0.5 s)</option>
                  <option value="slow">Slow (1.5–3 s)</option>
                </Select>
              )}
            </Field>
            <Field label="Simulate errors">
              {(c) => (
                <Select
                  {...c}
                  value={failureKey}
                  onChange={(e) => updateConfig({ failureRate: FAILURE[e.target.value] })}
                >
                  <option value="off">Off</option>
                  <option value="some">25% of requests fail</option>
                  <option value="all">Every request fails</option>
                </Select>
              )}
            </Field>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 items-center gap-space-xs rounded-full border border-accent bg-tertiary-fixed px-space-md text-label-lg font-label-lg text-on-tertiary-fixed shadow-raised"
        >
          <FlaskConical aria-hidden className="size-4" />
          Demo data
          {user && <span className="font-normal">· {user.fullName.split(' ')[0]}</span>}
        </button>
      )}
    </div>
  )
}
