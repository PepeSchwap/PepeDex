// LocalStorage cache for portfolio page
// Key: dextop.portfolio.v1:${chainId}:${account}
import { useCallback, useEffect, useMemo, useState } from 'react'

export interface PortfolioCache {
  version: 1
  tokens: any[]
  lp: any[]
  timestamp: number
}

const STORAGE_PREFIX = 'dextop.portfolio.v1'
const TTL = 30 * 1000

function makeKey(chainId: number, account: string) {
  return `${STORAGE_PREFIX}:${chainId}:${account.toLowerCase()}`
}

export function usePortfolioCache(chainId?: number, account?: string) {
  const key = useMemo(() => (chainId && account ? makeKey(chainId, account) : undefined), [chainId, account])
  const [cached, setCached] = useState<PortfolioCache | null>(null)

  useEffect(() => {
    if (!key) return setCached(null)
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) return setCached(null)
      const parsed = JSON.parse(raw)
      if (parsed?.version !== 1) return setCached(null)
      setCached(parsed)
    } catch {
      setCached(null)
    }
  }, [key])

  const isStale = useMemo(() => {
    if (!cached) return true
    return Date.now() - cached.timestamp > TTL
  }, [cached])

  const write = useCallback(
    (data: { tokens: any[]; lp: any[] }) => {
      if (!key) return

      const previousRaw = window.localStorage.getItem(key)
      const previous = previousRaw ? (JSON.parse(previousRaw) as PortfolioCache) : null

      // Avoid re-writing and re-setting state when the payload is effectively unchanged.
      if (
        previous?.version === 1 &&
        JSON.stringify(previous.tokens) === JSON.stringify(data.tokens) &&
        JSON.stringify(previous.lp) === JSON.stringify(data.lp)
      ) {
        return
      }

      const snapshot: PortfolioCache = {
        version: 1,
        tokens: data.tokens,
        lp: data.lp,
        timestamp: Date.now()
      }

      window.localStorage.setItem(key, JSON.stringify(snapshot))
      setCached(snapshot)
    },
    [key]
  )

  return { cached, isStale, write }
}
