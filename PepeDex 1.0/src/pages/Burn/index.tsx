// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AddressZero } from '@ethersproject/constants'
import { Contract } from '@ethersproject/contracts'
import { BigNumber } from '@ethersproject/bignumber'
import { formatUnits } from '@ethersproject/units'
import { ArrowDown, ArrowUp, ExternalLink as ExternalLinkIcon, Zap } from 'react-feather'
import styled, { ThemeContext } from 'styled-components'
import { Text } from 'rebass'
import useUSDCPrice from '../../utils/useUSDCPrice'
import { ButtonPrimary } from '../../components/Button'
import { AutoColumn } from '../../components/Column'
import { LightCard } from '../../components/Card'
import Loader from '../../components/Loader'
import { RowFixed } from '../../components/Row'
import { ExternalLink, TYPE } from '../../theme'
import { useActiveWeb3React } from '../../hooks'
import { useToken } from '../../hooks/Tokens'
import { BURN_FACTORY_ADDRESS, BURN_PROXY_ADDRESS } from '../../constants'
import AppBody from '../AppBody'
import { useWalletModalToggle } from '../../state/application/hooks'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { getEtherscanLink, shortenAddress } from '../../utils'

const factoryAbi = ['function allPairsLength() view returns (uint256)', 'function allPairs(uint256) view returns (address)']

const pairAbi = [
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
]

const tokenAbi = ['function symbol() view returns (string)', 'function decimals() view returns (uint8)']

const burnProxyAbi = [
  'function convertLps(address[] tokens0, address[] tokens1)'
]

const burnProxyReadAbi = [
  'function DEX() view returns (address)',
  'function WPLS() view returns (address)',
  'function factory() view returns (address)',
  'function bridgeFor(address token) view returns (address)',
  'function burnedDEX() view returns (uint256)',
  'function BOUNTY_FEE() view returns (uint256)'
]

const routingFactoryAbi = ['function getPair(address tokenA, address tokenB) view returns (address)']

const PAGE_SIZE = 20

type BurnRow = {
  pairAddress: string
  token0: string
  token1: string
  token0Decimals: number
  token1Decimals: number
  token0Symbol: string
  token1Symbol: string
  reserve0: BigNumber
  reserve1: BigNumber
  balance: BigNumber
  totalSupply: BigNumber
  pairLiquidityUsd?: number
}

type BurnConfigState = {
  dex: string
  wpls: string
  factory: string
  burnedDex?: BigNumber
  bountyFeeBps?: BigNumber
}

const PageWrapper = styled(AutoColumn)`
  width: 100%;
`

const HeaderCard = styled(LightCard)`
  display: grid;
  gap: 12px;
`

const HeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    align-items: stretch;
  `};
`

const StatsCard = styled(LightCard)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  padding: 10px 12px;
  background: ${({ theme }) => theme.bg2};

  ${({ theme }) => theme.mediaWidth.upToSmall`
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 8px 10px;
  `};
`

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const StatLabel = styled(TYPE.body)`
  font-size: 12px !important;
  color: ${({ theme }) => theme.text2};
`

const StatValue = styled(TYPE.body)`
  font-size: 13px !important;
  color: ${({ theme }) => theme.text1};
  font-weight: 500;
`

const TableCard = styled(LightCard)`
  display: grid;
  gap: 16px;
`

const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
`

const BurnTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 14px 0;
    border-bottom: 1px solid ${({ theme }) => theme.bg3};
    text-align: left;
    vertical-align: middle;
  }

  th:last-child,
  td:last-child {
    text-align: right;
  }

  th {
    color: ${({ theme }) => theme.text2};
    font-size: 0.95rem;
    font-weight: 500;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  ${({ theme }) => theme.mediaWidth.upToSmall`
    th:nth-child(3),
    td:nth-child(3) {
      display: none;
    }
  `};
`

const PairText = styled.div`
  display: grid;
  gap: 4px;
`

const ActionCell = styled.div`
  display: flex;
  justify-content: flex-end;
`

const TableControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const TableNavRow = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  padding: 8px;
  background: ${({ theme }) => theme.bg2};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.bg3};
`

const NavButtonGroup = styled.div`
  display: flex;
  gap: 1px;
  align-items: center;
`

const NavButton = styled.button<{ variant?: 'primary' | 'secondary' | 'default'; active?: boolean }>`
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 140px;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary1};
    outline-offset: 1px;
  }

  ${({ variant, theme, active }) => {
    if (variant === 'primary') {
      return `
        background: ${theme.primary1};
        color: ${theme.white};
        border-color: ${theme.primary2};
        &:hover:not(:disabled) {
          background: ${theme.primary2};
          border-color: ${theme.primary1};
          transform: translateY(-1px);
        }
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `
    } else if (variant === 'secondary') {
      return `
        background: ${theme.bg1};
        color: ${theme.text1};
        border-color: ${theme.bg4};
        &:hover:not(:disabled) {
          background: ${theme.bg2};
          border-color: ${theme.text2};
        }
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `
    } else {
      return `
        background: ${active ? theme.primary1 : theme.bg1};
        color: ${active ? theme.white : theme.text1};
        border-color: ${active ? theme.primary2 : theme.bg4};
        &:hover:not(:disabled) {
          background: ${active ? theme.primary2 : theme.bg2};
          border-color: ${active ? theme.primary1 : theme.text2};
        }
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `
    }
  }}
`

const NavSeparator = styled.div`
  width: 1px;
  height: 16px;
  background: ${({ theme }) => theme.bg3};
  margin: 0 4px;
`

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    align-items: stretch;
  `};
`

const EmptyState = styled(LightCard)`
  padding: 40px;
`

const helperText = 'Burn PEPE, get PEPE reward.'

const DEX_SCREENER_MAX_LIQUIDITY_USD = 1_000_000_000_000
const PULSECHAIN_CHAIN_IDS = new Set(['pulsechain', 'pulse', '369'])

function formatUsd(value?: number): string {
  if (value === undefined || value === null || !Number.isFinite(value) || value < 0) return '-'
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: value >= 1 ? 2 : 6 })}`
}

function formatTokenAmount(value?: number): string {
  if (value === undefined || value === null || !Number.isFinite(value) || value < 0) return '-'
  return value.toLocaleString(undefined, { maximumFractionDigits: value >= 1 ? 4 : 8 })
}

async function fetchPairLiquidityUsd(pairAddress: string): Promise<number | undefined> {
  const normalized = pairAddress.toLowerCase()

  const extractLiquidityUsd = (pairLike: any): number | undefined => {
    if (!pairLike) return undefined

    const chainId = String(pairLike?.chainId ?? '').toLowerCase()
    if (chainId && !PULSECHAIN_CHAIN_IDS.has(chainId)) return undefined

    const candidateAddress = typeof pairLike?.pairAddress === 'string' ? pairLike.pairAddress.toLowerCase() : undefined
    if (candidateAddress && candidateAddress !== normalized) return undefined

    const liquidityUsdRaw = pairLike?.liquidity?.usd
    const liquidityUsd = typeof liquidityUsdRaw === 'string' ? Number(liquidityUsdRaw) : liquidityUsdRaw

    if (!Number.isFinite(liquidityUsd) || liquidityUsd < 0 || liquidityUsd > DEX_SCREENER_MAX_LIQUIDITY_USD) {
      return undefined
    }

    return liquidityUsd
  }

  const requestDexscreener = async (url: string): Promise<any | undefined> => {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    })

    if (!response.ok) return undefined
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().includes('application/json')) return undefined

    return response.json()
  }

  try {
    const byPair = (await requestDexscreener(
      `https://api.dexscreener.com/latest/dex/pairs/pulsechain/${pairAddress}`
    )) as any
    const pairCandidates = [...(Array.isArray(byPair?.pairs) ? byPair.pairs : []), byPair?.pair]
    for (const candidate of pairCandidates) {
      const liquidityUsd = extractLiquidityUsd(candidate)
      if (liquidityUsd !== undefined) return liquidityUsd
    }

    const bySearch = (await requestDexscreener(
      `https://api.dexscreener.com/latest/dex/search?q=${pairAddress}`
    )) as any
    const searchCandidates = [...(Array.isArray(bySearch?.pairs) ? bySearch.pairs : []), bySearch?.pair]
    for (const candidate of searchCandidates) {
      const liquidityUsd = extractLiquidityUsd(candidate)
      if (liquidityUsd !== undefined) return liquidityUsd
    }

    return undefined
  } catch {
    return undefined
  }
}

function parseBurnErrorMessage(error: any): string {
  const message =
    error?.reason ||
    error?.error?.reason ||
    error?.data?.message ||
    error?.error?.message ||
    error?.message ||
    error?.shortMessage ||
    'Burn transaction failed.'
  if (String(message).includes('DEXBuyAndBurn: Cannot convert')) {
    return 'Cannot convert this LP route. Required swap pair(s) are missing in the burn routing path. Confirm WPLS/DEX and bridge pairs exist in the burn factory.'
  }
  if (String(message).includes('DEXBuyAndBurn: FORBIDDEN')) {
    return 'Caller is not authorized to convert LPs. Enable anyAuth or authorize your wallet on the burn contract.'
  }
  if (String(message).toLowerCase().includes('user denied') || String(message).toLowerCase().includes('rejected')) {
    return 'Transaction was rejected in wallet.'
  }
  if (typeof message === 'string' && message.startsWith('0x')) {
    return 'Transaction reverted. See wallet or explorer for full revert details.'
  }
  return message
}

function toSafeNumber(value: BigNumber | number | string): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return value.toNumber()
}

async function readTokenSymbol(tokenAddress: string, contractRunner: any): Promise<string> {
  try {
    const tokenContract = new Contract(tokenAddress, tokenAbi, contractRunner)
    return await tokenContract.symbol()
  } catch {
    return shortenAddress(tokenAddress)
  }
}

async function readTokenDecimals(tokenAddress: string, contractRunner: any): Promise<number> {
  try {
    const tokenContract = new Contract(tokenAddress, tokenAbi, contractRunner)
    const decimals = await tokenContract.decimals()
    const parsed = Number(decimals)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 18
  } catch {
    return 18
  }
}
export default function Burn() {
  const theme = useContext(ThemeContext)
  const toggleWalletModal = useWalletModalToggle()
  const addTransaction = useTransactionAdder()
  const { account, chainId, library } = useActiveWeb3React()

  const [rows, setRows] = useState<BurnRow[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPairs, setTotalPairs] = useState(0)
  const [reverseOrder, setReverseOrder] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingPair, setPendingPair] = useState<string | null>(null)
  const [lastSubmittedHash, setLastSubmittedHash] = useState<string | null>(null)
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set())
  const [burnConfig, setBurnConfig] = useState<BurnConfigState | null>(null)

  const safeAddTransaction = useCallback(
    (response: any, summary: string) => {
      try {
        addTransaction(response, { summary })
      } catch (trackingError) {
        // Do not fail burn flow if tx tracking state has transient issues.
        console.error('Failed to register burn transaction in account modal', trackingError)
      }
    },
    [addTransaction]
  )

  const dexToken = useToken(burnConfig?.dex)
  const dexUsdPrice = useUSDCPrice(dexToken ?? undefined)
  const dexUsdPriceNumber = useMemo(() => {
    if (!dexUsdPrice) return undefined
    const parsed = Number(dexUsdPrice.toSignificant(10))
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
  }, [dexUsdPrice])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalPairs / PAGE_SIZE)), [totalPairs])
  const explorerChainId = chainId ?? 369
  const isWrongNetwork = Boolean(account && chainId && chainId !== 369)

  const derivedWplsUsdPrice = useMemo(() => {
    if (!burnConfig?.dex || !burnConfig?.wpls || !dexUsdPriceNumber) return undefined

    const dexAddress = burnConfig.dex.toLowerCase()
    const wplsAddress = burnConfig.wpls.toLowerCase()

    const dexWplsRow = rows.find(row => {
      const token0 = row.token0.toLowerCase()
      const token1 = row.token1.toLowerCase()
      return (
        (token0 === dexAddress && token1 === wplsAddress) ||
        (token0 === wplsAddress && token1 === dexAddress)
      )
    })

    if (!dexWplsRow) return undefined

    const token0 = dexWplsRow.token0.toLowerCase()
    const dexReserve = Number(
      formatUnits(token0 === dexAddress ? dexWplsRow.reserve0 : dexWplsRow.reserve1, token0 === dexAddress ? dexWplsRow.token0Decimals : dexWplsRow.token1Decimals)
    )
    const wplsReserve = Number(
      formatUnits(token0 === wplsAddress ? dexWplsRow.reserve0 : dexWplsRow.reserve1, token0 === wplsAddress ? dexWplsRow.token0Decimals : dexWplsRow.token1Decimals)
    )

    if (!Number.isFinite(dexReserve) || !Number.isFinite(wplsReserve) || dexReserve <= 0 || wplsReserve <= 0) {
      return undefined
    }

    const usdPrice = (dexReserve * dexUsdPriceNumber) / wplsReserve
    return Number.isFinite(usdPrice) && usdPrice >= 0 ? usdPrice : undefined
  }, [burnConfig, dexUsdPriceNumber, rows])

  const tokenUsdPrice = useCallback(
    (tokenAddress: string): number | undefined => {
      const normalized = tokenAddress.toLowerCase()
      if (burnConfig?.dex && normalized === burnConfig.dex.toLowerCase()) return dexUsdPriceNumber
      if (burnConfig?.wpls && normalized === burnConfig.wpls.toLowerCase()) return derivedWplsUsdPrice
      return undefined
    },
    [burnConfig, dexUsdPriceNumber, derivedWplsUsdPrice]
  )

  const rowUsdValue = useCallback(
    (row: BurnRow): number | undefined => {
      let pairLiquidityUsd = row.pairLiquidityUsd

      if (pairLiquidityUsd === undefined) {
        const token0Price = tokenUsdPrice(row.token0)
        const token1Price = tokenUsdPrice(row.token1)

        const reserve0 = Number(formatUnits(row.reserve0, row.token0Decimals))
        const reserve1 = Number(formatUnits(row.reserve1, row.token1Decimals))
        if (!Number.isFinite(reserve0) || !Number.isFinite(reserve1) || reserve0 < 0 || reserve1 < 0) return undefined

        let fallbackLiquidityUsd: number | undefined
        if (token0Price !== undefined && token1Price !== undefined) {
          fallbackLiquidityUsd = reserve0 * token0Price + reserve1 * token1Price
        } else if (token0Price !== undefined) {
          // For x*y pools, value of the opposite side is approximately equal at pool price.
          fallbackLiquidityUsd = reserve0 * token0Price * 2
        } else if (token1Price !== undefined) {
          fallbackLiquidityUsd = reserve1 * token1Price * 2
        }

        if (fallbackLiquidityUsd === undefined) return undefined
        if (!Number.isFinite(fallbackLiquidityUsd) || fallbackLiquidityUsd < 0) return undefined

        pairLiquidityUsd = fallbackLiquidityUsd
      }

      if (row.totalSupply.isZero()) return undefined
      const balance = Number(formatUnits(row.balance, 18))
      const totalSupply = Number(formatUnits(row.totalSupply, 18))
      if (!Number.isFinite(balance) || !Number.isFinite(totalSupply) || totalSupply <= 0) return undefined
      const share = balance / totalSupply
      if (!Number.isFinite(share) || share <= 0 || share > 1.01) return undefined
      return pairLiquidityUsd * share
    },
    [tokenUsdPrice]
  )

  const selectedRows = useMemo(() => rows.filter(row => selectedPairs.has(row.pairAddress)), [rows, selectedPairs])
  const selectedUsd = useMemo(
    () => selectedRows.reduce((sum, row) => sum + (rowUsdValue(row) ?? 0), 0),
    [selectedRows, rowUsdValue]
  )
  const estimatedPepeBurn = useMemo(() => {
    if (!dexUsdPriceNumber || selectedUsd < 0) return undefined
    const estimate = selectedUsd / dexUsdPriceNumber
    return Number.isFinite(estimate) && estimate >= 0 ? estimate : undefined
  }, [dexUsdPriceNumber, selectedUsd])

  const bountyFeeBps = useMemo(() => {
    if (burnConfig?.bountyFeeBps === undefined) return undefined
    const value = Number(burnConfig.bountyFeeBps.toString())
    return Number.isFinite(value) && value >= 0 ? value : undefined
  }, [burnConfig])

  const estimatedCallerReward = useMemo(() => {
    if (estimatedPepeBurn === undefined || bountyFeeBps === undefined) return undefined
    const reward = (estimatedPepeBurn * bountyFeeBps) / 10000
    return Number.isFinite(reward) && reward >= 0 ? reward : undefined
  }, [estimatedPepeBurn, bountyFeeBps])

  const estimatedCallerRewardUsd = useMemo(() => {
    if (estimatedCallerReward === undefined || !dexUsdPriceNumber) return undefined
    const usd = estimatedCallerReward * dexUsdPriceNumber
    return Number.isFinite(usd) && usd >= 0 ? usd : undefined
  }, [estimatedCallerReward, dexUsdPriceNumber])

  const burnedDexAmount = useMemo(() => {
    if (burnConfig?.burnedDex === undefined) return undefined
    const decimals = dexToken?.decimals ?? 18
    const amount = Number(formatUnits(burnConfig.burnedDex, decimals))
    return Number.isFinite(amount) && amount >= 0 ? amount : undefined
  }, [burnConfig, dexToken])

  const burnedDexUsd = useMemo(() => {
    if (burnedDexAmount === undefined || !dexUsdPriceNumber) return undefined
    const total = burnedDexAmount * dexUsdPriceNumber
    return Number.isFinite(total) && total >= 0 ? total : undefined
  }, [burnedDexAmount, dexUsdPriceNumber])

  const allVisibleSelected = rows.length > 0 && rows.every(row => selectedPairs.has(row.pairAddress))

  const validateConvertibility = useCallback(
    async (tokens0: string[], tokens1: string[]) => {
      if (!library) return

      const burnReadContract = new Contract(BURN_PROXY_ADDRESS, burnProxyReadAbi, library)
      const [dex, wpls, factoryAddress] = await Promise.all([
        burnReadContract.DEX(),
        burnReadContract.WPLS(),
        burnReadContract.factory()
      ])

      const routingFactory = new Contract(factoryAddress, routingFactoryAbi, library)

      const ensurePairExists = async (fromToken: string, toToken: string) => {
        const pairAddress: string = await routingFactory.getPair(fromToken, toToken)
        if (!pairAddress || pairAddress === AddressZero) {
          throw new Error(`Missing routing pair ${shortenAddress(fromToken)}/${shortenAddress(toToken)}.`)
        }
      }

      const walkRoute = async (startToken: string) => {
        let current = startToken
        const visited = new Set<string>()

        for (let depth = 0; depth < 8; depth++) {
          const lowered = current.toLowerCase()
          if (lowered === dex.toLowerCase() || lowered === wpls.toLowerCase()) {
            return
          }
          if (visited.has(lowered)) {
            throw new Error(`Bridge loop detected for ${shortenAddress(startToken)}.`)
          }
          visited.add(lowered)

          const bridge: string = await burnReadContract.bridgeFor(current)
          if (!bridge || bridge === AddressZero || bridge.toLowerCase() === lowered) {
            throw new Error(`Invalid bridge configured for ${shortenAddress(current)}.`)
          }

          await ensurePairExists(current, bridge)
          current = bridge
        }

        throw new Error(`Bridge route too deep for ${shortenAddress(startToken)}.`)
      }

      const uniqueTokens = Array.from(new Set([...tokens0, ...tokens1].map(token => token.toLowerCase())))
      await Promise.all(uniqueTokens.map(token => walkRoute(token)))

      await ensurePairExists(wpls, dex)
    },
    [library]
  )

  const loadBurnConfig = useCallback(async () => {
    if (!library) {
      setBurnConfig(null)
      return
    }

    try {
      const burnReadContract = new Contract(BURN_PROXY_ADDRESS, burnProxyReadAbi, library)
      const [dex, wpls, factory, burnedDex, bountyFeeBps] = await Promise.all([
        burnReadContract.DEX(),
        burnReadContract.WPLS(),
        burnReadContract.factory(),
        burnReadContract.burnedDEX().catch(() => undefined),
        burnReadContract.BOUNTY_FEE().catch(() => undefined)
      ])

      setBurnConfig({ dex, wpls, factory, burnedDex, bountyFeeBps })
    } catch {
      setBurnConfig(null)
    }
  }, [library])

  const loadRows = useCallback(async () => {
    if (!library) {
      setRows([])
      setTotalPairs(0)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const factoryContract = new Contract(BURN_FACTORY_ADDRESS, factoryAbi, library)
      const length = await factoryContract.allPairsLength()
      const pairCount = toSafeNumber(length)

      setTotalPairs(pairCount)

      const startIndex = (currentPage - 1) * PAGE_SIZE
      const endIndex = Math.min(startIndex + PAGE_SIZE, pairCount)
      const indexes: number[] = []

      if (reverseOrder) {
        for (let index = pairCount - 1 - startIndex; index >= pairCount - endIndex; index--) {
          indexes.push(index)
        }
      } else {
        for (let index = startIndex; index < endIndex; index++) {
          indexes.push(index)
        }
      }

      const nextRows = await Promise.all(
        indexes.map(async index => {
          const pairAddress: string = await factoryContract.allPairs(index)
          const pairContract = new Contract(pairAddress, pairAbi, library)
          const [token0, token1, balance, totalSupply, reserves] = await Promise.all([
            pairContract.token0(),
            pairContract.token1(),
            pairContract.balanceOf(BURN_PROXY_ADDRESS),
            pairContract.totalSupply(),
            pairContract.getReserves()
          ])

          if ((balance as BigNumber).isZero()) {
            return null
          }

          const [token0Symbol, token1Symbol, token0Decimals, token1Decimals] = await Promise.all([
            readTokenSymbol(token0, library),
            readTokenSymbol(token1, library),
            readTokenDecimals(token0, library),
            readTokenDecimals(token1, library)
          ])

          const pairLiquidityUsd = await fetchPairLiquidityUsd(pairAddress)

          return {
            pairAddress,
            token0,
            token1,
            token0Decimals,
            token1Decimals,
            token0Symbol,
            token1Symbol,
            reserve0: BigNumber.from(reserves?.reserve0 ?? reserves?.[0] ?? 0),
            reserve1: BigNumber.from(reserves?.reserve1 ?? reserves?.[1] ?? 0),
            balance,
            totalSupply,
            pairLiquidityUsd
          } as BurnRow
        })
      )

      setRows(nextRows.filter((row): row is BurnRow => Boolean(row)))
    } catch (loadError) {
      console.error('Failed to load burn pairs', loadError)
      setRows([])
      setError('Unable to fetch burn LP data. Check RPC health and proxy deployment state.')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, library, reverseOrder])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  useEffect(() => {
    loadBurnConfig()
  }, [loadBurnConfig])

  useEffect(() => {
    setSelectedPairs(previous => {
      const next = new Set<string>()
      rows.forEach(row => {
        if (previous.has(row.pairAddress)) next.add(row.pairAddress)
      })
      return next
    })
  }, [rows])

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedPairs(previous => {
      const next = new Set(previous)
      if (allVisibleSelected) {
        rows.forEach(row => next.delete(row.pairAddress))
      } else {
        rows.forEach(row => next.add(row.pairAddress))
      }
      return next
    })
  }, [allVisibleSelected, rows])

  const toggleSelectRow = useCallback((pairAddress: string) => {
    setSelectedPairs(previous => {
      const next = new Set(previous)
      if (next.has(pairAddress)) next.delete(pairAddress)
      else next.add(pairAddress)
      return next
    })
  }, [])

  const handleBurnSelected = useCallback(async () => {
    if (!account) {
      toggleWalletModal()
      return
    }
    if (!library || isWrongNetwork || selectedRows.length === 0) return

    setPendingPair('__selected__')
    setError(null)

    try {
      await validateConvertibility(
        selectedRows.map(r => r.token0),
        selectedRows.map(r => r.token1)
      )

      const burnContract = new Contract(BURN_PROXY_ADDRESS, burnProxyAbi, library.getSigner(account))
      const tokens0 = selectedRows.map(r => r.token0)
      const tokens1 = selectedRows.map(r => r.token1)
      const response = await burnContract.convertLps(tokens0, tokens1)
      setLastSubmittedHash(response.hash)
      safeAddTransaction(response, `Burn selected ${selectedRows.length} LP pairs`)
      await response.wait()
      await Promise.all([loadRows(), loadBurnConfig()])
    } catch (burnError) {
      const parsedError = burnError as any
      console.error('Failed to burn selected LPs', burnError)
      setError(parseBurnErrorMessage(parsedError))
    } finally {
      setPendingPair(null)
    }
  }, [
    account,
    isWrongNetwork,
    library,
    loadBurnConfig,
    loadRows,
    safeAddTransaction,
    selectedRows,
    toggleWalletModal,
    validateConvertibility
  ])

  const handleBurn = useCallback(
    async (row: BurnRow) => {
      if (!account) {
        toggleWalletModal()
        return
      }

      if (!library || isWrongNetwork) {
        return
      }

      setPendingPair(row.pairAddress)
      setError(null)

      try {
        await validateConvertibility([row.token0], [row.token1])

        const burnContract = new Contract(BURN_PROXY_ADDRESS, burnProxyAbi, library.getSigner(account))
        const response = await burnContract.convertLps([row.token0], [row.token1])
        setLastSubmittedHash(response.hash)
        safeAddTransaction(response, `Burn ${row.token0Symbol}/${row.token1Symbol} LP`)
        await response.wait()
        await loadRows()
      } catch (burnError) {
        const parsedError = burnError as any
        console.error('Failed to burn LP', burnError)
        setError(parseBurnErrorMessage(parsedError))
      } finally {
        setPendingPair(null)
      }
    },
    [account, isWrongNetwork, library, loadRows, safeAddTransaction, toggleWalletModal, validateConvertibility]
  )

  return (
    <AppBody>
      <PageWrapper gap="16px">
        {(burnedDexAmount || selectedRows.length > 0) && (
          <StatsCard>
            <StatItem>
              <StatLabel>Burned {dexToken?.symbol ?? 'DEX'}</StatLabel>
              <StatValue>
                {formatTokenAmount(burnedDexAmount)} {dexToken?.symbol ?? ''} ({formatUsd(burnedDexUsd)})
              </StatValue>
            </StatItem>
            {selectedRows.length > 0 && (
              <StatItem>
                <StatLabel>Estimated {dexToken?.symbol ?? 'PEPE'} to burn</StatLabel>
                <StatValue>
                  {formatTokenAmount(estimatedPepeBurn)} {dexToken?.symbol ?? ''} ({formatUsd(selectedUsd)})
                </StatValue>
              </StatItem>
            )}
            {selectedRows.length > 0 && (
              <StatItem>
                <StatLabel>Reward</StatLabel>
                <StatValue>
                  {formatTokenAmount(estimatedCallerReward)} {dexToken?.symbol ?? ''} ({formatUsd(estimatedCallerRewardUsd)})
                </StatValue>
              </StatItem>
            )}
          </StatsCard>
        )}

        <HeaderCard>
          <AutoColumn gap="10px">
            <HeaderTopRow>
              <RowFixed gap="10px">
                <Zap size={18} color={theme.primary1} />
                <TYPE.mediumHeader>Burn Dashboard</TYPE.mediumHeader>
              </RowFixed>
              {selectedRows.length > 0 && !isWrongNetwork && (
                <ButtonPrimary
                  width="fit-content"
                  padding="8px 14px"
                  onClick={handleBurnSelected}
                  disabled={Boolean(pendingPair || isLoading)}
                >
                  <RowFixed gap="6px">
                    <Zap size={12} />
                    <span>{pendingPair === '__selected__' ? 'Burning...' : `Burn Selected (${selectedRows.length})`}</span>
                  </RowFixed>
                </ButtonPrimary>
              )}
            </HeaderTopRow>
            <TYPE.body color={theme.text2}>{helperText}</TYPE.body>
          </AutoColumn>


          {error ? <TYPE.error error>{error}</TYPE.error> : null}

          {lastSubmittedHash ? (
            <ExternalLink href={getEtherscanLink(explorerChainId as any, lastSubmittedHash, 'transaction')}>
              <RowFixed gap="6px">
                <ExternalLinkIcon size={14} />
                View latest burn transaction
              </RowFixed>
            </ExternalLink>
          ) : null}
        </HeaderCard>

        <TableCard>
          <TableControlsContainer>
            <PaginationRow>
              <AutoColumn gap="4px">
                <TYPE.main>LP pairs</TYPE.main>
                <TYPE.body color={theme.text2} fontSize={14}>
                  Page {Math.min(currentPage, totalPages)} of {totalPages}
                </TYPE.body>
              </AutoColumn>
            </PaginationRow>

            <TableNavRow>
              {/* Burn Actions Group */}
              <NavButtonGroup>
                {/* Burn action moved to header under helper text */}
              </NavButtonGroup>

              {/* Spacer */}
              <NavSeparator />

              {/* Sort Control */}
              <NavButtonGroup>
                <NavButton
                  variant="default"
                  onClick={() => {
                    setReverseOrder(value => !value)
                    setCurrentPage(1)
                  }}
                  active={reverseOrder}
                  title={reverseOrder ? 'Showing newest first' : 'Showing oldest first'}
                >
                  {reverseOrder ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                </NavButton>
              </NavButtonGroup>

              {/* Pagination Controls */}
              <NavSeparator />
              <NavButtonGroup>
                <NavButton
                  variant="default"
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage <= 1 || isLoading}
                  title="Previous page"
                >
                  ←
                </NavButton>
                <NavButton
                  variant="default"
                  disabled
                  style={{ cursor: 'default', background: 'transparent', fontSize: '11px', padding: '6px 6px' }}
                >
                  {currentPage}/{totalPages}
                </NavButton>
                <NavButton
                  variant="default"
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages || isLoading}
                  title="Next page"
                >
                  →
                </NavButton>
              </NavButtonGroup>
            </TableNavRow>
          </TableControlsContainer>

          {isLoading ? (
            <EmptyState>
              <AutoColumn gap="12px" justify="center" style={{ alignItems: 'center' }}>
                <Loader size="32px" />
                <TYPE.body color={theme.text2}>Loading LP balances</TYPE.body>
              </AutoColumn>
            </EmptyState>
          ) : rows.length === 0 ? (
            <EmptyState>
              <TYPE.body color={theme.text2} textAlign="center">
                No LP pairs were found on this page.
              </TYPE.body>
            </EmptyState>
          ) : (
            <TableScroll>
              <BurnTable>
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                    </th>
                    <th>Pair</th>
                    <th>LP Balance</th>
                    <th>LP USD Value</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const isPending = pendingPair === row.pairAddress
                    const isSelected = selectedPairs.has(row.pairAddress)
                    const lpUsd = rowUsdValue(row)
                    return (
                      <tr key={row.pairAddress}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(row.pairAddress)}
                            disabled={Boolean(pendingPair || isLoading)}
                          />
                        </td>
                        <td>
                          <PairText>
                            <Text color={theme.text1} fontSize={18} fontWeight={500}>
                              {row.token0Symbol}/{row.token1Symbol}
                            </Text>
                            <TYPE.body color={theme.text2} fontSize={13}>
                              {shortenAddress(row.pairAddress)}
                            </TYPE.body>
                          </PairText>
                        </td>
                        <td>
                          <TYPE.body>{Number(formatUnits(row.balance, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 })}</TYPE.body>
                        </td>
                        <td>
                          <TYPE.body>{formatUsd(lpUsd)}</TYPE.body>
                        </td>
                        <td>
                          <ActionCell>
                            <ButtonPrimary
                              width="auto"
                              padding="10px 18px"
                              onClick={() => handleBurn(row)}
                              disabled={Boolean(isPending || pendingPair === '__all__' || isWrongNetwork || !library)}
                            >
                              {isPending ? 'Burning...' : 'Burn'}
                            </ButtonPrimary>
                          </ActionCell>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </BurnTable>
            </TableScroll>
          )}
        </TableCard>
      </PageWrapper>
    </AppBody>
  )
}