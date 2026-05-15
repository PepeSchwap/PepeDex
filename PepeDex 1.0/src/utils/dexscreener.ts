// Dexscreener API helpers
// https://api.dexscreener.com/latest/dex/tokens/{address}

export interface DexscreenerTokenInfo {
  address: string
  priceUsd?: number
  priceChange24h?: number
}

export async function fetchDexscreenerToken(address: string): Promise<DexscreenerTokenInfo | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`)
    if (!res.ok) return null
    const data = await res.json()
    // Pick the best market by highest USD liquidity.
    const pairs = Array.isArray(data.pairs) ? data.pairs : []
    const market = pairs
      .filter((pair: any) => pair && pair.priceUsd)
      .sort((a: any, b: any) => (Number(b?.liquidity?.usd) || 0) - (Number(a?.liquidity?.usd) || 0))[0]
    if (!market) return null

    const priceChange24hRaw = market?.priceChange?.h24 ?? market?.priceChange24h ?? market?.priceChange
    const parsedPriceChange24h =
      priceChange24hRaw !== undefined && priceChange24hRaw !== null ? Number(priceChange24hRaw) : undefined

    return {
      address,
      priceUsd: market.priceUsd ? Number(market.priceUsd) : undefined,
      priceChange24h: Number.isFinite(parsedPriceChange24h as number) ? parsedPriceChange24h : undefined
    }
  } catch {
    return null
  }
}
