import { JSBI, Pair } from '@uniswap/sdk'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTotalSupply } from '../../data/TotalSupply'
import { usePairs } from '../../data/Reserves'
import { useActiveWeb3React } from '../../hooks'
import { toV2LiquidityToken, useTrackedTokenPairs } from '../../state/user/hooks'
import { useTokenBalancesWithLoadingIndicator } from '../../state/wallet/hooks'
import useUSDCPrice from '../../utils/useUSDCPrice'
import MinimalPositionCard from '../../components/PositionCard'

type PairValueByAddress = { [pairAddress: string]: number }

function PairValueReporter({
  pair,
  userPoolBalance,
  onValue
}: {
  pair: Pair
  userPoolBalance: any
  onValue: (pairAddress: string, value: number) => void
}) {
  const totalPoolTokens = useTotalSupply(pair.liquidityToken)
  const token0UsdPrice = useUSDCPrice(pair.token0)
  const token1UsdPrice = useUSDCPrice(pair.token1)

  const [token0Deposited, token1Deposited] =
    !!pair &&
    !!totalPoolTokens &&
    !!userPoolBalance &&
    JSBI.greaterThanOrEqual(totalPoolTokens.raw, userPoolBalance.raw)
      ? [
          pair.getLiquidityValue(pair.token0, totalPoolTokens, userPoolBalance, false),
          pair.getLiquidityValue(pair.token1, totalPoolTokens, userPoolBalance, false)
        ]
      : [undefined, undefined]

  const derivedValue = useMemo(() => {
    try {
      const token0Price = token0UsdPrice ? Number(token0UsdPrice.toSignificant(12)) : undefined
      const token1Price = token1UsdPrice ? Number(token1UsdPrice.toSignificant(12)) : undefined

      const token0Amount = token0Deposited ? Number(token0Deposited.toExact()) : undefined
      const token1Amount = token1Deposited ? Number(token1Deposited.toExact()) : undefined

      const token0Value = token0Amount !== undefined && token0Price !== undefined ? token0Amount * token0Price : undefined
      const token1Value = token1Amount !== undefined && token1Price !== undefined ? token1Amount * token1Price : undefined

      const hasToken0 = token0Value !== undefined && Number.isFinite(token0Value)
      const hasToken1 = token1Value !== undefined && Number.isFinite(token1Value)

      if (!hasToken0 && !hasToken1) return 0
      return (hasToken0 ? token0Value ?? 0 : 0) + (hasToken1 ? token1Value ?? 0 : 0)
    } catch {
      return 0
    }
  }, [token0Deposited, token1Deposited, token0UsdPrice, token1UsdPrice])

  useEffect(() => {
    onValue(pair.liquidityToken.address, derivedValue)
  }, [derivedValue, onValue, pair.liquidityToken.address])

  return null
}

export default function PortfolioLPSection({
  accountOverride,
  onEstimatedValueChange,
  onLoadingChange
}: {
  accountOverride?: string
  onEstimatedValueChange?: (value: number) => void
  onLoadingChange?: (loading: boolean) => void
}) {
  const { account: connectedAccount } = useActiveWeb3React()
  const account = accountOverride ?? connectedAccount ?? undefined

  const [pairValuesByAddress, setPairValuesByAddress] = useState<PairValueByAddress>({})

  const trackedTokenPairs = useTrackedTokenPairs()
  const tokenPairsWithLiquidityTokens = useMemo(
    () => trackedTokenPairs.map(tokens => ({ liquidityToken: toV2LiquidityToken(tokens), tokens })),
    [trackedTokenPairs]
  )

  const liquidityTokens = useMemo(
    () => tokenPairsWithLiquidityTokens.map(item => item.liquidityToken),
    [tokenPairsWithLiquidityTokens]
  )

  const [v2PairsBalances, balancesLoading] = useTokenBalancesWithLoadingIndicator(account ?? undefined, liquidityTokens)

  useEffect(() => {
    if (onLoadingChange) onLoadingChange(Boolean(account) && balancesLoading)
  }, [account, balancesLoading, onLoadingChange])

  const liquidityTokensWithBalances = useMemo(
    () =>
      tokenPairsWithLiquidityTokens.filter(
        ({ liquidityToken }) => v2PairsBalances[liquidityToken.address]?.greaterThan('0')
      ),
    [tokenPairsWithLiquidityTokens, v2PairsBalances]
  )

  const v2Pairs = usePairs(liquidityTokensWithBalances.map(({ tokens }) => tokens))

  const handlePairValue = useCallback((pairAddress: string, value: number) => {
    setPairValuesByAddress(prev => {
      if ((prev[pairAddress] ?? 0) === value) return prev
      return { ...prev, [pairAddress]: value }
    })
  }, [])

  const lpValueUsd = useMemo(
    () => Object.values(pairValuesByAddress).reduce((sum, value) => sum + value, 0),
    [pairValuesByAddress]
  )

  useEffect(() => {
    if (onEstimatedValueChange) onEstimatedValueChange(lpValueUsd)
  }, [lpValueUsd, onEstimatedValueChange])

  useEffect(() => {
    setPairValuesByAddress({})
  }, [account])

  if (!account) return <div style={{ opacity: 0.8 }}>Select an address to view LP positions.</div>

  if (balancesLoading) {
    return (
      <div>
        <div style={{ opacity: 0.8, marginBottom: 10 }}>Loading LP positions...</div>
        <div style={{ fontWeight: 600 }}>Estimated LP Value: $0.00</div>
      </div>
    )
  }

  if (!liquidityTokensWithBalances.length) {
    return (
      <div>
        <div style={{ opacity: 0.8, marginBottom: 10 }}>No LP positions found.</div>
        <div style={{ fontWeight: 600 }}>Estimated LP Value: $0.00</div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ marginBottom: 12, fontWeight: 600 }}>
        Estimated LP Value: ${lpValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>
      {v2Pairs.map(([, pair], index) => {
        if (!pair) return null

        return (
          <React.Fragment key={pair.liquidityToken.address}>
            <PairValueReporter
              pair={pair}
              userPoolBalance={v2PairsBalances[pair.liquidityToken.address]}
              onValue={handlePairValue}
            />
            <MinimalPositionCard pair={pair} showUnwrapped accountOverride={account} />
          </React.Fragment>
        )
      })}
    </div>
  )
}
