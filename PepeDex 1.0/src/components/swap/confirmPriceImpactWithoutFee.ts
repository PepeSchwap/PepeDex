import { Percent } from '@uniswap/sdk'
import { ALLOWED_PRICE_IMPACT_HIGH, PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN } from '../../constants'

export type PriceImpactConfirmationRequirement = 'none' | 'confirm' | 'type-confirm'

/**
 * Given the price impact, get user confirmation.
 *
 * @param priceImpactWithoutFee price impact of the trade without the fee.
 */
export default function confirmPriceImpactWithoutFee(
  priceImpactWithoutFee: Percent
): PriceImpactConfirmationRequirement {
  if (!priceImpactWithoutFee.lessThan(PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN)) {
    return 'type-confirm'
  } else if (!priceImpactWithoutFee.lessThan(ALLOWED_PRICE_IMPACT_HIGH)) {
    return 'confirm'
  }
  return 'none'
}
