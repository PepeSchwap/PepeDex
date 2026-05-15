import { Currency, Pair, Percent, Price } from '@uniswap/sdk'
// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useContext } from 'react'
import { Text } from 'rebass'
import { ThemeContext } from 'styled-components'
import { AutoColumn } from '../../components/Column'
import { RowBetween, RowFixed, AutoRow } from '../../components/Row'
import { ONE_BIPS } from '../../constants'
import { Field } from '../../state/mint/actions'
import { TYPE } from '../../theme'

function formatReserve(value: string): string {
  const num = parseFloat(value)
  if (isNaN(num)) return value
  // Show full integer part with commas, up to 4 decimal places (strip trailing zeros)
  const intPart = Math.floor(num)
  const fracPart = num - intPart
  const intFormatted = intPart.toLocaleString('en-US')
  if (fracPart === 0) return intFormatted
  const fracStr = fracPart.toFixed(4).slice(1).replace(/0+$/, '') // ".1234" stripped of trailing zeros
  return intFormatted + fracStr
}

export function PoolPriceBar({
  currencies,
  noLiquidity,
  poolTokenPercentage,
  price,
  pair
}: {
  currencies: { [field in Field]?: Currency }
  noLiquidity?: boolean
  poolTokenPercentage?: Percent
  price?: Price
  pair?: Pair | null
}) {
  const theme = useContext(ThemeContext)
  return (
    <AutoColumn gap="md">
      <AutoRow justify="space-around" gap="4px">
        <AutoColumn justify="center">
          <TYPE.black>{price?.toSignificant(6) ?? '-'}</TYPE.black>
          <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
            {currencies[Field.CURRENCY_B]?.symbol} per {currencies[Field.CURRENCY_A]?.symbol}
          </Text>
        </AutoColumn>
        <AutoColumn justify="center">
          <TYPE.black>{price?.invert()?.toSignificant(6) ?? '-'}</TYPE.black>
          <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
            {currencies[Field.CURRENCY_A]?.symbol} per {currencies[Field.CURRENCY_B]?.symbol}
          </Text>
        </AutoColumn>
        <AutoColumn justify="center">
          <TYPE.black>
            {noLiquidity && price
              ? '100'
              : (poolTokenPercentage?.lessThan(ONE_BIPS) ? '<0.01' : poolTokenPercentage?.toFixed(2)) ?? '0'}
            %
          </TYPE.black>
          <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
            Share of Pool
          </Text>
        </AutoColumn>
      </AutoRow>
      {pair && !noLiquidity && (
        <AutoColumn gap="4px" style={{ borderTop: `1px solid ${theme.bg3}`, paddingTop: '12px' }}>
          <RowBetween>
            <RowFixed>
              <Text fontWeight={500} fontSize={15} color={theme.text2}>
                Pool Reserves
              </Text>
            </RowFixed>
          </RowBetween>
          <RowBetween>
            <TYPE.black fontSize={15} color={theme.text2}>{pair.token0.symbol}</TYPE.black>
            <TYPE.black fontSize={15}>{formatReserve(pair.reserve0.toSignificant(18))}</TYPE.black>
          </RowBetween>
          <RowBetween>
            <TYPE.black fontSize={15} color={theme.text2}>{pair.token1.symbol}</TYPE.black>
            <TYPE.black fontSize={15}>{formatReserve(pair.reserve1.toSignificant(18))}</TYPE.black>
          </RowBetween>
        </AutoColumn>
      )}
    </AutoColumn>
  )
}
