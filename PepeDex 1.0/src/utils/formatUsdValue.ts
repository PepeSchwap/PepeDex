import { CurrencyAmount, ETHER, Price, Token, TokenAmount, WETH } from '@uniswap/sdk'

export default function formatUsdValue(amount?: CurrencyAmount, price?: Price): string | undefined {
  if (!amount || !price) return undefined

  const quoteToUsdString = (amountToQuote: CurrencyAmount): string | undefined => {
    const quotedAmount = price.quote(amountToQuote)
    const numericValue = Number(quotedAmount.toExact())
    if (!Number.isFinite(numericValue)) return undefined

    return `$${numericValue.toLocaleString(undefined, {
      minimumFractionDigits: numericValue >= 1 ? 2 : 2,
      maximumFractionDigits: numericValue >= 1 ? 2 : 6
    })}`
  }

  try {
    return quoteToUsdString(amount)
  } catch {
    try {
      if (amount.currency === ETHER && price.baseCurrency instanceof Token) {
        const base = price.baseCurrency
        const nativeWrapped = WETH[base.chainId]
        if (nativeWrapped && base.equals(nativeWrapped)) {
          return quoteToUsdString(new TokenAmount(base, amount.raw))
        }
      }

      if (amount.currency instanceof Token && price.baseCurrency === ETHER) {
        const wrappedNative = WETH[amount.currency.chainId]
        if (wrappedNative && amount.currency.equals(wrappedNative)) {
          return quoteToUsdString(new TokenAmount(wrappedNative, amount.raw))
        }
      }

      return undefined
    } catch {
      return undefined
    }
  }
}
