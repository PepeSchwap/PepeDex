import { Currency, CurrencyAmount, Pair, Token, Trade } from '@uniswap/sdk'
import flatMap from 'lodash.flatmap'
import { useMemo } from 'react'

import { BASES_TO_CHECK_TRADES_AGAINST, CUSTOM_BASES } from '../constants'
import { PairState, usePairs } from '../data/Reserves'
import { wrappedCurrency } from '../utils/wrappedCurrency'

import { useActiveWeb3React } from './index'

const DEFAULT_MAX_HOPS = 3
const DEFAULT_MAX_NUM_RESULTS = 3

function parsePositiveIntegerOrDefault(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

const MAX_ROUTE_HOPS = parsePositiveIntegerOrDefault(process.env.REACT_APP_V2_MAX_HOPS, DEFAULT_MAX_HOPS)
const MAX_ROUTE_RESULTS = parsePositiveIntegerOrDefault(
  process.env.REACT_APP_V2_MAX_NUM_RESULTS,
  DEFAULT_MAX_NUM_RESULTS
)

function useAllCommonPairs(currencyA?: Currency, currencyB?: Currency): Pair[] {
  const { chainId } = useActiveWeb3React()

  const bases: Token[] = chainId ? BASES_TO_CHECK_TRADES_AGAINST[chainId] : []

  const [tokenA, tokenB] = chainId
    ? [wrappedCurrency(currencyA, chainId), wrappedCurrency(currencyB, chainId)]
    : [undefined, undefined]

  const basePairs: [Token, Token][] = useMemo(
    () =>
      flatMap(bases, (base): [Token, Token][] => bases.map(otherBase => [base, otherBase])).filter(
        ([t0, t1]) => t0.address !== t1.address
      ),
    [bases]
  )

  const allPairCombinations: [Token, Token][] = useMemo(() => {
    if (!tokenA || !tokenB) return []

    const combinations: [Token, Token][] = [
      // the direct pair
      [tokenA, tokenB],
      // token A against all bases
      ...bases.map((base): [Token, Token] => [tokenA, base]),
      // token B against all bases
      ...bases.map((base): [Token, Token] => [tokenB, base]),
      // each base against all bases
      ...basePairs
    ]

    const filtered = combinations
      .filter((tokens): tokens is [Token, Token] => Boolean(tokens[0] && tokens[1]))
      .filter(([t0, t1]) => t0.address !== t1.address)
      .filter(([pairTokenA, pairTokenB]) => {
        if (!chainId) return true
        const customBases = CUSTOM_BASES[chainId]
        if (!customBases) return true

        const customBasesA: Token[] | undefined = customBases[pairTokenA.address]
        const customBasesB: Token[] | undefined = customBases[pairTokenB.address]

        if (!customBasesA && !customBasesB) return true

        if (customBasesA && !customBasesA.find(base => pairTokenB.equals(base))) return false
        if (customBasesB && !customBasesB.find(base => pairTokenA.equals(base))) return false

        return true
      })

    // avoid redundant reserve/multicall fetches for repeated token pairs
    return Object.values(
      filtered.reduce<{ [key: string]: [Token, Token] }>((memo, [firstToken, secondToken]) => {
        const [token0, token1] = firstToken.sortsBefore(secondToken) ? [firstToken, secondToken] : [secondToken, firstToken]
        const key = `${token0.address}-${token1.address}`
        memo[key] = memo[key] ?? [token0, token1]
        return memo
      }, {})
    )
  }, [tokenA, tokenB, bases, basePairs, chainId])

  const allPairs = usePairs(allPairCombinations)

  // only pass along valid pairs, non-duplicated pairs
  return useMemo(
    () =>
      Object.values(
        allPairs
          // filter out invalid pairs
          .filter((result): result is [PairState.EXISTS, Pair] => Boolean(result[0] === PairState.EXISTS && result[1]))
          // filter out duplicated pairs
          .reduce<{ [pairAddress: string]: Pair }>((memo, [, curr]) => {
            memo[curr.liquidityToken.address] = memo[curr.liquidityToken.address] ?? curr
            return memo
          }, {})
      ),
    [allPairs]
  )
}

/**
 * Returns the best trade for the exact amount of tokens in to the given token out
 */
export function useTradeExactIn(currencyAmountIn?: CurrencyAmount, currencyOut?: Currency): Trade | null {
  const allowedPairs = useAllCommonPairs(currencyAmountIn?.currency, currencyOut)
  return useMemo(() => {
    if (currencyAmountIn && currencyOut && allowedPairs.length > 0) {
      return Trade.bestTradeExactIn(allowedPairs, currencyAmountIn, currencyOut, {
        maxHops: MAX_ROUTE_HOPS,
        maxNumResults: MAX_ROUTE_RESULTS
      })[0] ?? null
    }
    return null
  }, [allowedPairs, currencyAmountIn, currencyOut])
}

/**
 * Returns the best trade for the token in to the exact amount of token out
 */
export function useTradeExactOut(currencyIn?: Currency, currencyAmountOut?: CurrencyAmount): Trade | null {
  const allowedPairs = useAllCommonPairs(currencyIn, currencyAmountOut?.currency)

  return useMemo(() => {
    if (currencyIn && currencyAmountOut && allowedPairs.length > 0) {
      return Trade.bestTradeExactOut(allowedPairs, currencyIn, currencyAmountOut, {
        maxHops: MAX_ROUTE_HOPS,
        maxNumResults: MAX_ROUTE_RESULTS
      })[0] ?? null
    }
    return null
  }, [allowedPairs, currencyIn, currencyAmountOut])
}
