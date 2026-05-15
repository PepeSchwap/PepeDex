import { ChainId } from '@uniswap/sdk'
// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React from 'react'
import { isMobile } from 'react-device-detect'
import { Text } from 'rebass'

import styled from 'styled-components'

//import Logo from '../../assets/images/exe.jpg'
//import LogoDark from '../../assets/images/exe.jpg'
import Wordmark from '../../assets/images/peps.png'
import WordmarkDark from '../../assets/images/peps.png'
import { useActiveWeb3React } from '../../hooks'
import { useToken } from '../../hooks/Tokens'
import { useDarkModeManager } from '../../state/user/hooks'
import { useETHBalances } from '../../state/wallet/hooks'
import useUSDCPrice from '../../utils/useUSDCPrice'

import { YellowCard } from '../Card'
import Settings from '../Settings'
import Menu from '../Menu'

import Web3Status from '../Web3Status'
//import VersionSwitch from './VersionSwitch'

const HeaderFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: column;
  width: 100%;
  top: 0;
  position: absolute;
  z-index: 2;
  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    padding: 12px 0 0 0;
    width: calc(100%);
    position: relative;
  `};
`

const HeaderElement = styled.div`
  display: flex;
  align-items: center;
`

const HeaderElementWrap = styled.div`
  display: flex;
  align-items: center;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    margin-top: 0.5rem;
`};
`

const Title = styled.a`
  display: flex;
  align-items: center;
  pointer-events: auto;

  :hover {
    cursor: pointer;
  }
`

const HeaderRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 1rem 0 1rem;
`

const TitleText = styled.div`
  display: flex;
  align-items: center;
  width: fit-content;
  white-space: nowrap;
  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    display: none;
  `};
`

const TitleLabel = styled.span`
  margin-left: 0.5rem;
  font-size: 1.2em;
  color: ${({ theme }) => theme.text1};
`

const HeaderLogo = styled.img`
  width: 52px;
  height: 52px;
  object-fit: cover;
  clip-path: circle(50% at 50% 50%);
`

const AccountElement = styled.div<{ active: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme, active }) => (!active ? theme.bg1 : theme.bg1)};
  border-radius: 5px;
  white-space: nowrap;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.text1};
  :focus {
    border: 1px solid ${({ theme }) => theme.primary1};
  }
`

const TestnetWrapper = styled.div`
  white-space: nowrap;
  width: fit-content;
  margin-left: 10px;
  pointer-events: auto;
`

const NetworkCard = styled(YellowCard)`
  width: fit-content;
  margin-right: 10px;
  border-radius: 12px;
  padding: 8px 12px;
`

//const UniIcon = styled.div`
// transition: transform 0.3s ease;
// :hover {
//   transform: rotate(-5deg);
// }
// ${({ theme }) => theme.mediaWidth.upToSmall`
//  img {
//    width: 4.5rem;
//  }
//`};
//`

const HeaderControls = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    align-items: flex-end;
  `};
`

const PricePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.55rem;
  margin-right: 0.5rem;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.bg4};
  background: ${({ theme }) => theme.bg1};
  color: ${({ theme }) => theme.text1};
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    font-size: 0.72rem;
    padding: 0.32rem 0.45rem;
    margin-right: 0.35rem;
  `};
`

const PriceLabel = styled.span`
  font-size: 1rem;
  opacity: 0.9;
`

const PriceValue = styled.span`
  font-size: 1rem;
  font-weight: 700;

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    font-size: 0.86rem;
  `};
`

const BalanceText = styled(Text)`
  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    display: none;
  `};
`

const NETWORK_LABELS: { [chainId in ChainId]: string | null } = {
  [ChainId.MAINNET]: null
}

const PEPE_ADDRESS = '0x6982508145454Ce325dDbE47a25d4ec3d2311933'

function formatPepePrice(value?: number): string {
  if (!value || !Number.isFinite(value) || value <= 0) return '--'

  if (value >= 1) {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
  }

  // For tiny prices, show 4 digits after the leading run of decimal zeros.
  const fixed = value.toFixed(20)
  const fraction = fixed.split('.')[1] ?? ''
  const leadingZeros = (fraction.match(/^0+/)?.[0].length ?? 0)
  const decimals = Math.min(leadingZeros + 4, 18)

  return `$${value.toFixed(decimals)}`
}

export default function Header() {
  const { account, chainId } = useActiveWeb3React()

  const userEthBalance = useETHBalances(account ? [account] : [])?.[account ?? '']
  const [isDark] = useDarkModeManager()
  const pepeToken = useToken(PEPE_ADDRESS)
  const pepeUsdPrice = useUSDCPrice(pepeToken ?? undefined)
  const pepePriceValue = pepeUsdPrice ? Number(pepeUsdPrice.toSignificant(18)) : undefined

  const pepePriceText = formatPepePrice(pepePriceValue)

  return (
    <HeaderFrame>
      <HeaderRow>
        <HeaderElement>
          <Title href=".">
            <TitleText>
              <HeaderLogo src={isDark ? WordmarkDark : Wordmark} alt="logo" />
              <TitleLabel>PEPE Dex 15% fee</TitleLabel>
            </TitleText>
          </Title>
        </HeaderElement>
        <HeaderControls>
          <HeaderElement>
            <TestnetWrapper>
              {!isMobile && chainId && NETWORK_LABELS[chainId] && <NetworkCard>{NETWORK_LABELS[chainId]}</NetworkCard>}
            </TestnetWrapper>
            <PricePill title="PEPE price in USD">
              <PriceLabel>PEPE</PriceLabel>
              <PriceValue>{pepePriceText}</PriceValue>
            </PricePill>
            <AccountElement active={!!account} style={{ pointerEvents: 'auto' }}>
              {account && userEthBalance ? (
                <BalanceText style={{ flexShrink: 0 }} pl="0.75rem" pr="0.5rem" fontWeight={500}>
                  {userEthBalance?.toSignificant(4)} PLS
                </BalanceText>
              ) : null}
              <Web3Status />
            </AccountElement>
          </HeaderElement>
          <HeaderElementWrap>
            {/*<VersionSwitch />*/}
            <Settings />
            <Menu />
          </HeaderElementWrap>
        </HeaderControls>
      </HeaderRow>
    </HeaderFrame>
  )
}
