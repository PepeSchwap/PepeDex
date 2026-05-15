import { useEffect, useMemo, useRef, useState } from 'react'
import useInterval from './useInterval'
import useIsWindowVisible from './useIsWindowVisible'

type LiquidityPerformanceSnapshot = {
  version: 1
  baselineUsd: number
  baselineBalanceRaw: string
  baselineAt: number
  lastValueUsd: number
  lastUpdatedAt: number
}

const STORAGE_PREFIX = 'dextop.liquidity.performance.v1'
const REFRESH_INTERVAL_MS = 60_000

function makeStorageKey(chainId: number, account: string, pairAddress: string): string {
  return `${STORAGE_PREFIX}:${chainId}:${account.toLowerCase()}:${pairAddress.toLowerCase()}`
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function readSnapshot(storageKey: string): LiquidityPerformanceSnapshot | null {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LiquidityPerformanceSnapshot>

    if (
      parsed?.version !== 1 ||
      !isFiniteNonNegative(parsed.baselineUsd) ||
      typeof parsed.baselineBalanceRaw !== 'string' ||
      !isFiniteNonNegative(parsed.baselineAt) ||
      !isFiniteNonNegative(parsed.lastValueUsd) ||
      !isFiniteNonNegative(parsed.lastUpdatedAt)
    ) {
      return null
    }

    return parsed as LiquidityPerformanceSnapshot
  } catch {
    return null
  }
}

function writeSnapshot(storageKey: string, snapshot: LiquidityPerformanceSnapshot): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot))
  } catch {
    // ignore storage write failures
  }
}

function toCurrentMinuteBucket(): number {
  return Math.floor(Date.now() / REFRESH_INTERVAL_MS)
}

export default function useLiquidityPerformance({
  chainId,
  account,
  pairAddress,
  balanceRaw,
  currentValueUsd
}: {
  chainId?: number
  account?: string
  pairAddress?: string
  balanceRaw?: string
  currentValueUsd?: number
}): {
  pnlUsd?: number
  pnlPercent?: number
  baselineAt?: number
  updatedAt?: number
} {
  const isVisible = useIsWindowVisible()
  const [minuteBucket, setMinuteBucket] = useState<number>(toCurrentMinuteBucket())

  useInterval(
    () => {
      setMinuteBucket(toCurrentMinuteBucket())
    },
    isVisible ? REFRESH_INTERVAL_MS : null,
    false
  )

  const storageKey = useMemo(() => {
    if (!chainId || !account || !pairAddress) return undefined
    return makeStorageKey(chainId, account, pairAddress)
  }, [account, chainId, pairAddress])

  const [snapshot, setSnapshot] = useState<LiquidityPerformanceSnapshot | null>(null)
  const processedMinuteByKeyRef = useRef<Record<string, number>>({})

  useEffect(() => {
    if (!storageKey) {
      setSnapshot(null)
      return
    }
    setSnapshot(readSnapshot(storageKey))
  }, [storageKey])

  useEffect(() => {
    if (!storageKey || !balanceRaw || !isFiniteNonNegative(currentValueUsd)) return

    const now = Date.now()
    const existing = readSnapshot(storageKey)
    const alreadyProcessedThisMinute = processedMinuteByKeyRef.current[storageKey] === minuteBucket

    // Avoid localStorage churn if we've already updated this key in this minute and balance is unchanged.
    if (existing && existing.baselineBalanceRaw === balanceRaw && alreadyProcessedThisMinute) {
      setSnapshot(existing)
      return
    }

    let nextSnapshot: LiquidityPerformanceSnapshot

    if (!existing || existing.baselineBalanceRaw !== balanceRaw) {
      // User requested baseline reset on any LP balance change.
      nextSnapshot = {
        version: 1,
        baselineUsd: currentValueUsd,
        baselineBalanceRaw: balanceRaw,
        baselineAt: now,
        lastValueUsd: currentValueUsd,
        lastUpdatedAt: now
      }
    } else {
      nextSnapshot = {
        ...existing,
        lastValueUsd: currentValueUsd,
        lastUpdatedAt: now
      }
    }

    writeSnapshot(storageKey, nextSnapshot)
    processedMinuteByKeyRef.current[storageKey] = minuteBucket
    setSnapshot(nextSnapshot)
  }, [balanceRaw, currentValueUsd, minuteBucket, storageKey])

  return useMemo(() => {
    if (!snapshot) return { pnlUsd: undefined, pnlPercent: undefined, baselineAt: undefined, updatedAt: undefined }

    const pnlUsd = snapshot.lastValueUsd - snapshot.baselineUsd
    const pnlPercent = snapshot.baselineUsd > 0 ? (pnlUsd / snapshot.baselineUsd) * 100 : undefined

    return {
      pnlUsd: Number.isFinite(pnlUsd) ? pnlUsd : undefined,
      pnlPercent: pnlPercent !== undefined && Number.isFinite(pnlPercent) ? pnlPercent : undefined,
      baselineAt: snapshot.baselineAt,
      updatedAt: snapshot.lastUpdatedAt
    }
  }, [snapshot])
}
