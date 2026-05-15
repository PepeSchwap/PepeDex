import { CurrencyAmount, Trade, TradeType } from '@uniswap/sdk'
// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useContext, useMemo, useState } from 'react'
import { Repeat } from 'react-feather'
import { Text } from 'rebass'
import { ThemeContext } from 'styled-components'
import { Field } from '../../state/swap/actions'
import { TYPE } from '../../theme'
import {
  computeSlippageAdjustedAmounts,
  computeTradePriceBreakdown,
  formatExecutionPrice,
  warningSeverity
} from '../../utils/prices'
import { ButtonError } from '../Button'
import { AutoColumn } from '../Column'
import QuestionHelper from '../QuestionHelper'
import { AutoRow, RowBetween, RowFixed } from '../Row'
import FormattedPriceImpact from './FormattedPriceImpact'
import { StyledBalanceMaxMini, SwapCallbackError } from './styleds'

export default function SwapModalFooter({
  trade,
  onConfirm,
  allowedSlippage,
  swapErrorMessage,
  disabledConfirm
}: {
  trade: Trade
  allowedSlippage: number
  onConfirm: () => void
  swapErrorMessage: string | undefined
  disabledConfirm: boolean
}) {
  const [showInverted, setShowInverted] = useState<boolean>(false)
  const theme = useContext(ThemeContext)
  const slippageAdjustedAmounts = useMemo(() => computeSlippageAdjustedAmounts(trade, allowedSlippage), [
    allowedSlippage,
    trade
  ])
  const { priceImpactWithoutFee, realizedLPFee } = useMemo(() => computeTradePriceBreakdown(trade), [trade])
  const severity = warningSeverity(priceImpactWithoutFee)
  const hops = trade.route.pairs.length
  const routePath = trade.route.path.map(token => token.symbol).join(' -> ')

  function formatReserve(amount: CurrencyAmount): string {
    const num = parseFloat(amount.toSignificant(20))
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B'
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K'
    return amount.toSignificant(6)
  }

  return (
    <>
      <AutoColumn gap="0px">
        <RowBetween align="center">
          <Text fontWeight={400} fontSize={14} color={theme.text2}>
            Price
          </Text>
          <Text
            fontWeight={500}
            fontSize={14}
            color={theme.text1}
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              display: 'flex',
              textAlign: 'right',
              paddingLeft: '10px'
            }}
          >
            {formatExecutionPrice(trade, showInverted)}
            <StyledBalanceMaxMini onClick={() => setShowInverted(!showInverted)}>
              <Repeat size={14} />
            </StyledBalanceMaxMini>
          </Text>
        </RowBetween>

        {trade.route.pairs.map((pair, i) => (
          <RowBetween key={i} align="flex-start">
            <RowFixed>
              <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
                {trade.route.pairs.length > 1 ? `Pool Reserves (hop ${i + 1})` : 'Pool Reserves'}
              </TYPE.black>
              <QuestionHelper text="Current liquidity in this pool. Larger reserves mean lower price impact for your trade." />
            </RowFixed>
            <TYPE.black fontSize={14} style={{ textAlign: 'right', maxWidth: '60%' }}>
              {formatReserve(pair.reserve0)} {pair.token0.symbol} / {formatReserve(pair.reserve1)} {pair.token1.symbol}
            </TYPE.black>
          </RowBetween>
        ))}

        <RowBetween>
          <RowFixed>
            <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
              {trade.tradeType === TradeType.EXACT_INPUT ? 'Minimum received' : 'Maximum sold'}
            </TYPE.black>
            <QuestionHelper text="Your transaction will revert if there is a large, unfavorable price movement before it is confirmed." />
          </RowFixed>
          <RowFixed>
            <TYPE.black fontSize={14}>
              {trade.tradeType === TradeType.EXACT_INPUT
                ? slippageAdjustedAmounts[Field.OUTPUT]?.toSignificant(4) ?? '-'
                : slippageAdjustedAmounts[Field.INPUT]?.toSignificant(4) ?? '-'}
            </TYPE.black>
            <TYPE.black fontSize={14} marginLeft={'4px'}>
              {trade.tradeType === TradeType.EXACT_INPUT
                ? trade.outputAmount.currency.symbol
                : trade.inputAmount.currency.symbol}
            </TYPE.black>
          </RowFixed>
        </RowBetween>
        <RowBetween>
          <RowFixed>
            <TYPE.black color={theme.text2} fontSize={14} fontWeight={400}>
              Price Impact
            </TYPE.black>
            <QuestionHelper text="The difference between the market price and your price due to trade size." />
          </RowFixed>
          <FormattedPriceImpact priceImpact={priceImpactWithoutFee} />
        </RowBetween>
        <RowBetween>
          <RowFixed>
            <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
              Slippage Tolerance
            </TYPE.black>
          </RowFixed>
          <TYPE.black fontSize={14}>{(allowedSlippage / 100).toFixed(2)}%</TYPE.black>
        </RowBetween>
        <RowBetween>
          <RowFixed>
            <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
              Liquidity Provider Fee
            </TYPE.black>
            <QuestionHelper text="A portion of each trade (15%) goes to liquidity providers as a protocol incentive." />
          </RowFixed>
          <TYPE.black fontSize={14}>
            {realizedLPFee ? realizedLPFee?.toSignificant(6) + ' ' + trade.inputAmount.currency.symbol : '-'}
          </TYPE.black>
        </RowBetween>
        <RowBetween align="flex-start">
          <RowFixed>
            <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
              Route ({hops} {hops === 1 ? 'hop' : 'hops'})
            </TYPE.black>
          </RowFixed>
          <TYPE.black fontSize={14} style={{ textAlign: 'right', maxWidth: '60%' }}>
            {routePath}
          </TYPE.black>
        </RowBetween>
      </AutoColumn>

      <AutoRow>
        <ButtonError
          onClick={onConfirm}
          disabled={disabledConfirm}
          error={severity > 2}
          style={{ margin: '10px 0 0 0' }}
          id="confirm-swap-or-send"
        >
          <Text fontSize={20} fontWeight={500}>
            {severity > 2 ? 'Swap Anyway' : 'Confirm Swap'}
          </Text>
        </ButtonError>

        {swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}
      </AutoRow>
    </>
  )
}
