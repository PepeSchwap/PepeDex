import { useEffect, useState } from 'react'
import { Pair } from '@uniswap/sdk'

interface APRData {
  apr: number | null
  loading: boolean
  error: string | null
}

interface CachedPairMetrics {
  tvl: number
  volume24h: number
}

// In-memory cache for validated pair metrics only
const cache: { [pairAddress: string]: { metrics: CachedPairMetrics; timestamp: number } } = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const REQUEST_TIMEOUT_MS = 8000
const MAX_REASONABLE_APR = 500000
const EXPECTED_CHAIN_ID = 'pulsechain'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const normalizeAddress = (address: string): string => address.toLowerCase()

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
    return null
  }
  return parsed
}

const computeApr = (tvl: number, volume24h: number): number | null => {
  if (tvl <= 0 || volume24h <= 0) {
    return null
  }

  const apr = (volume24h * 0.075) / tvl * 365 * 100

  if (!Number.isFinite(apr) || apr < 0 || apr > MAX_REASONABLE_APR) {
    return null
  }

  return apr
}

const getCachedData = (pairAddress: string): CachedPairMetrics | null => {
  const cached = cache[pairAddress]
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.metrics
  }
  return null
}

const setCachedData = (pairAddress: string, metrics: CachedPairMetrics): void => {
  cache[pairAddress] = { metrics, timestamp: Date.now() }
}

const resolvePairMetrics = (data: unknown, pairAddress: string): CachedPairMetrics | null => {
  if (!isRecord(data)) {
    return null
  }

  const normalized = normalizeAddress(pairAddress)

  const dataPairs = Array.isArray(data.pairs) ? data.pairs : []
  const dataPair = isRecord(data.pair) ? data.pair : undefined

  const exactPair = dataPairs.find(p => isRecord(p) && typeof p.pairAddress === 'string' && normalizeAddress(p.pairAddress) === normalized)
  const fallbackPair =
    dataPair && typeof dataPair.pairAddress === 'string' && normalizeAddress(dataPair.pairAddress) === normalized
      ? dataPair
      : undefined

  const selected = (exactPair ?? fallbackPair) as Record<string, unknown> | undefined

  if (!selected) {
    return null
  }

  // If chain is present in response, enforce PulseChain match.
  if (typeof selected.chainId === 'string' && selected.chainId.toLowerCase() !== EXPECTED_CHAIN_ID) {
    return null
  }

  const liquidity = isRecord(selected.liquidity) ? selected.liquidity : undefined
  const volume = isRecord(selected.volume) ? selected.volume : undefined

  const tvl = toFiniteNumber(liquidity?.usd)
  const volume24h = toFiniteNumber(volume?.h24)

  if (tvl === null || volume24h === null || tvl <= 0 || volume24h <= 0) {
    return null
  }

  return { tvl, volume24h }
}

export const useDexScreenerAPR = (pair: Pair | undefined): APRData => {
  const [apr, setApr] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pair) {
      setApr(null)
      setError(null)
      return
    }

    const pairAddress = pair.liquidityToken.address

    // Check cache first
    const cachedMetrics = getCachedData(pairAddress)
    if (cachedMetrics) {
      const calculatedAPR = computeApr(cachedMetrics.tvl, cachedMetrics.volume24h)
      if (calculatedAPR !== null) {
        setApr(calculatedAPR)
        setError(null)
        return
      }
    }

    setLoading(true)
    setError(null)

    const fetchAPR = async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined
      try {
        const controller = new AbortController()
        timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
        const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/pulsechain/${pairAddress}`, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            Accept: 'application/json'
          }
        })

        if (!response.ok) {
          setApr(null)
          setError(null) // Silently fail for missing pairs
          setLoading(false)
          return
        }

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.toLowerCase().includes('application/json')) {
          setApr(null)
          setError(null)
          return
        }

        const data = (await response.json()) as unknown

        const metrics = resolvePairMetrics(data, pairAddress)

        if (metrics) {
          const calculatedAPR = computeApr(metrics.tvl, metrics.volume24h)
          if (calculatedAPR !== null) {
            setCachedData(pairAddress, metrics)
            setApr(calculatedAPR)
            setError(null)
          } else {
            setApr(null)
            setError(null)
          }
        } else {
          setApr(null)
          setError(null)
        }
      } catch (err) {
        console.debug('Failed to fetch APR from DexScreener:', err)
        setApr(null)
        setError(null) // Silently fail on error
      } finally {
        if (timeout) {
          clearTimeout(timeout)
        }
        setLoading(false)
      }
    }

    fetchAPR()

    // Auto-refresh every 60 seconds
    const refreshInterval = setInterval(fetchAPR, 60 * 1000)

    return () => clearInterval(refreshInterval)
  }, [pair])

  return { apr, loading, error }
}
