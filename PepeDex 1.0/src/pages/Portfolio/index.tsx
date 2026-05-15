import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import styled, { ThemeContext } from 'styled-components'
import { ETHER, WETH } from '@uniswap/sdk'
import { TYPE } from '../../theme'
import { useActiveWeb3React } from '../../hooks'
import { useAllTokens } from '../../hooks/Tokens'
import { useETHBalances, useTokenBalancesWithLoadingIndicator } from '../../state/wallet/hooks'
import { WrappedTokenInfo } from '../../state/lists/hooks'
import { usePortfolioCache } from '../../hooks/usePortfolioCache'
import { usePortfolioValueMetrics } from '../../hooks/usePortfolioValueMetrics'
import { fetchDexscreenerToken, DexscreenerTokenInfo } from '../../utils/dexscreener'
import PortfolioLPSection from './PortfolioLPSection'
import { isAddress, shortenAddress } from '../../utils'
import useUSDCPrice from '../../utils/useUSDCPrice'
import PlsLogo from '../../assets/images/pls.png'

const PageWrapper = styled.div`
  max-width: 1560px;
  margin: 0 auto;
  padding: 2px;
  display: flex;
  flex-direction: row;
  gap: 24px;
  justify-content: center;
  align-items: flex-start;

  @media (max-width: 900px) {
    flex-direction: column;
    gap: 0;
    padding: 8px;
    align-items: stretch;
  }

  @media (max-width: 700px) {
    width: 100%;
    max-width: none;
    padding: 0;
  }
`

const Section = styled.section`
  flex: 1 1 0;
  min-width: 520px;
  max-width: 760px;
  margin-bottom: 24px;
  background: ${({ theme }) => theme.bg1};
  border-radius: 18px;
  box-shadow: 0 2px 12px 0 ${({ theme }) => theme.shadow1};
  border: 1px solid ${({ theme }) => theme.bg3};
  padding: 20px 14px;

  @media (max-width: 900px) {
    width: calc(100% + 12px);
    max-width: none;
    min-width: 0;
    margin-left: -6px;
    margin-right: -6px;
    margin-bottom: 16px;
  }

  @media (max-width: 600px) {
    width: calc(100% + 12px);
    margin-left: -6px;
    margin-right: -6px;
    padding: 16px 12px;
    margin-bottom: 8px;
    border-radius: 12px;
  }

  @media (max-width: 500px) {
    width: calc(100% + 12px);
    margin-left: -6px;
    margin-right: -6px;
    padding: 14px 10px;
    margin-bottom: 4px;
  }

  @media (max-width: 400px) {
    width: calc(100% + 12px);
    margin-left: -6px;
    margin-right: -6px;
    padding: 14px 10px;
    margin-bottom: 4px;
  }

  @media (max-width: 300px) {
    width: calc(100% + 12px);
    margin-left: -6px;
    margin-right: -6px;
    padding: 14px 10px;
    margin-bottom: 4px;
  }
`

const TopSection = styled.section`
  width: 100%;
  max-width: 1560px;
  margin: 0 auto 14px;
  padding: 14px 16px;
  background: ${({ theme }) => theme.bg1};
  border: 1px solid ${({ theme }) => theme.bg3};
  border-radius: 18px;
  box-shadow: 0 2px 12px 0 ${({ theme }) => theme.shadow1};
  display: flex;
  flex-direction: column;
  gap: 4px;

  @media (max-width: 600px) {
    width: calc(100% - 10px);
    margin-left: 5px;
    margin-right: 5px;
    margin-bottom: 8px;
    padding: 14px 12px;
    border-radius: 12px;
  }

  @media (max-width: 500px) {
    width: calc(100% - 10px);
    margin-left: 5px;
    margin-right: 5px;
    margin-bottom: 4px;
    padding: 12px 10px;
  }

  @media (max-width: 400px) {
    width: calc(100% - 10px);
    margin-left: 5px;
    margin-right: 5px;
    margin-bottom: 4px;
    padding: 12px 10px;
  }

  @media (max-width: 300px) {
    width: calc(100% - 10px);
    margin-left: 5px;
    margin-right: 5px;
    margin-bottom: 4px;
    padding: 12px 10px;
  }
`

const TopHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`

const TopActionsColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
`

const TopMetric = styled.div`
  font-size: 13px;
  font-weight: 600;
`

const WalletMetricList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
`

const WalletMetricRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
`

const WalletRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`

const WalletChip = styled.button<{ active: boolean }>`
  border: 1px solid ${({ theme, active }) => (active ? theme.primary1 : theme.bg4)};
  background: ${({ theme, active }) => (active ? theme.primary5 : theme.bg2)};
  color: ${({ theme }) => theme.text1};
  border-radius: 999px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 12px;
`

const ManageWalletsButton = styled.button`
  border: 1px solid ${({ theme }) => theme.bg4};
  background: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text1};
  border-radius: 10px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 12px;
`

const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.modalBG};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
`

const ModalCard = styled.div`
  width: min(560px, calc(100vw - 24px));
  max-height: calc(100vh - 24px);
  overflow: auto;
  background: ${({ theme }) => theme.bg1};
  border: 1px solid ${({ theme }) => theme.bg3};
  border-radius: 16px;
  padding: 16px;
`

const InputRow = styled.div`
  display: flex;
  gap: 8px;
  margin: 12px 0;
`

const AddressInput = styled.input`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.bg4};
  background: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text1};
  border-radius: 10px;
  padding: 10px;
  outline: none;
`

const ActionButton = styled.button`
  border: 1px solid ${({ theme }) => theme.primary1};
  background: ${({ theme }) => theme.primary5};
  color: ${({ theme }) => theme.text1};
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
`

const WalletList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const WalletListItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  border: 1px solid ${({ theme }) => theme.bg3};
  background: ${({ theme }) => theme.bg2};
  border-radius: 10px;
  padding: 8px 10px;
`

const SectionHeader = styled.div`
  margin: 8px 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const SectionMetric = styled.div`
  margin-left: auto;
  text-align: right;
`

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 8px;

  @media (max-width: 600px) {
    border-spacing: 0 4px;
    font-size: 12px;
  }
`

const Th = styled.th`
  text-align: left;
  color: ${({ theme }) => theme.text2};
  font-weight: 500;
  font-size: 14px;
  padding: 0 8px 6px;

  @media (max-width: 600px) {
    font-size: 12px;
    padding: 0 4px 4px;
  }
`

const Td = styled.td`
  background: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text1};
  font-size: 14px;
  padding: 10px 8px;
  border: none;
  vertical-align: middle;

  @media (max-width: 600px) {
    font-size: 12px;
    padding: 6px 4px;
  }
`

const TokenCell = styled.div`
  display: flex;
  align-items: center;
  min-width: 120px;
  gap: 6px;

  @media (max-width: 600px) {
    min-width: auto;
    gap: 4px;
  }
`

const TokenLogo = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: 8px;
  background: ${({ theme }) => theme.bg3};
  border: 1px solid ${({ theme }) => theme.bg4};
  flex-shrink: 0;

  @media (max-width: 600px) {
    width: 18px;
    height: 18px;
    margin-right: 0;
  }
`

type DexInfoByAddress = { [address: string]: DexscreenerTokenInfo }
type ValueByAddress = { [address: string]: number }
const WPLS_USDC_PAIR_ADDRESS = '0x6753560538eca67617a9ce605178f788be7e524e'

type WalletMetric = {
  address: string
  valueUsd?: number
}

function getTokenLogoFromList(token: any): string | undefined {
  if (token?.symbol?.toUpperCase() === 'WPLS') {
    return PlsLogo
  }

  if (token instanceof WrappedTokenInfo) {
    return token.logoURI || undefined
  }
  return undefined
}

function TokenHoldingRow({
  token,
  balanceAmount,
  dexInfo,
  onValueUpdate
}: {
  token: any
  balanceAmount: any
  dexInfo?: DexscreenerTokenInfo
  onValueUpdate: (address: string, value?: number) => void
}) {
  const theme = useContext(ThemeContext)
  const logo = getTokenLogoFromList(token)
  // Format balance with fewer decimals to avoid dust display issues
  const balance = useMemo(() => {
    if (!balanceAmount) return '-'
    const val = Number(balanceAmount.toExact())
    if (val === 0) return '0'
    if (val < 0.0001) return '<0.0001'
    if (val < 0.01) return balanceAmount.toSignificant(2)
    return balanceAmount.toSignificant(6)
  }, [balanceAmount])
  const onchainUsdPrice = useUSDCPrice(token)

  const resolvedPrice = useMemo(() => {
    const onchain = onchainUsdPrice ? Number(onchainUsdPrice.toSignificant(12)) : undefined
    if (onchain !== undefined && Number.isFinite(onchain) && onchain > 0) return onchain
    return dexInfo?.priceUsd
  }, [dexInfo, onchainUsdPrice])

  const value = useMemo(() => {
    if (!balanceAmount || resolvedPrice === undefined) return undefined
    const qty = Number(balanceAmount.toExact())
    if (!Number.isFinite(qty)) return undefined
    return qty * resolvedPrice
  }, [balanceAmount, resolvedPrice])

  useEffect(() => {
    onValueUpdate(token.address, value)
  }, [onValueUpdate, token.address, value])

  return (
    <tr key={token.address}>
      <Td>
        <TokenCell>
          {logo ? (
            <TokenLogo
              src={logo}
              alt={token.symbol}
              onError={e => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : null}
          <TYPE.body>{token.symbol}</TYPE.body>
        </TokenCell>
      </Td>
      <Td>{balance}</Td>
      <Td>
        {resolvedPrice !== undefined ? (
          <span>{'$' + resolvedPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
        ) : (
          <span style={{ color: theme.text3 }}>-</span>
        )}
        {value !== undefined ? (
          <div style={{ color: theme.text2, fontSize: 12 }}>
            {'$' + value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        ) : null}
      </Td>
      <Td>
        {dexInfo?.priceChange24h !== undefined ? (
          <span style={{ color: dexInfo.priceChange24h >= 0 ? theme.green1 : theme.red1 }}>
            {dexInfo.priceChange24h >= 0 ? '+' : ''}
            {dexInfo.priceChange24h.toFixed(2)}%
          </span>
        ) : (
          <span style={{ color: theme.text3 }}>-</span>
        )}
      </Td>
    </tr>
  )
}

function NativePlsHoldingRow({
  balance,
  priceUsd,
  valueUsd,
  priceChange24h
}: {
  balance?: string
  priceUsd?: number
  valueUsd?: number
  priceChange24h?: number
}) {
  const theme = useContext(ThemeContext)

  return (
    <tr key="native-pls">
      <Td>
        <TokenCell>
          <TokenLogo src={PlsLogo} alt="PLS" />
          <TYPE.body>PLS</TYPE.body>
        </TokenCell>
      </Td>
      <Td>{balance ?? '-'}</Td>
      <Td>
        {priceUsd !== undefined ? (
          <span>{'$' + priceUsd.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
        ) : (
          <span style={{ color: theme.text3 }}>-</span>
        )}
        {valueUsd !== undefined ? (
          <div style={{ color: theme.text2, fontSize: 12 }}>
            {'$' + valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        ) : null}
      </Td>
      <Td>
        {priceChange24h !== undefined ? (
          <span style={{ color: priceChange24h >= 0 ? theme.green1 : theme.red1 }}>
            {priceChange24h >= 0 ? '+' : ''}
            {priceChange24h.toFixed(2)}%
          </span>
        ) : (
          <span style={{ color: theme.text3 }}>-</span>
        )}
      </Td>
    </tr>
  )
}

export default function Portfolio() {
  const theme = useContext(ThemeContext)
  const { account, chainId } = useActiveWeb3React()
  const [managedWallets, setManagedWallets] = useState<string[]>([])
  const [selectedWallet, setSelectedWallet] = useState<string>('')
  const [walletInput, setWalletInput] = useState('')
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [walletInputError, setWalletInputError] = useState<string>('')
  const [lpValueUsd, setLpValueUsd] = useState(0)
  const [lpLoading, setLpLoading] = useState(false)
  const [tokenValuesByAddress, setTokenValuesByAddress] = useState<ValueByAddress>({})
  const [nativeDexInfo, setNativeDexInfo] = useState<DexscreenerTokenInfo | undefined>()

  const activeAddress = selectedWallet || account || undefined

  const allTokens = useAllTokens()
  const tokenList = useMemo(() => Object.values(allTokens), [allTokens])

  const [tokenDexInfo, setTokenDexInfo] = useState<DexInfoByAddress>({})
  const [tokenBalances, tokenBalancesLoading] = useTokenBalancesWithLoadingIndicator(activeAddress, tokenList)
  const nativeBalances = useETHBalances(activeAddress ? [activeAddress] : [])

  const { write } = usePortfolioCache(chainId, activeAddress)

  const nativeBalanceAmount = activeAddress ? nativeBalances[activeAddress] : undefined
  const nativePlsUsdPrice = useUSDCPrice(ETHER)
  const wplsAddress = chainId && WETH[chainId] ? WETH[chainId].address : undefined

  const nativePlsPriceNumber = useMemo(() => {
    if (!nativePlsUsdPrice) return undefined
    const parsed = Number(nativePlsUsdPrice.toSignificant(12))
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
  }, [nativePlsUsdPrice])

  const nativePlsBalanceFormatted = useMemo(() => {
    if (!nativeBalanceAmount) return undefined
    return nativeBalanceAmount.toSignificant(6)
  }, [nativeBalanceAmount])

  const nativePlsValueUsd = useMemo(() => {
    if (!nativeBalanceAmount || nativePlsPriceNumber === undefined) return undefined
    const qty = Number(nativeBalanceAmount.toExact())
    if (!Number.isFinite(qty)) return undefined
    const value = qty * nativePlsPriceNumber
    return Number.isFinite(value) ? value : undefined
  }, [nativeBalanceAmount, nativePlsPriceNumber])

  useEffect(() => {
    if (!wplsAddress) {
      setNativeDexInfo(undefined)
      return
    }

    const address = wplsAddress

    let cancelled = false

    async function fetchNativeDexInfo() {
      try {
        const pairRes = await fetch(`https://api.dexscreener.com/latest/dex/pairs/pulsechain/${WPLS_USDC_PAIR_ADDRESS}`)
        if (pairRes.ok) {
          const pairData = (await pairRes.json()) as any
          const pair =
            (Array.isArray(pairData?.pairs)
              ? pairData.pairs.find(
                  (p: any) =>
                    typeof p?.pairAddress === 'string' &&
                    p.pairAddress.toLowerCase() === WPLS_USDC_PAIR_ADDRESS
                )
              : undefined) ?? pairData?.pair

          const pairPrice = pair?.priceUsd !== undefined ? Number(pair.priceUsd) : undefined
          const pairChangeRaw = pair?.priceChange?.h24 ?? pair?.priceChange24h ?? pair?.priceChange
          const pairChange = pairChangeRaw !== undefined && pairChangeRaw !== null ? Number(pairChangeRaw) : undefined

          if (!cancelled && (Number.isFinite(pairPrice) || Number.isFinite(pairChange))) {
            setNativeDexInfo({
              address,
              priceUsd: Number.isFinite(pairPrice) ? pairPrice : undefined,
              priceChange24h: Number.isFinite(pairChange) ? pairChange : undefined
            })
            return
          }
        }
      } catch {
        // fallback below
      }

      const info = await fetchDexscreenerToken(address)
      if (!cancelled) setNativeDexInfo(info ?? undefined)
    }

    fetchNativeDexInfo()

    return () => {
      cancelled = true
    }
  }, [wplsAddress])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('dextop.portfolio.wallets.v1')
      const parsed = raw ? (JSON.parse(raw) as string[]) : []
      const valid = parsed.map(addr => isAddress(addr)).filter((addr): addr is string => Boolean(addr))
      setManagedWallets(Array.from(new Set(valid)))
    } catch {
      setManagedWallets([])
    }
  }, [])

  useEffect(() => {
    if (!account) return
    const checked = isAddress(account)
    if (!checked) return
    setManagedWallets(prev => {
      if (prev.includes(checked)) return prev
      const updated = [checked, ...prev]
      window.localStorage.setItem('dextop.portfolio.wallets.v1', JSON.stringify(updated))
      return updated
    })
  }, [account])

  useEffect(() => {
    if (!selectedWallet && managedWallets.length > 0) {
      setSelectedWallet(managedWallets[0])
    }
  }, [managedWallets, selectedWallet])

  const tokensWithBalance = useMemo(
    () => tokenList.filter(token => tokenBalances[token.address]?.greaterThan('0')),
    [tokenList, tokenBalances]
  )

  useEffect(() => {
    setTokenValuesByAddress({})
    setLpValueUsd(0)
  }, [activeAddress])

  useEffect(() => {
    if (!tokensWithBalance.length) return

    let cancelled = false

    async function fetchDexData() {
      const missing = tokensWithBalance.filter(token => !tokenDexInfo[token.address])
      if (missing.length === 0) return

      const results = await Promise.all(
        missing.map(async token => {
          const info = await fetchDexscreenerToken(token.address)
          return [token.address, info] as const
        })
      )

      if (cancelled) return

      const validEntries: Array<[string, DexscreenerTokenInfo]> = results.filter(
        (entry): entry is [string, DexscreenerTokenInfo] => Boolean(entry[1])
      )
      if (validEntries.length === 0) return

      setTokenDexInfo(prev => ({
        ...prev,
        ...Object.fromEntries(validEntries)
      }))
    }

    fetchDexData()

    return () => {
      cancelled = true
    }
  }, [tokensWithBalance, tokenDexInfo])

  const handleTokenValueUpdate = useCallback((address: string, value?: number) => {
    setTokenValuesByAddress(prev => {
      const nextValue = value !== undefined && Number.isFinite(value) ? Math.round(value * 100) / 100 : 0
      if ((prev[address] ?? 0) === nextValue) return prev
      return { ...prev, [address]: nextValue }
    })
  }, [])

  useEffect(() => {
    if (!activeAddress) return

    const snapshotTokens = tokensWithBalance.map(token => ({
      address: token.address,
      symbol: token.symbol,
      balance: tokenBalances[token.address]?.toExact() ?? '0',
      priceUsd: tokenDexInfo[token.address]?.priceUsd,
      priceChange24h: tokenDexInfo[token.address]?.priceChange24h
    }))

    if (nativeBalanceAmount) {
      snapshotTokens.unshift({
        address: 'native:pls',
        symbol: 'PLS',
        balance: nativeBalanceAmount.toExact(),
        priceUsd: nativePlsPriceNumber,
        priceChange24h: undefined
      })
    }

    write({ tokens: snapshotTokens, lp: [] })
  }, [activeAddress, tokenBalances, tokenDexInfo, tokensWithBalance, write, nativeBalanceAmount, nativePlsPriceNumber])

  const tokenValueUsd = useMemo(() => {
    return Object.values(tokenValuesByAddress).reduce((sum, current) => sum + current, 0)
  }, [tokenValuesByAddress])

  const liveTotalPortfolioUsd = tokenValueUsd + (nativePlsValueUsd ?? 0) + lpValueUsd

  const getCachedWalletValue = useCallback(
    (address: string): number | undefined => {
      if (!chainId) return undefined

      try {
        const key = `dextop.portfolio.v1:${chainId}:${address.toLowerCase()}`
        const raw = window.localStorage.getItem(key)
        if (!raw) return undefined
        const parsed = JSON.parse(raw) as { tokens?: Array<{ balance?: string; priceUsd?: number }> }
        const value = (parsed.tokens ?? []).reduce((sum, token) => {
          const bal = Number(token.balance ?? '0')
          const price = Number(token.priceUsd)
          if (!Number.isFinite(bal) || !Number.isFinite(price)) return sum
          return sum + bal * price
        }, 0)
        return Number.isFinite(value) ? value : undefined
      } catch {
        return undefined
      }
    },
    [chainId]
  )

  const activeCachedValueUsd = useMemo(
    () => (activeAddress ? getCachedWalletValue(activeAddress) : undefined),
    [activeAddress, getCachedWalletValue]
  )

  const isPortfolioLoading = tokenBalancesLoading || lpLoading
  const totalPortfolioUsd = isPortfolioLoading && activeCachedValueUsd !== undefined ? activeCachedValueUsd : liveTotalPortfolioUsd

  const { mode, changeUsd, changePct, lastSyncAt } = usePortfolioValueMetrics(
    chainId,
    activeAddress,
    isPortfolioLoading ? undefined : totalPortfolioUsd
  )

  const walletMetrics = useMemo((): WalletMetric[] => {
    if (!chainId) return []

    const addresses = Array.from(new Set(managedWallets))
    return addresses.map(address => {
      const isActive = activeAddress?.toLowerCase() === address.toLowerCase()
      if (isActive) {
        return { address, valueUsd: totalPortfolioUsd }
      }

      return { address, valueUsd: getCachedWalletValue(address) }
    })
  }, [activeAddress, chainId, managedWallets, totalPortfolioUsd, getCachedWalletValue])

  function addWalletAddress() {
    const checked = isAddress(walletInput.trim())
    if (!checked) {
      setWalletInputError('Invalid address')
      return
    }

    setManagedWallets(prev => {
      if (prev.includes(checked)) {
        setSelectedWallet(checked)
        setWalletInput('')
        setWalletInputError('')
        return prev
      }
      const updated = [checked, ...prev]
      window.localStorage.setItem('dextop.portfolio.wallets.v1', JSON.stringify(updated))
      setSelectedWallet(checked)
      setWalletInput('')
      setWalletInputError('')
      return updated
    })
  }

  function removeWalletAddress(addressToDelete: string) {
    setManagedWallets(prev => {
      const updated = prev.filter(addr => addr !== addressToDelete)
      window.localStorage.setItem('dextop.portfolio.wallets.v1', JSON.stringify(updated))
      if (selectedWallet === addressToDelete) {
        setSelectedWallet(updated[0] ?? '')
      }
      return updated
    })
  }

  return (
    <>
      <TopSection>
        <TopHeaderRow>
          <div>
            <TYPE.subHeader color={theme.text2}>Total Portfolio Value</TYPE.subHeader>
            <TYPE.largeHeader>${totalPortfolioUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TYPE.largeHeader>
            <TopMetric
              style={{
                color: changeUsd >= 0 ? theme.green1 : theme.red1
              }}
            >
              {mode ? (
                <>
                  {changeUsd >= 0 ? '+' : '-'}$
                  {Math.abs(changeUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  {' · '}
                  {changePct !== null ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%` : 'n/a'}
                  {' '}
                  {mode === '24h' ? '(24h)' : '(since sync)'}
                </>
              ) : (
                <span style={{ color: theme.text3 }}>
                  {lastSyncAt ? 'Collecting portfolio history...' : 'No portfolio history yet'}
                </span>
              )}
            </TopMetric>
            {walletMetrics.length > 0 && (
              <WalletMetricList>
                {walletMetrics.map(metric => (
                  <WalletMetricRow key={metric.address}>
                    <span style={{ color: theme.text2 }}>{shortenAddress(metric.address)}</span>
                    <span style={{ color: theme.text1 }}>
                      {metric.valueUsd !== undefined
                        ? `$${metric.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : '-'}
                    </span>
                  </WalletMetricRow>
                ))}
              </WalletMetricList>
            )}
          </div>
          <TopActionsColumn>
            <ManageWalletsButton onClick={() => setWalletModalOpen(true)}>Manage Wallets</ManageWalletsButton>
            <WalletRow style={{ marginBottom: 0, justifyContent: 'flex-end' }}>
              {managedWallets.map(addr => (
                <WalletChip key={addr} active={activeAddress === addr} onClick={() => setSelectedWallet(addr)}>
                  {shortenAddress(addr)}
                </WalletChip>
              ))}
            </WalletRow>
          </TopActionsColumn>
        </TopHeaderRow>
      </TopSection>

      <PageWrapper>
        <Section>
        <SectionHeader>
          <TYPE.mediumHeader>Token Holdings</TYPE.mediumHeader>
          <SectionMetric>
            <TYPE.subHeader color={theme.text2}>Token Holdings Value</TYPE.subHeader>
            <TYPE.black>
              ${(tokenValueUsd + (nativePlsValueUsd ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </TYPE.black>
          </SectionMetric>
        </SectionHeader>

        {tokensWithBalance.length === 0 && !nativeBalanceAmount ? (
          <TYPE.body color={theme.text3}>
            {activeAddress ? 'No tokens found.' : 'Add and select a wallet address to view holdings.'}
          </TYPE.body>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Token</Th>
                <Th>Balance</Th>
                <Th>Price (USD)</Th>
                <Th>24h %</Th>
              </tr>
            </thead>
            <tbody>
              <NativePlsHoldingRow
                balance={nativePlsBalanceFormatted}
                priceUsd={nativePlsPriceNumber}
                valueUsd={nativePlsValueUsd}
                priceChange24h={nativeDexInfo?.priceChange24h}
              />
              {tokensWithBalance.map(token => {
                const tokenAddress = token.address.toLowerCase()
                const isWpls = wplsAddress ? tokenAddress === wplsAddress.toLowerCase() : false
                const baseDexInfo = tokenDexInfo[token.address]
                const resolvedDexInfo =
                  isWpls && nativeDexInfo
                    ? {
                        address: baseDexInfo?.address ?? nativeDexInfo.address,
                        priceUsd: baseDexInfo?.priceUsd ?? nativeDexInfo.priceUsd,
                        priceChange24h: baseDexInfo?.priceChange24h ?? nativeDexInfo.priceChange24h
                      }
                    : baseDexInfo

                return (
                  <TokenHoldingRow
                    key={token.address}
                    token={token}
                    balanceAmount={tokenBalances[token.address]}
                    dexInfo={resolvedDexInfo}
                    onValueUpdate={handleTokenValueUpdate}
                  />
                )
              })}
            </tbody>
          </Table>
        )}
        </Section>

        <Section>
          <SectionHeader>
            <TYPE.mediumHeader>LP Positions</TYPE.mediumHeader>
          </SectionHeader>
          <PortfolioLPSection
            key={activeAddress ?? 'no-wallet'}
            accountOverride={activeAddress}
            onEstimatedValueChange={setLpValueUsd}
            onLoadingChange={setLpLoading}
          />
        </Section>
      </PageWrapper>

      {walletModalOpen && (
        <ModalBackdrop>
          <ModalCard>
            <TYPE.mediumHeader>Manage Wallet Addresses</TYPE.mediumHeader>
            <InputRow>
              <AddressInput
                value={walletInput}
                onChange={e => {
                  setWalletInput(e.target.value)
                  if (walletInputError) setWalletInputError('')
                }}
                placeholder="0x..."
              />
              <ActionButton onClick={addWalletAddress}>Add</ActionButton>
            </InputRow>
            {walletInputError ? <TYPE.subHeader color={theme.red1}>{walletInputError}</TYPE.subHeader> : null}

            <WalletList>
              {managedWallets.map(addr => (
                <WalletListItem key={addr}>
                  <span>{addr}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <ActionButton onClick={() => setSelectedWallet(addr)}>Use</ActionButton>
                    <ActionButton onClick={() => removeWalletAddress(addr)}>Delete</ActionButton>
                  </div>
                </WalletListItem>
              ))}
            </WalletList>

            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <ActionButton onClick={() => setWalletModalOpen(false)}>Done</ActionButton>
            </div>
          </ModalCard>
        </ModalBackdrop>
      )}
    </>
  )
}
