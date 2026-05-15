// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import styled, { ThemeContext } from 'styled-components'
import { ChevronDown, ChevronUp } from 'react-feather'
import { AutoColumn } from '../../components/Column'
import { RowBetween } from '../../components/Row'
import { LightCard } from '../../components/Card'
import { ExternalLink, TYPE } from '../../theme'

const WideBody = styled.div`
  position: relative;
  width: 100%;
  max-width: 720px;
  background: ${({ theme }) => theme.bg1};
  border-radius: 10px;
  padding: 1rem;
  border: 3px solid rgba(169, 169, 169, 0.5);
  box-shadow: 0 0 5px rgba(169, 169, 169, 0.5);
`

const PageWrapper = styled(AutoColumn)`
  width: 100%;
  gap: 20px;
`

const SectionCard = styled(LightCard)`
  padding: 20px 24px;
  display: grid;
  gap: 14px;
`

const CodeBlock = styled.div`
  padding: 12px 16px;
  background: ${({ theme }) => theme.bg3};
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  word-break: break-all;
  color: ${({ theme }) => theme.text1};
  border-left: 3px solid ${({ theme }) => theme.primary1};
`

const CodeLabel = styled(TYPE.body)`
  font-size: 12px;
  margin-bottom: 4px;
`

const FaqItem = styled.div`
  border: 1px solid ${({ theme }) => theme.bg3};
`

const FaqQuestion = styled.button`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: ${({ theme }) => theme.text1};
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;

  &:hover {
    background: ${({ theme }) => theme.bg2};
  }
`

const FaqAnswer = styled.div`
  padding: 0 16px 16px;
  color: ${({ theme }) => theme.text2};
  font-size: 15px;
  line-height: 1.6;
`

const StepRow = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
`

const StepNumber = styled.div`
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.primary1};
  color: white;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
`

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: ${({ theme }) => theme.bg3};
`

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
`

const DocTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 10px 12px;
    border: 1px solid ${({ theme }) => theme.bg3};
    text-align: left;
    font-size: 14px;
    vertical-align: top;
  }

  th {
    background: ${({ theme }) => theme.bg2};
    color: ${({ theme }) => theme.text2};
    font-weight: 600;
  }
`

const NavPills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const NavPill = styled.button`
  padding: 6px 14px;
  border: 1px solid ${({ theme }) => theme.bg3};
  color: ${({ theme }) => theme.text2};
  font-size: 14px;
  text-decoration: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    border-color: ${({ theme }) => theme.primary1};
    color: ${({ theme }) => theme.primary1};
  }
`

const faqs = [
  {
    q: 'Why is the fee 15%?',
    a:
      'The 15% fee is intentional. In simple terms, part rewards liquidity providers and part powers buy-and-burn. The goal is to reward active pools while also reducing PEPE supply over time.'
  },
  {
    q: 'Is PepeDex a fork of Uniswap?',
    a:
      'Yes. PepeDex follows a V2-style AMM design on PulseChain (chain ID 369) with custom fee behavior and its own deployed contracts.'
  },
  {
    q: 'What happens to my liquidity when I remove it?',
    a:
      'When you remove liquidity you receive your proportional share of both tokens in the pool, including any fees that have accumulated since you deposited. The LP tokens you hold are burned and you receive the underlying tokens directly into your wallet.'
  },
  {
    q: 'Can I lose money as a liquidity provider?',
    a:
      'Yes. Providing liquidity carries impermanent loss risk — if the prices of the two tokens diverge significantly while your funds are in the pool, you may end up with a different ratio of tokens than you deposited. The 15% fee rewards partially offset this risk but do not eliminate it.'
  },
  {
    q: 'What is the buy-and-burn mechanism?',
    a:
      'As pools grow from fees, the protocol captures part of that growth as LP tokens and sends them to the burn proxy. When convertLps runs, those LP tokens are converted and the resulting PEPE is permanently burned.'
  },
  {
    q: 'Do I need to create an account?',
    a:
      'No. PepeDex is non-custodial. You interact directly from your wallet — MetaMask, Coinbase Wallet, or any injected Web3 provider connected to PulseChain. There are no accounts, emails, or passwords.'
  },
  {
    q: 'How do I add PulseChain to my wallet?',
    a:
      'In MetaMask, go to Settings → Networks → Add Network and enter: Network Name: PulseChain, RPC URL: https://rpc.pulsechain.com, Chain ID: 369, Symbol: PLS, Block Explorer: https://scan.pulsechain.com'
  }
]

function FaqEntry({ q, a }: { q: string; a: string }) {
  const theme = useContext(ThemeContext)
  const [open, setOpen] = useState(false)

  return (
    <FaqItem>
      <FaqQuestion onClick={() => setOpen(prev => !prev)}>
        {q}
        {open ? <ChevronUp size={16} color={theme.primary1} /> : <ChevronDown size={16} color={theme.text3} />}
      </FaqQuestion>
      {open && <FaqAnswer>{a}</FaqAnswer>}
    </FaqItem>
  )
}

export default function Docs() {
  const theme = useContext(ThemeContext)

  return (
    <WideBody>
      <PageWrapper>
        {/* Overview */}
        <SectionCard>
          <AutoColumn gap="8px">
            <TYPE.largeHeader>PepeDex Documentation</TYPE.largeHeader>
            <TYPE.body color={theme.text2}>
              Practical guide for traders, liquidity providers, and anyone exploring PepeDex.
            </TYPE.body>
          </AutoColumn>
          <NavPills>
            <NavPill onClick={() => document.getElementById('how-to-swap')?.scrollIntoView({ behavior: 'smooth' })}>Swap</NavPill>
            <NavPill onClick={() => document.getElementById('how-to-lp')?.scrollIntoView({ behavior: 'smooth' })}>Liquidity</NavPill>
            <NavPill onClick={() => document.getElementById('fees')?.scrollIntoView({ behavior: 'smooth' })}>Fees</NavPill>
            <NavPill onClick={() => document.getElementById('burn')?.scrollIntoView({ behavior: 'smooth' })}>Burn</NavPill>
            <NavPill onClick={() => document.getElementById('contracts')?.scrollIntoView({ behavior: 'smooth' })}>Contracts</NavPill>
            <NavPill onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}>FAQ</NavPill>
          </NavPills>
        </SectionCard>

        {/* How to swap */}
        <SectionCard id="how-to-swap">
          <TYPE.mediumHeader>How to Swap</TYPE.mediumHeader>
          <AutoColumn gap="10px">
            {[
              ['Connect your wallet', 'Click the wallet button in the top-right corner. Make sure your wallet is set to PulseChain (chain ID 369).'],
              ['Select tokens', 'Choose the token you want to sell (input) and the token you want to receive (output). You can search by name or paste a contract address.'],
              ['Enter an amount', 'Type the amount you want to spend or receive. PepeDex will show the estimated output and price impact.'],
              ['Review and confirm', 'Check the route, price impact, and minimum received. Adjust slippage in Settings if needed, then click Swap and sign the transaction in your wallet.']
            ].map(([title, desc], i) => (
              <StepRow key={i}>
                <StepNumber>{i + 1}</StepNumber>
                <AutoColumn gap="4px">
                  <TYPE.black fontSize={15}>{title}</TYPE.black>
                  <TYPE.body color={theme.text2} fontSize={14} style={{ lineHeight: '1.5' }}>{desc}</TYPE.body>
                </AutoColumn>
              </StepRow>
            ))}
          </AutoColumn>
        </SectionCard>

        {/* How to LP */}
        <SectionCard id="how-to-lp">
          <TYPE.mediumHeader>How to Provide Liquidity</TYPE.mediumHeader>
          <AutoColumn gap="10px">
            {[
              ['Go to Pool', 'Navigate to the Pool tab and click Add Liquidity.'],
              ['Select a pair', 'Choose the two tokens you want to deposit. If a pool already exists for this pair, you will see current reserves. If not, you will create a new pool and set the initial price.'],
              ['Enter amounts', 'Type an amount for one token — the other will auto-fill at the current pool ratio (or at your chosen ratio for new pools).'],
              ['Approve and deposit', 'Approve each token if required, then click Supply and confirm in your wallet. You will receive LP tokens representing your share of the pool.'],
              ['Remove liquidity', 'From the Pool page, select a position and click Remove. Choose what percentage to withdraw, approve the LP token burn, and confirm. You receive both tokens back proportionally.']
            ].map(([title, desc], i) => (
              <StepRow key={i}>
                <StepNumber>{i + 1}</StepNumber>
                <AutoColumn gap="4px">
                  <TYPE.black fontSize={15}>{title}</TYPE.black>
                  <TYPE.body color={theme.text2} fontSize={14} style={{ lineHeight: '1.5' }}>{desc}</TYPE.body>
                </AutoColumn>
              </StepRow>
            ))}
          </AutoColumn>
        </SectionCard>

        {/* Fee structure */}
        <SectionCard id="fees">
          <TYPE.mediumHeader>Fee Structure</TYPE.mediumHeader>
          <TYPE.body color={theme.text2} style={{ lineHeight: '1.6' }}>
            Every swap has a 15% fee. That fee stays in the pool, which helps LPs. The protocol side is
            collected during liquidity events, where LP tokens representing part of fee growth are minted
            to the burn proxy. Later, convertLps turns that value into PEPE and burns it.
          </TYPE.body>
          <TableWrapper>
            <DocTable>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Value</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Swap fee</td>
                  <td>15%</td>
                  <td>Deducted from input amount before pricing</td>
                </tr>
              
                <tr>
                  <td>LP fee</td>
                  <td>~7.5%</td>
                  <td>Goes to providers</td>
                </tr>
                <tr>
                  <td>Protocol fee</td>
                  <td>~7.5%</td>
                  <td>Minted as LP tokens to the burn proxy at each liquidity event</td>
                </tr>
              </tbody>
            </DocTable>
          </TableWrapper>
          <Divider />
          <TYPE.subHeader color={theme.text2}>
            <strong>Price impact warning thresholds:</strong> 0.5% low · 1% medium · 2% high · 3%+ confirmation required · 5%+ blocked in non-expert mode
          </TYPE.subHeader>
        </SectionCard>

        {/* Burn */}
        <SectionCard id="burn">
          
          <AutoColumn gap="4px">
            <TYPE.body color={theme.text2} fontSize={13}>
              You can trigger burns directly from the{' '}
              <Link to="/burn" style={{ color: theme.primaryText1 }}>Burn Dashboard</Link>.
            </TYPE.body>
          </AutoColumn>
        </SectionCard>

        {/* Contract addresses */}
        <SectionCard id="contracts">
          <TYPE.mediumHeader>Deployed Contracts</TYPE.mediumHeader>
          <AutoColumn gap="16px">
            {[
              {
                label: 'Factory',
                address: '0x26594d3F4c172554A30D06e8fDc59229B860eAb0',
                note: 'Creates and tracks all trading pairs'
              },
              {
                label: 'Router (15% fee)',
                address: '0xd3F72D6DE6FC310Fcab2ABd9A69d59ed95dAf17B',
                note: 'Add/remove liquidity and swap entry point'
              }
            ].map(({ label, address, note }) => (
              <AutoColumn gap="4px" key={address}>
                <CodeLabel color={theme.text2}>{label}</CodeLabel>
                <CodeBlock>
                  <ExternalLink
                    href={`https://otter-pulsechain.g4mm4.io/address/${address}`}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {address}
                  </ExternalLink>
                </CodeBlock>
                <TYPE.body color={theme.text3} fontSize={12}>{note}</TYPE.body>
              </AutoColumn>
            ))}
          </AutoColumn>
        </SectionCard>

        {/* FAQ */}
        <SectionCard id="faq">
          <TYPE.mediumHeader>Frequently Asked Questions</TYPE.mediumHeader>
          <AutoColumn gap="6px">
            {faqs.map(({ q, a }) => (
              <FaqEntry key={q} q={q} a={a} />
            ))}
          </AutoColumn>
        </SectionCard>

        {/* Footer links */}
        <SectionCard>
          <RowBetween>
            <TYPE.body color={theme.text2} fontSize={14}>
              Back to the app —{' '}
              <Link to="/swap" style={{ color: theme.primaryText1 }}>Swap</Link>
              {' · '}
              <Link to="/pool" style={{ color: theme.primaryText1 }}>Pool</Link>
              {' · '}
              <Link to="/burn" style={{ color: theme.primaryText1 }}>Burn</Link>
              {' · '}
              <Link to="/info" style={{ color: theme.primaryText1 }}>Info</Link>
            </TYPE.body>
          </RowBetween>
        </SectionCard>
      </PageWrapper>
    </WideBody>
  )
}
