// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import styled, { ThemeContext } from 'styled-components'
import { Text } from 'rebass'
import { AutoColumn } from '../../components/Column'
import { RowBetween, RowFixed } from '../../components/Row'
import { LightCard } from '../../components/Card'
import { ExternalLink, TYPE } from '../../theme'
import AppBody from '../AppBody'

const PageWrapper = styled(AutoColumn)`
  width: 100%;
  gap: 20px;
`

const HeroCard = styled(LightCard)`
  padding: 28px 24px;
  background: ${({ theme }) => theme.bg2};
  border: 1px solid ${({ theme }) => theme.primary4};
`

const SectionCard = styled(LightCard)`
  padding: 20px 24px;
  display: grid;
  gap: 12px;
`

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    grid-template-columns: 1fr;
  `};
`

const FeatureCard = styled(LightCard)`
  padding: 16px;
  display: grid;
  gap: 8px;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
`

const ActionButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 12px 20px;
  background: ${({ theme }) => theme.primary1};
  color: white;
  font-weight: 600;
  font-size: 15px;
  text-decoration: none;
  border: 1px solid transparent;

  &:hover {
    background: ${({ theme }) => theme.primary2};
    text-decoration: none;
    color: white;
  }
`

const SecondaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 12px 20px;
  background: transparent;
  color: ${({ theme }) => theme.text1};
  font-weight: 600;
  font-size: 15px;
  text-decoration: none;
  border: 1px solid ${({ theme }) => theme.primary4};

  &:hover {
    border-color: ${({ theme }) => theme.primary1};
    color: ${({ theme }) => theme.primary1};
    text-decoration: none;
  }
`

const StatRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
`

const StatBox = styled.div`
  flex: 1;
  min-width: 120px;
  padding: 14px 16px;
  background: ${({ theme }) => theme.bg3};
  display: grid;
  gap: 4px;
`

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: ${({ theme }) => theme.bg3};
`

const Pill = styled.span`
  display: inline-block;
  padding: 3px 10px;
  background: ${({ theme }) => theme.primary5};
  color: ${({ theme }) => theme.primaryText1};
  font-size: 13px;
  font-weight: 600;
`

export default function Info() {
  const theme = useContext(ThemeContext)

  return (
    <AppBody>
      <PageWrapper>
        {/* Hero */}
        <HeroCard>
          <AutoColumn gap="14px">
            <RowFixed gap="10px">
              <Pill>PulseChain</Pill>
              <Pill>Decentralised</Pill>
            </RowFixed>
            <TYPE.largeHeader>Welcome to PepeDex</TYPE.largeHeader>
            <TYPE.body color={theme.text2} style={{ lineHeight: '1.6' }}>
              PepeDex is where trading and PEPE support happen at the same time. Swap tokens, provide liquidity,
              and help power a system that keeps buying and burning PEPE in the background.
            </TYPE.body>
            <ActionRow>
              <ActionButton to="/swap">Start Swapping</ActionButton>
              <SecondaryButton to="/pool">Add Liquidity</SecondaryButton>
            </ActionRow>
          </AutoColumn>
        </HeroCard>

        {/* Key stats */}
        <SectionCard>
          <TYPE.mediumHeader>Key Numbers</TYPE.mediumHeader>
          <StatRow>
            <StatBox>
              <TYPE.body color={theme.text2} fontSize={13}>Swap Fee</TYPE.body>
              <Text fontSize={24} fontWeight={700} color={theme.primary1}>15%</Text>
              <TYPE.body color={theme.text2} fontSize={12}>of each trade</TYPE.body>
            </StatBox>
            <StatBox>
              <TYPE.body color={theme.text2} fontSize={13}>Network</TYPE.body>
              <Text fontSize={24} fontWeight={700} color={theme.primary1}>369</Text>
              <TYPE.body color={theme.text2} fontSize={12}>PulseChain mainnet</TYPE.body>
            </StatBox>
            <StatBox>
              <TYPE.body color={theme.text2} fontSize={13}>Protocol</TYPE.body>
              <Text fontSize={24} fontWeight={700} color={theme.primary1}>AMM</Text>
              <TYPE.body color={theme.text2} fontSize={12}>PepeDex V2 style AMM</TYPE.body>
            </StatBox>
          </StatRow>
        </SectionCard>

        {/* What is it */}
        <SectionCard>
          <TYPE.mediumHeader>Why PepeDex Feels Different</TYPE.mediumHeader>
          <TYPE.body color={theme.text2} style={{ lineHeight: '1.6' }}>
            Most DEXs are just places to trade. PepeDex is built to reward the PEPE community while people trade.
            Fees do not disappear into a black box. They stay in the pools, strengthen liquidity, and feed a
            buy-and-burn flow designed around PEPE.
          </TYPE.body>
          <TYPE.body color={theme.text2} style={{ lineHeight: '1.6' }}>
            Think of it like this: trading activity keeps filling the engine, and that engine keeps pushing value
            back toward PEPE. More usage means more fuel for the cycle.
          </TYPE.body>
        </SectionCard>

        {/* Features */}
        <SectionCard>
          <TYPE.mediumHeader>What Can You Do Here?</TYPE.mediumHeader>
          <FeatureGrid>
            <FeatureCard>
              <TYPE.black fontSize={16}>Swap Tokens</TYPE.black>
              <TYPE.body color={theme.text2} fontSize={14} style={{ lineHeight: '1.5' }}>
                Exchange any PulseChain token instantly at the current pool price. No sign-up, no custody
                — just your wallet and the chain.
              </TYPE.body>
            </FeatureCard>
            <FeatureCard>
              <TYPE.black fontSize={16}>Provide Liquidity</TYPE.black>
              <TYPE.body color={theme.text2} fontSize={14} style={{ lineHeight: '1.5' }}>
                Add PEPE pair liquidity and earn a share of swap fees from real trading activity.
                If volume grows, your fee potential grows too.
              </TYPE.body>
            </FeatureCard>
            <FeatureCard>
              <TYPE.black fontSize={16}>Burn LP Tokens</TYPE.black>
              <TYPE.body color={theme.text2} fontSize={14} style={{ lineHeight: '1.5' }}>
                The protocol turns accumulated LP value into PEPE and sends it to burn. Less supply,
                stronger long-term story.
              </TYPE.body>
            </FeatureCard>
            <FeatureCard>
              <TYPE.black fontSize={16}>Stay Non-Custodial</TYPE.black>
              <TYPE.body color={theme.text2} fontSize={14} style={{ lineHeight: '1.5' }}>
                Your funds never leave your wallet until you sign a transaction. PepeDex has no accounts,
                no logins, and no way to freeze your assets.
              </TYPE.body>
            </FeatureCard>
          </FeatureGrid>
        </SectionCard>

        {/* Fee breakdown */}
        <SectionCard>
          <TYPE.mediumHeader>How Buy-and-Burn Can Pay Off</TYPE.mediumHeader>
          <TYPE.body color={theme.text2} style={{ lineHeight: '1.6' }}>
            Here is the simple version of the 15% fee: if you swap 100 tokens, 85 tokens are used in the swap
            pricing and 15 tokens stay in the pool as fees. So yes, the fee is high by design, but that is what
            powers the PEPE-focused flywheel.
          </TYPE.body>
          <TYPE.body color={theme.text2} style={{ lineHeight: '1.6' }}>
            Basic flow: 1) users trade, 2) pools collect the 15% fee, 3) pool value grows, 4) part of that fee
            growth is captured as LP and routed into buy-and-burn. More usage means more fee fuel for the cycle.
          </TYPE.body>
          <TYPE.body color={theme.text2} style={{ lineHeight: '1.6' }}>
            Why provide PEPE liquidity? You get fee exposure, help improve PEPE market depth, and support a loop
            that can benefit long-term holders. If you believe in PEPE over months and years, supplying liquidity
            is one way to put that belief to work.
          </TYPE.body>
        </SectionCard>

        <Divider />

        {/* Links */}
        <SectionCard>
          <RowBetween>
            <TYPE.mediumHeader>Explore Further</TYPE.mediumHeader>
          </RowBetween>
          <AutoColumn gap="10px">
            <ExternalLink href="https://dexscreener.com/pulsechain/f:0x26594d3F4c172554A30D06e8fDc59229B860eAb0">
              View charts on DEX Screener
            </ExternalLink>
            <ExternalLink href="https://otter-pulsechain.g4mm4.io/address/0x26594d3F4c172554A30D06e8fDc59229B860eAb0">
              Factory contract on BlockScan
            </ExternalLink>
            <Link to="/docs" style={{ color: theme.primaryText1, textDecoration: 'none' }}>
              Technical documentation →
            </Link>
          </AutoColumn>
        </SectionCard>
      </PageWrapper>
    </AppBody>
  )
}
