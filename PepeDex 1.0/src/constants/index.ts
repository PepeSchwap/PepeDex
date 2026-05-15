import { ChainId, JSBI, Percent, Token, WETH } from '@uniswap/sdk'
import { AbstractConnector } from '@web3-react/abstract-connector'
import { walletlink } from '../connectors'
import { injected } from '../connectors'

//import { pulsechain } from '../constants/chains';
export const ROUTER_ADDRESS = '0xd3F72D6DE6FC310Fcab2ABd9A69d59ed95dAf17B' // 15% fee
export const EXTERNAL_PLS_PRICE_PAIR = '0x6753560538ECa67617A9Ce605178F788bE7E524E'
export const EXTERNAL_PLS_PRICE_ROUTER = '0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02'
export const BURN_FACTORY_ADDRESS = '0x26594d3F4c172554A30D06e8fDc59229B860eAb0'
export const BURN_PROXY_ADDRESS = '0xb55837CF82336f36EaE9Cd251c2d850e8C35Ab42'

// a list of tokens by chain
type ChainTokenList = {
  readonly [chainId: number]: Token[]
}

export const DAI = new Token(ChainId.MAINNET, '0xefD766cCb38EaF1dfd701853BFCe31359239F305', 18, 'DAI', 'Dai Stablecoin')
export const USDC = new Token(ChainId.MAINNET, '0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07', 6, 'USDC', 'USD//C')
export const USDT = new Token(ChainId.MAINNET, '0x0Cb6F5a34ad42ec934882A05265A7d5F59b51A2f', 6, 'USDT', 'Tether USD')


const WETH_ONLY: ChainTokenList = {
  [ChainId.MAINNET]: [WETH[ChainId.MAINNET]]
}

// used to construct intermediary pairs for trading
export const BASES_TO_CHECK_TRADES_AGAINST: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET], DAI, USDC, USDT]
}

/**
 * Some tokens can only be swapped via certain pairs, so we override the list of bases that are considered for these
 * tokens.
 */
export const CUSTOM_BASES: { [chainId: number]: { [tokenAddress: string]: Token[] } } = {
  [ChainId.MAINNET]: {}
}

export const SUGGESTED_BASES: ChainTokenList = {
  [369]: [
    // Your custom PulseChain tokens
    new Token(369, '0x6982508145454Ce325dDbE47a25d4ec3d2311933', 18, 'PEPE', 'Pepe Token'),
    new Token(369, '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39', 8, 'HEX', 'HEX'),
    new Token(369, '0x95B303987A60C71504D99Aa1b13B4DA07b0790ab', 18, 'PLSX', 'PulseX'),
    new Token(369, '0xefD766cCb38EaF1dfd701853BFCe31359239F305', 18, 'DAI', 'Dai from ETH'),
    new Token(369, '0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07', 6, 'USDC', 'USDC from ETH')
    // Add more PulseChain tokens as needed
  ]
}

// used to construct the list of all pairs we consider by default in the frontend
export const BASES_TO_TRACK_LIQUIDITY_FOR: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET], DAI, USDC, USDT]
}

export const PINNED_PAIRS: { readonly [chainId: number]: [Token, Token][] } = {
  [ChainId.MAINNET]: [
    [
      new Token(ChainId.MAINNET, '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643', 8, 'cDAI', 'Compound Dai'),
      new Token(ChainId.MAINNET, '0x39AA39c021dfbaE8faC545936693aC917d5E7563', 8, 'cUSDC', 'Compound USD Coin')
    ],
    [USDC, USDT],
    [DAI, USDT]
  ]
}

export interface WalletInfo {
  connector?: AbstractConnector
  injectedKey?: string
  name: string
  iconName: string
  description: string
  href: string | null
  color: string
  primary?: true
  mobile?: true
  mobileOnly?: true
}

export const SUPPORTED_WALLETS: { [key: string]: WalletInfo } = {
  INJECTED_METAMASK: {
    connector: injected,
    injectedKey: 'metamask',
    name: 'MetaMask',
    iconName: 'metamask.png',
    description: 'Detected in your browser.',
    href: null,
    color: '#E8831D',
    primary: true
  },
  INJECTED_INTERNET_MONEY: {
    connector: injected,
    injectedKey: 'internetmoney',
    name: 'Internet Money',
    iconName: 'internetMoney.svg',
    description: 'Detected in your browser.',
    href: null,
    color: '#2E7D32',
    mobile: true,
    primary: true
  },
  INJECTED_OKX: {
    connector: injected,
    injectedKey: 'okx',
    name: 'OKX Wallet',
    iconName: 'okxWallet.svg',
    description: 'Detected in your browser.',
    href: null,
    color: '#010101',
    mobile: true,
    primary: true
  },
  INJECTED_RABBY: {
    connector: injected,
    injectedKey: 'rabby',
    name: 'Rabby Wallet',
    iconName: 'rabby.svg',
    description: 'Detected in your browser.',
    href: null,
    color: '#4F46E5',
    primary: true
  },
  INJECTED_TRUST: {
    connector: injected,
    injectedKey: 'trust',
    name: 'Trust Wallet',
    iconName: 'trustWallet.png',
    description: 'Detected in your browser.',
    href: null,
    color: '#3375BB',
    mobile: true,
    primary: true
  },
  INJECTED_COINBASE: {
    connector: injected,
    injectedKey: 'coinbase',
    name: 'Coinbase Wallet Extension',
    iconName: 'coinbaseWalletIcon.svg',
    description: 'Detected in your browser.',
    href: null,
    color: '#2E7D32'
  },
  INJECTED_BRAVE: {
    connector: injected,
    injectedKey: 'brave',
    name: 'Brave Wallet',
    iconName: 'wallet.png',
    description: 'Detected in your browser.',
    href: null,
    color: '#FB542B'
  },
  INJECTED_FALLBACK: {
    connector: injected,
    name: 'Injected Wallet',
    iconName: 'wallet.png',
    description: 'Detected browser wallet provider.',
    href: null,
    color: '#010101',
    primary: true
  },
  WALLET_LINK: {
    connector: walletlink,
    name: 'Coinbase Wallet',
    iconName: 'coinbaseWalletIcon.svg',
    description: 'Use Coinbase Wallet app on mobile device',
    href: null,
    color: '#2E7D32'
  },
  COINBASE_LINK: {
    name: 'Open in Coinbase Wallet',
    iconName: 'coinbaseWalletIcon.svg',
    description: 'Open in Coinbase Wallet app.',
    href: 'https://go.cb-w.com/mtUDhEZPy1',
    color: '#2E7D32',
    mobile: true,
    mobileOnly: true
  }
}

export const NetworkContextName = 'NETWORK'

// default allowed slippage, in bips (optimized with 15% fee already accounted for)
export const INITIAL_ALLOWED_SLIPPAGE = 50
// 20 minutes, denominated in seconds
export const DEFAULT_DEADLINE_FROM_NOW = 60 * 20

// one basis point
export const ONE_BIPS = new Percent(JSBI.BigInt(1), JSBI.BigInt(10000))
export const BIPS_BASE = JSBI.BigInt(10000)
// used for warning states
export const ALLOWED_PRICE_IMPACT_LOW: Percent = new Percent(JSBI.BigInt(50), BIPS_BASE) // 0.5%
export const ALLOWED_PRICE_IMPACT_MEDIUM: Percent = new Percent(JSBI.BigInt(100), BIPS_BASE) // 1%
export const ALLOWED_PRICE_IMPACT_HIGH: Percent = new Percent(JSBI.BigInt(200), BIPS_BASE) // 2%
// if the price slippage exceeds this number, force the user to type 'confirm' to execute
export const PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN: Percent = new Percent(JSBI.BigInt(300), BIPS_BASE) // 3%
// for non expert mode disable swaps above this
export const BLOCKED_PRICE_IMPACT_NON_EXPERT: Percent = new Percent(JSBI.BigInt(500), BIPS_BASE) // 5%

// used to ensure the user doesn't send so much ETH so they end up with <.01
export const MIN_ETH: JSBI = JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(16)) // .01 ETH
export const BETTER_TRADE_LINK_THRESHOLD = new Percent(JSBI.BigInt(75), JSBI.BigInt(10000))
