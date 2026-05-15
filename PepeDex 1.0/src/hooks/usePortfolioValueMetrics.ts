import { useEffect, useMemo, useState } from 'react'

type Snapshot = {
  ts: number
  valueUsd: number
}

type StoredMetrics = {
  version: 1
  samples: Snapshot[]
}

export type PortfolioChangeMode = '24h' | 'sinceSync' | null

const STORAGE_PREFIX = 'dextop.portfolio.value.metrics.v1'
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const MIN_WRITE_INTERVAL_MS = 15 * 60 * 1000
const MIN_RELATIVE_DELTA_TO_WRITE = 0.001

function makeKey(chainId: number, account: string) {
  return `${STORAGE_PREFIX}:${chainId}:${account.toLowerCase()}`
}

function pruneSamples(samples: Snapshot[], now: number) {
  const minTs = now - RETENTION_MS
  return samples.filter(sample => sample.ts >= minTs)
}

function areSamplesEqual(a: Snapshot[], b: Snapshot[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].ts !== b[i].ts || a[i].valueUsd !== b[i].valueUsd) return false
  }
  return true
}

function choose24hBaseline(samples: Snapshot[], now: number): Snapshot | null {
  const targetAgeMs = 24 * 60 * 60 * 1000
  const minAgeMs = 21 * 60 * 60 * 1000
  const maxAgeMs = 27 * 60 * 60 * 1000

  const candidates = samples.filter(sample => {
    const age = now - sample.ts
    return age >= minAgeMs && age <= maxAgeMs
  })

  if (candidates.length === 0) return null

  candidates.sort((a, b) => Math.abs(now - a.ts - targetAgeMs) - Math.abs(now - b.ts - targetAgeMs))
  return candidates[0]
}

export function usePortfolioValueMetrics(chainId?: number, account?: string, currentValueUsd?: number) {
  const key = useMemo(() => (chainId && account ? makeKey(chainId, account) : undefined), [chainId, account])
  const [stored, setStored] = useState<StoredMetrics | null>(null)

  useEffect(() => {
    if (!key) {
      setStored(null)
      return
    }

    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) {
        setStored({ version: 1, samples: [] })
        return
      }

      const parsed = JSON.parse(raw) as StoredMetrics
      if (parsed?.version !== 1 || !Array.isArray(parsed.samples)) {
        setStored({ version: 1, samples: [] })
        return
      }

      setStored({ version: 1, samples: parsed.samples })
    } catch {
      setStored({ version: 1, samples: [] })
    }
  }, [key])

  useEffect(() => {
    if (!key || currentValueUsd === undefined || !Number.isFinite(currentValueUsd)) return

    const now = Date.now()
    const roundedValueUsd = Math.round(currentValueUsd * 100) / 100

    let currentStored: StoredMetrics = { version: 1, samples: [] }
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as StoredMetrics
        if (parsed?.version === 1 && Array.isArray(parsed.samples)) {
          currentStored = parsed
        }
      }
    } catch {
      currentStored = { version: 1, samples: [] }
    }

    const samples = pruneSamples(currentStored.samples, now)
    const latest = samples[samples.length - 1]

    const relativeDelta =
      latest && latest.valueUsd !== 0
        ? Math.abs(roundedValueUsd - latest.valueUsd) / Math.abs(latest.valueUsd)
        : Infinity

    const shouldWrite =
      !latest ||
      now - latest.ts >= MIN_WRITE_INTERVAL_MS ||
      relativeDelta >= MIN_RELATIVE_DELTA_TO_WRITE

    const nextSamples = shouldWrite ? pruneSamples([...samples, { ts: now, valueUsd: roundedValueUsd }], now) : samples
    const nextStored: StoredMetrics = { version: 1, samples: nextSamples }

    if (shouldWrite) {
      window.localStorage.setItem(key, JSON.stringify(nextStored))
    }

    setStored(prev => {
      const prevSamples = prev?.samples ?? []
      if (areSamplesEqual(prevSamples, nextStored.samples)) return prev
      return nextStored
    })
  }, [currentValueUsd, key])

  return useMemo(() => {
    const samples = stored?.samples ?? []
    if (samples.length === 0) {
      return {
        mode: null as PortfolioChangeMode,
        changeUsd: 0,
        changePct: null as number | null,
        lastSyncAt: undefined as number | undefined
      }
    }

    const now = Date.now()
    const latest = samples[samples.length - 1]
    const previous = samples.length > 1 ? samples[samples.length - 2] : undefined

    const baseline24h = choose24hBaseline(samples, now)

    let mode: PortfolioChangeMode = null
    let baseline: Snapshot | null = null

    if (baseline24h) {
      mode = '24h'
      baseline = baseline24h
    } else if (previous) {
      // No reliable 24h point yet, so report performance since previous local sync.
      mode = 'sinceSync'
      baseline = previous
    }

    if (!baseline || !Number.isFinite(latest.valueUsd) || !Number.isFinite(baseline.valueUsd)) {
      return {
        mode: null as PortfolioChangeMode,
        changeUsd: 0,
        changePct: null as number | null,
        lastSyncAt: latest.ts
      }
    }

    const changeUsd = latest.valueUsd - baseline.valueUsd
    const changePct = baseline.valueUsd >= 1 ? (changeUsd / baseline.valueUsd) * 100 : null

    return {
      mode,
      changeUsd,
      changePct,
      lastSyncAt: latest.ts
    }
  }, [stored])
}
