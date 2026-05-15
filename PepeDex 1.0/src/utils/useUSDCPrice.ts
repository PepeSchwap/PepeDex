import { ChainId, Currency, currencyEquals, JSBI, Price, Token, WETH } from '@uniswap/sdk'
import { useEffect, useMemo, useState } from 'react'
import { Contract } from '@ethersproject/contracts'
import { EXTERNAL_PLS_PRICE_PAIR, EXTERNAL_PLS_PRICE_ROUTER, USDC } from '../constants'
import { PairState, usePairs } from '../data/Reserves'
import { useActiveWeb3React } from '../hooks'
import { wrappedCurrency } from './wrappedCurrency'

const PAIR_ABI = [
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
]

const ERC20_ABI = ['function decimals() view returns (uint8)']
const ROUTER_ABI = ['function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)']

/**
 * Returns the price in USDC of the input currency
 * @param currency currency to compute the USDC price of
 */
export default function useUSDCPrice(currency?: Currency): Price | undefined {
  const { chainId, library } = useActiveWeb3React()
  const [externalWplsUsdcPrice, setExternalWplsUsdcPrice] = useState<Price>()
  const wrapped = wrappedCurrency(currency, chainId)

  useEffect(() => {
    let cancelled = false

    async function fetchExternalWplsUsdPrice() {
      if (!chainId || chainId !== ChainId.MAINNET || !library || !WETH[chainId]) {
        if (!cancelled) setExternalWplsUsdcPrice(undefined)
        return
      }

      try {
        const pairContract = new Contract(EXTERNAL_PLS_PRICE_PAIR, PAIR_ABI, library)
        const routerContract = new Contract(EXTERNAL_PLS_PRICE_ROUTER, ROUTER_ABI, library)
        const [token0Address, token1Address, reserves] = await Promise.all([
          pairContract.token0(),
          pairContract.token1(),
          pairContract.getReserves()
        ])

        const wplsAddress = WETH[chainId].address.toLowerCase()
        const token0Lower = String(token0Address).toLowerCase()
        const token1Lower = String(token1Address).toLowerCase()

        const wplsIsToken0 = token0Lower === wplsAddress
        const wplsIsToken1 = token1Lower === wplsAddress

        if (!wplsIsToken0 && !wplsIsToken1) {
          if (!cancelled) setExternalWplsUsdcPrice(undefined)
          return
        }

        const quoteTokenAddress = wplsIsToken0 ? token1Address : token0Address
        const quoteTokenContract = new Contract(quoteTokenAddress, ERC20_ABI, library)

        const [quoteDecimals] = await Promise.all([quoteTokenContract.decimals()])

        const reserve0 = JSBI.BigInt(reserves.reserve0.toString())
        const reserve1 = JSBI.BigInt(reserves.reserve1.toString())

        const reserveWpls = wplsIsToken0 ? reserve0 : reserve1
        const reserveQuote = wplsIsToken0 ? reserve1 : reserve0

        if (JSBI.equal(reserveWpls, JSBI.BigInt(0)) || JSBI.equal(reserveQuote, JSBI.BigInt(0))) {
          if (!cancelled) setExternalWplsUsdcPrice(undefined)
          return
        }

        const quoteToken = new Token(chainId, quoteTokenAddress, quoteDecimals, 'QUOTE', 'Quote Token')
        const wplsQuotePrice = new Price(WETH[chainId], quoteToken, reserveWpls, reserveQuote)

        const amountInQuoteRaw = JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(quoteDecimals)).toString()
        const quoteTokenLower = String(quoteTokenAddress).toLowerCase()

        let amountsOut: string[] | undefined
        if (quoteTokenLower === USDC.address.toLowerCase()) {
          amountsOut = [amountInQuoteRaw, amountInQuoteRaw]
        } else {
          try {
            const direct = await routerContract.getAmountsOut(amountInQuoteRaw, [quoteTokenAddress, USDC.address])
            amountsOut = direct.map((amount: { toString: () => string }) => amount.toString())
          } catch {
            const viaWpls = await routerContract.getAmountsOut(amountInQuoteRaw, [
              quoteTokenAddress,
              WETH[chainId].address,
              USDC.address
            ])
            amountsOut = viaWpls.map((amount: { toString: () => string }) => amount.toString())
          }
        }

        if (!amountsOut || amountsOut.length < 2) {
          if (!cancelled) setExternalWplsUsdcPrice(undefined)
          return
        }

        const usdcOutRaw = amountsOut[amountsOut.length - 1]
        if (!usdcOutRaw || usdcOutRaw === '0') {
          if (!cancelled) setExternalWplsUsdcPrice(undefined)
          return
        }

        const quoteUsdcPrice = new Price(quoteToken, USDC, amountInQuoteRaw, usdcOutRaw)
        const wplsUsdcPrice = wplsQuotePrice.multiply(quoteUsdcPrice)

        if (!cancelled) {
          setExternalWplsUsdcPrice(new Price(WETH[chainId], USDC, wplsUsdcPrice.denominator, wplsUsdcPrice.numerator))
        }
      } catch {
        if (!cancelled) setExternalWplsUsdcPrice(undefined)
      }
    }

    fetchExternalWplsUsdPrice()

    return () => {
      cancelled = true
    }
  }, [chainId, library])

  const tokenPairs: [Currency | undefined, Currency | undefined][] = useMemo(
    () => [
      [
        chainId && wrapped && currencyEquals(WETH[chainId], wrapped) ? undefined : currency,
        chainId ? WETH[chainId] : undefined
      ],
      [wrapped?.equals(USDC) ? undefined : wrapped, chainId === ChainId.MAINNET ? USDC : undefined],
      [chainId ? WETH[chainId] : undefined, chainId === ChainId.MAINNET ? USDC : undefined]
    ],
    [chainId, currency, wrapped]
  )
  const [[ethPairState, ethPair], [usdcPairState, usdcPair], [usdcEthPairState, usdcEthPair]] = usePairs(tokenPairs)

  return useMemo(() => {
    if (!currency || !wrapped || !chainId) {
      return undefined
    }
    // handle weth/eth
    if (wrapped.equals(WETH[chainId])) {
      if (externalWplsUsdcPrice) {
        return new Price(currency, USDC, externalWplsUsdcPrice.denominator, externalWplsUsdcPrice.numerator)
      }
      if (usdcPair) {
        const price = usdcPair.priceOf(WETH[chainId])
        return new Price(currency, USDC, price.denominator, price.numerator)
      } else {
        return undefined
      }
    }
    // handle usdc
    if (wrapped.equals(USDC)) {
      return new Price(USDC, USDC, '1', '1')
    }

    const ethPairETHAmount = ethPair?.reserveOf(WETH[chainId])
    const ethPairETHUSDCValue: JSBI =
      ethPairETHAmount && usdcEthPair ? usdcEthPair.priceOf(WETH[chainId]).quote(ethPairETHAmount).raw : JSBI.BigInt(0)

    if (ethPairState === PairState.EXISTS && ethPair && externalWplsUsdcPrice) {
      const currencyWplsPrice = ethPair.priceOf(wrapped)
      const usdcPrice = currencyWplsPrice.multiply(externalWplsUsdcPrice)
      return new Price(currency, USDC, usdcPrice.denominator, usdcPrice.numerator)
    }

    // all other tokens
    // first try the usdc pair
    if (usdcPairState === PairState.EXISTS && usdcPair && usdcPair.reserveOf(USDC).greaterThan(ethPairETHUSDCValue)) {
      const price = usdcPair.priceOf(wrapped)
      return new Price(currency, USDC, price.denominator, price.numerator)
    }
    if (ethPairState === PairState.EXISTS && ethPair && usdcEthPairState === PairState.EXISTS && usdcEthPair) {
      if (usdcEthPair.reserveOf(USDC).greaterThan('0') && ethPair.reserveOf(WETH[chainId]).greaterThan('0')) {
        const ethUsdcPrice = usdcEthPair.priceOf(USDC)
        const currencyEthPrice = ethPair.priceOf(WETH[chainId])
        const usdcPrice = ethUsdcPrice.multiply(currencyEthPrice).invert()
        return new Price(currency, USDC, usdcPrice.denominator, usdcPrice.numerator)
      }
    }
    return undefined
  }, [
    chainId,
    currency,
    ethPair,
    ethPairState,
    externalWplsUsdcPrice,
    usdcEthPair,
    usdcEthPairState,
    usdcPair,
    usdcPairState,
    wrapped
  ])
}
