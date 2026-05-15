import { JSBI, Pair, Percent } from '@uniswap/sdk'
import { darken, lighten } from 'polished'
// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useContext, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'react-feather'
import { Link } from 'react-router-dom'
import { Text } from 'rebass'
import styled, { ThemeContext } from 'styled-components'
import { useTotalSupply } from '../../data/TotalSupply'

import { useActiveWeb3React } from '../../hooks'
import { useDexScreenerAPR } from '../../hooks/useDexScreenerAPR'
import useLiquidityPerformance from '../../hooks/useLiquidityPerformance'
import { useTokenBalance } from '../../state/wallet/hooks'
import { ExternalLink } from '../../theme'
import { currencyId } from '../../utils/currencyId'
import useUSDCPrice from '../../utils/useUSDCPrice'
import { unwrappedToken } from '../../utils/wrappedCurrency'
import { ButtonSecondary } from '../Button'

import Card, { GreyCard } from '../Card'
import { AutoColumn } from '../Column'
import CurrencyLogo from '../CurrencyLogo'
import DoubleCurrencyLogo from '../DoubleLogo'
import { AutoRow, RowBetween, RowFixed } from '../Row'
import { Dots } from '../swap/styleds'

function formatUsdTotal(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: value >= 1 ? 2 : 2,
    maximumFractionDigits: value >= 1 ? 2 : 6
  })}`
}

function formatPnlUsd(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return '-'
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${formatUsdTotal(Math.abs(value))}`
}

function formatPnlPercent(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return '-'
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${Math.abs(value).toFixed(2)}%`
}

function pnlPercentColor(theme: any, value?: number): string {
  if (value === undefined || !Number.isFinite(value) || value === 0) return '#888D9B'
  if (value > 0) return theme?.green1 ?? '#27ae60'
  return theme?.red1 ?? '#ff5c5c'
}

export const FixedHeightRow = styled(RowBetween)`
  height: 24px;
`

export const HoverCard = styled(Card)`
  border: 1px solid ${({ theme }) => {
    // Dark mode: lighten for visibility; Light mode: darken for contrast
    const isDarkMode = theme.bg1 === '#121416'
    return isDarkMode ? lighten(0.12, theme.bg2) : darken(0.1, theme.bg2)
  }};
  :hover {
    border: 1px solid ${({ theme }) => {
      const isDarkMode = theme.bg1 === '#121416'
      return isDarkMode ? lighten(0.18, theme.bg2) : darken(0.15, theme.bg2)
    }};
  }
`

interface PositionCardProps {
  pair: Pair
  showUnwrapped?: boolean
  border?: string
  accountOverride?: string
}

export function MinimalPositionCard({ pair, showUnwrapped = false, border, accountOverride }: PositionCardProps) {
  const { account, chainId } = useActiveWeb3React()
  const theme = useContext(ThemeContext)
  const viewerAccount = accountOverride ?? account ?? undefined

  const currency0 = showUnwrapped ? pair.token0 : unwrappedToken(pair.token0)
  const currency1 = showUnwrapped ? pair.token1 : unwrappedToken(pair.token1)

  const [showMore, setShowMore] = useState(false)

  const userPoolBalance = useTokenBalance(viewerAccount, pair.liquidityToken)
  const totalPoolTokens = useTotalSupply(pair.liquidityToken)

  const [token0Deposited, token1Deposited] =
    !!pair &&
    !!totalPoolTokens &&
    !!userPoolBalance &&
    // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
    JSBI.greaterThanOrEqual(totalPoolTokens.raw, userPoolBalance.raw)
      ? [
          pair.getLiquidityValue(pair.token0, totalPoolTokens, userPoolBalance, false),
          pair.getLiquidityValue(pair.token1, totalPoolTokens, userPoolBalance, false)
        ]
      : [undefined, undefined]

  const token0UsdPrice = useUSDCPrice(pair.token0)
  const token1UsdPrice = useUSDCPrice(pair.token1)

  const { apr: aprData, loading: aprLoading } = useDexScreenerAPR(pair)

  const [derivedToken0UsdPrice, derivedToken1UsdPrice] = useMemo(() => {
    const token0PriceInToken1 = pair.priceOf(pair.token0)
    const token1PriceInToken0 = pair.priceOf(pair.token1)

    const resolvedToken0Usd = token0UsdPrice ?? (token1UsdPrice ? token0PriceInToken1.multiply(token1UsdPrice) : undefined)
    const resolvedToken1Usd = token1UsdPrice ?? (token0UsdPrice ? token1PriceInToken0.multiply(token0UsdPrice) : undefined)

    return [resolvedToken0Usd, resolvedToken1Usd]
  }, [pair, token0UsdPrice, token1UsdPrice])

  const totalPositionUsdValue = useMemo(() => {
    try {
      const token0Usd =
        token0Deposited && derivedToken0UsdPrice ? Number(derivedToken0UsdPrice.quote(token0Deposited).toExact()) : NaN
      const token1Usd =
        token1Deposited && derivedToken1UsdPrice ? Number(derivedToken1UsdPrice.quote(token1Deposited).toExact()) : NaN

      const hasToken0 = Number.isFinite(token0Usd)
      const hasToken1 = Number.isFinite(token1Usd)

      if (!hasToken0 && !hasToken1) return undefined
      return (hasToken0 ? token0Usd : 0) + (hasToken1 ? token1Usd : 0)
    } catch {
      return undefined
    }
  }, [token0Deposited, token1Deposited, derivedToken0UsdPrice, derivedToken1UsdPrice])

  const totalPositionUsd = useMemo(
    () => (totalPositionUsdValue !== undefined ? formatUsdTotal(totalPositionUsdValue) : undefined),
    [totalPositionUsdValue]
  )

  const { pnlUsd, pnlPercent } = useLiquidityPerformance({
    chainId,
    account: viewerAccount,
    pairAddress: pair.liquidityToken.address,
    balanceRaw: userPoolBalance?.raw?.toString(),
    currentValueUsd: totalPositionUsdValue
  })

  return (
    <>
      {userPoolBalance && (
        <GreyCard border={border}>
          <AutoColumn gap="12px">
            <FixedHeightRow>
              <RowFixed>
                <Text fontWeight={500} fontSize={16}>
                  Your position
                </Text>
              </RowFixed>
            </FixedHeightRow>
            <FixedHeightRow onClick={() => setShowMore(!showMore)}>
              <RowFixed>
                <DoubleCurrencyLogo currency0={currency0} currency1={currency1} margin={true} size={20} />
                <Text fontWeight={500} fontSize={20}>
                  {currency0.symbol}/{currency1.symbol}
                </Text>
              </RowFixed>
              <RowFixed>
                <Text fontWeight={500} fontSize={20}>
                  {userPoolBalance ? userPoolBalance.toSignificant(4) : '-'}
                </Text>
              </RowFixed>
            </FixedHeightRow>
            <AutoColumn gap="4px">
              <FixedHeightRow>
                <Text color="#888D9B" fontSize={16} fontWeight={500}>
                  Position USD:
                </Text>
                <Text color="#888D9B" fontSize={16} fontWeight={500} marginLeft={'6px'}>
                  {totalPositionUsd ?? '-'}
                </Text>
              </FixedHeightRow>
              <FixedHeightRow>
                <Text color="#888D9B" fontSize={16} fontWeight={500}>
                  APR:
                </Text>
                <Text color="#888D9B" fontSize={16} fontWeight={500} marginLeft={'6px'}>
                  {aprLoading ? '—' : aprData ? `${aprData.toFixed(2)}%` : '-'}
                </Text>
              </FixedHeightRow>
              <FixedHeightRow>
                <Text color="#888D9B" fontSize={16} fontWeight={500}>
                  P/L:
                </Text>
                <RowFixed style={{ marginLeft: '6px' }}>
                  <Text color="#888D9B" fontSize={16} fontWeight={500}>
                    {formatPnlUsd(pnlUsd)}
                  </Text>
                  <Text color={pnlPercentColor(theme, pnlPercent)} fontSize={16} fontWeight={500} marginLeft={'4px'}>
                    ({formatPnlPercent(pnlPercent)})
                  </Text>
                </RowFixed>
              </FixedHeightRow>
              <FixedHeightRow>
                <Text color="#888D9B" fontSize={16} fontWeight={500}>
                  {currency0.symbol}:
                </Text>
                {token0Deposited ? (
                  <RowFixed>
                    <Text color="#888D9B" fontSize={16} fontWeight={500} marginLeft={'6px'}>
                      {token0Deposited?.toSignificant(6)}
                    </Text>
                  </RowFixed>
                ) : (
                  '-'
                )}
              </FixedHeightRow>
              <FixedHeightRow>
                <Text color="#888D9B" fontSize={16} fontWeight={500}>
                  {currency1.symbol}:
                </Text>
                {token1Deposited ? (
                  <RowFixed>
                    <Text color="#888D9B" fontSize={16} fontWeight={500} marginLeft={'6px'}>
                      {token1Deposited?.toSignificant(6)}
                    </Text>
                  </RowFixed>
                ) : (
                  '-'
                )}
              </FixedHeightRow>
            </AutoColumn>
          </AutoColumn>
        </GreyCard>
      )}
    </>
  )
}

export default function FullPositionCard({ pair, border, accountOverride }: PositionCardProps) {
  const { account, chainId } = useActiveWeb3React()
  const theme = useContext(ThemeContext)
  const viewerAccount = accountOverride ?? account ?? undefined

  const currency0 = unwrappedToken(pair.token0)
  const currency1 = unwrappedToken(pair.token1)

  const [showMore, setShowMore] = useState(false)

  const userPoolBalance = useTokenBalance(viewerAccount, pair.liquidityToken)
  const totalPoolTokens = useTotalSupply(pair.liquidityToken)

  const poolTokenPercentage =
    !!userPoolBalance && !!totalPoolTokens && JSBI.greaterThanOrEqual(totalPoolTokens.raw, userPoolBalance.raw)
      ? new Percent(userPoolBalance.raw, totalPoolTokens.raw)
      : undefined

  const [token0Deposited, token1Deposited] =
    !!pair &&
    !!totalPoolTokens &&
    !!userPoolBalance &&
    // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
    JSBI.greaterThanOrEqual(totalPoolTokens.raw, userPoolBalance.raw)
      ? [
          pair.getLiquidityValue(pair.token0, totalPoolTokens, userPoolBalance, false),
          pair.getLiquidityValue(pair.token1, totalPoolTokens, userPoolBalance, false)
        ]
      : [undefined, undefined]

  const token0UsdPrice = useUSDCPrice(pair.token0)
  const token1UsdPrice = useUSDCPrice(pair.token1)

  const { apr: aprData, loading: aprLoading } = useDexScreenerAPR(pair)

  const [derivedToken0UsdPrice, derivedToken1UsdPrice] = useMemo(() => {
    const token0PriceInToken1 = pair.priceOf(pair.token0)
    const token1PriceInToken0 = pair.priceOf(pair.token1)

    const resolvedToken0Usd = token0UsdPrice ?? (token1UsdPrice ? token0PriceInToken1.multiply(token1UsdPrice) : undefined)
    const resolvedToken1Usd = token1UsdPrice ?? (token0UsdPrice ? token1PriceInToken0.multiply(token0UsdPrice) : undefined)

    return [resolvedToken0Usd, resolvedToken1Usd]
  }, [pair, token0UsdPrice, token1UsdPrice])

  const totalPositionUsdValue = useMemo(() => {
    try {
      const token0Usd =
        token0Deposited && derivedToken0UsdPrice ? Number(derivedToken0UsdPrice.quote(token0Deposited).toExact()) : NaN
      const token1Usd =
        token1Deposited && derivedToken1UsdPrice ? Number(derivedToken1UsdPrice.quote(token1Deposited).toExact()) : NaN

      const hasToken0 = Number.isFinite(token0Usd)
      const hasToken1 = Number.isFinite(token1Usd)

      if (!hasToken0 && !hasToken1) return undefined
      return (hasToken0 ? token0Usd : 0) + (hasToken1 ? token1Usd : 0)
    } catch {
      return undefined
    }
  }, [token0Deposited, token1Deposited, derivedToken0UsdPrice, derivedToken1UsdPrice])

  const totalPositionUsd = useMemo(
    () => (totalPositionUsdValue !== undefined ? formatUsdTotal(totalPositionUsdValue) : undefined),
    [totalPositionUsdValue]
  )

  const { pnlUsd, pnlPercent } = useLiquidityPerformance({
    chainId,
    account: viewerAccount,
    pairAddress: pair.liquidityToken.address,
    balanceRaw: userPoolBalance?.raw?.toString(),
    currentValueUsd: totalPositionUsdValue
  })

  return (
    <HoverCard border={border}>
      <AutoColumn gap="12px">
        <FixedHeightRow onClick={() => setShowMore(!showMore)} style={{ cursor: 'pointer' }}>
          <RowFixed>
            <DoubleCurrencyLogo currency0={currency0} currency1={currency1} margin={true} size={20} />
            <Text fontWeight={500} fontSize={20}>
              {!currency0 || !currency1 ? <Dots>Loading</Dots> : `${currency0.symbol}/${currency1.symbol}`}
            </Text>
          </RowFixed>
          <RowFixed>
            {showMore ? (
              <ChevronUp size="20" style={{ marginLeft: '10px' }} />
            ) : (
              <ChevronDown size="20" style={{ marginLeft: '10px' }} />
            )}
          </RowFixed>
        </FixedHeightRow>
        {showMore && (
          <AutoColumn gap="8px">
            <FixedHeightRow>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  Pooled {currency0.symbol}:
                </Text>
              </RowFixed>
              {token0Deposited ? (
                <RowFixed>
                  <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
                    {token0Deposited?.toSignificant(6)}
                  </Text>
                  <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={currency0} />
                </RowFixed>
              ) : (
                '-'
              )}
            </FixedHeightRow>

            <FixedHeightRow>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  Pooled {currency1.symbol}:
                </Text>
              </RowFixed>
              {token1Deposited ? (
                <RowFixed>
                  <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
                    {token1Deposited?.toSignificant(6)}
                  </Text>
                  <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={currency1} />
                </RowFixed>
              ) : (
                '-'
              )}
            </FixedHeightRow>
            <FixedHeightRow>
              <Text fontSize={16} fontWeight={500}>
                Your pool tokens:
              </Text>
              <Text fontSize={16} fontWeight={500}>
                {userPoolBalance ? userPoolBalance.toSignificant(4) : '-'}
              </Text>
            </FixedHeightRow>
            <FixedHeightRow>
              <Text fontSize={16} fontWeight={500}>
                Your pool share:
              </Text>
              <Text fontSize={16} fontWeight={500}>
                {poolTokenPercentage ? poolTokenPercentage.toFixed(2) + '%' : '-'}
              </Text>
            </FixedHeightRow>
            <FixedHeightRow>
              <Text fontSize={16} fontWeight={500}>
                Position USD:
              </Text>
              <Text fontSize={16} fontWeight={500}>
                {totalPositionUsd ?? '-'}
              </Text>
            </FixedHeightRow>
            <FixedHeightRow>
              <Text fontSize={16} fontWeight={500}>
                APR:
              </Text>
              <Text fontSize={16} fontWeight={500}>
                {aprLoading ? '—' : aprData ? `${aprData.toFixed(2)}%` : '-'}
              </Text>
            </FixedHeightRow>
            <FixedHeightRow>
              <Text fontSize={16} fontWeight={500}>
                Unrealized P/L:
              </Text>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  {formatPnlUsd(pnlUsd)}
                </Text>
                <Text color={pnlPercentColor(theme, pnlPercent)} fontSize={16} fontWeight={500} marginLeft={'4px'}>
                  ({formatPnlPercent(pnlPercent)})
                </Text>
              </RowFixed>
            </FixedHeightRow>

            <AutoRow justify="center" marginTop={'10px'}>
              <ExternalLink href={`https://dexscreener.com/pulsechain/${pair.liquidityToken.address}`}>
                View pool information {'\u2197'}
              </ExternalLink>
            </AutoRow>
            <RowBetween marginTop="10px">
              <ButtonSecondary as={Link} to={`/add/${currencyId(currency0)}/${currencyId(currency1)}`} width="48%">
                Add
              </ButtonSecondary>
              <ButtonSecondary as={Link} width="48%" to={`/remove/${currencyId(currency0)}/${currencyId(currency1)}`}>
                Remove
              </ButtonSecondary>
            </RowBetween>
          </AutoColumn>
        )}
      </AutoColumn>
    </HoverCard>
  )
}
